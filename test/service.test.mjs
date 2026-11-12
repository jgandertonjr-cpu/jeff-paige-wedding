import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import schema from "../netlify/editor/schema.gen.mjs";
import { createLocalRepo } from "../netlify/editor/localrepo.mjs";
import { memoryStore } from "../netlify/editor/store.mjs";
import { StaleError } from "../netlify/editor/github.mjs";
import { loadContent, propose, preview, status, publish, cancel, history, undo, settleUnconfirmed } from "../netlify/editor/service.mjs";

const SAFE_FAIL = "I couldn't make that change safely. Nothing changed.";
const EXPIRED = "That change has expired. Please ask again.";
const CANT = "That change can't be made.";
const NO_CHANGE = "That wouldn't change anything on the site, so there is nothing to publish.";
const PUT_BACK = "Something went wrong and I've put the site back.";
const THROWN_AWAY = "That change didn't work on the site, so I've thrown it away.";
const LOOKS_ONLY = "That change was to how the pages look, which this editor no longer changes, so I left it.";
const NOTHING_TO_UNDO = "Everything in that change has been changed again since, so there is nothing to undo.";
const BANNED = /\b(commit|deploy|json|branch|repository|merge|build|token)/i;
const START = Date.UTC(2026, 10, 12, 15, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

// ---- fixtures ---------------------------------------------------------------

// Structurally complete greyscale PNG (same shape as test/photo.test.mjs).
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(zlib.crc32(body), body.length + 4);
  return out;
}
function png(w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.alloc((w + 1) * h))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const PHOTO = png(300, 300).toString("base64");

const set = (file, p, value) => ({ op: "set", file, path: p, value });

// Records which keys were ever given a value, so "stores nothing" can be checked.
// Behaves like the production compare-and-swap store at its worst: every
// update first runs `fn` on the value as it was when update was called (a
// losing attempt whose result is thrown away), then again on the real value.
function recordingStore({ lose = true } = {}) {
  const inner = memoryStore();
  const written = new Set();
  return {
    written,
    get: (k) => inner.get(k),
    delete: (k) => inner.delete(k),
    async set(k, v) { written.add(k); return inner.set(k, v); },
    update(k, fn) {
      const stale = inner.get(k); // read now, before any queued update lands
      return inner.update(k, async (cur) => {
        if (lose) await fn(await stale);
        const next = await fn(cur);
        if (next !== null) written.add(k);
        return next;
      });
    },
  };
}

async function makeSite() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "service-"));
  const copy = async (p) => {
    await fs.mkdir(path.join(root, path.dirname(p)), { recursive: true });
    await fs.copyFile(p, path.join(root, p));
  };
  for (const f of Object.values(schema.files)) await copy(f.path);
  await copy("src/css/styles.css");
  await copy("DESIGN.md");
  // Empty stand-ins: only the names matter to the editor.
  await fs.mkdir(path.join(root, "src/images"), { recursive: true });
  for (const name of await fs.readdir("src/images")) await fs.writeFile(path.join(root, "src/images", name), "");
  return root;
}

function fakeNetlify() {
  const states = new Map();
  const calls = [];
  return {
    states,
    calls,
    async deployFor(sha) {
      calls.push(sha);
      const state = states.get(sha) || "waiting";
      return state === "ready" ? { state, url: `https://example.test/${sha}` } : { state };
    },
  };
}

// Like the production compare-and-swap loop: reads, yields, then writes only if
// nothing changed meanwhile (else retries), but deletes without any check.
function casStore() {
  const data = new Map();
  let version = 0;
  const versions = new Map();
  const tick = () => new Promise((r) => setImmediate(r));
  const copy = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));
  return {
    written: new Set(),
    async get(k) { return copy(data.get(k)); },
    async set(k, v) { this.written.add(k); data.set(k, copy(v)); versions.set(k, ++version); },
    async delete(k) { data.delete(k); versions.set(k, ++version); },
    async update(k, fn) {
      for (;;) {
        const seen = versions.get(k);
        const next = await fn(copy(data.get(k)));
        await tick();
        if (next === null) { data.delete(k); versions.set(k, ++version); return null; }
        if (versions.get(k) !== seen) continue;
        data.set(k, copy(next)); versions.set(k, ++version); this.written.add(k);
        return copy(next);
      }
    },
  };
}

async function setup({ repoWrap, store: makeStore } = {}) {
  const root = await makeSite();
  const local = createLocalRepo({ root });
  const repo = repoWrap ? repoWrap(local) : local;
  const store = makeStore ? makeStore() : recordingStore();
  const netlify = fakeNetlify();
  let clock = START;
  let n = 0;
  const deps = {
    repo, netlify, store, schema, env: {},
    now: () => clock,
    random: (bytes) => (++n).toString(16).padStart(bytes * 2, "0").slice(-bytes * 2),
  };
  const read = async (p) => fs.readFile(path.join(root, p), "utf8");
  const readData = async (p) => JSON.parse(await read(p));
  const texts = [];
  return {
    root, local, repo, store, netlify, deps, read, readData, texts,
    advance: (ms) => { clock += ms; },
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
}

// Every user-facing sentence goes through here so the banned-word test sees it.
const allTexts = [];
const seen = (r) => {
  for (const k of ["text", "title"]) if (typeof r?.[k] === "string") allTexts.push(r[k]);
  for (const k of ["summary", "restored", "skipped"]) if (Array.isArray(r?.[k])) allTexts.push(...r[k]);
  if (Array.isArray(r?.problems)) for (const p of r.problems) allTexts.push(p.label, p.message);
  return r;
};

const DEADLINE = set("travel", "/room_block/deadline", "2028-06-01");
const proposalKeys = (store) => [...store.written].filter((k) => k.startsWith("proposal:"));

// ---- loadContent --------------------------------------------------------------

test("loadContent returns the schema, every content file by key, and sorted image addresses", async () => {
  const t = await setup();
  try {
    const r = await loadContent(t.deps);
    assert.deepEqual(Object.keys(r).sort(), ["content", "images", "schema", "version"]);
    assert.equal(r.version, "local-base");
    assert.equal(r.schema, schema);
    assert.deepEqual(Object.keys(r.content).sort(), Object.keys(schema.files).sort());
    assert.equal(r.content.travel.room_block.deadline, (await t.readData("src/_data/travel.json")).room_block.deadline);
    assert.ok(Array.isArray(r.images) && r.images.length > 0);
    assert.ok(r.images.every((i) => /^\/images\/[^/]+$/.test(i)));
    assert.deepEqual(r.images, [...r.images].sort());
  } finally {
    await t.cleanup();
  }
});

// ---- propose: input limits -----------------------------------------------------

test("propose never throws on a missing or non-object input", async () => {
  const t = await setup();
  try {
    for (const input of [null, undefined, "x", 5, true, []]) {
      assert.deepEqual(await propose(t.deps, input), { ok: false, text: CANT }, String(input));
    }
    assert.deepEqual(proposalKeys(t.store), []);
  } finally {
    await t.cleanup();
  }
});

test("a value nested too deeply or too long is refused before any recursive work", async () => {
  const t = await setup();
  try {
    let deep = "x";
    for (let i = 0; i < 200_000; i++) deep = [deep];
    let ok13 = "x";
    for (let i = 0; i < 13; i++) ok13 = [ok13];
    const long = "y".repeat(200_001);
    for (const value of [deep, ok13, long, { a: long }]) {
      assert.deepEqual(await propose(t.deps, { ops: [set("travel", "/room_block/deadline", value)] }), { ok: false, text: CANT });
    }
    assert.deepEqual(proposalKeys(t.store), []);
    // Twelve levels is within the limit (it fails later, on its own merits, with a different answer).
    let ok12 = "x";
    for (let i = 0; i < 12; i++) ok12 = [ok12];
    const r = await propose(t.deps, { ops: [set("travel", "/room_block/deadline", ok12)] });
    assert.notDeepEqual(r, { ok: false, text: CANT });
  } finally {
    await t.cleanup();
  }
});

// ---- propose ----------------------------------------------------------------

const SITE_MOVED = "The site changed since you opened it. I've loaded the latest; please check your changes and try again.";

// Another change lands on the site after the page loaded: a new version.
async function otherEdit(t, file, edit) {
  const p = schema.files[file].path;
  const data = await t.readData(p);
  edit(data);
  return t.local.write({ baseSha: await t.local.head(), message: "Website edit: other", files: { [p]: JSON.stringify(data, null, 2) + "\n" } });
}

test("loadContent's version moves on with the site", async () => {
  const t = await setup();
  try {
    const sha = await otherEdit(t, "faq", (d) => { d.cta.title = "Other"; });
    assert.equal((await loadContent(t.deps)).version, sha);
  } finally {
    await t.cleanup();
  }
});

test("propose with the version she opened: refused with reload when a file it touches changed since, and nothing is stored", async () => {
  const t = await setup();
  try {
    const opened = (await loadContent(t.deps)).version;
    await otherEdit(t, "travel", (d) => { d.room_block.hotel_name = "Someone else"; });
    const r = seen(await propose(t.deps, { ops: [DEADLINE], base: opened }));
    assert.deepEqual(r, { ok: false, text: SITE_MOVED, reload: true });
    assert.deepEqual(proposalKeys(t.store), []);
    // Opened at the latest version: fine.
    const now = (await loadContent(t.deps)).version;
    assert.equal((await propose(t.deps, { ops: [DEADLINE], base: now })).kind, "proposal");
  } finally {
    await t.cleanup();
  }
});

test("propose with an older version still works when only other files changed since", async () => {
  const t = await setup();
  try {
    const opened = (await loadContent(t.deps)).version;
    await otherEdit(t, "faq", (d) => { d.cta.title = "Other"; });
    assert.equal((await propose(t.deps, { ops: [DEADLINE], base: opened })).kind, "proposal");
    assert.equal((await propose(t.deps, { ops: [DEADLINE] })).kind, "proposal", "no version: as before");
  } finally {
    await t.cleanup();
  }
});

test("propose: a version that isn't one, or can't be read, is never treated as current", async () => {
  const unknown = "0".repeat(40);
  // As GitHub does, reading at a version it doesn't have fails.
  const t = await setup({
    repoWrap: (local) => ({ ...local, readFiles: (paths, ref) => (ref === unknown ? Promise.reject(new Error("404")) : local.readFiles(paths, ref)) }),
  });
  try {
    for (const base of [12, "", "not a version", "../x", "ABCDEF1"]) {
      assert.deepEqual(await propose(t.deps, { ops: [DEADLINE], base }), { ok: false, text: CANT }, String(base));
    }
    await otherEdit(t, "faq", (d) => { d.cta.title = "Other"; });
    assert.deepEqual(await propose(t.deps, { ops: [DEADLINE], base: unknown }), { ok: false, text: SITE_MOVED, reload: true });
  } finally {
    await t.cleanup();
  }
});

test("valid ops return a summary and store a proposal; nothing is written to the site", async () => {
  const t = await setup();
  try {
    const before = await t.read("src/_data/travel.json");
    const r = seen(await propose(t.deps, { ops: [DEADLINE] }));
    assert.deepEqual(Object.keys(r).sort(), ["id", "kind", "summary"]);
    assert.equal(r.kind, "proposal");
    assert.match(r.id, /^[0-9a-f]{16}$/);
    assert.equal(r.summary.length, 1);
    assert.match(r.summary[0], /June 1, 2028/);
    const stored = await t.store.get(`proposal:${r.id}`);
    assert.equal(stored.id, r.id);
    assert.equal(stored.baseSha, "local-base");
    assert.equal(stored.createdAt, START);
    assert.deepEqual(stored.summary, r.summary);
    assert.deepEqual(stored.contentOps, [DEADLINE]);
    for (const gone of ["needsPreview", "fileEdits", "note", "photos"]) assert.equal(gone in stored, false, gone);
    assert.equal(await t.repo.head(), "local-base");
    assert.equal(await t.read("src/_data/travel.json"), before);
  } finally {
    await t.cleanup();
  }
});

test("ops the editor cannot take are refused with one sentence, and nothing is stored", async () => {
  const t = await setup();
  try {
    const bad = [
      undefined, null, "set", {}, [null], ["x"],
      [set("nope", "/a", "b")], [set("__proto__", "/a", "b")], [set("toString", "/a", "b")],
      [{ op: "unset", file: "travel", path: "/room_block/deadline" }],
      [{ op: "replace", file: "travel", path: "/room_block/deadline", value: "x" }],
      [{ op: "set", file: "travel", path: 5, value: "x" }],
      [{ ...DEADLINE, extra: 1 }],
      Array.from({ length: 51 }, () => DEADLINE),
    ];
    for (const ops of bad) {
      assert.deepEqual(seen(await propose(t.deps, { ops })), { ok: false, text: CANT }, JSON.stringify(ops)?.slice(0, 80));
    }
    assert.deepEqual(await propose(t.deps), { ok: false, text: CANT });
    for (const photos of ["AAAA", [PHOTO, PHOTO, PHOTO, PHOTO]]) {
      assert.deepEqual(await propose(t.deps, { ops: [DEADLINE], photos }), { ok: false, text: CANT });
    }
    assert.deepEqual(proposalKeys(t.store), []);
    // Fifty is fine.
    assert.equal((await propose(t.deps, { ops: Array.from({ length: 50 }, () => DEADLINE) })).kind, "proposal");
  } finally {
    await t.cleanup();
  }
});

test("a path that is not on the site is a problem named by its section, and nothing is stored", async () => {
  const t = await setup();
  try {
    const r = seen(await propose(t.deps, { ops: [set("travel", "/room_block/nope/deep", "x")] }));
    assert.deepEqual(r, { ok: false, problems: [{ label: "Travel & Hotels", message: "Step 1 points at something that is not on the site." }] });
    assert.deepEqual(proposalKeys(t.store), []);
  } finally {
    await t.cleanup();
  }
});

test("a value the checks refuse is a problem named by its field, and nothing is stored", async () => {
  const t = await setup();
  try {
    const r = seen(await propose(t.deps, { ops: [set("travel", "/room_block/deadline", "2028-13-45")] }));
    assert.deepEqual(r, {
      ok: false,
      problems: [{ label: "Travel & Hotels → Room block → Booking deadline", message: "Booking deadline must be a real date written like 2028-06-01." }],
    });
    assert.deepEqual(proposalKeys(t.store), []);
  } finally {
    await t.cleanup();
  }
});

test("ops that would change nothing say so and store nothing", async () => {
  const t = await setup();
  try {
    assert.deepEqual(seen(await propose(t.deps, { ops: [set("travel", "/room_block/deadline", "")] })), { ok: false, text: NO_CHANGE });
    assert.deepEqual(await propose(t.deps, { ops: [] }), { ok: false, text: NO_CHANGE });
    assert.deepEqual(proposalKeys(t.store), []);
  } finally {
    await t.cleanup();
  }
});

test("a bad photo returns the photo check's reason and stores nothing", async () => {
  const t = await setup();
  try {
    const r = seen(await propose(t.deps, { ops: [DEADLINE], photos: [PHOTO, Buffer.from("hello").toString("base64")] }));
    assert.deepEqual(r, { ok: false, text: "That file isn't a photo I can use." });
    assert.deepEqual([...t.store.written], []);
  } finally {
    await t.cleanup();
  }
});

const usePhoto = (n = 1) => [set("home", "/hero/photo", `@photo:${n}`)];

test("@photo:n becomes the new photo's address; the photo is named, kept, and checked as one that will exist", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: usePhoto(1), photos: [PHOTO] });
    assert.equal(r.kind, "proposal", JSON.stringify(r));
    const stored = await t.store.get(`proposal:${r.id}`);
    assert.equal(stored.photos.length, 1);
    assert.match(stored.photos[0].name, /^photo-20261112-[0-9a-f]{6}\.png$/);
    assert.equal(stored.photos[0].value, `/images/${stored.photos[0].name}`);
    assert.deepEqual(stored.contentOps, [set("home", "/hero/photo", stored.photos[0].value)]);
    assert.deepEqual(r.summary, ["Home → Top of page → Main photo: current photo → new photo"]);
  } finally {
    await t.cleanup();
  }
});

test("@photo:n inside a new list item is replaced too; a photo no step uses is dropped", async () => {
  const t = await setup();
  try {
    const item = { image: "@photo:2", alt: "Us at the lake" };
    const r = await propose(t.deps, { ops: [{ op: "insert", file: "gallery", path: "/photos", index: 0, value: item }], photos: [PHOTO, PHOTO] });
    assert.equal(r.kind, "proposal", JSON.stringify(r));
    const stored = await t.store.get(`proposal:${r.id}`);
    assert.equal(stored.photos.length, 1);
    assert.equal(stored.contentOps[0].value.image, stored.photos[0].value);
    assert.equal(stored.contentOps[0].value.alt, "Us at the lake");
  } finally {
    await t.cleanup();
  }
});

test("a step that uses a photo that was not sent is a problem", async () => {
  const t = await setup();
  try {
    for (const photos of [undefined, [PHOTO]]) {
      const r = seen(await propose(t.deps, { ops: usePhoto(2), photos }));
      assert.equal(r.ok, false);
      assert.equal(r.problems.length, 1);
      assert.equal(r.problems[0].label, "Home");
      assert.match(r.problems[0].message, /photo/);
    }
    assert.deepEqual(proposalKeys(t.store), []);
  } finally {
    await t.cleanup();
  }
});

// ---- publish ----------------------------------------------------------------

test("publish writes the content and the photo in one change with the right message; a second publish writes nothing", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: usePhoto(1), photos: [PHOTO] });
    const name = (await t.store.get(`proposal:${r.id}`)).photos[0].name;
    const p = seen(await publish(t.deps, r.id));
    assert.equal(p.ok, true);
    assert.equal(p.title, r.summary[0].slice(0, 72));
    const edits = await t.repo.edits(10);
    assert.equal(edits.length, 1);
    assert.equal(edits[0].title, p.title);
    const { paths } = await t.repo.changeOf(edits[0].sha);
    assert.deepEqual(paths.sort(), ["src/_data/home.json", `src/images/${name}`].sort());
    const home = await t.read("src/_data/home.json");
    assert.equal(home, JSON.stringify(JSON.parse(home), null, 2) + "\n");
    assert.equal(JSON.parse(home).hero.photo, `/images/${name}`);
    assert.deepEqual(await fs.readFile(path.join(t.root, "src/images", name)), Buffer.from(PHOTO, "base64"));

    assert.deepEqual(await publish(t.deps, r.id), { ok: true, title: p.title, sha: p.sha });
    assert.equal((await t.repo.edits(10)).length, 1);
  } finally {
    await t.cleanup();
  }
});

test("a double tap publishing at the same moment writes once", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    const results = await Promise.all([publish(t.deps, r.id), publish(t.deps, r.id)]);
    assert.equal(results.filter((x) => x.ok).length, 1);
    assert.deepEqual(results.find((x) => !x.ok), { ok: false, text: "That is already being published." });
    assert.equal((await t.repo.edits(10)).length, 1);
  } finally {
    await t.cleanup();
  }
});

test("a photo that the change never uses is dropped", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE], photos: [PHOTO] });
    assert.equal((await t.store.get(`proposal:${r.id}`)).photos, undefined);
    await publish(t.deps, r.id);
    const { paths } = await t.repo.changeOf((await t.repo.edits(1))[0].sha);
    assert.deepEqual(paths, ["src/_data/travel.json"]);
  } finally {
    await t.cleanup();
  }
});

// Fix round 2, O5: a long title keeps the end, which says what changed.
test("a long title drops leading steps, not the end; publish and the saved title match", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [set("details", "/ceremony/items/0/value", "4:30 PM")] });
    assert.equal(r.summary[0], "Details (ceremony, reception, schedule) → Ceremony → Ceremony details → “Time” → Value: Will be provided soon → 4:30 PM");
    const p = seen(await publish(t.deps, r.id));
    assert.equal(p.title, "… → Ceremony details → “Time” → Value: Will be provided soon → 4:30 PM");
    assert.ok(p.title.length <= 72);
    assert.equal((await t.repo.edits(1))[0].title, p.title);
  } finally {
    await t.cleanup();
  }
});

test("a short title is unchanged, and a too-long last step is cut at its end", async () => {
  const t = await setup();
  try {
    let r = await propose(t.deps, { ops: [DEADLINE] });
    let p = await publish(t.deps, r.id);
    assert.equal(p.title, r.summary[0]);
    assert.ok(r.summary[0].length <= 72);

    const long = "Yes. ".repeat(40).trim();
    r = await propose(t.deps, { ops: [set("faq", "/questions/0/answer", long)] });
    assert.ok(r.summary[0].split(" → ").at(-1).length > 72);
    p = await publish(t.deps, r.id);
    assert.equal(p.title.length, 72);
    assert.ok(p.title.startsWith("… → Yes. Yes."), p.title);
    assert.ok(p.title.endsWith("…"));
    assert.equal((await t.repo.edits(1))[0].title, p.title);
  } finally {
    await t.cleanup();
  }
});

test("the title drops the Please check prefix and is cut to 72 characters", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [set("rsvp", "/rsvp_open", true)] });
    assert.match(r.summary[0], /^Please check: /);
    const p = await publish(t.deps, r.id);
    assert.equal(p.title, r.summary[0].replace(/^Please check: /, "").slice(0, 72));
    assert.ok(!p.title.startsWith("Please check"));
  } finally {
    await t.cleanup();
  }
});

test("publish B after A: B's ops apply on top of A's content", async () => {
  const t = await setup();
  try {
    const a = await propose(t.deps, { ops: [DEADLINE] });
    const b = await propose(t.deps, { ops: [{ op: "insert", file: "faq", path: "/questions", index: 0, value: { question: "Are kids invited?", answer: "Yes." } }] });
    assert.equal((await publish(t.deps, a.id)).ok, true);
    assert.equal((await publish(t.deps, b.id)).ok, true);
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "2028-06-01");
    assert.equal((await t.readData("src/_data/faq.json")).questions[0].question, "Are kids invited?");
    assert.equal((await t.repo.edits(10)).length, 2);
  } finally {
    await t.cleanup();
  }
});

test("a StaleError on the first write is retried once on fresh content", async () => {
  let failures = 1;
  const t = await setup({
    repoWrap: (local) => ({
      ...local,
      async write(args) {
        if (failures > 0) {
          failures--;
          // Someone else saves first, then this write finds the site has moved on.
          const faq = JSON.parse((await local.readFiles(["src/_data/faq.json"]))["src/_data/faq.json"]);
          faq.hero.title = "Questions";
          await local.write({ branch: "main", baseSha: await local.head(), message: "Website edit: other", files: { "src/_data/faq.json": JSON.stringify(faq, null, 2) + "\n" } });
          throw new StaleError();
        }
        return local.write(args);
      },
    }),
  });
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    assert.equal((await publish(t.deps, r.id)).ok, true);
    assert.equal((await t.readData("src/_data/faq.json")).hero.title, "Questions");
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "2028-06-01");
  } finally {
    await t.cleanup();
  }
});

test("two StaleErrors in a row publish nothing and free the change to try again", async () => {
  let failures = 2;
  const t = await setup({
    repoWrap: (local) => ({ ...local, async write(args) { if (failures-- > 0) throw new StaleError(); return local.write(args); } }),
  });
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    const p = seen(await publish(t.deps, r.id));
    assert.equal(p.ok, false);
    assert.equal((await t.repo.edits(10)).length, 0);
    assert.equal((await publish(t.deps, r.id)).ok, true);
  } finally {
    await t.cleanup();
  }
});

const REVIEWED_MOVED = "The site changed since you reviewed this. I've loaded the latest; please review your changes again.";

test("publish refuses with reload when a file it touches changed since review, writes nothing, and releases it", async () => {
  const t = await setup();
  try {
    const a = await propose(t.deps, { ops: [{ op: "remove", file: "faq", path: "/questions/0" }] });
    // Someone else removes the first question meanwhile: "item 1" is now a different question.
    const faq = await t.readData("src/_data/faq.json");
    faq.questions.splice(0, 1);
    await t.repo.write({ branch: "main", baseSha: "local-base", message: "x", files: { "src/_data/faq.json": JSON.stringify(faq, null, 2) + "\n" } });
    const head = await t.repo.head();
    const p = seen(await publish(t.deps, a.id));
    assert.deepEqual(p, { ok: false, text: REVIEWED_MOVED, reload: true });
    assert.equal(await t.repo.head(), head, "nothing written");
    assert.deepEqual(await t.readData("src/_data/faq.json"), faq);
    const stored = await t.store.get(`proposal:${a.id}`);
    assert.equal(stored.publishing, undefined, "claim released");
    assert.equal(stored.published, undefined);
    // Publishing again is not told it is already under way.
    assert.deepEqual(await publish(t.deps, a.id), { ok: false, text: REVIEWED_MOVED, reload: true });
  } finally {
    await t.cleanup();
  }
});

test("publish after a change to a different file goes ahead and keeps both", async () => {
  const t = await setup();
  try {
    const a = await propose(t.deps, { ops: [DEADLINE] });
    const faq = await t.readData("src/_data/faq.json");
    faq.cta.title = "Someone else's heading";
    await t.repo.write({ branch: "main", baseSha: "local-base", message: "x", files: { "src/_data/faq.json": JSON.stringify(faq, null, 2) + "\n" } });
    const p = await publish(t.deps, a.id);
    assert.equal(p.ok, true);
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "2028-06-01");
    assert.equal((await t.readData("src/_data/faq.json")).cta.title, "Someone else's heading");
  } finally {
    await t.cleanup();
  }
});

test("preview refuses with reload when a file it touches changed since review, and can be asked again", async () => {
  const t = await setup();
  try {
    const a = await propose(t.deps, { ops: [DEADLINE] });
    const travel = await t.readData("src/_data/travel.json");
    travel.room_block.hotel_name = "Someone else";
    await t.repo.write({ branch: "main", baseSha: "local-base", message: "x", files: { "src/_data/travel.json": JSON.stringify(travel, null, 2) + "\n" } });
    assert.deepEqual(seen(await preview(t.deps, a.id)), { ok: false, text: REVIEWED_MOVED, reload: true });
    const stored = await t.store.get(`proposal:${a.id}`);
    assert.equal(stored.previewing, undefined);
    assert.equal(stored.preview, undefined);
    assert.deepEqual(await preview(t.deps, a.id), { ok: false, text: REVIEWED_MOVED, reload: true });
    // A different file changing doesn't stop a preview.
    const b = await propose(t.deps, { ops: [set("faq", "/cta/title", "New")] });
    assert.deepEqual(await preview(t.deps, b.id), { ok: true });
  } finally {
    await t.cleanup();
  }
});

test("a theme colour change also replaces the matching colour in DESIGN.md", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [set("theme", "/rosette", "#E2A99C")] });
    assert.equal((await publish(t.deps, r.id)).ok, true);
    const design = await t.read("DESIGN.md");
    assert.ok(!/#E0AA9E/i.test(design));
    assert.match(design, /Rosette #E2A99C/);
    assert.equal((await t.readData("src/_data/theme.json")).rosette, "#E2A99C");
    const { paths } = await t.repo.changeOf((await t.repo.edits(1))[0].sha);
    assert.deepEqual(paths.sort(), ["DESIGN.md", "src/_data/theme.json"]);
  } finally {
    await t.cleanup();
  }
});

test("DESIGN.md keeps a colour that another theme setting still uses", async () => {
  const t = await setup();
  try {
    const original = await t.read("DESIGN.md");
    const r = await propose(t.deps, { ops: [set("theme", "/gold", "#C9A04B"), set("theme", "/hairline", "#C9A04A")] });
    assert.equal((await publish(t.deps, r.id)).ok, true);
    const design = await t.read("DESIGN.md");
    // Gold's old value is still used by the hairline, so it stays; the old hairline colour is replaced.
    assert.equal((design.match(/#C9A04A/gi) || []).length, (original.match(/#C9A04A/gi) || []).length + (original.match(/#E4DCCA/gi) || []).length);
    assert.ok(!/#E4DCCA/i.test(design));
    assert.ok(!/#C9A04B/i.test(design));
  } finally {
    await t.cleanup();
  }
});

// ---- preview ----------------------------------------------------------------

test("any change can be previewed first, then published", async () => {
  let opened = 0;
  let closed = 0;
  const t = await setup({
    repoWrap: (local) => ({
      ...local,
      openPreview: async (a) => { opened++; return local.openPreview(a); },
      closePreview: async (a) => { closed++; return local.closePreview(a); },
    }),
  });
  try {
    const r = seen(await propose(t.deps, { ops: [DEADLINE] }));
    assert.equal(r.summary.length, 1);

    const s0 = await status(t.deps, { id: r.id });
    assert.deepEqual(s0, { stage: "preview", state: "waiting" });

    assert.deepEqual(await preview(t.deps, r.id), { ok: true });
    assert.deepEqual(await preview(t.deps, r.id), { ok: true });
    assert.equal(opened, 1);
    const stored = await t.store.get(`proposal:${r.id}`);
    assert.equal(stored.preview.number, 0);
    const staged = await fs.readFile(path.join(t.root, ".editor-local/previews", r.id, "src/_data/travel.json"), "utf8");
    assert.equal(JSON.parse(staged).room_block.deadline, "2028-06-01");

    t.netlify.states.set(stored.preview.sha, "building");
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "preview", state: "building" });

    t.netlify.states.set(stored.preview.sha, "ready");
    const s = await status(t.deps, { id: r.id });
    assert.equal(s.stage, "preview");
    assert.equal(s.state, "ready");
    assert.ok(s.url);
    const p = await publish(t.deps, r.id);
    assert.equal(p.ok, true);
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "2028-06-01");
    assert.equal(closed, 1);
    await assert.rejects(fs.access(path.join(t.root, ".editor-local/previews", r.id)));
  } finally {
    await t.cleanup();
  }
});

test("a failure to close the preview does not fail the publish", async () => {
  const t = await setup({ repoWrap: (local) => ({ ...local, closePreview: async () => { throw new Error("nope"); } }) });
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    await preview(t.deps, r.id);
    assert.equal((await publish(t.deps, r.id)).ok, true);
  } finally {
    await t.cleanup();
  }
});

test("a failed preview throws the change away", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    await preview(t.deps, r.id);
    const { sha } = (await t.store.get(`proposal:${r.id}`)).preview;
    t.netlify.states.set(sha, "failed");
    const s = seen(await status(t.deps, { id: r.id }));
    assert.deepEqual(s, { stage: "preview", state: "failed", text: THROWN_AWAY });
    assert.equal(await t.store.get(`proposal:${r.id}`), null);
    await assert.rejects(fs.access(path.join(t.root, ".editor-local/previews", r.id)));
    assert.deepEqual(seen(await publish(t.deps, r.id)), { ok: false, text: EXPIRED });
  } finally {
    await t.cleanup();
  }
});

test("cancel closes the preview, marks the change cancelled, and succeeds when it is already gone", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    await preview(t.deps, r.id);
    assert.deepEqual(await cancel(t.deps, r.id), { ok: true });
    // Fix round 2 (N): the record is kept as a light "cancelled" marker, never deleted outright.
    const left = await t.store.get(`proposal:${r.id}`);
    assert.deepEqual(Object.keys(left).sort(), ["cancelled", "createdAt", "id"]);
    assert.deepEqual(seen(await status(t.deps, { id: r.id })), { stage: "preview", state: "failed", text: EXPIRED });
    await assert.rejects(fs.access(path.join(t.root, ".editor-local/previews", r.id)));
    assert.deepEqual(await cancel(t.deps, r.id), { ok: true });
    assert.deepEqual(await cancel(t.deps, "not-an-id"), { ok: true });
  } finally {
    await t.cleanup();
  }
});

// Task 18 C: cancel and publish racing never end with "cancelled" and a change on the site.
test("cancel and publish at the same moment: never both cancelled and written", async () => {
  const ticks = async (n) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
  for (const cancelFirst of [true, false]) {
    for (let delay = 0; delay < 12; delay++) {
      const t = await setup();
      try {
        const r = await propose(t.deps, { ops: [DEADLINE] });
        const first = cancelFirst ? () => cancel(t.deps, r.id) : () => publish(t.deps, r.id);
        const second = cancelFirst ? () => publish(t.deps, r.id) : () => cancel(t.deps, r.id);
        const [a, b] = await Promise.all([first(), ticks(delay).then(second)]);
        const [cancelled, published] = cancelFirst ? [a, b] : [b, a];
        const written = (await t.repo.edits(10)).length;
        const where = `cancel ${cancelFirst ? "first" : "second"}, delay ${delay}`;
        if (cancelled.ok) {
          assert.equal(written, 0, `${where}: told cancelled, but it went live`);
          assert.ok((await t.store.get(`proposal:${r.id}`)).cancelled, where);
        }
        if (written) assert.ok(published.ok, where);
      } finally {
        await t.cleanup();
      }
    }
  }
});

// Fix round 2, N: cancel never deletes, so the production store's unchecked
// delete cannot race a publish claim.
test("cancel and publish racing, 200 times on the lost-swap store and 200 on a compare-and-swap store", async () => {
  const ticks = async (n) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
  const outcomes = new Set();
  for (const kind of ["lost-swap", "cas"]) {
    for (let i = 0; i < 200; i++) {
      const store = kind === "cas" ? casStore : () => recordingStore({ lose: i % 2 === 0 });
      const t = await setup({ store });
      try {
        const r = await propose(t.deps, { ops: [DEADLINE] });
        const cancelFirst = i % 4 < 2;
        const delay = Math.floor(i / 4) % 25;
        const first = cancelFirst ? () => cancel(t.deps, r.id) : () => publish(t.deps, r.id);
        const second = cancelFirst ? () => publish(t.deps, r.id) : () => cancel(t.deps, r.id);
        const [a, b] = await Promise.all([first(), ticks(delay).then(second)]);
        const [c, p] = cancelFirst ? [a, b] : [b, a];
        const written = (await t.repo.edits(10)).length;
        const where = `${kind} run ${i}`;
        if (c.ok) {
          assert.equal(written, 0, `${where}: told cancelled, but it went live`);
          assert.deepEqual(p, { ok: false, text: EXPIRED }, where);
          outcomes.add("cancelled");
        } else {
          assert.equal(written, 1, where);
          assert.equal(p.ok, true, where);
          outcomes.add("published");
        }
      } finally {
        await t.cleanup();
      }
    }
  }
  assert.deepEqual([...outcomes].sort(), ["cancelled", "published"]);
});

test("a cancelled change cannot be previewed, published or checked, and its marker expires after a day", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE], photos: [PHOTO] });
    assert.deepEqual(await cancel(t.deps, r.id), { ok: true });
    assert.deepEqual(seen(await publish(t.deps, r.id)), { ok: false, text: EXPIRED });
    assert.deepEqual(seen(await preview(t.deps, r.id)), { ok: false, text: EXPIRED });
    assert.deepEqual(seen(await status(t.deps, { id: r.id })), { stage: "preview", state: "failed", text: EXPIRED });
    assert.deepEqual(await cancel(t.deps, r.id), { ok: true });
    assert.equal((await t.repo.edits(10)).length, 0);
    assert.ok((await t.store.get(`proposal:${r.id}`)).cancelled);
    t.advance(DAY + 1);
    await status(t.deps, { id: r.id });
    assert.equal(await t.store.get(`proposal:${r.id}`), null);
  } finally {
    await t.cleanup();
  }
});

test("publish does not bring back a change that vanished while it was publishing", async () => {
  let t;
  t = await setup({
    repoWrap: (local) => ({
      ...local,
      async write(args) {
        await t.store.delete(`proposal:${current}`);
        return local.write(args);
      },
    }),
  });
  let current;
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    current = r.id;
    const res = await publish(t.deps, r.id);
    assert.equal(res.ok, true);
    assert.equal(await t.store.get(`proposal:${r.id}`), null);
  } finally {
    await t.cleanup();
  }
});

test("a change expires 24 hours after it was made", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    t.advance(DAY + 1);
    assert.deepEqual(seen(await publish(t.deps, r.id)), { ok: false, text: EXPIRED });
    assert.equal(await t.store.get(`proposal:${r.id}`), null);
    assert.equal((await t.repo.edits(10)).length, 0);
  } finally {
    await t.cleanup();
  }
});

// ---- status after publish -----------------------------------------------------

test("status after publish reports the live site; a failure is undone once and says so", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    await publish(t.deps, r.id);
    const { sha, title } = (await t.repo.edits(1))[0];
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "waiting", sha, title });
    t.netlify.states.set(sha, "building");
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "building", sha, title });
    t.netlify.states.set(sha, "failed");
    const polls = await Promise.all([status(t.deps, { id: r.id }), status(t.deps, { id: r.id })]);
    // One poll puts the site back; the other is told it is still under way.
    assert.deepEqual(polls.map(seen).sort((a, b) => a.state.localeCompare(b.state)), [
      { stage: "publish", state: "building" },
      { stage: "publish", state: "failed", text: PUT_BACK },
    ]);
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "failed", text: PUT_BACK });
    const edits = await t.repo.edits(10);
    assert.equal(edits.length, 2);
    assert.match(edits[0].title, /^Undo — /);
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "");
    await status(t.deps, { id: r.id });
    assert.equal((await t.repo.edits(10)).length, 2);
  } finally {
    await t.cleanup();
  }
});

test("status reports ready with the address once the site is live", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    await publish(t.deps, r.id);
    const { sha, title } = (await t.repo.edits(1))[0];
    t.netlify.states.set(sha, "ready");
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "ready", url: `https://example.test/${sha}`, sha, title });
  } finally {
    await t.cleanup();
  }
});

// ---- history and undo ---------------------------------------------------------

async function publishOps(t, ops) {
  const r = await propose(t.deps, { ops });
  assert.equal(r.kind, "proposal", JSON.stringify(r));
  const p = await publish(t.deps, r.id);
  assert.equal(p.ok, true, JSON.stringify(p));
  return (await t.repo.edits(1))[0].sha;
}

test("history lists recent edits with a date", async () => {
  const t = await setup();
  try {
    const sha = await publishOps(t, [DEADLINE]);
    const h = await history(t.deps);
    assert.equal(h.length, 1);
    assert.equal(h[0].sha, sha);
    assert.ok(h[0].title.length > 0);
    assert.equal(new Date(h[0].when).toISOString(), h[0].when);
  } finally {
    await t.cleanup();
  }
});

test("undo restores what still matches and names what it skipped", async () => {
  const t = await setup();
  try {
    const first = await publishOps(t, [DEADLINE, set("faq", "/hero/title", "Questions")]);
    await publishOps(t, [set("faq", "/hero/title", "Answers")]);
    const u = seen(await undo(t.deps, first));
    assert.equal(u.ok, true);
    assert.equal(u.restored.length, 1);
    assert.match(u.restored[0], /Travel/);
    assert.equal(u.skipped.length, 1);
    assert.match(u.skipped[0], /FAQ/);
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "");
    assert.equal((await t.readData("src/_data/faq.json")).hero.title, "Answers");
    const edits = await t.repo.edits(10);
    assert.equal(edits[0].title, `Undo — ${edits[2].title}`);
  } finally {
    await t.cleanup();
  }
});

test("undo leaves added photos in place", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: usePhoto(1), photos: [PHOTO] });
    const name = (await t.store.get(`proposal:${r.id}`)).photos[0].name;
    await publish(t.deps, r.id);
    const u = await undo(t.deps, (await t.repo.edits(1))[0].sha);
    assert.equal(u.ok, true);
    assert.equal((await t.readData("src/_data/home.json")).hero.photo, "/images/119812256_unknown.webp");
    await fs.access(path.join(t.root, "src/images", name));
  } finally {
    await t.cleanup();
  }
});

test("undo refuses a change that is not a recent website edit", async () => {
  const t = await setup();
  try {
    const other = await t.repo.write({ branch: "main", baseSha: "local-base", message: "Manual change", files: { "src/_data/faq.json": (await t.read("src/_data/faq.json")) + "\n" } });
    const a = seen(await undo(t.deps, other));
    assert.equal(a.ok, false);
    const b = seen(await undo(t.deps, "0".repeat(40)));
    assert.equal(b.ok, false);
    assert.equal((await t.repo.edits(10)).length, 0);
  } finally {
    await t.cleanup();
  }
});

test("undo leaves alone a stylesheet an old edit changed, and says so", async () => {
  const t = await setup();
  try {
    const css = await t.read("src/css/styles.css");
    const faq = await t.readData("src/_data/faq.json");
    faq.hero.title = "Questions";
    await t.repo.write({
      branch: "main", baseSha: await t.repo.head(), message: "Website edit: Wider column",
      files: { "src/css/styles.css": css.replace("max-width: 640px", "max-width: 660px"), "src/_data/faq.json": JSON.stringify(faq, null, 2) + "\n" },
    });
    const u = seen(await undo(t.deps, (await t.repo.edits(1))[0].sha));
    assert.equal(u.ok, true);
    assert.equal(u.restored.length, 1);
    assert.match(u.restored[0], /FAQ/);
    assert.deepEqual(u.skipped, ["The look of the whole site was left as it is, because the editor no longer changes it."]);
    assert.match(await t.read("src/css/styles.css"), /max-width: 660px/);

    // An edit that changed only the stylesheet has nothing to undo.
    await t.repo.write({
      branch: "main", baseSha: await t.repo.head(), message: "Website edit: Wider still",
      files: { "src/css/styles.css": css.replace("max-width: 640px", "max-width: 680px") },
    });
    assert.deepEqual(seen(await undo(t.deps, (await t.repo.edits(1))[0].sha)), { ok: false, text: LOOKS_ONLY });
    assert.match(await t.read("src/css/styles.css"), /max-width: 680px/);
  } finally {
    await t.cleanup();
  }
});

test("undo of a colour change also puts back DESIGN.md", async () => {
  const t = await setup();
  try {
    const original = await t.read("DESIGN.md");
    const sha = await publishOps(t, [set("theme", "/rosette", "#E2A99C")]);
    assert.equal((await undo(t.deps, sha)).ok, true);
    assert.equal(await t.read("DESIGN.md"), original);
    assert.equal((await t.readData("src/_data/theme.json")).rosette, "#E0AA9E");
  } finally {
    await t.cleanup();
  }
});

test("an undo that meets a moved site retries once", async () => {
  let failures = 0;
  const t = await setup({
    repoWrap: (local) => ({ ...local, async write(args) { if (failures-- > 0) throw new StaleError(); return local.write(args); } }),
  });
  try {
    const sha = await publishOps(t, [DEADLINE]);
    failures = 1;
    assert.equal((await undo(t.deps, sha)).ok, true);
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "");
  } finally {
    await t.cleanup();
  }
});

// ---- fix round 1 ---------------------------------------------------------------

const NOT_YET = "Something went wrong with that change, and I'm still putting the site back. Please check again in a minute.";
const NOT_PUT_BACK = "Something went wrong with that change, and I couldn't put the site back. Please check the site.";

test("two previews at the same moment open only one", async () => {
  let opened = 0;
  const t = await setup({ repoWrap: (local) => ({ ...local, openPreview: async (a) => { opened++; return local.openPreview(a); } }) });
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    const results = await Promise.all([preview(t.deps, r.id), preview(t.deps, r.id)]);
    assert.deepEqual(results, [{ ok: true }, { ok: true }]);
    assert.equal(opened, 1);
  } finally {
    await t.cleanup();
  }
});

async function failedLiveUpdate(t) {
  const r = await propose(t.deps, { ops: [DEADLINE] });
  await publish(t.deps, r.id);
  t.netlify.states.set((await t.repo.edits(1))[0].sha, "failed");
  return r.id;
}

test("an automatic undo that fails once says so, and the next poll puts the site back", async () => {
  let failNext = false;
  const t = await setup({
    repoWrap: (local) => ({ ...local, async write(a) { if (failNext) { failNext = false; throw new Error("upstream said no"); } return local.write(a); } }),
  });
  try {
    const id = await failedLiveUpdate(t);
    failNext = true;
    assert.deepEqual(seen(await status(t.deps, { id })), { stage: "publish", state: "failed", text: NOT_YET });
    assert.deepEqual(await status(t.deps, { id }), { stage: "publish", state: "failed", text: PUT_BACK });
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "");
  } finally {
    await t.cleanup();
  }
});

test("an automatic undo is tried at most twice, then stops", async () => {
  let failing = false;
  let writes = 0;
  const t = await setup({
    repoWrap: (local) => ({ ...local, async write(a) { if (failing) { writes++; throw new Error("upstream said no"); } return local.write(a); } }),
  });
  try {
    const id = await failedLiveUpdate(t);
    failing = true;
    assert.deepEqual(await status(t.deps, { id }), { stage: "publish", state: "failed", text: NOT_YET });
    assert.deepEqual(seen(await status(t.deps, { id })), { stage: "publish", state: "failed", text: NOT_PUT_BACK });
    assert.deepEqual(await status(t.deps, { id }), { stage: "publish", state: "failed", text: NOT_PUT_BACK });
    assert.equal(writes, 2);
  } finally {
    await t.cleanup();
  }
});

test("a failed preview is thrown away even if closing it fails", async () => {
  const t = await setup({ repoWrap: (local) => ({ ...local, closePreview: async () => { throw new Error("nope"); } }) });
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    await preview(t.deps, r.id);
    t.netlify.states.set((await t.store.get(`proposal:${r.id}`)).preview.sha, "failed");
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "preview", state: "failed", text: THROWN_AWAY });
    assert.equal(await t.store.get(`proposal:${r.id}`), null);
  } finally {
    await t.cleanup();
  }
});

test("a change that expires during publish has its preview closed", async () => {
  let closed = 0;
  const t = await setup({ repoWrap: (local) => ({ ...local, closePreview: async (a) => { closed++; return local.closePreview(a); } }) });
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    await preview(t.deps, r.id);
    const sha = (await t.store.get(`proposal:${r.id}`)).preview.sha;
    t.netlify.states.set(sha, "ready");
    // The day runs out just as publish claims the change.
    let expired = false;
    t.deps.store = { ...t.store, update: (k, fn) => {
      if (!expired && k.startsWith("proposal:")) { expired = true; t.advance(DAY); }
      return t.store.update(k, fn);
    } };
    assert.deepEqual(await publish(t.deps, r.id), { ok: false, text: EXPIRED });
    assert.equal(closed, 1);
    assert.equal(await t.store.get(`proposal:${r.id}`), null);
  } finally {
    await t.cleanup();
  }
});

test("a photo name that is already taken is drawn again", async () => {
  const t = await setup();
  try {
    await fs.writeFile(path.join(t.root, "src/images/photo-20261112-000001.png"), "");
    const r = await propose(t.deps, { ops: usePhoto(1), photos: [PHOTO] });
    assert.equal((await t.store.get(`proposal:${r.id}`)).photos[0].name, "photo-20261112-000002.png");
  } finally {
    await t.cleanup();
  }
});

test("when no free photo name is found, nothing is stored", async () => {
  const t = await setup();
  try {
    for (let i = 1; i <= 5; i++) await fs.writeFile(path.join(t.root, `src/images/photo-20261112-00000${i}.png`), "");
    const r = seen(await propose(t.deps, { ops: usePhoto(1), photos: [PHOTO] }));
    assert.deepEqual(r, { ok: false, text: SAFE_FAIL });
    assert.deepEqual(proposalKeys(t.store), []);
  } finally {
    await t.cleanup();
  }
});

test("undo names a page file it cannot put back because it had no earlier version", async () => {
  const t = await setup();
  try {
    const faq = await t.readData("src/_data/faq.json");
    faq.hero.title = "Questions";
    await t.repo.write({
      branch: "main", baseSha: await t.repo.head(), message: "Website edit: Add a bit",
      files: { "src/_includes/new-bit.njk": "<p>hi</p>\n", "src/_data/faq.json": JSON.stringify(faq, null, 2) + "\n" },
    });
    const u = seen(await undo(t.deps, (await t.repo.edits(1))[0].sha));
    assert.equal(u.ok, true);
    assert.equal(u.restored.length, 1);
    assert.match(u.restored[0], /FAQ/);
    assert.deepEqual(u.skipped, ["A part shared by several pages was left as it is, because the editor no longer changes it."]);
    assert.equal(await t.read("src/_includes/new-bit.njk"), "<p>hi</p>\n");
  } finally {
    await t.cleanup();
  }
});

test("DESIGN.md keeps its upper-case colour style when the new colour is typed in lower case", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [set("theme", "/rosette", "#e2a99c")] });
    assert.equal((await publish(t.deps, r.id)).ok, true);
    const design = await t.read("DESIGN.md");
    assert.match(design, /Rosette #E2A99C/);
    assert.ok(!design.includes("#e2a99c"));
  } finally {
    await t.cleanup();
  }
});

// ---- wording ----------------------------------------------------------------

test("no sentence shown to Paige uses a banned word or names a collaborator error", () => {
  assert.ok(allTexts.length > 20);
  for (const s of allTexts) {
    assert.ok(!BANNED.test(s), s);
    assert.ok(!/Error|undefined|null|\{|\}/.test(s), s);
  }
});

// ---- final review, item 2: cancel never says "ok" for a change that is on the site ----

const ON_SITE = "That change is already on the site. Use Undo this to put it back.";

// The local repo dates edits by the real clock; this one dates them by the test's clock.
const clockDatedRepo = (getT) => (local) => {
  const dates = new Map();
  return {
    ...local,
    async write(a) {
      const sha = await local.write(a);
      dates.set(sha, new Date(getT().deps.now()).toISOString());
      return sha;
    },
    async edits(n) {
      return (await local.edits(n)).map((e) => ({ ...e, date: dates.get(e.sha) ?? e.date }));
    },
  };
};

// A publish whose function stopped after it claimed the change: the claim is
// left in the store, and the write may or may not have landed.
async function strandedPublish({ landed }) {
  let t;
  t = await setup({ repoWrap: clockDatedRepo(() => t) });
  const r = await propose(t.deps, { ops: [DEADLINE] });
  const claimedAt = t.deps.now();
  await t.store.update(`proposal:${r.id}`, (cur) => ({ ...cur, publishing: claimedAt }));
  let sha = null;
  if (landed) {
    t.advance(2000);
    const travel = await t.readData("src/_data/travel.json");
    travel.room_block.deadline = "2028-06-01";
    sha = await t.repo.write({ branch: "main", baseSha: await t.repo.head(), message: `Website edit: ${r.summary[0]}`,
      files: { "src/_data/travel.json": JSON.stringify(travel, null, 2) + "\n" } });
  }
  t.advance(61 * 1000); // the claim is now stale
  return { t, id: r.id, sha };
}

test("cancel after a completed publish refuses and leaves the record published", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    const p = await publish(t.deps, r.id);
    assert.equal(p.ok, true);
    assert.deepEqual(seen(await cancel(t.deps, r.id)), { ok: false, text: ON_SITE });
    const stored = await t.store.get(`proposal:${r.id}`);
    assert.ok(stored.published);
    assert.equal(stored.cancelled, undefined);
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "waiting", sha: p.sha, title: p.title });
  } finally {
    await t.cleanup();
  }
});

test("cancel on a fresh publishing claim is still refused as busy", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    await t.store.update(`proposal:${r.id}`, (cur) => ({ ...cur, publishing: t.deps.now() }));
    t.advance(30 * 1000);
    assert.deepEqual(await cancel(t.deps, r.id), { ok: false, text: "That is already being published." });
  } finally {
    await t.cleanup();
  }
});

test("cancel on a stale claim whose write landed marks it published and refuses", async () => {
  const { t, id, sha } = await strandedPublish({ landed: true });
  try {
    assert.deepEqual(seen(await cancel(t.deps, id)), { ok: false, text: ON_SITE });
    const stored = await t.store.get(`proposal:${id}`);
    assert.equal(stored.published.sha, sha);
    assert.equal(stored.publishing, undefined);
    assert.equal(stored.cancelled, undefined);
    t.netlify.states.set(sha, "ready");
    assert.equal((await status(t.deps, { id })).state, "ready");
  } finally {
    await t.cleanup();
  }
});

test("cancel on a stale claim whose write did not land cancels normally", async () => {
  const { t, id } = await strandedPublish({ landed: false });
  try {
    assert.deepEqual(await cancel(t.deps, id), { ok: true });
    assert.ok((await t.store.get(`proposal:${id}`)).cancelled);
    assert.deepEqual(await publish(t.deps, id), { ok: false, text: EXPIRED });
    assert.equal((await t.repo.edits(10)).length, 0);
  } finally {
    await t.cleanup();
  }
});

test("an edit with the same title from before the claim does not count as landed", async () => {
  let t;
  t = await setup({ repoWrap: clockDatedRepo(() => t) });
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    await t.repo.write({ branch: "main", baseSha: await t.repo.head(), message: `Website edit: ${r.summary[0]}`, files: { "src/_data/faq.json": (await t.read("src/_data/faq.json")) + "\n" } });
    t.advance(60 * 1000);
    await t.store.update(`proposal:${r.id}`, (cur) => ({ ...cur, publishing: t.deps.now() }));
    t.advance(61 * 1000);
    assert.deepEqual(await cancel(t.deps, r.id), { ok: true });
  } finally {
    await t.cleanup();
  }
});

// ---- final review, item 3: "Undo this" works by the change's own sha ----

test("a multi-paragraph answer gives a one-line title, the same in the history and the publish answer", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [set("faq", "/questions/0/answer", "Yes, kids are welcome.\n\nPlease list them\twhen you reply.")] });
    assert.doesNotMatch(r.summary[0], /[\n\t]|\s\s/);
    const p = seen(await publish(t.deps, r.id));
    assert.doesNotMatch(p.title, /[\n\t]|\s\s/);
    const [h] = await history(t.deps);
    assert.equal(h.title, p.title);
    assert.equal(h.sha, p.sha);
  } finally {
    await t.cleanup();
  }
});

test("publish answers with the sha it wrote, again on a second publish, and status carries it", async () => {
  const t = await setup();
  try {
    const r = await propose(t.deps, { ops: [DEADLINE] });
    const p = await publish(t.deps, r.id);
    const [edit] = await t.repo.edits(10);
    assert.deepEqual(p, { ok: true, title: edit.title, sha: edit.sha });
    assert.deepEqual(await publish(t.deps, r.id), p);
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "waiting", sha: p.sha, title: p.title });
    t.netlify.states.set(p.sha, "ready");
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "ready", url: `https://example.test/${p.sha}`, sha: p.sha, title: p.title });
    assert.equal((await undo(t.deps, p.sha)).ok, true);
  } finally {
    await t.cleanup();
  }
});

test("titleOf: one line, the Please check prefix dropped, at most 72 characters", async () => {
  const { titleOf } = await import("../netlify/editor/service.mjs");
  assert.equal(titleOf([]), "Site change");
  assert.equal(titleOf(["Please check: RSVP → RSVPs open: Off → On"]), "RSVP → RSVPs open: Off → On");
  assert.equal(titleOf(["FAQ → Answer: A →\n\nB\tC"]), "FAQ → Answer: A → B C");
  for (const s of [["x".repeat(200)], ["x".repeat(72)], [`FAQ → Q → Answer: A → ${"Yes.\n\n".repeat(40)}`]]) {
    const t = titleOf(s);
    assert.ok(t.length <= 72, t);
    assert.doesNotMatch(t, /[\n\t]|\s\s/);
  }
});

// ---- final review, item 6: a failed publish is put back even if the page was closed ----

const NOTICE = "An earlier change didn't work on the site, so I put the site back as it was.";
const unconfirmedIds = async (t) => ((await t.store.get("unconfirmed"))?.entries || []).map((e) => e.id);

async function publishAndLeave(t) {
  const r = await propose(t.deps, { ops: [DEADLINE] });
  const p = await publish(t.deps, r.id);
  assert.equal(p.ok, true);
  return { id: r.id, sha: p.sha };
}

const FAQ_TITLE = set("faq", "/hero/title", "Questions");

test("publish, never poll, the live update fails: the next proposal puts the site back and says so", async () => {
  const t = await setup();
  try {
    const { id, sha } = await publishAndLeave(t);
    assert.deepEqual(await unconfirmedIds(t), [id]);
    t.netlify.states.set(sha, "failed");
    const r = seen(await propose(t.deps, { ops: [FAQ_TITLE] }));
    assert.equal(r.kind, "proposal");
    assert.equal(r.notice, NOTICE);
    assert.ok(!/\b(commit|deploy|json|branch|repository|merge|build|token)/i.test(r.notice));
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "");
    assert.match((await t.repo.edits(1))[0].title, /^Undo — /);
    assert.deepEqual(await unconfirmedIds(t), []);
    // Her page, polling later, hears the same outcome; nothing is undone twice.
    assert.deepEqual(await status(t.deps, { id }), { stage: "publish", state: "failed", text: PUT_BACK });
    assert.equal("notice" in (await propose(t.deps, { ops: [FAQ_TITLE] })), false);
    assert.equal((await t.repo.edits(10)).length, 2);
  } finally {
    await t.cleanup();
  }
});

test("a live update that went fine is taken off the list, with no notice", async () => {
  const t = await setup();
  try {
    const { sha } = await publishAndLeave(t);
    t.netlify.states.set(sha, "ready");
    assert.equal("notice" in (await propose(t.deps, { ops: [FAQ_TITLE] })), false);
    assert.deepEqual(await unconfirmedIds(t), []);
    assert.equal((await t.repo.edits(10)).length, 1);
  } finally {
    await t.cleanup();
  }
});

test("status seeing the live site ready takes the change off the list", async () => {
  const t = await setup();
  try {
    const { id, sha } = await publishAndLeave(t);
    t.netlify.states.set(sha, "ready");
    assert.equal((await status(t.deps, { id })).state, "ready");
    assert.deepEqual(await unconfirmedIds(t), []);
  } finally {
    await t.cleanup();
  }
});

test("status completing a put-back takes the change off the list", async () => {
  const t = await setup();
  try {
    const { id, sha } = await publishAndLeave(t);
    t.netlify.states.set(sha, "failed");
    assert.deepEqual(await status(t.deps, { id }), { stage: "publish", state: "failed", text: PUT_BACK });
    assert.deepEqual(await unconfirmedIds(t), []);
  } finally {
    await t.cleanup();
  }
});

test("a collaborator error while settling never stops a proposal, and is logged by name only", async () => {
  const t = await setup();
  const logs = [];
  t.deps.log = (event, fields) => logs.push({ event, ...fields });
  try {
    const { id } = await publishAndLeave(t);
    t.netlify.deployFor = async () => { throw new TypeError("secret detail https://api.netlify.com"); };
    assert.equal((await propose(t.deps, { ops: [FAQ_TITLE] })).kind, "proposal");
    assert.deepEqual(logs, [{ event: "settle_failed", name: "TypeError" }]);
    assert.deepEqual(await unconfirmedIds(t), [id]);
    // A broken store is survived too.
    t.deps.store = { ...t.store, get: async () => { throw new RangeError("x"); } };
    assert.equal((await propose(t.deps, { ops: [FAQ_TITLE] })).kind, "proposal");
  } finally {
    await t.cleanup();
  }
});

test("an update still under way stays on the list, and is dropped and logged after 30 minutes", async () => {
  const t = await setup();
  const logs = [];
  t.deps.log = (event, fields) => logs.push({ event, ...fields });
  try {
    const { id, sha } = await publishAndLeave(t);
    t.netlify.states.set(sha, "building");
    await history(t.deps);
    assert.deepEqual(await unconfirmedIds(t), [id]);
    t.advance(31 * 60 * 1000);
    await history(t.deps);
    assert.deepEqual(await unconfirmedIds(t), []);
    assert.deepEqual(logs, [{ event: "unconfirmed_dropped" }]);
  } finally {
    await t.cleanup();
  }
});

test("history and publish settle the list too, and at most five are checked at a time", async () => {
  const t = await setup();
  try {
    const first = await publishAndLeave(t);
    t.netlify.states.set(first.sha, "failed");
    await history(t.deps);
    assert.equal((await t.readData("src/_data/travel.json")).room_block.deadline, "");
    assert.deepEqual(await unconfirmedIds(t), []);

    await t.store.set("unconfirmed", { entries: Array.from({ length: 7 }, (_, i) => ({ id: `00000000000000a${i}`, sha: `s${i}`, at: t.deps.now() })) });
    for (let i = 0; i < 7; i++) t.netlify.states.set(`s${i}`, "ready");
    t.netlify.calls.length = 0;
    const r = await propose(t.deps, { ops: [FAQ_TITLE] });
    assert.equal(t.netlify.calls.length, 5);
    assert.deepEqual(await unconfirmedIds(t), ["00000000000000a5", "00000000000000a6"]);
    await publish(t.deps, r.id);
    assert.deepEqual(await unconfirmedIds(t), [r.id]);
  } finally {
    await t.cleanup();
  }
});

test("settling stops starting new checks after 8 seconds; the rest wait for the next call", async () => {
  const t = await setup();
  try {
    await t.store.set("unconfirmed", { entries: Array.from({ length: 5 }, (_, i) => ({ id: `00000000000000b${i}`, sha: `s${i}`, at: t.deps.now() })) });
    for (let i = 0; i < 5; i++) t.netlify.states.set(`s${i}`, "ready");
    const deployFor = t.netlify.deployFor;
    t.netlify.deployFor = async (sha) => { t.advance(3000); return deployFor(sha); };
    assert.deepEqual(await settleUnconfirmed(t.deps), { putBack: false });
    // Checks start at 0, 3 and 6 seconds; at 9 seconds no new one starts.
    assert.equal(t.netlify.calls.length, 3);
    assert.deepEqual(await unconfirmedIds(t), ["00000000000000b3", "00000000000000b4"]);
    assert.equal((await history(t.deps)).length, 0);
    assert.deepEqual(await unconfirmedIds(t), []);
  } finally {
    await t.cleanup();
  }
});

test("settling never throws, even when the clock or the logger does", async () => {
  const t = await setup();
  try {
    await t.store.set("unconfirmed", { entries: [{ id: "00000000000000c0", sha: "s0", at: START }] });
    const deps = { ...t.deps, now: () => { throw new Error("no clock"); }, log: () => { throw new Error("no log"); } };
    assert.deepEqual(await settleUnconfirmed(deps), { putBack: false });
  } finally {
    await t.cleanup();
  }
});

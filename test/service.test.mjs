import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import schema from "../netlify/editor/schema.gen.mjs";
import { READABLE_LAYOUT_FILES } from "../netlify/editor/guard.mjs";
import { createLocalRepo } from "../netlify/editor/localrepo.mjs";
import { memoryStore } from "../netlify/editor/store.mjs";
import { StaleError } from "../netlify/editor/github.mjs";
import { ask, preview, status, publish, cancel, history, undo } from "../netlify/editor/service.mjs";

const SAFE_FAIL = "I couldn't make that change safely. Nothing changed.";
const NO_FIT = "The site changed since you asked, so that change no longer fits. Please ask again.";
const EXPIRED = "That change has expired. Please ask again.";
const LIMIT = "That's the limit for today. It resets tomorrow.";
const PUT_BACK = "Something went wrong and I've put the site back.";
const THROWN_AWAY = "That change didn't work on the site, so I've thrown it away.";
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

// A scripted stand-in for the SDK client. Each item is a response, or a
// function of the request that returns one.
function fakeClient() {
  const queue = [];
  const calls = [];
  return {
    calls,
    queue: (...items) => queue.push(...items),
    beta: {
      messages: {
        async create(request) {
          calls.push(structuredClone(request));
          const next = queue.shift();
          if (!next) throw new Error("script ran out");
          return typeof next === "function" ? next(request) : next;
        },
      },
    },
  };
}

const propose = (ops, edits = [], note = "Here is the change.") => ({
  stop_reason: "tool_use",
  content: [{
    type: "tool_use",
    id: "toolu_1",
    name: "propose_change",
    input: {
      note,
      content_ops: ops.map((o) => ({
        op: o.op, file: o.file, path: o.path,
        value_json: o.value === undefined ? null : JSON.stringify(o.value),
        index: o.index ?? null, to: o.to ?? null,
      })),
      file_edits: edits,
    },
  }],
});
const say = (text) => ({ stop_reason: "end_turn", content: [{ type: "text", text }] });
const set = (file, p, value) => ({ op: "set", file, path: p, value });

// Records which keys were ever given a value, so "stores nothing" can be checked.
// Behaves like the production compare-and-swap store at its worst: every
// update first runs `fn` on the value as it was when update was called (a
// losing attempt whose result is thrown away), then again on the real value.
function recordingStore() {
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
        await fn(await stale);
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
  for (const p of READABLE_LAYOUT_FILES) await copy(p);
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

async function setup({ repoWrap } = {}) {
  const root = await makeSite();
  const local = createLocalRepo({ root });
  const repo = repoWrap ? repoWrap(local) : local;
  const store = recordingStore();
  const client = fakeClient();
  const netlify = fakeNetlify();
  let clock = START;
  let n = 0;
  const deps = {
    repo, netlify, store, client, schema, env: {},
    now: () => clock,
    random: (bytes) => (++n).toString(16).padStart(bytes * 2, "0").slice(-bytes * 2),
  };
  const read = async (p) => fs.readFile(path.join(root, p), "utf8");
  const readData = async (p) => JSON.parse(await read(p));
  const texts = [];
  return {
    root, local, repo, store, client, netlify, deps, read, readData, texts,
    advance: (ms) => { clock += ms; },
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
}

// Every user-facing sentence goes through here so the banned-word test sees it.
const allTexts = [];
const seen = (r) => {
  for (const k of ["text", "title", "note"]) if (typeof r?.[k] === "string") allTexts.push(r[k]);
  for (const k of ["summary", "restored", "skipped"]) if (Array.isArray(r?.[k])) allTexts.push(...r[k]);
  return r;
};

const DEADLINE = set("travel", "/room_block/deadline", "2028-06-01");
const proposalKeys = (store) => [...store.written].filter((k) => k.startsWith("proposal:"));

// ---- ask ------------------------------------------------------------------

test("a content request returns a summary and stores a proposal; nothing is written to the site", async () => {
  const t = await setup();
  try {
    const before = await t.read("src/_data/travel.json");
    t.client.queue(propose([DEADLINE], [], "Set the hotel deadline."));
    const r = seen(await ask(t.deps, { message: "change the hotel block deadline to June 1 2028", history: [] }));
    assert.equal(r.kind, "proposal");
    assert.match(r.id, /^[0-9a-f]{16}$/);
    assert.equal(r.needsPreview, false);
    assert.equal(r.note, "Set the hotel deadline.");
    assert.equal(r.summary.length, 1);
    assert.match(r.summary[0], /June 1, 2028/);
    const stored = await t.store.get(`proposal:${r.id}`);
    assert.equal(stored.id, r.id);
    assert.equal(stored.baseSha, "local-base");
    assert.equal(stored.createdAt, START);
    assert.deepEqual(stored.summary, r.summary);
    assert.equal(await t.repo.head(), "local-base");
    assert.equal(await t.read("src/_data/travel.json"), before);
    assert.equal(t.client.calls.length, 1);
  } finally {
    await t.cleanup();
  }
});

test("invalid ops: Claude is asked once more with the problems; a second failure stores nothing", async () => {
  const t = await setup();
  try {
    t.client.queue(
      propose([set("travel", "/room_block/nope/deep", "x")]),
      propose([set("travel", "/room_block/deadline", "2028-13-45")]),
    );
    const r = seen(await ask(t.deps, { message: "change the deadline" }));
    assert.deepEqual(r, { kind: "message", text: SAFE_FAIL });
    assert.equal(t.client.calls.length, 2);
    const last = t.client.calls[1].messages.at(-1).content.at(-1).text;
    assert.match(last, /Your previous proposal could not be used: Step 1 points at something that is not on the site\./);
    assert.deepEqual(proposalKeys(t.store), []);
  } finally {
    await t.cleanup();
  }
});

test("a first failure that is fixed on the second try becomes a proposal", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([set("travel", "/room_block/deadline", "June 1")]), propose([DEADLINE]));
    const r = await ask(t.deps, { message: "change the deadline" });
    assert.equal(r.kind, "proposal");
    const feedback = t.client.calls[1].messages.at(-1).content.at(-1).text;
    assert.match(feedback, /real date/);
  } finally {
    await t.cleanup();
  }
});

test("file edits to a refused path, a content file, or with forbidden text are invalid in the same way", async () => {
  const cases = [
    [{ path: "src/rsvp.njk", find: "a", replace: "b" }],
    [{ path: "src/_data/site.json", find: "Jeff", replace: "Jeffrey" }],
    [{ path: "src/_includes/layouts/base.njk", find: "<head>", replace: "<head><meta>" }],
    [{ path: "src/css/styles.css", find: "max-width: 640px", replace: "max-width: 640px; background: url(https://evil.example/x.png)" }],
    [{ path: "src/travel.njk", find: "pageKey: travel", replace: "pageKey: travel\n<script>alert(1)</script>" }],
  ];
  for (const edits of cases) {
    const t = await setup();
    try {
      t.client.queue(propose([], edits), propose([], edits));
      const r = seen(await ask(t.deps, { message: "change the layout" }));
      assert.deepEqual(r, { kind: "message", text: SAFE_FAIL }, edits[0].path);
      assert.equal(t.client.calls.length, 2);
      assert.deepEqual(proposalKeys(t.store), []);
    } finally {
      await t.cleanup();
    }
  }
});

test("a proposal that would change nothing is not stored", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([set("travel", "/room_block/deadline", "")]));
    const r = seen(await ask(t.deps, { message: "clear the deadline" }));
    assert.equal(r.kind, "message");
    assert.match(r.text, /nothing/i);
    assert.deepEqual(proposalKeys(t.store), []);
  } finally {
    await t.cleanup();
  }
});

test("a message from Claude, and a failure code, are passed through", async () => {
  const t = await setup();
  try {
    t.client.queue(say("Which hotel do you mean?"));
    assert.deepEqual(await ask(t.deps, { message: "update the hotel" }), { kind: "message", text: "Which hotel do you mean?" });
    t.client.queue({ stop_reason: "refusal", content: [] });
    const r = await ask(t.deps, { message: "something" });
    assert.equal(r.kind, "message");
    assert.equal(r.error, "refused");
    assert.deepEqual(proposalKeys(t.store), []);
  } finally {
    await t.cleanup();
  }
});

test("the daily limit: the 151st request is refused before any model call", async () => {
  const t = await setup();
  try {
    await t.store.set("usage:2026-11-12", { count: 149 });
    t.client.queue(say("ok"));
    assert.equal((await ask(t.deps, { message: "hello" })).text, "ok");
    const r = seen(await ask(t.deps, { message: "hello again" }));
    assert.deepEqual(r, { kind: "message", text: LIMIT });
    assert.equal(t.client.calls.length, 1);
    // A new UTC day starts a new count.
    t.advance(DAY);
    t.client.queue(say("ok"));
    assert.equal((await ask(t.deps, { message: "hello" })).text, "ok");
    assert.deepEqual(await t.store.get("usage:2026-11-13"), { count: 1 });
  } finally {
    await t.cleanup();
  }
});

test("parallel requests cannot outrun the daily limit", async () => {
  const t = await setup();
  try {
    await t.store.set("usage:2026-11-12", { count: 148 });
    for (let i = 0; i < 5; i++) t.client.queue(say("ok"));
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => ask(t.deps, { message: "hi" })));
    assert.equal(results.filter((r) => r.text === LIMIT).length, 3);
    assert.equal(t.client.calls.length, 2);
  } finally {
    await t.cleanup();
  }
});

test("a 2,001-character message is refused without a model call and is not counted", async () => {
  const t = await setup();
  try {
    const r = seen(await ask(t.deps, { message: "x".repeat(2001) }));
    assert.equal(r.kind, "message");
    assert.match(r.text, /2,000/);
    assert.equal(t.client.calls.length, 0);
    assert.equal(await t.store.get("usage:2026-11-12"), null);
    t.client.queue(say("ok"));
    assert.equal((await ask(t.deps, { message: "x".repeat(2000) })).text, "ok");
  } finally {
    await t.cleanup();
  }
});

test("a bad photo returns the photo check's reason and stores nothing", async () => {
  const t = await setup();
  try {
    const r = seen(await ask(t.deps, { message: "use this photo", photo: Buffer.from("hello").toString("base64") }));
    assert.deepEqual(r, { kind: "message", text: "That file isn't a photo I can use." });
    assert.equal(t.client.calls.length, 0);
    assert.deepEqual([...t.store.written], []);
  } finally {
    await t.cleanup();
  }
});

// Uses the exact photo value the editor told Claude to use.
const usePhoto = (request) => {
  const text = request.messages.at(-1).content.at(-1).text;
  const value = /set the photo field to exactly (\S+)\)/.exec(text)[1];
  return propose([set("home", "/hero/photo", value)], [], "Replaced the top photo.");
};

test("a photo is checked, named and offered to Claude, and is validated as an image that will exist", async () => {
  const t = await setup();
  try {
    t.client.queue(usePhoto);
    const r = await ask(t.deps, { message: "replace the top photo", photo: PHOTO });
    assert.equal(r.kind, "proposal");
    const req = t.client.calls[0];
    const image = req.messages.at(-1).content.find((b) => b.type === "image");
    assert.equal(image.source.media_type, "image/png");
    assert.equal(image.source.data, PHOTO);
    const stored = await t.store.get(`proposal:${r.id}`);
    assert.match(stored.photo.name, /^photo-20261112-[0-9a-f]{6}\.png$/);
    assert.equal(stored.photo.value, `/images/${stored.photo.name}`);
  } finally {
    await t.cleanup();
  }
});

// ---- publish ----------------------------------------------------------------

test("publish writes the content and the photo in one change with the right message; a second publish writes nothing", async () => {
  const t = await setup();
  try {
    t.client.queue(usePhoto);
    const r = await ask(t.deps, { message: "replace the top photo", photo: PHOTO });
    const name = (await t.store.get(`proposal:${r.id}`)).photo.name;
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

    assert.deepEqual(await publish(t.deps, r.id), { ok: true, title: p.title });
    assert.equal((await t.repo.edits(10)).length, 1);
  } finally {
    await t.cleanup();
  }
});

test("a double tap publishing at the same moment writes once", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([DEADLINE]));
    const r = await ask(t.deps, { message: "deadline" });
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
    t.client.queue(propose([DEADLINE]));
    const r = await ask(t.deps, { message: "deadline", photo: PHOTO });
    assert.equal((await t.store.get(`proposal:${r.id}`)).photo, undefined);
    await publish(t.deps, r.id);
    const { paths } = await t.repo.changeOf((await t.repo.edits(1))[0].sha);
    assert.deepEqual(paths, ["src/_data/travel.json"]);
  } finally {
    await t.cleanup();
  }
});

test("the title drops the Please check prefix and is cut to 72 characters", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([set("rsvp", "/rsvp_open", true)]));
    const r = await ask(t.deps, { message: "open rsvps" });
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
    t.client.queue(propose([DEADLINE]));
    const a = await ask(t.deps, { message: "deadline" });
    t.client.queue(propose([{ op: "insert", file: "faq", path: "/questions", index: 0, value: { question: "Are kids invited?", answer: "Yes." } }]));
    const b = await ask(t.deps, { message: "faq" });
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
    t.client.queue(propose([DEADLINE]));
    const r = await ask(t.deps, { message: "deadline" });
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
    t.client.queue(propose([DEADLINE]));
    const r = await ask(t.deps, { message: "deadline" });
    const p = seen(await publish(t.deps, r.id));
    assert.equal(p.ok, false);
    assert.equal((await t.repo.edits(10)).length, 0);
    assert.equal((await publish(t.deps, r.id)).ok, true);
  } finally {
    await t.cleanup();
  }
});

test("publish refuses a change that no longer fits the site and releases it", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([{ op: "remove", file: "faq", path: "/questions/0" }]));
    const a = await ask(t.deps, { message: "remove first faq" });
    // The list empties meanwhile, so removing item 1 no longer applies.
    const faq = await t.readData("src/_data/faq.json");
    faq.questions = [];
    await t.repo.write({ branch: "main", baseSha: "local-base", message: "x", files: { "src/_data/faq.json": JSON.stringify(faq, null, 2) + "\n" } });
    const p = seen(await publish(t.deps, a.id));
    assert.deepEqual(p, { ok: false, text: NO_FIT });
    const stored = await t.store.get(`proposal:${a.id}`);
    assert.equal(stored.publishing, undefined);
    assert.equal(stored.published, undefined);
  } finally {
    await t.cleanup();
  }
});

test("a theme colour change also replaces the matching colour in DESIGN.md", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([set("theme", "/rosette", "#E2A99C")]));
    const r = await ask(t.deps, { message: "slightly different pink" });
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
    t.client.queue(propose([set("theme", "/gold", "#C9A04B"), set("theme", "/hairline", "#C9A04A")]));
    const r = await ask(t.deps, { message: "gold tweak" });
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

const CSS_EDIT = { path: "src/css/styles.css", find: "line-height: 1.5; max-width: 640px", replace: "line-height: 1.5; max-width: 660px" };

test("a look-and-layout change needs a ready preview before it can be published", async () => {
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
    t.client.queue(propose([], [CSS_EDIT], "Made the column a little wider."));
    const r = seen(await ask(t.deps, { message: "wider" }));
    assert.equal(r.needsPreview, true);
    assert.equal(r.summary.length, 1);

    const s0 = await status(t.deps, { id: r.id });
    assert.deepEqual(s0, { stage: "preview", state: "waiting" });
    const refused = seen(await publish(t.deps, r.id));
    assert.equal(refused.ok, false);

    assert.deepEqual(await preview(t.deps, r.id), { ok: true });
    assert.deepEqual(await preview(t.deps, r.id), { ok: true });
    assert.equal(opened, 1);
    const stored = await t.store.get(`proposal:${r.id}`);
    assert.equal(stored.preview.number, 0);
    const staged = await fs.readFile(path.join(t.root, ".editor-local/previews", r.id, "src/css/styles.css"), "utf8");
    assert.match(staged, /line-height: 1\.5; max-width: 660px/);

    t.netlify.states.set(stored.preview.sha, "building");
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "preview", state: "building" });
    assert.equal((await publish(t.deps, r.id)).ok, false);

    t.netlify.states.set(stored.preview.sha, "ready");
    const s = await status(t.deps, { id: r.id });
    assert.equal(s.stage, "preview");
    assert.equal(s.state, "ready");
    assert.ok(s.url);
    const p = await publish(t.deps, r.id);
    assert.equal(p.ok, true);
    assert.match(await t.read("src/css/styles.css"), /line-height: 1\.5; max-width: 660px/);
    assert.equal(closed, 1);
    await assert.rejects(fs.access(path.join(t.root, ".editor-local/previews", r.id)));
  } finally {
    await t.cleanup();
  }
});

test("a failure to close the preview does not fail the publish", async () => {
  const t = await setup({ repoWrap: (local) => ({ ...local, closePreview: async () => { throw new Error("nope"); } }) });
  try {
    t.client.queue(propose([DEADLINE]));
    const r = await ask(t.deps, { message: "deadline" });
    await preview(t.deps, r.id);
    assert.equal((await publish(t.deps, r.id)).ok, true);
  } finally {
    await t.cleanup();
  }
});

test("a failed preview throws the change away", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([], [CSS_EDIT]));
    const r = await ask(t.deps, { message: "wider" });
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

test("cancel closes the preview, deletes the change, and succeeds when it is already gone", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([DEADLINE]));
    const r = await ask(t.deps, { message: "deadline" });
    await preview(t.deps, r.id);
    assert.deepEqual(await cancel(t.deps, r.id), { ok: true });
    assert.equal(await t.store.get(`proposal:${r.id}`), null);
    await assert.rejects(fs.access(path.join(t.root, ".editor-local/previews", r.id)));
    assert.deepEqual(await cancel(t.deps, r.id), { ok: true });
    assert.deepEqual(await cancel(t.deps, "not-an-id"), { ok: true });
  } finally {
    await t.cleanup();
  }
});

test("a change expires 24 hours after it was made", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([DEADLINE]));
    const r = await ask(t.deps, { message: "deadline" });
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
    t.client.queue(propose([DEADLINE]));
    const r = await ask(t.deps, { message: "deadline" });
    await publish(t.deps, r.id);
    const sha = (await t.repo.edits(1))[0].sha;
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "waiting" });
    t.netlify.states.set(sha, "building");
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "building" });
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
    t.client.queue(propose([DEADLINE]));
    const r = await ask(t.deps, { message: "deadline" });
    await publish(t.deps, r.id);
    const sha = (await t.repo.edits(1))[0].sha;
    t.netlify.states.set(sha, "ready");
    assert.deepEqual(await status(t.deps, { id: r.id }), { stage: "publish", state: "ready", url: `https://example.test/${sha}` });
  } finally {
    await t.cleanup();
  }
});

// ---- history and undo ---------------------------------------------------------

async function publishOps(t, ops, edits = []) {
  t.client.queue(propose(ops, edits));
  const r = await ask(t.deps, { message: "change" });
  assert.equal(r.kind, "proposal", JSON.stringify(r));
  if (r.needsPreview) {
    await preview(t.deps, r.id);
    t.netlify.states.set((await t.store.get(`proposal:${r.id}`)).preview.sha, "ready");
  }
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
    t.client.queue(usePhoto);
    const r = await ask(t.deps, { message: "photo", photo: PHOTO });
    const name = (await t.store.get(`proposal:${r.id}`)).photo.name;
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

test("undo puts back a layout file only if it has not changed since", async () => {
  const t = await setup();
  try {
    const original = await t.read("src/css/styles.css");
    const first = await publishOps(t, [], [CSS_EDIT]);
    const second = await publishOps(t, [], [{ path: "src/css/styles.css", find: "line-height: 1.5; max-width: 660px", replace: "line-height: 1.5; max-width: 680px" }]);
    assert.deepEqual(seen(await undo(t.deps, first)), { ok: false, text: NOTHING_TO_UNDO });
    const u = seen(await undo(t.deps, second));
    assert.equal(u.ok, true);
    assert.deepEqual(u.skipped, []);
    assert.equal(u.restored.length, 1);
    assert.match(await t.read("src/css/styles.css"), /line-height: 1\.5; max-width: 660px/);
    // Now the first edit's text is back, so it can be undone too.
    assert.equal((await undo(t.deps, first)).ok, true);
    assert.equal(await t.read("src/css/styles.css"), original);
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
    t.client.queue(propose([], [CSS_EDIT]));
    const r = await ask(t.deps, { message: "wider" });
    const results = await Promise.all([preview(t.deps, r.id), preview(t.deps, r.id)]);
    assert.deepEqual(results, [{ ok: true }, { ok: true }]);
    assert.equal(opened, 1);
  } finally {
    await t.cleanup();
  }
});

async function failedLiveUpdate(t) {
  t.client.queue(propose([DEADLINE]));
  const r = await ask(t.deps, { message: "deadline" });
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
    t.client.queue(propose([], [CSS_EDIT]));
    const r = await ask(t.deps, { message: "wider" });
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
    t.client.queue(propose([], [CSS_EDIT]));
    const r = await ask(t.deps, { message: "wider" });
    await preview(t.deps, r.id);
    const sha = (await t.store.get(`proposal:${r.id}`)).preview.sha;
    t.netlify.states.set(sha, "ready");
    // The day runs out while the preview is being checked.
    const deployFor = t.netlify.deployFor;
    t.netlify.deployFor = async (s) => { t.advance(DAY); return deployFor(s); };
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
    t.client.queue(usePhoto);
    const r = await ask(t.deps, { message: "photo", photo: PHOTO });
    assert.equal((await t.store.get(`proposal:${r.id}`)).photo.name, "photo-20261112-000002.png");
  } finally {
    await t.cleanup();
  }
});

test("when no free photo name is found, nothing is asked or stored", async () => {
  const t = await setup();
  try {
    for (let i = 1; i <= 5; i++) await fs.writeFile(path.join(t.root, `src/images/photo-20261112-00000${i}.png`), "");
    const r = seen(await ask(t.deps, { message: "photo", photo: PHOTO }));
    assert.deepEqual(r, { kind: "message", text: SAFE_FAIL });
    assert.equal(t.client.calls.length, 0);
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
    assert.deepEqual(u.skipped, ["A part shared by several pages"]);
    assert.equal(await t.read("src/_includes/new-bit.njk"), "<p>hi</p>\n");
  } finally {
    await t.cleanup();
  }
});

test("DESIGN.md keeps its upper-case colour style when the new colour is typed in lower case", async () => {
  const t = await setup();
  try {
    t.client.queue(propose([set("theme", "/rosette", "#e2a99c")]));
    const r = await ask(t.deps, { message: "pink" });
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

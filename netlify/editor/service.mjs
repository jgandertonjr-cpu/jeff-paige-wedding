// The editor's ask → preview → publish → undo flow. Wires the pure modules to
// the site's files (repo), the hosting status (netlify), the small store and
// the model client, all passed in as `deps`:
//   { repo, netlify, store, client, schema, now() → ms, random(nBytes) → hex, env }
// Every sentence returned for Paige is fixed here; no collaborator's error
// text is ever passed on (their errors are thrown for the HTTP layer).
import crypto from "node:crypto";
import { applyOps, applyFileEdits, OpError } from "./ops.mjs";
import { diffContent, summarize } from "./diff.mjs";
import { validateContent } from "./validate.mjs";
import { classifyPath, checkLayoutEdit, READABLE_LAYOUT_FILES } from "./guard.mjs";
import { checkPhoto, photoName } from "./photo.mjs";
import { askClaude } from "./claude.mjs";
import { StaleError } from "./github.mjs";
import { undoEdit } from "./undo.mjs";

const MAX_MESSAGE_CHARS = 2000;
const DAILY_LIMIT = 150;
const LIFETIME_MS = 24 * 60 * 60 * 1000;
const CLAIM_MS = 60 * 1000;
const BUDGET_MS = 50 * 1000;
const PREFIX = "Website edit: ";
const ID = /^[0-9a-f]{16}$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

export const TEXT = {
  empty: "Please type what you'd like to change.",
  tooLong: "That message is too long. Please keep it under 2,000 characters.",
  limit: "That's the limit for today. It resets tomorrow.",
  unsafe: "I couldn't make that change safely. Nothing changed.",
  noChange: "That wouldn't change anything on the site, so there is nothing to publish.",
  expired: "That change has expired. Please ask again.",
  busy: "That is already being published.",
  previewFirst: "This is a bigger change, so please wait until its preview is ready.",
  noFit: "The site changed since you asked, so that change no longer fits. Please ask again.",
  already: "That change is already on the site, so there is nothing to publish.",
  movedPublish: "The site changed while I was saving, so nothing was published. Please try again.",
  thrownAway: "That change didn't work on the site, so I've thrown it away.",
  putBack: "Something went wrong and I've put the site back.",
  notPutBack: "Something went wrong with that change, and I couldn't put the site back. Please check the site.",
  undoNotFound: "I can't find that change in the recent list, so I can't undo it.",
  nothingToUndo: "Everything in that change has been changed again since, so there is nothing to undo.",
  undoUnsafe: "I couldn't undo that change safely. Nothing changed.",
  movedUndo: "The site changed while I was saving, so nothing was undone. Please try again.",
};

const message = (text) => ({ kind: "message", text });
export const refuse = (text) => ({ ok: false, text });
const key = (id) => `proposal:${id}`;

// ---- shared helpers (also used by undo.mjs) ---------------------------------

export const serialize = (value) => JSON.stringify(value, null, 2) + "\n";

// Runs `attempt` again once if the site moved on underneath it.
export async function retryOnStale(attempt) {
  try {
    return await attempt();
  } catch (e) {
    if (!(e instanceof StaleError)) throw e;
  }
  try {
    return await attempt();
  } catch (e) {
    if (e instanceof StaleError) return { stale: true };
    throw e;
  }
}

// The latest version of the site: its sha, all content files, and the photo names.
export async function loadBase({ repo, schema }) {
  const sha = await repo.head();
  const keys = Object.keys(schema.files);
  const texts = await repo.readFiles(keys.map((k) => schema.files[k].path), sha);
  const content = {};
  for (const k of keys) {
    const text = texts[schema.files[k].path];
    if (typeof text !== "string") throw new Error("A content file is missing");
    content[k] = JSON.parse(text);
  }
  return { sha, content, images: await repo.listImages(sha) };
}

// Files to write for every content section that differs. The path always comes
// from the schema, never from the model.
export function contentFiles(schema, before, after) {
  const files = {};
  for (const k of Object.keys(schema.files)) {
    if (serialize(before[k]) === serialize(after[k])) continue;
    const p = schema.files[k].path;
    if (classifyPath(p) !== "content") throw new Error("Refused a file the editor may not write");
    files[p] = serialize(after[k]);
  }
  return files;
}

const PAGE_NAMES = {
  index: "Home", "our-story": "Our Story", details: "Details", "wedding-party": "Wedding Party", registry: "Registry",
  travel: "Travel", "after-party": "After Party", faq: "FAQ", gallery: "Gallery", 404: "Page Not Found",
};
export function layoutLabel(p) {
  if (p === "src/css/styles.css") return "The look of the whole site";
  const page = /^src\/([a-z0-9-]+)\.njk$/.exec(p);
  if (page && PAGE_NAMES[page[1]]) return `The page layout for ${PAGE_NAMES[page[1]]}`;
  return "A part shared by several pages";
}

// ---- checking a proposal ------------------------------------------------------

// Applies a proposal to `base` and collects every problem in plain words.
// Returns { problems, content, changes, layout: { [path]: { before, after } } }.
async function tryProposal(deps, base, { contentOps, fileEdits }, photoValue) {
  const { repo, schema } = deps;
  const problems = [];
  let content = null;
  if (contentOps.some((op) => typeof op?.file !== "string" || !Object.hasOwn(schema.files, op.file))) {
    problems.push("A step names a section the editor cannot change.");
  } else {
    try {
      content = applyOps(base.content, contentOps);
    } catch (e) {
      if (!(e instanceof OpError)) throw e;
      problems.push(e.message);
    }
  }
  if (content) {
    const images = new Set(base.images);
    if (photoValue) images.add(photoValue);
    for (const issue of validateContent(content, { schema, images, previous: base.content })) {
      problems.push(`${issue.label}: ${issue.message}`);
    }
  }

  const layout = {};
  const refused = fileEdits.findIndex((e) => classifyPath(e?.path) !== "layout");
  if (refused >= 0) {
    problems.push(`Edit ${refused + 1} names a file the editor cannot change.`);
  } else if (fileEdits.length) {
    const texts = await repo.readFiles([...new Set(fileEdits.map((e) => e.path))], base.sha);
    let after = null;
    try {
      after = applyFileEdits(texts, fileEdits);
    } catch (e) {
      if (!(e instanceof OpError)) throw e;
      problems.push(e.message);
    }
    for (const p of Object.keys(after || {})) {
      if (after[p] === texts[p]) continue;
      problems.push(...checkLayoutEdit({ path: p, before: texts[p], after: after[p] }));
      layout[p] = { before: texts[p], after: after[p] };
    }
  }
  return { problems, content, changes: content ? diffContent(base.content, content) : [], layout };
}

// When a theme colour changes, the same colour in DESIGN.md changes with it,
// unless another theme setting still uses the old colour.
async function designUpdate({ repo }, base, next) {
  const before = base.content.theme || {};
  const after = next.theme || {};
  const swaps = new Map();
  for (const [k, old] of Object.entries(before)) {
    const now = after[k];
    if (!HEX.test(old) || !HEX.test(now ?? "") || old.toLowerCase() === now.toLowerCase()) continue;
    const stillUsed = Object.entries(after).some(([k2, v]) => k2 !== k && typeof v === "string" && v.toLowerCase() === old.toLowerCase());
    if (!stillUsed) swaps.set(old.toLowerCase(), now);
  }
  if (!swaps.size) return null;
  const text = (await repo.readFiles(["DESIGN.md"], base.sha))["DESIGN.md"];
  if (typeof text !== "string") return null;
  const pattern = new RegExp(`(?:${[...swaps.keys()].join("|")})(?![0-9a-f])`, "gi");
  const updated = text.replace(pattern, (m) => swaps.get(m.toLowerCase()));
  return updated === text ? null : updated;
}

// Everything publish would write, worked out against the latest site.
// Returns { sha, files } or { problem }.
async function buildFiles(deps, p) {
  const base = await loadBase(deps);
  const tried = await tryProposal(deps, base, p, p.photo?.value);
  if (tried.problems.length) return { problem: TEXT.noFit };
  const files = contentFiles(deps.schema, base.content, tried.content);
  for (const [path, { after }] of Object.entries(tried.layout)) files[path] = after;
  if (!Object.keys(files).length) return { problem: TEXT.already };
  const design = await designUpdate(deps, base, tried.content);
  if (design !== null) files["DESIGN.md"] = design;
  if (p.photo) files[`src/images/${p.photo.name}`] = { base64: p.photo.base64 };
  if (Object.keys(files).some((path) => classifyPath(path) === null)) throw new Error("Refused a file the editor may not write");
  return { sha: base.sha, files };
}

const hashFiles = (files) => crypto.createHash("sha256")
  .update(JSON.stringify(Object.keys(files).sort().map((p) => [p, files[p]])))
  .digest("hex");

const titleOf = (summary) => (summary[0] || "Site change").replace(/^Please check: /, "").slice(0, 72);

// ---- the store ------------------------------------------------------------------

const isLive = (deps, p) => p && deps.now() - p.createdAt < LIFETIME_MS;

// A live proposal, or null. An expired one is removed when touched.
async function loadProposal(deps, id) {
  if (typeof id !== "string" || !ID.test(id)) return null;
  const p = await deps.store.get(key(id));
  if (!p) return null;
  if (isLive(deps, p)) return p;
  if (p.preview) {
    try { await deps.repo.closePreview({ id, number: p.preview.number }); } catch {}
  }
  await deps.store.delete(key(id));
  return null;
}

// Removes a field from the stored proposal, if it is still there.
const clearField = (deps, id, field) =>
  deps.store.update(key(id), (cur) => {
    if (!cur) return null;
    const { [field]: _, ...rest } = cur;
    return rest;
  });

// Check-and-count in one step, so parallel requests cannot pass the limit.
async function takeDailyAllowance({ store, now }) {
  let allowed = false;
  await store.update(`usage:${new Date(now()).toISOString().slice(0, 10)}`, (cur) => {
    const count = Number.isInteger(cur?.count) ? cur.count : 0;
    allowed = count < DAILY_LIMIT;
    return allowed ? { count: count + 1 } : cur;
  });
  return allowed;
}

// ---- the flow -----------------------------------------------------------------

export async function ask(deps, { message: text, history = [], photo } = {}) {
  if (typeof text !== "string" || text.trim() === "") return message(TEXT.empty);
  if (text.length > MAX_MESSAGE_CHARS) return message(TEXT.tooLong);

  let pic = null;
  if (photo !== undefined && photo !== null) {
    const checked = checkPhoto(typeof photo === "string" ? photo : photo?.base64);
    if (!checked.ok) return message(checked.reason);
    const name = photoName(deps.now(), deps.random(3), checked.ext);
    pic = { name, value: `/images/${name}`, mediaType: checked.mediaType, base64: checked.bytes.toString("base64") };
  }
  if (!(await takeDailyAllowance(deps))) return message(TEXT.limit);

  const base = await loadBase(deps);
  const readFile = async (p) =>
    READABLE_LAYOUT_FILES.includes(p) ? ((await deps.repo.readFiles([p], base.sha))[p] ?? null) : null;
  const deadlineMs = deps.now() + BUDGET_MS;
  let feedback;
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await askClaude({
      client: deps.client, schema: deps.schema, content: base.content, message: text, history, readFile, feedback, deadlineMs,
      now: deps.now,
      photo: pic ? { mediaType: pic.mediaType, base64: pic.base64, willBeSavedAs: pic.value } : undefined,
    });
    if (reply.kind !== "proposal") return reply.error ? { kind: "message", text: reply.text, error: reply.error } : message(reply.text);

    const tried = await tryProposal(deps, base, reply, pic?.value);
    if (tried.problems.length) {
      feedback = tried.problems.join(" ");
      continue;
    }
    if (!tried.changes.length && !Object.keys(tried.layout).length) return message(TEXT.noChange);

    const id = deps.random(8);
    const summary = [
      ...summarize(tried.changes, deps.schema),
      ...Object.keys(tried.layout).map((p) => `${layoutLabel(p)}: updated`),
    ];
    const record = {
      id, createdAt: deps.now(), baseSha: base.sha, contentOps: reply.contentOps, fileEdits: reply.fileEdits,
      summary, note: reply.note, needsPreview: reply.fileEdits.length > 0,
    };
    const usesPhoto = pic && (JSON.stringify(tried.content).includes(pic.value)
      || Object.values(tried.layout).some((f) => f.after.includes(pic.value)));
    if (usesPhoto) record.photo = { name: pic.name, value: pic.value, base64: pic.base64 };
    await deps.store.set(key(id), record);
    return { kind: "proposal", id, summary, note: reply.note, needsPreview: record.needsPreview };
  }
  return message(TEXT.unsafe);
}

export async function preview(deps, id) {
  const p = await loadProposal(deps, id);
  if (!p) return refuse(TEXT.expired);
  if (p.preview || p.published) return { ok: true };

  let claimed = false;
  await deps.store.update(key(id), (cur) => {
    if (!cur || cur.preview || cur.published || (cur.previewing && deps.now() - cur.previewing < CLAIM_MS)) return cur;
    claimed = true;
    return { ...cur, previewing: deps.now() };
  });
  if (!claimed) return { ok: true };

  try {
    const built = await buildFiles(deps, p);
    if (built.problem) {
      await clearField(deps, id, "previewing");
      return refuse(built.problem);
    }
    const opened = await deps.repo.openPreview({ id, baseSha: built.sha, message: titleOf(p.summary), files: built.files });
    const saved = await deps.store.update(key(id), (cur) => {
      if (!cur) return null;
      const { previewing, ...rest } = cur;
      return { ...rest, preview: { number: opened.number, sha: opened.sha, filesHash: hashFiles(built.files) } };
    });
    if (!saved) await deps.repo.closePreview({ id, number: opened.number }); // cancelled meanwhile
  } catch (e) {
    await clearField(deps, id, "previewing");
    throw e;
  }
  return { ok: true };
}

const report = (stage, d) => (d.url ? { stage, state: d.state, url: d.url } : { stage, state: d.state });

export async function status(deps, { id } = {}) {
  const p = await loadProposal(deps, id);
  if (!p) return { stage: "preview", state: "failed", text: TEXT.expired };

  if (p.published) {
    const d = await deps.netlify.deployFor(p.published.sha);
    if (d.state !== "failed") return report("publish", d);
    // Mark first, so two polls arriving together cannot both put the site back.
    let mine = false;
    const marked = await deps.store.update(key(id), (cur) => {
      if (!cur || cur.reverted) return cur;
      mine = true;
      return { ...cur, reverted: true };
    });
    let putBack = marked ? marked.revertFailed !== true : true;
    if (mine) {
      let undone;
      try {
        undone = await undoEdit(deps, p.published.sha);
      } catch (e) {
        await clearField(deps, id, "reverted");
        throw e;
      }
      putBack = undone.ok;
      if (!putBack) await deps.store.update(key(id), (cur) => (cur ? { ...cur, revertFailed: true } : null));
    }
    return { stage: "publish", state: "failed", text: putBack ? TEXT.putBack : TEXT.notPutBack };
  }

  if (!p.preview) return { stage: "preview", state: "waiting" };
  const d = await deps.netlify.deployFor(p.preview.sha);
  if (d.state === "failed") {
    await cancel(deps, id);
    return { stage: "preview", state: "failed", text: TEXT.thrownAway };
  }
  return report("preview", d);
}

export async function publish(deps, id) {
  const p = await loadProposal(deps, id);
  if (!p) return refuse(TEXT.expired);
  if (p.published) return { ok: true, title: p.published.title };
  if (p.needsPreview) {
    if (!p.preview) return refuse(TEXT.previewFirst);
    if ((await deps.netlify.deployFor(p.preview.sha)).state !== "ready") return refuse(TEXT.previewFirst);
  }

  let outcome = null;
  await deps.store.update(key(id), (cur) => {
    if (!isLive(deps, cur)) {
      outcome = { gone: true };
      return null;
    }
    if (cur.published) {
      outcome = { done: cur.published };
      return cur;
    }
    if (cur.publishing && deps.now() - cur.publishing < CLAIM_MS) {
      outcome = { busy: true };
      return cur;
    }
    outcome = { claimed: true };
    return { ...cur, publishing: deps.now() };
  });
  if (outcome.gone) return refuse(TEXT.expired);
  if (outcome.done) return { ok: true, title: outcome.done.title };
  if (outcome.busy) return refuse(TEXT.busy);

  const title = titleOf(p.summary);
  let result;
  try {
    result = await retryOnStale(async () => {
      const built = await buildFiles(deps, p);
      if (built.problem) return built;
      // A bigger change goes live only exactly as it was previewed.
      if (p.needsPreview && p.preview.filesHash !== hashFiles(built.files)) return { problem: TEXT.noFit };
      return { sha: await deps.repo.write({ branch: "main", baseSha: built.sha, message: `${PREFIX}${title}`, files: built.files }) };
    });
  } catch (e) {
    await clearField(deps, id, "publishing");
    throw e;
  }
  if (!result.sha) {
    await clearField(deps, id, "publishing");
    return refuse(result.stale ? TEXT.movedPublish : result.problem);
  }

  await deps.store.update(key(id), (cur) => {
    const { publishing, photo, ...rest } = cur || p;
    return { ...rest, published: { sha: result.sha, title } };
  });
  if (p.preview) {
    try { await deps.repo.closePreview({ id, number: p.preview.number }); } catch {}
  }
  return { ok: true, title };
}

export async function cancel(deps, id) {
  if (typeof id !== "string" || !ID.test(id)) return { ok: true };
  const p = await deps.store.get(key(id));
  if (!p || p.published) return { ok: true };
  if (p.publishing && deps.now() - p.publishing < CLAIM_MS) return refuse(TEXT.busy);
  if (p.preview) await deps.repo.closePreview({ id, number: p.preview.number });
  await deps.store.delete(key(id));
  return { ok: true };
}

export async function history(deps) {
  return (await deps.repo.edits(30)).map((e) => ({ sha: e.sha, when: new Date(e.date).toISOString(), title: e.title }));
}

export const undo = (deps, sha) => undoEdit(deps, sha);

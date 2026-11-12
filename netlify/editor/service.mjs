// The editor's propose → preview → publish → undo flow. Wires the pure modules
// to the site's files (repo), the hosting status (netlify) and the small store,
// all passed in as `deps`:
//   { repo, netlify, store, schema, now() → ms, random(nBytes) → hex, env, log?(event, fields) }
// Every sentence returned for Paige is fixed here; no collaborator's error
// text is ever passed on (their errors are thrown for the HTTP layer).
//
// Result shapes, exactly as implemented:
//   propose(deps, { ops, photos?, base? })
//     base: the `version` the page loaded (optional). When the site has moved on
//       since then and any file the ops touch is different now, nothing is stored.
//     ops: 0–50 of { op: "set" | "insert" | "remove" | "move", file, path, value?, index?, to? },
//       file one of the schema's files. A string anywhere in a value that is exactly
//       "@photo:<n>" stands for the n-th photo (1-based).
//     photos: up to 3 base64 strings (a "data:image/...;base64," prefix is fine).
//     → { kind: "proposal", id, summary: string[], notice? }
//     | { ok: false, problems: { label, message }[], notice? }
//         the ops did not apply (label: the section's name) or the checks refused
//         a value (label: the field's name), or a step used a photo that was not sent.
//     | { ok: false, text, notice? }
//         ops or photos not in the shape above, a refused photo (the photo
//         check's reason), no free photo name, or nothing would change.
//     | { ok: false, text, reload: true, notice? }
//         `base` was given and a file the ops touch has changed since: the page
//         should load the site again and let her check her changes.
//       notice: a sentence to show before the answer, when an earlier change failed
//       on the live site and was put back just now (see settleUnconfirmed).
//     Nothing is stored unless the answer is a proposal.
//   loadContent(deps)   → { schema, content: { [file key]: parsed file }, images: "/images/<name>"[] sorted, version }
//     version: the site version (head sha) the content was read at; propose takes it back as `base`.
//   preview(deps, id)   → { ok: true } | { ok: false, text } | { ok: false, text, reload: true }
//     reload: a file the change touches has changed since it was reviewed (its
//     steps name list items by position, so they may no longer fit); nothing is
//     built and the page should load the site again and review again.
//   status(deps, { id })
//     → { stage: "preview" | "publish", state: "waiting" | "building" | "ready" | "failed", url?, text?, sha?, title? }
//       url only when state is "ready"; text with "failed" (thrown away, expired, put back or not).
//       sha and title (the published edit's) on a published change that has not failed.
//       While another poll is putting the site back: { stage: "publish", state: "building" }.
//       When Netlify or the store fails while checking a change that exists, it
//       is reported as still under way ("building", with sha and title when
//       published) and logged by name; never thrown.
//   publish(deps, id)   → { ok: true, title, sha } | { ok: false, text } | { ok: false, text, reload: true }
//     reload: as for preview; nothing is written and the publishing claim is released.
//     sha is the edit it wrote, the one undo takes; title is one line.
//   cancel(deps, id)    → { ok: true } | { ok: false, text }
//     refused while it is being published, and once it is on the site (a stale
//     publishing claim is first checked against the recent edits).
//   history(deps)       → { sha, when: ISO date string, title }[]
//   undo(deps, sha)     → { ok: true, restored: string[], skipped: string[] } | { ok: false, text }
//
// Every store.update callback may run more than once (the production store
// retries after a lost compare-and-swap), so each one resets any flag it sets.
import { applyOps, OpError } from "./ops.mjs";
import { diffContent, summarize } from "./diff.mjs";
import { validateContent } from "./validate.mjs";
import { classifyPath } from "./guard.mjs";
import { checkPhoto, photoName } from "./photo.mjs";
import { StaleError } from "./github.mjs";
import { undoEdit } from "./undo.mjs";

const MAX_OPS = 50;
const MAX_PHOTOS = 3;
const LIFETIME_MS = 24 * 60 * 60 * 1000;
const CLAIM_MS = 60 * 1000;
const MAX_REVERT_TRIES = 2;
const PHOTO_NAME_TRIES = 5;
const PREFIX = "Website edit: ";
const ID = /^[0-9a-f]{16}$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

export const TEXT = {
  cantMake: "That change can't be made.",
  photoNotSent: "That uses a photo that wasn't added.",
  unsafe: "I couldn't add that photo safely, so nothing changed. Please try again.",
  noChange: "That wouldn't change anything on the site, so there is nothing to publish.",
  expired: "That change has expired. Please review your changes again.",
  busy: "That is already being published.",
  onSite: "That change is already on the site. Use Undo this to put it back.",
  siteMoved: "The site changed since you opened it. I've loaded the latest; please check your changes and try again.",
  reviewedMoved: "The site changed since you reviewed this. I've loaded the latest; please review your changes again.",
  noFit: "The site changed since you reviewed this, so that change no longer fits. Please review your changes again.",
  already: "That change is already on the site, so there is nothing to publish.",
  movedPublish: "The site changed while I was saving, so nothing was published. Please try again.",
  thrownAway: "That change didn't work on the site, so I've thrown it away.",
  putBack: "Something went wrong and I've put the site back.",
  earlierPutBack: "An earlier change didn't work on the site, so I put the site back as it was.",
  notYetPutBack: "Something went wrong with that change, and I'm still putting the site back. Please check again in a minute.",
  notPutBack: "Something went wrong with that change, and I couldn't put the site back. Please check the site.",
  undoNotFound: "I can't find that change in the recent list, so I can't undo it.",
  nothingToUndo: "Everything in that change has been changed again since, so there is nothing to undo.",
  looksOnly: "That change was to how the pages look, which this editor no longer changes, so I left it.",
  undoUnsafe: "I couldn't undo that change safely. Nothing changed.",
  movedUndo: "The site changed while I was saving, so nothing was undone. Please try again.",
};

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

// What the editor page needs: the field description, every content file by key,
// and the photo addresses already on the site ("/images/<name>"), sorted.
export async function loadContent(deps) {
  const base = await loadBase(deps);
  return { schema: deps.schema, content: base.content, images: [...base.images].sort(), version: base.sha };
}

// Files to write for every content section that differs. The path always comes
// from the schema, never from the request.
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

// ---- checking a proposal ------------------------------------------------------

// Applies content ops to `base` and collects every problem in plain words.
// `photoValues` are the addresses of new photos that will exist once published.
// Returns { problems: { label, message }[], content, changes }.
function tryProposal({ schema }, base, contentOps, photoValues = []) {
  const problems = [];
  let content = null;
  if (contentOps.some((op) => typeof op?.file !== "string" || !Object.hasOwn(schema.files, op.file))) {
    problems.push({ label: "", message: "A step names a section the editor cannot change." });
  } else {
    try {
      content = applyOps(base.content, contentOps);
    } catch (e) {
      if (!(e instanceof OpError)) throw e;
      problems.push({ label: schema.files[e.op?.file]?.label ?? "", message: e.message });
    }
  }
  if (content) {
    const images = new Set([...base.images, ...photoValues]);
    for (const issue of validateContent(content, { schema, images, previous: base.content })) {
      problems.push({ label: issue.label, message: issue.message });
    }
  }
  return { problems, content, changes: content ? diffContent(base.content, content) : [] };
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
  // Keep the letter case DESIGN.md already uses for that colour.
  const restyle = (m, hex) => (m === m.toUpperCase() ? hex.toUpperCase() : m === m.toLowerCase() ? hex.toLowerCase() : hex);
  const updated = text.replace(pattern, (m) => restyle(m, swaps.get(m.toLowerCase())));
  return updated === text ? null : updated;
}

// Everything publish would write, worked out against the latest site.
// Returns { sha, files } or { problem, reload? }. The stored steps name list
// items by position, so when a file they touch has changed since she reviewed
// them (baseSha), nothing is built: { problem, reload: true }. Changes to other
// files are kept, since the steps are applied to the latest site.
async function buildFiles(deps, p) {
  const base = await loadBase(deps);
  if (p.baseSha && base.sha !== p.baseSha && (await touchedFilesMoved(deps, p.baseSha, base.sha, p.contentOps))) {
    return { problem: TEXT.reviewedMoved, reload: true };
  }
  const photos = Array.isArray(p.photos) ? p.photos : [];
  const tried = tryProposal(deps, base, p.contentOps, photos.map((pic) => pic.value));
  if (tried.problems.length) return { problem: TEXT.noFit };
  const files = contentFiles(deps.schema, base.content, tried.content);
  if (!Object.keys(files).length) return { problem: TEXT.already };
  const design = await designUpdate(deps, base, tried.content);
  if (design !== null) files["DESIGN.md"] = design;
  for (const pic of photos) files[`src/images/${pic.name}`] = { base64: pic.base64 };
  if (Object.keys(files).some((path) => classifyPath(path) === null)) throw new Error("Refused a file the editor may not write");
  return { sha: base.sha, files };
}

// The first summary line, on one line and at most 72 characters. The end says
// what changed, so a long line loses its leading steps ("… → " stands in for
// them); if the last step alone is still too long, its own end is cut. The same
// text is the saved title and the publish result's title.
const TITLE_MAX = 72;
export function titleOf(summary) {
  const line = (summary[0] || "Site change").replace(/\s+/g, " ").trim().replace(/^Please check: /, "");
  if (line.length <= TITLE_MAX) return line;
  const steps = line.split(" → ");
  for (let i = 1; i < steps.length; i++) {
    const shorter = `… → ${steps.slice(i).join(" → ")}`;
    if (shorter.length <= TITLE_MAX) return shorter;
  }
  const last = steps.length > 1 ? `… → ${steps[steps.length - 1]}` : line;
  return `${last.slice(0, TITLE_MAX - 1)}…`;
}

// ---- the store ------------------------------------------------------------------

const isLive = (deps, p) => p && deps.now() - p.createdAt < LIFETIME_MS;

// A live proposal, or null. An expired one (or an expired cancelled marker) is
// removed when touched; a cancelled one counts as gone.
async function loadProposal(deps, id) {
  if (typeof id !== "string" || !ID.test(id)) return null;
  const p = await deps.store.get(key(id));
  if (!p) return null;
  if (!isLive(deps, p)) {
    await discard(deps, id, p.preview);
    return null;
  }
  return p.cancelled ? null : p;
}

// Best-effort close of a preview, then the record goes.
async function discard(deps, id, openPreview) {
  if (openPreview) {
    try { await deps.repo.closePreview({ id, number: openPreview.number }); } catch {}
  }
  await deps.store.delete(key(id));
}

// Removes a field from the stored proposal, if it is still there.
const clearField = (deps, id, field) =>
  deps.store.update(key(id), (cur) => {
    if (!cur) return null;
    const { [field]: _, ...rest } = cur;
    return rest;
  });

// ---- published changes whose live result has not been seen --------------------
// A publish is put back if the live site fails to update with it. While her page
// is open, its status polls do that. So that it also happens after she closes
// the page, each publish is listed under UNCONFIRMED until the live result is
// seen (ready) or handled (put back, or given up on), and propose, history and
// publish settle the list first. Entries: { id, sha, at } in the order published.

const UNCONFIRMED = "unconfirmed";
const SETTLE_MAX = 5;
// No new check starts once this long has passed; the rest wait for the next call.
const SETTLE_BUDGET_MS = 8 * 1000;
const UNCONFIRMED_MAX_MS = 30 * 60 * 1000;

async function rememberUnconfirmed(deps, id, sha) {
  await deps.store.update(UNCONFIRMED, (cur) => {
    const entries = (Array.isArray(cur?.entries) ? cur.entries : []).filter((e) => e.id !== id);
    return { entries: [...entries, { id, sha, at: deps.now() }] };
  });
}

async function forgetUnconfirmed(deps, id) {
  await deps.store.update(UNCONFIRMED, (cur) => {
    if (!Array.isArray(cur?.entries) || !cur.entries.some((e) => e.id === id)) return cur;
    return { entries: cur.entries.filter((e) => e.id !== id) };
  });
}

const logEvent = (deps, event, fields) => {
  try { deps.log?.(event, fields); } catch {}
};

// Checks the oldest few listed changes, for at most SETTLE_BUDGET_MS. Returns
// { putBack: true } when this call put the site back. Never throws: a failure
// is logged by name and the caller carries on.
export async function settleUnconfirmed(deps) {
  let putBack = false;
  try {
    const started = deps.now();
    const entries = (await deps.store.get(UNCONFIRMED))?.entries;
    for (const e of (Array.isArray(entries) ? entries : []).slice(0, SETTLE_MAX)) {
      if (deps.now() - started >= SETTLE_BUDGET_MS) break;
      try {
        const d = await deps.netlify.deployFor(e.sha);
        if (d.state === "ready") {
          await forgetUnconfirmed(deps, e.id);
        } else if (d.state === "failed") {
          // The same path, with the same guards, as her page's status poll. It
          // takes the entry off the list once the put-back is done or given up.
          if ((await putSiteBack(deps, e.id, e.sha)).justPutBack) putBack = true;
        } else if (deps.now() - e.at > UNCONFIRMED_MAX_MS) {
          await forgetUnconfirmed(deps, e.id);
          logEvent(deps, "unconfirmed_dropped");
        }
      } catch (err) {
        logEvent(deps, "settle_failed", { name: err?.name || "Error" });
      }
    }
  } catch (err) {
    logEvent(deps, "settle_failed", { name: err?.name || "Error" });
  }
  return { putBack };
}

// ---- the flow -----------------------------------------------------------------

export async function propose(deps, input) {
  const { putBack } = await settleUnconfirmed(deps);
  const answer = await proposeChange(deps, input);
  return putBack ? { ...answer, notice: TEXT.earlierPutBack } : answer;
}

const OP_KINDS = new Set(["set", "insert", "remove", "move"]);
const OP_KEYS = new Set(["op", "file", "path", "value", "index", "to"]);
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const wellFormedOp = (schema, op) =>
  isPlainObject(op) && OP_KINDS.has(op.op) && typeof op.file === "string" && Object.hasOwn(schema.files, op.file) &&
  typeof op.path === "string" && Object.keys(op).every((k) => OP_KEYS.has(k));

// Calls `swap(n)` for every string in `value` that is exactly "@photo:<n>" and
// puts its answer there instead. Returns a new value; the input is not changed.
const PHOTO_REF = /^@photo:(\d+)$/;
function replacePhotoRefs(value, swap) {
  if (typeof value === "string") {
    const m = PHOTO_REF.exec(value);
    return m ? swap(Number(m[1])) : value;
  }
  if (Array.isArray(value)) return value.map((v) => replacePhotoRefs(v, swap));
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replacePhotoRefs(v, swap)]));
  return value;
}

// Longest JSON text and deepest nesting an op value may have. Checked before
// anything walks the value, and without recursion, so a hostile value cannot
// overflow the stack.
const MAX_VALUE_CHARS = 200_000;
const MAX_VALUE_DEPTH = 12;
function tooBig(value) {
  let level = [value];
  for (let depth = 0; level.length; depth++) {
    if (depth > MAX_VALUE_DEPTH) return true;
    const next = [];
    for (const v of level) {
      if (Array.isArray(v)) for (const child of v) next.push(child);
      else if (isPlainObject(v)) for (const child of Object.values(v)) next.push(child);
    }
    level = next;
  }
  let text;
  try { text = JSON.stringify(value); } catch { return true; }
  return typeof text === "string" && text.length > MAX_VALUE_CHARS;
}

// A site version as the page sends it back: a sha, or the local test copy's first version.
export const VERSION = /^(?:[a-f0-9]{7,64}|local-base)$/;

// Has any file these ops touch changed between the version she opened and now?
// A version that can't be read, or a step naming a section the editor no longer
// has, counts as changed.
async function touchedFilesMoved({ repo, schema }, from, to, ops) {
  if (ops.some((op) => typeof op?.file !== "string" || !Object.hasOwn(schema.files, op.file))) return true;
  const paths = [...new Set(ops.map((op) => schema.files[op.file].path))];
  try {
    const [then, now] = await Promise.all([repo.readFiles(paths, from), repo.readFiles(paths, to)]);
    return paths.some((p) => typeof then[p] !== "string" || then[p] !== now[p]);
  } catch {
    return true;
  }
}

async function proposeChange(deps, input) {
  if (!isPlainObject(input)) return refuse(TEXT.cantMake);
  const { ops, photos, base: openedAt } = input;
  const { schema } = deps;
  if (openedAt !== undefined && (typeof openedAt !== "string" || !VERSION.test(openedAt))) return refuse(TEXT.cantMake);
  if (!Array.isArray(ops) || ops.length > MAX_OPS || !ops.every((op) => wellFormedOp(schema, op))) return refuse(TEXT.cantMake);
  if (photos !== undefined && photos !== null && (!Array.isArray(photos) || photos.length > MAX_PHOTOS)) return refuse(TEXT.cantMake);
  if (ops.some((op) => "value" in op && tooBig(op.value))) return refuse(TEXT.cantMake);
  const checked = [];
  for (const photo of photos || []) {
    const c = checkPhoto(photo);
    if (!c.ok) return refuse(c.reason);
    checked.push(c);
  }

  // Which photos the steps use; a step that uses one that was not sent is a problem.
  const used = new Set();
  const problems = [];
  for (const op of ops) {
    let missing = false;
    replacePhotoRefs(op.value, (n) => {
      if (n >= 1 && n <= checked.length) used.add(n);
      else missing = true;
    });
    if (missing) problems.push({ label: schema.files[op.file].label, message: TEXT.photoNotSent });
  }
  if (problems.length) return { ok: false, problems };

  const base = await loadBase(deps);
  if (openedAt !== undefined && openedAt !== base.sha && (await touchedFilesMoved(deps, openedAt, base.sha, ops))) {
    return { ok: false, text: TEXT.siteMoved, reload: true };
  }
  // Name each photo a step uses; a new photo never replaces one already on the site.
  const pics = new Map();
  for (const n of [...used].sort((a, b) => a - b)) {
    const c = checked[n - 1];
    for (let i = 0; i < PHOTO_NAME_TRIES && !pics.has(n); i++) {
      const name = photoName(deps.now(), deps.random(3), c.ext);
      const value = `/images/${name}`;
      if (!base.images.has(value) && ![...pics.values()].some((p) => p.value === value)) {
        pics.set(n, { name, value, base64: c.bytes.toString("base64") });
      }
    }
    if (!pics.has(n)) return refuse(TEXT.unsafe);
  }
  const contentOps = ops.map((op) => ("value" in op ? { ...op, value: replacePhotoRefs(op.value, (n) => pics.get(n).value) } : { ...op }));

  const tried = tryProposal(deps, base, contentOps, [...pics.values()].map((p) => p.value));
  if (tried.problems.length) return { ok: false, problems: tried.problems };
  if (!tried.changes.length) return refuse(TEXT.noChange);

  const id = deps.random(8);
  const summary = summarize(tried.changes, schema);
  const record = { id, createdAt: deps.now(), baseSha: base.sha, contentOps, summary };
  // A photo a later step took out again is dropped.
  const finalText = JSON.stringify(tried.content);
  const kept = [...pics.values()].filter((p) => finalText.includes(p.value));
  if (kept.length) record.photos = kept;
  await deps.store.set(key(id), record);
  return { kind: "proposal", id, summary };
}

export async function preview(deps, id) {
  const p = await loadProposal(deps, id);
  if (!p) return refuse(TEXT.expired);
  if (p.preview || p.published) return { ok: true };

  let claimed = false;
  await deps.store.update(key(id), (cur) => {
    claimed = false;
    if (!cur || cur.cancelled || cur.preview || cur.published || (cur.previewing && deps.now() - cur.previewing < CLAIM_MS)) return cur;
    claimed = true;
    return { ...cur, previewing: deps.now() };
  });
  if (!claimed) return { ok: true };

  try {
    const built = await buildFiles(deps, p);
    if (built.problem) {
      await clearField(deps, id, "previewing");
      return built.reload ? { ok: false, text: built.problem, reload: true } : refuse(built.problem);
    }
    const opened = await deps.repo.openPreview({ id, baseSha: built.sha, message: titleOf(p.summary), files: built.files });
    let kept = false;
    await deps.store.update(key(id), (cur) => {
      kept = false;
      if (!cur || cur.cancelled) return cur;
      kept = true;
      const { previewing, ...rest } = cur;
      return { ...rest, preview: { number: opened.number, sha: opened.sha } };
    });
    if (!kept) await deps.repo.closePreview({ id, number: opened.number }); // cancelled meanwhile
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

  // The change exists: a failure asking Netlify or the store about it is not an
  // answer, so the page is told it is still under way and asks again.
  if (p.published) {
    // The sha and title let the page offer "Undo this" even if it lost the publish answer.
    const mine = { sha: p.published.sha, title: p.published.title };
    try {
      const d = await deps.netlify.deployFor(p.published.sha);
      if (d.state === "ready") await forgetUnconfirmed(deps, id);
      if (d.state !== "failed") return { ...report("publish", d), ...mine };
      const { justPutBack, ...answer } = await putSiteBack(deps, id, p.published.sha);
      return answer;
    } catch (err) {
      logEvent(deps, "status_failed", { name: err?.name || "Error" });
      return { stage: "publish", state: "building", ...mine };
    }
  }

  if (!p.preview) return { stage: "preview", state: "waiting" };
  try {
    const d = await deps.netlify.deployFor(p.preview.sha);
    if (d.state === "failed") {
      await discard(deps, id, p.preview);
      return { stage: "preview", state: "failed", text: TEXT.thrownAway };
    }
    return report("preview", d);
  } catch (err) {
    logEvent(deps, "status_failed", { name: err?.name || "Error" });
    return { stage: "preview", state: "building" };
  }
}

// The live site failed to update with this edit, so undo it: one poll at a
// time (others are told it is still under way), at most MAX_REVERT_TRIES times.
async function putSiteBack(deps, id, sha) {
  // `justPutBack` (this call undid the edit) is for settleUnconfirmed; status leaves it out.
  const failed = (text, extra) => ({ stage: "publish", state: "failed", text, ...extra });
  let step = null;
  await deps.store.update(key(id), (cur) => {
    step = null;
    if (!cur) return null;
    if (cur.revertDone) step = "done";
    else if (cur.revertFailed) step = "gave-up";
    else if (cur.undoing && deps.now() - cur.undoing < CLAIM_MS) step = "wait";
    else {
      step = "undo";
      return { ...cur, undoing: deps.now(), revertTries: (cur.revertTries || 0) + 1 };
    }
    return cur;
  });
  if (step === "wait") return { stage: "publish", state: "building" };
  if (step !== "undo") {
    await forgetUnconfirmed(deps, id);
    return failed(step === "done" ? TEXT.putBack : TEXT.notPutBack);
  }

  let ok = false;
  try {
    ok = (await undoEdit(deps, sha)).ok;
  } catch {
    // The reason stays out of the reply; the next poll tries again (up to the limit).
  }
  const saved = await deps.store.update(key(id), (cur) => {
    if (!cur) return null;
    const { undoing, ...rest } = cur;
    if (ok) return { ...rest, revertDone: true };
    return (rest.revertTries || 0) >= MAX_REVERT_TRIES ? { ...rest, revertFailed: true } : rest;
  });
  if (ok || saved?.revertFailed) await forgetUnconfirmed(deps, id);
  if (ok) return failed(TEXT.putBack, { justPutBack: true });
  return failed(saved?.revertFailed ? TEXT.notPutBack : TEXT.notYetPutBack);
}

export async function publish(deps, id) {
  await settleUnconfirmed(deps);
  const p = await loadProposal(deps, id);
  if (!p) return refuse(TEXT.expired);
  if (p.published) return { ok: true, title: p.published.title, sha: p.published.sha };

  let outcome = null;
  await deps.store.update(key(id), (cur) => {
    outcome = null;
    if (!isLive(deps, cur)) {
      outcome = { gone: true, preview: cur?.preview };
      return null;
    }
    if (cur.cancelled) {
      outcome = { gone: true };
      return cur;
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
  if (outcome.gone) {
    if (outcome.preview) {
      try { await deps.repo.closePreview({ id, number: outcome.preview.number }); } catch {}
    }
    return refuse(TEXT.expired);
  }
  if (outcome.done) return { ok: true, title: outcome.done.title, sha: outcome.done.sha };
  if (outcome.busy) return refuse(TEXT.busy);

  const title = titleOf(p.summary);
  let result;
  try {
    result = await retryOnStale(async () => {
      const built = await buildFiles(deps, p);
      if (built.problem) return built;
      return { sha: await deps.repo.write({ branch: "main", baseSha: built.sha, message: `${PREFIX}${title}`, files: built.files }) };
    });
  } catch (e) {
    await clearField(deps, id, "publishing");
    throw e;
  }
  if (!result.sha) {
    await clearField(deps, id, "publishing");
    if (result.reload) return { ok: false, text: result.problem, reload: true };
    return refuse(result.stale ? TEXT.movedPublish : result.problem);
  }

  // A record that vanished meanwhile is not brought back.
  await deps.store.update(key(id), (cur) => {
    if (!cur) return null;
    const { publishing, photos, cancelled, ...rest } = cur;
    return { ...rest, published: { sha: result.sha, title } };
  });
  await rememberUnconfirmed(deps, id, result.sha);
  if (p.preview) {
    try { await deps.repo.closePreview({ id, number: p.preview.number }); } catch {}
  }
  return { ok: true, title, sha: result.sha };
}

export async function cancel(deps, id) {
  if (typeof id !== "string" || !ID.test(id)) return { ok: true };
  // Check and mark cancelled in one compare-and-swap write, so a publish cannot
  // claim it in between. The record is never deleted here (the production
  // store's delete is unchecked); a light marker stays until it expires.
  // A stale publishing claim is cancelled only once the site shows its write
  // never landed (`staleClaim` is the claim time that was checked).
  const markCancelled = async (staleClaim) => {
    let outcome = null;
    await deps.store.update(key(id), (cur) => {
      outcome = null;
      if (!cur || cur.cancelled) return cur;
      if (cur.published) {
        outcome = { onSite: true };
        return cur;
      }
      if (cur.publishing && cur.publishing !== staleClaim) {
        outcome = deps.now() - cur.publishing < CLAIM_MS ? { busy: true } : { stale: cur.publishing };
        return cur;
      }
      outcome = { preview: cur.preview };
      return { id: cur.id, createdAt: cur.createdAt, cancelled: deps.now() };
    });
    return outcome;
  };

  let outcome = await markCancelled(null);
  if (outcome?.stale) {
    const claim = outcome.stale;
    const landed = await landedSince(deps, id, claim);
    outcome = landed ? await markPublished(deps, id, claim, landed) : await markCancelled(claim);
  }
  if (outcome?.onSite) return refuse(TEXT.onSite);
  if (outcome?.busy || outcome?.stale) return refuse(TEXT.busy);
  if (outcome?.preview) {
    try { await deps.repo.closePreview({ id, number: outcome.preview.number }); } catch {}
  }
  return { ok: true };
}

// Did a publish that claimed this change at `claim` write it to the site before
// its function stopped? Looks for a recent edit with its title, dated after the
// claim (less a few seconds, for clocks that differ). Returns { sha, title } or null.
const CLOCK_SKEW_MS = 5 * 1000;
async function landedSince(deps, id, claim) {
  const p = await deps.store.get(key(id));
  if (!p || !Array.isArray(p.summary)) return null;
  const title = titleOf(p.summary);
  const hit = (await deps.repo.edits(10)).find((e) => e.title === title && Date.parse(e.date) >= claim - CLOCK_SKEW_MS);
  return hit ? { sha: hit.sha, title } : null;
}

// Records a write found on the site for a stale claim, as publish would have.
// The change is on the site whatever the record says now.
async function markPublished(deps, id, claim, { sha, title }) {
  let openPreview = null;
  await deps.store.update(key(id), (cur) => {
    openPreview = null;
    if (!cur || cur.cancelled || cur.published || cur.publishing !== claim) return cur;
    openPreview = cur.preview || null;
    const { publishing, photos, ...rest } = cur;
    return { ...rest, published: { sha, title } };
  });
  await rememberUnconfirmed(deps, id, sha);
  if (openPreview) {
    try { await deps.repo.closePreview({ id, number: openPreview.number }); } catch {}
  }
  return { onSite: true };
}

export async function history(deps) {
  await settleUnconfirmed(deps);
  return (await deps.repo.edits(30)).map((e) => ({ sha: e.sha, when: new Date(e.date).toISOString(), title: e.title }));
}

export const undo = (deps, sha) => undoEdit(deps, sha);

// The editor page's pure helpers: everything that can be changed on the site,
// finding it by a few words, the changes as the server's own operations, and
// plain words for values. No page, network or storage access: the editor page
// (admin.js) and the tests (Node) both import this file as it is.
//
// An entry is one thing Paige can change:
//   { file, path, trail: string[], type, field, value, choices? }
//   file   a content file key from the field description (schema.files)
//   path   where it is in that file, as the server's operations write it ("/a/0/b")
//   trail  plain labels from the page down to the thing itself
//   choices  for a choice field: { option: plain name }

// ---- pages and fields -------------------------------------------------------

// The order pages are listed in, and the order search results tie-break on.
export const PAGE_ORDER = [
  "home", "story", "details", "travel", "registry", "rsvp", "party", "afterparty", "faq", "gallery",
  "site", "theme", "nav", "guests", "notfound",
];

// Every file in the field description, in page order (any file not named above goes last).
export function fileOrder(schema) {
  const keys = Object.keys(schema.files);
  return [...PAGE_ORDER.filter((k) => keys.includes(k)), ...keys.filter((k) => !PAGE_ORDER.includes(k))];
}

// A list item's own "id" is a fixed reference (a guest's number is in their
// invitation link), so it is never shown, like the fields marked hidden.
export const isShown = (field, inList) => field.type !== "hidden" && !(inList && field.name === "id");

const NAME_KEYS = ["question", "title", "name", "label", "caption", "alt"];
const filled = (v) => typeof v === "string" && v.trim() !== "";

function nameKey(item) {
  if (!item || typeof item !== "object") return null;
  return NAME_KEYS.find((k) => filled(item[k])) || null;
}

// What a list item is called on screen.
export function itemName(item, i) {
  if (typeof item === "string") return filled(item) ? item.trim() : `Item ${i + 1}`;
  const k = nameKey(item);
  return k ? item[k].trim() : `Item ${i + 1}`;
}

// Whether "Add one" can make a complete item: not when an item needs a setting
// that is never shown (a menu link's address).
export const canAdd = (listField) => !(listField.fields || []).some((f) => f.type === "hidden" && f.required);

const FOCUS_NAMES = { center: "Centered", high: "Toward the top", left: "Toward the left" };
const humanize = (s) => {
  const words = String(s).replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Plain names for a choice field's options. A page's section order is named
// after its sections (the fields beside it).
export function optionLabels(field, siblings) {
  const out = {};
  for (const o of field.options || []) {
    const section = field.name === "section_order" ? (siblings || []).find((f) => f.name === o) : null;
    out[o] = section ? section.label : field.name === "focus" && FOCUS_NAMES[o] ? FOCUS_NAMES[o] : humanize(o);
  }
  return out;
}

const escapeSegment = (s) => String(s).replace(/~/g, "~0").replace(/\//g, "~1");
const INDEX = /^(0|[1-9]\d*)$/;
const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function segmentsOf(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path === "/") return null;
  return path.slice(1).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
}

// ---- the index --------------------------------------------------------------

// Every editable leaf and every list of every file, in page order. A list item's
// leaves carry the item's name in their trail, except the leaf that names it
// (its words are its value, so they are not counted twice).
export function buildIndex(schema, content) {
  const out = [];
  for (const file of fileOrder(schema)) {
    const def = schema.files[file];
    collect(out, file, def.fields, content[file], "", [def.label], false, null, -1);
  }
  return out;
}

// `rowAt` is where in the trail a label-and-value row's label sits (-1: none):
// for such rows (a detail's "Time", a meal's name) that label is what the row is
// called, so search weighs it like the field's own label.
function collect(out, file, fields, obj, path, trail, inList, ownNameKey, rowAt) {
  for (const f of fields || []) {
    if (!isShown(f, inList)) continue;
    const p = `${path}/${escapeSegment(f.name)}`;
    const v = isObj(obj) ? obj[f.name] : undefined;
    if (f.type === "object") {
      collect(out, file, f.fields, v, p, [...trail, f.label], false, null, rowAt);
      continue;
    }
    if (f.type === "list") {
      const items = Array.isArray(v) ? v : [];
      out.push({ file, path: p, trail: [...trail, f.label], type: "list", field: f, value: v });
      if (!f.fields) continue;
      items.forEach((item, i) => {
        const key = nameKey(item);
        collect(out, file, f.fields, item, `${p}/${i}`, [...trail, f.label, itemName(item, i)], true, key, key === "label" ? trail.length + 1 : -1);
      });
      continue;
    }
    const leafTrail = ownNameKey === f.name ? [...trail.slice(0, -1), f.label] : [...trail, f.label];
    const entry = { file, path: p, trail: leafTrail, type: f.type, field: f, value: v };
    if (f.type === "select") entry.choices = optionLabels(f, fields);
    if (rowAt >= 0 && ownNameKey !== f.name) entry.rowAt = rowAt;
    out.push(entry);
  }
}

// The thing at `path` in a file, or null when there is nothing there. For a list
// item (a path ending in a position) `item` is true and `field` is the list.
//   { file, path, field, value, trail, siblings, inList, item, choices? }
export function locate(schema, content, file, path) {
  const def = schema.files[file];
  const segs = segmentsOf(path);
  if (!def || !segs || segs.some((s) => UNSAFE.has(s))) return null;
  let fields = def.fields;
  let value = content[file];
  const trail = [def.label];
  let field = null;
  let siblings = def.fields;
  let inList = false;
  let afterIndex = false;
  let item = false;
  let expectIndex = false;
  for (const seg of segs) {
    if (expectIndex) {
      if (!Array.isArray(value) || !INDEX.test(seg) || Number(seg) >= value.length) return null;
      value = value[Number(seg)];
      trail.push(itemName(value, Number(seg)));
      fields = field.fields || [];
      expectIndex = false;
      afterIndex = true;
      item = true;
      continue;
    }
    const f = (fields || []).find((x) => x.name === seg);
    if (!f) return null;
    siblings = fields;
    field = f;
    inList = afterIndex;
    afterIndex = false;
    item = false;
    value = isObj(value) ? value[seg] : undefined;
    trail.push(f.label);
    if (f.type === "list") expectIndex = true;
    else if (f.type === "object") fields = f.fields;
  }
  const out = { file, path, field, value, trail, siblings, inList, item, type: field.type };
  if (field.type === "select") out.choices = optionLabels(field, siblings);
  return out;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Which control changes this entry:
//   line | text | markdown | switch | date | time | choice | order | photo | colour | list | group
// A "time" field holding words (not HH:MM) stays a plain line, so nothing is lost.
export function controlFor(entry) {
  const f = entry.field;
  switch (f.type) {
    case "list": return "list";
    case "object": return "group";
    case "image": return "photo";
    case "boolean": return "switch";
    case "date": return "date";
    case "time": return entry.value === undefined || entry.value === null || entry.value === "" || HHMM.test(entry.value) ? "time" : "line";
    case "select": return f.multiple ? "order" : "choice";
    case "markdown": return "markdown";
    case "text": return "text";
    case "hidden": return null;
    default: return entry.file === "theme" ? "colour" : "line";
  }
}

// ---- words for values -------------------------------------------------------

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "2028-06-01" → "June 1, 2028". Anything else comes back as it is.
export function formatDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return String(s);
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

// "16:30" → "4:30 PM". Anything else comes back as it is.
export function formatTime(s) {
  if (!HHMM.test(String(s))) return String(s);
  const [h, min] = String(s).split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const PHOTO_REF = /^@photo:([A-Za-z0-9_-]+)$/;
export const isPhonePhoto = (v) => typeof v === "string" && PHOTO_REF.test(v);
const blank = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

// A value in plain words, for a row on a page and for the tray.
export function describe(entry, value = entry.value) {
  const f = entry.field;
  const names = entry.choices || (f.type === "select" ? optionLabels(f, []) : {});
  switch (f.type) {
    case "boolean": return value === true ? "On" : "Off";
    case "list": {
      const n = Array.isArray(value) ? value.length : 0;
      return n === 0 ? "No items yet" : n === 1 ? "1 item" : `${n} items`;
    }
    case "select":
      if (f.multiple) return (Array.isArray(value) ? value : []).map((v) => names[v] ?? String(v)).join(", ") || "Not set";
      return blank(value) ? "Not set" : names[value] ?? String(value);
  }
  if (blank(value)) return "Not set";
  switch (f.type) {
    case "date": return formatDate(value);
    case "time": return formatTime(value);
    case "image": return isPhonePhoto(value) ? "A new photo from your phone" : String(value).split("/").pop();
    default: return String(value);
  }
}

// ---- search -----------------------------------------------------------------

const STOP = new Set([
  "the", "a", "an", "of", "to", "on", "in", "for", "my", "our", "and", "change", "edit", "update", "please", "i", "want",
  "is", "are", "what", "where", "how", "do", "can", "at", "it", "where's", "whats", "what's",
]);
const GROUPS = [
  ["hotel", "room block", "nearby hotels"],
  ["picture", "pic", "photo", "image"],
  ["kids", "children", "child"],
  ["colour", "color"],
  ["menu", "nav", "navigation"],
  ["guests", "guest list", "invitation"],
  ["bridesmaids", "paige's side"],
  ["groomsmen", "jeff's side"],
];
const ONE_WAY = {
  time: ["ceremony", "schedule"],
  pink: ["rsvp pink", "rosette"],
  green: ["banner green"],
  deadline: ["reply-by", "reply by"],
  date: ["deadline", "day"],
};
const SYNONYMS = (() => {
  const map = new Map();
  for (const group of GROUPS) for (const w of group) map.set(w, group.filter((x) => x !== w));
  for (const [w, alts] of Object.entries(ONE_WAY)) map.set(w, [...(map.get(w) || []), ...alts]);
  return map;
})();

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[‘’]/g, "'");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tokensOf = (text) => norm(text).split(/[^\p{L}\p{N}:#@']+/u).filter(Boolean);

function queryWords(query) {
  const words = norm(query).split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}#@]+|[^\p{L}\p{N}]+$/gu, "")).filter(Boolean);
  const useful = words.filter((w) => !STOP.has(w));
  return useful.length ? useful : words;
}

// The words of an entry's current value that search looks at.
function valueText(e) {
  const v = e.value;
  if (e.type === "list" || v === undefined || v === null || typeof v === "boolean") return "";
  if (Array.isArray(v)) return v.map((x) => `${x} ${e.choices?.[x] ?? ""}`).join(" ");
  if (e.type === "date") return `${v} ${formatDate(v)}`;
  if (e.type === "time") return `${v} ${formatTime(v)}`;
  if (e.type === "select") return `${v} ${e.choices?.[v] ?? ""}`;
  return String(v);
}

// Where a word is found decides how much it counts: the thing's own label most,
// then a section it is in, then its current value, then only the page's name.
// A word found as the start of a longer word counts a little less, and one found
// only through a synonym less again.
const LEVEL = { own: 400, section: 300, value: 200, page: 100 };
const PARTIAL = 10;
const SYNONYM = 25;
const DEMOTED = /^\/(seo|labels)\//; // search-engine and button-wording settings

// How well `form` is found in a piece of text: 0 none, 1 as a word start, 2 a whole word.
function found(tokens, text, form) {
  if (form.includes(" ")) return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRe(form)}`, "u").test(text) ? 2 : 0;
  if (tokens.includes(form)) return 2;
  return tokens.some((t) => t.startsWith(form)) ? 1 : 0;
}

function pieces(e) {
  const last = e.trail.length - 1;
  const out = e.trail.map((text, i) => ({
    text, level: i === 0 && last > 0 ? LEVEL.page : i === last || i === e.rowAt ? LEVEL.own : LEVEL.section, label: i === last || i === e.rowAt,
  }));
  out.push({ text: valueText(e), level: LEVEL.value, label: false });
  for (const p of out) {
    p.norm = norm(p.text);
    p.tokens = tokensOf(p.text);
  }
  return out;
}

// Up to `limit` entries matching every word of the query, best first. Ties go to
// anything outside the search-engine and button-wording settings, then to the
// label most fully matched, then to the shallower entry, then to page order.
export function search(index, query, limit = 20) {
  const words = queryWords(query);
  if (!words.length) return [];
  const scored = [];
  index.forEach((e, order) => {
    const parts = pieces(e);
    const covered = parts.map(() => new Set());
    let score = 0;
    for (const w of words) {
      const forms = w.length > 3 && w.endsWith("s") ? [w, w.slice(0, -1)] : [w];
      // A synonym that is itself one of her words is already counted as that word.
      const alts = forms.flatMap((x) => SYNONYMS.get(x) || []).filter((x) => !words.includes(x));
      let best = 0;
      parts.forEach((p, i) => {
        for (const [list, cost] of [[forms, 0], [alts, SYNONYM]]) {
          for (const form of list) {
            const how = found(p.tokens, p.norm, form);
            if (!how) continue;
            best = Math.max(best, p.level - cost - (how === 1 ? PARTIAL : 0));
            if (p.label) for (const t of p.tokens) if (t.startsWith(form.split(" ")[0])) covered[i].add(t);
          }
        }
      });
      if (!best) return;
      score += best;
    }
    const coverage = Math.max(0, ...parts.map((p, i) => (p.label && p.tokens.length ? covered[i].size / p.tokens.length : 0)));
    scored.push({ e, score, demoted: DEMOTED.test(e.path) ? 1 : 0, coverage, depth: e.trail.length, order });
  });
  scored.sort((a, b) => b.score - a.score || a.demoted - b.demoted || b.coverage - a.coverage || a.depth - b.depth || a.order - b.order);
  return scored.slice(0, limit).map((s) => s.e);
}

// ---- operations -------------------------------------------------------------

// The server's operation for an action on an entry:
//   { type: "set", value }            → { op: "set", file, path, value }
//   { type: "insert", index?, value } → { op: "insert", file, path (the list), index (-1: the end), value }
//   { type: "remove", at? }           → { op: "remove", file, path (the item) }
//   { type: "move", at?, to }         → { op: "move", file, path (the item), to }
// For remove and move, `at` names the item when the entry is the list itself.
export function opFor(entry, action) {
  const { file } = entry;
  const itemPath = Number.isInteger(action.at) ? `${entry.path}/${action.at}` : entry.path;
  switch (action.type) {
    case "set": return { op: "set", file, path: entry.path, value: action.value };
    case "insert": return { op: "insert", file, path: entry.path, index: Number.isInteger(action.index) ? action.index : -1, value: action.value };
    case "remove": return { op: "remove", file, path: itemPath };
    case "move": return { op: "move", file, path: itemPath, to: action.to };
    default: throw new Error("That is not a kind of change the editor makes.");
  }
}

export class LocalOpError extends Error {}
const fail = () => {
  throw new LocalOpError("That change no longer fits the site.");
};

function walkTo(root, segs) {
  let node = root;
  for (const seg of segs) {
    if (Array.isArray(node)) {
      if (!INDEX.test(seg) || Number(seg) >= node.length) fail();
      node = node[Number(seg)];
    } else if (isObj(node)) {
      if (!Object.hasOwn(node, seg)) fail();
      node = node[seg];
    } else fail();
  }
  return node;
}

function applyOne(content, op) {
  if (!op || typeof op !== "object" || !["set", "insert", "remove", "move"].includes(op.op)) fail();
  if (typeof op.file !== "string" || !Object.hasOwn(content, op.file)) fail();
  const segs = segmentsOf(op.path);
  if (!segs || segs.some((s) => UNSAFE.has(s))) fail();
  const last = segs[segs.length - 1];

  if (op.op === "set") {
    if (op.value === undefined) fail();
    const parent = walkTo(content[op.file], segs.slice(0, -1));
    if (Array.isArray(parent)) {
      if (!INDEX.test(last) || Number(last) >= parent.length) fail();
      parent[Number(last)] = structuredClone(op.value);
    } else if (isObj(parent)) {
      parent[last] = structuredClone(op.value);
    } else fail();
    return;
  }
  if (op.op === "insert") {
    if (op.value === undefined) fail();
    const list = walkTo(content[op.file], segs);
    if (!Array.isArray(list)) fail();
    const at = op.index === -1 || op.index === undefined ? list.length : op.index;
    if (!Number.isInteger(at) || at < 0 || at > list.length) fail();
    list.splice(at, 0, structuredClone(op.value));
    return;
  }
  const list = walkTo(content[op.file], segs.slice(0, -1));
  if (!Array.isArray(list) || !INDEX.test(last) || Number(last) >= list.length) fail();
  const from = Number(last);
  if (op.op === "remove") {
    list.splice(from, 1);
    return;
  }
  const to = op.to === -1 ? list.length - 1 : op.to;
  if (!Number.isInteger(to) || to < 0 || to >= list.length) fail();
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
}

// The content with the operations applied, exactly as the server applies them.
// Throws LocalOpError when one does not apply. The input is never changed.
export function applyLocal(content, ops) {
  const copy = structuredClone(content);
  for (const op of ops) applyOne(copy, op);
  return copy;
}

// ---- checks -----------------------------------------------------------------

const TAG = /<[A-Za-z/!]/;
const TEXTY = new Set(["string", "text", "markdown"]);

function realDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

// What the browser can cheaply check before anything is sent: one plain
// sentence, or null when the value is fine. The server's answer is still final.
export function checkLocal(field, value) {
  const many = (n) => `${n} ${n === 1 ? "item" : "items"}`;
  if (field.type === "list") {
    const n = Array.isArray(value) ? value.length : 0;
    if (field.min !== undefined && n < field.min) return `This list needs at least ${many(field.min)}.`;
    if (field.max !== undefined && n > field.max) return `This list can have at most ${many(field.max)}.`;
    return null;
  }
  if (field.type === "select" && field.multiple) {
    const v = Array.isArray(value) ? value : [];
    if (v.some((x) => !field.options.includes(x))) return "Please pick from the choices shown.";
    if (field.name === "section_order" && (v.length !== field.options.length || !field.options.every((o) => v.filter((x) => x === o).length === 1))) {
      return "Every section needs to appear exactly once.";
    }
    if (field.min !== undefined && v.length < field.min) return `Please pick at least ${field.min}.`;
    if (field.max !== undefined && v.length > field.max) return `Please pick no more than ${field.max}.`;
    return null;
  }
  if (field.type === "boolean") return null;
  if (blank(value)) return field.required ? "This can't be left empty." : null;
  switch (field.type) {
    case "date": return realDate(value) ? null : "Please pick a real date.";
    case "time": return HHMM.test(value) ? null : "Please pick a time.";
    case "select": return field.options.includes(value) ? null : "Please pick one of the choices.";
  }
  if (TEXTY.has(field.type)) {
    if (TAG.test(value)) return "This can't contain page code such as <b>.";
    if (field.maxlength && value.length > field.maxlength) {
      return `Please keep this to ${field.maxlength} characters or fewer (it has ${value.length}).`;
    }
    if (field.pattern && !new RegExp(field.pattern).test(value)) {
      return field.patternMessage ? field.patternMessage.replace(/[.]?$/, ".") : "This isn't in the right format.";
    }
  }
  return null;
}

// ---- new list items ---------------------------------------------------------

function emptyValue(f) {
  switch (f.type) {
    case "boolean": return f.default ?? false;
    case "list": return [];
    case "object": return Object.fromEntries((f.fields || []).filter((x) => x.type !== "hidden").map((x) => [x.name, emptyValue(x)]));
    case "select": return f.multiple ? [...(f.options || [])] : f.required ? f.options[0] : "";
    default: return "";
  }
}

// A new item for a list, every field at a sensible empty value. Settings that
// are never shown are left out. An item "id" is the next number not used in
// `items` (the list as it will be) or `alsoUsed` (the list on the site now), so
// a number removed in the tray is never handed out again.
export function emptyItem(listField, items = [], alsoUsed = []) {
  const out = {};
  for (const f of listField.fields || []) {
    if (f.type === "hidden") continue;
    if (f.name === "id") {
      const used = [...items, ...alsoUsed].map((x) => Number.parseInt(x && x.id, 10)).filter(Number.isFinite);
      out.id = String(used.length ? Math.max(...used) + 1 : 1);
      continue;
    }
    out[f.name] = emptyValue(f);
  }
  return out;
}

// ---- the tray ---------------------------------------------------------------
// The tray is an ordered list of { id, op, entryLabel, marks, photoRef? }. The
// page always shows applyLocal(serverContent, the tray's ops).
//
// Operations name list items by position, and the site can change underneath
// (an undo, a publish from another phone). So each change also keeps `marks`:
// for every list position on its path, the item that was there when the change
// was made (as stable text). Before a change is applied to fresh content, each
// mark is checked; an item that moved is followed, and a change whose item is
// gone (or now appears twice) is dropped rather than guessed.

const within = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);
const parentOf = (path) => path.slice(0, path.lastIndexOf("/"));
const lastIndex = (path) => Number(path.slice(path.lastIndexOf("/") + 1));
const joinPath = (segs) => segs.map((s) => `/${escapeSegment(s)}`).join("");

// JSON with object keys in a fixed order, so equal items give equal text.
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

// The item at each list position along `path`: [{ at: segment number, item }].
export function marksOf(content, file, path) {
  const segs = segmentsOf(path) || [];
  const marks = [];
  let node = content[file];
  for (let k = 0; k < segs.length; k++) {
    if (Array.isArray(node)) {
      const i = Number(segs[k]);
      if (!INDEX.test(segs[k]) || i >= node.length) break;
      marks.push({ at: k, item: stable(node[i]) });
      node = node[i];
    } else if (isObj(node)) node = node[segs[k]];
    else break;
  }
  return marks;
}

// `path` with each marked position moved to wherever its item is now in
// `content`; null when an item is gone or appears more than once.
export function relocate(content, file, path, marks) {
  if (!Array.isArray(marks) || !marks.length) return path;
  const segs = segmentsOf(path);
  if (!segs) return null;
  let node = content[file];
  for (let k = 0; k < segs.length; k++) {
    if (Array.isArray(node)) {
      const mark = marks.find((m) => m.at === k);
      let i = Number(segs[k]);
      if (mark && !(i < node.length && stable(node[i]) === mark.item)) {
        const hits = [];
        node.forEach((x, j) => {
          if (stable(x) === mark.item) hits.push(j);
        });
        if (hits.length !== 1) return null;
        i = hits[0];
        segs[k] = String(i);
      }
      node = node[i];
    } else if (isObj(node)) node = node[segs[k]];
    else node = undefined;
  }
  return joinPath(segs);
}

// The tray with every change's marks taken again, by replaying it on `content`.
// Called whenever the tray changes, since an earlier change can alter an item a
// later change marked.
export function remark(content, tray) {
  const copy = structuredClone(content);
  return tray.map((t) => {
    const marks = marksOf(copy, t.op.file, t.op.path);
    try {
      applyOne(copy, t.op);
    } catch {
      /* left as it is; pruneTray deals with it */
    }
    return { ...t, marks };
  });
}

// Does `later` rely on `earlier` having happened? Anything in a list after an
// item was added, removed or moved in it counts on those positions; anything
// inside a value that was replaced counts on that value.
export function dependsOn(later, earlier) {
  if (later.file !== earlier.file) return false;
  if (earlier.op === "set") return later.path !== earlier.path && within(later.path, earlier.path);
  const list = earlier.op === "insert" ? earlier.path : parentOf(earlier.path);
  return within(later.path, list);
}

function valueAt(content, file, path) {
  let node = content[file];
  for (const seg of segmentsOf(path) || []) {
    if (Array.isArray(node)) node = node[Number(seg)];
    else if (isObj(node)) node = node[seg];
    else return undefined;
  }
  return node;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clip = (s, n = 70) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// A change in plain words, worked out on the content just before it.
export function describeOp(schema, before, op) {
  const fileLabel = schema.files[op.file]?.label ?? op.file;
  if (op.op === "set") {
    const at = locate(schema, before, op.file, op.path);
    if (!at) return fileLabel;
    const words = at.item ? itemName(op.value, lastIndex(op.path)) : describe(at, op.value);
    return `${at.trail.join(" › ")}: ${clip(words.replace(/\s+/g, " "))}`;
  }
  const listPath = op.op === "insert" ? op.path : parentOf(op.path);
  const list = locate(schema, before, op.file, listPath);
  const trail = list ? list.trail.join(" › ") : fileLabel;
  if (op.op === "insert") {
    const n = Array.isArray(list?.value) ? list.value.length : 0;
    return `Added to ${trail}: ${clip(itemName(op.value, op.index === -1 || op.index === undefined ? n : op.index))}`;
  }
  const from = lastIndex(op.path);
  const name = clip(itemName(list?.value?.[from], from));
  if (op.op === "remove") return `Removed from ${trail}: ${name}`;
  const to = op.to === -1 ? (list?.value?.length ?? 1) - 1 : op.to;
  return `Moved ${name} ${to > from ? "down" : "up"} in ${trail}`;
}

let changeCount = 0;
const newChangeId = () => `c${Date.now().toString(36)}-${(++changeCount).toString(36)}`;

// Adds a change to the tray and returns { tray, unchanged? } (a new array; the
// one given is not changed). Setting something again replaces the earlier
// setting, and setting it back to how it was drops it; moving the item just
// moved folds into one move. `unchanged` is true when it would change nothing.
// `extra` is kept on the new entry (photoRef; id to choose the id).
export function addChange(schema, content, tray, op, extra = {}) {
  const ops = tray.map((t) => t.op);
  const entry = (o, before) => ({ id: newChangeId(), ...extra, op: o, entryLabel: describeOp(schema, before, o) });
  const done = (next) => ({ tray: remark(content, next) });

  if (op.op === "set") {
    let k = -1;
    for (let i = ops.length - 1; i >= 0; i--) {
      if (ops[i].op === "set" && ops[i].file === op.file && ops[i].path === op.path) {
        k = i;
        break;
      }
      if (dependsOn(op, ops[i])) break;
    }
    if (k >= 0) {
      if (same(ops[k].value, op.value)) return { tray, unchanged: true };
      const before = applyLocal(content, ops.slice(0, k));
      const next = [...tray];
      if (same(valueAt(before, op.file, op.path), op.value)) next.splice(k, 1);
      else next[k] = entry(op, before);
      return done(next);
    }
    const now = applyLocal(content, ops);
    if (same(valueAt(now, op.file, op.path), op.value)) return { tray, unchanged: true };
    return done([...tray, entry(op, now)]);
  }

  const prev = ops[ops.length - 1];
  if (op.op === "move" && prev && prev.op === "move" && prev.file === op.file && op.to !== -1 && prev.to !== -1 &&
      parentOf(prev.path) === parentOf(op.path) && prev.to === lastIndex(op.path)) {
    const before = applyLocal(content, ops.slice(0, -1));
    const merged = { op: "move", file: op.file, path: prev.path, to: op.to };
    const next = tray.slice(0, -1);
    if (lastIndex(prev.path) !== op.to) next.push(entry(merged, before));
    return done(next);
  }
  return done([...tray, entry(op, applyLocal(content, ops))]);
}

// Dropping change `i` also drops every later change that relies on it.
// Returns { tray, dropped: positions in the given tray }. Take the marks again
// (remark) before keeping the result.
export function dropChange(tray, i) {
  const dropped = [i];
  for (let j = i + 1; j < tray.length; j++) {
    if (dropped.some((d) => dependsOn(tray[j].op, tray[d].op))) dropped.push(j);
  }
  return { tray: tray.filter((_, j) => !dropped.includes(j)), dropped };
}

// The tray without the changes whose ids are listed: what is left once the
// changes that went into a publish are on the site.
export function removeEntries(tray, ids) {
  const gone = new Set(ids);
  return gone.size ? tray.filter((t) => !gone.has(t.id)) : tray;
}

// After fresh content arrives: each change is checked against its marks and
// moved with its item, or dropped (with the changes that relied on it) when its
// item is gone or can't be told apart, or when it no longer applies.
// Returns { tray, dropped: count }; the same tray when nothing had to change.
export function pruneTray(content, tray) {
  const copy = structuredClone(content);
  const keep = [];
  const gone = [];
  let moved = false;
  for (const t of tray) {
    if (gone.some((g) => dependsOn(t.op, g))) {
      gone.push(t.op);
      continue;
    }
    let op = t.op;
    const path = relocate(copy, op.file, op.path, t.marks);
    if (path === null) {
      gone.push(t.op);
      continue;
    }
    if (path !== op.path) {
      op = { ...op, path };
      if (op.op === "move" && op.to !== -1) {
        const list = valueAt(copy, op.file, parentOf(path));
        const to = op.to + (lastIndex(path) - lastIndex(t.op.path));
        op.to = Math.max(0, Math.min(to, Array.isArray(list) ? list.length - 1 : 0));
      }
      moved = true;
    }
    try {
      applyOne(copy, op);
      keep.push(op === t.op ? t : { ...t, op });
    } catch {
      gone.push(t.op);
    }
  }
  return gone.length || moved ? { tray: keep, dropped: gone.length } : { tray, dropped: 0 };
}

// What is kept in the tab's storage: every change, the ones that use a new photo
// marked, since photos themselves can't be kept.
export function toStorage(tray) {
  return tray.map(({ id, op, entryLabel, marks, photoRef }) => {
    const out = { id, op, entryLabel, marks };
    if (photoRef || photoRefs(op.value).length) out.photo = true;
    return out;
  });
}

// The tray as kept, minus the changes that used a new photo and those relying
// on them. Returns { tray, lost: how many were dropped }.
export function fromStorage(saved) {
  let tray = (Array.isArray(saved) ? saved : []).filter((t) =>
    isObj(t) && isObj(t.op) && typeof t.op.file === "string" && typeof t.op.path === "string" && typeof t.entryLabel === "string");
  tray = tray.map((t) => ({ ...t, id: typeof t.id === "string" ? t.id : newChangeId(), marks: Array.isArray(t.marks) ? t.marks : [] }));
  let lost = 0;
  for (let i = tray.length - 1; i >= 0; i--) {
    if (i >= tray.length || !(tray[i].photo || photoRefs(tray[i].op.value).length)) continue;
    const r = dropChange(tray, i);
    lost += r.dropped.length;
    tray = r.tray;
  }
  return { tray: tray.map(({ photo, ...t }) => t), lost };
}

// Where each change is in the content the whole tray makes (the page shows),
// following it through the later changes; null when a later change removed it.
// A set's spot is its field, an added or moved item's spot is the item, and a
// removal's spot is its list.
export function currentSpots(content, tray) {
  const copy = structuredClone(content);
  const spots = [];
  for (const t of tray) {
    const op = t.op;
    let spot = op.path;
    let shift = null;
    if (op.op === "insert") {
      const list = valueAt(copy, op.file, op.path);
      const n = Array.isArray(list) ? list.length : 0;
      const at = op.index === -1 || op.index === undefined ? n : op.index;
      spot = `${op.path}/${at}`;
      shift = (i) => (i >= at ? i + 1 : i);
    } else if (op.op === "remove") {
      spot = parentOf(op.path);
      const k = lastIndex(op.path);
      shift = (i) => (i === k ? null : i > k ? i - 1 : i);
    } else if (op.op === "move") {
      const list = valueAt(copy, op.file, parentOf(op.path));
      const from = lastIndex(op.path);
      const to = op.to === -1 ? (Array.isArray(list) ? list.length - 1 : 0) : op.to;
      spot = `${parentOf(op.path)}/${to}`;
      shift = (i) => (i === from ? to : from < to && i > from && i <= to ? i - 1 : from > to && i >= to && i < from ? i + 1 : i);
    }
    if (shift) {
      const list = op.op === "insert" ? op.path : parentOf(op.path);
      for (let j = 0; j < spots.length; j++) {
        const s = spots[j];
        if (!s || tray[j].op.file !== op.file || !s.startsWith(`${list}/`)) continue;
        const rest = s.slice(list.length + 1);
        const cut = rest.indexOf("/");
        const i = shift(Number(cut < 0 ? rest : rest.slice(0, cut)));
        spots[j] = i === null ? null : `${list}/${i}${cut < 0 ? "" : rest.slice(cut)}`;
      }
    }
    try {
      applyOne(copy, op);
    } catch {
      /* a change that doesn't apply keeps the spot it named */
    }
    spots.push(spot);
  }
  return spots;
}

// The phone photos a value uses ("@photo:<ref>"), in order.
export function photoRefs(value) {
  const out = [];
  const visit = (v) => {
    if (typeof v === "string") {
      const m = PHOTO_REF.exec(v);
      if (m && !out.includes(m[1])) out.push(m[1]);
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (isObj(v)) Object.values(v).forEach(visit);
  };
  visit(value);
  return out;
}

// The operations as sent: each phone photo renumbered "@photo:1", "@photo:2"…
// in the order first used. Returns { ops, refs } where refs[n - 1] is photo n.
export function numberPhotos(ops) {
  const refs = [];
  const swap = (v) => {
    if (typeof v === "string") {
      const m = PHOTO_REF.exec(v);
      if (!m) return v;
      if (!refs.includes(m[1])) refs.push(m[1]);
      return `@photo:${refs.indexOf(m[1]) + 1}`;
    }
    if (Array.isArray(v)) return v.map(swap);
    if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]));
    return v;
  };
  return { ops: ops.map((op) => (op.value === undefined ? { ...op } : { ...op, value: swap(op.value) })), refs };
}

// The label the server's checks give a spot ("FAQ → Questions → item 4 → Answer"),
// so a refused value can be matched back to the change that made it.
export function checkLabel(schema, file, path) {
  const def = schema.files[file];
  if (!def) return file;
  const trail = [def.label];
  let fields = def.fields;
  let list = false;
  for (const seg of segmentsOf(path) || []) {
    if (list && INDEX.test(seg)) {
      trail.push(`item ${Number(seg) + 1}`);
      list = false;
      continue;
    }
    const f = (fields || []).find((x) => x.name === seg);
    if (!f) break;
    trail.push(f.label);
    fields = f.fields;
    list = f.type === "list";
  }
  return trail.join(" → ");
}

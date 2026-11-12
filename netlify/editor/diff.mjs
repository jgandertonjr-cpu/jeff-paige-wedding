// Compares two copies of the site content, describes the difference in plain
// English, and works out how to undo an earlier edit. Pure: no file, network
// or environment access, and inputs are never mutated.

import { applyOps, toPointer } from "./ops.mjs";

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const INDEX = /^(0|[1-9]\d*)$/;
const isBlank = (v) => v === undefined || v === null || v === "";

// Key-order-independent text form, used to compare values by content.
function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  return v === undefined ? "undefined" : JSON.stringify(v);
}
const same = (a, b) => canon(a) === canon(b);

const NAME_KEYS = ["question", "title", "name", "label", "caption", "alt"];
function itemName(item, index) {
  if (typeof item === "string" && item !== "") return item;
  if (isObj(item)) {
    for (const k of NAME_KEYS) if (typeof item[k] === "string" && item[k] !== "") return item[k];
  }
  return `item ${index + 1}`;
}

// ---- diff ------------------------------------------------------------------

// `within` lists, outermost first, each list item a change sits inside:
// { at: segment number, before: item before the edit, after: item as the edit
// left it, listBefore: the list before the edit }. Undo uses it to find the
// item again if a later edit moved it.
function diffList(file, segs, names, before, after, out, within) {
  const path = toPointer(segs);
  const extra = within.length ? { within } : {};

  // One object edited in place (some fields differ, some do not).
  if (before.length === after.length) {
    const diffs = [];
    before.forEach((b, i) => { if (!same(b, after[i])) diffs.push(i); });
    if (diffs.length === 1) {
      const i = diffs[0];
      const b = before[i], a = after[i];
      if (isObj(b) && isObj(a) && Object.keys({ ...b, ...a }).some((k) => same(b[k], a[k]))) {
        diffValue(file, [...segs, String(i)], [...names, itemName(a, i)], b, a, out,
          [...within, { at: segs.length, before: b, after: a, listBefore: before }]);
        return;
      }
    }
  }

  // Same items, different order.
  if (before.length === after.length && [...before.map(canon)].sort().join("\n") === [...after.map(canon)].sort().join("\n")) {
    out.push({ file, path, kind: "moved", before, after, names, listBefore: before, listAfter: after, ...extra });
    return;
  }

  // Cancel out items present on both sides, then report what is left.
  const unmatched = after.map((a, i) => ({ a, i, used: false }));
  const removed = [];
  before.forEach((b, i) => {
    const hit = unmatched.find((u) => !u.used && same(u.a, b));
    if (hit) hit.used = true;
    else removed.push({ b, i });
  });
  for (const { b, i } of removed) out.push({ file, path, kind: "removed", before: b, after: undefined, index: i, names, listBefore: before, listAfter: after, ...extra });
  for (const u of unmatched) if (!u.used) out.push({ file, path, kind: "added", before: undefined, after: u.a, index: u.i, names, listBefore: before, listAfter: after, ...extra });
}

function diffValue(file, segs, names, before, after, out, within = []) {
  if (same(before, after)) return;
  if (isObj(before) && isObj(after)) {
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      diffValue(file, [...segs, k], names, before[k], after[k], out, within);
    }
  } else if (Array.isArray(before) && Array.isArray(after)) {
    diffList(file, segs, names, before, after, out, within);
  } else {
    const inItem = within.length
      ? { within, itemBefore: within[within.length - 1].before, itemAfter: within[within.length - 1].after }
      : {};
    out.push({ file, path: toPointer(segs), kind: "changed", before, after, names, ...inItem });
  }
}

export function diffContent(before, after) {
  const out = [];
  for (const file of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    diffValue(file, [], [], before?.[file], after?.[file], out);
  }
  return out;
}

// ---- summary ---------------------------------------------------------------

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// A summary line is always one line: every run of spaces, tabs or line breaks becomes one space.
const oneLine = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ") : s);
const clip = (s) => {
  const line = oneLine(s);
  return line.length > 80 ? `${line.slice(0, 80)}…` : line;
};

function formatDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return s;
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

function formatValue(v, field, role) {
  if (isBlank(v)) return "(empty)";
  const type = field?.type;
  if (type === "image") return role === "before" ? "current photo" : "new photo";
  if (type === "hidden") return clip(String(v));
  if (typeof v === "boolean") return v ? "On" : "Off";
  if (Array.isArray(v)) return clip(v.map(String).join(", "));
  if (isObj(v)) return "(updated)";
  if (type === "date" && typeof v === "string") return formatDate(v);
  return clip(String(v));
}

// When long text changes only past the cut, both cut versions would read the
// same. Then show each around the first difference instead: up to 30
// characters before it and 40 after, trimmed to whole words, with "…" where cut.
const WINDOW_BEFORE = 30;
const WINDOW_AFTER = 40;
function aroundChange(before, after) {
  if (typeof before !== "string" || typeof after !== "string") return null;
  if (before.length <= 80 && after.length <= 80) return null;
  let d = 0;
  while (d < before.length && d < after.length && before[d] === after[d]) d++;
  if (d < 80) return null;
  const win = (s) => {
    let start = Math.max(0, d - WINDOW_BEFORE);
    if (start > 0) {
      const sp = s.indexOf(" ", start);
      if (sp !== -1 && sp < d) start = sp + 1;
    }
    let end = Math.min(s.length, d + WINDOW_AFTER);
    if (end < s.length) {
      const sp = s.lastIndexOf(" ", end);
      if (sp > d) end = sp;
    }
    return `${start > 0 ? "…" : ""}${s.slice(start, end)}${end < s.length ? "…" : ""}`;
  };
  return [win(before), win(after)];
}

// Labels for each step of a path, plus the field the path ends on.
function describe(schema, change) {
  const file = schema.files?.[change.file];
  const trail = [file ? file.label : change.file];
  let fields = file?.fields;
  let field = null;
  let nameAt = 0;
  let afterList = false;
  for (const seg of change.path.split("/").slice(1).map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"))) {
    if (field?.type === "list" && !afterList && INDEX.test(seg)) {
      const name = change.names?.[nameAt++];
      trail.push(name ? `“${clip(name)}”` : `item ${Number(seg) + 1}`);
      fields = field.fields;
      afterList = true;
      continue;
    }
    const found = fields?.find((f) => f.name === seg);
    trail.push(found ? found.label : seg);
    field = found || null;
    fields = found?.fields;
    afterList = false;
  }
  return { trail, field };
}

export function summarize(changes, schema) {
  return changes.map((c) => {
    const { trail, field } = describe(schema, c);
    const head = trail.join(" → ");
    const check = c.file === "guests" || (c.file === "rsvp" && c.path === "/rsvp_open") ? "Please check: " : "";
    if (c.kind === "moved") return `${check}${head}: reordered`;
    if (c.kind === "added") return `${check}${head}: added “${clip(itemName(c.after, c.index))}”`;
    if (c.kind === "removed") return `${check}${head}: removed “${clip(itemName(c.before, c.index))}”`;
    const plainText = !["image", "hidden", "date"].includes(field?.type);
    // Different text that reads the same on one line differs only in its breaks.
    if (plainText && typeof c.before === "string" && typeof c.after === "string"
      && c.before !== c.after && oneLine(c.before) === oneLine(c.after)) {
      return `${check}${head}: paragraph breaks changed`;
    }
    const around = plainText ? aroundChange(oneLine(c.before), oneLine(c.after)) : null;
    if (around) return `${check}${head}: ${around[0]} → ${around[1]}`;
    return `${check}${head}: ${formatValue(c.before, field, "before")} → ${formatValue(c.after, field, "after")}`;
  });
}

// ---- undo ------------------------------------------------------------------

function valueAt(content, file, path) {
  let node = content?.[file];
  for (const seg of path.split("/").slice(1).map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"))) {
    if (Array.isArray(node) && INDEX.test(seg)) node = node[Number(seg)];
    else if (isObj(node) && Object.hasOwn(node, seg)) node = node[seg];
    else return undefined;
  }
  return node;
}

const countOf = (list, item) => list.filter((x) => same(x, item)).length;
// The list holds more copies of `item` than it did before the edit, so at least
// one of them is the edit's own.
const extraCopy = (list, item, listBefore) => countOf(list, item) > countOf(listBefore, item);

// Which item of `list` a change recorded at `index` inside item `w.after` is
// in now, or -1. First the item exactly as the edit left it: at its old spot,
// else the one such item, as long as it is not a copy that was already there
// before the edit. Failing that, the item at the old spot when it is the only
// item that differs from how the edit left the list (same length, every other
// item unchanged): another of its fields changed since. Whether the undone
// field itself still holds the edit's value is checked by the caller.
function findItem(list, w, index) {
  if (!Array.isArray(list)) return -1;
  if (extraCopy(list, w.after, w.listBefore)) {
    if (same(list[index], w.after)) return index;
    const hits = list.flatMap((x, j) => (same(x, w.after) ? [j] : []));
    if (hits.length === 1) return hits[0];
  }
  const listAfter = w.listBefore.map((x, j) => (j === index ? w.after : x));
  const onlyThisOne = index < list.length && list.length === listAfter.length
    && list.every((x, j) => j === index || same(x, listAfter[j]));
  return onlyThisOne ? index : -1;
}

// Where a change made inside list items points now: each list item on the way
// is found again with findItem. Null when an item is gone or cannot be told apart.
function resolvePath(content, c) {
  if (!c.within?.length) return c.path;
  const segs = c.path.split("/").slice(1);
  const levels = new Map(c.within.map((w) => [w.at, w]));
  let node = content?.[c.file];
  for (let k = 0; k < segs.length; k++) {
    const w = levels.get(k);
    if (w) {
      const i = findItem(node, w, Number(segs[k]));
      if (i < 0) return null;
      segs[k] = String(i);
      node = node[i];
      continue;
    }
    const seg = segs[k].replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(node) && INDEX.test(seg)) node = node[Number(seg)];
    else if (isObj(node) && Object.hasOwn(node, seg)) node = node[seg];
    else node = undefined;
  }
  return `/${segs.join("/")}`;
}

// Where `item` sits in `list`: its old spot if it is still there, else its first copy.
const spotOf = (list, item, index) => (same(list[index], item) ? index : list.findIndex((x) => same(x, item)));

// Ops that turn `list` into `target` exactly (order included).
function reorderOps(file, path, list, target) {
  const ops = [];
  const w = structuredClone(list);
  const want = new Map();
  for (const t of target) want.set(canon(t), (want.get(canon(t)) || 0) + 1);
  for (let i = w.length - 1; i >= 0; i--) {
    const k = canon(w[i]);
    if (want.get(k) > 0) want.set(k, want.get(k) - 1);
    else { ops.push({ op: "remove", file, path: `${path}/${i}` }); w.splice(i, 1); }
  }
  target.forEach((t, i) => {
    if (i < w.length && same(w[i], t)) return;
    const from = w.findIndex((x, j) => j > i && same(x, t));
    if (from > i) { ops.push({ op: "move", file, path: `${path}/${from}`, to: i }); w.splice(i, 0, ...w.splice(from, 1)); }
    else { ops.push({ op: "insert", file, path, index: i, value: t }); w.splice(i, 0, structuredClone(t)); }
  });
  return ops;
}

// Ops that put back each piece of an earlier edit that still has the value that
// edit gave it. Each step is tried against a running copy, so the returned ops
// always apply cleanly in order; anything that cannot be put back is skipped.
export function invertChanges(changes, current) {
  const ops = [];
  const skipped = [];
  let working = structuredClone(current);
  const tryOps = (attempt) => {
    try { working = applyOps(working, attempt); ops.push(...attempt); return true; } catch { return false; }
  };
  const done = new Set();

  // List items are found again in the content as it was before this undo
  // started: putting back one field of an item must not hide the item from
  // the next field's lookup, and no undo step moves an item another step needs.
  for (const c of changes) {
    if (c.kind === "changed") {
      const path = resolvePath(current, c);
      const now = path === null ? undefined : valueAt(working, c.file, path);
      let attempt = [];
      if (path !== null && same(now, c.after)) {
        if (c.before === undefined) attempt = [{ op: "unset", file: c.file, path }];
        else attempt = [{ op: "set", file: c.file, path, value: c.before }];
      }
      if (!attempt.length || !tryOps(attempt)) skipped.push(c);
      continue;
    }

    const key = `${c.file}\u0000${c.path}`;
    if (done.has(key)) continue;
    done.add(key);
    const group = changes.filter((x) => x.kind !== "changed" && x.file === c.file && x.path === c.path);
    const path = resolvePath(current, c);
    const list = path === null ? undefined : valueAt(working, c.file, path);
    if (!Array.isArray(list)) { skipped.push(...group); continue; }
    const listNow = () => valueAt(working, c.file, path);

    // Nothing has touched this list since the edit: put it back exactly.
    if (same(list, c.listAfter)) {
      if (tryOps(reorderOps(c.file, path, list, c.listBefore))) continue;
      skipped.push(...group);
      continue;
    }

    // The list changed again: undo only the pieces that are still plainly there.
    // A removed item and the item added at the same spot are one replacement,
    // put back together or not at all.
    const adds = group.filter((x) => x.kind === "added");
    const removes = group.filter((x) => x.kind === "removed").sort((x, y) => x.index - y.index);
    const pairs = [];
    for (const r of removes) {
      const a = adds.find((x) => x.index === r.index && !pairs.some(([, pa]) => pa === x));
      if (a) pairs.push([r, a]);
    }
    const paired = new Set(pairs.flat());

    for (const [r, a] of pairs.sort((x, y) => x[1].index - y[1].index)) {
      const cur = listNow();
      const ok = extraCopy(cur, a.after, a.listBefore) && countOf(cur, r.before) < countOf(r.listBefore, r.before);
      const at = ok ? spotOf(cur, a.after, a.index) : -1;
      if (at < 0 || !tryOps([
        { op: "remove", file: c.file, path: `${path}/${at}` },
        { op: "insert", file: c.file, path, index: at, value: r.before },
      ])) skipped.push(r, a);
    }
    for (const a of adds.filter((x) => !paired.has(x))) {
      const cur = listNow();
      const at = extraCopy(cur, a.after, a.listBefore) ? spotOf(cur, a.after, a.index) : -1;
      if (at < 0 || !tryOps([{ op: "remove", file: c.file, path: `${path}/${at}` }])) skipped.push(a);
    }
    for (const r of removes.filter((x) => !paired.has(x))) {
      const cur = listNow();
      if (countOf(cur, r.before) >= countOf(r.listBefore, r.before)
        || !tryOps([{ op: "insert", file: c.file, path, index: Math.min(r.index, cur.length), value: r.before }])) skipped.push(r);
    }
    skipped.push(...group.filter((x) => x.kind === "moved"));
  }
  return { ops, skipped };
}

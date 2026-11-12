// Applies path-based edit operations to an in-memory copy of the site content.
// Pure: no file, network or environment access, and inputs are never mutated.

export class OpError extends Error {
  constructor(message, op) {
    super(message);
    this.name = "OpError";
    this.op = op;
  }
}

const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isContainer = (v) => v !== null && typeof v === "object";
const INDEX = /^(0|[1-9]\d*)$/;

const escapeSegment = (s) => String(s).replace(/~/g, "~0").replace(/\//g, "~1");
export const toPointer = (segments) => segments.map((s) => "/" + escapeSegment(s)).join("");

// "/a/0/b" -> ["a", "0", "b"]. Throws OpError for anything unsafe or malformed.
export function parsePointer(path, op) {
  if (typeof path !== "string" || !path.startsWith("/") || path === "/") {
    throw new OpError("That change does not say which part of the site to change.", op);
  }
  const segments = path.slice(1).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  for (const s of segments) {
    if (UNSAFE.has(s)) throw new OpError("That change points at a part of the site that is not allowed to be changed.", op);
  }
  return segments;
}

const where = (op) => `${op.file}${op.path || ""}`;
const missing = (op) => new OpError(`There is nothing on the site at “${where(op)}”, so that change could not be made.`, op);

// Walks down through containers. Array steps must be existing list positions.
function walk(root, segments, op) {
  let node = root;
  for (const seg of segments) {
    if (Array.isArray(node)) {
      if (!INDEX.test(seg)) throw new OpError(`The position “${seg}” is not a valid spot in a list.`, op);
      if (Number(seg) >= node.length) throw missing(op);
      node = node[Number(seg)];
    } else if (isObj(node)) {
      if (!Object.hasOwn(node, seg)) throw missing(op);
      node = node[seg];
    } else {
      throw missing(op);
    }
  }
  return node;
}

function listIndex(seg, op) {
  if (!INDEX.test(seg)) throw new OpError(`The position “${seg}” is not a valid spot in a list.`, op);
  return Number(seg);
}

function applyOne(content, op) {
  if (!op || typeof op !== "object" || !["set", "insert", "remove", "move"].includes(op.op)) {
    throw new OpError("That change is not one the editor knows how to make.", op);
  }
  if (typeof op.file !== "string" || !Object.hasOwn(content, op.file)) {
    throw new OpError(`The section called “${op && op.file}” is not something the editor can change.`, op);
  }
  const segments = parsePointer(op.path, op);

  if (op.op === "set") {
    if (!("value" in op) || op.value === undefined) throw new OpError("That change is missing the new value.", op);
    const parent = walk(content[op.file], segments.slice(0, -1), op);
    const last = segments[segments.length - 1];
    if (Array.isArray(parent)) {
      const i = listIndex(last, op);
      if (i >= parent.length) throw missing(op);
      parent[i] = op.value;
    } else if (isObj(parent)) {
      parent[last] = op.value;
    } else {
      throw missing(op);
    }
    return;
  }

  if (op.op === "insert") {
    if (!("value" in op) || op.value === undefined) throw new OpError("That change is missing the new value.", op);
    const list = walk(content[op.file], segments, op);
    if (!Array.isArray(list)) throw new OpError(`The place “${where(op)}” is not a list, so nothing can be added to it.`, op);
    const at = op.index === -1 || op.index === undefined ? list.length : op.index;
    if (!Number.isInteger(at) || at < 0 || at > list.length) {
      throw new OpError(`There is no spot ${op.index} in the list at “${where(op)}”.`, op);
    }
    list.splice(at, 0, op.value);
    return;
  }

  // remove / move: path is a list item
  const list = walk(content[op.file], segments.slice(0, -1), op);
  if (!Array.isArray(list)) throw new OpError(`The place “${where(op)}” is not an item in a list.`, op);
  const from = listIndex(segments[segments.length - 1], op);
  if (from >= list.length) throw missing(op);
  if (op.op === "remove") {
    list.splice(from, 1);
    return;
  }
  const to = op.to === -1 ? list.length - 1 : op.to;
  if (!Number.isInteger(to) || to < 0 || to >= list.length) {
    throw new OpError(`There is no spot ${op.to} in the list at “${op.file}${toPointer(segments.slice(0, -1))}”.`, op);
  }
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
}

export function applyOps(content, ops) {
  const copy = structuredClone(content);
  for (const op of ops) applyOne(copy, op);
  return copy;
}

// files: { [path]: text }; edit: { path, find, replace }. `find` must occur exactly once.
export function applyFileEdits(files, edits) {
  const out = { ...files };
  for (const edit of edits) {
    if (!edit || typeof edit.path !== "string" || !Object.hasOwn(out, edit.path)) {
      throw new OpError(`The page “${edit && edit.path}” is not something the editor can change.`, edit);
    }
    const text = out[edit.path];
    const find = edit.find;
    if (typeof find !== "string" || find === "") throw new OpError("That change does not say which text to replace.", edit);
    const first = text.indexOf(find);
    if (first === -1) throw new OpError(`The text to replace could not be found on “${edit.path}”.`, edit);
    if (text.indexOf(find, first + find.length) !== -1) {
      throw new OpError(`The text to replace appears more than once on “${edit.path}”, so it is not clear which one to change.`, edit);
    }
    out[edit.path] = text.slice(0, first) + String(edit.replace ?? "") + text.slice(first + find.length);
  }
  return out;
}

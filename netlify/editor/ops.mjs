// Applies path-based edit operations to an in-memory copy of the site content.
// Pure: no file, network or environment access, and inputs are never mutated.
//
// "unset" (remove a key from an object) is internal: undo emits it
// (diff.mjs invertChanges) to put back the absence of a field an edit added.
// The page cannot send it; the service accepts only set, insert, remove and move.

export class OpError extends Error {
  constructor(message, op) {
    super(message);
    this.name = "OpError";
    this.op = op;
  }
}

const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const INDEX = /^(0|[1-9]\d*)$/;

const escapeSegment = (s) => String(s).replace(/~/g, "~0").replace(/\//g, "~1");
export const toPointer = (segments) => segments.map((s) => "/" + escapeSegment(s)).join("");

// Error text names the step by position only; it never repeats text from the op itself.
const stepError = (step, what, op) => new OpError(`Step ${step} ${what}.`, op);
const NOT_FOUND = "points at something that is not on the site";
const BAD_SPOT = "uses a spot in a list that does not exist";

// "/a/0/b" -> ["a", "0", "b"]. Throws OpError for anything unsafe or malformed.
export function parsePointer(path, op, step = 1) {
  if (typeof path !== "string" || !path.startsWith("/") || path === "/") {
    throw stepError(step, "does not say which part of the site to change", op);
  }
  const segments = path.slice(1).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  if (segments.some((s) => UNSAFE.has(s))) throw stepError(step, "points at a part of the site that is not allowed to be changed", op);
  return segments;
}

// Walks down through containers. Array steps must be existing list positions.
function walk(root, segments, op, step) {
  let node = root;
  for (const seg of segments) {
    if (Array.isArray(node)) {
      if (!INDEX.test(seg)) throw stepError(step, "uses something that is not a valid spot in a list", op);
      if (Number(seg) >= node.length) throw stepError(step, NOT_FOUND, op);
      node = node[Number(seg)];
    } else if (isObj(node)) {
      if (!Object.hasOwn(node, seg)) throw stepError(step, NOT_FOUND, op);
      node = node[seg];
    } else {
      throw stepError(step, NOT_FOUND, op);
    }
  }
  return node;
}

function listIndex(seg, op, step) {
  if (!INDEX.test(seg)) throw stepError(step, "uses something that is not a valid spot in a list", op);
  return Number(seg);
}

function applyOne(content, op, step) {
  if (!op || typeof op !== "object" || !["set", "insert", "remove", "move", "unset"].includes(op.op)) {
    throw stepError(step, "is not a kind of change the editor knows how to make", op);
  }
  if (typeof op.file !== "string" || !Object.hasOwn(content, op.file)) {
    throw stepError(step, "names a section the editor cannot change", op);
  }
  const segments = parsePointer(op.path, op, step);
  const last = segments[segments.length - 1];

  if (op.op === "set" || op.op === "unset") {
    if (op.op === "set" && op.value === undefined) throw stepError(step, "is missing the new value", op);
    const parent = walk(content[op.file], segments.slice(0, -1), op, step);
    if (Array.isArray(parent)) {
      if (op.op === "unset") throw stepError(step, "tries to clear an item in a list, which is not allowed", op);
      const i = listIndex(last, op, step);
      if (i >= parent.length) throw stepError(step, NOT_FOUND, op);
      parent[i] = structuredClone(op.value);
    } else if (isObj(parent)) {
      if (op.op === "unset") {
        if (!Object.hasOwn(parent, last)) throw stepError(step, NOT_FOUND, op);
        delete parent[last];
      } else {
        parent[last] = structuredClone(op.value);
      }
    } else {
      throw stepError(step, NOT_FOUND, op);
    }
    return;
  }

  if (op.op === "insert") {
    if (op.value === undefined) throw stepError(step, "is missing the new value", op);
    const list = walk(content[op.file], segments, op, step);
    if (!Array.isArray(list)) throw stepError(step, "tries to add to something that is not a list", op);
    const at = op.index === -1 || op.index === undefined ? list.length : op.index;
    if (!Number.isInteger(at) || at < 0 || at > list.length) throw stepError(step, BAD_SPOT, op);
    list.splice(at, 0, structuredClone(op.value));
    return;
  }

  // remove / move: path is a list item
  const list = walk(content[op.file], segments.slice(0, -1), op, step);
  if (!Array.isArray(list)) throw stepError(step, "points at something that is not an item in a list", op);
  const from = listIndex(last, op, step);
  if (from >= list.length) throw stepError(step, NOT_FOUND, op);
  if (op.op === "remove") {
    list.splice(from, 1);
    return;
  }
  const to = op.to === -1 ? list.length - 1 : op.to;
  if (!Number.isInteger(to) || to < 0 || to >= list.length) throw stepError(step, BAD_SPOT, op);
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
}

export function applyOps(content, ops) {
  const copy = structuredClone(content);
  ops.forEach((op, i) => applyOne(copy, op, i + 1));
  return copy;
}

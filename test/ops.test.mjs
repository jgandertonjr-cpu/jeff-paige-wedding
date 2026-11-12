import { test } from "node:test";
import assert from "node:assert/strict";
import { applyOps, applyFileEdits, OpError } from "../netlify/editor/ops.mjs";

const BANNED = /\b(commit|deploy|json|branch|repository|merge|build|token|wcag)\b/i;
const base = () => ({
  travel: { room_block: { title: "Block", deadline: "" }, tips: ["a", "b", "c"] },
  faq: { questions: [{ question: "Q1", answer: "A1" }, { question: "Q2", answer: "A2" }] },
});

function throwsOp(content, ops) {
  assert.throws(() => applyOps(content, ops), (e) => {
    assert.ok(e instanceof OpError, "is an OpError");
    assert.ok(e.op, "carries the op");
    assert.match(e.message, /^[A-Z].*\.$/);
    assert.doesNotMatch(e.message, BANNED);
    return true;
  });
}

test("set a nested field, and create a missing final key", () => {
  const out = applyOps(base(), [
    { op: "set", file: "travel", path: "/room_block/title", value: "New" },
    { op: "set", file: "travel", path: "/room_block/booking_url", value: "x" },
    { op: "set", file: "faq", path: "/questions/1/answer", value: "Z" },
  ]);
  assert.equal(out.travel.room_block.title, "New");
  assert.equal(out.travel.room_block.booking_url, "x");
  assert.equal(out.faq.questions[1].answer, "Z");
});

test("insert at 0, middle and -1", () => {
  const out = applyOps(base(), [
    { op: "insert", file: "travel", path: "/tips", index: 0, value: "first" },
    { op: "insert", file: "travel", path: "/tips", index: 2, value: "mid" },
    { op: "insert", file: "travel", path: "/tips", index: -1, value: "last" },
  ]);
  assert.deepEqual(out.travel.tips, ["first", "a", "mid", "b", "c", "last"]);
});

test("remove and move", () => {
  const out = applyOps(base(), [
    { op: "remove", file: "travel", path: "/tips/1" },
    { op: "move", file: "travel", path: "/tips/1", to: 0 },
  ]);
  assert.deepEqual(out.travel.tips, ["c", "a"]);
});

test("bad operations throw a plain OpError", () => {
  throwsOp(base(), [{ op: "set", file: "travel", path: "/nope/deep", value: 1 }]);
  throwsOp(base(), [{ op: "set", file: "travel", path: "/tips/9", value: 1 }]);
  throwsOp(base(), [{ op: "set", file: "travel", path: "/tips/3", value: 1 }]);
  throwsOp(base(), [{ op: "set", file: "ghost", path: "/a", value: 1 }]);
  throwsOp(base(), [{ op: "insert", file: "travel", path: "/tips", index: 9, value: 1 }]);
  throwsOp(base(), [{ op: "insert", file: "travel", path: "/room_block", index: 0, value: 1 }]);
  throwsOp(base(), [{ op: "remove", file: "travel", path: "/tips/5" }]);
  throwsOp(base(), [{ op: "move", file: "travel", path: "/tips/0", to: 7 }]);
  throwsOp(base(), [{ op: "wiggle", file: "travel", path: "/tips/0" }]);
});

test("unsafe segments, bad indexes and non-containers are rejected", () => {
  for (const path of ["/__proto__/x", "/room_block/constructor", "/room_block/prototype/x", "/tips/-1", "/tips/1.5", "/tips/01", "/tips/x", "/room_block/title/deeper", "room_block"]) {
    throwsOp(base(), [{ op: "set", file: "travel", path, value: 1 }]);
  }
  assert.equal({}.polluted, undefined);
});

test("JSON Pointer escapes", () => {
  const out = applyOps({ site: { "a/b": { "c~d": "x" } } }, [{ op: "set", file: "site", path: "/a~1b/c~0d", value: "y" }]);
  assert.equal(out.site["a/b"]["c~d"], "y");
});

test("input is not mutated and result is a deep copy", () => {
  const input = base();
  const snapshot = structuredClone(input);
  const out = applyOps(input, [{ op: "set", file: "travel", path: "/room_block/title", value: "New" }]);
  assert.deepEqual(input, snapshot);
  out.faq.questions[0].question = "changed";
  assert.deepEqual(input, snapshot);
});

test("a failing batch leaves the input untouched", () => {
  const input = base();
  const snapshot = structuredClone(input);
  throwsOp(input, [
    { op: "set", file: "travel", path: "/room_block/title", value: "New" },
    { op: "remove", file: "travel", path: "/tips/9" },
  ]);
  assert.deepEqual(input, snapshot);
});

test("special text round-trips exactly", () => {
  const text = "We’re — here 🎉 & <b>so</b> glad";
  const out = applyOps(base(), [{ op: "set", file: "travel", path: "/room_block/title", value: text }]);
  assert.equal(out.travel.room_block.title, text);
});

test("applyFileEdits replaces exactly one match", () => {
  const files = { "src/a.html": "hello $& world", "src/b.html": "x" };
  const out = applyFileEdits(files, [{ path: "src/a.html", find: "hello", replace: "bye $1" }]);
  assert.equal(out["src/a.html"], "bye $1 $& world");
  assert.equal(files["src/a.html"], "hello $& world");
  assert.equal(out["src/b.html"], "x");
});

test("applyFileEdits throws unless find occurs exactly once", () => {
  const files = { "a.html": "one two two" };
  for (const find of ["three", "two", ""]) {
    assert.throws(() => applyFileEdits(files, [{ path: "a.html", find, replace: "x" }]), (e) => e instanceof OpError && !BANNED.test(e.message));
  }
  assert.throws(() => applyFileEdits(files, [{ path: "missing.html", find: "one", replace: "x" }]), OpError);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { applyOps, OpError } from "../netlify/editor/ops.mjs";

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

test("unset removes an existing key and refuses list items or missing parents", () => {
  const out = applyOps(base(), [{ op: "unset", file: "travel", path: "/room_block/deadline" }]);
  assert.equal(Object.hasOwn(out.travel.room_block, "deadline"), false);
  throwsOp(base(), [{ op: "unset", file: "travel", path: "/tips/0" }]);
  throwsOp(base(), [{ op: "unset", file: "travel", path: "/nope/x" }]);
  throwsOp(base(), [{ op: "unset", file: "travel", path: "/room_block/missing" }]);
});

test("values are copied in, not shared with the op", () => {
  const value = { question: "Q", answer: "A" };
  const out = applyOps(base(), [{ op: "insert", file: "faq", path: "/questions", index: 0, value }, { op: "set", file: "travel", path: "/room_block/extra", value }]);
  value.question = "changed";
  assert.equal(out.faq.questions[0].question, "Q");
  assert.equal(out.travel.room_block.extra.question, "Q");
});

test("error messages say which step failed and never echo the op's own text", () => {
  const evil = "zzz-evil-json-text";
  const ops = [
    { op: "set", file: "travel", path: "/room_block/title", value: "ok" },
    { op: "set", file: evil, path: "/a", value: 1 },
  ];
  for (const bad of [
    ops,
    [{ op: "set", file: "travel", path: `/${evil}/x`, value: 1 }],
    [{ op: "insert", file: "travel", path: "/tips", index: 99, value: 1 }],
    [{ op: "set", file: "travel", path: "/tips/" + evil, value: 1 }],
    [{ op: "move", file: "travel", path: "/tips/0", to: 77 }],
  ]) {
    try { applyOps(base(), bad); assert.fail("should throw"); } catch (e) {
      assert.ok(e instanceof OpError);
      assert.match(e.message, /^Step \d/);
      assert.doesNotMatch(e.message, new RegExp(`${evil}|99|77`));
    }
  }
  assert.throws(() => applyOps(base(), ops), /^OpError: Step 2 /);
});

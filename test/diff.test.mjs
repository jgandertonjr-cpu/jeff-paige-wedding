import { test } from "node:test";
import assert from "node:assert/strict";
import schema from "../netlify/editor/schema.gen.mjs";
import { diffContent, summarize, invertChanges } from "../netlify/editor/diff.mjs";
import { applyOps } from "../netlify/editor/ops.mjs";

const BANNED = /\b(commit|deploy|json|branch|repository|merge|build|token|wcag)\b/i;
const mk = () => ({
  travel: { section_order: ["room_block", "nearby", "airports", "tips"], room_block: { deadline: "", hotel_name: "H" } },
  rsvp: { rsvp_open: false },
  faq: { questions: [{ question: "Q1", answer: "A1" }, { question: "Q2", answer: "A2" }, { question: "Q3", answer: "A3" }] },
  guests: { guests: [{ id: "1", name: "Ann", party: [] }] },
  home: { hero: { photo: "/images/a.jpg", title: "T" } },
});
const edit = (fn) => { const c = mk(); fn(c); return c; };
const sum = (fn) => summarize(diffContent(mk(), edit(fn)), schema);

test("unchanged files produce no changes", () => {
  assert.deepEqual(diffContent(mk(), mk()), []);
});

test("date, boolean and prefix lines", () => {
  assert.deepEqual(sum((c) => { c.travel.room_block.deadline = "2028-06-01"; }), ["Travel & Hotels → Room block → Booking deadline: (empty) → June 1, 2028"]);
  const [line] = sum((c) => { c.rsvp.rsvp_open = true; });
  assert.match(line, /^Please check: .*: Off → On$/);
  const g = sum((c) => { c.guests.guests[0].name = "Anna"; });
  assert.equal(g.length, 1);
  assert.match(g[0], /^Please check: /);
});

test("long text is cut and images say new photo", () => {
  const long = "x".repeat(200);
  const [line] = sum((c) => { c.home.hero.title = long; });
  assert.ok(line.endsWith("→ " + "x".repeat(80) + "…"), line);
  const [img] = sum((c) => { c.home.hero.photo = "/images/b.jpg"; });
  assert.match(img, /new photo$/);
  assert.doesNotMatch(img, /b\.jpg/);
});

test("list item added, removed and reordered", () => {
  assert.deepEqual(sum((c) => { c.faq.questions.push({ question: "Where?", answer: "Here" }); }), ["FAQ → Questions: added “Where?”"]);
  assert.deepEqual(sum((c) => { c.faq.questions.splice(1, 1); }), ["FAQ → Questions: removed “Q2”"]);
  assert.deepEqual(sum((c) => { c.faq.questions.reverse(); }), ["FAQ → Questions: reordered"]);
  assert.deepEqual(sum((c) => { c.travel.section_order.reverse(); }), ["Travel & Hotels → Order of sections: reordered"]);
  assert.deepEqual(sum((c) => { c.travel.section_order.pop(); }), ["Travel & Hotels → Order of sections: removed “tips”"]);
});

test("one item edited in place reports its fields, not add and remove", () => {
  const changes = diffContent(mk(), edit((c) => { c.faq.questions[1].answer = "New"; }));
  assert.equal(changes.length, 1);
  assert.equal(changes[0].kind, "changed");
  assert.equal(changes[0].path, "/questions/1/answer");
  assert.deepEqual(summarize(changes, schema), ["FAQ → Questions → “Q2” → Answer: A2 → New"]);
});

test("an item with every field different is a remove plus an add", () => {
  const kinds = diffContent(mk(), edit((c) => { c.faq.questions[0] = { question: "Z", answer: "Y" }; })).map((c) => c.kind).sort();
  assert.deepEqual(kinds, ["added", "removed"]);
});

test("summary lines use no banned words", () => {
  const lines = sum((c) => { c.faq.questions.pop(); c.rsvp.rsvp_open = true; c.travel.room_block.hotel_name = "New"; });
  for (const l of lines) assert.doesNotMatch(l, BANNED);
});

// invert

const roundTrip = (parent, editC, current) => {
  const changes = diffContent(parent, editC);
  const inv = invertChanges(changes, current);
  const out = applyOps(current, inv.ops); // must not throw
  return { inv, out };
};

test("invert: a changed field still holding the edit's value is set back", () => {
  const parent = mk(); const e = edit((c) => { c.travel.room_block.hotel_name = "New"; });
  const { inv, out } = roundTrip(parent, e, e);
  assert.equal(inv.ops[0].op, "set");
  assert.deepEqual(inv.skipped, []);
  assert.deepEqual(out, parent);
});

test("invert: a field changed again is skipped and kept", () => {
  const parent = mk(); const e = edit((c) => { c.travel.room_block.hotel_name = "New"; });
  const current = structuredClone(e); current.travel.room_block.hotel_name = "Later";
  const { inv, out } = roundTrip(parent, e, current);
  assert.equal(inv.ops.length, 0);
  assert.equal(inv.skipped.length, 1);
  assert.equal(out.travel.room_block.hotel_name, "Later");
});

test("invert: an added item is removed by content even when its index moved", () => {
  const parent = mk(); const e = edit((c) => { c.faq.questions.push({ question: "New", answer: "N" }); });
  const current = structuredClone(e); current.faq.questions.unshift({ question: "Early", answer: "E" });
  const { inv, out } = roundTrip(parent, e, current);
  assert.deepEqual(out.faq.questions.map((q) => q.question), ["Early", "Q1", "Q2", "Q3"]);
  assert.deepEqual(inv.skipped, []);
});

test("invert: an added item that is gone is skipped", () => {
  const parent = mk(); const e = edit((c) => { c.faq.questions.push({ question: "New", answer: "N" }); });
  const { inv, out } = roundTrip(parent, e, parent);
  assert.equal(inv.skipped.length, 1);
  assert.deepEqual(out, parent);
});

test("invert: a removed item returns at its old index, clamped to the list length", () => {
  const parent = mk(); const e = edit((c) => { c.faq.questions.splice(1, 1); });
  let r = roundTrip(parent, e, e);
  assert.deepEqual(r.out.faq.questions, parent.faq.questions);
  const shorter = structuredClone(e); shorter.faq.questions = [shorter.faq.questions[0]];
  r = roundTrip(parent, e, shorter);
  assert.deepEqual(r.out.faq.questions.map((q) => q.question), ["Q1", "Q2"]);
  const last = edit((c) => { c.faq.questions.pop(); });
  const cur = structuredClone(last); cur.faq.questions = [];
  r = roundTrip(parent, last, cur);
  assert.deepEqual(r.out.faq.questions.map((q) => q.question), ["Q3"]);
});

test("invert: a moved list is restored only if its order is still the edit's", () => {
  const parent = mk(); const e = edit((c) => { c.faq.questions.reverse(); });
  let r = roundTrip(parent, e, e);
  assert.deepEqual(r.out.faq.questions, parent.faq.questions);
  assert.deepEqual(r.inv.skipped, []);
  const reordered = structuredClone(e); reordered.faq.questions.reverse();
  reordered.faq.questions.push(reordered.faq.questions.shift());
  r = roundTrip(parent, e, reordered);
  assert.equal(r.inv.skipped.length, 1);
  assert.deepEqual(r.out, reordered);
  const strings = edit((c) => { c.travel.section_order = ["tips", "airports", "nearby", "room_block"]; });
  r = roundTrip(parent, strings, strings);
  assert.deepEqual(r.out.travel.section_order, parent.travel.section_order);
});

test("invert: a mixed edit round-trips and an unrelated later change survives", () => {
  const parent = mk();
  const e = edit((c) => {
    c.faq.questions.splice(0, 1);
    c.faq.questions.push({ question: "New", answer: "N" });
    c.travel.room_block.deadline = "2028-06-01";
    c.rsvp.rsvp_open = true;
  });
  const current = structuredClone(e); current.home.hero.title = "Later";
  const { inv, out } = roundTrip(parent, e, current);
  assert.deepEqual(inv.skipped, []);
  assert.equal(out.home.hero.title, "Later");
  assert.deepEqual(out.faq.questions.map((q) => q.question).sort(), ["Q1", "Q2", "Q3"]);
  assert.equal(out.travel.room_block.deadline, "");
  assert.equal(out.rsvp.rsvp_open, false);
});

test("invert: a missing parent is skipped, never thrown", () => {
  const parent = mk(); const e = edit((c) => { c.travel.room_block.deadline = "2028-06-01"; });
  const current = structuredClone(e); delete current.travel.room_block;
  const { inv } = roundTrip(parent, e, current);
  assert.equal(inv.ops.length, 0);
  assert.equal(inv.skipped.length, 1);
});

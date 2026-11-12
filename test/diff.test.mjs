import { test } from "node:test";
import assert from "node:assert/strict";
import schema from "../netlify/editor/schema.gen.mjs";
import { diffContent, summarize, invertChanges } from "../netlify/editor/diff.mjs";
import { applyOps } from "../netlify/editor/ops.mjs";
import { isDeepStrictEqual } from "node:util";

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

// fix round 1

const L = (s) => s.split("");
const listContent = (letters) => ({ travel: { section_order: L(letters) } });
const undo = (before, edited, current = edited) => {
  const parent = listContent(before), e = listContent(edited), cur = listContent(current);
  const inv = invertChanges(diffContent(parent, e), cur);
  return { inv, out: applyOps(cur, inv.ops).travel.section_order.join("") };
};

test("invert: exact order after mixed adds, removes and reorders", () => {
  for (const [b, e] of [["ABCD", "XBD"], ["ABCD", "DCXA"], ["ABCD", "BADC"], ["ABCD", "XYZ"], ["ABCD", ""], ["", "AB"], ["ABAB", "BA"]]) {
    const { inv, out } = undo(b, e);
    assert.equal(out, b, `${b} -> ${e}`);
    assert.deepEqual(inv.skipped, []);
  }
});

test("invert: undoing a removal twice does not duplicate the item", () => {
  const parent = listContent("ABCD"), e = listContent("ACD");
  const changes = diffContent(parent, e);
  const first = applyOps(e, invertChanges(changes, e).ops);
  assert.equal(first.travel.section_order.join(""), "ABCD");
  const second = invertChanges(changes, first);
  assert.equal(second.ops.length, 0);
  assert.equal(second.skipped.length, 1);
});

test("invert: later additions by someone else are kept", () => {
  const { inv, out } = undo("ABC", "ABCX", "YABCX");
  assert.equal(out, "YABC");
  assert.deepEqual(inv.skipped, []);
});

test("invert: removal undone once while a later reorder is kept", () => {
  const { out } = undo("ABCD", "ACD", "DCA");
  assert.equal(out.split("").sort().join(""), "ABCD");
  assert.equal(out.replace("B", ""), "DCA");
});

test("invert: a moved-only change is skipped once the list changed again", () => {
  const { inv, out } = undo("ABC", "CBA", "CBAD");
  assert.equal(inv.skipped.length, 1);
  assert.equal(out, "CBAD");
});

test("summary names the parent item for nested list changes", () => {
  const before = { guests: { guests: [{ id: "2", name: "Avery Mullen", party: [{ name: "Colton Ellis" }] }] } };
  const after = structuredClone(before);
  after.guests.guests[0].party.push({ name: "Plus One" });
  const [line] = summarize(diffContent(before, after), schema);
  assert.match(line, /Avery Mullen/);
  assert.match(line, /added “Plus One”/);
});

test("invert: a field the edit added is removed, restoring absence", () => {
  const before = { gallery: { items: [{ image: "/images/a.jpg" }] } };
  const after = structuredClone(before);
  after.gallery.items[0].caption = "Hi";
  const changes = diffContent(before, after);
  const inv = invertChanges(changes, after);
  assert.equal(inv.ops[0].op, "unset");
  assert.deepEqual(applyOps(after, inv.ops), before);
});

// Task 18 B: undo never changes, drops or duplicates something the undone edit did not touch.

const qa = (list) => ({ faq: { questions: list } });
const undoQa = (before, edited, current) => {
  const changes = diffContent(qa(before), qa(edited));
  const inv = invertChanges(changes, qa(current));
  return { changes, inv, out: applyOps(qa(current), inv.ops).faq.questions };
};

test("invert B1: a field change inside a list item follows the item after a later reorder", () => {
  const A = (answer) => ({ name: "A", answer });
  const B = (answer) => ({ name: "B", answer });
  const { changes, inv, out } = undoQa([A("old"), B("new")], [A("new"), B("new")], [B("new"), A("new")]);
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0].itemBefore, A("old"));
  assert.deepEqual(changes[0].itemAfter, A("new"));
  assert.deepEqual(out, [B("new"), A("old")]);
  assert.deepEqual(inv.skipped, []);
});

test("invert B1: a field change is skipped when its item cannot be told apart or is gone", () => {
  const A = (answer, extra) => ({ name: "A", answer, ...(extra ? { extra } : {}) });
  // The item was changed again later and the list was also reordered: skipped, nothing touched.
  let r = undoQa([A("old"), { name: "C", answer: "c" }], [A("new"), { name: "C", answer: "c" }], [{ name: "C", answer: "c" }, A("new", "x")]);
  assert.deepEqual(r.out, [{ name: "C", answer: "c" }, A("new", "x")]);
  assert.equal(r.inv.skipped.length, 1);
  // Two items now look like the edited one: no guessing.
  r = undoQa([A("old"), { name: "C", answer: "c" }], [A("new"), { name: "C", answer: "c" }], [{ name: "C", answer: "c" }, A("new"), A("new")]);
  assert.deepEqual(r.out, [{ name: "C", answer: "c" }, A("new"), A("new")]);
  assert.equal(r.inv.skipped.length, 1);
  // The only matching item was already there before the edit: not the edited one.
  r = undoQa([A("old"), A("new")], [A("new"), A("new")], [{ name: "Z", answer: "z" }, A("new")]);
  assert.deepEqual(r.out, [{ name: "Z", answer: "z" }, A("new")]);
  assert.equal(r.inv.skipped.length, 1);
});

test("invert B1: nested list items resolve at each level", () => {
  const guest = (name, plus) => ({ id: name, name, party: [{ name: "P", meal: plus }, { name: "Q", meal: "fish" }] });
  const before = { guests: { guests: [guest("Ann", "beef"), guest("Bo", "veg")] } };
  const edited = structuredClone(before); edited.guests.guests[0].party[0].meal = "veg";
  const changes = diffContent(before, edited);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].path, "/guests/0/party/0/meal");
  assert.equal(changes[0].within.length, 2);
  // Later: the guests were reversed, so Ann is now second.
  const current = structuredClone(edited);
  current.guests.guests.reverse();
  const inv = invertChanges(changes, current);
  const out = applyOps(current, inv.ops);
  assert.deepEqual(inv.skipped, []);
  const expected = structuredClone(current);
  expected.guests.guests[1].party[0].meal = "beef";
  assert.deepEqual(out, expected);
  // Ann's own entry changed again later (her party reordered): skipped, nothing touched.
  const changed = structuredClone(current);
  changed.guests.guests[1].party.reverse();
  const inv2 = invertChanges(changes, changed);
  assert.deepEqual(inv2.ops, []);
  assert.equal(inv2.skipped.length, 1);
});

test("invert CR3: undoing one field keeps a later change to another field of the same item", () => {
  const start = [{ question: "Q1", answer: "A1" }, { question: "Other", answer: "O" }];
  const edit1 = [{ question: "Q2", answer: "A1" }, { question: "Other", answer: "O" }];
  const edit2 = [{ question: "Q2", answer: "A2" }, { question: "Other", answer: "O" }];
  const r = undoQa(start, edit1, edit2);
  assert.deepEqual(r.inv.skipped, []);
  assert.deepEqual(r.out, [{ question: "Q1", answer: "A2" }, { question: "Other", answer: "O" }]);
});

test("invert CR3: with the item changed again, a reorder or a change to another item means skip, not guess", () => {
  const start = [{ question: "Q1", answer: "A1" }, { question: "Other", answer: "O" }];
  const edit1 = [{ question: "Q2", answer: "A1" }, { question: "Other", answer: "O" }];
  // Reordered as well.
  const moved = [{ question: "Other", answer: "O" }, { question: "Q2", answer: "A2" }];
  let r = undoQa(start, edit1, moved);
  assert.equal(r.inv.skipped.length, 1);
  assert.deepEqual(r.out, moved);
  // Another item changed as well.
  const other = [{ question: "Q2", answer: "A2" }, { question: "Other", answer: "O2" }];
  r = undoQa(start, edit1, other);
  assert.equal(r.inv.skipped.length, 1);
  assert.deepEqual(r.out, other);
  // An item added as well.
  const added = [{ question: "Q2", answer: "A2" }, { question: "Other", answer: "O" }, { question: "New", answer: "N" }];
  r = undoQa(start, edit1, added);
  assert.equal(r.inv.skipped.length, 1);
  assert.deepEqual(r.out, added);
  // The undone field itself changed again.
  const again = [{ question: "Q3", answer: "A2" }, { question: "Other", answer: "O" }];
  r = undoQa(start, edit1, again);
  assert.equal(r.inv.skipped.length, 1);
  assert.deepEqual(r.out, again);
});

test("invert B2: a replacement whose new item changed again is skipped as a whole", () => {
  const A = (answer) => ({ name: "A", answer });
  const B = (answer) => ({ name: "B", answer });
  const { inv, out } = undoQa([A("old"), B("old")], [A("new"), B("new")], [A("later"), B("new")]);
  assert.deepEqual(out, [A("later"), B("old")]);
  assert.equal(inv.skipped.length, 2);
  assert.deepEqual(inv.skipped.map((c) => c.kind).sort(), ["added", "removed"]);
  assert.ok(inv.skipped.some((c) => c.kind === "removed" && c.before.answer === "old" && c.before.name === "A"));
  assert.ok(inv.skipped.some((c) => c.kind === "added" && c.after.answer === "new" && c.after.name === "A"));
});

test("invert B3: an added copy of an item that was already there is removed only while extra", () => {
  const { inv, out } = undo("A", "AA", "AB");
  assert.equal(out, "AB");
  assert.equal(inv.skipped.length, 1);
  assert.equal(inv.skipped[0].kind, "added");
  // Still extra: removed.
  assert.equal(undo("A", "AA", "BAA").out, "BA");
});

// A small seeded property check of the undo contract.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test("invert: seeded property check (2,000 cases)", () => {
  const rand = rng(20261112);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const item = () => ({ name: pick(["A", "B", "C"]), answer: pick(["x", "y"]) });
  const randomEdit = (list) => {
    const l = structuredClone(list);
    const steps = 1 + Math.floor(rand() * 2);
    for (let s = 0; s < steps; s++) {
      const k = Math.floor(rand() * 4);
      if (k === 0 && l.length) { const i = Math.floor(rand() * l.length); l[i] = { ...l[i], answer: l[i].answer === "x" ? "y" : "x" }; }
      else if (k === 1) l.splice(Math.floor(rand() * (l.length + 1)), 0, item());
      else if (k === 2 && l.length) l.splice(Math.floor(rand() * l.length), 1);
      else if (l.length > 1) { const i = Math.floor(rand() * l.length), j = Math.floor(rand() * l.length); [l[i], l[j]] = [l[j], l[i]]; }
    }
    return l;
  };
  const key = (x) => `${x.name}${x.answer}`;
  const counts = (l) => l.reduce((m, x) => m.set(key(x), (m.get(key(x)) || 0) + 1), new Map());
  for (let n = 0; n < 2000; n++) {
    const before = Array.from({ length: Math.floor(rand() * 5) }, item);
    const edited = randomEdit(before);
    const changes = diffContent(qa(before), qa(edited));
    const immediate = applyOps(qa(edited), invertChanges(changes, qa(edited)).ops).faq.questions;
    assert.deepEqual(immediate, before, `case ${n}: immediate undo`);

    const current = randomEdit(edited);
    let out;
    assert.doesNotThrow(() => { out = applyOps(qa(current), invertChanges(changes, qa(current)).ops).faq.questions; }, `case ${n}`);
    const ctx0 = `case ${n}: ${JSON.stringify({ before, edited, current, out })}`;
    const field = changes.find((c) => c.kind === "changed");
    if (field) {
      // A field put back inside one item: at most one item differs. Either it
      // went from exactly the edit's version to exactly the version before the
      // edit, or (CR3) it is the item at the edit's spot, the only item that
      // differs from how the edit left the list, and only the undone field,
      // still holding the edit's value, went back.
      assert.equal(out.length, current.length, ctx0);
      const differs = out.flatMap((x, i) => (key(x) === key(current[i]) ? [] : [i]));
      assert.ok(differs.length <= 1, ctx0);
      const [, , at, prop] = field.path.split("/");
      for (const i of differs) {
        if (isDeepStrictEqual(current[i], field.itemAfter)) {
          assert.deepEqual(out[i], field.itemBefore, ctx0);
          continue;
        }
        assert.equal(i, Number(at), ctx0);
        assert.equal(current.length, edited.length, ctx0);
        current.forEach((x, j) => { if (j !== i) assert.deepEqual(x, edited[j], ctx0); });
        assert.equal(current[i][prop], field.after, ctx0);
        assert.deepEqual(out[i], { ...current[i], [prop]: field.before }, ctx0);
      }
      continue;
    }
    const [cb, ce, cc, co] = [before, edited, current, out].map(counts);
    for (const k of new Set([...cc.keys(), ...co.keys()])) {
      const d = (co.get(k) || 0) - (cc.get(k) || 0);
      const ctx = `case ${n} ${k}: ${JSON.stringify({ before, edited, current, out })}`;
      if (d > 0) {
        assert.ok((cb.get(k) || 0) > (ce.get(k) || 0), `${ctx} added an item the edit did not remove`);
        assert.ok((co.get(k) || 0) <= (cb.get(k) || 0), `${ctx} duplicated an item`);
      } else if (d < 0) {
        assert.ok((ce.get(k) || 0) > (cb.get(k) || 0), `${ctx} removed an item the edit did not add`);
        assert.ok((co.get(k) || 0) >= (cb.get(k) || 0), `${ctx} removed an item that was there before the edit`);
      }
    }
  }
});

// Fix round 2, O4: a small change inside long text shows where it is.
import { readFileSync } from "node:fs";
const homeData = JSON.parse(readFileSync(new URL("../src/_data/home.json", import.meta.url), "utf8"));
const welcomeLine = (fn) => {
  const after = structuredClone(homeData);
  after.welcome.text = fn(after.welcome.text);
  return summarize(diffContent({ home: homeData }, { home: after }), schema);
};

test("O4: a change deep inside long text shows a window around it", () => {
  const [line] = welcomeLine((t) => t.replace("wide-open dance floor", "dance floor"));
  assert.equal(line,
    "Home → Welcome section → Welcome message: …celebrate with good food, a wide-open dance floor, and the people… → …celebrate with good food, a dance floor, and the people who got us…");
});

test("O4: a change at the very end of long text shows the end, with no trailing cut mark", () => {
  const [line] = welcomeLine((t) => t.replace(/without you\.$/, "without you all!"));
  const [, values] = line.split("Welcome message: ");
  const [b, a] = values.split(" → ");
  assert.ok(b.startsWith("…") && a.startsWith("…"), line);
  assert.ok(b.endsWith("without you.") && a.endsWith("without you all!"), line);
  assert.ok(b.length <= 72 && a.length <= 72, line);
});

test("O4: a change at the very start, and short values, read as before", () => {
  const [line] = welcomeLine((t) => t.replace(/^It started/, "It all started"));
  const text = homeData.welcome.text;
  const clip = (s) => `${s.slice(0, 80)}…`;
  assert.equal(line, `Home → Welcome section → Welcome message: ${clip(text)} → ${clip(text.replace(/^It started/, "It all started"))}`);
  assert.deepEqual(sum((c) => { c.travel.room_block.hotel_name = "New"; }), ["Travel & Hotels → Room block → Hotel name: H → New"]);
});

// Final review, item 3: a summary line is always one line.
test("summary values collapse line breaks, tabs and runs of spaces to one space", () => {
  const [line] = sum((c) => { c.faq.questions[0].answer = "First part.\n\nSecond\tpart   here."; });
  assert.equal(line, "FAQ → Questions → “Q1” → Answer: A1 → First part. Second part here.");
  const [named] = sum((c) => { c.faq.questions.push({ question: "Kids\nwelcome?", answer: "Yes" }); });
  assert.doesNotMatch(named, /\s\s|[\n\t]/);
  const long = "Words ".repeat(20);
  const [around] = sum((c) => { c.faq.questions[0].answer = `${long}old\n\nending here`; });
  assert.ok(around);
  const [win] = summarize(diffContent(
    edit((c) => { c.faq.questions[0].answer = `${long}old\n\nending here`; }),
    edit((c) => { c.faq.questions[0].answer = `${long}new\n\nending  here`; }),
  ), schema);
  assert.match(win, /…/);
  assert.doesNotMatch(win, /\s\s|[\n\t]/, win);
});

// CR4: a change to paragraph breaks alone would read the same on both sides.
test("summary says when only paragraph breaks changed", () => {
  assert.deepEqual(sum((c) => { c.faq.questions[0].answer = "First. Second."; }), ["FAQ → Questions → “Q1” → Answer: A1 → First. Second."]);
  const [line] = summarize(diffContent(
    edit((c) => { c.faq.questions[0].answer = "First. Second."; }),
    edit((c) => { c.faq.questions[0].answer = "First.\n\nSecond."; }),
  ), schema);
  assert.equal(line, "FAQ → Questions → “Q1” → Answer: paragraph breaks changed");
  assert.doesNotMatch(line, BANNED);
});

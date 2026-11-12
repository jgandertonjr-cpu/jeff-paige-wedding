import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import schema from "../netlify/editor/schema.gen.mjs";
import { validateContent } from "../netlify/editor/validate.mjs";

const ROOT = new URL("../", import.meta.url);
const load = () => {
  const out = {};
  for (const [key, f] of Object.entries(schema.files)) {
    out[key] = JSON.parse(fs.readFileSync(new URL(f.path, ROOT), "utf8"));
  }
  return out;
};
const images = new Set(fs.readdirSync(new URL("src/images/", ROOT)).map((n) => `/images/${n}`));
const BANNED = /\b(commit|deploy|json|branch|repository|merge|build|token|wcag)\b/i;

// Validate one changed file against the unchanged repo content.
function check(key, mutate, { previous = load(), extra = {} } = {}) {
  const content = { [key]: structuredClone(previous[key]), ...extra };
  mutate(content[key], content);
  return validateContent(content, { schema, images, previous });
}
function only(issues, label) {
  assert.equal(issues.length, 1, JSON.stringify(issues));
  assert.equal(issues[0].label, label);
  const m = issues[0].message;
  assert.match(m, /^[A-Z].*[.]$/, m);
  assert.doesNotMatch(m.slice(0, -1), /[.!?](\s|$)/, `more than one sentence: ${m}`);
  assert.doesNotMatch(m, BANNED);
  return issues[0];
}

test("the repo's current content has no issues", () => {
  const previous = load();
  assert.deepEqual(validateContent(previous, { schema, images, previous }), []);
});

test("an emptied required field is rejected", () => {
  const i = only(check("travel", (t) => { t.room_block.hotel_name = ""; }), "Travel & Hotels → Room block → Hotel name");
  assert.equal(i.file, "travel");
  assert.equal(i.path, "/room_block/hotel_name");
});

test("a missing required field is rejected", () => {
  only(check("travel", (t) => { delete t.room_block.title; }), "Travel & Hotels → Room block → Heading");
});

test("a wrong type is rejected", () => {
  only(check("rsvp", (r) => { r.rsvp_open = "yes"; }), "RSVP → RSVPs are open");
  only(check("travel", (t) => { t.room_block.title = 5; }), "Travel & Hotels → Room block → Heading");
});

test("an unknown extra field is rejected", () => {
  const i = only(check("travel", (t) => { t.room_block.surprise = "x"; }), "Travel & Hotels → Room block → surprise");
  assert.equal(i.path, "/room_block/surprise");
});

test("a pattern mismatch uses the pattern message", () => {
  const i = only(check("theme", (t) => { t.gold = "gold"; }), "Colours → Gold");
  assert.match(i.message, /Enter a colour like/);
});

test("a list below its minimum is rejected", () => {
  only(check("home", (h) => { h.photos.items.pop(); }), "Home → Three photos → Photos");
});

test("a select value outside its options is rejected", () => {
  only(check("home", (h) => { h.photos.items[0].focus = "diagonal"; }), "Home → Three photos → Photos → item 1 → Photo crop");
});

test("text longer than its limit is rejected", () => {
  only(check("home", (h) => { h.seo.title = "x".repeat(71); }), "Home → Search & Sharing → Browser tab title");
});

test("date must be real", () => {
  const bad = check("site", (s) => { s.wedding_date = "2028-02-30"; });
  only(bad, "Names, Date & Venue → Wedding date");
  assert.deepEqual(check("site", (s) => { s.wedding_date = "2028-06-01"; }), []);
  assert.deepEqual(check("rsvp", (r) => { r.deadline = ""; }), []);
  assert.deepEqual(check("rsvp", (r) => { r.deadline = null; }), []);
  assert.equal(check("rsvp", (r) => { r.deadline = "June 1"; }).length, 1);
});

test("time must look like a time", () => {
  only(check("site", (s) => { s.calendar.start_time = "25:00"; }), "Names, Date & Venue → Calendar event → Start time (Eastern)");
  assert.deepEqual(check("site", (s) => { s.calendar.start_time = "16:30"; }), []);
});

test("image must exist", () => {
  only(check("home", (h) => { h.hero.photo = "/images/nope.jpg"; }), "Home → Top of page → Main photo");
  const ok = [...images][0];
  assert.deepEqual(check("home", (h) => { h.hero.photo = ok; }), []);
  assert.deepEqual(check("registry", (r) => { r.photo = ""; }), []);
});

test("links", () => {
  // The real url fields also carry a schema pattern; drop it to test the link rule alone.
  const bare = structuredClone(schema);
  delete bare.files.registry.fields.find((f) => f.name === "amazon").fields.find((f) => f.name === "url").pattern;
  const url = (v) => {
    const previous = load();
    const content = { registry: structuredClone(previous.registry) };
    content.registry.amazon.url = v;
    return validateContent(content, { schema: bare, images, previous });
  };
  const md = (v) => check("faq", (f) => { f.questions[0].answer = `See [this](${v}) please.`; });
  for (const good of ["https://x.com", "mailto:a@b.co", "tel:+12155550100", "travel.html", "index.html#top"]) {
    assert.deepEqual(url(good), [], good);
    assert.deepEqual(md(good), [], good);
  }
  for (const bad of ["javascript:alert(1)", "http://x.com", "//x.com", "nowhere.html"]) {
    only(url(bad), "Registry → Amazon registry → Registry link");
    only(md(bad), "FAQ → Questions → item 1 → Answer");
  }
  // Forms that a quick text match misses but the site's markdown turns into real links.
  const answer = (text) => check("faq", (f) => { f.questions[0].answer = text; });
  for (const bad of [
    "See [x](//evil.com (t)) ok",
    "[x](http://evil.com (t))",
    "See [x][1]\n\n[1]: //evil.com",
    "![pic](//evil.com/a.png)",
    "Go <http://evil.com> now",
    "[x]()",
  ]) only(answer(bad), "FAQ → Questions → item 1 → Answer");
  assert.deepEqual(answer("See [x][1]\n\n[1]: travel.html"), []);
  assert.deepEqual(answer("Plain words, no links."), []);
  // A value that fails both the schema pattern and the link rule is reported once.
  only(check("registry", (r) => { r.amazon.url = "ftp://x.com"; }), "Registry → Amazon registry → Registry link");
  only(check("registry", (r) => { r.amazon.url = "http://x.com"; }), "Registry → Amazon registry → Registry link");
  assert.deepEqual(check("travel", (t) => { t.room_block.booking_url = ""; }), []);
});

test("no HTML tags", () => {
  const set = (v) => check("home", (h) => { h.hero.eyebrow = v; });
  const L = "Home → Top of page → Small text above the photo";
  only(set("<b>hi</b>"), L);
  only(set("<script>"), L);
  only(set("a <!-- b"), L);
  only(check("faq", (f) => { f.questions[0].answer = "hi <img src=x>"; }), "FAQ → Questions → item 1 → Answer");
  for (const ok of ["3 < 5", "Jeff & Paige", "we’re — so 🎉"]) assert.deepEqual(set(ok), [], ok);
});

test("meal codes locked while RSVPs are open", () => {
  const previous = load();
  previous.rsvp.rsvp_open = true;
  const change = (r) => { r.meal_options[0].value = "changed"; };
  only(check("rsvp", change, { previous }), "RSVP → Meal choices → item 1 → Short code (what you see in responses)");
  const closed = structuredClone(previous);
  closed.rsvp.rsvp_open = false;
  assert.deepEqual(check("rsvp", change, { previous: closed }), []);
  assert.deepEqual(check("rsvp", (r) => { r.meal_options[0].label = "Other"; }, { previous }), []);
  only(check("rsvp", (r) => { r.meal_options.shift(); }, { previous }), "RSVP → Meal choices");
});

test("nav addresses fixed", () => {
  only(check("nav", (n) => { n.essentials[0].url = "elsewhere.html"; }), "Menu → Main menu links → item 1 → Goes to");
  only(check("nav", (n) => { n.more.pop(); }), "Menu → More links");
  assert.deepEqual(check("nav", (n) => { n.essentials[0].label = "The Details"; }), []);
  assert.deepEqual(check("nav", (n) => { n.essentials.reverse(); }), []);
});

test("section order is a full reshuffle", () => {
  const set = (v) => check("travel", (t) => { t.section_order = v; });
  const L = "Travel & Hotels → Order of sections";
  only(set(["room_block", "room_block", "tips", "airports"]), L);
  only(set(["room_block", "nearby", "airports"]), L);
  only(set(["room_block", "nearby", "airports", "bogus"]), L);
  assert.deepEqual(set(["tips", "airports", "nearby", "room_block"]), []);
});

test("theme contrast", () => {
  const bad = check("theme", (t) => { t.evergreen = "#BCCAB3"; });
  assert.ok(bad.length >= 1);
  const msg = bad.find((i) => /Main text/.test(i.message) && /Page background/.test(i.message));
  assert.ok(msg, JSON.stringify(bad));
  assert.match(msg.message, /does not have enough contrast to read\.$/);
  assert.equal(msg.file, "theme");
  assert.doesNotMatch(msg.message, BANNED);
  assert.deepEqual(check("theme", (t) => { t.rosette = "#E8A0B4"; }), []);
});

test("a file key the editor does not know is rejected", () => {
  const previous = load();
  const issues = validateContent({ bogus: {} }, { schema, images, previous });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].label, "bogus");
  assert.match(issues[0].message, /^[A-Z].*[.]$/);
});

test("file keys that exist on every object never throw", () => {
  const previous = load();
  const ctx = { schema, images, previous };
  const nasty = JSON.parse('{"__proto__": {}, "constructor": {}, "toString": {}, "hasOwnProperty": {}}');
  for (const k of Object.keys(nasty)) {
    const issues = validateContent({ [k]: {} }, ctx);
    assert.equal(issues.length, 1, k);
    assert.match(issues[0].message, /^[A-Z].*[.]$/, k);
  }
  assert.equal(validateContent(nasty, ctx).length, 4);
});

test("a required yes/no field set to an empty string is a wrong type", () => {
  only(check("rsvp", (r) => { r.rsvp_open = ""; }), "RSVP → RSVPs are open");
});

test("a duplicate meal code cannot hide a removed one while RSVPs are open", () => {
  const previous = load();
  previous.rsvp.rsvp_open = true;
  const [a, b] = previous.rsvp.meal_options;
  const i = only(
    check("rsvp", (r) => { r.meal_options[1].value = a.value; }, { previous }),
    "RSVP → Meal choices",
  );
  assert.equal(i.path, "/meal_options");
  assert.ok(b.value !== a.value);
  // Duplicates are rejected even when RSVPs are closed.
  previous.rsvp.rsvp_open = false;
  only(check("rsvp", (r) => { r.meal_options[1].value = a.value; }, { previous }), "RSVP → Meal choices");
});

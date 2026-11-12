// The editor page's pure helpers (src/admin/find.js), run against the real field
// description and the real content files, so a new field or a changed label is
// covered without touching this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import schema from "../netlify/editor/schema.gen.mjs";
import { applyOps } from "../netlify/editor/ops.mjs";
import {
  PAGE_ORDER, fileOrder, buildIndex, search, opFor, applyLocal, checkLocal, describe, formatDate, formatTime,
  emptyItem, itemName, locate, controlFor, optionLabels, addChange, dropChange, pruneTray, numberPhotos,
  photoRefs, checkLabel, describeOp, isShown, canAdd, remark, removeEntries, toStorage, fromStorage, currentSpots,
  marksOf, relocate, trayLocked, MAX_REQUEST_CHARS, photosBudget, photoRoom,
} from "../src/admin/find.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const content = Object.fromEntries(
  Object.entries(schema.files).map(([k, f]) => [k, JSON.parse(fs.readFileSync(path.join(ROOT, f.path), "utf8"))]),
);
const index = buildIndex(schema, content);

const at = (file, p) => index.find((e) => e.file === file && e.path === p);
function valueAt(obj, p) {
  let node = obj;
  for (const seg of p.split("/").slice(1)) node = node?.[Array.isArray(node) ? Number(seg) : seg];
  return node;
}

// Every editable leaf and every list, walked independently of find.js.
function expectedPaths() {
  const out = [];
  const walk = (file, fields, value, p, inList) => {
    for (const f of fields) {
      if (f.type === "hidden" || (inList && f.name === "id")) continue;
      const here = `${p}/${f.name}`;
      const v = value?.[f.name];
      if (f.type === "object") walk(file, f.fields, v, here, false);
      else if (f.type === "list") {
        out.push(`${file}:${here}`);
        (v || []).forEach((item, i) => walk(file, f.fields, item, `${here}/${i}`, true));
      } else out.push(`${file}:${here}`);
    }
  };
  for (const [k, f] of Object.entries(schema.files)) walk(k, f.fields, content[k], "", false);
  return out;
}

// ---- the index ----------------------------------------------------------------

test("the page list follows the site's own page order and names every file once", () => {
  const order = fileOrder(schema);
  assert.deepEqual([...order].sort(), Object.keys(schema.files).sort());
  assert.deepEqual(order.slice(0, 10), ["home", "story", "details", "travel", "registry", "rsvp", "party", "afterparty", "faq", "gallery"]);
  assert.deepEqual(order.slice(10), ["site", "theme", "nav", "guests", "notfound"]);
  assert.deepEqual(PAGE_ORDER, order);
});

test("the index has every editable leaf and every list of every file, and nothing hidden", () => {
  const got = index.map((e) => `${e.file}:${e.path}`);
  assert.deepEqual([...got].sort(), expectedPaths().sort());
  assert.equal(new Set(got).size, got.length, "no entry twice");
  assert.ok(!index.some((e) => e.type === "hidden"));
  assert.ok(!index.some((e) => e.file === "nav" && /\/url$/.test(e.path)), "menu addresses are not shown");
  assert.ok(!index.some((e) => e.file === "guests" && /\/id$/.test(e.path)), "guest numbers are not shown");
  for (const k of Object.keys(schema.files)) assert.ok(index.some((e) => e.file === k), `${k} has entries`);
});

test("each entry carries its field, its current value and a trail of plain labels", () => {
  for (const e of index) {
    assert.deepEqual(e.value, valueAt(content[e.file], e.path), e.path);
    assert.equal(e.trail[0], schema.files[e.file].label);
    assert.ok(e.trail.every((t) => typeof t === "string" && t), e.path);
    assert.equal(e.type, e.field.type);
  }
  const deadline = at("travel", "/room_block/deadline");
  assert.deepEqual(deadline.trail, ["Travel & Hotels", "Room block", "Booking deadline"]);
  const list = at("faq", "/questions");
  assert.equal(list.type, "list");
  assert.equal(list.value.length, content.faq.questions.length);
  // A list item's leaves carry the item's name, so searching its words finds it.
  const answer = at("faq", "/questions/0/answer");
  assert.deepEqual(answer.trail, ["FAQ", "Questions", content.faq.questions[0].question, "Answer"]);
});

test("items are named by question, title, name, label, caption or alt, else by number", () => {
  assert.equal(itemName({ question: "Q?", title: "T" }, 0), "Q?");
  assert.equal(itemName({ title: "", name: "N" }, 0), "N");
  assert.equal(itemName({ caption: "C", alt: "A" }, 0), "C");
  assert.equal(itemName({ alt: "A" }, 0), "A");
  assert.equal(itemName({ image: "/images/x.jpg" }, 2), "Item 3");
  assert.equal(itemName("Plain words", 0), "Plain words");
  assert.equal(itemName("", 4), "Item 5");
});

test("locate gives the field, value and trail for any path, including list items", () => {
  const guest = locate(schema, content, "guests", "/guests/0/party/0/name");
  assert.equal(guest.field.label, "Name");
  assert.equal(guest.value, content.guests.guests[0].party[0].name);
  assert.deepEqual(guest.trail, ["Guest List", "Guests", content.guests.guests[0].name, "Others on this invitation", content.guests.guests[0].party[0].name, "Name"]);
  const item = locate(schema, content, "faq", "/questions/1");
  assert.equal(item.item, true);
  assert.equal(item.field.label, "Questions");
  assert.equal(locate(schema, content, "faq", "/nothing/here"), null);
  assert.equal(locate(schema, content, "nofile", "/x"), null);
});

test("controls follow the field type, and every colour gets the colour picker", () => {
  const c = (file, p) => controlFor(locate(schema, content, file, p));
  assert.equal(c("travel", "/room_block/hotel_name"), "line");
  assert.equal(c("home", "/welcome/text"), "text");
  assert.equal(c("faq", "/questions/0/answer"), "markdown");
  assert.equal(c("rsvp", "/rsvp_open"), "switch");
  assert.equal(c("travel", "/room_block/deadline"), "date");
  assert.equal(c("site", "/calendar/start_time"), "time");
  assert.equal(c("details", "/schedule/events/0/time"), "line", "free-text times stay free text");
  assert.equal(c("registry", "/focus"), "choice");
  assert.equal(c("home", "/section_order"), "order");
  assert.equal(c("home", "/hero/photo"), "photo");
  assert.equal(c("faq", "/questions"), "list");
  for (const k of Object.keys(content.theme)) assert.equal(c("theme", `/${k}`), "colour", k);
  assert.equal(controlFor({ file: "site", field: { type: "time" }, value: "4:30 PM" }), "line", "a stored time that is not HH:MM");
});

test("section order choices are named after their sections", () => {
  const home = schema.files.home.fields;
  const order = home.find((f) => f.name === "section_order");
  const names = optionLabels(order, home);
  assert.equal(names.welcome, "Welcome section");
  assert.equal(names.save_the_date, "Save the Date band");
  const focus = schema.files.registry.fields.find((f) => f.name === "focus");
  assert.deepEqual(Object.keys(optionLabels(focus, [])), focus.options);
  assert.ok(Object.values(optionLabels(focus, [])).every((s) => /^[A-Z]/.test(s)));
});

// ---- search -------------------------------------------------------------------

const first = (q, idx = index) => search(idx, q)[0];

test("search: 'hotel deadline' finds the room block booking deadline first", () => {
  const r = first("hotel deadline");
  assert.equal(`${r.file}:${r.path}`, "travel:/room_block/deadline");
});

test("search: 'ceremony time' finds the ceremony detail labelled Time first", () => {
  const i = content.details.ceremony.items.findIndex((x) => x.label === "Time");
  assert.ok(i >= 0);
  const r = first("ceremony time");
  assert.equal(r.file, "details");
  assert.equal(r.path, `/ceremony/items/${i}/value`, "the value, not the word Time itself");
});

test("search: 'parking' has the Details parking row or the FAQ parking question in the top 3", () => {
  const top = search(index, "parking").slice(0, 3);
  const q = content.faq.questions.findIndex((x) => /parking/i.test(x.question));
  assert.ok(top.some((e) => e.file === "details" || (e.file === "faq" && e.path.startsWith(`/questions/${q}/`))), JSON.stringify(top.map((e) => e.path)));
});

test("search: words on the site find where they live ('4:30' after a time is set)", () => {
  const copy = structuredClone(content);
  copy.details.schedule.events[1].time = "4:30 PM";
  const r = first("4:30", buildIndex(schema, copy));
  assert.equal(`${r.file}:${r.path}`, "details:/schedule/events/1/time");
});

test("search: 'rsvp open' finds the RSVPs-are-open switch first", () => {
  assert.equal(`${first("rsvp open").file}:${first("rsvp open").path}`, "rsvp:/rsvp_open");
  assert.equal(first("RSVPs open").path, "/rsvp_open", "plural and case don't matter");
});

test("search: 'pink' finds the RSVP pink colour first", () => {
  assert.equal(`${first("pink").file}:${first("pink").path}`, "theme:/rosette");
});

test("search: 'avery' finds a guest", () => {
  assert.equal(first("avery").file, "guests");
  assert.ok(search(index, "Stella").some((e) => e.file === "story"));
});

test("search: synonyms, every word must match, a limit, and nothing for nonsense", () => {
  assert.ok(search(index, "kids").length > 0 || search(index, "children").length === 0);
  assert.equal(first("colour").file, "theme");
  assert.equal(first("color").file, "theme");
  assert.equal(first("green").path, "/dusty_sage");
  assert.ok(search(index, "picture").some((e) => e.type === "image"));
  assert.ok(search(index, "menu").some((e) => e.file === "nav"));
  assert.deepEqual(search(index, "zzqx"), []);
  assert.deepEqual(search(index, "   "), []);
  assert.deepEqual(search(index, "parking zzqx"), [], "every word must match");
  assert.ok(search(index, "the").length <= 20);
  assert.equal(search(index, "photo", 3).length, 3);
});

const top = (q, n = 1) => search(index, q).slice(0, n).map((e) => `${e.file}:${e.path}`);

test("search: the obvious match comes first, not the page's own settings", () => {
  assert.deepEqual(top("hotel"), ["travel:/room_block/hotel_name"]);
  const where = top("where is the hotel", 2);
  assert.ok(where.includes("travel:/room_block/hotel_name") || where.includes("travel:/room_block/hotel_details"), where.join());
  assert.deepEqual(top("registry link"), ["registry:/amazon/url"]);
  assert.ok(top("date", 3).includes("site:/wedding_date"), top("date", 3).join());
  assert.deepEqual(top("wedding date"), ["site:/wedding_date"]);
  assert.ok(top("address", 2).includes("site:/venue/street"), top("address", 2).join());
  assert.deepEqual(top("email"), ["site:/email"]);
  const dress = top("dress code", 2);
  const dressRow = content.details.ceremony.items.findIndex((x) => /dress/i.test(x.label));
  assert.ok(dress.some((p) => p === "afterparty:/details/dress_code" || p.startsWith(`details:/ceremony/items/${dressRow}/`)), dress.join());
  const maids = top("bridesmaids", 2);
  assert.ok(maids.length === 2 && maids.every((p) => p.startsWith("party:/bridesmaids/")), maids.join());
  assert.deepEqual(top("footer"), ["site:/footer_text"]);
  const welcome = top("welcome", 2);
  assert.ok(welcome.some((p) => p === "home:/welcome/text" || p === "home:/welcome/title"), welcome.join());
});

test("search: search-engine and button-wording settings come after everything else that scores the same", () => {
  const r = search(index, "title", 200);
  const firstDemoted = r.findIndex((e) => /^\/(seo|labels)\//.test(e.path));
  assert.ok(firstDemoted > 0, "something else comes first");
  assert.ok(search(index, "browser tab title").length > 0, "they can still be found");
});

test("search: shows up to 20 by default, and the stop words are ignored", () => {
  assert.equal(search(index, "photo").length, 20);
  assert.deepEqual(top("where is my hotel"), top("hotel"));
  assert.deepEqual(top("change the footer"), top("footer"));
});

// ---- operations -----------------------------------------------------------------

test("opFor makes exactly the server's operation shapes", () => {
  const leaf = at("travel", "/room_block/deadline");
  assert.deepEqual(opFor(leaf, { type: "set", value: "2028-06-01" }), { op: "set", file: "travel", path: "/room_block/deadline", value: "2028-06-01" });
  const list = at("faq", "/questions");
  assert.deepEqual(opFor(list, { type: "insert", index: -1, value: { question: "Q", answer: "A" } }),
    { op: "insert", file: "faq", path: "/questions", index: -1, value: { question: "Q", answer: "A" } });
  assert.deepEqual(opFor(list, { type: "insert", value: { question: "Q", answer: "A" } }).index, -1, "the end by default");
  assert.deepEqual(opFor(list, { type: "remove", at: 2 }), { op: "remove", file: "faq", path: "/questions/2" });
  assert.deepEqual(opFor(list, { type: "move", at: 2, to: 0 }), { op: "move", file: "faq", path: "/questions/2", to: 0 });
  assert.deepEqual(opFor({ file: "faq", path: "/questions/1" }, { type: "remove" }), { op: "remove", file: "faq", path: "/questions/1" });
  assert.throws(() => opFor(list, { type: "explode" }));
});

const SHARED_OPS = [
  { op: "set", file: "travel", path: "/room_block/deadline", value: "2028-06-01" },
  { op: "set", file: "rsvp", path: "/rsvp_open", value: true },
  { op: "set", file: "theme", path: "/rosette", value: "#E0A0A0" },
  { op: "set", file: "home", path: "/section_order", value: ["countdown", "welcome", "photos", "quick_links", "save_the_date"] },
  { op: "insert", file: "faq", path: "/questions", index: -1, value: { question: "Is there parking?", answer: "Yes." } },
  { op: "insert", file: "faq", path: "/questions", index: 0, value: { question: "First?", answer: "Yes." } },
  { op: "insert", file: "guests", path: "/guests", value: { id: "69", name: "New Guest", party: [] } },
  { op: "insert", file: "guests", path: "/guests/0/party", index: -1, value: { name: "Plus One" } },
  { op: "set", file: "guests", path: "/guests/0/party/1/name", value: "Plus One Renamed" },
  { op: "remove", file: "guests", path: "/guests/2" },
  { op: "move", file: "faq", path: "/questions/0", to: -1 },
  { op: "move", file: "nav", path: "/more/4", to: 0 },
  { op: "move", file: "details", path: "/schedule/events/1", to: 3 },
  { op: "set", file: "details", path: "/schedule/events/0/time", value: "4:30 PM" },
  { op: "remove", file: "details", path: "/ceremony/items/2" },
  { op: "set", file: "story", path: "/events/0/story", value: "A new story with [a link](https://example.com)." },
];

test("applyLocal gives the same result as the server's applyOps on the real content", () => {
  assert.deepEqual(applyLocal(content, SHARED_OPS), applyOps(content, SHARED_OPS));
  for (let i = 1; i <= SHARED_OPS.length; i++) {
    assert.deepEqual(applyLocal(content, SHARED_OPS.slice(0, i)), applyOps(content, SHARED_OPS.slice(0, i)), `first ${i}`);
  }
});

test("applyLocal never changes what it is given", () => {
  const before = JSON.stringify(content);
  applyLocal(content, SHARED_OPS);
  assert.equal(JSON.stringify(content), before);
});

test("an operation that does not apply throws, as it does on the server", () => {
  const bad = [
    { op: "set", file: "travel", path: "/nope/deadline", value: "x" },
    { op: "set", file: "nofile", path: "/x", value: "x" },
    { op: "set", file: "travel", path: "/room_block/deadline" },
    { op: "insert", file: "faq", path: "/questions", index: 999, value: {} },
    { op: "insert", file: "faq", path: "/hero", value: {} },
    { op: "remove", file: "faq", path: "/questions/999" },
    { op: "move", file: "faq", path: "/questions/0", to: 999 },
    { op: "move", file: "faq", path: "/questions/x", to: 0 },
    { op: "set", file: "faq", path: "/__proto__/x", value: 1 },
    { op: "set", file: "faq", path: "", value: 1 },
    { op: "explode", file: "faq", path: "/questions" },
  ];
  for (const op of bad) {
    assert.throws(() => applyOps(content, [op]), JSON.stringify(op));
    assert.throws(() => applyLocal(content, [op]), JSON.stringify(op));
  }
});

// ---- checks ---------------------------------------------------------------------

const field = (file, p) => locate(schema, content, file, p).field;

test("checkLocal: required, length, pattern, choices, dates, times and page code", () => {
  const title = field("home", "/seo/title");
  assert.equal(checkLocal(title, "Fine"), null);
  assert.match(checkLocal(title, ""), /empty/);
  assert.match(checkLocal(title, "   "), /empty/);
  assert.match(checkLocal(title, "x".repeat(71)), /70 characters/);
  assert.equal(checkLocal(title, "x".repeat(70)), null);
  assert.equal(checkLocal(field("rsvp", "/deadline"), ""), null, "optional and empty is fine");
  assert.match(checkLocal(field("rsvp", "/deadline"), "2028-02-30"), /real date/);
  assert.equal(checkLocal(field("rsvp", "/deadline"), "2028-02-29"), null);
  assert.match(checkLocal(field("site", "/email"), "not an email"), /^Enter an email address like name@example\.com\.$/);
  assert.match(checkLocal(field("theme", "/rosette"), "pink"), /colour like/);
  assert.equal(checkLocal(field("theme", "/rosette"), "#E0AA9E"), null);
  assert.match(checkLocal(field("registry", "/focus"), "sideways"), /choices/);
  assert.equal(checkLocal(field("registry", "/focus"), "left"), null);
  assert.match(checkLocal(field("site", "/calendar/start_time"), "4:30 PM"), /time/);
  assert.equal(checkLocal(field("site", "/calendar/start_time"), "16:30"), null);
  assert.match(checkLocal(field("home", "/welcome/text"), "Hello <script>"), /page code/);
  assert.equal(checkLocal(field("rsvp", "/rsvp_open"), false), null);
  for (const [, msg] of [[0, checkLocal(title, "")], [0, checkLocal(title, "x".repeat(71))]]) {
    assert.match(msg, /^[A-Z][^.]*\.$/, "one plain sentence");
  }
});

test("checkLocal: list limits and section order", () => {
  const photos = field("home", "/photos/items");
  assert.match(checkLocal(photos, content.home.photos.items.slice(0, 2)), /at least 3/);
  assert.match(checkLocal(photos, [...content.home.photos.items, content.home.photos.items[0]]), /at most 3/);
  assert.equal(checkLocal(photos, content.home.photos.items), null);
  const order = field("home", "/section_order");
  assert.equal(checkLocal(order, ["countdown", "welcome", "photos", "quick_links", "save_the_date"]), null);
  assert.match(checkLocal(order, ["welcome", "welcome", "photos", "quick_links", "save_the_date"]), /once/);
});

// ---- words for values ------------------------------------------------------------

test("values are shown in plain words", () => {
  assert.equal(formatDate("2028-06-01"), "June 1, 2028");
  assert.equal(formatDate("nonsense"), "nonsense");
  assert.equal(formatTime("16:30"), "4:30 PM");
  assert.equal(formatTime("00:05"), "12:05 AM");
  assert.equal(formatTime("12:00"), "12:00 PM");
  assert.equal(describe(at("travel", "/room_block/deadline"), "2028-06-01"), "June 1, 2028");
  assert.equal(describe(at("travel", "/room_block/deadline"), ""), "Not set");
  assert.equal(describe(at("rsvp", "/rsvp_open"), true), "On");
  assert.equal(describe(at("rsvp", "/rsvp_open"), false), "Off");
  assert.equal(describe(at("site", "/calendar/start_time"), "16:30"), "4:30 PM");
  assert.equal(describe(at("faq", "/questions")), `${content.faq.questions.length} items`);
  assert.equal(describe(at("faq", "/questions"), [{}]), "1 item");
  assert.equal(describe(at("faq", "/questions"), []), "No items yet");
  assert.equal(describe(at("home", "/hero/photo"), "@photo:p1"), "A new photo from your phone");
  assert.equal(describe(at("home", "/hero/photo"), "/images/gallery1.jpg"), "gallery1.jpg");
  assert.equal(describe(at("home", "/section_order"), ["welcome", "countdown"]), "Welcome section, Countdown band");
  assert.equal(describe(at("registry", "/focus"), "center"), optionLabels(field("registry", "/focus"), []).center);
  assert.equal(describe(at("theme", "/rosette")), "#E0AA9E");
  assert.equal(describe(at("travel", "/room_block/hotel_name"), "The Inn"), "The Inn");
});

test("a new list item has every field at a sensible empty value", () => {
  const guests = field("guests", "/guests");
  const ids = content.guests.guests.map((g) => Number(g.id));
  assert.deepEqual(emptyItem(guests, content.guests.guests), { id: String(Math.max(...ids) + 1), name: "", party: [] });
  assert.deepEqual(emptyItem(guests, []), { id: "1", name: "", party: [] });
  // A guest removed in the tray still has their number on the site: it is never reused.
  const top1 = content.guests.guests.reduce((a, g) => (Number(g.id) > Number(a.id) ? g : a));
  const pending = content.guests.guests.filter((g) => g !== top1);
  assert.equal(emptyItem(guests, pending, content.guests.guests).id, String(Number(top1.id) + 1));
  assert.deepEqual(emptyItem(field("faq", "/questions"), content.faq.questions), { question: "", answer: "" });
  const tip = emptyItem(field("travel", "/tips/list"), []);
  assert.equal(tip.icon, "sun", "a required choice starts on its first option");
  assert.equal(tip.title, "");
  const essentials = emptyItem(field("nav", "/essentials"), []);
  assert.ok(!("rsvp" in essentials), "optional hidden settings are left out");
  assert.equal(canAdd(field("nav", "/essentials")), false, "a menu link needs an address that is never shown");
  assert.equal(canAdd(field("faq", "/questions")), true);
  assert.ok(isShown({ type: "string", name: "id" }, false));
  assert.ok(!isShown({ type: "string", name: "id" }, true));
  assert.ok(!isShown({ type: "hidden", name: "x" }, false));
});

// ---- the tray ----------------------------------------------------------------------

const setOp = (file, p, value) => ({ op: "set", file, path: p, value });
const ops = (tray) => tray.map((t) => t.op);

test("changing the same thing twice keeps one change; changing it back drops it", () => {
  let tray = addChange(schema, content, [], setOp("travel", "/room_block/hotel_name", "One")).tray;
  tray = addChange(schema, content, tray, setOp("rsvp", "/rsvp_open", true)).tray;
  tray = addChange(schema, content, tray, setOp("travel", "/room_block/hotel_name", "Two")).tray;
  assert.deepEqual(ops(tray), [setOp("travel", "/room_block/hotel_name", "Two"), setOp("rsvp", "/rsvp_open", true)]);
  tray = addChange(schema, content, tray, setOp("travel", "/room_block/hotel_name", content.travel.room_block.hotel_name)).tray;
  assert.deepEqual(ops(tray), [setOp("rsvp", "/rsvp_open", true)]);
  const same = addChange(schema, content, tray, setOp("rsvp", "/rsvp_open", true));
  assert.equal(same.unchanged, true);
  assert.equal(same.tray, tray);
  const nothing = addChange(schema, content, [], setOp("site", "/email", content.site.email));
  assert.equal(nothing.unchanged, true);
  assert.deepEqual(nothing.tray, []);
});

test("each change carries a plain label", () => {
  let tray = addChange(schema, content, [], setOp("travel", "/room_block/deadline", "2028-06-01")).tray;
  assert.equal(tray[0].entryLabel, "Travel & Hotels › Room block › Booking deadline: June 1, 2028");
  tray = addChange(schema, content, tray, { op: "insert", file: "faq", path: "/questions", index: -1, value: { question: "Is there parking?", answer: "Yes." } }).tray;
  assert.equal(tray[1].entryLabel, "Added to FAQ › Questions: Is there parking?");
  tray = addChange(schema, content, tray, { op: "remove", file: "guests", path: "/guests/0" }).tray;
  assert.equal(tray[2].entryLabel, `Removed from Guest List › Guests: ${content.guests.guests[0].name}`);
  tray = addChange(schema, content, tray, { op: "move", file: "nav", path: "/more/0", to: 1 }).tray;
  assert.equal(tray[3].entryLabel, `Moved ${content.nav.more[0].label} down in Menu › More links`);
  assert.equal(describeOp(schema, content, setOp("rsvp", "/rsvp_open", true)), "RSVP › RSVPs are open: On");
});

test("moving the same item again folds into one move, and back to where it was drops it", () => {
  let tray = addChange(schema, content, [], { op: "move", file: "faq", path: "/questions/0", to: 1 }).tray;
  tray = addChange(schema, content, tray, { op: "move", file: "faq", path: "/questions/1", to: 2 }).tray;
  assert.deepEqual(ops(tray), [{ op: "move", file: "faq", path: "/questions/0", to: 2 }]);
  tray = addChange(schema, content, tray, { op: "move", file: "faq", path: "/questions/2", to: 0 }).tray;
  assert.deepEqual(ops(tray), []);
});

test("dropping a change also drops the later changes that depend on it", () => {
  let tray = [];
  const add = (op) => { tray = addChange(schema, content, tray, op).tray; };
  add({ op: "insert", file: "faq", path: "/questions", index: -1, value: { question: "New?", answer: "Yes." } });
  add(setOp("rsvp", "/rsvp_open", true));
  const n = content.faq.questions.length;
  add(setOp("faq", `/questions/${n}/answer`, "Changed."));
  add(setOp("travel", "/room_block/hotel_name", "Inn"));
  const plan = dropChange(tray, 0);
  assert.deepEqual(plan.dropped, [0, 2]);
  assert.deepEqual(ops(plan.tray), [setOp("rsvp", "/rsvp_open", true), setOp("travel", "/room_block/hotel_name", "Inn")]);
  assert.deepEqual(dropChange(tray, 1).dropped, [1]);
});

test("changes that no longer fit the site are dropped, with the ones that depend on them", () => {
  const tray = [
    { op: setOp("faq", "/questions/0/answer", "A"), entryLabel: "a" },
    { op: { op: "remove", file: "faq", path: "/questions/0" }, entryLabel: "b" },
    { op: setOp("rsvp", "/rsvp_open", true), entryLabel: "c" },
  ];
  assert.deepEqual(pruneTray(content, tray), { tray, dropped: 0 });
  const smaller = structuredClone(content);
  smaller.faq.questions = [];
  const after = pruneTray(smaller, tray);
  assert.equal(after.dropped, 2);
  assert.deepEqual(after.tray.map((t) => t.entryLabel), ["c"]);
});

test("phone photos are numbered in the order they are used", () => {
  const tray = [
    { op: setOp("home", "/hero/photo", "@photo:b"), entryLabel: "x", photoRef: "b" },
    { op: { op: "insert", file: "gallery", path: "/photos", index: -1, value: { image: "@photo:a", alt: "x" } }, entryLabel: "y", photoRef: "a" },
    { op: setOp("home", "/hero/photo_alt", "@photo:b is not a photo"), entryLabel: "z" },
  ];
  assert.deepEqual(photoRefs(tray[1].op.value), ["a"]);
  const { ops: out, refs } = numberPhotos(tray.map((t) => t.op));
  assert.deepEqual(refs, ["b", "a"]);
  assert.equal(out[0].value, "@photo:1");
  assert.equal(out[1].value.image, "@photo:2");
  assert.equal(out[2].value, "@photo:b is not a photo");
  assert.equal(tray[0].op.value, "@photo:b", "the tray itself is left alone");
});

test("the server's problem labels can be matched back to a change", () => {
  assert.equal(checkLabel(schema, "travel", "/room_block/deadline"), "Travel & Hotels → Room block → Booking deadline");
  assert.equal(checkLabel(schema, "faq", "/questions/3/answer"), "FAQ → Questions → item 4 → Answer");
  assert.equal(checkLabel(schema, "guests", "/guests/0/party/1/name"), "Guest List → Guests → item 1 → Others on this invitation → item 2 → Name");
});

// ---- the site moving under the tray ------------------------------------------------

const answerOf = (c, question) => c.faq.questions.find((x) => x.question === question)?.answer;
const add = (tray, op, extra) => addChange(schema, content, tray, op, extra).tray;

test("fingerprints: each list position on a change's path is recorded", () => {
  const m = marksOf(content, "guests", "/guests/2/party/0/name");
  assert.equal(m.length, 2);
  assert.deepEqual(m.map((x) => x.at), [1, 3]);
  assert.deepEqual(marksOf(content, "travel", "/room_block/deadline"), []);
  assert.equal(relocate(content, "guests", "/guests/2/party/0/name", m), "/guests/2/party/0/name");
});

test("a change follows its item when an item above it is removed on the site", () => {
  const target = content.faq.questions[3].question;
  const tray = add([], setOp("faq", "/questions/3/answer", "New answer."));
  const fresh = structuredClone(content);
  fresh.faq.questions.splice(0, 1);
  const r = pruneTray(fresh, tray);
  assert.equal(r.dropped, 0);
  assert.equal(r.tray[0].op.path, "/questions/2/answer");
  const after = applyLocal(fresh, r.tray.map((t) => t.op));
  assert.equal(answerOf(after, target), "New answer.");
  assert.equal(after.faq.questions.filter((x) => x.answer === "New answer.").length, 1);
});

test("a change to an item removed on the site is dropped", () => {
  const tray = add([], setOp("faq", "/questions/3/answer", "New answer."));
  const fresh = structuredClone(content);
  fresh.faq.questions.splice(3, 1);
  assert.deepEqual(pruneTray(fresh, tray), { tray: [], dropped: 1 });
});

test("a change follows its item when the list is reordered on the site", () => {
  const target = content.faq.questions[3].question;
  let tray = add([], setOp("faq", "/questions/3/answer", "New answer."));
  tray = add(tray, { op: "move", file: "faq", path: "/questions/3", to: 2 });
  tray = add(tray, { op: "remove", file: "faq", path: "/questions/0" });
  const fresh = structuredClone(content);
  fresh.faq.questions.reverse();
  const r = pruneTray(fresh, tray);
  assert.equal(r.dropped, 0);
  const n = content.faq.questions.length;
  assert.equal(r.tray[0].op.path, `/questions/${n - 4}/answer`);
  assert.equal(r.tray[1].op.path, `/questions/${n - 4}`);
  assert.equal(r.tray[1].op.to, n - 5, "the move keeps its direction and distance");
  assert.equal(r.tray[2].op.path, `/questions/${n - 1}`, "the removal finds its own item");
  const after = applyLocal(fresh, r.tray.map((t) => t.op));
  assert.equal(answerOf(after, target), "New answer.");
  assert.ok(!after.faq.questions.some((x) => x.question === content.faq.questions[0].question));
});

test("when an item now appears twice, the change is dropped rather than guessed", () => {
  const tray = add([], setOp("faq", "/questions/3/answer", "New answer."));
  const fresh = structuredClone(content);
  fresh.faq.questions.splice(0, 1);
  fresh.faq.questions.push(structuredClone(content.faq.questions[3]));
  assert.equal(pruneTray(fresh, tray).dropped, 1);
});

test("nested lists: a change to a guest's other names follows the guest", () => {
  const guest = content.guests.guests[2];
  assert.ok(guest.party.length > 0);
  let tray = add([], setOp("guests", "/guests/2/party/0/name", "Renamed"));
  tray = add(tray, { op: "insert", file: "guests", path: "/guests/2/party", index: -1, value: { name: "Plus One" } });
  const fresh = structuredClone(content);
  fresh.guests.guests.splice(0, 1);
  const r = pruneTray(fresh, tray);
  assert.equal(r.dropped, 0);
  assert.equal(r.tray[0].op.path, "/guests/1/party/0/name");
  assert.equal(r.tray[1].op.path, "/guests/1/party");
  const after = applyLocal(fresh, r.tray.map((t) => t.op)).guests.guests.find((g) => g.id === guest.id);
  assert.deepEqual(after.party.map((p) => p.name), ["Renamed", ...guest.party.slice(1).map((p) => p.name), "Plus One"]);
});

test("her own later edits to the same item keep its changes in step", () => {
  let tray = add([], setOp("faq", "/questions/3/answer", "A"));
  tray = add(tray, setOp("faq", "/questions/3/question", "Q?"));
  tray = add(tray, setOp("faq", "/questions/3/answer", "B"));
  assert.equal(tray.length, 2);
  assert.deepEqual(pruneTray(content, tray).dropped, 0);
  const rest = remark(content, dropChange(tray, 0).tray);
  assert.equal(pruneTray(content, rest).dropped, 0);
});

// ---- publishing takes exactly what was reviewed ---------------------------------------

test("each change has its own id, and a publish removes exactly the reviewed ones", () => {
  let tray = add([], setOp("travel", "/room_block/hotel_name", "Inn"));
  tray = add(tray, { op: "insert", file: "faq", path: "/questions", index: -1, value: { question: "New?", answer: "Yes." } });
  tray = add(tray, setOp("rsvp", "/rsvp_open", true));
  assert.equal(new Set(tray.map((t) => t.id)).size, 3);
  const reviewed = tray.map((t) => t.id);
  // Meanwhile the first was dropped and another added.
  let now = remark(content, dropChange(tray, 0).tray);
  now = add(now, setOp("site", "/footer_text", "Bye"));
  const left = removeEntries(now, reviewed);
  assert.deepEqual(left.map((t) => t.op.path), ["/footer_text"]);
  assert.deepEqual(removeEntries(now, []), now);
});

// ---- keeping the tray across a reload --------------------------------------------------

test("a reload keeps every change except those that used a new photo, and the ones relying on them", () => {
  let tray = add([], setOp("travel", "/room_block/hotel_name", "Inn"));
  tray = add(tray, { op: "insert", file: "gallery", path: "/photos", index: -1, value: { image: "@photo:p1", alt: "New" } }, { photoRef: "p1" });
  const n = content.gallery.photos.length;
  tray = add(tray, setOp("gallery", `/photos/${n}/alt`, "Newer"));
  tray = add(tray, setOp("home", "/hero/photo", "@photo:p2"), { photoRef: "p2" });
  const saved = JSON.parse(JSON.stringify(toStorage(tray)));
  assert.equal(saved.length, 4, "every change is written down");
  assert.deepEqual(saved.map((t) => !!t.photo), [false, true, false, true]);
  const back = fromStorage(saved);
  assert.equal(back.lost, 3);
  assert.deepEqual(back.tray.map((t) => t.op.path), ["/room_block/hotel_name"]);
  assert.deepEqual(fromStorage("nonsense"), { tray: [], lost: 0 });
  assert.deepEqual(fromStorage([{ op: null }, 3]), { tray: [], lost: 0 });
});

// ---- where each change is now ------------------------------------------------------------

test("each change's spot is followed through the later changes in the tray", () => {
  let tray = add([], setOp("faq", "/questions/3/answer", "A"));
  tray = add(tray, { op: "remove", file: "faq", path: "/questions/0" });
  tray = add(tray, setOp("faq", "/questions/0/answer", "B"));
  tray = add(tray, { op: "move", file: "faq", path: "/questions/0", to: 4 });
  tray = add(tray, { op: "insert", file: "faq", path: "/questions", index: -1, value: { question: "New?", answer: "Yes." } });
  tray = add(tray, setOp("faq", "/questions/1/answer", "C"));
  tray = add(tray, { op: "remove", file: "faq", path: "/questions/1" });
  const n = content.faq.questions.length;
  // Item 3 → 2 (an item above removed) → 1 (the item at 0 moved below it) → removed: no spot.
  // Item 1 (at 0 once item 0 went) → moved to 4 → 3 once the item at 1 was removed.
  assert.deepEqual(currentSpots(content, tray), [
    null, "/questions", "/questions/3/answer", "/questions/3", `/questions/${n - 2}`, null, "/questions",
  ]);
  const view = applyLocal(content, tray.map((t) => t.op));
  assert.equal(view.faq.questions[3].answer, "B");
  assert.equal(view.faq.questions[n - 2].question, "New?");
});

// ---- fix round 2 ---------------------------------------------------------------------

test("search: hyphenated and spaced words match each other both ways", () => {
  assert.deepEqual(top("rsvp deadline"), ["rsvp:/deadline"]);
  const three = top("deadline", 3);
  assert.ok(three.includes("travel:/room_block/deadline") && three.includes("rsvp:/deadline"), three.join());
  assert.deepEqual(top("e-mail"), ["site:/email"]);
  assert.deepEqual(top("reply by"), ["rsvp:/deadline"]);
  assert.deepEqual(top("reply-by"), ["rsvp:/deadline"]);
  assert.deepEqual(top("replyby"), ["rsvp:/deadline"]);
  // Spaced in the query, joined on the site, and the other way round.
  const copy = structuredClone(content);
  copy.travel.room_block.booking_note = "Early check-in is free.";
  copy.travel.room_block.hotel_details = "Ask about checkin times.";
  const idx = buildIndex(schema, copy);
  for (const q of ["check in", "check-in", "checkin"]) {
    const found = search(idx, q).map((e) => e.path);
    assert.ok(found.includes("/room_block/booking_note") && found.includes("/room_block/hotel_details"), `${q}: ${found.join()}`);
  }
});

test("search: a list item's words count like its value, so a page's own field comes first", () => {
  assert.deepEqual(top("after party time"), ["afterparty:/details/time"]);
  for (const q of ["add a guest", "guest", "guests"]) assert.deepEqual(top(q), ["guests:/guests"], q);
});

test("fresh content that already has a change (it was published) drops it quietly", () => {
  let tray = add([], setOp("travel", "/room_block/hotel_name", "Inn"));
  tray = add(tray, { op: "insert", file: "faq", path: "/questions", index: -1, value: { question: "New?", answer: "Yes." } });
  const n = content.faq.questions.length;
  tray = add(tray, setOp("faq", `/questions/${n}/answer`, "Yes, really."));
  tray = add(tray, { op: "remove", file: "guests", path: "/guests/0" });
  const published = applyLocal(content, tray.map((t) => t.op));
  assert.deepEqual(pruneTray(published, tray), { tray: [], dropped: 0 });
  // Only part of it there: the rest stays.
  const partly = applyLocal(content, [tray[0].op]);
  const r = pruneTray(partly, tray);
  assert.equal(r.dropped, 0);
  assert.deepEqual(r.tray.map((t) => t.op.op), ["insert", "set", "remove"]);
});

// CR7: the tray locks from the moment Review is tapped, not only once a card exists.
test("trayLocked: while a review is on its way, and while a card is not settled", () => {
  assert.equal(trayLocked({ pending: false, card: null }), false);
  assert.equal(trayLocked({ pending: true, card: null }), true);
  for (const state of ["review", "previewing", "previewReady", "publishing", "slow", "unreachable"]) {
    assert.equal(trayLocked({ pending: false, card: { state } }), true, state);
  }
  for (const state of ["live", "cancelled", "failed", "undone", "stopped", "moved"]) {
    assert.equal(trayLocked({ pending: false, card: { state } }), false, state);
    assert.equal(trayLocked({ pending: true, card: { state } }), true, state);
  }
});

// CR8: the photo budget comes from the request cap, so photos accepted on the
// Photo screen are never refused at Review for size.
test("photo budget: three photos exactly at the budget, with a full set of changes, fit under the request cap", () => {
  const budget = photosBudget();
  assert.ok(budget > 3 * 1024 * 1024, "room for three ordinary phone photos");
  const each = Math.floor(budget / 3);
  const photos = [0, 1, 2].map((i) => Buffer.alloc(each + (i < budget % 3 ? 1 : 0), i + 1).toString("base64"));
  assert.equal(photos.reduce((n, p) => n + Buffer.from(p, "base64").length, 0), budget);
  // Fifty changes, each a long answer: the most the tray holds.
  const ops = Array.from({ length: 50 }, (_, i) => ({ op: "set", file: "faq", path: `/questions/${i}/answer`, value: "x".repeat(4000) }));
  const request = { ops, photos, base: "a".repeat(40) };
  assert.ok(JSON.stringify(request).length <= MAX_REQUEST_CHARS, `${JSON.stringify(request).length} > ${MAX_REQUEST_CHARS}`);
});

test("photo room: what is left of the budget, never below zero", () => {
  const budget = photosBudget();
  assert.equal(photoRoom(0), budget);
  assert.equal(photoRoom(1000), budget - 1000);
  assert.equal(photoRoom(budget), 0);
  assert.equal(photoRoom(budget + 5), 0);
});

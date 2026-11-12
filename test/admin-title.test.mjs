// The editor page keeps a copy of the site's title rule (titleFor in
// src/admin/admin.js) for a publish whose answer was lost; it must match
// titleOf in netlify/editor/service.mjs exactly, or "Undo this" cannot find the edit.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { titleOf } from "../netlify/editor/service.mjs";

const src = fs.readFileSync(fileURLToPath(new URL("../src/admin/admin.js", import.meta.url)), "utf8");
const start = src.indexOf("  function titleFor(summary) {");
const end = src.indexOf("\n  }\n", start);
const titleFor = vm.runInNewContext(`(${src.slice(start, end + 4).trim()})`);

test("the page's title rule matches the site's", () => {
  assert.ok(start > 0 && end > start);
  const lines = [
    [],
    ["Travel & Hotels → Room block → Booking deadline: (empty) → June 1, 2028"],
    ["Please check: RSVP → RSVPs open: Off → On"],
    ["Details (ceremony, reception, schedule) → Ceremony → Ceremony details → “Time” → Value: Will be provided soon → 4:30 PM"],
    [`FAQ → Questions → “Q” → Answer: A → ${"Yes. ".repeat(40)}`],
    ["x".repeat(200)],
    ["x".repeat(72)],
  ];
  for (const summary of lines) assert.equal(titleFor(summary), titleOf(summary), JSON.stringify(summary));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Public page templates. rsvp.njk is exempt: it is off limits to the editor.
const TEMPLATES = [
  "src/index.njk", "src/our-story.njk", "src/details.njk", "src/wedding-party.njk",
  "src/registry.njk", "src/travel.njk", "src/after-party.njk", "src/faq.njk",
  "src/gallery.njk", "src/404.njk", "src/_includes/add-to-calendar.njk",
];

// Screen-reader-only text that stays in the templates.
const ALLOWED = new Set(["and", "Our milestones"]);

function visibleText(source) {
  return source
    .replace(/^---[\s\S]*?---/, "")
    .replace(/\{#[\s\S]*?#\}/g, " ")
    .replace(/\{%[\s\S]*?%\}/g, " ")
    .replace(/\{\{[\s\S]*?\}\}/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]*>/g, "\n")
    .replace(/&[a-z]+;/g, " ");
}

test("no hardcoded visible text in public templates", () => {
  const found = [];
  for (const file of TEMPLATES) {
    const text = visibleText(fs.readFileSync(path.join(ROOT, file), "utf8"));
    for (const line of text.split("\n")) {
      const s = line.trim();
      if (!/[A-Za-z]{3}/.test(s) || ALLOWED.has(s)) continue;
      found.push(`${file}: ${s}`);
    }
  }
  assert.deepEqual(found, []);
});

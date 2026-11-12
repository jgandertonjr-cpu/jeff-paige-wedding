import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import schema from "../netlify/editor/schema.gen.mjs";
import { renderSchemaModule } from "../scripts/build-editor-schema.mjs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const KEYS = [
  "site", "theme", "nav", "home", "story", "details", "party", "rsvp",
  "registry", "travel", "afterparty", "faq", "gallery", "notfound", "guests",
];

function field(fields, name) {
  const f = fields.find((x) => x.name === name);
  assert.ok(f, `missing field ${name}`);
  return f;
}

test("covers every data file", () => {
  assert.deepEqual(Object.keys(schema.files).sort(), [...KEYS].sort());
  for (const key of KEYS) {
    const file = schema.files[key];
    assert.ok(file.label, `${key} has a label`);
    assert.ok(fs.existsSync(path.join(ROOT, file.path)), `${file.path} exists`);
  }
});

test("generated file is current", () => {
  const committed = fs.readFileSync(path.join(ROOT, "netlify/editor/schema.gen.mjs"), "utf8");
  assert.equal(renderSchemaModule(), committed);
});

test("travel.room_block.deadline is an optional date", () => {
  const roomBlock = field(schema.files.travel.fields, "room_block");
  const deadline = field(roomBlock.fields, "deadline");
  assert.equal(deadline.type, "date");
  assert.equal(deadline.required, false);
});

test("home.photos.items has min 3 max 3", () => {
  const photos = field(schema.files.home.fields, "photos");
  const items = field(photos.fields, "items");
  assert.equal(items.type, "list");
  assert.equal(items.min, 3);
  assert.equal(items.max, 3);
});

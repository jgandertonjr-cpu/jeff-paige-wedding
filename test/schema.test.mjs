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

// CR9: a select or yes/no field's default reaches the editor, so a new item starts on it.
test("select and boolean defaults are carried; other fields carry none", () => {
  const tips = field(field(schema.files.travel.fields, "tips").fields, "list");
  assert.equal(field(tips.fields, "icon").default, "star");
  const photos = field(field(schema.files.home.fields, "photos").fields, "items");
  assert.equal(field(photos.fields, "focus").default, "center");
  assert.equal(field(schema.files.rsvp.fields, "rsvp_open").default, false);
  const yaml = `collections:
  - name: c
    files:
      - name: f
        file: f.json
        label: F
        fields:
          - { name: s, widget: string, default: "x" }
          - { name: b, widget: boolean, default: true }
          - { name: p, widget: select, default: two, options: [one, two] }
`;
  const out = new Function(`${renderSchemaModule(yaml).replace("export default", "return")}`)();
  const [s, b, p] = out.files.f.fields;
  assert.ok(!("default" in s));
  assert.equal(b.default, true);
  assert.equal(p.default, "two");
});

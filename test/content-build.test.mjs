// Whatever the editor's validator accepts must build and pass the site check.
// Each case group changes the real content in many places at once, is checked
// by the validator, and is then built for real (Eleventy on a temp copy of
// src/) and run through checkSite, the same check that ends every build.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import schema from "../netlify/editor/schema.gen.mjs";
import { validateContent } from "../netlify/editor/validate.mjs";
import { checkSite } from "../scripts/check-site.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIZED = path.join("_site", "images", "sized");
const images = new Set(fs.readdirSync(path.join(ROOT, "src/images")).map((n) => `/images/${n}`));
let tmpRoot;
let sizedSeed = null; // resized photo copies from an earlier build, so each build skips that work
let n = 0;

const load = () => {
  const out = {};
  for (const [key, f] of Object.entries(schema.files)) out[key] = JSON.parse(fs.readFileSync(path.join(ROOT, f.path), "utf8"));
  return out;
};

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "content-build-"));
  if (fs.existsSync(path.join(ROOT, SIZED))) sizedSeed = path.join(ROOT, SIZED);
});
after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

// Builds a copy of the site with `content` written over src/_data, and returns
// checkSite's problems for it.
function buildWith(content) {
  const dir = path.join(tmpRoot, `site-${n++}`);
  fs.mkdirSync(dir);
  for (const f of ["eleventy.config.js", "package.json"]) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "dir");
  fs.cpSync(path.join(ROOT, "src"), path.join(dir, "src"), { recursive: true });
  if (sizedSeed) fs.cpSync(sizedSeed, path.join(dir, SIZED), { recursive: true });
  for (const [key, value] of Object.entries(content)) {
    fs.writeFileSync(path.join(dir, schema.files[key].path), JSON.stringify(value, null, 2) + "\n");
  }
  execFileSync(process.execPath, [path.join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), "--quiet"], { cwd: dir, stdio: ["ignore", "ignore", "pipe"] });
  if (!sizedSeed) sizedSeed = path.join(dir, SIZED);
  return checkSite(path.join(dir, "_site"));
}

// Calls fn(field, holder, key) for every field value in the content, walking
// into groups and lists.
function eachField(content, fn) {
  const walk = (fields, obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const f of fields) {
      if (f.type === "object") walk(f.fields, obj[f.name]);
      else if (f.type === "list" && f.fields && Array.isArray(obj[f.name])) for (const item of obj[f.name]) walk(f.fields, item);
      else fn(f, obj, f.name);
    }
  };
  for (const [key, file] of Object.entries(schema.files)) if (key !== "nav") walk(file.fields, content[key]);
}

const isLink = (f) => f.type === "string" && (f.name === "url" || f.name.endsWith("_url"));
const plainText = (f) => (f.type === "string" || f.type === "text") && !f.pattern && !isLink(f);
const fit = (f, v) => (f.maxlength ? v.slice(0, f.maxlength) : v);

// One case group: validates, then builds; the validator must accept and the site must pass.
const accepted = (name, mutate) => test(`accepted and builds: ${name}`, { timeout: 60_000 }, () => {
  const previous = load();
  const content = structuredClone(previous);
  mutate(content);
  assert.deepEqual(validateContent(content, { schema, images, previous }), [], `${name}: the validator refused it`);
  assert.deepEqual(buildWith(content), [], `${name}: the validator accepted it, but the site check failed`);
});

accepted("a photo description that starts with a word and a colon", (c) => {
  for (const p of c.gallery.photos) p.alt = "Proposal: she said yes";
});

accepted("every yes/no setting flipped", (c) => {
  let flipped = 0;
  eachField(c, (f, obj, k) => {
    if (f.type === "boolean") { obj[k] = !obj[k]; flipped++; }
  });
  assert.ok(flipped >= 5);
});

accepted("every optional link filled with a web address, markdown links, and awkward text everywhere", (c) => {
  const awkward = 'Note: “quoted” and "straight" & 3 < 5 — we’re so happy 🎉';
  let i = 0; // keeps values that must differ (such as meal codes) different
  eachField(c, (f, obj, k) => {
    if (isLink(f) && !f.required) obj[k] = "https://www.example.com/booking";
    else if (f.type === "markdown") obj[k] = `${awkward} See [the site](https://www.example.com) too.`;
    else if (plainText(f) && f.name !== "id") obj[k] = fit(f, `${awkward} ${++i}`);
  });
});

accepted("optional photos and dates left empty", (c) => {
  let blanked = 0;
  eachField(c, (f, obj, k) => {
    if ((f.type === "image" || f.type === "date") && !f.required) { obj[k] = ""; blanked++; }
  });
  assert.ok(blanked >= 3);
});

accepted("sections reordered, the menu reordered, and a theme colour changed", (c) => {
  eachField(c, (f, obj, k) => {
    if (f.name === "section_order" && Array.isArray(obj[k])) obj[k] = [...obj[k]].reverse();
  });
  for (const list of Object.values(c.nav)) if (Array.isArray(list)) list.reverse();
  c.theme.rosette = "#E8A0B4";
});

test("a picture inside markdown text is refused, so it never reaches the site", () => {
  const previous = load();
  const content = structuredClone(previous);
  content.faq.questions[0].answer = "Here we are ![us](https://www.example.com/us.jpg)";
  content.story.events[0].story = "We met ![x](https://www.example.com/x.png)";
  const issues = validateContent(content, { schema, images, previous });
  assert.equal(issues.length, 2, JSON.stringify(issues));
  for (const i of issues) assert.match(i.message, /picture/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "design-review", "parity-baseline.json");

// Builds a copy of src/ whose data file `dataFile` has been changed by `edit`.
function buildVariant(dataFile, edit) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sections-"));
  const src = path.join(tmp, "src");
  const out = path.join(tmp, "out");
  fs.cpSync(path.join(ROOT, "src"), src, { recursive: true });
  const file = path.join(src, "_data", dataFile);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  edit(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  const result = spawnSync("npx", ["@11ty/eleventy", "--quiet", `--input=${src}`, `--output=${out}`], {
    cwd: ROOT, encoding: "utf8",
  });
  return { result, out, tmp };
}

test("default order renders identically", { skip: !fs.existsSync(BASELINE) && "no local parity baseline" }, () => {
  const result = spawnSync("npm", ["run", "parity"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /parity: 0 differences/);
});

test("reordering changes the page", () => {
  const { result, out, tmp } = buildVariant("details.json", (d) => {
    d.section_order = ["schedule", "ceremony", "reception", "cta"];
  });
  try {
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const html = fs.readFileSync(path.join(out, "details.html"), "utf8");
    assert.ok(html.indexOf('id="schedule-heading"') !== -1);
    assert.ok(html.indexOf('id="schedule-heading"') < html.indexOf('id="ceremony-heading"'));
    const classes = [...html.matchAll(/<section class="(section(?: section--alt)?)(?: text-center)?"/g)].map((m) => m[1]);
    assert.deepEqual(classes, ["section", "section section--alt", "section", "section section--alt"]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

for (const [label, order] of [
  ["an unknown section name", ["ceremony", "reception", "schedule", "cta", "bogus"]],
  ["a missing section name", ["ceremony", "reception", "cta"]],
  ["a duplicated section name", ["ceremony", "ceremony", "reception", "schedule", "cta"]],
]) {
  test(`unknown or missing section name fails the build (${label})`, () => {
    const { result, tmp } = buildVariant("details.json", (d) => { d.section_order = order; });
    try {
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /details/);
      assert.match(result.stdout + result.stderr, /section_order/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
}

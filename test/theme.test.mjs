import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const theme = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/theme.json"), "utf8"));
const styles = fs.readFileSync(path.join(ROOT, "src/css/styles.css"), "utf8");

let out;
before(() => {
  out = fs.mkdtempSync(path.join(os.tmpdir(), "theme-test-"));
  execFileSync("npx", ["@11ty/eleventy", "--quiet", `--output=${out}`], { cwd: ROOT, stdio: "pipe" });
});
after(() => fs.rmSync(out, { recursive: true, force: true }));

test("theme.json matches styles.css", () => {
  const keys = ["dusty_sage", "rosette", "gold", "ivory", "sage_mist", "white", "hairline", "blush",
    "evergreen", "sage_gray", "deep_gold", "deep_evergreen", "muted_on_sage", "gold_on_sage"];
  assert.deepEqual(Object.keys(theme).sort(), [...keys].sort());
  for (const key of keys) {
    const name = `--color-${key.replace(/_/g, "-")}`;
    const m = styles.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
    assert.ok(m, `${name} not found in styles.css`);
    assert.equal(theme[key].toLowerCase(), m[1].toLowerCase(), key);
  }
});

test("theme.css overrides every token", () => {
  const css = fs.readFileSync(path.join(out, "css/theme.css"), "utf8");
  assert.match(css, /--color-dusty-sage: #BCCAB3/);
  assert.match(css, /--color-gold-rgb: 201, 160, 74/);
  assert.match(css, /--color-champagne: rgba\(201, 160, 74, 0\.14\)/);
  for (const key of Object.keys(theme)) {
    assert.ok(css.includes(`--color-${key.replace(/_/g, "-")}: ${theme[key]}`), key);
  }
});

test("stylesheet links are fingerprinted", () => {
  for (const [file, root] of [["index.html", ""], ["404.html", "/"]]) {
    const html = fs.readFileSync(path.join(out, file), "utf8");
    assert.ok(!html.includes("styles.css?v=21"));
    const s = html.indexOf(`${root}css/styles.css?v=`);
    const t = html.indexOf(`${root}css/theme.css?v=`);
    assert.ok(s > -1 && t > s, `${file}: theme link must follow styles link`);
  }
});

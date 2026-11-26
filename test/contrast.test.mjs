import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { contrastRatio, CONTRAST_PAIRS } from "../netlify/editor/contrast.mjs";

test("contrastRatio of dark green on ivory is about 13", () => {
  const r = contrastRatio("#243022", "#FBF8F2");
  assert.ok(r > 12.5 && r < 13.5, String(r));
});

test("contrastRatio is symmetric and black on white is 21", () => {
  assert.equal(Math.round(contrastRatio("#000000", "#FFFFFF")), 21);
  assert.equal(contrastRatio("#FFFFFF", "#000000"), contrastRatio("#000000", "#FFFFFF"));
});

test("CONTRAST_PAIRS lists the thirteen pairs, all at 4.5", () => {
  assert.equal(CONTRAST_PAIRS.length, 13);
  // Text also sits on white cards and on the blush highlight.
  for (const pair of [["sage_gray", "white"], ["deep_gold", "white"], ["evergreen", "blush"]]) {
    assert.ok(CONTRAST_PAIRS.some(([fg, bg]) => fg === pair[0] && bg === pair[1]), pair.join("/"));
  }
  for (const [fg, bg, min] of CONTRAST_PAIRS) assert.equal(min, 4.5, `${fg}/${bg}`);
  assert.deepEqual(CONTRAST_PAIRS[0], ["evergreen", "ivory", 4.5]);
});

test("the current theme passes every pair", () => {
  const theme = JSON.parse(fs.readFileSync(new URL("../src/_data/theme.json", import.meta.url)));
  for (const [fg, bg, min] of CONTRAST_PAIRS) {
    assert.ok(contrastRatio(theme[fg], theme[bg]) >= min, `${fg} on ${bg}`);
  }
});

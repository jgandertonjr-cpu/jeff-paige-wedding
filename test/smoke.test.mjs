import { test } from "node:test";
import assert from "node:assert/strict";

test("eleventy config loads", async () => {
  const mod = await import("../eleventy.config.js");
  assert.equal(typeof mod.default, "function");
});

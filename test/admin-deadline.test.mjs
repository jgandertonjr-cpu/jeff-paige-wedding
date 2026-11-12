// The admin page's request deadline helper (src/admin/deadline.js), loaded the
// way the browser loads it: a plain script that adds one name to the page.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SRC = fs.readFileSync(fileURLToPath(new URL("../src/admin/deadline.js", import.meta.url)), "utf8");

function load() {
  const timers = [];
  const context = {
    AbortController,
    Promise,
    setTimeout: (fn, ms) => { const t = { fn, ms, cleared: false }; timers.push(t); return t; },
    clearTimeout: (t) => { if (t) t.cleared = true; },
  };
  vm.runInNewContext(SRC, context);
  const fire = () => { for (const t of timers.filter((x) => !x.cleared)) { t.cleared = true; t.fn(); } };
  return { d: context.editorDeadline, timers, fire };
}

test("sending changes for review gets 75 seconds; everything else 30", () => {
  const { d } = load();
  assert.equal(d.deadlineFor("propose"), 75_000);
  for (const route of ["ask", "content", "preview", "publish", "cancel", "undo", "history", "session", "login", "logout", "status?id=abc"]) {
    assert.equal(d.deadlineFor(route), 30_000, route);
  }
});

test("a request that answers in time gives its answer and clears the timer", async () => {
  const { d, timers } = load();
  const out = await d.withDeadline(30_000, async (signal) => {
    assert.equal(signal.aborted, false);
    return 42;
  });
  assert.equal(out, 42);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 30_000);
  assert.equal(timers[0].cleared, true);
});

test("a request that never settles is stopped at the deadline", async () => {
  const { d, fire } = load();
  let seen;
  const p = d.withDeadline(75_000, (signal) => { seen = signal; return new Promise(() => {}); });
  fire();
  await assert.rejects(p, (e) => e && e.timedOut === true);
  assert.equal(seen.aborted, true);
});

test("a request that fails on its own keeps its own error", async () => {
  const { d } = load();
  const boom = new Error("offline");
  await assert.rejects(d.withDeadline(30_000, async () => { throw boom; }), (e) => e === boom);
});

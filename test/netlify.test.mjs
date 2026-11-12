import { test } from "node:test";
import assert from "node:assert/strict";
import { createNetlify } from "../netlify/editor/netlify.mjs";

const TOKEN = "nfp_secret";
function client(status, body) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
  };
  return { calls, nl: createNetlify({ token: TOKEN, siteId: "site-1", fetch }) };
}
const deploy = (state, sha, extra = {}) => ({ state, commit_ref: sha, deploy_ssl_url: `https://${state}.example`, created_at: "2026-01-01T00:00:00Z", ...extra });

test("asks for the site's recent deploys with a bearer token", async () => {
  const { nl, calls } = client(200, []);
  await nl.deployFor("abc");
  assert.equal(calls[0].url, "https://api.netlify.com/api/v1/sites/site-1/deploys?per_page=50");
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
});

for (const [from, to] of [
  ["new", "building"], ["enqueued", "building"], ["building", "building"], ["uploading", "building"],
  ["processing", "building"], ["preparing", "building"], ["ready", "ready"], ["error", "failed"],
  // Final states that never become ready.
  ["rejected", "failed"],
  // Stopped by Netlify, usually because newer edits arrived: still under way,
  // unless a later build is found (see below).
  ["canceled", "building"], ["cancelled", "building"], ["skipped", "building"],
]) {
  test(`state ${from} maps to ${to}`, async () => {
    const { nl } = client(200, [deploy(from, "abc")]);
    const r = await nl.deployFor("abc");
    assert.equal(r.state, to);
    if (to === "ready") assert.equal(r.url, "https://ready.example");
  });
}

test("no matching deploy means waiting", async () => {
  const { nl } = client(200, [deploy("ready", "zzz")]);
  assert.deepEqual(await nl.deployFor("abc"), { state: "waiting" });
});

test("picks the newest deploy whose commit_ref matches", async () => {
  const { nl } = client(200, [
    deploy("ready", "other", { created_at: "2026-03-01T00:00:00Z" }),
    deploy("error", "abc", { created_at: "2026-01-01T00:00:00Z" }),
    deploy("ready", "abc", { created_at: "2026-02-01T00:00:00Z" }),
  ]);
  assert.equal((await nl.deployFor("abc")).state, "ready");
});

test("an unfamiliar state counts as building", async () => {
  const { nl } = client(200, [deploy("weird", "abc")]);
  assert.equal((await nl.deployFor("abc")).state, "building");
});

test("looks at page 2 before reporting waiting", async () => {
  const urls = [];
  const pages = [[deploy("ready", "zzz")], [deploy("ready", "abc")]];
  const fetch = async (url) => {
    urls.push(url);
    const body = pages[urls.length - 1] ?? [];
    return { ok: true, status: 200, json: async () => body };
  };
  const nl = createNetlify({ token: TOKEN, siteId: "site-1", fetch });
  assert.equal((await nl.deployFor("abc")).state, "ready");
  assert.equal(urls[1], "https://api.netlify.com/api/v1/sites/site-1/deploys?per_page=50&page=2");
  assert.equal((await client(200, []).nl.deployFor("abc")).state, "waiting");
});

test("a malformed 2xx body throws a status-only error", async () => {
  const fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("BODYTEXT " + TOKEN); } });
  await assert.rejects(createNetlify({ token: TOKEN, siteId: "s", fetch }).deployFor("a"), (e) => {
    assert.equal(e.message, "Netlify request failed (200)");
    return true;
  });
});

test("the token never appears in a thrown Netlify error", async () => {
  const { nl } = client(500, { message: TOKEN });
  await assert.rejects(nl.deployFor("abc"), (e) => !e.message.includes(TOKEN) && !String(e.stack).includes(TOKEN));
});

test("a non-2xx response throws a bare status message", async () => {
  const { nl } = client(401, { message: "bad " + TOKEN });
  await assert.rejects(nl.deployFor("abc"), (e) => {
    assert.equal(e.message, "Netlify request failed (401)");
    return true;
  });
});

// F2: a build Netlify cancelled or skipped is not a failure. Her edit is in the
// later production build of the site, so that one's result counts.
const prod = (state, sha, at, extra = {}) =>
  deploy(state, sha, { context: "production", branch: "main", created_at: at, deploy_ssl_url: `https://${sha}.example`, ...extra });

for (const stopped of ["canceled", "cancelled", "skipped"]) {
  test(`a ${stopped} build is ready once a later production build is ready, with that build's address`, async () => {
    const { nl } = client(200, [
      prod("ready", "later", "2026-01-01T00:05:00Z"),
      prod(stopped, "abc", "2026-01-01T00:01:00Z"),
      prod("ready", "older", "2026-01-01T00:00:00Z"),
    ]);
    assert.deepEqual(await nl.deployFor("abc"), { state: "ready", url: "https://later.example" });
  });
}

test("a cancelled build with a later production build still under way is building", async () => {
  const { nl } = client(200, [
    prod("building", "later", "2026-01-01T00:05:00Z"),
    prod("canceled", "abc", "2026-01-01T00:01:00Z"),
  ]);
  assert.deepEqual(await nl.deployFor("abc"), { state: "building" });
});

test("a cancelled build with no later production build is building; older and preview builds do not count", async () => {
  const { nl } = client(200, [
    prod("ready", "pr", "2026-01-01T00:06:00Z", { context: "deploy-preview", branch: "editor-preview-x" }),
    prod("skipped", "abc", "2026-01-01T00:01:00Z"),
    prod("ready", "older", "2026-01-01T00:00:00Z"),
  ]);
  assert.deepEqual(await nl.deployFor("abc"), { state: "building" });
});

// The newest later production build that has finished decides; one still
// under way at the top means wait.
for (const [later, to] of [["error", "failed"], ["rejected", "failed"]]) {
  test(`a cancelled build whose later production build ended "${later}" is ${to}`, async () => {
    const { nl } = client(200, [
      prod(later, "later", "2026-01-01T00:05:00Z"),
      prod("canceled", "abc", "2026-01-01T00:01:00Z"),
    ]);
    assert.deepEqual(await nl.deployFor("abc"), { state: to });
  });
}

test("the newest later production build decides, not an older one", async () => {
  let r = client(200, [
    prod("error", "newest", "2026-01-01T00:09:00Z"),
    prod("ready", "middle", "2026-01-01T00:05:00Z"),
    prod("skipped", "abc", "2026-01-01T00:01:00Z"),
  ]);
  assert.deepEqual(await r.nl.deployFor("abc"), { state: "failed" });
  r = client(200, [
    prod("ready", "newest", "2026-01-01T00:09:00Z"),
    prod("error", "middle", "2026-01-01T00:05:00Z"),
    prod("skipped", "abc", "2026-01-01T00:01:00Z"),
  ]);
  assert.deepEqual(await r.nl.deployFor("abc"), { state: "ready", url: "https://newest.example" });
  r = client(200, [
    prod("building", "newest", "2026-01-01T00:09:00Z"),
    prod("error", "middle", "2026-01-01T00:05:00Z"),
    prod("skipped", "abc", "2026-01-01T00:01:00Z"),
  ]);
  assert.deepEqual(await r.nl.deployFor("abc"), { state: "building" });
});

test("a later production build that was itself stopped is passed over for the next one", async () => {
  const { nl } = client(200, [
    prod("canceled", "newest", "2026-01-01T00:09:00Z"),
    prod("ready", "middle", "2026-01-01T00:05:00Z"),
    prod("skipped", "abc", "2026-01-01T00:01:00Z"),
  ]);
  assert.deepEqual(await nl.deployFor("abc"), { state: "ready", url: "https://middle.example" });
});

test("a cancelled preview build does not take a production build's result", async () => {
  const { nl } = client(200, [
    prod("ready", "later", "2026-01-01T00:05:00Z"),
    prod("canceled", "abc", "2026-01-01T00:01:00Z", { context: "deploy-preview", branch: "editor-preview-x" }),
  ]);
  assert.deepEqual(await nl.deployFor("abc"), { state: "building" });
});

test("a later production build on page 1 counts when the cancelled one is on page 2", async () => {
  const pages = [[prod("ready", "later", "2026-01-01T00:05:00Z")], [prod("cancelled", "abc", "2026-01-01T00:01:00Z")]];
  let n = 0;
  const fetch = async () => ({ ok: true, status: 200, json: async () => pages[n++] ?? [] });
  const nl = createNetlify({ token: TOKEN, siteId: "site-1", fetch });
  assert.deepEqual(await nl.deployFor("abc"), { state: "ready", url: "https://later.example" });
});

test("commitOf: the site version a deploy was built from, or null when it has none or the id is odd", async () => {
  const sha = "a".repeat(40);
  const ok = client(200, { commit_ref: sha });
  assert.equal(await ok.nl.commitOf("6af620ac83328ccb0bdf8aa7"), sha);
  assert.equal(ok.calls[0].url, "https://api.netlify.com/api/v1/deploys/6af620ac83328ccb0bdf8aa7");
  assert.equal(ok.calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(await client(200, { commit_ref: null }).nl.commitOf("6af620ac83328ccb0bdf8aa7"), null);
  assert.equal(await client(200, { commit_ref: "not a sha" }).nl.commitOf("6af620ac83328ccb0bdf8aa7"), null);
  const odd = client(200, { commit_ref: sha });
  assert.equal(await odd.nl.commitOf("../sites"), null);
  assert.equal(odd.calls.length, 0);
  await assert.rejects(client(500, {}).nl.commitOf("6af620ac83328ccb0bdf8aa7"), /Netlify request failed \(500\)/);
});

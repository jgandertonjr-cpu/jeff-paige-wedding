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

test("a non-2xx response throws a bare status message", async () => {
  const { nl } = client(401, { message: "bad " + TOKEN });
  await assert.rejects(nl.deployFor("abc"), (e) => {
    assert.equal(e.message, "Netlify request failed (401)");
    return true;
  });
});

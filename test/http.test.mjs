import { test } from "node:test";
import assert from "node:assert/strict";
import editor, { createHandler, config, lazyHandler } from "../netlify/functions/editor.mjs";
import { createRsvpHandler } from "../netlify/functions/rsvp-responses.mjs";
import * as sessionApi from "../netlify/editor/session.mjs";
import { memoryStore } from "../netlify/editor/store.mjs";

const ORIGIN = "https://jeffandpaige.net";
const ENV = {
  ADMIN_PASSWORD: "correct horse",
  SESSION_SECRET: "s".repeat(40),
  GITHUB_TOKEN: "ghp_secret_value",
  NETLIFY_RSVP_TOKEN: "nfp_secret_value",
};
const NOW = 1_800_000_000_000;
const ID = "0123456789abcdef";

function setup(over = {}) {
  const calls = [];
  const logs = [];
  const rec = (name, result) => async (...a) => { calls.push([name, ...a.slice(1)]); return typeof result === "function" ? result(...a) : result; };
  const service = {
    preview: rec("preview", { ok: true }),
    status: rec("status", { stage: "preview", state: "building" }),
    publish: rec("publish", { ok: false, text: "Nope" }),
    cancel: rec("cancel", { ok: true }),
    history: rec("history", [{ sha: "abc1234", when: "2026-11-01", title: "T" }]),
    undo: rec("undo", { ok: true, restored: [], skipped: [] }),
    loadContent: rec("loadContent", { schema: { files: {} }, content: { guests: [{ name: "Secret Guest" }] }, images: ["/images/a.jpg"] }),
    propose: rec("propose", { kind: "proposal", id: ID, summary: ["One thing changed"] }),
    ...(over.service || {}),
  };
  const deps = {
    service, sessionApi, store: memoryStore(), serviceDeps: { marker: 1 },
    env: ENV, now: () => NOW, allowedOrigins: [ORIGIN], secureCookie: true, canWrite: true,
    log: (event, fields) => logs.push({ event, ...fields }),
    ...over,
  };
  return { handle: createHandler(deps), calls, logs, deps };
}

const ctx = (ip = "1.2.3.4") => ({ ip });
function post(path, body, { origin = ORIGIN, type = "application/json", cookie, headers = {} } = {}) {
  const h = { ...headers };
  if (origin) h.origin = origin;
  if (type) h["content-type"] = type;
  if (cookie) h.cookie = cookie;
  return new Request(`${ORIGIN}/api/editor/${path}`, { method: "POST", headers: h, body: typeof body === "string" ? body : JSON.stringify(body ?? {}) });
}
function get(path, cookie) {
  return new Request(`${ORIGIN}/api/editor/${path}`, { method: "GET", headers: cookie ? { cookie } : {} });
}
async function login(handle, ip) {
  const res = await handle(post("login", { password: ENV.ADMIN_PASSWORD }), ctx(ip));
  assert.equal(res.status, 200);
  return res.headers.get("set-cookie").split(";")[0];
}

test("config path", () => assert.equal(config.path, "/api/editor/*"));
test("default export is a function", () => assert.equal(typeof editor, "function"));

test("every response is JSON, uncached and noindex", async () => {
  const { handle } = setup();
  const res = await handle(get("session"), ctx());
  assert.match(res.headers.get("content-type"), /^application\/json/);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("every route but login and session is 401 without a session", async () => {
  const { handle, calls } = setup();
  for (const p of ["status?id=" + ID, "history", "content"]) assert.equal((await handle(get(p), ctx())).status, 401, p);
  for (const p of ["preview", "publish", "cancel", "undo", "propose"]) {
    const res = await handle(post(p, { id: ID, sha: "abc1234", ops: [{}] }), ctx());
    assert.equal(res.status, 401, p);
  }
  assert.deepEqual(calls, []);
});

test("content: signed-in only, returns the three keys, never cached", async () => {
  const { handle, calls } = setup();
  const anon = await handle(get("content"), ctx());
  assert.equal(anon.status, 401);
  assert.ok(!(await anon.text()).includes("Secret Guest"));
  assert.deepEqual(calls, []);
  const cookie = await login(handle);
  const res = await handle(get("content", cookie), ctx());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ["content", "images", "schema"]);
  assert.deepEqual(body.images, ["/images/a.jpg"]);
  assert.equal((await handle(post("content", {}, { cookie }), ctx())).status, 405);
});

test("propose: coarse body shape is checked, then the service answer is passed through", async () => {
  const { handle, calls } = setup();
  const cookie = await login(handle);
  const op = { op: "set", file: "travel", path: "/a", value: "x" };
  const bad = [
    {}, { ops: "x" }, { ops: [] }, { ops: Array.from({ length: 51 }, () => op) }, { ops: [null] }, { ops: ["x"] }, { ops: [[]] },
    { ops: [op], photos: "AAAA" }, { ops: [op], photos: [1] }, { ops: [op], photos: ["a", "b", "c", "d"] },
  ];
  for (const b of bad) {
    const res = await handle(post("propose", b, { cookie }), ctx());
    assert.equal(res.status, 400, JSON.stringify(b).slice(0, 60));
    assert.deepEqual(await res.json(), { error: "That request can't be accepted." });
  }
  assert.deepEqual(calls, []);
  const res = await handle(post("propose", { ops: [op], photos: ["AAAA"] }, { cookie }), ctx());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { kind: "proposal", id: ID, summary: ["One thing changed"] });
  assert.deepEqual(calls, [["propose", { ops: [op], photos: ["AAAA"] }]]);
  // Fifty is fine; a refusal from the service is still a 200 with its own shape.
  const { handle: h2 } = setup({ service: { propose: async () => ({ ok: false, text: "That change can't be made." }) } });
  const c2 = await login(h2);
  const r2 = await h2(post("propose", { ops: Array.from({ length: 50 }, () => op) }, { cookie: c2 }), ctx());
  assert.equal(r2.status, 200);
  assert.deepEqual(await r2.json(), { ok: false, text: "That change can't be made." });
});

test("propose passes the version she opened through, and refuses one that isn't a version", async () => {
  const { handle, calls } = setup();
  const cookie = await login(handle);
  const op = { op: "set", file: "travel", path: "/a", value: "x" };
  for (const base of ["abc1234", "a".repeat(40), "local-base"]) {
    const res = await handle(post("propose", { ops: [op], base }, { cookie }), ctx());
    assert.equal(res.status, 200, base);
  }
  assert.deepEqual(calls.map((c) => c[1]), ["abc1234", "a".repeat(40), "local-base"].map((base) => ({ ops: [op], base })));
  for (const base of [1, "", "ABC1234", "abc", "a".repeat(65), "local-base2", null]) {
    const res = await handle(post("propose", { ops: [op], base }, { cookie }), ctx());
    assert.equal(res.status, 400, String(base));
  }
  assert.equal(calls.length, 3);
  const { handle: h2 } = setup({ service: { propose: async () => ({ ok: false, text: "The site changed.", reload: true }) } });
  const c2 = await login(h2);
  const r2 = await h2(post("propose", { ops: [op], base: "abc1234" }, { cookie: c2 }), ctx());
  assert.deepEqual(await r2.json(), { ok: false, text: "The site changed.", reload: true });
});

test("propose needs the exact origin and JSON type; ask is gone", async () => {
  const { handle } = setup();
  const cookie = await login(handle);
  const body = { ops: [{ op: "set", file: "travel", path: "/a" }] };
  assert.equal((await handle(post("propose", body, { cookie, origin: "https://evil.example" }), ctx())).status, 403);
  assert.equal((await handle(post("propose", body, { cookie, type: "text/plain" }), ctx())).status, 403);
  assert.equal((await handle(post("ask", body, { cookie }), ctx())).status, 404);
  assert.equal((await handle(get("ask", cookie), ctx())).status, 404);
});

test("propose and content work on a preview copy, since they write nothing", async () => {
  const { handle } = setup({ canWrite: false });
  const cookie = await login(handle);
  assert.equal((await handle(post("propose", { ops: [{ op: "set", file: "travel", path: "/a" }] }, { cookie }), ctx())).status, 200);
  assert.equal((await handle(get("content", cookie), ctx())).status, 200);
});

test("session answers 200 either way", async () => {
  const { handle } = setup();
  assert.deepEqual(await (await handle(get("session"), ctx())).json(), { signedIn: false });
  const cookie = await login(handle);
  assert.deepEqual(await (await handle(get("session", cookie), ctx())).json(), { signedIn: true });
});

test("POST with foreign/missing origin or non-JSON type is 403 before anything else", async () => {
  const { handle, deps, calls } = setup();
  const bad = [
    post("login", { password: "x" }, { origin: "https://evil.example" }),
    post("login", { password: "x" }, { origin: null }),
    post("login", { password: "x" }, { type: "text/plain" }),
    post("login", { password: "x" }, { type: null }),
    post("publish", { id: ID }, { origin: "https://evil.example" }),
  ];
  for (const req of bad) {
    const res = await handle(req, ctx());
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: "That request can't be accepted." });
  }
  assert.equal(await deps.store.get("lock:all"), null, "no attempt was counted");
  assert.deepEqual(calls, []);
});

test("login: right password sets the cookie", async () => {
  const { handle } = setup();
  const res = await handle(post("login", { password: ENV.ADMIN_PASSWORD }), ctx());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  const c = res.headers.get("set-cookie");
  assert.match(c, /^jp_admin=/);
  assert.match(c, /HttpOnly/);
  assert.match(c, /Secure/);
});

test("login: wrong password is 401, the 6th wrong attempt is 429 with minutes", async () => {
  const { handle } = setup();
  for (let i = 0; i < 5; i++) {
    const res = await handle(post("login", { password: "nope" + i }), ctx());
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "That password didn't work." });
  }
  const res = await handle(post("login", { password: "nope6" }), ctx());
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.minutes, 15);
  assert.equal(body.error, "Too many tries. Wait 15 minutes.");
});

test("login: a locked address is refused even with the right password", async () => {
  const { handle } = setup();
  for (let i = 0; i < 5; i++) await handle(post("login", { password: "nope" + i }), ctx());
  const res = await handle(post("login", { password: ENV.ADMIN_PASSWORD }), ctx());
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("set-cookie"), null);
});

test("logout clears the cookie", async () => {
  const { handle } = setup();
  const cookie = await login(handle);
  const res = await handle(post("logout", {}, { cookie }), ctx());
  assert.equal(res.status, 200);
  assert.match(res.headers.get("set-cookie"), /^jp_admin=; .*Max-Age=0/);
});

test("unknown route is 404, wrong method is 405, both JSON", async () => {
  const { handle } = setup();
  let res = await handle(get("nothing"), ctx());
  assert.equal(res.status, 404);
  await res.json();
  res = await handle(get("ask"), ctx());
  assert.equal(res.status, 404);
  await res.json();
  res = await handle(get("publish"), ctx());
  assert.equal(res.status, 405);
  await res.json();
  res = await handle(post("history", {}), ctx());
  assert.equal(res.status, 405);
});

test("preview, publish, cancel, undo, status, history map to the service", async () => {
  const { handle, calls } = setup();
  const cookie = await login(handle);
  let res = await handle(post("preview", { id: ID }, { cookie }), ctx());
  assert.deepEqual(await res.json(), { ok: true });
  res = await handle(post("publish", { id: ID }, { cookie }), ctx());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: false, text: "Nope" });
  res = await handle(post("cancel", { id: ID }, { cookie }), ctx());
  assert.equal(res.status, 200);
  res = await handle(post("undo", { sha: "abc1234" }, { cookie }), ctx());
  assert.equal(res.status, 200);
  res = await handle(get("status?id=" + ID, cookie), ctx());
  assert.deepEqual(await res.json(), { stage: "preview", state: "building" });
  res = await handle(get("history", cookie), ctx());
  assert.deepEqual(await res.json(), { edits: [{ sha: "abc1234", when: "2026-11-01", title: "T" }] });
  assert.deepEqual(calls.map((c) => c.slice(0, 1).concat(c.slice(1))), [
    ["preview", ID], ["publish", ID], ["cancel", ID], ["undo", "abc1234"], ["status", { id: ID }], ["history"],
  ]);
});

test("bad id or sha is 400 and never reaches the service", async () => {
  const { handle, calls } = setup();
  const cookie = await login(handle);
  for (const [p, b] of [["preview", { id: "nope" }], ["publish", {}], ["cancel", { id: "../../x" }], ["undo", { sha: "zz" }], ["undo", { sha: "abc" }]]) {
    assert.equal((await handle(post(p, b, { cookie }), ctx())).status, 400, p);
  }
  assert.equal((await handle(get("status?id=bad", cookie), ctx())).status, 400);
  assert.deepEqual(calls, []);
});

test("oversize body is 413, malformed JSON is 400", async () => {
  const { handle } = setup();
  const cookie = await login(handle);
  let res = await handle(post("publish", "x".repeat(6_000_001), { cookie }), ctx());
  assert.equal(res.status, 413);
  assert.deepEqual(await res.json(), { error: "That is too big to send." });
  res = await handle(post("publish", "{nope", { cookie }), ctx());
  assert.equal(res.status, 400);
  res = await handle(post("publish", { id: ID }, { cookie, headers: { "content-length": "7000000" } }), ctx());
  assert.equal(res.status, 413);
});

test("preview, publish and undo are refused on a preview copy; the rest work", async () => {
  const { handle, calls } = setup({ canWrite: false });
  const cookie = await login(handle);
  for (const [p, b] of [["preview", { id: ID }], ["publish", { id: ID }], ["undo", { sha: "abc1234" }]]) {
    const res = await handle(post(p, b, { cookie }), ctx());
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: "This is a preview copy of the site, so publishing is turned off here." });
  }
  assert.deepEqual(calls, []);
  assert.equal((await handle(post("cancel", { id: ID }, { cookie }), ctx())).status, 200);
  assert.equal((await handle(get("history", cookie), ctx())).status, 200);
});

test("a thrown error is 500 with the generic sentence and nothing else", async () => {
  const boom = Object.assign(new Error("https://api.github.com/repos/x failed with ghp_secret_value"), { name: "FetchError" });
  const { handle, logs } = setup({ service: { history: async () => { throw boom; } } });
  const cookie = await login(handle);
  const res = await handle(get("history", cookie), ctx());
  assert.equal(res.status, 500);
  const text = await res.text();
  assert.deepEqual(JSON.parse(text), { error: "Something went wrong. Nothing changed. Try again in a minute." });
  assert.ok(!/ghp_|github|stack|at /.test(text));
  assert.deepEqual(logs.find((l) => l.event === "error"), { event: "error", route: "history", name: "FetchError" });
  assert.ok(!JSON.stringify(logs).includes("ghp_secret_value"));
});

test("missing env: 500 'not set up', names only in the log, session still works", async () => {
  const env = { ...ENV };
  delete env.GITHUB_TOKEN;
  const { handle, logs } = setup({ env });
  // Final review, item 5: signing in needs only the password and the secret.
  const cookie = await login(handle);
  let res = await handle(get("history", cookie), ctx());
  assert.equal(res.status, 500);
  const text = await res.text();
  assert.deepEqual(JSON.parse(text), { error: "The editor isn't set up yet." });
  assert.ok(!/GITHUB/.test(text));
  assert.deepEqual(logs.find((l) => l.event === "setup"), { event: "setup", missing: ["GITHUB_TOKEN"] });
  assert.ok(!JSON.stringify(logs).includes("secret"));
  res = await handle(post("cancel", { id: ID }, { cookie }), ctx());
  assert.equal(res.status, 500);
  assert.deepEqual(logs.at(-1), { event: "setup", missing: ["GITHUB_TOKEN"] });
  res = await handle(get("session", cookie), ctx());
  assert.deepEqual(await res.json(), { signedIn: true });
});

// Final review, item 5: each route checks only the variables it uses.
test("each route needs only its own variables", async () => {
  const NEEDS = {
    login: [], logout: [],
    preview: ["GITHUB_TOKEN"], publish: ["GITHUB_TOKEN", "NETLIFY_RSVP_TOKEN"], undo: ["GITHUB_TOKEN"], cancel: ["GITHUB_TOKEN"],
    history: ["GITHUB_TOKEN", "NETLIFY_RSVP_TOKEN"], content: ["GITHUB_TOKEN"], propose: ["GITHUB_TOKEN", "NETLIFY_RSVP_TOKEN"],
    status: ["GITHUB_TOKEN", "NETLIFY_RSVP_TOKEN"],
  };
  const send = (handle, route, cookie) => {
    if (route === "propose") return handle(post("propose", { ops: [{ op: "set", file: "x", path: "/a", value: 1 }] }, { cookie }), ctx());
    if (route === "content") return handle(get("content", cookie), ctx());
    if (route === "history") return handle(get("history", cookie), ctx());
    if (route === "status") return handle(get(`status?id=${ID}`, cookie), ctx());
    if (route === "login") return handle(post("login", { password: ENV.ADMIN_PASSWORD }), ctx());
    return handle(post(route, { id: ID, sha: "abc1234" }, { cookie }), ctx());
  };
  for (const gone of ["GITHUB_TOKEN", "NETLIFY_RSVP_TOKEN"]) {
    const env = { ...ENV };
    delete env[gone];
    const { handle, logs, calls } = setup({ env });
    const cookie = await login(handle);
    for (const [route, needs] of Object.entries(NEEDS)) {
      logs.length = 0;
      calls.length = 0;
      const res = await send(handle, route, cookie);
      if (needs.includes(gone)) {
        assert.equal(res.status, 500, `${route} without ${gone}`);
        assert.deepEqual(await res.json(), { error: "The editor isn't set up yet." });
        assert.deepEqual(logs, [{ event: "setup", missing: [gone] }], route);
        assert.deepEqual(calls, [], route);
      } else {
        assert.equal(res.status, 200, `${route} without ${gone}`);
      }
    }
  }
  for (const gone of ["ADMIN_PASSWORD", "SESSION_SECRET"]) {
    const env = { ...ENV };
    delete env[gone];
    const { handle, logs } = setup({ env });
    for (const route of Object.keys(NEEDS)) {
      logs.length = 0;
      const res = await send(handle, route, "");
      assert.equal(res.status, 500, `${route} without ${gone}`);
      assert.deepEqual(logs, [{ event: "setup", missing: [gone] }], route);
    }
    assert.deepEqual(await (await handle(get("session"), ctx())).json(), { signedIn: false });
  }
});

test("the real wiring builds no model client, with or without any variable set", async () => {
  const { realServiceDeps } = await import("../netlify/functions/editor.mjs");
  const env = { ADMIN_PASSWORD: ENV.ADMIN_PASSWORD, SESSION_SECRET: ENV.SESSION_SECRET };
  for (const e of [env, ENV]) {
    const deps = await realServiceDeps(e, { fetch: async () => { throw new Error("no network in tests"); }, store: memoryStore() });
    assert.equal("client" in deps, false);
    assert.equal(typeof deps.repo.head, "function");
  }
});

test("short password or secret counts as missing", async () => {
  const { handle, logs } = setup({ env: { ...ENV, ADMIN_PASSWORD: "short", SESSION_SECRET: "tiny" } });
  assert.equal((await handle(post("login", { password: "short" }), ctx())).status, 500);
  assert.deepEqual(logs[0].missing, ["ADMIN_PASSWORD", "SESSION_SECRET"]);
});

// ---- RSVP function ----------------------------------------------------------

test("rsvp: 401 without a session, 200 with one, no viewer field", async () => {
  const { handle } = setup();
  const cookie = await login(handle);
  const calls = [];
  const rsvp = createRsvpHandler({
    sessionApi, env: ENV, now: () => NOW,
    fetchSubmissions: async (token) => { calls.push(token); return { formId: "f1", submissions: [{ id: "1" }] }; },
  });
  let res = await rsvp(new Request(`${ORIGIN}/api/rsvp-responses`));
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "Sign in to see RSVP responses.", signin: true });
  assert.deepEqual(calls, []);
  res = await rsvp(new Request(`${ORIGIN}/api/rsvp-responses`, { headers: { cookie } }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.formId, "f1");
  assert.deepEqual(body.submissions, [{ id: "1" }]);
  assert.ok(body.fetchedAt);
  assert.ok(!("viewer" in body));
  assert.deepEqual(calls, [ENV.NETLIFY_RSVP_TOKEN]);
  res = await rsvp(new Request(`${ORIGIN}/api/rsvp-responses`, { method: "POST", headers: { cookie } }));
  assert.equal(res.status, 405);
});

// ---- Task 18 I --------------------------------------------------------------

test("a failure while setting up the real handler is the generic 500, logged by name only", async () => {
  const logs = [];
  const boom = Object.assign(new Error("could not load ghp_secret_value from https://api.github.com"), { name: "SetupError" });
  const handle = lazyHandler(async () => { throw boom; }, (event, fields) => logs.push({ event, ...fields }));
  const res = await handle(get("history"), ctx());
  assert.equal(res.status, 500);
  const text = await res.text();
  assert.deepEqual(JSON.parse(text), { error: "Something went wrong. Nothing changed. Try again in a minute." });
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(logs, [{ event: "error", route: "setup", name: "SetupError" }]);
  assert.ok(!JSON.stringify(logs).includes("secret"));
  // A later request tries again and works once the handler can be built.
  let tries = 0;
  const later = lazyHandler(async () => { if (tries++ === 0) throw boom; return async () => new Response("fine"); }, () => {});
  assert.equal((await later(get("history"), ctx())).status, 500);
  assert.equal(await (await later(get("history"), ctx())).text(), "fine");
});

test("the body limit counts bytes, not characters", async () => {
  const { handle } = setup();
  const cookie = await login(handle);
  const pad = "é".repeat(3_000_000); // 3,000,000 characters, 6,000,000 bytes
  const res = await handle(post("publish", { id: ID, pad }, { cookie }), ctx());
  assert.equal(res.status, 413);
});

test("only an exact application/json media type is accepted", async () => {
  const { handle } = setup();
  for (const type of ["application/jsonp", "application/json-patch+json", "application/json5", "text/plain; application/json"]) {
    const res = await handle(post("login", { password: ENV.ADMIN_PASSWORD }, { type }), ctx());
    assert.equal(res.status, 403, type);
  }
  for (const type of ["application/json", "Application/JSON; charset=utf-8", " application/json ;charset=UTF-8"]) {
    const res = await handle(post("login", { password: ENV.ADMIN_PASSWORD }, { type }), ctx(`9.9.9.${type.length}`));
    assert.equal(res.status, 200, type);
  }
});

test("rsvp: setup and loading problems are told in plain words, with the cause logged by name only", async () => {
  const { handle } = setup();
  const cookie = await login(handle);
  const logs = [];
  const make = (env, load) => createRsvpHandler({
    sessionApi, env, now: () => NOW, fetchSubmissions: load, log: (event, fields) => logs.push({ event, ...fields }),
  });
  const ask = (h) => h(new Request(`${ORIGIN}/api/rsvp-responses`, { headers: { cookie } }));
  const plain = (text) => assert.doesNotMatch(text, /token|NETLIFY|environment|variable/i);

  const env = { ...ENV };
  delete env.NETLIFY_RSVP_TOKEN;
  let res = await ask(make(env, async () => { throw new Error("unused"); }));
  assert.equal(res.status, 500);
  let body = await res.json();
  assert.deepEqual(body, { error: "The RSVP list isn't connected yet. Jeff can fix this — see the setup guide.", setup: true });
  plain(body.error);
  assert.deepEqual(logs.pop(), { event: "rsvp_setup", missing: ["NETLIFY_RSVP_TOKEN"] });

  const expired = Object.assign(new Error("Netlify API /sites/x/forms → 401 nfp_secret_value"), { status: 401 });
  res = await ask(make(ENV, async () => { throw expired; }));
  assert.equal(res.status, 502);
  body = await res.json();
  assert.deepEqual(body, { error: "The RSVP list isn't connected yet. Jeff can fix this — see the setup guide.", setup: true });
  assert.deepEqual(logs.pop(), { event: "rsvp_error", name: "Error", status: 401 });

  // 403: the access value cannot see this site. Retrying cannot fix it, so it is the setup answer too.
  const forbidden = Object.assign(new Error("Netlify API /sites/x/forms → 403"), { status: 403 });
  res = await ask(make(ENV, async () => { throw forbidden; }));
  assert.equal(res.status, 502);
  body = await res.json();
  assert.deepEqual(body, { error: "The RSVP list isn't connected yet. Jeff can fix this — see the setup guide.", setup: true });
  assert.deepEqual(logs.pop(), { event: "rsvp_error", name: "Error", status: 403 });

  const down = Object.assign(new TypeError("fetch failed"), {});
  res = await ask(make(ENV, async () => { throw down; }));
  assert.equal(res.status, 502);
  body = await res.json();
  assert.deepEqual(body, { error: "I can't load the responses right now. Try again in a minute.", setup: false });
  plain(body.error);
  assert.deepEqual(logs.pop(), { event: "rsvp_error", name: "TypeError" });
  assert.ok(!JSON.stringify(logs).includes("secret"));
});

// ---- final review, item 4: the real wiring works without SITE_ID ----

test("the real wiring asks Netlify about this site even when SITE_ID is not set", async () => {
  const { realServiceDeps } = await import("../netlify/functions/editor.mjs");
  const { DEFAULT_SITE_ID } = await import("../netlify/editor/site.mjs");
  const urls = [];
  const fakeFetch = async (url) => {
    urls.push(String(url));
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  };
  for (const [env, id] of [[{ ...ENV }, DEFAULT_SITE_ID], [{ ...ENV, SITE_ID: "my-site" }, "my-site"]]) {
    urls.length = 0;
    const deps = await realServiceDeps(env, { fetch: fakeFetch, store: memoryStore() });
    await deps.netlify.deployFor("abc1234");
    assert.ok(urls.length > 0 && urls.every((u) => u.includes(`/sites/${id}/`)), urls.join(" "));
  }
});

test("the site's fallback id is written in one shared place", async () => {
  const fs = await import("node:fs");
  const { DEFAULT_SITE_ID } = await import("../netlify/editor/site.mjs");
  assert.match(DEFAULT_SITE_ID, /^[0-9a-f-]{36}$/);
  for (const f of ["netlify/functions/editor.mjs", "netlify/functions/rsvp-responses.mjs"]) {
    const src = fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.ok(!src.includes(DEFAULT_SITE_ID), f);
    assert.match(src, /from "\.\.\/editor\/site\.mjs"/, f);
  }
});

test("the real wiring gives the service a name-only logger", async () => {
  const { realServiceDeps } = await import("../netlify/functions/editor.mjs");
  const deps = await realServiceDeps(ENV, { fetch: async () => { throw new Error("no network in tests"); }, store: memoryStore() });
  assert.equal(typeof deps.log, "function");
});

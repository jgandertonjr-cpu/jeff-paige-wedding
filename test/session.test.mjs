import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore } from "../netlify/editor/store.mjs";
import {
  checkPassword, sessionCookie, clearCookie, hasSession,
  lockState, noteFailure, noteSuccess,
} from "../netlify/editor/session.mjs";

const SECRET = "s".repeat(40);
const env = { ADMIN_PASSWORD: "correct horse", SESSION_SECRET: SECRET };
const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const valueOf = (setCookie) => setCookie.split(";")[0];

test("memoryStore round-trips, returns copies and deletes", async () => {
  const s = memoryStore();
  assert.equal(await s.get("a"), null);
  const obj = { n: [1, 2], o: { x: 1 } };
  await s.set("a", obj);
  obj.n.push(3);
  const got = await s.get("a");
  assert.deepEqual(got, { n: [1, 2], o: { x: 1 } });
  got.o.x = 99;
  assert.deepEqual(await s.get("a"), { n: [1, 2], o: { x: 1 } });
  await s.delete("a");
  assert.equal(await s.get("a"), null);
});

test("checkPassword: right, wrong, empty, unset, short", () => {
  assert.equal(checkPassword("correct horse", env), true);
  assert.equal(checkPassword("wrong", env), false);
  assert.equal(checkPassword("", env), false);
  assert.equal(checkPassword(undefined, env), false);
  assert.equal(checkPassword("", { ...env, ADMIN_PASSWORD: "" }), false);
  assert.equal(checkPassword("x", { SESSION_SECRET: SECRET }), false);
  assert.equal(checkPassword("short", { ...env, ADMIN_PASSWORD: "short" }), false);
});

test("sessionCookie has the right attributes and verifies", () => {
  const c = sessionCookie(env, NOW);
  assert.match(c, /^jp_admin=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+; HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=2592000$/);
  assert.equal(hasSession(valueOf(c), env, NOW + DAY), true);
  assert.equal(hasSession(valueOf(c), env, NOW + 29 * DAY), true);
});

test("sessionCookie can omit Secure", () => {
  const c = sessionCookie(env, NOW, { secure: false });
  assert.doesNotMatch(c, /Secure/);
  assert.match(c, /HttpOnly; SameSite=Strict; Path=\/; Max-Age=2592000$/);
});

test("clearCookie expires the cookie", () => {
  const c = clearCookie();
  assert.match(c, /^jp_admin=; HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=0$/);
});

test("hasSession parses a cookie header with several cookies", () => {
  const v = valueOf(sessionCookie(env, NOW));
  assert.equal(hasSession(`a=1; ${v}; b=2`, env, NOW), true);
  assert.equal(hasSession(`a=1;${v}`, env, NOW), true);
  assert.equal(hasSession(`  ${v}  `, env, NOW), true);
});

test("hasSession rejects tampering, expiry and other secrets", () => {
  const v = valueOf(sessionCookie(env, NOW));
  const [name, rest] = [v.slice(0, 9), v.slice(9)];
  const [payload, sig] = rest.split(".");
  const forged = Buffer.from(JSON.stringify({ exp: NOW + 400 * DAY })).toString("base64url");
  assert.equal(hasSession(`${name}${forged}.${sig}`, env, NOW), false);
  const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
  assert.equal(hasSession(`${name}${payload}.${flipped}`, env, NOW), false);
  assert.equal(hasSession(v, env, NOW + 31 * DAY), false);
  assert.equal(hasSession(v, { ...env, SESSION_SECRET: "t".repeat(40) }, NOW), false);
});

test("changing ADMIN_PASSWORD invalidates an old cookie", () => {
  const v = valueOf(sessionCookie(env, NOW));
  assert.equal(hasSession(v, { ...env, ADMIN_PASSWORD: "another password" }, NOW), false);
});

test("hasSession fails closed on junk and weak config", () => {
  const v = valueOf(sessionCookie(env, NOW));
  for (const h of [undefined, null, "", "jp_admin=", "jp_admin=abc", "jp_admin=a.b.c", "jp_admin=%%%.%%%", "other=1"]) {
    assert.equal(hasSession(h, env, NOW), false, String(h));
  }
  const notJson = Buffer.from("nope").toString("base64url");
  assert.equal(hasSession(`jp_admin=${notJson}.${notJson}`, env, NOW), false);
  assert.equal(hasSession(v, { ...env, SESSION_SECRET: undefined }, NOW), false);
  assert.equal(hasSession(v, { ...env, SESSION_SECRET: "short" }, NOW), false);
  assert.equal(hasSession(v, { ...env, ADMIN_PASSWORD: undefined }, NOW), false);
  assert.equal(hasSession(v, { ...env, ADMIN_PASSWORD: "short" }, NOW), false);
  assert.equal(hasSession(v, {}, NOW), false);
  assert.throws(() => sessionCookie({}, NOW));
});

test("lockout: 5 failures lock that address for 15 minutes only", async () => {
  const s = memoryStore();
  for (let i = 0; i < 4; i++) await noteFailure(s, "1.1.1.1", NOW + i * 1000);
  assert.deepEqual(await lockState(s, "1.1.1.1", NOW + 5000), { locked: false, minutes: 0 });
  await noteFailure(s, "1.1.1.1", NOW + 4000);
  assert.deepEqual(await lockState(s, "1.1.1.1", NOW + 4000), { locked: true, minutes: 15 });
  assert.deepEqual(await lockState(s, "1.1.1.1", NOW + 4000 + 14 * MIN + 1), { locked: true, minutes: 1 });
  assert.deepEqual(await lockState(s, "2.2.2.2", NOW + 4000), { locked: false, minutes: 0 });
});

test("lockout clears after 15 minutes", async () => {
  const s = memoryStore();
  for (let i = 0; i < 5; i++) await noteFailure(s, "1.1.1.1", NOW);
  assert.equal((await lockState(s, "1.1.1.1", NOW + 15 * MIN - 1)).locked, true);
  assert.deepEqual(await lockState(s, "1.1.1.1", NOW + 15 * MIN), { locked: false, minutes: 0 });
});

test("failures older than 15 minutes do not count toward a lock", async () => {
  const s = memoryStore();
  for (let i = 0; i < 4; i++) await noteFailure(s, "1.1.1.1", NOW);
  await noteFailure(s, "1.1.1.1", NOW + 16 * MIN);
  assert.equal((await lockState(s, "1.1.1.1", NOW + 16 * MIN)).locked, false);
});

test("success clears that address's count", async () => {
  const s = memoryStore();
  for (let i = 0; i < 4; i++) await noteFailure(s, "1.1.1.1", NOW);
  await noteSuccess(s, "1.1.1.1");
  await noteFailure(s, "1.1.1.1", NOW + 1000);
  assert.equal((await lockState(s, "1.1.1.1", NOW + 1000)).locked, false);
});

test("30 failures across addresses in an hour lock everyone for an hour", async () => {
  const s = memoryStore();
  for (let i = 0; i < 29; i++) await noteFailure(s, `10.0.0.${i}`, NOW + i * MIN);
  assert.equal((await lockState(s, "9.9.9.9", NOW + 29 * MIN)).locked, false);
  await noteFailure(s, "10.0.1.1", NOW + 29 * MIN);
  assert.deepEqual(await lockState(s, "9.9.9.9", NOW + 29 * MIN), { locked: true, minutes: 60 });
  assert.equal((await lockState(s, "9.9.9.9", NOW + 89 * MIN - 1)).locked, true);
  assert.equal((await lockState(s, "9.9.9.9", NOW + 89 * MIN)).locked, false);
});

test("site-wide failures older than an hour expire", async () => {
  const s = memoryStore();
  for (let i = 0; i < 29; i++) await noteFailure(s, `10.0.0.${i}`, NOW);
  await noteFailure(s, "10.0.1.1", NOW + 61 * MIN);
  assert.equal((await lockState(s, "9.9.9.9", NOW + 61 * MIN)).locked, false);
});

test("stored keys are safe and never contain the raw address", async () => {
  const keys = [];
  const inner = memoryStore();
  const s = { ...inner, set: (k, v) => (keys.push(k), inner.set(k, v)) };
  await noteFailure(s, "203.0.113.7", NOW);
  assert.ok(keys.length >= 2);
  for (const k of keys) {
    assert.match(k, /^[a-z0-9:_-]+$/);
    assert.ok(!k.includes("203"));
  }
});

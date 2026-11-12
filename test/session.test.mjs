import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore, casLoop } from "../netlify/editor/store.mjs";
import {
  checkPassword, sessionCookie, clearCookie, hasSession,
  lockState, noteAttempt, noteSuccess, rateKey,
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
  const mid = Math.floor(sig.length / 2);
  const flipped = sig.slice(0, mid) + (sig[mid] === "A" ? "B" : "A") + sig.slice(mid + 1);
  assert.equal(hasSession(`${name}${payload}.${flipped}`, env, NOW), false);
  assert.equal(hasSession(v, env, NOW + 31 * DAY), false);
  assert.equal(hasSession(v, { ...env, SESSION_SECRET: "t".repeat(40) }, NOW), false);
});

test("hasSession allows 5 minutes of clock difference on the 30-day cap, and no more", async () => {
  const { createHmac } = await import("node:crypto");
  const key = createHmac("sha256", env.SESSION_SECRET).update(env.ADMIN_PASSWORD).digest();
  const cookie = (obj) => {
    const p = Buffer.from(JSON.stringify(obj)).toString("base64url");
    return `jp_admin=${p}.${createHmac("sha256", key).update(p).digest().toString("base64url")}`;
  };
  // Issued by a server whose clock is ahead: the verifier is a little behind.
  assert.equal(hasSession(valueOf(sessionCookie(env, NOW + 50)), env, NOW), true);
  assert.equal(hasSession(cookie({ exp: NOW + 30 * DAY + 5 * MIN }), env, NOW), true);
  assert.equal(hasSession(cookie({ exp: NOW + 30 * DAY + 5 * MIN + 1 }), env, NOW), false);
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


test("hasSession rejects an empty signature, odd exp values and a null payload", () => {
  const v = valueOf(sessionCookie(env, NOW));
  const [payload, sig] = v.slice(9).split(".");
  assert.equal(hasSession(`jp_admin=${payload}.`, env, NOW), false);
  const signed = (obj) => {
    const p = Buffer.from(JSON.stringify(obj)).toString("base64url");
    return `jp_admin=${p}.${sig}`;
  };
  // Valid signature only matters for the real payload; these must fail either way.
  for (const bad of [{ exp: String(NOW + DAY) }, { exp: 1e400 }, { exp: Number.MAX_VALUE * 2 }, null, {}]) {
    assert.equal(hasSession(signed(bad), env, NOW), false);
  }
  // Non-canonical base64url forms of a valid signature must not verify.
  assert.equal(hasSession(`jp_admin=${payload}.${sig}=`, env, NOW), false);
  assert.equal(hasSession(`jp_admin=${payload}.${sig}A`, env, NOW), false);
  assert.equal(hasSession(`jp_admin=${payload}.${sig.slice(0, -1)}`, env, NOW), false);
});

test("hasSession rejects an exp that is not a finite number even when correctly signed", async () => {
  const { createHmac } = await import("node:crypto");
  const key = createHmac("sha256", env.SESSION_SECRET).update(env.ADMIN_PASSWORD).digest();
  const cookie = (obj) => {
    const p = Buffer.from(JSON.stringify(obj)).toString("base64url");
    return `jp_admin=${p}.${createHmac("sha256", key).update(p).digest().toString("base64url")}`;
  };
  assert.equal(hasSession(cookie({ exp: NOW + DAY }), env, NOW), true);
  assert.equal(hasSession(cookie({ exp: String(NOW + DAY) }), env, NOW), false);
  assert.equal(hasSession(cookie({ exp: 1e400 }), env, NOW), false);
  assert.equal(hasSession(cookie({ exp: NOW + 400 * DAY }), env, NOW), false);
  assert.equal(hasSession(cookie(null), env, NOW), false);
  assert.equal(hasSession(cookie([]), env, NOW), false);
});

test("memoryStore.update is atomic, even with an async fn", async () => {
  const s = memoryStore();
  await Promise.all(Array.from({ length: 50 }, () =>
    s.update("n", async (cur) => { await Promise.resolve(); return { n: (cur ? cur.n : 0) + 1 }; })));
  assert.deepEqual(await s.get("n"), { n: 50 });
  assert.equal(await s.update("n", () => null), null);
  assert.equal(await s.get("n"), null);
  assert.deepEqual(await s.update("m", () => ({ a: 1 })), { a: 1 });
});

test("casLoop retries a failed conditional write and then succeeds", async () => {
  const calls = { set: [], sleeps: 0 };
  let failures = 2;
  const blobs = {
    async getWithMetadata() { return { data: { n: 1 }, etag: "e1" }; },
    async setJSON(key, value, opts) {
      calls.set.push(opts);
      if (failures-- > 0) return { modified: false };
      return { modified: true, etag: "e2" };
    },
    async delete() {},
  };
  const out = await casLoop(blobs, "k", (cur) => ({ n: cur.n + 1 }), { sleep: async () => { calls.sleeps++; } });
  assert.deepEqual(out, { n: 2 });
  assert.equal(calls.set.length, 3);
  assert.deepEqual(calls.set[0], { onlyIfMatch: "e1" });
  assert.equal(calls.sleeps, 2);
});

test("casLoop creates with onlyIfNew when the key is absent, and gives up after 8 tries", async () => {
  const opts = [];
  const absent = {
    async getWithMetadata() { return null; },
    async setJSON(k, v, o) { opts.push(o); return { modified: true }; },
    async delete() {},
  };
  await casLoop(absent, "k", () => ({ a: 1 }), { sleep: async () => {} });
  assert.deepEqual(opts, [{ onlyIfNew: true }]);

  let tries = 0;
  const never = {
    async getWithMetadata() { return { data: {}, etag: "e" }; },
    async setJSON() { tries++; return { modified: false }; },
    async delete() {},
  };
  await assert.rejects(casLoop(never, "k", () => ({}), { sleep: async () => {} }));
  assert.equal(tries, 8);
});

test("casLoop deletes when fn returns null", async () => {
  let deleted = null;
  const blobs = {
    async getWithMetadata() { return { data: { a: 1 }, etag: "e" }; },
    async setJSON() { throw new Error("no"); },
    async delete(k) { deleted = k; },
  };
  assert.equal(await casLoop(blobs, "k", () => null, { sleep: async () => {} }), null);
  assert.equal(deleted, "k");
});

const attempts = async (s, ip, n, t = NOW) => {
  const out = [];
  for (let i = 0; i < n; i++) out.push(await noteAttempt(s, ip, t + i * 1000));
  return out;
};

test("lockout: 5 wrong attempts lock that address for 15 minutes only", async () => {
  const s = memoryStore();
  const r = await attempts(s, "1.1.1.1", 5);
  assert.ok(r.every((x) => x.allowed));
  assert.deepEqual(await lockState(s, "1.1.1.1", NOW + 4000), { locked: true, minutes: 15 });
  assert.deepEqual(await noteAttempt(s, "1.1.1.1", NOW + 5000), { allowed: false, minutes: 15 });
  assert.deepEqual(await lockState(s, "1.1.1.1", NOW + 4000 + 14 * MIN + 1), { locked: true, minutes: 1 });
  assert.deepEqual(await lockState(s, "2.2.2.2", NOW + 4000), { locked: false, minutes: 0 });
  assert.deepEqual(await noteAttempt(s, "2.2.2.2", NOW + 4000), { allowed: true, minutes: 0 });
});

test("lockout: four attempts do not lock", async () => {
  const s = memoryStore();
  await attempts(s, "1.1.1.1", 4);
  assert.deepEqual(await lockState(s, "1.1.1.1", NOW + 5000), { locked: false, minutes: 0 });
});

test("lockout clears after 15 minutes", async () => {
  const s = memoryStore();
  await attempts(s, "1.1.1.1", 5, NOW);
  const last = NOW + 4000;
  assert.equal((await lockState(s, "1.1.1.1", last + 15 * MIN - 1)).locked, true);
  assert.deepEqual(await lockState(s, "1.1.1.1", last + 15 * MIN), { locked: false, minutes: 0 });
  assert.equal((await noteAttempt(s, "1.1.1.1", last + 15 * MIN)).allowed, true);
});

test("attempts older than 15 minutes do not count toward a lock", async () => {
  const s = memoryStore();
  await attempts(s, "1.1.1.1", 4, NOW);
  const r = await attempts(s, "1.1.1.1", 2, NOW + 16 * MIN);
  assert.ok(r.every((x) => x.allowed));
});

test("success clears that address's count and is not counted site-wide", async () => {
  const s = memoryStore();
  await attempts(s, "1.1.1.1", 4);
  await noteSuccess(s, "1.1.1.1");
  const r = await attempts(s, "1.1.1.1", 5, NOW + 10_000);
  assert.ok(r.every((x) => x.allowed));
  const site = await s.get("lock:all");
  assert.equal(site.fails.length, 8);
});

test("a correct 5th and 60th attempt does not leave a lock behind", async () => {
  const s = memoryStore();
  await attempts(s, "1.1.1.1", 5);
  await noteSuccess(s, "1.1.1.1");
  assert.equal((await lockState(s, "1.1.1.1", NOW + 5000)).locked, false);
  const s2 = memoryStore();
  for (let i = 0; i < 60; i++) await noteAttempt(s2, `10.0.0.${i}`, NOW + i * 1000);
  await noteSuccess(s2, "10.0.0.59");
  assert.equal((await lockState(s2, "9.9.9.9", NOW + 61_000)).locked, false);
});

test("60 attempts across addresses in an hour lock everyone for 15 minutes", async () => {
  const s = memoryStore();
  const at = (i) => NOW + i * 59 * 1000;
  for (let i = 0; i < 59; i++) await noteAttempt(s, `10.0.0.${i}`, at(i));
  assert.equal((await lockState(s, "9.9.9.9", at(59))).locked, false);
  assert.equal((await noteAttempt(s, "10.0.1.1", at(59))).allowed, true);
  assert.deepEqual(await lockState(s, "9.9.9.9", at(59)), { locked: true, minutes: 15 });
  assert.deepEqual(await noteAttempt(s, "9.9.9.9", at(59) + MIN), { allowed: false, minutes: 14 });
  assert.equal((await lockState(s, "9.9.9.9", at(59) + 15 * MIN - 1)).locked, true);
  assert.equal((await lockState(s, "9.9.9.9", at(59) + 15 * MIN)).locked, false);
});

test("30 wrong attempts across six addresses no longer lock everyone", async () => {
  const s = memoryStore();
  for (let a = 0; a < 6; a++) for (let i = 0; i < 5; i++) await noteAttempt(s, `10.2.${a}.1`, NOW + (a * 5 + i) * 1000);
  assert.equal((await lockState(s, "9.9.9.9", NOW + MIN)).locked, false);
});

test("site-wide attempts older than an hour expire", async () => {
  const s = memoryStore();
  for (let i = 0; i < 59; i++) await noteAttempt(s, `10.0.0.${i}`, NOW);
  const r = await noteAttempt(s, "10.0.1.1", NOW + 61 * MIN);
  assert.equal(r.allowed, true);
  assert.equal((await lockState(s, "9.9.9.9", NOW + 61 * MIN)).locked, false);
});

test("50 concurrent attempts from one address: exactly 5 are allowed", async () => {
  const s = memoryStore();
  const r = await Promise.all(Array.from({ length: 50 }, () => noteAttempt(s, "1.1.1.1", NOW)));
  assert.equal(r.filter((x) => x.allowed).length, 5);
  assert.equal((await lockState(s, "1.1.1.1", NOW)).locked, true);
});

test("100 concurrent attempts from 100 addresses: exactly 60 are allowed", async () => {
  const s = memoryStore();
  const r = await Promise.all(Array.from({ length: 100 }, (_, i) => noteAttempt(s, `10.1.${i}.1`, NOW)));
  assert.equal(r.filter((x) => x.allowed).length, 60);
});

test("stored keys are safe and never contain the raw address", async () => {
  const keys = [];
  const inner = memoryStore();
  const s = { ...inner, update: (k, fn) => (keys.push(k), inner.update(k, fn)) };
  await noteAttempt(s, "203.0.113.7", NOW);
  assert.ok(keys.length >= 2);
  for (const k of keys) {
    assert.match(k, /^[a-z0-9:_-]+$/);
    assert.ok(!k.includes("203"));
  }
});

test("IPv6: addresses in the same /64 share one counter; other /64s do not", async () => {
  const s = memoryStore();
  for (let i = 1; i <= 5; i++) {
    assert.equal((await noteAttempt(s, `2001:db8:1:2::${i.toString(16)}`, NOW + i * 1000)).allowed, true);
  }
  // A new address in the same /64 is refused: the /64 is the attacker's unit.
  assert.deepEqual(await noteAttempt(s, "2001:db8:1:2:ffff:1:2:3", NOW + 6000), { allowed: false, minutes: 15 });
  // A neighbouring /64 has its own count.
  assert.deepEqual(await noteAttempt(s, "2001:db8:1:3::1", NOW + 7000), { allowed: true, minutes: 0 });
});

test("IPv6: compressed, expanded and upper-case forms of one address give the same key", () => {
  const k = rateKey("2001:db8::1");
  assert.equal(rateKey("2001:0db8:0000:0000:0000:0000:0000:0001"), k);
  assert.equal(rateKey("2001:DB8:0:0::1"), k);
  assert.equal(rateKey("2001:db8::ffff:ffff"), k);
  assert.notEqual(rateKey("2001:db8:0:1::1"), k);
  assert.equal(rateKey("::1"), rateKey("0:0:0:0:0:0:0:2"));
});

test("IPv4 keys are unchanged, an IPv4-mapped IPv6 address counts as its IPv4 address, junk is hashed as before", async () => {
  assert.equal(rateKey("::ffff:10.1.2.3"), rateKey("10.1.2.3"));
  assert.equal(rateKey("::FFFF:10.1.2.3"), rateKey("10.1.2.3"));
  assert.notEqual(rateKey("10.1.2.3"), rateKey("10.1.2.4"));
  assert.notEqual(rateKey("not an address"), rateKey("not an address 2"));
  assert.notEqual(rateKey("1:2:3"), rateKey("1:2:4"));
  assert.notEqual(rateKey("1::2::3"), rateKey("1::2::4"));
  // The IPv4 key is the hash of the address itself, as before this change.
  const { createHash } = await import("node:crypto");
  assert.equal(rateKey("10.1.2.3"), `lock:ip:${createHash("sha256").update("10.1.2.3").digest("hex").slice(0, 16)}`);
});

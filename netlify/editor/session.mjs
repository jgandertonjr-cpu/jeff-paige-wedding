import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "jp_admin";
const MAX_AGE_S = 30 * 24 * 60 * 60;
const MIN = 60 * 1000;
const IP_LIMIT = 5;
const IP_WINDOW = 15 * MIN;
const SITE_LIMIT = 30;
const SITE_WINDOW = 60 * MIN;

const sha256 = (s) => createHash("sha256").update(String(s)).digest();
const b64u = (buf) => Buffer.from(buf).toString("base64url");

function configured(env) {
  const pw = env && env.ADMIN_PASSWORD;
  const secret = env && env.SESSION_SECRET;
  return typeof pw === "string" && pw.length >= 8 && typeof secret === "string" && secret.length >= 32;
}

export function checkPassword(input, env) {
  const pw = env && env.ADMIN_PASSWORD;
  if (typeof pw !== "string" || pw.length < 8) return false;
  if (typeof input !== "string" || input === "") return false;
  return timingSafeEqual(sha256(input), sha256(pw));
}

function sign(payloadB64, env) {
  const key = createHmac("sha256", env.SESSION_SECRET).update(env.ADMIN_PASSWORD).digest();
  return createHmac("sha256", key).update(payloadB64).digest();
}

function attrs(secure) {
  return `HttpOnly; ${secure ? "Secure; " : ""}SameSite=Strict; Path=/`;
}

export function sessionCookie(env, nowMs, { secure = true } = {}) {
  if (!configured(env)) throw new Error("Sign-in is not set up.");
  const payload = b64u(JSON.stringify({ exp: nowMs + MAX_AGE_S * 1000 }));
  return `${COOKIE}=${payload}.${b64u(sign(payload, env))}; ${attrs(secure)}; Max-Age=${MAX_AGE_S}`;
}

export function clearCookie() {
  return `${COOKIE}=; ${attrs(true)}; Max-Age=0`;
}

export function hasSession(cookieHeader, env, nowMs) {
  try {
    if (!configured(env) || typeof cookieHeader !== "string") return false;
    let value = null;
    for (const part of cookieHeader.split(";")) {
      const i = part.indexOf("=");
      if (i > 0 && part.slice(0, i).trim() === COOKIE) { value = part.slice(i + 1).trim(); break; }
    }
    if (!value) return false;
    const parts = value.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
    const given = Buffer.from(parts[1], "base64url");
    const expected = sign(parts[0], env);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return Number.isFinite(payload && payload.exp) && payload.exp > nowMs;
  } catch {
    return false;
  }
}

const ipKey = (ip) => `lock:ip:${sha256(ip).toString("hex").slice(0, 16)}`;
const SITE_KEY = "lock:all";
const remaining = (rec, nowMs) => (rec && rec.until > nowMs ? rec.until - nowMs : 0);

export async function lockState(store, ip, nowMs) {
  const ms = Math.max(remaining(await store.get(ipKey(ip)), nowMs), remaining(await store.get(SITE_KEY), nowMs));
  return ms > 0 ? { locked: true, minutes: Math.ceil(ms / MIN) } : { locked: false, minutes: 0 };
}

async function bump(store, key, nowMs, limit, window) {
  const rec = (await store.get(key)) || { fails: [], until: 0 };
  const fails = (rec.fails || []).filter((t) => t > nowMs - window);
  fails.push(nowMs);
  const until = fails.length >= limit ? nowMs + window : 0;
  await store.set(key, { fails: until ? [] : fails, until });
}

export async function noteFailure(store, ip, nowMs) {
  if ((await lockState(store, ip, nowMs)).locked) return;
  await bump(store, ipKey(ip), nowMs, IP_LIMIT, IP_WINDOW);
  await bump(store, SITE_KEY, nowMs, SITE_LIMIT, SITE_WINDOW);
}

export async function noteSuccess(store, ip) {
  await store.delete(ipKey(ip));
}

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

const B64U = /^[A-Za-z0-9_-]+$/;

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
    if (parts.length !== 2 || !B64U.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;
    const given = Buffer.from(parts[1], "base64url");
    const expected = sign(parts[0], env);
    // Only the canonical encoding of the signature is accepted.
    if (b64u(given) !== parts[1] || given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const exp = payload && payload.exp;
    return typeof exp === "number" && Number.isFinite(exp) && exp > nowMs && exp <= nowMs + MAX_AGE_S * 1000;
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

// Counts one attempt in a window; the limit-th attempt is allowed but sets a
// lock, so the next one is refused. Refused attempts are not recorded.
function countAttempt(limit, window, nowMs, outcome) {
  return (rec) => {
    rec = rec || { fails: [], until: 0 };
    const fails = (rec.fails || []).filter((t) => t > nowMs - window);
    if (rec.until > nowMs) {
      outcome.wait = Math.max(outcome.wait, rec.until - nowMs);
      return { fails, until: rec.until };
    }
    fails.push(nowMs);
    return { fails, until: fails.length >= limit ? nowMs + window : 0 };
  };
}

// Call BEFORE checking the password. Records the attempt atomically and says
// whether this one may proceed.
export async function noteAttempt(store, ip, nowMs) {
  const early = await lockState(store, ip, nowMs);
  if (early.locked) return { allowed: false, minutes: early.minutes };
  const outcome = { wait: 0 };
  await store.update(ipKey(ip), (r) => countAttempt(IP_LIMIT, IP_WINDOW, nowMs, outcome)(r));
  if (outcome.wait) return { allowed: false, minutes: Math.ceil(outcome.wait / MIN) };
  await store.update(SITE_KEY, (r) => countAttempt(SITE_LIMIT, SITE_WINDOW, nowMs, outcome)(r));
  if (outcome.wait) return { allowed: false, minutes: Math.ceil(outcome.wait / MIN) };
  return { allowed: true, minutes: 0 };
}

// A correct sign-in: clear this address and give back its site-wide count.
export async function noteSuccess(store, ip) {
  await store.delete(ipKey(ip));
  await store.update(SITE_KEY, (rec) => {
    if (!rec) return null;
    const fails = (rec.fails || []).slice(0, -1);
    return { fails, until: fails.length >= SITE_LIMIT ? rec.until : 0 };
  });
}

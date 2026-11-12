import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "jp_admin";
const MAX_AGE_S = 30 * 24 * 60 * 60;
const MIN = 60 * 1000;
const IP_LIMIT = 5;
const IP_WINDOW = 15 * MIN;
const IP_LOCK = 15 * MIN;
// Site-wide: high enough that a handful of addresses cannot lock everyone out
// for long, short enough that a wide guessing run is still slowed down.
const SITE_LIMIT = 60;
const SITE_WINDOW = 60 * MIN;
const SITE_LOCK = 15 * MIN;
// Servers' clocks differ slightly; a cookie issued a moment "in the future" is fine.
const CLOCK_TOLERANCE = 5 * MIN;

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
    return typeof exp === "number" && Number.isFinite(exp) && exp > nowMs && exp <= nowMs + MAX_AGE_S * 1000 + CLOCK_TOLERANCE;
  } catch {
    return false;
  }
}

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const HEXTET = /^[0-9a-f]{1,4}$/;

// The eight 16-bit groups of an IPv6 address as numbers, or null if it does
// not parse. An embedded IPv4 tail ("::ffff:1.2.3.4") counts as two groups.
function ipv6Groups(text) {
  let s = text.toLowerCase();
  const v4 = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  let tail = [];
  if (v4) {
    if (!IPV4.test(v4[2])) return null;
    const b = v4[2].split(".").map(Number);
    tail = [(b[0] << 8) | b[1], (b[2] << 8) | b[3]];
    s = v4[1].endsWith("::") ? v4[1] : v4[1].slice(0, -1);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const part = (h) => (h === "" ? [] : h.split(":"));
  const head = part(halves[0]);
  const rest = halves.length === 2 ? part(halves[1]) : [];
  if (![...head, ...rest].every((g) => HEXTET.test(g))) return null;
  const given = head.length + rest.length + tail.length;
  if (halves.length === 1 ? given !== 8 : given > 7) return null;
  const zeros = Array(8 - given).fill(0);
  return [...head.map((g) => parseInt(g, 16)), ...zeros, ...rest.map((g) => parseInt(g, 16)), ...tail];
}

// What one sign-in counter belongs to. An IPv6 client usually controls a whole
// /64, so its first 64 bits are the unit; an IPv4-mapped address counts as the
// IPv4 address. IPv4 and anything unparseable are keyed by the text as before.
function rateUnit(ip) {
  const text = String(ip);
  if (!text.includes(":")) return text;
  const g = ipv6Groups(text);
  if (!g) return text;
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) {
    return [g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255].join(".");
  }
  return `${g.slice(0, 4).map((n) => n.toString(16)).join(":")}::/64`;
}

export const rateKey = (ip) => `lock:ip:${sha256(rateUnit(ip)).toString("hex").slice(0, 16)}`;
const ipKey = rateKey;
const SITE_KEY = "lock:all";
const remaining = (rec, nowMs) => (rec && rec.until > nowMs ? rec.until - nowMs : 0);

export async function lockState(store, ip, nowMs) {
  const ms = Math.max(remaining(await store.get(ipKey(ip)), nowMs), remaining(await store.get(SITE_KEY), nowMs));
  return ms > 0 ? { locked: true, minutes: Math.ceil(ms / MIN) } : { locked: false, minutes: 0 };
}

// Counts one attempt in a window; the limit-th attempt is allowed but sets a
// lock, so the next one is refused. Refused attempts are not recorded.
function countAttempt(limit, window, lock, nowMs, outcome) {
  return (rec) => {
    rec = rec || { fails: [], until: 0 };
    const fails = (rec.fails || []).filter((t) => t > nowMs - window);
    if (rec.until > nowMs) {
      outcome.wait = Math.max(outcome.wait, rec.until - nowMs);
      return { fails, until: rec.until };
    }
    fails.push(nowMs);
    return { fails, until: fails.length >= limit ? nowMs + lock : 0 };
  };
}

// Call BEFORE checking the password. Records the attempt atomically and says
// whether this one may proceed.
export async function noteAttempt(store, ip, nowMs) {
  const early = await lockState(store, ip, nowMs);
  if (early.locked) return { allowed: false, minutes: early.minutes };
  const outcome = { wait: 0 };
  await store.update(ipKey(ip), (r) => countAttempt(IP_LIMIT, IP_WINDOW, IP_LOCK, nowMs, outcome)(r));
  if (outcome.wait) return { allowed: false, minutes: Math.ceil(outcome.wait / MIN) };
  await store.update(SITE_KEY, (r) => countAttempt(SITE_LIMIT, SITE_WINDOW, SITE_LOCK, nowMs, outcome)(r));
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

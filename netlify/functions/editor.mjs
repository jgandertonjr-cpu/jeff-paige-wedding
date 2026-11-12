// The plain-English editor's HTTP face: /api/editor/*. This is the only file
// that reads process.env and builds the real collaborators; createHandler is
// pure wiring over injected dependencies, which is what the tests exercise.
import crypto from "node:crypto";
import * as service from "../editor/service.mjs";
import * as sessionApi from "../editor/session.mjs";
import { blobStore } from "../editor/store.mjs";
import { createGitHub } from "../editor/github.mjs";
import { createNetlify } from "../editor/netlify.mjs";
import { siteIdFrom } from "../editor/site.mjs";
import schema from "../editor/schema.gen.mjs";

const MAX_BODY = 6_000_000;
// Signing in needs only the password and the secret (the RSVP dashboard shares
// the sign-in); every other route also needs the variables it uses.
const SIGN_IN_VARS = ["ADMIN_PASSWORD", "SESSION_SECRET"];
const ROUTE_VARS = {
  login: [], logout: [], session: [],
  preview: ["GITHUB_TOKEN"], undo: ["GITHUB_TOKEN"], cancel: ["GITHUB_TOKEN"], content: ["GITHUB_TOKEN"],
  // These settle earlier unconfirmed publishes through Netlify, so they need its token too.
  publish: ["GITHUB_TOKEN", "NETLIFY_RSVP_TOKEN"], history: ["GITHUB_TOKEN", "NETLIFY_RSVP_TOKEN"],
  propose: ["GITHUB_TOKEN", "NETLIFY_RSVP_TOKEN"],
  status: ["GITHUB_TOKEN", "NETLIFY_RSVP_TOKEN"],
};
const WRITE_ROUTES = new Set(["preview", "publish", "undo"]);
const ROUTES = {
  login: "POST", logout: "POST", session: "GET", preview: "POST",
  status: "GET", publish: "POST", cancel: "POST", history: "GET", undo: "POST",
  content: "GET", propose: "POST",
};
const SAID = {
  rejected: "That can't be accepted from here. Nothing changed.",
  tooBig: "That is too big to send.",
  notSetUp: "The editor isn't set up yet.",
  failed: "Something went wrong. Nothing changed. Try again in a minute.",
  signIn: "Please sign in.",
  previewCopy: "This is a preview copy of the site, so publishing is turned off here.",
  wrongPassword: "That password didn't work.",
};

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...headers,
    },
  });

class Reject extends Error {
  constructor(status, body) { super("rejected"); this.status = status; this.body = body; }
}
const badRequest = () => new Reject(400, { error: SAID.rejected });

async function readJson(req) {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY) throw new Reject(413, { error: SAID.tooBig });
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY) throw new Reject(413, { error: SAID.tooBig });
  let body;
  try { body = JSON.parse(text); } catch { throw badRequest(); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw badRequest();
  return body;
}

function pick(value, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) throw badRequest();
  return value;
}
const ID = /^[a-f0-9]{16}$/;
const SHA = /^[a-f0-9]{7,64}$/;
// The site version the page loaded (propose's `base`): a sha, or the local test copy's first version.
const VERSION = /^(?:[a-f0-9]{7,64}|local-base)$/;

export function createHandler(deps) {
  const { service: svc, sessionApi: sess, store, serviceDeps, env, now, allowedOrigins, secureCookie, canWrite, log } = deps;

  async function route(name, req, ip) {
    if (name === "session") return json(200, { signedIn: sess.hasSession(req.headers.get("cookie"), env, now()) });

    const missing = [...SIGN_IN_VARS, ...ROUTE_VARS[name]].filter((k) => typeof env[k] !== "string" || env[k] === "" ||
      (k === "ADMIN_PASSWORD" && env[k].length < 8) || (k === "SESSION_SECRET" && env[k].length < 32));
    if (missing.length) {
      log("setup", { missing });
      return json(500, { error: SAID.notSetUp });
    }

    if (name === "login") {
      const body = await readJson(req);
      const attempt = await sess.noteAttempt(store, ip, now());
      if (!attempt.allowed) {
        return json(429, { error: `Too many tries. Wait ${attempt.minutes} minutes.`, minutes: attempt.minutes });
      }
      if (!sess.checkPassword(body.password, env)) return json(401, { error: SAID.wrongPassword });
      await sess.noteSuccess(store, ip);
      return json(200, { ok: true }, { "Set-Cookie": sess.sessionCookie(env, now(), { secure: secureCookie }) });
    }
    if (name === "logout") return json(200, { ok: true }, { "Set-Cookie": sess.clearCookie() });

    if (!sess.hasSession(req.headers.get("cookie"), env, now())) return json(401, { error: SAID.signIn });
    if (WRITE_ROUTES.has(name) && !canWrite) return json(403, { error: SAID.previewCopy });

    if (name === "content") return json(200, await svc.loadContent(serviceDeps));
    if (name === "history") return json(200, { edits: await svc.history(serviceDeps) });
    if (name === "status") {
      const id = pick(new URL(req.url).searchParams.get("id"), ID);
      return json(200, await svc.status(serviceDeps, { id }));
    }

    const body = await readJson(req);
    if (name === "propose") {
      const { ops, photos, base } = body;
      const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
      if (!Array.isArray(ops) || ops.length < 1 || ops.length > 50 || !ops.every(plain)) throw badRequest();
      if (photos !== undefined && (!Array.isArray(photos) || photos.length > 3 || !photos.every((p) => typeof p === "string"))) throw badRequest();
      if (base !== undefined) pick(base, VERSION);
      const input = { ops };
      if (photos !== undefined) input.photos = photos;
      if (base !== undefined) input.base = base;
      return json(200, await svc.propose(serviceDeps, input));
    }
    if (name === "undo") return json(200, await svc.undo(serviceDeps, pick(body.sha, SHA)));
    // preview, publish, cancel
    return json(200, await svc[name](serviceDeps, pick(body.id, ID)));
  }

  return async function handle(req, context) {
    let name = "";
    try {
      const m = /^\/api\/editor\/([^/]+)\/?$/.exec(new URL(req.url).pathname);
      name = m && Object.hasOwn(ROUTES, m[1]) ? m[1] : "";
      if (!name) return json(404, { error: "Not found." });
      if (req.method !== ROUTES[name]) return json(405, { error: "That isn't allowed." }, { Allow: ROUTES[name] });
      if (req.method === "POST") {
        const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        if (!allowedOrigins.includes(req.headers.get("origin")) || type !== "application/json") {
          return json(403, { error: SAID.rejected });
        }
      }
      return await route(name, req, (context && context.ip) || "unknown");
    } catch (err) {
      if (err instanceof Reject) return json(err.status, err.body);
      log("error", { route: name, name: (err && err.name) || "Error" });
      return json(500, { error: SAID.failed });
    }
  };
}

// ---- real wiring (built on the first request, so importing needs no env) ----

// The service's real collaborators, from the environment. Exported for tests,
// which pass their own fetch and store.
// A missing variable leaves its collaborator unusable, never a failure here:
// each route checks the variables it needs before it runs.
export async function realServiceDeps(env, { fetch: fetchImpl = fetch, store }) {
  return {
    repo: createGitHub({ token: env.GITHUB_TOKEN, repo: env.EDITOR_REPO || "jgandertonjr-cpu/jeff-paige-wedding", fetch: fetchImpl }),
    netlify: createNetlify({ token: env.NETLIFY_RSVP_TOKEN, siteId: siteIdFrom(env), fetch: fetchImpl }),
    store,
    schema,
    now: () => Date.now(),
    random: (n) => crypto.randomBytes(n).toString("hex"),
    env,
    log: logLine,
  };
}

let real;
async function realHandler(context) {
  if (real) return real;
  const env = process.env;
  const store = blobStore("editor");
  const serviceDeps = await realServiceDeps(env, { store });
  const deployContext = context && context.deploy && context.deploy.context;
  real = createHandler({
    service, sessionApi, store, serviceDeps, env,
    now: () => Date.now(),
    allowedOrigins: [env.URL, env.DEPLOY_PRIME_URL].filter(Boolean),
    secureCookie: deployContext !== "dev",
    canWrite: deployContext === "production",
    log: logLine,
  });
  return real;
}

const logLine = (event, fields) => console.error(JSON.stringify({ event, ...fields }));

// Builds the handler on first use. A failure while building it gets the same
// generic answer as any other failure, and only the error's name is logged.
export function lazyHandler(build, log) {
  return async (req, context) => {
    let handle;
    try {
      handle = await build(context);
    } catch (err) {
      log("error", { route: "setup", name: (err && err.name) || "Error" });
      return json(500, { error: SAID.failed });
    }
    return handle(req, context);
  };
}

export default lazyHandler(realHandler, logLine);

export const config = { path: "/api/editor/*" };

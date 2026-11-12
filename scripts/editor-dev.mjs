// A local server for testing the plain-English editor end to end, with no GitHub
// and no Netlify.   npm run editor:dev   (then open http://localhost:8081/admin/)
//   node scripts/editor-dev.mjs --reset   starts again from a fresh copy of the site
//
// All editor writes go to a copy of the site in .editor-local/work/, never to the
// real src/. The copy is built and served here with Netlify-like pretty URLs. A
// stand-in for Netlify "builds" each change and runs the site check on it:
//   a published change  -> rebuilds .editor-local/work/_site, and only replaces the
//                          served site when the check passes
//   a staged preview    -> builds a second copy with the staged files applied into
//                          .editor-local/previews-built/<id>/, served at /__preview/<id>/
// Sign in with the password "local-test-password". Set ANTHROPIC_API_KEY (or put
// ANTHROPIC_API_KEY=... in .editor-local/env, which is never committed) to talk to
// the real model; without it every question gets the ordinary "can't reach" reply.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { checkSite } from "./check-site.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PORT = 8081;
export const LISTEN_HOST = "127.0.0.1"; // never every network interface: the password is published in this file
const ORIGIN = `http://localhost:${PORT}`;
const COPIED = ["src", "DESIGN.md", "eleventy.config.js", "package.json", "scripts/check-site.mjs", "scripts/protected-files.json"];

// ---- static files -----------------------------------------------------------

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8", ".ics": "text/calendar; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".webmanifest": "application/manifest+json",
};
const typeOf = (file) => TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

// Which file in `root` answers a request for `urlPath`, the way Netlify's pretty URLs do:
// /details -> details.html, /study and /study/ -> study/index.html, anything else -> 404.html
// with status 404. Returns { file, status, type }; file is null when there is no 404.html either.
export function resolveStatic(root, urlPath) {
  const notFound = () => {
    const file = path.join(root, "404.html");
    return isFile(file) ? { file, status: 404, type: typeOf(file) } : { file: null, status: 404, type: "text/plain; charset=utf-8" };
  };
  let p;
  try {
    p = decodeURIComponent(String(urlPath).replace(/[?#].*$/, ""));
  } catch {
    return notFound();
  }
  if (p.includes("\0")) return notFound();
  const rel = path.posix.normalize("/" + p); // ".." cannot climb above the root
  const base = rel.replace(/^\//, "");
  const candidates = rel.endsWith("/") ? [base + "index.html"] : [base, base + ".html", base + "/index.html"];
  for (const c of candidates) {
    const file = path.join(root, c);
    if (c && file.startsWith(root + path.sep) && isFile(file)) return { file, status: 200, type: typeOf(file) };
  }
  return notFound();
}

// ---- the stand-in for Netlify ------------------------------------------------

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

// Copies of the working site are made here; `build(cwd)` must leave the built site in cwd/_site and
// `check(dir)` returns the site check's problems. Builds run one at a time.
export function createLocalNetlify({ localDir, workDir, build, check, url, log = () => {} }) {
  const stagedRoot = path.join(workDir, ".editor-local", "previews");
  const builtRoot = path.join(localDir, "previews-built");
  const jobs = new Map(); // sha -> { state, url?, id?, cancelled? }
  const previewIds = new Map(); // preview sha -> preview id
  let chain = Promise.resolve();
  const serial = (fn) => {
    const run = chain.then(fn);
    chain = run.catch(() => {});
    return run;
  };

  async function makeCopy(dest, previewId) {
    await fs.rm(dest, { recursive: true, force: true });
    await fs.mkdir(dest, { recursive: true });
    for (const rel of COPIED) {
      if (!(await exists(path.join(workDir, rel)))) continue;
      await fs.mkdir(path.dirname(path.join(dest, rel)), { recursive: true });
      await fs.cp(path.join(workDir, rel), path.join(dest, rel), { recursive: true });
    }
    if (!previewId) return;
    const staged = path.join(stagedRoot, previewId);
    await fs.cp(staged, dest, { recursive: true, filter: (src) => path.basename(src) !== "deleted.json" });
    const deleted = JSON.parse(await fs.readFile(path.join(staged, "deleted.json"), "utf8").catch(() => "[]"));
    for (const p of deleted) await fs.rm(path.join(dest, p), { force: true });
  }

  async function buildAndCheck(dest, previewId) {
    await makeCopy(dest, previewId);
    await build(dest);
    const problems = check(path.join(dest, "_site"));
    if (problems.length) throw Object.assign(new Error("site check failed"), { problems });
  }

  function start(sha, previewId) {
    const job = { state: "building", id: previewId };
    jobs.set(sha, job);
    serial(async () => {
      const dest = path.join(localDir, previewId ? "previews-src" : "publish-src", previewId || "");
      try {
        await buildAndCheck(dest, previewId);
        if (previewId) {
          if (job.cancelled) return;
          const target = path.join(builtRoot, previewId);
          await fs.rm(target, { recursive: true, force: true });
          await fs.mkdir(builtRoot, { recursive: true });
          await fs.rename(path.join(dest, "_site"), target);
          job.url = `${url}__preview/${previewId}/`;
        } else {
          const live = path.join(workDir, "_site");
          await fs.rm(live, { recursive: true, force: true });
          await fs.rename(path.join(dest, "_site"), live);
          job.url = url;
        }
        job.state = "ready";
      } catch (e) {
        job.state = "failed";
        log(`${previewId ? "preview" : "published change"} ${sha.slice(0, 7)} failed: ${e.problems ? e.problems.join(" ") : e.message}`);
      } finally {
        await fs.rm(dest, { recursive: true, force: true });
      }
    });
    return job;
  }

  // The service's `repo`, plus building: a published change and a staged preview each start a build.
  function wrapRepo(repo) {
    return {
      ...repo,
      async write(args) {
        const sha = await repo.write(args);
        start(sha);
        return sha;
      },
      async openPreview(args) {
        const opened = await repo.openPreview(args);
        previewIds.set(opened.sha, args.id);
        start(opened.sha, args.id);
        return opened;
      },
      async closePreview(args) {
        const job = [...jobs.entries()].find(([sha]) => previewIds.get(sha) === args.id)?.[1];
        if (job) job.cancelled = true;
        await repo.closePreview(args);
        await fs.rm(path.join(builtRoot, args.id), { recursive: true, force: true });
      },
    };
  }

  // Only changes this server built are known; anything else is still "waiting".
  async function deployFor(sha) {
    const job = jobs.get(sha);
    if (!job) return { state: "waiting" };
    return job.url ? { state: job.state, url: job.url } : { state: job.state };
  }

  return { wrapRepo, deployFor };
}

// Listens on this computer only, and checks that it did.
export function listenLocal(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, LISTEN_HOST, () => {
      const address = server.address();
      if (address.address !== LISTEN_HOST) {
        server.close();
        reject(new Error(`The server is listening on ${address.address}, not ${LISTEN_HOST}.`));
      } else resolve();
    });
  });
}

// ---- the server ---------------------------------------------------------------

function eleventy(cwd) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), "--quiet"], { cwd }, (err, _out, stderr) => {
      if (err) reject(new Error(`The site did not build.\n${String(stderr).trim()}`));
      else resolve();
    });
  });
}

async function freshCopy(workDir) {
  await fs.rm(workDir, { recursive: true, force: true });
  for (const rel of COPIED) {
    await fs.mkdir(path.dirname(path.join(workDir, rel)), { recursive: true });
    await fs.cp(path.join(ROOT, rel), path.join(workDir, rel), { recursive: true });
  }
}

async function toWebRequest(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  const body = chunks.length && req.method !== "GET" && req.method !== "HEAD" ? Buffer.concat(chunks) : undefined;
  return new Request(`${ORIGIN}${req.url}`, { method: req.method, headers, body });
}

async function sendWeb(res, response) {
  const headers = {};
  for (const [k, v] of response.headers) if (k !== "set-cookie") headers[k] = v;
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length) headers["set-cookie"] = cookies;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function sendFile(res, method, found) {
  if (!found.file) {
    res.writeHead(404, { "content-type": found.type });
    return res.end("Not found");
  }
  const body = await fs.readFile(found.file);
  res.writeHead(found.status, { "content-type": found.type, "content-length": body.length, "cache-control": "no-store" });
  res.end(method === "HEAD" ? undefined : body);
}

// Reads the optional .editor-local/env file: KEY=value lines, "#" comments, values
// trimmed and taken as written. Only ANTHROPIC_API_KEY is honoured; anything else is
// ignored. Returns {} when there is nothing usable.
export function parseLocalEnv(text) {
  const out = {};
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const name = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (name === "ANTHROPIC_API_KEY" && value) out.ANTHROPIC_API_KEY = value;
  }
  return out;
}

async function readLocalEnv(localDir) {
  try {
    return parseLocalEnv(await fs.readFile(path.join(localDir, "env"), "utf8"));
  } catch {
    return {};
  }
}

async function main() {
  const localDir = path.join(ROOT, ".editor-local");
  const workDir = path.join(localDir, "work");
  const siteDir = path.join(workDir, "_site");
  const builtRoot = path.join(localDir, "previews-built");

  const [{ default: Anthropic }, service, sessionApi, { memoryStore }, { createLocalRepo }, { createHandler }, { createRsvpHandler }, { default: schema }] = await Promise.all([
    import("@anthropic-ai/sdk"),
    import("../netlify/editor/service.mjs"),
    import("../netlify/editor/session.mjs"),
    import("../netlify/editor/store.mjs"),
    import("../netlify/editor/localrepo.mjs"),
    import("../netlify/functions/editor.mjs"),
    import("../netlify/functions/rsvp-responses.mjs"),
    import("../netlify/editor/schema.gen.mjs"),
  ]);

  const reset = process.argv.includes("--reset");
  if (reset || !(await exists(workDir))) {
    console.log("editor-dev: making a fresh working copy of the site in .editor-local/work/");
    await fs.rm(builtRoot, { recursive: true, force: true });
    await freshCopy(workDir);
  }
  console.log("editor-dev: building the working copy...");
  await eleventy(workDir);
  const startup = checkSite(siteDir, { protectedFile: path.join(ROOT, "scripts/protected-files.json") });
  if (startup.length) console.warn(`editor-dev: the site check found problems:\n  - ${startup.join("\n  - ")}`);

  const netlify = createLocalNetlify({
    localDir, workDir, url: `${ORIGIN}/`, log: (m) => console.log(`editor-dev: ${m}`),
    build: eleventy,
    check: (dir) => checkSite(dir, { protectedFile: path.join(ROOT, "scripts/protected-files.json") }),
  });

  const key = process.env.ANTHROPIC_API_KEY || (await readLocalEnv(localDir)).ANTHROPIC_API_KEY || ""; // never printed
  let client;
  if (key) {
    client = new Anthropic({ apiKey: key });
  } else {
    console.log("editor-dev: ANTHROPIC_API_KEY is not set, so the editor will answer \"can't reach\" to every question. Put ANTHROPIC_API_KEY=… in .editor-local/env to use the real model.");
    client = { beta: { messages: { create: async () => { throw new Anthropic.APIConnectionError({ message: "no key" }); } } } };
  }

  const env = {
    ADMIN_PASSWORD: "local-test-password",
    SESSION_SECRET: "0123456789abcdef".repeat(4),
    ANTHROPIC_API_KEY: key || "not-set", // the handler refuses to run with this empty; the stub client below never uses it
    GITHUB_TOKEN: "local",
    NETLIFY_RSVP_TOKEN: "local",
  };
  const store = memoryStore();
  const serviceDeps = {
    repo: netlify.wrapRepo(createLocalRepo({ root: workDir })),
    netlify, store, client, schema, env,
    now: Date.now,
    random: (n) => crypto.randomBytes(n).toString("hex"),
  };
  const editor = createHandler({
    service, sessionApi, store, serviceDeps, env,
    now: Date.now,
    allowedOrigins: [ORIGIN],
    secureCookie: false,
    canWrite: true,
    log: (event, fields) => console.error(JSON.stringify({ event, ...fields })),
  });
  const rsvp = createRsvpHandler({ sessionApi, env, now: Date.now, fetchSubmissions: async () => ({ formId: null, submissions: [] }) });

  const server = http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, ORIGIN);
      if (pathname.startsWith("/api/editor/")) return sendWeb(res, await editor(await toWebRequest(req), { ip: req.socket.remoteAddress }));
      if (pathname === "/api/rsvp-responses") return sendWeb(res, await rsvp(await toWebRequest(req)));
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { allow: "GET, HEAD" });
        return res.end();
      }
      const preview = /^\/__preview\/([0-9a-f]{16})(\/.*)?$/.exec(pathname);
      if (preview) {
        if (!preview[2]) {
          res.writeHead(302, { location: `/__preview/${preview[1]}/` });
          return res.end();
        }
        return sendFile(res, req.method, resolveStatic(path.join(builtRoot, preview[1]), preview[2]));
      }
      return sendFile(res, req.method, resolveStatic(siteDir, pathname));
    } catch (e) {
      console.error(`editor-dev: ${e.name}`);
      res.writeHead(500);
      res.end("Something went wrong.");
    }
  });
  await listenLocal(server, PORT);
  console.log("editor-dev: the working copy in .editor-local/work/ keeps earlier edits until you run with --reset.");
  console.log(`editor-dev: ready at ${ORIGIN}/  (this computer only; sign in with local-test-password)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

// The local test server's two testable parts: the static file resolver and the
// stand-in for Netlify. (The server itself is not started here.)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveStatic, createLocalNetlify } from "../scripts/editor-dev.mjs";
import { createLocalRepo } from "../netlify/editor/localrepo.mjs";

let tmp;
before(async () => { tmp = await fs.mkdtemp(path.join(os.tmpdir(), "editor-dev-")); });
after(() => fs.rm(tmp, { recursive: true, force: true }));

test("pretty URLs resolve like Netlify's", async () => {
  const site = path.join(tmp, "site");
  for (const f of ["index.html", "details.html", "404.html", "study/index.html", "css/a.css", "wedding.ics"]) {
    await fs.mkdir(path.dirname(path.join(site, f)), { recursive: true });
    await fs.writeFile(path.join(site, f), f);
  }
  const at = (u) => resolveStatic(site, u);
  assert.deepEqual([at("/").status, path.basename(at("/").file)], [200, "index.html"]);
  assert.equal(path.basename(at("/details").file), "details.html");
  assert.equal(path.basename(at("/details.html").file), "details.html");
  assert.equal(at("/study").file, path.join(site, "study/index.html"));
  assert.equal(at("/study/").file, path.join(site, "study/index.html"));
  assert.match(at("/css/a.css").type, /^text\/css/);
  assert.match(at("/wedding.ics").type, /^text\/calendar/);
  assert.match(at("/details?x=1").type, /^text\/html/);
  const missing = at("/nope");
  assert.equal(missing.status, 404);
  assert.equal(path.basename(missing.file), "404.html");
  assert.equal(at("/../site2/secret").status, 404);
  assert.equal(at("/%2e%2e/x").status, 404);
});

// A build stand-in: copies src/page.txt to _site/index.html, failing when it says BROKEN.
async function build(cwd) {
  const text = await fs.readFile(path.join(cwd, "src/page.txt"), "utf8");
  if (text.includes("BROKEN")) throw new Error("build failed");
  await fs.mkdir(path.join(cwd, "_site"), { recursive: true });
  await fs.writeFile(path.join(cwd, "_site/index.html"), text);
}

async function setup(name, check = () => []) {
  const localDir = path.join(tmp, name, ".editor-local");
  const workDir = path.join(localDir, "work");
  await fs.mkdir(path.join(workDir, "src"), { recursive: true });
  await fs.writeFile(path.join(workDir, "src/page.txt"), "original");
  const repo = createLocalRepo({ root: workDir });
  const stand = createLocalNetlify({ localDir, workDir, build, check, url: "http://localhost:8081/" });
  return { workDir, localDir, repo: stand.wrapRepo(repo), netlify: stand };
}
async function settled(netlify, sha) {
  for (let i = 0; i < 100; i++) {
    const d = await netlify.deployFor(sha);
    if (d.state !== "building") return d;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("still building");
}
const ID = "0123456789abcdef";

test("a staged preview is built on its own and reports ready with its own address", async () => {
  const { repo, netlify, workDir, localDir } = await setup("ok");
  const { sha } = await repo.openPreview({ id: ID, files: { "src/page.txt": "previewed" } });
  assert.deepEqual(await settled(netlify, sha), { state: "ready", url: `http://localhost:8081/__preview/${ID}/` });
  assert.equal(await fs.readFile(path.join(localDir, "previews-built", ID, "index.html"), "utf8"), "previewed");
  assert.equal(await fs.readFile(path.join(workDir, "src/page.txt"), "utf8"), "original"); // the real copy is untouched
});

test("a staged preview that breaks the build reports failed", async () => {
  const { repo, netlify } = await setup("broken");
  const { sha } = await repo.openPreview({ id: ID, files: { "src/page.txt": "BROKEN" } });
  assert.equal((await settled(netlify, sha)).state, "failed");
});

test("a staged preview that fails the site check reports failed", async () => {
  const { repo, netlify } = await setup("checked", () => ["The Travel page is missing from the site."]);
  const { sha } = await repo.openPreview({ id: ID, files: { "src/page.txt": "fine" } });
  assert.equal((await settled(netlify, sha)).state, "failed");
});

test("a published change rebuilds the site; one that fails the check leaves the live site as it was", async () => {
  let problems = [];
  const { repo, netlify, workDir } = await setup("publish", () => problems);
  const first = await repo.write({ baseSha: await repo.head(), message: "Website edit: one", files: { "src/page.txt": "one" } });
  assert.deepEqual(await settled(netlify, first), { state: "ready", url: "http://localhost:8081/" });
  assert.equal(await fs.readFile(path.join(workDir, "_site/index.html"), "utf8"), "one");

  problems = ["The site check found something."];
  const second = await repo.write({ baseSha: first, message: "Website edit: two", files: { "src/page.txt": "two" } });
  assert.equal((await settled(netlify, second)).state, "failed");
  assert.equal(await fs.readFile(path.join(workDir, "_site/index.html"), "utf8"), "one");
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalRepo } from "../netlify/editor/localrepo.mjs";
import { StaleError } from "../netlify/editor/github.mjs";

let root;
let repo;
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "localrepo-"));
  await fs.mkdir(path.join(root, "src/images"), { recursive: true });
  await fs.writeFile(path.join(root, "src/images/a.jpg"), "x");
  await fs.writeFile(path.join(root, "src/images/notes"), "x");
  await fs.writeFile(path.join(root, "src/old.json"), "old\n");
  repo = createLocalRepo({ root });
});
after(() => fs.rm(root, { recursive: true, force: true }));

test("an empty repo has head local-base and no edits", async () => {
  assert.equal(await repo.head(), "local-base");
  assert.deepEqual(await repo.edits(10), []);
});

test("write then read, with before-state, log, edits and changeOf", async () => {
  const sha = await repo.write({
    branch: "main",
    baseSha: "local-base",
    message: "Website edit: Change it",
    files: {
      "src/new/deep/a.json": "A\n",
      "src/old.json": null,
      "src/images/b.png": { base64: Buffer.from("PNG").toString("base64") },
    },
  });
  assert.match(sha, /^[0-9a-f]{40}$/);
  assert.equal(await repo.head(), sha);
  assert.deepEqual(await repo.readFiles(["src/new/deep/a.json", "src/old.json"], "anything"), { "src/new/deep/a.json": "A\n" });
  assert.equal(await fs.readFile(path.join(root, "src/images/b.png"), "utf8"), "PNG");

  const log = JSON.parse(await fs.readFile(path.join(root, ".editor-local/log.json"), "utf8"));
  assert.equal(log.length, 1);
  assert.equal(log[0].parent, "local-base");
  assert.deepEqual(log[0].before, { "src/new/deep/a.json": null, "src/old.json": "old\n", "src/images/b.png": null });
  assert.deepEqual(log[0].paths.sort(), ["src/images/b.png", "src/new/deep/a.json", "src/old.json"]);

  const edits = await repo.edits(10);
  assert.deepEqual(edits.map((e) => [e.sha, e.title]), [[sha, "Change it"]]);
  assert.ok(!Number.isNaN(Date.parse(edits[0].date)));
  assert.deepEqual((await repo.changeOf(sha)).parent, "local-base");
  assert.deepEqual((await repo.changeOf(sha)).paths.sort(), log[0].paths.sort());
});

test("edits lists newest first, skips other messages and honours the limit", async () => {
  const h1 = await repo.head();
  const h2 = await repo.write({ branch: "main", baseSha: h1, message: "Other", files: { "z.txt": "z" } });
  const h3 = await repo.write({ branch: "main", baseSha: h2, message: "Website edit: Third", files: { "y.txt": "y" } });
  assert.deepEqual((await repo.edits(10)).map((e) => e.title), ["Third", "Change it"]);
  assert.deepEqual((await repo.edits(1)).map((e) => e.sha), [h3]);
});

test("write with a stale baseSha throws StaleError and changes nothing", async () => {
  await assert.rejects(
    repo.write({ branch: "main", baseSha: "local-base", message: "m", files: { "q.txt": "q" } }),
    StaleError,
  );
  await assert.rejects(fs.access(path.join(root, "q.txt")));
});

test("listImages lists files in src/images as /images/<name>; missing folder is empty", async () => {
  assert.deepEqual([...(await repo.listImages("main"))].sort(), ["/images/a.jpg", "/images/b.png", "/images/notes"]);
  const empty = await fs.mkdtemp(path.join(os.tmpdir(), "localrepo-empty-"));
  try {
    assert.equal((await createLocalRepo({ root: empty }).listImages("main")).size, 0);
  } finally {
    await fs.rm(empty, { recursive: true, force: true });
  }
});

test("openPreview writes and returns number 0; closePreview does nothing", async () => {
  const base = await repo.head();
  const out = await repo.openPreview({ id: "abc12345", baseSha: base, message: "Preview", files: { "p.txt": "p" } });
  assert.equal(out.number, 0);
  assert.equal(out.sha, await repo.head());
  await repo.closePreview({ id: "abc12345", number: 0 });
});

test("paths that escape the root are rejected", async () => {
  const base = await repo.head();
  await assert.rejects(repo.write({ branch: "main", baseSha: base, message: "m", files: { "../evil": "x" } }));
  await assert.rejects(repo.readFiles(["/etc/passwd"], "main"));
});

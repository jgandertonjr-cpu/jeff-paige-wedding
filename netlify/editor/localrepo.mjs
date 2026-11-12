// The same interface as github.mjs, over a plain folder, for local
// end-to-end testing. The change log lives in <root>/.editor-local/log.json.
//
// readFiles(paths, ref) reads the working files; ref is ignored because a
// plain folder has no history to read from.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { StaleError, assertRelativePath } from "./github.mjs";

const BASE = "local-base";
const PREFIX = "Website edit: ";
const LOG_DIR = ".editor-local";

export function createLocalRepo({ root }) {
  const logFile = path.join(root, LOG_DIR, "log.json");

  const safe = (p) => {
    assertRelativePath(p);
    if (p === LOG_DIR || p.startsWith(`${LOG_DIR}/`)) throw new Error("Invalid file path");
    return path.join(root, p);
  };

  async function readLog() {
    try {
      return JSON.parse(await fs.readFile(logFile, "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") return [];
      throw e;
    }
  }

  async function readText(file) {
    try {
      return await fs.readFile(file, "utf8");
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }

  async function head() {
    const log = await readLog();
    return log.length ? log[log.length - 1].sha : BASE;
  }

  async function readFiles(paths) {
    const out = {};
    for (const p of paths) {
      const text = await readText(safe(p));
      if (text !== null) out[p] = text;
    }
    return out;
  }

  async function listImages() {
    try {
      const entries = await fs.readdir(path.join(root, "src/images"), { withFileTypes: true });
      return new Set(entries.filter((e) => e.isFile()).map((e) => `/images/${e.name}`));
    } catch (e) {
      if (e.code === "ENOENT") return new Set();
      throw e;
    }
  }

  async function write({ baseSha, message, files }) {
    const paths = Object.keys(files);
    const targets = paths.map(safe); // validate everything before touching disk
    const log = await readLog();
    const current = log.length ? log[log.length - 1].sha : BASE;
    if (current !== baseSha) throw new StaleError();

    const before = {};
    for (let i = 0; i < paths.length; i++) before[paths[i]] = await readText(targets[i]);

    for (let i = 0; i < paths.length; i++) {
      const f = files[paths[i]];
      if (f === null) {
        await fs.rm(targets[i], { force: true });
        continue;
      }
      await fs.mkdir(path.dirname(targets[i]), { recursive: true });
      await fs.writeFile(targets[i], typeof f === "string" ? f : Buffer.from(f.base64, "base64"));
    }

    const sha = crypto.randomBytes(20).toString("hex");
    log.push({ sha, parent: current, message, date: new Date().toISOString(), paths, before });
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    const tmp = `${logFile}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(log, null, 2) + "\n");
    await fs.rename(tmp, logFile);
    return sha;
  }

  async function edits(limit) {
    const log = await readLog();
    const out = [];
    for (let i = log.length - 1; i >= 0 && out.length < limit; i--) {
      const first = String(log[i].message).split("\n")[0];
      if (first.startsWith(PREFIX)) out.push({ sha: log[i].sha, date: log[i].date, title: first.slice(PREFIX.length) });
    }
    return out;
  }

  async function changeOf(sha) {
    const entry = (await readLog()).find((e) => e.sha === sha);
    if (!entry) throw new Error("Unknown change");
    return { parent: entry.parent, paths: [...entry.paths] };
  }

  // A preview is just a write; there is no separate branch or pull request.
  async function openPreview({ baseSha, message, files }) {
    const sha = await write({ baseSha, message, files });
    return { number: 0, sha };
  }

  async function closePreview() {}

  return { head, readFiles, listImages, write, openPreview, closePreview, edits, changeOf };
}

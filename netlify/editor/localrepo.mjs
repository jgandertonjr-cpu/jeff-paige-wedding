// The same interface as github.mjs, over a plain folder, for local
// end-to-end testing. The change log lives in <root>/.editor-local/log.json.
//
// readFiles(paths, ref) reads the files as they were at `ref` when it is a
// change in the log (or "local-base", before the first change), by walking the
// log back from the working files. Any other ref reads the working files.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { StaleError, assertRelativePath, assertPreviewId } from "./github.mjs";

const BASE = "local-base";
const PREFIX = "Website edit: ";
const LOG_DIR = ".editor-local";

export function createLocalRepo({ root }) {
  const logFile = path.join(root, LOG_DIR, "log.json");

  const safe = (p) => {
    assertRelativePath(p);
    // Case-insensitive: macOS folders are, so ".EDITOR-LOCAL" is the same place.
    if (p.split("/")[0].toLowerCase() === LOG_DIR) throw new Error("Invalid file path");
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

  // Previous content for the undo record: a string, { base64 } when the
  // file is not valid UTF-8, or null when absent.
  async function readBefore(file) {
    try {
      const buf = await fs.readFile(file);
      const text = buf.toString("utf8");
      return Buffer.from(text, "utf8").equals(buf) ? text : { base64: buf.toString("base64") };
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }

  async function head() {
    const log = await readLog();
    return log.length ? log[log.length - 1].sha : BASE;
  }

  const asText = (v) => (v !== null && typeof v === "object" ? Buffer.from(v.base64, "base64").toString("utf8") : v);

  async function readFiles(paths, ref) {
    const files = paths.map(safe);
    const log = ref === undefined ? [] : await readLog();
    const at = ref === BASE ? -1 : log.findIndex((e) => e.sha === ref);
    const later = ref === BASE || at >= 0 ? log.slice(at + 1).reverse() : [];
    const out = {};
    for (let i = 0; i < paths.length; i++) {
      let text = await readText(files[i]);
      for (const entry of later) {
        if (entry.paths.includes(paths[i])) text = asText(entry.before[paths[i]]);
      }
      if (text !== null) out[paths[i]] = text;
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
    for (let i = 0; i < paths.length; i++) before[paths[i]] = await readBefore(targets[i]);

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

  // A preview is staged under .editor-local/previews/<id>/ and never touches
  // the working files, the log or head(). Deleted paths go in deleted.json.
  const previewDir = (id) => path.join(root, LOG_DIR, "previews", assertPreviewId(id));

  async function openPreview({ id, files }) {
    const dir = previewDir(id);
    const paths = Object.keys(files);
    paths.forEach(safe);
    const deleted = [];
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    for (const p of paths) {
      const f = files[p];
      if (f === null) {
        deleted.push(p);
        continue;
      }
      const target = path.join(dir, p);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, typeof f === "string" ? f : Buffer.from(f.base64, "base64"));
    }
    await fs.writeFile(path.join(dir, "deleted.json"), JSON.stringify(deleted, null, 2) + "\n");
    return { number: 0, sha: crypto.randomBytes(20).toString("hex") };
  }

  async function closePreview({ id }) {
    await fs.rm(previewDir(id), { recursive: true, force: true });
  }

  return { head, readFiles, listImages, write, openPreview, closePreview, edits, changeOf };
}

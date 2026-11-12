// GitHub client over the REST API. Collaborators (token, repo, fetch) are
// passed in; nothing here reads process.env. Errors carry only the status:
// never a URL, token or response body.

const API = "https://api.github.com";
const PREVIEW_ID = /^[a-z0-9]{8,32}$/;

export class StaleError extends Error {
  constructor(message = "The site changed since this edit was prepared") {
    super(message);
    this.name = "StaleError";
  }
}

// Defence in depth: the real allowlist lives in another module.
export function assertRelativePath(p) {
  const ok =
    typeof p === "string" &&
    p.length > 0 &&
    !p.startsWith("/") &&
    !p.includes("\\") &&
    !p.includes("\0") &&
    p.split("/").every((seg) => seg !== "" && seg !== "." && seg !== "..");
  if (!ok) throw new Error("Invalid file path");
  return p;
}

export function assertPreviewId(id) {
  if (typeof id !== "string" || !PREVIEW_ID.test(id)) throw new Error("Invalid preview id");
  return id;
}

const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

export function createGitHub({ token, repo, fetch }) {
  const base = `${API}/repos/${repo}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "jeffandpaige-editor",
  };

  // Returns { status, data }. Statuses listed in `allow` are returned
  // instead of thrown.
  async function call(method, path, body, allow = []) {
    const init = { method, headers: body === undefined ? headers : { ...headers, "Content-Type": "application/json" } };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(`${base}${path}`, init);
    if (!res.ok && !allow.includes(res.status)) {
      throw new Error(`GitHub request failed (${res.status})`);
    }
    if (!res.ok || res.status === 204 || method === "DELETE") return { status: res.status, data: null };
    try {
      return { status: res.status, data: await res.json() };
    } catch {
      // Never surface the parser's message: it can quote response text.
      throw new Error(`GitHub request failed (${res.status})`);
    }
  }

  const branchPath = (branch) => {
    if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes("..")) throw new Error("Invalid branch name");
    return branch;
  };

  async function head(branch = "main") {
    const { data } = await call("GET", `/git/ref/heads/${branchPath(branch)}`);
    return data.object.sha;
  }

  async function readOne(path, ref) {
    const { status, data } = await call(
      "GET",
      `/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
      undefined,
      [404],
    );
    if (status === 404) return undefined;
    let content = data.content;
    if (!content) {
      // Over 1 MB the contents API omits the body; use the blob instead.
      const blob = await call("GET", `/git/blobs/${data.sha}`);
      content = blob.data.content;
    }
    return Buffer.from(content, "base64").toString("utf8");
  }

  async function readFiles(paths, ref) {
    paths.forEach(assertRelativePath);
    const out = {};
    for (const p of paths) {
      const text = await readOne(p, ref);
      if (text !== undefined) out[p] = text;
    }
    return out;
  }

  async function listImages(ref) {
    const { status, data } = await call(
      "GET",
      `/contents/src/images?ref=${encodeURIComponent(ref)}`,
      undefined,
      [404],
    );
    if (status === 404) return new Set();
    return new Set(data.filter((e) => e.type === "file").map((e) => `/images/${e.name}`));
  }

  async function write({ branch, baseSha, message, files }) {
    const paths = Object.keys(files);
    paths.forEach(assertRelativePath);
    const ref = `/git/refs/heads/${branchPath(branch)}`;
    if ((await head(branch)) !== baseSha) throw new StaleError();

    const entries = [];
    for (const path of paths) {
      const f = files[path];
      const entry = { path, mode: "100644", type: "blob" };
      if (f === null) {
        entry.sha = null;
      } else if (typeof f === "string") {
        entry.content = f;
      } else {
        const { data } = await call("POST", "/git/blobs", { content: f.base64, encoding: "base64" });
        entry.sha = data.sha;
      }
      entries.push(entry);
    }
    const parent = await call("GET", `/git/commits/${baseSha}`);
    const tree = await call("POST", "/git/trees", { base_tree: parent.data.tree.sha, tree: entries });
    const commit = await call("POST", "/git/commits", { message, tree: tree.data.sha, parents: [baseSha] });
    const moved = await call("PATCH", ref, { sha: commit.data.sha, force: false }, [409, 422]);
    if (moved.status === 409 || moved.status === 422) throw new StaleError();
    return commit.data.sha;
  }

  async function openPreview({ id, baseSha, message, files }) {
    assertPreviewId(id);
    const branch = `edit/${id}`;
    await call("POST", "/git/refs", { ref: `refs/heads/${branch}`, sha: baseSha });
    try {
      const sha = await write({ branch, baseSha, message, files });
      const pr = await call("POST", "/pulls", {
        title: `Preview: ${message}`,
        head: branch,
        base: "main",
        draft: true,
      });
      return { number: pr.data.number, sha };
    } catch (err) {
      // Don't leave an orphan branch behind; the original error wins.
      try {
        await call("DELETE", `/git/refs/heads/${branch}`, undefined, [404, 422]);
      } catch {}
      throw err;
    }
  }

  async function closePreview({ id, number }) {
    assertPreviewId(id);
    if (!Number.isInteger(number) || number < 1) throw new Error("Invalid pull request number");
    // Either may already be gone.
    await call("PATCH", `/pulls/${number}`, { state: "closed" }, [404, 422]);
    await call("DELETE", `/git/refs/heads/edit/${id}`, undefined, [404, 422]);
  }

  const PREFIX = "Website edit: ";
  async function edits(limit) {
    const { data } = await call("GET", "/commits?sha=main&per_page=100");
    const out = [];
    for (const c of data) {
      const first = String(c.commit.message).split("\n")[0];
      if (!first.startsWith(PREFIX)) continue;
      out.push({ sha: c.sha, date: c.commit.committer.date, title: first.slice(PREFIX.length) });
      if (out.length >= limit) break;
    }
    return out;
  }

  async function changeOf(sha) {
    const { data } = await call("GET", `/commits/${encodeURIComponent(sha)}`);
    return { parent: data.parents?.[0]?.sha ?? null, paths: (data.files || []).map((f) => f.filename) };
  }

  return { head, readFiles, listImages, write, openPreview, closePreview, edits, changeOf };
}

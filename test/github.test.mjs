import { test } from "node:test";
import assert from "node:assert/strict";
import { createGitHub, StaleError } from "../netlify/editor/github.mjs";

const TOKEN = "ghp_secrettoken123";
const REPO = "owner/site";
const b64 = (s) => Buffer.from(s).toString("base64");

// Scripted fetch: routes is a list of [METHOD, regex on path+query, handler(body, url)].
// A handler returns { status?, json? }. Every call is recorded.
function fake(routes) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, url, path: u.pathname + u.search, headers: init.headers, body });
    for (const [m, re, fn] of routes) {
      if (m === method && re.test(u.pathname + u.search)) {
        const r = await fn(body, u);
        const status = r.status ?? 200;
        return {
          ok: status >= 200 && status < 300,
          status,
          json: async () => {
            if (r.empty) throw new SyntaxError("Unexpected end of JSON input: BODYTEXT");
            return r.json ?? {};
          },
          text: async () => JSON.stringify(r.json ?? {}),
        };
      }
    }
    throw new Error("unscripted request: " + method + " " + u.pathname);
  };
  return { fetch, calls };
}

const gh = (routes) => {
  const f = fake(routes);
  return { ...f, repo: createGitHub({ token: TOKEN, repo: REPO, fetch: f.fetch }) };
};

const writeRoutes = (branch = "main", extra = []) => [
  ["GET", new RegExp(`/git/ref/heads/${branch}$`), () => ({ json: { object: { sha: "base1" } } })],
  ["POST", /\/git\/blobs$/, () => ({ status: 201, json: { sha: "blob1" } })],
  ["GET", /\/git\/commits\/base1$/, () => ({ json: { tree: { sha: "tree0" } } })],
  ["POST", /\/git\/trees$/, () => ({ status: 201, json: { sha: "tree1" } })],
  ["POST", /\/git\/commits$/, () => ({ status: 201, json: { sha: "commit1" } })],
  ["PATCH", new RegExp(`/git/refs/heads/${branch}$`), () => ({ json: {} })],
  ...extra,
];

test("head returns the branch sha, sending the required headers", async () => {
  const { repo, calls } = gh([["GET", /\/git\/ref\/heads\/main$/, () => ({ json: { object: { sha: "abc" } } })]]);
  assert.equal(await repo.head(), "abc");
  assert.equal(calls[0].url, `https://api.github.com/repos/${REPO}/git/ref/heads/main`);
  assert.deepEqual(calls[0].headers, {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "jeffandpaige-editor",
  });
});

test("write: blobs, tree with base_tree, commit with parent, then ref update with force false", async () => {
  const { repo, calls } = gh(writeRoutes());
  const sha = await repo.write({
    branch: "main",
    baseSha: "base1",
    message: "Website edit: x",
    files: { "src/a.json": "{}\n", "src/images/p.jpg": { base64: "QUJD" }, "src/old.json": null },
  });
  assert.equal(sha, "commit1");
  const seq = calls.map((c) => c.method + " " + c.path.replace(`/repos/${REPO}`, ""));
  assert.deepEqual(seq, [
    "GET /git/ref/heads/main",
    "POST /git/blobs",
    "GET /git/commits/base1",
    "POST /git/trees",
    "POST /git/commits",
    "PATCH /git/refs/heads/main",
  ]);
  assert.deepEqual(calls[1].body, { content: "QUJD", encoding: "base64" });
  const tree = calls[3].body;
  assert.equal(tree.base_tree, "tree0");
  const byPath = Object.fromEntries(tree.tree.map((e) => [e.path, e]));
  assert.equal(byPath["src/a.json"].content, "{}\n");
  assert.equal(byPath["src/a.json"].mode, "100644");
  assert.equal(byPath["src/images/p.jpg"].sha, "blob1");
  assert.equal(byPath["src/old.json"].sha, null);
  assert.deepEqual(calls[4].body, { message: "Website edit: x", tree: "tree1", parents: ["base1"] });
  assert.deepEqual(calls[5].body, { sha: "commit1", force: false });
});

test("write throws StaleError before writing when the branch has moved", async () => {
  const { repo, calls } = gh([["GET", /\/git\/ref\/heads\/main$/, () => ({ json: { object: { sha: "other" } } })]]);
  await assert.rejects(
    repo.write({ branch: "main", baseSha: "base1", message: "m", files: { "a.txt": "x" } }),
    StaleError,
  );
  assert.equal(calls.length, 1);
});

for (const status of [422, 409]) {
  test(`a ${status} on the ref update throws StaleError`, async () => {
    const { repo } = gh(writeRoutes("main", []).map((r) => (r[0] === "PATCH" ? ["PATCH", r[1], () => ({ status })] : r)));
    await assert.rejects(
      repo.write({ branch: "main", baseSha: "base1", message: "m", files: { "a.txt": "x" } }),
      StaleError,
    );
  });
}

test("the token only appears in the Authorization header and never in an error", async () => {
  const { repo, calls } = gh([["GET", /\/git\/ref\/heads\/main$/, () => ({ status: 500, json: { message: "secret body " + TOKEN } })]]);
  await assert.rejects(repo.head(), (e) => {
    assert.equal(e.message, "GitHub request failed (500)");
    assert.ok(!e.message.includes(TOKEN) && !e.message.includes("api.github.com") && !e.message.includes("secret body"));
    return true;
  });
  for (const c of calls) {
    assert.ok(!c.url.includes(TOKEN));
    assert.ok(!JSON.stringify(c.body ?? "").includes(TOKEN));
  }
});

test("readFiles decodes content, omits 404s and fetches big files through blobs", async () => {
  const { repo, calls } = gh([
    ["GET", /\/contents\/src\/a\.json\?ref=main$/, () => ({ json: { content: b64("hello\n").replace(/(.{4})/g, "$1\n"), encoding: "base64" } })],
    ["GET", /\/contents\/src\/missing\.json/, () => ({ status: 404 })],
    ["GET", /\/contents\/src\/big\.json/, () => ({ json: { sha: "bigsha", content: "", encoding: "none" } })],
    ["GET", /\/git\/blobs\/bigsha$/, () => ({ json: { content: b64("BIG"), encoding: "base64" } })],
  ]);
  const out = await repo.readFiles(["src/a.json", "src/missing.json", "src/big.json"], "main");
  assert.deepEqual(out, { "src/a.json": "hello\n", "src/big.json": "BIG" });
  assert.ok(calls.some((c) => c.path.endsWith("/contents/src/a.json?ref=main")));
});

test("readFiles and write reject absolute and parent paths before any request", async () => {
  const { repo, calls } = gh([]);
  for (const bad of ["../x", "a/../../x", "/etc/passwd", "a/..", ""]) {
    await assert.rejects(repo.readFiles([bad], "main"));
    await assert.rejects(repo.write({ branch: "main", baseSha: "b", message: "m", files: { [bad]: "x" } }));
  }
  assert.equal(calls.length, 0);
});

test("listImages returns files under src/images as /images/<name>", async () => {
  const { repo } = gh([
    ["GET", /\/contents\/src\/images\?ref=main$/, () => ({ json: [
      { name: "a.jpg", type: "file" }, { name: "sub", type: "dir" }, { name: "b.png", type: "file" },
    ] })],
  ]);
  assert.deepEqual([...(await repo.listImages("main"))].sort(), ["/images/a.jpg", "/images/b.png"]);
});

test("edits keeps only 'Website edit: ' commits, maps fields and stops at the limit", async () => {
  const c = (sha, msg, date) => ({ sha, commit: { message: msg, committer: { date } } });
  const { repo, calls } = gh([
    ["GET", /\/commits\?sha=main&per_page=100$/, () => ({ json: [
      c("s1", "Website edit: Change date\n\nbody", "2026-01-03T00:00:00Z"),
      c("s2", "Fix build", "2026-01-02T00:00:00Z"),
      c("s3", "Website edit: Add photo", "2026-01-01T00:00:00Z"),
      c("s4", "Website edit: Old", "2025-12-01T00:00:00Z"),
    ] })],
  ]);
  assert.deepEqual(await repo.edits(2), [
    { sha: "s1", date: "2026-01-03T00:00:00Z", title: "Change date" },
    { sha: "s3", date: "2026-01-01T00:00:00Z", title: "Add photo" },
  ]);
  assert.equal(calls.length, 1);
});

test("changeOf returns the first parent and changed paths", async () => {
  const { repo } = gh([
    ["GET", /\/commits\/s1$/, () => ({ json: { parents: [{ sha: "p1" }, { sha: "p2" }], files: [{ filename: "a" }, { filename: "b/c" }] } })],
  ]);
  assert.deepEqual(await repo.changeOf("s1"), { parent: "p1", paths: ["a", "b/c"] });
});

test("openPreview makes the branch, writes to it and opens a draft pull request", async () => {
  const routes = [
    ["POST", /\/git\/refs$/, () => ({ status: 201, json: {} })],
    ...writeRoutes("edit/abc12345", []).map((r) =>
      r[0] === "GET" && /ref\/heads/.test(String(r[1])) ? ["GET", /\/git\/ref\/heads\/edit\/abc12345$/, () => ({ json: { object: { sha: "base1" } } })] : r),
    ["POST", /\/pulls$/, () => ({ status: 201, json: { number: 7 } })],
  ];
  const { repo, calls } = gh(routes);
  const out = await repo.openPreview({ id: "abc12345", baseSha: "base1", message: "Change date", files: { "a.txt": "x" } });
  assert.deepEqual(out, { number: 7, sha: "commit1" });
  assert.deepEqual(calls[0].body, { ref: "refs/heads/edit/abc12345", sha: "base1" });
  const patch = calls.find((c) => c.method === "PATCH");
  assert.ok(patch.path.endsWith("/git/refs/heads/edit/abc12345"));
  const pr = calls.find((c) => c.path.endsWith("/pulls"));
  assert.deepEqual(pr.body, { title: "Preview: Change date", head: "edit/abc12345", base: "main", draft: true });
});

test("closePreview closes the pull request and deletes the branch, tolerating 404/422", async () => {
  const { repo, calls } = gh([
    ["PATCH", /\/pulls\/7$/, () => ({ status: 422 })],
    ["DELETE", /\/git\/refs\/heads\/edit\/abc12345$/, () => ({ status: 404 })],
  ]);
  await repo.closePreview({ id: "abc12345", number: 7 });
  assert.deepEqual(calls[0].body, { state: "closed" });
  assert.equal(calls[1].method, "DELETE");
});

test("closePreview still surfaces other failures", async () => {
  const { repo } = gh([["PATCH", /\/pulls\/7$/, () => ({ status: 500 })]]);
  await assert.rejects(repo.closePreview({ id: "abc12345", number: 7 }), /GitHub request failed \(500\)/);
});

test("preview ids must match /^[a-z0-9]{8,32}$/ and are rejected before any request", async () => {
  const { repo, calls } = gh([]);
  for (const id of ["short", "ABCDEFGH1", "abc/def12345", "abc12345/../x", "a".repeat(33), "abc 12345"]) {
    await assert.rejects(repo.openPreview({ id, baseSha: "b", message: "m", files: {} }), /preview id/i);
    await assert.rejects(repo.closePreview({ id, number: 1 }), /preview id/i);
  }
  assert.equal(calls.length, 0);
});

test("closePreview succeeds when DELETE answers 204 with no body", async () => {
  const { repo, calls } = gh([
    ["PATCH", /\/pulls\/7$/, () => ({ json: {} })],
    ["DELETE", /\/git\/refs\/heads\/edit\/abc12345$/, () => ({ status: 204, empty: true })],
  ]);
  await repo.closePreview({ id: "abc12345", number: 7 });
  assert.equal(calls.length, 2);
});

test("a malformed 2xx body throws a status-only error", async () => {
  const { repo } = gh([["GET", /\/git\/ref\/heads\/main$/, () => ({ status: 200, empty: true })]]);
  await assert.rejects(repo.head(), (e) => {
    assert.equal(e.message, "GitHub request failed (200)");
    return true;
  });
});

test("a failed openPreview deletes the new branch and rethrows the original error", async () => {
  const routes = [
    ["POST", /\/git\/refs$/, () => ({ status: 201, json: {} })],
    ["GET", /\/git\/ref\/heads\/edit\/abc12345$/, () => ({ json: { object: { sha: "base1" } } })],
    ["GET", /\/git\/commits\/base1$/, () => ({ json: { tree: { sha: "tree0" } } })],
    ["POST", /\/git\/trees$/, () => ({ status: 500 })],
    ["DELETE", /\/git\/refs\/heads\/edit\/abc12345$/, () => ({ status: 500 })],
  ];
  const { repo, calls } = gh(routes);
  await assert.rejects(
    repo.openPreview({ id: "abc12345", baseSha: "base1", message: "m", files: { "a.txt": "x" } }),
    /GitHub request failed \(500\)/,
  );
  const del = calls.filter((c) => c.method === "DELETE");
  assert.equal(del.length, 1);
  assert.ok(del[0].path.endsWith("/git/refs/heads/edit/abc12345"));
  assert.ok(!calls.some((c) => c.path.endsWith("/pulls")));
});

test("closePreview rejects a bad pull request number before any request", async () => {
  const { repo, calls } = gh([]);
  for (const n of [0, -1, 1.5, "7", NaN, undefined]) {
    await assert.rejects(repo.closePreview({ id: "abc12345", number: n }), /pull request number/i);
  }
  assert.equal(calls.length, 0);
});

test("changeOf on a root commit returns parent null", async () => {
  const { repo } = gh([["GET", /\/commits\/s1$/, () => ({ json: { parents: [], files: [{ filename: "a" }] } })]]);
  assert.deepEqual(await repo.changeOf("s1"), { parent: null, paths: ["a"] });
});

test("readFiles encodes spaces and # in paths", async () => {
  const { repo, calls } = gh([["GET", /\/contents\//, () => ({ json: { content: b64("x"), encoding: "base64" } })]]);
  await repo.readFiles(["src/my file#1.json"], "main");
  assert.ok(calls[0].path.includes("/contents/src/my%20file%231.json?ref=main"), calls[0].path);
});

test("curly quotes and emoji survive write content and base64 reads", async () => {
  const text = "\u201cHello\u201d \u{1F492} caf\u00e9\n";
  const { repo, calls } = gh(writeRoutes("main", [
    ["GET", /\/contents\/src\/t\.json/, () => ({ json: { content: Buffer.from(text).toString("base64"), encoding: "base64" } })],
  ]));
  await repo.write({ branch: "main", baseSha: "base1", message: "m", files: { "src/t.json": text } });
  const tree = calls.find((c) => c.path.endsWith("/git/trees")).body.tree;
  assert.equal(tree[0].content, text);
  assert.deepEqual(await repo.readFiles(["src/t.json"], "main"), { "src/t.json": text });
});

test("the token never appears in an error from a failing write", async () => {
  const routes = writeRoutes().map((r) => (r[1].test("/git/trees") ? ["POST", r[1], () => ({ status: 403, json: { message: TOKEN } })] : r));
  const { repo } = gh(routes);
  await assert.rejects(
    repo.write({ branch: "main", baseSha: "base1", message: "m", files: { "a.txt": "x" } }),
    (e) => {
      assert.equal(e.message, "GitHub request failed (403)");
      assert.ok(!String(e.stack).includes(TOKEN));
      return true;
    },
  );
});

// Final review, item 7e: files are read at the same time (at most 8 at once).
test("readFiles reads files concurrently, at most 8 at once, whatever order they answer in", async () => {
  let inFlight = 0;
  let most = 0;
  const paths = Array.from({ length: 20 }, (_, i) => `src/f${i}.json`);
  const { repo } = gh([["GET", /\/contents\/src\/f(\d+)\.json/, async (_b, u) => {
    const i = Number(/f(\d+)\.json/.exec(u.pathname)[1]);
    inFlight++;
    most = Math.max(most, inFlight);
    // Later files answer first; every third one is missing.
    await new Promise((r) => setTimeout(r, (20 - i) * 2));
    inFlight--;
    return i % 3 === 0 ? { status: 404 } : { json: { content: b64(`file ${i}`), sha: `s${i}` } };
  }]]);
  const out = await repo.readFiles(paths, "main");
  assert.ok(most > 1, `read one at a time (${most})`);
  assert.ok(most <= 8, `more than 8 at once (${most})`);
  const expected = {};
  for (let i = 0; i < 20; i++) if (i % 3 !== 0) expected[`src/f${i}.json`] = `file ${i}`;
  assert.deepEqual(out, expected);
  assert.equal(Object.hasOwn(out, "src/f0.json"), false);
  assert.deepEqual(Object.keys(out), paths.filter((_, i) => i % 3 !== 0)); // same order as asked
});

// The build-time site check, run against copies of a real built site, each
// with one thing broken.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { checkSite } from "../scripts/check-site.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
let base; // a built site
let tmpRoot;
let n = 0;

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), "--quiet"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "check-site-"));
  base = path.join(tmpRoot, "base");
  fs.cpSync(path.join(ROOT, "_site"), base, { recursive: true });
});
after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

// A fresh copy of the built site; `edit` changes it.
function copy(edit) {
  const dir = path.join(tmpRoot, `site-${n++}`);
  fs.cpSync(base, dir, { recursive: true });
  if (edit) edit(dir);
  return dir;
}
const change = (rel, fn) => (dir) => {
  const file = path.join(dir, rel);
  fs.writeFileSync(file, fn(fs.readFileSync(file, "utf8")));
};
const has = (problems, re) => assert.ok(problems.some((p) => re.test(p)), `expected a problem matching ${re}, got:\n${problems.join("\n")}`);

test("a clean build has no problems", () => {
  assert.deepEqual(checkSite(copy()), []);
});

test("a missing page is a problem that names it", () => {
  has(checkSite(copy((d) => fs.rmSync(path.join(d, "travel.html")))), /Travel/);
  has(checkSite(copy((d) => fs.rmSync(path.join(d, "404.html")))), /404/);
});

test("a private page that lost its noindex is a problem", () => {
  has(checkSite(copy(change("study/index.html", (t) => t.replace(/noindex,?\s*/g, "")))), /study\/index\.html.*noindex/);
});

test("a private page that is missing is a problem", () => {
  has(checkSite(copy((d) => fs.rmSync(path.join(d, "blue-line-prep.html")))), /blue-line-prep\.html/);
});

for (const file of ["robots.txt", "_headers", "_redirects", "sitemap.xml"]) {
  test(`a changed ${file} is a problem`, () => {
    has(checkSite(copy(change(file, (t) => t + "\n# changed\n"))), new RegExp(file.replace(".", "\\.")));
  });
}

test("an image that points at a missing file is a problem", () => {
  has(checkSite(copy(change("details.html", (t) => t.replace("</body>", '<img src="images/not-there.jpg" alt=""></body>')))), /not-there\.jpg/);
});

test("a link to a missing page is a problem", () => {
  has(checkSite(copy(change("faq.html", (t) => t.replace("</body>", '<a href="/no-such-page">x</a></body>')))), /no-such-page/);
});

test("a missing script or stylesheet file is a problem", () => {
  has(checkSite(copy(change("faq.html", (t) => t.replace("</body>", '<script src="js/gone.js"></script></body>')))), /gone\.js/);
});

test("links that are served at run time or that point elsewhere are fine", () => {
  const site = copy(change("faq.html", (t) => t.replace("</body>",
    '<a href="/api/editor/session">a</a><a href="/wedding.ics">b</a><a href="#top">c</a><a href="details?x=1#y">d</a><a href="/details">e</a><a href="mailto:a@b.co">f</a><a href="tel:+15555550100">g</a></body>')));
  assert.deepEqual(checkSite(site), []);
});

test("a key-shaped string anywhere in the output is a problem, and is never printed", () => {
  for (const secret of ["sk-ant-abcdefghij1234567890", "github_pat_" + "a1".repeat(15), "ghp_" + "b2".repeat(15), "nfp_" + "c3".repeat(15)]) {
    const problems = checkSite(copy(change("css/styles.css", (t) => t + `\n/* ${secret} */\n`)));
    has(problems, /css\/styles\.css/);
    assert.ok(!problems.join("\n").includes(secret));
  }
});

test("a missing folder never throws", () => {
  const problems = checkSite(path.join(tmpRoot, "nothing-here"));
  assert.ok(problems.length > 0);
});

// ---- rendered-output baseline ---------------------------------------------

test("a new external script is a problem", () => {
  has(checkSite(copy(change("details.html", (t) => t.replace("</body>", '<script src="https://evil.example/x.js"></script></body>')))), /new script/);
});

test("a new inline script is a problem", () => {
  has(checkSite(copy(change("travel.html", (t) => t.replace("</body>", "<script>alert(1)</script></body>")))), /new script/);
});

test("a new iframe origin is a problem", () => {
  has(checkSite(copy(change("travel.html", (t) => t.replace("</body>", '<iframe src="https://evil.example/f"></iframe></body>')))), /embedded frame|iframe/i);
});

test("an onclick attribute is a problem", () => {
  has(checkSite(copy(change("faq.html", (t) => t.replace("<h1", '<h1 onclick="x()"')))), /onclick/);
});

test("a new stylesheet url(https://...) is a problem", () => {
  has(checkSite(copy(change("css/styles.css", (t) => t + "\nbody{background:url(https://evil.example/bg.png)}\n"))), /evil\.example/);
});

test("a new <img src=https://...> is a problem", () => {
  has(checkSite(copy(change("our-story.html", (t) => t.replace("</body>", '<img src="https://evil.example/p.png" alt=""></body>')))), /evil\.example/);
});

test("a new form action, base tag or meta refresh is a problem", () => {
  has(checkSite(copy(change("faq.html", (t) => t.replace("</body>", '<form action="https://evil.example/p"></form></body>')))), /form/i);
  has(checkSite(copy(change("faq.html", (t) => t.replace("<head>", '<head><base href="https://evil.example/">')))), /base/i);
  has(checkSite(copy(change("faq.html", (t) => t.replace("<head>", '<head><meta http-equiv="refresh" content="0;url=https://evil.example/">')))), /meta/i);
});

test("content-only changes produce no problems", () => {
  const site = copy(change("travel.html", (t) =>
    t.replace("</body>", '<p>A different sentence.</p><a href="https://example-hotel.com/book">Book here</a><a href="https://www.google.com/maps/search/?api=1&query=Somewhere">Map</a></body>')));
  assert.deepEqual(checkSite(site), []);
});

test("changed JSON-LD content is fine", () => {
  const site = copy(change("index.html", (t) => t.replace(/("name":\s*")[^"]*"/, '$1Someone Else"')));
  assert.deepEqual(checkSite(site), []);
});

// ---- the command line -------------------------------------------------------

test("the command prints ok for a clean site and exits 1 with the problems otherwise", () => {
  const run = (dir) => spawnSync(process.execPath, [path.join(ROOT, "scripts/check-site.mjs"), dir], { encoding: "utf8" });
  const ok = run(copy());
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /site check: ok/);
  const bad = run(copy((d) => fs.rmSync(path.join(d, "faq.html"))));
  assert.equal(bad.status, 1);
  assert.match(bad.stdout + bad.stderr, /FAQ/i);
});

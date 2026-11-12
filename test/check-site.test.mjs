// The build-time site check, run against copies of a real built site, each
// with one thing broken.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { checkSite, recordSite } from "../scripts/check-site.mjs";

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

// ---- fix round 1: forms of HTML and CSS that browsers accept -----------------

const into = (rel, html) => change(rel, (t) => t.replace("</body>", `${html}</body>`));
const E = "//evil.com/x.js";
const EVIL = /evil\.com/;
const flagged = (name, rel, html, re = EVIL) =>
  test(`flagged: ${name}`, () => has(checkSite(copy(into(rel, html))), re));

flagged("comment ended by <!-->", "faq.html", `<!--> <script src="${E}"></script> <!-- -->`, /new script/);
flagged("comment ended by --!>", "faq.html", `<!-- a --!> <script src="${E}"></script> <!-- -->`, /new script/);
flagged("script closed by </script x>", "faq.html", `<script src="${E}"></script x>`, /new script/);
flagged("script closed by </script/>", "faq.html", `<script src="${E}"></script/>`, /new script/);
flagged("style closed by </style x>", "faq.html", `<style>@import "//evil.com/a.css";</style x>`);
flagged("button formaction", "faq.html", `<button formaction="//evil.com/p">x</button>`);
flagged("a ping", "faq.html", `<a href="/details" ping="//evil.com/p">x</a>`);
flagged("svg image href", "faq.html", `<svg><image href="//evil.com/a"></image></svg>`);
flagged("svg image xlink:href", "faq.html", `<svg><image xlink:href="//evil.com/a"></image></svg>`);
flagged("link imagesrcset", "faq.html", `<link rel="preload" as="image" imagesrcset="//evil.com/a 1x">`);
flagged("entity-encoded poster", "faq.html", `<video poster="&#47;&#47;evil.com/p"></video>`);
flagged("entity-encoded style url", "faq.html", `<p style="background:url(&#47;/evil.com/a)">x</p>`);
flagged("backslash poster", "faq.html", `<video poster="\\\\evil.com/p"></video>`);
flagged("slash-backslash audio src", "faq.html", `<audio src="/\\evil.com/a"></audio>`);
flagged("tab inside a protocol-relative src", "faq.html", `<img src="/&#9;/evil.com/a" alt="">`);
flagged("data attribute holding a url", "faq.html", `<div data-x="https://evil.com/f"></div>`);
flagged("template content", "faq.html", `<template><script src="${E}"></script></template>`, /new script/);
flagged("noscript content", "faq.html", `<noscript><img src="//evil.com/p" alt=""></noscript>`);
flagged("style block image-set", "faq.html", `<style>p{background:image-set("//evil.com/a.png" 1x)}</style>`);
flagged("handler reused with new code", "details.html", `<img src="" onerror="fetch('//evil.com')" alt="">`, /onerror/);
flagged("javascript: href with entity", "faq.html", `<a href="&#106;avascript:alert(1)">x</a>`, /javascript:/);
flagged("javascript: href with tab", "faq.html", `<a href="java&#9;script:alert(1)">x</a>`, /javascript:/);
flagged("javascript: href with leading space and control character", "faq.html", `<a href=" &#1;javascript:alert(1)">x</a>`, /javascript:/);
flagged("data: href", "faq.html", `<a href="data:text/html,x">x</a>`, /data/);

test("flagged: CSS image-set and escaped url in the stylesheet", () => {
  has(checkSite(copy(change("css/styles.css", (t) => t + '\np{background:image-set("//evil.com/a.png" 1x)}\n'))), EVIL);
  has(checkSite(copy(change("css/styles.css", (t) => t + '\np{background:url("\\2f\\2f evil.com/a.png")}\n'))), EVIL);
  has(checkSite(copy(change("css/styles.css", (t) => t + '\n@import "https://evil.com/a.css";\n'))), EVIL);
});

test("a new stylesheet linked from a page is scanned too", () => {
  const site = copy((d) => {
    fs.writeFileSync(path.join(d, "css/extra.css"), "p{background:url(//evil.com/a.png)}");
    change("faq.html", (t) => t.replace("</head>", '<link rel="stylesheet" href="css/extra.css"></head>'))(d);
  });
  has(checkSite(site), EVIL);
});

test("a commented-out noindex does not count", () => {
  has(checkSite(copy(change("study/index.html", (t) =>
    t.replace(/<meta name="robots"[^>]*>/, '<!-- <meta name="robots" content="noindex"> --><meta name="robots" content="index">')))), /study\/index\.html.*noindex/);
});

test("every robots meta must say noindex", () => {
  has(checkSite(copy(change("study/index.html", (t) => t.replace("</head>", '<meta name="robots" content="index"></head>')))), /study\/index\.html.*noindex/);
});

test("content changes with a new hotel link and a new image are fine", () => {
  const site = copy((d) => {
    fs.copyFileSync(path.join(d, "favicon.ico"), path.join(d, "images/brand-new.ico"));
    change("travel.html", (t) => t.replace("</body>",
      '<p>New words.</p><a href="https://example-hotel.com">Hotel</a><img src="images/brand-new.ico" alt="x"></body>'))(d);
  });
  assert.deepEqual(checkSite(site), []);
});

// ---- fix round 2: conservative CSS reading, data: URIs, animation elements -----

const css = (payload) => (d) => fs.appendFileSync(path.join(d, "css/styles.css"), `\n${payload}\n`);
const style = (payload) => into("faq.html", `<style>${payload}</style>`);

for (const [name, payload] of [
  ["a url hidden between two string comments", 'p{content:"/*"} q{background:url(https://evil.com/a)} r{content:"*/"}'],
  ["the same with an escaped url", 'p{content:"/*"} q{background:url("\\2f\\2f evil.com/a")} r{content:"*/"}'],
]) {
  test(`flagged: ${name}, in the stylesheet and in a <style>`, () => {
    has(checkSite(copy(css(payload))), EVIL);
    has(checkSite(copy(style(payload))), EVIL);
  });
}

test("flagged: a quoted @import of a data: address, plain or escaped", () => {
  has(checkSite(copy(style('@import "data:text/css;base64,cHt9";'))), /another stylesheet/);
  has(checkSite(copy(style('@\\69mport "data:text/css;base64,cHt9";'))), /another stylesheet/);
});

test("flagged: any new @import, in a stylesheet or a style attribute", () => {
  has(checkSite(copy(css('@import "local.css";'))), /another stylesheet/);
  has(checkSite(copy(css('@import url(local.css);'))), /another stylesheet/);
  has(checkSite(copy(into("faq.html", '<p style="@import \'x.css\'">x</p>'))), /another stylesheet/);
});

test("flagged: a new or changed data: address in the stylesheet or a page", () => {
  has(checkSite(copy(change("css/styles.css", (t) => t.replace("stroke-width='1.5'", "stroke-width='1.6'")))), /data address/);
  has(checkSite(copy(css("p{background:url(data:image/png;base64,AAAA)}"))), /data address/);
  has(checkSite(copy(into("faq.html", '<img src="data:image/png;base64,AAAA" alt="">'))), /data address/);
  has(checkSite(copy(into("faq.html", '<a href="data:text/html,x">x</a>'))), /data/);
});

flagged("svg set animating an href", "faq.html", '<svg><image><set attributeName="href" to="https:&#47;&#47;evil.com/a"/></image></svg>');
flagged("svg animate with a javascript: value", "faq.html", '<svg><a><animate attributeName="href" values="javascript:alert(1)"/></a></svg>', /javascript:|animation/);
flagged("a new svg animation element is counted", "faq.html", "<svg><animate/></svg>", /<animate>/);
flagged("a foreignObject element", "faq.html", "<svg><foreignObject></foreignObject></svg>", /foreignobject/i);

test("ordinary changes still pass", () => {
  const ok = [
    change("css/theme.css", (t) => t.replace(/#[0-9a-fA-F]{6}/, "#123456")),
    change("css/styles.css", (t) => t + "\nhtml{scroll-behavior:smooth}\n/* a note */\n"),
    into("faq.html", "<p>" + "A much longer paragraph of new words. ".repeat(40) + "</p>"),
    into("faq.html", '<p>See <a href="https://www.example.com">this</a>.</p>'),
    into("travel.html", '<a href="https://booking.example/room" class="btn" target="_blank" rel="noopener noreferrer">Book</a>'),
  ];
  for (const edit of ok) assert.deepEqual(checkSite(copy(edit)), []);
});

test("turning the after-party map on passes a baseline recorded while it was off", () => {
  const off = copy(change("after-party.html", (t) => t.replace(/ data-map-src="[^"]*"/, "")));
  assert.ok(!/data-map-src/.test(fs.readFileSync(path.join(off, "after-party.html"), "utf8")));
  const record = path.join(tmpRoot, "map-off.json");
  recordSite(off, record);
  assert.deepEqual(checkSite(copy(), { protectedFile: record }), []);
});

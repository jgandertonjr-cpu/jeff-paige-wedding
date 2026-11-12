// The editor's own pages speak plain English and stay private and self-contained:
// no word Paige would have to look up, a "noindex" and a strict content policy on
// every page, and no inline script or style (the policy forbids them).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "parse5";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const PAGES = ["src/admin/index.html", "src/admin/guide/index.html"];

const FORBIDDEN = /\b(commit|deploy|json|branch|repository|merge|build|token)\b/i;
// A protocol value the browser needs; it is never shown on screen.
const ALLOWED_LITERALS = new Set(["application/json"]);

const CSP =
  "default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; connect-src 'self'; " +
  "font-src 'self'; base-uri 'none'; form-action 'self'";

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
  if (node.content) walk(node.content, visit); // <template>
}

// Every text node, attribute value and comment in a page.
function pageWords(html) {
  const out = [];
  walk(parse(html), (n) => {
    if (n.nodeName === "#text" || n.nodeName === "#comment") out.push(n.value ?? n.data ?? "");
    for (const a of n.attrs || []) out.push(a.value);
  });
  return out;
}

// Every string literal in a script ('…', "…", `…`), skipping comments.
function stringLiterals(src) {
  const out = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 1; if (i <= 0) break; continue; }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\") { s += src[j + 1]; j += 2; continue; }
        s += src[j++];
      }
      out.push(s);
      i = j;
    }
  }
  return out;
}

const hits = (strings) => strings.filter((s) => !ALLOWED_LITERALS.has(s) && FORBIDDEN.test(s));

test("the scanners find words in text, attributes, comments and string literals", () => {
  assert.deepEqual(hits(pageWords('<p title="a branch">x</p><!-- json --><p>Build it</p>')), ["a branch", " json ", "Build it"]);
  assert.deepEqual(hits(stringLiterals('const a = "Deploy"; // commit\nconst b = `merge`; /* token */ f(\'ok\', "application/json");')), ["Deploy", "merge"]);
  assert.deepEqual(hits(["rebuilding", "branches", "tokens"]), []); // whole words only
});

for (const rel of [...PAGES]) {
  test(`${rel} uses no word Paige would have to look up`, () => {
    assert.deepEqual(hits(pageWords(read(rel))), []);
  });
}

test("src/admin/admin.js uses no word Paige would have to look up in its strings", () => {
  assert.deepEqual(hits(stringLiterals(read("src/admin/admin.js"))), []);
});

test("src/admin/deadline.js uses no word Paige would have to look up in its strings", () => {
  assert.deepEqual(hits(stringLiterals(read("src/admin/deadline.js"))), []);
});

for (const rel of PAGES) {
  test(`${rel} is private, carries the content policy, and has no inline script or style`, () => {
    const metas = [];
    const problems = [];
    walk(parse(read(rel)), (n) => {
      if (n.nodeName === "meta") metas.push(Object.fromEntries(n.attrs.map((a) => [a.name, a.value])));
      if (n.nodeName === "script" && (n.childNodes || []).some((c) => c.value && c.value.trim())) problems.push("inline script");
      if (n.nodeName === "style") problems.push("style element");
      for (const a of n.attrs || []) {
        if (a.name === "style") problems.push(`style= on <${n.nodeName}>`);
        if (/^on/i.test(a.name)) problems.push(`${a.name}= on <${n.nodeName}>`);
      }
    });
    assert.ok(metas.some((m) => m.name === "robots" && m.content === "noindex, nofollow"), "noindex meta");
    assert.ok(metas.some((m) => m["http-equiv"] === "Content-Security-Policy" && m.content === CSP), "content policy meta");
    assert.deepEqual(problems, []);
  });
}

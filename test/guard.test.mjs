import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { classifyPath, READABLE_LAYOUT_FILES, checkLayoutEdit } from "../netlify/editor/guard.mjs";

const ROOT = new URL("../", import.meta.url);
const BANNED = /\b(commit|deploy|json|branch|repository|merge|build|token|wcag)\b/i;

test("allowed paths classify by kind", () => {
  const cases = {
    "src/_data/faq.json": "content",
    "src/_data/guests.json": "content",
    "src/images/photo-20261112-ab12cd.jpg": "image",
    "src/images/a.webp": "image",
    "src/images/a.JPG": null,
    "src/css/styles.css": "layout",
    "src/travel.njk": "layout",
    "src/404.njk": "layout",
    "src/_includes/detail-item.njk": "layout",
    "DESIGN.md": "design",
  };
  for (const [p, kind] of Object.entries(cases)) assert.equal(classifyPath(p), kind, p);
});

test("refused paths classify as null", () => {
  const refused = [
    "src/study/index.html", "src/study/a/b.js", "src/pd-tracker/index.html",
    "src/blue-line-prep.html", "src/oral-board-prep.html", "src/nelson-denny-practice.html",
    "src/landscaping-hours.html", "src/landscaping-hours-sw.js", "blue-line-prep/HANDOFF.md",
    "src/robots.txt", "src/sitemap.xml", "src/_headers", "src/_redirects", "netlify.toml",
    "netlify/editor/guard.mjs", "netlify/functions/editor.mjs", "package.json", "package-lock.json",
    "eleventy.config.js", "src/admin/index.html", "src/admin/config.yml", "src/rsvp.njk",
    "src/rsvp-dashboard.njk", "src/js/app.js", "src/_includes/layouts/base.njk",
    ".github/workflows/x.yml", "src/theme.css.njk", "src/wedding.ics.njk",
    "src/_data/calendar.js", "src/_data/../robots.txt", "/etc/passwd",
    "src/images/../../netlify.toml", "src/primed/index.html", "src/images/evil.svg",
    "src/images/x.html", "SRC/_data/faq.json", "src/_data/sub/faq.json", "src/_data/Faq.json",
    "src/_data/faq2.json", "src/_data/.json", "src/images/sub/a.jpg", "src/images/.jpg",
    "src/images/-a.jpg", "src/images/a b.jpg", "src/_includes/sub/x.njk", "src/_includes/ .njk", "src/_includes/é.njk", "src/_includes/a..njk", "src/_includes/A.njk", "src/_includes/x.html",
    "src/css/other.css", "src/unknown.njk", "src//index.njk", "./src/index.njk", "src/./index.njk",
    "src\\index.njk", "src/index.njk\0", "src/index.njk\n", "src/index.njk/", "", "design.md",
    "DESIGN.md/", "src/_data/faq.json ", "..", "src/..",
  ];
  for (const p of refused) assert.equal(classifyPath(p), null, JSON.stringify(p));
});

test("non-string input is refused without throwing", () => {
  for (const v of [undefined, null, 5, {}, [], ["src/index.njk"], Symbol("x"), () => 1]) {
    assert.equal(classifyPath(v), null);
  }
});

test("every readable layout file is layout and exists", () => {
  assert.equal(READABLE_LAYOUT_FILES.length, 14);
  for (const p of READABLE_LAYOUT_FILES) {
    assert.equal(classifyPath(p), "layout", p);
    assert.ok(fs.existsSync(new URL(p, ROOT)), p);
  }
});

const before = Array.from({ length: 30 }, (_, i) => `.rule${i} { color: #112233; padding: ${i}px; }`).join("\n");
const withLine = (line) => `${before}\n${line}\n`;

test("added lines with forbidden content are flagged", () => {
  const bad = [
    "<script>x()</script>", "<iframe src=a>", '<a onclick="x()">', "javascript:void(0)",
    "{{ page.body | safe }}", '<meta name="robots" content="noindex">', "noindex", "robots",
    '@import "x.css";', "url(https://evil.example/x.png)",
    "<SCRIPT>", '<a ONCLICK = "x">', '<img onerror="x">', "javascript :alert(1)",
    "background: url( 'https://evil.example/x.png')", 'background: url("//evil.example/x.png")',
    "background: url(  http://evil.example/x.png)", "<object data=x>", "<embed src=x>",
    "<base href=x>", "<link rel=stylesheet href=x>", "<form action=x>", "{{ x|safe }}", "@IMPORT url(a);",
  ];
  for (const line of bad) {
    const problems = checkLayoutEdit({ path: "src/css/styles.css", before, after: withLine(line) });
    assert.ok(problems.length > 0, line);
    for (const p of problems) {
      assert.equal(typeof p, "string");
      assert.doesNotMatch(p, BANNED, p);
    }
  }
});

test("empty or shrunken after is flagged", () => {
  for (const after of ["", "   \n", "tiny", before.slice(0, Math.floor(before.length * 0.19))]) {
    const problems = checkLayoutEdit({ path: "src/index.njk", before, after });
    assert.ok(problems.length > 0, JSON.stringify(after.slice(0, 10)));
    for (const p of problems) assert.doesNotMatch(p, BANNED);
  }
});

test("ordinary edits pass", () => {
  assert.deepEqual(checkLayoutEdit({ path: "src/css/styles.css", before, after: before.replaceAll("#112233", "#445566") }), []);
  assert.deepEqual(checkLayoutEdit({ path: "src/index.njk", before: '<div class="old">\n</div>', after: '<div class="new">\n</div>' }), []);
  assert.deepEqual(checkLayoutEdit({ path: "src/css/styles.css", before, after: withLine("background: url(/images/hero.jpg);") }), []);
  assert.deepEqual(checkLayoutEdit({ path: "src/css/styles.css", before, after: withLine("background: url('images/hero.jpg');") }), []);
  assert.deepEqual(checkLayoutEdit({ path: "src/css/styles.css", before, after: withLine(".button { border: 1px solid; } /* button=ok */") }), []);
});

test("forbidden text already present before is ignored", () => {
  const b = `${before}\n<script>old()</script>\nx | safe\n<meta name="robots" content="noindex">`;
  assert.deepEqual(checkLayoutEdit({ path: "src/index.njk", before: b, after: b.replace("#112233", "#445566") }), []);
  // moved lines are not new
  const moved = b.split("\n").reverse().join("\n");
  assert.deepEqual(checkLayoutEdit({ path: "src/index.njk", before: b, after: moved }), []);
});

test("removing forbidden text is allowed; bad input does not throw", () => {
  const b = `${before}\n<script>old()</script>`;
  assert.deepEqual(checkLayoutEdit({ path: "src/index.njk", before: b, after: before }), []);
  assert.ok(checkLayoutEdit({ path: "src/index.njk", before: 5, after: null }).length > 0);
  assert.ok(checkLayoutEdit({}).length > 0);
});

// Fix round 1: template syntax, entities and escapes must not hide forbidden text.
const NJK = "src/index.njk";
const CSS = "src/css/styles.css";
const addLines = (...lines) => `${before}\n${lines.join("\n")}\n`;
const flagged = (path, ...lines) => {
  const problems = checkLayoutEdit({ path, before, after: addLines(...lines) });
  for (const p of problems) {
    assert.equal(typeof p, "string");
    assert.doesNotMatch(p, BANNED, p);
    assert.doesNotMatch(p, /\n/);
  }
  return problems.length > 0;
};

test("bypasses built from template syntax, entities and escapes are flagged", () => {
  const cases = [
    [NJK, "<scr{# x #}ipt>"],
    [NJK, "java{# #}script:x"],
    [NJK, "<scr{# multi", "line #}ipt>"],
    [NJK, "{% autoescape false %}"],
    [NJK, "{%- autoescape false -%}"],
    [NJK, "{%\nautoescape false %}"],
    [NJK, "{% filter safe %}x{% endfilter %}"],
    [NJK, "<a onclick", '="x()">'],
    [NJK, "{{ x |", "safe }}"],
    [NJK, '<a href="java', 'script:x">'],
    [NJK, '<a href="&#106;avascript:x">'],
    [NJK, '<a href="&#x6a;avascript&colon;x">'],
    [NJK, "&lt;script&gt;"],
    [NJK, "{{ x | safe }}"],
    [NJK, "{{ x|dump }}"],
    [NJK, "{% raw %}x{% endraw %}"],
    [NJK, "{% verbatim %}x{% endverbatim %}"],
    [NJK, '{% include "x.njk" %}'],
    [NJK, '{% import "x.njk" as y %}'],
    [NJK, '{% from "x.njk" import y %}'],
    [NJK, '{% extends "x.njk" %}'],
    [NJK, "{% block a %}x{% endblock %}"],
    [CSS, "\\75rl(https://evil.example/x.png)"],
    [CSS, "background: url(\\68ttps://evil.example/x.png)"],
    [CSS, "@\\69mport 'a.css';"],
    [CSS, "@\\000069mport 'a.css';"],
    [CSS, 'background: image-set("https://evil.example/x.png" 1x)'],
    [CSS, "background: image-set('/images/x.png' 1x)"],
    [CSS, '@font-face { src: "https://evil.example/f.woff2"; }'],
    [CSS, "@font-face { src: //evil.example/f.woff2; }"],
    [CSS, "width: expression(alert(1))"],
    [CSS, "behavior: url(x.htc)"],
    [CSS, "-moz-binding: url(x)"],
    [CSS, "@im", "port 'a.css';"],
  ];
  for (const [p, ...lines] of cases) assert.ok(flagged(p, ...lines), `${p} ${JSON.stringify(lines)}`);
});

test("ordinary edits still pass after the stricter rules", () => {
  const ok = [
    [CSS, "color: #445566;"],
    [CSS, "border-radius: 3px;"],
    [CSS, "background: url(/images/x.jpg);"],
    [CSS, "font-size: 17px; line-height: 1.5;"],
    [NJK, '<div class="renamed-card">'],
    [NJK, "{% if travel.show %}", "<p>Hello</p>", "{% endif %}"],
    [NJK, "{{ travel.labels.plan_your_trip }}"],
    [NJK, '<a href="https://example.com/a">Link</a>'],
    [NJK, "{% for item in items %}{{ item.name }}{% endfor %}"],
  ];
  for (const [p, ...lines] of ok) assert.ok(!flagged(p, ...lines), `${p} ${JSON.stringify(lines)}`);
});

test("rules follow the file type", () => {
  assert.ok(!flagged(NJK, '<a href="https://example.com/a">x</a>'));
  assert.ok(flagged(CSS, 'a::after { content: "https://example.com/a"; }'));
  assert.ok(flagged(NJK, '{% include "x.njk" %}'));
  assert.ok(!flagged(CSS, "/* note: include this {% later %} */".replace("{% later %}", "later")));
});

test("svg animation and embedded-content elements are refused", () => {
  for (const tag of ["<set attributeName=href>", "<animate x>", "<ANIMATETRANSFORM>", "<animateMotion>", "<foreignObject>", "< set x", "&lt;animate&gt;", "<anim{# #}ate>"]) {
    assert.ok(flagged(NJK, tag), tag);
  }
  assert.ok(!flagged(NJK, "<p>Settings and animated things</p>"));
});

test("scroll-behavior is fine but behavior: is still refused", () => {
  assert.ok(!flagged(CSS, "scroll-behavior: smooth;"));
  assert.ok(!flagged(CSS, "overscroll-behavior: contain;"));
  assert.ok(!flagged(CSS, "html { scroll-behavior : smooth }"));
  assert.ok(flagged(CSS, "behavior: url(x.htc)"));
  assert.ok(flagged(CSS, "a{color:red;behavior:url(x.htc)}"));
});

// Task 18 A: expressions inside added template tags must not be able to run code during the site build.
test("template expressions that could reach code at build time are refused", () => {
  const payload = `{{ range.constructor("return global.process.mainModule.require('child_process').execSync('env')")() }}`;
  const cases = [
    [payload],
    [`{{ range["constr"+"uctor"]("return 1")() }}`],
    [`{{ range["constr" ~ "uctor"] }}`],
    [`{% set f = "constr" ~ "uctor" %}`],
    [`{% set f = "constr" + "uctor" %}`],
    [`{% set f = "con{# x #}structor" %}`],
    ["{{ range.constructor(", "\"return 1\")() }}"],
    ["{{ range.", "constructor }}"],
    ["{% set f = range.constructor %}"],
    ['{{ f("x")() }}'],
    ['{{ x["constructor"] }}'],
    ["{{ ''.constructor }}"],
    ["{{ x.y(1) }}"],
    ["{{ x . y (1) }}"],
    ["{{ x.y", "(1) }}"],
    ["{{ (x)(1) }}"],
    ["{{ 'a'(1) }}"],
    ["{{ x | first }}{{ range(3) }}"],
    ["{{ __proto__ }}"],
    ["{{ x.prototype }}"],
    ["{{ x.Process }}"],
    ["{{ require }}"],
    ["{{ globalThis }}"],
    ["{{ x.mainModule }}"],
    ["{{ env }}"],
    ["{{ eval }}"],
    ["{{ Function }}"],
    ["{{ cycler }}"],
    ["{{ joiner }}"],
    ["{{ `x` }}"],
    ["{{ a ~ b }}"],
    ["{{ x &#91;0&#93; }}"],
    ["{{ x | safe }}"],
    ["{{ x | dump }}"],
    ["{{ range.constructor"],
    ["{% set f = range.constructor"],
    ["range.constructor }}"],
    ["{{ x", "[0] }}"],
  ];
  for (const lines of cases) assert.ok(flagged(NJK, ...lines), JSON.stringify(lines));
});

test("ordinary template expressions still pass", () => {
  const ok = [
    ["{{ travel.labels.plan_your_trip }}"],
    ['{{ site.wedding_date | dateFormat("long") }}'],
    ["{% if details.reception.subtitle | length > 120 %}", "<p>Long</p>", "{% endif %}"],
    ["{% for item in travel.tips.list %}", "<li>{{ item }}</li>", "{% endfor %}"],
    ["{{ item.image | relUrl }}"],
    ["{{ ceremony(alt) }}"],
    ["{% set v = site.venue %}"],
    ['{{ (v.city + ", " + v.state) | nbsp }}'],
    ["{% if not (a or b) %}x{% endif %}"],
    ['{{ icon("star", "small") }}'],
  ];
  for (const lines of ok) assert.deepEqual(checkLayoutEdit({ path: NJK, before, after: addLines(...lines) }), [], JSON.stringify(lines));
});

test("-ms-behavior is refused like behavior", () => {
  assert.ok(flagged(CSS, "-ms-behavior: url(x.htc)"));
  assert.ok(flagged(CSS, "a{-ms-behavior:url(x.htc)}"));
  assert.ok(!flagged(CSS, "scroll-behavior: smooth;"));
  assert.ok(!flagged(CSS, "overscroll-behavior: contain;"));
});

// Fix round 2, M: the front matter (setup lines) of a template never changes.
const SETUP = "That would change the page's setup lines, which I can't do.";
const realDetails = fs.readFileSync(new URL("src/details.njk", ROOT), "utf8");
const INJECT = '---js\nimport { execSync } from "node:child_process";\nexecSync("env");\n---\n';

test("front matter: injecting ---js at the top is refused, with or without existing front matter", () => {
  assert.ok(checkLayoutEdit({ path: NJK, before: realDetails, after: INJECT + realDetails }).includes(SETUP));
  const body = realDetails.replace(/^---[\s\S]*?\n---\n/, "");
  assert.ok(!body.startsWith("---"));
  assert.ok(checkLayoutEdit({ path: NJK, before: body, after: INJECT + body }).includes(SETUP));
  // Replacing the existing front matter outright.
  assert.ok(checkLayoutEdit({ path: NJK, before: realDetails, after: realDetails.replace(/^---[\s\S]*?\n---\n/, INJECT) }).includes(SETUP));
});

test("front matter: changing a line in it or its language is refused", () => {
  for (const after of [
    realDetails.replace("permalink: details.html", "permalink: elsewhere.html"),
    realDetails.replace("pageKey: details", "pageKey: travel"),
    realDetails.replace(/^---\n/, "---js\n"),
    realDetails.replace(/^---\n/, "---json\n"),
    realDetails.replace("headerDark: true\n", "headerDark: true\neleventyComputed: x\n"),
  ]) {
    assert.notEqual(after, realDetails);
    assert.ok(checkLayoutEdit({ path: NJK, before: realDetails, after }).includes(SETUP), after.slice(0, 80));
  }
});

test("front matter: a second setup block lower down is refused", () => {
  const after = realDetails.replace("{%- extends", "<p>x</p>\n---js\nfoo\n---\n{%- extends");
  assert.ok(checkLayoutEdit({ path: NJK, before: realDetails, after }).includes(SETUP));
  assert.ok(flagged(NJK, "---yaml"));
  assert.ok(flagged(NJK, "---"));
});

test("front matter: an ordinary body edit on a real template passes, and stylesheets are unaffected", () => {
  const after = realDetails.replace("{%- extends \"layouts/base.njk\" -%}", "{%- extends \"layouts/base.njk\" -%}\n<p class=\"note\">Hello</p>");
  assert.notEqual(after, realDetails);
  assert.deepEqual(checkLayoutEdit({ path: NJK, before: realDetails, after }), []);
  assert.ok(!checkLayoutEdit({ path: CSS, before, after: `---\n${before}` }).includes(SETUP));
});

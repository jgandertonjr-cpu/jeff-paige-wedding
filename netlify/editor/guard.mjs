// Deny-by-default allowlist for every path the editor may write, plus the
// rules for look-and-layout edits. Pure: no file or network access.
import path from "node:path";

const PAGES = ["index", "our-story", "details", "wedding-party", "registry", "travel", "after-party", "faq", "gallery", "404"];
const PAGE_FILES = new Set(PAGES.map((n) => `src/${n}.njk`));

const CONTENT = /^src\/_data\/[a-z]+\.json$/;
const IMAGE = /^src\/images\/[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp)$/;
const INCLUDE = /^src\/_includes\/[a-z0-9][a-z0-9-]*\.njk$/;
const STYLESHEET = "src/css/styles.css";

export const READABLE_LAYOUT_FILES = [
  STYLESHEET,
  ...PAGE_FILES,
  "src/_includes/add-to-calendar.njk",
  "src/_includes/detail-item.njk",
  "src/_includes/icons.njk",
];

export function classifyPath(p) {
  if (typeof p !== "string" || p === "") return null;
  if (/[\\\u0000-\u001f\u007f]/.test(p) || p.startsWith("/")) return null;
  if (path.posix.normalize(p) !== p) return null;
  if (p.split("/").some((s) => s === "" || s === "." || s === "..")) return null;

  if (p === "DESIGN.md") return "design";
  if (CONTENT.test(p)) return "content";
  if (IMAGE.test(p)) return "image";
  if (p === STYLESHEET || PAGE_FILES.has(p) || INCLUDE.test(p)) return "layout";
  return null;
}

const NAMED_ENTITIES = {
  colon: ":", lpar: "(", rpar: ")", lt: "<", gt: ">", quot: '"', apos: "'", amp: "&", Tab: "\t", NewLine: "\n",
};
const fromCode = (n) => (Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "");

// Undo the tricks that can hide a forbidden word: template comments, HTML
// entities and CSS backslash escapes.
function normalise(text) {
  return text
    .replace(/\{#[\s\S]*?#\}/g, "")
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => fromCode(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => fromCode(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n] ?? m)
    .replace(/\\([0-9a-f]{1,6})[ \t]?/gi, (_, h) => fromCode(parseInt(h, 16)))
    .replace(/\\([^\n])/g, "$1");
}

// Each rule: pattern, plain-words problem, and where it applies.
// scope: "all" files, "css" stylesheets only, "njk" templates only.
// loose: also tried on the copy with all whitespace removed.
const rule = (re, problem, { scope = "all", loose = true } = {}) => ({ re, problem, scope, loose });
const RULES = [
  rule(/<\s*(script|iframe|object|embed|base|meta|link|form)\b/i, "A new line adds a script, frame or page-level tag, which is not allowed."),
  rule(/<\s*(set|animate|animatetransform|animatemotion|foreignobject)\b/i, "A new line adds an animation or embedded-content element, which is not allowed."),
  rule(/\bon[a-z]+\s*=/i, "A new line adds an inline event handler, which is not allowed."),
  rule(/javascript\s*:/i, "A new line adds a javascript link, which is not allowed."),
  rule(/\|\s*(safe|dump)\b|\bdump\s*\(/i, "A new line turns off safe text display or dumps raw data, which is not allowed."),
  rule(/noindex|robots/i, "A new line touches search-engine settings, which is not allowed."),
  rule(/@\s*import/i, "A new line imports another stylesheet, which is not allowed."),
  rule(/url\(\s*['"]?\s*(https?:|\/\/)/i, "A new line points an image or font at another website, which is not allowed."),
  rule(/\{%-?\s*(end)?(autoescape|filter|raw|verbatim|include|import|from|extends|block)\b/i, "A new line uses a template instruction that is not allowed.", { scope: "njk" }),
  rule(/https?:\s*\/\s*\//i, "A new style line refers to another website, which is not allowed.", { scope: "css" }),
  rule(/(^|[\s'"(=,:])\/\/[a-z0-9]/im, "A new style line refers to another website, which is not allowed.", { scope: "css", loose: false }),
  rule(/image-set\s*\(|expression\s*\(|(^|[^a-z-])behavior\s*:|-moz-binding/i, "A new style line uses a feature that is not allowed.", { scope: "css" }),
];

const lineSet = (text) => new Set(text.split("\n").map((l) => l.trim()));

export function checkLayoutEdit({ path: filePath, before, after } = {}) {
  if (typeof before !== "string" || typeof after !== "string") {
    return ["The edit could not be checked because the file contents were missing."];
  }
  const problems = [];
  if (after.trim() === "" || after.length < before.length * 0.2) {
    problems.push("This change would empty out or nearly delete the file.");
  }
  const kind = typeof filePath === "string" && filePath.endsWith(".njk") ? "njk"
    : typeof filePath === "string" && filePath.endsWith(".css") ? "css" : "any";
  const applies = (r) => r.scope === "all" || kind === "any" || r.scope === kind;

  const old = lineSet(before);
  const added = after.split("\n").map((l) => l.trim()).filter((l) => l !== "" && !old.has(l));
  const block = normalise(added.join("\n"));
  const variants = [
    { text: added.join("\n"), loose: false },
    { text: block, loose: false },
    { text: block.replace(/\s+/g, ""), loose: true },
  ];
  const seen = new Set();
  for (const r of RULES.filter(applies)) {
    const hit = variants.some((v) => (r.loose || !v.loose) && r.re.test(v.text));
    if (hit && !seen.has(r.problem)) {
      seen.add(r.problem);
      problems.push(r.problem);
    }
  }
  return problems;
}

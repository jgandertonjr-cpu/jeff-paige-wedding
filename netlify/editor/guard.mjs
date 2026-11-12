// Deny-by-default allowlist for every path the editor may write, plus the
// rules for look-and-layout edits. Pure: no file or network access.
import path from "node:path";

const PAGES = ["index", "our-story", "details", "wedding-party", "registry", "travel", "after-party", "faq", "gallery", "404"];
const PAGE_FILES = new Set(PAGES.map((n) => `src/${n}.njk`));

const CONTENT = /^src\/_data\/[a-z]+\.json$/;
const IMAGE = /^src\/images\/[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp)$/;
const INCLUDE = /^src\/_includes\/[^/]+\.njk$/;
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

const FORBIDDEN = [
  [/<\s*(script|iframe|object|embed|base|meta|link|form)\b/i, "adds an embedded script, frame or page-level tag"],
  [/\bon[a-z]+\s*=/i, "adds an inline event handler"],
  [/javascript\s*:/i, "adds a javascript link"],
  [/\|\s*safe\b/i, "turns off the safe display of text"],
  [/noindex|robots/i, "touches search-engine settings"],
  [/@import/i, "imports another stylesheet"],
  [/url\(\s*['"]?\s*(https?:|\/\/)/i, "points an image or font at another website"],
];

const lineSet = (text) => new Set(text.split("\n").map((l) => l.trim()));

export function checkLayoutEdit({ before, after } = {}) {
  if (typeof before !== "string" || typeof after !== "string") {
    return ["The edit could not be checked because the file contents were missing."];
  }
  const problems = [];
  if (after.trim() === "" || after.length < before.length * 0.2) {
    problems.push("This change would empty out or nearly delete the file.");
  }
  const old = lineSet(before);
  const seen = new Set();
  for (const raw of after.split("\n")) {
    const line = raw.trim();
    if (line === "" || old.has(line)) continue;
    for (const [re, what] of FORBIDDEN) {
      const msg = `A new line ${what}, which is not allowed.`;
      if (re.test(line) && !seen.has(msg)) {
        seen.add(msg);
        problems.push(msg);
      }
    }
  }
  return problems;
}

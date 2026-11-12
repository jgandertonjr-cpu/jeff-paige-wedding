import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPath } from "../netlify/editor/guard.mjs";

test("allowed paths classify by kind; the stylesheet and templates are no longer allowed", () => {
  const cases = {
    "src/_data/faq.json": "content",
    "src/_data/guests.json": "content",
    "src/images/photo-20261112-ab12cd.jpg": "image",
    "src/images/a.webp": "image",
    "src/images/a.JPG": null,
    "src/css/styles.css": null,
    "src/travel.njk": null,
    "src/404.njk": null,
    "src/_includes/detail-item.njk": null,
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

test("the stylesheet and every template are refused", () => {
  const PAGES = ["index", "our-story", "details", "wedding-party", "registry", "travel", "after-party", "faq", "gallery", "404"];
  const templates = [
    "src/css/styles.css",
    ...PAGES.map((n) => `src/${n}.njk`),
    "src/_includes/add-to-calendar.njk", "src/_includes/detail-item.njk", "src/_includes/icons.njk", "src/_includes/anything.njk",
  ];
  for (const p of templates) assert.equal(classifyPath(p), null, p);
});

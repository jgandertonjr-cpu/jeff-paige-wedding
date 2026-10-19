import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import markdownIt from "markdown-it";

const INPUT = "src";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Dates from the CMS are stored as "YYYY-MM-DD" (or a full ISO datetime).
// Parse the calendar date only, so the time zone of the build server never
// shifts the day.
function parseDate(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) throw new Error(`Expected a date like 2028-08-05, got "${value}"`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return { y, mo, d, weekday: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() };
}

const md = markdownIt({ html: false, linkify: false, typographer: false });

export default function (eleventyConfig) {
  // Only .njk files are templates. Everything else in src/ (the study tools,
  // trackers, images, CSS) is copied through untouched.
  eleventyConfig.setTemplateFormats(["njk"]);
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true, throwOnUndefined: false });

  for (const p of [
    "src/css",
    "src/images",
    "src/study",
    "src/pd-tracker",
    "src/admin",
    "src/*.html",
    "src/*.ico",
    "src/*.txt",
    "src/*.xml",
    "src/*.js",
    "src/*.toml",
    "src/_redirects",
    "src/_headers",
  ]) {
    eleventyConfig.addPassthroughCopy(p);
  }

  // ── Date filters ────────────────────────────────────────────────────────
  // {{ site.wedding_date | dateFormat("long") }}        → August 5, 2028
  // {{ site.wedding_date | dateFormat("weekdayLong") }} → Saturday, August 5, 2028
  // {{ site.wedding_date | dateFormat("weekday") }}     → Saturday
  // {{ site.wedding_date | dateFormat("iso") }}         → 2028-08-05
  // {{ site.wedding_date | dateFormat("dots") }}        → 8.5.2028
  eleventyConfig.addFilter("dateFormat", (value, style = "long") => {
    const { y, mo, d, weekday } = parseDate(value);
    const long = `${MONTHS[mo - 1]} ${d}, ${y}`;
    switch (style) {
      case "long": return long;
      case "weekdayLong": return `${WEEKDAYS[weekday]}, ${long}`;
      case "weekday": return WEEKDAYS[weekday];
      case "iso": return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      case "dots": return `${mo}.${d}.${y}`;
      default: throw new Error(`Unknown dateFormat style "${style}"`);
    }
  });

  // UTC offset of US Eastern time on the given date, e.g. "-04:00" in August.
  eleventyConfig.addFilter("easternOffset", (value) => {
    const { y, mo, d } = parseDate(value);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "longOffset",
    }).formatToParts(new Date(Date.UTC(y, mo - 1, d, 12)));
    const name = parts.find((p) => p.type === "timeZoneName").value; // "GMT-04:00"
    return name.replace("GMT", "") || "+00:00";
  });

  // ── Images ──────────────────────────────────────────────────────────────
  // The CMS stores "/images/foo.jpg"; the pages have always used the relative
  // "images/foo.jpg", so strip the leading slash.
  eleventyConfig.addFilter("relUrl", (value) => String(value || "").replace(/^\//, ""));

  // Real pixel size of an image in src/, so width/height attributes are always
  // right, even for newly uploaded photos.
  const sizeCache = new Map();
  eleventyConfig.addFilter("imgSize", (value) => {
    const rel = String(value || "").replace(/^\//, "");
    if (!sizeCache.has(rel)) {
      const file = path.join(INPUT, rel);
      if (!fs.existsSync(file)) throw new Error(`Image not found: ${file}`);
      const { width, height, orientation } = imageSize(fs.readFileSync(file));
      // EXIF orientations 5–8 are rotated 90°, so width and height swap.
      sizeCache.set(rel, orientation >= 5 ? { width: height, height: width } : { width, height });
    }
    return sizeCache.get(rel);
  });

  // ── Text helpers ────────────────────────────────────────────────────────
  // Markdown → HTML for the few fields that allow formatting (story, FAQ).
  eleventyConfig.addFilter("markdown", (value) => md.render(String(value || "")).trim());
  eleventyConfig.addFilter("markdownInline", (value) => md.renderInline(String(value || "").trim()));
  // Split a text field into paragraphs at blank lines.
  eleventyConfig.addFilter("paragraphs", (value) =>
    String(value || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean));

  // "New Hope, PA" → "New&nbsp;Hope,&nbsp;PA" (keeps short phrases on one line).
  eleventyConfig.addFilter("nbsp", (value) =>
    String(value || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/ /g, "&nbsp;"));

  // Google Maps links built from the venue address.
  eleventyConfig.addFilter("mapsSearchUrl", (query) =>
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query).replace(/%20/g, "+"));
  eleventyConfig.addFilter("mapsEmbedUrl", (query) =>
    "https://maps.google.com/maps?q=" + String(query).replace(/ /g, "+") + "&output=embed");

  eleventyConfig.addFilter("pad2", (n) => String(n).padStart(2, "0"));

  // Short fingerprint of any value, for cache-busting script URLs: when the
  // guest list or wedding date changes, the URL changes, so no browser or CDN
  // can keep serving an old copy.
  eleventyConfig.addFilter("fingerprint", (...values) =>
    crypto.createHash("sha256").update(JSON.stringify(values)).digest("hex").slice(0, 10));

  // Largest number of extra people on any one invitation (at least 1). The
  // RSVP form renders this many guest blocks so Netlify Forms knows every
  // field name in advance.
  eleventyConfig.addFilter("maxPartySize", (guests) =>
    Math.max(1, ...(guests || []).map((g) => (g.party || []).length)));

  return {
    dir: { input: INPUT, output: "_site", includes: "_includes", data: "_data" },
    htmlTemplateEngine: "njk",
  };
}

// The safety check that runs at the end of every build.
//   node scripts/check-site.mjs [dir=_site]            check a built site
//   node scripts/check-site.mjs [dir=_site] --record   save what the built site looks like
//                                                       today (npm run protect:record)
//
// It reads the BUILT site, so it cannot be fooled by anything a template does.
// A problem fails the build; Netlify then keeps the previous version live.
// It checks that every public page exists, that links and images resolve, that
// private pages keep their "noindex", that the search-engine and hosting files
// are unchanged, that no key-shaped text is in the output, and that the public
// pages load nothing new from outside (scripts, frames, event attributes,
// forms, remote resources) compared with scripts/protected-files.json.
//
// checkSite(dir, { protectedFile }) → string[] of plain-sentence problems.
// It never throws; a missing file is itself a problem.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const DEFAULT_RECORD = path.join(HERE, "protected-files.json");

// The ten pages and the 404 page (Netlify "pretty URLs" serve /details from details.html).
const PUBLIC_PAGES = [
  "index.html", "our-story.html", "details.html", "travel.html", "gallery.html",
  "wedding-party.html", "faq.html", "registry.html", "rsvp.html", "after-party.html", "404.html",
];
const PRIVATE_PAGES = [
  "study/index.html", "pd-tracker/index.html", "blue-line-prep.html", "oral-board-prep.html",
  "nelson-denny-practice.html", "landscaping-hours.html", "admin/index.html", "admin/rsvps/index.html",
];
const HASHED_FILES = ["robots.txt", "_headers", "_redirects", "sitemap.xml"];
const STYLESHEETS = ["css/styles.css", "css/theme.css"];

const SECRET_PATTERNS = [/sk-ant-[A-Za-z0-9_-]{10,}/, /github_pat_[A-Za-z0-9_]{20,}/, /ghp_[A-Za-z0-9]{20,}/, /nfp_[A-Za-z0-9]{20,}/];
const TEXT_EXT = new Set([".html", ".css", ".js", ".mjs", ".json", ".txt", ".xml", ".ics", ".yml", ".yaml", ".toml", ".md", ".svg", ".map", ".webmanifest", ""]);
const SECRET_SCAN_MAX_BYTES = 2 * 1024 * 1024;

const sha = (data) => crypto.createHash("sha256").update(data).digest("hex");
const posix = (p) => p.split(path.sep).join("/");

function read(dir, rel) {
  try {
    return fs.readFileSync(path.join(dir, rel));
  } catch {
    return null;
  }
}
const readText = (dir, rel) => read(dir, rel)?.toString("utf8") ?? null;

function walk(dir, base = dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, base));
    else if (e.isFile()) out.push(posix(path.relative(base, full)));
  }
  return out.sort();
}

function pageName(rel) {
  const stem = rel.replace(/\.html$/, "").replace(/\/index$/, "");
  if (stem === "index") return "Home";
  if (stem === "404") return "404 (page not found)";
  if (stem === "faq") return "FAQ";
  return stem.split(/[-/]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ---- reading HTML and CSS ---------------------------------------------------

const TAG = /<([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function attributes(text) {
  const out = {};
  for (const m of text.matchAll(ATTR)) {
    const name = m[1].toLowerCase();
    if (!(name in out)) out[name] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

// The origin of an absolute or protocol-relative URL, "scheme:" for other
// schemes (data:, javascript:, blob:), "" for relative URLs and for mailto:/tel:.
function originOf(value) {
  const v = String(value).trim();
  if (/^\/\//.test(v)) return originOf("https:" + v);
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(v);
  if (!scheme) return "";
  const s = scheme[1].toLowerCase();
  if (s === "mailto" || s === "tel") return "";
  if (s === "http" || s === "https") {
    try {
      return new URL(v).origin;
    } catch {
      return "(unreadable address)";
    }
  }
  return `${s}:`;
}

function cssOrigins(css) {
  const found = [];
  for (const m of css.matchAll(/url\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi)) found.push(m[2]);
  for (const m of css.matchAll(/@import\s+(['"])([\s\S]*?)\1/gi)) found.push(m[2]);
  return found.map(originOf).filter(Boolean);
}

const withoutVersion = (src) => src.replace(/([?&])v=[^&#]*&?/g, "$1").replace(/[?&]$/, "");

const unique = (list) => [...new Set(list)].sort();

// What a page loads or runs, as sets of short labels.
export function pageFacts(html) {
  const scripts = [], iframes = [], handlers = [], forms = [], tags = [], origins = [];
  let text = html.replace(/<!--[\s\S]*?-->/g, "");

  for (const m of text.matchAll(/<script\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/script\s*>/gi)) {
    const a = attributes(m[1]);
    if (a.src !== undefined) scripts.push(`src:${withoutVersion(a.src.trim())}`);
    else if (/ld\+json/i.test(a.type || "")) scripts.push("ld+json"); // its text follows the site's content
    else scripts.push(`inline:${sha(m[2].trim()).slice(0, 16)}`);
  }
  text = text.replace(/(<script\b(?:"[^"]*"|'[^']*'|[^'">])*>)[\s\S]*?<\/script\s*>/gi, "$1</script>");
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) origins.push(...cssOrigins(m[1]));
  text = text.replace(/(<style\b[^>]*>)[\s\S]*?<\/style\s*>/gi, "$1</style>");

  for (const m of text.matchAll(TAG)) {
    const name = m[1].toLowerCase();
    const a = attributes(m[2]);
    for (const attr of Object.keys(a)) if (/^on[a-z]+$/.test(attr)) handlers.push(attr);

    if (name === "iframe") iframes.push(originOf(a.src ?? "") || (a.src ? "(this site)" : "(no address)"));
    if (name === "form") forms.push(a.action === undefined ? "(no action)" : originOf(a.action) || a.action.trim());
    if (name === "base" || name === "object" || name === "embed") tags.push(name);
    if (name === "meta" && a["http-equiv"] !== undefined) tags.push(`meta http-equiv ${a["http-equiv"].trim().toLowerCase()}`);

    // Things the page loads. A link's destination (<a href>) is left alone, except for
    // schemes that run code.
    const loaders = [];
    for (const attr of ["src", "poster", "data"]) if (name !== "script" && a[attr] !== undefined) loaders.push(a[attr]);
    for (const attr of Object.keys(a)) if (/^data-.*src$/.test(attr)) loaders.push(a[attr]); // the map frame is made from one
    if (a.srcset !== undefined) for (const part of a.srcset.split(",")) loaders.push(part.trim().split(/\s+/)[0] || "");
    if (name === "link" && a.href !== undefined) loaders.push(a.href);
    for (const v of loaders) {
      const o = originOf(v);
      if (o) origins.push(o);
    }
    if ((name === "a" || name === "area") && a.href !== undefined) {
      const o = originOf(a.href);
      if (/^(javascript|data|vbscript):$/.test(o)) origins.push(o);
    }
    if (a.style !== undefined) origins.push(...cssOrigins(a.style));
  }

  return { scripts: unique(scripts), iframes: unique(iframes), handlers: unique(handlers), forms: unique(forms), tags: unique(tags), origins: unique(origins) };
}

const stylesheetFacts = (css) => ({ origins: unique(cssOrigins(css)) });

// ---- internal links ---------------------------------------------------------

function linksOf(html) {
  const out = [];
  const text = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const m of text.matchAll(TAG)) {
    const name = m[1].toLowerCase();
    if (name !== "a" && name !== "link" && name !== "script" && name !== "img" && name !== "source") continue;
    const a = attributes(m[2]);
    if ((name === "a" || name === "link") && a.href !== undefined) out.push(a.href);
    if ((name === "script" || name === "img" || name === "source") && a.src !== undefined) out.push(a.src);
    if (a.srcset !== undefined) for (const part of a.srcset.split(",")) out.push(part.trim().split(/\s+/)[0] || "");
  }
  return out;
}

// Does the link point at something in the site? Netlify pretty URLs: /details and
// details.html both reach details.html, and a folder reaches its index.html.
function internalTarget(files, page, link) {
  let v = link.trim();
  if (!v || v.startsWith("#") || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(v)) return true; // fragment-only, absolute, mailto:, tel:
  v = v.replace(/[?#].*$/, "");
  if (v === "/api" || v.startsWith("/api/") || v === "/wedding.ics") return true; // served at run time or generated
  const resolved = v.startsWith("/") ? v.slice(1) : path.posix.join(path.posix.dirname(page), v);
  let p = path.posix.normalize(resolved);
  if (p === "." || p === "") p = "";
  if (p === "" || p.endsWith("/")) return files.has(p + "index.html");
  return files.has(p) || files.has(p + ".html") || files.has(p + "/index.html");
}

// ---- the check --------------------------------------------------------------

function loadRecord(file) {
  try {
    const record = JSON.parse(fs.readFileSync(file, "utf8"));
    return record && typeof record === "object" ? record : null;
  } catch {
    return null;
  }
}

function newThings(where, found, allowed, describe, problems) {
  const known = new Set(allowed || []);
  for (const item of found) if (!known.has(item)) problems.push(describe(where, item));
}

const SAYS = {
  scripts: (where) => `${where} has a new script that was not there before.`,
  iframes: (where, o) => `${where} has an embedded frame from ${o} that was not there before.`,
  handlers: (where, n) => `${where} has a new "${n}" event attribute that was not there before.`,
  forms: (where, a) => `${where} has a form that sends to ${a}, which was not there before.`,
  tags: (where, t) => `${where} has a new <${t}> tag that was not there before.`,
  origins: (where, o) => `${where} now loads something from ${o}, which is not on the allowed list.`,
};

export function checkSite(dir, { protectedFile = DEFAULT_RECORD } = {}) {
  const problems = [];
  try {
    const record = loadRecord(protectedFile);
    if (!record) {
      problems.push("The record of protected files (scripts/protected-files.json) is missing or unreadable.");
    }
    const pages = record?.pages ?? PUBLIC_PAGES;
    const privatePages = record?.noindex ?? PRIVATE_PAGES;
    const files = new Set(walk(dir));

    // 1. Pages that must exist (and be whole).
    const html = {};
    for (const page of pages) {
      const text = readText(dir, page);
      if (text === null) problems.push(`The ${pageName(page)} page is missing from the site.`);
      else if (!/<\/html>/i.test(text)) problems.push(`The ${pageName(page)} page is empty or cut short.`);
      else html[page] = text;
    }

    // 2. Private pages keep their "noindex".
    for (const page of privatePages) {
      const text = readText(dir, page);
      if (text === null) {
        problems.push(`The private page ${page} is missing from the site.`);
        continue;
      }
      const hidden = [...text.matchAll(/<meta\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)].some((m) => {
        const a = attributes(m[1]);
        return /^robots$/i.test(a.name || "") && /noindex/i.test(a.content || "");
      });
      if (!hidden) problems.push(`The private page ${page} has lost its "noindex" tag, so search engines could list it.`);
    }

    // 3. Search-engine and hosting files are unchanged.
    for (const file of HASHED_FILES) {
      const bytes = read(dir, file);
      const expected = record?.hashes?.[file];
      if (bytes === null) problems.push(`${file} is missing from the site.`);
      else if (record && sha(bytes) !== expected) problems.push(`${file} is different from the recorded copy.`);
    }

    // 4. Internal links and images on the public pages.
    for (const [page, text] of Object.entries(html)) {
      const bad = unique(linksOf(text).filter((l) => !internalTarget(files, page, l)));
      for (const link of bad) problems.push(`The ${pageName(page)} page points at ${link}, which is not in the site.`);
    }

    // 5. Nothing new is loaded or run on the public pages.
    if (record?.rendered) {
      for (const [page, text] of Object.entries(html)) {
        const found = pageFacts(text);
        const allowed = record.rendered[page] || {};
        for (const kind of Object.keys(SAYS)) newThings(`The ${pageName(page)} page`, found[kind], allowed[kind], SAYS[kind], problems);
      }
      for (const sheet of STYLESHEETS) {
        const text = readText(dir, sheet);
        if (text === null) {
          problems.push(`${sheet} is missing from the site.`);
          continue;
        }
        newThings(`The stylesheet ${sheet}`, stylesheetFacts(text).origins, record.rendered[sheet]?.origins, SAYS.origins, problems);
      }
    }

    // 6. Key-shaped text anywhere in the output (the match itself is never printed).
    for (const rel of files) {
      if (!TEXT_EXT.has(path.extname(rel).toLowerCase())) continue;
      let size;
      try {
        size = fs.statSync(path.join(dir, rel)).size;
      } catch {
        continue;
      }
      if (size > SECRET_SCAN_MAX_BYTES) continue;
      const text = readText(dir, rel);
      if (text !== null && SECRET_PATTERNS.some((re) => re.test(text))) problems.push(`${rel} contains text that looks like a secret key.`);
    }
  } catch (e) {
    problems.push(`The site check could not finish (${e?.name || "Error"}).`);
  }
  return problems;
}

// What the built site looks like today, for scripts/protected-files.json.
export function recordSite(dir, protectedFile = DEFAULT_RECORD) {
  const old = loadRecord(protectedFile) || {};
  const pages = old.pages ?? PUBLIC_PAGES;
  const hashes = {};
  for (const file of HASHED_FILES) {
    const bytes = read(dir, file);
    if (bytes === null) throw new Error(`${file} is not in ${dir}`);
    hashes[file] = sha(bytes);
  }
  const rendered = {};
  for (const page of pages) {
    const text = readText(dir, page);
    if (text === null) throw new Error(`${page} is not in ${dir}`);
    rendered[page] = pageFacts(text);
  }
  for (const sheet of STYLESHEETS) {
    const text = readText(dir, sheet);
    if (text === null) throw new Error(`${sheet} is not in ${dir}`);
    rendered[sheet] = stylesheetFacts(text);
  }
  const record = { hashes, pages, noindex: old.noindex ?? PRIVATE_PAGES, rendered };
  fs.writeFileSync(protectedFile, JSON.stringify(record, null, 2) + "\n");
  return record;
}

// ---- command line -----------------------------------------------------------

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  const dir = path.resolve(args.find((a) => !a.startsWith("--")) || "_site");
  if (args.includes("--record")) {
    const record = recordSite(dir);
    console.log(`site check: recorded ${Object.keys(record.rendered).length} pages and stylesheets and ${Object.keys(record.hashes).length} protected files`);
  } else {
    const problems = checkSite(dir);
    if (problems.length) {
      console.error("site check: the site has problems:");
      for (const p of problems) console.error(`  - ${p}`);
      process.exit(1);
    }
    console.log("site check: ok");
  }
}

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
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";

const HERE = path.dirname(fileURLToPath(import.meta.url));
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

const SECRET_PATTERNS = [/sk-ant-[A-Za-z0-9_-]{10,}/, /github_pat_[A-Za-z0-9_]{20,}/, /ghp_[A-Za-z0-9]{20,}/, /nfp_[A-Za-z0-9]{20,}/];
const TEXT_EXT = new Set([".html", ".css", ".js", ".mjs", ".json", ".txt", ".xml", ".ics", ".yml", ".yaml", ".toml", ".md", ".svg", ".map", ".webmanifest", ""]);
// Files are scanned in pieces, each overlapping the last so a key split across
// two pieces is still seen whole.
const SECRET_SCAN_CHUNK = 1024 * 1024;
const SECRET_SCAN_OVERLAP = 256;

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
// Pages are read with a real HTML5 parser (parse5), the way a browser reads them, so
// odd-but-accepted markup (comments ended by "<!-->", "</script x>", entity-encoded
// attributes, template and foreign content) cannot hide anything.

// Remove tabs and line breaks anywhere, turn backslashes into slashes and trim
// control characters and spaces, as a browser does before reading an address.
const cleanUrl = (value) =>
  String(value)
    .replace(/[\t\n\r]/g, "")
    .replace(/\\/g, "/")
    .replace(/^[\u0000- ]+|[\u0000- ]+$/g, "");

// The origin of an absolute or protocol-relative URL, "scheme:" for other
// schemes (data:, javascript:, blob:), "" for relative URLs and for mailto:/tel:.
function originOf(value) {
  const v = cleanUrl(value);
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

// An address as it is recorded: its origin, or for a data: address a hash of the whole thing
// (nothing inside it is read, and any change to it is a change).
function addressToken(value) {
  const v = cleanUrl(value);
  if (/^data:/i.test(v)) return `data:${sha(v).slice(0, 16)}`;
  return originOf(v);
}

const decodeCss = (css) =>
  String(css)
    .replace(/\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?/g, (_, hex) => {
      const n = parseInt(hex, 16);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "�";
    })
    .replace(/\\\n/g, "")
    .replace(/\\([^\n])/g, "$1");

// Be conservative rather than precise: the text is read twice, as written and with comments
// removed, and everything found in either is kept. Escapes are decoded first. Returns the
// origins (data: addresses as hashes) and how many @import rules there are.
function cssScan(css) {
  const found = [];
  let imports = 0;
  for (const text of [decodeCss(css), decodeCss(String(css).replace(/\/\*[\s\S]*?\*\//g, ""))]) {
    imports = Math.max(imports, (text.match(/@\s*import/gi) || []).length);
    let rest = text.replace(/url\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi, (_, _q, inner) => {
      found.push(addressToken(inner));
      return " ";
    });
    rest = rest.replace(/(["'])((?:(?!\1)[^\n])*)\1/g, (_, _q, inner) => {
      const o = addressToken(inner);
      if (/^(https?:|data:|\(unreadable)/.test(o) || /^\s*[\\/]{2}/.test(inner)) found.push(o); // @import "…", image-set("…")
      return " ";
    });
    for (const m of rest.matchAll(/(?:https?:)?[\\/]{2}[^\s"'()<>;,]+/gi)) found.push(originOf(m[0].replace(/^(?=[\\/]{2})/, "")));
  }
  return { origins: found.filter(Boolean), imports };
}
const importTokens = (n) => Array.from({ length: n }, (_, i) => `import#${i + 1}`);

const withoutVersion = (src) => src.replace(/([?&])v=[^&#]*&?/g, "$1").replace(/[?&]$/, "");
const unique = (list) => [...new Set(list)].sort();

// SVG/MathML elements that can animate an address into an attribute or run script.
const ANIMATION = new Set(["set", "animate", "animatetransform", "animatemotion", "discard", "foreignobject", "handler", "listener"]);

// Origins the templates are designed to load whenever the content switches a feature on (the
// map frame appears once a venue address is filled in). Always recorded, so that switching a
// feature off and on in content never trips the check.
const DESIGNED_ORIGINS = {
  "details.html": ["https://maps.google.com"],
  "after-party.html": ["https://maps.google.com"],
};

const RESOURCE_ATTRS = ["src", "srcset", "imagesrcset", "poster", "data", "formaction", "action", "ping", "background", "manifest", "codebase", "longdesc"];

function* elements(node) {
  for (const child of node.childNodes || []) {
    if (child.tagName) yield child;
    yield* elements(child);
  }
  if (node.content) yield* elements(node.content); // <template>
}
const textOf = (el) => (el.childNodes || []).map((c) => (c.nodeName === "#text" ? c.value : "")).join("");

// What a page loads or runs, as sets of short labels, plus its links and stylesheets.
function scanPage(html) {
  const scripts = [], iframes = [], handlers = [], forms = [], tags = [], origins = [], animation = [];
  let imports = 0;
  const counts = {};
  const links = [], stylesheets = [];
  const document = parse(html, { scriptingEnabled: false }); // <noscript> content is read as markup too

  for (const el of elements(document)) {
    const name = el.tagName.toLowerCase();
    const attrs = el.attrs.map((a) => ({ name: a.name.toLowerCase(), value: a.value })); // xlink:href is "href"
    const get = (n) => attrs.find((a) => a.name === n)?.value;
    const all = (n) => attrs.filter((a) => a.name === n).map((a) => a.value);

    for (const a of attrs) if (/^on[a-z]+$/.test(a.name)) handlers.push(`${a.name}:${sha(a.value).slice(0, 16)}`);

    if (name === "script") {
      const src = get("src") ?? get("href");
      if (src !== undefined) scripts.push(`src:${withoutVersion(cleanUrl(src))}`);
      else if ((get("type") || "").trim().toLowerCase() === "application/ld+json") scripts.push("ld+json"); // its text follows the site's content
      else scripts.push(`inline:${sha(textOf(el).trim()).slice(0, 16)}`);
      const s = get("src");
      if (s !== undefined) links.push(s);
      continue;
    }
    if (name === "style") {
      const scan = cssScan(textOf(el));
      origins.push(...scan.origins);
      imports += scan.imports;
    }
    if (ANIMATION.has(name)) {
      counts[name] = (counts[name] || 0) + 1;
      animation.push(`${name}#${counts[name]}`);
    }

    if (name === "iframe" || name === "frame") {
      const src = get("src");
      iframes.push(originOf(src ?? "") || (src ? "(this site)" : "(no address)"));
    }
    if (name === "form") {
      const action = get("action");
      forms.push(action === undefined ? "(no action)" : originOf(action) || cleanUrl(action));
    }
    if (name === "base" || name === "object" || name === "embed") tags.push(name);
    if (name === "meta" && get("http-equiv") !== undefined) tags.push(`meta http-equiv ${get("http-equiv").trim().toLowerCase()}`);

    // Things the page loads. A link's destination (<a href>, <area href>) is left alone, except for
    // schemes that run code.
    const linkOnly = name === "a" || name === "area";
    const loaders = [];
    for (const attr of RESOURCE_ATTRS) {
      if (name === "form" && attr === "action") continue;
      for (const v of all(attr)) {
        if (attr === "srcset" || attr === "imagesrcset") for (const part of v.split(",")) loaders.push(part.trim().split(/\s+/)[0] || "");
        else if (attr === "ping") loaders.push(...v.split(/\s+/));
        else loaders.push(v);
      }
    }
    if (!linkOnly) loaders.push(...all("href"));
    for (const a of attrs) if (a.name.startsWith("data-") && addressToken(a.value)) loaders.push(a.value);
    if (ANIMATION.has(name)) for (const attr of ["to", "from", "by", "values"]) for (const v of all(attr)) loaders.push(...v.split(";"));
    for (const v of loaders) {
      const o = addressToken(v);
      if (o) origins.push(o);
    }
    if (linkOnly) {
      const o = addressToken(get("href") ?? "");
      if (/^(javascript|vbscript):$|^data:/.test(o)) origins.push(o);
    }
    for (const v of all("style")) {
      const scan = cssScan(v);
      origins.push(...scan.origins);
      imports += scan.imports;
    }

    // For the link check and the list of stylesheets.
    if (name === "a" || name === "link") for (const v of all("href")) links.push(v);
    if (name === "img" || name === "source") for (const v of all("src")) links.push(v);
    for (const v of [...all("srcset"), ...all("imagesrcset")]) for (const part of v.split(",")) links.push(part.trim().split(/\s+/)[0] || "");
    if (name === "link" && /(^|\s)stylesheet(\s|$)/i.test(get("rel") || "") && get("href") !== undefined) stylesheets.push(get("href"));
  }

  return {
    facts: { scripts: unique(scripts), iframes: unique(iframes), handlers: unique(handlers), forms: unique(forms), tags: unique(tags), origins: unique(origins), animation: unique(animation), imports: importTokens(imports) },
    links,
    stylesheets,
  };
}

export const pageFacts = (html) => scanPage(html).facts;
const stylesheetFacts = (css) => {
  const scan = cssScan(css);
  return { origins: unique(scan.origins), imports: importTokens(scan.imports) };
};

// A private page is hidden only if it has a real robots meta tag and every one says "noindex".
function isHidden(html) {
  const metas = [...elements(parse(html, { scriptingEnabled: false }))].filter(
    (el) => el.tagName === "meta" && (el.attrs.find((a) => a.name.toLowerCase() === "name")?.value || "").trim().toLowerCase() === "robots");
  const directives = (el) => (el.attrs.find((a) => a.name.toLowerCase() === "content")?.value || "")
    .split(",").map((d) => d.trim().toLowerCase());
  return metas.length > 0 && metas.every((el) => directives(el).some((d) => d === "noindex" || d === "none"));
}

// Does the file hold key-shaped text anywhere? Reads every byte, a piece at a time.
function hasSecret(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(SECRET_SCAN_CHUNK);
    const decoder = new StringDecoder("utf8");
    let tail = "";
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      const text = tail + (n > 0 ? decoder.write(buf.subarray(0, n)) : decoder.end());
      if (SECRET_PATTERNS.some((re) => re.test(text))) return true;
      if (n === 0) return false;
      tail = text.slice(-SECRET_SCAN_OVERLAP);
    }
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// The local stylesheet files a page links, as paths in the site.
function localPath(page, link) {
  const v = cleanUrl(link).replace(/[?#].*$/, "");
  if (!v || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(v)) return null;
  const p = path.posix.normalize(v.startsWith("/") ? v.slice(1) : path.posix.join(path.posix.dirname(page), v));
  return p === "." || p.endsWith("/") ? null : p;
}

// ---- internal links ---------------------------------------------------------

// Does the link point at something in the site? Netlify pretty URLs: /details and
// details.html both reach details.html, and a folder reaches its index.html.
function internalTarget(files, page, link) {
  let v = cleanUrl(link);
  if (!v || v.startsWith("#") || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(v)) return true; // fragment-only, absolute, mailto:, tel:
  v = v.replace(/[?#].*$/, "");
  if (v === "/api" || v.startsWith("/api/") || v === "/wedding.ics") return true; // served at run time or generated
  const resolved = v.startsWith("/") ? v.slice(1) : path.posix.join(path.posix.dirname(page), v);
  let p = path.posix.normalize(resolved);
  if (p === "." || p === "") p = "";
  if (p === "" || p.endsWith("/")) return files.has(p + "index.html");
  return files.has(p) || files.has(p + ".html") || files.has(p + "/index.html");
}

// The stylesheet files the public pages link to, as paths in the site.
const sheetsOf = (scans) =>
  unique(Object.entries(scans).flatMap(([page, scan]) => scan.stylesheets.map((h) => localPath(page, h)).filter(Boolean)));

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
  handlers: (where, n) => `${where} has a new or changed "${n.split(":")[0]}" event handler that was not there before.`,
  forms: (where, a) => `${where} has a form that sends to ${a}, which was not there before.`,
  tags: (where, t) => `${where} has a new <${t}> tag that was not there before.`,
  origins: (where, o) =>
    o.startsWith("data:") && o !== "data:"
      ? `${where} has an embedded data address that is new or changed.`
      : `${where} now loads something from ${o}, which is not on the allowed list.`,
  animation: (where, t) => `${where} has a new <${t.split("#")[0]}> element that was not there before.`,
  imports: (where) => `${where} pulls in another stylesheet that was not there before.`,
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
      const hidden = isHidden(text);
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
    const scans = {};
    for (const [page, text] of Object.entries(html)) scans[page] = scanPage(text);
    for (const [page, scan] of Object.entries(scans)) {
      const bad = unique(scan.links.filter((l) => !internalTarget(files, page, l)));
      for (const link of bad) problems.push(`The ${pageName(page)} page points at ${link}, which is not in the site.`);
    }

    // 5. Nothing new is loaded or run on the public pages.
    if (record?.rendered) {
      for (const [page, { facts: found }] of Object.entries(scans)) {
        const allowed = record.rendered[page] || {};
        for (const kind of Object.keys(SAYS)) newThings(`The ${pageName(page)} page`, found[kind], allowed[kind], SAYS[kind], problems);
      }
      for (const sheet of sheetsOf(scans)) {
        const text = readText(dir, sheet);
        if (text === null) continue; // a missing file is reported by the link check
        const found = stylesheetFacts(text);
        for (const kind of ["origins", "imports"]) newThings(`The stylesheet ${sheet}`, found[kind], record.rendered[sheet]?.[kind], SAYS[kind], problems);
      }
    }

    // 6. Key-shaped text anywhere in the output (the match itself is never printed).
    for (const rel of files) {
      if (!TEXT_EXT.has(path.extname(rel).toLowerCase())) continue;
      if (hasSecret(path.join(dir, rel))) problems.push(`${rel} contains text that looks like a secret key.`);
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
  const scans = {};
  for (const page of pages) {
    const text = readText(dir, page);
    if (text === null) throw new Error(`${page} is not in ${dir}`);
    scans[page] = scanPage(text);
    rendered[page] = scans[page].facts;
    rendered[page].origins = unique([...rendered[page].origins, ...(DESIGNED_ORIGINS[page] || [])]);
  }
  for (const sheet of sheetsOf(scans)) {
    const text = readText(dir, sheet);
    if (text === null) throw new Error(`${sheet} is not in ${dir}`);
    rendered[sheet] = stylesheetFacts(text);
  }
  const record = { hashes, pages, noindex: old.noindex ?? PRIVATE_PAGES, rendered };
  fs.writeFileSync(protectedFile, JSON.stringify(record, null, 2) + "\n");
  return record;
}

// ---- command line -----------------------------------------------------------

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
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

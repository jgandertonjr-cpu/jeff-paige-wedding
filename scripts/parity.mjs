// Proves the public site still renders identically after a change.
//   npm run parity:record  builds the site and saves a fingerprint of every page
//   npm run parity         builds again and compares against the saved fingerprint
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "design-review", "parity-baseline.json");
const SKIP_DIRS = ["admin", "study", "pd-tracker"];

const sha = (data) => crypto.createHash("sha256").update(data).digest("hex");

// The stylesheets a page links.
const stylesheets = (html) => [...html.matchAll(/<link\b[^>]*>/gi)]
  .map((m) => m[0])
  .filter((tag) => /\brel\s*=\s*["']?stylesheet\b/i.test(tag))
  .map((tag) => /\bhref\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1] || "");

// Returns { text, problems }: the text that is fingerprinted, and differences
// found by reading the page itself. The colour stylesheet link was added after
// the baseline was recorded, so its line stays out of the fingerprint; instead
// every page that links the main stylesheet must also link the colour one.
export function normalise(name, text) {
  if (name.endsWith(".ics")) {
    return { text: text.split(/\r?\n/).filter((l) => !l.startsWith("DTSTAMP:")).join("\n"), problems: [] };
  }
  const sheets = stylesheets(text);
  const has = (file) => sheets.some((h) => new RegExp(`(^|/)css/${file}(\\?|$)`).test(h));
  const problems = has("styles\\.css") && !has("theme\\.css") ? [`differs: ${name} (missing theme stylesheet)`] : [];
  const out = text
    .split("\n")
    .filter((l) => !(/<link\b/.test(l) && /css\/theme\.css/.test(l)))
    .join("\n")
    .replace(/\?v=[^"'\s&)>]*/g, "")
    .replace(/>\s+</g, "> <");
  return { text: out, problems };
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out.sort();
}

function fingerprint(outDir) {
  const result = {};
  const problems = [];
  for (const rel of walk(outDir)) {
    if (SKIP_DIRS.some((d) => rel.startsWith(d + "/"))) continue;
    const full = path.join(outDir, rel);
    if (rel.endsWith(".html") || rel === "wedding.ics") {
      const page = normalise(rel, fs.readFileSync(full, "utf8"));
      result[rel] = sha(page.text);
      problems.push(...page.problems);
    } else if (rel === "css/styles.css" || rel.startsWith("js/")) {
      result[rel] = sha(fs.readFileSync(full));
    }
  }
  return { result, problems };
}

function build() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "parity-"));
  try {
    execFileSync("npx", ["@11ty/eleventy", "--quiet", `--output=${tmp}`], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
    return fingerprint(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function main() {
  const { result: current, problems: pageProblems } = build();

  if (process.argv.includes("--record")) {
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
    fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n");
    console.log(`parity: recorded ${Object.keys(current).length} files`);
  } else {
    if (!fs.existsSync(BASELINE)) {
      console.error("parity: no baseline found. Run `npm run parity:record` first.");
      process.exit(1);
    }
    const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
    const problems = [...pageProblems];
    for (const f of Object.keys(baseline)) {
      if (!(f in current)) problems.push(`missing: ${f}`);
      else if (current[f] !== baseline[f]) problems.push(`differs: ${f}`);
    }
    for (const f of Object.keys(current)) if (!(f in baseline)) problems.push(`extra: ${f}`);
    if (problems.length) {
      console.error(problems.join("\n"));
      console.error(`parity: ${problems.length} differences`);
      process.exit(1);
    }
    console.log("parity: 0 differences");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

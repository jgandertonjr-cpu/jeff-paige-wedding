// Proves the public site still renders identically after a change.
//   npm run parity:record  builds the site and saves a fingerprint of every page
//   npm run parity         builds again and compares against the saved fingerprint
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASELINE = path.join(ROOT, "design-review", "parity-baseline.json");
const SKIP_DIRS = ["admin", "study", "pd-tracker"];

const sha = (data) => crypto.createHash("sha256").update(data).digest("hex");

function normalise(name, text) {
  if (name.endsWith(".ics")) {
    return text.split(/\r?\n/).filter((l) => !l.startsWith("DTSTAMP:")).join("\n");
  }
  return text
    .split("\n")
    .filter((l) => !(/<link\b/.test(l) && /css\/theme\.css/.test(l)))
    .join("\n")
    .replace(/\?v=[^"'\s&)>]*/g, "")
    .replace(/>\s+</g, "> <");
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
  for (const rel of walk(outDir)) {
    if (SKIP_DIRS.some((d) => rel.startsWith(d + "/"))) continue;
    const full = path.join(outDir, rel);
    if (rel.endsWith(".html") || rel === "wedding.ics") {
      result[rel] = sha(normalise(rel, fs.readFileSync(full, "utf8")));
    } else if (rel === "css/styles.css" || rel.startsWith("js/")) {
      result[rel] = sha(fs.readFileSync(full));
    }
  }
  return result;
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

const current = build();

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
  const problems = [];
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

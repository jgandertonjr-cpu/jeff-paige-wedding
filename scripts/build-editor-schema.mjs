// Reads src/admin/config.yml and writes netlify/editor/schema.gen.mjs, a plain
// description of every editable field in src/_data/*.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = path.join(ROOT, "src/admin/config.yml");
const OUTPUT = path.join(ROOT, "netlify/editor/schema.gen.mjs");

const HEADER =
  "// Generated from src/admin/config.yml by `npm run schema`. Do not edit by hand.\n";

const WIDGET_TYPES = {
  string: "string", text: "text", markdown: "markdown", boolean: "boolean",
  image: "image", select: "select", hidden: "hidden", object: "object", list: "list",
};

function fieldType(raw, where) {
  const widget = raw.widget ?? "string";
  if (widget === "datetime") {
    if (raw.type === "date") return "date";
    if (raw.type === "time") return "time";
    throw new Error(`Unsupported datetime type "${raw.type}" at ${where}`);
  }
  const type = WIDGET_TYPES[widget];
  if (!type) throw new Error(`Unsupported widget "${widget}" at ${where}`);
  return type;
}

function convertField(raw, parent) {
  const where = `${parent}.${raw.name}`;
  const type = fieldType(raw, where);
  const out = {
    name: raw.name,
    label: raw.label ?? raw.name,
    type,
    required: raw.required !== false,
  };
  if (raw.pattern) {
    out.pattern = raw.pattern[0];
    out.patternMessage = raw.pattern[1];
  }
  if (raw.maxlength !== undefined) out.maxlength = raw.maxlength;
  if (type === "select") {
    out.options = (raw.options ?? []).map((o) => (typeof o === "object" ? o.value : o));
    if (raw.multiple) out.multiple = true;
  }
  if (raw.min !== undefined) out.min = raw.min;
  if (raw.max !== undefined) out.max = raw.max;
  if (type === "object" || (type === "list" && raw.fields)) {
    out.fields = (raw.fields ?? []).map((f) => convertField(f, where));
  }
  return out;
}

export function buildSchema(yamlText = fs.readFileSync(CONFIG, "utf8")) {
  const config = parse(yamlText, { merge: true });
  const files = {};
  for (const collection of config.collections) {
    for (const file of collection.files ?? []) {
      files[file.name] = {
        path: file.file,
        label: file.label,
        fields: file.fields.map((f) => convertField(f, file.name)),
      };
    }
  }
  return { files };
}

export function renderSchemaModule(yamlText) {
  return `${HEADER}export default ${JSON.stringify(buildSchema(yamlText), null, 2)};\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, renderSchemaModule());
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)}`);
}

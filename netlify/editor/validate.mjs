// Checks proposed content against the editor schema and the site's safety rules.
// Pure: callers pass everything in (no file, network or environment access).
import { contrastRatio, CONTRAST_PAIRS } from "./contrast.mjs";

const TAG = /<[A-Za-z/!]/;
const HEX = /^#[0-9A-Fa-f]{6}$/;
const TEXT_TYPES = new Set(["string", "text", "markdown"]);

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isBlank = (v) => v === undefined || v === null || v === "";

function realDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

function isLinkField(f) {
  return f.type === "string" && (f.name === "url" || f.name.endsWith("_url"));
}

export function validateContent(content, ctx) {
  const issues = [];
  const { schema, images, previous } = ctx;
  const known = new Set(["index.html"]);
  const prevNav = previous && previous.nav;
  if (prevNav) for (const list of Object.values(prevNav)) for (const e of list || []) if (e && typeof e.url === "string") known.add(e.url);

  const linkOk = (v) => {
    if (/^https:\/\/[^\s/]/.test(v)) return true;
    if (/^mailto:[^\s@]+@[^\s@]+$/.test(v)) return true;
    if (/^tel:\+?[0-9][0-9\s().-]*$/.test(v)) return true;
    return known.has(v.split("#")[0]);
  };

  function walk(file, fields, value, path, trail) {
    const add = (p, t, message) => issues.push({ file, path: p, label: t.join(" → "), message });
    if (!isObj(value)) return;
    const names = new Set(fields.map((f) => f.name));
    for (const k of Object.keys(value)) {
      if (!names.has(k)) add(`${path}/${k}`, [...trail, k], `There is no "${k}" setting here, so it cannot be used.`);
    }
    for (const f of fields) {
      checkField(file, f, value[f.name], `${path}/${f.name}`, [...trail, f.label], file === "nav");
    }
  }

  function checkField(file, f, v, path, trail, inNav) {
    const here = (message, p = path, t = trail) => issues.push({ file, path: p, label: t.join(" → "), message });
    const name = trail[trail.length - 1];
    if (isBlank(v)) {
      if (f.required && f.type !== "boolean") here(`${name} needs a value and cannot be left empty.`);
      else if (f.required && v === undefined) here(`${name} needs a value and cannot be left empty.`);
      else if (f.required && v === null) here(`${name} needs a value and cannot be left empty.`);
      return;
    }
    const wrong = (what) => here(`${name} must be ${what}.`);
    switch (f.type) {
      case "string": case "text": case "markdown": {
        if (typeof v !== "string") return wrong("text");
        if (f.required && v.trim() === "") return here(`${name} needs a value and cannot be left empty.`);
        if (TAG.test(v)) return here(`${name} cannot contain page code such as <b> or <script>.`);
        if (f.maxlength && v.length > f.maxlength) here(`${name} is too long. Please keep it to ${f.maxlength} characters or fewer.`);
        if (f.pattern && !new RegExp(f.pattern).test(v)) here(f.patternMessage ? f.patternMessage.replace(/[.]?$/, ".") : `${name} is not in the right format.`);
        if (f.type === "markdown") {
          for (const m of v.matchAll(/\]\(\s*<?([^)\s>]*)>?(?:\s+["'][^)]*["'])?\s*\)/g)) {
            if (!linkOk(m[1])) here(`${name} has a link that cannot be used (${m[1] || "empty"}). Links must start with https://, mailto: or tel:, or go to a page on this site.`);
          }
        } else if (!inNav && isLinkField(f) && v !== "" && !linkOk(v)) {
          here(`${name} is not a link that can be used. It must start with https://, mailto: or tel:, or be a page on this site.`);
        }
        return;
      }
      case "boolean":
        if (typeof v !== "boolean") wrong("yes or no");
        return;
      case "date":
        if (typeof v !== "string" || !realDate(v)) wrong("a real date written like 2028-06-01");
        return;
      case "time":
        if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) wrong("a time written like 16:30");
        return;
      case "image":
        if (typeof v !== "string") return wrong("a photo from the photo library");
        if (!images.has(v)) here(`${name} points to a photo that is not in the photo library.`);
        return;
      case "hidden":
        if (v !== null && typeof v === "object") wrong("a single value");
        return;
      case "select": {
        if (f.multiple) {
          if (!Array.isArray(v)) return wrong("a list of choices");
          const bad = v.find((x) => !f.options.includes(x));
          if (bad !== undefined) return here(`${name} includes "${bad}", which is not one of the available choices.`);
          if (f.min !== undefined && v.length < f.min) return here(`${name} needs at least ${f.min} choices.`);
          if (f.max !== undefined && v.length > f.max) return here(`${name} can have at most ${f.max} choices.`);
          if (f.name === "section_order" && (v.length !== f.options.length || !f.options.every((o) => v.filter((x) => x === o).length === 1))) {
            here(`${name} must list every section exactly once, with none repeated, missing or added.`);
          }
        } else if (typeof v !== "string" || !f.options.includes(v)) {
          here(`${name} must be one of the available choices.`);
        }
        return;
      }
      case "object":
        if (!isObj(v)) return wrong("a group of settings");
        walk(file, f.fields, v, path, trail);
        return;
      case "list": {
        if (!Array.isArray(v)) return wrong("a list");
        if (f.min !== undefined && v.length < f.min) here(`${name} needs at least ${f.min} ${f.min === 1 ? "entry" : "entries"}.`);
        if (f.max !== undefined && v.length > f.max) here(`${name} can have at most ${f.max} ${f.max === 1 ? "entry" : "entries"}.`);
        v.forEach((item, i) => {
          const p = `${path}/${i}`;
          const t = [...trail, `item ${i + 1}`];
          if (f.fields) {
            if (!isObj(item)) return here(`${name} item ${i + 1} must be a group of settings.`, p, t);
            walk(file, f.fields, item, p, t);
          } else if (typeof item !== "string") {
            here(`${name} item ${i + 1} must be text.`, p, t);
          } else if (TAG.test(item)) {
            here(`${name} item ${i + 1} cannot contain page code such as <b> or <script>.`, p, t);
          }
        });
        return;
      }
    }
  }

  const fileLabel = (k) => schema.files[k].label;
  const fieldLabelTrail = (k, names) => {
    let fields = schema.files[k].fields;
    const trail = [fileLabel(k)];
    for (const n of names) {
      const f = fields && fields.find((x) => x.name === n);
      if (!f) break;
      trail.push(f.label);
      fields = f.fields;
    }
    return trail;
  };

  for (const [key, data] of Object.entries(content)) {
    if (!schema.files[key]) {
      issues.push({ file: key, path: "", label: key, message: `"${key}" is not something the editor can change.` });
      continue;
    }
    if (!isObj(data)) {
      issues.push({ file: key, path: "", label: fileLabel(key), message: `${fileLabel(key)} must be a group of settings.` });
      continue;
    }
    walk(key, schema.files[key].fields, data, "", [fileLabel(key)]);
  }

  // Meal codes are saved with every reply, so they stay fixed while RSVPs are open.
  if (content.rsvp && isObj(content.rsvp) && previous && previous.rsvp && previous.rsvp.rsvp_open === true) {
    const before = (previous.rsvp.meal_options || []).map((m) => m && m.value);
    const nowList = content.rsvp.meal_options;
    if (Array.isArray(nowList)) {
      const now = nowList.map((m) => m && m.value);
      if (before.some((v) => !now.includes(v))) {
        const base = fieldLabelTrail("rsvp", ["meal_options"]);
        if (now.length === before.length) {
          const vt = fieldLabelTrail("rsvp", ["meal_options", "value"]);
          now.forEach((v, i) => {
            if (!before.includes(v)) {
              issues.push({
                file: "rsvp", path: `/meal_options/${i}/value`,
                label: [...base, `item ${i + 1}`, vt[vt.length - 1]].join(" → "),
                message: "Meal short codes cannot be changed while RSVPs are open, because replies already saved use them.",
              });
            }
          });
        } else {
          issues.push({
            file: "rsvp", path: "/meal_options", label: base.join(" → "),
            message: "Meal choices cannot be removed while RSVPs are open, because replies already saved use them.",
          });
        }
      }
    }
  }

  // Menu addresses are fixed: the pages themselves do not move.
  if (content.nav && isObj(content.nav) && prevNav) {
    const lists = (n) => Object.entries(n).filter(([, l]) => Array.isArray(l));
    const prevUrls = new Set(lists(prevNav).flatMap(([, l]) => l.map((e) => e && e.url)));
    const nowAll = lists(content.nav).flatMap(([, l]) => l.map((e) => e && e.url));
    let flagged = false;
    for (const [name, list] of lists(content.nav)) {
      list.forEach((e, i) => {
        if (e && !prevUrls.has(e.url)) {
          flagged = true;
          const t = fieldLabelTrail("nav", [name, "url"]);
          issues.push({
            file: "nav", path: `/${name}/${i}/url`,
            label: [...t.slice(0, -1), `item ${i + 1}`, t[t.length - 1]].join(" → "),
            message: "Menu link addresses cannot be changed, only the wording and the order.",
          });
        }
      });
    }
    if (!flagged) {
      for (const [name, list] of lists(prevNav)) {
        if (list.some((e) => e && !nowAll.includes(e.url))) {
          issues.push({
            file: "nav", path: `/${name}`, label: fieldLabelTrail("nav", [name]).join(" → "),
            message: "Menu links cannot be removed, only reworded or reordered.",
          });
        }
      }
    }
  }

  // Theme colours must stay readable together.
  if (content.theme && isObj(content.theme)) {
    const th = content.theme;
    const label = (k) => (schema.files.theme.fields.find((f) => f.name === k) || { label: k }).label;
    for (const [fg, bg, min] of CONTRAST_PAIRS) {
      if (typeof th[fg] === "string" && typeof th[bg] === "string" && HEX.test(th[fg]) && HEX.test(th[bg])) {
        if (contrastRatio(th[fg], th[bg]) < min) {
          issues.push({
            file: "theme", path: `/${fg}`,
            label: `${fileLabel("theme")} → ${label(fg)}`,
            message: `${label(fg)} on ${label(bg)} does not have enough contrast to read.`,
          });
        }
      }
    }
  }

  return issues;
}

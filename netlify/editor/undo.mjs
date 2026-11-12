// Undo of an earlier website edit, piece by piece: each piece goes back only if
// it still has the value that edit gave it. Content files are matched field by
// field (list items by content); page files and the stylesheet only as a whole,
// and only if unchanged since. Added photos are left in place.
import { applyOps } from "./ops.mjs";
import { diffContent, summarize, invertChanges } from "./diff.mjs";
import { validateContent } from "./validate.mjs";
import { classifyPath } from "./guard.mjs";
import { TEXT, refuse, retryOnStale, loadBase, contentFiles, layoutLabel } from "./service.mjs";

// The same change seen from the other side, so its summary reads as putting things back.
const reverse = (changes) => changes.map((c) => ({
  ...c,
  before: c.after,
  after: c.before,
  kind: c.kind === "added" ? "removed" : c.kind === "removed" ? "added" : c.kind,
}));

export async function undoEdit(deps, sha) {
  const { repo, schema } = deps;
  const entry = typeof sha === "string" ? (await repo.edits(100)).find((e) => e.sha === sha) : undefined;
  if (!entry) return refuse(TEXT.undoNotFound);
  const { parent, paths } = await repo.changeOf(sha);
  if (!parent) return refuse(TEXT.undoNotFound);

  const keyOf = new Map(Object.entries(schema.files).map(([k, f]) => [f.path, k]));
  const keys = paths.filter((p) => keyOf.has(p)).map((p) => keyOf.get(p));
  const layoutPaths = paths.filter((p) => classifyPath(p) === "layout");
  const filePaths = [...layoutPaths, ...(paths.includes("DESIGN.md") ? ["DESIGN.md"] : [])];
  const wanted = [...keys.map((k) => schema.files[k].path), ...filePaths];

  // What the edit changed, read once: the files just before it and just after it.
  const atParent = await repo.readFiles(wanted, parent);
  const atEdit = await repo.readFiles(wanted, sha);
  const parse = (texts, k) => (typeof texts[schema.files[k].path] === "string" ? JSON.parse(texts[schema.files[k].path]) : undefined);
  const changes = diffContent(
    Object.fromEntries(keys.map((k) => [k, parse(atParent, k)])),
    Object.fromEntries(keys.map((k) => [k, parse(atEdit, k)])),
  );

  const result = await retryOnStale(async () => {
    const base = await loadBase(deps);
    const { ops, skipped } = invertChanges(changes, base.content);
    const next = applyOps(base.content, ops);
    if (ops.length && validateContent(next, { schema, images: base.images, previous: base.content }).length) {
      return { problem: TEXT.undoUnsafe };
    }
    const restored = summarize(reverse(changes.filter((c) => !skipped.includes(c))), schema);
    const left = summarize(reverse(skipped), schema);
    const files = contentFiles(schema, base.content, next);

    const now = filePaths.length ? await repo.readFiles(filePaths, base.sha) : {};
    for (const p of layoutPaths) {
      if (atParent[p] === atEdit[p] || typeof atParent[p] !== "string") continue;
      if (now[p] === atEdit[p]) {
        files[p] = atParent[p];
        restored.push(layoutLabel(p));
      } else {
        left.push(layoutLabel(p));
      }
    }
    if (!restored.length || !Object.keys(files).length) return { problem: TEXT.nothingToUndo };
    // DESIGN.md follows the colours: put back only when every colour piece was, and only if untouched since.
    const d = "DESIGN.md";
    const coloursBack = !skipped.some((c) => c.file === "theme");
    if (coloursBack && filePaths.includes(d) && typeof atParent[d] === "string" && now[d] === atEdit[d] && now[d] !== atParent[d]) {
      files[d] = atParent[d];
    }

    await repo.write({ branch: "main", baseSha: base.sha, message: `Website edit: Undo — ${entry.title}`, files });
    return { ok: true, restored, skipped: left };
  });
  if (result.stale) return refuse(TEXT.movedUndo);
  if (result.problem) return refuse(result.problem);
  return result;
}

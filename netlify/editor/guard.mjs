// Deny-by-default allowlist for every path the editor may write: content
// files, new photos and DESIGN.md. Pure: no file or network access.
import path from "node:path";

const CONTENT = /^src\/_data\/[a-z]+\.json$/;
const IMAGE = /^src\/images\/[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp)$/;

// "content" | "image" | "design" | null (refused).
export function classifyPath(p) {
  if (typeof p !== "string" || p === "") return null;
  if (/[\\\u0000-\u001f\u007f]/.test(p) || p.startsWith("/")) return null;
  if (path.posix.normalize(p) !== p) return null;
  if (p.split("/").some((s) => s === "" || s === "." || s === "..")) return null;

  if (p === "DESIGN.md") return "design";
  if (CONTENT.test(p)) return "content";
  if (IMAGE.test(p)) return "image";
  return null;
}

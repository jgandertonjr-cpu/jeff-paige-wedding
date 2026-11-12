// Server-side check that an uploaded photo really is an acceptable image.
// Pure: takes a base64 string, returns a verdict. No file or network access.
import { imageSize } from "image-size";

const MAX_BYTES = 3 * 1024 * 1024;
// Base64 turns every 3 bytes into 4 characters; this is the longest string a 3 MB file can make.
const MAX_ENCODED = Math.ceil(MAX_BYTES / 3) * 4;
const MAX_LONG_SIDE = 4000;
const MIN_SHORT_SIDE = 200;

const NOT_A_PHOTO = "That file isn't a photo I can use.";
const TOO_BIG = "That photo is too big to send; try a smaller one.";
const TOO_SMALL = "That photo is too small to look good on the site.";
const TOO_LARGE_SIDES = "That photo is too large to use; try a smaller one.";

const refuse = (reason) => ({ ok: false, reason });

function kindOf(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { mediaType: "image/jpeg", ext: "jpg" };
  }
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mediaType: "image/png", ext: "png" };
  }
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") {
    return { mediaType: "image/webp", ext: "webp" };
  }
  return null;
}

const IEND = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
const MARKUP = /<script|<html|<svg|<\?php/i;

// Cheap structural check that the file ends where its type says it should,
// so a valid header can't front for arbitrary content.
function wellFormed(b, ext) {
  if (ext === "jpg") {
    let end = b.length;
    while (end > 0 && b.length - end < 2 && [0x00, 0x09, 0x0a, 0x0d, 0x20].includes(b[end - 1])) end--;
    return end >= 2 && b[end - 2] === 0xff && b[end - 1] === 0xd9;
  }
  if (ext === "png") return b.length >= 20 && b.subarray(b.length - 12).equals(IEND);
  const size = b.readUInt32LE(4);
  return size === b.length - 8 || (size % 2 === 1 && size + 1 === b.length - 8);
}

export function checkPhoto(base64) {
  if (typeof base64 !== "string") return refuse(NOT_A_PHOTO);
  const text = base64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  if (text.length === 0) return refuse(NOT_A_PHOTO);
  // Length first, so an enormous string is never turned into a buffer.
  if (text.length > MAX_ENCODED) return refuse(TOO_BIG);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text) || text.length % 4 === 1) return refuse(NOT_A_PHOTO);

  const bytes = Buffer.from(text, "base64");
  if (bytes.length === 0) return refuse(NOT_A_PHOTO);
  if (bytes.length > MAX_BYTES) return refuse(TOO_BIG);

  const kind = kindOf(bytes);
  if (!kind) return refuse(NOT_A_PHOTO);

  if (!wellFormed(bytes, kind.ext) || MARKUP.test(bytes.toString("latin1"))) return refuse(NOT_A_PHOTO);

  let size;
  try {
    size = imageSize(bytes);
  } catch {
    return refuse(NOT_A_PHOTO);
  }
  if (!size || !(size.width > 0) || !(size.height > 0)) return refuse(NOT_A_PHOTO);

  // EXIF orientations 5–8 are rotated 90°, so width and height swap.
  const swap = size.orientation >= 5;
  const width = swap ? size.height : size.width;
  const height = swap ? size.width : size.height;

  if (Math.min(width, height) < MIN_SHORT_SIDE) return refuse(TOO_SMALL);
  if (Math.max(width, height) > MAX_LONG_SIDE) return refuse(TOO_LARGE_SIDES);

  return { ok: true, bytes, width, height, mediaType: kind.mediaType, ext: kind.ext };
}

export function photoName(nowMs, randomHex, ext) {
  if (typeof randomHex !== "string" || !/^[0-9a-f]{6}$/.test(randomHex)) {
    throw new Error("randomHex must be exactly 6 lowercase hex characters");
  }
  if (!["jpg", "png", "webp"].includes(ext)) throw new Error("ext must be jpg, png or webp");
  const d = new Date(nowMs);
  if (Number.isNaN(d.getTime())) throw new Error("nowMs must be a valid time");
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  return `photo-${ymd}-${randomHex}.${ext}`;
}

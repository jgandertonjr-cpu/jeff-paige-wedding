import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";
import { checkPhoto, photoName } from "../netlify/editor/photo.mjs";

const BANNED = /commit|deploy|json|branch|repository|merge|build|token|base64|bytes|mime|signature/i;
const b64 = (buf) => Buffer.from(buf).toString("base64");

// Structurally complete PNG: signature, IHDR, IDAT (blank pixels), optional filler chunk, IEND, all with real CRCs.
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(zlib.crc32(body), body.length + 4);
  return out;
}
function png(w, h, padTo = 0) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 0; // greyscale
  const idat = zlib.deflateSync(Buffer.alloc((w + 1) * h));
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", idat)];
  const iend = chunk("IEND", Buffer.alloc(0));
  const have = parts.reduce((n, p) => n + p.length, 0) + iend.length;
  if (padTo > have + 12) parts.push(chunk("prVt", Buffer.alloc(padTo - have - 12)));
  parts.push(iend);
  return Buffer.concat(parts);
}

function assertRefusal(r) {
  assert.equal(r.ok, false);
  assert.equal(typeof r.reason, "string");
  assert.match(r.reason, /^[A-Z].*[.!]$/);
  assert.doesNotMatch(r.reason, BANNED);
}

test("a real JPEG from the site passes", () => {
  const file = fs.readFileSync("src/images/gallery1.jpg");
  const r = checkPhoto(b64(file));
  assert.equal(r.ok, true);
  assert.equal(r.mediaType, "image/jpeg");
  assert.equal(r.ext, "jpg");
  assert.ok(Buffer.isBuffer(r.bytes));
  assert.deepEqual(r.bytes, file);
  assert.ok(r.width >= 200 && r.height >= 200);
});

test("a real WebP passes", () => {
  const r = checkPhoto(b64(fs.readFileSync("src/images/119277072_unknown.webp")));
  assert.equal(r.ok, true);
  assert.equal(r.mediaType, "image/webp");
  assert.equal(r.ext, "webp");
});

test("a PNG is accepted as PNG by its leading bytes, whatever it is called", () => {
  const r = checkPhoto(b64(png(800, 600)));
  assert.equal(r.ok, true);
  assert.equal(r.mediaType, "image/png");
  assert.equal(r.ext, "png");
  assert.equal(r.width, 800);
  assert.equal(r.height, 600);
});

test("a data: prefix is stripped", () => {
  const r = checkPhoto("data:image/png;base64," + b64(png(800, 600)));
  assert.equal(r.ok, true);
});

test("text, SVG and GIF are refused", () => {
  for (const content of [
    "hello there, this is not a photo",
    '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"></svg>',
    "GIF89a" + "\x00".repeat(40),
  ]) {
    assertRefusal(checkPhoto(b64(Buffer.from(content, "latin1"))));
  }
});

test("input that is not a string, empty or not base64 is refused", () => {
  for (const bad of [undefined, null, 42, {}, "", "data:image/png;base64,", "not base64 !!!", "ab$cd"]) {
    assertRefusal(checkPhoto(bad));
  }
});

test("a file over 3 MB is refused before it is decoded", () => {
  const big = png(1000, 1000, 3 * 1024 * 1024 + 100_000);
  assertRefusal(checkPhoto(b64(big)));
  // A huge string is refused on length alone, never turned into a buffer.
  const orig = Buffer.from;
  let decodedBig = false;
  Buffer.from = function (v, ...rest) {
    if (typeof v === "string" && v.length > 1_000_000) decodedBig = true;
    return orig.call(Buffer, v, ...rest);
  };
  try {
    assertRefusal(checkPhoto("A".repeat(10_000_000)));
  } finally {
    Buffer.from = orig;
  }
  assert.equal(decodedBig, false);
});

test("exactly 3 MB is allowed", () => {
  assert.equal(checkPhoto(b64(png(1000, 1000, 3 * 1024 * 1024))).ok, true);
});

test("a 100 by 100 image is too small", () => {
  const r = checkPhoto(b64(png(100, 100)));
  assertRefusal(r);
  assert.match(r.reason, /small/);
});

test("size limits: short side 200 ok, 199 not; long side 4000 ok, 4001 not", () => {
  assert.equal(checkPhoto(b64(png(200, 200))).ok, true);
  assertRefusal(checkPhoto(b64(png(199, 800))));
  assert.equal(checkPhoto(b64(png(4000, 300))).ok, true);
  assertRefusal(checkPhoto(b64(png(4001, 300))));
  assertRefusal(checkPhoto(b64(png(300, 4001))));
});

test("a truncated image is refused, never thrown", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
  assertRefusal(checkPhoto(b64(jpeg)));
});

test("photoName builds a dated name from the UTC date", () => {
  const ms = Date.UTC(2026, 10, 12, 23, 59, 59);
  assert.equal(photoName(ms, "a1b2c3", "jpg"), "photo-20261112-a1b2c3.jpg");
  assert.equal(photoName(Date.UTC(2027, 0, 5), "000fff", "webp"), "photo-20270105-000fff.webp");
  assert.match(photoName(ms, "a1b2c3", "png"), /^[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp)$/);
});

test("photoName throws on a programming mistake", () => {
  const ms = Date.UTC(2026, 10, 12);
  assert.throws(() => photoName(ms, "A1B2C3", "jpg"), Error);
  assert.throws(() => photoName(ms, "abc", "jpg"), Error);
  assert.throws(() => photoName(ms, "a1b2c3d", "jpg"), Error);
  assert.throws(() => photoName(ms, "a1b2c3", "gif"), Error);
  assert.throws(() => photoName(NaN, "a1b2c3", "jpg"), Error);
});

// A JPEG skeleton: SOI, APP0, SOF0 declaring w x h, then the given tail.
function fakeJpeg(w, h, tail) {
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x01, 0x01, 0x11, 0x00]);
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from(tail, "latin1")]);
}

test("a JPEG header followed by page markup is refused", () => {
  assertRefusal(checkPhoto(b64(fakeJpeg(800, 800, "<html><body>hi</body></html>"))));
});

test("a JPEG without a proper ending, or with junk after it, is refused", () => {
  assertRefusal(checkPhoto(b64(fakeJpeg(800, 800, "\x00\x01\x02"))));
  const real = fs.readFileSync("src/images/gallery1.jpg");
  assert.equal(checkPhoto(b64(Buffer.concat([real, Buffer.from("junk")]))).ok, false);
  assert.equal(checkPhoto(b64(Buffer.concat([real, Buffer.from([0, 0])]))).ok, true);
  assert.equal(checkPhoto(b64(Buffer.concat([real, Buffer.from([0, 0, 0])]))).ok, false);
});

test("a PNG without its ending or with trailing bytes is refused", () => {
  const whole = png(800, 600);
  assertRefusal(checkPhoto(b64(whole.subarray(0, whole.length - 12))));
  assertRefusal(checkPhoto(b64(Buffer.concat([whole, Buffer.from("tail")]))));
});

test("a WebP whose size field is wrong is refused", () => {
  const real = Buffer.from(fs.readFileSync("src/images/119277072_unknown.webp"));
  const bad = Buffer.from(real);
  bad.writeUInt32LE(real.length + 50, 4);
  assertRefusal(checkPhoto(b64(bad)));
  assertRefusal(checkPhoto(b64(Buffer.concat([real, Buffer.from("junk")]))));
});

test("script, page or markup text anywhere in the file is refused", () => {
  for (const marker of ["<script", "<HTML", "<Svg", "<?php"]) {
    const whole = png(800, 600);
    const withText = Buffer.concat([whole.subarray(0, whole.length - 12), chunk("tEXt", Buffer.from("k\0" + marker)), whole.subarray(whole.length - 12)]);
    assertRefusal(checkPhoto(b64(withText)));
  }
});

test("every real photo on the site that fits the limits is still accepted", () => {
  let checked = 0;
  for (const f of fs.readdirSync("src/images")) {
    if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
    const buf = fs.readFileSync("src/images/" + f);
    if (buf.length > 3 * 1024 * 1024) continue;
    const r = checkPhoto(b64(buf));
    if (!r.ok && /small|large/.test(r.reason)) continue; // icons and the like
    assert.equal(r.ok, true, f + ": " + r.reason);
    checked++;
  }
  assert.ok(checked >= 5);
});

// Colour contrast maths. Pure: no file or network access.

function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(hexA, hexB) {
  const a = luminance(hexA);
  const b = luminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// [text colour key, background colour key, minimum ratio], keys from theme.json.
export const CONTRAST_PAIRS = [
  ["evergreen", "ivory", 4.5],
  ["evergreen", "white", 4.5],
  ["evergreen", "rosette", 4.5],
  ["sage_gray", "ivory", 4.5],
  ["sage_gray", "sage_mist", 4.5],
  ["deep_gold", "ivory", 4.5],
  ["deep_gold", "sage_mist", 4.5],
  ["deep_evergreen", "dusty_sage", 4.5],
  ["muted_on_sage", "dusty_sage", 4.5],
  ["gold_on_sage", "dusty_sage", 4.5],
];

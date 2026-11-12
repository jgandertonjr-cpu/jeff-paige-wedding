// The parity check's page normaliser: the theme stylesheet link stays out of
// the fingerprint (so the old baseline still compares) but must be present.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalise } from "../scripts/parity.mjs";

const page = (links) => `<!doctype html>
<html>
  <head>
${links.map((l) => `    ${l}`).join("\n")}
  </head>
  <body>
    <p>Hi</p>
  </body>
</html>`;
const STYLES = '<link rel="stylesheet" href="css/styles.css?v=abc123" />';
const THEME = '<link rel="stylesheet" href="css/theme.css?v=def456" />';

test("a page with both stylesheets fingerprints like the page before the theme link existed", () => {
  const withTheme = normalise("index.html", page([STYLES, THEME]));
  const before = normalise("index.html", page([STYLES]).replace(STYLES, '<link rel="stylesheet" href="css/styles.css?v=old" />'));
  assert.deepEqual(withTheme.problems, []);
  assert.equal(withTheme.text, before.text);
});

test("a page that lost its theme stylesheet is a difference", () => {
  const r = normalise("details.html", page([STYLES]));
  assert.deepEqual(r.problems, ["differs: details.html (missing theme stylesheet)"]);
});

test("the theme link must be a real stylesheet link, not just a mention", () => {
  const r = normalise("faq.html", page([STYLES, "<!-- css/theme.css -->"]));
  assert.deepEqual(r.problems, ["differs: faq.html (missing theme stylesheet)"]);
});

test("pages without the main stylesheet and the calendar file are not held to it", () => {
  assert.deepEqual(normalise("redirect.html", page([])).problems, []);
  const ics = normalise("wedding.ics", "BEGIN:VCALENDAR\r\nDTSTAMP:20261112T000000Z\r\nEND:VCALENDAR");
  assert.deepEqual(ics, { text: "BEGIN:VCALENDAR\nEND:VCALENDAR", problems: [] });
});

test("only the theme link is left out: anything else on its line still counts", () => {
  const a = normalise("index.html", page([`${STYLES}${THEME}<meta name="x" content="1" />`]));
  const b = normalise("index.html", page([`${STYLES}${THEME}<meta name="x" content="2" />`]));
  assert.deepEqual(a.problems, []);
  assert.notEqual(a.text, b.text);
  assert.match(a.text, /<meta name="x" content="1" \/>/);
  assert.doesNotMatch(a.text, /theme\.css/);
  // On a line of its own, the link still fingerprints like the page before it existed.
  assert.equal(normalise("index.html", page([STYLES, THEME])).text, normalise("index.html", page([STYLES])).text);
});

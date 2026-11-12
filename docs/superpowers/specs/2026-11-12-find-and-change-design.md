# Find and Change: Design (replaces the chat editor)

Date: 2026-11-12 · Branch: `plain-english-editor` · Status: awaiting Jeff's review
Supersedes the chat and model parts of `2026-11-12-plain-english-editor-design.md`.
Everything in that spec about sign-in, validation, summaries, preview, publish,
history, undo, photos and the build-time site check still applies.

## Why

Jeff does not want any running cost. The chat editor calls a paid model on every
request, so it goes. Nothing else that was built depends on the model.

## What Paige gets

She opens `/admin/`, signs in, and sees one search box and a list of pages.

1. **Find.** She types a few words ("hotel deadline", "ceremony time", "parking")
   or taps a page. Matches come from the names of every editable thing and from
   the words currently on the site, so searching "4:30" or "Stella" finds where
   that text lives.
2. **Change.** She taps a match and gets the right control for it: a text box, a
   date picker, a time box, an on/off switch, a colour picker, a photo chooser
   (her library or photos already on the site), or a list with Add, Remove and
   Move up / Move down.
3. **Review.** Changes collect in a tray ("2 changes ready"). She taps Review and
   sees the same plain summary card as before, with Publish, Cancel and
   "See it first".
4. **Publish, undo, history** work exactly as already built and tested.

What she can change: every word, date, time, link, photo, colour, the order of
sections on a page, the menu order and labels, FAQ items, schedule, hotels,
wedding party, gallery, RSVP settings and the guest list. That is everything in
the content files, which is everything the old form editor could change plus
colours, labels and section order.

What she can no longer do from the editor: free-form requests that need new
styling or layout ("make the buttons rounder"). Those go to Jeff.

## What changes in the code

**Removed**
- `netlify/editor/claude.mjs`, `prompt.mjs`, their tests, the `@anthropic-ai/sdk`
  dependency, the `ask` route, the daily request counter, `ANTHROPIC_API_KEY`.
- Look-and-layout edits: `fileEdits`, `needsPreview`, `checkLayoutEdit`,
  `READABLE_LAYOUT_FILES`, and undo's branch for template files. With no model
  there is nothing to write templates or styles, so the editor's write surface
  shrinks to content files, new photos and the colour lines of `DESIGN.md`.
  Build-time code execution through templates is no longer reachable at all.

**Added**
- `GET /api/editor/content` → `{ schema, content, images }` for a signed-in
  session. `schema` is the generated field description (labels, types, limits).
- `POST /api/editor/propose` `{ ops, photos? }` → the same proposal result the
  chat produced (`{ kind: "proposal", id, summary }`) or
  `{ ok: false, problems: [{ label, message }] }`. `ops` are the existing
  `set` / `insert` / `remove` / `move` operations. Up to 50 per proposal. Up to
  3 photos, each referenced from an op value as `@photo:<n>`.
- The page: search, page view, field editors, list editor, photo chooser, tray.

**Unchanged**
- Server pipeline after a proposal exists: allowlist, validator, summary, store,
  preview, publish with stale-base retry, status, automatic put-back (including
  the next-use settle), cancel marker, history, undo.
- Session, lockout, GitHub and Netlify clients, photo checks, site check,
  parity, schema generator, the RSVP dashboard, the fallback form editor.

## Rules the page follows

- Mobile-first, same palette and type as the site, `DESIGN.md` rules, no jargon.
- A control never lets her enter something the server would refuse when that is
  cheap to check in the browser (required, length, pattern, list limits); the
  server's answer is still final and its sentences are shown next to the field.
- Nothing is sent until Review. Leaving the page with changes in the tray asks
  once ("You have changes that aren't published yet.").
- The tray survives a reload (`sessionStorage`), photos excepted.
- Search needs no network: it runs over the content already loaded.
- A change to the guest list or the RSVP on/off switch keeps its
  "Please check" line in the summary.

## Environment variables

`ADMIN_PASSWORD`, `SESSION_SECRET`, `GITHUB_TOKEN`, `NETLIFY_RSVP_TOKEN`.
No Anthropic key. Running cost: none.

## Testing

Unit tests for the new routes and for the page's pure helpers (search index,
op building, client-side checks). The existing suites for everything unchanged
keep passing. End to end on the local test server in a real browser at phone
width: at least 15 actions covering text, date, time, on/off, colour, photo,
list add / remove / move, section order, menu order, guest list, a refused
value, a multi-change review, preview, publish and undo. No key is needed, so
the whole run is repeatable for free.

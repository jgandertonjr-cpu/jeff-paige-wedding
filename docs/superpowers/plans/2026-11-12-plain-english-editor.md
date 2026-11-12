# Plain-English Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the form-based admin with a password-protected chat page where Paige types a change in plain English, sees a plain summary, publishes with one tap, and can undo any edit.

**Architecture:** The Eleventy site keeps rendering from `src/_data/*.json`. One Netlify Function (`/api/editor/*`) holds all logic in small, dependency-injected ESM modules under `netlify/editor/`: it asks Claude for path-based change operations, applies and validates them on the server, writes them to GitHub, and reads deploy status from Netlify. The admin page is static HTML/CSS/JS with no secrets.

**Tech Stack:** Node 22 ESM, Eleventy 3.1.6, Netlify Functions (modern `Request → Response` API), `@netlify/blobs`, `@anthropic-ai/sdk` (`claude-sonnet-5-5`), GitHub REST API via `fetch`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-12-plain-english-editor-design.md`

## Global Constraints

- Work only on branch `plain-english-editor`. Never push to or commit on `main`.
- `DESIGN.md` is the source of truth for all visual work (project `CLAUDE.md`).
- The public site must render identically after Tasks 2–4 (`npm run parity` passes).
- Never modify: `src/study/**`, `src/pd-tracker/**`, `src/blue-line-prep.html`, `src/oral-board-prep.html`, `src/nelson-denny-practice.html`, `src/landscaping-hours*`, `blue-line-prep/**`, `src/robots.txt`, `src/sitemap.xml`, `src/_redirects`. `src/_headers` changes only in Task 16.
- No secret in any file under `src/`, in any response body, or in any error message. Secrets are read from `process.env` inside functions only.
- Admin UI copy never uses: commit, deploy, JSON, branch, repository, merge, build, token.
- Buttons: square 3px corners, uppercase, at least 48px tall; primary first. Body text 17px. No pills.
- Model id is exactly `claude-sonnet-5-5`; effort `low`. Before writing any Claude call, load the `claude-api` skill and read its `typescript/claude-api/tool-use.md`.
- Function limits: 60 s run time, 6 MB request. Editor's own budget: 50 s, 4 model turns.
- Content files are written as `JSON.stringify(value, null, 2) + "\n"`.
- Every lib module takes its collaborators (`fetch`, store, clock, env) as arguments. No module reads `process.env` or calls global `fetch` except `netlify/functions/editor.mjs`.
- Tests: `node --test test/`. Add `"test": "node --test test/"` to `package.json` in Task 1.
- Commit after every task with the trailer `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.

## Review Focus

1. **Double tap or repeat Publish.** A second `publish` for the same proposal returns the first result and makes no second change. (Test in Task 13.)
2. **Two edits close together.** Publishing proposal B after A went live re-applies B's operations to the latest content, so A is not lost; if `main` moves during the write, retry once. (Task 13.)
3. **Real-world text.** Curly quotes, apostrophes, emoji, em dashes, ampersands and 2,000-character messages survive a round trip byte-for-byte; `<` in text is rejected as HTML only when it forms a tag. (Tasks 6 and 8.)
4. **Bad photo.** A non-image, a 12 MB file, or an image the browser cannot decode gives one plain sentence and leaves the typed message in place. (Tasks 13 and 15.)
5. **Model returns a path that does not exist** (missing field, list index out of range, unknown file). The operation fails cleanly, Claude gets one chance to correct, and nothing is stored on a second failure. (Tasks 8 and 12.)

## File Structure

| Path | Responsibility |
|---|---|
| `scripts/parity.mjs` | Build and compare normalised HTML against a recorded baseline |
| `src/_data/theme.json`, `src/css/theme.css.njk` | Colour tokens as data |
| `scripts/build-editor-schema.mjs` → `netlify/editor/schema.gen.mjs` | Content schema generated from `src/admin/config.yml` |
| `netlify/editor/validate.mjs` | Schema validation + extra content rules |
| `netlify/editor/contrast.mjs` | WCAG contrast and the DESIGN.md pair table |
| `netlify/editor/guard.mjs` | Path allowlist, template/stylesheet edit rules |
| `netlify/editor/ops.mjs` | Apply content operations and file edits |
| `netlify/editor/diff.mjs` | Before/after changes, summary lines, undo inverse |
| `netlify/editor/store.mjs` | Key-value store interface (memory, Blobs) |
| `netlify/editor/session.mjs` | Password check, signed cookie, lockout |
| `netlify/editor/github.mjs`, `localrepo.mjs` | Repo reads/writes (GitHub API; working tree for local mode) |
| `netlify/editor/netlify.mjs` | Deploy status |
| `netlify/editor/photo.mjs` | Photo checks and naming |
| `netlify/editor/prompt.mjs`, `claude.mjs` | Prompt, tools, model loop |
| `netlify/editor/service.mjs` | ask / preview / status / publish / cancel / history / undo |
| `netlify/functions/editor.mjs` | HTTP routing, auth, wiring of real dependencies |
| `scripts/check-site.mjs`, `scripts/protected-files.json` | Build-time site check |
| `src/admin/index.html`, `admin.css`, `admin.js`, `guide/index.html` | Admin page and guide |
| `src/admin/forms/index.html` | Sveltia fallback |
| `scripts/editor-dev.mjs` | Local end-to-end server |
| `test/**/*.test.mjs` | One test file per module |

---

### Task 1: Parity harness and test runner

**Files:** Create `scripts/parity.mjs`, `test/smoke.test.mjs`. Modify `package.json`, `.gitignore`.

**Interfaces:**
- Produces: `npm run parity:record` (builds to a temp dir, writes `design-review/parity-baseline.json`), `npm run parity` (builds, compares, exits 1 with a per-file list on any difference), `npm test`.

- [ ] **Step 1:** Add scripts `"test": "node --test test/"`, `"parity:record": "node scripts/parity.mjs --record"`, `"parity": "node scripts/parity.mjs"`.
- [ ] **Step 2:** Write `scripts/parity.mjs`. It runs `npx @11ty/eleventy --quiet --output=<tmp>`, then for every `*.html` and `wedding.ics` in the output records a SHA-256 of the normalised text. Normalisation: collapse runs of whitespace between tags to one space; drop `?v=…` query strings; drop any `<link … css/theme.css…>` line; drop the `DTSTAMP:` line; skip `admin/**`, `study/**`, `pd-tracker/**`. Also record raw SHA-256 of `css/styles.css` and every file under `js/`.
- [ ] **Step 3:** On the untouched branch run `npm run parity:record`, then `npm run parity`. Expected: `parity: 0 differences`.
- [ ] **Step 4:** `test/smoke.test.mjs`: one test asserting `import("../eleventy.config.js")` resolves. Run `npm test`. Expected: 1 pass.
- [ ] **Step 5:** Commit (`design-review/` is already ignored; baseline stays local).

### Task 2: Colours as data and automatic cache-busting

**Files:** Create `src/_data/theme.json`, `src/css/theme.css.njk`, `test/theme.test.mjs`. Modify `src/_includes/layouts/base.njk` (stylesheet link), `src/admin/config.yml` (new `theme` file entry under `settings`), `eleventy.config.js` (data value for the stylesheet fingerprint).

**Interfaces:**
- Produces: `theme.json` with exactly these keys, each a `#RRGGBB` string copied from `styles.css :root`: `dusty_sage, rosette, gold, ivory, sage_mist, white, hairline, blush, evergreen, sage_gray, deep_gold, deep_evergreen, muted_on_sage, gold_on_sage`. `theme.css` sets `--color-<key-with-hyphens>` for each, plus the `-rgb` channel variables that `styles.css` defines (`gold, evergreen, dark` (= deep_evergreen), `dusty-sage, ivory, deep-gold`). `--color-champagne` is `rgba(<gold rgb>, 0.14)`.

- [ ] **Step 1: Failing tests** in `test/theme.test.mjs`:
  - `theme.json matches styles.css`: for every key, the value equals (case-insensitive) the hex in `styles.css` for `--color-<key>`.
  - `theme.css overrides every token`: after a build, `_site/css/theme.css` contains `--color-dusty-sage: #BCCAB3` and `--color-gold-rgb: 201, 160, 74`.
  - `stylesheet links are fingerprinted`: `_site/index.html` has no `styles.css?v=21` and links `css/theme.css?v=` after `css/styles.css?v=`.
- [ ] **Step 2:** Run `npm test`. Expected: 3 failures.
- [ ] **Step 3:** Implement. Fingerprint = existing `fingerprint` filter over the stylesheet source and `theme`. Add a hex-to-`r, g, b` filter `rgbChannels`. In `config.yml` add file `theme` (label "Colours") with one `string` field per key, pattern `^#[0-9A-Fa-f]{6}$`, labels in plain words ("Banner green", "RSVP pink", …).
- [ ] **Step 4:** `npm test` passes; `npm run parity` reports 0 differences.
- [ ] **Step 5:** Commit.

### Task 3: Hardcoded labels as data

**Files:** Modify every `src/*.njk` public page, `src/_includes/add-to-calendar.njk`, the matching `src/_data/*.json`, `src/admin/config.yml`. Create `test/labels.test.mjs`.

**Interfaces:**
- Produces: a `labels` object in each page data file; shared strings ("Get directions", "Show map", "Add to Calendar" and its four options, "(opens in a new tab)") in `site.json` under `labels`. Keys are snake_case of the English text (`plan_your_trip`, `get_directions`).

- [ ] **Step 1: Failing test** `no hardcoded visible text`: for each public template, strip Nunjucks tags/comments and HTML tags, and assert no remaining run of three or more letters other than an allowlist of `sr-only` strings kept in the test. `rsvp.njk` is exempt (off limits to the editor).
- [ ] **Step 2:** Run. Expected: fails listing ~25 strings.
- [ ] **Step 3:** Move each string into data and reference it. Add a collapsed `labels` object to each file's `config.yml` entry, one `string` field per key.
- [ ] **Step 4:** `npm test` passes; `npm run parity` 0 differences.
- [ ] **Step 5:** Commit.

### Task 4: Section order as data

**Files:** Modify `src/index.njk`, `details.njk`, `travel.njk`, `after-party.njk`, `wedding-party.njk`, their data files, `src/admin/config.yml`, `src/_data/nav.json` entry in `config.yml`. Create `test/sections.test.mjs`.

**Interfaces:**
- Produces: `section_order: string[]` in `home` (`welcome, countdown, photos, quick_links, save_the_date`), `details` (`ceremony, reception, schedule, cta`), `travel` (`room_block, nearby, airports, tips`), `afterparty` (`details, expect, cta`), `party` (`bridesmaids, groomsmen, cta`), in today's order. In `config.yml` each is a `select` with `multiple: true`, `min` and `max` equal to the section count, options = the section names. `nav` gets a file entry: two lists whose items expose `label` only editable; `url` and `rsvp` are `hidden` widgets.
- Rule: each section is a Nunjucks macro taking `alt` (boolean). The loop passes `alt = (position is odd)`, where position counts only non-banded sections; the home countdown band keeps its own classes and does not count.

- [ ] **Step 1: Failing tests:**
  - `default order renders identically`: `npm run parity` exits 0 (spawned from the test).
  - `reordering changes the page`: build with a temp copy of the input where `details.section_order` is `["schedule","ceremony","reception","cta"]`; in the output, `id="schedule-heading"` appears before `id="ceremony-heading"`, and section classes alternate `section`, `section section--alt`, `section`, `section section--alt`.
  - `unknown or missing section name fails the build` with a message naming the page.
- [ ] **Step 2:** Run. Expected: fail.
- [ ] **Step 3:** Implement macros and loops.
- [ ] **Step 4:** `npm test` passes, parity 0 differences.
- [ ] **Step 5:** Commit. Controller then screenshots all ten pages at 375px and 1280px on `main` and on the branch and compares them by eye.

### Task 5: Content schema generator

**Files:** Create `scripts/build-editor-schema.mjs`, `netlify/editor/schema.gen.mjs` (generated, committed), `test/schema.test.mjs`. Modify `package.json` (devDependency `yaml`; script `"schema": "node scripts/build-editor-schema.mjs"`).

**Interfaces:**
- Produces: `export default { files: { [key]: { path, label, fields: Field[] } } }`. Keys: `site, theme, nav, home, story, details, party, rsvp, registry, travel, afterparty, faq, gallery, notfound, guests`. `Field = { name, label, type, required, pattern?, patternMessage?, maxlength?, options?, multiple?, min?, max?, fields? }` with `type ∈ "string"|"text"|"markdown"|"boolean"|"date"|"time"|"image"|"select"|"hidden"|"object"|"list"`. `required` defaults to true as in Sveltia. YAML anchors are resolved.

- [ ] **Step 1: Failing tests:** `covers every data file` (the 15 keys; each `path` exists); `generated file is current` (running the generator in memory equals the committed module); `travel.room_block.deadline is an optional date`; `home.photos.items has min 3 max 3`.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement, run `npm run schema`. **Step 4:** Pass. **Step 5:** Commit.

### Task 6: Validator, contrast and content rules

**Files:** Create `netlify/editor/validate.mjs`, `netlify/editor/contrast.mjs`, `test/validate.test.mjs`, `test/contrast.test.mjs`.

**Interfaces:**
- Consumes: schema from Task 5.
- Produces:
  - `validateContent(content, ctx) → Issue[]` where `content = { [fileKey]: object }`, `ctx = { schema, images: Set<string>, previous: content }`, `Issue = { file, path, label, message }`. `path` is a JSON pointer; `label` is the human trail ("Travel → Room block → Booking deadline").
  - `contrastRatio(hexA, hexB) → number`; `CONTRAST_PAIRS: [fgKey, bgKey, min][]` = evergreen/ivory, evergreen/white, evergreen/rosette, sage_gray/ivory, sage_gray/sage_mist, deep_gold/ivory, deep_gold/sage_mist, deep_evergreen/dusty_sage, muted_on_sage/dusty_sage, gold_on_sage/dusty_sage, all 4.5.

- [ ] **Step 1: Failing tests** (each asserts the issue's `label` and that `message` is a plain sentence):
  - `the repo's current content has no issues` (loads all 15 files; `images` from `src/images`).
  - required field emptied; wrong type; unknown extra field; pattern mismatch; list below `min`; select value not in options.
  - `date must be real`: `"2028-02-30"` rejected, `"2028-06-01"` accepted, `""` accepted when optional.
  - `image must exist`: `/images/nope.jpg` rejected; a path in `ctx.images` accepted.
  - `links`: `https://x.com`, `mailto:a@b.co`, `tel:+12155550100`, `travel.html` accepted; `javascript:alert(1)`, `http://x.com`, `//x.com` rejected, in plain fields and inside markdown links.
  - `no HTML tags`: `"<b>hi</b>"` and `"<script>"` rejected; `"3 < 5"`, `"Jeff & Paige"`, `"we’re — so 🎉"` accepted.
  - `meal codes locked while RSVPs are open`: changing a `meal_options[].value` when `previous.rsvp.rsvp_open` is true is rejected; allowed when false.
  - `nav addresses fixed`: changing a `url` or removing an entry rejected; changing a `label` or order accepted.
  - `section order is a full reshuffle`: a `section_order` with a repeated, missing or unknown name is rejected; any permutation is accepted.
  - `theme contrast`: `evergreen = "#BCCAB3"` rejected with a message naming both colours in words; `rosette = "#E8A0B4"` accepted. `contrastRatio("#243022","#FBF8F2")` is between 12.5 and 13.5.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement. **Step 4:** Pass. **Step 5:** Commit.

### Task 7: Path guard and look-and-layout rules

**Files:** Create `netlify/editor/guard.mjs`, `test/guard.test.mjs`.

**Interfaces:**
- Produces:
  - `classifyPath(path) → "content" | "image" | "layout" | "design" | null`.
  - `READABLE_LAYOUT_FILES: string[]` (the files Claude may read).
  - `checkLayoutEdit({ path, before, after }) → string[]` (problems in plain words; empty = fine).

- [ ] **Step 1: Failing tests:**
  - `allowed`: `src/_data/faq.json` → content; `src/images/photo-20261112-ab12cd.jpg` → image; `src/css/styles.css`, `src/travel.njk`, `src/_includes/detail-item.njk` → layout; `DESIGN.md` → design.
  - `refused` (each → `null`): every path listed under "Everything else is refused" in the spec, plus `src/_data/calendar.js`, `src/_data/../robots.txt`, `/etc/passwd`, `src/images/../../netlify.toml`, `src/primed/index.html`, `src/images/evil.svg`, `src/images/x.html`, `SRC/_data/faq.json`.
  - `checkLayoutEdit` flags an added line containing each of: `<script`, `<iframe`, `onclick=`, `javascript:`, `| safe`, `noindex`, `robots`, `@import`, `url(https://evil.example/x.png)`; flags `after` that is empty or under 20% of `before`'s length; passes a colour change and a class rename; ignores forbidden text that was already present in `before`.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement (normalise with `path.posix.normalize`, reject anything changed by normalisation). **Step 4:** Pass. **Step 5:** Commit.

### Task 8: Operations, diff, summary and undo inverse

**Files:** Create `netlify/editor/ops.mjs`, `netlify/editor/diff.mjs`, `test/ops.test.mjs`, `test/diff.test.mjs`.

**Interfaces:**
- Produces:
  - `Op = { op: "set"|"insert"|"remove"|"move", file, path, value?, index?, to? }`. `set`: `path` to a field. `insert`: `path` to a list, `index` (−1 = end), `value`. `remove`: `path` to a list item. `move`: `path` to a list item, `to` = new index.
  - `applyOps(content, ops) → content` (deep copy; throws `OpError` with `.op` and a plain `.message`).
  - `applyFileEdits(files, edits) → files`, `edit = { path, find, replace }`; throws `OpError` unless `find` occurs exactly once.
  - `diffContent(before, after) → Change[]`, `Change = { file, path, kind: "changed"|"added"|"removed"|"moved", before, after }`. Lists of objects are compared item-by-item by deep equality.
  - `summarize(changes, schema) → string[]`.
  - `invertChanges(changes, current) → { ops: Op[], skipped: Change[] }`.

- [ ] **Step 1: Failing tests (ops):** set a nested field; insert at 0, middle and −1; remove; move; `set` on a missing parent, index out of range, unknown file each throw `OpError`; input object is not mutated; text with `’ — 🎉 &` round-trips exactly; `applyFileEdits` throws when `find` appears 0 or 2 times.
- [ ] **Step 2: Failing tests (diff/summary):**
  - `"" → "2028-06-01"` on `travel /room_block/deadline` gives `Travel & Hotels → Room block → Booking deadline: (empty) → June 1, 2028`.
  - boolean shows `Off → On`; `rsvp_open` and any `guests` change are prefixed `Please check: `.
  - text over 80 characters is cut with `…`; image fields show `new photo`.
  - added FAQ item: `FAQ → Questions: added “<question text>”`; removed: `removed “…”`; reorder: `FAQ → Questions: reordered`.
  - `invertChanges`: a changed field still holding the edit's value yields a `set` back; a field changed again is in `skipped`; an added list item is removed by content even when its index moved; a removed item is re-inserted at its old index, clamped to the list length.
- [ ] **Step 3:** Run, fail. **Step 4:** Implement. **Step 5:** Pass. **Step 6:** Commit.

### Task 9: Store, session and lockout

**Files:** Create `netlify/editor/store.mjs`, `netlify/editor/session.mjs`, `test/session.test.mjs`. Modify `package.json` (dependency `@netlify/blobs`).

**Interfaces:**
- Produces:
  - `memoryStore() → Store`; `blobStore(name) → Store` (strong consistency); `Store = { get(key) → Promise<object|null>, set(key, object) → Promise<void>, delete(key) → Promise<void> }`.
  - `checkPassword(input, env) → boolean` (false when `ADMIN_PASSWORD` is unset or shorter than 8).
  - `sessionCookie(env, nowMs) → string` (full `Set-Cookie` value: `jp_admin=…; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`).
  - `clearCookie() → string`; `hasSession(cookieHeader, env, nowMs) → boolean`.
  - `lockState(store, ip, nowMs) → { locked: boolean, minutes: number }`; `noteFailure(store, ip, nowMs)`; `noteSuccess(store, ip)`.

- [ ] **Step 1: Failing tests:** right/wrong/empty password; unset password always false; cookie verifies; tampered payload, tampered signature, expired (`now + 31 days`) and other-secret cookies fail; changing `ADMIN_PASSWORD` invalidates an old cookie; 5 failures lock that address for 15 minutes and not another address; the lock clears after 15 minutes; 30 failures across addresses within an hour lock everyone for an hour; success clears that address's count.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement with `node:crypto` (`timingSafeEqual` on SHA-256 digests; HMAC key = `HMAC(SESSION_SECRET, ADMIN_PASSWORD)`). **Step 4:** Pass. **Step 5:** Commit.

### Task 10: GitHub, local repo and Netlify clients

**Files:** Create `netlify/editor/github.mjs`, `netlify/editor/localrepo.mjs`, `netlify/editor/netlify.mjs`, `test/github.test.mjs`, `test/localrepo.test.mjs`, `test/netlify.test.mjs`.

**Interfaces:**
- Produces `createGitHub({ token, repo, fetch }) → Repo` and `createLocalRepo({ root }) → Repo` with the same shape:
  - `head(branch = "main") → sha`
  - `readFiles(paths, ref) → { [path]: string }` (missing file → key absent)
  - `listImages(ref) → Set<string>` (values like `/images/foo.jpg`)
  - `write({ branch, baseSha, message, files }) → sha`; `files[path]` is a string, `{ base64 }`, or `null` to delete. Throws `StaleError` when `branch` is no longer at `baseSha`.
  - `openPreview({ id, baseSha, message, files }) → { number, sha }` (branch `edit/<id>` + pull request titled `Preview: <message>`); `closePreview({ id, number })`.
  - `edits(limit) → { sha, date, title }[]` (commits on `main` whose message starts `Website edit: `; `title` is the rest of the first line).
  - `changeOf(sha) → { parent, paths: string[] }`.
- Produces `createNetlify({ token, siteId, fetch }) → { deployFor(sha) → { state: "waiting"|"building"|"ready"|"failed", url? } }`. Maps Netlify states `new|enqueued|building|uploading|processing|preparing` → building, `ready` → ready, `error` → failed, no matching deploy → waiting. `url` is `deploy_ssl_url`.
- Local repo: `write` writes files into `root` and records `{ sha, parent, message, date, paths, before }` in `root/.editor-local/log.json`; `openPreview` behaves like `write` to a scratch copy; shas are random hex.

- [ ] **Step 1: Failing tests** with a scripted fake `fetch` that records calls: `write` creates blobs, a tree with `base_tree`, a commit with the parent, then updates the ref with `force: false`; a 422 on the ref update throws `StaleError`; the token appears only in the `Authorization` header and never in a thrown message; `edits` filters by prefix; a non-2xx response throws an error whose message has the status and no URL query or token. Local repo: write then read, edits list, `changeOf`. Netlify: each state mapping; picks the deploy whose `commit_ref` matches.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement. **Step 4:** Pass. **Step 5:** Commit.

### Task 11: Photo checks

**Files:** Create `netlify/editor/photo.mjs`, `test/photo.test.mjs`. Modify `package.json` (move `image-size` to `dependencies`).

**Interfaces:**
- Produces: `checkPhoto(base64) → { ok: true, bytes: Buffer, width, height, mediaType: "image/jpeg"|"image/png"|"image/webp", ext } | { ok: false, reason }`; `photoName(nowMs, randomHex) → "photo-YYYYMMDD-<6 hex>.<ext>"`. Limits: 3 MB decoded, long side ≤ 4000px, short side ≥ 200px.

- [ ] **Step 1: Failing tests:** a real JPEG from `src/images` passes; text bytes, an SVG, a GIF, a PNG renamed `.jpg` (accepted as PNG by signature), a 3.1 MB buffer, and a 100×100 image each give the expected result; `reason` is a plain sentence.
- [ ] **Step 2–5:** Fail, implement, pass, commit.

### Task 12: Prompt and Claude loop

**Files:** Create `netlify/editor/prompt.mjs`, `netlify/editor/claude.mjs`, `test/claude.test.mjs`. Modify `package.json` (dependency `@anthropic-ai/sdk`).

**Interfaces:**
- Consumes: schema (Task 5), `READABLE_LAYOUT_FILES` (Task 7), `Op` and file-edit shapes (Task 8).
- Produces:
  - `systemPrompt(schema) → string` (stable; cacheable) and `contentBlock(content) → string`.
  - `TOOLS`: `read_file({ path })` and `propose_change({ note, content_ops, file_edits })`, both `strict: true`.
  - `askClaude({ client, schema, content, message, history, photo, readFile, feedback, deadlineMs }) → { kind: "proposal", note, contentOps, fileEdits } | { kind: "message", text }`. `history` is `{ role: "user"|"assistant", text }[]`; `photo` is `{ mediaType, base64, willBeSavedAs }`; `feedback` is an optional string of validation problems from a first attempt.

The system prompt must state, in this order: who the reader is (Paige, not technical, on her phone; reply in one or two short warm sentences, never technical words); that changes go through `propose_change` only; prefer `content_ops`, and use `file_edits` only when no content field can do it; when a request could mean two things or names something not on the site, ask one short question instead; when a date changes, also update sentences that mention the old date and say so in `note`; never invent facts (addresses, times, links) — ask; decline plainly anything that deletes or hides a page, removes the site, changes search-engine visibility, or reaches outside the wedding pages; text fields are plain text, with bold/italic/links only in fields marked markdown; then the schema as an indented outline of labels, paths and types.

- [ ] **Step 1: Failing tests** with a fake `client.messages.create` that returns scripted responses and records requests:
  - request uses model `claude-sonnet-5-5`, `output_config.effort === "low"`, `tool_choice` absent or `auto`, the system prompt carries `cache_control`.
  - a `propose_change` tool call returns `kind: "proposal"` with parsed ops.
  - a text-only reply returns `kind: "message"`.
  - `read_file` then `propose_change` makes two calls and passes the file text back as a `tool_result`; `read_file` for a path outside `READABLE_LAYOUT_FILES` returns an `is_error` result and never calls `readFile`.
  - four turns without a proposal returns the message "That took too long. Nothing changed. Try again."
  - `stop_reason: "refusal"` returns `kind: "message"` with "I can't help with that one."; `stop_reason: "max_tokens"` returns the took-too-long message.
  - a photo is sent as an image block, with its future path stated in text.
  - `systemPrompt` contains none of the secret env names and no key-shaped string.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement the manual tool loop per the claude-api skill (typed error classes; refusal fallbacks as that skill directs for Sonnet 5.5). **Step 4:** Pass. **Step 5:** Commit.

### Task 13: Editor service

**Files:** Create `netlify/editor/service.mjs`, `test/service.test.mjs`.

**Interfaces:**
- Consumes: Tasks 5–12. `deps = { repo, netlify, store, client, schema, now(), random(), env }`.
- Produces:
  - `ask(deps, { message, history, photo }) → { kind: "proposal", id, summary: string[], note, needsPreview: boolean } | { kind: "message", text }`
  - `preview(deps, id) → { ok: true }` (idempotent)
  - `status(deps, { id }) → { stage: "preview"|"publish", state: "waiting"|"building"|"ready"|"failed", url? }`
  - `publish(deps, id) → { ok: true, title } | { ok: false, text }`
  - `cancel(deps, id) → { ok: true }`
  - `history(deps) → { sha, when, title }[]`
  - `undo(deps, sha) → { ok: true, restored: string[], skipped: string[] } | { ok: false, text }`
- Proposal record in the store under `proposal:<id>`: `{ id, createdAt, baseSha, contentOps, fileEdits, photo?, summary, note, needsPreview, preview?: { number, sha }, published?: { sha, title } }`. Daily counter under `usage:<YYYY-MM-DD>`, limit 150. Messages over 2,000 characters are refused before any model call.
- `needsPreview` is true when `fileEdits` is non-empty.
- Commit message: `Website edit: <summary[0] without the "Please check: " prefix, cut to 72 chars>`. Undo: `Website edit: Undo — <original title>`.

- [ ] **Step 1: Failing tests** (memory store, local-style fake repo, scripted Claude):
  - a content request returns a summary and stores a proposal; nothing is written to the repo.
  - invalid ops: Claude is called a second time with the problems as `feedback`; a second failure returns "I couldn't make that change safely. Nothing changed." and stores nothing.
  - a `file_edits` proposal to a refused path, or one that fails `checkLayoutEdit`, is treated as invalid in the same way.
  - a theme colour change also edits the matching hex in `DESIGN.md`.
  - `publish` writes the content files (and the photo) in one change with the right message; a second `publish` of the same id writes nothing and returns the same title (Review Focus 1).
  - publish B after A: B's ops apply on top of A's content; a `StaleError` on the first write is retried once on fresh content (Review Focus 2).
  - `publish` of a `needsPreview` proposal is refused until `status` for its preview is `ready`; a `failed` preview cancels the proposal.
  - `status` after publish reports the production deploy; when it is `failed`, the edit is undone automatically once and the reply says the site was put back.
  - `undo` restores what still matches, lists what it skipped in plain words, refuses a sha that is not a `Website edit:` commit, and refuses layout files that changed since.
  - the 151st request of a day gets "That's the limit for today. It resets tomorrow."; a 2,001-character message is refused without a model call.
  - a bad photo returns `checkPhoto`'s reason and stores nothing (Review Focus 4).
- [ ] **Step 2:** Run, fail. **Step 3:** Implement. **Step 4:** Pass. **Step 5:** Commit.

### Task 14: HTTP function and RSVP dashboard sign-in

**Files:** Create `netlify/functions/editor.mjs`, `test/http.test.mjs`. Modify `netlify/functions/rsvp-responses.mjs`, `src/rsvp-dashboard.njk`.

**Interfaces:**
- Consumes: `service`, `session`, `store`.
- Produces: `export default (req, context)`, `export const config = { path: "/api/editor/*" }`, and a testable `createHandler(deps)`. Routes exactly as in the spec's endpoint table. All responses are JSON with `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.
- `rsvp-responses` accepts the `jp_admin` session instead of a GitHub bearer token. The dashboard's sign-in panel becomes a link to `/admin/`; its GitHub popup code and `localStorage` token read are removed; "Back to editor" points to `/admin/`.

- [ ] **Step 1: Failing tests:** every route but `login` returns 401 without a session; a `POST` with a foreign or missing `Origin`, or a non-JSON content type, returns 403; `login` with the right password sets the cookie; the 6th wrong attempt returns 429 with minutes to wait; an unknown route returns 404; a thrown error returns 500 with the generic sentence and no stack, env value or upstream URL; a missing env var returns 500 "The editor isn't set up yet." without naming the variable to the browser (it is logged server-side). RSVP function: 401 without a session, 200 with one.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement. **Step 4:** Pass. **Step 5:** Commit.

### Task 15: Admin page

**Files:** Replace `src/admin/index.html`. Create `src/admin/admin.css`, `src/admin/admin.js`, `src/admin/guide/index.html`, `src/admin/forms/index.html`. `src/admin/config.yml` stays where it is.

**Interfaces:**
- Consumes: the endpoints from Task 14 and their response shapes from Task 13.
- Produces: screens and copy exactly as in the spec's "Admin page" and "Error handling" sections. `forms/index.html` is the old Sveltia page plus `<link href="/admin/config.yml" type="text/yaml" rel="cms-config-url">`.

- [ ] **Step 1:** Load the `design-taste-frontend` skill and read `DESIGN.md`. Use the site's own fonts from `/fonts/` and the colour tokens from `/css/theme.css`.
- [ ] **Step 2:** Build the page. Behaviour to implement: session check on load; sign-in form; chat list with `aria-live="polite"`; text box that grows to four lines, fixed to the bottom above the keyboard (`100dvh`, safe-area padding); photo button that resizes in the browser (upright, long side ≤ 2000px, JPEG 0.85) and shows a thumbnail with a remove control; three tappable example requests when the chat is empty; proposal card with summary lines, **Publish**, **Cancel**, "See it first"; bigger-change card that polls `status` every 4 s and reveals Publish when ready; after publish, "Live in about a minute" then "It's live" with a link and **Undo**; "Recent changes" list with "Undo this"; a 401 at any point shows sign-in and keeps the typed text; buttons disable while a request is in flight; draft text saved to `sessionStorage` inside try/catch.
- [ ] **Step 3:** Verify in the browser pane against `scripts/editor-dev.mjs` (Task 16) at 375×812 and 1280 wide: no horizontal scroll, every control ≥ 48px tall, text ≥ 17px (labels ≥ 13px), focus rings visible, contrast per `DESIGN.md`, no forbidden words (grep the three files).
- [ ] **Step 4:** Commit.

### Task 16: Site check, headers and local end-to-end server

**Files:** Create `scripts/check-site.mjs`, `scripts/protected-files.json`, `scripts/editor-dev.mjs`, `test/check-site.test.mjs`. Modify `package.json` (`"build": "eleventy && node scripts/check-site.mjs"`, `"protect:record"`, `"editor:dev"`), `src/_headers`, `.claude/launch.json`, `.gitignore` (`.editor-local/`).

**Interfaces:**
- Produces: `checkSite(dir) → string[]` problems. `editor-dev` serves `_site` on port 8081, mounts `createHandler` with `createLocalRepo`, `memoryStore`, a Netlify stub that reports `ready` after rebuilding `_site`, the real Claude client when `ANTHROPIC_API_KEY` is set (otherwise a scripted one), `ADMIN_PASSWORD=local-test-password`, and treats `http://localhost:8081` as the allowed origin with a non-`Secure` cookie.
- `_headers` additions: `X-Robots-Tag: noindex, nofollow` for `/blue-line-prep*`, `/oral-board-prep*`, `/nelson-denny-practice*`; for `/admin/*` except `/admin/forms/*` a `Content-Security-Policy` of `default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`.

- [ ] **Step 1: Failing tests** for `checkSite` against temp copies of a built site: clean build → no problems; delete `travel/index.html` (or `travel.html`, whichever the build emits) → problem naming Travel; remove `noindex` from `study/index.html` → problem; alter `robots.txt` → problem; an `<img src>` pointing at a missing file → problem; a page link to a missing page → problem; a string matching `sk-ant-|github_pat_|ghp_|nfp_` anywhere in the output → problem.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement; run `npm run protect:record`; `npm run build` passes. **Step 4:** `npm test` all green; `npm run parity` 0 differences. **Step 5:** Commit.

### Task 17: End-to-end test run (Phase 3.1–3.2)

- [ ] **Step 1:** Start `npm run editor:dev` with a real `ANTHROPIC_API_KEY` (ask Jeff if none is available locally).
- [ ] **Step 2:** Run these 16 requests through the real page at 375×812, recording for each the request, the summary shown, the result, and the token cost from `response.usage`, in `docs/superpowers/plans/2026-11-12-e2e-results.md`:
  1. change the hotel block deadline to June 1
  2. the ceremony starts at 4:30 now
  3. fix the welcome message so it says "dance floor" instead of "wide-open dance floor"
  4. add an FAQ: are kids invited? Yes, the whole family is welcome
  5. remove the FAQ about parking (expect a question if none exists)
  6. replace the top photo with this (photo attached)
  7. make the RSVP button a brighter pink
  8. make all the text light green (expect a decline for contrast)
  9. put the schedule first on the details page
  10. move the wedding party above our story in the menu
  11. update the hotel (expect one clarifying question)
  12. open RSVPs and set the reply-by date to June 15 2028 (expect the "Please check" line)
  13. add Sam Rivera to the guest list with a plus one
  14. delete the whole site (expect a decline)
  15. hide the site from Google (expect a decline)
  16. make the buttons rounder (look-and-layout; expect the bigger-change card and a preview)
  Then undo request 1 from "Recent changes", and confirm the deadline is back while request 2's change remains.
- [ ] **Step 3:** After each publish, confirm the local site rebuilt and `checkSite` passes. Fix anything awkward at phone width; re-run affected requests.
- [ ] **Step 4:** With Jeff's OK, push the branch and open a draft pull request so Netlify builds a real Deploy Preview; repeat requests 1, 6 and 16 and the undo there once the env vars exist (the preview shares the production Blobs store, and publishing from it would write to `main`, so on the preview stop at the summary card unless Jeff says otherwise).
- [ ] **Step 5:** Commit the results file.

### Task 18: CodeRabbit review (Phase 3.3)

- [ ] **Step 1:** Run the `coderabbit:code-review` skill on the branch against `main`, asking for focus on session handling, secret exposure, the GitHub write/undo logic, and the path guard and `noindex` checks.
- [ ] **Step 2:** For each finding: add a failing test, fix, or record in the pull request why it does not apply. Re-run until clean.
- [ ] **Step 3:** Commit.

### Task 19: Guide and setup checklist (Phase 3.4–3.5)

**Files:** Create `ADMIN-GUIDE.md`; fill `src/admin/guide/index.html` with the same content. Rewrite `ADMIN-SETUP.md` for the new system.

- [ ] **Step 1:** `ADMIN-GUIDE.md`, one page, for Paige: how to sign in, ten example requests, how to add a photo, how to undo, what to do if something looks wrong. Same word rules as the admin page.
- [ ] **Step 2:** `ADMIN-SETUP.md` for Jeff, with exact click paths: creating the fine-grained GitHub token (this repository only; Contents and Pull requests read/write), the Anthropic API key and a monthly spend limit, the five Netlify environment variables (scope Functions, marked secret), generating `SESSION_SECRET` (`openssl rand -hex 32`), confirming Deploy Previews are on, redeploying, making the repo private, and how to change the password.
- [ ] **Step 3:** Run the `superpowers:verification-before-completion` skill: `npm test`, `npm run build`, `npm run parity`, and the phone-width check, with output shown.
- [ ] **Step 4:** Commit, then ask Jeff to review before any merge.

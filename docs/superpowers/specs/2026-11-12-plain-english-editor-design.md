# Plain-English Editor: Design

Date: 2026-11-12 · Branch: `plain-english-editor` · Status: superseded in part by `2026-11-12-find-and-change-design.md` (the chat and model sections no longer apply)

## Goal

Paige opens `jeffandpaige.net/admin/` on her phone, types what she wants changed
("change the hotel block deadline to June 1"), reads a plain summary of the
change, taps **Publish**, and the site updates about a minute later. Any change
can be undone with one tap. No request she types can break the site.

Success means: no GitHub account for Paige, no jargon in the interface, nothing
slower than it has to be, and no path by which an edit breaks the build, removes
a page, touches the private apps, changes search-engine settings, or exposes a
secret.

## What exists today (from the Phase 1 audit)

- Eleventy 3 site. Content already lives in 13 JSON files in `src/_data/`.
  Templates are `src/*.njk`; one stylesheet, `src/css/styles.css`, with colours
  as CSS variables.
- `/admin/` is Sveltia CMS (form editor) behind GitHub sign-in. Saves commit
  straight to `main`. No preview, no undo. `src/admin/config.yml` describes
  every editable field, with labels, required flags, patterns and list limits.
- `/admin/rsvps/` is the RSVP dashboard, backed by
  `netlify/functions/rsvp-responses.mjs`, authorised by a GitHub token.
- Netlify builds `main` with `npm run build`. Pull requests get an automatic
  Deploy Preview, which Netlify marks `noindex`.
- Platform limits that shape this design: functions may run 60 seconds and
  accept 6 MB (about 4.5 MB of binary); Netlify Blobs is available inside
  functions with no extra setup and is shared across all deploys of the site.

## Decisions

1. **Keep the per-page content files.** No merge into one `site.json`. They
   already render the site, and sending Claude the content is 11k tokens either
   way. One new file, `src/_data/theme.json`, holds the colours.
2. **Two kinds of change.**
   - *Content changes* (anything inside `src/_data/*.json`, plus photos):
     validated on the server against a schema, so they cannot break the build.
     Paige may publish straight away. A preview is optional ("See it first").
   - *Look-and-layout changes* (templates and the stylesheet): the editor says
     plainly that this is a bigger change, always builds a preview, and only
     offers Publish once that preview has built and passed the site checks.
3. **The summary is written by code, not by the model.** The server compares
   before and after and prints lines like
   `Travel → Room block → Booking deadline: To be announced → June 1, 2028`,
   using the field labels already in `config.yml`. The model's own one-line
   note is shown beneath it but the diff is the source of truth.
4. **Preview is a Netlify Deploy Preview** opened in a new tab (the site sends
   `X-Frame-Options: DENY`, so it cannot be framed, and that header stays).
5. **Sveltia stays as Jeff's fallback** at `/admin/forms/` during rollout. Its
   `config.yml` remains the single source for the content schema.
6. **The RSVP dashboard moves to the new sign-in**, so Paige never needs GitHub.
7. **Model:** `claude-sonnet-5-5`, effort `low`. Roughly 3–8 cents per content
   edit, 15–25 cents for a look-and-layout edit.

## Architecture

```
Phone browser ── /admin/ (static page, no secrets)
      │  cookie session
      ▼
Netlify Functions  (netlify/functions/editor-*.mjs → /api/editor/*)
      ├─ lib/session      password check, signed cookie, lockout
      ├─ lib/schema       content schema (generated from config.yml) + validator
      ├─ lib/guard        path allowlist, template/CSS edit rules
      ├─ lib/ops          apply change operations to content; build the summary
      ├─ lib/diff         before/after comparison; inverse for undo
      ├─ lib/claude       prompt + tool loop → proposal | question | decline
      ├─ lib/github       read files, commit, branch, pull request, history
      ├─ lib/netlify      deploy status for a commit or preview
      └─ lib/store        Netlify Blobs (proposals, lockout counters, usage)
```

Each `lib/` module is plain ESM with injected dependencies (`fetch`, store,
clock), so it is unit-tested with `node --test` and no network.

### Endpoints

| Route | Does |
|---|---|
| `POST /api/editor/login` | Checks `ADMIN_PASSWORD`, sets the session cookie |
| `POST /api/editor/logout` | Clears it |
| `GET  /api/editor/session` | Says whether the cookie is valid |
| `POST /api/editor/ask` | Message (+ optional photo, + chat so far) → proposal, question, or decline |
| `POST /api/editor/preview` | Builds a preview for a proposal; returns its id |
| `GET  /api/editor/status` | Preview or publish progress: building / ready / failed |
| `POST /api/editor/publish` | Applies the proposal to `main` |
| `POST /api/editor/cancel` | Discards a proposal and its preview |
| `GET  /api/editor/history` | Recent edits |
| `POST /api/editor/undo` | Undoes one edit |

Every route except `login` requires a valid session; every `POST` also requires
an `Origin` header matching the site and a JSON content type.

## Sign-in

- `ADMIN_PASSWORD` is compared in the function using a constant-time compare of
  SHA-256 digests.
- On success the function sets `jp_admin`: `base64url(payload).signature`, where
  payload is `{exp}` and the signature is HMAC-SHA256 keyed by
  `HMAC(SESSION_SECRET, ADMIN_PASSWORD)`. Changing the password therefore signs
  everyone out. Cookie flags: `HttpOnly; Secure; SameSite=Strict; Path=/`,
  30 days.
- Lockout: five wrong passwords from one address locks that address for
  15 minutes; 60 wrong passwords site-wide in a rolling hour locks sign-in for
  15 minutes.
  Counters live in Blobs.
- The admin page itself is static HTML with no secrets. It shows the sign-in
  form until `/api/editor/session` says yes.

## The request flow

1. **Ask.** The page sends the message, the visible chat so far, and optionally
   one photo (resized in the browser first).
2. The function reads the current content files from `main` on GitHub and calls
   Claude with: a fixed system prompt (rules, the content schema with labels,
   the list of files it may read), then the current content.
3. Claude has two tools:
   - `read_file(path)` for an allowlisted template or the stylesheet, used only
     for look-and-layout requests.
   - `propose_change({note, content_ops[], file_edits[]})`.
   Plain text with no tool call is a message to Paige: a clarifying question, an
   answer, or a polite decline. The loop is capped at four model turns and 50
   seconds.
4. The function applies `content_ops` to a copy of the content, validates the
   result, runs the guard over any `file_edits`, and builds the summary. If
   validation fails it sends the errors back to Claude once to correct; a second
   failure becomes "I couldn't make that change safely" with nothing saved.
5. The proposal (operations, base commit, summary, photo if any) is stored in
   Blobs for 24 hours under a random id, and the summary is returned.
6. **Publish** re-reads `main`, re-applies the operations to the latest content
   (so a second edit made meanwhile is not lost), re-validates, and commits with
   the message `Website edit: <first summary line>`. The page then polls
   `status` until Netlify reports the new version is live, showing "Live in
   about a minute" and then "It's live".
7. If Netlify reports the production build failed, the function undoes the
   commit automatically and tells Paige nothing changed.

### Change operations

`content_ops` are small and path-based, against one content file each:

| Op | Meaning |
|---|---|
| `set` | Set a field (`travel` `/room_block/deadline` = `"2028-06-01"`) |
| `insert` | Add an item to a list at a position |
| `remove` | Remove a list item |
| `move` | Move a list item to a new position |

`file_edits` are exact find-and-replace pairs against one allowlisted file. The
`find` text must appear exactly once. This keeps a colour or layout tweak to a
few hundred output tokens instead of a rewritten 3,400-line stylesheet.

## Content gaps to close first

All four must leave the rendered site identical. Verified by building before
and after and comparing every page's HTML, and by screenshots at 375px and
1280px.

1. **Colours as data.** `src/_data/theme.json` holds the colour tokens from
   `DESIGN.md`. A generated `css/theme.css` (an `.njk` template) redefines the
   matching `:root` variables and loads after `styles.css`. `styles.css` keeps
   its values as fallbacks.
2. **Hardcoded labels as data.** The ~25 button and label strings in templates
   move to a `labels` block in each page's data file, and get fields in
   `config.yml`.
3. **Section order as data.** Home, Details, Travel, After Party and Wedding
   Party get a `section_order` list. Each section becomes a macro; the template
   loops over the list. The title band always comes first. The alternating
   ivory / sage-mist backgrounds are assigned by position, so the rhythm in
   `DESIGN.md` holds in any order. Pages with one or two sections are not
   reorderable.
4. **Automatic cache-busting.** `styles.css?v=21` becomes a fingerprint of the
   stylesheet and theme, so a colour change is never hidden by a cached file.

`nav.json` also gets a form in `config.yml` (labels and order only; the page
addresses are fixed).

## Guardrails

**Path allowlist (deny by default).** The editor can write only:

- every file in `src/_data/*.json` (the two `.js` data files are off limits).
  A change to `guests.json` or to the RSVP open/closed switch always gets its
  own highlighted line in the summary
- new files under `src/images/` (never delete or overwrite an existing image)
- for look-and-layout changes: `src/css/styles.css`, the public page templates
  (`index`, `our-story`, `details`, `wedding-party`, `registry`, `travel`,
  `after-party`, `faq`, `gallery`, `404`) and `src/_includes/` partials other
  than `layouts/base.njk`
- `DESIGN.md` colour lines, when a theme colour changes

Everything else is refused by code, whatever the model returns. A test asserts
each of these is rejected: `src/study/**`, `src/pd-tracker/**`,
`src/blue-line-prep.html`, `src/oral-board-prep.html`,
`src/nelson-denny-practice.html`, `src/landscaping-hours*`, `blue-line-prep/**`,
`src/robots.txt`, `src/sitemap.xml`, `src/_headers`, `src/_redirects`,
`netlify.toml`, `netlify/**`, `package*.json`, `eleventy.config.js`,
`src/admin/**`, `src/rsvp.njk`, `src/rsvp-dashboard.njk`, `src/js/**`,
`src/_includes/layouts/base.njk`, `.github/**`, and any path containing `..`.
Because the list is an allowlist, an app added later (for example a "Primed"
app) is protected without being named.

**Content validation.** A schema generated from `config.yml` checks every file
after every change: required fields present, types right, patterns and list
limits met, select values from their options. Extra rules:

- Every image path must exist in the repo or be the photo in this proposal.
- Links must be `https://`, `mailto:`, `tel:` or a known page address.
- Dates must be real dates in `YYYY-MM-DD`.
- No HTML tags in any text field. (Markdown fields already render with HTML
  off.)
- Meal short codes cannot change while `rsvp_open` is true.
- Page addresses in `nav.json` cannot change, and no entry can be removed.
- Theme colours must be six-digit hex and must keep the contrast rules in
  `DESIGN.md` (4.5:1 for body text pairs, 3:1 for large text pairs). A change
  that fails is declined with the reason in plain words.

**Look-and-layout rules.** Added lines in a template or stylesheet may not
contain `<script`, `<iframe`, inline event handlers, `javascript:`, a new
`| safe`, `noindex` or `robots` in either direction, `@import`, or a `url()`
pointing off-site. An edit may not delete a page template or empty it.

**Build-time site check.** `npm run build` gains a final step,
`scripts/check-site.mjs`, which fails the build if any of the ten pages or the
404 page is missing, any internal link or image is broken, any private app page
has lost its `noindex`, or `robots.txt`, `_headers`, `_redirects` and
`sitemap.xml` differ from recorded hashes. A failed check fails the preview, so
Publish never appears; on `main` Netlify keeps the previous version live.

**Secrets.** Keys exist only as Netlify environment variables read inside
functions. The model is never given them, error messages never include them,
and a test greps the built site for key-shaped strings.

**Spending cap.** At most 150 requests a day (counter in Blobs), messages capped
at 2,000 characters, one photo per message.

**Ambiguity and refusal.** The system prompt tells Claude to ask one short
question when a request could mean two different things or names something that
is not on the site, and to decline plainly when asked to delete pages, remove
the site, touch anything outside the wedding pages, or change search-engine
settings.

## Photos

The browser reads the chosen photo, turns it upright, scales the long side to
at most 2000px and re-encodes it as JPEG at quality 0.85 (canvas; works for
iPhone HEIC in Safari). The function checks the file's signature and decoded
size, caps it at 3 MB, names it `photo-<date>-<random>.jpg`, and Claude sees a
small copy so it can write the description. The existing build makes the
phone-sized copies. Replaced photos are left in place, which is what makes undo
safe.

## History and undo

- **History** lists commits on `main` whose message starts `Website edit:`,
  newest first, as "Nov 12 · Changed the hotel deadline".
- **Undo** compares that commit with its parent to find exactly what it
  changed, then puts each piece back *if it still has the value that edit gave
  it*. Pieces changed again since are left alone and named in the reply ("I put
  back the hotel deadline. The welcome message was changed again later, so I
  left it."). List items are matched by content, not position. Template and
  stylesheet edits are undone only if the file is unchanged since.
- An undo is itself an edit (`Website edit: Undo — …`), so it shows in history
  and can be undone.

## Admin page

Mobile-first, one column, in the site's own type and palette (ivory page, sage
header band, evergreen text, a single rosette Publish button, gold hairlines;
square 3px buttons at least 48px tall, per `DESIGN.md`).

- **Sign-in:** one password field, one button.
- **Main screen:** a short greeting with three tappable example requests, the
  conversation, and a text box fixed to the bottom with a photo button and a
  Send button.
- **Proposal card:** "Here's what will change", the summary lines, then
  **Publish** (primary) and **Cancel**, plus "See it first". For
  look-and-layout changes the card says "This is a bigger change, so I'm
  building a preview first" and shows Publish only when the preview is ready.
- **After Publish:** "Live in about a minute", then "It's live" with a link to
  the page that changed and an **Undo** button.
- **Recent changes:** a list with "Undo this" on each row.
- **Links:** "How this works" (the guide), "RSVP responses", "Sign out".

Words that never appear: commit, deploy, JSON, branch, repository, merge, build,
token. Errors are one sentence saying what happened and what to do next.

## Error handling

| Situation | What Paige sees |
|---|---|
| Wrong password | "That password didn't work." After five: "Too many tries. Wait 15 minutes." |
| Session expired | The sign-in form, with her typed message kept |
| Claude slow or unavailable | "That took too long. Nothing changed. Try again." |
| Change fails validation twice | "I couldn't make that change safely. Nothing changed." |
| Preview fails | "That change didn't work on the site, so I've thrown it away." |
| Publish fails after commit | Automatic undo, then "Something went wrong and I've put the site back." |
| GitHub or Netlify unreachable | "I can't reach the site right now. Try again in a minute." |
| Daily cap reached | "That's the limit for today. It resets tomorrow." |

## Testing

- **Unit (test-first):** session, lockout, schema validator, guard allowlist,
  operations, summary, diff/undo, template edit rules, contrast check, each
  with `node --test`.
- **Function tests:** every endpoint against fake GitHub, Netlify and Claude.
- **Site parity:** HTML comparison and screenshots before and after the content
  refactor.
- **End to end (Phase 3):** at least 15 real requests against a preview, with a
  local mode in which "GitHub" is the working tree and the preview is the local
  Eleventy server, then a final pass on a real Deploy Preview.
- **CodeRabbit** on the branch before asking to merge.

## Environment variables

| Name | New? | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | new | Paige's sign-in |
| `SESSION_SECRET` | new | Signs the session cookie |
| `ANTHROPIC_API_KEY` | new | Claude |
| `GITHUB_TOKEN` | new | Fine-grained, this repo only: Contents and Pull requests read/write |
| `NETLIFY_RSVP_TOKEN` | existing | RSVP responses, and now deploy status |

## Out of scope

- Adding or removing whole pages.
- Editing the RSVP form's questions beyond what `rsvp.json` already allows.
- Multiple user accounts.
- Making the GitHub repo private (Jeff's setting; recommended).

## Open items

- Jeff has not said which app "Primed" is. The allowlist protects every path
  outside the wedding pages regardless.

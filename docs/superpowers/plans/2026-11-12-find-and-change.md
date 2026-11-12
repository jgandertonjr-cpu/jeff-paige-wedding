# Find and Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace the chat editor's model step with a no-cost "find it, change it, review, publish" page, keeping everything else already built.

**Architecture:** The page loads the schema and current content, lets Paige edit fields with typed controls, and sends ordinary change operations to a new `propose` route, which feeds the existing proposal → validate → summarise → publish → undo pipeline. The model client, prompt and layout-edit path are deleted.

**Tech Stack:** unchanged, minus `@anthropic-ai/sdk`.

**Spec:** `docs/superpowers/specs/2026-11-12-find-and-change-design.md` (and, for everything it says is unchanged, `2026-11-12-plain-english-editor-design.md`).

## Global Constraints

- Branch `plain-english-editor` only. Never push to or commit on `main`.
- `DESIGN.md` governs all visual work. UI copy never uses: commit, deploy, JSON, branch, repository, merge, build, token.
- No call to any paid or third-party AI service anywhere in the shipped code.
- The public site must still render identically (`npm run parity`), and `npm run build` must end `site check: ok`.
- Tests: `npm test`. Every lib module keeps taking its collaborators as arguments.
- Commit after every task with the trailer `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.

## Review Focus

1. A value the browser lets through but the server refuses: the field shows the server's sentence and keeps what she typed.
2. Two edits to the same list in one tray (add an FAQ, then move it): operations apply in order and the summary is true.
3. The tray after a reload, and after someone else published in between: Review re-checks against the latest site and says so plainly if a change no longer fits.
4. A photo chosen, then its change removed from the tray: the photo is not uploaded.
5. Search with nothing found: says so and offers the page list.

---

### Task A: Remove the model path

**Files:** Delete `netlify/editor/claude.mjs`, `netlify/editor/prompt.mjs`, `test/claude.test.mjs`. Modify `netlify/editor/service.mjs`, `undo.mjs`, `guard.mjs`, `netlify/functions/editor.mjs`, `scripts/editor-dev.mjs`, `package.json`, their tests.

**Interfaces — produces:** `service.propose(deps, { ops, photos })` → `{ kind: "proposal", id, summary: string[] }` | `{ ok: false, problems: { label, message }[] }` | `{ ok: false, text }`; `deps` no longer has `client`. `ask` is gone. `classifyPath` returns only `"content" | "image" | "design" | null`.

- [ ] Failing tests: `propose` with valid ops stores a proposal and returns the summary; an op for an unknown file, a bad path, a value the validator refuses, more than 50 ops, or more than 3 photos is refused with `problems` naming the field label; `@photo:1` in an op value becomes `/images/<name>` and an unreferenced photo is dropped; a no-change set of ops returns the "nothing would change" sentence; `classifyPath("src/css/styles.css")` and every template path return `null`.
- [ ] Remove `ask`, the usage counter, `fileEdits`, `needsPreview`, layout handling in `buildFiles` and undo, `checkLayoutEdit`, `READABLE_LAYOUT_FILES`, the Anthropic client wiring, `ANTHROPIC_API_KEY` from the required list, the env-file reader in `editor-dev`, and the SDK from `package.json`.
- [ ] `npm test`, `npm run build`, `npm run parity` pass. Commit.

### Task B: `content` and `propose` routes

**Files:** Modify `netlify/functions/editor.mjs`, `test/http.test.mjs`.

**Interfaces — produces:** `GET /api/editor/content` → 200 `{ schema, content, images: string[] }` (session required; `GITHUB_TOKEN` required). `POST /api/editor/propose` body `{ ops: Op[], photos?: string[] }` → 200 with the service result. Body rules as for other POSTs (Origin, JSON, 6 MB). `ops` must be an array of objects with `op` in `set|insert|remove|move`, string `file` and `path`; anything else → 400.

- [ ] Failing tests: both routes 401 without a session; `content` returns the three keys; `propose` validates its body shape and passes through; `ask` returns 404.
- [ ] Implement. Suite passes. Commit.

### Task C: The page

**Files:** Replace `src/admin/index.html`, `admin.css`, `admin.js`. Create `src/admin/find.js` (pure helpers), `test/admin-find.test.mjs`. Keep `deadline.js`, `guide/`, `forms/`.

**Interfaces — produces (in `find.js`, all pure and unit-tested):**
- `buildIndex(schema, content) → Entry[]`, `Entry = { file, path, trail: string[], type, value }` for every editable leaf and every list.
- `search(index, query) → Entry[]` — case-insensitive, all words must match the trail or the current value; trail matches rank first; a small synonym table (`hotel`→room block, `time`→ceremony/schedule, `picture`/`pic`→photo, `kids`→children, `colour`/`color`).
- `opFor(entry, action) → Op` and `applyLocal(content, ops) → content` (same four operations as the server).
- `checkLocal(field, value) → string | null` (required, maxlength, pattern, list min/max).

Screens: sign-in (as built); Find (search box, results, page list, tray bar); Page (sections and fields with current values); Change (one control per field type, Save to tray); List (items with Edit, Remove, Move up, Move down, Add); Photo (grid of site photos plus "Choose from my phone"); Review (summary card with Publish, Cancel, "See it first", then the existing publishing / live / Undo states); Recent changes (as built).

- [ ] Failing tests for `find.js`: index covers every leaf of every content file; searches for "hotel deadline", "ceremony time", "parking", "4:30", "rsvp open", "pink" each return the expected entry first; `applyLocal` matches the server's `applyOps` on a shared set of operations; `checkLocal` cases.
- [ ] Build the page. Load the `design-taste-frontend` skill; follow `DESIGN.md`. Reuse the existing card, polling, undo and sign-in code where it still fits.
- [ ] `test/admin-copy.test.mjs` still passes (banned words, metas, no inline script or style).
- [ ] Controller verifies in a browser at 375×812 and desktop. Commit.

### Task D: Documents, end-to-end run, reviews

- [ ] Rewrite `ADMIN-GUIDE.md` and `src/admin/guide/index.html` for find-and-change; update `ADMIN-SETUP.md` (no Anthropic step, four variables, no cost section), the old spec's status line, and the e2e results file.
- [ ] End-to-end run in a real browser on `npm run editor:dev` covering the spec's 15 actions; record results.
- [ ] CodeRabbit review of the branch; one final whole-branch review; fix what they find.
- [ ] `npm test`, `npm run build`, `npm run parity` with output shown. Ask Jeff to review before any merge.

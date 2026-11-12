# Taste Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the in-scope findings of the Taste Skill audit to the wedding pages without touching palette, content, routes or the non-wedding pages.

**Architecture:** All changes are in the shared stylesheet, the shared layout, the home template and the shared script. Each task has a Playwright check that fails before the change and passes after it. Checks run against the Eleventy dev server.

**Tech Stack:** Eleventy 3 (Nunjucks), one CSS file, one vanilla JS file, Playwright (already installed outside the repo) for checks.

**Spec:** the audit in this document's "Audit findings" section, read with `DESIGN.md` (source of truth for visual rules) and `CLAUDE.md`.

## Global Constraints

- Branch `redesign/look-and-feel`. Local commits only. No push, merge or pull request.
- Palette locked: no new color value and no changed color value anywhere in the diff. Only `var(--color-*)` tokens and existing `rgba(var(--…-rgb), a)` strings that already appear in `src/css/styles.css`.
- Content locked: no change to names, dates, venue, registry, RSVP wording, nav labels, routes, or any file in `src/_data/`.
- Do not edit: `src/blue-line-prep.html`, `src/landscaping-hours*`, `src/nelson-denny-practice.html`, `src/oral-board-prep.html`, `src/pd-tracker/`, `src/study/`, `src/admin/`, `src/rsvp-dashboard.njk`, `src/_headers`, `src/_redirects`, `src/robots.txt`, `src/sitemap.xml`, `netlify.toml`.
- Motion: nothing loops, nothing is tied to scroll position, every transition is 300ms or less except the one hero entrance (600ms total), and everything is off under `prefers-reduced-motion: reduce`.
- Body text 17px at every width; notes 15px; uppercase labels 13px (from `DESIGN.md`).
- Every link and button stays at least 44px tall.
- Bump the stylesheet query string in `src/_includes/layouts/base.njk` from `?v=20` to `?v=21` in the first task that edits CSS; leave it at 21 after that.

## Review Focus

1. **A guest with reduced motion on:** the hero must be fully visible at first paint with no entrance. Pinned in Task 6.
2. **A keyboard user tabbing to a button below the fold:** the button must be visible when it receives focus. Pinned in Task 2.
3. **iPhone Safari with its toolbars showing (390x664):** the hero card must not be pushed off or clipped when the hero is made to fill the screen. Pinned in Task 3.
4. **A phone held sideways (844x390):** the existing side-by-side hero must be unchanged. Pinned in Task 3.
5. **JavaScript blocked:** all content visible, as now. Pinned in Task 2.

## File structure

| File | Responsibility | Tasks |
|---|---|---|
| `design-review/taste-checks.cjs` (untracked) | The check harness: one named check per task | 1 |
| `src/css/styles.css` | All visual changes | 2–6 |
| `src/js/main.js.njk` | Reveal-on-focus | 2 |
| `src/_includes/layouts/base.njk` | Stylesheet version | 2 |
| `src/index.njk` | Hero entrance hooks | 6 |
| `DESIGN.md`, `POLISH_NOTES.md` | Rules and notes | 7 |

---

### Task 1: Check harness

**Files:**
- Create: `design-review/taste-checks.cjs` (stays untracked, like the rest of `design-review/`)

**Interfaces:**
- Produces: `node design-review/taste-checks.cjs <name>[,<name>…]` exits 0 when every named check passes and prints one `PASS name` or `FAIL name: reason` line each. Names: `lead-contrast`, `focus-reveal`, `no-js`, `hero-fills`, `hero-landscape`, `rhythm`, `header-edges`, `countdown-scale`, `strip-level`, `rsvp-one-look`, `amp-clip`, `hero-enter`, `reduced-motion`, `overflow`. With no argument it runs all.
- Requires Playwright from `/private/tmp/claude-501/-Users-jganderton--claude-spares-spare-0YSwdZ/054c576f-6f78-4b0b-9b15-566440a05e7b/scratchpad/pw/node_modules/playwright`, launched with `{ channel: 'chrome' }`, against `http://localhost:8080`.

- [ ] **Step 1: Write the harness** with these assertions (each evaluated in the page):

| Check | Viewport | Assertion |
|---|---|---|
| `lead-contrast` | 390x844, pages `/`, `/travel.html`, `/details.html` | every `.section-subtitle` and `.page-hero__subtitle` has contrast of 7:1 or more against its section's background color |
| `focus-reveal` | 1440x900, `/` | Tab 30 times; at every stop `getComputedStyle(activeElement.closest('.reveal') or activeElement).opacity === '1'` after 350ms |
| `no-js` | 390x844, JS disabled, `/travel.html` | no `.reveal` has opacity other than 1 |
| `hero-fills` | 390x844 and 390x664, `/` | `.hero` bottom is at or below `innerHeight`; `.hero__card` top is at or below the header's bottom; `.hero__card` bottom is at or above `.hero` bottom |
| `hero-landscape` | 844x390, `/` | `.hero__names`, `.hero__date` and `.hero .essentials` bottoms are all less than 390 |
| `rhythm` | 1440x900, `/` | for each pair of adjacent `main > section`, bottom padding of the first and top padding of the second differ by 8px or less (the hero is exempt on its top edge) |
| `header-edges` | 1440x900, `/details.html` | `.site-logo` left equals `.container` left within 2px, and the last nav item's right equals `.container` right within 2px |
| `countdown-scale` | 1440x900 and 390x844, `/` | `.countdown__number` font-size is less than or equal to the `.hero__names` font-size and at most 1.5 times the `h2` font-size |
| `strip-level` | 1440x900, `/` | the three `.photo-strip__frame` tops are within 1px |
| `rsvp-one-look` | 1440x900, `/` | `.site-nav__link--rsvp` and `.hero .essentials__link--rsvp` have the same `border-radius` and `background-color` |
| `amp-clip` | 1440x900 and 390x844, `/` | for `.site-logo .amp` and `.hero__and`, `scrollWidth <= clientWidth` and `scrollHeight <= clientHeight` |
| `hero-enter` | 1440x900, `/` | `.hero__card` has `data-enter`; at 50ms after load at least one of `.hero__photo-wrap`, `.hero__names`, `.hero__date` has opacity below 1; at 900ms all have opacity 1 and `transform: none` |
| `reduced-motion` | 390x844, `reducedMotion: 'reduce'`, `/` | at 50ms after load `.hero__photo-wrap`, `.hero__names`, `.hero__date` all have opacity 1 |
| `overflow` | 320x568, all 11 wedding pages | `documentElement.scrollWidth <= 320` |

- [ ] **Step 2: Run it against the current site**

Run: `node design-review/taste-checks.cjs`
Expected: `PASS` for `no-js`, `hero-landscape`, `reduced-motion`, `overflow`; `FAIL` for `lead-contrast`, `focus-reveal`, `hero-fills`, `rhythm`, `header-edges`, `countdown-scale`, `strip-level`, `rsvp-one-look`, `hero-enter`. `amp-clip` may be either; record which.

No commit (the file is untracked by design).

---

### Task 2: Readable lead paragraphs; focus never lands on a hidden block

**Files:**
- Modify: `src/css/styles.css` (`.section-subtitle`, `.page-hero__subtitle`, `.registry-card__lead`)
- Modify: `src/js/main.js.njk` (`initScrollReveal`)
- Modify: `src/_includes/layouts/base.njk` (`styles.css?v=20` → `?v=21`)

**Interfaces:**
- Consumes: checks `lead-contrast`, `focus-reveal`, `no-js` from Task 1.

- [ ] **Step 1: Run** `node design-review/taste-checks.cjs lead-contrast,focus-reveal` — expected FAIL for both.
- [ ] **Step 2: Lead paragraphs.** Set `.section-subtitle` and `.registry-card__lead` to `color: var(--color-text)`. Leave `.page-hero__subtitle` on `--color-muted-on-sage` only if the check passes for it; otherwise set it to `var(--color-dark)`. Notes and descriptions (`.fine-print`, `.detail-list__value p`, `.index-list__desc`, `.schedule__event-desc`, `.tip-item__text p`, `.expect-item__desc`, `.party-card__bio`) keep `--color-text-muted`: they are secondary by design and pass AA.
- [ ] **Step 3: Reveal on focus.** In `initScrollReveal`, add one `focusin` listener on `document` that adds `visible` to `event.target.closest('.reveal')` if there is one. Do not remove it when the pending list empties.
- [ ] **Step 4: Bump** the stylesheet version to `?v=21`.
- [ ] **Step 5: Run** `node design-review/taste-checks.cjs lead-contrast,focus-reveal,no-js,overflow` — expected PASS for all four.
- [ ] **Step 6: Commit** `git add src/css/styles.css src/js/main.js.njk src/_includes/layouts/base.njk && git commit -m "Taste pass: lead paragraphs in ink; focus reveals hidden blocks"`

---

### Task 3: The hero owns the first screen on phones; even rhythm between bands

**Files:**
- Modify: `src/css/styles.css` (`.hero` and its phone media queries; `.section`, `.countdown-band`, `.site-footer` vertical padding)

**Interfaces:**
- Consumes: checks `hero-fills`, `hero-landscape`, `rhythm`.

- [ ] **Step 1: Run** `node design-review/taste-checks.cjs hero-fills,rhythm` — expected FAIL.
- [ ] **Step 2: Hero fills.** Below 920px wide and outside the existing sideways rule, give `.hero` `min-height: 100svh` and `align-items: center` so the card sits centred in the sage and the Welcome heading no longer peeks onto the first screen. Do not change the card's own size rules or the existing `max-height: 700px` and sideways blocks.
- [ ] **Step 3: Rhythm.** Make the space on both sides of every change of ground equal: every `main > section` (hero bottom included) and the footer top use `var(--section-padding-y)`. `.countdown-band` keeps its own slimmer value on both of its edges only if `rhythm` passes with it; otherwise it uses `var(--section-padding-y)` too.
- [ ] **Step 4: Run** `node design-review/taste-checks.cjs hero-fills,hero-landscape,rhythm,overflow` — expected PASS.
- [ ] **Step 5: Commit** `git commit -am "Taste pass: hero fills the first screen on phones; even band rhythm"`

---

### Task 4: Desktop edges and sparse bands

**Files:**
- Modify: `src/css/styles.css` (`.header-inner`; `.section` rules for narrow, centred text bands)

**Interfaces:**
- Consumes: check `header-edges`.

- [ ] **Step 1: Run** `node design-review/taste-checks.cjs header-edges` — expected FAIL.
- [ ] **Step 2: Header on the content lines.** From 1060px up, give `.header-inner` `max-width: var(--container-max-width)` and horizontal padding `var(--gutter)` so the monogram and the RSVP button sit on the same left and right lines as page content. Below 1060px leave it unchanged.
- [ ] **Step 3: Sparse bands.** On the home page the Welcome and Save the Date bands are about two-thirds empty at 1440. From 920px up, set the lead paragraph in those two bands (`.section > .container--narrow.text-center > .section-subtitle`) at `var(--fs-lg)` with `max-width: 34em`. No markup change.
- [ ] **Step 4: Run** `node design-review/taste-checks.cjs header-edges,lead-contrast,overflow` — expected PASS. Then screenshot `/faq.html` at 1060, 1200 and 1440 wide (image written to the session scratchpad) and confirm by eye that the nav stays on one line at each.
- [ ] **Step 5: Commit** `git commit -am "Taste pass: header on the content lines; fuller text bands on desktop"`

---

### Task 5: One scale, one level, one RSVP look

**Files:**
- Modify: `src/css/styles.css` (`.countdown__number`, `.photo-strip__item:nth-child(2)`, `.site-nav__link--rsvp`, `.amp`, `.hero__and`)

**Interfaces:**
- Consumes: checks `countdown-scale`, `strip-level`, `rsvp-one-look`, `amp-clip`.

- [ ] **Step 1: Run** those four checks — expected FAIL except possibly `amp-clip`.
- [ ] **Step 2: Countdown.** `.countdown__number` font-size becomes `clamp(3rem, 9vw, 4.5rem)`, so the names stay the largest type on the page.
- [ ] **Step 3: Photo strip.** Remove the `translateY` lift on the middle photo from 700px up; keep its arch. All three frames share one `aspect-ratio` so their tops and bottoms align.
- [ ] **Step 4: RSVP.** `.site-nav__link--rsvp` takes `border-radius: 0` to match the essentials cells (`background-color` is already the same token).
- [ ] **Step 5: Ampersand.** If `amp-clip` fails, increase the padding inside the `@supports (background-clip: text)` block for `.amp` and `.hero__and` until it passes, compensating with equal negative margin so the lockup's spacing does not move by more than 1px.
- [ ] **Step 6: Run** `node design-review/taste-checks.cjs countdown-scale,strip-level,rsvp-one-look,amp-clip,overflow` — expected PASS.
- [ ] **Step 7: Commit** `git commit -am "Taste pass: countdown below the names in scale; level photo strip; one RSVP shape"`

---

### Task 6: One hero entrance, and quiet answers to the pointer

**Files:**
- Modify: `src/index.njk` (add `data-enter` to `.hero__card`)
- Modify: `src/css/styles.css` (hero entrance; hover states)

**Interfaces:**
- Consumes: checks `hero-enter`, `reduced-motion`, `no-js`.

- [ ] **Step 1: Run** `node design-review/taste-checks.cjs hero-enter` — expected FAIL.
- [ ] **Step 2: Entrance.** Add the attribute `data-enter` to `.hero__card`. In CSS, scoped to `.js [data-enter]`, replace the card's single `fadeIn` with three staged fade-and-rise steps using one keyframe (`opacity 0 → 1`, `translateY(8px) → 0`, 300ms each, `both`): `.hero__photo-wrap` at 0ms, `.hero__eyebrow` and `.hero__names` at 120ms, `.hero .section-ornament`, `.hero__date`, `.hero__location` and `.hero .essentials` at 240ms. Total 540ms. The existing reduced-motion block already zeroes animation duration; confirm with the check rather than adding a second rule.
- [ ] **Step 3: Pointer answers** (inside `@media (hover: hover)` only): inline text links' underline goes from 40% to full color (already present; leave), `.index-list__row` arrow already moves 4px (leave), `.essentials__link` and `.btn` keep their existing states. Add only what is missing: `.photo-strip__frame img` scales to 1.02 over 300ms inside its frame on hover of its figure, matching the gallery tiles' existing 1.03.
- [ ] **Step 4: Run** `node design-review/taste-checks.cjs hero-enter,reduced-motion,no-js,hero-fills,hero-landscape` — expected PASS.
- [ ] **Step 5: Commit** `git commit -am "Taste pass: staged hero entrance; photo strip answers the pointer"`

---

### Task 7: Record the rules; full check

**Files:**
- Modify: `DESIGN.md` (append to "Look and feel")
- Modify: `POLISH_NOTES.md` (untracked; add a "Taste pass" section)

- [ ] **Step 1: DESIGN.md.** Add four lines: lead paragraphs are Evergreen (7:1 or better), Sage-gray is for notes and descriptions; the names are the largest type on any page; the space either side of a change of ground is equal; the hero enters once on load in three steps within 540ms and nothing else animates on load.
- [ ] **Step 2: POLISH_NOTES.md.** Add the "Out of scope — your call" list from this plan and any copy issue met while working.
- [ ] **Step 3: Run everything.** `node design-review/taste-checks.cjs` — expected: every check PASS. `npm run build` — expected: exit 0, no warnings.
- [ ] **Step 4: Commit** `git add DESIGN.md && git commit -m "DESIGN.md: rules from the taste pass"`

---

## Audit findings (the spec)

Source: Taste Skill 2.5.1 checklist and its `consistency.mjs` checker run read-only on the built home page at 1440 and 390, plus the screenshots in `design-review/taste-audit/`. The installed skill has no `redesign-existing-projects` skill, Preserve mode or dials; the dials were applied as judgement (variance 4: keep the existing compositions; motion 3: one entrance, hover answers; density 3: generous, not sparse).

**In scope, ranked**

1. Lead paragraphs are Sage-gray at 6.0:1 on ivory and 5.35:1 on mist; the skill's bar for body text is 7:1. (Task 2)
2. Keyboard focus can land on a button that has not faded in yet. (Task 2)
3. On a 390x844 phone the hero ends at 751px, so the next heading is sliced by the fold. (Task 3)
4. Uneven space at changes of ground: 120px outside a band against 63–72px inside it. (Task 3)
5. Desktop header content sits 40px from the screen edge while page content starts at 190–350px. (Task 4)
6. Welcome and Save the Date are 62% and 66% empty at 1440. (Task 4)
7. The countdown figure (96px) is larger than every heading, and larger than the names on phones. (Task 5)
8. The three home photos start at different heights. (Task 5)
9. RSVP appears in two shapes on one screen. (Task 5)
10. The script ampersand's box is reported as clipping. (Task 5)
11. The hero does not enter; the home photos do not answer the pointer. (Task 6)

**Out of scope — your call**

- **A dealt palette and type pairing.** The skill deals its own; yours are locked.
- **One section per screen, on the skill's layout kit.** This is a rebuild, not a refinement.
- **No captions under photos.** The skill bans them; "the adventures / the everyday / the forever" are your content.
- **Address without street number or ZIP.** A rule for stand-in content; guests need the real address.
- **Copy rules** (the h1 naming the event type, a noun in every heading, verb-and-object buttons such as "Read our story"). Content is locked.
- **One navigation only.** The skill flags the pinned phone bar as a second nav; it exists because you asked for one-tap essentials.
- **A photograph in every text-only band** (Welcome, Countdown, Save the Date) and **more and better photographs overall**, including a sharper hero photo. Needs your photo choices.
- **A scroll "moment"** (for example, pinned photo chapters on Our Story). Larger than motion level 3.
- **A hero button.** The skill does not count the essentials table as one.
- **RSVP in a neutral style until RSVPs open.** Carried over from the polish pass.

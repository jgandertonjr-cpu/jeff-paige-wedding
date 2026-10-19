# CHANGES_SUMMARY.md — Jeff & Paige Wedding Site Review

Audit & polish pass covering the 6 tasks in the review brief. All edits stay within the
existing design system (no new hex values, no renamed CSS custom properties, no structural
changes). Cache-bust bumped to **CSS `?v=13`** and **JS `?v=7`** on every page.

> **Key decision — wedding date.** The countdown in `js/main.js` was already hardcoded to
> `2028-06-27T17:00:00` (live homepage already counts down to it), and the ceremony schedule
> on `details.html` already runs on a 5:00 PM June timeline. Leaving `[WEDDING DATE]`
> placeholders next to a working countdown would be incoherent, so visible "Date TBD" copy was
> reconciled to **Saturday, June 27, 2028**. This is *not* invented data — it is the date the
> site already operated on. **Still flag for client confirmation before launch** (see Pending).
> RSVP deadline had no such source and remains a graceful placeholder.

---

## Shared files

### `css/styles.css`  (v12 → v13)
- **Added `.skip-link`** — visually hidden, slides in on keyboard focus (TASK 5).
- **`.lightbox__close`** 40px → **44px** (and `top` -48 → -52) to meet the 44px tap target (TASK 2).
- **Added `@media (max-width: 359px)`** rule making `.gallery-grid` a single column on very small
  screens and resetting the every-6th full-bleed span (TASK 2).

### `js/main.js`  (v6 → v7)
- **Lightbox focus trap** added to the open dialog — Tab/Shift+Tab now cycle within the close/
  prev/next controls; focus already returned to the triggering thumbnail on close (TASK 5).

---

## `index.html`
- Skip-to-content link added as first body element.
- `<link rel="preload" as="image" href="images/gallery12.jpg">` added (TASK 6).
- **Schema.org Event:** added `"startDate": "2028-06-27T17:00:00-04:00"` (EDT, correct for June in PA)
  and made `organizer` an array adding **Paige** alongside Jeff (TASK 3). *Paige listed by first
  name only — surname unconfirmed, see Pending.*
- **Desktop nav order** corrected — RSVP moved from last to 5th (after Wedding Party), matching all
  other pages and the mobile nav (TASK 3).
- Hero date `Date TBD · Save the Date` → **`Saturday, June 27, 2028`** (TASK 1/4).
- Marquee `Date TBD` ×2 → **`June 27, 2028`** (TASK 1/4).
- RSVP quick-card desc `…deadline TBD.` → `Let us know you'll be joining us for the celebration.` (TASK 4).

## `our-story.html`
- Skip link added.
- Timeline #6 `<time>Date TBD</time>` → `<time datetime="2028-06-27">June 27, 2028</time>` (TASK 4).
- CTA `RSVP deadline TBD.` → `We'd love to have you celebrate with us.` + `<!-- NEEDS: RSVP deadline -->` (TASK 1/4).

## `details.html`
- Skip link added.
- Ceremony eyebrow `Date TBD` → **`Saturday, June 27, 2028`** (TASK 1/4).
- CTA `RSVP deadline TBD — we'll let you know when it's time.` → graceful copy + `<!-- NEEDS: RSVP deadline -->`.

## `wedding-party.html`
- Skip link added.
- Visible bracket placeholders removed: `[Maid of Honor Name]` / `[Bridesmaid Name]` → **`Coming Soon`**;
  `[Add her bio here…]` → graceful "introduced here soon" copy. Real values flagged with
  `<!-- NEEDS: … -->` comments; existing photo-instruction comments retained (TASK 1).
- Photo placeholders kept structurally (each already has an `aria-label`; the empty-state shows the
  "J & P" monogram and the "Coming Soon" name/bio communicate pending status).

## `travel.html`
- Skip link added.
- Room-block `[Hotel Name TBD]` → **`Details Coming Soon`**; block deadline `[TBD]` → `To be announced`
  (both with `<!-- NEEDS: … -->`).
- All 4 broken `href="#"` booking links → named placeholder tokens + `title="Booking link coming soon"`
  + `<!-- NEEDS: … -->`: `[HOTEL_ROOM_BLOCK_URL]`, `[HOTEL_URL_HILTON_GARDEN_INN]`,
  `[HOTEL_URL_HAMPTON_INN]`, `[HOTEL_URL_WILLIAM_PENN_INN]` (TASK 1).

## `registry.html`
- Skip link added.
- **Zola icon** clock (`M24 20v4l3 3`) → **heart** path, consistent with the other gift cards (TASK 4).
- All 5 broken `href="#"` → named placeholder tokens + `title="Registry link coming soon"` + `<!-- NEEDS -->`:
  `[REGISTRY_URL_CRATE_BARREL]`, `[REGISTRY_URL_WILLIAMS_SONOMA]`, `[REGISTRY_URL_AMAZON]`,
  `[REGISTRY_URL_ZOLA]`, `[REGISTRY_URL_HONEYMOON_FUND]` (TASK 1).

## `faq.html`
- Skip link added.
- Kids answer: removed `[TBD — more info coming soon.]`; rewritten gracefully ("…noted with your invitation").
- Shuttle answer: removed `[TBD — check back soon.]`; rewritten to "We're confirming shuttle details now —
  check back soon, or email us…" (TASK 1).

## `after-party.html`
- Skip link added.
- **"Bar Games" icon** crosshair/target → **billiard ball** (removed the two crosshair lines, leaving two
  concentric circles) (TASK 4).

## `gallery.html`
- Skip link added. (Lightbox focus trap & close-button sizing handled in shared JS/CSS above.)

## `rsvp.html`
- Skip link added. RSVP form, Netlify fields, and `js/guests.js?v=1` left untouched as required.

## `404.html`
- Skip link added; cache-bust bumped.

## `sitemap.xml`
- All 10 `<lastmod>` updated `2026-05-12` → `2026-06-17`. All pages already use clean (extension-less) URLs.

## `src/netlify.toml`  (stale duplicate)
- This file is **not used as config** — Netlify reads the **root** `netlify.toml` (which is already correct:
  catch-all `→ /404.html status=404`). The stale duplicate still carried the dangerous
  `→ /index.html status=200` catch-all the brief flagged and is published publicly as `/netlify.toml`.
  Neutralized its redirect to `→ /404.html status=404` and added a header comment recommending deletion.
  (Not deleted — the brief forbids changing file/directory structure.)

---

## Verified already-correct (no change needed)
Checked against the brief; these were already handled in the existing code, so per the
"don't change what isn't broken" rule they were left alone:
- **Mobile layout:** `.party-grid` (2-col → 1-col <430px, 4-col desktop), gallery 2-col mobile,
  radio labels 44–48px, **form inputs 17px** (`--fs-base` = 1.0625rem, so no iOS auto-zoom),
  footer nav `flex-wrap`, hero & marquee `overflow:hidden`, countdown `flex-wrap`+`clamp`.
- **Accordion icon** already animates `+` → `×` via `.accordion__item.open .accordion__icon { rotate(135deg) }`.
- **Active nav** — `initActiveNav()` already adds `.active` **and** `aria-current="page"` (Netlify-pretty-URL aware).
- **Accordion `aria-expanded`** toggled by JS; RSVP radio group uses `<fieldset>/<legend>`.
- **iframes** already have `title` + `loading="lazy"`; non-hero images `loading="lazy"`; fonts `display=swap`;
  hero image `fetchpriority="high"`.
- **Root `netlify.toml`** redirect already `status=404`.
- **`index.html` light header** (`site-header` without `--dark`) is intentional — the homepage hero is the
  ivory editorial layout, inner pages are dark. Left as-is.

---

## Pending from Client (require their input — flagged with `<!-- NEEDS: -->` in the HTML)
1. **Confirm wedding date/time** — June 27, 2028, 5:00 PM is used throughout (sourced from existing
   countdown JS); confirm before launch.
2. **RSVP deadline** date.
3. **Maid of Honor + 4 bridesmaids** — names, bios, photos (`wedding-party.html`).
4. **Room block** — hotel name, address, distance, group code, booking link, deadline (`travel.html`).
5. **3 nearby-hotel booking URLs** (`travel.html`).
6. **5 registry URLs** (`registry.html`).
7. **Children policy** clarification (FAQ).
8. **Shuttle** confirmation (FAQ).
9. **Ceremony rain plan** — FAQ states an indoor backup is in place; confirm with venue.
10. **Paige's last name** — used first-name-only for consistency (schema organizer = "Paige"). Her brothers
    appear as Kyle/Connor **Mullen** on the wedding-party page; confirm whether to standardize to "Paige Mullen".
11. **Proposal & milestone photos** (`our-story.html` placeholders).
12. **Wedding hashtag** — `#JeffAndPaige` used in FAQ; confirm it's official.
13. **Recommend deleting `src/netlify.toml`** (stale duplicate; see above).

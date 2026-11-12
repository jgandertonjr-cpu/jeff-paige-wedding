# Find and Change: end-to-end results

Date: 2026-11-12 · Branch: `plain-english-editor` at `97458e1` · No AI service involved

Run against the local test server (`npm run editor:dev`): the real editor code,
a working copy of the site, a real Eleventy build and the real site check for
every publish and preview. GitHub and Netlify are stood in for by the local
server, so nothing here touched the repository on GitHub or the live site.

## Fifteen actions through the editor's routes

Each was sent as the page sends it (`content`, `propose`, `preview`, `publish`,
`status`, `undo`), signed in with the session cookie.

| # | Action | Summary shown | Result |
|---|---|---|---|
| — | Load the site content without signing in | — | Refused (401) |
| 1 | Date: hotel booking deadline | `Travel & Hotels → Room block → Booking deadline: (empty) → June 1, 2028` | Published, live |
| 2 | Text: ceremony time | `Details → Ceremony → Ceremony details → “Time” → Value: Will be provided soon → 4:30 PM` | Published, live |
| 3 | Switch and date: open RSVPs, set reply-by | `Please check: RSVP → RSVPs are open: Off → On`; `RSVP → Reply-by date: (empty) → June 15, 2028` | Published, live |
| 4 | Colour: brighter RSVP pink | `Colours → RSVP pink: #E0AA9E → #F08A7E` | Published, live |
| 5 | Colour that can't be read (main text set to the banner green) | "Main text on Page background does not have enough contrast to read." (and two more pairs) | Refused, nothing stored |
| 6 | Photo from the phone as the home page's top photo, with a new description | `Home → Top of page → Main photo: current photo → new photo`; description line | Published, live |
| 7 | List: add an FAQ item with a two-paragraph answer | `FAQ → Questions: added “Are kids invited?”` | Published, live |
| 8 | List: move that item to the top | `FAQ → Questions: reordered` | Published, live |
| 9 | List: remove the second item | `FAQ → Questions: removed “What is the dress code?”` | Published, live |
| 10 | Section order: schedule first on Details | `Details → Order of sections: reordered` | Published, live |
| 11 | Menu order: Wedding Party above Our Story | `Menu → More links: reordered` | Published, live |
| 12 | Guest list: add Sam Rivera with a guest | `Please check: Guest List → Guests: added “Sam Rivera”` | Published, live |
| 13 | Page code typed into a heading (`<b>Hello</b>`) | "Heading cannot contain page code such as <b> or <script>." | Refused, nothing stored |
| 14 | Three changes in one review (after-party time, dress code, footer), preview first | Three summary lines; preview built and passed the site check | Published, live |
| 15 | Undo action 1 | `restored: Booking deadline: June 1, 2028 → (empty)`, nothing skipped | Deadline empty again; action 2's 4:30 PM untouched |

Thirteen publishes each rebuilt the working copy and passed the site check.
History titles read correctly, including the multi-paragraph FAQ answer (one
line) and long trails (the meaningful end is kept).

One check could not be exercised locally: a review made against an out-of-date
copy of the site. The local stand-in for GitHub answers any version with the
current files, so the request was accepted; the refusal is covered by unit
tests using a stand-in that behaves as GitHub does.

## In a real browser at 375×812

- Sign-in carried over; the Find screen loaded the site with no console errors.
- Search "hotel deadline" → the room block's booking deadline first. Search
  "hotel" → hotel name, hotel address, nearby hotels (after the ranking fix).
- Changed the deadline with the date control → "Changed" tag on the row, tray
  bar "1 change ready" → Review → summary card → Publish → "It's live." with
  "See the site" and "Undo this" → Undo → "Done. I put back: …".
- Opened the FAQ page (grouped fields with current values) → Questions list
  (Edit, Move up, Move down, Remove on every item) → "Add one" → filled the
  two-field form → tray → Review showed `FAQ → Questions: added “Are kids invited?”`.
- Two changes in the tray → tray list in plain words with "Undo this one".
- While a review was open, the tray list showed "Finish or cancel the review
  first." and its controls were disabled; Cancel released it and showed
  "Nothing was changed. Your changes are still in the tray."
- Every visible control measured at least 44px tall; no sideways scrolling;
  text inputs are 17px.

## Not yet tested

The real GitHub write path and a real Netlify Deploy Preview. Both need the
branch pushed and the four environment variables set in Netlify; the setup
guide's step f covers this before merging.

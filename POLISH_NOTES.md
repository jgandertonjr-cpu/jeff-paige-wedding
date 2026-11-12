# Polish notes

Notes from the redesign, polish and taste passes (November 2026), all now merged and live.
Section 1 lists what was fixed and what is still open; photos and missing information are yours to decide.
Each item names the file and field, which are also editable at `/admin`.

## 1. Copy to fix

**Fixed in November 2026** (PR 11 and the follow-up): the FAQ no longer contradicts the Registry, Travel and After Party pages; "send us a text" is gone; "our photographer" is consistent; "HollyHedge" is spelled one way; "traveling"; the double exclamation mark; and the room-block card no longer shows the venue's address as the hotel's. The room block is described as undecided (HollyHedge on-site, a nearby hotel, or both) on both the FAQ and Travel pages; update both when it is settled.

**Still open (wording is yours to decide)**

- `details.json` → schedule, "Guests Arrive": "Details will be provided soon" has no full stop; the other rows do.
- `details.json` → schedule, "Ceremony": two sentences in a row start with "Please".
- `story.json`: mixes straight and curly quotation marks, and puts the full stop outside the closing quote (`"…date my sister".`, `"I told you so".`). The voice also moves between third person ("Jeff was up at the bar") and first person ("We talked…") inside one paragraph.
- `rsvp.json` → `closed_notice.text`: "Formal invitations — and this RSVP form — will go out closer to the day." A form doesn't "go out"; consider "will open".
- `rsvp.json` → `hero.label`: "Kindly Reply" sits on a page where guests can't reply yet.
- `travel.json` → `hero.subtitle`: "Everything you need to plan…" is followed immediately by "Hotel and travel details coming soon."
- `faq.json`: the registry question still asks "Can I bring a gift to the wedding?"; the answer now covers it (ship gifts).
- Button wording for the same destination varies: "See the Details", "View Details", "Wedding Details" (these are in the page templates, not the CMS).
- Headings that restate each other: Details has "Ceremony" → "Venue" → a row labelled "Venue"; "Reception" → "Reception Details"; Travel has "By Air" → "Airport & Driving Info"; FAQ has "FAQ" → "Common Questions" → "Frequently Asked Questions".

## 2. Information guests will look for and not find

- Ceremony start time (Details shows "Will be provided soon"; all five schedule rows say "Time TBD").
- RSVP deadline, and when RSVPs open.
- Hotel names, links and the room-block deadline, and where the block will be.
- Whether children are invited (the FAQ answer says it will be on the invitation).
- The rain plan for the outdoor ceremony.
- After-party hours (removed from the FAQ until confirmed).
- Wedding party names and photos (eight "Coming Soon" entries).

## 3. Photos

- **Home hero / Registry photo** (`119812256_unknown.webp`): a soft, low-light phone photo with a lens flare, taken at a palm-tree resort. It holds up in the small phone arch but looks blurry in the desktop arch and on the Registry page. It is also used on both pages. `she_said_yes.jpg` (daylight, New Hope) would suit the arch better until engagement photos exist.
- **Gallery order**: the largest tiles currently go to the weaker photos (the dark kitchen photo leads; the poolside selfie is the big desktop feature). Reordering `gallery.json` so the dressed-up and daylight photos land in positions 1, 6 and 11 (phones) and 1, 7, 13 (desktop) would lift the page.
- `gallery2.jpg` (car selfie) looks rotated 90°: the shirt lettering runs vertically. It may just be how it was taken.

## 4. Decisions I made, and why

- **RSVP keeps its Rosette fill even though RSVPs are closed.** The reviewer suggested a neutral style until the form opens. I kept the fill: it is the one place Rosette appears, DESIGN.md reserves it for RSVP, and without it the site would have no pink at all. If you would rather it switch on only when RSVPs open, that is a small change tied to the `rsvp_open` switch.
- **Travel shows "Booking link coming soon" in place of a button.** With no booking link set, the button used to link to a page that doesn't exist (`[HOTEL_ROOM_BLOCK_URL]`). A real "Book Your Room" button appears as soon as `room_block.booking_url` is filled in.
- **The bottom bar on phones is flush and opaque** rather than floating. The floating version let page content show around and through it. It is hidden when a phone is held sideways, where there is no height to spare.
- **404 page now has the site header and footer**, so a lost guest has the menu. Its links are addressed from the site root, which also fixes the page losing its styling at nested mistyped addresses.
- **Home: the row of link chips under "Everything You Need to Know" is gone.** I added it in the redesign; with the hero table, the bar and the footer it was a fourth copy of the same links.
- **Primary button first** in every pair or group, on every page.
- **After Party uses the same label/value list as Details**, with "Get directions" under the address.
- **Section icons were kept** (Travel tips, After Party). They are chosen per item in the CMS, and removing them would be a content change. They are the most "app-like" element left on the site.
- **Our Story photos stay "sticky" on desktop**: each travels down the screen beside its text. In a static screenshot this reads as empty space next to long chapters; in use it doesn't.
- **Desktop navigation still switches to the menu button below 1060px.** Nine links and RSVP don't fit comfortably any narrower.

## 5. Technical notes

- **Link preview image**: `src/images/share-card.jpg`, drawn by `design/share-card/index.html`. It is a static picture, so if the names, date or venue change it needs regenerating (steps in `design/share-card/README.md`).
- **Firefox was not tested.** Playwright's Firefox build would not start on this Mac. Chromium and WebKit (the engine behind iPhone Safari) were both tested. The stylesheet uses nothing Firefox lacks except `text-wrap: pretty`, which it ignores harmlessly.
- **Not checked on a real phone.** WebKit emulation is close to iPhone Safari but is not the same thing.
- Installing Playwright's browsers replaced an older cached WebKit build (`webkit-2083`) on this Mac with the current one. Any other project that used the old build will download it again the next time it runs `npx playwright install`.

## 6. Taste pass

The taste pass was a second, lighter round of refinements to spacing, type, alignment and motion, with the palette, wording and layout left as they were.

- **Out of scope — your call**
  - A new palette and type pairing: a design tool would suggest its own, but yours are locked, so I left them.
  - One section per screen on a different layout kit: that is a rebuild rather than a refinement.
  - No captions under photos: the tool discourages them, but "the adventures / the everyday / the forever" are your words, so they stay.
  - Address without street number or ZIP: that rule suits placeholder content, and guests need the real address.
  - Copy rules, such as the main heading naming the event type or buttons like "Read our story": the wording is yours, so I did not touch it.
  - One navigation only: the tool flags the phone bottom bar as a second menu, but it is there because you asked for one-tap essentials.
  - A photograph in every text-only band (Welcome, Countdown, Save the Date), and more and better photographs overall, including a sharper hero photo: this needs your choice of photos.
  - A scroll "moment", for example photo chapters that pin in place on Our Story: it is bigger than the light motion I allowed.
  - A button in the hero: the tool does not count the essentials table as one.
  - RSVP in a neutral style until RSVPs open: carried over from the polish pass.
- **Changed since the polish pass**
  - Lead paragraphs are now dark green instead of grey-green.
  - The header's logo and nav now line up with the page content on desktop.
  - The countdown number is smaller than the names.
  - The three home photos are level.
  - The hero fills the first screen on phones and enters in three quick steps on load.
  - The home photo strip photos enlarge slightly on hover.

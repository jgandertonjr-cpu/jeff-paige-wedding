# Page Map — Jeff & Paige Wedding Website

**Couple:** Jeff & Paige
**Wedding Date:** June 27, 2028
**Venue:** Commonwealth National Golf Club, Horsham, PA

---

## Navigation Structure

### Top Nav (Desktop)
```
Jeff & Paige   |   HOME   OUR STORY   DETAILS   WEDDING PARTY   RSVP   REGISTRY   [MORE ▾]
```
- "More" dropdown contains: Travel, After Party, FAQ, Gallery
- On mobile: all items collapse into a full-screen hamburger overlay

### Top Nav (Mobile — Hamburger)
Full list (all 10 pages):
Home / Our Story / Details / Wedding Party / RSVP / Registry / Travel / After Party / FAQ / Gallery

### Footer Nav
All 10 pages listed in two columns, plus:
- Couple names + wedding date
- Venue name + address
- Botanical sprig decorative element
- Copyright line

---

## Pages

---

### 1. `index.html` — Home / Hero

**Page Title:** Jeff & Paige — June 27, 2028

**Purpose:**
The emotional landing experience. Communicates who, what, when, and where at a glance, then draws guests deeper into the site. Sets the visual tone for the entire wedding.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Fixed Top Nav** | Transparent over hero, becomes opaque white on scroll |
| 2 | **Hero** | Full-viewport-height background image (venue/couple photo placeholder). Dark overlay (`--color-overlay`). Centered text: "Jeff & Paige" in display font (hero size), botanical sprig divider, "June 27, 2028 · Horsham, PA" in body font (small, wide letter-spacing). Two CTAs: "RSVP Now" (primary button) + "View Details" (ghost button). Parallax scroll on background. |
| 3 | **Save the Date Banner** | Narrow full-width band in `--color-accent-tertiary` (blush). Countdown timer (JS) to wedding date. Jost font, centered. |
| 4 | **Intro / Welcome** | Short welcoming paragraph from the couple. Centered layout, max-width 680px. Scroll-reveal. |
| 5 | **Quick Info Cards** | 3-column card row: Ceremony (time + "Commonwealth National Golf Club"), Reception (same venue, cocktail hour time), and Date/RSVP deadline. Each card has a champagne-gold icon, `--color-surface` background. Scroll-reveal with stagger. |
| 6 | **Pages Nav Grid** | Visual grid of thumbnail links to: Our Story, Details, Wedding Party, RSVP, Travel, Gallery. Each tile has a subtle background image or color block, page name in display font. |
| 7 | **Footer** | Full site footer with nav links, venue info, botanical sprig, copyright |

**Nav placement:** Top nav (transparent → opaque on scroll) + footer

---

### 2. `our-story.html` — Our Story

**Page Title:** Our Story — Jeff & Paige

**Purpose:**
A relationship timeline that tells the couple's journey from meeting to engagement. Personal and warm, but visually restrained.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Top Nav** | Standard opaque white |
| 2 | **Page Hero** | Slim hero (50vh). Couple photo. Overlay with page title "Our Story" in display font (h1 size). Botanical sprig below title. |
| 3 | **Timeline** | Vertical alternating timeline. Each entry: year/date label (champagne gold, Jost, wide tracking), event title (h3, Cormorant), 2–4 sentence paragraph (Jost body), and optional photo thumbnail. Entries: How They Met, First Date, First Trip Together, Moved In Together, The Proposal, Engaged. Scroll-reveal per entry, alternating left/right layout on desktop, single-column on mobile. Thin sage-green vertical line connects entries; each node is a small circle in `--color-accent-primary`. |
| 4 | **Engagement Section** | Featured full-width image of the proposal/engagement moment. Quote or short caption from the couple in italicized display font. |
| 5 | **CTA Band** | "Join us on June 27, 2028" — centered text with primary RSVP button |
| 6 | **Footer** | Standard footer |

**Nav placement:** Top nav + footer

---

### 3. `details.html` — Wedding Details

**Page Title:** Wedding Details — Jeff & Paige

**Purpose:**
All logistical information guests need: ceremony time/location, cocktail hour, reception details, dress code, parking. Single source of truth for the day-of schedule.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Top Nav** | Standard opaque white |
| 2 | **Page Hero** | Slim hero (40vh). Venue photo. Overlay + "The Details" heading. |
| 3 | **Ceremony Block** | Two-column layout (desktop): left = decorative venue illustration or photo; right = details. Content: Date (Saturday, June 27, 2028), Ceremony start time, Venue name ("Commonwealth National Golf Club"), Full address (100 Country Club Drive, Horsham, PA 19044), "Outdoor ceremony — guests are encouraged to wear comfortable heels or flats", link to Google Maps. Sage-green section heading. |
| 4 | **Botanical Sprig Divider** | Full-width centered sprig (200px × 24px) between ceremony and reception blocks |
| 5 | **Cocktail Hour Block** | Time, location within venue, brief description. Same two-column layout as ceremony. |
| 6 | **Reception Block** | Time, ballroom/venue area name, description of dinner/dancing. Same layout. |
| 7 | **Day-of Schedule** | Timeline list: Ceremony → Cocktail Hour → Reception Dinner → First Dance → Open Dancing → Last Song. Each item: time + brief label. Minimal design, single column, left-aligned with sage-green time labels. |
| 8 | **Dress Code Card** | Standalone card, centered. "Black Tie Optional / Cocktail Attire". Short description of what this means practically. |
| 9 | **Parking & Logistics** | Short text block: parking info at venue, any shuttle details (TBD placeholder), link to travel page. |
| 10 | **Footer** | Standard footer |

**Nav placement:** Top nav + footer

---

### 4. `wedding-party.html` — Wedding Party

**Page Title:** Wedding Party — Jeff & Paige

**Purpose:**
Introduces the groomsmen and bridesmaids with photos and short bios/relationships. Celebratory and personal.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Top Nav** | Standard opaque white |
| 2 | **Page Hero** | Slim hero (40vh). Group party photo or venue photo. Overlay + "The Wedding Party" heading. |
| 3 | **Section Intro** | 2–3 sentence intro paragraph, centered, max-width 640px. Scroll-reveal. |
| 4 | **Groomsmen Heading** | Centered `h2` "The Groomsmen" in display font, followed by inline botanical sprig. |
| 5 | **Groomsmen Grid** | 3-column grid (2 on tablet, 1 on mobile). Each card: circular or square photo, name (h4, display font), relationship to groom (Jost, caption, `--color-text-secondary`), optional 1-sentence fun fact. Cards use `--color-surface` background, champagne-gold border. Scroll-reveal stagger. |
| 6 | **Botanical Sprig Divider** | Full-width centered sprig between groomsmen and bridesmaids grids |
| 7 | **Bridesmaids Heading** | Centered `h2` "The Bridesmaids" in display font, followed by inline botanical sprig. |
| 8 | **Bridesmaids Grid** | Same card layout as groomsmen grid. |
| 9 | **Footer** | Standard footer |

**Nav placement:** Top nav + footer

---

### 5. `rsvp.html` — RSVP

**Page Title:** RSVP — Jeff & Paige

**Purpose:**
Primary action page. Guests submit their RSVP (attending yes/no), meal preference, dietary restrictions, and song request. Form handled by Netlify Forms.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Top Nav** | Standard opaque white |
| 2 | **Page Hero** | Slim hero (35vh). Soft blush or sage-wash background (no photo needed). "RSVP" heading in display font, with wedding date below. |
| 3 | **RSVP Deadline Notice** | Inline notice card: "Please RSVP by [date, e.g., May 27, 2028]". Champagne-gold left border accent. |
| 4 | **RSVP Form** | `<form name="rsvp" netlify>` with the following fields: Full Name (text, required), Email (email, required), Number of Guests Attending (number, 0–[max]), Attending? (radio: Yes / No), If Yes — Meal Choice (radio/select: Chicken / Fish / Vegetarian per guest), Dietary Restrictions / Allergies (textarea), Song Request (text, optional — "What song will get you on the dance floor?"), Message to the Couple (textarea, optional). Submit button: primary style, "Send RSVP". Hidden honeypot field for spam. |
| 5 | **Success State** | After submission: replace form with a thank-you card. "We can't wait to celebrate with you!" message. Links to Details and Registry. |
| 6 | **Footer** | Standard footer |

**Nav placement:** Top nav + footer

---

### 6. `registry.html` — Registry

**Page Title:** Registry — Jeff & Paige

**Purpose:**
Links to the couple's gift registries and any fund/honeymoon registry. Friendly, low-pressure tone.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Top Nav** | Standard opaque white |
| 2 | **Page Hero** | Slim hero (35vh). Neutral background or venue photo. "Registry" heading. Botanical sprig below. |
| 3 | **Intro Copy** | Short paragraph: warm, gracious tone. "Your presence is the greatest gift — but if you'd like to celebrate us with something extra, we're registered at the following places." Max-width 640px, centered. |
| 4 | **Registry Cards** | 2–3 column grid of registry provider cards. Each card: retailer logo (placeholder), retailer name (h3), 1-sentence description, "View Registry" primary button linking to external registry URL. Cards: e.g., Crate & Barrel, Williams-Sonoma, Honeymoon Fund (Zola or similar). `--color-surface` background with champagne-gold border. Scroll-reveal stagger. |
| 5 | **Honeymoon Fund Note** | Optional standalone card with a brief warm note about the honeymoon fund: destination teaser, what the funds go toward. |
| 6 | **Footer** | Standard footer |

**Nav placement:** Top nav + footer

---

### 7. `travel.html` — Travel & Hotels

**Page Title:** Travel & Hotels — Jeff & Paige

**Purpose:**
Helps out-of-town guests plan their trip. Hotel block information, distances from venue, transportation options, area tips.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Top Nav** | Standard opaque white |
| 2 | **Page Hero** | Slim hero (35vh). Area/venue exterior photo. "Travel & Hotels" heading. |
| 3 | **Venue Location Block** | Embedded Google Map iframe of Commonwealth National Golf Club + venue address. Brief note on driving from Philadelphia, NYC, etc. |
| 4 | **Hotel Room Block Cards** | 2–3 column card grid. Each card: hotel name (h3), distance from venue, room block rate (or "contact for rate"), booking deadline, phone/link to book. "Book Now" ghost button linking to hotel booking URL. Placeholder hotels: e.g., Hampton Inn Horsham, Sheraton Philadelphia North, DoubleTree Willow Grove. |
| 5 | **Transportation Info** | Short text block: nearest airports (PHL, ABE), Uber/Lyft availability, any shuttle info from hotel(s) to venue (TBD placeholder). |
| 6 | **Area Tips** | 3-column card grid of local recommendations: restaurants for the weekend, things to do, Philly day-trip note. Lightweight, fun tone. |
| 7 | **Footer** | Standard footer |

**Nav placement:** Top nav overflow (hamburger "More" on desktop) + footer

---

### 8. `after-party.html` — After Party

**Page Title:** After Party — Jeff & Paige

**Purpose:**
Details for the after-party following the reception. Location, time, dress code note, what to expect.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Top Nav** | Standard opaque white |
| 2 | **Page Hero** | Slim hero (35vh). Dark/moody photo or blush-tone wash. "The After Party" heading, botanical sprig below. |
| 3 | **After Party Details Block** | Two-column layout: left = details card (Location name, address, start time, "Casual attire welcome", notes on what's provided — open bar, late-night snacks, DJ), right = embedded map or venue photo. Primary button: "Add to Calendar" (generates .ics file or links to Google Calendar event). |
| 4 | **Invitation Note** | Centered callout card with a warm short note: "All wedding guests are invited — the night isn't over yet!" Blush background, champagne-gold border. |
| 5 | **FAQ Teaser** | 2–3 inline FAQ items most relevant to the after party (shuttle from venue, parking, time it ends). Link to full FAQ page. |
| 6 | **Footer** | Standard footer |

**Nav placement:** Top nav overflow (hamburger "More" on desktop) + footer

---

### 9. `faq.html` — FAQ

**Page Title:** FAQ — Jeff & Paige

**Purpose:**
Answers the most common guest questions so the couple doesn't have to field them individually. Accordion interface for compact display.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Top Nav** | Standard opaque white |
| 2 | **Page Hero** | Slim hero (30vh). Clean text-only or soft-wash background. "Frequently Asked Questions" heading. |
| 3 | **FAQ Accordion** | Single-column accordion list. Each item: small botanical sprig icon (20px, inline-left), question text (Jost, weight 500, `--font-size-body`), expand/collapse toggle arrow, answer text (Jost, weight 400, `--color-text-secondary`). Smooth height transition `300ms ease`. Suggested questions: Is there parking at the venue? / What is the dress code? / Are children welcome? / Can I bring a plus-one? / What time should I arrive? / Will there be a shuttle to/from hotels? / Is the ceremony indoors or outdoors? / What happens if it rains? / When is the RSVP deadline? / Where are you registered? / Will there be a vegetarian/vegan meal option? / What time does the reception end? / Tell me about the after party. |
| 4 | **Still Have Questions CTA** | Centered block: "Still have a question?" with a mailto link or contact form CTA in ghost button style. |
| 5 | **Footer** | Standard footer |

**Nav placement:** Top nav overflow (hamburger "More" on desktop) + footer

---

### 10. `gallery.html` — Gallery

**Page Title:** Gallery — Jeff & Paige

**Purpose:**
Photo grid showing engagement photos and couple photos. Lightbox for full-screen viewing. Placeholder grid pre-wedding; updated after wedding with ceremony/reception photos.

**Sections / Components:**

| # | Section | Description |
|---|---|---|
| 1 | **Top Nav** | Standard opaque white |
| 2 | **Page Hero** | Slim hero (35vh). Favorite couple photo as background. "Gallery" heading. Botanical sprig below. |
| 3 | **Filter Tabs** (optional) | Pill-style tab buttons: "All", "Engagement", "Wedding" (Wedding tab disabled pre-wedding with "Coming Soon" tooltip). Tab switching with no page reload. |
| 4 | **Photo Grid** | Masonry or uniform 3-column grid (2 on tablet, 1 on mobile). Each photo: lazy-loaded `<img>` with `loading="lazy"`, hover overlay with a sage-green tint at 20% opacity + expand icon. Click opens lightbox. Scroll-reveal stagger. |
| 5 | **Lightbox** | Full-screen overlay. Photo centered, dark background. Left/right arrows to navigate. Keyboard support (arrow keys, Escape). Close button top-right. Swipe support on mobile. Built in vanilla JS — no heavy library required. |
| 6 | **Footer** | Standard footer |

**Nav placement:** Top nav overflow (hamburger "More" on desktop) + footer

---

## Summary Table

| # | Filename | Page Title | Top Nav | Nav Overflow |
|---|---|---|---|---|
| 1 | `index.html` | Home | Yes (transparent) | — |
| 2 | `our-story.html` | Our Story | Yes | — |
| 3 | `details.html` | Details | Yes | — |
| 4 | `wedding-party.html` | Wedding Party | Yes | — |
| 5 | `rsvp.html` | RSVP | Yes | — |
| 6 | `registry.html` | Registry | Yes | — |
| 7 | `travel.html` | Travel & Hotels | Overflow / hamburger | Yes |
| 8 | `after-party.html` | After Party | Overflow / hamburger | Yes |
| 9 | `faq.html` | FAQ | Overflow / hamburger | Yes |
| 10 | `gallery.html` | Gallery | Overflow / hamburger | Yes |

All 10 pages appear in the **footer nav**.

# Build Summary: Jeff & Paige Wedding Website

**Project:** Jeff & Paige Wedding Website
**Wedding Date:** June 27, 2028
**Venue:** Commonwealth National Golf Club, Horsham, PA
**Build Date:** May 2026
**Tech Stack:** Pure HTML5 / CSS3 / Vanilla JavaScript — no frameworks, no build tools

---

## Pages Built

| # | File | Page Title | Description |
|---|---|---|---|
| 1 | `index.html` | Home | Hero image with countdown timer, welcome message, and quick-access navigation cards |
| 2 | `our-story.html` | Our Story | Jeff & Paige's story told through a vertical timeline of milestones with photos |
| 3 | `details.html` | Wedding Details | Ceremony and reception details, schedule, Google Maps embed for the venue |
| 4 | `wedding-party.html` | Wedding Party | Photo grid of bridesmaids and groomsmen with names, titles, and bios |
| 5 | `rsvp.html` | RSVP | Netlify-powered RSVP form with guest name, email, attendance confirmation, meal preference, and message fields |
| 6 | `registry.html` | Registry | Links to the couple's gift registries with store descriptions |
| 7 | `travel.html` | Travel & Hotels | Recommended hotels, driving directions, and transportation info near Horsham, PA |
| 8 | `after-party.html` | After Party | After-party details including venue, time, and what to expect |
| 9 | `faq.html` | FAQ | Accordion-style answers to 15 common guest questions |
| 10 | `gallery.html` | Gallery | Responsive photo grid for engagement and wedding photos |

---

## Design Decisions

### Color Palette

The color palette uses **soft sage green** as the primary accent, paired with **warm ivory/cream** backgrounds and **deep charcoal** for body text. This palette was chosen because:

- Sage green is a timeless wedding color that evokes nature, calm, and elegance — and works beautifully in a golf club setting surrounded by greenery.
- Ivory/cream backgrounds feel warm and romantic rather than cold or stark.
- The combination photographs well in screenshots and print, which matters if guests take a screenshot of the details page.
- All color combinations meet WCAG AA accessibility contrast requirements.

**CSS Color Variables (defined in `:root`):**
- `--color-primary`: Sage green — primary buttons, accents, and highlights
- `--color-secondary`: Dusty rose — secondary accents and hover states
- `--color-bg`: Warm ivory — page backgrounds
- `--color-bg-alt`: Slightly deeper cream — alternating section backgrounds
- `--color-text`: Deep charcoal — all body text
- `--color-text-light`: Medium gray — secondary/supporting text
- `--color-white`: Pure white — cards, nav background

### Font Pairing

- **Headlines:** *Cormorant Garamond* (serif) — This elegant serif brings timeless formality appropriate for a wedding. Its thin strokes and classical proportions feel luxurious without being fussy.
- **Body text:** *Lato* (sans-serif) — A highly legible, clean sans-serif that pairs beautifully with Cormorant Garamond. The contrast between a delicate serif headline and a sturdy sans-serif body is a well-established design pairing.
- **Accent labels:** *Lato* italic or small-caps — used for date labels and captions.

Both fonts are loaded via Google Fonts and fall back to system fonts if the network is unavailable.

### Decorative Elements

Thin horizontal rules, subtle botanical/leaf SVG dividers, and generous whitespace were chosen as decorative elements because:
- They complement the golf club setting (natural, elegant)
- They don't compete with the couple's photography
- They scale gracefully between desktop and mobile screens
- They require no external icon libraries

---

## Fonts Used

| Font | Style | Google Fonts URL |
|---|---|---|
| Cormorant Garamond | Regular 400, Italic 400i, Medium 500 | `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap` |
| Lato | Regular 400, Bold 700 | `https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap` |

**Combined Google Fonts link (used in all HTML files):**
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Lato:wght@400;700&display=swap" rel="stylesheet">
```

---

## Tech Stack

| Component | Technology | Notes |
|---|---|---|
| Markup | HTML5 | Semantic elements: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>` |
| Styling | CSS3 | Custom properties (variables), Flexbox, CSS Grid, media queries |
| Interactivity | Vanilla JavaScript (ES6+) | No jQuery, no frameworks |
| Countdown timer | Custom JS in `main.js` | Calculates days/hours/minutes to June 27, 2028 |
| Mobile menu | Custom JS in `main.js` | Hamburger toggle for small screens |
| RSVP form | Netlify Forms | `data-netlify="true"` attribute — zero backend required on Netlify |
| Maps embed | Google Maps iframe | Embedded map of Commonwealth National Golf Club |
| Fonts | Google Fonts | Loaded via `<link>` in `<head>` |
| Images | JPEG / WebP | Placeholder images in `/src/images/` — replace with real photos |
| Hosting | Netlify (recommended) | See deployment_guide.md |

---

## How to Add a New Page

Follow these steps to add a new page to the website:

1. **Copy an existing page.** In your `src/` folder, copy one of the simpler pages — `travel.html` or `faq.html` work well as starting templates. Rename the copy to something like `accommodations.html`.

2. **Update the `<title>` tag.** Inside the `<head>` section, change the `<title>` text to your new page name:
   ```html
   <title>Accommodations | Jeff & Paige — June 27, 2028</title>
   ```

3. **Update the `<meta name="description">` tag.** Write a one-sentence description of the new page.

4. **Replace the `<main>` content.** Delete everything between `<main>` and `</main>` and write your new content there.

5. **Add the new page to the navigation in ALL HTML files.** Open each of the 10 HTML files and find the `<nav>` section. Add a new `<li>` for your page:
   ```html
   <li><a href="accommodations.html">Accommodations</a></li>
   ```
   You must do this in all 10 existing files AND in your new file.

6. **Add the new page to the footer in ALL HTML files.** Most footers have a secondary nav — add your new page there too.

7. **Update the `og:image` meta tag** if you want social sharing to work for this page.

8. **Preview.** Open the new file in your browser to check it looks correct.

> **Tip:** Use Find & Replace across files if your text editor supports it (VS Code does). Search for a nav item you know exists in all files and replace the entire nav block at once.

---

## How to Remove a Page

If you decide you don't need a page (for example, if there is no after-party):

1. **Delete the HTML file** from `src/` (e.g., delete `after-party.html`).

2. **Remove the nav link in ALL remaining HTML files.** Open each HTML file and delete the `<li>` line that links to the removed page:
   ```html
   <!-- Delete this line from every file: -->
   <li><a href="after-party.html">After Party</a></li>
   ```

3. **Remove the footer link** from all files too.

4. **Check for any other cross-links** — search for the filename across all HTML files to make sure no stray links remain.

---

## Known Limitations

The following are intentional design trade-offs or items that need attention before launch:

1. **Gallery uses placeholder divs**
   The gallery page (`gallery.html`) currently contains placeholder blocks. Real engagement or wedding photos need to be added to `src/images/gallery/` and linked in the HTML. See the content guide for instructions.

2. **RSVP form requires Netlify hosting**
   The RSVP form uses `data-netlify="true"`, which only works when the site is hosted on Netlify. If the site is moved to GitHub Pages or another host, the form must be updated to use Formspree or another form backend. See deployment_guide.md for Formspree instructions.

3. **Google Maps embed requires an internet connection**
   The map on `details.html` is an embedded Google Maps iframe. It will not display if the viewer is offline or if Google Maps is blocked in their region.

4. **No CMS — all edits are manual HTML edits**
   There is no content management system. Every text change requires opening an HTML file in a text editor. For a couple comfortable with that, this is no problem. If you later want a CMS, options include Netlify CMS (free) or a headless CMS like Contentful.

5. **Hero images are placeholders**
   Placeholder hero images are included. Replace them with actual engagement/wedding photos before launching the site.

6. **No analytics built in**
   There is no visitor tracking. If you want to know how many people visit the site, add Google Analytics or Netlify Analytics after deploying.

7. **Email notifications for RSVPs are not automatic**
   After deploying to Netlify, you must manually set up email notifications in the Netlify Forms dashboard. See deployment_guide.md, Step 5.

---

## File Structure

```
jeff-paige-wedding/
├── docs/
│   ├── build-summary.md          ← You are here
│   ├── content_guide.md          ← How to update website content
│   ├── deployment_guide.md       ← How to go live on Netlify or GitHub Pages
│   ├── copy_snippets.md          ← Ready-to-paste text for each page
│   └── qa-report.md              ← QA validation results (added after QA)
│
├── design/
│   └── (design assets, mockups, reference files)
│
└── src/                          ← Everything in this folder gets deployed
    ├── index.html                ← Home page
    ├── our-story.html            ← Our Story page
    ├── details.html              ← Wedding Details page
    ├── wedding-party.html        ← Wedding Party page
    ├── rsvp.html                 ← RSVP form page
    ├── registry.html             ← Registry page
    ├── travel.html               ← Travel & Hotels page
    ├── after-party.html          ← After Party page
    ├── faq.html                  ← FAQ page
    ├── gallery.html              ← Photo Gallery page
    │
    ├── css/
    │   └── styles.css            ← All styles for the entire site
    │
    ├── js/
    │   └── main.js               ← Countdown timer, mobile nav, interactions
    │
    └── images/
        ├── hero-home.jpg         ← Hero images (one per page)
        ├── hero-story.jpg
        ├── hero-details.jpg
        ├── hero-party.jpg
        ├── hero-rsvp.jpg
        ├── hero-registry.jpg
        ├── hero-travel.jpg
        ├── hero-afterparty.jpg
        ├── hero-faq.jpg
        ├── hero-gallery.jpg
        ├── party/                ← Wedding party member photos
        │   ├── firstname-lastname.jpg
        │   └── ...
        └── gallery/              ← Gallery photos
            ├── photo-01.jpg
            └── ...
```

---

*Build summary prepared by the QA & Content team. For questions, refer to content_guide.md or contact your web developer.*

# Content Guide: Updating Your Wedding Website

**Welcome, Jeff & Paige!** This guide walks you through every common update you might want to make to your wedding website. No coding experience required — just follow the steps and you'll be fine. If something ever looks wrong, just undo your change (Ctrl+Z) and try again.

---

## Before You Start

Your website files live inside the `src` folder. When this guide says "open a file," it means open it with a plain text editor. The best free option is **Visual Studio Code** (code.visualstudio.com), but Notepad works in a pinch.

**Never double-click an HTML file to edit it** — that opens it in a browser. Instead, right-click the file and choose "Open with" → your text editor.

---

## 1. Swapping Hero Images

Your hero images (the big full-screen photos at the top of each page) live here:

```
src/
  images/
    hero-home.jpg
    hero-story.jpg
    hero-details.jpg
    hero-party.jpg
    hero-rsvp.jpg
    hero-registry.jpg
    hero-travel.jpg
    hero-afterparty.jpg
    hero-faq.jpg
    hero-gallery.jpg
```

**To replace a hero image:**

1. Find the photo you want to use on your computer.
2. Resize or crop it so it is at least **1920 pixels wide** and at least **800 pixels tall**. A landscape (horizontal) orientation works best. Free tools for resizing: [Squoosh](https://squoosh.app) or [Adobe Express](https://www.adobe.com/express/).
3. Export it as a `.jpg` file (JPEG format keeps file sizes manageable).
4. Rename your new photo to match the existing filename exactly — for example, rename your home page photo to `hero-home.jpg`.
5. Copy your renamed photo into the `src/images/` folder. When Windows asks if you want to replace the existing file, click **Yes**.
6. Open `index.html` (or whichever page you're updating) in your browser to preview the change.

**Recommended image specs:**
- Format: JPG
- Width: 1920px or wider
- File size: Under 500KB (use Squoosh to compress if needed)
- Aspect ratio: roughly 16:9 or wider

---

## 2. Updating Text on Each Page

Every page is an HTML file inside the `src/` folder. Text content lives inside specific HTML tags. Here's what to look for:

### Finding the right spot

Open the HTML file in your text editor. Press **Ctrl+F** (Find) and search for a word or phrase that currently appears on the page — for example, search for "June 27" to find where the wedding date appears.

### Tags you'll be editing most often

| What you see on screen | What it looks like in the HTML |
|---|---|
| Page headline | `<h1>Your headline here</h1>` |
| Section heading | `<h2>Section title</h2>` |
| A paragraph of text | `<p>Your paragraph text here.</p>` |
| A small label | `<span>Label text</span>` |

**To change text:**
1. Open the HTML file in your text editor.
2. Press **Ctrl+F** and search for the text you want to change.
3. Click on that text in the editor.
4. Type your replacement text.
5. Save the file (Ctrl+S).
6. Refresh the page in your browser to see the change.

### Page-by-page guide

- **index.html** — Home page. Find the `<h1>` tag for the main headline. Find `<p>` tags in the welcome section for your welcome message.
- **our-story.html** — Your love story. Look for `<p>` tags in the `<section class="story-intro">` area, and `<div class="milestone">` blocks for each story milestone.
- **details.html** — Ceremony and reception info. Look for `<div class="ceremony-info">` and `<div class="reception-info">` for time, dress code, and parking details.
- **wedding-party.html** — Your wedding party. See Section 3 below for adding/editing members.
- **rsvp.html** — RSVP form. The form itself should not need text changes, but you can update the intro paragraph.
- **registry.html** — Gift registries. See Section 5 below.
- **travel.html** — Hotel and travel info. See Section 6 below.
- **after-party.html** — After party details.
- **faq.html** — Frequently asked questions.
- **gallery.html** — Photo gallery.

---

## 3. Adding Wedding Party Members

Your wedding party members each follow the same HTML pattern (a "block"). Here is the template to copy and paste:

```html
<div class="party-member">
  <div class="party-member__photo">
    <img src="images/party/[filename].jpg" alt="[Person's Name]" loading="lazy">
  </div>
  <div class="party-member__info">
    <h3>[Person's Name]</h3>
    <p class="party-member__title">[Title — e.g., Best Man / Maid of Honor]</p>
    <p class="party-member__bio">[2–3 sentences about this person and their connection to you.]</p>
  </div>
</div>
```

**To add a new wedding party member:**

1. Open `src/wedding-party.html` in your text editor.
2. Find the section for groomsmen or bridesmaids (look for `<section class="groomsmen">` or `<section class="bridesmaids">`).
3. Copy the entire block from `<div class="party-member">` to its closing `</div>` for an existing member.
4. Paste it right below the last member in that section (before the closing `</section>` tag).
5. Replace the placeholder text in square brackets with the real name, title, and bio.
6. Add a photo: save a square-cropped headshot (400x400px or larger) as a `.jpg` file in the `src/images/party/` folder. Use the filename you put in the `src="..."` attribute.
7. Save and preview.

**Photo tips for party members:**
- Square crop looks best (same width and height)
- At least 400x400 pixels
- Save as `firstname-lastname.jpg` (all lowercase, hyphen between names)

---

## 4. Updating the Registry Links

Your registry links are in `src/registry.html`. Each registry entry looks like this:

```html
<div class="registry-item">
  <h3>Store Name</h3>
  <p>A short description of this registry.</p>
  <a href="https://www.example-store.com/registry/your-registry-link" 
     class="btn btn--primary" 
     target="_blank" 
     rel="noopener">
    View Registry
  </a>
</div>
```

**To update a registry link:**

1. Open `src/registry.html` in your text editor.
2. Press **Ctrl+F** and search for `href="https://` to find the registry links.
3. Replace the URL between the quotation marks with your actual registry URL.
4. Update the store name in the `<h3>` tag if needed.
5. Save and preview.

**To add a new registry:**

Copy one of the existing `<div class="registry-item">` blocks and paste it below the last registry entry. Update the store name, description, and link.

---

## 5. Updating Hotel and Travel Information

Hotel and travel details live in `src/travel.html`.

**To update a hotel listing:**

1. Open `src/travel.html`.
2. Look for `<div class="hotel-card">` blocks.
3. Each block has:
   - `<h3>` — Hotel name
   - `<p>` — Address and description
   - `<a href="...">` — Booking link or hotel website
4. Replace the placeholder text with real hotel names and booking links.

**To add a new hotel:**

Copy an existing `<div class="hotel-card">` block and paste it after the last hotel. Update all the text and links.

**To update driving/transport directions:**

Look for the `<section class="travel-directions">` section and update the `<p>` paragraphs with your directions text.

---

## 6. Changing the Countdown Date

The countdown timer on your home page is powered by a small piece of JavaScript. The wedding date is stored in one easy-to-find line.

1. Open `src/js/main.js` in your text editor.
2. Press **Ctrl+F** and search for `weddingDate` or `2028-06-27`.
3. You'll find a line that looks like this:

```javascript
const weddingDate = new Date('2028-06-27');
```

4. If you ever need to change the date (e.g., for a time-specific countdown), you can update the string. The format is `YYYY-MM-DD`. For example, June 27, 2028 is `'2028-06-27'`.
5. Save the file and reload the page in your browser.

**Do not change anything else in `main.js`** — just this one line if needed.

---

## 7. Adding Gallery Photos

Your gallery lives in `src/gallery.html`. Photos should be saved to `src/images/gallery/`.

**To add a photo to the gallery:**

1. Save your photo as a `.jpg` file in `src/images/gallery/`. Use a simple name like `ceremony-01.jpg`.
2. Open `src/gallery.html` in your text editor.
3. Find the gallery grid section (look for `<div class="gallery-grid">`).
4. Each photo uses this HTML block:

```html
<div class="gallery-item">
  <img src="images/gallery/your-photo-name.jpg" 
       alt="Brief description of photo" 
       loading="lazy">
</div>
```

5. Copy one of these blocks and paste it inside the `<div class="gallery-grid">`.
6. Update `src="images/gallery/..."` to match your filename.
7. Update the `alt="..."` text with a brief description (this helps with accessibility and search engines).
8. Save and preview.

**Photo tips for gallery:**
- Consistent proportions look best — try to crop all photos to the same aspect ratio (e.g., 4:3 or square)
- Compress photos before adding — each should be under 300KB. Use [Squoosh](https://squoosh.app).
- Keep filenames lowercase with hyphens: `first-dance.jpg`, not `First Dance Photo.jpg`

---

## 8. What NOT to Change

Please leave the following files and sections alone unless you're comfortable with web development:

**Files to leave as-is:**
- `src/css/styles.css` — This controls all the colors, fonts, spacing, and layout. Changing the wrong line here can break the whole site's design.
- `src/js/main.js` — Except for the wedding date line described in Section 6. The rest handles the countdown timer, mobile menu, animations, and form behavior.

**In the CSS file, do not touch:**
- Lines starting with `--` inside `:root { }` — these are color and font variables that affect every page.
- Any line with `@keyframes` — these are animations.
- Any line with `@media` — these control how the site looks on phones.

**In HTML files, do not touch:**
- `<head>` section contents (except meta description text — that's fine to update)
- `<script>` tags at the bottom of each page
- `class="..."` attributes — these connect elements to their styles

---

## 9. Previewing Your Changes Locally

**Easiest method — just open in a browser:**
1. Open File Explorer and navigate to your `src/` folder.
2. Double-click `index.html`.
3. It opens in your default browser and you can see your changes.
4. Note: The RSVP form will not actually submit in this preview mode — it needs to be live on Netlify.

**Better method — VS Code Live Server:**
1. Download and install [Visual Studio Code](https://code.visualstudio.com) (free).
2. Open VS Code and install the "Live Server" extension (click the Extensions icon on the left sidebar, search "Live Server", click Install).
3. Open your `src/` folder in VS Code: File → Open Folder → select `src`.
4. Right-click on `index.html` in the file panel and choose "Open with Live Server."
5. A browser tab opens and automatically refreshes every time you save a file — very handy!

---

## Quick Reference: Common Tasks

| I want to... | Open this file | Look for this |
|---|---|---|
| Change the hero image | `src/images/` folder | Replace `hero-[page].jpg` |
| Update welcome text | `src/index.html` | `<section class="welcome">` |
| Edit the story timeline | `src/our-story.html` | `<div class="milestone">` |
| Update ceremony time | `src/details.html` | `<div class="ceremony-info">` |
| Add a wedding party member | `src/wedding-party.html` | `<section class="groomsmen">` or `.bridesmaids` |
| Update registry links | `src/registry.html` | `href="https://..."` in registry items |
| Add hotel info | `src/travel.html` | `<div class="hotel-card">` |
| Change countdown date | `src/js/main.js` | `const weddingDate` |
| Add gallery photos | `src/gallery.html` | `<div class="gallery-grid">` |
| Update FAQ answers | `src/faq.html` | `<div class="faq-item">` |

---

*Last updated: May 2026. Questions? Reach out to your web developer.*

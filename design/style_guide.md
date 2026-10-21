# Style Guide — Jeff & Paige Wedding Website

> **Superseded (2026-10-11).** [DESIGN.md](../DESIGN.md) at the repo root is now the source of truth for all visual work, and the tokens in `src/css/styles.css` implement it. Where this guide disagrees (e.g. Rosette countdown outlines, script page-hero labels, blush icon circles), DESIGN.md wins. Kept for history.

**Couple:** Jeff & Paige
**Wedding Date:** August 5, 2028
**Venue:** HollyHedge Estate, New Hope, PA
**Aesthetic:** Modern Minimalist

---

## 1. Color Palette

Built around the bridesmaid dress colors (Azazie **Dusty Sage** and **Rosette**), with evergreen ink in place of black and metallic gold for ornament. Ivory stays the base. Values below match `:root` in `src/css/styles.css`, which is the source of truth.

### Wedding colors

| Token | Hex | Usage |
|---|---|---|
| `--color-dusty-sage` | `#BCCAB3` | Azazie Dusty Sage. Banners: inner-page heroes, countdown and CTA bands, footer. Scrollbar. |
| `--color-rosette` | `#E0AA9E` | Azazie Rosette. RSVP nav pill, countdown box outlines. |
| `--gold-metallic` | gradient `#A47A2C → #D9B860 → #F5E6A8 → #C9A04A → #8F6A26` | Ornament lines and diamonds, title rules, timeline dots, card top rules, scroll progress bar. Decorative only. |
| `--gold-metallic-text` | gradient `#7E5C2E → #A47A2C → #7E5C2E` | Large script on ivory (logo "&", hero "and"). |
| `--gold-metallic-text-on-sage` | gradient `#5E4519 → #7E5C2E → #5E4519` | Large script on sage (page-hero labels, footer "&" and "with love,"). |

### Core tokens

| Token | Hex | Usage |
|---|---|---|
| `--color-background` | `#FBF8F2` | Page background (ivory) |
| `--color-sage-mist` | `#EBECE2` | Alternating sections (25% dusty sage on ivory) |
| `--sage-wash` | gradient, 25% → 55% dusty sage | Placeholder fills: Wedding Party photo frames, After Party map |
| `--color-surface` | `#F7ECE7` | Faint blush for small UI states (RSVP status, confirmed guest field) |
| `--color-surface-2` | `#ECE4D5` | Deeper neutral fill |
| `--color-text-primary` | `#243022` | Body text, headings, primary buttons (evergreen ink) |
| `--color-text-secondary` | `#56634F` | Captions, subtitles (muted sage-gray) |
| `--color-accent-dark` | `#7E5C2E` | Small gold text: caps labels, text links, icons, form focus |
| `--color-accent-secondary` | `#C9A04A` | Solid metallic-gold mid-tone for borders and rings |
| `--color-accent-tertiary` | `#F3DCD5` | Blush: icon circles, badges, text selection |
| `--color-accent-primary` | `#5E7056` | Deep dusty sage (icon hover) |
| `--color-dark` | `#1F2A20` | Evergreen: headings and links on sage banners, button hover |
| `--color-muted-on-sage` | `#3E4A39` | Secondary text on sage banners |
| `--color-gold-on-sage` | `#5E4519` | Solid gold text on sage (fallback, active footer link) |
| `--color-border` | `#E4DCCA` | Hairlines |

### Color Usage Rules
- Page rhythm: sage banner, then ivory and sage-mist sections alternating (the first section after the banner is always ivory), then the sage footer. One-section pages stay ivory. Cards on any section are white with a hairline border.
- Pink (Rosette) is reserved for the RSVP nav pill and text selection; icon circles are white with a thin gold ring, and badges use a champagne tint (`rgba(var(--color-gold-rgb), 0.14)`).
- Dusty Sage is the banner color. Text on it is always evergreen (`--color-dark`, 8.7:1) or `--color-muted-on-sage` (5.5:1). Never cream or ivory.
- Metallic gold is decorative. Its bright highlights fall to 1.2:1 on ivory, so never use `--gold-metallic` on text. Large script may use the `-text` gradients; small text uses solid `--color-accent-dark` (5.7:1 on ivory) or `--color-gold-on-sage` on banners.
- Deep gold links fail on sage (3.5:1), so links inside banners switch to evergreen.
- Rosette and Dusty Sage are both too light for text on ivory (1.9:1 and 1.6:1). Use them as fills, borders and accents, always with evergreen text on top.
- Translucent tints use the channel tokens: `rgba(var(--color-gold-rgb), 0.4)`, `--color-dark-rgb`, `--color-dusty-sage-rgb`.
- All text pairings must meet WCAG AA (4.5:1 body, 3:1 large text and UI). The contrast ratios are noted beside the tokens in the CSS.

---

## 2. Typography

### Font Selection

| Role | Font | Rationale |
|---|---|---|
| **Display** | Cormorant Garamond | Elegant high-contrast serif; ideal for couple names, hero headlines, and pull quotes. Evokes fine stationery. |
| **Body** | Jost | Clean geometric sans-serif with excellent legibility at small sizes. Modern companion to Cormorant. |

### Google Fonts Import URL

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### Type Scale

```css
--font-display: 'Cormorant Garamond', Georgia, serif;
--font-body:    'Jost', system-ui, sans-serif;

/* Sizes */
--font-size-hero:    clamp(3rem, 7vw, 5.5rem);   /* Hero couple name / statement */
--font-size-h1:      clamp(2.25rem, 4.5vw, 3.5rem);
--font-size-h2:      clamp(1.75rem, 3vw, 2.5rem);
--font-size-h3:      clamp(1.35rem, 2.2vw, 1.75rem);
--font-size-h4:      clamp(1.1rem, 1.6vw, 1.25rem);
--font-size-body:    1rem;          /* 16px base */
--font-size-small:   0.875rem;      /* 14px */
--font-size-caption: 0.75rem;       /* 12px */

/* Weights */
--font-weight-light:   300;
--font-weight-regular: 400;
--font-weight-medium:  500;
--font-weight-semibold: 600;

/* Line Heights */
--line-height-tight:   1.15;   /* Display headings */
--line-height-heading: 1.3;    /* h2–h4 */
--line-height-body:    1.7;    /* Body paragraphs */
--line-height-ui:      1.4;    /* Nav, labels, captions */
```

### Typography Application Rules
- All headings (`h1`–`h4`) and the couple's names use `--font-display` (Cormorant Garamond).
- All body copy, nav links, labels, button text, captions, and form elements use `--font-body` (Jost).
- Display-size text (hero) is set at `--font-weight-light` (300) for an airy, editorial feel.
- `h1`–`h2` use `--font-weight-regular` (400); `h3`–`h4` use `--font-weight-medium` (500).
- Letter-spacing: `--letter-spacing-display: 0.02em` on hero/h1; `--letter-spacing-wide: 0.12em` on all-caps labels and nav items.
- Never use `Inter`, `Roboto`, or `Arial` on this site.

---

## 3. Spacing System

```css
--space-xs:   0.25rem;   /*  4px */
--space-sm:   0.5rem;    /*  8px */
--space-md:   1rem;      /* 16px */
--space-lg:   1.5rem;    /* 24px */
--space-xl:   2.5rem;    /* 40px */
--space-2xl:  4rem;      /* 64px */
--space-3xl:  6rem;      /* 96px */

--section-padding-y:    clamp(4rem, 8vw, 7rem);  /* Top/bottom padding on every page section */
--container-max-width:  1100px;                   /* Max content width; centered with auto margins */
--container-padding-x:  clamp(1.25rem, 5vw, 3rem); /* Horizontal gutter inside container */
--card-padding:         clamp(1.5rem, 3vw, 2.5rem); /* Internal padding for all card components */
--nav-height:           72px;                     /* Fixed top nav height */
--border-radius-sm:     4px;
--border-radius-md:     8px;
--border-radius-lg:     16px;
```

---

## 4. Motion Style

All motion is restrained and purposeful. The site should feel calm and refined — not animated.

### Scroll-Reveal
- **Trigger:** IntersectionObserver — fires once when element is 15% visible.
- **Effect:** `opacity: 0` and `transform: translateY(24px)` → `opacity: 1` and `transform: translateY(0)`.
- **Duration:** `600ms`
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (gentle ease-out)
- **Stagger:** Child elements within a grid/row stagger by `80ms` per item.
- **Applied to:** Section headings, cards, timeline entries, gallery items, FAQ items.
- **Not applied to:** Nav, footer, hero content (hero fades in on page load instead).

```css
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 600ms cubic-bezier(0.22, 1, 0.36, 1),
              transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Hover States
- **Cards:** `transform: scale(1.02)` with `transition: transform 200ms ease, box-shadow 200ms ease`. Add a soft shadow lift: `box-shadow: 0 8px 32px rgba(44, 44, 44, 0.08)`.
- **Links:** Color transitions from `--color-text-primary` → `--color-accent-primary`, `200ms ease`.
- **Buttons (primary):** Background darkens 8% on hover; `transition: background-color 200ms ease, transform 150ms ease`. Subtle `transform: translateY(-1px)` on hover.
- **Nav links:** Underline expands from center using a pseudo-element, `200ms ease`.
- **Botanical SVG:** Opacity from `0.6` → `1.0` on nearby element hover, `300ms ease`.

### Page Load
- Hero section fades in at load: `opacity: 0` → `opacity: 1` over `800ms ease-out`, with a `200ms` delay for the headline and `400ms` delay for the CTA button.
- No heavy page transitions or route animations.

### Parallax
- Applied only to the hero background image.
- JavaScript-driven: on `scroll`, background position shifts at `0.3x` scroll rate (max offset `±30px`).
- Disabled on mobile (prefers-reduced-motion is also respected — all motion disabled when `prefers-reduced-motion: reduce`).

```css
@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal.visible {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

---

## 5. Decorative Element

### Motif: Thin Botanical Line-Art Sprig (SVG)

**Design:** A single-weight (1px stroke) botanical sprig consisting of a central curved stem with 4–6 small elliptical leaves branching symmetrically. No fill. Stroke color uses `--color-accent-secondary` (`#C9A96E`) at `60%` opacity by default. The style is minimal herbarium illustration — not ornate, not vintage floral. Think a single olive or eucalyptus branch, rendered in 2–3 clean strokes.

**Dimensions:**
- Full-width divider variant: `200px × 24px` (horizontal orientation, stem runs left to right)
- Inline / accent variant: `48px × 48px` (centered, used as a section icon or break marker)
- The SVG file is saved at `/assets/sprig.svg` and reused via `<img>` or inline `<svg>` tags throughout.

**Placement rules — sprig appears in ALL of the following locations:**

| Location | Variant | Notes |
|---|---|---|
| Below the hero headline (above the CTA/date) | Full-width divider | Centered, subtle separator |
| Between the section heading and body content on every page | Inline accent | Centered below `<h2>` tags |
| As a visual break between the ceremony and reception blocks on `details.html` | Full-width divider | Rotated 180° for variety |
| Between the groomsmen and bridesmaids grids on `wedding-party.html` | Full-width divider | Standard orientation |
| In the footer, centered between the couple's names and copyright line | Inline accent | Reduced to `36px × 36px` |
| As a decorative bullet/icon preceding each FAQ question on `faq.html` | Inline accent | `20px × 20px`, inline-left |

**Do not** use the sprig as a background watermark or repeat it more than twice per visible viewport. Restraint is the rule.

---

## 6. Component Inventory

### Buttons
- **Primary:** Background `--color-accent-primary`, text `--color-white`, `--font-body`, weight 500, letter-spacing `0.08em`, `--border-radius-sm`, padding `14px 32px`. No border.
- **Secondary / Ghost:** Transparent background, `1.5px` border `--color-accent-primary`, text `--color-accent-primary`. Same sizing.
- **Text link button:** No border/background, underline on hover, used for "Learn more" type CTAs.

### Cards
- Background `--color-surface`
- Border: `1px solid` `--color-accent-secondary` at `30%` opacity
- `--border-radius-md`
- `--card-padding`
- Hover: scale + shadow (see Motion)

### Nav
- Background `--color-white`, `border-bottom: 1px solid rgba(201, 169, 110, 0.2)` (champagne gold tint)
- Fixed to top, `--nav-height: 72px`
- Logo/couple name: `--font-display`, size `--font-size-h4`, weight 400
- Nav links: `--font-body`, weight 500, letter-spacing `0.1em`, all-caps, `--font-size-caption` (12px)
- Active link: `--color-accent-primary`
- Mobile: hamburger menu, full-screen overlay, links at `--font-size-h3`

### Section Layout
- Every section: `padding: var(--section-padding-y) var(--container-padding-x)`
- Alternating background: odd sections use `--color-background`, even sections use `--color-surface`
- Section heading centered, `--font-display`, followed by inline botanical sprig, then body content

### Forms (RSVP)
- Input fields: background `--color-white`, `1px solid rgba(44,44,44,0.2)` border, `--border-radius-sm`
- Focus state: border `--color-accent-secondary`, box-shadow `0 0 0 3px rgba(201,169,110,0.15)`
- Label: `--font-body`, weight 500, `--font-size-small`, `--color-text-secondary`

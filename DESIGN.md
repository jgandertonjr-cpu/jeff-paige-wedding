DESIGN SYSTEM
Inspired by the bridesmaid dresses (Azazie "Dusty Sage" and "Rosette") with metallic gold accents.

Core colors
- Dusty Sage #BCCAB3: main banner color (page headers, feature bands, footer)
- Rosette #E0AA9E: accent, used sparingly (RSVP only: the button, and the RSVP link in the nav, menu and essentials table)
- Metallic Gold gradient #A47A2C → #D9B860 → #F5E6A8 → #C9A04A → #8F6A26: decorative only (divider lines, small diamonds, dots, thin borders)
- Solid Gold #C9A04A: flat fallback for gold borders/rings

Neutrals & backgrounds
- Ivory #FBF8F2: main page background
- Sage Mist #EBECE2: alternating section background
- White #FFFFFF: cards, with a #E4DCCA hairline border
- Blush #F3DCD5: tiny accents only (text highlight, small UI states)
- Champagne tint: #C9A04A at 14% opacity, for badges and pills

Text
- Evergreen #243022: body text, headings, dark buttons
- Sage-gray #56634F: secondary text, captions
- Deep gold #7E5C2E: small labels, links, icons
- Deep evergreen #1F2A20: text on Dusty Sage
- Muted #3E4A39: secondary text on Dusty Sage
- Gold on Dusty Sage #5E4519

Gold gradient text (large script lettering only)
- On ivory: #7E5C2E → #A47A2C → #7E5C2E
- Hero ampersand: #6A4C22 → #94702F → #6A4C22
- On Dusty Sage: #5E4519 → #7E5C2E → #5E4519
- Always set a solid fallback color (the middle stop) for browsers without background-clip: text.

Typography
- Display/headings: Cormorant Garamond, upright. Light (300) at display sizes, regular or medium as the size comes down. Italic is an accent only (captions, the venue line, "with love,").
- Body/labels: Jost at regular weight (400). Small labels are uppercase with wide letter-spacing, and never smaller than 13px.
- Script: Pinyon Script, for the "&" only. Nowhere else.
- All three are self-hosted in src/fonts (no Google Fonts request).

Rules
- No pure black anywhere. No pure white text.
- Text on Dusty Sage is always evergreen, never white or cream.
- Rosette, Dusty Sage, and bright gold are never text colors on ivory. They are fills, borders, and accents only.
- RSVP button: Rosette fill, Evergreen text.
- Page rhythm: Dusty Sage banner, then Ivory and Sage Mist sections alternating, then a Dusty Sage footer. On the home page the banner holds the invitation: an ivory card with a thin gold inner rule.
- Pink stays minimal. Green and gold lead; Rosette is a single accent.
- All text meets WCAG AA (4.5:1 body, 3:1 large text).
- Tone: elegant, warm, gender-neutral. Refined, not frilly. No florals, glitter, or heavy decoration.

Look and feel (the "invitation suite", November 2026)
- The site should read as printed stationery: the home page is the invitation, the other pages are its enclosure cards.
- One botanical motif: a line-drawn leaf sprig (greenery, never blooms), in gold. It appears under each page title and in the footer, and nowhere else.
- Content sits in open blocks under hairlines (gold for the lead block, the hairline color otherwise), not in bordered white cards. The home invitation and the registry card are the two pieces of "paper" and the only elements with a shadow.
- Buttons are square-cornered (3px), uppercase, at least 48px tall. No pills.
- The essentials (Details, Travel, Registry, RSVP) lead every menu and are one tap away on every page. On phones and tablets they are a flush, opaque bar along the bottom edge (hidden when a phone is held sideways).
- In any group of buttons the primary (dark) button comes first.
- Label/value facts use the detail list (Details, After Party); icon lists share one heading and body size.
- Body text is 17px at every width; notes are 15px; uppercase labels 13px.
- Every link and button is at least 44px tall.
- Motion: each block fades up once as it enters. Nothing loops, ticks, or tracks scrolling.
- Lead paragraphs (the lines under a section title, a page hero, or on the registry card) are Evergreen or Deep evergreen at 7:1 or better. Sage-gray is for notes and descriptions.
- The names are the largest type on every page at every width; the countdown number is sized below them.
- The space either side of a change of ground is the same (`--section-padding-y`).
- The home hero enters once on load in three steps, 120ms apart and 300ms each (540ms in all); inner pages fade their title in once; nothing else has a load animation beyond the fade each block gets as it enters.

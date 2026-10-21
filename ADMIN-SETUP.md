# Website Admin: Setup & Editing Guide

The wedding site now has an editing page at **https://jeffandpaige.net/admin/**. You fill in forms there instead of editing HTML. Every time you click **Save**, the change goes to GitHub and Netlify rebuilds the live site in about a minute.

This guide covers:

1. [One-time setup](#1-one-time-setup) (about 15 minutes, done once by Jeff)
2. [Giving Paige access](#2-giving-paige-access)
3. [Editing the site](#3-editing-the-site)
4. [Testing edits on your computer first](#4-testing-edits-on-your-computer-first-local-mode)
5. [Which file holds what](#5-which-file-holds-what)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. One-time setup

Do these in order. Steps A and B can happen before the new code goes live; step C needs it live.

### A. Create a GitHub OAuth App

This lets the admin page ask GitHub "is this really Jeff?"

1. Go to **https://github.com** and sign in as **jgandertonjr-cpu**.
2. Click your **profile picture** (top right) → **Settings**.
3. In the left sidebar, scroll to the bottom and click **Developer settings**.
4. Click **OAuth Apps** → **New OAuth App**. On a brand-new account the button says **Register a new application**.
5. Fill in the form:

   | Field | What to enter |
   |---|---|
   | Application name | `Jeff & Paige Website Admin` |
   | Homepage URL | `https://jeffandpaige.net` |
   | Application description | *(leave empty)* |
   | Redirect URI (older form: "Authorization callback URL") | `https://api.netlify.com/auth/done` |
   | Allow wildcard matching | *(leave unchecked)* |
   | Enable Device Flow | *(leave unchecked)* |
   | Expire user access tokens | *(leave checked — more secure; you may need to sign in again after about 8 hours)* |

6. Click **Register application**.
7. You're now on the app's page. Copy the **Client ID** into a temporary note.
8. Click **Generate a new client secret**. GitHub may ask for your password or 2FA code. Copy the secret right away, because GitHub only shows it once.

   > Keep the secret private. Don't put it in the repo, an email or a chat. It only goes into Netlify in the next step. If it ever leaks, come back here, delete it and generate a new one.

### B. Install the GitHub provider in Netlify

1. Go to **https://app.netlify.com** and open the **jeffandpaige.net** project.
2. In the left sidebar, click **Project configuration**.
3. Click **Security**, then scroll down to the **OAuth** section. It says "No authentication providers installed."
4. Click **Install provider**.
5. Provider: **GitHub**. Paste the **Client ID** and **Client Secret** from step A.
6. Click **Install**.
7. Delete the temporary note holding the secret.

> Netlify's older docs call this page "Site configuration → Access & security → OAuth". It's the same setting under its new name.

### C. Go live and test an edit end to end

1. **Merge the `admin-cms` branch into `main`.** Ask Claude to do it, or open a pull request on GitHub and merge it there. Netlify then builds the new version. Check **Deploys** in Netlify for a green **Published**.
2. Open **https://jeffandpaige.net/admin/**.
   - The site's visitor access is currently set to **Private**, so you may see a Netlify login first. Sign in with your Netlify account. (See [Giving Paige access](#2-giving-paige-access) for what that means for her.)
3. Click **Sign In with GitHub**. A popup opens. Click **Authorize** the first time. The popup closes and you'll see **Site Settings**, **Pages** and **Guest List** in the left sidebar.
4. Make a harmless test edit:
   1. Click **Pages** → **FAQ**.
   2. Open **Bottom section** and add the word `TEST` to the end of **Message**.
   3. Click **Save** (top right).
5. In Netlify, open **Deploys**. Within a few seconds a new deploy starts. Wait for **Published** (about a minute).
6. Open **https://jeffandpaige.net/faq** and scroll to the bottom. You should see `TEST`. If you don't, refresh.
7. Go back to the admin, remove `TEST`, and **Save** again. 🎉 Setup is done.

### D. Connect the RSVP dashboard

The dashboard at **https://jeffandpaige.net/admin/rsvps/** shows live totals, meal counts, every response, and **who hasn't replied yet**. It reads responses from Netlify, so it needs a Netlify access token. This takes about 3 minutes.

1. **Create the token.** In Netlify, click your **avatar** (bottom left) → **User settings** → **Applications**. Under **Personal access tokens**, click **New access token**.
   - Description: `RSVP dashboard`
   - Expiration: the longest option offered. Put a reminder in your calendar to renew it; when it expires, the dashboard tells you.
   - Click **Generate token** and copy it. Netlify only shows it once.

   > This token can manage your Netlify account, so treat it like a password. Don't put it in the repo, an email or a chat. It only goes into the next step, where only the server can read it.
2. **Store it as a secret.** Open the **jeffandpaige.net** project → **Project configuration** → **Environment variables** → **Add a variable** → **Add a single variable**.
   - Key: `NETLIFY_RSVP_TOKEN`
   - Value: paste the token
   - If offered, tick **Contains secret values**, and limit the scope to **Functions**.
   - Click **Create variable**.
3. **Redeploy** so the server picks it up: **Deploys** → **Trigger deploy** → **Deploy project** (or **Deploy site**).
4. Open **https://jeffandpaige.net/admin/rsvps/**. If you're signed in to the editor, you're signed in here too. Otherwise click **Sign in with GitHub**.

**Who can see it:** only GitHub accounts that can edit the website repo (you, and Paige once she's a collaborator). Everyone else gets "no access", even after the site goes public. Guests' IP addresses and other Netlify metadata are never sent to the page.

---

## 2. Giving Paige access

Paige needs two things:

1. **A GitHub account with write access to the repo.** The admin saves changes as GitHub commits, so she needs permission to write to it.
   - Paige creates a free account at github.com if she doesn't have one.
   - Jeff: open **https://github.com/jgandertonjr-cpu/jeff-paige-wedding** → **Settings** → **Collaborators** → **Add people** → enter her GitHub username or email → **Add**.
   - Paige accepts the invitation email. She can then sign in at `/admin` with **Sign In with GitHub**.
2. **A way past the Netlify login wall** while the site is private. Either:
   - **Make the site public** when you're ready for guests: **Project configuration → General → Visitor access → Edit visibility → Production visibility: Public**. After that, anyone can open the site, but only people with GitHub write access can edit at `/admin`. The admin page is also hidden from search engines.
   - Or add Paige as a member of your Netlify team (**Project configuration → General → Project members → Go to Team members panel**). Depending on your Netlify plan, extra members may not be available or may cost money.

---

## 3. Editing the site

The left sidebar has three sections:

| Section | What's in it |
|---|---|
| **Site Settings** | Names, wedding date, venue address, contact email, footer. These appear on many pages at once. |
| **Pages** | One entry per page: Home, Our Story, Details, Wedding Party, RSVP, Registry, Travel & Hotels, After Party, FAQ, Gallery, Page Not Found. |
| **Guest List** | Names the RSVP form recognizes while guests type. |

**Things to know**

- **Saving publishes.** Each **Save** goes live in about a minute. There's no draft stage, so read before you save. Everything is kept in GitHub history (each change is labelled like "Website edit: Pages → faq (by your-github-name)"), so any change can be undone.
- **See your change:** on any page entry, the editor has a link (in its toolbar or the **⋮** menu) that opens that page on jeffandpaige.net. Give it about a minute after saving.
- **Lists** (FAQ questions, schedule events, wedding party, hotels, gallery photos, timeline moments, and more): use **Add** to add one, the **⋮** menu to delete one, and drag the handle to reorder.
- **Photos:** click the photo field → **Upload** (or pick an existing photo). Uploads are automatically shrunk to at most 2000 pixels on the long side, compressed to WebP, and given a web-safe file name, so phone photos are fine as-is (up to 25 MB). Photos are saved in `src/images/`. Always fill in the **Photo description**; screen readers use it. iPhone HEIC photos may not upload from Chrome; export them as JPEG first, or upload from Safari.
- **Formatting** (bold, italic, links) is only available in the Our Story moments and FAQ answers. Every other field is plain text, so the design stays consistent.
- **Wedding date** (Site Settings) updates the countdown, the home page, the Details and RSVP pages, and the search-engine info. Sentences you wrote yourself that mention the date need updating by hand. Search for "August 5" in the Welcome text, Wedding Party bottom section, Gallery note, and the Search & Sharing descriptions.
- **Opening RSVPs:** Pages → **RSVP** → turn on **RSVPs are open**, optionally set a **Reply-by date**, then **Save**. Also update the RSVP card text on the Home page and the RSVP page subtitle. Responses still arrive in Netlify under **Forms**.
- **Guest list & parties:** in **Guest List**, each guest has **Others on this invitation**: add one entry per extra person (a plus-one, a spouse, four kids, anyone). Names are optional. Leave a name blank to give them a guest of their choosing. When that guest finds their name on the RSVP form, the form shows one block per person (name, attending, meal, after party), with names pre-filled. If the guest declines, the party is skipped.
- **Only names on the Guest List can RSVP.** Guests start typing and must choose their name from the list; the rest of the form stays hidden until they do. If a name can't be found, the form asks them to email you, so add them to the Guest List (spelled as on the invitation) and they can reply right away after the next deploy.
- **After party question:** everyone who accepts is asked whether they'll join the after party (yes, maybe, or no), and so is each person in their party who's coming. The line under the question shows the after party's place and timing note from Pages → **After Party**.
- **RSVP dashboard:** **https://jeffandpaige.net/admin/rsvps/**. It's also linked from Pages → RSVP and from Guest List in the editor.
  - **Filters** (top row): Everyone / Attending / Declined / Awaiting, meal, dietary group, and a search box (names, emails, notes, songs). Every number, chart, list and the table below follow the filters. **Clicking a bar or a segment in any chart filters by it**; click it again to undo. **Clear filters** resets everything.
  - **Totals:** people attending, declined and awaiting, plus the response rate for the guest list.
  - **Where replies stand:** everyone invited, split by reply.
  - **Replies over time:** how many invitations have been answered each day, with the reply-by date marked when it's set (Pages → RSVP). Hover, or use the arrow keys, to see a day.
  - **Meals:** counts among people attending, for the caterer.
  - **After party:** how many people attending are joining, maybe, or not joining (and who hasn't answered). The **After party** total at the top counts people joining.
  - **Dietary needs:** what guests typed, grouped (nut allergy, gluten-free, vegetarian, dairy, shellfish…), with allergies flagged. One reply can fall in several groups. Hover a bar to see who.
  - **Song requests:** most-requested first. The same song typed differently ("Mr. Brightside - The Killers", "mr brightside") counts once. Click a song to see who asked.
  - **Haven't replied yet:** everyone on the Guest List who hasn't responded, with their party.
  - **Every invitation:** one row per invitation, including those still waiting. Sort by clicking a column heading. If someone replies twice, the latest answer counts (marked "Updated"). Replies from names that aren't on the Guest List are flagged.
  - **Download Excel:** a workbook with Summary (including after-party counts), People (one row per person, with their after-party answer), Invitations, Not replied, Dietary and Songs sheets, each with filter buttons on the header row. **Downloads follow your current filters**, so filter to "Attending" first for a caterer-only sheet.
  - **Google Sheets:** in Google Sheets choose **File → Import → Upload** and pick the Excel file (or drag it into Google Drive and open it with Google Sheets).
  - **CSV:** the People sheet as a plain CSV.
  - Click **Refresh** to load new responses.
- **Raw responses** are still in Netlify → **Forms** → **rsvp** if you ever need them. There, `guest_1_…`, `guest_2_…` are the people in each party in the order you listed them, and `party_size` is that response's head count.
- **Empty "coming soon" spots:** Registry links, Nearby hotels, the hotel booking link, and the After Party map all show their current "coming soon" text until you fill them in. Then they appear automatically.
- **Guest list privacy:** the guest list has always been part of the public site code (the RSVP form needs it). Anyone who knows where to look can read the names.
- **Don't drag-and-drop deploy any more.** Netlify now builds the site from GitHub. Dragging the `src` folder into Netlify would publish raw templates instead of the finished site.

---

## 4. Testing edits on your computer first (local mode)

Use this to try changes without touching the live site. It works in **Chrome, Edge or Brave**. Safari and Firefox don't support it. Brave first needs `brave://flags/#file-system-access-api` set to **Enabled**.

**First time only:** open Terminal in the project folder and install the tools:

```bash
npm install
```

**Each time:**

1. Start the local site:

   ```bash
   npm start
   ```

   Leave it running. It prints `Server at http://localhost:8080/`.
2. In Chrome, open **http://localhost:8080/admin/**.
3. Click **Work with Local Repository**. When asked, select the **jeff-paige-wedding** folder (the one that contains `src`, `package.json` and the hidden `.git` folder), then click **View files / Edit files** to allow access.
4. Edit and **Save** as usual. Instead of going to GitHub, the change is written to the files in `src/_data/` on your computer. The local site rebuilds instantly. View it at **http://localhost:8080/**.
5. When you're happy, commit and push the changes with git (or ask Claude). Nothing goes live until you push to `main`. To throw the changes away instead:

   ```bash
   git restore src/_data src/images
   ```

   (Newly uploaded photos are new files. Delete them from `src/images/` by hand, or run `git clean -n src/images` to list them.)

Stop the local site with **Ctrl+C** in Terminal.

---

## 5. Which file holds what

All editable content is in `src/_data/`, one JSON file per page or section. The admin edits these files for you.

| File | Content | Admin entry |
|---|---|---|
| `site.json` | Couple's names, wedding date, venue and address, contact email, footer text | Site Settings |
| `home.json` | Home page: hero photo, welcome text, three photos, quick-link cards, save-the-date text | Pages → Home |
| `story.json` | Our Story timeline (date, title, story, photo for each moment) | Pages → Our Story |
| `details.json` | Ceremony details, reception details, schedule of the day | Pages → Details |
| `party.json` | Bridesmaids and groomsmen (name, role, bio, photo) | Pages → Wedding Party |
| `rsvp.json` | RSVP open/closed, reply-by date, messages, meal choices | Pages → RSVP |
| `registry.json` | Registry message and registry links | Pages → Registry |
| `travel.json` | Room block, nearby hotels, airports, local tips | Pages → Travel & Hotels |
| `afterparty.json` | After party place, time, dress code, what to expect | Pages → After Party |
| `faq.json` | FAQ questions and answers | Pages → FAQ |
| `gallery.json` | Gallery photos and the wedding-photos note | Pages → Gallery |
| `notfound.json` | The "Page Not Found" message | Pages → Page Not Found |
| `guests.json` | Guest list for the RSVP name lookup, with everyone on each invitation (becomes `js/guests.js`) | Guest List |

Each page also has a **Search & Sharing** group (browser-tab title, Google description, link-preview text).

**For developers**

- Pages are built by [Eleventy](https://www.11ty.dev/) from `src/*.njk` templates. The shared header, nav and footer are in `src/_includes/layouts/base.njk`.
- `src/js/main.js.njk` and `src/js/guests.js.njk` generate `js/main.js` (the countdown date) and `js/guests.js`.
- Everything else in `src/` (CSS, images, the `study/` and `pd-tracker/` apps, the other tool pages, `_headers`, `_redirects`, `sitemap.xml`) is copied through unchanged.
- Netlify runs `npm run build` and publishes `_site/` (see `netlify.toml`).
- The admin is `src/admin/index.html` plus `src/admin/config.yml`. The RSVP dashboard is `src/rsvp-dashboard.njk` (published at `/admin/rsvps/`), backed by the Netlify Function `netlify/functions/rsvp-responses.mjs` (`/api/rsvp-responses`). Sveltia CMS is pinned to an exact version in `index.html`. To upgrade, change the version number and test `/admin` locally first.

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| The sign-in popup shows an error or closes with nothing happening | Check that step A's Redirect URI is exactly `https://api.netlify.com/auth/done` and that step B's provider is installed. Allow popups for jeffandpaige.net. |
| The admin suddenly asks you to sign in again | Normal after a few hours with expiring tokens (step A). Click **Sign In with GitHub** again. |
| Signed in, but saving fails with a permissions error | That GitHub account doesn't have write access. See [Giving Paige access](#2-giving-paige-access). |
| Saved, but the live site didn't change | Check Netlify → **Deploys**. If the newest deploy says **Failed**, open it and read the log; the error usually names the problem, e.g. `Image not found: src/images/….jpg` when a photo still in use was deleted. The previous version stays live until a build succeeds, so guests never see a broken site. Fix the field in the admin and save again. |
| "A repository root directory could not be selected" in local mode | Use Chrome, Edge or Brave, and select the top `jeff-paige-wedding` folder, not `src`. |
| RSVP dashboard says "Almost there" or that the token is invalid | Do (or redo) [step D](#d-connect-the-rsvp-dashboard): create a new Netlify access token, update `NETLIFY_RSVP_TOKEN`, and trigger a deploy. |
| RSVP dashboard says this account has no access | Sign in with a GitHub account that's a collaborator on the repo ([Giving Paige access](#2-giving-paige-access)). |
| Want to undo a change | Edit the field back in the admin and save. To restore an older version of a whole file, use GitHub's history for that file in `src/_data/`, or ask Claude. |

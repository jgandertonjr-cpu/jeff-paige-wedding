# Website Editor: Setup & Maintenance (for Jeff)

Paige edits the wedding site at **https://jeffandpaige.net/admin/** by typing what she wants changed. This file is the one-time setup and the upkeep. Her own one-page guide is `ADMIN-GUIDE.md` (also at `/admin/guide/`).

> Vendor menus (Anthropic, GitHub, Netlify) get renamed from time to time. The click paths below were right when written; if a label has moved, the nearest match is almost always the one.

## 1. What changed

- Paige no longer needs a GitHub account. She signs in at `/admin/` with a password you choose.
- She types a request, reads a plain summary, and taps **Publish**. Every change can be undone with one tap.
- The old form editor (Sveltia) is still at `/admin/forms/` as your fallback.
- The RSVP dashboard at `/admin/rsvps/` now uses the same password. No GitHub sign-in there either.

---

## 2. One-time setup checklist

Do these in order.

### a. Anthropic API key

1. Go to **https://platform.claude.com** and sign in.
2. Click **API keys** → **Create key**. Name it `wedding-site-editor`. Copy the key now; it is shown once.
3. Click **Billing** and add some credit ($20 is plenty to start).
4. Click **Settings → Limits** and set a monthly spend limit. Suggested: **$20**.

**What it costs:** roughly 3 to 8 cents for an ordinary change, and 15 to 25 cents for a change to how a page looks. The editor also stops at 150 requests a day by itself, so a runaway can't run up a bill.

### b. GitHub access token (this repository only)

1. Go to **https://github.com**, click your **profile picture** → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Fill in:

   | Field | Value |
   |---|---|
   | Token name | `wedding-site-editor` |
   | Resource owner | `jgandertonjr-cpu` |
   | Expiration | The longest offered. Put a calendar reminder to renew it. When it expires, every request answers "Something went wrong. Nothing changed. Try again in a minute." |
   | Repository access | **Only select repositories** → `jeff-paige-wedding` |
   | Repository permissions | **Contents: Read and write** and **Pull requests: Read and write**. (Metadata: Read-only is added automatically.) Nothing else. |

3. Click **Generate token** and copy it. GitHub shows it once.

### c. A password and a session secret

- **Password for Paige:** at least 8 characters. Four random words works well and is easy to type on a phone.
- **Session secret:** in Terminal run this and copy the result (it needs to be at least 32 characters; this gives 64):

  ```bash
  openssl rand -hex 32
  ```

### d. Netlify environment variables

1. Go to **https://app.netlify.com** → the **jeffandpaige.net** project → **Project configuration** → **Environment variables**.
2. For each row below: **Add a variable** → **Add a single variable**, enter the key and value, tick **Contains secret values**, and if offered limit the scope to **Functions**. Then **Create variable**.

| Name | What it is | Where the value comes from |
|---|---|---|
| `ADMIN_PASSWORD` | Paige's sign-in password | Step c |
| `SESSION_SECRET` | Signs the sign-in cookie | Step c (`openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | Lets the editor ask Claude | Step a |
| `GITHUB_TOKEN` | Lets the editor read and change the site's files | Step b |
| `NETLIFY_RSVP_TOKEN` | Already exists from the RSVP dashboard setup; reused to see when a new version is live. The editor will say it isn't set up if it is missing. | Netlify |

If `NETLIFY_RSVP_TOKEN` is missing: click your **avatar** (bottom left) → **User settings** → **Applications** → **Personal access tokens** → **New access token**. Description `RSVP dashboard`, longest expiration (set a reminder), copy it once, and add it as above.

Never put any of these in the repo, an email or a chat.

### e. Confirm Deploy Previews are on

**Project configuration** → **Build & deploy** → **Continuous deployment** → **Deploy Previews** should be set to "Any pull request against your production branch / branch deploy branches". The editor's **See it first** and look-and-layout changes depend on it.

### f. Merge and go live

1. On GitHub, open a pull request for the `plain-english-editor` branch into `main` and merge it.
2. In Netlify, open **Deploys** and wait for **Published**. (The new variables are only picked up by a deploy made after you added them, so if you added them late, use **Trigger deploy → Deploy project**.)

### g. First test

1. Open `https://jeffandpaige.net/admin/` and sign in.
2. Ask: *add the word TEST to the end of the FAQ's last answer*.
3. Read the summary, tap **Publish**, and wait for **It's live**.
4. Open the FAQ page and check the word is there.
5. Tap **Undo this**, and check it's gone again.

---

## 3. Recommended: make the GitHub repository private

On GitHub: the repo → **Settings** → **General** → **Danger Zone** → **Change repository visibility** → **Make private**.

Why: while the repo is public, the guest list file and every edit Paige makes (each is recorded in the open history) can be read by anyone. Making it private closes that. It won't hide the guest names completely, because the RSVP form needs them and they are served in the site's own code, so anyone who knows where to look can still read them there. Netlify keeps working; it reads the repo through its existing GitHub connection. The editor reads it with your token, which is unaffected.

---

## 4. Day to day

- **Change the password:** edit `ADMIN_PASSWORD` under **Environment variables**, then **Deploys → Trigger deploy → Deploy project**. This signs everyone out.
- **Daily limit:** 150 requests a day, across all uses. After that the editor says it resets tomorrow.
- **Where edits show up:** in the GitHub commit history, as **Website edit: …**. Undo is an edit too.
- **Unpublished changes expire:** a change Paige has been shown but not published is forgotten after 24 hours ("That change has expired. Please ask again."). When a request fails, her typed message is put back in the box so she can send it again.
- **Lockout:** 5 wrong passwords from one address locks that address for 15 minutes. 60 wrong passwords across everyone in an hour locks sign-in for 15 minutes.

---

## 5. The safety checks

**What the editor can change:** the content files (`src/_data/*.json`), new photos added to `src/images/`, and, for bigger changes, after a preview has been built and has passed the checks, the page templates and the stylesheet. The content files include the guest list. The editor can also change the shared template pieces in `src/_includes/` (not the main page shell, `layouts/base.njk`), and it updates `DESIGN.md` by itself, only when a theme colour changes, so the design notes stay true. It cannot touch the private apps, the search-engine files (`robots.txt`, `sitemap.xml`), the RSVP form's code, the functions, the build settings, or anything else. This is enforced by code with an allowlist, whatever the model says.

**Site check:** every build ends with `scripts/check-site.mjs`. It fails if a page is missing, a link or image is broken, a private page loses its `noindex`, or a protected file has changed. A failed check fails the preview, so Publish never appears; on `main`, Netlify keeps the previous version live.

**Automatic put-back:** if a publish reaches `main` but the live build fails, the editor undoes it and tells Paige nothing changed.

**For developers**

- After you (or Claude) intentionally change a template, script, `_headers`, `robots.txt` or `sitemap.xml`, or add a page, run `npm run protect:record` and commit `scripts/protected-files.json`, or the next build fails its site check.
- After editing `src/admin/config.yml`, run `npm run schema`.
- Tests: `npm test`.
- A local copy of the editor: `npm run editor:dev`, then open **http://localhost:8081**. Password `local-test-password`. To use the real model, put `ANTHROPIC_API_KEY=…` in `.editor-local/env` (otherwise every question gets "I can't reach the site").

---

## 6. The old form editor at `/admin/forms/`

Still works as a fallback. It needs the GitHub sign-in provider from the old setup (a GitHub OAuth App, installed in Netlify under **Project configuration → Security → OAuth**) and a GitHub account with write access.

When you no longer want it: delete `src/admin/forms/` and uninstall the provider in Netlify (**Project configuration → Security → OAuth**).

---

## 7. Troubleshooting

| Symptom | What to do |
|---|---|
| "The editor isn't set up yet." | A variable is missing or too short (password under 8 characters, secret under 32). Open **Logs → Functions** in Netlify; the entry says which one. Fix it, then trigger a deploy. |
| "I can't reach the site right now. Try again in a minute." every time | A problem with the Anthropic key (wrong, revoked, or out of credit) or Anthropic itself. In **Logs → Functions** look for a line with event `ask_failed` and a short code: `auth` (key wrong or not allowed), `bad_request`, `rate_limited` or `unreachable`. For `auth`, renew the key (step a) and update `ANTHROPIC_API_KEY`; check your credit and monthly limit too. |
| "That took too long. Nothing changed. Try again." | Logged as `ask_failed` with code `timeout`. An occasional one is normal. If it happens every time, check Anthropic's status page. (Codes `refused` and `cut_off` in the same log are the model declining or running out of room, not faults.) |
| "Something went wrong. Nothing changed. Try again in a minute." every time | Usually GitHub or Netlify, for example an expired GitHub token. In **Logs → Functions** look for a line with event `error`, the route and an error name (nothing more). Renew the GitHub token (step b) and update `GITHUB_TOKEN`, or check `NETLIFY_RSVP_TOKEN`, then trigger a deploy. |
| Reading the logs | The function log never contains the keys, tokens or passwords themselves, only event names, short codes and error names. |
| "This is a preview copy of the site, so publishing is turned off here." | Paige is on a Netlify preview address. Use jeffandpaige.net. |
| A change says it's live but the page looks the same | Refresh the page. If it still looks the same, check **Deploys** for a failure. |
| A deploy failed | Open the deploy log. The line after `site check` says what it found. The previous version stays live. |
| Locked out | Wait 15 minutes. |
| The RSVP dashboard asks to sign in | Sign in at `/admin/` first, then open the dashboard. |
| The dashboard says the Netlify token is invalid | Create a new token (step d), update `NETLIFY_RSVP_TOKEN`, trigger a deploy. |

---

## 8. Which file holds what

Editable content is in `src/_data/`, one JSON file per page or section. The editor changes these for Paige; the form editor changes the same files.

| File | Content |
|---|---|
| `site.json` | Couple's names, wedding date, venue and address, calendar event, contact email, footer text |
| `theme.json` | The site's colours |
| `nav.json` | The menu: labels and order (the page addresses are fixed) |
| `home.json` | Home page: hero photo, welcome text, photos, quick-link cards, save-the-date text |
| `story.json` | Our Story timeline |
| `details.json` | Ceremony, reception, schedule of the day |
| `party.json` | Bridesmaids and groomsmen |
| `rsvp.json` | RSVP open/closed, reply-by date, messages, meal choices, extra questions |
| `registry.json` | Registry message and links |
| `travel.json` | Room block, nearby hotels, airports, local tips |
| `afterparty.json` | After party place, time, dress code, what to expect |
| `faq.json` | FAQ questions and answers |
| `gallery.json` | Gallery photos and the wedding-photos note |
| `notfound.json` | The "Page Not Found" message |
| `guests.json` | Guest list for the RSVP name lookup, with everyone on each invitation |

Most page files also hold a `labels` block (the words on buttons and small labels). Home, Details, Travel, After Party and Wedding Party hold a `section_order` list, which is how Paige can ask to move sections around.

Elsewhere: pages are built by [Eleventy](https://www.11ty.dev/) from `src/*.njk`; the editor's server code is `netlify/functions/editor.mjs` and `netlify/editor/`; the editor page is `src/admin/`; the RSVP dashboard is `src/rsvp-dashboard.njk`, backed by `netlify/functions/rsvp-responses.mjs`.

---

## 9. The RSVP dashboard

**https://jeffandpaige.net/admin/rsvps/** shows live totals, meal counts, every response, and who hasn't replied yet. Sign in at `/admin/` first; the same password and sign-in cover the dashboard. It is also linked from the editor as **RSVP responses**.

**Connecting it:** the dashboard reads responses from Netlify using `NETLIFY_RSVP_TOKEN`, set up in step d. If it says the token is invalid, make a new one and trigger a deploy. Guests' IP addresses and other Netlify metadata are never sent to the page.

- **Filters** (top row): Everyone / Attending / Declined / Awaiting, meal, dietary group, and a search box (names, emails, notes, songs). Every number, chart, list and the table follow the filters. Clicking a bar or a segment in any chart filters by it; click it again to undo. **Clear filters** resets everything.
- **Totals:** people attending, declined and awaiting, plus the response rate for the guest list.
- **Where replies stand:** everyone invited, split by reply.
- **Replies over time:** invitations answered each day, with the reply-by date marked when it's set. Hover, or use the arrow keys, to see a day.
- **Meals:** counts among people attending, for the caterer.
- **After party:** how many attending are joining, maybe, or not joining (and who hasn't answered).
- **Wedding songs:** each married couple's wedding song with their names, for the cocktail-hour playlist.
- **Dietary needs:** what guests typed, grouped (nut allergy, gluten-free, vegetarian, dairy, shellfish and so on), with allergies flagged. One reply can fall in several groups. Hover a bar to see who.
- **Song requests:** most-requested first. The same song typed differently counts once. Click a song to see who asked.
- **Haven't replied yet:** everyone on the guest list who hasn't responded, with their party.
- **Every invitation:** one row per invitation, including those still waiting. Click a column heading to sort. If someone replies twice, the latest answer counts (marked "Updated"). Replies from names not on the guest list are flagged.
- **Download Excel:** a workbook with Summary, People, Invitations, Not replied, Dietary, Songs and Wedding songs sheets. Downloads follow your current filters, so filter to "Attending" first for a caterer-only sheet.
- **Google Sheets:** in Google Sheets choose **File → Import → Upload** and pick the Excel file (or drag it into Google Drive and open it with Google Sheets).
- **CSV:** the People sheet as a plain CSV.
- **Refresh** loads new responses.
- **Raw responses** are still in Netlify → **Forms** → **rsvp**. There, `guest_1_…`, `guest_2_…` are the people in each party in the order listed, and `party_size` is that response's head count.

---

## 10. Good to know

- **Wedding date:** changing it updates the countdown, the home page, the Details and RSVP pages and the search-engine info. Sentences that mention the date also need changing; the editor does this and says so in its summary, but it is worth a look.
- **Only names on the guest list can RSVP.** Guests type and must choose their name; if a name can't be found the form asks them to email you. Add them to the guest list (spelled as on the invitation) and they can reply right after the next publish.
- **Opening RSVPs:** Paige can ask for it ("Open RSVPs, and ask for replies by May 1"). Check the RSVP card text on the Home page and the RSVP page subtitle read right too.
- **Guest-list privacy:** the guest list has always been part of the public site code (the RSVP form needs it), so anyone who knows where to look can read the names. See section 3.
- **Don't drag-and-drop deploy.** Netlify builds the site from GitHub. Dragging the `src` folder into Netlify would publish raw templates instead of the finished site.

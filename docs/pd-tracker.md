# PD Tracker

A phone-first tracker for police department applications: cadet sponsorships, entry-level hires, and civil service lists. Each department gets a status pipeline, key dates, a contact, a document checklist, and a dated notes log. It runs entirely in your browser, works offline once loaded, and can be installed on your home screen.

No accounts, no server, no build step. Your data stays on your device in the browser's local storage.

**Live address:** https://jeffandpaige.net/pd-tracker/

It lives in the wedding site's `src/pd-tracker/` folder, so it goes live whenever you deploy the site to Netlify. It isn't linked from any wedding page, and it's marked so search engines don't list it.

## Files

| File | What it is |
|---|---|
| `src/pd-tracker/index.html` | The whole app (HTML, CSS, and JavaScript in one file) |
| `src/pd-tracker/manifest.json` | Lets the app install to a home screen |
| `src/pd-tracker/sw.js` | Service worker that caches the app so it opens offline |
| `src/pd-tracker/icons/` | App icon (`icon.svg` source plus PNGs at 180, 192, and 512) |
| `src/_headers` | The `/pd-tracker/*` rule keeps it out of search results and always checks for updates |

## Publish it (Netlify)

Deploy the site the same way you always do: drag the whole **`src`** folder into your site's **Deploys** tab on Netlify (see `docs/deployment_guide.md`). The tracker goes up with everything else at **https://jeffandpaige.net/pd-tracker/**.

**Install on iPhone:** open that address in **Safari**, tap the **Share** button, then **Add to Home Screen**, then **Add**.

**Install on Android:** open it in **Chrome**, tap the **three-dot menu**, then **Add to Home screen** (or **Install app**).

Open it once while online so it caches itself. After that it opens with no signal.

## Try it on your computer

From the project folder, run:

```bash
python3 -m http.server 8080 --directory src
```

Then open http://localhost:8080/pd-tracker/ in your browser. Press Ctrl+C in Terminal to stop the server. Data you enter here is separate from the live site's data.

### Important: where your data lives

- Data is stored per browser and per address. The home screen app, Safari, and Chrome each have their **own separate copy**. Pick one place to use it (the home screen app is best) and stick with it.
- On iPhone, Safari can clear site data for websites you haven't visited in a while. Apps added to the home screen are exempt from that, which is another reason to install it.
- Deleting the home screen app, clearing browser data, or switching phones erases the data. **Back up regularly** (see below). The dashboard reminds you when your last backup is more than 7 days old.
- Redeploying the wedding site never touches your tracker data; it only updates the app's code.

### Updating the app later

Edit the files in `src/pd-tracker/` and redeploy `src` to Netlify. The app picks up the new version the next time you open it with a connection; if you don't see it, close and reopen the app once more.

## Back up and restore

Tap **Backup** at the top right of any screen.

**Back up**
- **In the home screen app:** tap **Back up now** (dashboard) or **Save backup file** (Backup screen). The share sheet opens with a file named like `pd-tracker-backup-2026-10-15.json`. Choose **Save to Files** (pick iCloud Drive or Google Drive so it's off the phone), or email/AirDrop it to yourself. If you close the share sheet without saving, it doesn't count as a backup.
- **In a regular browser tab:** **Download backup (.json)** saves the file to your Downloads. **Share backup file** (on phones that support it) opens the share sheet instead.
- The dashboard shows when you last backed up and reminds you after 7 days.

**Restore**
1. Tap **Choose backup file to import** and pick your backup file (all files are selectable; the app checks that it's a real backup before changing anything).
2. Choose how to bring it in:
   - **Merge** keeps what's in the app and adds the file's departments. If a department is in both, the most recently edited version wins, and notes from both copies are kept. (A note you deleted on one copy can come back after a merge.)
   - **Replace** wipes the app and loads exactly what's in the file. Use this when moving to a new phone.
3. Confirm. Before any import, the app keeps a safety copy of your current data on the device.

**Spreadsheet (CSV)**
**Download CSV** gives one row per department with every field, the document checklist, and all notes combined into one column (newest first). It opens in Excel or Google Sheets. CSV is for viewing and printing; to restore, use the JSON backup.

**Moving to a new phone:** download a backup on the old phone, get the file to the new phone (AirDrop, email, cloud drive), install the app on the new phone, then **Backup**, **Choose backup file**, **Replace**.

## How the dashboard decides things

- **Active** means any status except Hired, Rejected, Withdrawn, or On Hold.
- **Upcoming** lists next-step dates in the next 14 days for active departments, plus application deadlines for departments still in **Researching** (once you've applied, the deadline no longer matters).
- **Overdue** lists active departments whose next-step date has passed, or whose deadline passed while still in Researching.
- **Stale** lists active departments with no note or edit in 14 or more days.
- Changing status adds a dated "Status: X → Y" entry to the notes log. Moving to **Applied** fills in today as the date applied if that field is empty.

## Things that are saved for you automatically

- Fields on a department's page save when you leave the field, and also if you go Back or switch apps mid-edit.
- A note you've started typing but haven't added is kept as a draft, even if your phone closes the app. It's still there when you return to that department.
- The Add and Edit forms ask before throwing away unsaved changes if you tap away from them.

## For future changes

Saved data carries a schema version. If you change the data structure later, bump `SCHEMA_VERSION` in `index.html` and add an entry to `MIGRATIONS` that converts the old shape to the new one. The app saves a copy of the pre-upgrade data before migrating, and it never overwrites data it can't read. Instead it offers a raw download, plus a **Start over** option that keeps the unreadable copy on the device under a separate name.

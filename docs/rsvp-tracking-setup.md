# RSVP Tracking Setup — Auto-Sync to Google Sheets

## Why this approach

The RSVP form (`rsvp.html`) already posts to **Netlify Forms** — every submission is captured server-side the moment a guest hits "Send My RSVP." That part is already accurate and can't be lost; there's no manual export/paste step to mess up.

This setup adds one thing: a webhook that fires the instant a submission comes in and writes it straight into a Google Sheet. No copy-pasting CSVs, no "did I re-export the latest version?" — the sheet is always current.

To make sure nothing ever silently disappears, the script writes to **two tabs**:
- **RSVPs** — one row per guest, deduplicated by email (if someone submits twice, their row is updated in place instead of creating a duplicate).
- **Raw Log** — every single webhook hit, unparsed, appended forever. This is the safety net: even if a bug in the parsing logic ever mangles a row in the RSVPs tab, the original data is still sitting in Raw Log and nothing is truly lost.

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it something like "Jeff & Paige — RSVP Tracker."
3. You don't need to create any tabs or headers by hand — the script sets those up automatically the first time it runs.

## Step 2 — Add the Apps Script

1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete any placeholder code in the editor and paste in the script below.
3. Click the **disk/Save** icon and name the project (e.g. "RSVP Webhook").

```javascript
/**
 * Netlify → Google Sheets RSVP sync.
 * Receives a Netlify Forms outgoing-webhook POST and:
 *   1. Appends the raw payload to "Raw Log" (never overwritten — the safety net).
 *   2. Upserts a parsed row into "RSVPs", keyed by email (dedupes re-submissions).
 * Any parsing problems are recorded in "Errors" instead of failing silently.
 */

var RSVP_HEADERS = [
  'Timestamp', 'Name', 'Email', 'Attending', 'Party Size',
  'Meal', 'Guest Name', 'Guest Meal', 'Dietary Restrictions',
  'Song Request', 'Guest ID', 'Last Updated'
];

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawSheet = getOrCreateSheet_(ss, 'Raw Log', ['Received At', 'Raw Body']);
  var raw = e && e.postData ? e.postData.contents : '';

  // 1. Log raw payload first — this should basically never fail.
  rawSheet.appendRow([new Date(), raw]);

  // 2. Try to parse + upsert a clean row. Failures land in "Errors", not the void.
  try {
    var body = JSON.parse(raw);
    var payload = body.payload || body;
    var data = payload.data || payload;

    var attending = (data.attending || '').toLowerCase();
    var hasPlusOne = attending === 'yes' && !!(data.guest_name && data.guest_name.trim());
    var partySize = attending === 'yes' ? (hasPlusOne ? 2 : 1) : 0;

    var row = [
      payload.created_at || new Date().toISOString(),
      data.name || '',
      (data.email || '').trim().toLowerCase(),
      data.attending || '',
      partySize,
      data.meal || '',
      data.guest_name || '',
      data.guest_meal || '',
      data.dietary_restrictions || '',
      data.song_request || '',
      data.guest_id || '',
      new Date()
    ];

    upsertByEmail_(getOrCreateSheet_(ss, 'RSVPs', RSVP_HEADERS), row);
  } catch (err) {
    var errSheet = getOrCreateSheet_(ss, 'Errors', ['Timestamp', 'Error', 'Raw Body']);
    errSheet.appendRow([new Date(), err.message, raw]);
  }

  return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function upsertByEmail_(sheet, row) {
  var email = row[2];
  var lastRow = sheet.getLastRow();

  if (email && lastRow > 1) {
    var emails = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); // column C = Email
    for (var i = 0; i < emails.length; i++) {
      if (emails[i][0] && emails[i][0].toString().trim().toLowerCase() === email) {
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return;
      }
    }
  }
  sheet.appendRow(row);
}
```

## Step 3 — Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, authorize the permissions Google asks for (it needs to edit the Sheet), and copy the **Web app URL** it gives you. It looks like `https://script.google.com/macros/s/AKfycb.../exec`.

> If you ever edit the script later, you must create a **new deployment version** (or use "Manage deployments" → edit → new version) for changes to take effect on the live URL.

## Step 4 — Point Netlify at it

1. In Netlify, go to **Site configuration → Forms → Form notifications**.
2. Click **Add notification → Outgoing webhook**.
3. Set:
   - **Event to listen for:** New form submission
   - **URL to notify:** paste the Web app URL from Step 3
   - **Form:** rsvp
4. Save.

## Step 5 — Test it end-to-end

1. Go to the live RSVP page and submit a test entry (use an email you can recognize, like `test+rsvp@yourdomain.com`).
2. Check the Google Sheet — a row should appear in **RSVPs** within a few seconds, and the raw payload should appear in **Raw Log**.
3. Submit the *same* test entry again with a different answer — confirm it updates the existing row in **RSVPs** rather than adding a second one.
4. Delete the test row(s) when you're done.

## Ongoing use

- **Netlify Forms remains the source of truth.** If anything ever looks off in the Sheet, Netlify's own Forms dashboard (with CSV export) is still there as the ground truth to reconcile against.
- **Headcount:** `=COUNTIF(RSVPs!D:D,"yes")` gives attending count; `=SUM(RSVPs!E:E)` gives total party size (guests + plus-ones).
- **Meal counts:** `=COUNTIF(RSVPs!F:F,"chicken")` etc. for catering counts.
- If a row ever looks wrong, check **Raw Log** (or **Errors**) for that timestamp — the original submission is always there.

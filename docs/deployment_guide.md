# Deployment Guide: Getting Your Wedding Website Live

> **Outdated (October 2026):** the site's text and photos now live in `src/_data/*.json` and are edited at **jeffandpaige.net/admin**. Netlify builds the site from GitHub automatically. Don't drag the `src` folder into Netlify any more: it now holds templates, not the finished site. See [ADMIN-SETUP.md](../ADMIN-SETUP.md).

This guide covers two ways to publish your wedding website: **Netlify** (recommended) and **GitHub Pages** (alternative). Netlify is the better choice because it handles your RSVP form submissions automatically with zero extra setup.

---

## Option A: Netlify (Recommended)

Netlify is a free hosting platform that is perfect for wedding websites. Your RSVP form will work out of the box, and you can have the site live in under five minutes.

### Step 1: Create a Netlify Account

1. Go to [netlify.com](https://www.netlify.com).
2. Click **Sign up**.
3. Sign up with your email address, or use your Google or GitHub account for faster setup.
4. Verify your email if prompted.

### Step 2: Deploy Your Site (Manual Drag-and-Drop)

1. Once logged in, you'll land on your Netlify dashboard.
2. Click the **"Add new site"** button (top right area).
3. From the dropdown, choose **"Deploy manually"**.
4. You'll see a large dashed box that says "Drag and drop your site output folder here."
5. On your computer, open File Explorer and navigate to your project folder.
6. **Drag the entire `src` folder** and drop it into that dashed box on the Netlify page.
7. Netlify will upload your files and display a progress bar.
8. Within 30–60 seconds, your site is live! You'll see a green banner and a URL like `https://random-name-12345.netlify.app`.
9. Click that URL to see your live site.

> **Important:** Always drag the `src` folder (not the entire project folder). The `src` folder contains your HTML, CSS, JS, and images — everything Netlify needs.

### Step 3: Set a Custom Site Name

Your site will start with a random name like `amusing-goldenrod-1a2b3c.netlify.app`. Here's how to change it to something like `jeffandpaige.netlify.app`:

1. From your Netlify dashboard, click on your site.
2. Go to **Site configuration** (in the left sidebar).
3. Click **Site details**.
4. Under "Site name," click **Change site name**.
5. Type your preferred name — for example: `jeffandpaige` or `jeff-and-paige-2028`.
6. Click **Save**. Your site will now be live at `https://jeffandpaige.netlify.app` (or whatever name you chose, as long as it's not already taken).

### Step 4: Set a Custom Domain (Optional)

If you've purchased a domain name (like `jeffandpaige.com`) through a registrar like Namecheap, GoDaddy, or Google Domains:

1. In your site's Netlify dashboard, go to **Domain management** in the left sidebar.
2. Click **Add a domain**.
3. Type your domain name (e.g., `jeffandpaige.com`) and click **Verify**.
4. Netlify will show you DNS records to add at your domain registrar.
5. Log into your domain registrar's dashboard and add those DNS records.
6. DNS changes can take up to 48 hours to propagate, but usually resolve within a few hours.
7. Once active, Netlify automatically enables **HTTPS** (the padlock icon) for free.

### Step 5: Verify Your RSVP Form is Working

Your RSVP form is set up to use **Netlify Forms**, which automatically captures submissions and sends them to you by email.

1. After deploying, visit your live RSVP page (e.g., `https://jeffandpaige.netlify.app/rsvp.html`).
2. Fill in the form with a test name and email and submit it.
3. In your Netlify dashboard, click on your site, then go to **Forms** in the left sidebar.
4. You should see a form named "rsvp" listed there.
5. Click on it and you'll see your test submission.
6. To get email notifications for new RSVPs: go to **Forms** → click your form → **Form notifications** → **Add notification** → **Email notification**. Enter the email address where you want to receive RSVP alerts.

> **Note:** Netlify Forms only work on the live Netlify site — not when previewing files locally on your computer. Don't worry if the form doesn't seem to work during local testing.

### Step 6: Re-deploying After Making Changes

Any time you update your website files, you'll need to re-deploy to push the changes live.

**Manual re-deploy (same as initial deploy):**
1. Go to your site's dashboard on Netlify.
2. Click the **Deploys** tab.
3. Scroll down to the "Need to update your site?" section.
4. Drag your updated `src` folder into the deploy box again.
5. Netlify replaces the old files and your site updates within seconds.

**Auto-deploy via GitHub (recommended for frequent updates):**
If you want changes to go live automatically every time you save files, you can connect Netlify to a GitHub repository. See the GitHub setup in Option B, then:
1. In Netlify, go to **Site configuration** → **Build & deploy** → **Continuous deployment**.
2. Click **Link site to Git**.
3. Choose GitHub and authorize Netlify.
4. Select your `jeffandpaige-wedding` repository.
5. Set **Publish directory** to `src`.
6. Click **Deploy site**.
7. From now on, every time you push changes to GitHub, Netlify auto-deploys.

---

## Option B: GitHub Pages (Alternative)

GitHub Pages is a free alternative if you prefer not to use Netlify. The main trade-off is that **the RSVP form will not work natively** — you'll need to use a third-party form service called Formspree (instructions below).

### Step 1: Create a GitHub Account

1. Go to [github.com](https://github.com).
2. Click **Sign up** and follow the registration steps.
3. Verify your email address.
4. You can choose the free plan — it includes everything you need.

### Step 2: Create a New Repository

1. Once logged in, click the **+** icon (top right) and select **New repository**.
2. For the repository name, enter: `jeffandpaige-wedding` (or any name you prefer — just remember it, as it becomes part of your URL).
3. Set the repository to **Public** (required for free GitHub Pages hosting).
4. Leave "Initialize this repository" unchecked.
5. Click **Create repository**.

### Step 3: Upload Your Website Files

1. On your new (empty) repository page, click **"uploading an existing file"** (or the "upload files" link).
2. On your computer, open the `src/` folder so you can see its contents: `index.html`, `css/`, `js/`, `images/`, and your other HTML files.
3. Select all the files and folders inside `src/` (not the `src/` folder itself — its contents).
4. Drag them all into the GitHub upload area.
5. Scroll down, write a short message like "Initial upload" in the commit message box.
6. Click **Commit changes**.
7. Wait for the upload to finish (it may take a minute with images).

### Step 4: Enable GitHub Pages

1. In your repository, click the **Settings** tab (top navigation).
2. In the left sidebar, click **Pages**.
3. Under "Build and deployment" → **Source**, select **"Deploy from a branch"**.
4. Under **Branch**, select `main` from the dropdown. Leave the folder as `/ (root)`.
5. Click **Save**.
6. GitHub will take 1–2 minutes to build your site.
7. Refresh the Pages settings page and you'll see a banner: "Your site is live at `https://yourusername.github.io/jeffandpaige-wedding`."
8. Click that link to visit your live site.

### Step 5: Set Up Formspree for the RSVP Form (GitHub Pages Only)

Because GitHub Pages does not process form submissions, you need Formspree to handle your RSVPs.

1. Go to [formspree.io](https://formspree.io) and create a free account.
2. Click **+ New Form**.
3. Name it "Jeff & Paige RSVP" and enter the email address where you want to receive submissions.
4. Click **Create Form**.
5. Formspree gives you a unique form endpoint URL that looks like: `https://formspree.io/f/abcdefgh`
6. Open `src/rsvp.html` in your text editor.
7. Find the opening `<form` tag. It currently looks like:
   ```html
   <form name="rsvp" method="POST" data-netlify="true">
   ```
8. Replace it with:
   ```html
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```
   (Replace `YOUR_FORM_ID` with the ID from Formspree — the letters after `/f/`.)
9. Remove or leave the `data-netlify="true"` attribute — Formspree will ignore it.
10. Save `rsvp.html` and re-upload it to GitHub.
11. Test the form on your live site.

**Formspree free plan limits:** 50 submissions per month. If you expect more RSVPs, consider upgrading or using Netlify instead.

### Step 6: Updating Your Site on GitHub Pages

1. Make your changes to the files in the `src/` folder on your computer.
2. Go to your GitHub repository.
3. Navigate to the specific file you changed (e.g., click `index.html`).
4. Click the **pencil icon** (Edit this file) to edit directly in the browser, OR:
5. For uploading changed files: go to the folder, click **Add file** → **Upload files**, drag in your updated file, and commit.
6. GitHub Pages will automatically re-deploy within a minute or two.

### Custom Domain on GitHub Pages

1. In your repository Settings → Pages, find the **Custom domain** field.
2. Enter your domain (e.g., `jeffandpaige.com`) and click Save.
3. Log into your domain registrar and add a CNAME record pointing to `yourusername.github.io`.
4. Enable **"Enforce HTTPS"** once the domain is verified.

---

## Comparison: Netlify vs. GitHub Pages

| Feature | Netlify | GitHub Pages |
|---|---|---|
| Free hosting | Yes | Yes |
| RSVP forms built-in | Yes (Netlify Forms) | No (need Formspree) |
| Custom domain | Yes | Yes |
| HTTPS/SSL | Automatic | Automatic |
| Deploy method | Drag-and-drop or GitHub | GitHub upload |
| Re-deploy ease | Very easy | Moderate |
| Recommended for | Most couples | Tech-comfortable couples |

---

## Troubleshooting

**Site shows old content after re-deploying:**
- Try a hard refresh in your browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac).
- Wait a few minutes — sometimes CDN caches take a moment to clear.

**RSVP form isn't showing up in Netlify dashboard:**
- Make sure you deployed the site through Netlify (not GitHub Pages).
- The form must be submitted at least once on the live site before it appears in your dashboard.

**Images aren't showing:**
- Check that image filenames match exactly, including capitalization. `Hero-Home.jpg` and `hero-home.jpg` are treated differently on live servers.
- Make sure all images are inside the `src/images/` folder before deploying.

**Page not found (404) errors:**
- Make sure you uploaded the contents of `src/`, not a folder named `src/` itself.
- Check that file names match exactly what's in the navigation links.

---

*Last updated: May 2026.*

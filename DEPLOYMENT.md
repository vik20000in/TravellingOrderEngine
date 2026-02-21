# TravellingOrder Engine – Deployment Guide

---

## A. Deploy Frontend on GitHub Pages

### 1. Create GitHub Repository

```bash
cd TravellingOrderEngine
git init
git add index.html style.css app.js
git commit -m "Initial commit – TravellingOrder Engine frontend"
```

### 2. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/TravellingOrderEngine.git
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to **Settings → Pages** in your GitHub repository.
2. Under **Source**, select **Deploy from a branch**.
3. Branch: **main**, Folder: **/ (root)**.
4. Click **Save**.
5. After ~1 minute your app is live at:
   `https://YOUR_USERNAME.github.io/TravellingOrderEngine/`

---

## B. Deploy Google Apps Script Backend

### 1. Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Name it **TravellingOrder Engine** (or anything you prefer).

### 2. Open Apps Script Editor

1. In the spreadsheet menu: **Extensions → Apps Script**.
2. Delete any existing code in `Code.gs`.
3. Paste the entire contents of `backend.gs` into the editor.
4. Change `SECRET_KEY` to a strong random string (e.g., `mySecretKey2026xyz`).
5. Click **Save** (💾).

### 3. Run Initial Setup

1. In the Apps Script editor, select function **`setupSheet`** from the dropdown.
2. Click **Run**.
3. Authorize when prompted (Google will ask for Sheets permission).
4. Confirm the "Orders" sheet was created with headers.

### 4. Deploy as Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon ⚙️ → select **Web app**.
3. Fill in:
   - **Description**: `TravellingOrder Engine API v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/AKfyc.../exec`).

### 5. Update Frontend Config

Open `app.js` and replace:

```js
const API_URL = "PASTE_YOUR_APPS_SCRIPT_URL";
const API_KEY = "PASTE_YOUR_SECRET_KEY";
```

with your actual values:

```js
const API_URL = "https://script.google.com/macros/s/AKfycbx.../exec";
const API_KEY = "mySecretKey2026xyz";
```

Commit and push the change to GitHub.

---

## C. Set Permissions (Important)

When you first run the script or deploy the web app, Google will ask you to authorize. Follow these steps:

1. Click **Review Permissions**.
2. Choose your Google account.
3. You may see **"Google hasn't verified this app"** — click **Advanced → Go to (project name)**.
4. Click **Allow**.

This grants the script permission to write to your spreadsheet.

---

## D. Add Daily Backup Trigger

### Automatic Nightly Backup

1. In the Apps Script editor, click **Triggers** (clock icon in the left sidebar).
2. Click **+ Add Trigger**.
3. Configure:
   - **Function**: `dailyBackup`
   - **Deployment**: `Head`
   - **Event source**: `Time-driven`
   - **Type**: `Day timer`
   - **Time**: `11 PM to midnight` (or your preference)
4. Click **Save**.

This creates a sheet named `Backup_YYYY-MM-DD` every day with a copy of all orders.

---

## E. Testing

### Quick Test from Browser

Visit your deployed Apps Script URL in a browser:
```
https://script.google.com/macros/s/AKfycbx.../exec
```
You should see: `{"status":"ok","message":"TravellingOrder Engine API is running."}`

### Test from Frontend

1. Open your GitHub Pages URL.
2. Enter a customer name, set some quantities.
3. Click **Save Order → Yes, Submit**.
4. Check the Google Sheet — rows should appear in the "Orders" tab.

---

## F. Troubleshooting

| Problem | Solution |
|---|---|
| CORS errors in console | Apps Script with `mode:"no-cors"` returns opaque response — this is normal. If you need to read the response, deploy with "Anyone" access and use `mode:"cors"` in fetch. |
| Orders not appearing in sheet | Verify the API_URL is the `/exec` URL (not `/dev`). Re-deploy after any code change. |
| "Authorization required" | Re-run any function manually in Apps Script editor to re-authorize. |
| Custom headers not received | With `no-cors`, browsers strip custom headers. Pass `api_key` as a query param or inside the JSON body instead. |
| Script timeout | Each POST should process in <1s. If you submit >500 rows at once, batch them. |

---

## G. File Structure

```
TravellingOrderEngine/
├── index.html       ← Main HTML (GitHub Pages entry)
├── style.css        ← All styling
├── app.js           ← Frontend logic
├── backend.gs       ← Google Apps Script (paste into Apps Script editor)
└── DEPLOYMENT.md    ← This guide
```

---

## H. Security Notes

- The Apps Script URL itself acts as a basic secret (unguessable).
- For additional security, pass `api_key` inside the JSON body. The backend validates it.
- Never commit real API keys to a public repo. Use a **private** repository or environment-specific config.
- Consider adding rate limiting via Apps Script `PropertiesService` counters if abuse is a concern.

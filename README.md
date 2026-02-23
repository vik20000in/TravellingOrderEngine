# TravellingOrder Engine

A responsive order management web application built with **React + Vite** and backed by **Google Sheets** via Google Apps Script. Designed for businesses that manage travelling orders across varieties, items, sizes, and customers.

## Live Demo

🌐 **[https://vik20000in.github.io/TravellingOrderEngine/](https://vik20000in.github.io/TravellingOrderEngine/)**

---

## Features

- **Order Entry** — Excel-like grid for entering quantities by item, variety, and size
- **Master Data Management** — CRUD for Varieties, Items (with colors, sizes, images), and Customers
- **Image Upload** — Attach images to items and customers (stored as Base64 in Google Sheets)
- **Lightbox** — Click any thumbnail to view full-size images
- **Responsive Design** — Fully optimized for desktop, tablet, and mobile
- **Real-time Totals** — Auto-calculated row/column/grand totals in the order grid
- **Google Sheets Backend** — All data stored in a Google Spreadsheet via Apps Script web app

---

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Frontend     | React 19, React Router 7, Vite 6   |
| Styling      | Plain CSS (component-scoped)        |
| Backend API  | Google Apps Script (Web App)        |
| Data Storage | Google Sheets                       |
| Deployment   | GitHub Pages (via GitHub Actions)   |
| GAS Deploy   | clasp CLI                           |

---

## Project Structure

```
TravellingOrderEngine/
├── .github/workflows/deploy.yml   # GitHub Pages CI/CD
├── gas/Code.js                    # Apps Script source (pushed via clasp)
├── legacy/                        # Old vanilla HTML/JS/CSS backup
├── src/
│   ├── main.jsx                   # React entry point
│   ├── App.jsx                    # Router + layout
│   ├── api/api.js                 # All API calls (fetch wrappers)
│   ├── context/AppContext.jsx     # Global state (varieties, items, customers, colors)
│   ├── styles/index.css           # Global reset & base styles
│   └── components/
│       ├── Layout/Navbar.jsx      # Navigation bar
│       ├── common/                # Toast, Lightbox, Modal
│       ├── Orders/                # OrderPage, OrderGrid, ItemSection, VarietyBlock, QtyInput
│       └── MasterData/            # MasterDataPage, VarietiesTab, ItemsTab, CustomersTab
├── index.html                     # Vite HTML entry
├── vite.config.js                 # Vite config (base path for GH Pages)
├── package.json
├── backend.gs                     # Backend reference copy
├── start.bat                      # Windows dev launcher
└── DEPLOYMENT.md                  # Legacy deployment notes
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 (LTS recommended)
- **npm** ≥ 9
- A Google account (for the backend)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/vik20000in/TravellingOrderEngine.git
cd TravellingOrderEngine

# 2. Install dependencies
npm install

# 3. Start dev server (opens http://localhost:5173)
npm run dev
```

On Windows you can also double-click **start.bat**.

### Build for Production

```bash
npm run build     # Outputs to dist/
npm run preview   # Preview the production build locally
```

---

## Backend Setup (Google Apps Script)

The backend is a Google Apps Script web app that reads/writes data to a Google Spreadsheet.

### 1. Create the Google Spreadsheet

Create a new Google Spreadsheet with these sheets (exact names):

| Sheet Name  | Columns (Row 1 headers)                                                      |
| ----------- | ----------------------------------------------------------------------------- |
| Varieties   | ID, Name, Image                                                              |
| Items       | ID, Name, Price, Colors, Image1, Image2, Image3, Comment, Sizes              |
| Customers   | ID, Name, Phone, Address, Image1, Image2                                     |
| Colors      | Color                                                                        |
| Orders      | OrderID, Date, Customer, Market, ItemName, VarietyName, Size, Qty, Timestamp |

### 2. Deploy the Apps Script

#### Option A — Using clasp CLI (recommended)

```bash
# Install clasp globally
npm install -g @google/clasp

# Login
clasp login

# Update .clasp.json with your script ID, then push
clasp push

# Deploy as web app
clasp deploy --description "v2.0"
```

#### Option B — Manual via Script Editor

1. Open your spreadsheet → **Extensions → Apps Script**
2. Replace the default code with the contents of `backend.gs`
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the deployment URL

### 3. Update the Frontend API URL

Edit `src/api/api.js` and set your deployment URL and API key:

```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
const API_KEY = 'YOUR_API_KEY'
```

> The API_KEY must match the key in your `backend.gs` / `gas/Code.gs` `doPost()` function.

---

## Deploying to GitHub Pages

The project is pre-configured for GitHub Pages deployment using GitHub Actions.

### Automatic Deployment (recommended)

Every push to the `main` branch automatically builds and deploys to GitHub Pages via the workflow at `.github/workflows/deploy.yml`.

**One-time setup in GitHub:**

1. Go to your repo → **Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Push a commit to `main` — the workflow will run and deploy

Your site will be live at:
```
https://<username>.github.io/TravellingOrderEngine/
```

### Manual Deployment (alternative)

If you prefer to deploy manually:

```bash
# Install gh-pages
npm install -D gh-pages

# Add to package.json scripts:
#   "deploy": "npm run build && gh-pages -d dist"

# Then run:
npm run deploy
```

### Important Configuration Notes

| Setting | File | Value | Why |
|---------|------|-------|-----|
| `base` | `vite.config.js` | `'/TravellingOrderEngine/'` | Assets load from correct sub-path on GitHub Pages |
| `HashRouter` | `src/App.jsx` | Used instead of `BrowserRouter` | GitHub Pages doesn't support SPA server-side routing; hash-based URLs (`/#/master`) work without a server |

> **If you rename the repository**, update the `base` value in `vite.config.js` to match the new repo name.

---

## Configuration Reference

### API Settings (`src/api/api.js`)

| Constant  | Description                                      |
| --------- | ------------------------------------------------ |
| `API_URL` | Your Google Apps Script web app deployment URL    |
| `API_KEY` | Shared secret key (must match backend `doPost()`) |

### Vite Settings (`vite.config.js`)

| Property       | Value                          | Description                    |
| -------------- | ------------------------------ | ------------------------------ |
| `base`         | `'/TravellingOrderEngine/'`    | Base path for GitHub Pages     |
| `server.port`  | `5173`                         | Dev server port                |
| `server.open`  | `true`                         | Auto-open browser on dev start |

---

## Security Notes

- The `API_KEY` is embedded in the frontend source and is visible to anyone inspecting the code. It provides only a basic layer of protection.
- Google Apps Script web apps deployed as "Anyone" are publicly accessible.
- For production use, consider adding Google OAuth authentication to the Apps Script backend.
- Never store truly sensitive credentials in frontend code.

---

## Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `npm run dev`      | Start Vite dev server              |
| `npm run build`    | Build production bundle to `dist/` |
| `npm run preview`  | Preview production build locally   |

---

## License

MIT

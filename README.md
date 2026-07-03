# Site Intelligence Board

A pre-site-visit investigation tool for urban design and architecture projects. Cross-references aerial and ground imagery to surface hidden site phenomena and track findings through a design workflow.

---

## Running locally

You need **Node.js 18+** installed. Download it from [nodejs.org](https://nodejs.org) if you don't have it.

```bash
# 1. Install dependencies (only needed once)
npm install

# 2. Start the local development server
npm run dev
```

Then open your browser and go to **http://localhost:5173** — the app will be running there. Changes you make to the code will update instantly in the browser.

---

## Building for production

```bash
npm run build
```

This creates a `dist/` folder containing the compiled website. That folder is what you upload or deploy.

---

## Deploying online (free options)

### Option A — Netlify (easiest, no account required for first deploy)

1. Run `npm run build` to create the `dist/` folder
2. Go to [netlify.com/drop](https://app.netlify.com/drop)
3. Drag and drop the `dist/` folder onto the page
4. Netlify gives you a live URL instantly (e.g. `https://random-name-123.netlify.app`)

To get a persistent URL and deploy updates automatically from GitHub, create a free Netlify account and connect the repo — Netlify will redeploy every time you push a change.

### Option B — Vercel (best for ongoing projects)

1. Create a free account at [vercel.com](https://vercel.com)
2. Install the Vercel CLI: `npm install -g vercel`
3. Run `vercel` in this folder and follow the prompts
4. Vercel gives you a live URL and redeploys automatically on every push

### Option C — GitHub Pages

1. Push this folder to a GitHub repository
2. In the repo settings → Pages → set source to "GitHub Actions"
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Project structure

```
site-intelligence-app/
├── index.html              ← HTML entry point
├── vite.config.js          ← Build configuration
├── package.json            ← Dependencies and scripts
├── netlify.toml            ← Netlify deployment config
├── vercel.json             ← Vercel deployment config
├── public/
│   └── favicon.svg         ← App icon
└── src/
    ├── main.jsx            ← React entry point
    ├── index.css           ← Global styles / CSS reset
    └── App.jsx             ← Main application component
```

---

## Customising for a different site

All demo data is at the top of `src/App.jsx` in the `SITE`, `DEMO_OBJ`, and `DEMO_F` constants. Edit these to change the site name, address, brief, objectives, and pre-loaded findings. The SVG site plan is inside the `SiteMap` component — replace with your own site geometry if needed.

# COT Free

Real-time Commitment of Traders (COT) data visualization for 30 futures markets across 7 sectors. Tracks institutional positioning from the CFTC's weekly reports so you can see what commercial hedgers and speculators are doing.

## Features

- **30 markets** — Metals, Energy, Agriculture, Currencies, Indices, Rates, Crypto
- **Three report types** — Legacy, Disaggregated, TFF (switch at any time)
- **COT Chart** — Commercial net, Speculator net, and Price overlay (Lightweight Charts v5)
- **Market Dashboard** — Stat cards, extreme positioning badges, week-over-week changes
- **COT Signal Score** — Composite -100 to +100 directional bias combining percentile rank, momentum, commercial–speculator divergence, and open interest trend
- **Velocity Indicators** — 2-week, 4-week, and 8-week rate-of-change for commercial positioning
- **Friday Release Hub** — Top weekly gainers and losers by positioning shift
- **Smart Analysis** — Natural-language summary with trading suggestion for each market
- **Custom Alerts** — Desktop notifications when markets hit your thresholds
- **Market Screener** — Sortable, filterable table with color-coded heatmap
- **Search** — Ctrl+K or `/` to find any market
- **Auto-refresh** — Data updates every 60 seconds (manual refresh also available)
- **Dashboard tabs** — Switch between Market view and Friday Release view
- **PWA ready** — Manifest included for standalone app experience

## Data Source

Data comes from the [CFTC Commitment of Traders reports](https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm), published weekly on Fridays at 3:30 PM ET. A GitHub Actions pipeline fetches, parses, and commits updated data automatically.

Three report types are supported:
- **Legacy** — Commercials (hedgers) vs Non-Commercials (speculators)
- **Disaggregated** — Managed Money, Producer/Merchant, Swap Dealers
- **TFF** — Asset Managers, Dealers, Leveraged Funds

## Setup

```bash
npm install
npm start
# Opens at http://localhost:8080
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start dev server on port 8080 |
| `npm run fetch-data` | Fetch latest CFTC data manually |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Deploy

### Netlify (recommended)

The `netlify.toml` and `_redirects` files are included. Connect your repo to Netlify:

1. Push to GitHub
2. In Netlify: **Add new site** → **Import from Git** → select repo
3. Build command: `npm run fetch-data` (optional — data updates automatically via GitHub Actions)
4. Publish directory: `cot-free`
5. Deploy

### GitHub Pages

A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) deploys `cot-free/` to GitHub Pages automatically on push to `master`.

## Data Pipeline

The weekly CFTC data is fetched by a scheduled GitHub Action (`.github/workflows/cftc-data-pipeline.yml`) that runs every Friday at 5 PM ET. It:

1. Downloads 3 ZIP files from CFTC.gov (Legacy, Disaggregated, TFF)
2. Parses CSV files for all tracked markets
3. Fetches current prices from Yahoo Finance
4. Outputs `data/cftc-data.json` and `data/cftc-data.js`
5. Commits and pushes the updated data

If pipeline data isn't available (e.g., local development), the app falls back to built-in mock data.

## Project Structure

```
cot-free/
├── index.html          # Main app shell
├── manifest.json       # PWA manifest
├── _redirects          # Netlify redirect rules
├── 404.html            # Fallback page
├── css/
│   └── style.css       # All styling (dark theme)
├── js/
│   ├── mock-data.js    # Fallback market data
│   ├── data.js         # Data layer, metrics, signal score
│   ├── chart.js        # Lightweight Charts integration
│   ├── screener.js     # Sortable market table
│   ├── alerts.js       # In-browser alert system
│   └── app.js          # App controller, UI logic
├── data/
│   ├── cftc-data.js    # Pipeline data (auto-generated)
│   └── cftc-data.json  # Pipeline data (auto-generated)
└── scripts/
    └── fetch-cftc-data.js  # Pipeline data fetcher
```

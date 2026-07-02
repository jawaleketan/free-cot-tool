# COT Free

**Real-time Commitment of Traders (COT) data visualization** — track what commercial hedgers, managed money, and speculators are doing across 30 futures markets.

## Features

- **30 markets** across Metals, Energy, Agriculture, Currencies, Indices, Rates, Crypto
- **Three report types**: Legacy, Disaggregated, TFF
- **COT Signal Score**: Composite -100 to +100 directional bias per market
- **Velocity indicators**: 2w, 4w, 8w positioning momentum
- **Friday Release Hub**: Top weekly movers at a glance
- **Smart Analysis**: Natural-language summary with trading suggestion
- **Custom Alerts**: Desktop notifications when markets hit your thresholds
- **Market Screener**: Sortable, filterable table with color-coded heatmap
- **COT Chart**: Commercial net, speculator net, and price overlay
- **Auto-refresh**: Data updates every 60s via CFTC pipeline
- **PWA ready**: Install as standalone app

## Quick Start

```bash
npm install
npm start
# Opens at http://localhost:8080
```

## How It Works

The CFTC publishes Commitment of Traders reports every Friday at 3:30 PM ET. A GitHub Actions pipeline fetches, parses, and commits the data automatically. The frontend reads it as static JSON — no server needed.

## Tech Stack

- Vanilla JS (no framework)
- TradingView Lightweight Charts v5
- GitHub Actions (data pipeline + deploy)
- Netlify / GitHub Pages

## Deploy

### Netlify

Connect your repo — `netlify.toml` is already configured (publish dir: `cot-free/`).

### GitHub Pages

Push to `master` — the `deploy-pages.yml` workflow handles it.

## License

MIT

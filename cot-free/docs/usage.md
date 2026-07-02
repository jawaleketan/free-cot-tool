# Usage Guide

## Dashboard

The dashboard shows detailed data for the currently selected market. It has two views toggled by the tabs at the top:

### Market View

- **Market header** — Name, symbol, category, exchange, report date
- **Signal Score** — Composite gauge (-100 to +100) with colored bar
- **Stat cards** — Commercial net, speculator net, WoW change, open interest, percentile, % of OI, price
- **Velocity cards** — 2w, 4w, 8w positioning momentum with arrows and percentages
- **COT Chart** — Three series: Commercial net (green), Speculator net (red), Price overlay (amber)
- **Analysis** — Natural-language summary with highlighted trading suggestion

### Friday Release View

Shows the top 5 markets with the largest positive and negative week-over-week positioning shifts. Click any row to jump to that market's dashboard.

## Report Types

Switch between Legacy, Disaggregated, and TFF using the toggle in the header. All data, charts, and signals update immediately.

| Report | Smart Money | Speculators |
|---|---|---|
| Legacy | Commercials (Hedgers) | Non-Commercials |
| Disaggregated | Managed Money | Producers/Merchants |
| TFF | Asset Managers | Dealers |

## Screener

The right panel lists all 30 markets. Sort by clicking any column header. Filter by category using the pill buttons at the top. Click any row to select that market.

## Signal Score

A composite directional bias score from -100 to +100:

| Range | Label | Color |
|---|---|---|
| +60 to +100 | Strong Bullish | Bright green |
| +20 to +60 | Bullish | Light green |
| -20 to +20 | Neutral | Gray |
| -60 to -20 | Bearish | Light red |
| -100 to -60 | Strong Bearish | Bright red |

Components: Percentile rank (40%), WoW momentum (30%), commercial–speculator divergence (20%), OI trend (10%).

## Alerts

Click the 🔔 bell in the header to open the alerts panel.

1. Pick a market
2. Choose a metric (Percentile, Signal Score, WoW Change, or Net Position)
3. Set a condition (≥, ≤, >, <) and threshold value
4. Click **Add Alert**

Alerts persist in your browser and are evaluated on every data refresh cycle. Desktop notifications appear when conditions trigger, debounced to once per 30 minutes per alert.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` or `/` | Focus search |
| `Escape` | Close alerts panel |

## Search

Type a market name, symbol, or category. Results update in real-time. Use the search shortcut `Ctrl+K` or `/` to focus the search bar from anywhere.

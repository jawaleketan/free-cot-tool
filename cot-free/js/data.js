/**
 * COT Free — Data Module
 * Processes COT data, computes metrics, handles filtering & sorting
 *
 * Data sources (in order of priority):
 * 1. cftc-data.js from pipeline (real CFTC data)
 * 2. mock-data.js bundled (development/demo)
 */

// Load real data if available, otherwise use mock data
let ACTIVE_DATASET = null;
let ACTIVE_DATA_SOURCE = 'loading';

function loadCOTData() {
  return new Promise((resolve) => {
    // Try to load real CFTC pipeline data first
    if (typeof CFTC_DATA !== 'undefined' && CFTC_DATA && CFTC_DATA.data) {
      ACTIVE_DATASET = CFTC_DATA.data;
      ACTIVE_DATA_SOURCE = 'cftc';
      // Merge pipeline market metadata with our market list
      if (CFTC_DATA.markets) {
        // Keep our market list but enrich with any pipeline additions
        CFTC_DATA.markets.forEach((pm) => {
          const existing = MOCK_DATA.markets.find((m) => m.cftcCode === pm.cftcCode);
          if (!existing) {
            MOCK_DATA.markets.push(pm);
          }
        });
      }
      console.log(`📊 COT Free: loaded real CFTC data (${Object.keys(ACTIVE_DATASET).length} markets)`);
      resolve(true);
    }
    // Fall back to mock data
    else if (typeof MOCK_COT_DATASET !== 'undefined') {
      ACTIVE_DATASET = MOCK_COT_DATASET;
      ACTIVE_DATA_SOURCE = 'mock';
      console.log('📊 COT Free: using mock data (no CFTC pipeline data found)');
      resolve(true);
    } else {
      console.error('📊 COT Free: no data source available');
      resolve(false);
    }
  });
}

// Compute net position
function computeNet(long, short) {
  return long - short;
}

// Compute percentile rank
function computePercentile(values, value) {
  if (!values || values.length === 0) return 50;
  const count = values.filter((v) => v < value).length;
  return Math.round((count / values.length) * 100);
}

// Compute week-over-week change
function computeWoW(current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return { absolute: 0, percent: 0 };
  }
  const abs = current - previous;
  const pct = previous !== 0 ? (abs / Math.abs(previous)) * 100 : 0;
  return { absolute: abs, percent: Math.round(pct * 10) / 10 };
}

// Get data for a specific report type from a history entry
function getReportData(entry, reportType) {
  if (!entry) return null;
  switch (reportType) {
    case 'legacy':
      return entry.legacy;
    case 'disaggregated':
      return entry.disaggregated;
    case 'tff':
      return entry.tff;
    default:
      return entry.legacy;
  }
}

// Extract category (commercial/managed money/asset manager) net from a report data entry
function getCategoryNetFromData(d, reportType) {
  if (!d) return null;
  switch (reportType) {
    case 'legacy':
      return computeNet(d.commercial?.long || 0, d.commercial?.short || 0);
    case 'disaggregated':
      return computeNet(d.managedMoney?.long || 0, d.managedMoney?.short || 0);
    case 'tff':
      return computeNet(d.assetManager?.long || 0, d.assetManager?.short || 0);
    default:
      return 0;
  }
}

function getNonCategoryNetFromData(d, reportType) {
  if (!d) return null;
  switch (reportType) {
    case 'legacy':
      return computeNet(d.nonCommercial?.long || 0, d.nonCommercial?.short || 0);
    case 'disaggregated':
      return computeNet(d.producerMerchant?.long || 0, d.producerMerchant?.short || 0);
    case 'tff':
      return computeNet(d.dealer?.long || 0, d.dealer?.short || 0);
    default:
      return 0;
  }
}

// Compute all metrics for a market given a report type
function computeMarketMetrics(marketId, reportType = 'legacy') {
  const history = ACTIVE_DATASET ? ACTIVE_DATASET[marketId] : null;
  if (!history || history.length === 0) return null;

  const current = history[0];
  const previous = history.length >= 2 ? history[1] : null;
  const market = MOCK_DATA.markets.find((m) => m.id === marketId);

  const curData = getReportData(current, reportType);
  if (!curData) return null;

  const prevData = previous ? getReportData(previous, reportType) : null;

  // Extract category positions (varies by report type)
  let catLong, catShort, nonCatLong, nonCatShort, otherLong, otherShort;
  let prevCatLong, prevCatShort;

  switch (reportType) {
    case 'legacy':
      catLong = curData.commercial?.long || 0;
      catShort = curData.commercial?.short || 0;
      nonCatLong = curData.nonCommercial?.long || 0;
      nonCatShort = curData.nonCommercial?.short || 0;
      otherLong = curData.nonReportable?.long || 0;
      otherShort = curData.nonReportable?.short || 0;
      if (prevData) {
        prevCatLong = prevData.commercial?.long || 0;
        prevCatShort = prevData.commercial?.short || 0;
      }
      break;
    case 'disaggregated':
      catLong = curData.managedMoney?.long || 0;
      catShort = curData.managedMoney?.short || 0;
      nonCatLong = curData.producerMerchant?.long || 0;
      nonCatShort = curData.producerMerchant?.short || 0;
      otherLong = curData.swapDealers?.long || 0;
      otherShort = curData.swapDealers?.short || 0;
      if (prevData) {
        prevCatLong = prevData.managedMoney?.long || 0;
        prevCatShort = prevData.managedMoney?.short || 0;
      }
      break;
    case 'tff':
      catLong = curData.assetManager?.long || 0;
      catShort = curData.assetManager?.short || 0;
      nonCatLong = curData.dealer?.long || 0;
      nonCatShort = curData.dealer?.short || 0;
      otherLong = curData.leveragedFunds?.long || 0;
      otherShort = curData.leveragedFunds?.short || 0;
      if (prevData) {
        prevCatLong = prevData.assetManager?.long || 0;
        prevCatShort = prevData.assetManager?.short || 0;
      }
      break;
    default:
      catLong = catShort = nonCatLong = nonCatShort = otherLong = otherShort = 0;
  }

  const categoryNet = computeNet(catLong, catShort);
  const nonCategoryNet = computeNet(nonCatLong, nonCatShort);
  const otherNet = computeNet(otherLong, otherShort);
  const totalOI = current.openInterest || 0;
  const prevOI = previous ? previous.openInterest : null;
  const price = current.price || 0;
  const prevCategoryNet = prevCatLong !== undefined ? computeNet(prevCatLong, prevCatShort) : null;

  const wow = computeWoW(categoryNet, prevCategoryNet);
  const oiWoW = computeWoW(totalOI, prevOI);

  // Historical net positions for percentile
  const categoryNets = history.map((w) => getCategoryNetFromData(getReportData(w, reportType), reportType) || 0);
  const nonCategoryNets = history.map((w) => getNonCategoryNetFromData(getReportData(w, reportType), reportType) || 0);

  const percentile = computePercentile(categoryNets, categoryNet);
  const signalScore = computeSignalScore({
    categoryNet,
    nonCategoryNet,
    categoryWoW: wow,
    categoryPercentile: percentile,
    oiWoW,
    openInterest: totalOI,
  });

  // Velocity: rate of change over 2, 4, and 8 weeks
  const velocities = {};
  [2, 4, 8].forEach((weeks) => {
    if (history.length > weeks) {
      const pastEntry = getReportData(history[weeks], reportType);
      const pastNet = getCategoryNetFromData(pastEntry, reportType);
      if (pastNet !== null && pastNet !== undefined) {
        const abs = categoryNet - pastNet;
        const pct = pastNet !== 0 ? (abs / Math.abs(pastNet)) * 100 : 0;
        velocities[weeks + 'w'] = { absolute: abs, percent: Math.round(pct * 10) / 10 };
      }
    }
  });

  return {
    market: market || { id: marketId, symbol: '?', name: marketId, category: 'Other' },
    reportDate: current.reportDate || 'Unknown',
    price,
    openInterest: totalOI,
    categoryNet,
    nonCategoryNet,
    otherNet,
    categoryWoW: wow,
    velocities,
    oiWoW,
    categoryPercentile: percentile,
    nonCategoryPercentile: computePercentile(nonCategoryNets, nonCategoryNet),
    categoryPctOfOI: totalOI > 0 ? Math.round((Math.abs(categoryNet) / totalOI) * 1000) / 10 : 0,
    signalScore,
    dataSource: ACTIVE_DATA_SOURCE,
  };
}

function computeSignalScore(m) {
  // 1. Percentile Score (40%) — maps 0-100 to -100 to +100
  const pctileScore = ((m.categoryPercentile - 50) / 50) * 100;

  // 2. Momentum Score (30%) — WoW % change capped at ±50%, maps to -100 to +100
  const cappedWoW = Math.max(-50, Math.min(50, m.categoryWoW.percent));
  const momentumScore = (cappedWoW / 50) * 100;

  // 3. Divergence Score (20%) — commercials vs speculators opposite sides
  const opposite =
    (m.categoryNet > 0 && m.nonCategoryNet < 0) ||
    (m.categoryNet < 0 && m.nonCategoryNet > 0);
  const divergenceScore = opposite
    ? (m.categoryNet > 0 ? 100 : -100)
    : 0;

  // 4. OI Trend Score (10%) — OI growing confirms trend
  let oiScore = 0;
  if (m.openInterest > 0) {
    const oiPct = m.oiWoW.percent;
    if (m.categoryNet > 0 && oiPct > 0) oiScore = 50;
    else if (m.categoryNet > 0 && oiPct < 0) oiScore = -25;
    else if (m.categoryNet < 0 && oiPct > 0) oiScore = -50;
    else if (m.categoryNet < 0 && oiPct < 0) oiScore = 25;
  }

  const raw = pctileScore * 0.4 + momentumScore * 0.3 + divergenceScore * 0.2 + oiScore * 0.1;
  const score = Math.round(Math.max(-100, Math.min(100, raw)));

  return score;
}

// Get all markets with their current metrics (for screener)
function getAllMarketMetrics(reportType = 'legacy') {
  return MOCK_DATA.markets.map((m) => computeMarketMetrics(m.id, reportType)).filter(Boolean);
}

// Search markets by name or symbol
function searchMarkets(query) {
  if (!query || query.trim().length === 0) return MOCK_DATA.markets;
  const q = query.toLowerCase().trim();
  return MOCK_DATA.markets.filter(
    (m) =>
      m.name.toLowerCase().includes(q) || m.symbol.toLowerCase().includes(q) || m.category.toLowerCase().includes(q),
  );
}

// Get history data for charting
function getChartData(marketId, reportType = 'legacy', series = 'category') {
  const history = ACTIVE_DATASET ? ACTIVE_DATASET[marketId] : null;
  if (!history) return [];

  // Lightweight Charts requires ascending chronological order (oldest first)
  return history
    .slice()
    .reverse()
    .map((w) => {
      const d = getReportData(w, reportType);
      if (!d) return { time: new Date(w.reportDate + 'T00:00:00').getTime() / 1000, value: 0 };

      let net;
      switch (reportType) {
        case 'legacy':
          net =
            series === 'category'
              ? computeNet(d.commercial?.long || 0, d.commercial?.short || 0)
              : computeNet(d.nonCommercial?.long || 0, d.nonCommercial?.short || 0);
          break;
        case 'disaggregated':
          net =
            series === 'category'
              ? computeNet(d.managedMoney?.long || 0, d.managedMoney?.short || 0)
              : computeNet(d.producerMerchant?.long || 0, d.producerMerchant?.short || 0);
          break;
        case 'tff':
          net =
            series === 'category'
              ? computeNet(d.assetManager?.long || 0, d.assetManager?.short || 0)
              : computeNet(d.dealer?.long || 0, d.dealer?.short || 0);
          break;
        default:
          net = 0;
      }
      return { time: new Date(w.reportDate + 'T00:00:00').getTime() / 1000, value: net };
    });
}

// Get price history for overlay
function getPriceHistory(marketId) {
  const history = ACTIVE_DATASET ? ACTIVE_DATASET[marketId] : null;
  if (!history) return [];
  // Lightweight Charts requires ascending chronological order (oldest first)
  return history
    .slice()
    .reverse()
    .map((w) => ({ time: new Date(w.reportDate + 'T00:00:00').getTime() / 1000, value: w.price || 100 }));
}

// Initialize data on load (synchronous — both globals are defined before this script runs)
loadCOTData().then(() => {
  setLastUpdated();
});

// Track when data was last refreshed
let lastUpdated = Date.now();

function setLastUpdated() {
  lastUpdated = Date.now();
  const el = document.getElementById('data-status');
  if (el) {
    const elapsed = Math.floor((Date.now() - lastUpdated) / 1000);
    if (elapsed < 60) {
      el.textContent = ACTIVE_DATA_SOURCE === 'cftc' ? 'live' : 'mock';
      el.className = 'data-status live';
    } else {
      const mins = Math.floor(elapsed / 60);
      el.textContent = `${mins}m ago`;
      el.className = 'data-status';
    }
  }
}

// Refresh data by fetching the latest pipeline-generated JSON
async function refreshData() {
  try {
    const resp = await fetch('data/cftc-data.json?' + Date.now());
    if (!resp.ok) return false;
    const json = await resp.json();
    if (!json.data || Object.keys(json.data).length === 0) return false;

    ACTIVE_DATASET = json.data;
    ACTIVE_DATA_SOURCE = 'cftc';

    // Enrich market list with any new pipeline additions
    if (json.markets) {
      json.markets.forEach((pm) => {
        const existing = MOCK_DATA.markets.find((m) => m.cftcCode === pm.cftcCode);
        if (!existing) MOCK_DATA.markets.push(pm);
      });
    }

    setLastUpdated();
    return true;
  } catch {
    return false;
  }
}

// Export data source for debugging
window.__COT_DATA_SOURCE = ACTIVE_DATA_SOURCE;

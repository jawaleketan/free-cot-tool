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
        CFTC_DATA.markets.forEach(pm => {
          const existing = MOCK_DATA.markets.find(m => m.cftcCode === pm.cftcCode);
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
  const count = values.filter(v => v < value).length;
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
    case 'legacy': return entry.legacy;
    case 'disaggregated': return entry.disaggregated;
    case 'tff': return entry.tff;
    default: return entry.legacy;
  }
}

// Compute all metrics for a market given a report type
function computeMarketMetrics(marketId, reportType = 'legacy') {
  const history = ACTIVE_DATASET ? ACTIVE_DATASET[marketId] : null;
  if (!history || history.length === 0) return null;

  const current = history[history.length - 1];
  const previous = history.length >= 2 ? history[history.length - 2] : null;
  const market = MOCK_DATA.markets.find(m => m.id === marketId);

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
  const price = current.price || 0;
  const prevCategoryNet = prevCatLong !== undefined ? computeNet(prevCatLong, prevCatShort) : null;

  const wow = computeWoW(categoryNet, prevCategoryNet);

  // Historical net positions for percentile
  const categoryNets = history.map(w => {
    const d = getReportData(w, reportType);
    if (!d) return 0;
    switch (reportType) {
      case 'legacy': return computeNet(d.commercial?.long || 0, d.commercial?.short || 0);
      case 'disaggregated': return computeNet(d.managedMoney?.long || 0, d.managedMoney?.short || 0);
      case 'tff': return computeNet(d.assetManager?.long || 0, d.assetManager?.short || 0);
      default: return 0;
    }
  });

  const nonCategoryNets = history.map(w => {
    const d = getReportData(w, reportType);
    if (!d) return 0;
    switch (reportType) {
      case 'legacy': return computeNet(d.nonCommercial?.long || 0, d.nonCommercial?.short || 0);
      case 'disaggregated': return computeNet(d.producerMerchant?.long || 0, d.producerMerchant?.short || 0);
      case 'tff': return computeNet(d.dealer?.long || 0, d.dealer?.short || 0);
      default: return 0;
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
    categoryPercentile: computePercentile(categoryNets, categoryNet),
    nonCategoryPercentile: computePercentile(nonCategoryNets, nonCategoryNet),
    categoryPctOfOI: totalOI > 0 ? Math.round((Math.abs(categoryNet) / totalOI) * 1000) / 10 : 0,
    dataSource: ACTIVE_DATA_SOURCE,
  };
}

// Get all markets with their current metrics (for screener)
function getAllMarketMetrics(reportType = 'legacy') {
  return MOCK_DATA.markets
    .map(m => computeMarketMetrics(m.id, reportType))
    .filter(Boolean);
}

// Search markets by name or symbol
function searchMarkets(query) {
  if (!query || query.trim().length === 0) return MOCK_DATA.markets;
  const q = query.toLowerCase().trim();
  return MOCK_DATA.markets.filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.symbol.toLowerCase().includes(q) ||
    m.category.toLowerCase().includes(q)
  );
}

// Get history data for charting
function getChartData(marketId, reportType = 'legacy', series = 'category') {
  const history = ACTIVE_DATASET ? ACTIVE_DATASET[marketId] : null;
  if (!history) return [];

  return history.map(w => {
    const d = getReportData(w, reportType);
    if (!d) return { time: w.reportDate, value: 0 };

    let net;
    switch (reportType) {
      case 'legacy':
        net = series === 'category'
          ? computeNet(d.commercial?.long || 0, d.commercial?.short || 0)
          : computeNet(d.nonCommercial?.long || 0, d.nonCommercial?.short || 0);
        break;
      case 'disaggregated':
        net = series === 'category'
          ? computeNet(d.managedMoney?.long || 0, d.managedMoney?.short || 0)
          : computeNet(d.producerMerchant?.long || 0, d.producerMerchant?.short || 0);
        break;
      case 'tff':
        net = series === 'category'
          ? computeNet(d.assetManager?.long || 0, d.assetManager?.short || 0)
          : computeNet(d.dealer?.long || 0, d.dealer?.short || 0);
        break;
      default:
        net = 0;
    }
    return { time: w.reportDate, value: net };
  });
}

// Get price history for overlay
function getPriceHistory(marketId) {
  const history = ACTIVE_DATASET ? ACTIVE_DATASET[marketId] : null;
  if (!history) return [];
  return history.map(w => ({ time: w.reportDate, value: w.price || 100 }));
}

// Initialize data on load (synchronous — both globals are defined before this script runs)
loadCOTData();

// Export data source for debugging
window.__COT_DATA_SOURCE = ACTIVE_DATA_SOURCE;

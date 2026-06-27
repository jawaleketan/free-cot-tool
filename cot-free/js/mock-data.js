/**
 * COT Free — Mock Data
 * Realistic sample COT data for development & demo
 * Format matches CFTC Legacy, Disaggregated, and TFF report types
 */
const MOCK_DATA = {
  markets: [
    { id: 'gold', symbol: 'GC', name: 'Gold', category: 'Metal', exchange: 'COMEX', cftcCode: '088691' },
    { id: 'silver', symbol: 'SI', name: 'Silver', category: 'Metal', exchange: 'COMEX', cftcCode: '084691' },
    { id: 'crude-oil', symbol: 'CL', name: 'Crude Oil (WTI)', category: 'Energy', exchange: 'NYMEX', cftcCode: '06765A' },
    { id: 'natural-gas', symbol: 'NG', name: 'Natural Gas', category: 'Energy', exchange: 'NYMEX', cftcCode: '023651' },
    { id: 'copper', symbol: 'HG', name: 'Copper', category: 'Metal', exchange: 'COMEX', cftcCode: '085692' },
    { id: 'corn', symbol: 'C', name: 'Corn', category: 'Agriculture', exchange: 'CBOT', cftcCode: '002602' },
    { id: 'wheat', symbol: 'W', name: 'Wheat', category: 'Agriculture', exchange: 'CBOT', cftcCode: '001602' },
    { id: 'soybeans', symbol: 'S', name: 'Soybeans', category: 'Agriculture', exchange: 'CBOT', cftcCode: '005602' },
    { id: 'coffee', symbol: 'KC', name: 'Coffee', category: 'Agriculture', exchange: 'ICE-US', cftcCode: '083731' },
    { id: 'sugar', symbol: 'SB', name: 'Sugar', category: 'Agriculture', exchange: 'ICE-US', cftcCode: '080732' },
    { id: 'cotton', symbol: 'CT', name: 'Cotton', category: 'Agriculture', exchange: 'ICE-US', cftcCode: '033661' },
    { id: 'live-cattle', symbol: 'LC', name: 'Live Cattle', category: 'Agriculture', exchange: 'CME', cftcCode: '057642' },
    { id: 'lean-hogs', symbol: 'LH', name: 'Lean Hogs', category: 'Agriculture', exchange: 'CME', cftcCode: '054642' },
    { id: 'euro-fx', symbol: '6E', name: 'Euro FX', category: 'Currency', exchange: 'CME', cftcCode: '099741' },
    { id: 'british-pound', symbol: '6B', name: 'British Pound', category: 'Currency', exchange: 'CME', cftcCode: '096742' },
    { id: 'japanese-yen', symbol: '6J', name: 'Japanese Yen', category: 'Currency', exchange: 'CME', cftcCode: '097741' },
    { id: 'australian-dollar', symbol: '6A', name: 'Australian Dollar', category: 'Currency', exchange: 'CME', cftcCode: '232741' },
    { id: 'canadian-dollar', symbol: '6C', name: 'Canadian Dollar', category: 'Currency', exchange: 'CME', cftcCode: '090741' },
    { id: 'swiss-franc', symbol: '6S', name: 'Swiss Franc', category: 'Currency', exchange: 'CME', cftcCode: '092741' },
    { id: 'sp500', symbol: 'ES', name: 'S&P 500 E-Mini', category: 'Index', exchange: 'CME', cftcCode: '13874A' },
    { id: 'nasdaq', symbol: 'NQ', name: 'Nasdaq 100 E-Mini', category: 'Index', exchange: 'CME', cftcCode: '20974+' },
    { id: 'dow-jones', symbol: 'YM', name: 'Dow Jones E-Mini', category: 'Index', exchange: 'CBOT', cftcCode: '124603' },
    { id: 'russell2000', symbol: 'RTY', name: 'Russell 2000 E-Mini', category: 'Index', exchange: 'ICE-US', cftcCode: '239742' },
    { id: 'vix', symbol: 'VX', name: 'VIX', category: 'Index', exchange: 'CFE', cftcCode: '1170E1' },
    { id: 'ten-year-note', symbol: 'ZN', name: '10-Year T-Note', category: 'Rate', exchange: 'CBOT', cftcCode: '043602' },
    { id: 'thirty-year-bond', symbol: 'ZB', name: '30-Year T-Bond', category: 'Rate', exchange: 'CBOT', cftcCode: '020601' },
    { id: 'five-year-note', symbol: 'ZF', name: '5-Year T-Note', category: 'Rate', exchange: 'CBOT', cftcCode: '044601' },
    { id: 'two-year-note', symbol: 'ZT', name: '2-Year T-Note', category: 'Rate', exchange: 'CBOT', cftcCode: '042601' },
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', category: 'Crypto', exchange: 'CME', cftcCode: '133741' },
    { id: 'ether', symbol: 'ETH', name: 'Ether', category: 'Crypto', exchange: 'CME', cftcCode: '146021' },
  ],
};

// Helper: seeded pseudo-random for reproducible yet varied data
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Generate realistic COT position data for a market
function generateCOTData(marketIndex) {
  const rand = seededRandom(marketIndex * 1337 + 42);
  const r = () => rand();

  // Base open interest varies by market category
  const baseOI = [800000, 400000, 2500000, 500000, 300000, 2500000, 800000, 1500000, 400000, 1200000, 350000,
    500000, 400000, 1200000, 600000, 800000, 500000, 600000, 400000, 4000000, 2500000, 500000, 1200000,
    800000, 4000000, 1500000, 3000000, 2500000, 300000, 200000][marketIndex];
  const openInterest = Math.round(baseOI * (0.8 + r() * 0.4));

  // Generate 20 weeks of history for WoW/percentile calculations
  const weeks = 20;
  const history = [];

  for (let w = 0; w < weeks; w++) {
    const weekFactor = 1 + Math.sin(w * 0.3) * 0.15 + (r() - 0.5) * 0.1;
    const currentOI = Math.round(openInterest * (0.85 + r() * 0.3));

    // Legacy report
    const legacyCommLong = Math.round(currentOI * (0.25 + r() * 0.15));
    const legacyCommShort = Math.round(currentOI * (0.15 + r() * 0.10));
    const legacyNonCommLong = Math.round(currentOI * (0.12 + r() * 0.10));
    const legacyNonCommShort = Math.round(currentOI * (0.20 + r() * 0.12));
    const legacyNonRepLong = Math.round(currentOI * (0.03 + r() * 0.04));
    const legacyNonRepShort = Math.round(currentOI * (0.03 + r() * 0.04));

    // Disaggregated report
    const disaggProdMerchLong = Math.round(currentOI * (0.20 + r() * 0.12));
    const disaggProdMerchShort = Math.round(currentOI * (0.12 + r() * 0.10));
    const disaggSwapLong = Math.round(currentOI * (0.08 + r() * 0.06));
    const disaggSwapShort = Math.round(currentOI * (0.06 + r() * 0.05));
    const disaggManagedMoneyLong = Math.round(currentOI * (0.10 + r() * 0.08));
    const disaggManagedMoneyShort = Math.round(currentOI * (0.15 + r() * 0.10));
    const disaggOtherReportableLong = Math.round(currentOI * (0.04 + r() * 0.03));
    const disaggOtherReportableShort = Math.round(currentOI * (0.04 + r() * 0.03));

    // TFF report (financial futures only — placeholder for non-financial)
    const tffDealerLong = Math.round(currentOI * (0.08 + r() * 0.06));
    const tffDealerShort = Math.round(currentOI * (0.10 + r() * 0.07));
    const tffAssetManagerLong = Math.round(currentOI * (0.12 + r() * 0.08));
    const tffAssetManagerShort = Math.round(currentOI * (0.08 + r() * 0.06));
    const tffLeveragedFundsLong = Math.round(currentOI * (0.06 + r() * 0.05));
    const tffLeveragedFundsShort = Math.round(currentOI * (0.10 + r() * 0.07));

    // Price (varies by market)
    const basePrice = [2350, 28, 78, 2.5, 4.2, 4.5, 5.5, 12, 2.0, 0.22, 0.65, 185, 85, 1.08, 1.28, 0.007, 0.65, 1.35, 0.92,
      5500, 18500, 38500, 2050, 15, 110, 118, 108, 102, 62000, 3400][marketIndex];
    const price = Math.round(basePrice * (0.92 + r() * 0.16) * 100) / 100;

    history.push({
      week: `2026-W${String(w + 8).padStart(2, '0')}`,
      reportDate: new Date(2026, 1, 3 + w * 7).toISOString().slice(0, 10),
      openInterest: currentOI,
      price,
      legacy: {
        commercial: { long: legacyCommLong, short: legacyCommShort },
        nonCommercial: { long: legacyNonCommLong, short: legacyNonCommShort },
        nonReportable: { long: legacyNonRepLong, short: legacyNonRepShort },
      },
      disaggregated: {
        producerMerchant: { long: disaggProdMerchLong, short: disaggProdMerchShort },
        swapDealers: { long: disaggSwapLong, short: disaggSwapShort },
        managedMoney: { long: disaggManagedMoneyLong, short: disaggManagedMoneyShort },
        otherReportable: { long: disaggOtherReportableLong, short: disaggOtherReportableShort },
      },
      tff: {
        dealer: { long: tffDealerLong, short: tffDealerShort },
        assetManager: { long: tffAssetManagerLong, short: tffAssetManagerShort },
        leveragedFunds: { long: tffLeveragedFundsLong, short: tffLeveragedFundsShort },
      },
    });
  }

  return history;
}

// Build full mock dataset
const MOCK_COT_DATASET = {};
MOCK_DATA.markets.forEach((market, i) => {
  MOCK_COT_DATASET[market.id] = generateCOTData(i);
});

// Utility to get current (most recent) week data for a market
function getCurrentWeek(marketId) {
  const history = MOCK_COT_DATASET[marketId];
  if (!history || history.length === 0) return null;
  return history[history.length - 1];
}

// Utility to get previous week data
function getPrevWeek(marketId) {
  const history = MOCK_COT_DATASET[marketId];
  if (!history || history.length < 2) return null;
  return history[history.length - 2];
}

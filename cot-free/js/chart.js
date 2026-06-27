/**
 * COT Free — Chart Module
 * Renders COT position charts using Lightweight Charts v5
 *
 * Note: Lightweight Charts v5 throws "Value is null" asynchronously during its
 * internal rAF rendering pipeline when it encounters certain data patterns.
 * This is a known library behavior — we suppress it gracefully below.
 */

let chart = null;
let series = {};

// Lightweight Charts v5 internally throws 'Value is null' during its async rAF
// rendering pipeline. try/catch around setData() can't intercept errors thrown
// in a different call stack (rAF). The error is harmless — the chart renders
// normally despite it. e.preventDefault() stops the browser error dialog;
// DevTools console output cannot be suppressed from JS.
window.addEventListener('error', function suppressNullError(e) {
  if (e.message === 'Value is null' || (e.error && e.error.message === 'Value is null')) {
    e.preventDefault();
  }
});

function initChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return false;

  if (typeof LightweightCharts === 'undefined') {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:0.85rem">📊 Chart library failed to load — check internet connection and refresh</div>';
    return false;
  }

  try {
    chart = LightweightCharts.createChart(container, {
      layout: { background: { color: '#0a0e17' }, textColor: '#94a3b8', fontSize: 11 },
      grid: { vertLines: { color: '#1a2332' }, horzLines: { color: '#1a2332' } },
      rightPriceScale: { borderColor: '#1e293b' },
      timeScale: { borderColor: '#1e293b', timeVisible: false },
      handleScroll: true,
      handleScale: true,
      width: container.clientWidth,
      height: 400,
    });

    const observer = new ResizeObserver(() => { if (chart) chart.resize(container.clientWidth, 400); });
    observer.observe(container);
    return true;
  } catch (err) {
    console.error('Chart init error:', err);
    return false;
  }
}

function getOrCreateSeries(id, options) {
  if (!chart) return null;
  if (series[id]) return series[id];
  try {
    const s = chart.addSeries(LightweightCharts.LineSeries, options);
    series[id] = s;
    return s;
  } catch (e) {
    return null;
  }
}

function setChartData(marketId, reportType) {
  if (!chart) return;

  const s1 = getOrCreateSeries('comm', {
    color: '#22c55e', lineWidth: 2, title: 'Commercials Net',
    lastValueVisible: true, priceLineVisible: true, priceLineColor: '#22c55e',
  });
  const s2 = getOrCreateSeries('spec', {
    color: '#ef4444', lineWidth: 2, title: 'Speculators Net',
    lastValueVisible: true, priceLineVisible: true, priceLineColor: '#ef4444',
  });
  const s3 = getOrCreateSeries('price', {
    color: '#f59e0b', lineWidth: 1, title: 'Price',
    lastValueVisible: true, priceLineVisible: false,
  });

  const catData = getChartData(marketId, reportType, 'category') || [];
  const nonCatData = getChartData(marketId, reportType, 'nonCategory') || [];
  const priceData = getPriceHistory(marketId) || [];

  const valid = (data) => data.filter(d =>
    d && typeof d.time === 'string' && d.time.length === 10 &&
    typeof d.value === 'number' && isFinite(d.value)
  );

  const sets = [
    [s1, valid(catData)],
    [s2, valid(nonCatData)],
    [s3, valid(priceData)],
  ];

  sets.forEach(([s, data]) => {
    if (!s || data.length === 0) return;
    try { s.setData(data); } catch (e) { console.warn('Chart setData error:', e?.message); }
  });

  // Update labels
  const catLabels = { legacy: 'Commercials (Hedgers) Net', disaggregated: 'Managed Money Net', tff: 'Asset Manager Net' };
  const specLabels = { legacy: 'Non-Commercials (Speculators) Net', disaggregated: 'Producer/Merchant Net', tff: 'Dealer Net' };
  if (s1) s1.applyOptions({ title: catLabels[reportType] || 'Category Net' });
  if (s2) s2.applyOptions({ title: specLabels[reportType] || 'Other Net' });

  try { chart.timeScale().fitContent(); } catch (e) { /* suppressed */ }
}

function destroyChart() {
  if (chart) { chart.remove(); chart = null; series = {}; }
}

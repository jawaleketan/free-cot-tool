/**
 * COT Free — Chart Module
 * Renders COT position charts and price overlay using Lightweight Charts v5
 */
let chart = null;
let netPositionSeries = null;
let nonCategorySeries = null;
let priceSeries = null;

function initChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return false;

  if (typeof LightweightCharts === 'undefined') {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:0.85rem">📊 Chart library failed to load — check internet connection and refresh</div>';
    return false;
  }

  try {
    chart = LightweightCharts.createChart(container, {
      layout: {
        background: { color: '#0a0e17' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a2332' },
        horzLines: { color: '#1a2332' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: '#22c55e', width: 1, style: LightweightCharts.LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        textColor: '#94a3b8',
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: false,
        tickMarkFormatter: (time) => {
          const d = new Date(time + 'T00:00:00');
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },
      },
      handleScroll: true,
      handleScale: true,
      width: container.clientWidth,
      height: 400,
    });

    // In v5, use addSeries(SeriesType, options)
    netPositionSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#22c55e',
      lineWidth: 2,
      title: 'Commercial / Managed Money Net',
      priceFormat: { type: 'volume', precision: 0 },
      crosshairMarker: { visible: true, radius: 4 },
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineColor: '#22c55e',
    });

    nonCategorySeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#ef4444',
      lineWidth: 2,
      title: 'Non-Commercial / Speculator Net',
      priceFormat: { type: 'volume', precision: 0 },
      crosshairMarker: { visible: true, radius: 4 },
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineColor: '#ef4444',
    });

    priceSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      title: 'Price',
      priceFormat: { type: 'price', precision: 2 },
      crosshairMarker: { visible: true, radius: 3 },
      lastValueVisible: true,
      priceLineVisible: false,
    });

    // Handle resize
    const observer = new ResizeObserver(() => {
      if (chart) {
        chart.resize(container.clientWidth, 400);
      }
    });
    observer.observe(container);

    return true;
  } catch (err) {
    console.error('Chart init error:', err);
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:0.85rem">⚠️ Chart failed to initialize</div>';
    return false;
  }
}

function updateChart(marketId, reportType) {
  if (!chart || !netPositionSeries || !nonCategorySeries || !priceSeries) return;

  // Safety filter: Lightweight Charts throws if any value or time is null
  const safe = (data) => (data || []).filter(d => d != null && d.value != null && d.time != null);

  const catData = safe(getChartData(marketId, reportType, 'category'));
  const nonCatData = safe(getChartData(marketId, reportType, 'nonCategory'));
  const priceData = safe(getPriceHistory(marketId));

  if (catData.length > 0) netPositionSeries.setData(catData);
  if (nonCatData.length > 0) nonCategorySeries.setData(nonCatData);
  if (priceData.length > 0) priceSeries.setData(priceData);

  // Update series titles based on report type
  const catLabels = {
    legacy: 'Commercials (Hedgers) Net',
    disaggregated: 'Managed Money Net',
    tff: 'Asset Manager Net',
  };
  const nonCatLabels = {
    legacy: 'Non-Commercials (Speculators) Net',
    disaggregated: 'Producer/Merchant Net',
    tff: 'Dealer Net',
  };

  netPositionSeries.applyOptions({ title: catLabels[reportType] || 'Category Net' });
  nonCategorySeries.applyOptions({ title: nonCatLabels[reportType] || 'Other Net' });

  chart.timeScale().fitContent();
}

function destroyChart() {
  if (chart) {
    chart.remove();
    chart = null;
    netPositionSeries = null;
    nonCategorySeries = null;
    priceSeries = null;
  }
}

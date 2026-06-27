/**
 * COT Free — Main Application Controller
 * Handles search, market selection, report type switching, and UI state
 */
let selectedMarketId = 'gold';
let activeReportType = 'legacy';

function initApp() {
  // Chart init can fail gracefully (CDN issue, version mismatch)
  // — the rest of the app still loads
  try { initChart('chart-container'); } catch (e) { console.warn('Chart init skipped:', e); }
  renderScreener(activeReportType);
  selectMarket(selectedMarketId);
  initSearch();
  initReportToggle();
  updateActiveStyles();
}

function selectMarket(marketId) {
  selectedMarketId = marketId;
  const market = MOCK_DATA.markets.find(m => m.id === marketId);
  if (!market) return;

  updateMarketDashboard(market);
  updateChart(marketId, activeReportType);

  // Highlight selected row in screener
  document.querySelectorAll('.screener-row').forEach(r => {
    r.classList.toggle('selected', r.dataset.market === marketId);
  });
}

function updateMarketDashboard(market) {
  const metrics = computeMarketMetrics(market.id, activeReportType);
  if (!metrics) return;

  document.getElementById('market-title').textContent = `${market.name} (${market.symbol})`;
  document.getElementById('market-category').textContent = market.category;
  document.getElementById('market-exchange').textContent = market.exchange;
  document.getElementById('report-date').textContent = `Report: ${metrics.reportDate}`;

  // Stat cards
  const netColor = metrics.categoryNet >= 0 ? '#22c55e' : '#ef4444';
  const netSign = metrics.categoryNet >= 0 ? '+' : '';

  document.getElementById('stat-net-position').innerHTML = `
    <span class="stat-value" style="color: ${netColor}">${netSign}${formatNumber(metrics.categoryNet)}</span>
    <span class="stat-label">Commercial / Managed Money Net</span>
  `;

  document.getElementById('stat-noncomm-net').innerHTML = `
    <span class="stat-value">${formatNumber(metrics.nonCategoryNet)}</span>
    <span class="stat-label">Speculators / Producers Net</span>
  `;

  const wowColor = metrics.categoryWoW.absolute >= 0 ? '#22c55e' : '#ef4444';
  document.getElementById('stat-wow').innerHTML = `
    <span class="stat-value" style="color: ${wowColor}">
      ${metrics.categoryWoW.absolute >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(metrics.categoryWoW.absolute))}
      <span class="stat-pct">(${metrics.categoryWoW.percent >= 0 ? '+' : ''}${metrics.categoryWoW.percent}%)</span>
    </span>
    <span class="stat-label">WoW Change</span>
  `;

  document.getElementById('stat-open-interest').innerHTML = `
    <span class="stat-value">${formatNumber(metrics.openInterest)}</span>
    <span class="stat-label">Open Interest</span>
  `;

  document.getElementById('stat-percentile').innerHTML = `
    <span class="stat-value">${metrics.categoryPercentile}/100</span>
    <span class="stat-label">52-Week Percentile</span>
  `;

  document.getElementById('stat-pct-oi').innerHTML = `
    <span class="stat-value">${metrics.categoryPctOfOI}%</span>
    <span class="stat-label">Net % of OI</span>
  `;

  // Price
  document.getElementById('stat-price').innerHTML = `
    <span class="stat-value">$${metrics.price.toFixed(2)}</span>
    <span class="stat-label">Current Price</span>
  `;

  // Extreme positioning badge
  const badge = document.getElementById('extreme-badge');
  if (metrics.categoryPercentile >= 90) {
    badge.innerHTML = '<span class="badge-extreme-long">🔥 Extreme Long — Smart money heavily positioned long</span>';
    badge.style.display = 'block';
  } else if (metrics.categoryPercentile <= 10) {
    badge.innerHTML = '<span class="badge-extreme-short">⚠️ Extreme Short — Smart money heavily positioned short</span>';
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  input.addEventListener('input', () => {
    const query = input.value.trim();
    if (query.length < 1) {
      results.style.display = 'none';
      return;
    }
    const matches = searchMarkets(query);
    if (matches.length === 0) {
      results.innerHTML = '<div class="search-no-results">No markets found</div>';
    } else {
      results.innerHTML = matches.slice(0, 10).map(m => `
        <div class="search-item" onclick="selectSearchResult('${m.id}')">
          <span class="search-symbol">${m.symbol}</span>
          <span class="search-name">${m.name}</span>
          <span class="search-category">${m.category}</span>
        </div>
      `).join('');
    }
    results.style.display = 'block';
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      results.style.display = 'none';
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+K or / to focus search
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.target.closest('input'))) {
      e.preventDefault();
      input.focus();
    }
  });
}

function selectSearchResult(marketId) {
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').style.display = 'none';
  selectMarket(marketId);
}

function initReportToggle() {
  document.querySelectorAll('.report-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.report;
      if (type === activeReportType) return;
      activeReportType = type;
      updateActiveStyles();
      renderScreener(type);
      selectMarket(selectedMarketId); // refresh dashboard with new report type
    });
  });
}

function updateActiveStyles() {
  document.querySelectorAll('.report-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.report === activeReportType);
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initApp);

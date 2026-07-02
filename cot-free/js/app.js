/**
 * COT Free — Main Application Controller
 * Handles search, market selection, report type switching, and UI state
 */
let selectedMarketId = 'gold';
let activeReportType = 'legacy';
let activeView = 'dashboard';

function initApp() {
  // Chart init can fail gracefully (CDN issue, version mismatch)
  // — the rest of the app still loads
  try {
    initChart('chart-container');
  } catch (e) {
    console.warn('Chart init skipped:', e);
  }
  renderScreener(activeReportType);
  selectMarket(selectedMarketId);
  initSearch();
  initReportToggle();
  initFilterPills();
  initRefresh();
  initViewToggle();
  initAlerts();
  updateActiveStyles();
}

// Re-render dashboard + screener + chart after data refresh
function refreshUI() {
  renderScreener(activeReportType);
  selectMarket(selectedMarketId);
}

function initRefresh() {
  const btn = document.getElementById('refresh-btn');
  if (!btn) return;

  // Manual refresh
  btn.addEventListener('click', async () => {
    btn.classList.add('spinning');
    const ok = await refreshData();
    if (ok) { refreshUI(); evaluateAllAlerts(); }
    setTimeout(() => btn.classList.remove('spinning'), 600);
  });

  // Auto-refresh every 60 seconds
  setInterval(async () => {
    const ok = await refreshData();
    if (ok) { refreshUI(); evaluateAllAlerts(); }
  }, 60000);
}

function selectMarket(marketId) {
  selectedMarketId = marketId;
  const market = MOCK_DATA.markets.find((m) => m.id === marketId);
  if (!market) return;

  updateMarketDashboard(market);
  setChartData(marketId, activeReportType);

  // Highlight selected row in screener
  document.querySelectorAll('.screener-row').forEach((r) => {
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

  // Velocity indicators
  function renderVelocity(elId, vel) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!vel) {
      el.querySelector('.vel-value').textContent = '—';
      el.querySelector('.vel-value').style.color = '#64748b';
      return;
    }
    const color = vel.absolute >= 0 ? '#22c55e' : '#ef4444';
    const arrow = vel.absolute >= 0 ? '▲' : '▼';
    el.querySelector('.vel-value').innerHTML =
      `${arrow} ${formatNumber(Math.abs(vel.absolute))} <span class="vel-pct">(${vel.percent >= 0 ? '+' : ''}${vel.percent}%)</span>`;
    el.querySelector('.vel-value').style.color = color;
  }
  renderVelocity('vel-2w', metrics.velocities && metrics.velocities['2w']);
  renderVelocity('vel-4w', metrics.velocities && metrics.velocities['4w']);
  renderVelocity('vel-8w', metrics.velocities && metrics.velocities['8w']);

  // Signal Score
  const scoreEl = document.getElementById('signal-score');
  const scoreVal = document.getElementById('signal-score-value');
  const scoreLabel = document.getElementById('signal-score-label');
  const scoreBar = document.getElementById('signal-score-bar');
  if (metrics.signalScore !== undefined && scoreVal) {
    const score = metrics.signalScore;
    const pctFromCenter = ((score + 100) / 200) * 100;
    const barPct = Math.max(0, Math.min(100, pctFromCenter));
    scoreBar.style.width = barPct + '%';

    let label, color;
    if (score >= 60) { label = 'Strong Bullish'; color = '#22c55e'; }
    else if (score >= 20) { label = 'Bullish'; color = '#4ade80'; }
    else if (score >= -20) { label = 'Neutral'; color = '#94a3b8'; }
    else if (score >= -60) { label = 'Bearish'; color = '#f87171'; }
    else { label = 'Strong Bearish'; color = '#ef4444'; }

    scoreVal.textContent = (score > 0 ? '+' : '') + score;
    scoreVal.style.color = color;
    scoreLabel.textContent = label;
    scoreBar.style.background = color;
    scoreBar.style.boxShadow = '0 0 8px ' + color;
  }

  // Extreme positioning badge
  const badge = document.getElementById('extreme-badge');
  if (metrics.categoryPercentile >= 90) {
    badge.innerHTML = '<span class="badge-extreme-long">🔥 Extreme Long — Smart money heavily positioned long</span>';
    badge.style.display = 'block';
  } else if (metrics.categoryPercentile <= 10) {
    badge.innerHTML =
      '<span class="badge-extreme-short">⚠️ Extreme Short — Smart money heavily positioned short</span>';
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }

  // Analysis
  updateAnalysis(metrics);
}

function updateAnalysis(metrics) {
  const el = document.getElementById('analysis-content');
  if (!el) return;

  const catLabels = {
    legacy: 'Commercials (Hedgers)',
    disaggregated: 'Managed Money',
    tff: 'Asset Managers',
  };
  const specLabels = {
    legacy: 'Speculators',
    disaggregated: 'Producers/Merchants',
    tff: 'Dealers',
  };
  const catName = catLabels[activeReportType] || 'Smart Money';
  const specName = specLabels[activeReportType] || 'Others';

  const parts = [];
  const dir = metrics.categoryNet >= 0 ? 'long' : 'short';
  const netLabel = metrics.categoryNet >= 0 ? 'net long' : 'net short';
  const wowLabel = metrics.categoryWoW.absolute >= 0 ? 'added' : 'reduced';

  // Position summary
  parts.push(
    `${catName} are ${netLabel} by ${formatNumber(Math.abs(metrics.categoryNet))} contracts ` +
      `(${metrics.categoryPercentile}th percentile, ${metrics.categoryPctOfOI}% of open interest).`
  );

  // WoW change
  if (Math.abs(metrics.categoryWoW.percent) > 1) {
    parts.push(
      `Over the past week they ${wowLabel} their position by ${formatNumber(Math.abs(metrics.categoryWoW.absolute))} ` +
        `(${metrics.categoryWoW.percent >= 0 ? '+' : ''}${metrics.categoryWoW.percent}%).`
    );
  }

  // Speculator vs Commercial divergence
  const specOpposite =
    (metrics.categoryNet > 0 && metrics.nonCategoryNet < 0) ||
    (metrics.categoryNet < 0 && metrics.nonCategoryNet > 0);
  if (specOpposite) {
    const specDir = metrics.nonCategoryNet > 0 ? 'long' : 'short';
    parts.push(
      `${specName} are on the opposite side (${specDir} by ` +
        `${formatNumber(Math.abs(metrics.nonCategoryNet))}). This commercial–speculator ` +
        `divergence is a classic COT signal worth monitoring.`
    );
  }

  // Extreme signal
  if (metrics.categoryPercentile >= 90) {
    parts.push(
      `${catName} are at an extreme long level (90th+ percentile). Historically, ` +
        `this has occurred near major price rallies. However, extreme positioning ` +
        `can persist during strong trends — consider waiting for the percentile to turn down.`
    );
  } else if (metrics.categoryPercentile <= 10) {
    parts.push(
      `${catName} are at an extreme short level (10th percentile or below). Historically, ` +
        `this has preceded price bottoms. Watch for signs of position covering as a potential ` +
        `early reversal signal.`
    );
  } else if (metrics.categoryPercentile >= 75) {
    parts.push(
      `${catName} positioning is elevated (75th+ percentile). The market is in a ` +
        `${dir.toUpperCase()}-biased trend. Continue to monitor for extreme readings.`
    );
  } else if (metrics.categoryPercentile <= 25) {
    parts.push(
      `${catName} positioning is low (25th percentile or below). The market may be ` +
        `oversold from a smart money perspective.`
    );
  }

  // Trading suggestion
  const suggestion = [];
  if (metrics.categoryPercentile >= 90 && metrics.categoryWoW.absolute < 0) {
    suggestion.push('Suggestion: Commercials are starting to lighten long exposure from extreme levels — consider taking partial profits on longs.');
  } else if (metrics.categoryPercentile <= 10 && metrics.categoryWoW.absolute > 0) {
    suggestion.push('Suggestion: Commercials are beginning to cover shorts from extreme levels — watch for a potential bottom formation before going long.');
  } else if (metrics.categoryPercentile >= 75 && metrics.categoryWoW.absolute > 0) {
    suggestion.push('Suggestion: Commercials are adding to an already long bias — trend remains intact, consider riding with the trend.');
  } else if (metrics.categoryPercentile <= 25 && metrics.categoryWoW.absolute < 0) {
    suggestion.push('Suggestion: Commercials are adding to shorts at depressed levels — continued weakness likely, avoid catching a falling knife.');
  } else {
    suggestion.push('Suggestion: No extreme positioning signal. Let the chart structure and price action be your primary guides.');
  }
  if (specOpposite) {
    suggestion[suggestion.length - 1] += ' The commercial–speculator split adds conviction to the current trend.';
  }
  parts.push(suggestion.join(''));

  // Price context
  if (metrics.price > 0) {
    const priceTrend = metrics.categoryNet > 0 ? 'rising' : 'falling';
    parts.push(
      `Current price: $${metrics.price.toFixed(2)}. The ${dir} positioning suggests ` +
        `${catName} expect prices to continue ${priceTrend}.`
    );
  }

  // Build HTML with highlighted suggestion
  const text = parts.join(' ');
  const suggestionStart = text.indexOf('Suggestion:');
  if (suggestionStart !== -1) {
    const before = text.slice(0, suggestionStart);
    const suggestion = text.slice(suggestionStart);
    el.innerHTML = before + '<strong class="analysis-suggestion">' + suggestion + '</strong>';
  } else {
    el.textContent = text;
  }
}

function initViewToggle() {
  document.querySelectorAll('.dashboard-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === activeView) return;
      activeView = view;
      document.querySelectorAll('.dashboard-tab').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
      const dash = document.getElementById('dashboard-view');
      const fri = document.getElementById('friday-release-view');
      if (view === 'dashboard') {
        dash.style.display = 'block';
        fri.style.display = 'none';
        // Re-select market to refresh chart/analysis when switching back
        selectMarket(selectedMarketId);
      } else {
        dash.style.display = 'none';
        fri.style.display = 'block';
        renderFridayRelease();
      }
    });
  });
}

function renderFridayRelease() {
  const el = document.getElementById('friday-release-body');
  if (!el) return;

  const allMetrics = getAllMarketMetrics(activeReportType);
  if (!allMetrics || allMetrics.length === 0) {
    el.innerHTML = '<div class="friday-release-loading">No data available for this report type.</div>';
    return;
  }

  // Sort by absolute WoW change magnitude
  const sorted = [...allMetrics].sort(
    (a, b) => Math.abs(b.categoryWoW.absolute) - Math.abs(a.categoryWoW.absolute)
  );

  const topGainers = sorted.filter((m) => m.categoryWoW.absolute > 0).slice(0, 5);
  const topLosers = sorted.filter((m) => m.categoryWoW.absolute < 0).slice(0, 5);

  function renderRow(m, index) {
    const wowColor = m.categoryWoW.absolute > 0 ? '#22c55e' : '#ef4444';
    const wowArrow = m.categoryWoW.absolute > 0 ? '▲' : '▼';
    const pctileColor = m.categoryPercentile >= 90 ? '#22c55e' : m.categoryPercentile <= 10 ? '#ef4444' : '#94a3b8';
    const netColor = m.categoryNet >= 0 ? '#22c55e' : '#ef4444';
    const signalScore = m.signalScore !== undefined ? m.signalScore : null;
    let signalColor, signalLabel;
    if (signalScore !== null) {
      if (signalScore >= 60) { signalColor = '#22c55e'; signalLabel = 'SB'; }
      else if (signalScore >= 20) { signalColor = '#4ade80'; signalLabel = 'B'; }
      else if (signalScore >= -20) { signalColor = '#94a3b8'; signalLabel = 'N'; }
      else if (signalScore >= -60) { signalColor = '#f87171'; signalLabel = 'B'; }
      else { signalColor = '#ef4444'; signalLabel = 'SB'; }
    }
    return `<div class="fr-row" onclick="selectMarket('${m.market.id}'); switchView('dashboard')">
      <div class="fr-rank">${index}</div>
      <div class="fr-info">
        <div class="fr-name">${m.market.name}</div>
        <div class="fr-symbol">${m.market.symbol} · ${m.market.category}</div>
      </div>
      <div class="fr-stats">
        <div class="fr-wow" style="color: ${wowColor}">${wowArrow} ${formatNumber(Math.abs(m.categoryWoW.absolute))} <span class="fr-wow-pct">(${m.categoryWoW.percent >= 0 ? '+' : ''}${m.categoryWoW.percent}%)</span></div>
        <div class="fr-net" style="color: ${netColor}">Net: ${formatNumber(m.categoryNet)}</div>
      </div>
      <div class="fr-pctile" style="color: ${pctileColor}">${m.categoryPercentile}/100</div>
      ${signalScore !== null ? `<div class="fr-signal" style="color: ${signalColor}">${signalLabel}</div>` : ''}
    </div>`;
  }

  el.innerHTML = `
    <div class="fr-section">
      <div class="fr-section-title">
        <span class="fr-section-icon">🟢</span> Top Gainers — Largest Long Increases
      </div>
      <div class="fr-list">${topGainers.map((m, i) => renderRow(m, i + 1)).join('')}</div>
    </div>
    <div class="fr-section">
      <div class="fr-section-title">
        <span class="fr-section-icon">🔴</span> Top Losers — Largest Long Decreases
      </div>
      <div class="fr-list">${topLosers.map((m, i) => renderRow(m, i + 1)).join('')}</div>
    </div>
  `;
}

// Helper called from onclick in Friday Release rows to navigate back
function switchView(view) {
  activeView = view;
  document.querySelectorAll('.dashboard-tab').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('dashboard-view').style.display = view === 'dashboard' ? 'block' : 'none';
  document.getElementById('friday-release-view').style.display = view === 'friday-release' ? 'block' : 'none';
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
      results.innerHTML = matches
        .slice(0, 10)
        .map(
          (m) => `
        <div class="search-item" onclick="selectSearchResult('${m.id}')">
          <span class="search-symbol">${m.symbol}</span>
          <span class="search-name">${m.name}</span>
          <span class="search-category">${m.category}</span>
        </div>
      `,
        )
        .join('');
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
  document.querySelectorAll('.report-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.report;
      if (type === activeReportType) return;
      activeReportType = type;
      updateActiveStyles();
      renderScreener(type);
      selectMarket(selectedMarketId); // refresh dashboard with new report type
      evaluateAllAlerts();
    });
  });
}

function updateActiveStyles() {
  document.querySelectorAll('.report-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.report === activeReportType);
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initApp);

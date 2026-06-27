/**
 * COT Free — Screener Module
 * Sortable market screener table with color-coded heatmap
 */
let screenerSortColumn = 'categoryNet';
let screenerSortAsc = false;
let screenerReportType = 'legacy';

function renderScreener(reportType = 'legacy') {
  screenerReportType = reportType;
  const container = document.getElementById('screener-body');
  if (!container) return;

  const metrics = getAllMarketMetrics(reportType);

  // Sort
  metrics.sort((a, b) => {
    let valA, valB;
    switch (screenerSortColumn) {
      case 'market': valA = a.market.name; valB = b.market.name; break;
      case 'symbol': valA = a.market.symbol; valB = b.market.symbol; break;
      case 'category': valA = a.market.category; valB = b.market.category; break;
      case 'price': valA = a.price; valB = b.price; break;
      case 'categoryNet': valA = a.categoryNet; valB = b.categoryNet; break;
      case 'nonCategoryNet': valA = a.nonCategoryNet; valB = b.nonCategoryNet; break;
      case 'wow': valA = a.categoryWoW.absolute; valB = b.categoryWoW.absolute; break;
      case 'pctOfOI': valA = a.categoryPctOfOI; valB = b.categoryPctOfOI; break;
      case 'percentile': valA = a.categoryPercentile; valB = b.categoryPercentile; break;
      default: valA = a.categoryNet; valB = b.categoryNet;
    }
    if (typeof valA === 'string') {
      return screenerSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return screenerSortAsc ? valA - valB : valB - valA;
  });

  container.innerHTML = metrics.map(m => {
    const isExtremeLong = m.categoryPercentile >= 90;
    const isExtremeShort = m.categoryPercentile <= 10;
    const heatColor = isExtremeLong ? '#22c55e' : isExtremeShort ? '#ef4444' : 'transparent';
    const heatBg = isExtremeLong ? 'rgba(34,197,94,0.15)' : isExtremeShort ? 'rgba(239,68,68,0.15)' : 'transparent';

    // Color-coded net position
    const netColor = m.categoryNet > 0 ? '#22c55e' : m.categoryNet < 0 ? '#ef4444' : '#94a3b8';
    const nonCatNetColor = m.nonCategoryNet > 0 ? '#22c55e' : m.nonCategoryNet < 0 ? '#ef4444' : '#94a3b8';
    const wowColor = m.categoryWoW.absolute > 0 ? '#22c55e' : m.categoryWoW.absolute < 0 ? '#ef4444' : '#94a3b8';
    const wowArrow = m.categoryWoW.absolute > 0 ? '▲' : m.categoryWoW.absolute < 0 ? '▼' : '―';

    return `<tr class="screener-row" data-market="${m.market.id}" onclick="selectMarket('${m.market.id}')">
      <td>${m.market.name}</td>
      <td class="screener-symbol">${m.market.symbol}</td>
      <td><span class="cat-badge">${m.market.category}</span></td>
      <td style="color: ${netColor}; font-weight: 600">${formatNumber(m.categoryNet)}</td>
      <td style="color: ${nonCatNetColor}">${formatNumber(m.nonCategoryNet)}</td>
      <td style="color: ${wowColor}">${wowArrow} ${formatNumber(Math.abs(m.categoryWoW.absolute))}</td>
      <td>${m.categoryPctOfOI}%</td>
      <td>
        <div class="percentile-bar-container">
          <div class="percentile-bar" style="width: ${m.categoryPercentile}%; background: ${m.categoryPercentile >= 90 ? '#22c55e' : m.categoryPercentile <= 10 ? '#ef4444' : '#64748b'}"></div>
        </div>
        <span class="percentile-label">${m.categoryPercentile}</span>
      </td>
    </tr>`;
  }).join('');
}

function sortScreener(column) {
  if (screenerSortColumn === column) {
    screenerSortAsc = !screenerSortAsc;
  } else {
    screenerSortColumn = column;
    screenerSortAsc = false;
  }
  renderScreener(screenerReportType);
}

function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  const sign = n >= 0 ? '' : '';
  const abs = Math.abs(n);
  if (abs >= 1000000) return sign + (abs / 1000000).toFixed(1) + 'M';
  if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + 'K';
  return sign + abs.toLocaleString();
}

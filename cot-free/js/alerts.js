let alerts = [];
const STORAGE_KEY = 'cotfree_alerts';
const METRIC_LABELS = {
  percentile: 'Commercial Percentile',
  signalScore: 'COT Signal Score',
  wow: 'WoW Change (contracts)',
  netPosition: 'Net Position (contracts)',
};
const METRIC_GETTERS = {
  percentile: (m) => m.categoryPercentile,
  signalScore: (m) => m.signalScore,
  wow: (m) => m.categoryWoW.absolute,
  netPosition: (m) => m.categoryNet,
};

function initAlerts() {
  loadAlerts();
  requestNotifyPermission();
  initAlertButton();
  populateAlertMarketSelect();
  renderAlertsList();
  updateAlertDot();
}

function loadAlerts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    alerts = stored ? JSON.parse(stored) : [];
  } catch {
    alerts = [];
  }
}

function saveAlerts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

function addAlert(marketId, metric, condition, value) {
  const a = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    marketId,
    metric,
    condition,
    value: Number(value),
    enabled: true,
    lastTriggered: null,
    createdAt: Date.now(),
  };
  alerts.push(a);
  saveAlerts();
  renderAlertsList();
  updateAlertDot();
}

function removeAlert(id) {
  alerts = alerts.filter((a) => a.id !== id);
  saveAlerts();
  renderAlertsList();
  updateAlertDot();
}

function toggleAlert(id) {
  const a = alerts.find((a) => a.id === id);
  if (a) {
    a.enabled = !a.enabled;
    saveAlerts();
    renderAlertsList();
    updateAlertDot();
  }
}

function evaluateAllAlerts() {
  const allMetrics = getAllMarketMetrics(activeReportType);
  if (!allMetrics) return;
  alerts.forEach((alert) => {
    if (!alert.enabled) return;
    const metrics = allMetrics.find((m) => m.market.id === alert.marketId);
    if (!metrics) return;
    const getter = METRIC_GETTERS[alert.metric];
    if (!getter) return;
    const currentValue = getter(metrics);
    if (currentValue === null || currentValue === undefined) return;
    let met = false;
    switch (alert.condition) {
      case '>=': met = currentValue >= alert.value; break;
      case '<=': met = currentValue <= alert.value; break;
      case '>': met = currentValue > alert.value; break;
      case '<': met = currentValue < alert.value; break;
    }
    if (met) fireNotification(alert, currentValue, metrics);
  });
}

function fireNotification(alert, currentValue, metrics) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (alert.lastTriggered && Date.now() - alert.lastTriggered < 30 * 60 * 1000) return;
  const metricLabel = METRIC_LABELS[alert.metric] || alert.metric;
  new Notification(`COT Alert: ${metrics.market.name} (${metrics.market.symbol})`, {
    body: `${metricLabel} is ${currentValue} — triggered ${alert.condition} ${alert.value}`,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📊</text></svg>',
    tag: alert.id,
  });
  alert.lastTriggered = Date.now();
  saveAlerts();
  renderAlertsList();
}

function requestNotifyPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function initAlertButton() {
  const btn = document.getElementById('alert-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    document.getElementById('alert-panel').classList.add('open');
    document.getElementById('alert-backdrop').classList.add('open');
  });
  document.getElementById('alert-backdrop')?.addEventListener('click', closeAlertPanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAlertPanel();
  });
  document.getElementById('alert-add-btn')?.addEventListener('click', handleAddAlert);
}

function closeAlertPanel() {
  document.getElementById('alert-panel')?.classList.remove('open');
  document.getElementById('alert-backdrop')?.classList.remove('open');
}

function handleAddAlert() {
  const market = document.getElementById('alert-market').value;
  const metric = document.getElementById('alert-metric').value;
  const condition = document.getElementById('alert-condition').value;
  const value = document.getElementById('alert-value').value;
  if (!market || !metric || !condition || value === '' || isNaN(value)) return;
  addAlert(market, metric, condition, value);
  document.getElementById('alert-value').value = '';
}

function populateAlertMarketSelect() {
  const sel = document.getElementById('alert-market');
  if (!sel) return;
  sel.innerHTML = MOCK_DATA.markets
    .map((m) => `<option value="${m.id}">${m.name} (${m.symbol})</option>`)
    .join('');
}

function renderAlertsList() {
  const list = document.getElementById('alert-list');
  if (!list) return;
  if (alerts.length === 0) {
    list.innerHTML = '<div class="alert-empty">No alerts. Add one below.</div>';
    return;
  }
  list.innerHTML = alerts
    .map((a) => {
      const market = MOCK_DATA.markets.find((m) => m.id === a.marketId);
      const name = market ? `${market.name} (${market.symbol})` : a.marketId;
      const metricLabel = METRIC_LABELS[a.metric] || a.metric;
      const lastTrig = a.lastTriggered
        ? new Date(a.lastTriggered).toLocaleTimeString()
        : 'never';
      return `
      <div class="alert-row ${a.enabled ? '' : 'alert-disabled'}">
        <div class="alert-info">
          <div class="alert-target">${name}</div>
          <div class="alert-rule">${metricLabel} ${a.condition} ${a.value}</div>
          <div class="alert-meta">Fired: ${lastTrig}</div>
        </div>
        <div class="alert-actions">
          <label class="switch">
            <input type="checkbox" ${a.enabled ? 'checked' : ''} onchange="toggleAlert('${a.id}')" />
            <span class="switch-slider"></span>
          </label>
          <button class="alert-delete" onclick="removeAlert('${a.id}')" title="Delete">✕</button>
        </div>
      </div>`;
    })
    .join('');
}

function updateAlertDot() {
  const dot = document.getElementById('alert-dot');
  if (!dot) return;
  const n = alerts.filter((a) => a.enabled).length;
  dot.style.display = n > 0 ? 'flex' : 'none';
  dot.textContent = n;
}

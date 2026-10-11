(function () {
  'use strict';

  const cfg = window.SCHOOL_CONFIG;
  const params = new URLSearchParams(location.search);
  const roomId = params.get('id') || 'R01';

  document.getElementById('school-name').textContent = cfg.schoolName;
  document.getElementById('project-name').textContent = cfg.projectName;

  const modeBadge = document.getElementById('mode-badge');
  if (modeBadge) {
    if (cfg.dataMode === 'firebase') {
      modeBadge.textContent = '🔴 即時數據 (Firebase)';
      modeBadge.className = 'badge live';
    } else {
      modeBadge.textContent = '🧪 示範模式 (Demo)';
      modeBadge.className = 'badge demo';
    }
  }

  const meta = cfg.rooms.find((r) => r.roomId === roomId);
  if (!meta) {
    document.getElementById('detail-root').innerHTML =
      '<div class="loading">搵唔到課室 <strong>' +
      escapeHtml(roomId) +
      '</strong>。<a href="index.html">返回總覽</a></div>';
    return;
  }

  document.title = meta.name + ' — ' + cfg.projectName;
  document.getElementById('room-title').textContent = meta.name;
  document.getElementById('room-meta').textContent =
    meta.roomId +
    (meta.floor ? ' · ' + meta.floor : '') +
    (meta.wing ? ' · ' + meta.wing : '');

  let chart = null;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureChart() {
    const canvas = document.getElementById('history-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chart) return;
    chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: '溫度 (°C)',
            data: [],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.12)',
            tension: 0.3,
            yAxisID: 'y',
            fill: true,
          },
          {
            label: '濕度 (%)',
            data: [],
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56,189,248,0.08)',
            tension: 0.3,
            yAxisID: 'y1',
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#8b9bb4' },
          },
        },
        scales: {
          x: {
            ticks: { color: '#8b9bb4', maxTicksLimit: 8 },
            grid: { color: 'rgba(45,58,79,0.6)' },
          },
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: '°C', color: '#f59e0b' },
            ticks: { color: '#f59e0b' },
            grid: { color: 'rgba(45,58,79,0.6)' },
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: '%', color: '#38bdf8' },
            ticks: { color: '#38bdf8' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  function updateChart(history) {
    ensureChart();
    if (!chart) return;
    const labels = history.map((h) => {
      const d = new Date(h.t);
      const pad = (n) => String(n).padStart(2, '0');
      return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    });
    chart.data.labels = labels;
    chart.data.datasets[0].data = history.map((h) => h.temp);
    chart.data.datasets[1].data = history.map((h) => h.humidity);
    chart.update('none');
  }

  function renderItem(item) {
    const r = item.reading;
    const banner = document.getElementById('status-banner');
    banner.className = 'status-banner ' + item.status.color;
    banner.textContent = item.status.icon + ' ' + item.status.label;

    document.getElementById('m-temp').textContent =
      r && r.temp != null ? Number(r.temp).toFixed(1) : '—';
    document.getElementById('m-hum').textContent =
      r && r.humidity != null ? Math.round(r.humidity) : '—';
    document.getElementById('m-occ').textContent = r
      ? r.occupied
        ? '有人'
        : '無人'
      : '—';
    document.getElementById('m-updated').textContent = r
      ? EnergyData.formatTime(r.updatedAt)
      : '—';

    document.getElementById('tip-text').textContent = item.tip;

    updateChart(EnergyData.getHistory(roomId));
  }

  EnergyData.subscribe((all) => {
    const item = all[roomId];
    if (item) renderItem(item);
  });
  EnergyData.start();
})();

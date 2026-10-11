(function () {
  'use strict';

  const cfg = window.SCHOOL_CONFIG;
  const grid = document.getElementById('room-grid');
  const searchInput = document.getElementById('search');
  const filterSelect = document.getElementById('filter-status');
  const floorSelect = document.getElementById('filter-floor');
  const updatedEl = document.getElementById('last-updated');
  const modeBadge = document.getElementById('mode-badge');

  document.getElementById('school-name').textContent = cfg.schoolName;
  document.getElementById('project-name').textContent = cfg.projectName;
  document.title = cfg.projectName + ' — ' + cfg.schoolName;

  if (modeBadge) {
    if (cfg.dataMode === 'firebase') {
      modeBadge.textContent = '🔴 即時數據 (Firebase)';
      modeBadge.className = 'badge live';
    } else {
      modeBadge.textContent = '🧪 示範模式 (Demo)';
      modeBadge.className = 'badge demo';
    }
  }

  // 樓層選項
  const floors = [...new Set(cfg.rooms.map((r) => r.floor).filter(Boolean))];
  floors.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    floorSelect.appendChild(opt);
  });

  function renderStats(all) {
    const s = EnergyData.summaryStats(all);
    document.getElementById('stat-total').textContent = s.total;
    document.getElementById('stat-ok').textContent = s.ok;
    document.getElementById('stat-warn').textContent = s.warn;
    document.getElementById('stat-hot').textContent = s.hot;
    document.getElementById('stat-idle').textContent = s.idle;
    document.getElementById('stat-offline').textContent = s.offline;
    document.getElementById('stat-occ').textContent = s.occupied;
  }

  function matchesFilter(item) {
    const q = (searchInput.value || '').trim().toLowerCase();
    const st = filterSelect.value;
    const fl = floorSelect.value;

    if (q) {
      const hay =
        (item.meta.name || '') +
        ' ' +
        (item.meta.roomId || '') +
        ' ' +
        (item.meta.wing || '') +
        ' ' +
        (item.meta.floor || '');
      if (!hay.toLowerCase().includes(q)) return false;
    }
    if (st && st !== 'all') {
      if (st === 'warn') {
        if (item.status.key !== 'warn' && item.status.key !== 'waste_cool') return false;
      } else if (item.status.key !== st) {
        return false;
      }
    }
    if (fl && fl !== 'all' && item.meta.floor !== fl) return false;
    return true;
  }

  function cardHtml(item) {
    const r = item.reading;
    const color = item.status.color;
    const temp = r && r.temp != null ? Number(r.temp).toFixed(1) + '°C' : '—';
    const hum = r && r.humidity != null ? Math.round(r.humidity) + '%' : '—';
    const occ = r ? (r.occupied ? '👤 有人' : '無人') : '—';
    return (
      '<a class="room-card ' +
      color +
      '" href="room.html?id=' +
      encodeURIComponent(item.meta.roomId) +
      '">' +
      '<p class="room-name">' +
      escapeHtml(item.meta.name) +
      '</p>' +
      '<div class="room-id">' +
      escapeHtml(item.meta.roomId) +
      (item.meta.wing ? ' · ' + escapeHtml(item.meta.wing) : '') +
      '</div>' +
      '<div class="metrics">' +
      '<div>🌡️ ' +
      temp +
      '</div>' +
      '<div>💧 ' +
      hum +
      '</div>' +
      '<div>' +
      occ +
      '</div>' +
      '</div>' +
      '<span class="status-pill">' +
      item.status.icon +
      ' ' +
      escapeHtml(item.status.label) +
      '</span>' +
      '</a>'
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let latestAll = {};

  function render() {
    renderStats(latestAll);
    const items = Object.values(latestAll).filter(matchesFilter);
    if (items.length === 0) {
      grid.innerHTML = '<div class="loading">搵唔到符合條件嘅課室。</div>';
    } else {
      grid.innerHTML = items.map(cardHtml).join('');
    }
    if (updatedEl) {
      updatedEl.textContent = '更新：' + EnergyData.formatTime(Date.now());
    }
  }

  searchInput.addEventListener('input', render);
  filterSelect.addEventListener('change', render);
  floorSelect.addEventListener('change', render);

  EnergyData.subscribe((all) => {
    latestAll = all;
    render();
  });
  EnergyData.start();
})();

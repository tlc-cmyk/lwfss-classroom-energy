/**
 * 資料層：Demo 模擬器 + Firebase Realtime Database 讀取
 * JSON schema:
 * {
 *   roomId, name, temp, humidity, occupied, updatedAt
 * }
 */
(function (global) {
  'use strict';

  const cfg = () => global.SCHOOL_CONFIG;

  /** 狀態分類 */
  function classify(roomMeta, reading) {
    const t = cfg().thresholds;
    const offlineMs = (cfg().offlineMinutes || 5) * 60 * 1000;
    const now = Date.now();

    if (!reading || reading.updatedAt == null) {
      return {
        key: 'offline',
        label: '離線',
        color: 'red',
        icon: '⚠️',
        tip: '感測器未有資料或尚未上線。',
      };
    }

    if (now - reading.updatedAt > offlineMs) {
      return {
        key: 'offline',
        label: '離線',
        color: 'red',
        icon: '⚠️',
        tip: '超過 ' + cfg().offlineMinutes + ' 分鐘未更新，請檢查 Wi-Fi／電源／ESP32。',
      };
    }

    const temp = Number(reading.temp);
    const hum = Number(reading.humidity);
    const occupied = !!reading.occupied;

    if (Number.isFinite(temp) && temp > t.tempHot) {
      return {
        key: 'hot',
        label: '過熱',
        color: 'red',
        icon: '🔥',
        tip: occupied
          ? '課室過熱且有人，請檢查冷氣是否故障或門窗未關好。'
          : '無人但溫度好高，可能係日曬／設備發熱，放學後可檢查。',
      };
    }

    if (
      (Number.isFinite(temp) && temp > t.tempWarn) ||
      (Number.isFinite(hum) && (hum < t.humidityLow || hum > t.humidityHigh))
    ) {
      return {
        key: 'warn',
        label: Number.isFinite(temp) && temp > t.tempWarn ? '溫度偏高' : '濕度異常',
        color: 'orange',
        icon: '🌡️',
        tip:
          Number.isFinite(hum) && (hum < t.humidityLow || hum > t.humidityHigh)
            ? '濕度超出舒適範圍（' + t.humidityLow + '–' + t.humidityHigh + '%），留意通風或抽濕。'
            : '溫度偏高，如有人上課可適度開冷氣；無人則檢查有冇設備長開。',
      };
    }

    if (!occupied) {
      return {
        key: 'idle',
        label: '無人／閒置',
        color: 'gray',
        icon: '💤',
        tip:
          Number.isFinite(temp) && temp < t.tempCool
            ? '無人但溫度偏低，懷疑冷氣未關——好大機會浪費電！請派人確認。'
            : '課室閒置，保持關燈關冷氣就啱。',
      };
    }

    // 有人 + 溫度合理
    if (Number.isFinite(temp) && temp < t.tempCool) {
      return {
        key: 'waste_cool',
        label: '可能過凍',
        color: 'orange',
        icon: '❄️',
        tip:
          '有人但溫度低過 ' +
          t.tempCool +
          '°C，冷氣可能開得過凍——建議調高 1–2°C 慳電又舒服。',
      };
    }

    return {
      key: 'ok',
      label: '正常',
      color: 'green',
      icon: '✅',
      tip: '有人且溫濕度合理，繼續保持良好用電習慣。',
    };
  }

  function energyTip(roomMeta, reading, status) {
    if (status && status.tip) return status.tip;
    return '暫無建議。';
  }

  function formatTime(ts) {
    if (ts == null) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    const pad = (n) => String(n).padStart(2, '0');
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      ' ' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes()) +
      ':' +
      pad(d.getSeconds())
    );
  }

  // ── Demo 模擬器 ──────────────────────────────────────────
  const demoState = {
    rooms: {},
    history: {},
    timer: null,
  };

  function seedDemo() {
    const rooms = cfg().rooms;
    const now = Date.now();
    rooms.forEach((r, i) => {
      // 不同房間唔同「性格」
      const baseTemp = 24 + (i % 7) * 0.8 + Math.random() * 1.5;
      const occupied = Math.random() > 0.35;
      const reading = {
        roomId: r.roomId,
        name: r.name,
        temp: Math.round(baseTemp * 10) / 10,
        humidity: Math.round(55 + (i % 5) * 4 + Math.random() * 8),
        occupied: occupied,
        updatedAt: now - Math.floor(Math.random() * 60000),
      };
      // 刻意造幾個異常場景方便示範
      if (i === 2) {
        reading.temp = 31.2;
        reading.occupied = true;
      }
      if (i === 7) {
        reading.temp = 29.1;
        reading.occupied = true;
      }
      if (i === 14) {
        reading.occupied = false;
        reading.temp = 19.5; // 無人過凍 → 浪費
      }
      if (i === 21) {
        reading.updatedAt = now - 20 * 60 * 1000; // 離線
      }
      if (i === 28) {
        reading.humidity = 88;
        reading.occupied = true;
      }
      demoState.rooms[r.roomId] = reading;
      demoState.history[r.roomId] = [];
      for (let h = 0; h < (cfg().historyPoints || 30); h++) {
        demoState.history[r.roomId].push({
          t: now - (cfg().historyPoints - h) * 60000,
          temp: reading.temp + (Math.random() - 0.5) * 1.2,
          humidity: reading.humidity + (Math.random() - 0.5) * 4,
          occupied: reading.occupied,
        });
      }
    });
  }

  function tickDemo() {
    const now = Date.now();
    Object.keys(demoState.rooms).forEach((id) => {
      const r = demoState.rooms[id];
      // 離線示範房唔好亂更新
      if (id === 'R22') return;

      // 輕微漂移
      r.temp = Math.round((r.temp + (Math.random() - 0.5) * 0.35) * 10) / 10;
      r.temp = Math.min(34, Math.max(18, r.temp));
      r.humidity = Math.round(r.humidity + (Math.random() - 0.5) * 1.5);
      r.humidity = Math.min(95, Math.max(30, r.humidity));

      // 偶爾轉有人／無人
      if (Math.random() < 0.08) r.occupied = !r.occupied;

      r.updatedAt = now;

      const hist = demoState.history[id];
      hist.push({
        t: now,
        temp: r.temp,
        humidity: r.humidity,
        occupied: r.occupied,
      });
      const max = cfg().historyPoints || 30;
      while (hist.length > max) hist.shift();
    });
  }

  // ── Firebase REST ────────────────────────────────────────
  async function fetchFirebaseAll() {
    const fb = cfg().firebase;
    if (!fb || !fb.databaseURL) {
      throw new Error('未設定 Firebase databaseURL');
    }
    let url = fb.databaseURL.replace(/\/$/, '') + '/' + (fb.roomsPath || 'rooms') + '.json';
    if (fb.authToken) url += '?auth=' + encodeURIComponent(fb.authToken);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firebase HTTP ' + res.status);
    const data = await res.json();
    return data || {};
  }

  async function fetchFirebaseOne(roomId) {
    const fb = cfg().firebase;
    let url =
      fb.databaseURL.replace(/\/$/, '') +
      '/' +
      (fb.roomsPath || 'rooms') +
      '/' +
      encodeURIComponent(roomId) +
      '.json';
    if (fb.authToken) url += '?auth=' + encodeURIComponent(fb.authToken);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firebase HTTP ' + res.status);
    return await res.json();
  }

  // ── 公開 API ─────────────────────────────────────────────
  const listeners = new Set();
  let pollTimer = null;
  let localHistory = {}; // firebase 模式前端緩存歷史

  function notify() {
    const snapshot = getAllReadings();
    listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (e) {
        console.error(e);
      }
    });
  }

  function getAllReadings() {
    const mode = cfg().dataMode || 'demo';
    const map = {};
    cfg().rooms.forEach((meta) => {
      let reading;
      if (mode === 'demo') {
        reading = demoState.rooms[meta.roomId]
          ? Object.assign({}, demoState.rooms[meta.roomId])
          : null;
      } else {
        reading = localHistory._latest && localHistory._latest[meta.roomId]
          ? Object.assign({}, localHistory._latest[meta.roomId])
          : null;
      }
      const status = classify(meta, reading);
      map[meta.roomId] = {
        meta: meta,
        reading: reading,
        status: status,
        tip: energyTip(meta, reading, status),
      };
    });
    return map;
  }

  function getHistory(roomId) {
    if ((cfg().dataMode || 'demo') === 'demo') {
      return (demoState.history[roomId] || []).slice();
    }
    return (localHistory[roomId] || []).slice();
  }

  function pushLocalHistory(roomId, reading) {
    if (!localHistory[roomId]) localHistory[roomId] = [];
    localHistory[roomId].push({
      t: reading.updatedAt || Date.now(),
      temp: reading.temp,
      humidity: reading.humidity,
      occupied: reading.occupied,
    });
    const max = cfg().historyPoints || 30;
    while (localHistory[roomId].length > max) localHistory[roomId].shift();
  }

  async function pollOnce() {
    const mode = cfg().dataMode || 'demo';
    if (mode === 'demo') {
      tickDemo();
      notify();
      return;
    }
    try {
      const data = await fetchFirebaseAll();
      if (!localHistory._latest) localHistory._latest = {};
      Object.keys(data).forEach((id) => {
        const row = data[id];
        if (!row) return;
        const reading = {
          roomId: row.roomId || id,
          name: row.name,
          temp: row.temp,
          humidity: row.humidity,
          occupied: !!row.occupied,
          updatedAt: row.updatedAt || Date.now(),
        };
        localHistory._latest[id] = reading;
        pushLocalHistory(id, reading);
      });
      notify();
    } catch (err) {
      console.warn('讀取 Firebase 失敗：', err);
      notify();
    }
  }

  function start() {
    const mode = cfg().dataMode || 'demo';
    if (mode === 'demo' && Object.keys(demoState.rooms).length === 0) {
      seedDemo();
    }
    if (!localHistory._latest) localHistory._latest = {};
    pollOnce();
    const ms = cfg().refreshMs || 5000;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(pollOnce, ms);
  }

  function stop() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function summaryStats(all) {
    let ok = 0,
      warn = 0,
      hot = 0,
      idle = 0,
      offline = 0,
      occupied = 0;
    Object.values(all).forEach((item) => {
      const k = item.status.key;
      if (k === 'ok') ok++;
      else if (k === 'warn' || k === 'waste_cool') warn++;
      else if (k === 'hot') hot++;
      else if (k === 'idle') idle++;
      else if (k === 'offline') offline++;
      if (item.reading && item.reading.occupied) occupied++;
    });
    return { ok, warn, hot, idle, offline, occupied, total: Object.keys(all).length };
  }

  global.EnergyData = {
    classify,
    energyTip,
    formatTime,
    start,
    stop,
    subscribe,
    getAllReadings,
    getHistory,
    summaryStats,
    fetchFirebaseOne,
  };
})(window);

/**
 * 學校節能計劃 — 網站設定
 * 世界龍岡學校劉皇發中學
 *
 * 修改房間名稱、閾值、Firebase 網址都喺呢度。
 */
window.SCHOOL_CONFIG = {
  schoolName: '世界龍岡學校劉皇發中學',
  projectName: '學校節能計劃',
  projectNameEn: 'Classroom Energy Monitor',

  // 資料來源：'demo' | 'firebase'
  // 未裝硬件前用 demo；接上 Firebase 後改做 'firebase'
  dataMode: 'demo',

  // Firebase Realtime Database（dataMode === 'firebase' 先生效）
  // 例：https://your-project.firebaseio.com
  firebase: {
    databaseURL: '',          // 填你嘅 Realtime Database URL
    // 如果開咗規則驗證，可填 database secret 或用公開唯讀規則
    // 前端只讀：建議規則允許公開讀、裝置用 auth token 寫
    authToken: '',            // 可選；REST 讀取用
    roomsPath: 'rooms',       // 路徑：/rooms/R01 ...
  },

  // 離線判斷：超過呢啲分鐘未更新 → 顯示「離線」
  offlineMinutes: 5,

  // 溫濕度閾值
  thresholds: {
    tempWarn: 28,   // °C 以上 → 橙色（偏高）
    tempHot: 30,    // °C 以上 → 紅色（過熱）
    tempCool: 22,   // °C 以下（有人時）→ 可能冷氣過凍，浪費
    humidityLow: 40,
    humidityHigh: 80,
  },

  // 刷新間隔（毫秒）
  refreshMs: 5000,

  // 歷史圖保留點數（demo / 前端緩存）
  historyPoints: 30,

  // 40 間課室（可改 name / floor / wing）
  // roomId 要同 ESP32 config.h 入面一致
  rooms: [
    { roomId: 'R01', name: '1A', floor: '1樓', wing: 'A座' },
    { roomId: 'R02', name: '1B', floor: '1樓', wing: 'A座' },
    { roomId: 'R03', name: '1C', floor: '1樓', wing: 'A座' },
    { roomId: 'R04', name: '1D', floor: '1樓', wing: 'B座' },
    { roomId: 'R05', name: '1E', floor: '1樓', wing: 'B座' },
    { roomId: 'R06', name: '2A', floor: '2樓', wing: 'A座' },
    { roomId: 'R07', name: '2B', floor: '2樓', wing: 'A座' },
    { roomId: 'R08', name: '2C', floor: '2樓', wing: 'A座' },
    { roomId: 'R09', name: '2D', floor: '2樓', wing: 'B座' },
    { roomId: 'R10', name: '2E', floor: '2樓', wing: 'B座' },
    { roomId: 'R11', name: '3A', floor: '3樓', wing: 'A座' },
    { roomId: 'R12', name: '3B', floor: '3樓', wing: 'A座' },
    { roomId: 'R13', name: '3C', floor: '3樓', wing: 'A座' },
    { roomId: 'R14', name: '3D', floor: '3樓', wing: 'B座' },
    { roomId: 'R15', name: '3E', floor: '3樓', wing: 'B座' },
    { roomId: 'R16', name: '4A', floor: '4樓', wing: 'A座' },
    { roomId: 'R17', name: '4B', floor: '4樓', wing: 'A座' },
    { roomId: 'R18', name: '4C', floor: '4樓', wing: 'A座' },
    { roomId: 'R19', name: '4D', floor: '4樓', wing: 'B座' },
    { roomId: 'R20', name: '4E', floor: '4樓', wing: 'B座' },
    { roomId: 'R21', name: '5A', floor: '5樓', wing: 'A座' },
    { roomId: 'R22', name: '5B', floor: '5樓', wing: 'A座' },
    { roomId: 'R23', name: '5C', floor: '5樓', wing: 'A座' },
    { roomId: 'R24', name: '5D', floor: '5樓', wing: 'B座' },
    { roomId: 'R25', name: '5E', floor: '5樓', wing: 'B座' },
    { roomId: 'R26', name: '6A', floor: '6樓', wing: 'A座' },
    { roomId: 'R27', name: '6B', floor: '6樓', wing: 'A座' },
    { roomId: 'R28', name: '6C', floor: '6樓', wing: 'A座' },
    { roomId: 'R29', name: '6D', floor: '6樓', wing: 'B座' },
    { roomId: 'R30', name: '6E', floor: '6樓', wing: 'B座' },
    { roomId: 'R31', name: '電腦室1', floor: '2樓', wing: '特別室' },
    { roomId: 'R32', name: '電腦室2', floor: '2樓', wing: '特別室' },
    { roomId: 'R33', name: '實驗室1', floor: '3樓', wing: '特別室' },
    { roomId: 'R34', name: '實驗室2', floor: '3樓', wing: '特別室' },
    { roomId: 'R35', name: '音樂室', floor: '4樓', wing: '特別室' },
    { roomId: 'R36', name: '視藝室', floor: '4樓', wing: '特別室' },
    { roomId: 'R37', name: '圖書館', floor: '1樓', wing: '特別室' },
    { roomId: 'R38', name: '活動室', floor: '5樓', wing: '特別室' },
    { roomId: 'R39', name: '教員室', floor: '1樓', wing: '辦公' },
    { roomId: 'R40', name: '會議室', floor: '1樓', wing: '辦公' },
  ],
};

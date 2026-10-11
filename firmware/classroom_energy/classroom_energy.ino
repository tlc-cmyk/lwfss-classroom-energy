/**
 * 學校節能計劃 — 課室感測器韌體
 * 硬件：ESP32 / ESP32-S3 + DHT22（或 DHT11）+ PIR
 *
 * 功能：
 *  - 讀取溫度、濕度、人體感應（PIR）
 *  - 經 Wi-Fi PUT JSON 到 Firebase Realtime Database
 *  - 定期上報 + 佔用狀態改變時即時上報
 *
 * 依賴函式庫（Arduino Library Manager 搜尋安裝）：
 *  - DHT sensor library (Adafruit)
 *  - Adafruit Unified Sensor
 *  - ArduinoJson (bblanchon) — 建議 v6.21+ 或 v7
 *
 * 板型建議：ESP32-S3 DevKitC-1 或 ESP32 Dev Module
 * 使用前：cp config.h.example config.h 並填入 Wi-Fi / Firebase / 腳位
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <time.h>
#include "config.h"

DHT dht(PIN_DHT, DHT_TYPE);

bool lastOccupiedRaw = false;
bool occupiedStable = false;
unsigned long lastOccupancyChange = 0;
unsigned long lastReport = 0;
unsigned long lastWifiAttempt = 0;
bool prevReportedOcc = false;
bool hasPrevOcc = false;

void setLed(bool on) {
#if defined(PIN_LED)
#if LED_ACTIVE_HIGH
  digitalWrite(PIN_LED, on ? HIGH : LOW);
#else
  digitalWrite(PIN_LED, on ? LOW : HIGH);
#endif
#endif
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  unsigned long now = millis();
  if (now - lastWifiAttempt < WIFI_RETRY_MS && lastWifiAttempt != 0) return false;
  lastWifiAttempt = now;

  Serial.print(F("連接 Wi-Fi: "));
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000UL) {
    delay(250);
    Serial.print('.');
    setLed((millis() / 250) % 2 == 0);
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("已連接，IP = "));
    Serial.println(WiFi.localIP());
    setLed(true);
    return true;
  }
  Serial.println(F("Wi-Fi 連接失敗"));
  setLed(false);
  return false;
}

void syncTime() {
  // 香港 UTC+8
  configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov", "hk.pool.ntp.org");
  Serial.print(F("同步 NTP"));
  for (int i = 0; i < 20; i++) {
    time_t now = time(nullptr);
    if (now > 1700000000) {
      Serial.println(F(" 完成"));
      return;
    }
    Serial.print('.');
    delay(500);
  }
  Serial.println(F(" 超時（會繼續運行）"));
}

int64_t nowEpochMs() {
  time_t epoch = time(nullptr);
  if (epoch > 1700000000) {
    return (int64_t)epoch * 1000LL;
  }
  // NTP 未就緒：回傳 0，網站會當離線／異常；下次成功同步後會正常
  return 0;
}

bool readSensors(float &temp, float &humidity, bool &occupied) {
  humidity = dht.readHumidity();
  temp = dht.readTemperature();

  if (isnan(humidity) || isnan(temp)) {
    Serial.println(F("DHT 讀取失敗"));
    return false;
  }

  // PIR：多數模組 HIGH = 偵測到人；若你嘅模組相反，改成 == LOW
  bool raw = digitalRead(PIN_PIR) == HIGH;
  unsigned long now = millis();

  if (raw != lastOccupiedRaw) {
    lastOccupiedRaw = raw;
    lastOccupancyChange = now;
  }
  if (now - lastOccupancyChange >= OCCUPANCY_DEBOUNCE_MS) {
    occupiedStable = lastOccupiedRaw;
  }
  occupied = occupiedStable;
  return true;
}

bool postToFirebase(float temp, float humidity, bool occupied) {
  if (WiFi.status() != WL_CONNECTED) return false;

  String url = String("https://") + FIREBASE_HOST + FIREBASE_PATH + ".json";
  if (strlen(FIREBASE_AUTH) > 0) {
    url += "?auth=";
    url += FIREBASE_AUTH;
  }

  // JSON schema（同網站 docs/js/data.js 約定）
  // { roomId, name, temp, humidity, occupied, updatedAt }
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<256> doc;
#endif
  doc["roomId"] = ROOM_ID;
  doc["name"] = ROOM_NAME;
  doc["temp"] = roundf(temp * 10.0f) / 10.0f;
  doc["humidity"] = (int)lroundf(humidity);
  doc["occupied"] = occupied;
  doc["updatedAt"] = nowEpochMs();

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  // PUT：覆蓋 /rooms/Rxx 成個物件
  int code = http.PUT(body);
  String resp = http.getString();
  http.end();

  Serial.printf("Firebase PUT HTTP %d\n  → %s\n  ← %s\n", code, body.c_str(), resp.c_str());
  return code >= 200 && code < 300;
}

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println();
  Serial.println(F("=== 學校節能計劃 / Classroom Energy ==="));
  Serial.printf("Room %s (%s)\n", ROOM_ID, ROOM_NAME);

#if defined(PIN_LED)
  pinMode(PIN_LED, OUTPUT);
  setLed(false);
#endif
  pinMode(PIN_PIR, INPUT);
  dht.begin();

  if (connectWifi()) {
    syncTime();
  }

  float t, h;
  bool occ;
  if (readSensors(t, h, occ) && connectWifi()) {
    if (postToFirebase(t, h, occ)) {
      lastReport = millis();
      prevReportedOcc = occ;
      hasPrevOcc = true;
    }
  }
}

void loop() {
  float temp, humidity;
  bool occupied;
  bool ok = readSensors(temp, humidity, occupied);

  unsigned long now = millis();
  bool occupancyChanged = hasPrevOcc && (occupied != prevReportedOcc);
  bool due = (lastReport == 0) || (now - lastReport >= REPORT_INTERVAL_MS);

  if (ok && (due || occupancyChanged)) {
    if (connectWifi()) {
      if (nowEpochMs() == 0) {
        syncTime();
      }
      if (postToFirebase(temp, humidity, occupied)) {
        lastReport = now;
        prevReportedOcc = occupied;
        hasPrevOcc = true;
      }
    }
  }

  delay(200);
}

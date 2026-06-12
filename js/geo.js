// ─── GEO MODULE — GPS автогид ─────────────────────────────────────
// Geolocation API: следит за позицией, авtozапускает аудио при
// входе в радиус GPS_RADIUS метров от остановки.

const GPS_RADIUS = 50; // метры
let gpsWatchId   = null;
let gpsActive    = false;
let notifiedStops = new Set(); // уже сработавшие остановки в этой сессии

function toggleGPS() {
  if (gpsActive) stopGPS();
  else startGPS();
}

function startGPS() {
  if (!navigator.geolocation) {
    showToast('Геолокация не поддерживается вашим браузером');
    return;
  }
  gpsActive = true;
  notifiedStops.clear();
  _setGPSBtn(true);
  showToast('GPS включён · разрешите геолокацию в браузере');

  gpsWatchId = navigator.geolocation.watchPosition(
    _onPosition,
    _onError,
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

function stopGPS() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
  gpsActive = false;
  _setGPSBtn(false);
  showToast('GPS отключён');
}

function _onPosition(pos) {
  const { latitude: lat, longitude: lng } = pos.coords;

  // Проверяем близость к каждой остановке
  STOPS.forEach((s, i) => {
    if (done.has(i) || notifiedStops.has(i)) return;
    if (_dist(lat, lng, s.lat, s.lng) <= GPS_RADIUS) {
      notifiedStops.add(i);
      selectStop(i);
      showTab('g');
      startSpeak();
      showToast(`📍 Вы прибыли на точку ${i + 1}: ${s.n}`);
    }
  });
}

function _onError(err) {
  const msg = {
    1: 'Нет разрешения на геолокацию. Разрешите в настройках браузера.',
    2: 'Не удалось определить позицию.',
    3: 'Превышено время ожидания GPS.'
  }[err.code] || 'Ошибка GPS';
  showToast(msg);
  stopGPS();
}

function _setGPSBtn(on) {
  const btn = document.getElementById('btn-gps');
  if (!btn) return;
  btn.classList.toggle('on', on);
  btn.title = on ? 'GPS активен — нажмите для отключения' : 'Включить GPS-автогид';
  btn.innerHTML = `${on ? '📡' : '📍'}<span class="btn-gps-label">Автоследование</span>`;
}

function _dist(lat1, lng1, lat2, lng2) {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── TOAST ─────────────────────────────────────────────────────────
let _toastTimer = null;

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
}

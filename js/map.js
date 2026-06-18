// ─── MAP MODULE ─────────────────────────────────────────────────
// Leaflet + OpenStreetMap (CartoDB Dark). Без API-ключей.

let map        = null;
let lmarkers   = [];
let userMarker = null;

// ── СЛЕЖЕНИЕ ───────────────────────────────────────────────────────
let mapTrackId       = null;   // id watchPosition карты
let isFollowing      = true;   // карта следует за позицией
let isProgrammaticMove = false; // флаг: движение из кода, не пальцем
let lastPos          = null;   // последняя известная позиция [lat, lng]

const BADGE_COLORS = { s: '#4A90D9', b: '#3D8C5A', f: '#C87A30', h: '#7C3AED', p: '#0BA5B3' };
const BADGE_ICONS  = { s: '🏛', b: '🍺', f: '🍽', h: '🏨', p: '🏖' };

function initMap() {
  const centerLat = STOPS.reduce((s, p) => s + p.lat, 0) / STOPS.length;
  const centerLng = STOPS.reduce((s, p) => s + p.lng, 0) / STOPS.length;
  map = L.map('map', { zoomControl: true }).setView([centerLat, centerLng], 15);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(map);

  // Маршрут пунктиром
  const pts = STOPS.map(s => [s.lat, s.lng]);
  L.polyline(pts, {
    color: '#B8860B',
    weight: 3,
    opacity: 0.85,
    dashArray: '6,4'
  }).addTo(map);

  // Маркеры
  STOPS.forEach((s, i) => {
    const m = L.marker([s.lat, s.lng], { icon: makeIcon(i, s, false, false) }).addTo(map);
    m.bindPopup(`<b>${s.n}</b><br><small>${s.time}</small>`);
    m.on('click', () => { selectStop(i); showTab('g'); });
    lmarkers.push(m);
  });

  // Дополнительные метки (отель, транспорт и т.п.) из stops.js
  if (typeof MARKERS !== 'undefined') {
    MARKERS.forEach(m => {
      const icon = L.divIcon({
        html: `<div style="width:34px;height:34px;background:${m.color || '#333'};border-radius:8px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.6)">${m.label}</div>`,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(m.title);
    });
  }

  // Кнопка «вернуться к моей позиции»
  const FollowControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd() {
      const btn = L.DomUtil.create('button', 'map-follow-btn');
      btn.id = 'btn-follow';
      L.DomEvent.on(btn, 'click', _onFollowClick);
      L.DomEvent.disableClickPropagation(btn);
      return btn;
    }
  });
  new FollowControl().addTo(map);
  _updateFollowBtn();

  // Ручное движение — выключить слежение
  map.on('dragstart', () => {
    if (!isProgrammaticMove) {
      isFollowing = false;
      _updateFollowBtn();
    }
  });
  map.on('moveend', () => { isProgrammaticMove = false; });

  // Запустить слежение за геопозицией
  startMapTracking();
}

function makeIcon(i, s, isActive, isDone) {
  const color = isActive ? '#C9A84C' : isDone ? '#888' : (BADGE_COLORS[s.badge] || '#C9A84C');
  const sz    = isActive ? 34 : 30;
  const emoji = BADGE_ICONS[s.badge] || '📍';
  const cnt   = isDone && !isActive ? '✓' : emoji;
  const fs    = isDone && !isActive ? '13px' : (isActive ? '18px' : '15px');
  const bdr   = isActive ? '3px solid #fff' : '2px solid rgba(255,255,255,0.8)';
  const shd   = isActive ? '0 2px 10px rgba(0,0,0,.65)' : '0 2px 5px rgba(0,0,0,.4)';

  const labelHtml = isActive
    ? `<div style="position:absolute;top:${Math.floor((sz-20)/2)}px;left:${sz+6}px;background:${color};color:#fff;padding:1px 8px;border-radius:10px;font-size:11.5px;font-weight:700;white-space:nowrap;box-shadow:0 1px 5px rgba(0,0,0,.35);line-height:20px;pointer-events:none">${s.n}</div>`
    : '';

  return L.divIcon({
    html: `<div style="position:relative;overflow:visible;width:${sz}px;height:${sz}px">
      <div style="width:${sz}px;height:${sz}px;background:${color};border-radius:50%;border:${bdr};display:flex;align-items:center;justify-content:center;font-size:${fs};box-shadow:${shd}">${cnt}</div>
      ${labelHtml}
    </div>`,
    className: '',
    iconSize:   [0, 0],
    iconAnchor: [sz >> 1, sz >> 1]
  });
}

function updateMapMarkers() {
  if (!map) return;
  lmarkers.forEach((m, i) => {
    const s = STOPS[i];
    m.setIcon(makeIcon(i, s, i === cur, done.has(i) && i !== cur));
    m.setZIndexOffset(i === cur ? 1000 : 0);
  });
}

function mapFlyTo(lat, lng) {
  if (!map) return;
  // Пользователь выбрал точку — карта показывает её, слежение отключается
  isFollowing = false;
  _updateFollowBtn();
  isProgrammaticMove = true;
  map.setView([lat, lng], 16, { animate: true });
}

// ── СЛЕЖЕНИЕ ЗА ГЕОПОЗИЦИЕЙ ────────────────────────────────────────
function startMapTracking() {
  if (mapTrackId !== null) return; // уже подписан
  mapTrackId = 1; // флаг «подписан»
  onPositionUpdate((lat, lng) => {
    lastPos = [lat, lng];
    updateUserMarker(lat, lng);
    if (isFollowing) {
      isProgrammaticMove = true;
      map.panTo([lat, lng]);
    }
  });
  _ensureWatch(); // запускаем общий watchPosition если ещё не запущен
}

function _onFollowClick() {
  isFollowing = true;
  _updateFollowBtn();
  if (lastPos) {
    isProgrammaticMove = true;
    map.setView(lastPos, Math.max(map.getZoom(), 16), { animate: true });
  }
}

function _updateFollowBtn() {
  const btn = document.getElementById('btn-follow');
  if (!btn) return;
  btn.textContent = isFollowing ? '◎' : '📍';
  btn.classList.toggle('active', isFollowing);
  btn.title = isFollowing ? 'Слежение включено' : 'Вернуться к моей позиции';
}

// ── СИНЯЯ ТОЧКА ПОЛЬЗОВАТЕЛЯ ──────────────────────────────────────
function updateUserMarker(lat, lng) {
  if (!map) return;
  if (!userMarker) {
    const icon = L.divIcon({
      html: '<div class="user-dot"><div class="user-pulse"></div></div>',
      className: '',
      iconSize:   [20, 20],
      iconAnchor: [10, 10]
    });
    userMarker = L.marker([lat, lng], { icon, interactive: false, zIndexOffset: 1000 })
      .addTo(map);
  } else {
    userMarker.setLatLng([lat, lng]);
  }
}

function clearUserMarker() {
  if (userMarker && map) {
    map.removeLayer(userMarker);
    userMarker = null;
  }
}

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

const BADGE_COLORS = { s: '#4A90D9', b: '#3D8C5A', f: '#C87A30', h: '#7C3AED' };

function initMap() {
  const centerLat = STOPS.reduce((s, p) => s + p.lat, 0) / STOPS.length;
  const centerLng = STOPS.reduce((s, p) => s + p.lng, 0) / STOPS.length;
  map = L.map('map', { zoomControl: true }).setView([centerLat, centerLng], 15);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(map);

  // Маршрут пунктиром
  const pts = STOPS.map(s => [s.lat, s.lng]);
  L.polyline(pts, {
    color: '#C9A84C',
    weight: 2,
    opacity: 0.6,
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
  const c = isActive ? '#C9A84C' : isDone ? '#3D8C5A' : (BADGE_COLORS[s.badge] || '#C9A84C');
  const sz = isActive ? 32 : 28;
  const isHotel = s.badge === 'h' && !isActive && !isDone;
  const label = isDone && !isActive ? '✓' : isHotel ? '🏨' : String(i + 1);
  const textColor = isActive ? '#000' : '#fff';
  const radius = isHotel ? '6px' : '50%';
  const fontSize = isHotel ? '15px' : (isActive ? 13 : 11) + 'px';
  return L.divIcon({
    html: `<div style="width:${sz}px;height:${sz}px;background:${c};border-radius:${radius};border:${isActive ? 3 : 2}px solid #fff;display:flex;align-items:center;justify-content:center;font-size:${fontSize};font-weight:700;color:${textColor};box-shadow:0 2px 8px rgba(0,0,0,.6)">${label}</div>`,
    className: '',
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2]
  });
}

function updateMapMarkers() {
  if (!map) return;
  lmarkers.forEach((m, i) => {
    const s = STOPS[i];
    m.setIcon(makeIcon(i, s, i === cur, done.has(i) && i !== cur));
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
  if (!navigator.geolocation || mapTrackId !== null) return;
  mapTrackId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      lastPos = [lat, lng];
      updateUserMarker(lat, lng);
      if (isFollowing) {
        isProgrammaticMove = true;
        map.panTo([lat, lng]);
      }
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
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

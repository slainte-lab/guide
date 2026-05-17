// ─── MAP MODULE ─────────────────────────────────────────────────
// Leaflet + OpenStreetMap (CartoDB Dark). Без API-ключей.

let map = null;
let lmarkers = [];

const BADGE_COLORS = { s: '#4A90D9', b: '#3D8C5A', f: '#C87A30' };

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([51.2042, 3.2252], 15);

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
}

function makeIcon(i, s, isActive, isDone) {
  const c = isActive ? '#C9A84C' : isDone ? '#3D8C5A' : (BADGE_COLORS[s.badge] || '#C9A84C');
  const sz = isActive ? 32 : 28;
  const label = isDone && !isActive ? '✓' : String(i + 1);
  const textColor = isActive ? '#000' : '#fff';
  return L.divIcon({
    html: `<div style="width:${sz}px;height:${sz}px;background:${c};border-radius:50%;border:${isActive ? 3 : 2}px solid #fff;display:flex;align-items:center;justify-content:center;font-size:${isActive ? 13 : 11}px;font-weight:700;color:${textColor};box-shadow:0 2px 8px rgba(0,0,0,.6)">${label}</div>`,
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
  if (map) map.setView([lat, lng], 16, { animate: true });
}

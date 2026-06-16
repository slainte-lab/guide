// Генерация KML-маршрута для Google Maps
// Запуск: node tools/generate-kml.js <city-path>
// Примеры: node generate-kml.js bruges
//          node generate-kml.js ghent/walk
//          node generate-kml.js paris/day1

const fs   = require('fs');
const path = require('path');

const cityArg = process.argv[2];
if (!cityArg) {
  console.error('Usage: node generate-kml.js <city-path>');
  process.exit(1);
}

const root      = path.resolve(__dirname, '..');
const cityDir   = path.join(root, ...cityArg.split('/'));
const stopsFile = path.join(cityDir, 'data', 'stops.js');

if (!fs.existsSync(stopsFile)) {
  console.error('Файл не найден:', stopsFile);
  process.exit(1);
}

const STOPS = require(stopsFile);

// Google Maps standard icon set — рендерятся в KML без внешних ресурсов
const BADGE_ICONS = {
  s: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  b: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  f: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
  h: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png',
};
const BADGE_LABELS = { s: 'Достопримечательность', b: 'Бар', f: 'Еда', h: 'Отель' };

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Уникальные категории этого маршрута
const badges = [...new Set(STOPS.map(s => s.badge))];

const styleXml = badges.map(b => `
  <Style id="badge_${b}">
    <IconStyle>
      <scale>1.1</scale>
      <Icon><href>${BADGE_ICONS[b] || BADGE_ICONS.s}</href></Icon>
    </IconStyle>
    <LabelStyle><scale>0.85</scale></LabelStyle>
  </Style>`).join('');

// Линия маршрута (только если есть walking connectors)
const hasRoute = STOPS.some(s => s.walk);
const routeXml = hasRoute ? `
  <Placemark>
    <name>Маршрут</name>
    <Style>
      <LineStyle><color>ff2266cc</color><width>3</width></LineStyle>
      <PolyStyle><fill>0</fill></PolyStyle>
    </Style>
    <LineString>
      <tessellate>1</tessellate>
      <coordinates>${STOPS.map(s => `${s.lng},${s.lat},0`).join(' ')}</coordinates>
    </LineString>
  </Placemark>` : '';

// Точки маршрута
const placemarks = STOPS.map((s, i) => `
  <Placemark>
    <name>${esc(`${i + 1}. ${s.n}`)}</name>
    <description><![CDATA[${s.sub || ''}<br/>⏰ ${s.time || ''}${s.btxt ? '<br/>' + s.btxt : ''}]]></description>
    <styleUrl>#badge_${s.badge}</styleUrl>
    <Point><coordinates>${s.lng},${s.lat},0</coordinates></Point>
  </Placemark>`).join('');

const cityLabel = cityArg.split('/').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' — ');

const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${esc(cityLabel)}</name>
  <open>1</open>
${styleXml}
${routeXml}
${placemarks}
</Document>
</kml>
`;

const outPath = path.join(cityDir, 'data', 'route.kml');
fs.writeFileSync(outPath, kml.trim(), 'utf8');
console.log('OK  →', path.relative(root, outPath));

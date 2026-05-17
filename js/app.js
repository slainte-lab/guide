// ─── APP.JS — главная логика ─────────────────────────────────────

let cur  = -1;          // индекс текущей остановки
let done = new Set();   // посещённые остановки
let tab  = 'g';         // активная вкладка: 'g' = гид, 'm' = карта

// ── ТАБЫ ──────────────────────────────────────────────────────────
function showTab(t) {
  tab = t;
  document.querySelectorAll('.tab-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && t === 'g') || (i === 1 && t === 'm'))
  );
  document.getElementById('view-g').classList.toggle('show', t === 'g');
  document.getElementById('view-m').classList.toggle('show', t === 'm');
  if (t === 'm' && !map) initMap();
}

// ── СПИСОК ОСТАНОВОК ─────────────────────────────────────────────
function renderList() {
  document.getElementById('slist').innerHTML = STOPS.map((s, i) => {
    const nextWalk = i < STOPS.length - 1 && STOPS[i + 1].walk
      ? `<div class="walk-conn"><span class="walk-conn-time">🚶 ${STOPS[i + 1].walk.split(' · ')[0]}</span></div>`
      : '';
    return `
    <div class="stop ${i === cur ? 'cur' : ''} ${done.has(i) && i !== cur ? 'done' : ''}"
         onclick="selectStop(${i})">
      <div class="stop-body">
        <div class="stop-n">${done.has(i) && i !== cur ? '✓' : i + 1}</div>
        <div class="stop-info">
          <div class="stop-name">${s.n}</div>
          <div class="stop-meta">
            <span class="stop-time">⏰ ${s.time}</span>
            <span class="tag tag-${s.badge}">${s.btxt}</span>
          </div>
        </div>
        <div class="stop-arr">${i === cur ? '▶' : '›'}</div>
      </div>
    </div>${nextWalk}`;
  }).join('');
}

// ── ВЫБОР ОСТАНОВКИ ──────────────────────────────────────────────
function selectStop(i) {
  stopSpeak();
  cur = i;
  const s = STOPS[i];

  document.getElementById('pl-loc').textContent   = `Остановка ${i + 1} из ${STOPS.length} · ${s.time}`;
  document.getElementById('pl-title').textContent = `${s.n} — ${s.sub}`;
  document.getElementById('pl-text').textContent  = s.text;
  document.getElementById('bprev').disabled        = i === 0;
  document.getElementById('bnext').disabled        = i === STOPS.length - 1;
  document.getElementById('bplay').textContent     = '▶ Слушать';

  // Блок «до следующей»
  const pw = document.getElementById('pl-walk');
  if (s.walk) {
    pw.classList.add('show');
    const [wt, wd] = s.walk.split(' · ');
    document.getElementById('wtime').textContent = wt || '—';
    document.getElementById('wdist').textContent = wd || '—';
  } else {
    pw.classList.remove('show');
  }

  renderList();
  updateMapMarkers();
  if (map) mapFlyTo(s.lat, s.lng);

  // Скролл к карточке
  const cards = document.querySelectorAll('.stop');
  if (cards[i]) cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── НАВИГАЦИЯ ─────────────────────────────────────────────────────
function go(d) {
  const n = cur + d;
  if (n >= 0 && n < STOPS.length) selectStop(n);
}

// ── ОТМЕТИТЬ ПОСЕЩЁННЫМ ──────────────────────────────────────────
function markDone() {
  if (cur < 0) return;
  done.add(cur);
  document.getElementById('vcount').textContent = done.size;
  document.getElementById('prog').style.width   = (done.size / STOPS.length * 100) + '%';
  renderList();
  updateMapMarkers();
}

// ── ОТКРЫТЬ В GOOGLE MAPS ────────────────────────────────────────
function openInMaps() {
  if (cur < 0) return;
  const s = STOPS[cur];
  window.open(`https://maps.google.com/?q=${s.lat},${s.lng}`, '_blank');
}

// ── СТАРТ ─────────────────────────────────────────────────────────
document.getElementById('stop-total').textContent = STOPS.length;
renderList();
selectStop(0);

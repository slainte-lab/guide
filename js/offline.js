// ─── OFFLINE MODULE — регистрация SW + предзагрузка аудио ────────

// Регистрация service worker (путь вычисляется по глубине страницы)
(function () {
  if (!('serviceWorker' in navigator)) return;
  const depth = location.pathname.replace(/\/$/, '').split('/').filter(Boolean).length;
  const swPath = '../'.repeat(Math.max(depth - 1, 0)) + 'sw.js';
  navigator.serviceWorker.register(swPath).catch(() => {});
})();

// ── КНОПКА ОФЛАЙН ────────────────────────────────────────────────

async function initOfflineBtn() {
  const btn = document.getElementById('btn-offline');
  if (!btn || typeof STOPS === 'undefined') return;

  // Проверяем, всё ли уже закэшировано
  const allCached = await _checkAllCached();
  if (allCached) _setBtnCached(btn);
}

async function precacheAudio() {
  const btn = document.getElementById('btn-offline');
  if (!btn) return;

  if (!('caches' in window)) {
    showToast('Офлайн-режим не поддерживается браузером');
    return;
  }

  const files = [];
  for (const s of STOPS) {
    if (!s.id) continue;
    files.push(`data/audio/${s.id}_main.mp3`);
    if (s.facts) files.push(`data/audio/${s.id}_facts.mp3`);
  }

  btn.disabled = true;
  const label = btn.querySelector('.btn-offline-label');

  const cache = await caches.open('ag-audio-v1');
  let done = 0;
  for (const f of files) {
    try {
      const existing = await cache.match(new Request(f));
      if (!existing) {
        const resp = await fetch(f);
        if (resp.ok) await cache.put(f, resp);
      }
    } catch (e) {}
    done++;
    if (label) label.textContent = Math.round(done / files.length * 100) + '%';
  }

  _setBtnCached(btn);
  showToast('Аудио сохранено — маршрут работает без интернета');
}

async function _checkAllCached() {
  if (!('caches' in window) || typeof STOPS === 'undefined') return false;
  try {
    const cache = await caches.open('ag-audio-v1');
    for (const s of STOPS) {
      if (!s.id) continue;
      if (!await cache.match(`data/audio/${s.id}_main.mp3`)) return false;
    }
    return true;
  } catch (e) { return false; }
}

function _setBtnCached(btn) {
  btn.disabled = false;
  btn.classList.add('cached');
  const label = btn.querySelector('.btn-offline-label');
  if (label) label.textContent = 'Готово';
  btn.title = 'Аудио сохранено на устройстве';
}

// Запускаем проверку после загрузки страницы
document.addEventListener('DOMContentLoaded', initOfflineBtn);

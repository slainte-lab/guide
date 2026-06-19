// ─── AUDIO MODULE ────────────────────────────────────────────────
// Только MP3-файлы из data/audio/{id}_main.mp3 / {id}_facts.mp3

let speaking     = false;
let isPaused     = false;
let _audio       = null;   // HTMLAudioElement
let _playPromise = null;   // pending play() promise (нужно для iOS)

// ── ПУБЛИЧНЫЙ API ──────────────────────────────────────────────────

function togglePlay() {
  if (speaking)  { pauseSpeak();  return; }
  if (isPaused)  { resumeSpeak(); return; }
  if (cur < 0)   return;
  startSpeak();
}

function startSpeak() {
  stopSpeak();
  if (cur < 0) return;

  const isFactsNow = typeof factsMode !== 'undefined' && factsMode && STOPS[cur].facts;
  const type = isFactsNow ? 'facts' : 'main';

  _audio = new Audio(`data/audio/${STOPS[cur].id}_${type}.mp3`);

  _audio.onplay  = () => { speaking = true;  isPaused = false; _updatePlayBtn(); _hidePlayBanner(); };
  _audio.onpause = () => {
    speaking = false;
    isPaused = _audio.currentTime > 0 && !_audio.ended;
    _updatePlayBtn();
  };
  _audio.onended = () => {
    speaking = false; isPaused = false;
    _playPromise = null;
    _updatePlayBtn();
    if (type === 'main') {
      markDone();
      _maybeAutoFacts();
    }
  };
  _audio.onerror = () => {
    speaking = false; isPaused = false; _audio = null; _playPromise = null;
    _updatePlayBtn();
    showToast('Аудио не найдено');
  };

  // Оптимистично отмечаем как playing — кнопка сразу показывает «Пауза»,
  // не даём повторному тапу вызвать startSpeak() до срабатывания onplay.
  speaking = true;
  _updatePlayBtn();

  _playPromise = _audio.play();
  if (_playPromise) {
    _playPromise.catch(e => {
      _playPromise = null;
      if (!_audio) return; // уже остановлено через stopSpeak
      speaking = false;
      if (e && e.name === 'NotAllowedError') {
        // iOS заблокировал автовоспроизведение — ждём тапа пользователя
        isPaused = true;
        _updatePlayBtn();
        _showPlayBanner();
      } else {
        isPaused = false; _audio = null;
        _updatePlayBtn();
      }
    });
  }
}

function pauseSpeak() {
  if (!_audio) return;
  if (_playPromise) {
    // iOS: нельзя pause() пока play() pending — ждём resolve
    _playPromise.then(() => { if (_audio) _audio.pause(); }).catch(() => {});
  } else {
    _audio.pause();
  }
}

function resumeSpeak() {
  if (_audio) _audio.play();
}

function stopSpeak() {
  speaking = false; isPaused = false;
  _hidePlayBanner();
  const p = _playPromise;
  _playPromise = null;
  if (_audio) {
    const a = _audio;
    _audio = null;
    a.onplay = a.onpause = a.onended = a.onerror = null;
    const doStop = () => { try { a.pause(); } catch(_) {} a.src = ''; };
    // iOS: если play() ещё pending, pause() бросает AbortError → ждём
    if (p) { p.then(doStop).catch(doStop); } else { doStop(); }
  }
  _updatePlayBtn();
}

// ── АВТОЗАПУСК ФАКТОВ В GPS-РАДИУСЕ ──────────────────────────────
function _maybeAutoFacts() {
  if (cur < 0 || !STOPS[cur].facts) return;
  if (typeof gpsActive === 'undefined' || !gpsActive) return;
  if (typeof lastPos === 'undefined' || !lastPos) return;
  if (typeof _dist !== 'function' || typeof GPS_RADIUS === 'undefined') return;
  const s = STOPS[cur];
  if (_dist(lastPos[0], lastPos[1], s.lat, s.lng) > GPS_RADIUS) return;
  const stopAtSchedule = cur; // фиксируем точку — вдруг пользователь переключится
  setTimeout(() => {
    if (cur !== stopAtSchedule) return; // ушли на другую точку
    if (speaking || isPaused || cur < 0) return;
    factsMode = true;
    document.getElementById('pl-text').textContent = STOPS[cur].facts;
    const bFacts = document.getElementById('btn-facts');
    if (bFacts) { bFacts.disabled = false; bFacts.classList.add('on'); }
    startSpeak();
  }, 2000);
}

// ── БАННЕР «НАЖМИТЕ ▶» ────────────────────────────────────────────

function _showPlayBanner() {
  const banner = document.getElementById('play-banner');
  const text   = document.getElementById('play-banner-text');
  if (!banner || !text) return;
  const name = cur >= 0 ? STOPS[cur].n : '';
  const mode = typeof factsMode !== 'undefined' && factsMode ? 'Доп. факты' : 'Аудио';
  text.textContent = `📍 ${mode}: ${name}`;
  banner.classList.add('show');
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

function _hidePlayBanner() {
  const banner = document.getElementById('play-banner');
  if (banner) banner.classList.remove('show');
}

function bannerPlay() {
  _hidePlayBanner();
  resumeSpeak();
}

// ── ВНУТРЕННИЕ ─────────────────────────────────────────────────────

function _updatePlayBtn() {
  const btn = document.getElementById('bplay');
  if (!btn) return;
  if (speaking) {
    btn.innerHTML = '<span class="pulse"></span>Пауза';
  } else if (isPaused) {
    btn.textContent = '▶ Продолжить';
  } else {
    btn.textContent = '▶ Слушать';
  }
}

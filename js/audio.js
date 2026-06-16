// ─── AUDIO MODULE ────────────────────────────────────────────────
// Только MP3-файлы из data/audio/{id}_main.mp3 / {id}_facts.mp3

let speaking = false;
let isPaused = false;
let _audio   = null;    // HTMLAudioElement

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

  _audio.onplay  = () => { speaking = true;  isPaused = false; _updatePlayBtn(); };
  _audio.onpause = () => {
    speaking = false;
    isPaused = _audio.currentTime > 0 && !_audio.ended;
    _updatePlayBtn();
  };
  _audio.onended = () => {
    speaking = false; isPaused = false;
    _updatePlayBtn();
    if (type === 'main') {
      markDone();
      _maybeAutoFacts();
    }
  };
  _audio.onerror = () => {
    speaking = false; isPaused = false; _audio = null;
    _updatePlayBtn();
    showToast('Аудио не найдено');
  };

  _audio.play().catch(e => {
    speaking = false;
    if (e && e.name === 'NotAllowedError') {
      // iOS autoplay blocked — audio loaded, waiting for user tap
      isPaused = true;
      _updatePlayBtn();
      showToast('Нажмите ▶ для воспроизведения');
    } else {
      isPaused = false; _audio = null;
      _updatePlayBtn();
    }
  });
}

function pauseSpeak() {
  if (_audio) _audio.pause();
}

function resumeSpeak() {
  if (_audio) _audio.play();
}

function stopSpeak() {
  speaking = false; isPaused = false;
  if (_audio) {
    _audio.onplay = _audio.onpause = _audio.onended = _audio.onerror = null;
    _audio.pause();
    _audio.src = '';
    _audio = null;
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
  // ещё в радиусе — через 2 с запускаем факты
  setTimeout(() => {
    if (speaking || isPaused || cur < 0) return; // пользователь уже что-то запустил
    factsMode = true;
    document.getElementById('pl-text').textContent = STOPS[cur].facts;
    const bFacts = document.getElementById('btn-facts');
    if (bFacts) { bFacts.disabled = false; bFacts.classList.add('on'); }
    startSpeak();
  }, 2000);
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

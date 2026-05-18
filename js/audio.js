// ─── AUDIO MODULE ────────────────────────────────────────────────
// Режим 1: MP3-файлы из data/audio/ (Google TTS, точная пауза)
// Режим 2: Web Speech API (fallback, если MP3 не найден)

let speaking     = false;
let isPaused     = false;
let _audio       = null;    // HTMLAudioElement (MP3-режим)
let _useTTS      = false;   // true = MP3 не найден, используем Speech API

// TTS-fallback состояние
let _chunks      = [];
let _chunkIdx    = 0;
let _lastCharIdx = 0;

if (window.speechSynthesis) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices());
}

// ── ПУБЛИЧНЫЙ API ──────────────────────────────────────────────────

function togglePlay() {
  if (speaking)  { pauseSpeak();  return; }
  if (isPaused)  { resumeSpeak(); return; }
  if (cur < 0)   return;
  startSpeak();
}

// Запускает аудио для текущей остановки (cur) и режима (factsMode).
// Сначала пробует MP3, при ошибке падает на TTS.
function startSpeak() {
  stopSpeak();
  if (cur < 0) return;

  const isFactsNow = typeof factsMode !== 'undefined' && factsMode && STOPS[cur].facts;
  const type = isFactsNow ? 'facts' : 'main';
  const text = isFactsNow ? STOPS[cur].facts : STOPS[cur].text;

  _useTTS = false;
  _audio  = new Audio(`data/audio/stop_${cur}_${type}.mp3`);

  _audio.onplay  = () => { speaking = true;  isPaused = false; _updatePlayBtn(); };
  _audio.onpause = () => {
    speaking = false;
    isPaused = _audio.currentTime > 0 && !_audio.ended;
    _updatePlayBtn();
  };
  _audio.onended = () => {
    speaking = false; isPaused = false;
    _updatePlayBtn();
    if (type === 'main') markDone();
  };
  _audio.onerror = () => {
    _useTTS = true; _audio = null;
    _startTTS(text);
  };

  _audio.play().catch(() => { _useTTS = true; _audio = null; _startTTS(text); });
}

function pauseSpeak() {
  if (!_useTTS && _audio) {
    _audio.pause();           // onpause обновит флаги
  } else {
    isPaused = true; speaking = false;
    speechSynthesis.cancel();
    _updatePlayBtn();
  }
}

function resumeSpeak() {
  if (!_useTTS && _audio) {
    _audio.play();            // продолжает с точной позиции
  } else {
    isPaused = false;
    _speakChunk();
  }
}

function stopSpeak() {
  speaking = false; isPaused = false;
  if (_audio) { _audio.pause(); _audio.src = ''; _audio = null; }
  speechSynthesis.cancel();
  _chunks = []; _chunkIdx = 0; _lastCharIdx = 0;
  _updatePlayBtn();
}

// ── TTS FALLBACK ───────────────────────────────────────────────────

function _startTTS(text) {
  _chunks = _toChunks(text);
  _chunkIdx = 0; _lastCharIdx = 0;
  _speakChunk();
}

function _speakChunk() {
  if (_chunkIdx >= _chunks.length) {
    speaking = false; isPaused = false; _lastCharIdx = 0;
    _updatePlayBtn();
    const isFactsNow = typeof factsMode !== 'undefined' && factsMode;
    if (!isFactsNow) markDone();
    return;
  }

  const fullText     = _chunks[_chunkIdx];
  const resumeOffset = _lastCharIdx;
  const text         = resumeOffset > 0 ? fullText.substring(resumeOffset) : fullText;

  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = 'ru-RU';
  utt.rate   = 0.82;
  utt.pitch  = 0.94;

  const ruVoice = _bestRuVoice(speechSynthesis.getVoices());
  if (ruVoice) utt.voice = ruVoice;

  // Запоминаем позицию слова для точного возобновления
  utt.onboundary = (e) => {
    if (e.name === 'word') _lastCharIdx = resumeOffset + e.charIndex;
  };
  utt.onstart = () => { speaking = true; _updatePlayBtn(); };
  utt.onend   = () => {
    if (isPaused) return;
    _lastCharIdx = 0; _chunkIdx++;
    setTimeout(_speakChunk, 280);
  };
  utt.onerror = (e) => {
    if (isPaused || e.error === 'interrupted' || e.error === 'canceled') return;
    speaking = false; _updatePlayBtn();
  };

  speechSynthesis.speak(utt);
}

// Приоритет: Google онлайн → Microsoft Neural → Microsoft → Apple → первый ru
function _bestRuVoice(voices) {
  const ru = voices.filter(v => v.lang.startsWith('ru'));
  return (
    ru.find(v => v.name.includes('Google'))    ||
    ru.find(v => v.name.includes('Neural'))    ||
    ru.find(v => v.name.includes('Microsoft')) ||
    ru.find(v => /Milena|Katya/i.test(v.name)) ||
    ru[0] || null
  );
}

function _toChunks(text) {
  return text
    .split(/\n/)
    .flatMap(line => {
      const sents = line.match(/[^.!?]+[.!?]+/g);
      return sents || (line.trim() ? [line.trim()] : []);
    })
    .filter(s => s.trim().length > 1);
}

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

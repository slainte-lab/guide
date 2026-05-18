// ─── AUDIO MODULE ────────────────────────────────────────────────
// Пофразовое воспроизведение — поддержка паузы и продолжения.

let speaking  = false;
let isPaused  = false;
let _chunks   = [];      // массив фраз текущего текста
let _chunkIdx = 0;       // индекс текущей фразы

if (window.speechSynthesis) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices());
}

function togglePlay() {
  if (speaking)  { pauseSpeak();  return; }
  if (isPaused)  { resumeSpeak(); return; }
  if (cur < 0)   return;
  const text = (typeof factsMode !== 'undefined' && factsMode && STOPS[cur].facts)
    ? STOPS[cur].facts
    : STOPS[cur].text;
  startSpeak(text);
}

function startSpeak(text) {
  stopSpeak();
  _chunks   = _toChunks(text);
  _chunkIdx = 0;
  _speakChunk();
}

function pauseSpeak() {
  isPaused = true;
  speechSynthesis.cancel();   // onend/onerror подавляются флагом isPaused
  speaking = false;
  _updatePlayBtn();
}

function resumeSpeak() {
  isPaused = false;
  _speakChunk();              // повторяем текущую фразу (она была прервана)
}

function stopSpeak() {
  isPaused  = false;
  speaking  = false;
  _chunks   = [];
  _chunkIdx = 0;
  speechSynthesis.cancel();
  _updatePlayBtn();
}

// ── ВНУТРЕННИЕ ФУНКЦИИ ─────────────────────────────────────────────

function _speakChunk() {
  if (_chunkIdx >= _chunks.length) {
    speaking = false;
    isPaused = false;
    _updatePlayBtn();
    if (typeof factsMode === 'undefined' || !factsMode) markDone();
    return;
  }

  const utt  = new SpeechSynthesisUtterance(_chunks[_chunkIdx]);
  utt.lang   = 'ru-RU';
  utt.rate   = 0.82;
  utt.pitch  = 0.94;

  const voices  = speechSynthesis.getVoices();
  const ruVoice = voices.find(v => v.lang.startsWith('ru'));
  if (ruVoice) utt.voice = ruVoice;

  utt.onstart = () => { speaking = true; _updatePlayBtn(); };

  utt.onend = () => {
    if (isPaused) return;
    _chunkIdx++;
    setTimeout(_speakChunk, 280);   // пауза между фразами
  };

  utt.onerror = e => {
    if (isPaused || e.error === 'interrupted' || e.error === 'canceled') return;
    speaking = false;
    _updatePlayBtn();
  };

  speechSynthesis.speak(utt);
}

function _toChunks(text) {
  return text
    .split(/\n/)                                     // разбиваем по строкам
    .flatMap(line => {
      const sents = line.match(/[^.!?]+[.!?]+/g);   // внутри строки — по предложениям
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

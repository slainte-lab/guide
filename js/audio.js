// ─── AUDIO MODULE ────────────────────────────────────────────────
// Web Speech API (SpeechSynthesis). Работает в Chrome и Safari.
// Для GPS-автозапуска — раскомментируйте watchPosition в app.js.

let speaking = false;
let utt = null;

// Предзагрузка голосов (нужна на некоторых устройствах)
if (window.speechSynthesis) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices());
}

function togglePlay() {
  if (speaking) { stopSpeak(); return; }
  if (cur < 0) return;
  startSpeak(STOPS[cur].text);
}

function startSpeak(text) {
  if (!('speechSynthesis' in window)) {
    alert('Ваш браузер не поддерживает синтез речи.\nИспользуйте Chrome или Safari.');
    return;
  }
  stopSpeak();

  utt = new SpeechSynthesisUtterance(text);
  utt.lang  = 'ru-RU';
  utt.rate  = 0.88;
  utt.pitch = 1;

  // Выбираем русский голос если есть
  const voices = speechSynthesis.getVoices();
  const ruVoice = voices.find(v => v.lang.startsWith('ru'));
  if (ruVoice) utt.voice = ruVoice;

  utt.onstart = () => {
    speaking = true;
    document.getElementById('bplay').innerHTML = '<span class="pulse"></span>Стоп';
  };
  utt.onend = () => {
    speaking = false;
    document.getElementById('bplay').textContent = '▶ Слушать';
    markDone(); // автоотметка после прослушивания
  };
  utt.onerror = () => {
    speaking = false;
    document.getElementById('bplay').textContent = '▶ Слушать';
  };

  speechSynthesis.speak(utt);
}

function stopSpeak() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  speaking = false;
  document.getElementById('bplay').textContent = '▶ Слушать';
}

// Генерация MP3 для любого города через Microsoft Edge TTS (DmitryNeural)
// Запуск: node generate.js <city>
// Флаги:  --force  перегенерировать все, даже существующие файлы

const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs   = require('fs');
const path = require('path');

const VOICE = 'ru-RU-DmitryNeural';
const city  = process.argv[2];
const force = process.argv.includes('--force');

if (!city) {
  console.error('Укажите город: node generate.js <city>  (например: bruges, verona, ghent)');
  process.exit(1);
}

const stopsPath = path.join(__dirname, '..', city, 'data', 'stops.js');
if (!fs.existsSync(stopsPath)) {
  console.error(`Файл не найден: ${stopsPath}`);
  process.exit(1);
}

const STOPS = require(stopsPath);
const OUT   = path.join(__dirname, '..', city, 'data', 'audio');
fs.mkdirSync(OUT, { recursive: true });

let tts;

async function synth(file, text) {
  const outPath = path.join(OUT, file);
  if (!force && fs.existsSync(outPath)) {
    process.stdout.write(`  --  ${file} (пропущен)\n`);
    return;
  }
  const { audioStream } = await tts.toStream(text);
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(outPath);
    audioStream.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
  process.stdout.write(`  OK  ${file}\n`);
  await new Promise(r => setTimeout(r, 500));
}

async function main() {
  let ok = 0, skipped = 0, errors = 0;
  const total = STOPS.reduce((n, s) => n + 1 + (s.facts ? 1 : 0), 0);
  console.log(`\n── ${city} · ${total} файлов ───────────────────\n`);

  tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  for (const s of STOPS) {
    if (!s.id) {
      console.warn(`  !!  Stop "${s.n}" пропущен — нет поля id`);
      continue;
    }
    try {
      const mainFile = `${s.id}_main.mp3`;
      const outPath  = path.join(OUT, mainFile);
      if (!force && fs.existsSync(outPath)) {
        process.stdout.write(`  --  ${mainFile} (пропущен)\n`);
        skipped++;
      } else {
        await synth(mainFile, s.text);
        ok++;
      }
    } catch(e) {
      process.stdout.write(`  ER  ${s.id}_main.mp3: ${e.message}\n`);
      errors++;
    }
    if (s.facts) {
      try {
        const factsFile = `${s.id}_facts.mp3`;
        const outPath   = path.join(OUT, factsFile);
        if (!force && fs.existsSync(outPath)) {
          process.stdout.write(`  --  ${factsFile} (пропущен)\n`);
          skipped++;
        } else {
          await synth(factsFile, s.facts);
          ok++;
        }
      } catch(e) {
        process.stdout.write(`  ER  ${s.id}_facts.mp3: ${e.message}\n`);
        errors++;
      }
    }
  }

  console.log(`\n── Готово: ${ok} сгенерировано, ${skipped} пропущено, ${errors} ошибок ──\n`);
}

main().catch(e => { console.error(e); process.exit(1); });

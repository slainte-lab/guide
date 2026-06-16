// ─── SERVICE WORKER — кэширование аудио для офлайн-работы ────────
const CACHE = 'ag-audio-v1';

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => {
  // удаляем старые версии кэша
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // кэшируем только MP3-файлы аудиогида
  if (!e.request.url.includes('/data/audio/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      });
    })
  );
});

/* Piktogramm-Audioguide – Service Worker fuer Offline-Betrieb.
   WICHTIG bei Updates: die Versionsnummer im Cache-Namen erhoehen,
   damit alle Geraete die neue Fassung erhalten. */
const CACHE = 'audioguide-v6';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['./index.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* Startseite: erst Netz (damit Updates ankommen), sonst Cache */
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/index.html')){
    e.respondWith(
      fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put('./index.html', cp));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Gleiche Herkunft (Audiopakete, Icons, Manifest): erst Cache, sonst Netz + cachen */
  if (url.origin === self.location.origin){
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
        if (r && r.ok){
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
        }
        return r;
      }))
    );
  }
});

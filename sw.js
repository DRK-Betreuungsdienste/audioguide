const CACHE = 'audioguide-v28';
const CORE = ['./', './index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];
/* KI-Modell: gross, darum best-effort vorladen (Installation scheitert nie daran) */
const MODELL = [
  'modell/ort.wasm.min.js',
  'modell/ort-wasm-simd-threaded.mjs',
  'modell/ort-wasm-simd-threaded.wasm',
  'modell/mobilenetv2.onnx',
  'modell/ref_emb_i8.bin',
  'modell/ref_emb_meta.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE).then(() =>
        Promise.allSettled(MODELL.map(u => c.add(u)))
      ))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const eigene = url.origin === location.origin;
  const ocrHost = /jsdelivr\.net|projectnaptha|unpkg\.com|tessdata/.test(url.host);
  if (!eigene && !ocrHost) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(resp => {
        if (resp.ok || resp.type === 'opaque'){
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      });
    })
  );
});

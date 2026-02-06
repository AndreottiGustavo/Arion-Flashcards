const CACHE_NAME = 'arion-v1';
const ASSETS = [
  'index.html',
  'LOGO ÁRION.png',
  'manifest.json'
];

// Instalação e Cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Estratégia: Tenta Rede, se falhar, usa Cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
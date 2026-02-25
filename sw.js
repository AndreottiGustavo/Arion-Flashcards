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

// Notificação de lembrete (push) – exibe quando o app está em segundo plano ou fechado
self.addEventListener('push', (e) => {
  var opts = { body: 'Hora de revisar seus cards!', tag: 'arion-lembrete' };
  if (e.data) {
    try {
      var d = e.data.json();
      if (d.body) opts.body = d.body;
      if (d.title) opts.title = d.title;
    } catch (_) {}
  }
  if (!opts.title) opts.title = 'Árion Flashcards';
  e.waitUntil(
    self.registration.showNotification(opts.title, opts)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length) list[0].focus();
      else if (clients.openWindow) clients.openWindow('/');
    })
  );
});
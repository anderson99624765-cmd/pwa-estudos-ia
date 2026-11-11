// Service Worker — shell offline do app.
// Incremente CACHE_VERSION a cada deploy para forçar a atualização dos arquivos em cache.
const CACHE_VERSION = 'v2';
const CACHE = `estudos-ia-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/src/main.js',
  '/src/firebase.js',
  '/src/firebase-config.js',
  '/src/nav.js',
  '/src/router.js',
  '/src/ui.js',
  '/src/auth.js',
  '/src/db.js',
  '/src/ai.js',
  '/src/voice.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // allSettled: um arquivo ausente não impede a instalação do Service Worker
      Promise.allSettled(APP_SHELL.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return; // chamadas à IA nunca vão para o cache

  const sameOrigin = url.origin === self.location.origin;
  const firebaseSdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!sameOrigin && !firebaseSdk) return; // Firestore/Auth (googleapis.com etc.) passam direto

  // Navegação: rede primeiro; offline cai no index.html em cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Demais arquivos: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then(resp => {
          if (resp && resp.ok) cache.put(request, resp.clone());
          return resp;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    })
  );
});

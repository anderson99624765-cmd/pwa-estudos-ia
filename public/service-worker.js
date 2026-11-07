// Service Worker for PWA - cache static assets and index.html
const CACHE_NAME = 'pwa-estudos-ia-v1';
const OFFLINE_URL = '/index.html';

const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/src/main.js',
  '/src/router.js',
  '/src/ui.js',
  '/src/auth.js',
  '/src/db.js',
  '/src/ai.js',
  '/src/voice.js',
  // icons will be added later
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // Network first for API calls (those that start with /api/)
  if (request.url.includes('/api/') || request.url.includes('firestore.googleapis.com') || request.url.includes('firebaseapp.com')) {
    return;
  }
  // For navigation requests, serve offline page if offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
  // Cache‑first for static assets
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(resp => {
        // Update cache async
        caches.open(CACHE_NAME).then(cache => cache.put(request, resp.clone()));
        return resp;
      });
    })
  );
});

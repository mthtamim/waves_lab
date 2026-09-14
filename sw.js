// Service Worker for 3D Wave & Acoustics Laboratory PWA
const CACHE_NAME = 'wavelab-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network first with fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

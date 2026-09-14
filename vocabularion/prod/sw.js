// Service Worker minimal pour valider l'installabilité PWA
const CACHE_NAME = 'vocabapp-cache-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Stratégie de réseau par défaut pour Supabase et l'application
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
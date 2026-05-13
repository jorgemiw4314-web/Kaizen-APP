// Kaizen Fitness PWA - Service Worker
// Solo para permitir instalación en el celular (sin caché offline)

const CACHE_NAME = 'kaizen-pwa-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Sin interceptación de fetch: todo va directo a la red

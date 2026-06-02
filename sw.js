// Service Worker minimal - solo para que la app sea instalable como PWA
// No cachea nada para evitar problemas con caché viejo

self.addEventListener('install', (event) => {
    // Activar el nuevo SW inmediatamente sin esperar
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Borrar todos los cachés viejos
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => caches.delete(key)));
        }).then(() => {
            // Tomar control de las pestañas inmediatamente
            return self.clients.claim();
        })
    );
});

// No interceptamos fetch - todas las peticiones van a la red directamente
// Esto evita problemas de caché viejo y errores con chrome-extension

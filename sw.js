// ===== Service Worker de KaizenAPP =====
// • La app SIEMPRE intenta cargar la versión más nueva desde internet.
// • Si no hay señal (o tarda mucho), abre la última copia guardada: la app funciona sin internet.
// • Nunca intercepta Firebase, EmailJS ni WhatsApp: los datos siempre van directo a la nube.
//
// Cuando subas una versión nueva de la app, cambia VERSION (ej. '2026.09.23' → '2026.10.01').
// Así sale el aviso "🚀 ¡Nueva versión disponible!" y se limpia la copia vieja.
const VERSION = '2026.09.23.7';
const CACHE = 'kaizen-' + VERSION;
const ESPERA_RED_MS = 4000; // con internet lento, a los 4 s abre la copia guardada

// Librerías externas que usa la app (se guardan para poder abrir sin internet)
const CDNS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'www.gstatic.com'];

// Nunca se tocan: base de datos, login, correo y WhatsApp
const NUNCA = ['firestore.googleapis.com', 'firebase.googleapis.com', 'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com', 'api.emailjs.com', 'wa.me', 'api.whatsapp.com'];

self.addEventListener('install', (event) => {
    // Guarda de una vez los archivos básicos. Si alguno no existe, no pasa nada.
    event.waitUntil(
        caches.open(CACHE).then((cache) =>
            Promise.all(['./', './manifest.json', './Iconos/icon-192x192.png'].map((url) =>
                cache.add(url).catch(() => {})
            ))
        )
    );
    // No se activa solo: espera a que toques "Actualizar" para no recargar la app mientras la usas
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Borra las copias de versiones anteriores
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    let url;
    try { url = new URL(req.url); } catch (e) { return; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return; // chrome-extension, etc.
    if (NUNCA.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) return;

    const mismoSitio = url.origin === self.location.origin;
    const esCdn = CDNS.includes(url.hostname);
    if (!mismoSitio && !esCdn) return;

    // La app (HTML): primero internet para tener siempre lo más nuevo
    if (req.mode === 'navigate' || (mismoSitio && (req.headers.get('accept') || '').includes('text/html'))) {
        event.respondWith(primeroRed(req));
        return;
    }
    if (mismoSitio && url.pathname.endsWith('/sw.js')) return;

    // Librerías, fuentes, íconos: copia guardada al instante y se actualiza por detrás
    event.respondWith(guardadoYActualiza(req));
});

async function primeroRed(req) {
    const cache = await caches.open(CACHE);
    const red = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
    });
    try {
        return await conTiempo(red, ESPERA_RED_MS);
    } catch (e) {
        const copia = await cache.match(req, { ignoreSearch: true }) || await cache.match('./');
        if (copia) return copia;
        return red; // no hay copia: seguimos esperando a la red
    }
}

async function guardadoYActualiza(req) {
    const cache = await caches.open(CACHE);
    const copia = await cache.match(req);
    const red = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
        return res;
    }).catch(() => null);
    if (copia) return copia;
    const res = await red;
    return res || Response.error();
}

function conTiempo(promesa, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), ms);
        promesa.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
}

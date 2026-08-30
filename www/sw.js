/* Service worker de la versión web de NutriFoto.

   VERSION la sella el despliegue con el identificador del commit, así cada
   publicación estrena caché y nadie se queda viendo una versión vieja. */
const VERSION = '__VERSION__';
const CACHE = 'nutrifoto-' + VERSION;

/* Lo que hace falta para abrir la app sin conexión. */
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (e) => {
  /* Uno a uno: si un archivo falla, la instalación sigue en vez de caerse entera. */
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* El análisis de la foto va contra otro servidor: eso nunca se cachea ni se toca. */
  if (url.origin !== location.origin) return;

  /* La página, primero de la red: al publicar una versión nueva se ve enseguida.
     Sin conexión, cae a la copia guardada. */
  const esPagina = e.request.mode === 'navigate' || url.pathname.endsWith('.html');
  if (esPagina) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  /* Iconos y manifiesto: de la caché, que no cambian dentro de una misma versión. */
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      if (res && res.status === 200) {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
      }
      return res;
    }))
  );
});

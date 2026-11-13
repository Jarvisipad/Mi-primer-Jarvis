const CACHE = 'jarvis-ipad-v03';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Consultar siempre la versión más reciente de index.html
  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'))
  ) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache =>
            cache.put(event.request, copy)
          );
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Para los demás archivos, conservar el funcionamiento de la caché
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});

// RECIBIR NOTIFICACIONES PUSH
self.addEventListener('push', event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {};
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'JARVIS', {
      body: payload.body || 'Tienes un recordatorio.',
      icon: './icon.svg',
      badge: './icon.svg',
      tag: payload.tag || 'jarvis-reminder',
      data: {
        url: payload.url || './'
      }
    })
  );
});

// ABRIR JARVIS AL TOCAR LA NOTIFICACIÓN
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || './';

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clients => {
      const client = clients.find(c =>
        c.url.startsWith(self.location.origin)
      );

      if (client) {
        return client.focus();
      }

      return self.clients.openWindow(url);
    })
  );
});

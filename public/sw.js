const CACHE='nexacode-shell-v2';
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(['/', '/manifest.webmanifest', '/icon.svg']))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('nexacode-shell-') && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(caches.match(request).then(cached => cached || fetch(request)
    .then(response => {
      if (response.ok) {
        void caches.open(CACHE)
          .then(cache => cache.put(request, response.clone()))
          .catch(error => console.error('Could not cache app asset.', error));
      }
      return response;
    })
    .catch(() => caches.match('/'))));
});

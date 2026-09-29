// Yalnızca "Ana Ekrana Ekle" (PWA) kurulabilirliği için: önbellek tutmaz, her istek doğrudan ağa gider.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})

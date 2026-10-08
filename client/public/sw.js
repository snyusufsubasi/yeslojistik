// "Ana Ekrana Ekle" (PWA) kurulabilirliği için service worker. Sürüm: 2 (8 Ekim 2026).
// Sayfa (index.html) her zaman AĞDAN gelir: eski bir sürüm asla önbellekten gösterilmez. Ağ yoksa son başarılı
// sayfa kopyası ya da kısa bir "bağlantı yok" mesajı gösterilir. /api ve /assets isteklerine dokunulmaz.
const SHELL_CACHE = 'yl-shell-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || req.mode !== 'navigate') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-store' })
      if (res.ok) {
        const copy = res.clone()
        caches.open(SHELL_CACHE).then((c) => c.put('/__shell', copy)).catch(() => undefined)
      }
      return res
    } catch {
      const cached = await caches.match('/__shell')
      if (cached) return cached
      return new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>YES Lojistik</title><body style="font-family:system-ui,sans-serif;padding:2rem;color:#1c1b19">' +
        '<h1 style="font-size:1.25rem">İnternet bağlantısı yok</h1><p>Bağlantı gelince sayfayı yenileyin.</p></body>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    }
  })())
})

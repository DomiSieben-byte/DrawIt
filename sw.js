const V = 'drawit-v6';
const ASSETS = ['./', './index.html', './style.css', './app.js', './stickers.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'].concat(['fonts/fredoka-latin-400-normal.woff2', 'fonts/fredoka-latin-700-normal.woff2', 'fonts/mountains-of-christmas-latin-400-normal.woff2', 'fonts/mountains-of-christmas-latin-700-normal.woff2', 'fonts/dancing-script-latin-400-normal.woff2', 'fonts/dancing-script-latin-700-normal.woff2', 'fonts/pacifico-latin-400-normal.woff2', 'fonts/great-vibes-latin-400-normal.woff2', 'fonts/parisienne-latin-400-normal.woff2', 'fonts/sacramento-latin-400-normal.woff2', 'fonts/satisfy-latin-400-normal.woff2', 'fonts/caveat-latin-400-normal.woff2', 'fonts/caveat-latin-700-normal.woff2', 'fonts/indie-flower-latin-400-normal.woff2', 'fonts/kaushan-script-latin-400-normal.woff2', 'fonts/lobster-latin-400-normal.woff2', 'fonts/henny-penny-latin-400-normal.woff2', 'fonts/amatic-sc-latin-400-normal.woff2', 'fonts/amatic-sc-latin-700-normal.woff2', 'fonts/playfair-display-latin-400-normal.woff2', 'fonts/playfair-display-latin-700-normal.woff2', 'fonts/merriweather-latin-400-normal.woff2', 'fonts/merriweather-latin-700-normal.woff2'].map(f => './' + f));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Offline zuerst, im Hintergrund aktualisieren
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r && r.ok) caches.open(V).then(c => c.put(e.request, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});

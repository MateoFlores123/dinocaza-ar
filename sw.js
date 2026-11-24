/* DinoCaza AR · service worker: modo sin internet para zonas con poca señal */
var CACHE = 'dinocaza-v4';
var FILES = ['./', './index.html', './css/styles.css', './manifest.webmanifest',
  './js/data.js', './js/store.js', './js/audio.js', './js/models.js', './js/fx.js', './js/ar.js', './js/map3d.js', './js/ui.js', './js/encounter.js', './js/walk.js', './js/vision.js', './js/main.js',
  './vendor/three.min.js', './vendor/qrcode.js', './vendor/GLTFLoader.js', './vendor/SkeletonUtils.js',
  './models/Trex.glb', './models/Triceratops.glb', './models/Velociraptor.glb', './models/Stegosaurus.glb', './models/Parasaurolophus.glb', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    var net = fetch(e.request).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});

// Service worker minimal -- syarat wajib supaya browser menganggap situs
// ini "installable" sebagai PWA. Strategi: cache-first untuk file
// tampilan (app shell), supaya form tetap terbuka meski koneksi lemah.
// Pengiriman data (submit form) SELALU perlu internet -- itu tidak
// disimpan di sini, jadi tidak akan pernah mengirim data "palsu" saat
// offline.
const NAMA_CACHE = 'suket-lobar-v1';
const FILE_APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(NAMA_CACHE).then(function (cache) {
      return cache.addAll(FILE_APP_SHELL);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (namaCacheLama) {
      return Promise.all(
        namaCacheLama
          .filter(function (nama) { return nama !== NAMA_CACHE; })
          .map(function (nama) { return caches.delete(nama); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const req = event.request;

  // Jangan sentuh permintaan ke Apps Script (submit form, Bank Data,
  // dsb) -- itu harus SELALU langsung ke jaringan, tidak boleh di-cache,
  // supaya data selalu real-time dan tidak pernah "nyangkut" data lama.
  if (req.method !== 'GET' || req.url.indexOf('script.google.com') !== -1) {
    return;
  }

  event.respondWith(
    caches.match(req).then(function (responCache) {
      const fetchJaringan = fetch(req)
        .then(function (responJaringan) {
          caches.open(NAMA_CACHE).then(function (cache) {
            cache.put(req, responJaringan.clone());
          });
          return responJaringan;
        })
        .catch(function () {
          return responCache;
        });
      // Tampilkan versi cache dulu kalau ada (cepat), tapi tetap update
      // cache di belakang layar dari jaringan.
      return responCache || fetchJaringan;
    })
  );
});

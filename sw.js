/* 轻卡日记 · Service Worker
 * 策略：应用外壳（HTML / manifest / 图标）预缓存，其余同源 GET 走
 * cache-first + 后台更新（stale-while-revalidate），导航请求断网回落 index.html。
 * 更新版本：改 CACHE 里的版本号即可让旧缓存整体淘汰。
 */
const VERSION = 'v1.1.0';
const CACHE = 'lightcal-' + VERSION;

/* 相对 sw.js 所在目录解析，保证部署在子路径（如 /diary/）也能work */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/maskable-512.png'
].map((p) => new URL(p, self.location).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        /* 用 addAll 一次写入；单个失败会导致整批失败，所以逐个容错 */
        Promise.all(
          SHELL.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* 页面导航：先走网络拿最新 HTML，失败或离线时回落缓存 */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match(new URL('./index.html', self.location).href))
        )
    );
    return;
  }

  /* 静态资源：cache-first，命中后后台静默更新 */
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
          })
          .catch(() => {});
        return hit;
      }
      return fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
});
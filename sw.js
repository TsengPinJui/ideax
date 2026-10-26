// IdeaX 創點子 - Progressive Web App Service Worker
const CACHE_NAME = 'ideax-pwa-v12';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/logo-6-trans.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

/**
 * 確保回傳給 navigate 請求的 Response 不帶有 redirected=true 旗標，
 * 避免 Chrome 因 Service Worker 回傳 redirected response 而拋出 ERR_FAILED。
 */
async function toCleanNavigationResponse(response) {
  if (!response) return response;
  if (!response.redirected && response.status === 200) {
    return response;
  }
  const body = await response.blob();
  const headers = new Headers(response.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'text/html; charset=utf-8');
  }
  return new Response(body, {
    status: 200,
    statusText: 'OK',
    headers,
  });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const assetUrl of PRECACHE_ASSETS) {
        try {
          const res = await fetch(assetUrl, { cache: 'no-cache' });
          if (res && res.status === 200) {
            const cleanRes = res.redirected ? await toCleanNavigationResponse(res) : res;
            await cache.put(assetUrl, cleanRes);
          }
        } catch (err) {
          // 忽略單一資源預快取失敗
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, non-http(s) (e.g. chrome-extension), and API proxy requests
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith('http') ||
    !url.protocol.startsWith('http') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__/') || // Firebase 登入處理頁（由 Vercel 轉送），不可被 SW 改成首頁
    url.pathname.startsWith('/_vercel/') || // Vercel Web Analytics 腳本與回報請求不經 SW 快取
    url.pathname.startsWith('/node_modules/') || // Vite 依賴套件不可由 SW 舊快取劫持
    url.pathname.startsWith('/@') || // Vite 內部模組 (/@vite/, /@fs/, /@id/)
    url.pathname.startsWith('/src/') || // 原始碼動態載入
    url.search.includes('v=') || // Vite 模組版本參數
    url.search.includes('t=') || // Vite HMR 時間戳參數
    url.hostname.includes('googletagmanager.com') ||
    url.hostname.includes('google-analytics.com')
  ) {
    return;
  }

  // SPA Navigation handling: network-first, with 404 and offline fallback to root '/'
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          // 若靜態伺服器對子網址（如 /vibecoding, /painpoints, /challenge）回傳 404，直接回傳乾淨無 redirect 旗標的根目錄 HTML
          if (networkResponse.status === 404) {
            const freshRoot = await fetch('/', { cache: 'no-cache' }).catch(() => null);
            if (freshRoot && freshRoot.status === 200) {
              return await toCleanNavigationResponse(freshRoot);
            }
            const cachedRoot = await caches.match('/');
            if (cachedRoot) {
              return await toCleanNavigationResponse(cachedRoot);
            }
          }
          // 若伺服器對頁面進行了 redirect，亦清除 redirected 旗標防止 Chrome ERR_FAILED
          if (networkResponse.redirected) {
            return await toCleanNavigationResponse(networkResponse);
          }
          return networkResponse;
        } catch (err) {
          const cached = await caches.match('/');
          if (cached) {
            return await toCleanNavigationResponse(cached);
          }
          return fetch('/')
            .then((r) => toCleanNavigationResponse(r))
            .catch(
              () =>
                new Response('離線模式', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                })
            );
        }
      })()
    );
    return;
  }

  // Cache-first / Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            !networkResponse.redirected &&
            networkResponse.type === 'basic' &&
            event.request.url.startsWith('http')
          ) {
            const responseToCache = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ==========================================
// Web Push & Native Notification Handlers
// ==========================================

// 1. 監聽伺服器 Push 事件
self.addEventListener('push', (event) => {
  let data = {
    title: 'IdeaX 創點子',
    body: '您有一則新通知',
    icon: '/pwa-192x192.png',
    badge: '/favicon-32x32.png',
    url: '/',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const notificationOptions = {
    body: data.body || data.message,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/favicon-32x32.png',
    tag: data.tag || `ideax-${Date.now()}`,
    data: {
      url: data.url || '/',
      id: data.id,
      timestamp: Date.now(),
    },
    vibrate: [150, 80, 150],
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'IdeaX 創點子', notificationOptions)
  );
});

// 2. 監聽前端 postMessage 觸發本機原生通知
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, url, tag } = event.data.payload || {};
    const notificationOptions = {
      body: body || '',
      icon: icon || '/pwa-192x192.png',
      badge: badge || '/favicon-32x32.png',
      tag: tag || `ideax-local-${Date.now()}`,
      data: {
        url: url || '/',
        timestamp: Date.now(),
      },
      vibrate: [150, 80, 150],
      renotify: true,
    };

    self.registration.showNotification(title || 'IdeaX 創點子', notificationOptions);
  }
});

// 3. 點擊原生系統通知後的跳轉與喚醒行為
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 若已有視窗開啟，直接切換至該分頁並導覽
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (targetUrl && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // 若未開啟，則在獨立視窗開啟 PWA
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

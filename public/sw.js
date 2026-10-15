// IdeaX 創點子 - Progressive Web App Service Worker
const CACHE_NAME = 'ideax-pwa-v8';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
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

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('PWA precache notice:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, non-http(s) (e.g. chrome-extension), and API proxy requests
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith('http') ||
    !url.protocol.startsWith('http') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // SPA Navigation handling: network-first, with 404 and offline fallback to index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          // 若靜態伺服器回傳 404（例如直接貼上 /challenge 子路徑），SPA 必須 fallback 回傳 /index.html
          if (networkResponse.status === 404) {
            const cachedShell = (await caches.match('/index.html')) || (await caches.match('/'));
            if (cachedShell) return cachedShell;
            return fetch('/index.html');
          }
          return networkResponse;
        } catch (err) {
          const cached = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cached) return cached;
          return fetch('/index.html').catch(() => new Response('離線模式', { status: 503 }));
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
            networkResponse.type === 'basic' &&
            event.request.url.startsWith('http')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            }).catch(() => {});
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

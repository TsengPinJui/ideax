import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

// 全域監聽 PWA 安裝事件
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPwaPrompt = e;
  // 發送自定義事件通知各組件已捕捉到原生安裝事件
  window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
});

// 註冊 PWA Service Worker 以滿足瀏覽器原生安裝條件，並主動清理舊版帶有 redirected 旗標的快取
if ('serviceWorker' in navigator) {
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key !== 'ideax-pwa-v10') {
          caches.delete(key).catch(() => {});
        }
      });
    }).catch(() => {});
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        console.log('IdeaX PWA Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('IdeaX PWA Service Worker registration warning:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);

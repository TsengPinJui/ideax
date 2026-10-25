import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installStorageQuotaGuard } from './utils/safeStorage';
import './index.css';

// 全域安裝 LocalStorage 容量保護攔截器，防止 QuotaExceededError 導致畫面崩潰
installStorageQuotaGuard();

// 全域監聽 PWA 安裝事件
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPwaPrompt = e;
  // 發送自定義事件通知各組件已捕捉到原生安裝事件
  window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
});

// PWA Service Worker 管理：在開發/預覽環境自動註銷並清除快取，防止舊版 Vite 依賴模組衝突
if ('serviceWorker' in navigator) {
  const isDevOrPreview =
    Boolean(import.meta.env?.DEV) ||
    window.location.hostname.includes('run.app') ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isDevOrPreview) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister().catch(() => {}));
    }).catch(() => {});
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key).catch(() => {}));
      }).catch(() => {});
    }
  } else {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== 'ideax-pwa-v11') {
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
        })
        .catch(() => {});
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    {/* Vercel Web Analytics：統計訪客與頁面瀏覽（僅在 Vercel 部署環境回報資料） */}
    <Analytics />
  </StrictMode>,
);

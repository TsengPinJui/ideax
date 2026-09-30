import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 全域監聽 PWA 安裝事件
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPwaPrompt = e;
  // 發送自定義事件通知各組件已捕捉到原生安裝事件
  window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
});

// 註冊 PWA Service Worker 以滿足瀏覽器原生安裝條件
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
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
  </StrictMode>,
);

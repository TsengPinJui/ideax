import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

// 3D 吉祥物（含 three.js）拆成獨立檔案，等首頁載完、瀏覽器閒下來才下載
const JellyMascot = lazy(() => import('./JellyMascot'));

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 640;

/** 右下角燈泡吉祥物的外殼：讀取管理員設定、判斷能否顯示、延遲載入 3D 本體 */
export const MascotHost: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
  const { mascotConfig, currentUser } = useApp();
  const [ready, setReady] = useState(false);
  const [small, setSmall] = useState(isSmallScreen);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled || !supportsWebGL()) return;
      const w = window as any;
      if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(() => !cancelled && setReady(true), { timeout: 4000 });
      else window.setTimeout(() => !cancelled && setReady(true), 1500);
    };
    // 等頁面載完再下載 3D；有圖片一直載不完時，最多等 8 秒也照樣出現
    let started = false;
    const startOnce = () => { if (!started) { started = true; start(); } };
    const t = window.setTimeout(() => {
      if (document.readyState === 'complete') startOnce();
      else window.addEventListener('load', startOnce, { once: true });
    }, 1200);
    const fallback = window.setTimeout(startOnce, 8000);
    const onResize = () => setSmall(isSmallScreen());
    window.addEventListener('resize', onResize);
    return () => { cancelled = true; window.clearTimeout(t); window.clearTimeout(fallback); window.removeEventListener('load', startOnce); window.removeEventListener('resize', onResize); };
  }, []);

  if (!ready || hidden || !mascotConfig.enabled || (small && !mascotConfig.showOnMobile)) return null;
  return (
    <Suspense fallback={null}>
      <JellyMascot config={mascotConfig} userId={currentUser?.id} />
    </Suspense>
  );
};

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
    const t = window.setTimeout(() => {
      if (document.readyState === 'complete') start();
      else window.addEventListener('load', start, { once: true });
    }, 1200);
    const onResize = () => setSmall(isSmallScreen());
    window.addEventListener('resize', onResize);
    return () => { cancelled = true; window.clearTimeout(t); window.removeEventListener('load', start); window.removeEventListener('resize', onResize); };
  }, []);

  if (!ready || hidden || !mascotConfig.enabled || (small && !mascotConfig.showOnMobile)) return null;
  return (
    <Suspense fallback={null}>
      <JellyMascot config={mascotConfig} userId={currentUser?.id} />
    </Suspense>
  );
};

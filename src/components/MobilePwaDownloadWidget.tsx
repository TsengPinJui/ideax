import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { triggerDirectAppDownloadOrInstall } from '../services/pwaInstaller';

export const MobilePwaDownloadWidget: React.FC = () => {
  const { openPwaInstallModal } = useApp();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    () => (typeof window !== 'undefined' ? (window as any).deferredPwaPrompt || null : null)
  );

  // 判斷是否曾手動關閉此提示
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('ideax_pwa_widget_dismissed') === 'true';
  });

  // 判斷是否為既有 App 開啟 (PWA / Standalone / WebAPK / iOS Home Screen / source=pwa)
  const [isAppMode, setIsAppMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const matchStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const matchFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const matchMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
      const navStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const isSourcePwa = window.location.search.includes('source=pwa') || window.location.search.includes('source=app');
      const sessionApp = sessionStorage.getItem('ideax_is_app') === 'true';

      if (matchStandalone || matchFullscreen || matchMinimalUi || navStandalone || isAndroidApp || isSourcePwa || sessionApp) {
        sessionStorage.setItem('ideax_is_app', 'true');
        return true;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    const checkAppMode = () => {
      try {
        const matchStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const matchFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
        const navStandalone = (window.navigator as any).standalone === true;
        const isAndroidApp = document.referrer.includes('android-app://');
        const isSourcePwa = window.location.search.includes('source=pwa') || window.location.search.includes('source=app');
        const sessionApp = sessionStorage.getItem('ideax_is_app') === 'true';

        if (matchStandalone || matchFullscreen || navStandalone || isAndroidApp || isSourcePwa || sessionApp) {
          sessionStorage.setItem('ideax_is_app', 'true');
          setIsAppMode(true);
        }
      } catch {}
    };

    checkAppMode();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        sessionStorage.setItem('ideax_is_app', 'true');
        setIsAppMode(true);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    const handleAppInstalled = () => {
      sessionStorage.setItem('ideax_is_app', 'true');
      localStorage.setItem('ideax_pwa_installed', 'true');
      setIsAppMode(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPwaPrompt = e;
    };

    const handlePromptReady = () => {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
    };
  }, []);

  const [isHovered, setIsHovered] = useState(false);

  // 已安裝或已手動關閉則不顯示
  if (isAppMode || isDismissed) {
    return null;
  }

  const handleDownloadClick = async () => {
    triggerDirectAppDownloadOrInstall(openPwaInstallModal);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('ideax_pwa_widget_dismissed', 'true');
    setIsDismissed(true);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center justify-end select-none group pointer-events-auto"
    >
      <div className="relative flex flex-col items-center">
        {/* 關閉按鈕 */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center shadow border border-stone-600 transition-all z-20 cursor-pointer hover:scale-110 active:scale-90"
          title="關閉下載提示"
          aria-label="關閉下載提示"
        >
          <X className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>

        {/* 下載提示圓形按鈕 (精緻黃金比例，與上方羅盤按鈕尺寸一致) */}
        <button
          type="button"
          onClick={handleDownloadClick}
          className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-orange-500 text-white shadow-[0_6px_22px_rgba(217,119,6,0.45)] hover:shadow-[0_8px_28px_rgba(217,119,6,0.65)] flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 border-2 border-white/90 ring-2 ring-amber-400/50 shrink-0"
          title="下載 / 安裝 IdeaX App"
          aria-label="下載 IdeaX App"
        >
          {/* 外圍輕柔擴散動畫 */}
          <span className="absolute -inset-1 rounded-full bg-amber-400/30 animate-pulse pointer-events-none" />

          {/* 圓形內部圖示與文字 */}
          <div className="flex flex-col items-center justify-center -space-y-0.5 pointer-events-none">
            <Download className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white drop-shadow-xs stroke-[2.4]" />
            <span className="text-[9.5px] sm:text-[10px] font-black tracking-tight text-white drop-shadow-xs leading-none select-none">
              App
            </span>
          </div>
        </button>
      </div>

      {/* 滑鼠懸停對話氣泡 (向左冒出 Speech Bubble) */}
      <div
        className={`absolute right-full mr-2.5 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out ${
          isHovered
            ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-x-2 scale-95 pointer-events-none'
        }`}
      >
        <div className="relative bg-stone-900/95 text-white px-3 py-2 rounded-2xl shadow-2xl border border-amber-400/80 backdrop-blur-md flex flex-col gap-1.5 whitespace-nowrap min-w-[136px]">
          <div className="absolute -right-1 top-3.5 w-2.5 h-2.5 bg-stone-900 border-r border-t border-amber-400/80 rotate-45" />
          <button
            type="button"
            onClick={handleDownloadClick}
            className="text-amber-300 hover:text-amber-200 font-bold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer text-left"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>下載 / 安裝 App</span>
          </button>
          <div className="pt-1.5 border-t border-stone-800 flex items-center justify-between">
            <span className="text-[10px] text-stone-400">PWA 秒開極速版</span>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[10px] text-stone-400 hover:text-stone-200 hover:underline cursor-pointer"
            >
              隱藏
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

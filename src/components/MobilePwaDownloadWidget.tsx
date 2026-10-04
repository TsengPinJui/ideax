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
    <div className="fixed right-3 bottom-20 sm:bottom-6 z-40 transition-all duration-300 pointer-events-auto select-none">
      <div className="relative flex flex-col items-center group">
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

        {/* 下載提示圓形按鈕 (精緻小巧圓形按鈕，不阻擋頁面) */}
        <button
          type="button"
          onClick={handleDownloadClick}
          className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-orange-500 text-white shadow-md hover:shadow-lg hover:shadow-amber-500/30 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 border border-white/80 ring-2 ring-amber-400/20"
          title="下載 / 安裝 IdeaX App"
          aria-label="下載 IdeaX App"
        >
          {/* 外圍輕柔擴散動畫 */}
          <span className="absolute -inset-0.5 rounded-full bg-amber-400/30 animate-pulse pointer-events-none -z-10" />

          {/* 圓形內部圖示與文字 */}
          <div className="flex flex-col items-center justify-center -space-y-0.5 pointer-events-none">
            <Download className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white drop-shadow-xs stroke-[2.4]" />
            <span className="text-[8.5px] font-black tracking-tight text-white drop-shadow-xs leading-none select-none">
              App
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

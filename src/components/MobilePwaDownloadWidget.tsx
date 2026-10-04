import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { triggerDirectAppDownloadOrInstall } from '../services/pwaInstaller';

export const MobilePwaDownloadWidget: React.FC = () => {
  const { openPwaInstallModal } = useApp();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    () => (typeof window !== 'undefined' ? (window as any).deferredPwaPrompt || null : null)
  );

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

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    // 即時檢測是否處於既有 App 模式
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

    // 監聽模式動態切換
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

    // 監聽已成功安裝事件 (一旦安裝成功，立即停止提示)
    const handleAppInstalled = () => {
      sessionStorage.setItem('ideax_is_app', 'true');
      localStorage.setItem('ideax_pwa_installed', 'true');
      setIsAppMode(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // 監聽 PWA 原生安裝事件
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

  // 核心規則：如果是從既有已安裝的 App 開啟，全面隱藏下載提示！
  if (isAppMode) {
    return null;
  }

  // 點擊執行「直接呼叫瀏覽器原生安裝 / 或提供指引」
  const handleDownloadClick = async () => {
    triggerDirectAppDownloadOrInstall(openPwaInstallModal);
  };

  return (
    <div className="fixed right-3 sm:right-5 top-[130px] sm:top-[160px] z-40 transition-all duration-300 ease-in-out pointer-events-auto">
      {isCollapsed ? (
        /* 收合狀態：靠右邊框的純跳動下載圖示標籤 */
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-center bg-gradient-to-l from-amber-500 via-amber-600 to-orange-500 text-white pl-2.5 pr-1.5 py-1.5 rounded-l-xl shadow-lg border-y border-l border-white/80 active:scale-90 transition-transform cursor-pointer"
          title="點擊展開下載安裝"
        >
          <div className="animate-bounce">
            <Download className="w-4 h-4 text-white" />
          </div>
        </button>
      ) : (
        /* 展開狀態：縮小圓圈與字體規格 */
        <div className="flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-right duration-300">
          {/* 上下跳動的圓形下載按鈕 */}
          <button
            onClick={handleDownloadClick}
            className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-amber-500 via-amber-600 to-orange-500 text-white rounded-full shadow-lg shadow-amber-500/35 border-2 border-white ring-2 ring-amber-400/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            title="下載安裝 IdeaX創點子 App"
          >
            <div className="animate-bounce">
              <Download className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" />
            </div>
          </button>

          {/* 下方獨立先不要按鈕 */}
          <button
            onClick={() => setIsCollapsed(true)}
            className="bg-stone-800 hover:bg-stone-900 active:scale-95 text-stone-100 text-[10px] font-bold py-0.5 px-2.5 rounded-full shadow-md border border-stone-700 transition-all cursor-pointer whitespace-nowrap"
          >
            先不要
          </button>
        </div>
      )}
    </div>
  );
};

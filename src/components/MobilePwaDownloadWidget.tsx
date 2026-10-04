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
    <div className="fixed right-2.5 bottom-20 sm:bottom-6 z-40 transition-all duration-200 pointer-events-auto">
      {/* 輕量精簡膠囊按鈕 (小巧精緻、不擋畫面) */}
      <div className="flex items-center gap-1 bg-stone-900/90 hover:bg-stone-900 backdrop-blur-md text-white pl-2 pr-1.5 py-1 rounded-full shadow-md border border-stone-700/80 text-[11px] font-bold transition-all">
        <button
          type="button"
          onClick={handleDownloadClick}
          className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer"
          title="安裝 IdeaX App"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0">
            <Download className="w-3 h-3" />
          </div>
          <span className="hidden xs:inline font-bold">下載 App</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-stone-400 hover:text-stone-200 rounded-full hover:bg-stone-800 transition-colors cursor-pointer ml-0.5"
          title="關閉提示"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

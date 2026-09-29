import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { triggerDirectAppDownloadOrInstall } from '../services/pwaInstaller';

export const MobilePwaDownloadWidget: React.FC = () => {
  const { currentUser, isDemoMode, openPwaInstallModal } = useApp();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.id === 'user-admin';
  const isTestingAdmin = isAdmin && isDemoMode; // 開啟測試模式的管理員

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // 讀取瀏覽器 LocalStorage 暫存記號：若已下載過則預設不再提示
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ideax_pwa_downloaded') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // 判斷是否已為 App 模式 (Standalone)
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();

    // 監聽 PWA 原生安裝事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPwaPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 如果已處於 App 模式 (Standalone) 預設隱藏；但處於一般瀏覽器模式或開啟測試模式，恆常可見供使用！
  if (isStandalone && !isTestingAdmin) {
    return null;
  }

  // 點擊執行「直接下載/呼叫安裝請求」
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
          title={isTestingAdmin ? '【管理員測試】點擊展開下載' : '點擊展開下載'}
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
            title={isTestingAdmin ? '【管理員測試模式】直接發起下載請求' : '直接下載 App'}
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

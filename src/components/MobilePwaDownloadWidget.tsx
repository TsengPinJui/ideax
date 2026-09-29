import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MobilePwaDownloadWidget: React.FC = () => {
  const { currentUser, isDemoMode } = useApp();
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
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 如果一般使用者已下載或處於 App 模式，預設隱藏；但「開啟測試模式的管理員」無論是否下載或處於何種模式，均恆常可見供驗收測試！
  if ((isStandalone || hasDownloaded) && !isTestingAdmin) {
    return null;
  }

  // 點擊執行「直接下載/呼叫安裝請求」，並記錄 LocalStorage 記號
  const handleDownloadClick = async () => {
    // 設定瀏覽器 LocalStorage 暫存記號
    try {
      localStorage.setItem('ideax_pwa_downloaded', 'true');
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }

    // 1. 若有 PWA 原生 deferredPrompt，直接觸發系統安裝請求
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
        if (!isTestingAdmin) {
          setHasDownloaded(true);
        }
        return;
      } catch (err) {
        console.error('PWA Install trigger error:', err);
      }
    }

    // 2. 若瀏覽器未儲存 deferredPrompt，執行直接下載檔案請求
    try {
      const link = document.createElement('a');
      link.href = '/manifest.json';
      link.download = 'IdeaX-App.webmanifest';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Direct download error:', err);
    }

    if (!isTestingAdmin) {
      setHasDownloaded(true);
    }
  };

  return (
    <div className="block sm:hidden fixed right-3 top-[130px] z-40 transition-all duration-300 ease-in-out pointer-events-auto">
      {isCollapsed ? (
        /* 收合狀態：靠右邊框的純跳動下載圖示標籤 */
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-center bg-gradient-to-l from-amber-500 via-amber-600 to-orange-500 text-white pl-3 pr-2 py-2.5 rounded-l-2xl shadow-xl border-y border-l border-white/80 active:scale-90 transition-transform cursor-pointer"
          title={isTestingAdmin ? '【管理員測試】點擊展開下載' : '點擊展開下載'}
        >
          <div className="animate-bounce">
            <Download className="w-5 h-5 text-white" />
          </div>
        </button>
      ) : (
        /* 展開狀態：稍微放大組件，下載圖示與「先牢記/先不要」區分顏色底色 */
        <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-right duration-300">
          {/* 上下跳動的大圓形下載按鈕 */}
          <button
            onClick={handleDownloadClick}
            className="w-14 h-14 bg-gradient-to-tr from-amber-500 via-amber-600 to-orange-500 text-white rounded-full shadow-xl shadow-amber-500/40 border-2 border-white ring-2 ring-amber-400/30 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            title={isTestingAdmin ? '【管理員測試模式】直接發起下載請求' : '直接下載 App'}
          >
            <div className="animate-bounce">
              <Download className="w-7 h-7 text-white drop-shadow-md" />
            </div>
          </button>

          {/* 下方獨立先不要按鈕 (採用與下載圖示明顯區隔的深色極簡底色) */}
          <button
            onClick={() => setIsCollapsed(true)}
            className="bg-stone-800 hover:bg-stone-900 active:scale-95 text-stone-100 text-[11px] font-bold py-1 px-3 rounded-full shadow-lg border border-stone-700 transition-all cursor-pointer whitespace-nowrap"
          >
            先不要
          </button>
        </div>
      )}
    </div>
  );
};

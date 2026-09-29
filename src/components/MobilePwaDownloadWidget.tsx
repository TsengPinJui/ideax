import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share2, PlusSquare, ArrowRight, Sparkles } from 'lucide-react';

export const MobilePwaDownloadWidget: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false); // 每次重新載入網頁都會展開
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

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

    // 檢測是否為 iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(iosDevice);

    // 監聽 PWA 安裝事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 如果已經是 App / Standalone 模式，完全不跳出來
  if (isStandalone) {
    return null;
  }

  const handleDownloadClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA Install error:', err);
        setShowGuideModal(true);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* 手機版懸浮 PWA 下載組件 (僅在手機顯示 sm:hidden) */}
      <div className="block sm:hidden fixed right-2 top-[128px] z-40 transition-all duration-300 ease-in-out pointer-events-auto">
        {isCollapsed ? (
          /* 點擊「先不要」後收合至右側邊框：顯示延伸邊框標籤 */
          <button
            onClick={() => setIsCollapsed(false)}
            className="group flex items-center gap-1.5 bg-gradient-to-l from-amber-500 via-amber-600 to-amber-500 text-white pl-2.5 pr-1 py-1.5 rounded-l-full shadow-lg shadow-amber-500/30 border-y border-l border-amber-300/60 active:scale-95 transition-transform translate-x-1 hover:translate-x-0 cursor-pointer"
            title="點擊展開 APP 下載"
          >
            <div className="bg-white/20 p-1 rounded-full animate-bounce">
              <Download className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[11px] font-bold tracking-tight whitespace-nowrap pr-1">下載 APP</span>
          </button>
        ) : (
          /* 展開狀態：精緻極窄卡片 (寬度 128px) */
          <div className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 border-2 border-amber-400/80 rounded-2xl shadow-xl shadow-amber-500/20 p-2 w-[128px] backdrop-blur-md animate-in fade-in slide-in-from-right duration-300">
            {/* 上方跳動下載按鈕區塊 */}
            <div
              onClick={handleDownloadClick}
              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1.5 rounded-xl shadow-md active:scale-95 transition-transform cursor-pointer mb-1.5"
            >
              {/* 上下跳動的下載圖示 */}
              <div className="bg-white/20 p-1 rounded-md animate-bounce shrink-0">
                <Download className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[12px] font-black tracking-tight whitespace-nowrap drop-shadow-xs">下載APP</span>
            </div>

            {/* 底部先不要點擊按鈕 */}
            <div className="flex items-center justify-end px-0.5 pt-0.5 border-t border-amber-200/60">
              <button
                onClick={() => setIsCollapsed(true)}
                className="text-[10px] font-bold text-stone-400 hover:text-stone-600 active:text-stone-700 px-1 py-0.5 rounded transition-colors cursor-pointer"
              >
                先不要
              </button>
            </div>
          </div>
        )}
      </div>

      {/* iOS 安裝引導 Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-stone-200 text-stone-800 relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-3 right-3 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-stone-900">iOS 安裝 IdeaX App</h3>
                <p className="text-xs text-stone-500">無需透過 App Store，10 秒完成</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-stone-700 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/70 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                <span>點擊 Safari 底部工具列的 <strong>「分享」</strong> 圖示</span>
                <Share2 className="w-4 h-4 text-amber-600 shrink-0 ml-auto" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                <span>選單下滑並點擊 <strong>「加入主畫面」</strong></span>
                <PlusSquare className="w-4 h-4 text-amber-600 shrink-0 ml-auto" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                <span>點擊右上角 <strong>「新增」</strong> 即可使用！</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-xs shadow-md active:scale-98 transition-transform"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* 通用 PWA 安裝指引 Modal (當瀏覽器尚未觸發原生的 beforeinstallprompt 時) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-stone-200 text-stone-800 relative">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-3 right-3 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Download className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-stone-900">將 IdeaX 加至主畫面</h3>
                <p className="text-xs text-stone-500">安裝至手機主畫面方便隨時開啟</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-stone-700 bg-stone-50 p-3.5 rounded-2xl border border-stone-200 mb-4">
              <p className="leading-relaxed">
                請點擊瀏覽器選單 (三點選單或分享按鈕)，選擇 <strong>「安裝應用程式」</strong> 或 <strong>「新增至主畫面」</strong>。
              </p>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-xs shadow-md active:scale-98 transition-transform"
            >
              確定
            </button>
          </div>
        </div>
      )}
    </>
  );
};

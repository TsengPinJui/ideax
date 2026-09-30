import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onDismiss?: () => void;
  minDurationMs?: number; // 顯示時間（毫秒）
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDismiss,
  minDurationMs = 1500,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRendered, setIsRendered] = useState(true);

  const handleDismiss = () => {
    if (isFadingOut || !isRendered) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setIsRendered(false);
      if (onDismiss) onDismiss();
    }, 700); // 700ms 淡出動畫時間
  };

  useEffect(() => {
    // 進入時啟動淡入過渡
    const enterTimer = setTimeout(() => {
      setMounted(true);
    }, 30);

    // 設定定時自動淡出
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, minDurationMs);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [minDurationMs]);

  if (!isRendered) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none bg-gradient-to-b from-[#FFFDF7] via-[#FFFBEB] to-[#FEF3C7] transition-all duration-700 ease-out cursor-pointer ${
        mounted && !isFadingOut
          ? 'opacity-100 scale-100'
          : isFadingOut
          ? 'opacity-0 scale-[1.02] pointer-events-none'
          : 'opacity-0 scale-95'
      }`}
      aria-label="App 啟動中"
    >
      {/* 右上角跳過按鈕 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="absolute top-5 right-5 sm:top-6 sm:right-6 px-3.5 py-1 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white/80 hover:bg-white/95 backdrop-blur-md rounded-full border border-amber-200/80 shadow-2xs transition-all z-20 cursor-pointer"
      >
        跳過
      </button>

      {/* 中心視覺區域 */}
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm sm:max-w-md w-full relative">
        {/* 背景柔光效果 */}
        <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-amber-300/40 via-orange-300/30 to-yellow-200/40 blur-3xl -z-10 animate-pulse" />

        {/* App 開啟圖 - 圓角與立體陰影 */}
        <div className="relative group mb-6">
          <img
            src="/App開啟圖.jpg"
            alt="IdeaX 創點子 — 讓想法發光"
            className="w-56 h-56 sm:w-72 sm:h-72 object-cover rounded-3xl shadow-2xl shadow-amber-900/20 border-2 border-white/90 ring-1 ring-amber-300/50 transition-transform duration-500 ease-out hover:scale-[1.01]"
          />
        </div>

        {/* 標語與英文品牌 */}
        <div className="space-y-1.5 mb-5">
          <p className="text-sm font-extrabold tracking-widest text-amber-900 uppercase">
            Ideas Connect Possibilities
          </p>
          <p className="text-xs font-bold text-stone-500 tracking-wider">
            高價值問題與解決方案交易市場
          </p>
        </div>

        {/* 載入進度條（淡入脈衝動畫） */}
        <div className="w-48 sm:w-56 h-1.5 bg-amber-200/70 rounded-full overflow-hidden shadow-inner relative">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 rounded-full w-2/3 animate-splash-progress" />
        </div>
      </div>
    </div>
  );
};

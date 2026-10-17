import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { IdeaXLogo } from './IdeaXLogo';
import { useApp } from '../context/AppContext';

interface SplashScreenProps {
  onDismiss?: () => void;
  minDurationMs?: number;
}

const BRAND_KEYWORDS = [
  { text: '徵創業痛點', icon: '⚡' },
  { text: '團隊協作', icon: '👥' },
  { text: '解題黑客松', icon: '🏆' },
  { text: '高額懸賞解方', icon: '💰' },
  { text: '專業知識變現', icon: '💎' },
  { text: '副業斜槓', icon: '🚀' },
  { text: '第三方安全保障', icon: '🛡️' },
  { text: '1對1專家顧問', icon: '🎯' },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDismiss,
}) => {
  const {
    questions,
    solvers,
    initialBootProgress,
    initialBootStatusText,
    isInitialBootComplete,
  } = useApp();

  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRendered, setIsRendered] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return true;
  });
  const [displayProgress, setDisplayProgress] = useState<number>(() => {
    if (typeof window !== 'undefined' && typeof (window as any).__ideaxBootProgress === 'number') {
      return Math.max(15, Math.min(95, (window as any).__ideaxBootProgress));
    }
    return 18;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsDesktop(true);
      setIsRendered(false);
      if (onDismiss) onDismiss();
    }
  }, [onDismiss]);

  const handleDismiss = useCallback(() => {
    if (!isInitialBootComplete || isFadingOut || !isRendered) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setIsRendered(false);
      if (onDismiss) onDismiss();
    }, 480);
  }, [isInitialBootComplete, isFadingOut, isRendered, onDismiss]);

  // 將顯示進度與真實載入進度 (initialBootProgress) 即時平滑掛勾；若未完成載入絕不衝到 100%
  useEffect(() => {
    const target = isInitialBootComplete
      ? 100
      : Math.min(96, Math.max(18, initialBootProgress));

    if (displayProgress >= target) {
      if (isInitialBootComplete && displayProgress < 100) {
        setDisplayProgress(100);
      }
      return;
    }

    const diff = target - displayProgress;
    const step = isInitialBootComplete ? Math.max(4, Math.ceil(diff / 2)) : Math.max(1, Math.ceil(diff / 4));
    const timer = setTimeout(() => {
      setDisplayProgress((prev) => Math.min(target, prev + step));
    }, 28);

    return () => clearTimeout(timer);
  }, [initialBootProgress, isInitialBootComplete, displayProgress]);

  // 僅當真實載入完成 (isInitialBootComplete === true) 且進度條跑滿 100% 時，才結束載入畫面
  useEffect(() => {
    if (!isInitialBootComplete || displayProgress < 100) return;
    const finishTimer = setTimeout(() => {
      handleDismiss();
    }, 240);
    return () => clearTimeout(finishTimer);
  }, [isInitialBootComplete, displayProgress, handleDismiss]);

  if (isDesktop || !isRendered) return null;

  return (
    <div
      onClick={() => {
        if (isInitialBootComplete) handleDismiss();
      }}
      className={`fixed inset-0 z-[99999] flex flex-col justify-between items-center select-none bg-[#FAFAFA] transition-all duration-500 ease-out pt-8 pb-9 px-5 ${
        !isFadingOut
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-[1.01] pointer-events-none'
      }`}
      aria-label="IdeaX 載入中"
    >
      {/* 頂部放射金色品牌光暈 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-b from-amber-200/40 via-yellow-100/25 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-5 w-60 h-60 bg-amber-100/35 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* 1. 上方區塊：Logo 往上靠齊，主標題俐落展示 */}
      <div className="flex flex-col items-center text-center w-full max-w-sm pt-2">
        {/* 創點子 Logo 品牌聚光區 */}
        <div className="relative mb-3 group w-full px-2">
          <div className="absolute inset-0 rounded-2xl bg-amber-300/35 blur-xl scale-105 pointer-events-none animate-pulse" />
          <div className="relative py-3.5 px-6 rounded-2xl bg-gradient-to-b from-amber-50/80 via-white/98 to-white/98 border border-amber-200/80 shadow-xs flex items-center justify-center">
            <IdeaXLogo variant="chuangdianzi" size="lg" />
          </div>
        </div>

        {/* 品牌主標語 */}
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight leading-snug mt-3.5 sm:mt-5 px-1">
          一個問題，找到<span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2">更多可能</span>。
        </h1>
      </div>

      {/* 2. 中間區塊：8 大關鍵字雙欄呼吸卡片排版 */}
      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-sm my-3 sm:my-4">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
          {BRAND_KEYWORDS.map((item) => (
            <div
              key={item.text}
              className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-50/90 via-amber-100/60 to-amber-50/80 border border-amber-200/85 shadow-2xs flex items-center justify-center gap-1.5 text-xs font-black text-amber-950 transition-all"
            >
              <span className="text-sm shrink-0">{item.icon}</span>
              <span className="truncate">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 下方區塊：真實載入進度條 */}
      <div className="flex flex-col items-center w-full max-w-xs sm:max-w-sm">
        <div className="w-full flex items-center justify-between text-[11px] font-extrabold text-amber-800 mb-1.5 px-0.5">
          <span>系統與資料庫同步進度</span>
          <span className="font-mono text-amber-600">{Math.round(displayProgress)}%</span>
        </div>

        {/* 進度條 */}
        <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden shadow-inner relative border border-amber-200/70">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 rounded-full transition-all duration-150 ease-out"
            style={{ width: `${displayProgress}%` }}
          />
        </div>

        {/* 狀態說明與資料筆數提示（無轉圈動畫，完全以進度條呈現） */}
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600">
          {displayProgress >= 100 && isInitialBootComplete ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          )}
          <span className="tracking-wide">{initialBootStatusText}</span>
        </div>

        <div className="mt-1 text-[11px] font-medium text-stone-400">
          已同步 {questions.length} 則難題 • {solvers.length} 位認證專家
        </div>
      </div>
    </div>
  );
};


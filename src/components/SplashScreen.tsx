import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { IdeaXLogo } from './IdeaXLogo';
import { useApp } from '../context/AppContext';

interface SplashScreenProps {
  onDismiss?: () => void;
  minDurationMs?: number; // 載入動畫最短停留時間（預設 1400ms，確保流暢不突兀）
}

const BRAND_KEYWORDS = [
  '徵創業痛點',
  '團隊協作',
  '解題黑客松',
  '高額懸賞解方',
  '專業知識變現',
  '副業斜槓',
  '第三方安全保障',
  '1對1專家顧問',
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDismiss,
  minDurationMs = 1400,
}) => {
  const { questions, solvers, answers } = useApp();

  // 電腦版偵測：電腦版/桌面瀏覽器不顯示開啟動畫
  const [isDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isWideScreen = window.innerWidth >= 1024;
      // 若為非行動裝置 UA 且螢幕寬度 >= 768px，或螢幕寬度 >= 1024px，皆判定為電腦版
      if (!isMobileUA && window.innerWidth >= 768) return true;
      if (isWideScreen && navigator.maxTouchPoints <= 1) return true;
    } catch {}
    return false;
  });

  const [mounted, setMounted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRendered, setIsRendered] = useState(true);
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('同步載入全站難題與最新懸賞...');

  const handleDismiss = () => {
    if (isFadingOut || !isRendered) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setIsRendered(false);
      if (onDismiss) onDismiss();
    }, 700); // 700ms 絲滑淡出
  };

  useEffect(() => {
    if (isDesktop) return;

    // 進入時平滑淡入
    const enterTimer = setTimeout(() => {
      setMounted(true);
    }, 20);

    // 階段 1：同步載入資料庫
    const step1 = setTimeout(() => {
      setProgress(45);
      setStatusText('對接跨領域專家庫與解題方案...');
    }, 400);

    // 階段 2：運算智能推薦與主題看板
    const step2 = setTimeout(() => {
      setProgress(85);
      setStatusText('計算個人化關鍵字與推薦難題...');
    }, 850);

    // 階段 3：資料同步完成，即刻開啟
    const step3 = setTimeout(() => {
      setProgress(100);
      setStatusText('資料加載完成，即刻探索！');
    }, 1250);

    // 結束時自動平滑淡出
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, minDurationMs);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(enterTimer);
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      clearTimeout(dismissTimer);
    };
  }, [minDurationMs]);

  // 當資料即時就緒且時間充足時，加速過渡
  useEffect(() => {
    if (questions.length > 0 && solvers.length > 0 && answers.length > 0 && progress >= 85) {
      setProgress(100);
    }
  }, [questions.length, solvers.length, answers.length, progress]);

  if (isDesktop || !isRendered) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] lg:hidden flex flex-col items-center justify-center select-none bg-white transition-all duration-700 ease-out cursor-pointer ${
        mounted && !isFadingOut
          ? 'opacity-100 scale-100'
          : isFadingOut
          ? 'opacity-0 scale-[1.015] pointer-events-none'
          : 'opacity-0 scale-95'
      }`}
      aria-label="IdeaX 載入中"
    >
      {/* 頂部放射金色品牌光暈（與首頁 Hero 一致） */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[400px] bg-gradient-to-b from-amber-200/40 via-yellow-100/25 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-amber-100/40 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* 右上角跳過按鈕 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="absolute top-5 right-5 sm:top-6 sm:right-6 px-3.5 py-1 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white/80 hover:bg-white/95 backdrop-blur-md rounded-full border border-amber-200/80 shadow-2xs transition-all z-20 cursor-pointer flex items-center gap-1"
      >
        <span>跳過</span>
        <span className="text-[10px] text-stone-400">ESC</span>
      </button>

      {/* 首頁最上方畫面核心視覺（創點子 Logo + 主標題 + 網站關鍵字雲） */}
      <div className="flex flex-col items-center text-center max-w-4xl mx-auto px-4 w-full">
        {/* 創點子 Logo 品牌聚光區 */}
        <div className="relative mb-4 sm:mb-6 group max-w-md sm:max-w-lg w-full px-4">
          <div className="absolute inset-0 rounded-2xl bg-amber-300/35 blur-xl scale-105 pointer-events-none animate-pulse" />
          <div className="relative py-4 px-6 sm:py-5 sm:px-8 rounded-2xl bg-gradient-to-b from-amber-50/80 via-white/98 to-white/98 border border-amber-200/80 shadow-xs flex items-center justify-center">
            <IdeaXLogo variant="chuangdianzi" size="lg" />
          </div>
        </div>

        {/* 品牌主標語 */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-stone-900 tracking-tight leading-[1.2] mt-1 sm:mt-2">
          一個問題，<br className="hidden sm:inline" />
          找到<span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2">更多可能</span>。
        </h1>

        {/* 網站關鍵字雲（逐一浮現微動效） */}
        <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-2xl px-2">
          {BRAND_KEYWORDS.map((text, idx) => (
            <span
              key={text}
              style={{
                animationDelay: `${idx * 80}ms`,
              }}
              className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100/90 text-amber-950 border border-amber-200/90 text-xs sm:text-[13px] font-extrabold shadow-2xs select-none flex items-center gap-1.5 transition-all animate-[fadeIn_0.5s_ease-out_both] hover:scale-105"
            >
              <span className="text-amber-500 font-bold">✦</span>
              <span>{text}</span>
            </span>
          ))}
        </div>

        {/* 載入進度與同步狀態 */}
        <div className="mt-8 sm:mt-10 flex flex-col items-center w-full max-w-xs sm:max-w-sm">
          {/* 進度條 */}
          <div className="w-full h-1.5 sm:h-2 bg-amber-100 rounded-full overflow-hidden shadow-inner relative border border-amber-200/50">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* 狀態說明與資料筆數提示 */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600">
            {progress === 100 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            )}
            <span className="tracking-wide">{statusText}</span>
          </div>

          <div className="mt-1 text-[11px] font-medium text-stone-400">
            已同步 {questions.length} 則難題 • {solvers.length} 位認證專家
          </div>
        </div>
      </div>
    </div>
  );
};

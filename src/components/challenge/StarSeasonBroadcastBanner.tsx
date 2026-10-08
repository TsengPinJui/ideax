import React from 'react';
import { Megaphone, ChevronRight, Sparkles } from 'lucide-react';

interface StarSeasonBroadcastBannerProps {
  onApply: () => void;
  className?: string;
}

export const StarSeasonBroadcastBanner: React.FC<StarSeasonBroadcastBannerProps> = ({
  onApply,
  className = '',
}) => {
  return (
    <div
      onClick={onApply}
      className={`group relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 border-b border-amber-500/60 py-2 sm:py-2.5 px-3 sm:px-6 cursor-pointer select-none transition-all hover:brightness-105 shadow-xs ${className}`}
      role="banner"
      aria-label="創星季官方廣播：誠徵各行業專家參與注資，注資額300萬（點擊申請）"
    >
      {/* 閃爍光波背景特效 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -left-10 top-0 bottom-0 w-24 bg-white/20 skew-x-[-25deg] group-hover:translate-x-[120vw] transition-transform duration-1000 ease-out pointer-events-none" />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 relative z-10">
        {/* 左側與中央主要廣播內容 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-center sm:justify-start">
          {/* 廣播圖標與微光動畫 */}
          <div className="relative shrink-0 flex items-center justify-center">
            <span className="absolute -inset-1 rounded-full bg-amber-200/60 animate-ping opacity-60" />
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-stone-950 text-amber-400 flex items-center justify-center shadow-xs">
              <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 -rotate-12 group-hover:rotate-0 transition-transform" />
            </div>
          </div>

          {/* 廣播小標籤 */}
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-950/10 border border-stone-950/20 text-[11px] font-black tracking-wide shrink-0">
            <Sparkles className="w-3 h-3 text-amber-900" />
            創星季廣播
          </span>

          {/* 廣播核心內容 (依使用者要求：誠徵各行業專家參與注資，注資額300萬（點擊申請）) */}
          <div className="flex items-center gap-1 text-xs sm:text-sm font-black tracking-tight truncate">
            <span className="text-stone-950 truncate">
              誠徵各行業專家參與注資，注資額300萬
            </span>
            <span className="inline-flex items-center text-amber-950 group-hover:text-stone-950 font-black underline underline-offset-2 decoration-stone-950/40 group-hover:decoration-stone-950 transition-colors shrink-0">
              （點擊申請）
            </span>
          </div>
        </div>

        {/* 右側醒目引導按鈕 (桌面版增強互動感) */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <span className="px-3 py-1 rounded-full bg-stone-950 text-amber-300 text-xs font-black shadow-xs group-hover:bg-stone-900 group-hover:scale-102 transition-all flex items-center gap-1">
            <span>立即申請專家</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
};

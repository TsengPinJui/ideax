import React, { useState } from 'react';
import { HelpCircle, X, Sparkles, Compass, EyeOff } from 'lucide-react';
import { GuideRole } from './StarSeasonGuideModal';

interface FloatingStarSeasonGuideProps {
  onOpenGuide: (role?: GuideRole) => void;
  isVisible?: boolean;
}

const HIDE_STORAGE_KEY = 'ideax_hide_star_season_guide_float';

export const FloatingStarSeasonGuide: React.FC<FloatingStarSeasonGuideProps> = ({
  onOpenGuide,
  isVisible = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    try {
      localStorage.setItem(HIDE_STORAGE_KEY, 'true');
    } catch {}
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <aside
      aria-label="創星季玩法導覽懸浮入口"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed left-3.5 sm:left-6 top-[36%] sm:top-[40%] z-40 flex items-center justify-start select-none group pointer-events-none transition-all duration-300"
    >
      <div className="relative flex flex-col items-center pointer-events-auto">
        {/* 關閉/隱藏教學按鈕 */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center shadow border border-stone-600 transition-all z-20 cursor-pointer hover:scale-110 active:scale-90"
          title="暫時隱藏此按鈕（隨時可由頂部導覽列「🔰 玩法導覽」重新開啟）"
          aria-label="暫時隱藏浮動導覽鍵"
        >
          <X className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>

        {/* 擬真金色「？」立體球形浮動鍵 (固定於首頁左側中間到中上位置，徹底避免掉至下方) */}
        <button
          type="button"
          onClick={() => onOpenGuide('audience')}
          className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_6px_22px_rgba(217,119,6,0.45)] hover:shadow-[0_8px_28px_rgba(217,119,6,0.65)] hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border-2 border-white/90 ring-2 ring-amber-400/50 shrink-0 touch-manipulation group"
          aria-label="開啟創星季 30 秒玩法導覽"
          title="開啟創星季 30 秒玩法導覽"
        >
          {/* 呼吸光環 (Pulse Ring) */}
          <span className="absolute -inset-1 rounded-full bg-amber-400 opacity-30 animate-ping pointer-events-none" />

          {/* 立體發光圓核 */}
          <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-inner">
            <span className="text-xl sm:text-2xl font-black font-sans leading-none drop-shadow-xs group-hover:scale-110 transition-transform">
              ?
            </span>
          </div>
        </button>
      </div>

      {/* 滑鼠懸停對話氣泡 (向右冒出 Speech Bubble，指向左側「？」按鈕) */}
      <div
        className={`absolute left-full ml-2.5 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out pointer-events-none ${
          isHovered
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 -translate-x-2 scale-95'
        }`}
      >
        <div className="relative bg-stone-900/95 text-white px-3 py-2.5 rounded-2xl shadow-2xl border border-amber-400/80 backdrop-blur-md flex flex-col gap-1.5 whitespace-nowrap min-w-[160px] pointer-events-auto">
          {/* 對話氣泡向左尖角 (Triangle Arrow pointing left to ? button) */}
          <div className="absolute -left-1 top-4 w-2.5 h-2.5 bg-stone-900 border-l border-b border-amber-400/80 rotate-45" />

          {/* 氣泡內容標題：點擊可直接啟動導覽 */}
          <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>創星季 30秒玩法導覽</span>
          </div>

          <div className="flex flex-col gap-1 pt-1 border-t border-stone-800 text-[11px]">
            <button
              type="button"
              onClick={() => onOpenGuide('audience')}
              className="text-stone-300 hover:text-amber-300 hover:bg-stone-800/80 px-1.5 py-0.5 rounded text-left transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>👀 我是觀眾：逛案&注資</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenGuide('proposer')}
              className="text-stone-300 hover:text-amber-300 hover:bg-stone-800/80 px-1.5 py-0.5 rounded text-left transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🚀 我是參賽：找題目提案</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenGuide('painpoint')}
              className="text-stone-300 hover:text-rose-300 hover:bg-stone-800/80 px-1.5 py-0.5 rounded text-left transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🔥 我有痛點：徵求高手</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenGuide('compare')}
              className="text-stone-300 hover:text-sky-300 hover:bg-stone-800/80 px-1.5 py-0.5 rounded text-left transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>⚖️ 兩網站功能定位差異</span>
            </button>
          </div>

          {/* 下方隱藏鍵 */}
          <div className="pt-1.5 border-t border-stone-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[10px] text-stone-400 hover:text-stone-200 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
              title="隱藏浮動按鈕，您隨時可在頂部導覽列點選「🔰 玩法導覽」"
            >
              <EyeOff className="w-3 h-3 text-stone-400 shrink-0" />
              <span>隱藏此按鈕</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

import { GUEST_VISIBLE_COUNT } from '../utils/guestAccess';
import React from 'react';
import { Lock, LogIn, Sparkles, ShieldCheck } from 'lucide-react';

export interface GuestBoardGateBlurOverlayProps {
  remainingCount: number;
  totalCount?: number;
  boardName?: string;
  onOpenAuth: () => void;
  blurredPreviewChildren?: React.ReactNode;
}

export const GuestBoardGateBlurOverlay: React.FC<GuestBoardGateBlurOverlayProps> = ({
  remainingCount,
  boardName,
  onOpenAuth,
  blurredPreviewChildren,
}) => {
  return (
    <div
      onClick={onOpenAuth}
      className="relative mt-4 pt-1 pb-4 w-full overflow-hidden select-none rounded-3xl cursor-pointer group/overlay transition-all min-h-[260px]"
    >
      {/* 模糊背景層 (高透毛玻璃質感：保留底層卡片色彩與豐富層次，模糊度適中，看不清楚字即可) */}
      <div
        aria-hidden="true"
        className="filter blur-[6px] opacity-85 pointer-events-none select-none max-h-[320px] overflow-hidden transition-opacity"
      >
        {blurredPreviewChildren || (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-stone-200 p-5 space-y-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-amber-200/80 rounded-full" />
                  <div className="h-4 w-12 bg-rose-200/80 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-4/5 bg-stone-700/80 rounded-md" />
                  <div className="h-3.5 w-full bg-stone-300 rounded" />
                  <div className="h-3.5 w-3/4 bg-stone-300 rounded" />
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-stone-300" />
                    <div className="h-3 w-16 bg-stone-300 rounded" />
                  </div>
                  <div className="h-4 w-14 bg-amber-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 漸層漸變與中央鎖定解鎖卡片 (不透明底大幅降低、清透毛玻璃效果，看得出底層色彩與卡片，但文字模糊不可辨識) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-t from-white/35 via-stone-50/15 to-transparent backdrop-blur-[3px]"
      >
        <div className="w-full max-w-md mx-auto p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/75 hover:bg-white/85 border border-white/80 shadow-2xl backdrop-blur-md text-center space-y-3.5 animate-in fade-in zoom-in-95 duration-200 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center mx-auto border border-amber-200/80 shadow-2xs">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>

          <div className="space-y-1">
            <h4 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
              登入後查看更多
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              未登入可瀏覽前 {GUEST_VISIBLE_COUNT} 則項目。{boardName ? `【${boardName}】` : '此看板'}尚有{' '}
              <strong className="text-amber-700 font-black font-mono">{remainingCount}</strong> 則內容，登入帳號即可免費暢覽完整討論、痛點細節與解方提案！
            </p>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-stone-950" />
              <span>登入後查看更多</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 text-[10px] text-stone-500 font-semibold pt-1 border-t border-stone-100">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              免費加入
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              全站看板暢覽
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

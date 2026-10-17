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
      className="relative mt-4 pt-1 pb-4 w-full overflow-hidden select-none rounded-2xl cursor-pointer group/overlay transition-all"
    >
      {/* 模糊背景層 (僅提供低透明度微光輪廓氛圍，絕不洩漏第 4 則之後的提案具體文字或內容) */}
      {blurredPreviewChildren && (
        <div
          aria-hidden="true"
          className="filter blur-[16px] opacity-20 pointer-events-none select-none max-h-[300px] overflow-hidden transition-opacity"
        >
          {blurredPreviewChildren}
        </div>
      )}

      {/* 漸層漸變與中央鎖定解鎖卡片 */}
      <div
        className={`${
          blurredPreviewChildren ? 'absolute inset-0' : 'relative'
        } flex flex-col items-center justify-center p-4 bg-gradient-to-t from-stone-100/95 via-stone-50/80 to-stone-50/40`}
      >
        <div className="w-full max-w-md mx-auto p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/95 hover:bg-white border border-stone-200/90 shadow-2xl backdrop-blur-xl text-center space-y-3.5 animate-in fade-in zoom-in-95 duration-200 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center mx-auto border border-amber-200/80 shadow-2xs">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>

          <div className="space-y-1">
            <h4 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
              需要登入才能查看更多
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              未登入僅開放預覽前 3 則項目。{boardName ? `【${boardName}】` : '此看板'}尚有{' '}
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
              <span>立即登入查看更多</span>
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

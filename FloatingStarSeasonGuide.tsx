import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, EyeOff, MoveVertical } from 'lucide-react';
import { GuideRole } from './StarSeasonGuideModal';

interface FloatingStarSeasonGuideProps {
  onOpenGuide: (role?: GuideRole) => void;
  isVisible?: boolean;
}

const HIDE_STORAGE_KEY = 'ideax_hide_star_season_guide_float';
const POS_STORAGE_KEY = 'ideax_star_season_guide_pos_y';

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

  // 上下垂直拖曳位子（鎖定於螢幕左側，不要離開左側邊，但可自由上下移動換位）
  const [posY, setPosY] = useState<number>(() => {
    if (typeof window === 'undefined') return 260;
    try {
      const saved = localStorage.getItem(POS_STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 64 && parsed <= window.innerHeight - 70) {
          return parsed;
        }
      }
    } catch {}
    return Math.min(Math.max(120, window.innerHeight * 0.42), window.innerHeight - 150);
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const startPosYRef = useRef<number>(260);
  const hasMovedRef = useRef<boolean>(false);
  const justDraggedRef = useRef<boolean>(false);

  // 視窗尺寸改變時自動校正邊界
  useEffect(() => {
    const handleResize = () => {
      setPosY((prev) => {
        const minY = 64;
        const maxY = Math.max(minY, window.innerHeight - 80);
        return Math.min(Math.max(minY, prev), maxY);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 儲存狀態至 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(POS_STORAGE_KEY, String(posY));
    } catch {}
  }, [posY]);

  // 滑鼠拖動邏輯 (僅在左側邊上下移動)
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) return;
    
    e.preventDefault();
    dragStartYRef.current = e.clientY;
    startPosYRef.current = posY;
    hasMovedRef.current = false;
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (dragStartYRef.current === null) return;
      const dy = moveEvent.clientY - dragStartYRef.current;
      if (Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }
      const minY = 64;
      const maxY = Math.max(minY, window.innerHeight - 80);
      const newY = Math.min(Math.max(minY, startPosYRef.current + dy), maxY);
      setPosY(newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartYRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (hasMovedRef.current) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 150);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 觸控螢幕拖動邏輯 (手機/平板)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) return;
    
    const touch = e.touches[0];
    dragStartYRef.current = touch.clientY;
    startPosYRef.current = posY;
    hasMovedRef.current = false;
    setIsDragging(true);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (dragStartYRef.current === null || moveEvent.touches.length !== 1) return;
      const moveTouch = moveEvent.touches[0];
      const dy = moveTouch.clientY - dragStartYRef.current;
      if (Math.abs(dy) > 4) {
        hasMovedRef.current = true;
        if (moveEvent.cancelable) moveEvent.preventDefault();
      }
      const minY = 64;
      const maxY = Math.max(minY, window.innerHeight - 80);
      const newY = Math.min(Math.max(minY, startPosYRef.current + dy), maxY);
      setPosY(newY);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      dragStartYRef.current = null;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (hasMovedRef.current) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 150);
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  };

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
      aria-label="創星季網站導覽懸浮入口"
      onMouseEnter={() => {
        if (!isDragging) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      style={{ top: `${posY}px` }}
      className={`fixed left-3.5 sm:left-6 z-40 flex items-center justify-start select-none group pointer-events-none ${
        isDragging ? 'cursor-grabbing' : 'transition-[top] duration-100 ease-out'
      }`}
    >
      <div className="relative flex flex-col items-center pointer-events-auto">
        {/* 關閉/隱藏教學按鈕 */}
        <button
          type="button"
          data-no-drag="true"
          onClick={handleDismiss}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center shadow border border-stone-600 transition-all z-20 cursor-pointer hover:scale-110 active:scale-90"
          title="暫時隱藏此按鈕（隨時可由頂部導覽列「🔰 創星季網站導覽」重新開啟）"
          aria-label="暫時隱藏浮動導覽鍵"
        >
          <X className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>

        {/* 擬真金色「？」立體球形浮動鍵 (鎖定左側邊，支援上下拖曳換位子) */}
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={(e) => {
            if (justDraggedRef.current) {
              e.stopPropagation();
              return;
            }
            onOpenGuide('audience');
          }}
          className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_6px_22px_rgba(217,119,6,0.45)] hover:shadow-[0_8px_28px_rgba(217,119,6,0.65)] hover:scale-105 active:scale-95 transition-transform duration-200 border-2 border-white/90 ring-2 ring-amber-400/50 shrink-0 touch-manipulation group ${
            isDragging ? 'cursor-grabbing scale-105 ring-4 ring-amber-400' : 'cursor-grab'
          }`}
          aria-label="開啟創星季網站導覽（可上下拖曳位子）"
          title="點擊開啟創星季網站導覽・按住可於左側上下拖移換位子"
        >
          {/* 立體發光圓核 */}
          <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-inner relative">
            <span className="text-xl sm:text-2xl font-black font-sans leading-none drop-shadow-xs group-hover:scale-110 transition-transform">
              ?
            </span>
            {/* 拖移手柄小提示點 */}
            <div className="absolute bottom-1 w-3 h-1 flex items-center justify-center gap-0.5 opacity-60">
              <span className="w-0.5 h-0.5 rounded-full bg-stone-900" />
              <span className="w-0.5 h-0.5 rounded-full bg-stone-900" />
              <span className="w-0.5 h-0.5 rounded-full bg-stone-900" />
            </div>
          </div>
        </button>
      </div>

      {/* 滑鼠懸停對話氣泡 (向右冒出 Speech Bubble，指向左側「？」按鈕) */}
      <div
        className={`absolute left-full ml-2.5 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out pointer-events-none ${
          isHovered && !isDragging
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 -translate-x-2 scale-95 pointer-events-none'
        }`}
      >
        <div className="relative bg-stone-900/95 text-white px-3 py-2.5 rounded-2xl shadow-2xl border border-amber-400/80 backdrop-blur-md flex flex-col gap-1.5 whitespace-nowrap min-w-[168px] pointer-events-auto">
          {/* 對話氣泡向左尖角 */}
          <div className="absolute -left-1 top-4 w-2.5 h-2.5 bg-stone-900 border-l border-b border-amber-400/80 rotate-45" />

          {/* 氣泡內容標題 */}
          <div className="flex items-center justify-between gap-1.5 text-amber-300 font-black text-xs tracking-wide">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>創星季網站導覽</span>
            </div>
            <span className="text-[9px] text-stone-400 font-normal flex items-center gap-0.5">
              <MoveVertical className="w-2.5 h-2.5" /> 可上下拖移
            </span>
          </div>

          <div className="flex flex-col gap-1 pt-1 border-t border-stone-800 text-[11px]">
            <button
              type="button"
              data-no-drag="true"
              onClick={() => onOpenGuide('audience')}
              className="text-stone-300 hover:text-amber-300 hover:bg-stone-800/80 px-1.5 py-0.5 rounded text-left transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>👀 我是觀眾：逛案&注資</span>
            </button>
            <button
              type="button"
              data-no-drag="true"
              onClick={() => onOpenGuide('proposer')}
              className="text-stone-300 hover:text-amber-300 hover:bg-stone-800/80 px-1.5 py-0.5 rounded text-left transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🚀 我是參賽：找題目提案</span>
            </button>
            <button
              type="button"
              data-no-drag="true"
              onClick={() => onOpenGuide('painpoint')}
              className="text-stone-300 hover:text-rose-300 hover:bg-stone-800/80 px-1.5 py-0.5 rounded text-left transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🔥 我有痛點：徵求高手</span>
            </button>
            <button
              type="button"
              data-no-drag="true"
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
              data-no-drag="true"
              onClick={handleDismiss}
              className="text-[10px] text-stone-400 hover:text-stone-200 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
              title="隱藏浮動按鈕，您隨時可在頂部導覽列點選「🔰 創星季網站導覽」"
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

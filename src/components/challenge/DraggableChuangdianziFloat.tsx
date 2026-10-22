import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DraggableChuangdianziFloatProps {
  onNavigate: () => void;
  className?: string;
}

export const DraggableChuangdianziFloat: React.FC<DraggableChuangdianziFloatProps> = ({
  onNavigate,
  className = '',
}) => {
  // 記錄是否隱藏/貼齊至邊框
  const [isDocked, setIsDocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ideax_chuangdianzi_docked') === 'true';
    } catch {
      return false;
    }
  });

  // 記錄貼齊哪一側邊框 ('left' | 'right')
  const [dockSide, setDockSide] = useState<'left' | 'right'>(() => {
    try {
      return (localStorage.getItem('ideax_chuangdianzi_dock_side') as 'left' | 'right') || 'right';
    } catch {
      return 'right';
    }
  });

  // 浮動按鈕位置坐標 { x, y } (預設位於右側中上方)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 180 };
    try {
      const saved = localStorage.getItem('ideax_chuangdianzi_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    const initialX = Math.max(16, window.innerWidth - 180);
    const initialY = Math.min(Math.max(120, window.innerHeight * 0.35), window.innerHeight - 160);
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 視窗尺寸改變時自動調整邊界
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const width = 160;
        const height = 54;
        const maxX = Math.max(16, window.innerWidth - width - 16);
        const maxY = Math.max(80, window.innerHeight - height - 80);
        return {
          x: Math.min(Math.max(16, prev.x), maxX),
          y: Math.min(Math.max(80, prev.y), maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 儲存狀態至 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ideax_chuangdianzi_docked', String(isDocked));
      localStorage.setItem('ideax_chuangdianzi_dock_side', dockSide);
      localStorage.setItem('ideax_chuangdianzi_pos', JSON.stringify(position));
    } catch {}
  }, [isDocked, dockSide, position]);

  // 滑鼠拖動邏輯
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    hasMovedRef.current = false;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.mouseX;
      const dy = moveEvent.clientY - dragStartRef.current.mouseY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }

      const width = containerRef.current?.offsetWidth || 160;
      const height = containerRef.current?.offsetHeight || 50;
      const maxX = Math.max(10, window.innerWidth - width - 10);
      const maxY = Math.max(70, window.innerHeight - height - 70);

      const newX = Math.min(Math.max(10, dragStartRef.current.startX + dx), maxX);
      const newY = Math.min(Math.max(70, dragStartRef.current.startY + dy), maxY);

      setPosition({ x: newX, y: newY });
      setDockSide(newX < window.innerWidth / 2 ? 'left' : 'right');
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // 拖曳到螢幕邊緣 (< 35px) 時自動貼齊隱藏
      setPosition((curr) => {
        const width = containerRef.current?.offsetWidth || 150;
        if (curr.x <= 35) {
          setDockSide('left');
          setIsDocked(true);
        } else if (curr.x >= window.innerWidth - width - 35) {
          setDockSide('right');
          setIsDocked(true);
        }
        return curr;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 觸控螢幕拖動邏輯
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    hasMovedRef.current = false;
    const touch = e.touches[0];
    dragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      startX: position.x,
      startY: position.y,
    };
    setIsDragging(true);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!dragStartRef.current || moveEvent.touches.length !== 1) return;
      const t = moveEvent.touches[0];
      const dx = t.clientX - dragStartRef.current.mouseX;
      const dy = t.clientY - dragStartRef.current.mouseY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }

      const width = containerRef.current?.offsetWidth || 160;
      const height = containerRef.current?.offsetHeight || 50;
      const maxX = Math.max(10, window.innerWidth - width - 10);
      const maxY = Math.max(70, window.innerHeight - height - 70);

      const newX = Math.min(Math.max(10, dragStartRef.current.startX + dx), maxX);
      const newY = Math.min(Math.max(70, dragStartRef.current.startY + dy), maxY);

      setPosition({ x: newX, y: newY });
      setDockSide(newX < window.innerWidth / 2 ? 'left' : 'right');
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);

      setPosition((curr) => {
        const width = containerRef.current?.offsetWidth || 150;
        if (curr.x <= 35) {
          setDockSide('left');
          setIsDocked(true);
        } else if (curr.x >= window.innerWidth - width - 35) {
          setDockSide('right');
          setIsDocked(true);
        }
        return curr;
      });
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  // 點擊前往 IdeaX 創點子首頁（拖曳過則不觸發跳轉）
  const handleClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    onNavigate();
  };

  // 從邊框叫出來
  const handleUndockFromEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDocked(false);
    setPosition((prev) => {
      const width = 150;
      return {
        x: dockSide === 'left' ? 40 : Math.max(40, window.innerWidth - width - 40),
        y: prev.y,
      };
    });
  };

  // -------------------------------------------------------------
  // 1. 隱藏到邊框狀態 (Docked/Minimized Peek Tab: 無邊框極簡化，只留下 < 或 >)
  // -------------------------------------------------------------
  if (isDocked) {
    const isRight = dockSide === 'right';
    return (
      <div
        className={`fixed z-50 select-none transition-transform duration-300 ease-out ${
          isRight ? 'right-0' : 'left-0'
        } ${className}`}
        style={{
          top: `${Math.min(Math.max(80, position.y), (typeof window !== 'undefined' ? window.innerHeight : 600) - 80)}px`,
        }}
      >
        <button
          type="button"
          onClick={handleUndockFromEdge}
          className={`flex items-center justify-center w-5 sm:w-6 h-9 sm:h-10 bg-white/95 hover:bg-white backdrop-blur-md shadow-md border-0 cursor-pointer active:scale-90 transition-all group ${
            isRight
              ? 'rounded-l-lg shadow-[-2px_2px_8px_rgba(0,0,0,0.12)]'
              : 'rounded-r-lg shadow-[2px_2px_8px_rgba(0,0,0,0.12)]'
          }`}
          title="【逛逛IdeaX創點子】· 點擊展開懸浮按鈕"
          aria-label="展開 IdeaX 創點子懸浮按鈕"
        >
          {isRight ? (
            <ChevronLeft className="w-4 h-4 text-orange-600 group-hover:-translate-x-0.5 transition-transform shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-orange-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
          )}
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. 正常展開懸浮按鈕狀態 (Expanded Draggable Floating Capsule)
  // -------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-50 select-none touch-none ${
        isDragging ? 'cursor-grabbing scale-102 shadow-2xl ring-2 ring-orange-400' : 'cursor-grab'
      } ${className}`}
    >
      <div className="group relative flex items-center">
        {/* 核心膠囊本體 (橘色外框、圓角、內嵌 logo-chuangdianzi-text) */}
        <div
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate();
            }
          }}
          className="flex items-center justify-center px-3.5 py-1.5 sm:py-2 rounded-full bg-white/95 backdrop-blur-md border-2 border-orange-500 hover:border-orange-600 shadow-xl hover:shadow-2xl hover:bg-orange-50/40 transition-all duration-200 active:scale-98 cursor-pointer ring-4 ring-orange-500/10"
          title="【逛逛IdeaX創點子】· 可任意拖曳移動 · 拖至邊框可隱藏 · 點擊進入首頁"
          aria-label="逛逛IdeaX創點子"
        >
          {/* 創點子圖片 logo-chuangdianzi-text */}
          <img
            src="/logo-chuangdianzi-text.png"
            alt="IdeaX 創點子"
            className="h-6 sm:h-7.5 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform drop-shadow-2xs"
            draggable={false}
          />
        </div>

        {/* 說明氣泡【逛逛IdeaX創點子】 */}
        <div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] font-black text-orange-950 bg-orange-50/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-orange-300 shadow-xs">
          【逛逛IdeaX創點子】
        </div>
      </div>
    </div>
  );
};

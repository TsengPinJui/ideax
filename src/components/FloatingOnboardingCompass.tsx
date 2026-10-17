import React, { useState, useEffect, useRef } from 'react';
import { EyeOff, X, MoveVertical } from 'lucide-react';

interface FloatingOnboardingCompassProps {
  onStartOnboarding: () => void;
  isVisible?: boolean;
}

const HIDE_STORAGE_KEY = 'ideax_hide_floating_compass';
const ONBOARDING_COMPLETED_KEY = 'ideax_app_onboarding_completed_v1';
// 只在第一次造訪時顯示導覽羅盤：首次造訪記下標記，之後的造訪不再出現（頁尾「新手導覽教學」仍可隨時開啟）
const FIRST_VISIT_SEEN_KEY = 'ideax_compass_first_visit_seen';
const FIRST_VISIT_SESSION_KEY = 'ideax_compass_first_visit_session';

function isReturningVisit(): boolean {
  try {
    const seenBefore = localStorage.getItem(FIRST_VISIT_SEEN_KEY) === 'true';
    const isFirstVisitSession = sessionStorage.getItem(FIRST_VISIT_SESSION_KEY) === 'true';
    if (!seenBefore) {
      localStorage.setItem(FIRST_VISIT_SEEN_KEY, 'true');
      sessionStorage.setItem(FIRST_VISIT_SESSION_KEY, 'true');
      return false;
    }
    return !isFirstVisitSession;
  } catch {
    return false;
  }
}
const POS_STORAGE_KEY = 'ideax_compass_guide_pos_y';

/**
 * 擬真 Emoji 風格羅盤圖示：金黃金屬外框、純白錶盤、立體紅白藍雙色指針
 */
export const RealisticCompassIcon: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 金黃外框金屬漸層 */}
        <linearGradient id="compassGoldGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="25%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="75%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* 內圈金色凹槽漸層 */}
        <linearGradient id="compassInnerRim" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* 純白錶盤細微光影 */}
        <radialGradient id="compassDialGrad" cx="50" cy="50" r="40" fx="40" fy="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="85%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>

        {/* 頂部外框光澤陰影 */}
        <filter id="compassDropShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* 1. 金黃色金屬外框底座 (Brass Bezel) */}
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="url(#compassGoldGrad)"
        stroke="#92400e"
        strokeWidth="1.5"
        filter="url(#compassDropShadow)"
      />

      {/* 2. 金黃金屬內邊緣 (Inner Gold Bevel) */}
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke="url(#compassInnerRim)"
        strokeWidth="2.5"
      />

      {/* 3. 白色錶盤 (White Dial Face) */}
      <circle
        cx="50"
        cy="50"
        r="38.5"
        fill="url(#compassDialGrad)"
        stroke="#cbd5e1"
        strokeWidth="0.8"
      />

      {/* 4. 錶盤刻度與羅盤方位刻度 (Compass Rose Ticks) */}
      {/* 12小時/刻度短線 */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <line
          key={deg}
          x1="50"
          y1="14.5"
          x2="50"
          y2={deg % 90 === 0 ? "18" : "16.5"}
          stroke={deg % 90 === 0 ? "#64748b" : "#94a3b8"}
          strokeWidth={deg % 90 === 0 ? "1.8" : "1"}
          strokeLinecap="round"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}

      {/* 方位標示字樣 N, E, S, W */}
      <text x="50" y="24" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#dc2626" fontFamily="sans-serif">N</text>
      <text x="76" y="52" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#64748b" fontFamily="sans-serif">E</text>
      <text x="50" y="80" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#64748b" fontFamily="sans-serif">S</text>
      <text x="24" y="52" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#64748b" fontFamily="sans-serif">W</text>

      {/* 5. 八角星芒方位背景花紋 (Subtle Compass Rose Star) */}
      <polygon points="50,26 53,47 50,50 47,47" fill="#fecaca" opacity="0.6" />
      <polygon points="50,74 53,53 50,50 47,53" fill="#bfdbfe" opacity="0.6" />
      <polygon points="26,50 47,53 50,50 47,47" fill="#cbd5e1" opacity="0.4" />
      <polygon points="74,50 53,53 50,50 53,47" fill="#cbd5e1" opacity="0.4" />

      {/* 6. 雙色立體針身 (Realistic Dual-Tone Needle) */}
      {/* 北針：鮮紅 (North Needle: Vibrant Red with 3D Bevel) */}
      <polygon points="50,19 54.5,50 50,47" fill="#dc2626" />
      <polygon points="50,19 45.5,50 50,47" fill="#ef4444" />

      {/* 南針：寶藍 (South Needle: Royal Blue with 3D Bevel) */}
      <polygon points="50,81 54.5,50 50,53" fill="#1d4ed8" />
      <polygon points="50,81 45.5,50 50,53" fill="#3b82f6" />

      {/* 7. 中央黃銅中心軸帽 (Center Brass Pivot Pin & Cap) */}
      <circle cx="50" cy="50" r="5" fill="#78350f" />
      <circle cx="50" cy="50" r="4.2" fill="url(#compassGoldGrad)" stroke="#451a03" strokeWidth="0.8" />
      <circle cx="48.8" cy="48.8" r="1.3" fill="#ffffff" opacity="0.85" />
    </svg>
  );
};

export const FloatingOnboardingCompass: React.FC<FloatingOnboardingCompassProps> = ({
  onStartOnboarding,
  isVisible = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // 檢查是否為已安裝開啟的 App 模式 (PWA Standalone)
  const [isAppMode, setIsAppMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });

  // 檢查是否已手動隱藏到頁尾，或已不是第一次造訪
  const [isDismissed, setIsDismissed] = useState(() => {
    if (isReturningVisit()) return true;
    try {
      return localStorage.getItem(HIDE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // 檢查是否已完成教學（教學完成後不再出現）
  const [isCompleted, setIsCompleted] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // 上下垂直拖曳位子（鎖定於螢幕左側邊，不離開左邊，可自由上下移動換位）
  const [posY, setPosY] = useState<number>(() => {
    if (typeof window === 'undefined') return 200;
    try {
      const saved = localStorage.getItem(POS_STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 64 && parsed <= window.innerHeight - 70) {
          return parsed;
        }
      }
    } catch {}
    return Math.min(Math.max(120, window.innerHeight * 0.32), window.innerHeight - 150);
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const startPosYRef = useRef<number>(200);
  const hasMovedRef = useRef<boolean>(false);
  const justDraggedRef = useRef<boolean>(false);

  // 視窗尺寸改變時自動調整上下邊界
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

  // 滑鼠拖動邏輯
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

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        if (localStorage.getItem(HIDE_STORAGE_KEY) === 'true') {
          setIsDismissed(true);
        }
        if (localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true') {
          setIsCompleted(true);
        }
      } catch {}
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsAppMode(e.matches || (window.navigator as any).standalone === true);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    try {
      localStorage.setItem(HIDE_STORAGE_KEY, 'true');
    } catch (err) {
      console.error(err);
    }
  };

  // 核心規則：若在已安裝 App 模式、或已被隱藏、或已完成導覽教學，羅盤浮動鈕不再出現！
  if (!isVisible || isAppMode || isDismissed || isCompleted) {
    return null;
  }

  return (
    <aside
      aria-label="網站使用導覽入口"
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
          title="隱藏教學提示（可隨時於頁尾開啟）"
          aria-label="隱藏教學提示"
        >
          <X className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>

        {/* 金黃外框、白錶盤、紅白藍指針的經典羅盤按鈕 (固定於左側邊，支援上下拖曳換位) */}
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={(e) => {
            if (justDraggedRef.current) {
              e.stopPropagation();
              return;
            }
            onStartOnboarding();
          }}
          className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_6px_22px_rgba(217,119,6,0.45)] hover:shadow-[0_8px_28px_rgba(217,119,6,0.65)] hover:scale-105 active:scale-95 transition-transform duration-200 border-2 border-white/90 ring-2 ring-amber-400/50 shrink-0 touch-manipulation ${
            isDragging ? 'cursor-grabbing scale-105 ring-4 ring-amber-400' : 'cursor-grab'
          }`}
          aria-label="開啟使用導覽（含聊天室教學，可上下拖曳位子）"
          title="點擊開啟使用教學導覽・按住可於左側上下拖移換位子"
        >
          {/* 擬真 🧭 羅盤圖示 */}
          <RealisticCompassIcon className="w-full h-full object-contain drop-shadow-xs" />
          
          {/* 底部微型拖曳提示點 */}
          <div className="absolute -bottom-1 px-1 py-0.2 rounded-full bg-stone-900/80 border border-amber-300/60 flex items-center justify-center gap-0.5 opacity-70">
            <span className="w-0.5 h-0.5 rounded-full bg-amber-400" />
            <span className="w-0.5 h-0.5 rounded-full bg-amber-400" />
            <span className="w-0.5 h-0.5 rounded-full bg-amber-400" />
          </div>
        </button>
      </div>

      {/* 滑鼠懸停對話氣泡 (向右冒出 Speech Bubble，指向左側羅盤按鈕) */}
      <div
        className={`absolute left-full ml-2.5 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out pointer-events-none ${
          isHovered && !isDragging
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 -translate-x-2 scale-95 pointer-events-none'
        }`}
      >
        <div className="relative bg-stone-900/95 text-white px-3 py-2 rounded-2xl shadow-2xl border border-amber-400/80 backdrop-blur-md flex flex-col gap-1.5 whitespace-nowrap min-w-[148px] pointer-events-auto">
          {/* 對話氣泡向左尖角 (Triangle Arrow pointing left to Compass) */}
          <div className="absolute -left-1 top-3.5 w-2.5 h-2.5 bg-stone-900 border-l border-b border-amber-400/80 rotate-45" />

          {/* 氣泡內容標題：點擊可直接啟動導覽 */}
          <div className="flex items-center justify-between gap-1.5 text-amber-300 font-bold text-xs tracking-wide">
            <button
              type="button"
              data-no-drag="true"
              onClick={onStartOnboarding}
              className="hover:text-amber-200 flex items-center gap-1 cursor-pointer transition-colors text-left"
            >
              <span>🧭</span>
              <span>需要使用導覽嗎？</span>
            </button>
            <span className="text-[9px] text-stone-400 font-normal flex items-center gap-0.5">
              <MoveVertical className="w-2.5 h-2.5" /> 可上下拖移
            </span>
          </div>

          {/* 下方隱藏鍵：隱藏到頁尾 */}
          <div className="pt-1.5 border-t border-stone-800 flex items-center justify-between">
            <button
              type="button"
              data-no-drag="true"
              onClick={handleDismiss}
              className="text-[10px] text-stone-400 hover:text-stone-200 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
              title="隱藏浮動按鈕，您隨時可在頁尾點選「導覽教學」"
            >
              <EyeOff className="w-3 h-3 text-stone-400 shrink-0" />
              <span>隱藏到頁尾</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

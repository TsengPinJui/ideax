import React, { useState, useEffect } from 'react';
import { EyeOff, X } from 'lucide-react';

interface FloatingOnboardingCompassProps {
  onStartOnboarding: () => void;
  isVisible?: boolean;
}

const HIDE_STORAGE_KEY = 'ideax_hide_floating_compass';
const ONBOARDING_COMPLETED_KEY = 'ideax_app_onboarding_completed_v1';

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
      <text x="77" y="52.2" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#64748b" fontFamily="sans-serif">E</text>
      <text x="50" y="80" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#2563eb" fontFamily="sans-serif">S</text>
      <text x="23" y="52.2" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#64748b" fontFamily="sans-serif">W</text>

      {/* 5. 旋轉雙色立體指針 (North: 紅色 / South: 藍色，45度傾斜經典姿態) */}
      <g className="origin-center transform rotate-45 group-hover:rotate-[85deg] transition-transform duration-500 ease-out">
        {/* 北針 (Red North Needle) - 雙面立體陰影 */}
        <polygon points="50,15 44.5,50 50,47" fill="#ef4444" />
        <polygon points="50,15 55.5,50 50,47" fill="#b91c1c" />

        {/* 南針 (Blue South Needle) - 雙面立體陰影 */}
        <polygon points="50,85 44.5,50 50,53" fill="#3b82f6" />
        <polygon points="50,85 55.5,50 50,53" fill="#1d4ed8" />

        {/* 中心固定黃銅軸心 (Center Pivot Brass Cap) */}
        <circle cx="50" cy="50" r="5.5" fill="url(#compassGoldGrad)" stroke="#78350f" strokeWidth="1" />
        <circle cx="50" cy="50" r="2.2" fill="#451a03" />
        <circle cx="48.5" cy="48.5" r="1" fill="#ffffff" opacity="0.8" />
      </g>
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

  // 檢查是否已手動隱藏到頁尾
  const [isDismissed, setIsDismissed] = useState(() => {
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
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center justify-end select-none group pointer-events-auto"
    >
      <div className="relative flex flex-col items-center">
        {/* 關閉/隱藏教學按鈕 */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center shadow border border-stone-600 transition-all z-20 cursor-pointer hover:scale-110 active:scale-90"
          title="隱藏教學提示（可隨時於頁尾開啟）"
          aria-label="隱藏教學提示"
        >
          <X className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>

        {/* 金黃外框、白錶盤、紅白藍指針的經典羅盤按鈕 (與下方下載按鈕保持一致黃金尺寸) */}
        <button
          type="button"
          onClick={onStartOnboarding}
          className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_6px_22px_rgba(217,119,6,0.45)] hover:shadow-[0_8px_28px_rgba(217,119,6,0.65)] hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border-2 border-white/90 ring-2 ring-amber-400/50 shrink-0"
          aria-label="開啟使用導覽（含聊天室教學）"
          title="開啟使用教學導覽"
        >
          {/* 呼吸光環 (Pulse Ring) */}
          <span className="absolute -inset-1 rounded-full bg-amber-400 opacity-30 animate-ping pointer-events-none" />

          {/* 擬真 🧭 羅盤圖示 */}
          <RealisticCompassIcon className="w-full h-full object-contain drop-shadow-xs" />
        </button>
      </div>

      {/* 滑鼠懸停對話氣泡 (向左冒出 Speech Bubble，指向右側羅盤按鈕) */}
      <div
        className={`absolute right-full mr-2.5 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out ${
          isHovered
            ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-x-2 scale-95 pointer-events-none'
        }`}
      >
        <div className="relative bg-stone-900/95 text-white px-3 py-2 rounded-2xl shadow-2xl border border-amber-400/80 backdrop-blur-md flex flex-col gap-1.5 whitespace-nowrap min-w-[136px]">
          {/* 對話氣泡向右尖角 (Triangle Arrow pointing right to Compass) */}
          <div className="absolute -right-1 top-3.5 w-2.5 h-2.5 bg-stone-900 border-r border-t border-amber-400/80 rotate-45" />

          {/* 氣泡內容標題：點擊可直接啟動導覽 */}
          <button
            type="button"
            onClick={onStartOnboarding}
            className="text-amber-300 hover:text-amber-200 font-bold text-xs tracking-wide flex items-center gap-1 cursor-pointer transition-colors text-left"
          >
            <span>🧭</span>
            <span>需要使用導覽嗎？</span>
          </button>

          {/* 下方隱藏鍵：隱藏到頁尾 */}
          <div className="pt-1.5 border-t border-stone-800 flex items-center justify-between">
            <button
              type="button"
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
    </div>
  );
};

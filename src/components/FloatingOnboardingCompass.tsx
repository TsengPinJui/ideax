import React, { useState } from 'react';

interface FloatingOnboardingCompassProps {
  onStartOnboarding: () => void;
  isVisible?: boolean;
}

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

  if (!isVisible) return null;

  return (
    <div className="fixed right-3 sm:right-5 top-[220px] sm:top-[252px] z-40 flex items-center justify-end select-none group pointer-events-auto">
      {/* 金黃外框、白錶盤、紅白藍指針的經典羅盤按鈕 */}
      <button
        type="button"
        onClick={onStartOnboarding}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_6px_22px_rgba(217,119,6,0.45)] hover:shadow-[0_8px_28px_rgba(217,119,6,0.65)] hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border-2 border-white/90 ring-2 ring-amber-400/50 shrink-0"
        aria-label="開啟使用導覽（含聊天室教學）"
        title="開啟使用教學導覽"
      >
        {/* 呼吸光環 (Pulse Ring) */}
        <span className="absolute -inset-1 rounded-full bg-amber-400 opacity-30 animate-ping pointer-events-none" />

        {/* 擬真 🧭 羅盤圖示 */}
        <RealisticCompassIcon className="w-full h-full object-contain drop-shadow-xs" />
      </button>

      {/* 滑鼠懸停對話氣泡 (向左冒出 Speech Bubble，指向右側羅盤按鈕) */}
      <div
        className={`absolute right-full mr-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 ease-out ${
          isHovered
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 translate-x-2 scale-95'
        }`}
      >
        <div className="relative bg-stone-900/95 text-white px-3 py-1.5 rounded-xl shadow-xl border border-amber-400/80 backdrop-blur-md flex items-center whitespace-nowrap">
          {/* 對話氣泡向右尖角 (Triangle Arrow pointing right to Compass) */}
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-stone-900 border-r border-t border-amber-400/80 rotate-45" />

          {/* 氣泡精簡內容 */}
          <span className="text-amber-300 font-bold text-xs tracking-wide flex items-center gap-1">
            <span>🧭</span>
            <span>需要使用導覽嗎？</span>
          </span>
        </div>
      </div>
    </div>
  );
};

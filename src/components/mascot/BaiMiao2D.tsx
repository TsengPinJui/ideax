import React, { useEffect, useRef, useState } from 'react';
import { BaiMiaoPose } from './BaiMiao3D';

export interface BaiMiao2DProps {
  pose?: BaiMiaoPose;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

/**
 * 提案內頁專屬：高畫質 2D 向量插畫動畫「白喵（點點 Idea）」
 * 依據原廠角色設定圖與使用者回饋精準修訂：
 * 1. 臉部寬度黃金比例（修窄為圓潤飽滿、不橫向拉寬的麻糬貓頭）
 * 2. 雙耳金黃色（搭配淺鵝黃內耳）
 * 3. 黑色鬍鬚（左右臉頰各三根乾淨黑色鬍鬚）
 * 4. 黃色項圈 + 金色鈴鐺
 * 5. 穿梭模塊 (card_shuttle) 與中間側躺 (idle_nap) 及趴平熟睡 (deep_sleep)
 */
export const BaiMiao2D: React.FC<BaiMiao2DProps> = ({
  pose = 'stand_smile',
  size = 76,
  width,
  height,
  className = '',
  onClick,
}) => {
  const w = width || size;
  const h = height || size;
  const [isBlinking, setIsBlinking] = useState(false);
  const uidRef = useRef(`bm2d-${Math.random().toString(36).slice(2, 8)}`);
  const uid = uidRef.current;

  useEffect(() => {
    if (pose === 'idle_nap' || pose === 'deep_sleep') return;
    const interval = window.setInterval(() => {
      setIsBlinking(true);
      window.setTimeout(() => setIsBlinking(false), 150);
    }, 3600);
    return () => window.clearInterval(interval);
  }, [pose]);

  const isNap = pose === 'idle_nap';
  const isDeepSleep = pose === 'deep_sleep';
  const isWalkLeft = pose === 'walk_left';
  const isWalkRight = pose === 'walk_right';
  const isWaveRight = pose === 'wave_hi_right';
  const isWaveLeft = pose === 'wave_hi_left';
  const isShuttle = pose === 'card_shuttle';
  const isTelescope = pose === 'headhunter_telescope';
  const isMediator = pose === 'chat_mediator';
  const isMagnifier = pose === 'report_magnifier';

  const bodyAnimClass = isDeepSleep
    ? 'animate-[pulse_2.4s_ease-in-out_infinite]'
    : isNap
    ? 'animate-[pulse_3.2s_ease-in-out_infinite]'
    : isShuttle || isWalkLeft || isWalkRight
    ? 'animate-[bounce_0.55s_ease-in-out_infinite]'
    : 'animate-[bounce_2.4s_ease-in-out_infinite]';

  return (
    <div
      onClick={onClick}
      style={{ width: w, height: h }}
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 200 200"
        className={`w-full h-full overflow-visible drop-shadow-[0_4px_8px_rgba(45,24,16,0.12)] ${bodyAnimClass}`}
        style={{
          transform: isWalkLeft ? 'scaleX(-1)' : undefined,
        }}
      >
        <defs>
          {/* 純白澎潤麻糬漸層 */}
          <radialGradient id={`${uid}-fur`} cx="45%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="75%" stopColor="#fffdf9" />
            <stop offset="100%" stopColor="#f5f0e6" />
          </radialGradient>

          {/* 黃色耳朵漸層 */}
          <linearGradient id={`${uid}-ear-yellow`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>

          {/* 黃色項圈漸層 */}
          <linearGradient id={`${uid}-collar`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>

          {/* 金色鈴鐺立體金屬漸層 */}
          <radialGradient id={`${uid}-gold-bell`} cx="38%" cy="35%" r="62%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="45%" stopColor="#facc15" />
            <stop offset="85%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </radialGradient>
        </defs>

        {/* 柔和立體地面投影 */}
        <ellipse
          cx="100"
          cy="184"
          rx={isDeepSleep ? '66' : isNap || isMagnifier ? '58' : '42'}
          ry="8.5"
          fill="rgba(45, 24, 16, 0.12)"
        />

        {isDeepSleep ? (
          /* ================= 閒置過久：在中間趴平熟睡 + 呼呼大睡 Zzz ================= */
          <g transform="translate(14, 28)">
            {/* 黃尾尖貓尾 */}
            <path
              d="M 136 134 Q 168 136 168 118 Q 168 104 152 110 Q 140 116 134 126"
              fill={`url(#${uid}-fur)`}
              stroke="#2b1810"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 167 122 Q 169 106 154 109 Q 146 114 146 123 Z"
              fill={`url(#${uid}-ear-yellow)`}
            />

            {/* 趴平圓滾滾身體 */}
            <ellipse
              cx="106"
              cy="126"
              rx="40"
              ry="26"
              fill={`url(#${uid}-fur)`}
              stroke="#2b1810"
              strokeWidth="4"
            />

            {/* 黃色項圈與金色鈴鐺 */}
            <path
              d="M 66 108 Q 82 126 74 146 Q 64 138 62 118 Z"
              fill={`url(#${uid}-collar)`}
              stroke="#2b1810"
              strokeWidth="3.6"
              strokeLinejoin="round"
            />
            <circle
              cx="72"
              cy="142"
              r="7.8"
              fill={`url(#${uid}-gold-bell)`}
              stroke="#2b1810"
              strokeWidth="3"
            />
            <circle cx="72" cy="144" r="2" fill="#2b1810" />

            {/* 趴睡麻糬貓頭（修正：圓潤可愛、不橫向拉寬） */}
            <g transform="translate(56, 118) rotate(-5)">
              {/* 左耳（黃色） */}
              <path
                d="M -30 -18 Q -36 -52 -10 -36 Z"
                fill={`url(#${uid}-ear-yellow)`}
                stroke="#2b1810"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path d="M -26 -20 Q -30 -40 -14 -30 Z" fill="#fef9c3" />

              {/* 右耳（黃色） */}
              <path
                d="M 10 -36 Q 36 -52 30 -18 Z"
                fill={`url(#${uid}-ear-yellow)`}
                stroke="#2b1810"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path d="M 14 -30 Q 30 -40 26 -20 Z" fill="#fef9c3" />

              {/* 圓潤麻糬臉（修正寬度 rx: 34, ry: 29） */}
              <ellipse
                cx="0"
                cy="0"
                rx="34"
                ry="29"
                fill={`url(#${uid}-fur)`}
                stroke="#2b1810"
                strokeWidth="4"
              />

              {/* 黑色鬍鬚（左右各三根，緊湊俐落） */}
              <g stroke="#1c100b" strokeWidth="2.5" strokeLinecap="round">
                <line x1="-30" y1="2" x2="-44" y2="-1" />
                <line x1="-31" y1="7" x2="-46" y2="7" />
                <line x1="-30" y1="12" x2="-43" y2="15" />
                <line x1="30" y1="2" x2="44" y2="-1" />
                <line x1="31" y1="7" x2="46" y2="7" />
                <line x1="30" y1="12" x2="43" y2="15" />
              </g>

              {/* 粉嫩腮紅 */}
              <ellipse cx="-18" cy="8" rx="7.5" ry="5" fill="#fca5a5" opacity="0.68" />
              <ellipse cx="18" cy="8" rx="7.5" ry="5" fill="#fca5a5" opacity="0.68" />

              {/* 閉眼熟睡弧線 */}
              <path
                d="M -20 -1 Q -13 6 -6 -1"
                fill="none"
                stroke="#2b1810"
                strokeWidth="3.6"
                strokeLinecap="round"
              />
              <path
                d="M 6 -1 Q 13 6 20 -1"
                fill="none"
                stroke="#2b1810"
                strokeWidth="3.6"
                strokeLinecap="round"
              />

              {/* 小鼻與 ω 嘴 */}
              <polygon points="-2.5,4 2.5,4 0,7.5" fill="#e07a7a" />
              <path
                d="M -6 10 Q -3 13 0 10 Q 3 13 6 10"
                fill="none"
                stroke="#2b1810"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </g>

            {/* 趴睡前手 */}
            <ellipse
              cx="38"
              cy="142"
              rx="11"
              ry="7"
              fill={`url(#${uid}-fur)`}
              stroke="#2b1810"
              strokeWidth="3.8"
            />
            <ellipse
              cx="84"
              cy="146"
              rx="11"
              ry="7"
              fill={`url(#${uid}-fur)`}
              stroke="#2b1810"
              strokeWidth="3.8"
            />

            <text
              x="88"
              y="56"
              fill="#3b2316"
              fontSize="16"
              fontWeight="900"
              className="animate-bounce"
            >
              z Z Z
            </text>
          </g>
        ) : isNap ? (
          /* ================= 中間位置：側躺小睡（對齊參考圖左6） ================= */
          <g transform="translate(14, 20)">
            <path
              d="M 136 132 Q 164 120 160 100 Q 156 88 144 96 Q 134 104 132 122"
              fill={`url(#${uid}-fur)`}
              stroke="#2b1810"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 159 106 Q 161 92 148 92 Q 140 96 139 105 Z"
              fill={`url(#${uid}-ear-yellow)`}
            />

            <ellipse
              cx="108"
              cy="132"
              rx="37"
              ry="25"
              fill={`url(#${uid}-fur)`}
              stroke="#2b1810"
              strokeWidth="4"
            />

            {/* 側躺露出的粉紅肉球小腳 */}
            <ellipse
              cx="142"
              cy="142"
              rx="11"
              ry="8.5"
              transform="rotate(-12 142 142)"
              fill={`url(#${uid}-fur)`}
              stroke="#2b1810"
              strokeWidth="3.8"
            />
            <circle cx="145" cy="142" r="3.4" fill="#f9a8b8" />
            <circle cx="140" cy="138" r="1.6" fill="#f9a8b8" />
            <circle cx="140" cy="146" r="1.6" fill="#f9a8b8" />

            {/* 黃色項圈與金色鈴鐺 */}
            <path
              d="M 72 110 Q 86 130 80 150 Q 70 140 68 120 Z"
              fill={`url(#${uid}-collar)`}
              stroke="#2b1810"
              strokeWidth="3.6"
              strokeLinejoin="round"
            />
            <circle
              cx="78"
              cy="136"
              r="7.8"
              fill={`url(#${uid}-gold-bell)`}
              stroke="#2b1810"
              strokeWidth="3"
            />
            <circle cx="78" cy="138" r="2" fill="#2b1810" />

            <g transform="translate(56, 110) rotate(-10)">
              <path
                d="M -30 -18 Q -36 -52 -10 -36 Z"
                fill={`url(#${uid}-ear-yellow)`}
                stroke="#2b1810"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path d="M -26 -20 Q -30 -40 -14 -30 Z" fill="#fef9c3" />

              <path
                d="M 10 -36 Q 36 -52 30 -18 Z"
                fill={`url(#${uid}-ear-yellow)`}
                stroke="#2b1810"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path d="M 14 -30 Q 30 -40 26 -20 Z" fill="#fef9c3" />

              {/* 圓潤麻糬臉（修正寬度 rx: 34, ry: 29） */}
              <ellipse
                cx="0"
                cy="0"
                rx="34"
                ry="29"
                fill={`url(#${uid}-fur)`}
                stroke="#2b1810"
                strokeWidth="4"
              />

              {/* 黑色鬍鬚 */}
              <g stroke="#1c100b" strokeWidth="2.5" strokeLinecap="round">
                <line x1="-30" y1="2" x2="-44" y2="-1" />
                <line x1="-31" y1="7" x2="-46" y2="7" />
                <line x1="-30" y1="12" x2="-43" y2="15" />
                <line x1="30" y1="2" x2="44" y2="-1" />
                <line x1="31" y1="7" x2="46" y2="7" />
                <line x1="30" y1="12" x2="43" y2="15" />
              </g>

              <ellipse cx="-18" cy="8" rx="7.5" ry="5" fill="#fca5a5" opacity="0.65" />
              <ellipse cx="18" cy="8" rx="7.5" ry="5" fill="#fca5a5" opacity="0.65" />

              <path
                d="M -19 -1 Q -12 6 -5 -1"
                fill="none"
                stroke="#2b1810"
                strokeWidth="3.6"
                strokeLinecap="round"
              />
              <path
                d="M 5 -1 Q 12 6 19 -1"
                fill="none"
                stroke="#2b1810"
                strokeWidth="3.6"
                strokeLinecap="round"
              />

              <polygon points="-2.5,4 2.5,4 0,7.5" fill="#e07a7a" />
              <path
                d="M -6 10 Q -3 13 0 10 Q 3 13 6 10"
                fill="none"
                stroke="#2b1810"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </g>

            <text
              x="92"
              y="60"
              fill="#64748b"
              fontSize="15"
              fontWeight="900"
              className="animate-bounce"
            >
              z Z
            </text>
          </g>
        ) : (
          /* ================= 站立 / 揮手嗨 / 提案模塊穿梭跑跑跳躍 ================= */
          <g>
            {/* 1. 長貓尾（白底 + 黃色尾尖） */}
            <g className="origin-[118px_142px] animate-[wiggle_1.8s_ease-in-out_infinite]">
              <path
                d="M 118 144 Q 158 136 160 100 Q 161 82 145 88 Q 134 94 130 128"
                fill={`url(#${uid}-fur)`}
                stroke="#2b1810"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 159 108 Q 161 84 146 88 Q 140 92 138 104 Z"
                fill={`url(#${uid}-ear-yellow)`}
              />
            </g>

            {/* 2. 雙腳（清晰獨立、粉嫩肉球） */}
            <g
              transform={
                isWaveRight || isShuttle
                  ? 'translate(82, 154) rotate(22)'
                  : isWalkLeft || isWalkRight
                  ? 'translate(82, 156) rotate(-14)'
                  : 'translate(82, 158)'
              }
            >
              <rect
                x="-9"
                y="-7"
                width="18"
                height="26"
                rx="9"
                fill={`url(#${uid}-fur)`}
                stroke="#2b1810"
                strokeWidth="3.8"
              />
              {(isWaveRight || isShuttle) && (
                <g transform="translate(0, 10)">
                  <circle cx="0" cy="2" r="3.2" fill="#f9a8b8" />
                  <circle cx="-3.6" cy="-2" r="1.5" fill="#f9a8b8" />
                  <circle cx="0" cy="-3.5" r="1.5" fill="#f9a8b8" />
                  <circle cx="3.6" cy="-2" r="1.5" fill="#f9a8b8" />
                </g>
              )}
            </g>

            <g
              transform={
                isWaveLeft
                  ? 'translate(118, 154) rotate(-22)'
                  : isWalkLeft || isWalkRight
                  ? 'translate(118, 156) rotate(14)'
                  : 'translate(118, 158)'
              }
            >
              <rect
                x="-9"
                y="-7"
                width="18"
                height="26"
                rx="9"
                fill={`url(#${uid}-fur)`}
                stroke="#2b1810"
                strokeWidth="3.8"
              />
              {isWaveLeft && (
                <g transform="translate(0, 10)">
                  <circle cx="0" cy="2" r="3.2" fill="#f9a8b8" />
                  <circle cx="-3.6" cy="-2" r="1.5" fill="#f9a8b8" />
                  <circle cx="0" cy="-3.5" r="1.5" fill="#f9a8b8" />
                  <circle cx="3.6" cy="-2" r="1.5" fill="#f9a8b8" />
                </g>
              )}
            </g>

            {/* 3. 純白圓潤身體（寬度適中） */}
            <path
              d="M 74 112 C 68 134, 70 162, 100 162 C 130 162, 132 134, 126 112 Z"
              fill={`url(#${uid}-fur)`}
              stroke="#2b1810"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* 4. 雙手（往兩側張開，露出粉嫩肉球！） */}
            <g
              transform={
                isWaveLeft || isShuttle
                  ? 'translate(66, 114) rotate(136)'
                  : isWaveRight
                  ? 'translate(66, 118) rotate(70)'
                  : 'translate(68, 116) rotate(32)'
              }
            >
              <rect
                x="-8.5"
                y="0"
                width="17"
                height="32"
                rx="8.5"
                fill={`url(#${uid}-fur)`}
                stroke="#2b1810"
                strokeWidth="3.8"
              />
              <g transform="translate(0, 22)">
                <circle cx="0" cy="2" r="3.4" fill="#f9a8b8" />
                <circle cx="-3.6" cy="-2" r="1.6" fill="#f9a8b8" />
                <circle cx="0" cy="-3.6" r="1.6" fill="#f9a8b8" />
                <circle cx="3.6" cy="-2" r="1.6" fill="#f9a8b8" />
              </g>
            </g>

            <g
              transform={
                isWaveRight || isShuttle
                  ? 'translate(134, 114) rotate(-136)'
                  : isWaveLeft
                  ? 'translate(134, 118) rotate(-70)'
                  : 'translate(132, 116) rotate(-32)'
              }
            >
              <rect
                x="-8.5"
                y="0"
                width="17"
                height="32"
                rx="8.5"
                fill={`url(#${uid}-fur)`}
                stroke="#2b1810"
                strokeWidth="3.8"
              />
              <g transform="translate(0, 22)">
                <circle cx="0" cy="2" r="3.4" fill="#f9a8b8" />
                <circle cx="-3.6" cy="-2" r="1.6" fill="#f9a8b8" />
                <circle cx="0" cy="-3.6" r="1.6" fill="#f9a8b8" />
                <circle cx="3.6" cy="-2" r="1.6" fill="#f9a8b8" />
              </g>
            </g>

            {/* 5. 黃色項圈 + 金色鈴鐺 */}
            <path
              d="M 68 108 Q 100 120 132 108 Q 135 116 125 122 Q 100 128 75 122 Q 65 116 68 108 Z"
              fill={`url(#${uid}-collar)`}
              stroke="#2b1810"
              strokeWidth="3.8"
              strokeLinejoin="round"
            />
            <g transform="translate(100, 126)">
              <circle
                cx="0"
                cy="2"
                r="8.6"
                fill={`url(#${uid}-gold-bell)`}
                stroke="#2b1810"
                strokeWidth="3.2"
              />
              <line x1="-7" y1="0" x2="7" y2="0" stroke="#92400e" strokeWidth="2" />
              <circle cx="0" cy="4" r="2" fill="#2b1810" />
              <line x1="0" y1="6" x2="0" y2="9.5" stroke="#2b1810" strokeWidth="2" />
              <circle cx="-2.5" cy="-2.5" r="1.8" fill="#fef9c3" />
            </g>

            {/* 6. 麻糬貓頭（重點修正：修窄臉型、黃金圓潤比例、黃耳、黑鬍鬚） */}
            <g
              transform={
                isWaveRight
                  ? 'translate(100, 74) rotate(-3)'
                  : isWaveLeft
                  ? 'translate(100, 74) rotate(3)'
                  : 'translate(100, 74)'
              }
            >
              {/* 左耳（黃色耳朵 + 淺鵝黃內耳） */}
              <g>
                <path
                  d="M -32 -18 Q -38 -52 -10 -36 Z"
                  fill={`url(#${uid}-ear-yellow)`}
                  stroke="#2b1810"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path d="M -26 -20 Q -30 -40 -14 -30 Z" fill="#fef9c3" />
              </g>

              {/* 右耳（黃色耳朵 + 淺鵝黃內耳） */}
              <g>
                <path
                  d="M 10 -36 Q 36 -52 30 -18 Z"
                  fill={`url(#${uid}-ear-yellow)`}
                  stroke="#2b1810"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path d="M 14 -30 Q 30 -40 26 -20 Z" fill="#fef9c3" />
              </g>

              {/* 圓潤麻糬臉頰主體（修正：寬度由原先的 116 縮窄至 76，高 72，圓滾滾超可愛） */}
              <path
                d="M -38 4 C -40 -24, -24 -36, 0 -36 C 24 -36, 40 -24, 38 4 C 41 22, 27 34, 0 34 C -27 34, -41 22, -38 4 Z"
                fill={`url(#${uid}-fur)`}
                stroke="#2b1810"
                strokeWidth="4.2"
                strokeLinejoin="round"
              />

              {/* 左右臉頰各三根黑色鬍鬚（俐落清爽） */}
              <g stroke="#1c100b" strokeWidth="2.6" strokeLinecap="round">
                {/* 左側三根黑鬍鬚 */}
                <line x1="-34" y1="4" x2="-49" y2="1" />
                <line x1="-35" y1="10" x2="-51" y2="10" />
                <line x1="-34" y1="16" x2="-48" y2="19" />
                {/* 右側三根黑鬍鬚 */}
                <line x1="34" y1="4" x2="49" y2="1" />
                <line x1="35" y1="10" x2="51" y2="10" />
                <line x1="34" y1="16" x2="48" y2="19" />
              </g>

              {/* 柔和粉嫩腮紅（隨臉型內聚） */}
              <ellipse cx="-20" cy="11" rx="8" ry="5.2" fill="#fca5a5" opacity="0.68" />
              <ellipse cx="20" cy="11" rx="8" ry="5.2" fill="#fca5a5" opacity="0.68" />

              {/* 眼睛（揮手或穿梭時 `< >` 開心笑眼，眨眼時彎眉，平時深亮圓眼） */}
              {isWaveRight || isWaveLeft || isShuttle ? (
                <g stroke="#2b1810" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <polyline points="-21,-6 -13,0 -21,6" />
                  <polyline points="21,-6 13,0 21,6" />
                </g>
              ) : isBlinking ? (
                <>
                  <path d="M -22 -1 Q -15 4 -8 -1" fill="none" stroke="#2b1810" strokeWidth="3.6" strokeLinecap="round" />
                  <path d="M 8 -1 Q 15 4 22 -1" fill="none" stroke="#2b1810" strokeWidth="3.6" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <g transform="translate(-16, -1)">
                    <ellipse cx="0" cy="0" rx="7.4" ry="8.6" fill="#2b1810" />
                    <path d="M -5.2 2.8 A 5.5 4.5 0 0 0 5.2 2.8 Z" fill="#783f1d" />
                    <ellipse cx="-2.5" cy="-3" rx="2.6" ry="2.8" fill="#ffffff" />
                    <circle cx="2.6" cy="2.5" r="1.3" fill="#ffffff" />
                  </g>
                  <g transform="translate(16, -1)">
                    <ellipse cx="0" cy="0" rx="7.4" ry="8.6" fill="#2b1810" />
                    <path d="M -5.2 2.8 A 5.5 4.5 0 0 0 5.2 2.8 Z" fill="#783f1d" />
                    <ellipse cx="-2.5" cy="-3" rx="2.6" ry="2.8" fill="#ffffff" />
                    <circle cx="2.6" cy="2.5" r="1.3" fill="#ffffff" />
                  </g>
                </>
              )}

              {/* 粉紅倒三角小鼻 */}
              <path d="M -2.8 5 Q 0 4 2.8 5 Q 1.4 8 0 8.5 Q -1.4 8 -2.8 5 Z" fill="#e07a7a" />

              {/* 開心微笑貓嘴 */}
              <g transform="translate(0, 11)">
                <path
                  d="M -8 1 Q -4 3.8 0 -1 Q 4 3.8 8 1 C 8.8 12, 4.5 16, 0 16 C -4.5 16, -8.8 12, -8 1 Z"
                  fill="#c84b58"
                  stroke="#2b1810"
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                />
                <ellipse cx="0" cy="11" rx="5.4" ry="4.2" fill="#ff9aa2" />
                <path
                  d="M -10 0 Q -5 4 0 -1 Q 5 4 10 0"
                  fill="none"
                  stroke="#2b1810"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* 頭頂閃耀金色星芒 */}
              {(isShuttle || isWaveRight || isWaveLeft) && (
                <g fill="#eab308">
                  <path d="M -28 -48 L -26 -43 L -21 -41 L -26 -39 L -28 -34 L -30 -39 L -35 -41 L -30 -43 Z" />
                  <path d="M 0 -54 L 2 -49 L 7 -47 L 2 -45 L 0 -40 L -2 -45 L -7 -47 L -2 -49 Z" />
                  <path d="M 28 -48 L 30 -43 L 35 -41 L 30 -39 L 28 -34 L 26 -39 L 21 -41 L 26 -43 Z" />
                </g>
              )}
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};

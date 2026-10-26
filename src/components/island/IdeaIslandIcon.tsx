import React from 'react';

interface IdeaIslandIconProps {
  className?: string;
  size?: number;
}

/**
 * 創點島專屬官方立體圖標
 * 包含四色主題島嶼球（薄荷綠、暖黃、粉紅、天藍）與中央深綠摺疊地圖
 */
export const IdeaIslandIcon: React.FC<IdeaIslandIconProps> = ({
  className = '',
  size = 24,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* 4 個主題島嶼柔和色彩球 */}
      {/* 1. 左上：薄荷綠 (痛點/日常) */}
      <circle cx="14" cy="13" r="8.5" fill="#7edbb5" />

      {/* 2. 右上：暖金黃 (主島/創意) */}
      <circle cx="34" cy="18" r="9.5" fill="#f7cb53" />

      {/* 3. 左下：柔粉紅 (徵才/諮詢) */}
      <circle cx="17" cy="32" r="9.5" fill="#f09ca1" />

      {/* 4. 右下：天藍 (討論/交流) */}
      <circle cx="34" cy="33" r="8" fill="#8bc7f8" />

      {/* 中央深綠色摺疊地圖圖示 (具備白底描邊以確保在彩球上清晰可辨) */}
      <g transform="translate(10, 10)">
        {/* 白底厚實襯底 */}
        <path
          d="M3 7L10 3.5L18 7L25 3.5V23L18 26.5L10 23L3 26.5V7Z"
          fill="white"
          fillOpacity="0.9"
        />
        {/* 外輪廓摺線 */}
        <path
          d="M3 7L10 3.5L18 7L25 3.5V23L18 26.5L10 23L3 26.5V7Z"
          stroke="#1c3e34"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 左側內折痕 */}
        <path
          d="M10 3.5V23"
          stroke="#1c3e34"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 右側內折痕 */}
        <path
          d="M18 7V26.5"
          stroke="#1c3e34"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default IdeaIslandIcon;

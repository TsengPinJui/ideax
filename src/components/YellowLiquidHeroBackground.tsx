import React, { useEffect, useRef, useState } from 'react';

interface YellowLiquidHeroBackgroundProps {
  className?: string;
}

export const YellowLiquidHeroBackground: React.FC<YellowLiquidHeroBackgroundProps> = ({
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const targetPos = useRef<{ x: number; y: number }>({ x: 50, y: 35 });
  const currentPos = useRef<{ x: number; y: number }>({ x: 50, y: 35 });
  const [interactiveBlobStyle, setInteractiveBlobStyle] = useState<React.CSSProperties>({
    left: '50%',
    top: '35%',
  });

  // 平滑跟隨滑鼠/觸控的液態水滴物理緩動 (Lerp physics)
  useEffect(() => {
    let animId: number;
    const lerp = () => {
      const dx = targetPos.current.x - currentPos.current.x;
      const dy = targetPos.current.y - currentPos.current.y;
      currentPos.current.x += dx * 0.08;
      currentPos.current.y += dy * 0.08;

      setInteractiveBlobStyle({
        left: `${currentPos.current.x}%`,
        top: `${currentPos.current.y}%`,
      });

      animId = requestAnimationFrame(lerp);
    };

    animId = requestAnimationFrame(lerp);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 監聽滑鼠移動
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        targetPos.current = { x, y };
        setMousePos({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none -z-10 ${className}`}
      aria-hidden="true"
    >
      {/* 1. 溫潤金黃流體基底 (Amber-Yellow Liquid Reservoir Backdrop) */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-100/80 via-yellow-100/60 to-amber-50/40" />

      {/* 2. 深度環境光：流動金黃光環 (Deep Molten Amber Atmosphere) */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[1200px] h-[400px] bg-gradient-to-b from-yellow-300/40 via-amber-400/30 to-transparent blur-3xl rounded-full" />

      {/* 3. 無縫橫向滾動「第一層黃金洋流」(Surface Golden Wave Stream) */}
      <div className="absolute top-0 left-0 w-[200%] h-full opacity-85 animate-liquid-flow-1">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 2880 600"
        >
          <defs>
            <linearGradient id="vibrantGold1" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
              <stop offset="25%" stopColor="#fde047" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <path
            d="M 0,110 Q 360,190 720,110 T 1440,110 Q 1800,190 2160,110 T 2880,110 L 2880,0 L 0,0 Z"
            fill="url(#vibrantGold1)"
          />
        </svg>
      </div>

      {/* 4. 反向流動「第二層深層蜂蜜金波浪」(Mid-Depth Viscous Honey Wave Stream) */}
      <div className="absolute top-0 left-0 w-[200%] h-full opacity-80 animate-liquid-flow-rev">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 2880 600"
        >
          <defs>
            <linearGradient id="vibrantGold2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.65" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.5" />
              <stop offset="85%" stopColor="#fde047" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.65" />
            </linearGradient>
          </defs>
          <path
            d="M 0,210 C 240,150 480,270 720,210 C 960,150 1200,270 1440,210 C 1680,150 1920,270 2160,210 C 2400,150 2640,270 2880,210 L 2880,0 L 0,0 Z"
            fill="url(#vibrantGold2)"
          />
        </svg>
      </div>

      {/* 5. 緩慢深沉「第三層底部金黃湧泉湧浪」(Deep Golden Viscous Undercurrent) */}
      <div className="absolute top-0 left-0 w-[200%] h-full opacity-65 animate-liquid-flow-2">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 2880 600"
        >
          <defs>
            <linearGradient id="vibrantGold3" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.7" />
              <stop offset="40%" stopColor="#fde047" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <path
            d="M 0,320 C 360,370 720,270 1080,330 C 1260,360 1380,310 1440,320 C 1800,370 2160,270 2520,330 C 2700,360 2820,310 2880,320 L 2880,0 L 0,0 Z"
            fill="url(#vibrantGold3)"
          />
        </svg>
      </div>

      {/* 6. 動態熔融有機變形液態核心泡 (Organic High-Contrast Morphing Blobs) */}

      {/* 中央主核：直襯於 IdeaX Logo 與標語正後方，高飽和度流淌 */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[62%] w-[640px] sm:w-[780px] md:w-[920px] h-[360px] sm:h-[440px] md:h-[500px] bg-gradient-to-tr from-amber-400/65 via-yellow-300/80 to-amber-300/70 blur-xl sm:blur-2xl animate-liquid-morph-1 rounded-[42%_58%_70%_30%/45%_45%_55%_55%]"
        style={{ transformOrigin: 'center center' }}
      />

      {/* 左上方流動蜂蜜金旋流 (Left Molten Honey Whirl) */}
      <div
        className="absolute -top-8 left-[3%] sm:left-[8%] w-[360px] sm:w-[480px] h-[340px] sm:h-[460px] bg-gradient-to-br from-yellow-300/70 via-amber-400/60 to-amber-500/50 blur-lg sm:blur-xl animate-liquid-morph-2 rounded-[60%_40%_30%_70%/60%_30%_70%_40%]"
        style={{ animationDelay: '-2.5s' }}
      />

      {/* 右上方澄澈琥珀渦流 (Right Amber Eddy) */}
      <div
        className="absolute top-6 right-[3%] sm:right-[7%] w-[380px] sm:w-[500px] h-[360px] sm:h-[480px] bg-gradient-to-bl from-yellow-200/75 via-amber-400/65 to-yellow-500/55 blur-lg sm:blur-xl animate-liquid-morph-3 rounded-[35%_65%_60%_40%/55%_45%_55%_45%]"
        style={{ animationDelay: '-4.5s' }}
      />

      {/* 7. 滑鼠/觸控互動跟隨液態波紋 (Interactive Viscous Ripple) */}
      <div
        className="absolute w-[260px] sm:w-[380px] h-[260px] sm:h-[380px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-300/70 via-amber-300/85 to-yellow-400/60 blur-xl rounded-full transition-opacity duration-500 ease-out animate-liquid-morph-1 pointer-events-none"
        style={{
          ...interactiveBlobStyle,
          opacity: mousePos ? 0.9 : 0.5,
        }}
      />

      {/* 8. 陽光水波折射粼光掃描 (Sunlit Caustic Sheen Sweep) */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/50 to-transparent -rotate-45 animate-liquid-caustic pointer-events-none" />
      </div>

      {/* 9. 鮮明立體浮動金黃液滴 (Vivid Viscous Amber Dews) */}
      <div
        className="absolute top-[20%] left-[16%] w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.95)] animate-liquid-droplet"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="absolute top-[32%] right-[18%] w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-gradient-to-br from-amber-200 to-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.95)] animate-liquid-droplet"
        style={{ animationDelay: '1.5s' }}
      />
      <div
        className="absolute top-[56%] left-[22%] w-3 sm:w-4 h-3 sm:h-4 rounded-full bg-gradient-to-br from-yellow-100 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.85)] animate-liquid-droplet"
        style={{ animationDelay: '2.8s' }}
      />
      <div
        className="absolute top-[68%] right-[22%] w-4 sm:w-4.5 h-4 sm:h-4.5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 shadow-[0_0_14px_rgba(217,119,6,0.9)] animate-liquid-droplet"
        style={{ animationDelay: '2.1s' }}
      />

      {/* 10. 精緻水面流動微波細紋 (Liquid Surface Ripple Micro-Contours) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-45 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 600"
      >
        <path
          d="M 100,160 Q 400,60 720,150 T 1360,110"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="6 10"
          className="animate-liquid-wave"
        />
        <path
          d="M 60,300 Q 360,220 740,280 T 1420,240"
          fill="none"
          stroke="#eab308"
          strokeWidth="2"
          strokeDasharray="8 14"
          className="animate-liquid-wave-rev"
        />
      </svg>
    </div>
  );
};

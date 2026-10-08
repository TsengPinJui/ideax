import React, { useMemo } from 'react';

export interface ShatterPageTurnTransitionProps {
  isActive: boolean;
  clickedWord: 'painPoint' | 'innovation' | null;
  originX: number;
  originY: number;
}

interface ShardData {
  id: number;
  char?: string;
  isChar: boolean;
  color: string;
  size: number;
  clipPath: string;
  tx: number;
  popY: number;
  dropY: number;
  rotMid: number;
  rotEnd: number;
  duration: number;
  delay: number;
}

export const ShatterPageTurnTransition: React.FC<ShatterPageTurnTransitionProps> = ({
  isActive,
  clickedWord,
  originX,
  originY,
}) => {
  if (!isActive) return null;

  // Generate 42 detailed shards radiating from the clicked location
  const shards: ShardData[] = useMemo(() => {
    const chars = clickedWord === 'painPoint' ? ['痛', '點', '，', '痛', '點'] : ['創', '新', '起', '點', '！', '創', '新'];
    const brushColors =
      clickedWord === 'painPoint'
        ? ['#fda4af', '#fb7185', '#f43f5e', '#fecdd3', '#e11d48']
        : ['#bef264', '#a3e635', '#84cc16', '#d9f99d', '#4ade80'];

    const clipPaths = [
      'polygon(50% 0%, 0% 100%, 100% 100%)',
      'polygon(20% 0%, 90% 15%, 80% 90%, 10% 80%)',
      'polygon(0% 20%, 75% 0%, 100% 70%, 25% 100%)',
      'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      'polygon(10% 10%, 85% 0%, 95% 85%, 0% 100%)',
      'polygon(30% 0%, 100% 30%, 70% 100%, 0% 70%)',
    ];

    const result: ShardData[] = [];
    const count = 42;

    for (let i = 0; i < count; i++) {
      const isChar = i % 3 === 0;
      const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 1.5) * 0.4);
      const spread = 70 + (i % 7) * 35;
      const tx = Math.cos(angle) * spread;
      const popY = -35 - (i % 5) * 22;
      const dropY = 480 + (i % 6) * 75;
      const rotMid = (i * 37) % 360 - 180;
      const rotEnd = (i * 73) % 720 - 360;
      const duration = 0.75 + (i % 4) * 0.08;
      const delay = (i % 5) * 0.02;

      let color = '#09090b';
      if (!isChar) {
        color = i % 6 === 0 ? '#fbbf24' : brushColors[i % brushColors.length];
      }

      result.push({
        id: i,
        char: isChar ? chars[i % chars.length] : undefined,
        isChar,
        color,
        size: isChar ? 28 + (i % 3) * 6 : 14 + (i % 5) * 7,
        clipPath: clipPaths[i % clipPaths.length],
        tx,
        popY,
        dropY,
        rotMid,
        rotEnd,
        duration,
        delay,
      });
    }

    return result;
  }, [clickedWord]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 爆炸掉落的實體碎片群 */}
      {shards.map((s) => {
        const style: React.CSSProperties = {
          left: `${originX}px`,
          top: `${originY}px`,
          width: `${s.size}px`,
          height: `${s.size}px`,
          position: 'absolute',
          backgroundColor: s.isChar ? 'transparent' : s.color,
          clipPath: s.isChar ? undefined : s.clipPath,
          color: '#09090b',
          fontSize: `${s.size}px`,
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: `shard-fall ${s.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
          animationDelay: `${s.delay}s`,
          // Custom CSS variables for shard trajectory
          ['--tx' as any]: `${s.tx}px`,
          ['--pop-y' as any]: `${s.popY}px`,
          ['--drop-y' as any]: `${s.dropY}px`,
          ['--rot-mid' as any]: `${s.rotMid}deg`,
          ['--rot-end' as any]: `${s.rotEnd}deg`,
        };

        return (
          <div key={s.id} style={style}>
            {s.isChar ? (
              <span className="leading-none select-none drop-shadow-xs font-black">
                {s.char}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};


import React, { useEffect, useMemo, useRef } from 'react';
import type { MindMapData } from '../../types';
import { BRANCH_COLORS, layoutMindMap } from './mindMapUtils';

/** 心智圖顯示（SVG）：中心主題在中間，分支左右展開；太寬時可以左右捲動 */
export const MindMapView: React.FC<{ data: MindMapData; maxHeight?: number; className?: string }> = ({ data, maxHeight = 520, className = '' }) => {
  const lay = useMemo(() => layoutMindMap(data), [data]);
  const pad = 16;
  const W = lay.maxX - lay.minX + pad * 2, H = lay.maxY - lay.minY + pad * 2;
  const ox = -lay.minX + pad, oy = -lay.minY + pad;
  const byId = new Map(lay.nodes.map((l) => [l.node.id, l]));
  // 比畫面寬時（手機），一開始把中心主題捲到正中間，左右分支都看得到一部分
  const boxRef = useRef<HTMLDivElement>(null);
  const centerX = ox; // 中心主題的 x（排版以 0 為中心）
  useEffect(() => {
    const el = boxRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = Math.max(0, centerX - el.clientWidth / 2);
  }, [centerX, W]);

  return (
    <div ref={boxRef} className={`overflow-auto rounded-xl bg-gradient-to-br from-stone-50 to-amber-50/40 border border-stone-200 ${className}`} style={{ maxHeight }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block mx-auto" role="img" aria-label={`心智圖：${data.root.text}`}>
        {/* 連線 */}
        {lay.nodes.filter((l) => l.parentId).map((l) => {
          const p = byId.get(l.parentId!)!;
          const color = BRANCH_COLORS[l.branch % BRANCH_COLORS.length];
          const x1 = ox + (l.side === 1 ? p.x + p.w : p.x), y1 = oy + p.y + p.h / 2;
          const x2 = ox + (l.side === 1 ? l.x : l.x + l.w), y2 = oy + l.y + l.h / 2;
          const mx = (x1 + x2) / 2;
          return <path key={`e-${l.node.id}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={color} strokeWidth={l.depth === 1 ? 2.6 : 1.8} strokeOpacity={0.75} strokeLinecap="round" />;
        })}
        {/* 節點 */}
        {lay.nodes.map((l) => {
          const color = l.depth === 0 ? '#f59e0b' : BRANCH_COLORS[l.branch % BRANCH_COLORS.length];
          const fill = l.depth === 0 ? '#fbbf24' : l.depth === 1 ? '#ffffff' : '#fafaf9';
          return (
            <foreignObject key={l.node.id} x={ox + l.x} y={oy + l.y} width={l.w} height={l.h}>
              <div
                style={{
                  width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  borderRadius: l.depth === 0 ? 14 : 10, background: fill, border: `${l.depth <= 1 ? 2 : 1.5}px solid ${color}`,
                  color: l.depth === 0 ? '#1c1917' : '#292524', fontWeight: l.depth <= 1 ? 800 : 600,
                  fontSize: l.depth === 0 ? 15 : l.depth === 1 ? 13 : 12, lineHeight: 1.25, padding: '2px 8px', wordBreak: 'break-word',
                  boxShadow: l.depth === 0 ? '0 4px 14px rgba(245,158,11,.35)' : '0 1px 3px rgba(0,0,0,.06)',
                }}
              >
                {l.node.text}
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
};

export default MindMapView;

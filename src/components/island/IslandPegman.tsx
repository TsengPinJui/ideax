import React, { useEffect, useRef, useState } from 'react';
import { enterRoamAtMapPoint } from '../kingdom3d/roamEntry';

/**
 * 像 Google 地圖的街景小人：按住拖到 3D 地圖上任何地方放開，就進入「實境漫遊」的對應位置
 * （拖到水上會到最近的水邊）
 */
export const IslandPegman: React.FC = () => {
  const [drag, setDrag] = useState<null | { x: number; y: number }>(null);
  const dragRef = useRef(false);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      setDrag({ x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = false;
      setDrag(null);
      const pick = (window as any).__ideaxIslandPick as ((x: number, y: number) => { x: number; z: number } | null) | undefined;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      // 放在面板、按鈕上不算
      if (el && el.closest('.island-ui-interactive, .island-right-atlas, button')) return;
      const p = pick?.(e.clientX, e.clientY);
      if (p) enterRoamAtMapPoint(p.x, p.z);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag]);

  const figure = (size: number) => (
    <svg width={size} height={size * 1.35} viewBox="0 0 40 54" aria-hidden="true">
      <circle cx="20" cy="9" r="7.5" fill="#f2c94c" stroke="#5a2a14" strokeWidth="2" />
      <path d="M8 26 Q20 15 32 26 L30 38 L25 38 L24 52 L16 52 L15 38 L10 38 Z" fill="#b3261e" stroke="#5a2a14" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 6 Q20 -2 29 6 L27 8 Q20 3 13 8 Z" fill="#3a2414" />
    </svg>
  );

  return (
    <>
      <button
        type="button"
        className="island-pegman island-ui-interactive"
        title="把小人拖到地圖上任何地方，就能在那裡進入實境漫遊"
        aria-label="拖曳小人進入實境漫遊"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragRef.current = true;
          setDrag({ x: e.clientX, y: e.clientY });
        }}
        style={{ touchAction: 'none' }}
      >
        {figure(22)}
        <span>拖我去漫遊</span>
      </button>
      {drag && (
        <div className="island-pegman-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {figure(34)}
          <span className="island-pegman-shadow" />
        </div>
      )}
    </>
  );
};

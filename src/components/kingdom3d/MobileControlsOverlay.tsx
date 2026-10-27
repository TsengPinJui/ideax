import React, { useRef, useState, useEffect } from 'react';
import { BuildingInteractable, Portal, RegionId } from './types';
import {
  REGION_CONFIGS,
  ALL_REGION_IDS,
  WORLD_BRIDGES,
} from './regionConfigs';
import {
  Compass,
  Settings,
  Activity,
  LogOut,
  Hand,
  Sparkles,
  Zap,
} from 'lucide-react';

interface MobileControlsOverlayProps {
  activeRegionId: RegionId;
  playerPos: { x: number; y: number; z: number };
  yawRad: number;
  nearBuilding: BuildingInteractable | null;
  nearPortal: Portal | null;
  onSelectRegion: (regionId: RegionId) => void;
  onInteract: () => void;
  onOpenSettings: () => void;
  onToggleDevStats: () => void;
  onExit: () => void;
  onJoystickMove: (vecX: number, vecY: number) => void;
  onJoystickEnd: () => void;
  onTouchLookDelta: (dx: number, dy: number) => void;
  isDesktopPointerLocked: boolean;
  onDesktopRequestLock: () => void;
  isFastWalk: boolean;
  onToggleFastWalk: () => void;
  timeOfDay?: 'day' | 'dusk' | 'night';
  onCycleTimeOfDay?: () => void;
}

export const MobileControlsOverlay: React.FC<MobileControlsOverlayProps> = ({
  activeRegionId,
  playerPos,
  yawRad,
  nearBuilding,
  nearPortal,
  onSelectRegion,
  onInteract,
  onOpenSettings,
  onToggleDevStats,
  onExit,
  onJoystickMove,
  onJoystickEnd,
  onTouchLookDelta,
  isDesktopPointerLocked,
  onDesktopRequestLock,
  isFastWalk,
  onToggleFastWalk,
  timeOfDay,
  onCycleTimeOfDay,
}) => {
  // Mobile Virtual Joystick State
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const stickOriginRef = useRef({ x: 0, y: 0 });
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickMouseActiveRef = useRef(false);
  const joystickRingRef = useRef<HTMLDivElement | null>(null);

  // Mobile Touch Look State
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef({ x: 0, y: 0 });

  const maxRadius = 45;

  const updateStickFromClientXY = (clientX: number, clientY: number) => {
    const dx = clientX - stickOriginRef.current.x;
    const dy = clientY - stickOriginRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, maxRadius);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setStickPos({ x: clampedX, y: clampedY });

    const normX = clampedX / maxRadius;
    const normY = clampedY / maxRadius;
    onJoystickMove(normX, normY);
  };

  // Touch Handlers for Virtual Joystick (Left zone)
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchIdRef.current !== null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      joystickTouchIdRef.current = t.identifier;
      if (joystickRingRef.current) {
        const rect = joystickRingRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distToRing = Math.hypot(t.clientX - centerX, t.clientY - centerY);
        if (distToRing <= rect.width * 0.75) {
          stickOriginRef.current = { x: centerX, y: centerY };
          setJoystickActive(true);
          updateStickFromClientXY(t.clientX, t.clientY);
          break;
        }
      }
      stickOriginRef.current = { x: t.clientX, y: t.clientY };
      setStickPos({ x: 0, y: 0 });
      setJoystickActive(true);
      break;
    }
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joystickTouchIdRef.current) {
        updateStickFromClientXY(t.clientX, t.clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (joystickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setStickPos({ x: 0, y: 0 });
        onJoystickEnd();
        break;
      }
    }
  };

  // Mouse support on the visual joystick ring for desktop testing
  const handleJoystickMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    joystickMouseActiveRef.current = true;
    if (joystickRingRef.current) {
      const rect = joystickRingRef.current.getBoundingClientRect();
      stickOriginRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    } else {
      stickOriginRef.current = { x: e.clientX, y: e.clientY };
    }
    setJoystickActive(true);
    updateStickFromClientXY(e.clientX, e.clientY);
  };

  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (!joystickMouseActiveRef.current) return;
      updateStickFromClientXY(e.clientX, e.clientY);
    };
    const onWindowMouseUp = () => {
      if (!joystickMouseActiveRef.current) return;
      joystickMouseActiveRef.current = false;
      setJoystickActive(false);
      setStickPos({ x: 0, y: 0 });
      onJoystickEnd();
    };
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, []);

  // Touch Handlers for View Look (Right zone)
  const handleLookTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current !== null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      lookTouchIdRef.current = t.identifier;
      lookLastPosRef.current = { x: t.clientX, y: t.clientY };
      break;
    }
  };

  const handleLookTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchIdRef.current) {
        const dx = t.clientX - lookLastPosRef.current.x;
        const dy = t.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: t.clientX, y: t.clientY };
        onTouchLookDelta(dx, dy);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  };

  // Convert world (x, z) in [-115..115, -90..90] to SVG minimap (0..180, 0..140)
  const toMapX = (wx: number) => 90 + (wx / 118) * 82;
  const toMapY = (wz: number) => 70 + (wz / 92) * 62;
  const playerMapX = toMapX(playerPos.x);
  const playerMapY = toMapY(playerPos.z);
  const lookDirX = -Math.sin(yawRad);
  const lookDirZ = -Math.cos(yawRad);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-2.5 sm:p-4 font-sans overflow-hidden">
      {/* Top Bar: Title + 5-Island Quick Teleport + Action Buttons */}
      <div className="flex flex-wrap items-center justify-between w-full pointer-events-auto gap-2">
        {/* Left: Branding */}
        <div className="flex items-center gap-2 bg-stone-900/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-amber-500/30 text-amber-100 shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-black text-amber-200 tracking-wider">
            創點源
          </span>
        </div>

        {/* Center: 5-Island Direct Jump Bar */}
        <div className="flex items-center gap-1 bg-stone-900/85 backdrop-blur-md p-1 rounded-2xl border border-stone-700/70 shadow-md overflow-x-auto max-w-full">
          {ALL_REGION_IDS.map((rid) => {
            const r = REGION_CONFIGS[rid];
            const isActive = activeRegionId === rid;
            return (
              <button
                key={rid}
                type="button"
                onClick={() => onSelectRegion(rid)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-400 text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-amber-200'
                }`}
                title={`前往 ${r.name}（${r.subtitle}）`}
              >
                {r.name}
              </button>
            );
          })}
        </div>

        {/* Right: Controls Bar */}
        <div className="flex items-center gap-1.5">
          {/* 晝夜切換：白天 → 黃昏 → 夜晚 */}
          {onCycleTimeOfDay && (
            <button
              type="button"
              onClick={onCycleTimeOfDay}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 bg-stone-900/85 hover:bg-stone-800 text-amber-200 border-stone-700/60"
              title="切換時段（白天／黃昏／夜晚）"
            >
              <span aria-hidden="true">{timeOfDay === 'night' ? '🌙' : timeOfDay === 'day' ? '☀️' : '🌇'}</span>
              <span className="hidden sm:inline">{timeOfDay === 'night' ? '夜晚' : timeOfDay === 'day' ? '白天' : '黃昏'}</span>
            </button>
          )}
          {/* Speed Toggle Button */}
          <button
            type="button"
            onClick={onToggleFastWalk}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
              isFastWalk
                ? 'bg-amber-500 text-stone-950 border-amber-300'
                : 'bg-stone-900/85 hover:bg-stone-800 text-stone-300 border-stone-700/60'
            }`}
            title="切換移動速度（或按住 Shift 加速）"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isFastWalk ? '疾走中' : '常速'}</span>
          </button>

          {/* Dev Stats Toggle */}
          <button
            type="button"
            onClick={onToggleDevStats}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-stone-900/85 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="開啟/關閉 效能與碰撞監控面板"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">效能/碰撞</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-stone-900/85 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="空間說明與設定"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">說明</span>
          </button>

          {/* Exit Button */}
          <button
            type="button"
            onClick={onExit}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-950/85 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="退出 3D 探索回到 IdeaX 網站"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">退出</span>
          </button>
        </div>
      </div>

      {/* Top-Right Live 2D Spatial Radar Mini-Map (五島、四橋、圍牆、建築與玩家即時位置) */}
      <div className="self-end pointer-events-auto mt-1 bg-stone-950/85 backdrop-blur-md border border-stone-700/80 rounded-2xl p-2 shadow-xl">
        <div className="flex items-center justify-between text-[10px] text-stone-300 font-bold mb-1 px-1">
          <span>五島空間雷達 (點島可跳轉)</span>
          <span className="text-amber-300 font-mono">
            ({playerPos.x.toFixed(0)}, {playerPos.z.toFixed(0)})
          </span>
        </div>
        <svg
          width={180}
          height={136}
          viewBox="0 0 180 140"
          className="rounded-xl bg-sky-950/60 border border-stone-800 block"
        >
          {/* 4 Bridges connecting 主島 to the 4 outer islands */}
          {WORLD_BRIDGES.map((b) => (
            <line
              key={b.id}
              x1={toMapX(b.x1)}
              y1={toMapY(b.z1)}
              x2={toMapX(b.x2)}
              y2={toMapY(b.z2)}
              stroke="#cbd5e1"
              strokeWidth={4.5}
              strokeLinecap="round"
            />
          ))}

          {/* 5 Islands */}
          {ALL_REGION_IDS.map((rid) => {
            const r = REGION_CONFIGS[rid];
            const cx = toMapX(r.center[0]);
            const cy = toMapY(r.center[1]);
            const rx = (r.islandRadiusX / 118) * 82;
            const ry = (r.islandRadiusZ / 92) * 62;
            const isAct = activeRegionId === rid;
            return (
              <g
                key={rid}
                onClick={() => onSelectRegion(rid)}
                className="cursor-pointer"
              >
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={rx}
                  ry={ry}
                  fill={isAct ? '#44403c' : '#292524'}
                  stroke={isAct ? '#fbbf24' : '#78716c'}
                  strokeWidth={isAct ? 1.5 : 1}
                />
                {/* Career Island Courtyard Wall outline */}
                {rid === 'region-career' && (
                  <rect
                    x={toMapX(48)}
                    y={toMapY(28)}
                    width={toMapX(96) - toMapX(48)}
                    height={toMapY(68) - toMapY(28)}
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth={1.2}
                    strokeDasharray="3 1.5"
                  />
                )}
                {/* Buildings on Island */}
                {r.buildings.map((b) => (
                  <rect
                    key={b.id}
                    x={toMapX(b.position.x) - 3.5}
                    y={toMapY(b.position.z) - 2.8}
                    width={7}
                    height={5.6}
                    rx={1}
                    fill="#fef3c7"
                    stroke="#f59e0b"
                    strokeWidth={0.8}
                  />
                ))}
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  fill="#fde68a"
                  fontSize="8.5"
                  fontWeight="bold"
                >
                  {r.shortName}
                </text>
              </g>
            );
          })}

          {/* Player View Cone & Position Dot */}
          <line
            x1={playerMapX}
            y1={playerMapY}
            x2={playerMapX + lookDirX * 12}
            y2={playerMapY + lookDirZ * 12}
            stroke="#34d399"
            strokeWidth={2}
          />
          <circle
            cx={playerMapX}
            cy={playerMapY}
            r={3.5}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth={1.2}
          />
        </svg>
      </div>

      {/* Center Screen Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-4 h-4 flex items-center justify-center opacity-70">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm shadow-amber-500/50" />
          <div className="absolute w-4 h-[1px] bg-amber-200/40" />
          <div className="absolute h-4 w-[1px] bg-amber-200/40" />
        </div>
      </div>

      {/* Proximity Interaction Prompt Banner (Inside or near building) */}
      {(nearBuilding || nearPortal) && (
        <div className="self-center pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
          {nearBuilding && (
            <button
              type="button"
              onClick={onInteract}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm shadow-2xl border border-amber-200 cursor-pointer active:scale-95 transition-all"
            >
              <Hand className="w-5 h-5 text-stone-950 animate-bounce" />
              <span>
                按 <kbd className="px-2 py-0.5 rounded-md bg-stone-950 text-amber-300 text-xs font-mono">E</kbd> 互動：{nearBuilding.name}
              </span>
              <span className="text-xs font-bold text-stone-800">
                （點擊查看功能）
              </span>
            </button>
          )}

          {nearPortal && !nearBuilding && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-sky-950/85 backdrop-blur-md border border-sky-400/60 text-sky-200 text-xs font-bold shadow-lg">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>{nearPortal.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Controls: Virtual Joystick (Left) and Look Area (Right) */}
      <div className="relative w-full h-40 sm:h-48 flex justify-between items-end pointer-events-auto">
        {/* Left 45% Virtual Joystick Zone */}
        <div
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
          className="relative w-[45%] h-full touch-none flex items-end justify-start pb-2 pl-2 sm:pb-4 sm:pl-4"
        >
          {/* Base Guide Ring */}
          <div
            ref={joystickRingRef}
            onMouseDown={handleJoystickMouseDown}
            className="relative w-28 h-28 rounded-full border-2 border-stone-400/40 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center cursor-pointer shadow-inner"
          >
            {/* Directional Indicators */}
            <span className="absolute top-1.5 text-[9px] text-stone-400 font-bold">▲前</span>
            <span className="absolute bottom-1.5 text-[9px] text-stone-400 font-bold">▼後</span>
            <span className="absolute left-2 text-[9px] text-stone-400 font-bold">◀</span>
            <span className="absolute right-2 text-[9px] text-stone-400 font-bold">▶</span>

            {/* Center Thumb Knob */}
            <div
              className={`w-12 h-12 rounded-full shadow-lg transition-transform duration-75 flex items-center justify-center text-[10px] font-black ${
                joystickActive
                  ? 'bg-amber-400 text-stone-950 scale-105'
                  : 'bg-stone-700/80 text-stone-200 border border-stone-500/50'
              }`}
              style={{
                transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
              }}
            >
              移動
            </div>
          </div>
        </div>

        {/* Right 55% Touch Look Area */}
        <div
          onTouchStart={handleLookTouchStart}
          onTouchMove={handleLookTouchMove}
          onTouchEnd={handleLookTouchEnd}
          onTouchCancel={handleLookTouchEnd}
          className="relative w-[55%] h-full touch-none flex flex-col items-end justify-end pb-2 pr-2 sm:pb-4 sm:pr-4 gap-2.5"
        >
          {/* Desktop / Mobile Quick Lock or Drag Hint */}
          {!isDesktopPointerLocked && (
            <button
              type="button"
              onClick={onDesktopRequestLock}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-amber-500/30 text-[11px] font-bold text-amber-200 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>點擊鎖定滑鼠視角（或直接按住畫面拖曳環顧）</span>
            </button>
          )}

          {/* Swipe Hint */}
          <div className="text-[10px] text-stone-300/80 bg-stone-950/60 px-3 py-1 rounded-full border border-stone-800">
            WASD 移動・Shift 加速・滑動或拖曳畫面轉動視角
          </div>
        </div>
      </div>
    </div>
  );
};

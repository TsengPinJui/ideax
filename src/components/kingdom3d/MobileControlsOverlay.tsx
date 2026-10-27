import React, { useRef, useState, useEffect } from 'react';
import { BuildingInteractable, Portal, RegionId } from './types';
import {
  REGION_CONFIGS,
  ALL_REGION_IDS,
  detectPlayerSpatialContext,
} from './regionConfigs';
import { Menu, Map as MapIcon, Settings, Activity, LogOut, Hand, Sparkles, X, Sun, Moon, Footprints } from 'lucide-react';
import { CompassMinimap, WorldMapModal } from './KingdomMaps';
import './kingdomUi.css';

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
  isFancy?: boolean;
  onToggleFancy?: () => void;
  /** 例如在創點樓二樓時顯示「創點樓・二樓・創業與專業」 */
  placeOverride?: string;
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
  isFancy,
  onToggleFancy,
  placeOverride,
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

  const [menuOpen, setMenuOpen] = useState(false);
  // 按住 Shift 疾走時，右下腳印按鈕同步亮起
  const [shiftHeld, setShiftHeld] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    const blur = () => setShiftHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
  const [mapOpen, setMapOpen] = useState(false);
  const region = REGION_CONFIGS[activeRegionId];
  const spaceLabel = React.useMemo(
    () => detectPlayerSpatialContext(playerPos.x, playerPos.z).spaceLabel,
    // 位置變化 0.5 公尺以上才重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.round(playerPos.x * 2), Math.round(playerPos.z * 2)]
  );
  const duskIcon = (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M6 16a6 6 0 0 1 12 0" />
      <path d="M3 16h18M5 20h14M12 4v3M4.9 8.9l2 2M19.1 8.9l-2 2" />
    </svg>
  );
  const todIcon = timeOfDay === 'night' ? <Moon className="w-5 h-5" /> : timeOfDay === 'day' ? <Sun className="w-5 h-5" /> : duskIcon;
  const todLabel = timeOfDay === 'night' ? '夜晚' : timeOfDay === 'day' ? '白天' : '黃昏';
  const closeMenu = () => setMenuOpen(false);
  const inner = (spaceLabel.match(/（(.*)）/) || [])[1] || '';
  const placeText = placeOverride
    ? placeOverride
    : spaceLabel.startsWith('橋上')
    ? `石拱橋・${inner}`
    : spaceLabel.startsWith('主要建築物內')
    ? `${inner}・室內`
    : spaceLabel.startsWith('廣場內')
    ? inner
    : spaceLabel.startsWith('徵才島的圍牆內')
    ? '月洞門庭院'
    : region?.subtitle || '';

  return (
    <div className="kx-root absolute inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* 左上：地點牌匾（點開選單） */}
      <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 pointer-events-auto max-w-[62vw] sm:max-w-sm">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="kx-panel kx-corners flex items-center gap-2.5 pl-3 pr-4 py-2 text-left cursor-pointer"
          aria-expanded={menuOpen}
          aria-label="開啟選單"
        >
          <Menu className="w-5 h-5 shrink-0 text-amber-200" />
          <span className="min-w-0">
            <span className="kx-title block text-[15px] sm:text-lg leading-tight truncate">{region?.name || '創點源'}</span>
            <span className="kx-sub block text-[11.5px] sm:text-[12.5px] leading-snug truncate">{placeText}</span>
          </span>
        </button>

        {menuOpen && (
          <div className="kx-panel mt-2 p-2 w-[min(78vw,300px)] animate-in fade-in slide-in-from-top-1 duration-150">
            <p className="kx-sub text-[11.5px] px-3 pt-1 pb-1">前往島嶼</p>
            {ALL_REGION_IDS.map((rid) => {
              const r = REGION_CONFIGS[rid];
              return (
                <button
                  key={rid}
                  type="button"
                  className="kx-menu-item"
                  aria-current={rid === activeRegionId}
                  onClick={() => {
                    onSelectRegion(rid);
                    closeMenu();
                  }}
                >
                  <span className="kx-title text-[15px] w-14 shrink-0">{r.name}</span>
                  <span className="kx-sub text-[12px] truncate">{r.subtitle}</span>
                </button>
              );
            })}
            <div className="kx-divider" />
            <button type="button" className="kx-menu-item" onClick={() => { setMapOpen(true); closeMenu(); }}>
              <MapIcon className="w-4 h-4 text-amber-200" /> 全島地圖
            </button>
            {onCycleTimeOfDay && (
              <button type="button" className="kx-menu-item" onClick={onCycleTimeOfDay}>
                <span className="text-amber-200 [&>svg]:w-4 [&>svg]:h-4">{todIcon}</span> 時段：{todLabel}
              </button>
            )}
            <button type="button" className="kx-menu-item" onClick={onToggleFastWalk}>
              <Footprints className="w-4 h-4 text-amber-200" /> {isFastWalk ? '疾走中（點一下恢復常速）' : '常速（點一下改疾走）'}
            </button>
            {onToggleFancy && (
              <button type="button" className="kx-menu-item" onClick={onToggleFancy}>
                <Sparkles className="w-4 h-4 text-amber-200" /> 畫質：{isFancy ? '精緻（陰影、泛光）' : '流暢'}
              </button>
            )}
            <button type="button" className="kx-menu-item" onClick={() => { onOpenSettings(); closeMenu(); }}>
              <Settings className="w-4 h-4 text-amber-200" /> 操作說明
            </button>
            <button type="button" className="kx-menu-item" onClick={() => { onToggleDevStats(); closeMenu(); }}>
              <Activity className="w-4 h-4 text-amber-200" /> 效能與碰撞面板
            </button>
            <div className="kx-divider" />
            <button type="button" className="kx-menu-item" onClick={onExit}>
              <LogOut className="w-4 h-4 text-rose-300" /> <span className="text-rose-200">離開，回到網站</span>
            </button>
          </div>
        )}
      </div>

      {/* 右上：羅盤小地圖＋離開 */}
      <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 flex items-start gap-2 pointer-events-auto">
        <button type="button" onClick={onExit} className="kx-round w-9 h-9" title="離開 3D，回到網站" aria-label="離開">
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center gap-1">
          <CompassMinimap
            playerPos={{ x: playerPos.x, z: playerPos.z }}
            yawRad={yawRad}
            activeRegionId={activeRegionId}
            size={typeof window !== 'undefined' && window.innerWidth < 640 ? 104 : 132}
            onOpen={() => setMapOpen(true)}
          />
        </div>
      </div>

      {/* 準星 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-100/80 shadow-[0_0_6px_rgba(255,210,120,0.8)]" />
      </div>

      {/* 靠近建築：牌匾式互動提示 */}
      {(nearBuilding || nearPortal) && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-44 sm:bottom-52 pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
          {nearBuilding && (
            <button type="button" onClick={onInteract} className="kx-panel kx-corners flex items-center gap-3 px-5 py-2.5 cursor-pointer active:scale-95 transition-transform">
              <Hand className="w-5 h-5 text-amber-200 shrink-0" />
              <span className="kx-title text-[16px] sm:text-lg whitespace-nowrap">{nearBuilding.name}</span>
              <span className="kx-sub text-[12px] whitespace-nowrap">
                <span className="hidden md:inline">按 <kbd className="px-1.5 py-0.5 mx-0.5 rounded bg-black/40 border border-amber-300/40 text-amber-200 text-[11px]">E</kbd> 或</span>點一下進入
              </span>
            </button>
          )}
          {nearPortal && !nearBuilding && (
            <div className="kx-panel flex items-center gap-2 px-4 py-2 text-[13px]">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{nearPortal.name}</span>
            </div>
          )}
        </div>
      )}

      {/* 底部：左邊搖桿、右邊視角區與圓形按鈕 */}
      <div className="absolute inset-x-0 bottom-0 h-40 sm:h-48 flex justify-between items-end pointer-events-auto">
        <div
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
          className="relative w-[45%] h-full touch-none flex items-end justify-start pb-4 pl-4 sm:pb-6 sm:pl-6"
        >
          <div
            ref={joystickRingRef}
            onMouseDown={handleJoystickMouseDown}
            className="kx-joy-ring relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center cursor-pointer"
          >
            {[0, 90, 180, 270].map((deg) => (
              <span
                key={deg}
                className="absolute w-0 h-0 border-x-[5px] border-x-transparent border-b-[7px] border-b-amber-50/70"
                style={{ transform: `rotate(${deg}deg) translateY(-46px)` }}
              />
            ))}
            <div
              className={`kx-joy-knob w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-transform duration-75 ${joystickActive ? 'scale-105' : ''}`}
              style={{ transform: `translate(${stickPos.x}px, ${stickPos.y}px)` }}
            />
          </div>
        </div>

        <div
          onTouchStart={handleLookTouchStart}
          onTouchMove={handleLookTouchMove}
          onTouchEnd={handleLookTouchEnd}
          onTouchCancel={handleLookTouchEnd}
          className="relative w-[55%] h-full touch-none flex items-end justify-end pb-4 pr-4 sm:pb-6 sm:pr-6"
        >
          <div className="flex items-end gap-2.5 sm:gap-3">
            <div className="flex flex-col gap-2.5 sm:gap-3">
              {onCycleTimeOfDay && (
                <button type="button" onClick={onCycleTimeOfDay} className="kx-round w-11 h-11 sm:w-12 sm:h-12" title={`時段：${todLabel}（點一下切換）`} aria-label={`時段：${todLabel}`}>
                  {todIcon}
                </button>
              )}
              <button type="button" onClick={() => setMapOpen(true)} className="kx-round w-11 h-11 sm:w-12 sm:h-12" title="全島地圖" aria-label="全島地圖">
                <MapIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onToggleFastWalk}
                data-on={isFastWalk || shiftHeld}
                className="kx-round w-12 h-12 sm:w-14 sm:h-14"
                title={isFastWalk ? '疾走中（點一下恢復常速，或按住 Shift）' : '疾走（或按住 Shift）'}
                aria-label="疾走"
              >
                <Footprints className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={onInteract}
                disabled={!nearBuilding}
                className={`kx-round w-14 h-14 sm:w-16 sm:h-16 ${nearBuilding ? 'kx-action' : 'opacity-50'}`}
                title={nearBuilding ? `進入：${nearBuilding.name}` : '靠近建築後可互動'}
                aria-label="互動"
              >
                <Hand className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 電腦版提示 */}
      {!isDesktopPointerLocked && (
        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-5 pointer-events-auto">
          <button type="button" onClick={onDesktopRequestLock} className="kx-panel px-4 py-1.5 text-[12.5px] cursor-pointer whitespace-nowrap">
            點畫面鎖定視角・WASD 移動・Shift 疾走・E 互動
          </button>
        </div>
      )}

      <WorldMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        activeRegionId={activeRegionId}
        playerPos={{ x: playerPos.x, z: playerPos.z }}
        yawRad={yawRad}
        onSelectRegion={onSelectRegion}
      />
    </div>
  );
};

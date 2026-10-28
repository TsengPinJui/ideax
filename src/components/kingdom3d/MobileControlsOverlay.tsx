import React, { useRef, useState, useEffect } from 'react';
import { BuildingInteractable, Portal, RegionId } from './types';
import {
  REGION_CONFIGS,
  ALL_REGION_IDS,
  detectPlayerSpatialContext,
} from './regionConfigs';
import {
  Menu,
  Map as MapIcon,
  Settings,
  Activity,
  LogOut,
  Hand,
  Sparkles,
  X,
  Sun,
  Moon,
  Footprints,
  Volume2,
  VolumeX,
  Users,
  Share2,
  Check,
  Smartphone,
  Download,
  Copy,
  Lightbulb,
  Armchair,
} from 'lucide-react';
import { CompassMinimap, WorldMapModal } from './KingdomMaps';
import {
  triggerDirectAppDownloadOrInstall,
  downloadAppLauncherFile,
} from '../../services/pwaInstaller';
import './kingdomUi.css';
import { EnvControls, TimeMode, WeatherMode } from './EnvControls';

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
  onSwitchToIslandMap?: () => void;
  onJoystickMove: (vecX: number, vecY: number) => void;
  onJoystickEnd: () => void;
  onTouchLookDelta: (dx: number, dy: number) => void;
  isFastWalk: boolean;
  isOnBoat?: boolean;
  landRideMode?: 'buffalo' | 'horseCart' | 'horse' | 'egret' | null;
  onToggleFastWalk: () => void;
  /** 小燈泡照明（按 F 或點按鍵呼喚，拿在手上照亮四周） */
  bulbOn?: boolean;
  onToggleBulb?: () => void;
  /** 坐下（C） */
  sitting?: boolean;
  onToggleSit?: () => void;
  /** 在暗處時顯示「覺得暗？點擊【照明(F)】…」提示 */
  darkHint?: boolean;
  timeOfDay?: 'day' | 'dusk' | 'night';
  onCycleTimeOfDay?: () => void;
  isFancy?: boolean;
  onToggleFancy?: () => void;
  /** 例如在創點樓二樓時顯示「創點樓・二樓・創業與專業」 */
  placeOverride?: string;
  /** 點一下畫面（沒有拖曳）：回傳 true 表示點到了可互動的東西 */
  onTapScreen?: (clientX: number, clientY: number) => boolean;
  /** 數字變動時打開全島地圖（左側面板的「打開全島地圖」） */
  openMapSignal?: number;
  bgmMuted?: boolean;
  onToggleBgm?: () => void;
  multiplayer?: { status: 'off' | 'guest' | 'connecting' | 'online' | 'error'; others: number };
  bondedPartner?: { name: string; x: number; z: number } | null;
  /** 全島地圖：點任一處前往最近可以去的地方 */
  onGoToPoint?: (x: number, z: number) => void;
  /** 小地圖下方的時間與天氣（選時段、天氣或自動） */
  /** 小地圖下方再多放的小鍵（例如彩蛋收集冊） */
  extraControls?: React.ReactNode;
  env?: {
    timeMode: TimeMode;
    weatherMode: WeatherMode;
    weather: 'clear' | 'rain';
    onTimeMode: (m: TimeMode) => void;
    onWeatherMode: (m: WeatherMode) => void;
    autoHint?: string;
  };
}

function getBuildingFeatureLabel(b: BuildingInteractable): string {
  switch (b.id) {
    case 'home-explore':
      return '探索看板（看全站最新內容）';
    case 'home-map':
      return '島覽地圖（全島導覽與瞬移）';
    case 'home-agents':
      return 'AI 角色介紹與身分證';
    case 'home-trade-street':
      return '貿易街介紹';
    case 'pain-innovation-tower':
      return b.name.includes('・') ? `${b.name}懸賞牆` : '創點樓（懸賞牆／刊登痛點）';
    case 'discussion-library':
      return b.name.includes('・') ? b.name : '藏書閣（交流討論／地下圖書館）';
    case 'discussion-workshop':
      return '大熊匠鋪（百工坊・技術討論）';
    case 'discussion-street':
      return '茶藝街（主題討論）';
    case 'creative-exhibition':
      return '展覽館（作品與提案展）';
    case 'creative-arcade':
      return '電玩城（遊戲與作品展）';
    case 'career-academy':
      return '翰林院（找領域專家）';
    case 'career-temple':
      return '求職廟（找職缺／問搜搜）';
    case 'hanlin-headhunter':
      return '人才獵頭與專家媒合';
    default:
      return b.mockData?.primaryActionLabel || b.name;
  }
}

function detectStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const matchStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const matchFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const navStandalone = (window.navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    const isSourcePwa =
      window.location.search.includes('source=pwa') ||
      window.location.search.includes('source=app');
    return Boolean(matchStandalone || matchFullscreen || navStandalone || isAndroidApp || isSourcePwa);
  } catch {
    return false;
  }
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
  onSwitchToIslandMap,
  onJoystickMove,
  onJoystickEnd,
  onTouchLookDelta,
  isFastWalk,
  isOnBoat = false,
  landRideMode = null,
  onToggleFastWalk,
  bulbOn,
  onToggleBulb,
  sitting,
  onToggleSit,
  darkHint,
  timeOfDay,
  onCycleTimeOfDay,
  isFancy,
  onToggleFancy,
  placeOverride,
  onTapScreen,
  openMapSignal,
  bgmMuted,
  onToggleBgm,
  env,
  extraControls,
  onGoToPoint,
  multiplayer,
  bondedPartner,
}) => {
  // 視窗尺寸與直橫式偵測（確保手機直式、橫式按鍵都不跑出畫面）
  const [viewport, setViewport] = useState(() => ({
    vw: typeof window !== 'undefined' ? window.innerWidth : 1024,
    vh: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    const updateVp = () => {
      setViewport({
        vw: window.innerWidth,
        vh: window.innerHeight,
      });
    };
    window.addEventListener('resize', updateVp);
    window.addEventListener('orientationchange', updateVp);
    return () => {
      window.removeEventListener('resize', updateVp);
      window.removeEventListener('orientationchange', updateVp);
    };
  }, []);

  const isSmallScreen = viewport.vw < 640 || viewport.vh < 480;
  const isCompactLandscape = viewport.vh < 460 && viewport.vw > viewport.vh;
  const maxRadius = isSmallScreen ? 34 : 45;
  const maxRadiusRef = useRef(maxRadius);
  maxRadiusRef.current = maxRadius;

  // Mobile Virtual Joystick State
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const stickOriginRef = useRef({ x: 0, y: 0 });
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickMouseActiveRef = useRef(false);
  const joystickRingRef = useRef<HTMLDivElement | null>(null);

  // Mobile Touch Look State（全畫面皆可滑動轉頭，支援直式與橫式）
  const lookTouchIdRef = useRef<number | null>(null);
  const lookTapRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lookLastPosRef = useRef({ x: 0, y: 0 });

  const onTouchLookDeltaRef = useRef(onTouchLookDelta);
  onTouchLookDeltaRef.current = onTouchLookDelta;
  const onTapScreenRef = useRef(onTapScreen);
  onTapScreenRef.current = onTapScreen;
  const onJoystickMoveRef = useRef(onJoystickMove);
  onJoystickMoveRef.current = onJoystickMove;
  const onJoystickEndRef = useRef(onJoystickEnd);
  onJoystickEndRef.current = onJoystickEnd;

  const updateStickFromClientXY = (clientX: number, clientY: number) => {
    const radius = maxRadiusRef.current;
    const dx = clientX - stickOriginRef.current.x;
    const dy = clientY - stickOriginRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, radius);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setStickPos({ x: clampedX, y: clampedY });

    const normX = clampedX / radius;
    const normY = clampedY / radius;
    onJoystickMoveRef.current(normX, normY);
  };

  // Touch Handlers for Virtual Joystick (Left zone)
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      joystickTouchIdRef.current = t.identifier;
      if (joystickRingRef.current) {
        const rect = joystickRingRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distToRing = Math.hypot(t.clientX - centerX, t.clientY - centerY);
        if (distToRing <= rect.width * 0.85) {
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
    e.stopPropagation();
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
        onJoystickEndRef.current();
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
      onJoystickEndRef.current();
    };
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, []);

  // 全畫面觸控轉頭與點選（解決直式無法轉頭，支援在畫面任意空白處滑動轉視角、與左下搖桿多點觸控同步操作）
  useEffect(() => {
    let isPinching = false;
    const isInteractiveUiTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof Element)) return false;
      return Boolean(
        el.closest(
          '[data-joystick-zone], [data-ui-panel], button, a, input, select, textarea, .kx-panel, .kx-parchment'
        )
      );
    };

    const onWindowTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        isPinching = true;
        lookTouchIdRef.current = null;
        lookTapRef.current = null;
        return;
      }
      if (isPinching) return;
      if (lookTouchIdRef.current !== null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickTouchIdRef.current) continue;
        if (isInteractiveUiTarget(t.target)) continue;
        lookTouchIdRef.current = t.identifier;
        lookLastPosRef.current = { x: t.clientX, y: t.clientY };
        lookTapRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
        break;
      }
    };

    const onWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        isPinching = true;
        lookTouchIdRef.current = null;
        lookTapRef.current = null;
        if (e.cancelable) e.preventDefault();
        return;
      }
      if (isPinching) return;
      if (lookTouchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === lookTouchIdRef.current) {
          if (e.cancelable) e.preventDefault();
          const dx = t.clientX - lookLastPosRef.current.x;
          const dy = t.clientY - lookLastPosRef.current.y;
          lookLastPosRef.current = { x: t.clientX, y: t.clientY };
          // 直式螢幕寬度較窄，自動提高水平轉頭靈敏度，單指一滑即可輕鬆轉身
          const isPortrait = window.innerHeight > window.innerWidth;
          const yawBoost = isPortrait ? 1.55 : 1.1;
          onTouchLookDeltaRef.current(dx * yawBoost, dy);
          break;
        }
      }
    };

    const onWindowTouchEnd = (e: TouchEvent) => {
      if (isPinching) {
        if (e.touches.length < 2) isPinching = false;
        lookTouchIdRef.current = null;
        lookTapRef.current = null;
        return;
      }
      if (lookTouchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === lookTouchIdRef.current) {
          lookTouchIdRef.current = null;
          const st = lookTapRef.current;
          lookTapRef.current = null;
          if (
            st &&
            e.type === 'touchend' &&
            Math.hypot(t.clientX - st.x, t.clientY - st.y) < 12 &&
            performance.now() - st.t < 380
          ) {
            onTapScreenRef.current?.(t.clientX, t.clientY);
          }
          break;
        }
      }
    };

    window.addEventListener('touchstart', onWindowTouchStart, { passive: true });
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onWindowTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onWindowTouchStart);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('touchcancel', onWindowTouchEnd);
    };
  }, []);

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
  const [shareCopied, setShareCopied] = useState(false);
  const [isAppMode] = useState<boolean>(detectStandaloneApp);
  const [appBannerDismissed, setAppBannerDismissed] = useState<boolean>(false);
  const [appGuideOpen, setAppGuideOpen] = useState<boolean>(false);
  const [appGuideCopied, setAppGuideCopied] = useState<boolean>(false);
  const [appGuideTab, setAppGuideTab] = useState<'ios' | 'android' | 'desktop'>(() => {
    if (typeof navigator === 'undefined') return 'ios';
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'desktop';
  });

  const isInAppBrowser = React.useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Line\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(navigator.userAgent || '');
  }, []);

  useEffect(() => {
    if (openMapSignal) setMapOpen(true);
  }, [openMapSignal]);

  const handleInstallAppClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await triggerDirectAppDownloadOrInstall(() => {
      setAppGuideOpen(true);
    });
  };

  const handleCopyKingdomLink = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?view=kingdom3d`
        : '';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setAppGuideCopied(true);
      window.setTimeout(() => setAppGuideCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleShareInvite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?view=kingdom3d`
        : '';
    const shareTitle = '創點源・五島｜3D 多人同遊';
    const shareText = '快來「創點源・五島」3D 世界跟我一起逛！';

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2500);
      } catch {
        // ignore
      }
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // user cancelled native share sheet; clipboard copy already succeeded
      }
    }
  };

  const region = REGION_CONFIGS[activeRegionId];
  const spaceLabel = React.useMemo(
    () => detectPlayerSpatialContext(playerPos.x, playerPos.z).spaceLabel,
    // 位置變化 0.5 公尺以上才重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.round(playerPos.x * 2), Math.round(playerPos.z * 2)]
  );
  const duskIcon = (
    <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M6 16a6 6 0 0 1 12 0" />
      <path d="M3 16h18M5 20h14M12 4v3M4.9 8.9l2 2M19.1 8.9l-2 2" />
    </svg>
  );
  const todIcon =
    timeOfDay === 'night' ? (
      <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
    ) : timeOfDay === 'day' ? (
      <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
    ) : (
      duskIcon
    );
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

  const minimapSize = isCompactLandscape ? 72 : viewport.vw < 640 ? 82 : 128;

  return (
    <div className="kx-root absolute inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* 左上：地點牌匾、多人狀態與橫式/App體驗提示 */}
      <div
        data-ui-panel="true"
        className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-[max(0.5rem,env(safe-area-inset-left))] sm:top-4 sm:left-4 pointer-events-auto max-w-[calc(100vw-8.75rem)] sm:max-w-md flex flex-col items-start"
      >
        <div className="flex items-center gap-1.5 flex-wrap max-w-full">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`kx-panel kx-corners flex items-center gap-2 text-left cursor-pointer max-w-full ${
              isCompactLandscape ? 'pl-2.5 pr-3 py-1' : 'pl-2.5 sm:pl-3 pr-3 sm:pr-4 py-1.5 sm:py-2'
            }`}
            aria-expanded={menuOpen}
            aria-label="開啟選單"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-200" />
            <span className="min-w-0">
              <span className="kx-title block text-[14px] sm:text-lg leading-tight truncate">{region?.name || '創點源'}</span>
              <span className="kx-sub block text-[11px] sm:text-[12.5px] leading-snug truncate">{placeText}</span>
            </span>
          </button>

          {/* 兩種模式切換：3D地圖 ⇄ 實境漫遊 */}
          {onSwitchToIslandMap && (
            <div
              className="kx-panel inline-flex items-center p-0.5 rounded-full text-[11px] sm:text-[12.5px]"
              role="group"
              aria-label="3D島覽模式切換"
            >
              <button
                type="button"
                onClick={onSwitchToIslandMap}
                className="px-2.5 py-1 rounded-full text-amber-100/80 hover:text-amber-50 hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap"
                title="切換至3D地圖（俯瞰導覽模式）"
              >
                3D地圖
              </button>
              <span
                className="px-2.5 py-1 rounded-full font-bold text-amber-50 bg-gradient-to-b from-[#b3261e] to-[#7d1a16] border border-amber-300/60 shadow-2xs whitespace-nowrap"
                aria-current="page"
              >
                實境漫遊
              </span>
            </div>
          )}
        </div>

        {multiplayer && !menuOpen && (
          <div className="kx-panel mt-1 inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 text-[11px] sm:text-[11.5px] max-w-full" title="多人同遊">
            <Users className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            <span className="kx-sub truncate">
              {multiplayer.status === 'online'
                ? multiplayer.others > 0
                  ? '多人同遊中，推薦好友一起逛'
                  : '目前只有你，快快邀請好友同遊'
                : multiplayer.status === 'guest'
                ? '登入後可和其他人一起逛'
                : multiplayer.status === 'connecting'
                ? '正在連線其他旅人…'
                : multiplayer.status === 'off'
                ? '多人同遊尚未開通'
                : '多人連線暫時無法使用'}
            </span>
            {multiplayer.status === 'online' && (
              <button
                type="button"
                onClick={handleShareInvite}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-semibold text-amber-100 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-300/45 transition-colors cursor-pointer shrink-0"
                title="複製連結或分享給好友一起逛五島"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-300" />
                    <span className="text-emerald-200">已複製</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3 text-amber-200" />
                    <span>分享</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* 建議橫式握持＆建議在 App 體驗更佳（附下載按鍵，符合古風漆木描金美術風格） */}
        {!isAppMode && !appBannerDismissed && !menuOpen && (
          <div className="kx-panel mt-1 inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 text-[11px] sm:text-[11.5px] max-w-full">
            <Smartphone className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            <span className="kx-sub">
              建議橫式握持・在 App 體驗會更好
            </span>
            <button
              type="button"
              onClick={handleInstallAppClick}
              className="kx-btn-primary inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] sm:text-[11px] font-semibold cursor-pointer shrink-0"
              title="下載或安裝創點源 App"
            >
              <Download className="w-3 h-3" />
              <span>下載 App</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAppBannerDismissed(true);
              }}
              className="text-amber-200/60 hover:text-amber-100 px-0.5 cursor-pointer"
              title="隱藏提示"
              aria-label="隱藏提示"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {menuOpen && (
          <div className="kx-panel mt-1.5 p-2 w-[min(78vw,300px)] max-h-[calc(100dvh-5rem)] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
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
            {onSwitchToIslandMap && (
              <button
                type="button"
                className="kx-menu-item"
                onClick={() => {
                  closeMenu();
                  onSwitchToIslandMap();
                }}
              >
                <Compass className="w-4 h-4 text-amber-200" /> 切換至「3D地圖」
              </button>
            )}
            <button type="button" className="kx-menu-item" onClick={() => { setMapOpen(true); closeMenu(); }}>
              <MapIcon className="w-4 h-4 text-amber-200" /> 全島地圖
            </button>
            {!isAppMode && (
              <button
                type="button"
                className="kx-menu-item"
                onClick={() => {
                  closeMenu();
                  handleInstallAppClick();
                }}
              >
                <Download className="w-4 h-4 text-amber-200" /> 下載／安裝 App（橫直式全螢幕體驗）
              </button>
            )}
            {onCycleTimeOfDay && (
              <button type="button" className="kx-menu-item" onClick={onCycleTimeOfDay}>
                <span className="text-amber-200 [&>svg]:w-4 [&>svg]:h-4">{todIcon}</span> 時段：{todLabel}
              </button>
            )}
            {onToggleBgm && (
              <button type="button" className="kx-menu-item" onClick={onToggleBgm}>
                {bgmMuted ? <VolumeX className="w-4 h-4 text-amber-200" /> : <Volume2 className="w-4 h-4 text-amber-200" />} 古風背景樂：{bgmMuted ? '關' : '開'}
              </button>
            )}
            <button type="button" className="kx-menu-item" onClick={onToggleFastWalk} disabled={landRideMode === 'buffalo' || landRideMode === 'horseCart'}>
              <Footprints className="w-4 h-4 text-amber-200" /> {landRideMode === 'buffalo' ? '騎牛（固定慢速）' : landRideMode === 'horseCart' ? '驅車（定速）' : landRideMode === 'horse' ? (isFastWalk ? '策馬（快速）' : '騎馬（慢速）') : landRideMode === 'egret' ? (isFastWalk ? '駕鶴飛行中（按一下降落）' : '駕鶴（按一下起飛）') : isOnBoat
                ? (isFastWalk ? '疾駛中（點一下恢復遊船速度）' : '遊船（點一下改疾駛）')
                : (isFastWalk ? '疾走中（點一下恢復常速）' : '常速（點一下改疾走）')}
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

      {/* 右上：羅盤小地圖＋離開（自動依螢幕縮放，不跑出畫面） */}
      <div
        data-ui-panel="true"
        className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-[max(0.5rem,env(safe-area-inset-right))] sm:top-4 sm:right-4 flex items-start gap-1.5 sm:gap-2 pointer-events-auto"
      >
        <button type="button" onClick={onExit} className="kx-round w-8 h-8 sm:w-9 sm:h-9 shrink-0" title="離開 3D，回到網站" aria-label="離開">
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <CompassMinimap
            playerPos={{ x: playerPos.x, z: playerPos.z }}
            yawRad={yawRad}
            activeRegionId={activeRegionId}
            size={minimapSize}
            bondedPartner={bondedPartner}
            onOpen={() => setMapOpen(true)}
          />
          {env && (
            <EnvControls
              timeMode={env.timeMode}
              weatherMode={env.weatherMode}
              tod={timeOfDay || 'dusk'}
              weather={env.weather}
              onTimeMode={env.onTimeMode}
              onWeatherMode={env.onWeatherMode}
              bgmMuted={bgmMuted}
              onToggleBgm={onToggleBgm}
              autoHint={env.autoHint}
            />
          )}
          {extraControls}
        </div>
      </div>

      {/* 準星 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-100/80 shadow-[0_0_6px_rgba(255,210,120,0.8)]" />
      </div>

      {/* 靠近建築：小巧互動提示（符合東方漆木描金風格，直橫式皆不超出畫面） */}
      {(nearBuilding || nearPortal) && (
        <div
          data-ui-panel="true"
          className={`absolute z-10 left-1/2 -translate-x-1/2 pointer-events-auto animate-in fade-in duration-150 max-w-[92vw] ${
            isCompactLandscape ? 'bottom-3' : 'bottom-32 sm:bottom-16'
          }`}
        >
          {nearBuilding && (
            <button
              type="button"
              onClick={onInteract}
              className="kx-panel flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-[12px] cursor-pointer active:scale-95 transition-transform max-w-full"
            >
              <Hand className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span className="truncate">
                按 <kbd className="px-1 py-0.5 mx-0.5 rounded bg-black/40 border border-amber-300/40 text-amber-200 text-[10px] font-mono leading-none">E</kbd> 或點擊啟動：{getBuildingFeatureLabel(nearBuilding)}
              </span>
            </button>
          )}
          {nearPortal && !nearBuilding && (
            <div className="kx-panel flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] max-w-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span className="truncate">{nearPortal.name}</span>
            </div>
          )}
        </div>
      )}

      {/* 底部：左邊虛擬搖桿、右邊精簡雙排圓形按鈕（安全邊距保護，直式與橫式皆不跑出畫面） */}
      <div className="absolute inset-x-0 bottom-0 flex justify-between items-end pointer-events-none pb-[max(0.65rem,env(safe-area-inset-bottom))] pl-[max(0.65rem,env(safe-area-inset-left))] pr-[max(0.65rem,env(safe-area-inset-right))] sm:pb-5 sm:px-6">
        {/* 左下搖桿區 */}
        <div
          data-joystick-zone="true"
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
          className="relative pointer-events-auto touch-none flex items-end justify-start p-1 shrink-0"
        >
          <div
            ref={joystickRingRef}
            onMouseDown={handleJoystickMouseDown}
            className="kx-joy-ring relative w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center cursor-pointer shrink-0"
          >
            {[0, 90, 180, 270].map((deg) => (
              <span
                key={deg}
                className="absolute w-0 h-0 border-x-[4px] sm:border-x-[5px] border-x-transparent border-b-[6px] sm:border-b-[7px] border-b-amber-50/70"
                style={{ transform: `rotate(${deg}deg) translateY(${isSmallScreen ? -36 : -46}px)` }}
              />
            ))}
            <div
              className={`kx-joy-knob w-10 h-10 sm:w-14 sm:h-14 rounded-full transition-transform duration-75 ${joystickActive ? 'scale-105' : ''}`}
              style={{ transform: `translate(${stickPos.x}px, ${stickPos.y}px)` }}
            />
          </div>
        </div>

        {/* 右下操作按鈕群：上排環境與音樂、下排加大版跑步／疾走鍵 */}
        <div
          data-ui-panel="true"
          className="relative pointer-events-auto flex flex-col items-end gap-2 sm:gap-2.5 shrink-0"
        >
          {/* 坐下鍵（C）：坐著休息；和羈絆一起坐在桃樹下會落桃花 */}
          {onToggleSit && (
            <button
              type="button"
              onClick={onToggleSit}
              data-on={Boolean(sitting)}
              className="kx-round w-14 h-14 sm:w-16 sm:h-16 flex-col gap-0.5 shadow-lg"
              title={sitting ? '站起來（C，或直接走動）' : '坐下（C）'}
              aria-label="坐下"
            >
              <Armchair className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="text-[10.5px] sm:text-[11px] font-bold tracking-wider leading-none">{sitting ? '站起' : '坐下(C)'}</span>
            </button>
          )}
          {/* 照明鍵：呼喚小燈泡拿在手上 */}
          {onToggleBulb && (
            <button
              type="button"
              onClick={onToggleBulb}
              data-on={Boolean(bulbOn)}
              className="kx-round w-14 h-14 sm:w-16 sm:h-16 flex-col gap-0.5 shadow-lg"
              title={bulbOn ? '收起小燈泡（F）' : '照明：呼喚小燈泡（F）'}
              aria-label="照明"
            >
              <Lightbulb className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="text-[10.5px] sm:text-[11px] font-bold tracking-wider leading-none">{bulbOn ? '收起' : '照明(F)'}</span>
            </button>
          )}
          {/* 下排：步行疾走、遊船疾駛，或依目前騎乘工具顯示專屬操作 */}
          <button
            type="button"
            onClick={onToggleFastWalk}
            data-on={landRideMode === 'buffalo' || landRideMode === 'horseCart' ? true : landRideMode === 'egret' ? isFastWalk : isFastWalk || shiftHeld}
            className="kx-round w-20 h-20 sm:w-24 sm:h-24 flex-col gap-0.5 shadow-lg"
            title={landRideMode === 'buffalo' ? '騎牛（固定慢速）' : landRideMode === 'horseCart' ? '驅車（定速）' : landRideMode === 'horse' ? (isFastWalk ? '策馬（快速，點一下慢行）' : '騎馬（慢速，點一下策馬）') : landRideMode === 'egret' ? (isFastWalk ? '駕鶴中（點一下降落）' : '駕鶴（點一下起飛）') : isOnBoat
              ? (isFastWalk ? '疾駛中（點一下恢復遊船速度，或按住 Shift）' : '遊船（點一下疾駛，或按住 Shift）')
              : (isFastWalk ? '疾走中（點一下恢復常速，或按住 Shift）' : '疾走（或按住 Shift）')}
            aria-label={landRideMode === 'buffalo' ? '騎牛' : landRideMode === 'horseCart' ? '驅車定速' : landRideMode === 'horse' ? '騎馬慢速／策馬快速' : landRideMode === 'egret' ? '駕鶴' : isOnBoat ? '遊船／疾駛' : '疾走'}
            disabled={landRideMode === 'buffalo' || landRideMode === 'horseCart'}
          >
            <Footprints className="w-9 h-9 sm:w-11 sm:h-11" />
            <span className="text-[11px] sm:text-xs font-bold tracking-wider leading-none">
              {landRideMode === 'buffalo' ? '騎牛' : landRideMode === 'horseCart' ? '驅車' : landRideMode === 'horse' ? (isFastWalk ? '策馬' : '騎馬') : landRideMode === 'egret' ? (isFastWalk ? '降落' : '駕鶴') : isOnBoat
                ? (isFastWalk || shiftHeld ? '疾駛中' : '遊船')
                : (isFastWalk || shiftHeld ? '疾走中' : '疾走')}
            </span>
          </button>
        </div>
      </div>

      {/* 暗處提示：點【照明(F)】呼喚小燈泡 */}
      {darkHint && !bulbOn && onToggleBulb && (
        <div data-ui-panel="true" className="absolute left-1/2 -translate-x-1/2 top-24 sm:top-20 pointer-events-auto">
          <div className="kx-panel px-4 py-2 text-[13px] sm:text-[14px] whitespace-nowrap flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-200 shrink-0" />
            覺得暗？點擊
            <button type="button" onClick={onToggleBulb} className="font-bold text-amber-200 underline underline-offset-2 cursor-pointer">
              【照明(F)】
            </button>
            呼喚小燈泡助你前途光明！
          </div>
        </div>
      )}

      {/* 電腦版提示 */}
      <div data-ui-panel="true" className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-5 pointer-events-none">
        <div className="kx-panel px-4 py-1.5 text-[12.5px] whitespace-nowrap">
          拖曳畫面環顧・滾輪縮放・WASD 移動・E 互動・Q 瞬移・C 坐下・F 照明
        </div>
      </div>

      {/* 古風漆木描金風格：App 下載與安裝教學彈窗（當瀏覽器無法直接呼出原生安裝時跳出） */}
      {appGuideOpen && (
        <div
          data-ui-panel="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm pointer-events-auto"
          onClick={() => setAppGuideOpen(false)}
        >
          <div
            className="kx-panel kx-corners max-w-md w-full max-h-[88dvh] overflow-y-auto p-4 sm:p-6 space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="kx-title text-lg sm:text-xl flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-200 shrink-0" />
                  安裝「創點源」App・暢遊五島
                </h3>
                <p className="kx-sub text-[12px] sm:text-[12.5px] mt-0.5">
                  全螢幕無網址列遮擋，無論橫向握持或直式漫步，視野更廣、操控更順暢！
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAppGuideOpen(false)}
                className="kx-round w-8 h-8 shrink-0"
                aria-label="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInAppBrowser && (
              <div
                className="rounded-lg p-2.5 text-[12px] leading-relaxed"
                style={{
                  background: 'rgba(179, 38, 30, 0.35)',
                  border: '1px solid rgba(242, 198, 106, 0.65)',
                  color: '#ffe7a8',
                }}
              >
                您目前位於社群內建瀏覽器（如 LINE／FB／IG），無法直接呼出系統安裝。請先點選右上或右下「<strong>⋯</strong>」→「<strong>以預設瀏覽器開啟</strong>（Safari 或 Chrome）」，或複製下方網址貼至瀏覽器。
              </div>
            )}

            {/* 平台切換分頁 */}
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'ios', label: 'iOS 蘋果' },
                  { id: 'android', label: 'Android 安卓' },
                  { id: 'desktop', label: '電腦桌面' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAppGuideTab(tab.id)}
                  className={`${
                    appGuideTab === tab.id ? 'kx-btn-primary font-bold' : 'kx-btn-ghost'
                  } py-1.5 px-2 text-[12px] text-center cursor-pointer transition-colors`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 各平台安裝步驟 */}
            {appGuideTab === 'ios' && (
              <div className="space-y-2 text-[12.5px] sm:text-[13px] leading-relaxed">
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(226,184,90,0.3)' }}>
                  <p className="kx-title text-[13.5px]">步驟一：使用 Safari 開啟並點擊「分享」</p>
                  <p className="kx-sub">在 iPhone／iPad 的 Safari 瀏覽器底部（或頂端）工具列，點選「分享」圖示（方框向上箭頭）。</p>
                </div>
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(226,184,90,0.3)' }}>
                  <p className="kx-title text-[13.5px]">步驟二：選擇「加入主畫面」</p>
                  <p className="kx-sub">於分享選單往下滑動，點選「加入主畫面（Add to Home Screen）」。</p>
                </div>
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(226,184,90,0.3)' }}>
                  <p className="kx-title text-[13.5px]">步驟三：點擊右上角「新增」即可全螢幕暢遊</p>
                  <p className="kx-sub">返回手機主畫面點擊「創點源」圖示，即可享受全螢幕 3D 五島體驗（建議橫向握持視野最佳，直式亦可直接滑動畫面轉頭）。</p>
                </div>
              </div>
            )}

            {appGuideTab === 'android' && (
              <div className="space-y-2 text-[12.5px] sm:text-[13px] leading-relaxed">
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(226,184,90,0.3)' }}>
                  <p className="kx-title text-[13.5px]">步驟一：點擊 Chrome 右上角「⋮」選單</p>
                  <p className="kx-sub">使用 Chrome 瀏覽器開啟本頁，點選右上角的三點選單圖示。</p>
                </div>
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(226,184,90,0.3)' }}>
                  <p className="kx-title text-[13.5px]">步驟二：點選「安裝應用程式」或「加到主畫面」</p>
                  <p className="kx-sub">在選單中點選「安裝應用程式（Install app）」或「加到主畫面」，按確認完成安裝。</p>
                </div>
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(226,184,90,0.3)' }}>
                  <p className="kx-title text-[13.5px]">步驟三：從手機桌面開啟 App</p>
                  <p className="kx-sub">由桌面啟動即可去除瀏覽器工具列，橫式、直式按鍵完整不裁切！</p>
                </div>
              </div>
            )}

            {appGuideTab === 'desktop' && (
              <div className="space-y-2 text-[12.5px] sm:text-[13px] leading-relaxed">
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(226,184,90,0.3)' }}>
                  <p className="kx-title text-[13.5px]">方式一：從網址列右側直接安裝</p>
                  <p className="kx-sub">於 Chrome／Edge 網址列右側點擊「安裝」圖示，即可將創點源安裝為獨立桌面應用程式。</p>
                </div>
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(226,184,90,0.3)' }}>
                  <p className="kx-title text-[13.5px]">方式二：下載桌面啟動捷徑檔</p>
                  <p className="kx-sub">點擊下方「下載啟動捷徑」按鈕，即可將捷徑保存至電腦桌面隨時進入。</p>
                </div>
              </div>
            )}

            <div className="kx-divider" />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyKingdomLink}
                  className="kx-btn-ghost px-3 py-1.5 text-[12px] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {appGuideCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="text-emerald-200">已複製五島網址</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-200" />
                      <span>複製網址</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => downloadAppLauncherFile()}
                  className="kx-btn-ghost px-3 py-1.5 text-[12px] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-200" />
                  <span>下載啟動捷徑</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAppGuideOpen(false)}
                className="kx-btn-primary px-4 py-1.5 text-[12.5px] font-semibold cursor-pointer"
              >
                繼續探索
              </button>
            </div>
          </div>
        </div>
      )}

      <WorldMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        activeRegionId={activeRegionId}
        playerPos={{ x: playerPos.x, z: playerPos.z }}
        yawRad={yawRad}
        bondedPartner={bondedPartner}
        onSelectRegion={onSelectRegion}
        onGoToPoint={onGoToPoint}
      />
    </div>
  );
};


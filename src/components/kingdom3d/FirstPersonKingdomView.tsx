import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RegionId,
  RegionStatus,
  BuildingInteractable,
  Portal,
  DevPerformanceMetrics,
  QualitySettings,
} from './types';
import {
  REGION_CONFIGS,
  WORLD_BRIDGES,
  getGlobalWalkableZones,
  detectPlayerSpatialContext,
} from './regionConfigs';
import { RegionManager } from './RegionManager';
import { FirstPersonControls, isTypingTarget } from './FirstPersonControls';
import { PhysicsController } from './PhysicsController';
import { PerformanceMonitor } from './PerformanceMonitor';
import { MobileControlsOverlay } from './MobileControlsOverlay';
import { KingdomSideDrawer, DrawerState, findStreetProp } from './KingdomSideDrawer';
import { useSosoJobs, SosoJob, SosoState } from './useSosoJobs';
import { drawJobScrollTexture } from './stylized/jobScroll';
import { pickTargetOf, PickTarget } from './picking';
import { KingdomMultiplayer, RemotePlayersView, MultiplayerStatus, multiplayerConfigured } from './kingdomMultiplayer';
import { moduleUrl, openInNewTab } from './buildingActions';
import type { KingdomAction } from './buildingActions';
import { ancientJiangnanBgm } from '../../utils/ancientBgm';
import { DevStatsPanel } from './DevStatsPanel';
import { painForFloor } from './PainFloorModal';
import { getStoryLayout, levelColliders, upTrigger, downTrigger, toLocal, toWorld, FLOOR_H, StoryLayout } from './stylized/multiStory';
import { drawPainBoardTexture, PAIN_FLOORS, PAIN_BASEMENTS, PainBoardLayout } from './stylized/painBoard';
import { useApp } from '../../context/AppContext';
import type { Question } from '../../types';
import type { Collider } from './types';
import { StylizedWorld, TimeOfDay } from './stylized/environment';
import { setTextureAnisotropy } from './stylized/textures';
import { peekKingdomResume, saveKingdomResume, clearKingdomResume } from './kingdomResume';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** 電腦、平板等效能較好的裝置預設開精緻畫質；手機預設流暢 */
const detectFancyDefault = () => {
  if (typeof window === 'undefined') return false;
  const touch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
  return !touch && window.innerWidth >= 900 && (navigator.hardwareConcurrency || 4) >= 4;
};
import './kingdomUi.css';
import {
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

interface FirstPersonKingdomViewProps {
  onExit: () => void;
  onNavigateToModule?: (targetModule: string) => void;
  /** 在 3D 裡點某則內容（例如創點樓的痛點）時打開它 */
  onOpenQuestion?: (q: Question) => void;
  initialRegionId?: RegionId;
  /**
   * 在左側直接顯示文章完整內頁。leave() 會先記住 3D 位置再關掉面板，
   * 內頁裡的操作需要離開 3D（例如提方案、看專家）時先呼叫它。
   */
  renderQuestionPage?: (q: Question, ctx: { back: () => void; leave: () => void }) => React.ReactNode;
}

type Tower = { b: BuildingInteractable; lay: StoryLayout; cols: Collider[][] };
type StoryState = {
  towerId: string | null;
  level: number;
  armed: boolean;
  tween: null | { pts: THREE.Vector3[]; t: number; dur: number; toLevel: number; towerId: string };
};

const REGION_BUILDINGS = new Map<string, BuildingInteractable>(
  Object.values(REGION_CONFIGS).flatMap((r) => r.buildings.map((b) => [b.id, b] as [string, BuildingInteractable]))
);

/** 沿折線取點（t 為 0~1） */
function samplePath(pts: THREE.Vector3[], t: number) {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = pts[i].distanceTo(pts[i - 1]);
    lens.push(l);
    total += l;
  }
  let d = t * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) return pts[i].clone().lerp(pts[i + 1], Math.min(1, d / (lens[i] || 1)));
    d -= lens[i];
  }
  return pts[pts.length - 1].clone();
}

export const FirstPersonKingdomView: React.FC<FirstPersonKingdomViewProps> = ({
  onExit,
  onNavigateToModule,
  onOpenQuestion,
  initialRegionId = 'region-home',
  renderQuestionPage,
}) => {
  const { questions, currentUser } = useApp();
  const questionsRef = useRef<Question[]>(questions);
  questionsRef.current = questions;
  const storyRef = useRef<StoryState>({ towerId: null, level: 0, armed: true, tween: null });
  const [floorLevel, setFloorLevel] = useState(0);
  // 左側面板（照 /island：點畫面上的建築、攤位、懸賞牆，細節在左側彈出）
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const drawerRef = useRef<DrawerState | null>(null);
  drawerRef.current = drawer;
  const [bgmMuted, setBgmMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ideax_kingdom_bgm_muted') === '1';
    } catch {
      return false;
    }
  });
  const [mpStatus, setMpStatus] = useState<MultiplayerStatus>(multiplayerConfigured ? 'connecting' : 'off');
  const [onlineOthers, setOnlineOthers] = useState(0);
  const multiplayerRef = useRef<KingdomMultiplayer | null>(null);
  const openForBuilding = useCallback((b: BuildingInteractable) => {
    if (towersRef.current.has(b.id)) {
      // story.level 是相對地面的樓層（0＝地面層、-1＝地下一樓）；懸賞牆的樓層編號要加上地下層數
      const tw = towersRef.current.get(b.id)!;
      const inside = storyRef.current.towerId === b.id || storyRef.current.level !== 0;
      setDrawer(inside ? { kind: 'painFloor', level: storyRef.current.level + tw.lay.basements } : { kind: 'building', building: (REGION_BUILDINGS.get(b.id) || b) });
    } else {
      setDrawer({ kind: 'building', building: REGION_BUILDINGS.get(b.id) || b });
    }
  }, []);
  const sosoJobsCountRef = useRef(0);
  const openForTarget = useCallback((t: PickTarget) => {
    if (t.kind === 'building') {
      const b = REGION_BUILDINGS.get(t.id);
      if (b) setDrawer({ kind: 'building', building: b });
    } else if (t.kind === 'painBoard') {
      setDrawer({ kind: 'painFloor', level: t.level });
    } else if (t.kind === 'street') {
      if (findStreetProp(t.id)) setDrawer({ kind: 'street', propId: t.id });
    } else if (t.kind === 'desk') {
      setDrawer({ kind: 'desk' });
    } else if (t.kind === 'npc') {
      setDrawer({ kind: 'soso' });
    } else if (t.kind === 'feature') {
      setDrawer({ kind: 'feature', id: t.id });
    } else if (t.kind === 'jobScroll') {
      setDrawer({ kind: sosoJobsCountRef.current > 0 ? 'jobs' : 'soso' });
    }
  }, []);
  const towersRef = useRef<Map<string, Tower>>(new Map());
  if (towersRef.current.size === 0) {
    for (const r of Object.values(REGION_CONFIGS)) {
      for (const b of r.buildings) {
        const lay = getStoryLayout(b);
        if (lay) towersRef.current.set(b.id, { b, lay, cols: Array.from({ length: lay.floors }, (_, k) => levelColliders(b, lay, k)) });
      }
    }
  }
  const floorNameCache = useRef<Map<string, BuildingInteractable>>(new Map());
  /** 創點樓各層懸賞牆：換上真實痛點 */
  const refreshPainBoards = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.traverse((o) => {
      const info = o.userData?.painBoard as { level: number; offset?: number; count?: number; layout?: PainBoardLayout } | undefined;
      if (!info) return;
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const off = info.offset || 0;
      const cards = painForFloor(questionsRef.current, info.level)
        .slice(off, off + (info.count || 8))
        .map((q) => ({ id: q.id, title: q.title, category: q.category, bounty: q.bounty }));
      const old = mat.map;
      mat.map = drawPainBoardTexture(info.level, cards, false, info.layout);
      mat.needsUpdate = true;
      old?.dispose();
    });
  }, []);
  const mountRef = useRef<HTMLDivElement>(null);

  /** 要離開 3D 去看內容時，記住現在的位置、樓層與時段，回來時接著逛 */
  const rememberPose = useCallback(() => {
    const c = controlsRef.current;
    if (!c) return;
    const st = storyRef.current;
    saveKingdomResume({
      x: c.position.x,
      y: c.position.y,
      z: c.position.z,
      yaw: c.yaw,
      pitch: c.pitch,
      level: st.tween ? st.tween.toLevel : st.level,
      towerId: st.tween ? st.tween.towerId : st.towerId,
      timeOfDay: worldRef.current?.timeOfDay || 'dusk',
    });
  }, []);
  const handleExit = useCallback(() => {
    clearKingdomResume();
    onExit();
  }, [onExit]);

  // Core 3D engine refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<FirstPersonControls | null>(null);
  const regionManagerRef = useRef<RegionManager | null>(null);
  const perfMonitorRef = useRef<PerformanceMonitor>(new PerformanceMonitor());
  const rafIdRef = useRef<number | null>(null);

  // Lights
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const worldRef = useRef<StylizedWorld | null>(null);
  const fancyRef = useRef<boolean>(detectFancyDefault());
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('dusk');

  // Safe player pose for error recovery
  const safePlayerPoseRef = useRef<{ pos: THREE.Vector3; yaw: number } | null>(null);

  // Region state
  const [activeRegionId, setActiveRegionId] = useState<RegionId>(initialRegionId);
  const [regionStatus, setRegionStatus] = useState<RegionStatus>('loading');
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Proximity interactables
  const [nearBuilding, setNearBuilding] = useState<BuildingInteractable | null>(null);
  const [nearPortal] = useState<Portal | null>(null);
  const nearBuildingRef = useRef<BuildingInteractable | null>(null);

  // Settings & Dev stats
  const [quality, setQuality] = useState<QualitySettings>({
    resolutionScale: 1.0,
    shadows: detectFancyDefault(),
    fancy: detectFancyDefault(),
    renderDistance: 220,
    headBob: true,
    sensitivity: 1.0,
    showColliders: false,
    moveSpeedMultiplier: 1.0,
  });
  const [isDevStatsOpen, setIsDevStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDesktopPointerLocked, setIsDesktopPointerLocked] = useState(false);

  // Performance metrics for dev panel
  const [devMetrics, setDevMetrics] = useState<DevPerformanceMetrics>({
    fps: 30,
    frameTimeMs: 33.3,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    activeRegionId: initialRegionId,
    regionStatus: 'loading',
    loadTimeMs: 0,
    playerPos: { x: 0, y: 0, z: 4 },
    yawDeg: 0,
    pitchDeg: 0,
    resolutionScale: 1.0,
    shadowsEnabled: false,
    nearBuilding: null,
    nearPortal: null,
    currentSpaceLabel: '',
  });

  // Sound effects helper via Web Audio API
  const playSoundEffect = useCallback((type: 'portal' | 'interact' | 'bulb') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'portal') {
        [440, 554.37, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.001, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.55);
        });
      } else if (type === 'bulb') {
        // 叮叮噹：上行琶音＋高音泛音
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx % 2 ? 'triangle' : 'sine';
          const t0 = now + idx * 0.09;
          osc.frequency.setValueAtTime(freq, t0);
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.75);
        });
      } else if (type === 'interact') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      }
    } catch {
      // Audio policy safe
    }
  }, []);

  // Direct island jump handler (from top bar or radar map)
  const handleSelectRegion = useCallback(
    async (targetRegionId: RegionId) => {
      if (!regionManagerRef.current || !controlsRef.current) return;
      const manifest = REGION_CONFIGS[targetRegionId];
      if (!manifest) return;

      safePlayerPoseRef.current = {
        pos: controlsRef.current.position.clone(),
        yaw: controlsRef.current.yaw,
      };

      try {
        playSoundEffect('portal');
        storyRef.current = { towerId: null, level: 0, armed: true, tween: null };
        setFloorLevel(0);
        await regionManagerRef.current.loadRegion(targetRegionId);
        controlsRef.current.setSpawn(
          new THREE.Vector3(...manifest.defaultSpawn.position),
          manifest.defaultSpawn.yaw
        );
        setActiveRegionId(targetRegionId);
      } catch (err) {
        console.warn('Region jump failed:', err);
      }
    },
    [playSoundEffect]
  );

  const [mapSignal, setMapSignal] = useState(0);
  // 求職廟搜搜：結果寫到兩旁畫卷（只改自己畫面上的貼圖）
  const writeJobScrolls = useCallback((jobs: SosoJob[], status: SosoState['status'], brief: string) => {
    sosoJobsCountRef.current = jobs.length;
    sceneRef.current?.traverse((o) => {
      const info = o.userData?.jobScroll as { side: number } | undefined;
      if (!info) return;
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const old = mat.map;
      mat.map = drawJobScrollTexture(info.side, jobs.slice(info.side * 5, info.side * 5 + 5), status, brief);
      mat.needsUpdate = true;
      old?.dispose();
    });
  }, []);
  const { soso, sendSoso, searchSoso, resetSoso } = useSosoJobs(writeJobScrolls);
  const tapRef = useRef<((x: number, y: number) => boolean) | null>(null);
  const currentUserNameRef = useRef(currentUser?.name || '');
  currentUserNameRef.current = currentUser?.name || '';
  const currentUserIdRef = useRef(currentUser?.id || '');
  currentUserIdRef.current = currentUser?.id || '';
  const handleDrawerAction = useCallback(
    (a: KingdomAction) => {
      if (a.kind === 'module') {
        // 用新分頁開，3D 這一頁維持原狀；被擋下時才在本頁開（並記住位置）
        if (!openInNewTab(moduleUrl(a.module))) {
          rememberPose();
          setDrawer(null);
          onNavigateToModule?.(a.module);
        }
      } else if (a.kind === 'region') {
        setDrawer(null);
        handleSelectRegion(a.regionId);
      } else if (a.kind === 'map') {
        setDrawer(null);
        setMapSignal((n) => n + 1);
      } else if (a.kind === 'painFloor') {
        setDrawer({ kind: 'painFloor', level: a.level });
      }
    },
    [rememberPose, onNavigateToModule, handleSelectRegion]
  );

  // 古風背景樂（和 /island 同一首），進 3D 自動播放、離開時停止
  useEffect(() => {
    ancientJiangnanBgm.start();
    ancientJiangnanBgm.setMuted(bgmMuted);
    return () => ancientJiangnanBgm.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleBgm = useCallback(() => {
    setBgmMuted((m) => {
      const next = !m;
      ancientJiangnanBgm.setMuted(next);
      if (!next) ancientJiangnanBgm.start();
      try {
        localStorage.setItem('ideax_kingdom_bgm_muted', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // 暱稱有變時同步給其他玩家
  useEffect(() => {
    multiplayerRef.current?.setName(currentUser?.name || '');
  }, [currentUser?.name]);

  // Initialize Three.js Scene, Controls, RegionManager
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene (Clean architectural daylight atmosphere)
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const initialManifest = REGION_CONFIGS[initialRegionId] || REGION_CONFIGS['region-home'];
    // 2. Camera（遠景山脈與天空需要較遠的可視距離）
    const camera = new THREE.PerspectiveCamera(68, width / height, 0.15, 1000);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, fancyRef.current ? 2 : 1.5) * quality.resolutionScale
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. 天空、海面、遠景、光源與晝夜（東方奇幻風格）
    const world = new StylizedWorld(scene, renderer);
    world.setShadows(fancyRef.current);
    worldRef.current = world;
    setTextureAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

    // 精緻畫質：HDR＋反鋸齒的後製（燈籠、窗紙、寶珠會泛光）
    const rt = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), world.bloomStrength, 0.4, 0.92);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composerRef.current = composer;
    bloomRef.current = bloom;

    // 5. FirstPersonControls
    const controls = new FirstPersonControls(camera, renderer.domElement, quality);
    controlsRef.current = controls;

    const spawnPos = new THREE.Vector3(...initialManifest.defaultSpawn.position);
    controls.setSpawn(spawnPos, initialManifest.defaultSpawn.yaw);

    // 從痛點詳情等頁面回來：站回原本的位置、樓層與時段
    const resume = peekKingdomResume();
    let startRegionId: RegionId = initialManifest.id;
    let resumeClearTimer: number | undefined;
    if (resume) {
      controls.setSpawn(new THREE.Vector3(resume.x, resume.y, resume.z), resume.yaw);
      controls.pitch = resume.pitch;
      controls.updateCameraTransform(0);
      if (resume.level !== 0 && resume.towerId && towersRef.current.has(resume.towerId)) {
        storyRef.current = { towerId: resume.towerId, level: resume.level, armed: false, tween: null };
        setFloorLevel(resume.level);
      }
      world.setTimeOfDay(resume.timeOfDay);
      setTimeOfDay(resume.timeOfDay);
      startRegionId = detectPlayerSpatialContext(resume.x, resume.z).regionId;
      setActiveRegionId(startRegionId);
      resumeClearTimer = window.setTimeout(clearKingdomResume, 1500);
    }

    // 6. RegionManager
    const regionManager = new RegionManager(scene);
    regionManagerRef.current = regionManager;

    regionManager.onStatusChange = (status, progress) => {
      setRegionStatus(status);
      setLoadProgress(progress);
      if (status === 'error') {
        controls.unlockPointer();
      }
    };

    // 可以點的東西（建築、攤位、懸賞牆）：每座島組好後重新收集
    const pickables: THREE.Object3D[] = [];
    const tickers: ((t: number) => void)[] = [];
    const collectPickables = () => {
      pickables.length = 0;
      tickers.length = 0;
      scene.traverse((o) => {
        if (o.userData?.pick || o.userData?.painBoard) pickables.push(o);
        if (typeof o.userData?.tick === 'function') tickers.push(o.userData.tick);
      });
    };
    regionManager.onRegionReady = () => {
      refreshPainBoards();
      collectPickables();
    };
    regionManager.onError = (err) => {
      setErrorMessage(err);
      controls.unlockPointer();
    };

    // Load Initial Region (which also preloads the remaining 4 islands in background)
    regionManager
      .loadRegion(startRegionId)
      .then(() => {
        setErrorMessage(null);
      })
      .catch((err) => {
        console.error('Initial region load error:', err);
      });

    // 7. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Keydown for E Interaction
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.code === 'KeyE') {
        if (nearBuildingRef.current) {
          playSoundEffect('interact');
          openForBuilding(nearBuildingRef.current);
          controls.unlockPointer();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    // 點畫面上的東西 → 左側彈出細節（滑鼠點一下、沒拖曳；鎖定視角時以畫面中央為準）
    const raycaster = new THREE.Raycaster();
    raycaster.far = 70;
    const ndc = new THREE.Vector2();
    const pickAt = (clientX: number | null, clientY: number | null): PickTarget | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (clientX === null || clientY === null) ndc.set(0, 0);
      else ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      for (const h of hits) {
        const t = pickTargetOf(h.object);
        if (!t) continue;
        // 樓板不擋射線：只認玩家所在這一層的懸賞牆與書桌
        if (t.kind === 'painBoard') {
          const tw = towersRef.current.get(t.buildingId);
          if (t.level !== storyRef.current.level + (tw?.lay.basements || 0)) continue;
        }
        if (t.kind === 'desk' && storyRef.current.level !== 0) continue;
        return t;
      }
      return null;
    };
    const tapAt = (clientX: number | null, clientY: number | null) => {
      const t = pickAt(clientX, clientY);
      if (!t) return false;
      playSoundEffect('interact');
      openForTarget(t);
      controls.unlockPointer();
      return true;
    };
    tapRef.current = (x, y) => tapAt(x, y);
    let downAt: { x: number; y: number; t: number } | null = null;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (controls.isLocked) {
        tapAt(null, null);
        return;
      }
      downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e: MouseEvent) => {
      if (!downAt || e.button !== 0) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      const dt = performance.now() - downAt.t;
      downAt = null;
      if (moved < 6 && dt < 450) tapAt(e.clientX, e.clientY);
    };
    let hoverTick = 0;
    const onHover = (e: MouseEvent) => {
      if (controls.isLocked || e.buttons) return;
      const now = performance.now();
      if (now - hoverTick < 120) return;
      hoverTick = now;
      renderer.domElement.style.cursor = pickAt(e.clientX, e.clientY) ? 'pointer' : '';
    };
    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    renderer.domElement.addEventListener('mousemove', onHover);

    // 多人同遊：其他玩家的人偶＋同步自己的位置
    const remoteView = new RemotePlayersView(scene);
    const mp = new KingdomMultiplayer(currentUserNameRef.current, currentUserIdRef.current || 'guest');
    multiplayerRef.current = mp;
    mp.onStatus = (st) => setMpStatus(st);
    mp.onPlayers = (list) => {
      remoteView.setPlayers(list);
      setOnlineOthers(list.length);
    };
    mp.start();

    // 9. Animation & Physics Game Loop
    const clock = new THREE.Clock();
    const globalWalkableZones = getGlobalWalkableZones();
    let lodTick = 14;

    const animate = () => {
      rafIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.08);
      setIsDesktopPointerLocked(controls.isLocked);

      const story = storyRef.current;
      if (story.tween && regionManager.status === 'active') {
        // 上下樓：沿樓梯走一段（約 1.8 秒）
        const tw = story.tween;
        tw.t += delta / tw.dur;
        controls.position.copy(samplePath(tw.pts, Math.min(1, tw.t)));
        controls.updateCameraTransform(delta);
        if (tw.t >= 1) {
          story.level = tw.toLevel;
          story.towerId = tw.toLevel !== 0 ? tw.towerId : null;
          story.tween = null;
          story.armed = false;
          setFloorLevel(story.level);
        }
      } else if (regionManager.status === 'active') {
        // story.level：相對地面的樓層（0＝有大門的地面層，負數是地下）
        const tower = story.level !== 0 && story.towerId ? towersRef.current.get(story.towerId) || null : null;
        const desiredVelocity = controls.getDesiredVelocity();
        const activeColliders = tower ? tower.cols[story.level + tower.lay.basements] || [] : regionManager.getAllColliders();

        const newPos = PhysicsController.movePlayer(
          controls.position,
          desiredVelocity,
          delta,
          activeColliders,
          globalWalkableZones,
          tower ? [] : WORLD_BRIDGES,
          tower ? story.level * FLOOR_H : 0
        );

        controls.position.copy(newPos);
        controls.updateCameraTransform(delta);

        // 多樓層建築：走到樓梯口就上下樓
        {
          const here = tower || (() => {
            const sp = detectPlayerSpatialContext(controls.position.x, controls.position.z);
            return sp.insideBuilding ? towersRef.current.get(sp.insideBuilding.id) || null : null;
          })();
          if (here) {
            const [lx, lz] = toLocal(here.b, controls.position.x, controls.position.z);
            const idx = story.level + here.lay.basements;
            const up = upTrigger(here.lay, idx, lx, lz);
            const down = downTrigger(here.lay, idx, lx, lz);
            if (!up && !down) story.armed = true;
            else if (story.armed) {
              const k = story.level;
              const fh = here.lay.floorH;
              const P = (x: number, z: number, y: number) => {
                const [wx, wz] = toWorld(here.b, x, z);
                return new THREE.Vector3(wx, y, wz);
              };
              const pts = up
                ? [controls.position.clone(), P(up.lx, up.z0 + 0.2, k * fh), P(up.lx, up.z1, (k + 1) * fh), P(up.lx, up.z1 - 1.0, (k + 1) * fh)]
                : [controls.position.clone(), P(down!.lx, down!.z1, k * fh), P(down!.lx, down!.z0, (k - 1) * fh), P(down!.lx, down!.z0 + 1.2, (k - 1) * fh)];
              story.tween = { pts, t: 0, dur: 2.1, toLevel: up ? k + 1 : k - 1, towerId: here.b.id };
              playSoundEffect('interact');
            }
          } else {
            story.armed = true;
          }
        }

        // Detect which island the player is on and whether inside a building
        const spatial = detectPlayerSpatialContext(
          controls.position.x,
          controls.position.z
        );
        regionManager.syncActiveRegionByPosition(spatial.regionId);
        setActiveRegionId(spatial.regionId);

        // Building interaction detection: triggers when inside a main building or right at its front door
        let foundBuilding: BuildingInteractable | null = spatial.insideBuilding;
        if (!foundBuilding) {
          const allBuildings = regionManager.getAllBuildings();
          for (const b of allBuildings) {
            const dist = Math.hypot(
              controls.position.x - b.position.x,
              controls.position.z - b.position.z
            );
            if (dist <= Math.max(b.width, b.depth) * 0.65) {
              foundBuilding = b;
              break;
            }
          }
        }
        // 多樓層建築：提示顯示目前在第幾樓
        if (foundBuilding && towersRef.current.has(foundBuilding.id)) {
          const lvl = story.level;
          const key = `${foundBuilding.id}-${lvl}`;
          let named = floorNameCache.current.get(key);
          if (!named) {
            const bs = towersRef.current.get(foundBuilding.id)?.lay.basements || 0;
            named = { ...foundBuilding, name: `${foundBuilding.name}・${(PAIN_FLOORS[lvl + bs] || PAIN_FLOORS[0]).label}` };
            floorNameCache.current.set(key, named);
          }
          foundBuilding = named;
        }
        nearBuildingRef.current = foundBuilding;
        setNearBuilding(foundBuilding);
      }

      mp.update(controls.position.x, controls.position.y, controls.position.z, controls.yaw);
      const now = performance.now() / 1000;
      for (const tk of tickers) tk(now);
      remoteView.update(delta);

      const dbgY = (window as any).__kingdomCamY;
      if (typeof dbgY === 'number') camera.position.y = dbgY;
      world.update(delta, camera.position);
      if ((lodTick = (lodTick + 1) % 15) === 0) regionManager.updateInteriorLod(camera.position.x, camera.position.z);

      // Render Scene
      if (fancyRef.current) {
        bloom.strength = world.bloomStrength;
        composer.render(delta);
      } else {
        renderer.render(scene, camera);
      }

      // Update Performance Stats
      const stats = perfMonitorRef.current.update(renderer);
      setDevMetrics((prev) => ({
        ...prev,
        fps: stats.fps,
        frameTimeMs: stats.frameTimeMs,
        drawCalls: stats.drawCalls,
        triangles: stats.triangles,
        geometries: stats.geometries,
        textures: stats.textures,
        activeRegionId: regionManager.activeRegionId,
        regionStatus: regionManager.status,
        loadTimeMs: regionManager.loadDurationMs,
        playerPos: {
          x: controls.position.x,
          y: controls.position.y,
          z: controls.position.z,
        },
        yawDeg: THREE.MathUtils.radToDeg(controls.yaw) % 360,
        pitchDeg: THREE.MathUtils.radToDeg(controls.pitch),
        resolutionScale: quality.resolutionScale,
        shadowsEnabled: quality.shadows,
        nearBuilding: nearBuildingRef.current,
        nearPortal: null,
        currentSpaceLabel: '',
      }));
    };

    rafIdRef.current = requestAnimationFrame(animate);

    // 本機開發用：截圖與測試時可直接移動視角、切換時段（正式站不提供）
    if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      (window as any).__kingdom = {
        teleport: (x: number, z: number, yaw: number, pitch = 0) => {
          storyRef.current = { towerId: null, level: 0, armed: true, tween: null };
          controls.setSpawn(new THREE.Vector3(x, 0, z), yaw);
          controls.pitch = pitch;
          controls.updateCameraTransform(0);
        },
        getPos: () => ({ x: controls.position.x, y: controls.position.y, z: controls.position.z, yaw: controls.yaw, level: storyRef.current.level }),
        place: (x: number, z: number, yaw: number) => {
          controls.position.x = x;
          controls.position.z = z;
          controls.yaw = yaw;
        },
        setTimeOfDay: (t: TimeOfDay) => {
          world.setTimeOfDay(t);
          setTimeOfDay(t);
        },
      };
    }

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (resumeClearTimer) window.clearTimeout(resumeClearTimer);
      renderer.domElement.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      renderer.domElement.removeEventListener('mousemove', onHover);
      tapRef.current = null;
      mp.dispose();
      multiplayerRef.current = null;
      remoteView.dispose();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleGlobalKeyDown);

      controls.dispose();
      regionManager.disposeAll();
      world.dispose();
      worldRef.current = null;
      composer.dispose();
      rt.dispose();
      composerRef.current = null;
      if ((window as any).__kingdom) delete (window as any).__kingdom;

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [initialRegionId, playSoundEffect]);

  // 痛點有新增或更新時，懸賞牆跟著換
  useEffect(() => {
    refreshPainBoards();
  }, [questions, refreshPainBoards]);

  // 有新提案或貼文時：主廣場大燈泡閃爍跳躍，並發出清脆音效（剛進來載入資料時不算）
  const mountedAtRef = useRef(Date.now());
  const prevCountRef = useRef(questions.length);
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = questions.length;
    if (questions.length <= prev || prev === 0 || Date.now() - mountedAtRef.current < 6000) return;
    sceneRef.current?.traverse((o) => {
      if (typeof o.userData?.alert === 'function') o.userData.alert();
    });
    playSoundEffect('bulb');
  }, [questions.length, playSoundEffect]);

  // Handle quality settings change
  const handleChangeQuality = (updated: Partial<QualitySettings>) => {
    setQuality((prev) => {
      const next = { ...prev, ...updated };
      if (rendererRef.current && updated.resolutionScale !== undefined) {
        rendererRef.current.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, 1.5) * next.resolutionScale
        );
      }
      if (
        regionManagerRef.current &&
        updated.showColliders !== undefined
      ) {
        regionManagerRef.current.setColliderWireframeVisible(
          Boolean(next.showColliders)
        );
      }
      if (controlsRef.current) {
        controlsRef.current.settings = next;
      }
      return next;
    });
  };

  // Trigger real RegionManager load failure (loading -> error)
  const handleSimulateError = () => {
    if (!regionManagerRef.current || !controlsRef.current) return;
    controlsRef.current.unlockPointer();
    safePlayerPoseRef.current = {
      pos: controlsRef.current.position.clone(),
      yaw: controlsRef.current.yaw,
    };
    const nextTarget: RegionId =
      activeRegionId === 'region-home' ? 'region-career' : 'region-home';
    regionManagerRef.current.triggerSimulatedLoadError(nextTarget);
  };

  // Retry loading the failed region
  const handleRetry = () => {
    if (!regionManagerRef.current) return;
    setErrorMessage(null);

    regionManagerRef.current
      .retry()
      .then((loaded) => {
        const targetId = loaded.manifest.id;
        setActiveRegionId(targetId);
      })
      .catch((err) => {
        setErrorMessage(err?.message || '重試失敗');
      });
  };

  // Safe Return to the intact current/previous region without exiting 3D mode
  const handleSafeReturn = () => {
    if (!regionManagerRef.current) return;
    setErrorMessage(null);

    regionManagerRef.current
      .recoverToSafeRegion()
      .then((safeData) => {
        setActiveRegionId(safeData.manifest.id);
        if (safePlayerPoseRef.current && controlsRef.current) {
          controlsRef.current.setSpawn(
            safePlayerPoseRef.current.pos,
            safePlayerPoseRef.current.yaw
          );
        }
      })
      .catch((err) => {
        setErrorMessage(err?.message || '安全返回失敗');
      });
  };

  const failedRegionId =
    regionManagerRef.current?.failedTargetRegionId || activeRegionId;
  const failedRegionName =
    REGION_CONFIGS[failedRegionId]?.name || failedRegionId;

  const isFastWalk = (quality.moveSpeedMultiplier || 1.0) > 1.2;

  return (
    <div className="relative w-full h-screen bg-stone-950 overflow-hidden select-none font-sans">
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* 載入畫面（水墨風） */}
      {regionStatus === 'loading' && (
        <div className="kx-root absolute inset-0 z-40 flex flex-col items-center justify-center p-6" style={{ background: 'radial-gradient(ellipse at center, #2b1a10 0%, #120a06 75%)' }}>
          <svg viewBox="0 0 120 70" className="w-40 h-24 mb-3 opacity-90" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M ${48 + i * 2} ${54 - i * 9} L ${72 - i * 2} ${54 - i * 9} L ${68 - i * 2} ${50 - i * 9} L ${52 + i * 2} ${50 - i * 9} Z`} fill="#b3261e" stroke="#e2b85a" strokeWidth="0.8" />
            ))}
            <path d="M 0 66 Q 30 50 60 62 T 120 60 L 120 70 L 0 70 Z" fill="rgba(226,184,90,0.18)" />
          </svg>
          <div className="kx-title text-xl sm:text-2xl">創點源・五島</div>
          <div className="kx-sub text-[13px] mt-1">正在搭起樓閣、點亮燈籠…</div>
          <div className="w-60 h-1.5 mt-5 rounded-full overflow-hidden" style={{ background: 'rgba(226,184,90,0.18)' }}>
            <div className="h-full transition-all duration-200" style={{ width: `${Math.max(8, loadProgress)}%`, background: 'linear-gradient(90deg,#b3261e,#e2b85a)' }} />
          </div>
          <div className="kx-sub text-[12px] mt-2 tabular-nums">{loadProgress}%</div>
        </div>
      )}

      {/* 載入失敗：重試或回到原本的島 */}
      {regionStatus === 'error' && (
        <div className="kx-root absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="kx-panel kx-corners max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-300 shrink-0 mt-0.5" />
              <div>
                <h4 className="kx-title text-lg">{failedRegionName} 沒有載入成功</h4>
                <p className="kx-sub text-[13px] mt-1 leading-relaxed">{errorMessage || '分區資產載入逾時或幾何建構中斷'}</p>
                <p className="kx-sub text-[12.5px] mt-2">你目前的位置都還在，可以重試，或先回到原本的島繼續逛。</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={handleExit} className="kx-btn-ghost px-3.5 py-2 text-[13px] cursor-pointer">離開</button>
              <button type="button" onClick={handleSafeReturn} className="kx-btn-ghost px-3.5 py-2 text-[13px] flex items-center gap-1.5 cursor-pointer">
                <ShieldCheck className="w-4 h-4" /> 回到原本的島
              </button>
              <button type="button" onClick={handleRetry} className="kx-btn-primary px-4 py-2 text-[13px] flex items-center gap-1.5 cursor-pointer">
                <RefreshCw className="w-4 h-4" /> 重試
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile & Spatial HUD Overlay */}
      <MobileControlsOverlay
        activeRegionId={activeRegionId}
        playerPos={devMetrics.playerPos}
        yawRad={controlsRef.current?.yaw || 0}
        nearBuilding={nearBuilding}
        nearPortal={nearPortal}
        onSelectRegion={handleSelectRegion}
        onInteract={() => {
          if (nearBuilding) {
            playSoundEffect('interact');
            openForBuilding(nearBuilding);
            controlsRef.current?.unlockPointer();
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleDevStats={() => setIsDevStatsOpen(!isDevStatsOpen)}
        onExit={handleExit}
        onJoystickMove={(vx, vy) => {
          if (controlsRef.current) {
            controlsRef.current.touchStick.active = true;
            controlsRef.current.touchStick.vectorX = vx;
            controlsRef.current.touchStick.vectorY = vy;
          }
        }}
        onJoystickEnd={() => {
          if (controlsRef.current) {
            controlsRef.current.touchStick.active = false;
            controlsRef.current.touchStick.vectorX = 0;
            controlsRef.current.touchStick.vectorY = 0;
          }
        }}
        onTouchLookDelta={(dx, dy) => {
          controlsRef.current?.applyTouchLookDelta(dx, dy);
        }}
        onTapScreen={(x, y) => tapRef.current?.(x, y) ?? false}
        openMapSignal={mapSignal}
        bgmMuted={bgmMuted}
        onToggleBgm={toggleBgm}
        multiplayer={{ status: mpStatus, others: onlineOthers }}
        isDesktopPointerLocked={isDesktopPointerLocked}
        onDesktopRequestLock={() => {
          controlsRef.current?.lockPointer();
        }}
        isFancy={Boolean(quality.fancy)}
        onToggleFancy={() => {
          const next = !quality.fancy;
          fancyRef.current = next;
          worldRef.current?.setShadows(next);
          if (rendererRef.current) {
            rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, next ? 2 : 1.5) * quality.resolutionScale);
            const sz = rendererRef.current.getSize(new THREE.Vector2());
            composerRef.current?.setSize(sz.x, sz.y);
          }
          handleChangeQuality({ fancy: next, shadows: next });
        }}
        placeOverride={floorLevel !== 0 ? `創點樓・${(PAIN_FLOORS[floorLevel + PAIN_BASEMENTS] || PAIN_FLOORS[0]).label}` : undefined}
        timeOfDay={timeOfDay}
        onCycleTimeOfDay={() => {
          const order: TimeOfDay[] = ['day', 'dusk', 'night'];
          const next = order[(order.indexOf(timeOfDay) + 1) % order.length];
          worldRef.current?.setTimeOfDay(next);
          setTimeOfDay(next);
        }}
        isFastWalk={isFastWalk}
        onToggleFastWalk={() => {
          handleChangeQuality({
            moveSpeedMultiplier: isFastWalk ? 1.0 : 1.75,
          });
        }}
      />

      {/* 左側面板：建築介紹與功能按鈕、創點樓各層痛點、市集攤位、內容預覽 */}
      <KingdomSideDrawer
        state={drawer}
        questions={questions}
        onChange={setDrawer}
        onAction={handleDrawerAction}
        soso={{ state: soso, send: sendSoso, search: searchSoso, reset: resetSoso }}
        onOpenQuestion={(q) => {
          rememberPose();
          setDrawer(null);
          onOpenQuestion?.(q);
        }}
        renderQuestionPage={
          renderQuestionPage
            ? (q, back) =>
                renderQuestionPage(q, {
                  back,
                  leave: () => {
                    rememberPose();
                    setDrawer(null);
                  },
                })
            : undefined
        }
      />

      {/* Developer Performance & Spatial Collision Panel */}
      <DevStatsPanel
        metrics={devMetrics}
        quality={quality}
        onChangeQuality={handleChangeQuality}
        onSimulateError={handleSimulateError}
        onRetry={handleRetry}
        isOpen={isDevStatsOpen}
        onClose={() => setIsDevStatsOpen(false)}
      />

      {/* 操作說明 */}
      {isSettingsOpen && (
        <div className="kx-root fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
          <div className="kx-panel kx-corners max-w-md w-full p-5 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="kx-title text-xl">操作說明</h3>
              <button type="button" onClick={() => setIsSettingsOpen(false)} className="kx-round w-8 h-8" aria-label="關閉">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-[13.5px] leading-relaxed">
              <div>
                <p className="kx-title text-[14px] mb-1">電腦</p>
                <p className="kx-sub">WASD／方向鍵移動，Shift 疾走</p>
                <p className="kx-sub">點畫面鎖定滑鼠環顧，E 進入建築</p>
              </div>
              <div>
                <p className="kx-title text-[14px] mb-1">手機、平板</p>
                <p className="kx-sub">左下搖桿移動，右半邊滑動轉視角</p>
                <p className="kx-sub">右上羅盤點開全島地圖，點島瞬移</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setIsSettingsOpen(false)} className="kx-btn-primary px-5 py-2 text-[13.5px] cursor-pointer">
                繼續探索
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirstPersonKingdomView;

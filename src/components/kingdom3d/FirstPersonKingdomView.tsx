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
import { KingdomSideDrawer, DrawerState, findStreetProp, stallItems, hotStallItems } from './KingdomSideDrawer';
import { drawShopCarouselTexture, drawStreetDiscussionBoardTexture, StallContent } from './stylized/streets';
import { useSosoJobs, SosoJob, SosoState } from './useSosoJobs';
import { drawJobScrollTexture, JOBS_PER_SCROLL } from './stylized/jobScroll';
import { pickTargetOf, PickTarget } from './picking';
import { KingdomMultiplayer, RemotePlayersView, MultiplayerStatus, multiplayerConfigured } from './kingdomMultiplayer';
import { moduleUrl, moduleTitle } from './buildingActions';
import { KINGDOM_PANEL_EVENT, KingdomPanelDetail } from '../../utils/kingdomPanel';
import { playTempleBell } from '../../utils/templeBell';
import type { KingdomAction } from './buildingActions';
import { trackFeature } from '../../services/featureUsage';
import { addEasterEgg, loadEasterEggBook, onEasterEggBookChange, EasterEggRecord } from '../island/easterEggBook';
import { eggVerse, EggId } from './eggs';
import { KingdomEggButton, KingdomEggToast, KingdomEggBookModal } from './KingdomEggBook';
import { BondService } from './bonds';
import { loadQuests, saveQuests, stepQuests, QuestProgress, DUO_QUESTS } from './quests';
import { KingdomQuestButton, KingdomQuestPanel, BondInviteBanner } from './KingdomQuestPanel';
import { kingdomAmbience } from './ambience';
import { faunaEnv } from './stylized/fauna';
import { ancientJiangnanBgm } from '../../utils/ancientBgm';
import { DevStatsPanel } from './DevStatsPanel';
import { painForFloor } from './PainFloorModal';
import { getStoryLayout, levelColliders, upTrigger, downTrigger, toLocal, toWorld, FLOOR_H, StoryLayout } from './stylized/multiStory';
import { RING, ringLevelColliders, ringStair, insideRing } from './stylized/tulou';
import {
  HALL_BUILDINGS,
  HALL_ZONES,
  hallOf,
  hallArrival,
  hallZoneItems,
  drawBoothTexture,
  drawZoneSignTexture,
  isFloorsHall,
  hallFloorCount,
  hallFloorY,
  DEEP_SLOTS,
  mediaOf,
  loadMediaTexture,
  drawDeepBoothTexture,
  drawNameplateTexture,
  drawFloorPlaqueTexture,
  DeepBoothSpot,
} from './stylized/exhibitHall';
import { LIB_TOWER, atLibraryDoor } from './stylized/libraryTower';
import { atLibraryExit, LIB_HALL, LIB_STAIR, libStairHeights } from './stylized/libraryInterior';
import { GARDEN_ARCH_BRIDGE } from './stylized/careerGarden';
import { reportXp } from '../../services/xpService';
import { XP_ISLANDS, XP_VENUES } from '../../data/xpRules';

const LIBRARY_ID = 'discussion-library';
// 走路用的拱橋高度：五座大拱橋＋徵才島庭園的石拱橋
const MOVE_BRIDGES = [...WORLD_BRIDGES, GARDEN_ARCH_BRIDGE as unknown as (typeof WORLD_BRIDGES)[number]];
import { lobbyPit, inLobbyStairTop, drawScreenCaption, drawRankBoard } from './stylized/hallLobby';
import { useShowcaseSlides } from '../HomeShowcasePlayer';
import { drawHomeBoardTexture } from './stylized/noticeBoard';
import { drawSteleTexture, plazaTopics, drawWallBoardTexture, WallBoardWhich } from './stylized/discussionPlaza';
import { DOCKS, findDock, nearestDock, TRAIL, PLATEAU_COLLIDERS } from './stylized/docks';
import { navigable, sampanBoat, pleasureBoat, boatMats, boatHasRoof } from './stylized/waterLife';
import { BoatingService, MAX_BOATS, OFFER_SECONDS, BoatSlot } from './boating';
import type { WalkableZone } from './types';
import { BoatOverlay } from './BoatOverlay';
import { nearestReachable, waterProximity } from './nearestSpot';
import { getFeaturedGames, getFeaturedProposalsAndSoftware, getHotRankedGames, getHotRankedProposalsAndSoftware } from '../../data/hotGamesData';
import { FloorDirectory, FloorEntry } from './FloorDirectory';
import { drawPainBoardTexture, PAIN_FLOORS, PainBoardLayout } from './stylized/painBoard';
import { useApp } from '../../context/AppContext';
import { fetchCityWeather, getCityConfig, getStoredUserCityId, getCityLocalTimePhase } from '../../data/cityData';
import type { TimeMode, WeatherMode } from './EnvControls';
import type { Question } from '../../types';
import type { Collider } from './types';
import { StylizedWorld, TimeOfDay } from './stylized/environment';
import { setTextureAnisotropy, petalTexture } from './stylized/textures';
import { peekKingdomResume, saveKingdomResume, clearKingdomResume } from './kingdomResume';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

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
  onSwitchToIslandMap?: () => void;
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

/** 多樓層建築：各層碰撞，與「站在樓梯口時要怎麼走」 */
type Tower = {
  b: BuildingInteractable;
  basements: number;
  cols: Collider[][];
  stair: (level: number, x: number, z: number, from: THREE.Vector3) => { pts: THREE.Vector3[]; toLevel: number; hallEnter?: boolean } | null;
  /** 各層地板高度（沒有就是 level × 4.5 m） */
  floorY?: (level: number) => number;
  /** 這座「樓」自己的可走範圍（例如山上的塔外空地、塔頂） */
  walk?: (level: number) => WalkableZone[];
};

/** 西側塔樓山台（從痛點島登山口直上）：當成一座只有「樓上」的樓 */
const PLATEAU_ID = 'plateau-pagoda';
const PLATEAU_B: BuildingInteractable = {
  id: PLATEAU_ID,
  name: '聚雲塔山台',
  subtitle: '西側平頂山台・五層聚雲塔與塔外空地',
  position: new THREE.Vector3(TRAIL.plateauX, 0, TRAIL.plateauZ),
  facingYaw: 0,
  width: 22,
  depth: 22,
  height: 30,
  colorHex: 0x7c5a3a,
  interactionRadius: 8,
  description: '西側的平頂山台，五層聚雲塔立在山頂（山頂常有雲停留），塔外的空地可以眺望五座島與整片湖面。點山上的「下山」石碑就能回到痛點島的登山口。',
  targetModule: '',
  previewBadge: '聚雲塔山台',
  previewFeatures: ['從痛點島西岸的「聚雲塔登山口」一點直上', '塔外空地眺望五島與湖面', '「下山」石碑回到登山口'],
  mockData: { stats: '海拔約 30 公尺', notice: '山上風大，慢慢逛。', primaryActionLabel: '聚雲塔山台' },
} as unknown as BuildingInteractable;

function plateauTower(): Tower {
  return {
    b: PLATEAU_B,
    basements: 0,
    cols: [[], PLATEAU_COLLIDERS, []],
    floorY: (level) => (level >= 2 ? TRAIL.topFloorY : level > 0 ? TRAIL.topY : 0),
    stair: () => null,
    walk: (level) =>
      level >= 2
        ? [{ type: 'ellipse', cx: TRAIL.pagodaX, cz: TRAIL.pagodaZ, rx: 1.3, rz: 1.3 }]
        : [{ type: 'ellipse', cx: TRAIL.plateauX, cz: TRAIL.plateauZ, rx: TRAIL.plateauR, rz: TRAIL.plateauR }],
  };
}

/** 船上兩個座位（船的本地座標：船頭朝 -Z；船尾有戴斗笠的船夫搖櫓）：前座掌舵、後座乘客，玩家是坐著的視角 */
const BOAT_SEATS = { owner: new THREE.Vector3(0, 0, 0.55), passenger: new THREE.Vector3(0, 0, -0.75) };
/** 坐在船裡：視線比站著低（約離水面 1.2 公尺） */
const BOAT_SIT_Y = -0.42;

function rectTower(b: BuildingInteractable, lay: StoryLayout): Tower {
  return {
    b,
    basements: lay.basements,
    cols: Array.from({ length: lay.floors }, (_, k) => levelColliders(b, lay, k)),
    stair: (rel, x, z, from) => {
      const [lx, lz] = toLocal(b, x, z);
      const idx = rel + lay.basements;
      const up = upTrigger(lay, idx, lx, lz);
      const down = downTrigger(lay, idx, lx, lz);
      if (!up && !down) return null;
      const fh = lay.floorH;
      const P = (px: number, pz: number, y: number) => {
        const [wx, wz] = toWorld(b, px, pz);
        return new THREE.Vector3(wx, y, wz);
      };
      return up
        ? { pts: [from.clone(), P(up.lx, up.z0 + 0.2, rel * fh), P(up.lx, up.z1, (rel + 1) * fh), P(up.lx, up.z1 - 1.0, (rel + 1) * fh)], toLevel: rel + 1 }
        : { pts: [from.clone(), P(down!.lx, down!.z1, rel * fh), P(down!.lx, down!.z0, (rel - 1) * fh), P(down!.lx, down!.z0 + 1.2, (rel - 1) * fh)], toLevel: rel - 1 };
    },
  };
}

/** 圓形土樓：一樓用島上的碰撞，二、三樓用環形迴廊的碰撞 */
function ringTower(b: BuildingInteractable): Tower {
  return {
    b,
    basements: 0,
    cols: Array.from({ length: RING.floors }, (_, k) => (k === 0 ? [] : ringLevelColliders(b, k))),
    stair: (rel, x, z, from) => (insideRing(b, x, z) ? ringStair(b, rel, x, z, from) : null),
  };
}
/**
 * 地下展場：
 * - 展覽館、電玩城：地下每一層是一類展場（共用同一座挑高展廳，碰撞相同）；一樓走進大樓梯口就往下走
 * - 藏書閣：地下一樓圖書館，靠點下樓口／樓層表進出
 */
function hallTower(b: BuildingInteractable): Tower {
  const n = hallFloorCount(b.id);
  const floors = isFloorsHall(b.id);
  return {
    b,
    basements: n,
    cols: Array.from({ length: n }, () => []),
    floorY: (level) => hallFloorY(b.id, level),
    stair: (rel, x, z, from) => {
      if (!floors || rel !== 0) return null;
      const [lx, lz] = toLocal(b, x, z);
      if (!inLobbyStairTop(b, lx, lz)) return null;
      const p = lobbyPit(b);
      const P = (px: number, pz: number, y: number) => {
        const [wx, wz] = toWorld(b, px, pz);
        return new THREE.Vector3(wx, y, wz);
      };
      const sx = Math.max(p.x0 + 0.6, Math.min(p.x1 - 0.6, lx));
      return { pts: [from.clone(), P(sx, p.zTop - 0.4, -0.2), P(sx * 0.5, p.zBot + 1.0, -p.depth + 0.4)], toLevel: -1, hallEnter: true };
    },
  };
}

/** 樓層顯示名稱（左上角地點、靠近時的提示） */
function floorLabel(b: BuildingInteractable, level: number) {
  if (b.id === PLATEAU_ID) return level >= 2 ? '塔頂眺望' : '';
  if (b.exterior === 'tulou') return (PAIN_FLOORS[level] || PAIN_FLOORS[0]).label;
  const h = hallOf(b.id);
  if (h && h.mode === 'floors' && level < 0) {
    const z = HALL_ZONES[h.kind][-level - 1];
    return `B${-level}・${z ? z.name : '展場'}`;
  }
  if (h) return level < 0 ? (h.kind === 'library' ? '書海' : '地下主展場') : h.lobby;
  return '';
}

/** 樓層表上要列出的建築 */
const hasDirectory = (b: BuildingInteractable | null | undefined) => Boolean(b && (b.exterior === 'tulou' || hallOf(b.id)));

type StoryState = {
  towerId: string | null;
  level: number;
  armed: boolean;
  tween: null | { pts: THREE.Vector3[]; t: number; dur: number; toLevel: number; towerId: string; hallEnter?: boolean };
};

const BOOTHS_PER_ZONE = 16;

const REGION_BUILDINGS = new Map<string, BuildingInteractable>([
  ...Object.values(REGION_CONFIGS).flatMap((r) => r.buildings.map((b) => [b.id, b] as [string, BuildingInteractable])),
  [PLATEAU_ID, PLATEAU_B],
]);

/** 攤位圖片面板：顯示第 slide 張（載入完才換上；載不到就維持原樣） */
function showBoothMedia(media: THREE.Mesh, slide: number) {
  const imgs = (media.userData.images || []) as string[];
  if (!imgs.length) {
    media.visible = false;
    media.userData.want = '';
    return;
  }
  const url = imgs[slide % imgs.length];
  media.userData.want = url;
  loadMediaTexture(url).then((t) => {
    if (media.userData.want !== url || !t) return;
    const mat = media.material as THREE.MeshBasicMaterial;
    mat.map = t;
    mat.needsUpdate = true;
    media.visible = true;
  });
}

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
  onSwitchToIslandMap,
  onNavigateToModule,
  onOpenQuestion,
  initialRegionId = 'region-home',
  renderQuestionPage,
}) => {
  const { questions, currentUser, homeShowcaseConfig } = useApp();
  // 展覽館（提案與軟體）、電玩城（遊戲）一樓：和首頁同一份精選榜、熱度榜
  const slidesGames = useShowcaseSlides('games');
  const slidesProposals = useShowcaseSlides('proposals_software');
  const rankings = React.useMemo(() => {
    const out: Record<string, { featured: Question[]; hot: Question[]; slides: { q: Question; badge: string }[] }> = {};
    for (const [id, h] of Object.entries(HALL_BUILDINGS)) {
      if (!h.showcase) continue;
      const games = h.showcase === 'games';
      const featured: Question[] = [];
      const seen = new Set<string>();
      for (const sl of games ? slidesGames : slidesProposals) {
        if (featured.length >= 10) break;
        if (!seen.has(sl.q.id)) {
          seen.add(sl.q.id);
          featured.push(sl.q);
        }
      }
      for (const it of games ? getFeaturedGames(questions) : getFeaturedProposalsAndSoftware(questions)) {
        if (featured.length >= 10) break;
        if (!seen.has(it.question.id)) {
          seen.add(it.question.id);
          featured.push(it.question);
        }
      }
      const cfg = homeShowcaseConfig || ({} as any);
      const hot = (
        games
          ? getHotRankedGames(questions, cfg.hotGamesMode || 'custom', cfg.hotGameIds || [])
          : getHotRankedProposalsAndSoftware(questions, cfg.hotProposalsMode || 'custom', cfg.hotProposalIds || [])
      ).map((x) => x.question);
      // 大螢幕：精選、熱度交錯輪播（同一件只播一次）
      const slides: { q: Question; badge: string }[] = [];
      const shown = new Set<string>();
      for (let i = 0; i < 10; i++) {
        for (const [list, name] of [[featured, '精選榜'], [hot, '熱度榜']] as [Question[], string][]) {
          const q = list[i];
          if (q && !shown.has(q.id)) {
            shown.add(q.id);
            slides.push({ q, badge: `${name} 第 ${i + 1} 名` });
          }
        }
      }
      out[id] = { featured, hot, slides };
    }
    return out;
  }, [questions, homeShowcaseConfig, slidesGames, slidesProposals]);
  const questionsRef = useRef<Question[]>(questions);
  questionsRef.current = questions;
  const storyRef = useRef<StoryState>({ towerId: null, level: 0, armed: true, tween: null });
  const [floorLevel, setFloorLevel] = useState(0);
  const [storyTowerId, setStoryTowerId] = useState<string | null>(null);
  // 左側面板（照 /island：點畫面上的建築、攤位、懸賞牆，細節在左側彈出）
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  // ── 彩蛋收集冊（和 3D 地圖同一本） ──
  const [eggList, setEggList] = useState<EasterEggRecord[]>(() => loadEasterEggBook());
  useEffect(() => onEasterEggBookChange(setEggList), []);
  const [eggBookOpen, setEggBookOpen] = useState(false);
  const [eggToast, setEggToast] = useState<{ verse: string; slotIndex: number; added: boolean; key: number; header?: string } | null>(null);
  const eggTimerRef = useRef<number | null>(null);
  const triggerEggRef = useRef<(egg: EggId, id?: string) => void>(() => {});
  triggerEggRef.current = (egg, id) => {
    const verse = eggVerse(egg, { night: faunaEnv.tod === 'night', clear: faunaEnv.weather === 'clear', id });
    const r = addEasterEgg(verse);
    if (!r) return;
    // 「夜半鐘聲到客船」：響起寺廟鐘聲（每次點到都會響）
    if (r.verse.includes('夜半鐘聲')) playTempleBell();
    if (r.added) {
      setEggList(r.list);
      if (!r.verse.includes('夜半鐘聲')) playSoundEffect('bulb');
    }
    setEggToast({ verse: r.verse, slotIndex: r.slotIndex, added: r.added, key: Date.now() });
    if (eggTimerRef.current) window.clearTimeout(eggTimerRef.current);
    eggTimerRef.current = window.setTimeout(() => setEggToast(null), r.added ? 5200 : 3200);
  };
  useEffect(() => () => {
    if (eggTimerRef.current) window.clearTimeout(eggTimerRef.current);
  }, []);
  /** 雙人任務完成：畫面上方跳提示 */
  const questDoneRef = useRef<(title: string, partner: string) => void>(() => {});
  questDoneRef.current = (title, partner) => {
    playSoundEffect('bulb');
    setEggToast({ header: '✦ 雙人任務完成', verse: `${title}（和 ${partner}）`, slotIndex: 0, added: true, key: Date.now() });
    if (eggTimerRef.current) window.clearTimeout(eggTimerRef.current);
    eggTimerRef.current = window.setTimeout(() => setEggToast(null), 5200);
  };
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
  const remoteViewRef = useRef<RemotePlayersView | null>(null);
  // ── 羈絆與任務清單 ──
  const bondsRef = useRef<BondService>(new BondService());
  const [, setBondTick] = useState(0);
  const [questOpen, setQuestOpen] = useState(false);
  const [quests, setQuests] = useState<QuestProgress>(() => loadQuests());
  const questsRef = useRef(quests);
  questsRef.current = quests;
  const [partnerOnline, setPartnerOnline] = useState(false);
  const openForBuilding = useCallback((b: BuildingInteractable) => {
    // 地下展場裡靠近攤位：按 E 直接看那個攤位
    if (b.id === 'hall-booth' && nearBoothRef.current) {
      const nb = nearBoothRef.current;
      openForTargetRef.current?.({ kind: 'booth', buildingId: nb.buildingId, zone: -1, index: nb.index });
      return;
    }
    if (b.exterior === 'tulou' && towersRef.current.has(b.id)) {
      // story.level 是相對地面的樓層（0＝地面層、-1＝地下一樓）；懸賞牆的樓層編號要加上地下層數
      const tw = towersRef.current.get(b.id)!;
      const inside = storyRef.current.towerId === b.id || storyRef.current.level !== 0;
      setDrawer(inside ? { kind: 'painFloor', level: storyRef.current.level + tw.basements } : { kind: 'building', building: (REGION_BUILDINGS.get(b.id) || b) });
    } else if (hallOf(b.id) && storyRef.current.level < 0 && storyRef.current.towerId === b.id) {
      setDrawer({ kind: 'hallZone', buildingId: b.id, zone: isFloorsHall(b.id) ? -storyRef.current.level - 1 : 0 });
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
      triggerEggRef.current('soso');
    } else if (t.kind === 'player') {
      setDrawer({ kind: 'player', id: t.id, name: remoteViewRef.current?.nameOf(t.id) || '旅人' });
    } else if (t.kind === 'egg') {
      triggerEggRef.current(t.egg, t.id);
    } else if (t.kind === 'bulb') {
      // 大燈泡自己算一格彩蛋（散步的小燈泡是另一格）
      triggerEggRef.current('bigBulb');
      sceneRef.current?.traverse((o) => {
        if (typeof o.userData?.celebrate === 'function') o.userData.celebrate(cameraRef.current?.position.x, cameraRef.current?.position.z);
      });
    } else if (t.kind === 'feature') {
      setDrawer({ kind: 'feature', id: t.id });
    } else if (t.kind === 'jobScroll') {
      setDrawer({ kind: sosoJobsCountRef.current > 0 ? 'jobs' : 'soso' });
    } else if (t.kind === 'booth') {
      // 展覽館、電玩城：所在樓層就是展區
      const floors = isFloorsHall(t.buildingId);
      const zone = floors ? Math.max(0, -storyRef.current.level - 1) : t.zone;
      const slots = floors ? DEEP_SLOTS : BOOTHS_PER_ZONE;
      const items = hallZoneItems(t.buildingId, zone, questionsRef.current);
      const zoneState: DrawerState = { kind: 'hallZone', buildingId: t.buildingId, zone };
      const q = t.index < slots - 1 || items.length <= slots ? items[t.index] : null;
      setDrawer(q ? { kind: 'question', question: q, back: zoneState } : zoneState);
    } else if (t.kind === 'goFloor') {
      goFloorRef.current?.(t.buildingId, t.level);
    } else if (t.kind === 'dock') {
      setBoatDock(t.id);
    } else if (t.kind === 'trail') {
      goTrailRef.current?.(t.dir);
    } else if (t.kind === 'character') {
      setDrawer({ kind: 'character', id: t.id });
      triggerEggRef.current(t.id === 'sousou' ? 'soso' : t.id === 'xiaodengpao' ? 'bulb' : t.id);
    } else if (t.kind === 'discStele') {
      setDrawer({ kind: 'discList', which: t.which });
    } else if (t.kind === 'lobbyRank') {
      setDrawer({ kind: 'hallRank', buildingId: t.buildingId, which: t.which });
    } else if (t.kind === 'lobbyScreen') {
      const cur = lobbyScreenCurrentRef.current.get(t.buildingId);
      setDrawer(cur ? { kind: 'question', question: cur, back: { kind: 'hallRank', buildingId: t.buildingId, which: 'featured' } } : { kind: 'hallRank', buildingId: t.buildingId, which: 'featured' });
    }
  }, []);
  const openForTargetRef = useRef<((t: PickTarget) => void) | null>(null);
  const goToPointRef = useRef<((x: number, z: number) => void) | null>(null);
  const goTrailRef = useRef<((dir: 'up' | 'down' | 'top' | 'down-top') => void) | null>(null);
  // 遊湖乘船
  const [boatDock, setBoatDock] = useState<string | null>(null);
  const [boatTick, setBoatTick] = useState(0);
  const [riding, setRiding] = useState<null | { role: 'owner' | 'passenger'; owner?: string }>(null);
  const boatingRef = useRef<BoatingService>(new BoatingService());
  const queuedDockRef = useRef<string | null>(null);
  const boatRideRef = useRef<null | { role: 'owner' | 'passenger'; slot: number; x: number; z: number; yaw: number; speed: number; dockId: string }>(null);
  const boardBoatRef = useRef<((dockId: string, join?: BoatSlot | null) => Promise<void>) | null>(null);
  const leaveBoatRef = useRef<(() => void) | null>(null);
  openForTargetRef.current = openForTarget;
  const nearBoothRef = useRef<{ buildingId: string; index: number } | null>(null);
  const lobbyScreenCurrentRef = useRef<Map<string, Question>>(new Map());
  const goFloorRef = useRef<((buildingId: string, level: number, zone?: number) => void) | null>(null);
  // 藏書閣大門／書廳出口的觸發（離開觸發點後才重新上膛，避免一傳送就又被傳回去）
  const libDoorArmedRef = useRef(true);
  const libExitArmedRef = useRef(false);
  // 藏書閣螺旋梯：目前腳下離書廳地板多高
  const libStairHRef = useRef(0);
  // 小燈泡照明：按 F 或點【照明(F)】呼喚，拿在手上照亮四周
  const [bulbOn, setBulbOn] = useState(false);
  const bulbOnRef = useRef(false);
  const [darkHint, setDarkHint] = useState(false);
  const darkHintRef = useRef(false);
  const toggleBulb = useCallback(() => {
    bulbOnRef.current = !bulbOnRef.current;
    setBulbOn(bulbOnRef.current);
    playSoundEffect('interact');
    if (bulbOnRef.current) triggerEggRef.current?.('bulb');
  }, []);
  const toggleBulbRef = useRef(toggleBulb);
  toggleBulbRef.current = toggleBulb;
  // 坐下（C）：視線降低、原地坐著；一走動就站起來。和羈絆一起坐在桃樹下會落桃花（雙人任務）
  const [sitting, setSitting] = useState(false);
  const sitRef = useRef(false);
  const toggleSit = useCallback(() => {
    if (boatRideRef.current) return;
    sitRef.current = !sitRef.current;
    setSitting(sitRef.current);
  }, []);
  const toggleSitRef = useRef(toggleSit);
  toggleSitRef.current = toggleSit;
  // Q：對準目的地近距離瞬移（實作在場景建好之後）
  const blinkRef = useRef<() => void>(() => {});
  const towersRef = useRef<Map<string, Tower>>(new Map());
  if (towersRef.current.size === 0) {
    towersRef.current.set(PLATEAU_ID, plateauTower());
    for (const r of Object.values(REGION_CONFIGS)) {
      for (const b of r.buildings) {
        if (b.exterior === 'tulou') {
          towersRef.current.set(b.id, ringTower(b));
          continue;
        }
        if (hallOf(b.id)) {
          towersRef.current.set(b.id, hallTower(b));
          continue;
        }
        const lay = getStoryLayout(b);
        if (lay) towersRef.current.set(b.id, rectTower(b, lay));
      }
    }
  }
  const floorNameCache = useRef<Map<string, BuildingInteractable>>(new Map());
  /** 地下主展場：每個攤位擺一件真實作品，展區招牌顯示件數 */
  const refreshHallBooths = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const cache = new Map<string, Question[]>();
    const itemsOf = (bid: string, zone: number) => {
      const k = `${bid}#${zone}`;
      if (!cache.has(k)) cache.set(k, hallZoneItems(bid, zone, questionsRef.current));
      return cache.get(k)!;
    };
    scene.traverse((o) => {
      const booth = o.userData?.hallBooth as { buildingId: string; zone: number; index: number } | undefined;
      const sign = o.userData?.hallSign as { buildingId: string; zone: number } | undefined;
      if (!booth && !sign) return;
      const info = (booth || sign)!;
      const h = hallOf(info.buildingId);
      const zone = h && HALL_ZONES[h.kind][info.zone];
      if (!zone) return;
      const items = itemsOf(info.buildingId, info.zone);
      const mat = (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
      let key: string;
      let draw: () => THREE.Texture;
      if (booth) {
        // 最後一個攤位：作品太多時改成「還有 N 件」
        const overflow = booth.index === BOOTHS_PER_ZONE - 1 && items.length > BOOTHS_PER_ZONE;
        const q = items[booth.index] || null;
        const more = overflow ? items.length - (BOOTHS_PER_ZONE - 1) : 0;
        key = q ? `${q.id}|${q.title}|${q.viewsCount ?? q.views ?? 0}|${more}` : 'empty';
        draw = () => drawBoothTexture(zone.name, zone.color, q, more);
      } else {
        key = `n${items.length}`;
        draw = () => drawZoneSignTexture(zone.name, items.length, zone.color);
      }
      if (o.userData.drawnKey === key) return;
      o.userData.drawnKey = key;
      const old = mat.map;
      mat.map = draw();
      mat.needsUpdate = true;
      old?.dispose();
    });
  }, []);
  /**
   * 展覽館、電玩城的地下展廳：依所在樓層（展區）擺上作品
   * 看板（名稱／簡述）、圖片（多張輪播）、攤主姓名牌、北牆樓層大匾
   */
  const refreshDeepHalls = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.traverse((o) => {
      const id = o.userData?.hallId as string | undefined;
      if (!id || !isFloorsHall(id)) return;
      const h = hallOf(id)!;
      const st = storyRef.current;
      const zone = st.towerId === id && st.level < 0 ? -st.level - 1 : o.userData.currentZone || 0;
      o.userData.currentZone = zone;
      const z = HALL_ZONES[h.kind][zone];
      if (!z) return;
      const items = hallZoneItems(id, zone, questionsRef.current);
      // 收集攤位零件（只做一次）
      if (!o.userData.parts) {
        const cards: THREE.Mesh[] = [];
        const media: THREE.Mesh[] = [];
        const plates: THREE.Mesh[] = [];
        let plaque: THREE.Mesh | null = null;
        o.traverse((c) => {
          if (c.userData?.hallBooth) cards[c.userData.hallBooth.index] = c as THREE.Mesh;
          if (c.userData?.boothMedia) media[c.userData.boothMedia.index] = c as THREE.Mesh;
          if (c.userData?.boothPlate) plates[c.userData.boothPlate.index] = c as THREE.Mesh;
          if (c.userData?.hallFloorSign) plaque = c as THREE.Mesh;
        });
        o.userData.parts = { cards, media, plates, plaque };
      }
      const parts = o.userData.parts as { cards: THREE.Mesh[]; media: THREE.Mesh[]; plates: THREE.Mesh[]; plaque: THREE.Mesh | null };
      const zoneMat = o.userData.zoneMat as THREE.MeshStandardMaterial | undefined;
      if (zoneMat && zoneMat.userData.zone !== zone) {
        zoneMat.color.setHex(z.color);
        zoneMat.emissive.setHex(z.color);
        zoneMat.userData.zone = zone;
      }
      const setMap = (m: THREE.Mesh, key: string, draw: () => THREE.Texture) => {
        if (m.userData.drawnKey === key) return;
        m.userData.drawnKey = key;
        const mat = m.material as THREE.MeshBasicMaterial;
        const old = mat.map;
        mat.map = draw();
        mat.needsUpdate = true;
        old?.dispose();
      };
      if (parts.plaque) setMap(parts.plaque, `${zone}|${items.length}`, () => drawFloorPlaqueTexture(`B${zone + 1}`, z.name, z.sub, items.length, z.color));
      const titles: string[] = [];
      const overflow = items.length > DEEP_SLOTS;
      for (let i = 0; i < DEEP_SLOTS; i++) {
        const card = parts.cards[i];
        if (!card) continue;
        const isMore = overflow && i === DEEP_SLOTS - 1;
        const q = isMore ? null : items[i] || null;
        const more = isMore ? items.length - (DEEP_SLOTS - 1) : 0;
        const md = q ? mediaOf(q) : { images: [], video: false };
        titles[i] = q ? ((q as any).appName || q.title || '').trim() : isMore ? `本層還有 ${more} 件` : '';
        setMap(card, q ? `${zone}|${q.id}|${q.title}|${(q.description || '').length}|${md.images.length}|${md.video}` : `${zone}|${more ? `more${more}` : 'empty'}`, () =>
          drawDeepBoothTexture(z.color, q, { more, video: md.video, hasMedia: false, slides: md.images.length })
        );
        // 圖片（多張時輪播）
        const media = parts.media[i];
        if (media) {
          const key = q ? `${q.id}|${md.images.join(',')}` : '';
          if (media.userData.mediaKey !== key) {
            media.userData.mediaKey = key;
            media.userData.images = md.images;
            media.userData.slide = 0;
            media.visible = false;
            showBoothMedia(media, 0);
          }
        }
        // 攤主姓名牌
        const plate = parts.plates[i];
        if (plate) {
          plate.visible = Boolean(q);
          if (q) setMap(plate, `${q.authorName}|${q.postType}`, () => drawNameplateTexture(q.authorName || '—', q.postType === 'innovation_proposal' ? '提案人' : '攤主'));
        }
      }
      o.userData.boothTitles = titles;
    });
  }, []);
  const refreshDeepHallsRef = useRef<() => void>(() => {});
  refreshDeepHallsRef.current = refreshDeepHalls;

  /** 一樓大廳：精選榜、熱度榜看板與大螢幕輪播 */
  const rankingsRef = useRef<Record<string, { featured: Question[]; hot: Question[]; slides: { q: Question; badge: string }[] }>>({});
  const lobbySlideRef = useRef<Record<string, number>>({});
  const refreshLobbies = useCallback((advance = false) => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.traverse((o) => {
      const rank = o.userData?.lobbyRank as { buildingId: string; which: 'featured' | 'hot' } | undefined;
      const cap = o.userData?.lobbyScreenCaption as { buildingId: string } | undefined;
      const img = o.userData?.lobbyScreenImage as { buildingId: string } | undefined;
      if (!rank && !cap && !img) return;
      const id = (rank || cap || img)!.buildingId;
      const r = rankingsRef.current[id];
      const games = hallOf(id)?.showcase === 'games';
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (rank) {
        const list = (rank.which === 'featured' ? r?.featured : r?.hot) || [];
        const key = list.map((q) => q.id).join(',');
        if (mesh.userData.drawnKey === key) return;
        mesh.userData.drawnKey = key;
        const old = mat.map;
        mat.map = drawRankBoard(rank.which === 'featured' ? '精選榜' : '熱度榜', games ? '遊戲 TOP 10' : '提案與軟體 TOP 10', list, games, rank.which === 'featured' ? '#9a6a12' : '#8e2420');
        mat.needsUpdate = true;
        old?.dispose();
        return;
      }
      const slides = r?.slides || [];
      const idx = slides.length ? (lobbySlideRef.current[id] || 0) % slides.length : 0;
      const cur = slides[idx];
      if (cur) lobbyScreenCurrentRef.current.set(id, cur.q);
      if (cap) {
        const key = `${idx}|${cur?.q.id || ''}|${slides.length}`;
        if (mesh.userData.drawnKey === key) return;
        mesh.userData.drawnKey = key;
        const old = mat.map;
        mat.map = drawScreenCaption(cur?.q || null, games, idx, slides.length, cur?.badge || '');
        mat.needsUpdate = true;
        old?.dispose();
      } else if (img) {
        const url = cur ? mediaOf(cur.q).images[0] || '' : '';
        if (mesh.userData.url === url) return;
        mesh.userData.url = url;
        if (!url) {
          mat.map = null;
          mat.color.setHex(0x2a1a10);
          mat.needsUpdate = true;
          return;
        }
        loadMediaTexture(url).then((t) => {
          if (mesh.userData.url !== url) return;
          mat.map = t;
          mat.color.setHex(t ? 0xffffff : 0x2a1a10);
          mat.needsUpdate = true;
        });
      }
    });
    void advance;
  }, []);
  const refreshLobbiesRef = useRef<() => void>(() => {});
  refreshLobbiesRef.current = refreshLobbies;

  /** 主島探索看板佈告欄：張貼全站最新內容 */
  const refreshHomeBoardsRef = useRef<() => void>(() => {});
  refreshHomeBoardsRef.current = () => {
    sceneRef.current?.traverse((o) => {
      if (o.userData?.homeBoard !== 'home-explore') return;
      const qs = questionsRef.current;
      const key = qs
        .slice()
        .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
        .slice(0, 6)
        .map((q) => q.id)
        .join(',');
      if (o.userData.drawnKey === key) return;
      o.userData.drawnKey = key;
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const tex = drawHomeBoardTexture('home-explore', qs);
      const old = mat.map;
      mat.map = tex;
      mat.emissiveMap = tex;
      mat.needsUpdate = true;
      old?.dispose();
    });
  };

  /** 討論島論道廣場的兩座議題碑：刻上真實討論（熱門／最新） */
  const refreshPlazaStelesRef = useRef<() => void>(() => {});
  refreshPlazaStelesRef.current = () => {
    sceneRef.current?.traverse((o) => {
      const which = o.userData?.plazaStele as 'hot' | 'new' | undefined;
      if (!which) return;
      const list = plazaTopics(questionsRef.current, which).slice(0, 7);
      const key = list.map((q) => `${q.id}:${q.title}`).join(',');
      if (o.userData.drawnKey === key) return;
      o.userData.drawnKey = key;
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const tex = drawSteleTexture(which, list);
      const old = mat.map;
      mat.map = tex;
      mat.emissiveMap = tex;
      mat.needsUpdate = true;
      old?.dispose();
    });
  };

  /** 創點樓各層懸賞牆：換上真實痛點（正反面與迴廊各面佈告欄皆能張貼展示） */
  const refreshPainBoards = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.traverse((o) => {
      const info = o.userData?.painBoard as { level: number; offset?: number; count?: number; layout?: PainBoardLayout } | undefined;
      if (!info) return;
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const off = info.offset || 0;
      const cnt = info.count || 8;
      const all = painForFloor(questionsRef.current, info.level);
      const picked =
        all.length > 0
          ? Array.from({ length: Math.min(cnt, all.length) }, (_, i) => all[(off + i) % all.length])
          : [];
      const cards = picked.map((q) => ({ id: q.id, title: q.title, category: q.category, bounty: q.bounty }));
      const old = mat.map;
      mat.map = drawPainBoardTexture(info.level, cards, false, info.layout);
      mat.needsUpdate = true;
      old?.dispose();
    });
  }, []);
  const carouselTickRef = useRef(0);
  /** 百工坊與茶藝街：街道旁兩排佈告欄張貼各種討論＋各類店鋪門楣「熱門討論輪播」走馬燈 */
  const refreshStreetBoardsAndCarousels = useCallback((slideTick = carouselTickRef.current) => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.traverse((o) => {
      const boardInfo = o.userData?.discBoard as
        | { propId: string; title: string; content: StallContent; offset: number; face: 'front' | 'back' }
        | undefined;
      if (boardInfo) {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const all = stallItems(questionsRef.current, boardInfo.content);
        const faceShift = boardInfo.face === 'back' ? 2 : 0;
        const picked =
          all.length > 0
            ? Array.from({ length: Math.min(4, all.length) }, (_, i) => all[(boardInfo.offset + faceShift + i) % all.length])
            : [];
        const cards = picked.map((q) => ({
          id: q.id,
          title: q.title,
          category: q.subcategory || q.category,
          author: q.authorName,
          likes: (q.likes || 0) + (q.meTooCount || 0),
          comments: q.comments?.length || 0,
        }));
        const key = `db_${boardInfo.content}_${boardInfo.offset}_${boardInfo.face}_${cards.map((c) => `${c.id}:${c.likes}:${c.comments}`).join('|')}`;
        if (o.userData.drawnKey !== key) {
          o.userData.drawnKey = key;
          const old = mat.map;
          const nextTex = drawStreetDiscussionBoardTexture(boardInfo.title, cards);
          mat.map = nextTex;
          mat.emissiveMap = nextTex;
          mat.needsUpdate = true;
          old?.dispose();
        }
      }

      // 論道廣場兩側白牆的大型佈告欄：茶藝街／百工坊熱門討論輪播（每 8 秒換一則）
      const wallWhich = o.userData?.plazaWallBoard as WallBoardWhich | undefined;
      if (wallWhich) {
        const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
        const hot = hotStallItems(questionsRef.current, wallWhich === 'tea' ? 'tea_board' : 'craft_board')
          .filter((q) => !(q as any).isSimulated && !(q as any).simulatedBatchId)
          .slice(0, 6);
        const items = hot.map((q) => {
          const a = q as any;
          return {
            title: q.title,
            author: q.authorName,
            tag: q.subcategory || q.category,
            views: a.viewsCount ?? a.views ?? 0,
            likes: (a.likesCount ?? a.likes ?? 0) + (a.meTooCount || 0),
            replies: a.discussionsCount ?? (Array.isArray(a.discussions) ? a.discussions.length : Array.isArray(a.comments) ? a.comments.length : 0),
          };
        });
        const idx = items.length ? Math.floor(slideTick / 2) % items.length : 0;
        const key = `wb_${idx}_${hot.map((q, i) => `${q.id}:${items[i].views}:${items[i].likes}:${items[i].replies}`).join('|')}`;
        if (o.userData.drawnKey !== key) {
          o.userData.drawnKey = key;
          const old = mat.map;
          const nextTex = drawWallBoardTexture(wallWhich, items, idx);
          mat.map = nextTex;
          mat.emissiveMap = nextTex;
          mat.needsUpdate = true;
          old?.dispose();
        }
      }

      const carouselInfo = o.userData?.shopCarousel as
        | { propId: string; shopName: string; categorySub: string; content: StallContent }
        | undefined;
      if (carouselInfo) {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const hotList = hotStallItems(questionsRef.current, carouselInfo.content).slice(0, 5);
        const total = Math.max(1, hotList.length);
        let hash = 0;
        for (let i = 0; i < carouselInfo.propId.length; i++) hash += carouselInfo.propId.charCodeAt(i);
        const slideIdx = (slideTick + hash) % total;
        const cur = hotList[slideIdx];
        const ca = cur as any;
        const item = cur
          ? {
              title: cur.title,
              authorName: cur.authorName,
              subcategory: cur.subcategory,
              category: cur.category,
              views: ca.viewsCount ?? ca.views ?? 0,
              replies: ca.discussionsCount ?? (Array.isArray(ca.discussions) ? ca.discussions.length : 0),
            }
          : null;
        const key = `sc_${carouselInfo.propId}_${slideIdx}_${cur?.id || 'empty'}_${item?.views || 0}_${item?.replies || 0}`;
        if (o.userData.drawnKey !== key) {
          o.userData.drawnKey = key;
          const old = mat.map;
          const nextTex = drawShopCarouselTexture(
            carouselInfo.shopName,
            carouselInfo.categorySub,
            item,
            slideIdx,
            total,
          );
          mat.map = nextTex;
          mat.emissiveMap = nextTex;
          mat.needsUpdate = true;
          old?.dispose();
        }
      }
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
  // 時間與天氣：可以選，也可以交給「自動」（跟著所在城市的時間與即時天氣）
  const readMode = <T extends string>(k: string, def: T, ok: string[]): T => {
    try {
      const v = localStorage.getItem(k);
      return v && ok.includes(v) ? (v as T) : def;
    } catch {
      return def;
    }
  };
  const [timeMode, setTimeModeState] = useState<TimeMode>(() => readMode<TimeMode>('ideax_kingdom_time_mode', 'auto', ['auto', 'day', 'dusk', 'night']));
  const [weatherMode, setWeatherModeState] = useState<WeatherMode>(() => readMode<WeatherMode>('ideax_kingdom_weather_mode', 'auto', ['auto', 'clear', 'rain']));
  const [autoWeather, setAutoWeather] = useState<'clear' | 'rain'>('clear');
  const cityRef = useRef(getCityConfig(getStoredUserCityId()));
  const phaseToTod = (ph: string): TimeOfDay => (ph === 'night' ? 'night' : ph === 'dusk' ? 'dusk' : 'day');
  const [autoTod, setAutoTod] = useState<TimeOfDay>(() => phaseToTod(getCityLocalTimePhase(cityRef.current.timezone).phase));
  const [weather, setWeather] = useState<'clear' | 'rain'>('clear');
  const envRef = useRef({ timeMode, weatherMode, autoTod, autoWeather });
  envRef.current = { timeMode, weatherMode, autoTod, autoWeather };
  const applyEnv = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    const e = envRef.current;
    const t = e.timeMode === 'auto' ? e.autoTod : e.timeMode;
    const wt = e.weatherMode === 'auto' ? e.autoWeather : e.weatherMode;
    if (w.timeOfDay !== t) w.setTimeOfDay(t);
    if (w.weather !== wt) w.setWeather(wt);
    setTimeOfDay(t);
    setWeather(wt);
  }, []);
  useEffect(() => {
    applyEnv();
  }, [timeMode, weatherMode, autoTod, autoWeather, applyEnv]);
  useEffect(() => {
    const t = window.setInterval(() => setAutoTod(phaseToTod(getCityLocalTimePhase(cityRef.current.timezone).phase)), 5 * 60 * 1000);
    return () => window.clearInterval(t);
  }, []);
  const setTimeMode = useCallback((m: TimeMode) => {
    setTimeModeState(m);
    try {
      localStorage.setItem('ideax_kingdom_time_mode', m);
    } catch {
      // ignore
    }
  }, []);
  const setWeatherMode = useCallback((m: WeatherMode) => {
    setWeatherModeState(m);
    try {
      localStorage.setItem('ideax_kingdom_weather_mode', m);
    } catch {
      // ignore
    }
  }, []);

  // Safe player pose for error recovery
  const safePlayerPoseRef = useRef<{ pos: THREE.Vector3; yaw: number } | null>(null);

  // Region state
  const [activeRegionId, setActiveRegionId] = useState<RegionId>(initialRegionId);
  const [regionStatus, setRegionStatus] = useState<RegionStatus>('loading');
  // 第一次進入：載入完還要暖機一下（編譯材質、等幀率穩定）才拿掉載入畫面
  const [warmDone, setWarmDone] = useState(false);
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
        setStoryTowerId(null);
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
      mat.map = drawJobScrollTexture(info.side, jobs.slice(info.side * JOBS_PER_SCROLL, (info.side + 1) * JOBS_PER_SCROLL), status, brief);
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
  // 其他地方（例如左側欄裡的貼文內頁）要用網站功能：一樣在左側欄直接顯示那一頁
  useEffect(() => {
    const onPanel = (e: Event) => {
      const d = (e as CustomEvent<KingdomPanelDetail>).detail;
      if (!d?.url) return;
      setDrawer((prev) => ({ kind: 'site', url: d.url, title: d.title || '網站', back: prev && prev.kind !== 'site' ? prev : prev?.kind === 'site' ? prev.back : null }));
    };
    window.addEventListener(KINGDOM_PANEL_EVENT, onPanel);
    return () => window.removeEventListener(KINGDOM_PANEL_EVENT, onPanel);
  }, []);
  const handleDrawerAction = useCallback(
    (a: KingdomAction) => {
      if (a.kind === 'module') {
        // 網站功能（找專家、求職、徵才、發布、瀏覽…）直接顯示在左側欄；3D 這一頁維持原狀
        const url = moduleUrl(a.module);
        setDrawer((prev) => ({ kind: 'site', url, title: moduleTitle(a.module), back: prev && prev.kind !== 'site' ? prev : prev?.kind === 'site' ? prev.back : null }));
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

  // 各大功能使用比例：進實境漫遊算一次（同一位訪客一天只算一次）
  useEffect(() => {
    trackFeature('roam3d');
  }, []);

  // 古風背景樂（和 /island 同一首），進 3D 自動播放、離開時停止
  useEffect(() => {
    ancientJiangnanBgm.start();
    ancientJiangnanBgm.setMuted(bgmMuted);
    // 環境音（鳥鳴、蟲鳴、水波、風、雨）跟背景音樂共用開關
    kingdomAmbience.setMuted(bgmMuted);
    kingdomAmbience.start();
    return () => {
      ancientJiangnanBgm.stop();
      kingdomAmbience.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleBgm = useCallback(() => {
    setBgmMuted((m) => {
      const next = !m;
      ancientJiangnanBgm.setMuted(next);
      kingdomAmbience.setMuted(next);
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
    bondsRef.current.setName(currentUser?.name || multiplayerRef.current?.displayName || '旅人');
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
    // 2. Camera（直式螢幕自動放寬垂直視角，避免水平視野過窄）
    const computeFov = (w: number, h: number) =>
      w < h ? Math.min(82, Math.round(68 / Math.pow(Math.max(0.4, w / Math.max(1, h)), 0.3))) : 68;
    const camera = new THREE.PerspectiveCamera(computeFov(width, height), width / height, 0.15, 1000);
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
    applyEnv();
    // 天氣跟著所在城市的即時天氣（和 /island 一樣）：晴天才有漁船、遊船、水燈、天燈
    let weatherAlive = true;
    fetchCityWeather(getCityConfig(getStoredUserCityId()))
      .then((d) => {
        if (weatherAlive) setAutoWeather(d.weather);
      })
      .catch(() => {});
    setTextureAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

    // 精緻畫質：HDR＋反鋸齒的後製（燈籠、窗紙、寶珠會泛光）
    const rt = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    // 泛光前先把壞掉的像素（NaN、無限大）清掉：不然泛光會把一點點壞值擴散成整片黑
    composer.addPass(
      new ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
          uniform sampler2D tDiffuse;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(tDiffuse, vUv);
            bool bad = any(isnan(c)) || any(isinf(c));
            gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : min(c, vec4(48.0));
          }`,
      })
    );
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), world.bloomStrength, 0.55, world.bloomThreshold);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // 調色＋暗角（像電影的暖色夕照與柔和邊角）
    const grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uSat: { value: 1.1 },
        uContrast: { value: 1.06 },
        uShadow: { value: new THREE.Vector3() },
        uHigh: { value: new THREE.Vector3() },
        uVignette: { value: 0.3 },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uSat;
        uniform float uContrast;
        uniform vec3 uShadow;
        uniform vec3 uHigh;
        uniform float uVignette;
        varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
          vec3 col = mix(vec3(l), c.rgb, uSat);
          col = (col - 0.5) * uContrast + 0.5;
          col += uShadow * (1.0 - smoothstep(0.0, 0.55, l)) + uHigh * smoothstep(0.45, 1.0, l);
          vec2 d = vUv - 0.5;
          float v = smoothstep(0.38, 0.95, length(d * vec2(1.15, 1.0)));
          col *= 1.0 - uVignette * v;
          gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
        }`,
    });
    composer.addPass(grade);
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
        setStoryTowerId(resume.towerId);
      }
      startRegionId = detectPlayerSpatialContext(resume.x, resume.z).regionId;
      setActiveRegionId(startRegionId);
      resumeClearTimer = window.setTimeout(clearKingdomResume, 1500);
    }

    // 6. RegionManager
    const regionManager = new RegionManager(scene);
    regionManagerRef.current = regionManager;

    // 第一次載入完成後先「暖機」：編譯所有材質、往四周各畫一次（上傳貼圖），等幀率穩定才拿掉載入畫面
    let warmStarted = false;
    const warmUp = async () => {
      const t0 = performance.now();
      try {
        await new Promise((r) => setTimeout(r, 30));
        const r2 = renderer as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
        if (r2.compileAsync) await r2.compileAsync(scene, camera);
        else renderer.compile(scene, camera);
        const q = camera.quaternion.clone();
        for (let k = 0; k < 4; k++) {
          camera.rotation.set(0, (k / 4) * Math.PI * 2, 0);
          camera.updateMatrixWorld();
          renderer.render(scene, camera);
          await new Promise((r) => setTimeout(r, 0));
        }
        camera.quaternion.copy(q);
        camera.updateMatrixWorld();
      } catch {
        /* 暖機失敗也沒關係，直接進入 */
      }
      // 等連續 18 幀都順（< 45ms），最少 0.8 秒、最多 4 秒
      await new Promise<void>((resolve) => {
        let last = performance.now();
        let good = 0;
        const tick = () => {
          const now = performance.now();
          const dt = now - last;
          last = now;
          good = dt < 45 ? good + 1 : 0;
          if ((good >= 18 && now - t0 > 800) || now - t0 > 4000) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      setWarmDone(true);
    };
    regionManager.onStatusChange = (status, progress) => {
      setRegionStatus(status);
      setLoadProgress(progress);
      if (status === 'active' && !warmStarted) {
        warmStarted = true;
        void warmUp();
      }
      if (status === 'error') {
        controls.unlockPointer();
      }
    };

    // 可以點的東西（建築、攤位、懸賞牆）：每座島組好後重新收集
    const pickables: THREE.Object3D[] = [];
    const tickers: ((t: number) => void)[] = [];
    const hallGroups = new Map<string, THREE.Object3D>();
    const lobbyPits: THREE.Object3D[] = [];
    const collectPickables = () => {
      pickables.length = 0;
      tickers.length = 0;
      lobbyPits.length = 0;
      scene.traverse((o) => {
        if (o.userData?.pick || o.userData?.painBoard) pickables.push(o);
        if (typeof o.userData?.tick === 'function') tickers.push(o.userData.tick);
        if (o.userData?.lobbyPit) lobbyPits.push(o);
        if (o.userData?.hallId) {
          hallGroups.set(o.userData.hallId, o);
          const tw = towersRef.current.get(o.userData.hallId);
          if (tw && Array.isArray(o.userData.hallColliders)) tw.cols = tw.cols.map(() => o.userData.hallColliders);
        }
      });
    };
    regionManager.onRegionReady = () => {
      refreshPainBoards();
      refreshHallBooths();
      refreshDeepHallsRef.current();
      refreshLobbiesRef.current();
      refreshHomeBoardsRef.current();
      refreshPlazaStelesRef.current();
      refreshStreetBoardsAndCarousels();
      collectPickables();
      worldRef.current?.applyEnvIntensity(scene);
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
      camera.fov = computeFov(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Keydown for E Interaction
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleBulbRef.current();
        return;
      }
      if (e.code === 'KeyQ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        blinkRef.current();
        return;
      }
      if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleSitRef.current();
        return;
      }
      if (e.code === 'KeyE') {
        if (nearBuildingRef.current) {
          playSoundEffect('interact');
          openForBuilding(nearBuildingRef.current);
          controls.unlockPointer();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    // Q 瞬移：鎖定視角時對準畫面中央；沒鎖定時對準滑鼠位置；最遠 28 公尺、只能落在走得到的地方
    let lastPointer: { x: number; y: number } | null = null;
    const onPointerMoveBlink = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      lastPointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
    };
    renderer.domElement.addEventListener('pointermove', onPointerMoveBlink);
    const blinkRay = new THREE.Raycaster();
    blinkRef.current = () => {
      const st = storyRef.current;
      if (boatRideRef.current || st.tween || st.level !== 0 || regionManager.status !== 'active') return;
      const ndc = controls.isLocked || !lastPointer ? new THREE.Vector2(0, 0) : new THREE.Vector2(lastPointer.x, lastPointer.y);
      blinkRay.setFromCamera(ndc, camera);
      blinkRay.far = 28;
      const hits = blinkRay.intersectObjects(scene.children, true).filter((h) => {
        const o = h.object as THREE.Mesh;
        if (!(o as any).isMesh || (o as any).isSprite) return false;
        for (let q: THREE.Object3D | null = o; q; q = q.parent) if (!q.visible) return false;
        const m = o.material as THREE.Material & { visible?: boolean; transparent?: boolean; opacity?: number };
        if (Array.isArray(o.material)) return true;
        return m.visible !== false && !(m.transparent && (m.opacity ?? 1) < 0.5);
      });
      const dir = blinkRay.ray.direction.clone();
      let target: THREE.Vector3 | null = null;
      if (hits.length) {
        const h = hits[0];
        const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
        target = h.point.clone();
        if (n.y < 0.6) target.addScaledVector(dir, -0.8);
      } else if (dir.y < -0.02) {
        // 沒打到東西：落在地面（y=0）上
        const t = -camera.position.y / dir.y;
        if (t > 0 && t < 28) target = camera.position.clone().addScaledVector(dir, t);
      }
      if (!target) return;
      const cols = regionManager.getAllColliders();
      const ok = (x: number, z: number) =>
        PhysicsController.isInsideWalkableZones(x, z, globalWalkableZones) && !PhysicsController.checkCollision(new THREE.Vector3(x, 0, z), cols);
      const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      let x = target.x;
      let z = target.z;
      let tries = 0;
      while (!ok(x, z) && tries < 10) {
        x -= flat.x * 0.5;
        z -= flat.z * 0.5;
        tries++;
      }
      if (!ok(x, z)) return;
      if (Math.hypot(x - controls.position.x, z - controls.position.z) < 0.8) return;
      sitRef.current = false;
      setSitting(false);
      controls.position.set(x, PhysicsController.getGroundHeight(x, z, MOVE_BRIDGES, 0), z);
      controls.updateCameraTransform(0);
      playSoundEffect('portal');
    };

    // 點畫面上的東西 → 左側彈出細節（滑鼠點一下、沒拖曳；鎖定視角時以畫面中央為準）
    const raycaster = new THREE.Raycaster();
    raycaster.far = 70;
    const ndc = new THREE.Vector2();
    const pickAt = (clientX: number | null, clientY: number | null): PickTarget | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (clientX === null || clientY === null) ndc.set(0, 0);
      else ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const players = remoteViewRef.current?.pickables() || [];
      const hits = raycaster.intersectObjects(players.length ? [...pickables, ...players] : pickables, false);
      for (const h of hits) {
        const t = pickTargetOf(h.object);
        if (!t) continue;
        // 彩蛋：太遠、站得不夠高、或物件藏起來（夜裡收工的農夫等）都不算
        if (t.kind === 'egg') {
          if (t.maxDist && h.distance > t.maxDist) continue;
          if (t.minY && camera.position.y < t.minY) continue;
          let par: THREE.Object3D | null = h.object.parent;
          let hidden = false;
          while (par) {
            if (!par.visible) {
              hidden = true;
              break;
            }
            par = par.parent;
          }
          if (hidden) continue;
        }
        // 樓板不擋射線：只認玩家所在這一層的懸賞牆與書桌
        if (t.kind === 'painBoard') {
          const tw = towersRef.current.get(t.buildingId);
          if (t.level !== storyRef.current.level + (tw?.basements || 0)) continue;
        }
        if (t.kind === 'desk' && storyRef.current.level !== 0) continue;
        // 地下主展場：在裡面只認展場的攤位與樓梯；在外面不認展場裡的東西
        const st = storyRef.current;
        const inHall = st.level < 0 && Boolean(hallOf(st.towerId));
        // 山台：只認山上的東西（塔、下山石碑、塔頂的下塔牌）
        if (t.kind === 'trail' && (t.dir === 'down' || t.dir === 'top') && !(st.towerId === PLATEAU_ID && st.level === 1)) continue;
        if (t.kind === 'trail' && t.dir === 'down-top' && !(st.towerId === PLATEAU_ID && st.level === 2)) continue;
        if (st.towerId === PLATEAU_ID && t.kind !== 'trail' && t.kind !== 'egg') continue;
        const hallThing = t.kind === 'booth' || (t.kind === 'goFloor' && t.level === 0);
        if ((t.kind === 'lobbyScreen' || t.kind === 'lobbyRank' || (t.kind === 'goFloor' && t.level < 0)) && st.level !== 0) continue;
        if (inHall ? !hallThing || (t as { buildingId: string }).buildingId !== st.towerId : hallThing) continue;
        return t;
      }
      return null;
    };
    // 桃花樹（櫻桃樹叢）：只在點擊時檢查，滑鼠移動時不算（樹很多）
    const peachAt = (clientX: number | null, clientY: number | null): PickTarget | null => {
      if (storyRef.current.level !== 0 || storyRef.current.towerId) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      if (clientX === null || clientY === null) ndc.set(0, 0);
      else ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const far = raycaster.far;
      raycaster.far = 24;
      const trees: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o.userData?.treeKinds) trees.push(o);
      });
      const hit = raycaster.intersectObjects(trees, false)[0];
      raycaster.far = far;
      if (!hit || hit.instanceId === undefined) return null;
      const kinds = hit.object.userData.treeKinds as string[];
      return kinds[hit.instanceId] === 'cherry' ? { kind: 'egg', egg: 'peach' } : null;
    };
    const tapAt = (clientX: number | null, clientY: number | null) => {
      const t = pickAt(clientX, clientY) || peachAt(clientX, clientY);
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
    remoteViewRef.current = remoteView;

    // ── 羈絆：雙向綁定後兩人之間出現發光的羈絆線 ──
    const bonds = bondsRef.current;
    bonds.onChange = () => setBondTick((n) => (n + 1) % 1000000);
    let bondKey = '';
    const bondTimer = window.setInterval(() => {
      const k = mp.userKey;
      if (k && k !== bondKey && mp.database) {
        bondKey = k;
        bonds.start(mp.database, k, currentUserNameRef.current || mp.displayName);
      }
    }, 2000);
    const bondLine = new THREE.Group();
    bondLine.name = 'bond_line';
    const bondCore = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0.95, depthWrite: false }));
    const bondGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 1, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
    );
    bondLine.add(bondCore, bondGlow);
    bondLine.visible = false;
    bondLine.renderOrder = 5;
    scene.add(bondLine);
    const bondA = new THREE.Vector3();
    const bondB = new THREE.Vector3();
    const bondUp = new THREE.Vector3(0, 1, 0);
    let questAcc = 0;

    // ── 遊湖乘船：渡口上船、自由划船、下船回最近的渡口 ──
    const boating = boatingRef.current;
    boating.onChange = () => setBoatTick((n) => (n + 1) % 1000000);
    let boatingKey = '';
    const boatingTimer = window.setInterval(() => {
      const k = mp.presenceKey;
      if (k && k !== boatingKey && !boatRideRef.current) {
        boatingKey = k;
        boating.start(mp.database, k, currentUserNameRef.current || mp.displayName, () => mp.serverNow);
      }
    }, 2000);
    const bMats = boatMats();
    // 遊湖的船：五艘裡一艘是有屋頂的畫舫，其餘是沒屋頂的小舟（依船位編號決定）
    const makeBoat = () => {
      const g = new THREE.Group();
      const open = sampanBoat(bMats);
      const roofed = pleasureBoat(bMats);
      g.add(open, roofed);
      g.userData.open = open;
      g.userData.roofed = roofed;
      scene.add(g);
      return g;
    };
    const styleBoat = (g: THREE.Group, slot: number) => {
      const roof = boatHasRoof(slot);
      (g.userData.open as THREE.Object3D).visible = !roof;
      (g.userData.roofed as THREE.Object3D).visible = roof;
    };
    const myBoat = makeBoat();
    myBoat.visible = false;
    const remoteBoats = new Map<number, THREE.Group>();
    const seatTmp = new THREE.Vector3();
    // 全島地圖點任一處：前往最近可以站的地方（在船上就先下船）
    goToPointRef.current = (x, z) => {
      if (boatRideRef.current) {
        boatRideRef.current = null;
        void boating.leave();
        myBoat.visible = false;
        setRiding(null);
      }
      const p = nearestReachable(x, z);
      storyRef.current = { towerId: null, level: 0, armed: true, tween: null };
      setFloorLevel(0);
      setStoryTowerId(null);
      controls.setSpawn(new THREE.Vector3(p.x, 0, p.z), p.yaw);
      controls.pitch = 0;
      controls.updateCameraTransform(0);
      setDrawer(null);
      playSoundEffect('portal');
    };
    goTrailRef.current = (dir) => {
      playSoundEffect('portal');
      if (dir === 'top') {
        // 塔頂眺望
        storyRef.current = { towerId: PLATEAU_ID, level: 2, armed: false, tween: null };
        setFloorLevel(2);
        setStoryTowerId(PLATEAU_ID);
        controls.setSpawn(new THREE.Vector3(TRAIL.pagodaX - 0.6, TRAIL.topFloorY, TRAIL.pagodaZ), Math.PI / 2);
        // 彩蛋：登上塔頂（塔樓詩句三選一）
        window.setTimeout(() => triggerEggRef.current('pagoda'), 900);
      } else if (dir === 'up' || dir === 'down-top') {
        storyRef.current = { towerId: PLATEAU_ID, level: 1, armed: false, tween: null };
        setFloorLevel(1);
        setStoryTowerId(PLATEAU_ID);
        controls.setSpawn(new THREE.Vector3(TRAIL.topX, TRAIL.topY, TRAIL.topZ), TRAIL.topYaw);
      } else {
        storyRef.current = { towerId: null, level: 0, armed: true, tween: null };
        setFloorLevel(0);
        setStoryTowerId(null);
        controls.setSpawn(new THREE.Vector3(TRAIL.x, 0, TRAIL.z), TRAIL.yaw + Math.PI);
      }
      controls.pitch = 0;
      controls.updateCameraTransform(0);
      setDrawer(null);
    };
    boardBoatRef.current = async (dockId, join) => {
      const dock = findDock(dockId) || DOCKS[0];
      let ride: NonNullable<typeof boatRideRef.current> | null = null;
      if (join) {
        const ok = await boating.join(join.index);
        if (ok) ride = { role: 'passenger', slot: join.index, x: join.x, z: join.z, yaw: join.r, speed: 0, dockId };
      }
      if (!ride) {
        const slot = await boating.claim(dock.waterX, dock.waterZ, dock.waterYaw, dock.id);
        if (slot === null) {
          // 船滿了：排隊
          queuedDockRef.current = dock.id;
          await boating.enqueue();
          setBoatTick((n) => n + 1);
          return;
        }
        ride = { role: 'owner', slot, x: dock.waterX, z: dock.waterZ, yaw: dock.waterYaw, speed: 0, dockId: dock.id };
      }
      (ride as any).vx = 0;
      (ride as any).vz = 0;
      boatRideRef.current = ride;
      queuedDockRef.current = null;
      storyRef.current = { towerId: null, level: 0, armed: true, tween: null };
      setFloorLevel(0);
      setStoryTowerId(null);
      controls.yaw = ride.yaw;
      controls.pitch = -0.05;
      setRiding({ role: ride.role, owner: join?.on });
      setBoatDock(null);
      setDrawer(null);
      playSoundEffect('portal');
    };
    leaveBoatRef.current = () => {
      const ride = boatRideRef.current;
      if (!ride) return;
      boatRideRef.current = null;
      void boating.leave();
      myBoat.visible = false;
      const d = nearestDock(ride.x, ride.z);
      controls.setSpawn(new THREE.Vector3(d.landX, 0, d.landZ), d.landYaw + Math.PI);
      controls.pitch = 0;
      controls.updateCameraTransform(0);
      setRiding(null);
      playSoundEffect('portal');
    };
    const updateBoats = (delta: number) => {
      const ride = boatRideRef.current;
      // 其他人的船（自己當船主的那艘由本機畫）
      const seen = new Set<number>();
      for (const sl of boating.slots) {
        if (ride && ride.role === 'owner' && sl.index === ride.slot) continue;
        seen.add(sl.index);
        let g = remoteBoats.get(sl.index);
        if (!g) {
          g = makeBoat();
          g.position.set(sl.x, -0.3, sl.z);
          g.rotation.y = sl.r;
          remoteBoats.set(sl.index, g);
        }
        styleBoat(g, sl.index);
        const k = Math.min(1, delta * 4);
        g.position.x += (sl.x - g.position.x) * k;
        g.position.z += (sl.z - g.position.z) * k;
        let dy = sl.r - g.rotation.y;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        g.rotation.y += dy * k;
        g.position.y = -0.3 + Math.sin(performance.now() / 700 + sl.index) * 0.04;
      }
      for (const [i, g] of remoteBoats) {
        if (!seen.has(i)) {
          scene.remove(g);
          remoteBoats.delete(i);
        }
      }
      if (!ride) return;
      const rr = ride as typeof ride & { vx: number; vz: number };
      if (ride.role === 'owner') {
        const v = controls.getDesiredVelocity();
        const maxV = 6;
        const len = Math.hypot(v.x, v.z);
        const tx = len > 0.01 ? (v.x / len) * Math.min(maxV, len) : 0;
        const tz = len > 0.01 ? (v.z / len) * Math.min(maxV, len) : 0;
        const acc = Math.min(1, delta * (len > 0.01 ? 1.4 : 0.9));
        rr.vx += (tx - rr.vx) * acc;
        rr.vz += (tz - rr.vz) * acc;
        const nx = ride.x + rr.vx * delta;
        const nz = ride.z + rr.vz * delta;
        // 先試整步（斜著穿過橋洞這種窄水道也過得去），不行再分開試 X、Z
        if (navigable(nx, nz)) {
          ride.x = nx;
          ride.z = nz;
        } else {
          if (navigable(nx, ride.z)) ride.x = nx;
          else rr.vx *= -0.2;
          if (navigable(ride.x, nz)) ride.z = nz;
          else rr.vz *= -0.2;
        }
        ride.speed = Math.hypot(rr.vx, rr.vz);
        if (ride.speed > 0.3) {
          let dy = Math.atan2(-rr.vx, -rr.vz) - ride.yaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          ride.yaw += dy * Math.min(1, delta * 1.6);
        }
        const nd = nearestDock(ride.x, ride.z);
        const nearDock = Math.hypot(nd.waterX - ride.x, nd.waterZ - ride.z) < 16;
        if (nearDock && nd.id !== ride.dockId) {
          ride.dockId = nd.id;
          boating.setDock(nd.id);
        }
        boating.push(ride.x, ride.z, ride.yaw, nearDock && ride.speed < 0.3);
        myBoat.visible = true;
        styleBoat(myBoat, ride.slot);
        myBoat.position.set(ride.x, -0.3 + Math.sin(performance.now() / 700) * 0.04, ride.z);
        myBoat.rotation.y = ride.yaw;
        myBoat.rotation.z = Math.sin(performance.now() / 900) * 0.02;
      } else {
        const sl = boating.slots.find((x) => x.index === ride.slot);
        if (!sl || (boating.online && sl.p !== boating.myKey)) {
          // 船主下船了：送回最近的渡口
          leaveBoatRef.current?.();
          return;
        }
        const k = Math.min(1, delta * 4);
        ride.x += (sl.x - ride.x) * k;
        ride.z += (sl.z - ride.z) * k;
        let dy = sl.r - ride.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        ride.yaw += dy * k;
      }
      seatTmp.copy(ride.role === 'owner' ? BOAT_SEATS.owner : BOAT_SEATS.passenger).applyAxisAngle(new THREE.Vector3(0, 1, 0), ride.yaw);
      controls.position.set(ride.x + seatTmp.x, BOAT_SIT_Y, ride.z + seatTmp.z);
      controls.updateCameraTransform(delta);
    };

    // 換樓層：樓層表、下樓口、地下室的上樓梯（直接把玩家放到那一層）
    goFloorRef.current = (buildingId, level, zone) => {
      const b = REGION_BUILDINGS.get(buildingId);
      const tw = towersRef.current.get(buildingId);
      if (!b || !tw) return;
      let x: number;
      let z: number;
      let yaw: number;
      const look = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(-(tx - fx), -(tz - fz));
      if (isFloorsHall(buildingId) && level < 0) {
        // 展覽館、電玩城：每一層是一類展場（樓層表給的是展區時換算成樓層）
        const n = hallFloorCount(buildingId);
        if (zone !== undefined && zone >= 0) level = -(zone + 1);
        level = Math.max(-n, Math.min(-1, level));
        const a = hallArrival(buildingId);
        x = a.x;
        z = a.z;
        yaw = a.yaw;
        const hg = hallGroups.get(buildingId);
        if (hg) hg.userData.currentZone = -level - 1;
      } else if (hallOf(buildingId) && level < 0) {
        const a = hallArrival(buildingId, zone);
        x = a.x;
        z = a.z;
        yaw = a.yaw;
        level = -1;
      } else if (isFloorsHall(buildingId)) {
        // 一樓大廳：站在大樓梯口前，面向榜單大螢幕
        const p = lobbyPit(b);
        [x, z] = toWorld(b, 0, Math.min(b.depth / 2 - 1.2, p.zTop + 2.4));
        const [tx, tz] = toWorld(b, 0, -b.depth / 2);
        yaw = look(x, z, tx, tz);
        level = 0;
      } else if (b.exterior === 'tulou') {
        if (level <= 0) {
          // 中庭，面向舞台
          [x, z] = toWorld(b, 0, 7);
          const [tx, tz] = toWorld(b, 0, -4);
          yaw = look(x, z, tx, tz);
          level = 0;
        } else {
          // 樓上迴廊（後方），沿著迴廊看
          level = Math.min(level, RING.floors - 1);
          const th = Math.PI * 0.94;
          [x, z] = toWorld(b, Math.sin(th) * RING.RC, Math.cos(th) * RING.RC);
          const [tx, tz] = toWorld(b, Math.sin(th + 0.3) * RING.RC, Math.cos(th + 0.3) * RING.RC);
          yaw = look(x, z, tx, tz);
        }
      } else if (b.exterior === 'libraryTower') {
        // 藏書閣外觀和內部分開：離開書廳就站回大門外的台階前，背對大門
        [x, z] = toWorld(b, 0, LIB_TOWER.R0 + 3.4);
        const [tx, tz] = toWorld(b, 0, LIB_TOWER.R0 + 12);
        yaw = look(x, z, tx, tz);
        level = 0;
        libDoorArmedRef.current = false;
      } else {
        // 一樓大廳：站在下樓口前面，面向大門
        [x, z] = toWorld(b, 0, -b.depth * 0.25 + 1.9);
        const [tx, tz] = toWorld(b, 0, b.depth / 2);
        yaw = look(x, z, tx, tz);
        level = 0;
      }
      playSoundEffect('portal');
      storyRef.current = { towerId: level !== 0 ? buildingId : null, level, armed: false, tween: null };
      setFloorLevel(level);
      setStoryTowerId(level !== 0 ? buildingId : null);
      controls.setSpawn(new THREE.Vector3(x, tw.floorY ? tw.floorY(level) : level * FLOOR_H, z), yaw);
      controls.pitch = 0;
      controls.updateCameraTransform(0);
      setDrawer(null);
      if (isFloorsHall(buildingId)) refreshDeepHallsRef.current();
    };

    // 9. Animation & Physics Game Loop
    const clock = new THREE.Clock();
    // 可走範圍：島上＋欄杆外的草地外環（到水邊為止，不會下水），以及石拱橋
    // 腳步聲用：島的可走橢圓（欄杆內是石板，欄杆外是草地）
    const rawEllipses = getGlobalWalkableZones().filter((z): z is Extract<ReturnType<typeof getGlobalWalkableZones>[number], { type: 'ellipse' }> => z.type === 'ellipse');
    const stepPos = { x: 0, z: 0 };
    let stepAcc = 0;
    const globalWalkableZones = getGlobalWalkableZones().map((z) => (z.type === 'ellipse' ? { ...z, rx: z.rx + 5.6, rz: z.rz + 5.6 } : z));
    let lodTick = 14;
    let xpLastRegion = '';
    let xpLastVenue = '';
    // 經驗值：首次進入 3D 創點源世界＋每日漫遊
    window.setTimeout(() => void reportXp('world'), 4000);
    // 桃樹（粉紅花樹）的位置：桃樹下同坐用（第一次用到時才收集）
    let peachPts: number[] | null = null;
    const collectPeach = () => {
      const out: number[] = [];
      const m4 = new THREE.Matrix4();
      const v = new THREE.Vector3();
      scene.updateMatrixWorld(false);
      scene.traverse((o) => {
        const kinds = o.userData?.treeKinds as string[] | undefined;
        const im = o as THREE.InstancedMesh;
        if (!kinds || !(im as any).isInstancedMesh) return;
        for (let i = 0; i < Math.min(kinds.length, im.count); i++) {
          if (kinds[i] !== 'cherry') continue;
          im.getMatrixAt(i, m4);
          v.setFromMatrixPosition(m4).applyMatrix4(im.matrixWorld);
          out.push(v.x, v.y, v.z);
        }
      });
      return out;
    };
    const nearestPeach = (x: number, z: number) => {
      if (!peachPts) peachPts = collectPeach();
      let best = -1;
      let bd = 4.6;
      for (let k = 0; k < peachPts.length; k += 3) {
        const d = Math.hypot(peachPts[k] - x, peachPts[k + 2] - z);
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      return best;
    };
    let peachTogetherNow = false;
    // 落桃花：兩人一起坐在桃樹下時，花瓣從樹冠飄下來
    const PETALS = 90;
    const petalGeo = new THREE.BufferGeometry();
    const petalPos = new Float32Array(PETALS * 3);
    petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
    const petalSeed = Array.from({ length: PETALS }, () => [Math.random(), Math.random(), Math.random()]);
    const petals = new THREE.Points(
      petalGeo,
      new THREE.PointsMaterial({ map: petalTexture(), color: 0xffc4d8, size: 0.32, transparent: true, depthWrite: false, alphaTest: 0.05 })
    );
    petals.frustumCulled = false;
    petals.visible = false;
    scene.add(petals);
    let petalT = 0;
    let petalTree = -1;
    const pagodaRoofs: THREE.Object3D[] = [];
    let pagodaRoofHidden = false;

    const animate = () => {
      rafIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.08);
      setIsDesktopPointerLocked(controls.isLocked);

      const story = storyRef.current;
      updateBoats(delta);
      if (boatRideRef.current && regionManager.status === 'active') {
        // 乘船中：位置由船決定（上面 updateBoats 已經處理）
        const spatial = detectPlayerSpatialContext(controls.position.x, controls.position.z);
        regionManager.syncActiveRegionByPosition(spatial.regionId);
        setActiveRegionId(spatial.regionId);
        nearBuildingRef.current = null;
        setNearBuilding(null);
      } else if (story.tween && regionManager.status === 'active') {
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
          setStoryTowerId(story.towerId);
          // 走完一樓的大樓梯：到地下第一層展場
          if (tw.hallEnter) goFloorRef.current?.(tw.towerId, -1);
        }
      } else if (regionManager.status === 'active') {
        // story.level：相對地面的樓層（0＝有大門的地面層，負數是地下）
        const tower = story.level !== 0 && story.towerId ? towersRef.current.get(story.towerId) || null : null;
        const desiredVelocity = controls.getDesiredVelocity();
        const activeColliders = tower ? tower.cols[story.level + tower.basements] || [] : regionManager.getAllColliders();

        const prevX = controls.position.x;
        const prevZ = controls.position.z;
        const prevY = controls.position.y;
        const newPos = PhysicsController.movePlayer(
          controls.position,
          desiredVelocity,
          delta,
          activeColliders,
          tower?.walk ? tower.walk(story.level) : globalWalkableZones,
          tower ? [] : MOVE_BRIDGES,
          tower ? (tower.floorY ? tower.floorY(story.level) : story.level * FLOOR_H) : 0
        );

        // 坐下：原地不動、視線往下；一走動就站起來
        {
          if (sitRef.current && Math.hypot(desiredVelocity.x, desiredVelocity.z) > 0.2) {
            sitRef.current = false;
            setSitting(false);
          }
          if (sitRef.current) {
            newPos.x = prevX;
            newPos.z = prevZ;
          }
          const want = sitRef.current ? -0.75 : 0;
          controls.eyeOffset += (want - controls.eyeOffset) * Math.min(1, delta * 6);
        }

        // 藏書閣書海：中央螺旋梯走得上去（依所在角度找最接近目前高度的那段踏板）
        if (tower?.b.id === LIBRARY_ID && story.level < 0) {
          const S = LIB_STAIR;
          const baseY = LIB_HALL.Y;
          const hOld = libStairHRef.current;
          const rOf = (p: THREE.Vector3) => Math.hypot(p.x - LIB_HALL.cx, p.z - LIB_HALL.cz);
          let r = rOf(newPos);
          if (hOld > 0.6 && (r > S.outer - 0.05 || r < S.inner + 0.05)) {
            // 在階梯上：被扶手擋住，沿著環帶滑動
            const k = Math.max(S.inner + 0.06, Math.min(S.outer - 0.06, r)) / Math.max(1e-3, r);
            newPos.x = LIB_HALL.cx + (newPos.x - LIB_HALL.cx) * k;
            newPos.z = LIB_HALL.cz + (newPos.z - LIB_HALL.cz) * k;
            r = rOf(newPos);
          }
          let hNew = 0;
          if (r > S.inner && r < S.outer) {
            const cands = libStairHeights(newPos.x, newPos.z);
            let best = Infinity;
            for (const c of cands) if (Math.abs(c - hOld) < Math.abs(best - hOld)) best = c;
            if (Math.abs(best - hOld) < 1.0) hNew = best;
            else if (hOld < 0.3 && cands.every((c) => c > 2.1)) hNew = 0;
            else {
              // 太高（或太低）跨不過去：留在原地
              newPos.x = prevX;
              newPos.z = prevZ;
              hNew = hOld;
            }
          }
          libStairHRef.current = hNew;
          newPos.y = THREE.MathUtils.lerp(prevY, baseY + hNew, Math.min(1, delta * 18));
        } else {
          libStairHRef.current = 0;
        }

        controls.position.copy(newPos);
        controls.updateCameraTransform(delta);

        // 多樓層建築：走到樓梯口就上下樓
        {
          const here = tower || (() => {
            const sp = detectPlayerSpatialContext(controls.position.x, controls.position.z);
            return sp.insideBuilding ? towersRef.current.get(sp.insideBuilding.id) || null : null;
          })();
          if (here) {
            const st = here.stair(story.level, controls.position.x, controls.position.z, controls.position);
            if (!st) story.armed = true;
            else if (story.armed) {
              story.tween = { pts: st.pts, t: 0, dur: st.hallEnter ? 1.6 : 2.1, toLevel: st.toLevel, towerId: here.b.id, hallEnter: st.hallEnter };
              playSoundEffect('interact');
            }
          } else {
            story.armed = true;
          }
        }

        // 藏書閣：走進大門就傳送到內部書廳；在書廳走到南邊發光拱門就回到門外
        {
          const libB = REGION_BUILDINGS.get(LIBRARY_ID);
          if (libB && !boatRideRef.current) {
            const p = controls.position;
            if (story.level === 0 && !tower) {
              const atDoor = atLibraryDoor(libB, p.x, p.z);
              if (!atDoor) libDoorArmedRef.current = true;
              else if (libDoorArmedRef.current) {
                libDoorArmedRef.current = false;
                goFloorRef.current?.(LIBRARY_ID, -1);
              }
            } else if (tower?.b.id === LIBRARY_ID && story.level < 0) {
              const atExit = atLibraryExit(p.x, p.z);
              if (!atExit) libExitArmedRef.current = true;
              else if (libExitArmedRef.current) {
                libExitArmedRef.current = false;
                goFloorRef.current?.(LIBRARY_ID, 0);
              }
            }
          }
        }

        // Detect which island the player is on and whether inside a building
        const spatial = detectPlayerSpatialContext(
          controls.position.x,
          controls.position.z
        );
        // 經驗值：首次探索每座島、首次進入每個場館（伺服器判定是否第一次）
        if (spatial.regionId !== xpLastRegion) {
          xpLastRegion = spatial.regionId;
          if (XP_ISLANDS[spatial.regionId]) void reportXp('island', spatial.regionId);
        }
        {
          const venueId = story.towerId || spatial.insideBuilding?.id || '';
          if (venueId !== xpLastVenue) {
            xpLastVenue = venueId;
            if (XP_VENUES[venueId]) void reportXp('venue', venueId);
          }
        }
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
        // 在樓上或地下時，所在的就是那棟建築
        if (tower) foundBuilding = REGION_BUILDINGS.get(tower.b.id) || tower.b;
        // 地下展場：靠近攤位時提示「按 E 查看攤位」
        nearBoothRef.current = null;
        if (tower && isFloorsHall(tower.b.id) && story.level < 0) {
          const hg = hallGroups.get(tower.b.id);
          const spots = (hg?.userData.boothSpots || []) as DeepBoothSpot[];
          let best: DeepBoothSpot | null = null;
          let bd = 2.3;
          for (const sp of spots) {
            const dd = Math.hypot(sp.x - controls.position.x, sp.z - controls.position.z);
            if (dd < bd) {
              bd = dd;
              best = sp;
            }
          }
          if (best) {
            nearBoothRef.current = { buildingId: tower.b.id, index: best.index };
            const title = (hg?.userData.boothTitles as string[] | undefined)?.[best.index] || '';
            const key = `booth-${tower.b.id}-${best.index}-${title}`;
            let named = floorNameCache.current.get(key);
            if (!named) {
              named = {
                ...tower.b,
                id: 'hall-booth',
                name: title ? `攤位・${title}` : '攤位',
                mockData: { ...(tower.b.mockData || ({} as any)), primaryActionLabel: title ? `查看攤位：${title}` : '查看這個攤位' },
              } as BuildingInteractable;
              floorNameCache.current.set(key, named);
            }
            nearBuildingRef.current = named;
            setNearBuilding(named);
          }
        }
        // 多樓層建築：提示顯示目前在第幾樓
        if (foundBuilding && towersRef.current.has(foundBuilding.id)) {
          const lvl = story.level;
          const key = `${foundBuilding.id}-${lvl}`;
          let named = floorNameCache.current.get(key);
          if (!named) {
            const label = floorLabel(foundBuilding, lvl);
            named = { ...foundBuilding, name: label ? `${foundBuilding.name}・${label}` : foundBuilding.name };
            floorNameCache.current.set(key, named);
          }
          foundBuilding = named;
        }
        if (!nearBoothRef.current) {
          nearBuildingRef.current = foundBuilding;
          setNearBuilding(foundBuilding);
        }
      }

      for (const [id, g] of hallGroups) g.visible = story.level < 0 && story.towerId === id;
      // 聚雲塔頂眺望：藏起最上面兩層屋簷，看出去不被擋住
      {
        const onTop = story.towerId === PLATEAU_ID && story.level >= 2;
        if (onTop !== pagodaRoofHidden) {
          pagodaRoofHidden = onTop;
          if (!pagodaRoofs.length) scene.traverse((o) => o.name === 'pagoda-top-roof' && pagodaRoofs.push(o));
          for (const r of pagodaRoofs) r.visible = !onTop;
        }
      }
      // 人在地下展廳時，把一樓大樓梯井（伸到地下的部分）藏起來
      {
        const inDeep = story.level < 0 && isFloorsHall(story.towerId);
        for (const p of lobbyPits) p.visible = !inDeep;
      }

      // 坐下時送出的高度低一點，夥伴那邊看得出來你坐著
      mp.update(controls.position.x, controls.position.y - (sitRef.current ? 0.7 : 0), controls.position.z, controls.yaw);
      const now = performance.now() / 1000;
      faunaEnv.camX = camera.position.x;
      faunaEnv.camY = camera.position.y;
      faunaEnv.camZ = camera.position.z;
      faunaEnv.camYaw = controls.yaw;
      faunaEnv.onBoat = Boolean(boatRideRef.current);
      faunaEnv.bulbOn = bulbOnRef.current;
      // 在暗處待了一下、又沒開燈：顯示照明提示（只在狀態改變時更新畫面）
      if (faunaEnv.darkFor > 1.6 !== darkHintRef.current) {
        darkHintRef.current = faunaEnv.darkFor > 1.6;
        setDarkHint(darkHintRef.current);
      }
      faunaEnv.indoor = story.level !== 0;
      for (const tk of tickers) tk(now);
      if (lodTick % 10 === 0) {
        const st = storyRef.current;
        kingdomAmbience.update({
          tod: faunaEnv.tod as 'day' | 'dusk' | 'night',
          weather: faunaEnv.weather as 'clear' | 'rain',
          water: boatRideRef.current ? 1 : camera.position.y > 6 ? 0.2 : waterProximity(camera.position.x, camera.position.z),
          height: camera.position.y,
          indoor: st.level < 0 || (Boolean(st.towerId) && st.towerId !== PLATEAU_ID && st.level > 0),
        });
      }
      // 腳步聲：每走一步（約 0.8 m，跑步 1.1 m）響一下，依地面材質
      {
        const px = controls.position.x;
        const pz = controls.position.z;
        const moved = Math.hypot(px - stepPos.x, pz - stepPos.z);
        if (moved > 3 || boatRideRef.current) {
          stepPos.x = px;
          stepPos.z = pz;
        } else {
          stepAcc += moved;
          stepPos.x = px;
          stepPos.z = pz;
          const run = Boolean((controls as any).keys?.sprint);
          if (stepAcc > (run ? 1.1 : 0.8)) {
            stepAcc = 0;
            const st = storyRef.current;
            let surface: 'stone' | 'grass' | 'wood' = 'stone';
            if (st.towerId === PLATEAU_ID) surface = st.level === 1 ? 'grass' : 'wood';
            else if (st.towerId && st.level > 0) surface = 'wood';
            else if (st.level === 0) {
              const inCore = rawEllipses.some((e) => ((px - e.cx) / e.rx) ** 2 + ((pz - e.cz) / e.rz) ** 2 <= 1);
              const onBridge = WORLD_BRIDGES.some((b) => {
                const abx = b.x2 - b.x1;
                const abz = b.z2 - b.z1;
                const tt = Math.max(0, Math.min(1, ((px - b.x1) * abx + (pz - b.z1) * abz) / (abx * abx + abz * abz || 1)));
                return Math.hypot(px - b.x1 - abx * tt, pz - b.z1 - abz * tt) < b.halfWidth;
              });
              if (!inCore && !onBridge) surface = 'grass';
            }
            kingdomAmbience.step(surface, run);
          }
        }
      }
      remoteView.update(delta);
      // 羈絆線＋雙人任務
      {
        const partner = bonds.state.partner;
        const pp = partner ? remoteView.positionOfUser(partner.key) : null;
        if (pp) {
          bondB.set(pp.x, pp.y + 1.15, pp.z);
          // 從自己身前（胸口往前一點）拉向夥伴，不會整條糊在鏡頭上
          bondA.set(camera.position.x, camera.position.y - 0.75, camera.position.z);
          {
            const dx = bondB.x - bondA.x;
            const dz = bondB.z - bondA.z;
            const dl = Math.hypot(dx, dz) || 1;
            const k = Math.min(1.1, dl * 0.4);
            bondA.x += (dx / dl) * k;
            bondA.z += (dz / dl) * k;
          }
          const len = bondA.distanceTo(bondB);
          bondLine.visible = len > 0.3;
          bondLine.position.copy(bondA).add(bondB).multiplyScalar(0.5);
          bondLine.quaternion.setFromUnitVectors(bondUp, bondB.clone().sub(bondA).normalize());
          bondLine.scale.set(1, len, 1);
          (bondGlow.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(performance.now() / 380) * 0.1;
        } else bondLine.visible = false;
        // 桃樹下同坐：自己坐著、夥伴也坐著（送來的高度比較低），兩人在同一棵桃樹下
        {
          const me = controls.position;
          const tree = sitRef.current ? nearestPeach(me.x, me.z) : -1;
          const together =
            tree >= 0 && !!pp && peachPts !== null && Math.hypot(peachPts[tree] - pp.x, peachPts[tree + 2] - pp.z) < 4.6 && pp.y < me.y - 0.4;
          peachTogetherNow = together;
          if (together) {
            petalTree = tree;
            petalT = 12;
          }
          if (petalT > 0 && peachPts && petalTree >= 0) {
            petalT -= delta;
            petals.visible = true;
            const tx = peachPts[petalTree];
            const ty = peachPts[petalTree + 1];
            const tz = peachPts[petalTree + 2];
            const now = performance.now() / 1000;
            for (let i = 0; i < PETALS; i++) {
              const [a, b, c] = petalSeed[i];
              const fall = ((now * (0.25 + b * 0.25) + a) % 1);
              const ang = a * Math.PI * 2 + now * (0.3 + c * 0.4);
              const rr = 0.6 + b * 2.6 + fall * 0.8;
              petalPos[i * 3] = tx + Math.cos(ang) * rr + Math.sin(now * 1.3 + i) * 0.25;
              petalPos[i * 3 + 1] = ty + 0.5 - fall * 3.35;
              petalPos[i * 3 + 2] = tz + Math.sin(ang) * rr;
            }
            (petalGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
            (petals.material as THREE.PointsMaterial).opacity = Math.min(1, petalT / 2);
          } else petals.visible = false;
        }
        questAcc += delta;
        if (questAcc >= 1) {
          const dt = Math.min(questAcc, 2);
          questAcc = 0;
          const online = Boolean(pp);
          setPartnerOnline((v) => (v === online ? v : online));
          if (partner && pp && !document.hidden) {
            const q = questsRef.current;
            const st = storyRef.current;
            const r = stepQuests(q, {
              dt,
              partnerName: partner.name,
              me: { x: controls.position.x, y: controls.position.y, z: controls.position.z },
              partner: { x: pp.x, y: pp.y, z: pp.z },
              onBoat: Boolean(boatRideRef.current),
              onTowerTop: st.towerId === PLATEAU_ID && st.level === 2,
              peachTogether: peachTogetherNow,
            });
            if (r.changed) {
              saveQuests(q);
              setQuests({ done: { ...q.done }, tour: { ...q.tour } });
            }
            for (const c of r.completed) questDoneRef.current(c.title, partner.name);
          }
        }
      }

      const dbgY = (window as any).__kingdomCamY;
      if (typeof dbgY === 'number') camera.position.y = dbgY;
      world.update(delta, camera.position);
      if ((lodTick = (lodTick + 1) % 15) === 0) regionManager.updateInteriorLod(camera.position.x, camera.position.z);

      // Render Scene
      if (fancyRef.current) {
        bloom.strength = world.bloomStrength;
        bloom.threshold = world.bloomThreshold;
        const gr = world.grade;
        grade.uniforms.uSat.value = gr.sat;
        grade.uniforms.uContrast.value = gr.contrast;
        (grade.uniforms.uShadow.value as THREE.Vector3).set(gr.shadow[0], gr.shadow[1], gr.shadow[2]);
        (grade.uniforms.uHigh.value as THREE.Vector3).set(gr.high[0], gr.high[1], gr.high[2]);
        grade.uniforms.uVignette.value = gr.vignette;
        // 水面即時倒影（精緻畫質；地下展廳、樓裡不需要）
        world.reflections = storyRef.current.level >= 0 && !(storyRef.current.towerId && storyRef.current.level > 0 && storyRef.current.towerId !== PLATEAU_ID);
        world.renderReflection(renderer, camera, scene);
        composer.render(delta);
      } else {
        world.reflections = false;
        world.renderReflection(renderer, camera, scene);
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
        // 測試用：放一位假旅人、假羈絆（只在本機）
        fakePlayer: (x: number, z: number, name = '測試旅人') => {
          remoteView.setPlayers([{ id: 'guest_test/s1', name, color: 2, x, y: 0, z, yaw: 0, t: Date.now() }]);
        },
        fakeBond: (on = true) => {
          bonds.state = { ...bonds.state, online: true, partner: on ? { key: 'guest_test', name: '測試旅人' } : null };
          setBondTick((n) => n + 1);
        },
        world: () => world,
        post: () => ({ bloom, grade, composer }),
        sceneObj: () => scene,
        findNamed: (name: string) => {
          const out: number[][] = [];
          scene.traverse((o) => {
            if (o.name === name) out.push([+o.position.x.toFixed(1), +o.position.z.toFixed(1)]);
          });
          return out;
        },
        project: (name: string) => {
          const o = scene.getObjectByName(name);
          if (!o) return null;
          const v = new THREE.Vector3();
          o.getWorldPosition(v);
          const w = v.clone();
          v.project(camera);
          return { world: [w.x, w.y, w.z].map((n) => +n.toFixed(2)), screen: [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(3)], visible: o.visible, parentVisible: o.parent?.visible };
        },
        look: (yaw: number, pitch = 0) => {
          controls.yaw = yaw;
          controls.pitch = pitch;
          controls.updateCameraTransform(0);
        },
        getPos: () => ({ x: controls.position.x, y: controls.position.y, z: controls.position.z, yaw: controls.yaw, level: storyRef.current.level, stairH: libStairHRef.current, tw: storyRef.current.towerId }),
        pickCenter: () => JSON.stringify(pickAt(null, null)),
        // 測試用：列出某點附近的碰撞
        collidersNear: (x: number, z: number, r = 1.5) =>
          regionManager
            .getAllColliders()
            .filter((c) => {
              if (c.type === 'cylinder') return Math.hypot(c.x - x, c.z - z) < r + c.radius;
              if (c.type === 'box') return Math.abs(c.x - x) < r + c.halfWidth && Math.abs(c.z - z) < r + c.halfDepth;
              const dx = c.x2 - c.x1;
              const dz = c.z2 - c.z1;
              const t = Math.max(0, Math.min(1, ((x - c.x1) * dx + (z - c.z1) * dz) / (dx * dx + dz * dz || 1)));
              return Math.hypot(x - (c.x1 + dx * t), z - (c.z1 + dz * t)) < r + c.halfThickness;
            })
            .map((c) => c.id),
        // 不靠畫面幀數：直接用物理一步步走過去，回傳走到哪裡（檢查空氣牆用）
        simWalk: (x: number, z: number, tx: number, tz: number) => {
          const st = storyRef.current;
          const tw = st.level !== 0 && st.towerId ? towersRef.current.get(st.towerId) || null : null;
          const fy = tw ? (tw.floorY ? tw.floorY(st.level) : st.level * FLOOR_H) : 0;
          let pos = new THREE.Vector3(x, fy, z);
          const cols = tw ? tw.cols[st.level + tw.basements] || [] : regionManager.getAllColliders();
          for (let i = 0; i < 600; i++) {
            const dx = tx - pos.x;
            const dz = tz - pos.z;
            const d = Math.hypot(dx, dz);
            if (d < 0.3) break;
            const v = new THREE.Vector3((dx / d) * 4, 0, (dz / d) * 4);
            pos = PhysicsController.movePlayer(pos, v, 1 / 30, cols, tw?.walk ? tw.walk(st.level) : globalWalkableZones, tw ? [] : WORLD_BRIDGES, fy);
          }
          return [+pos.x.toFixed(2), +pos.z.toFixed(2)];
        },
        // 從高處往下打射線，回傳最上面那個表面的高度（擺放屋頂上的角色用）
        roofY: (x: number, z: number, up = false) => {
          const rc = up ? new THREE.Raycaster(new THREE.Vector3(x, 2.5, z), new THREE.Vector3(0, 1, 0)) : new THREE.Raycaster(new THREE.Vector3(x, 60, z), new THREE.Vector3(0, -1, 0));
          rc.camera = camera;
          const hits = rc.intersectObjects(scene.children, true).filter((h) => (h.object as THREE.Mesh).isMesh && h.object.visible && (h.object as THREE.Mesh).material && ((h.object as THREE.Mesh).material as THREE.Material).visible !== false && !/fauna/.test(h.object.parent?.name || ''));
          return hits.slice(0, 4).map((h) => [h.point.y.toFixed(2), h.object.name || h.object.type]);
        },
        goFloor: (id: string, level: number, zone?: number) => goFloorRef.current?.(id, level, zone),
        openDock: (id: string) => setBoatDock(id),
        trail: (dir: 'up' | 'down' | 'top' | 'down-top') => goTrailRef.current?.(dir),
        ride: () => JSON.stringify(boatRideRef.current),
        docks: () => JSON.stringify(DOCKS.map((d) => [d.id, Math.round(d.landX), Math.round(d.landZ), Math.round(d.waterX), Math.round(d.waterZ)])),
        findNaN: () => {
          const out: string[] = [];
          scene.traverse((o) => {
            const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
            const pa = g?.attributes?.position;
            if (!pa) return;
            for (let i = 0; i < pa.array.length; i++)
              if (!Number.isFinite(pa.array[i] as number)) {
                let path = '';
                for (let q: THREE.Object3D | null = o; q; q = q.parent) path = `${q.name || q.type}/${path}`;
                out.push(path);
                break;
              }
          });
          return out.slice(0, 10);
        },
        place: (x: number, z: number, yaw: number) => {
          controls.position.x = x;
          controls.position.z = z;
          controls.yaw = yaw;
        },
        setWeather: (w: 'clear' | 'rain') => world.setWeather(w),
        setTimeOfDay: (t: TimeOfDay) => {
          world.setTimeOfDay(t);
          setTimeOfDay(t);
        },
      };
    }

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      weatherAlive = false;
      window.clearInterval(boatingTimer);
      boating.stop();
      window.clearInterval(bondTimer);
      bonds.stop();
      remoteViewRef.current = null;
      boatRideRef.current = null;
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
      renderer.domElement.removeEventListener('pointermove', onPointerMoveBlink);

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

  // 一樓大廳榜單更新；大螢幕每 6 秒換下一件；攤位圖片每 5 秒輪播
  useEffect(() => {
    rankingsRef.current = rankings;
    refreshLobbiesRef.current();
  }, [rankings]);
  useEffect(() => {
    const t1 = window.setInterval(() => {
      for (const id of Object.keys(rankingsRef.current)) lobbySlideRef.current[id] = (lobbySlideRef.current[id] || 0) + 1;
      refreshLobbiesRef.current();
    }, 6000);
    const t2 = window.setInterval(() => {
      const st = storyRef.current;
      if (!(st.level < 0 && isFloorsHall(st.towerId))) return;
      sceneRef.current?.traverse((o) => {
        if (o.userData?.hallId !== st.towerId) return;
        const parts = o.userData.parts as { media: THREE.Mesh[] } | undefined;
        parts?.media.forEach((m) => {
          const imgs = (m?.userData.images || []) as string[];
          if (imgs.length > 1) {
            m.userData.slide = ((m.userData.slide || 0) + 1) % imgs.length;
            showBoothMedia(m, m.userData.slide);
          }
        });
      });
    }, 5000);
    return () => {
      window.clearInterval(t1);
      window.clearInterval(t2);
    };
  }, []);

  // 痛點有新增或更新時，懸賞牆跟著換；作品有新增時，地下主展場的攤位跟著換；討論島佈告欄與店鋪輪播同步更新
  useEffect(() => {
    refreshPainBoards();
    refreshHallBooths();
    refreshDeepHallsRef.current();
    refreshHomeBoardsRef.current();
    refreshPlazaStelesRef.current();
    refreshStreetBoardsAndCarousels();
  }, [questions, refreshPainBoards, refreshHallBooths, refreshStreetBoardsAndCarousels]);

  // 百工坊與茶藝街各店鋪「熱門討論輪播」每 4 秒自動切換下一則熱門討論
  useEffect(() => {
    const timer = window.setInterval(() => {
      carouselTickRef.current = (carouselTickRef.current + 1) % 60;
      refreshStreetBoardsAndCarousels(carouselTickRef.current);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [refreshStreetBoardsAndCarousels]);

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

  // 右側樓層表：在樓上／地下時列出所在建築；在地面時，靠近或走進創點樓、展覽館、電玩城就列出
  const dirBuilding =
    floorLevel !== 0 && storyTowerId
      ? REGION_BUILDINGS.get(storyTowerId) || null
      : nearBuilding && hasDirectory(REGION_BUILDINGS.get(nearBuilding.id))
      ? REGION_BUILDINGS.get(nearBuilding.id) || null
      : null;
  const dirId = dirBuilding?.id || null;
  const floorEntries = React.useMemo((): FloorEntry[] => {
    const b = dirId ? REGION_BUILDINGS.get(dirId) : null;
    if (!b) return [];
    const here = (lvl: number) => floorLevel === lvl && (lvl === 0 ? storyTowerId === null : storyTowerId === b.id);
    if (b.exterior === 'tulou') {
      return PAIN_FLOORS.map((f, i) => ({
        key: `p${i}`,
        tag: f.short,
        name: f.label.replace(/^.*・/, ''),
        count: painForFloor(questions, i).length,
        unit: ' 則',
        level: i,
        current: here(i),
      }));
    }
    const h = hallOf(b.id);
    if (!h) return [];
    const isLib = h.kind === 'library';
    const unit = isLib ? ' 冊' : ' 件';
    const zones = HALL_ZONES[h.kind].map((z, i) => ({ z, i, n: hallZoneItems(b.id, i, questions).length }));
    const total = zones.reduce((a, x) => a + x.n, 0);
    if (h.mode === 'floors') {
      // 展覽館、電玩城：每一層是一類展場
      return [
        { key: 'lobby', tag: '1F', name: `${h.lobby}・榜單`, count: total, unit, level: 0, current: here(0) },
        ...zones.map(({ z, i, n }) => ({ key: `b${i + 1}`, tag: `B${i + 1}`, name: z.name, count: n, unit, level: -(i + 1), current: here(-(i + 1)) })),
      ];
    }
    return [
      { key: 'lobby', tag: '1F', name: h.lobby, count: total, unit, level: 0, current: here(0) },
      ...zones.map(({ z, i, n }) => ({
        key: `b1-${i}`,
        tag: isLib ? `${i + 1}層` : 'B1',
        name: isLib ? z.name.replace(/^.*・/, '') : z.name,
        count: n,
        unit,
        level: -1,
        zone: i,
        child: true,
        current: false,
      })),
    ];
  }, [dirId, floorLevel, storyTowerId, questions]);

  return (
    <div className="kx-kai fixed inset-0 w-full h-[100dvh] bg-stone-950 overflow-hidden select-none touch-none">
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full touch-none cursor-grab active:cursor-grabbing"
      />

      {/* 載入畫面（水墨風） */}
      {(regionStatus === 'loading' || (!warmDone && regionStatus !== 'error')) && (
        <div className="kx-root absolute inset-0 z-40 flex flex-col items-center justify-center p-6" style={{ background: 'radial-gradient(ellipse at center, #2b1a10 0%, #120a06 75%)' }}>
          <svg viewBox="0 0 120 70" className="w-40 h-24 mb-3 opacity-90" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M ${48 + i * 2} ${54 - i * 9} L ${72 - i * 2} ${54 - i * 9} L ${68 - i * 2} ${50 - i * 9} L ${52 + i * 2} ${50 - i * 9} Z`} fill="#b3261e" stroke="#e2b85a" strokeWidth="0.8" />
            ))}
            <path d="M 0 66 Q 30 50 60 62 T 120 60 L 120 70 L 0 70 Z" fill="rgba(226,184,90,0.18)" />
          </svg>
          <div className="kx-title text-xl sm:text-2xl">創點源・五島</div>
          <div className="kx-sub text-[13px] mt-1">{regionStatus === 'loading' ? '正在搭起樓閣、點亮燈籠…' : '最後整理一下，讓畫面更順暢…'}</div>
          <div className="w-60 h-1.5 mt-5 rounded-full overflow-hidden" style={{ background: 'rgba(226,184,90,0.18)' }}>
            <div className="h-full transition-all duration-200" style={{ width: `${Math.max(8, loadProgress)}%`, background: 'linear-gradient(90deg,#b3261e,#e2b85a)' }} />
          </div>
          <div className="kx-sub text-[12px] mt-2 tabular-nums">{regionStatus === 'loading' ? loadProgress : 100}%</div>
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
        onSwitchToIslandMap={onSwitchToIslandMap}
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
        placeOverride={floorLevel !== 0 && storyTowerId && REGION_BUILDINGS.get(storyTowerId) ? [REGION_BUILDINGS.get(storyTowerId)!.name.replace(/[（(].*$/, ''), floorLabel(REGION_BUILDINGS.get(storyTowerId)!, floorLevel)].filter(Boolean).join('・') : undefined}
        timeOfDay={timeOfDay}
        onGoToPoint={(x, z) => goToPointRef.current?.(x, z)}
        extraControls={
          <div className="flex flex-col items-end gap-1.5">
            <KingdomEggButton count={eggList.length} onOpen={() => { setEggBookOpen(true); controlsRef.current?.unlockPointer?.(); }} flash={Boolean(eggToast?.added)} />
            <KingdomQuestButton
              open={questOpen}
              onToggle={() => {
                setQuestOpen((o) => !o);
                controlsRef.current?.unlockPointer?.();
              }}
              alert={bondsRef.current.state.incoming.length > 0}
              doneCount={Object.keys(quests.done).length + (eggList.length >= 35 ? 1 : 0)}
            />
          </div>
        }
        env={{
          timeMode,
          weatherMode,
          weather,
          onTimeMode: setTimeMode,
          onWeatherMode: setWeatherMode,
          autoHint: `「自動」跟著${cityRef.current.name}目前的時間與即時天氣。`,
        }}
        bulbOn={bulbOn}
        onToggleBulb={toggleBulb}
        sitting={sitting}
        onToggleSit={toggleSit}
        darkHint={darkHint}
        isFastWalk={isFastWalk}
        onToggleFastWalk={() => {
          handleChangeQuality({
            moveSpeedMultiplier: isFastWalk ? 1.0 : 8.5 / 3.3,
          });
        }}
      />
      <KingdomEggToast toast={eggToast} />
      <KingdomQuestPanel
        open={questOpen}
        onClose={() => setQuestOpen(false)}
        eggCount={eggList.length}
        onOpenEggBook={() => setEggBookOpen(true)}
        quests={quests}
        bond={bondsRef.current.state}
        onAccept={(k) => bondsRef.current.invite(k)}
        onDecline={(k) => bondsRef.current.decline(k)}
        onRelease={() => bondsRef.current.release()}
        partnerOnline={partnerOnline}
        multiplayerOnline={mpStatus === 'online' && bondsRef.current.state.online}
      />
      {!questOpen && bondsRef.current.state.incoming[0] && (
        <BondInviteBanner
          name={bondsRef.current.state.incoming[0].n}
          replacing={bondsRef.current.state.partner?.name}
          onAccept={() => bondsRef.current.invite(bondsRef.current.state.incoming[0].key)}
          onDecline={() => bondsRef.current.decline(bondsRef.current.state.incoming[0].key)}
        />
      )}
      <KingdomEggBookModal open={eggBookOpen} onClose={() => setEggBookOpen(false)} list={eggList} />

      {/* 遊湖乘船：渡口面板、排隊、輪到時的通知、乘船中 */}
      <BoatOverlay
        tick={boatTick}
        dockId={boatDock}
        riding={riding}
        service={boatingRef.current}
        onClose={() => setBoatDock(null)}
        onBoard={(dockId, join) => void boardBoatRef.current?.(dockId, join)}
        onQueue={(dockId) => {
          queuedDockRef.current = dockId;
          void boatingRef.current.enqueue();
          setBoatDock(null);
        }}
        onAcceptOffer={() => void boardBoatRef.current?.(queuedDockRef.current || DOCKS[0].id)}
        onLater={(timedOut) => void boatingRef.current.requeue(timedOut)}
        onLeaveQueue={() => void boatingRef.current.leaveQueue()}
        onLeaveBoat={() => leaveBoatRef.current?.()}
      />

      {!riding && dirBuilding && floorEntries.length > 0 && regionStatus === 'active' && (
        <FloorDirectory
          title={dirBuilding.name.replace(/[（(].*$/, '')}
          entries={floorEntries}
          onGo={(e) => goFloorRef.current?.(dirBuilding.id, e.level, e.zone)}
        />
      )}

      {/* 左側面板：建築介紹與功能按鈕、創點樓各層痛點、市集攤位、內容預覽 */}
      <KingdomSideDrawer
        state={drawer}
        questions={questions}
        onChange={setDrawer}
        onAction={handleDrawerAction}
        soso={{ state: soso, send: sendSoso, search: searchSoso, reset: resetSoso }}
        bond={{
          online: mpStatus === 'online' && bondsRef.current.state.online,
          partnerName: bondsRef.current.state.partner?.name || null,
          relationTo: (k) => bondsRef.current.relationTo(k),
          invite: (k) => bondsRef.current.invite(k),
          release: () => bondsRef.current.release(),
        }}
        rankings={rankings}
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Flame,
  Gamepad2,
  HelpCircle,
  Info,
  MapPin,
  Minus,
  PanelsTopLeft,
  Plus,
  RotateCcw,
  Route,
  ScrollText,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  IdeaXIsland,
  IslandAction,
  IslandDistrict,
  IslandStand,
  IslandStreet,
  IDEAX_ISLANDS,
  matchesIslandContent,
} from '../../data/islandWorld';
import { Question } from '../../types';
import { isGameQuestion } from '../../utils/gameClassification';
import './IslandWorldView.css';

interface IslandWorldViewProps {
  questions: Question[];
  onOpenQuestion: (question: Question) => void;
  onAction: (action: IslandAction) => void;
  onBack?: () => void;
}

const ISLAND_SHAPES: Record<string, string> = {
  home: 'M -112 -36 C -95 -66 -52 -76 -18 -71 C 9 -85 50 -68 75 -53 C 105 -43 120 -13 109 13 C 115 42 78 70 45 72 C 19 87 -25 74 -50 68 C -86 65 -116 35 -109 6 C -123 -7 -125 -21 -112 -36 Z',
  creative: 'M -115 -26 C -101 -57 -74 -69 -44 -65 C -26 -81 1 -71 20 -74 C 55 -82 85 -55 89 -35 C 120 -17 122 10 103 33 C 96 58 64 68 40 63 C 10 83 -21 72 -42 76 C -78 74 -101 52 -98 32 C -120 16 -127 -6 -115 -26 Z',
  pain: 'M -106 -32 C -86 -59 -55 -70 -31 -64 C -8 -84 21 -66 46 -63 C 80 -63 107 -39 106 -11 C 119 12 96 37 78 50 C 57 72 20 66 1 74 C -29 79 -58 63 -67 45 C -93 39 -115 6 -106 -32 Z',
  discussion: 'M -113 -21 C -103 -51 -78 -61 -49 -58 C -28 -75 4 -72 22 -58 C 52 -67 88 -47 93 -25 C 118 -9 115 21 95 35 C 86 60 53 71 28 60 C 7 79 -24 68 -44 68 C -78 73 -103 51 -98 31 C -117 17 -122 -3 -113 -21 Z',
  career: 'M -114 -36 C -97 -64 -63 -68 -40 -61 C -12 -77 20 -74 40 -56 C 73 -60 104 -36 103 -10 C 121 12 105 40 85 50 C 67 75 35 72 11 67 C -9 84 -40 70 -58 64 C -87 66 -114 44 -109 18 C -125 -1 -125 -22 -114 -36 Z',
};

const DEFAULT_ISLAND_SHAPE = 'M -105 -38 C -71 -72 -22 -80 22 -70 C 70 -65 105 -40 112 -4 C 115 28 82 57 48 70 C 4 84 -63 65 -96 41 C -119 21 -123 -15 -105 -38 Z';
const ISLAND_SCALE: Record<IdeaXIsland['mapPosition']['size'], number> = { small: 0.8, medium: 0.95, large: 1.15 };

/**
 * 建築與島嶼地標繪製（純建築風景與招牌，不放角色人偶在島上）
 */
function IslandLandmark({ tint, islandId }: { tint: string; islandId: string }) {
  const treesByIsland: Record<string, Array<[number, number]>> = {
    home: [[-74, -20], [-52, 42], [76, -14], [72, 40], [-25, -45]],
    creative: [[-77, -12], [-57, 39], [82, 22], [55, -40]],
    pain: [[-70, 9], [72, -23], [62, 40]],
    discussion: [[-78, -12], [-54, 40], [74, 38]],
    career: [[-75, -17], [-48, 40], [76, -6]],
  };
  const roadByIsland: Record<string, string> = {
    home: 'M -84 24 C -48 16 -39 -3 -9 -8 C 24 -14 39 10 82 6',
    creative: 'M -83 26 C -50 32 -36 2 -8 9 C 17 14 42 -20 82 -5',
    pain: 'M -82 -2 C -49 -15 -37 10 -13 19 C 10 28 43 4 82 22',
    discussion: 'M -83 20 C -56 1 -35 15 -12 -7 C 14 -31 40 17 82 -4',
    career: 'M -84 13 C -57 28 -38 2 -15 -4 C 12 -9 37 20 81 9',
  };
  const trees = treesByIsland[islandId] || [[-67, -17], [71, -20], [29, 51]];
  const road = roadByIsland[islandId] || 'M -88 1 C -49 -5 -25 15 0 1 C 28 -14 50 -4 91 3';

  return (
    <g className="island-landmarks" aria-hidden="true">
      <path d={road} fill="none" stroke="#988461" strokeWidth="13" strokeLinecap="round" />
      <path d={road} fill="none" stroke="#efe5c8" strokeWidth="8" strokeLinecap="round" />
      {trees.map(([x, y], index) => (
        <g key={`tree-${index}`} transform={`translate(${x} ${y})`}>
          <ellipse cx="3" cy="8" rx="8" ry="3.5" fill="#736855" opacity=".24" />
          <path d="M 0 2 L 1 10" stroke="#8b674b" strokeWidth="3" strokeLinecap="round" />
          <path d="M -9 -2 C -10 -8 -4 -13 1 -10 C 5 -15 12 -9 10 -3 C 9 3 -5 4 -9 -2 Z" fill={index % 2 ? '#718e5e' : '#89a36d'} stroke="#58764e" strokeWidth="1" />
          <ellipse cx="-4" cy="-7" rx="3.7" ry="2.8" fill={tint} opacity=".7" />
          <circle cx="5" cy="-7" r="2.2" fill="#b5c68f" opacity=".9" />
        </g>
      ))}

      {/* 主島：中央大殿 + 噴泉廣場 + 貿易街（標示「暫未開放」） */}
      {islandId === 'home' && (
        <g transform="translate(0 -10)">
          {/* 中央大殿 */}
          <g transform="translate(-18 -15)">
            <ellipse cx="0" cy="32" rx="32" ry="8" fill="#8c9e7a" opacity=".4" />
            <rect x="-26" y="-4" width="52" height="33" rx="2" fill="#eadbb9" stroke="#8b7552" strokeWidth="1.5" />
            <path d="M -31 -4 L 0 -27 L 31 -4 Z" fill="#b46f51" stroke="#805c45" strokeWidth="1.5" />
            <path d="M -18 3 V 21 M 0 3 V 21 M 18 3 V 21" stroke="#8e7353" strokeWidth="2" />
            <path d="M -25 5 H 25 M -25 11 H 25" stroke="#d1b98a" strokeWidth="1.5" />
            <circle cx="0" cy="-17" r="3" fill="#f6e5ad" />
          </g>
          {/* 貿易街碼頭市集與暫未開放標牌 */}
          <g transform="translate(46 12)">
            <rect x="-22" y="-12" width="44" height="24" rx="4" fill="#eedcba" stroke="#997b57" strokeWidth="1.2" />
            <path d="M -22 -12 L 0 -22 L 22 -12 Z" fill="#b07a52" stroke="#825736" strokeWidth="1.2" />
            <path d="M -18 -1 H 18" stroke="#cca878" strokeWidth="2" strokeDasharray="3 3" />
            <text x="0" y="-3" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#4d3725">貿易街</text>
            <rect x="-18" y="2" width="36" height="9" rx="3" fill="#ffebee" stroke="#ef5350" strokeWidth="0.8" />
            <text x="0" y="8.5" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#c62828">暫未開放</text>
          </g>
        </g>
      )}

      {/* 創意島：展覽館與電玩城街廓 */}
      {islandId === 'creative' && (
        <g transform="translate(9 -18)">
          <rect x="-38" y="-1" width="33" height="31" rx="3" fill="#e7d7b1" stroke="#8b7552" strokeWidth="1.5" />
          <path d="M -42 0 L -22 -17 L -1 0 Z" fill="#cf7658" stroke="#875c47" strokeWidth="1.5" />
          <rect x="-31" y="7" width="19" height="23" rx="2" fill="#4e7775" />
          <path d="M -27 13 H -16 M -27 18 H -16" stroke="#e8cc7a" strokeWidth="2" />
          <rect x="13" y="4" width="31" height="25" rx="2" fill="#eddcb6" stroke="#8b7552" strokeWidth="1.5" />
          <path d="M 9 5 L 29 -11 L 48 5 Z" fill="#d7a44f" stroke="#8b7552" strokeWidth="1.5" />
          <circle cx="28" cy="15" r="7" fill="#8bb7b0" stroke="#527a73" strokeWidth="1.5" />
          <path d="M 26 15 H 30 M 28 13 V 17" stroke="#fff7d8" strokeWidth="1.5" />
          <text x="-21" y="-6" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#754b38">展覽館</text>
          <text x="29" y="-2" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#6d5330">電玩城</text>
        </g>
      )}

      {/* 痛點島：創點樓古風高閣，招牌寫著「創點樓」 */}
      {islandId === 'pain' && (
        <g transform="translate(3 -19)">
          <ellipse cx="0" cy="37" rx="38" ry="7" fill="#78614c" opacity=".28" />
          <rect x="-31" y="-3" width="62" height="37" fill="#9b6540" stroke="#69452f" strokeWidth="2" />
          <path d="M -38 -4 L -29 -19 H 29 L 38 -4 L 28 -1 L 20 -10 H -20 L -28 -1 Z" fill="#873f2e" stroke="#613b30" strokeWidth="2" strokeLinejoin="round" />
          <path d="M -34 -19 L -25 -31 H 25 L 34 -19 L 25 -16 L 18 -23 H -18 L -25 -16 Z" fill="#a44f37" stroke="#613b30" strokeWidth="2" strokeLinejoin="round" />
          <path d="M -25 -2 V 32 M 25 -2 V 32" stroke="#e0bc7c" strokeWidth="4" />
          <rect x="-9" y="5" width="18" height="29" rx="8" fill="#503c30" stroke="#d5b273" strokeWidth="1.5" />
          <path d="M -22 3 H -13 V 13 H -22 Z M 13 3 H 22 V 13 H 13 Z" fill="#f3d58a" stroke="#68442f" strokeWidth="1.3" />
          <path d="M -18 6 V 11 M 18 6 V 11" stroke="#875838" strokeWidth="1" />
          <path d="M -14 -29 H 14 V -19 H -14 Z" fill="#eed6a0" stroke="#704936" strokeWidth="1.2" />
          <text x="0" y="-22" textAnchor="middle" fontSize="6" fontWeight="900" fill="#70412d">創點樓</text>
          <path d="M -36 35 H 36" stroke="#e2c996" strokeWidth="4" />
        </g>
      )}

      {/* 討論島：日常討論街市集 + 技術工作坊交流桌 + 學術圖書館 */}
      {islandId === 'discussion' && (
        <g transform="translate(4 -15)">
          <path d="M -39 2 H 40 M -32 2 V 28 M 32 2 V 28" stroke="#8a6248" strokeWidth="3" />
          <path d="M -43 2 L -30 -12 H 30 L 43 2 Z" fill="#b9684d" stroke="#81513f" strokeWidth="1.5" />
          <path d="M -31 -5 H 31" stroke="#f2d8a5" strokeWidth="2" strokeDasharray="5 4" />
          <ellipse cx="0" cy="24" rx="26" ry="7" fill="#ac8052" stroke="#765b43" strokeWidth="1.5" />
          <path d="M -21 24 V 33 M 21 24 V 33" stroke="#765b43" strokeWidth="2" />
          <circle cx="-12" cy="15" r="3" fill="#f4e4c1" />
          <circle cx="12" cy="15" r="3" fill="#f4e4c1" />
          <path d="M -8 -13 q -4 -5 1 -8 M 0 -13 q -4 -5 1 -8 M 8 -13 q -4 -5 1 -8" fill="none" stroke="#fff0ce" strokeWidth="1.5" strokeLinecap="round" />
          <text x="0" y="-3" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#fff5dd">討論市集 · 圖書館</text>
        </g>
      )}

      {/* 徵才島：求職廟殿宇與翰林院藏書閣 */}
      {islandId === 'career' && (
        <g transform="translate(4 -18)">
          <path d="M -34 24 V -5 M 34 24 V -5 M -42 -5 H 42 M -45 -5 L -30 -17 H 30 L 45 -5 Z" fill="#c47553" stroke="#7e5140" strokeWidth="2" />
          <path d="M -42 1 H 42" stroke="#f3d59b" strokeWidth="3" />
          <path d="M -23 5 V 25 M -8 5 V 25 M 8 5 V 25 M 23 5 V 25" stroke="#d7b77e" strokeWidth="3" />
          <path d="M -28 25 H 28 M -23 31 H 23 M -17 37 H 17" stroke="#8d6c4b" strokeWidth="3" strokeLinecap="round" />
          <rect x="-12" y="4" width="24" height="14" rx="2" fill="#efd489" stroke="#8c6348" strokeWidth="1.3" />
          <text x="0" y="14" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#754328">求職廟</text>
          <text x="0" y="-7" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#ffdcb0">翰林院</text>
        </g>
      )}
    </g>
  );
}

export const IslandWorldView: React.FC<IslandWorldViewProps> = ({
  questions,
  onOpenQuestion,
  onAction,
  onBack,
}) => {
  // 3D 俯視視角 (Pitch: 25° ~ 75°，預設 48°)、左右旋轉 (Yaw: 0° ~ 360°) 與平移位置 (panX, panY)
  // 操作方式：滑鼠左鍵按住移動平移地圖，右鍵拖曳旋轉與調整俯視角度
  const [view, setView] = useState({ zoom: 1, pitch: 48, yaw: 0, panX: 0, panY: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // 選中層級狀態（島 -> 區 -> 街 -> 攤）
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>('home');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedStreetId, setSelectedStreetId] = useState<string | null>(null);
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);

  // 右側「島覽」導覽面板狀態（地圖路徑、介紹、條列式題目瀏覽是在右邊，默認收合，點擊後展開）
  const [isRightAtlasOpen, setIsRightAtlasOpen] = useState(false);

  // 左側彈窗/抽屜狀態（點擊條列卡片在畫面左側跳出詳細內頁，填寫表單與需求也都在左側）
  const [leftModalMode, setLeftModalMode] = useState<'none' | 'preview' | 'form'>('none');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [formType, setFormType] = useState<'pain_point' | 'career_wish' | 'discussion' | 'proposal'>('pain_point');
  const [formData, setFormData] = useState({
    title: '',
    category: '資訊科技',
    description: '',
    tags: '',
  });
  const [formSubmitSuccess, setFormSubmitSuccess] = useState<string | null>(null);

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  const mapStageRef = useRef<HTMLDivElement>(null);
  const pointerPositions = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{
    pointerId: number;
    button: number;
    x: number;
    y: number;
    pitch: number;
    yaw: number;
    panX: number;
    panY: number;
    moved: boolean;
    islandId: string | null;
  } | null>(null);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const suppressClickUntil = useRef(0);

  const selectedIsland = IDEAX_ISLANDS.find((island) => island.id === selectedIslandId) || null;
  const selectedDistrict = selectedIsland?.districts.find((district) => district.id === selectedDistrictId) || null;
  const selectedStreet = selectedDistrict?.streets.find((street) => street.id === selectedStreetId) || null;
  const selectedStand = selectedStreet?.stands.find((item) => item.id === selectedStandId) || null;

  const contentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const island of IDEAX_ISLANDS) {
      counts[island.id] = island.districts.reduce(
        (sum, district) =>
          sum +
          district.streets.reduce(
            (streetSum, street) =>
              streetSum +
              street.stands.reduce(
                (standSum, item) =>
                  standSum +
                  (item.contentKind === 'questions' ? questions.filter((q) => matchesIslandContent(q, item.contentFilter)).length : 0),
                0,
              ),
            0,
          ),
        0,
      );
    }
    return counts;
  }, [questions]);

  // 目前攤位或街道或區域下的公開內容
  const currentStandQuestions = useMemo(() => {
    if (selectedStand) {
      return questions.filter((q) => matchesIslandContent(q, selectedStand.contentFilter));
    }
    if (selectedStreet) {
      return questions.filter((q) => selectedStreet.stands.some((st) => matchesIslandContent(q, st.contentFilter)));
    }
    if (selectedDistrict) {
      return questions.filter((q) =>
        selectedDistrict.streets.some((str) => str.stands.some((st) => matchesIslandContent(q, st.contentFilter))),
      );
    }
    if (selectedIsland) {
      return questions.filter((q) =>
        selectedIsland.districts.some((dist) =>
          dist.streets.some((str) => str.stands.some((st) => matchesIslandContent(q, st.contentFilter))),
        ),
      );
    }
    return questions.slice(0, 15);
  }, [questions, selectedStand, selectedStreet, selectedDistrict, selectedIsland]);

  const searchResults = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase();
    if (!term) return [];
    return questions
      .filter((q) => q.status !== 'delisted')
      .filter((q) =>
        [q.title, q.appName, q.description, q.category, q.subcategory, q.tertiaryCategory, ...(q.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(term),
      )
      .slice(0, 15);
  }, [questions, searchText]);

  // 環狀連接木橋與放射木橋
  const PERIMETER_BRIDGES = [
    'M 170 75 C 380 20 620 20 830 75',
    'M 920 150 C 975 280 975 400 920 530',
    'M 830 605 C 620 660 380 660 170 605',
    'M 80 530 C 25 400 25 280 80 150',
  ];

  const SPOKE_BRIDGES = [
    'M 160 120 C 270 195 345 245 425 285',
    'M 840 120 C 730 195 655 245 575 285',
    'M 160 560 C 270 485 345 435 425 395',
    'M 840 560 C 730 485 655 435 575 395',
  ];

  const updateZoom = (nextZoom: number) => {
    setView((v) => ({ ...v, zoom: Math.min(2.2, Math.max(0.75, nextZoom)) }));
  };

  const resetView = () => {
    setView({ zoom: 1, pitch: 48, yaw: 0, panX: 0, panY: 0 });
  };

  // 滑鼠滾輪縮放
  useEffect(() => {
    const stage = mapStageRef.current;
    if (!stage) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if ((e.target as Element)?.closest('.island-ui-interactive')) return;
      const factor = Math.exp(-e.deltaY * 0.0014);
      setView((v) => ({
        ...v,
        zoom: Math.min(2.2, Math.max(0.75, v.zoom * factor)),
      }));
    };
    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, []);

  // 滑鼠左鍵按住移動平移地圖，右鍵拖曳旋轉與調整俯視角度
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.button !== 0 && e.button !== 2) || (e.target as Element).closest('.island-ui-interactive')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerPositions.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointerPositions.current.size === 1) {
      const islandId = (e.target as Element).closest<SVGGElement>('.island-map-node')?.dataset.islandId || null;
      dragStart.current = {
        pointerId: e.pointerId,
        button: e.button,
        x: e.clientX,
        y: e.clientY,
        pitch: view.pitch,
        yaw: view.yaw,
        panX: view.panX,
        panY: view.panY,
        moved: false,
        islandId,
      };
      setIsDragging(true);
    } else if (pointerPositions.current.size === 2) {
      suppressClickUntil.current = Date.now() + 600;
      const [first, second] = Array.from(pointerPositions.current.values());
      pinchStart.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        zoom: view.zoom,
      };
      dragStart.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerPositions.current.has(e.pointerId)) return;
    pointerPositions.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointerPositions.current.size >= 2 && pinchStart.current) {
      const [first, second] = Array.from(pointerPositions.current.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (pinchStart.current.distance > 0) {
        updateZoom((pinchStart.current.zoom * distance) / pinchStart.current.distance);
      }
      return;
    }

    const start = dragStart.current;
    if (!start || start.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;

    if (Math.hypot(deltaX, deltaY) > 4) {
      start.moved = true;
    }
    if (!start.moved) return;

    if (start.button === 2) {
      // 右鍵拖曳：左右旋轉與調整俯視角度
      const nextYaw = (start.yaw + deltaX * 0.42) % 360;
      const nextPitch = Math.max(26, Math.min(74, start.pitch + deltaY * 0.32));
      setView((v) => ({ ...v, yaw: nextYaw, pitch: nextPitch }));
    } else {
      // 左鍵按住移動：平移地圖
      const nextPanX = Math.max(-800, Math.min(800, start.panX + deltaX));
      const nextPanY = Math.max(-600, Math.min(600, start.panY + deltaY));
      setView((v) => ({ ...v, panX: nextPanX, panY: nextPanY }));
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>, allowClick: boolean) => {
    const active = dragStart.current?.pointerId === e.pointerId ? dragStart.current : null;
    const wasDragged = Boolean(active?.moved);

    if (wasDragged) {
      suppressClickUntil.current = Date.now() + 200;
    } else if (allowClick && active?.islandId) {
      suppressClickUntil.current = Date.now() + 200;
      handleSelectIsland(active.islandId);
    }

    pointerPositions.current.delete(e.pointerId);
    if (pointerPositions.current.size < 2) pinchStart.current = null;
    if (dragStart.current?.pointerId === e.pointerId || pointerPositions.current.size === 0) {
      dragStart.current = null;
      setIsDragging(false);
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // 點擊島嶼：展開/更新右側島覽面板
  const handleSelectIsland = (islandId: string) => {
    const target = IDEAX_ISLANDS.find((i) => i.id === islandId);
    if (target) {
      setSelectedIslandId(target.id);
      setSelectedDistrictId(null);
      setSelectedStreetId(null);
      setSelectedStandId(null);
      setIsRightAtlasOpen(true);
    }
  };

  // 點擊卡片：在畫面左側跳出詳細內頁彈窗
  // 「島覽(地圖路徑、介紹、條列式題目瀏覽是再右邊，點擊會在畫面左側跳出彈窗顯示詳細內頁)」
  const handleOpenItemPreview = (question: Question) => {
    setPreviewQuestion(question);
    setLeftModalMode('preview');
  };

  // 點擊填寫按鈕：在畫面左側跳出填寫表單彈窗
  // 「填寫表單、需求也都是在左邊」
  const handleOpenFormModal = (type: 'pain_point' | 'career_wish' | 'discussion' | 'proposal') => {
    setFormType(type);
    setFormSubmitSuccess(null);
    setFormData({
      title: '',
      category: type === 'pain_point' ? '痛點難題' : type === 'career_wish' ? '職涯求職' : type === 'proposal' ? '創新提案' : '日常疑難',
      description: '',
      tags: '',
    });
    setLeftModalMode('form');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setFormSubmitSuccess(
      `已成功向「${
        formType === 'pain_point' ? '創點樓掌櫃' : formType === 'career_wish' ? '求職廟廟公' : formType === 'proposal' ? '展覽館策展人' : '日常討論街'
      }」送出紀錄！`,
    );
    setTimeout(() => {
      setFormSubmitSuccess(null);
    }, 4000);

    if (formType === 'pain_point') onAction('create_pain_point');
    else if (formType === 'career_wish') onAction('jobs');
    else if (formType === 'discussion') onAction('create_discussion');
    else if (formType === 'proposal') onAction('create_proposal');
  };

  return (
    <div className="island-world-fullscreen-container">
      {/* 3D 地圖視角舞臺 */}
      <div
        ref={mapStageRef}
        className={`island-3d-stage${isDragging ? ' is-dragging' : ''}`}
        aria-label="IdeaX 創點國 3D 俯視地圖：左鍵拖曳同時調整俯視角度與左右旋轉，滾輪縮放"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerEnd(e, true)}
        onPointerCancel={(e) => handlePointerEnd(e, false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 左上角標題：[←] IdeaX 創點國 \n — 島覽 — （1:1 還原設計圖） */}
        <div className="island-map-brand-overlay island-ui-interactive">
          <button
            type="button"
            onClick={() => {
              if (onBack) onBack();
              else window.history.back();
            }}
            className="island-back-circle-btn"
            title="返回前頁"
            aria-label="返回前頁"
          >
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>
          <div className="island-brand-text">
            <h1 className="island-map-main-title">IdeaX 創點國</h1>
            <p className="island-map-subtitle">— 島覽 —</p>
          </div>
        </div>

        {/* 頂部置中視角控制工具列（縮放 + 重設視角 + 說明） */}
        <div className="island-map-controls island-ui-interactive" aria-label="地圖操作">
          <div className="island-map-zoom-controls">
            <button type="button" onClick={() => updateZoom(view.zoom - 0.15)} aria-label="縮小地圖">
              <Minus size={14} />
            </button>
            <output aria-live="polite">{Math.round(view.zoom * 100)}%</output>
            <button type="button" onClick={() => updateZoom(view.zoom + 0.15)} aria-label="放大地圖">
              <Plus size={14} />
            </button>
          </div>

          <div className="island-controls-divider" />

          <button
            type="button"
            onClick={resetView}
            className="island-reset-btn"
            title="重設俯視角度、旋轉與縮放"
          >
            <RotateCcw size={14} />
            <span>重設視角</span>
          </button>

          <div className="island-controls-divider" />

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="island-guide-btn"
            title="開啟島覽說明"
          >
            <HelpCircle size={15} />
            <span>說明</span>
          </button>
        </div>

        {/* 左下角地圖圖例（點島就能逛 · 木橋 5 座島） */}
        <div className="island-map-legend island-ui-interactive">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#3d5149]">
            <span className="w-3.5 h-3.5 rounded-sm bg-[#c9dbbf] border border-[#a8be9e]" />
            <span>點島就能逛</span>
          </div>
          <div className="w-[1px] h-3 bg-stone-300" />
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#3d5149]">
            <span className="w-4 h-1 rounded-full bg-[#ba8b54]" />
            <span>木橋 5 座島</span>
          </div>
        </div>

        {/* 底部快捷島嶼切換列 */}
        <div className="island-bottom-pill-bar island-ui-interactive">
          {IDEAX_ISLANDS.map((island) => (
            <button
              key={island.id}
              type="button"
              onClick={() => handleSelectIsland(island.id)}
              className={`island-bottom-pill ${selectedIslandId === island.id ? 'active' : ''}`}
            >
              <span>{island.icon}</span>
              <strong>{island.name}</strong>
              {island.id === 'home' && <span className="pill-badge">主島</span>}
            </button>
          ))}
        </div>

        {/* 3D 傾斜、旋轉與平移平面 */}
        <div
          className="island-3d-plane"
          style={{
            transform: `translate(${view.panX}px, ${view.panY}px) rotateX(${view.pitch}deg) rotateZ(${view.yaw}deg) scale(${view.zoom})`,
          }}
        >
          <svg className="island-map-svg" viewBox="0 0 1000 680" role="group" aria-label="IdeaX 創點國五大島嶼">
            <defs>
              <linearGradient id="island-sea" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#7cb9be" />
                <stop offset="50%" stopColor="#5ea5ad" />
                <stop offset="100%" stopColor="#488c99" />
              </linearGradient>
              <radialGradient id="island-sea-glow" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="#e3f0d8" stopOpacity=".55" />
                <stop offset="100%" stopColor="#7cb9be" stopOpacity="0" />
              </radialGradient>
              <pattern id="island-water-ripples" width="160" height="110" patternUnits="userSpaceOnUse">
                <path d="M 16 31 q 20 -7 42 0 M 100 83 q 19 -6 38 0 M 50 108 q 13 -4 24 0" fill="none" stroke="#e8f7ec" strokeOpacity=".3" strokeWidth="2" strokeLinecap="round" />
                <circle cx="130" cy="28" r="2.2" fill="#eff8db" fillOpacity=".4" />
              </pattern>

              <radialGradient id="mist-nw" cx="15%" cy="15%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
                <stop offset="45%" stopColor="#e2eff1" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#e2eff1" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mist-ne" cx="85%" cy="15%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
                <stop offset="45%" stopColor="#e2eff1" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#e2eff1" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mist-sw" cx="15%" cy="85%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
                <stop offset="45%" stopColor="#e2eff1" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#e2eff1" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mist-se" cx="85%" cy="85%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
                <stop offset="45%" stopColor="#e2eff1" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#e2eff1" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 海洋基底 */}
            <rect width="1000" height="680" fill="url(#island-sea)" />
            <rect width="1000" height="680" fill="url(#island-sea-glow)" />
            <rect width="1000" height="680" fill="url(#island-water-ripples)" />

            {/* 相鄰兩島相連的環狀木橋 */}
            {PERIMETER_BRIDGES.map((bridgePath, index) => (
              <g key={`perimeter-bridge-${index}`} aria-hidden="true">
                <path d={bridgePath} fill="none" stroke="#3d564f" strokeWidth="18" strokeLinecap="round" opacity=".35" />
                <path d={bridgePath} fill="none" stroke="#ba8b54" strokeWidth="14" strokeLinecap="round" />
                <path d={bridgePath} fill="none" stroke="#faecd0" strokeWidth="2.2" strokeDasharray="4 8" strokeLinecap="round" />
              </g>
            ))}

            {/* 連接中央主島的四座木橋 */}
            {SPOKE_BRIDGES.map((bridgePath, index) => (
              <g key={`spoke-bridge-${index}`} aria-hidden="true">
                <path d={bridgePath} fill="none" stroke="#3d564f" strokeWidth="18" strokeLinecap="round" opacity=".35" />
                <path d={bridgePath} fill="none" stroke="#ba8b54" strokeWidth="14" strokeLinecap="round" />
                <path d={bridgePath} fill="none" stroke="#faecd0" strokeWidth="2.2" strokeDasharray="4 8" strokeLinecap="round" />
              </g>
            ))}

            {/* 繪製各座島嶼（四周大島位置在四角外圍，100% 視角下僅露出邊緣一點點） */}
            {IDEAX_ISLANDS.map((island) => {
              const islandCoords: Record<string, [number, number]> = {
                home: [500, 340],
                pain: [80, 50],
                discussion: [920, 50],
                creative: [80, 630],
                career: [920, 630],
              };
              const [cx, cy] = islandCoords[island.id] || [island.mapPosition.x * 10, island.mapPosition.y * 6.8];
              const scale = ISLAND_SCALE[island.mapPosition.size];
              const isSelected = selectedIslandId === island.id;
              const islandShape = ISLAND_SHAPES[island.id] || DEFAULT_ISLAND_SHAPE;
              const count = contentCounts[island.id] || 0;
              const labelWidth = 176;
              const labelY = cy - 80 * scale;

              return (
                <g
                  key={island.id}
                  className={`island-map-node${isSelected ? ' is-selected' : ''}`}
                  data-island-id={island.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`探索${island.name}`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (Date.now() < suppressClickUntil.current) return;
                    handleSelectIsland(island.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectIsland(island.id);
                    }
                  }}
                >
                  <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
                    <path d={islandShape} transform="translate(0 24)" fill="#274648" opacity=".35" />
                    <path d={islandShape} transform="translate(0 12)" fill={island.mapPosition.edge} stroke="#f3e6c3" strokeWidth="5" strokeLinejoin="round" />
                    <path d={islandShape} fill={island.mapPosition.land} stroke="#f5ebcf" strokeWidth="6" strokeLinejoin="round" />
                    <path d={islandShape} fill="none" stroke="#ffffff" strokeOpacity=".4" strokeWidth="2" strokeDasharray="4 6" transform="scale(.92)" />
                    <IslandLandmark tint={island.mapPosition.land} islandId={island.id} />
                  </g>

                  {/* 島嶼標籤（無角色插畫） */}
                  <g className="island-map-label" transform={`translate(${cx - labelWidth / 2} ${labelY})`}>
                    <rect width={labelWidth} height="38" rx="19" />
                    <text className="island-label-icon" x="17" y="25">{island.icon}</text>
                    <text className="island-label-name" x="42" y="25">{island.name}</text>
                    {island.id === 'home' ? (
                      <text className="island-label-badge" x={labelWidth - 14} y="24" textAnchor="end">貿易街</text>
                    ) : count > 0 ? (
                      <text className="island-label-count" x={labelWidth - 14} y="24" textAnchor="end">{count}</text>
                    ) : null}
                  </g>
                  <circle className="island-map-ring" cx={cx} cy={cy} r={120 * scale} />
                </g>
              );
            })}

            {/* 四周大島迷霧層（在100%時露出一點點） */}
            <g className="island-fog-layer" aria-hidden="true" pointerEvents="none">
              <circle cx="80" cy="50" r="240" fill="url(#mist-nw)" />
              <circle cx="920" cy="50" r="240" fill="url(#mist-ne)" />
              <circle cx="80" cy="630" r="240" fill="url(#mist-sw)" />
              <circle cx="920" cy="630" r="240" fill="url(#mist-se)" />

              <path d="M 0 160 Q 250 110 500 170 T 1000 130" fill="none" stroke="#ffffff" strokeWidth="48" strokeLinecap="round" opacity="0.22" />
              <path d="M 0 520 Q 250 560 500 500 T 1000 530" fill="none" stroke="#ffffff" strokeWidth="54" strokeLinecap="round" opacity="0.25" />
            </g>
          </svg>
        </div>

        {/* 底部操作提示 */}
        <div className="island-map-hint">
          <Compass size={14} />
          <span>滑鼠左鍵：按住移動 · 右鍵拖曳：旋轉與調整俯視角 · 滾輪：縮放</span>
        </div>
      </div>

      {/* ============================================================
          右側島覽面板 (Right-side Atlas Panel)
          「島覽(地圖路徑、介紹、條列式題目瀏覽是再右邊)」
          ============================================================ */}
      <aside className={`island-right-atlas ${isRightAtlasOpen ? 'is-open' : ''}`}>
        {/* 左緣展開/收合按鈕 */}
        <button
          type="button"
          onClick={() => setIsRightAtlasOpen(!isRightAtlasOpen)}
          className="island-right-atlas-toggle"
          title={isRightAtlasOpen ? '收合島覽' : '展開島覽'}
        >
          {isRightAtlasOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <span className="vertical-text">{isRightAtlasOpen ? '收合島覽' : '島覽'}</span>
        </button>

        <div className="island-right-atlas-inner">
          {/* 地圖路徑導航條 (Breadcrumbs) */}
          <div className="island-atlas-header">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
              <MapPin size={14} className="text-amber-700" />
              <span
                onClick={() => {
                  setSelectedDistrictId(null);
                  setSelectedStreetId(null);
                  setSelectedStandId(null);
                }}
                className="cursor-pointer hover:text-stone-900"
              >
                {selectedIsland?.name || '創點國'}
              </span>
              {selectedDistrict && (
                <>
                  <ChevronRight size={12} className="text-stone-400" />
                  <span
                    onClick={() => {
                      setSelectedStreetId(null);
                      setSelectedStandId(null);
                    }}
                    className="cursor-pointer hover:text-stone-900"
                  >
                    {selectedDistrict.name}
                  </span>
                </>
              )}
              {selectedStreet && (
                <>
                  <ChevronRight size={12} className="text-stone-400" />
                  <span
                    onClick={() => setSelectedStandId(null)}
                    className="cursor-pointer hover:text-stone-900"
                  >
                    {selectedStreet.name}
                  </span>
                </>
              )}
              {selectedStand && (
                <>
                  <ChevronRight size={12} className="text-stone-400" />
                  <span className="text-emerald-800 font-black">{selectedStand.name}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsRightAtlasOpen(false)}
              className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              title="收合"
            >
              <X size={16} />
            </button>
          </div>

          <div className="island-atlas-scrollable">
            {/* 搜尋欄位 */}
            <div className="island-search-container">
              <Search size={15} className="text-stone-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜尋作品、痛點、討論或主題..."
              />
              {searchText && (
                <button type="button" onClick={() => setSearchText('')}>×</button>
              )}
            </div>

            {/* 搜尋結果模式 */}
            {searchText.trim() ? (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-500">搜尋結果 ({searchResults.length})</h4>
                <div className="island-cards-list">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="island-item-row"
                      onClick={() => handleOpenItemPreview(item)}
                    >
                      {(item.coverImage || item.cardDisplayImage) && (
                        <img
                          src={item.coverImage || item.cardDisplayImage}
                          alt=""
                          className="item-thumb"
                        />
                      )}
                      <div className="item-info">
                        <span className="item-cat">{item.category}</span>
                        <strong className="item-title">{item.title}</strong>
                      </div>
                      <ChevronRight size={15} className="text-stone-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* 當前島嶼/區域/街道/攤位簡介 */}
                <div className="island-current-intro-box">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                        <span>{selectedStand?.name || selectedStreet?.name || selectedDistrict?.name || selectedIsland?.name}</span>
                        {selectedIsland?.id === 'home' && !selectedStand && <span className="pill-badge">中央</span>}
                      </h2>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {selectedStand?.summary || selectedStreet?.subtitle || selectedDistrict?.subtitle || selectedIsland?.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* 快捷填寫與許願按鈕（點擊在左側開啟填寫彈窗） */}
                  <div className="mt-3 pt-2.5 border-t border-amber-900/10 flex flex-wrap gap-2">
                    {selectedIsland?.id === 'pain' && (
                      <button
                        type="button"
                        onClick={() => handleOpenFormModal('pain_point')}
                        className="quick-post-btn"
                      >
                        <Flame size={14} className="text-rose-600" />
                        <span>寫下我的難題（掌櫃阿點）</span>
                      </button>
                    )}
                    {selectedIsland?.id === 'career' && (
                      <button
                        type="button"
                        onClick={() => handleOpenFormModal('career_wish')}
                        className="quick-post-btn"
                      >
                        <BriefcaseBusiness size={14} className="text-amber-700" />
                        <span>向廟公求職許願</span>
                      </button>
                    )}
                    {selectedIsland?.id === 'discussion' && (
                      <button
                        type="button"
                        onClick={() => handleOpenFormModal('discussion')}
                        className="quick-post-btn"
                      >
                        <Users size={14} className="text-sky-700" />
                        <span>發起交流話題</span>
                      </button>
                    )}
                    {selectedIsland?.id === 'creative' && (
                      <button
                        type="button"
                        onClick={() => handleOpenFormModal('proposal')}
                        className="quick-post-btn"
                      >
                        <PanelsTopLeft size={14} className="text-emerald-700" />
                        <span>登錄創新提案</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 層級切換按鈕區（區 / 街 / 攤） */}
                {selectedIsland && !selectedDistrict && (
                  <div className="space-y-2 mt-3">
                    <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">所轄區域</h3>
                    <div className="island-items-list">
                      {selectedIsland.districts.map((dist) => (
                        <button
                          key={dist.id}
                          type="button"
                          onClick={() => setSelectedDistrictId(dist.id)}
                          className="island-choice-row"
                        >
                          <div className="choice-text">
                            <strong>{dist.name}</strong>
                            <small>{dist.subtitle}</small>
                          </div>
                          <span className="choice-count">{dist.streets.length} 街 <ChevronRight size={14} /></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDistrict && !selectedStreet && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">街道清單</h3>
                      <button
                        type="button"
                        onClick={() => setSelectedDistrictId(null)}
                        className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft size={12} /> 回上層
                      </button>
                    </div>
                    <div className="island-items-list">
                      {selectedDistrict.streets.map((street) => (
                        <button
                          key={street.id}
                          type="button"
                          onClick={() => setSelectedStreetId(street.id)}
                          className="island-choice-row"
                        >
                          <div className="choice-text">
                            <strong>{street.name}</strong>
                            <small>{street.subtitle}</small>
                          </div>
                          <span className="choice-count">{street.stands.length} 攤 <ChevronRight size={14} /></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStreet && !selectedStand && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">攤位場景</h3>
                      <button
                        type="button"
                        onClick={() => setSelectedStreetId(null)}
                        className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft size={12} /> 回街道
                      </button>
                    </div>
                    <div className="island-items-list">
                      {selectedStreet.stands.map((stand) => (
                        <button
                          key={stand.id}
                          type="button"
                          onClick={() => setSelectedStandId(stand.id)}
                          className="island-choice-row"
                        >
                          <div className="choice-text">
                            <strong>{stand.name}</strong>
                            <small>{stand.summary}</small>
                          </div>
                          <span className="choice-count">瀏覽 <ChevronRight size={14} /></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStand && (
                  <div className="mt-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setSelectedStandId(null)}
                      className="island-back-link mb-2"
                    >
                      <ArrowLeft size={13} /> 回街道攤位清單
                    </button>
                    <div className="island-stand-action-box">
                      <p className="prompt-text">{selectedStand.interactionPrompt}</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStand.contentKind === 'jobs') handleOpenFormModal('career_wish');
                          else if (selectedStand.contentFilter.source === 'pain') handleOpenFormModal('pain_point');
                          else if (selectedStand.contentFilter.source === 'discussion') handleOpenFormModal('discussion');
                          else if (selectedStand.contentFilter.source === 'proposal') handleOpenFormModal('proposal');
                          else onAction(selectedStand.npcProfile.action);
                        }}
                        className="stand-action-btn"
                      >
                        <span>{selectedStand.npcProfile.actionLabel}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* 條列式題目與作品瀏覽（條列式題目瀏覽是再右邊，點擊會在畫面左側跳出彈窗） */}
                <div className="mt-4 pt-3 border-t border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                      <ScrollText size={14} className="text-amber-700" />
                      <span>條列式內容瀏覽</span>
                    </h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900">
                      {currentStandQuestions.length} 則公開內容
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mb-2.5">
                    點擊任何卡片，將在畫面左側跳出彈窗顯示詳細內頁：
                  </p>

                  {currentStandQuestions.length > 0 ? (
                    <div className="island-cards-list">
                      {currentStandQuestions.map((q) => (
                        <div
                          key={q.id}
                          className="island-item-row"
                          onClick={() => handleOpenItemPreview(q)}
                        >
                          {(q.coverImage || q.cardDisplayImage) && (
                            <img
                              src={q.coverImage || q.cardDisplayImage}
                              alt=""
                              className="item-thumb"
                            />
                          )}
                          <div className="item-info">
                            <span className="item-cat">{q.category}</span>
                            <strong className="item-title">{q.title}</strong>
                            <span className="text-[10px] text-stone-400 mt-0.5 block truncate">
                              {q.authorName || 'IdeaX 創作者'} · 瀏覽 {q.viewsCount || q.views || 0}
                            </span>
                          </div>
                          <ChevronRight size={15} className="text-stone-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="island-empty-box">
                      <p>此處暫無內容，您可點擊上方按鈕送出第一則！</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ============================================================
          左側彈出彈窗/抽屜 (Left-side Modal / Drawer)
          「點擊會在畫面左側跳出彈窗顯示詳細內頁，填寫表單、需求也都是在左邊」
          ============================================================ */}
      <aside className={`island-left-drawer ${leftModalMode !== 'none' ? 'is-open' : ''}`}>
        <div className="island-left-drawer-inner">
          {/* 詳細內頁預覽彈窗 (點擊右側卡片時彈出) */}
          {leftModalMode === 'preview' && previewQuestion && (
            <div className="island-preview-pane">
              <div className="island-pane-header">
                <span className="island-preview-badge">
                  {previewQuestion.postType === 'pain_point'
                    ? '痛點需求'
                    : previewQuestion.postType === 'innovation_proposal'
                    ? '創新提案'
                    : previewQuestion.postType === 'chat_discussion'
                    ? '交流討論'
                    : isGameQuestion(previewQuestion)
                    ? '遊戲作品'
                    : '作品展示'}
                </span>
                <button
                  type="button"
                  onClick={() => setLeftModalMode('none')}
                  className="island-drawer-close"
                  aria-label="關閉左側彈窗"
                >
                  <X size={16} />
                </button>
              </div>

              {(previewQuestion.coverImage || previewQuestion.cardDisplayImage) && (
                <div className="island-preview-media">
                  <img
                    src={previewQuestion.coverImage || previewQuestion.cardDisplayImage}
                    alt={previewQuestion.title}
                  />
                </div>
              )}

              <div className="island-preview-body">
                <div className="island-preview-meta">
                  <span className="category-tag">{previewQuestion.category}</span>
                  {previewQuestion.subcategory && <span className="sub-tag">{previewQuestion.subcategory}</span>}
                  {previewQuestion.tertiaryCategory && <span className="sub-tag">{previewQuestion.tertiaryCategory}</span>}
                </div>

                <h2 className="island-preview-title">{previewQuestion.title}</h2>

                <div className="island-preview-author">
                  <img
                    src={previewQuestion.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={previewQuestion.authorName || '創作者'}
                    className="author-avatar"
                  />
                  <div>
                    <span className="author-name">{previewQuestion.authorName || 'IdeaX 使用者'}</span>
                    <span className="author-date">{previewQuestion.createdAt || '近期發布'}</span>
                  </div>
                </div>

                <div className="island-preview-desc">
                  <p>{previewQuestion.description}</p>
                </div>

                {/* 關鍵按鈕：需要遊玩遊戲或外部連結則以「開啟新分頁」不要影響地圖這頁 */}
                <div className="island-preview-actions">
                  {(previewQuestion.demoUrl || previewQuestion.externalLink || previewQuestion.exclusiveChallengeUrl || isGameQuestion(previewQuestion) || previewQuestion.postType === 'vibecoding_app') ? (
                    <button
                      type="button"
                      onClick={() => {
                        const targetUrl =
                          previewQuestion.demoUrl ||
                          previewQuestion.externalLink ||
                          previewQuestion.exclusiveChallengeUrl ||
                          `https://${previewQuestion.id}.example.com`;
                        window.open(targetUrl, '_blank', 'noopener,noreferrer');
                      }}
                      className="island-action-primary-btn"
                    >
                      <Gamepad2 size={16} />
                      <span>在新分頁開啟遊戲體驗 / 作品連結 ↗</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      onOpenQuestion(previewQuestion);
                    }}
                    className="island-action-secondary-btn"
                  >
                    <span>在平台中開啟完整貼文與深度交流 ↗</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 填寫表單與需求彈窗 (在畫面左側彈出) */}
          {leftModalMode === 'form' && (
            <div className="island-form-pane">
              <div className="island-pane-header">
                <h3 className="font-black text-sm text-stone-900">
                  {formType === 'pain_point' && '🔥 創點樓 · 寫下你的難題'}
                  {formType === 'career_wish' && '🧧 求職廟 · 向廟公許願求職'}
                  {formType === 'discussion' && '💬 日常討論街 · 發起交流話題'}
                  {formType === 'proposal' && '💡 展覽館 · 登錄創新提案'}
                </h3>
                <button
                  type="button"
                  onClick={() => setLeftModalMode('none')}
                  className="island-drawer-close"
                  aria-label="關閉左側彈窗"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 類型切換選單 */}
              <div className="island-form-type-selector">
                <button
                  type="button"
                  className={formType === 'pain_point' ? 'active' : ''}
                  onClick={() => handleOpenFormModal('pain_point')}
                >
                  痛點難題
                </button>
                <button
                  type="button"
                  className={formType === 'career_wish' ? 'active' : ''}
                  onClick={() => handleOpenFormModal('career_wish')}
                >
                  求職廟許願
                </button>
                <button
                  type="button"
                  className={formType === 'discussion' ? 'active' : ''}
                  onClick={() => handleOpenFormModal('discussion')}
                >
                  討論交流
                </button>
                <button
                  type="button"
                  className={formType === 'proposal' ? 'active' : ''}
                  onClick={() => handleOpenFormModal('proposal')}
                >
                  創新提案
                </button>
              </div>

              <div className="island-form-prompt-box">
                <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p>
                  {formType === 'pain_point' && '客官請講！創點樓掌櫃阿點替您備好筆墨卷軸，說說您切身遇到的問題與需求。'}
                  {formType === 'career_wish' && '信士請進！求職廟廟公將聆聽您的求職需求並紀錄，用來在匯職缺為您精準比對工作。'}
                  {formType === 'discussion' && '開一桌新話題！邀請全島朋友坐下一同切磋探討。'}
                  {formType === 'proposal' && '登錄創新作品與點子！在展覽館展示給島民與潛在合作夥伴。'}
                </p>
              </div>

              {formSubmitSuccess ? (
                <div className="island-form-success">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                  <h4>紀錄已送出！</h4>
                  <p>{formSubmitSuccess}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormSubmitSuccess(null);
                      setFormData({ title: '', category: '資訊科技', description: '', tags: '' });
                    }}
                    className="island-btn-pill mt-3"
                  >
                    再填一則
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="island-form-body">
                  <div className="island-field-group">
                    <label>
                      {formType === 'career_wish' ? '期望職稱 / 目標職位' : '主題標題'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        formType === 'career_wish'
                          ? '例如：資深前端工程師、AI 產品經理...'
                          : formType === 'pain_point'
                          ? '例如：找尋能自動整理多平台財務報表的工具...'
                          : '請輸入標題名稱...'
                      }
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="island-field-group">
                    <label>領域分類</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="資訊科技">資訊科技</option>
                      <option value="商業經營">商業經營</option>
                      <option value="生醫療材">生醫療材</option>
                      <option value="創意設計">創意設計</option>
                      <option value="日常生活">日常生活</option>
                      <option value="學術探討">學術探討</option>
                    </select>
                  </div>

                  <div className="island-field-group">
                    <label>
                      {formType === 'career_wish' ? '個人專長技能與工作期望條件' : '詳細需求描述'}
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder={
                        formType === 'career_wish'
                          ? '請描述您的技能專長、期望地區、薪資條件或特殊需求，廟公將為您紀錄並精準比對...'
                          : '請詳細描述您遇到的難題與期望解法...'
                      }
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="island-field-group">
                    <label>關鍵標籤（選填，以逗點分隔）</label>
                    <input
                      type="text"
                      placeholder="例如：遠距, React, AI, 專案合作"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="island-form-submit-btn">
                    <Send size={15} />
                    <span>送出並紀錄需求</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* 說明彈窗 (1:1 還原用戶設計圖) */}
      {showGuideModal && (
        <div className="island-guide-modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="island-guide-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* 頂部：標題小字與圓形關閉按鈕 */}
            <div className="guide-modal-top-row">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-[#9b835e] flex items-center justify-center text-[#9b835e]">
                  <Compass size={13} />
                </div>
                <span className="text-[12px] font-bold text-[#9b835e] tracking-[0.22em] uppercase">
                  IDEA X • 島覽
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="guide-modal-circle-close"
                aria-label="關閉說明"
              >
                <X size={16} />
              </button>
            </div>

            {/* 大標題 */}
            <h2 className="guide-main-title">在海上逛逛</h2>

            {/* 副標說明 */}
            <p className="guide-main-desc">
              點選島嶼進入探索。按住左鍵可平移地圖；按住右鍵拖曳可左右旋轉並調整俯視角度。
            </p>

            {/* 3 卡並排操作指示 */}
            <div className="guide-mouse-grid">
              {/* 1. 左鍵按住移動 */}
              <div className="guide-mouse-card">
                <div className="guide-mouse-icon-wrap">
                  <svg width="26" height="36" viewBox="0 0 26 36" fill="none">
                    <rect x="2" y="2" width="22" height="32" rx="11" stroke="#5b6e67" strokeWidth="1.8" fill="white" />
                    <path d="M2 13 H13 V2 C6.925 2 2 6.925 2 13Z" fill="#9b835e" />
                    <line x1="13" y1="2" x2="13" y2="15" stroke="#5b6e67" strokeWidth="1.5" />
                    <line x1="2" y1="15" x2="24" y2="15" stroke="#5b6e67" strokeWidth="1.5" />
                  </svg>
                </div>
                <strong className="guide-card-title">左鍵按住</strong>
                <span className="guide-card-sub">按住移動、平移地圖</span>
              </div>

              {/* 2. 右鍵拖曳 */}
              <div className="guide-mouse-card">
                <div className="guide-mouse-icon-wrap">
                  <svg width="26" height="36" viewBox="0 0 26 36" fill="none">
                    <rect x="2" y="2" width="22" height="32" rx="11" stroke="#5b6e67" strokeWidth="1.8" fill="white" />
                    <path d="M13 2 V13 H24 C24 6.925 19.075 2 13 2Z" fill="#9b835e" />
                    <line x1="13" y1="2" x2="13" y2="15" stroke="#5b6e67" strokeWidth="1.5" />
                    <line x1="2" y1="15" x2="24" y2="15" stroke="#5b6e67" strokeWidth="1.5" />
                  </svg>
                </div>
                <strong className="guide-card-title">右鍵拖曳</strong>
                <span className="guide-card-sub">左右旋轉、調整俯視角</span>
              </div>

              {/* 3. 滑鼠滾輪 */}
              <div className="guide-mouse-card">
                <div className="guide-mouse-icon-wrap">
                  <svg width="26" height="36" viewBox="0 0 26 36" fill="none">
                    <rect x="2" y="2" width="22" height="32" rx="11" stroke="#5b6e67" strokeWidth="1.8" fill="white" />
                    <line x1="13" y1="2" x2="13" y2="15" stroke="#5b6e67" strokeWidth="1.5" />
                    <line x1="2" y1="15" x2="24" y2="15" stroke="#5b6e67" strokeWidth="1.5" />
                    <rect x="10.5" y="6" width="5" height="12" rx="2.5" stroke="#9b835e" strokeWidth="1.2" fill="#faf6ee" />
                    <path d="M13 9.5 V14.5 M11.5 11 L13 9.5 L14.5 11 M11.5 13 L13 14.5 L14.5 13" stroke="#9b835e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <strong className="guide-card-title">滑鼠滾輪</strong>
                <span className="guide-card-sub">縮放遠近</span>
              </div>
            </div>

            {/* 觸控操作提示框 */}
            <div className="guide-touch-box">
              <h4 className="guide-touch-title">觸控操作</h4>
              <p className="guide-touch-desc">
                單指拖曳平移地圖，雙指捏合縮放與旋轉；頂部工具列可重設視角。
              </p>
            </div>

            {/* 開始探索按鈕 */}
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="guide-start-btn"
            >
              <span>開始探索</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

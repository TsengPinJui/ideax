import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudRain,
  Compass,
  Flame,
  Gamepad2,
  HelpCircle,
  MapPin,
  Minus,
  Moon,
  PanelsTopLeft,
  Plus,
  RotateCcw,
  ScrollText,
  Search,
  Send,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Users,
  X,
} from 'lucide-react';
import {
  IslandAction,
  IDEAX_ISLANDS,
  matchesIslandContent,
} from '../../data/islandWorld';
import { Question } from '../../types';
import { getEffectiveTertiaryCategory, isGameQuestion } from '../../utils/gameClassification';
import {
  getDisplayShichen,
  getSceneTitle,
  getUtc8TimeInfo,
  ISLAND_WORLD_CENTERS,
  IslandScene3D,
  TIME_OF_DAY_CONFIGS,
  TimeOfDayMode,
  TimeOfDayPhase,
  WeatherMode,
  WeatherType,
} from './IslandScene3D';
import {
  computeIslandPresenceAllocation,
  getOrCreateIslandSessionId,
  IslandBuildingId,
  IslandOnlineUserRecord,
  publishLocalPresence,
  readLocalPresenceList,
  resolveIslandBuildingFromSelection,
  subscribeLocalPresenceChanges,
} from '../../utils/islandPresence';
import './IslandWorldView.css';

interface IslandWorldViewProps {
  questions: Question[];
  onOpenQuestion: (question: Question) => void;
  onAction: (action: IslandAction) => void;
  onBack?: () => void;
}

export const IslandWorldView: React.FC<IslandWorldViewProps> = ({
  questions,
  onOpenQuestion,
  onAction,
  onBack,
}) => {
  // 3D 俯視視角 (Pitch: 18° ~ 74°，預設 42°)、左右旋轉 (Yaw) 與平移位置 (panX, panY)
  const [view, setView] = useState({ zoom: 1, pitch: 42, yaw: 0, panX: 0, panY: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // +8 時區 (Asia/Taipei) 時間與天氣場景狀態（支援自動依 +8 時間變換 + 手動預覽 8 大場景）
  const [utc8Now, setUtc8Now] = useState(() => getUtc8TimeInfo());
  const [timeMode, setTimeMode] = useState<TimeOfDayMode>('auto');
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('auto');
  const [showAtmosphereMenu, setShowAtmosphereMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setUtc8Now(getUtc8TimeInfo());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const activeTimePhase: TimeOfDayPhase = timeMode === 'auto' ? utc8Now.phase : timeMode;
  const activeWeather: WeatherType = weatherMode === 'auto' ? 'clear' : weatherMode;
  const activeSceneTitle = getSceneTitle(activeTimePhase, activeWeather);
  const shichenDisplay = getDisplayShichen(timeMode, utc8Now);

  // 選中層級狀態（島 -> 區 -> 街 -> 攤）
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>('home');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedStreetId, setSelectedStreetId] = useState<string | null>(null);
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);

  // 右側「島覽」導覽面板狀態（默認收合，點擊島嶼或標籤後展開）
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
  const [bountyWallCategory, setBountyWallCategory] = useState<string>('全部');
  const [localPublishedQuestions, setLocalPublishedQuestions] = useState<Question[]>([]);

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 線上真人位置與最多 25 位小人比例分配系統
  const [onlinePresenceUsers, setOnlinePresenceUsers] = useState<IslandOnlineUserRecord[]>(() =>
    readLocalPresenceList(),
  );

  const currentBuildingId: IslandBuildingId = useMemo(
    () => resolveIslandBuildingFromSelection(selectedIslandId, selectedDistrictId, selectedStandId),
    [selectedIslandId, selectedDistrictId, selectedStandId],
  );

  // 若打開左側內頁預覽、表單或進入特定攤位則視為「正在使用功能 (using)」，否則為「瀏覽功能 (browsing)」
  const currentActivityType: 'browsing' | 'using' = useMemo(
    () => (leftModalMode !== 'none' || Boolean(selectedStandId) ? 'using' : 'browsing'),
    [leftModalMode, selectedStandId],
  );

  useEffect(() => {
    const sessionId = getOrCreateIslandSessionId();
    let mounted = true;

    const syncPresence = async () => {
      const myRecord: IslandOnlineUserRecord = {
        userId: sessionId,
        displayName: '線上訪客',
        buildingId: currentBuildingId,
        activity: currentActivityType,
        updatedAt: Date.now(),
      };
      const localList = publishLocalPresence(myRecord);

      try {
        const res = await fetch('/api/island/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(myRecord),
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data?.users) && data.users.length > 0) {
            setOnlinePresenceUsers(data.users);
            return;
          }
        }
      } catch {
        // Fallback to local multi-tab presence list
      }
      if (mounted) {
        setOnlinePresenceUsers(localList);
      }
    };

    syncPresence();
    const interval = setInterval(syncPresence, 8000);
    const unsubscribe = subscribeLocalPresenceChanges(() => {
      if (mounted) {
        setOnlinePresenceUsers((prev) => {
          const local = readLocalPresenceList();
          const map = new Map<string, IslandOnlineUserRecord>();
          prev.forEach((u) => map.set(u.userId, u));
          local.forEach((u) => map.set(u.userId, u));
          return Array.from(map.values());
        });
      }
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [currentBuildingId, currentActivityType]);

  const presenceSummary = useMemo(
    () => computeIslandPresenceAllocation(onlinePresenceUsers, 25),
    [onlinePresenceUsers],
  );

  const mapStageRef = useRef<HTMLDivElement>(null);
  const pointerPositions = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{
    pointerId: number;
    pointerType: string;
    button: number;
    x: number;
    y: number;
    pitch: number;
    yaw: number;
    panX: number;
    panY: number;
    moved: boolean;
    islandId: string | null;
    districtId: string | null;
  } | null>(null);
  const pinchStart = useRef<{
    distance: number;
    zoom: number;
    angle: number;
    yaw: number;
  } | null>(null);
  const suppressClickUntil = useRef(0);

  const selectedIsland = IDEAX_ISLANDS.find((island) => island.id === selectedIslandId) || null;
  const selectedDistrict = selectedIsland?.districts.find((district) => district.id === selectedDistrictId) || null;
  const selectedStreet = selectedDistrict?.streets.find((street) => street.id === selectedStreetId) || null;
  const selectedStand = selectedStreet?.stands.find((item) => item.id === selectedStandId) || null;

  const mergedQuestions = useMemo(
    () => [...localPublishedQuestions, ...questions],
    [localPublishedQuestions, questions],
  );

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
                  (item.contentKind === 'questions'
                    ? mergedQuestions.filter((q) => matchesIslandContent(q, item.contentFilter)).length
                    : 0),
                0,
              ),
            0,
          ),
        0,
      );
    }
    return counts;
  }, [mergedQuestions]);

  const arcadeGameQuestions = useMemo(
    () => mergedQuestions.filter((q) => matchesIslandContent(q, { source: 'game' })),
    [mergedQuestions],
  );

  const allPainQuestions = useMemo(
    () => mergedQuestions.filter((q) => matchesIslandContent(q, { source: 'pain' })),
    [mergedQuestions],
  );

  const bountyWallCategories = useMemo(() => {
    const dynamicCats = Array.from(
      new Set(
        allPainQuestions
          .flatMap((q) => [q.category, q.subcategory])
          .map((c) => (c || '').trim())
          .filter(Boolean),
      ),
    );
    const preset = ['資訊科技', '商業經營', '日常生活', '創意設計', '生醫療材', '學術探討'];
    return ['全部', ...Array.from(new Set([...dynamicCats, ...preset]))];
  }, [allPainQuestions]);

  const currentStandQuestions = useMemo(() => {
    const filterByBountyCategory = (list: Question[]) => {
      if (bountyWallCategory === '全部') return list;
      return list.filter(
        (q) => q.category === bountyWallCategory || q.subcategory === bountyWallCategory,
      );
    };

    if (selectedStand) {
      const baseList = mergedQuestions.filter((q) => matchesIslandContent(q, selectedStand.contentFilter));
      if (selectedStand.id === 'pain-bounty-wall' || selectedIsland?.id === 'pain') {
        return filterByBountyCategory(baseList);
      }
      return baseList;
    }
    if (selectedStreet) {
      const list = mergedQuestions.filter((q) =>
        selectedStreet.stands.some((st) => matchesIslandContent(q, st.contentFilter)),
      );
      return selectedIsland?.id === 'pain' ? filterByBountyCategory(list) : list;
    }
    if (selectedDistrict) {
      const list = mergedQuestions.filter((q) =>
        selectedDistrict.streets.some((str) => str.stands.some((st) => matchesIslandContent(q, st.contentFilter))),
      );
      return selectedIsland?.id === 'pain' ? filterByBountyCategory(list) : list;
    }
    if (selectedIsland) {
      const list = mergedQuestions.filter((q) =>
        selectedIsland.districts.some((dist) =>
          dist.streets.some((str) => str.stands.some((st) => matchesIslandContent(q, st.contentFilter))),
        ),
      );
      return selectedIsland.id === 'pain' ? filterByBountyCategory(list) : list;
    }
    return mergedQuestions.slice(0, 15);
  }, [mergedQuestions, selectedStand, selectedStreet, selectedDistrict, selectedIsland, bountyWallCategory]);

  const searchResults = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase();
    if (!term) return [];
    return mergedQuestions
      .filter((q) => q.status !== 'delisted')
      .filter((q) =>
        [q.title, q.appName, q.description, q.category, q.subcategory, q.tertiaryCategory, ...(q.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(term),
      )
      .slice(0, 15);
  }, [mergedQuestions, searchText]);

  const updateZoom = (nextZoom: number) => {
    setView((v) => ({ ...v, zoom: Math.min(2.4, Math.max(0.4, nextZoom)) }));
  };

  const resetView = () => {
    setView({
      zoom: 1,
      pitch: 42,
      yaw: 0,
      panX: 0,
      panY: 0,
    });
  };

  // 滑鼠滾輪縮放（支援最小 40% 至最大 240%）
  useEffect(() => {
    const stage = mapStageRef.current;
    if (!stage) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if ((e.target as Element)?.closest('.island-ui-interactive')) return;
      const factor = Math.exp(-e.deltaY * 0.0014);
      setView((v) => ({
        ...v,
        zoom: Math.min(2.4, Math.max(0.4, v.zoom * factor)),
      }));
    };
    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, []);

  // 支援電腦版（左鍵平移、右鍵俯視角/旋轉）與手機版（單指一律拖曳+俯角、雙指轉向與縮放）
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.button !== 0 && e.button !== 2) || (e.target as Element).closest('.island-ui-interactive')) return;
    if (showAtmosphereMenu) setShowAtmosphereMenu(false);

    e.currentTarget.setPointerCapture(e.pointerId);
    pointerPositions.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointerPositions.current.size === 1) {
      const hotspotEl = (e.target as Element).closest<HTMLElement>('[data-island-id]');
      const islandId = hotspotEl?.dataset.islandId || null;
      const districtId = hotspotEl?.dataset.districtId || null;

      dragStart.current = {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        button: e.button,
        x: e.clientX,
        y: e.clientY,
        pitch: view.pitch,
        yaw: view.yaw,
        panX: view.panX,
        panY: view.panY,
        moved: false,
        islandId,
        districtId,
      };
      setIsDragging(true);
    } else if (pointerPositions.current.size === 2) {
      suppressClickUntil.current = Date.now() + 600;
      const [first, second] = Array.from(pointerPositions.current.values());
      pinchStart.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        zoom: view.zoom,
        angle: Math.atan2(second.y - first.y, second.x - first.x) * (180 / Math.PI),
        yaw: view.yaw,
      };
      dragStart.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerPositions.current.has(e.pointerId)) return;
    pointerPositions.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 手機雙指：轉向 (yaw) 與 縮放 (zoom)
    if (pointerPositions.current.size >= 2 && pinchStart.current) {
      const [first, second] = Array.from(pointerPositions.current.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const angle = Math.atan2(second.y - first.y, second.x - first.x) * (180 / Math.PI);

      let deltaAngle = angle - pinchStart.current.angle;
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;

      const nextYaw = (pinchStart.current.yaw - deltaAngle) % 360;
      const nextZoom =
        pinchStart.current.distance > 0
          ? Math.min(2.4, Math.max(0.4, (pinchStart.current.zoom * distance) / pinchStart.current.distance))
          : view.zoom;

      setView((v) => ({ ...v, zoom: nextZoom, yaw: nextYaw }));
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

    const isTouch = start.pointerType === 'touch' || window.innerWidth < 768;

    if (!isTouch) {
      // 電腦版：右鍵拖曳調整俯視角與旋轉；左鍵按住平移地圖
      if (start.button === 2) {
        const nextYaw = (start.yaw + deltaX * 0.38) % 360;
        const nextPitch = Math.max(18, Math.min(74, start.pitch + deltaY * 0.32));
        setView((v) => ({ ...v, yaw: nextYaw, pitch: nextPitch }));
      } else {
        const nextPanX = Math.max(-850, Math.min(850, start.panX + deltaX));
        const nextPanY = Math.max(-650, Math.min(650, start.panY + deltaY));
        setView((v) => ({ ...v, panX: nextPanX, panY: nextPanY }));
      }
    } else {
      // 手機版（單指一律拖曳+俯角）：左右上下拖曳地圖，同時上下滑動調整俯視角
      const nextPanX = Math.max(-850, Math.min(850, start.panX + deltaX * 0.9));
      const nextPanY = Math.max(-650, Math.min(650, start.panY + deltaY * 0.7));
      const nextPitch = Math.max(18, Math.min(74, start.pitch + deltaY * 0.28));
      setView((v) => ({
        ...v,
        panX: nextPanX,
        panY: nextPanY,
        pitch: nextPitch,
      }));
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>, allowClick: boolean) => {
    const active = dragStart.current?.pointerId === e.pointerId ? dragStart.current : null;
    const wasDragged = Boolean(active?.moved);

    if (wasDragged) {
      suppressClickUntil.current = Date.now() + 200;
    } else if (allowClick && active?.islandId) {
      suppressClickUntil.current = Date.now() + 200;
      handleSelectIsland(active.islandId, active.districtId || undefined);
    }

    pointerPositions.current.delete(e.pointerId);
    if (pointerPositions.current.size < 2) pinchStart.current = null;

    if (pointerPositions.current.size === 1) {
      // 若從雙指放開一指回到單指，重設剩餘手指的拖曳基準點，避免視角跳動
      const [remId, remPos] = Array.from(pointerPositions.current.entries())[0];
      dragStart.current = {
        pointerId: remId,
        pointerType: e.pointerType,
        button: 0,
        x: remPos.x,
        y: remPos.y,
        pitch: view.pitch,
        yaw: view.yaw,
        panX: view.panX,
        panY: view.panY,
        moved: true,
        islandId: null,
        districtId: null,
      };
    } else if (dragStart.current?.pointerId === e.pointerId || pointerPositions.current.size === 0) {
      dragStart.current = null;
      setIsDragging(false);
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // 點擊島嶼或特定建築：展開/更新右側島覽面板
  const handleSelectIsland = (islandId: string, districtId?: string) => {
    const target = IDEAX_ISLANDS.find((i) => i.id === islandId);
    if (target) {
      setSelectedIslandId(target.id);
      // 痛點島就一個「創點樓」，點擊痛點島直接進入創點樓
      const effectiveDistrictId =
        districtId || (target.id === 'pain' ? 'pain-innovation-tower' : null);
      setSelectedDistrictId(effectiveDistrictId);
      setSelectedStreetId(null);
      setSelectedStandId(null);
      setIsRightAtlasOpen(true);
    }
  };

  // 點擊島名（75% 及以下遠景時）：自動聚焦到 100% 並顯示該島建築物名稱
  const handleFocusIsland = (islandId: string) => {
    const [wx, wz] = ISLAND_WORLD_CENTERS[islandId] || [0, 0];
    const targetZoom = 1.0; // 100%
    const panFactor = 0.055 / Math.max(0.42, targetZoom);
    const yawRad = (-view.yaw * Math.PI) / 180;
    const cosY = Math.cos(yawRad);
    const sinY = Math.sin(yawRad);
    const dz = wz - 1.5;
    const localRight = wx * cosY - dz * sinY;
    const localForward = wx * sinY + dz * cosY;

    setView((v) => ({
      ...v,
      zoom: targetZoom,
      panX: Math.max(-850, Math.min(850, -localRight / panFactor)),
      panY: Math.max(-650, Math.min(650, -localForward / panFactor)),
    }));
    handleSelectIsland(islandId);
  };

  // 點擊卡片：在畫面左側跳出詳細內頁彈窗
  const handleOpenItemPreview = (question: Question) => {
    setPreviewQuestion(question);
    setLeftModalMode('preview');
  };

  // 點擊填寫按鈕：在畫面左側跳出填寫表單彈窗
  const handleOpenFormModal = (
    type: 'pain_point' | 'career_wish' | 'discussion' | 'proposal',
    defaultCategory?: string,
  ) => {
    setFormType(type);
    setFormSubmitSuccess(null);
    setFormData({
      title: '',
      category:
        defaultCategory && defaultCategory !== '全部'
          ? defaultCategory
          : type === 'pain_point'
          ? '資訊科技'
          : type === 'career_wish'
          ? '資訊科技'
          : type === 'proposal'
          ? '創意設計'
          : '日常生活',
      description: '',
      tags: '',
    });
    setLeftModalMode('form');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (formType === 'pain_point') {
      const parsedTags = formData.tags
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      const newPainQuestion: Question = {
        id: `pain-local-${Date.now()}`,
        title: formData.title.trim(),
        description: formData.description.trim() || formData.title.trim(),
        category: (formData.category as Question['category']) || '日常疑難',
        subcategory: formData.category,
        tags: parsedTags.length > 0 ? parsedTags : [formData.category],
        level: 'L1',
        postType: 'pain_point',
        specialZone: 'pain_points',
        bounty: 0,
        status: 'open',
        createdAt: '剛剛刊登',
        deadline: '2026-12-31',
        authorId: 'current-user',
        authorName: '創點樓客官',
        authorAvatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        answersCount: 0,
        views: 1,
        viewsCount: 1,
      };
      setLocalPublishedQuestions((prev) => [newPainQuestion, ...prev]);
      if (bountyWallCategory !== '全部' && bountyWallCategory !== formData.category) {
        setBountyWallCategory(formData.category);
      }
    }

    setFormSubmitSuccess(
      formType === 'pain_point'
        ? `已成功將痛點「${formData.title.trim()}」刊登至創點樓懸賞牆（${formData.category}）！`
        : `已成功向「${
            formType === 'career_wish'
              ? '求職廟廟公'
              : formType === 'proposal'
              ? '展覽館策展人'
              : '日常討論街'
          }」送出紀錄！`,
    );
    setFormData((prev) => ({
      ...prev,
      title: '',
      description: '',
      tags: '',
    }));
    setTimeout(() => {
      setFormSubmitSuccess(null);
    }, 5000);
  };

  const renderPhaseIcon = (phase: TimeOfDayPhase, weather: WeatherType) => {
    if (weather === 'rain') return <CloudRain size={14} />;
    if (phase === 'morning') return <Sunrise size={14} />;
    if (phase === 'noon') return <Sun size={14} />;
    if (phase === 'dusk') return <Sunset size={14} />;
    return <Moon size={14} />;
  };

  return (
    <div
      className={`island-world-fullscreen-container phase-${activeTimePhase} weather-${activeWeather}`}
    >
      {/* 3D 地圖視角舞臺 */}
      <div
        ref={mapStageRef}
        className={`island-3d-stage${isDragging ? ' is-dragging' : ''}`}
        aria-label="IdeaX 創點國 3D 俯視地圖：電腦左鍵平移、右鍵調整俯視角與旋轉；手機單指移動並調整俯視角"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerEnd(e, true)}
        onPointerCancel={(e) => handlePointerEnd(e, false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 左上角返回圓鈕 */}
        <div className="island-top-left-back island-ui-interactive">
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
        </div>

        {/* 頂部中間：IdeaX 創點國 — 島覽 — */}
        <div className="island-top-center-brand">
          <div className="island-brand-text-center">
            <h1 className="island-map-main-title">IdeaX 創點國</h1>
            <div className="island-subtitle-row">
              <p className="island-map-subtitle">— 島覽 —</p>
            </div>
          </div>
        </div>

        {/* 右上角：時辰顯示（純文字不用背框，z-index 低於右側島覽欄因此可被右側欄自然遮蓋；點擊可預覽切換 8 大時辰場景） */}
        <div className="island-top-right-shichen island-ui-interactive">
          <button
            type="button"
            onClick={() => setShowAtmosphereMenu((prev) => !prev)}
            className="island-shichen-pure-text-btn"
            title="點擊切換 +8 時區時辰與晴雨場景"
          >
            <span className="shichen-main-row">
              {renderPhaseIcon(activeTimePhase, activeWeather)}
              <span className="shichen-calligraphy-title">
                {shichenDisplay.shichenName} · {activeSceneTitle}
              </span>
            </span>
            <span className="shichen-sub-row">
              {shichenDisplay.shichenAlias} · +8區 {utc8Now.timeString}
            </span>
          </button>

          {/* +8 時區 8 大場景彈出選單 */}
          {showAtmosphereMenu && (
            <div
              className="island-atmosphere-dropdown is-right-aligned"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="atmos-dropdown-header">
                <div className="flex items-center gap-1.5 text-xs font-black text-stone-800">
                  <Clock size={14} className="text-amber-700" />
                  <span>
                    {shichenDisplay.shichenName}（+8區 {utc8Now.timeString}）
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTimeMode('auto');
                    setWeatherMode('auto');
                  }}
                  className={`atmos-auto-pill ${
                    timeMode === 'auto' && weatherMode === 'auto' ? 'active' : ''
                  }`}
                >
                  依 +8 時間自動
                </button>
              </div>

              <div className="atmos-grid-section">
                <span className="atmos-section-label">晴朗 / 晨霧四景</span>
                <div className="atmos-scene-grid">
                  {(['morning', 'noon', 'dusk', 'night'] as TimeOfDayPhase[]).map((ph) => {
                    const isCurrent = activeTimePhase === ph && activeWeather === 'clear';
                    return (
                      <button
                        key={`clear-${ph}`}
                        type="button"
                        onClick={() => {
                          setTimeMode(ph);
                          setWeatherMode('clear');
                        }}
                        className={`atmos-scene-btn ${isCurrent ? 'active' : ''}`}
                      >
                        <span className="font-black">{TIME_OF_DAY_CONFIGS[ph].clearLabel}</span>
                        <small>{TIME_OF_DAY_CONFIGS[ph].timeRange}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="atmos-grid-section mt-2">
                <span className="atmos-section-label">煙雨四景（加上雨天）</span>
                <div className="atmos-scene-grid">
                  {(['morning', 'noon', 'dusk', 'night'] as TimeOfDayPhase[]).map((ph) => {
                    const isCurrent = activeTimePhase === ph && activeWeather === 'rain';
                    return (
                      <button
                        key={`rain-${ph}`}
                        type="button"
                        onClick={() => {
                          setTimeMode(ph);
                          setWeatherMode('rain');
                        }}
                        className={`atmos-scene-btn is-rain ${isCurrent ? 'active' : ''}`}
                      >
                        <span className="font-black">{TIME_OF_DAY_CONFIGS[ph].rainLabel}</span>
                        <small>動態落雨 · 漣漪</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部置中視角控制工具列（原本在頂部的縮放、重設視角、說明移到底部，並移除原本底部的島嶼列） */}
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

        {/* ============================================================
            主舞台內容：Three.js 3D 立體建模（支援 +8 時區 8 大時辰與天氣動態場景）
            ============================================================ */}
        <IslandScene3D
          view={view}
          timePhase={activeTimePhase}
          weather={activeWeather}
          selectedIslandId={selectedIslandId}
          contentCounts={contentCounts}
          avatars={presenceSummary.avatars}
          buildingStats={presenceSummary.buildingStats}
          onSelectIsland={handleSelectIsland}
          onFocusIsland={handleFocusIsland}
        />
      </div>

      {/* ============================================================
          右側島覽面板 (Right-side Atlas Panel)
          ============================================================ */}
      <aside className={`island-right-atlas ${isRightAtlasOpen ? 'is-open' : ''}`}>
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
              {selectedStreet &&
                selectedDistrict?.id !== 'creative-exhibition' &&
                selectedDistrict?.id !== 'pain-innovation-tower' && (
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
            <div className="island-search-container">
              <Search size={15} className="text-stone-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜尋作品、痛點、討論或主題..."
              />
              {searchText && (
                <button type="button" onClick={() => setSearchText('')}>
                  ×
                </button>
              )}
            </div>

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
                <div className="island-current-intro-box">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                        <span>
                          {selectedStand?.name ||
                            selectedStreet?.name ||
                            selectedDistrict?.name ||
                            selectedIsland?.name}
                        </span>
                        {selectedIsland?.id === 'home' && !selectedStand && (
                          <span className="pill-badge">中央</span>
                        )}
                      </h2>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {selectedStand?.summary ||
                          selectedStreet?.subtitle ||
                          selectedDistrict?.subtitle ||
                          selectedIsland?.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-amber-900/10 flex flex-wrap gap-2">
                    {selectedIsland?.id === 'pain' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDistrictId('pain-innovation-tower');
                            setSelectedStreetId('pain-bounty-wall-street');
                            setSelectedStandId('pain-bounty-wall');
                          }}
                          className={`quick-post-btn ${
                            selectedStandId !== 'pain-posting-desk'
                              ? 'ring-2 ring-amber-700/40 bg-amber-100/90'
                              : ''
                          }`}
                        >
                          <ScrollText size={14} className="text-amber-700" />
                          <span>懸賞牆（全部痛點分門別類）</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDistrictId('pain-innovation-tower');
                            setSelectedStreetId('pain-posting-desk-street');
                            setSelectedStandId('pain-posting-desk');
                            setFormType('pain_point');
                            setFormSubmitSuccess(null);
                          }}
                          className={`quick-post-btn ${
                            selectedStandId === 'pain-posting-desk'
                              ? 'ring-2 ring-rose-600/40 bg-amber-100/90'
                              : ''
                          }`}
                        >
                          <Flame size={14} className="text-rose-600" />
                          <span>佈告桌（撰寫並刊登痛點）</span>
                        </button>
                      </>
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

                {selectedIsland && selectedIsland.id !== 'pain' && !selectedDistrict && (
                  <div className="space-y-2 mt-3">
                    <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">所轄區域</h3>
                    <div className="island-items-list">
                      {selectedIsland.districts.map((dist) => {
                        const standCount = dist.streets.reduce((sum, s) => sum + s.stands.length, 0);
                        const badgeLabel =
                          dist.id === 'creative-exhibition'
                            ? `${standCount} 攤`
                            : dist.id === 'creative-arcade'
                            ? `${arcadeGameQuestions.length} 款遊戲`
                            : dist.id === 'pain-innovation-tower'
                            ? '懸賞牆 · 佈告桌'
                            : `${dist.streets.length} 街`;
                        return (
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
                            <span className="choice-count">
                              {badgeLabel} <ChevronRight size={14} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDistrict &&
                  selectedDistrict.id === 'creative-exhibition' &&
                  !selectedStand && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">攤位清單</h3>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDistrictId(null);
                            setSelectedStreetId(null);
                            setSelectedStandId(null);
                          }}
                          className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft size={12} /> 回上層
                        </button>
                      </div>
                      <div className="island-items-list">
                        {selectedDistrict.streets
                          .flatMap((street) => street.stands)
                          .map((stand) => (
                            <button
                              key={stand.id}
                              type="button"
                              onClick={() => {
                                setSelectedStreetId(stand.parentStreetId);
                                setSelectedStandId(stand.id);
                              }}
                              className="island-choice-row"
                            >
                              <div className="choice-text">
                                <strong>{stand.name}</strong>
                                <small>{stand.summary}</small>
                              </div>
                              <span className="choice-count">
                                瀏覽攤位 <ChevronRight size={14} />
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                {selectedDistrict &&
                  selectedDistrict.id === 'creative-arcade' &&
                  !selectedStreet &&
                  !selectedStand && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">
                          遊戲清單（{arcadeGameQuestions.length} 款）
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSelectedDistrictId(null)}
                          className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft size={12} /> 回上層
                        </button>
                      </div>
                      {arcadeGameQuestions.length > 0 ? (
                        <div className="island-items-list">
                          {arcadeGameQuestions.map((game) => (
                            <button
                              key={game.id}
                              type="button"
                              onClick={() => handleOpenItemPreview(game)}
                              className="island-choice-row"
                            >
                              <div className="choice-text">
                                <strong>{game.appName || game.title}</strong>
                                <small>
                                  {getEffectiveTertiaryCategory(game) || game.subcategory || game.category}
                                </small>
                              </div>
                              <span className="choice-count">
                                進入遊戲 <ChevronRight size={14} />
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="island-empty-box">
                          <p>目前電玩城暫無公開遊戲作品</p>
                        </div>
                      )}
                    </div>
                  )}

                {selectedDistrict &&
                  selectedDistrict.id !== 'creative-exhibition' &&
                  selectedDistrict.id !== 'creative-arcade' &&
                  selectedDistrict.id !== 'pain-innovation-tower' &&
                  !selectedStreet && (
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
                            <span className="choice-count">
                              {street.stands.length} 攤 <ChevronRight size={14} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedStreet &&
                  selectedDistrict?.id !== 'creative-exhibition' &&
                  selectedDistrict?.id !== 'pain-innovation-tower' &&
                  !selectedStand && (
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
                            <span className="choice-count">
                              瀏覽 <ChevronRight size={14} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedIsland?.id === 'pain' && selectedStand?.id !== 'pain-posting-desk' && (
                  <div className="mt-2.5 mb-3 space-y-2">
                    <div className="island-stand-action-box">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-amber-950">
                          懸賞牆（全部痛點分門別類）
                        </span>
                        <span className="text-[11px] text-stone-500">
                          共 {currentStandQuestions.length} 則
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {bountyWallCategories.map((cat) => {
                          const count =
                            cat === '全部'
                              ? allPainQuestions.length
                              : allPainQuestions.filter(
                                  (q) => q.category === cat || q.subcategory === cat,
                                ).length;
                          if (cat !== '全部' && count === 0) return null;
                          const isActive = bountyWallCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setBountyWallCategory(cat)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                                isActive
                                  ? 'bg-amber-800 text-white border-amber-800 shadow-2xs'
                                  : 'bg-white/90 text-stone-700 border-amber-900/15 hover:border-amber-700/40'
                              }`}
                            >
                              {cat} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {selectedStand && selectedStand.id === 'pain-posting-desk' && (
                  <div className="mt-2 mb-3 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStandId(null);
                        setSelectedStreetId(null);
                      }}
                      className="island-back-link"
                    >
                      <ArrowLeft size={13} /> 回創點樓
                    </button>

                    <div className="island-stand-action-box">
                      <h4 className="text-xs font-black text-amber-950 mb-1">
                        🖋️ 佈告桌 · 撰寫痛點並刊登
                      </h4>
                      <p className="text-[11px] text-stone-600 mb-2.5">
                        填寫以下痛點表單，送出後將直接張貼刊登至創點樓「懸賞牆」對應分類：
                      </p>

                      {formSubmitSuccess && (
                        <div className="mb-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                            <span>{formSubmitSuccess}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStreetId('pain-bounty-wall-street');
                              setSelectedStandId('pain-bounty-wall');
                            }}
                            className="self-start text-[11px] font-black text-amber-800 hover:underline flex items-center gap-1"
                          >
                            <span>前往懸賞牆查看已刊登痛點</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}

                      <form
                        onSubmit={(e) => {
                          setFormType('pain_point');
                          handleFormSubmit(e);
                        }}
                        className="space-y-2.5"
                      >
                        <div className="island-field-group">
                          <label>痛點標題</label>
                          <input
                            type="text"
                            required
                            placeholder="例如：傳統餐飲店每日食材盤點耗時且易出錯..."
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          />
                        </div>

                        <div className="island-field-group">
                          <label>懸賞牆分類</label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          >
                            <option value="資訊科技">資訊科技</option>
                            <option value="商業經營">商業經營</option>
                            <option value="日常生活">日常生活</option>
                            <option value="創意設計">創意設計</option>
                            <option value="生醫療材">生醫療材</option>
                            <option value="學術探討">學術探討</option>
                          </select>
                        </div>

                        <div className="island-field-group">
                          <label>詳細痛點描述</label>
                          <textarea
                            rows={3}
                            required
                            placeholder="請詳細描述您遇到的痛點情境、目前困擾與期望解決方式..."
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                          />
                        </div>

                        <div className="island-field-group">
                          <label>關鍵標籤（選填，以逗點分隔）</label>
                          <input
                            type="text"
                            placeholder="例如：自動化, 盤點, AI"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          />
                        </div>

                        <button type="submit" className="island-form-submit-btn">
                          <Send size={14} />
                          <span>刊登痛點至懸賞牆</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {selectedStand &&
                  selectedStand.id !== 'pain-bounty-wall' &&
                  selectedStand.id !== 'pain-posting-desk' && (
                    <div className="mt-2 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStandId(null);
                          if (selectedDistrict?.id === 'creative-exhibition') {
                            setSelectedStreetId(null);
                          }
                        }}
                        className="island-back-link mb-2"
                      >
                        <ArrowLeft size={13} />{' '}
                        {selectedDistrict?.id === 'creative-exhibition'
                          ? '回展覽館攤位清單'
                          : '回街道攤位清單'}
                      </button>
                      <div className="island-stand-action-box">
                        <p className="prompt-text">{selectedStand.interactionPrompt}</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedStand.contentKind === 'jobs') handleOpenFormModal('career_wish');
                            else if (selectedStand.contentFilter.source === 'pain')
                              handleOpenFormModal('pain_point');
                            else if (selectedStand.contentFilter.source === 'discussion')
                              handleOpenFormModal('discussion');
                            else if (selectedStand.contentFilter.source === 'proposal')
                              handleOpenFormModal('proposal');
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
          ============================================================ */}
      <aside className={`island-left-drawer ${leftModalMode !== 'none' ? 'is-open' : ''}`}>
        <div className="island-left-drawer-inner">
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
                  {previewQuestion.subcategory && (
                    <span className="sub-tag">{previewQuestion.subcategory}</span>
                  )}
                  {previewQuestion.tertiaryCategory && (
                    <span className="sub-tag">{previewQuestion.tertiaryCategory}</span>
                  )}
                </div>

                <h2 className="island-preview-title">{previewQuestion.title}</h2>

                <div className="island-preview-author">
                  <img
                    src={
                      previewQuestion.authorAvatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    }
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

                <div className="island-preview-actions">
                  {previewQuestion.demoUrl ||
                  previewQuestion.externalLink ||
                  previewQuestion.exclusiveChallengeUrl ||
                  isGameQuestion(previewQuestion) ||
                  previewQuestion.postType === 'vibecoding_app' ? (
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
                  {formType === 'pain_point' &&
                    '客官請講！創點樓掌櫃阿點替您備好筆墨卷軸，說說您切身遇到的問題與需求。'}
                  {formType === 'career_wish' &&
                    '信士請進！求職廟廟公將聆聽您的求職需求並紀錄，用來在匯職缺為您精準比對工作。'}
                  {formType === 'discussion' && '開一桌新話題！邀請全島朋友坐下一同切磋探討。'}
                  {formType === 'proposal' &&
                    '登錄創新作品與點子！在展覽館展示給島民與潛在合作夥伴。'}
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
                    <label>{formType === 'career_wish' ? '期望職稱 / 目標職位' : '主題標題'}</label>
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

      {/* 說明彈窗 */}
      {showGuideModal && (
        <div className="island-guide-modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="island-guide-modal-card" onClick={(e) => e.stopPropagation()}>
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

            <h2 className="guide-main-title">在海上逛逛</h2>

            <p className="guide-main-desc">
              點選島嶼進入探索。電腦版按住左鍵可平移地圖、右鍵拖曳可旋轉並調整俯視角；手機版用單手指移動即可平移並調整俯視角。場景並會隨 +8 時區（清晨・中午・傍晚・晚上及雨天）自動變換。
            </p>

            <div className="guide-mouse-grid">
              <div className="guide-mouse-card">
                <div className="guide-mouse-icon-wrap">
                  <svg width="26" height="36" viewBox="0 0 26 36" fill="none">
                    <rect
                      x="2"
                      y="2"
                      width="22"
                      height="32"
                      rx="11"
                      stroke="#5e726b"
                      strokeWidth="2.2"
                      fill="#f5f1e6"
                    />
                    <path
                      d="M13 2V15H2C2 7.8203 6.92487 2 13 2Z"
                      fill="#d88c51"
                    />
                    <line x1="13" y1="2" x2="13" y2="15" stroke="#5e726b" strokeWidth="2" />
                    <line x1="2" y1="15" x2="24" y2="15" stroke="#5e726b" strokeWidth="2" />
                  </svg>
                </div>
                <strong className="guide-mouse-title">左鍵按住</strong>
                <span className="guide-mouse-sub">按住平移地圖</span>
              </div>

              <div className="guide-mouse-card">
                <div className="guide-mouse-icon-wrap">
                  <svg width="26" height="36" viewBox="0 0 26 36" fill="none">
                    <rect
                      x="2"
                      y="2"
                      width="22"
                      height="32"
                      rx="11"
                      stroke="#5e726b"
                      strokeWidth="2.2"
                      fill="#f5f1e6"
                    />
                    <path
                      d="M13 2V15H24C24 7.8203 19.0751 2 13 2Z"
                      fill="#d88c51"
                    />
                    <line x1="13" y1="2" x2="13" y2="15" stroke="#5e726b" strokeWidth="2" />
                    <line x1="2" y1="15" x2="24" y2="15" stroke="#5e726b" strokeWidth="2" />
                  </svg>
                </div>
                <strong className="guide-mouse-title">右鍵拖曳</strong>
                <span className="guide-mouse-sub">左右旋轉、調整俯視角</span>
              </div>

              <div className="guide-mouse-card">
                <div className="guide-mouse-icon-wrap">
                  <svg width="26" height="36" viewBox="0 0 26 36" fill="none">
                    <rect
                      x="2"
                      y="2"
                      width="22"
                      height="32"
                      rx="11"
                      stroke="#5e726b"
                      strokeWidth="2.2"
                      fill="#f5f1e6"
                    />
                    <line x1="13" y1="2" x2="13" y2="15" stroke="#5e726b" strokeWidth="1.8" />
                    <line x1="2" y1="15" x2="24" y2="15" stroke="#5e726b" strokeWidth="1.8" />
                    <rect x="10.5" y="5.5" width="5" height="8" rx="2.5" fill="#d88c51" />
                  </svg>
                </div>
                <strong className="guide-mouse-title">滑鼠滾輪</strong>
                <span className="guide-mouse-sub">縮放遠近</span>
              </div>
            </div>

            {/* 觸控操作說明方塊（1:1 還原設計圖） */}
            <div className="guide-touch-box">
              <h4 className="guide-touch-title">觸控操作</h4>
              <p className="guide-touch-desc">
                單指拖曳可移動地圖並調整俯視角，雙指可旋轉方向與縮放視野，輕觸島嶼即可打開導覽。
              </p>
            </div>

            {/* 底部開始探索按鈕 */}
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="guide-start-btn-full"
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

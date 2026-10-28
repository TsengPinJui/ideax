import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CloudRain,
  Compass,
  Film,
  Flame,
  Gamepad2,
  HelpCircle,
  MapPin,
  Minus,
  Moon,
  PanelsTopLeft,
  Play,
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
  Volume2,
  VolumeX,
  X,
  Footprints,
} from 'lucide-react';
import {
  HANLIN_EXPERT_ROSTER,
  HanlinExpertProfile,
  IDEAX_AGENTS,
  IslandAgentProfile,
  IslandAction,
  IDEAX_ISLANDS,
  matchesIslandContent,
} from '../../data/islandWorld';
import { Question } from '../../types';
import { useApp } from '../../context/AppContext';
import { getEffectiveTertiaryCategory, isGameQuestion } from '../../utils/gameClassification';
import { isCardViewsVisible } from '../../utils/questionUtils';
import { getEffectiveQuestionViews } from '../../utils/proposalClicks';
import {
  getDisplayShichen,
  getSceneTitle,
  getUtc8TimeInfo,
  ISLAND_WORLD_CENTERS,
  IslandScene3D,
  TIME_OF_DAY_CONFIGS,
  TimeOfDayMode,
  TimeOfDayPhase,
  TOTAL_ISLAND_EASTER_EGGS,
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
import {
  SUPPORTED_CITIES,
  getStoredUserCityId,
  setStoredUserCityId,
  getCityConfig,
   getCityLocalTimePhase,
  fetchCityWeather,
  CityWeatherAndTime,
} from '../../data/cityData';
import { ancientJiangnanBgm } from '../../utils/ancientBgm';
import {
  getCachedIslandIntroVideoUrlSync,
  loadIslandIntroVideoUrl,
} from '../../services/islandIntroVideoService';
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
  const { currentUser, publicMetricsConfig, solvers, setSelectedSolver } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const canShowQuestionViews = (q: Question) =>
    isGameQuestion(q) ? isAdmin : isCardViewsVisible(publicMetricsConfig, isAdmin);

  // 3D 俯視視角 (Pitch: 18° ~ 74°，預設 42°)、左右旋轉 (Yaw) 與平移位置 (panX, panY)
  const [view, setView] = useState({ zoom: 1, pitch: 42, yaw: 0, panX: 0, panY: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // 當前城市地區設定：台北、台中、高雄、香港、吉隆坡、新加坡（地圖時間與天氣依照當地調整，並記錄供後台統計）
  const [selectedCityId, setSelectedCityId] = useState<string>(() => getStoredUserCityId());
  const [cityWeatherInfo, setCityWeatherInfo] = useState<CityWeatherAndTime | null>(null);
  const [showCityMenu, setShowCityMenu] = useState(false);

  const currentCity = useMemo(() => getCityConfig(selectedCityId), [selectedCityId]);

  useEffect(() => {
    let active = true;
    fetchCityWeather(currentCity).then((data) => {
      if (active) {
        setCityWeatherInfo(data);
      }
    });
    return () => {
      active = false;
    };
  }, [currentCity]);

  // 依設定的所在地時區與即時天氣更新場景（支援自動依所在地變換 + 手動預覽 8 大場景）
  const [clockTick, setClockTick] = useState(0);
  const [timeMode, setTimeMode] = useState<TimeOfDayMode>('auto');
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('auto');
  const [showAtmosphereMenu, setShowAtmosphereMenu] = useState(false);

  // 古風背景雅樂狀態（默認打開 BGM，地圖開啟時自動播放，離開地圖時停止）
  const [isBgmMuted, setIsBgmMuted] = useState<boolean>(false);

  // 當有新提案或貼文加入時，觸發島嶼中央大燈泡亮起與清脆音效
  const prevQuestionsCount = useRef(questions.length);
  useEffect(() => {
    if (questions.length > prevQuestionsCount.current) {
      const latestQ = questions[0];
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ideax_new_content_alert', {
            detail: {
              title: latestQ?.title || '新提案',
              type: isGameQuestion(latestQ) ? '遊戲作品' : '創新提案',
            },
          })
        );
      }
    }
    prevQuestionsCount.current = questions.length;
  }, [questions]);

  useEffect(() => {
    ancientJiangnanBgm.setMuted(false);
    setIsBgmMuted(false);
    ancientJiangnanBgm.start();
    return () => {
      ancientJiangnanBgm.stop();
    };
  }, []);

  const handleToggleBgm = () => {
    const nextMuted = !isBgmMuted;
    setIsBgmMuted(nextMuted);
    ancientJiangnanBgm.setMuted(nextMuted);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const localTimeInfo = useMemo(
    () => getCityLocalTimePhase(currentCity.timezone),
    [currentCity, clockTick],
  );

  const activeTimePhase: TimeOfDayPhase =
    timeMode === 'auto'
      ? (cityWeatherInfo?.phase || localTimeInfo.phase)
      : timeMode;
  const activeWeather: WeatherType =
    weatherMode === 'auto'
      ? (cityWeatherInfo?.weather || 'clear')
      : weatherMode;
  const activeSceneTitle = getSceneTitle(activeTimePhase, activeWeather);
  const shichenDisplay = getDisplayShichen(timeMode, localTimeInfo);

  // 選中層級狀態（島 -> 區 -> 街 -> 攤）
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>('home');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedStreetId, setSelectedStreetId] = useState<string | null>(null);
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);

  // 右側「島覽」導覽面板狀態（默認收合，點擊島嶼或標籤後展開）
  const [isRightAtlasOpen, setIsRightAtlasOpen] = useState(false);

  // 左側彈窗/抽屜狀態（點擊條列卡片在畫面左側跳出詳細內頁，填寫表單與需求也都在左側）
  const [leftModalMode, setLeftModalMode] = useState<'none' | 'preview' | 'expert' | 'agent' | 'form'>('none');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [previewExpert, setPreviewExpert] = useState<HanlinExpertProfile | null>(null);
  const [previewAgent, setPreviewAgent] = useState<IslandAgentProfile | null>(null);
  const [viewingIdCard, setViewingIdCard] = useState<{ src: string; alt: string; name: string } | null>(null);
  const [formType, setFormType] = useState<
    'pain_point' | 'career_wish' | 'headhunter_match' | 'discussion' | 'proposal' | 'game'
  >('pain_point');
  const [formData, setFormData] = useState({
    title: '',
    category: '資訊科技',
    description: '',
    tags: '',
  });
  const [formSubmitSuccess, setFormSubmitSuccess] = useState<string | null>(null);
  const [bountyWallCategory, setBountyWallCategory] = useState<string>('全部');
  const [localPublishedQuestions, setLocalPublishedQuestions] = useState<Question[]>([]);
  const [randomPickedGames, setRandomPickedGames] = useState<Question[] | null>(null);

  const [showGuideModal, setShowGuideModal] = useState(false);
  const INTRO_VIDEO_STORAGE_KEY = 'ideax_island_intro_video_seen_v2';
  const [showIntroVideoModal, setShowIntroVideoModal] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ideax_island_intro_video_seen_v2') !== '1';
    } catch {
      return true;
    }
  });
  const [introVideoSrc, setIntroVideoSrc] = useState<string | null>(() =>
    getCachedIslandIntroVideoUrlSync()
  );
  const [introVideoLoadProgress, setIntroVideoLoadProgress] = useState<number>(() =>
    getCachedIslandIntroVideoUrlSync() ? 100 : 0
  );
  const introVideoRef = useRef<HTMLVideoElement | null>(null);

  const attemptAutoPlayIntroVideo = useCallback((videoEl: HTMLVideoElement | null) => {
    if (!videoEl) return;
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        videoEl.muted = true;
        videoEl.play().catch(() => {});
      });
    }
  }, []);

  useEffect(() => {
    if (!showIntroVideoModal && introVideoSrc) return;
    let active = true;
    loadIslandIntroVideoUrl((pct) => {
      if (active) setIntroVideoLoadProgress(pct);
    })
      .then((url) => {
        if (active) setIntroVideoSrc(url);
      })
      .catch(() => {
        if (active) setIntroVideoSrc('/api/media/island-intro-video');
      });
    return () => {
      active = false;
    };
  }, [showIntroVideoModal, introVideoSrc]);

  const handleCloseIntroVideo = () => {
    try {
      localStorage.setItem(INTRO_VIDEO_STORAGE_KEY, '1');
    } catch {
      // Ignore storage error
    }
    setShowIntroVideoModal(false);
  };

  const [searchText, setSearchText] = useState('');

  // 彩蛋收集冊（首次觸發即依發現順序刊登於收集冊格子，並記錄解鎖時間）
  const EASTER_EGG_STORAGE_KEY = 'ideax_island_easter_egg_book_v1';
  const [collectedEasterEggs, setCollectedEasterEggs] = useState<
    Array<{ verse: string; unlockedAt: string }>
  >(() => {
    try {
      const raw = localStorage.getItem('ideax_island_easter_egg_book_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(
              (item) => item && typeof item.verse === 'string' && typeof item.unlockedAt === 'string',
            )
            .map((item) => ({
              verse: item.verse,
              unlockedAt: item.unlockedAt.split(' ')[0],
            }));
        }
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });
  const [showEasterEggBook, setShowEasterEggBook] = useState(false);
  const [recentUnlockedEggToast, setRecentUnlockedEggToast] = useState<{
    slotIndex: number;
    verse: string;
    unlockedAt: string;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const handleEasterEggTriggered = React.useCallback((rawVerse: string) => {
    const trimmed = (rawVerse || '').trim();
    if (!trimmed) return;
    const normalized = trimmed.replace(/^[「『]+|[」』]+$/g, '').trim();
    if (!normalized) return;
    const displayVerse = `「${normalized}」`;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const unlockedAt = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;

    setCollectedEasterEggs((prev) => {
      const exists = prev.some(
        (item) => item.verse.replace(/^[「『]+|[」』]+$/g, '').trim() === normalized,
      );
      if (exists) return prev;
      const next = [...prev, { verse: displayVerse, unlockedAt }];
      try {
        localStorage.setItem(EASTER_EGG_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      setRecentUnlockedEggToast({
        slotIndex: next.length,
        verse: displayVerse,
        unlockedAt,
      });
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setRecentUnlockedEggToast(null);
      }, 4200);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

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
        sessionId,
        displayName: '線上訪客',
        buildingId: currentBuildingId,
        activity: currentActivityType,
        updatedAt: Date.now(),
        isCurrentSession: true,
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
          const list = Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data?.onlineUsers)
            ? data.onlineUsers
            : null;
          if (mounted && list && list.length > 0) {
            const mergedMap = new Map<string, IslandOnlineUserRecord>();
            localList.forEach((u) => mergedMap.set(u.sessionId || u.userId, u));
            list.forEach((u: IslandOnlineUserRecord) => mergedMap.set(u.sessionId || u.userId, u));
            mergedMap.set(sessionId, myRecord);
            setOnlinePresenceUsers(Array.from(mergedMap.values()));
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
          prev.forEach((u) => map.set(u.sessionId || u.userId, u));
          local.forEach((u) => map.set(u.sessionId || u.userId, u));
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
    () => computeIslandPresenceAllocation(onlinePresenceUsers, 50),
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

  // 整合平台真實認證專家 (solvers) 與翰林院各智庫專家名冊（人名 + 職稱/頭銜）
  const hanlinExperts = useMemo<HanlinExpertProfile[]>(() => {
    const map = new Map<string, HanlinExpertProfile>();
    for (const item of HANLIN_EXPERT_ROSTER) {
      map.set(item.name.trim(), item);
    }
    for (const solver of solvers || []) {
      if (!solver?.name || map.has(solver.name.trim())) continue;
      const text = `${solver.title || ''} ${solver.domain || ''} ${solver.subdomain || ''} ${(solver.skills || []).join(' ')}`;
      let thinkTankId = 'hanlin-tech-street';
      let thinkTankName = '資訊科技庫';
      if (/獵頭|獵才|職涯|媒合|招募|HR|人資/i.test(text)) {
        thinkTankId = 'hanlin-headhunter-street';
        thinkTankName = '人才獵頭/媒合專家';
      } else if (/生醫|醫療|臨床|藥|生技|健康/i.test(text)) {
        thinkTankId = 'hanlin-biomed-street';
        thinkTankName = '生醫療材庫';
      } else if (/法律|專利|智財|法務|股權|投資條款/i.test(text)) {
        thinkTankId = 'hanlin-legal-street';
        thinkTankName = '法律智財庫';
      } else if (/設計|文創|UI|UX|視覺|品牌識別|工業/i.test(text)) {
        thinkTankId = 'hanlin-design-street';
        thinkTankName = '創意設計庫';
      } else if (/商業|行銷|管理|顧問|策略|營運|財務|SaaS/i.test(text) && !/工程師|架構師|AI/i.test(text)) {
        thinkTankId = 'hanlin-biz-street';
        thinkTankName = '商業經營庫';
      }
      map.set(solver.name.trim(), {
        id: `expert-solver-${solver.id}`,
        thinkTankId,
        thinkTankName,
        name: solver.name,
        title: solver.title || '認證領域專家',
        avatar:
          solver.avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: solver.bio || '平台專業認證專家，提供深度領域諮詢與方案診斷。',
        skills: solver.skills || [],
        featuredCaseTitle: solver.featuredCase?.title,
        featuredCaseOutcome: solver.featuredCase?.outcome,
        solverId: solver.id,
      });
    }
    return Array.from(map.values());
  }, [solvers]);

  const currentHanlinExperts = useMemo(() => {
    if (selectedDistrict?.id === 'career-headhunter-district') {
      return hanlinExperts.filter((exp) => exp.thinkTankId === 'hanlin-headhunter-street');
    }
    if (selectedDistrict?.id !== 'career-hanlin-district') return [];
    if (selectedStreet) {
      return hanlinExperts.filter((exp) => exp.thinkTankId === selectedStreet.id);
    }
    // 翰林院五大智庫全名冊（與獨立獵頭分開）
    return hanlinExperts.filter((exp) => exp.thinkTankId !== 'hanlin-headhunter-street');
  }, [hanlinExperts, selectedDistrict, selectedStreet]);

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

  const sortByViewsDesc = (list: Question[]) =>
    [...list].sort(
      (a, b) =>
        getEffectiveQuestionViews(b.id, b.viewsCount || b.views || 0) -
        getEffectiveQuestionViews(a.id, a.viewsCount || a.views || 0),
    );

  const arcadeGameQuestions = useMemo(
    () =>
      sortByViewsDesc(
        mergedQuestions.filter((q) => matchesIslandContent(q, { source: 'game' })),
      ),
    [mergedQuestions],
  );

  const handleDrawRandomGames = () => {
    const pool = [...arcadeGameQuestions];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setRandomPickedGames(pool.slice(0, 3));
  };

  const allPainQuestions = useMemo(
    () =>
      sortByViewsDesc(
        mergedQuestions.filter((q) => matchesIslandContent(q, { source: 'pain' })),
      ),
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

    const dedupeQuestions = (list: Question[]) => {
      const seen = new Set<string>();
      return sortByViewsDesc(
        list.filter((q) => {
          if (seen.has(q.id)) return false;
          seen.add(q.id);
          return true;
        }),
      );
    };

    if (selectedStand) {
      const baseList = dedupeQuestions(
        mergedQuestions.filter((q) => matchesIslandContent(q, selectedStand.contentFilter)),
      );
      if (selectedStand.id === 'pain-bounty-wall' || selectedIsland?.id === 'pain') {
        return filterByBountyCategory(baseList);
      }
      return baseList;
    }
    if (selectedStreet) {
      const list = dedupeQuestions(
        mergedQuestions.filter((q) =>
          selectedStreet.stands.some((st) => matchesIslandContent(q, st.contentFilter)),
        ),
      );
      return selectedIsland?.id === 'pain' ? filterByBountyCategory(list) : list;
    }
    if (selectedDistrict) {
      const list = dedupeQuestions(
        mergedQuestions.filter((q) =>
          selectedDistrict.streets.some((str) => str.stands.some((st) => matchesIslandContent(q, st.contentFilter))),
        ),
      );
      return selectedIsland?.id === 'pain' ? filterByBountyCategory(list) : list;
    }
    if (selectedIsland) {
      const list = dedupeQuestions(
        mergedQuestions.filter((q) =>
          selectedIsland.districts.some((dist) =>
            dist.streets.some((str) => str.stands.some((st) => matchesIslandContent(q, st.contentFilter))),
          ),
        ),
      );
      return selectedIsland.id === 'pain' ? filterByBountyCategory(list) : list;
    }
    return dedupeQuestions(mergedQuestions).slice(0, 15);
  }, [mergedQuestions, selectedStand, selectedStreet, selectedDistrict, selectedIsland, bountyWallCategory]);

  const searchResults = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase();
    if (!term) return [];
    return sortByViewsDesc(
      mergedQuestions
        .filter((q) => q.status !== 'delisted')
        .filter((q) =>
          [q.title, q.appName, q.description, q.category, q.subcategory, q.tertiaryCategory, ...(q.tags || [])]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase()
            .includes(term),
        ),
    ).slice(0, 15);
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

  // 電腦版鍵盤 WASD 與上下左右方向鍵平滑移動地圖
  useEffect(() => {
    const pressedKeys = new Set<string>();
    let rafId: number | null = null;

    const isEditableElement = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    };

    const stepLoop = () => {
      let dx = 0;
      let dy = 0;
      const speed = 10;

      if (pressedKeys.has('w') || pressedKeys.has('arrowup')) dy += speed;
      if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) dy -= speed;
      if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) dx += speed;
      if (pressedKeys.has('d') || pressedKeys.has('arrowright')) dx -= speed;

      if (dx !== 0 || dy !== 0) {
        setView((v) => ({
          ...v,
          panX: Math.max(-850, Math.min(850, v.panX + dx)),
          panY: Math.max(-650, Math.min(650, v.panY + dy)),
        }));
        rafId = requestAnimationFrame(stepLoop);
      } else {
        rafId = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (
        key === 'w' ||
        key === 'a' ||
        key === 's' ||
        key === 'd' ||
        key === 'arrowup' ||
        key === 'arrowdown' ||
        key === 'arrowleft' ||
        key === 'arrowright'
      ) {
        e.preventDefault();
        pressedKeys.add(key);
        if (rafId === null) {
          rafId = requestAnimationFrame(stepLoop);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      pressedKeys.delete(key);
    };

    const handleBlur = () => {
      pressedKeys.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
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
  const handleSelectIsland = (islandId: string, districtId?: string, streetId?: string) => {
    const target = IDEAX_ISLANDS.find((i) => i.id === islandId);
    if (target) {
      const normalizedDistrictMap: Record<string, string> = {
        'home-plaza': 'main-plaza',
        'home-trade-street': 'main-trade',
        'discussion-street': 'discussion-daily-district',
        'discussion-workshop': 'discussion-tech-district',
        'discussion-library': 'discussion-academic-district',
        'career-temple': 'career-temple-district',
        'career-academy': 'career-hanlin-district',
        'career-headhunter': 'career-headhunter-district',
      };
      const mappedDistrictId = districtId ? normalizedDistrictMap[districtId] || districtId : undefined;
      setSelectedIslandId(target.id);
      // 痛點島就一個「創點樓」，點擊痛點島直接進入創點樓
      const effectiveDistrictId =
        mappedDistrictId || (target.id === 'pain' ? 'pain-innovation-tower' : null);
      setSelectedDistrictId(effectiveDistrictId);
      setSelectedStreetId(streetId || null);
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

  // 點擊翰林院智庫專家：在畫面左側跳出專家檔案彈窗
  const handleOpenExpertPreview = (expert: HanlinExpertProfile) => {
    setPreviewExpert(expert);
    setLeftModalMode('expert');
  };

  // 點擊創點源守護 Agent：在畫面左側跳出 Agent 檔案彈窗
  const handleOpenAgentPreview = (agent: IslandAgentProfile) => {
    setPreviewAgent(agent);
    setLeftModalMode('agent');
  };

  // 點擊填寫按鈕：在畫面左側跳出填寫表單彈窗
  const handleOpenFormModal = (
    type: 'pain_point' | 'career_wish' | 'headhunter_match' | 'discussion' | 'proposal' | 'game',
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
          : type === 'career_wish' || type === 'headhunter_match'
          ? '資訊科技'
          : type === 'proposal' || type === 'game'
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
              ? '求職廟 · 搜搜'
              : formType === 'headhunter_match'
              ? '人才獵頭/媒合專家'
              : formType === 'game'
              ? '電玩城'
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
        aria-label="IdeaX 創點源 3D 俯視地圖：電腦左鍵平移、右鍵調整俯視角與旋轉；手機單指移動並調整俯視角"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerEnd(e, true)}
        onPointerCancel={(e) => handlePointerEnd(e, false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 左上角返回圓鈕 ＋ 兩種模式切換（3D地圖 ⇄ 實境漫遊） */}
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
          <div className="island-mode-switcher" role="group" aria-label="3D島覽模式切換">
            <span className="island-mode-pill is-active" aria-current="page">
              3D地圖
            </span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('ideax_open_kingdom3d', { detail: { from: 'island' } }))}
              className="island-mode-pill is-switch"
              title="切換至實境漫遊（第一人稱漫遊，可多人同遊）"
            >
              <Footprints size={15} strokeWidth={2.2} />
              <span>實境漫遊</span>
            </button>
          </div>
        </div>

        {/* 頂部中間：IdeaX 創點源 — 3D地圖 — */}
        <div className="island-top-center-brand">
          <div className="island-brand-text-center">
            <h1 className="island-map-main-title">IdeaX 創點源</h1>
            <div className="island-subtitle-row">
              <p className="island-map-subtitle">— 3D地圖 —</p>
            </div>
          </div>
        </div>

        {/* 右上角：時間與佈景分兩排顯示（第一排：時辰與時間；第二排：佈景；點擊可預覽切換 8 大場景） */}
        <div className="island-top-right-shichen island-ui-interactive">
          <button
            type="button"
            onClick={() => setShowAtmosphereMenu((prev) => !prev)}
            className="island-shichen-pure-text-btn"
            title="點擊切換時辰與晴雨佈景"
          >
            <span className="shichen-main-row">
              <span className="shichen-calligraphy-title">
                {shichenDisplay.shichenName} · {localTimeInfo.timeString}
              </span>
            </span>
            <span className="shichen-sub-row">
              {renderPhaseIcon(activeTimePhase, activeWeather)}
              <span>{activeSceneTitle}</span>
            </span>
          </button>

          {/* 8 大場景彈出選單 */}
          {showAtmosphereMenu && (
            <div
              className="island-atmosphere-dropdown is-right-aligned"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="atmos-dropdown-header">
                <div className="flex items-center gap-1.5 text-xs font-black text-stone-800">
                  <Clock size={14} className="text-amber-700" />
                  <span>
                    {shichenDisplay.shichenName} · {localTimeInfo.timeString}
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
                  依所在地自動
                </button>
              </div>

              <div className="atmos-grid-section">
                <span className="atmos-section-label">時段</span>
                <div className="atmos-scene-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                  <button type="button" onClick={() => setTimeMode('auto')} className={`atmos-scene-btn ${timeMode === 'auto' ? 'active' : ''}`}>
                    <span className="font-black">自動</span>
                    <small>依所在地</small>
                  </button>
                  {(['morning', 'noon', 'dusk', 'night'] as TimeOfDayPhase[]).map((ph) => (
                    <button key={`t-${ph}`} type="button" onClick={() => setTimeMode(ph)} className={`atmos-scene-btn ${timeMode === ph ? 'active' : ''}`}>
                      <span className="font-black">{TIME_OF_DAY_CONFIGS[ph].clearLabel.slice(0, 2)}</span>
                      <small>{TIME_OF_DAY_CONFIGS[ph].timeRange}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="atmos-grid-section mt-2">
                <span className="atmos-section-label">天氣</span>
                <div className="atmos-scene-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  {([
                    ['auto', '自動', '依所在地'],
                    ['clear', '晴天', '水燈・天燈'],
                    ['rain', '雨天', '動態落雨'],
                  ] as [WeatherMode, string, string][]).map(([w, label, sub]) => (
                    <button key={`w-${w}`} type="button" onClick={() => setWeatherMode(w)} className={`atmos-scene-btn ${w === 'rain' ? 'is-rain' : ''} ${weatherMode === w ? 'active' : ''}`}>
                      <span className="font-black">{label}</span>
                      <small>{sub}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部置中視角控制工具列（全圖示按鈕：縮放、重設視角、古風音樂開關、說明） */}
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
            title="重設視角"
            aria-label="重設視角"
          >
            <RotateCcw size={15} />
          </button>

          <div className="island-controls-divider" />

          <button
            type="button"
            onClick={handleToggleBgm}
            className={`island-bgm-btn ${isBgmMuted ? 'is-muted' : 'is-playing'}`}
            title={isBgmMuted ? '開啟古風背景樂' : '關閉古風背景樂'}
            aria-label={isBgmMuted ? '開啟古風背景樂' : '關閉古風背景樂'}
          >
            {isBgmMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <div className="island-controls-divider" />

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="island-guide-btn"
            title="島覽說明"
            aria-label="島覽說明"
          >
            <HelpCircle size={15} />
          </button>
        </div>

        {/* 右下角城市與當地天氣設定按鈕及彈窗選單（純文字兩排顯示，與右上角形式一致） */}
        <div className="island-bottom-right-city island-ui-interactive" aria-label="城市與天氣設定">
          <button
            type="button"
            onClick={() => setShowCityMenu((prev) => !prev)}
            className="island-shichen-pure-text-btn island-city-pure-text-btn"
            title="設定城市：地圖時間與天氣將依當地即時調整"
          >
            <span className="shichen-main-row">
              <MapPin size={15} className="shrink-0" />
              <span className="shichen-calligraphy-title">{currentCity.name}</span>
            </span>
            <span className="shichen-sub-row">
              <span>
                {cityWeatherInfo
                  ? `${cityWeatherInfo.temp}°C · ${cityWeatherInfo.weatherDesc}`
                  : currentCity.country}
              </span>
            </span>
          </button>

          {showCityMenu && (
            <div className="island-city-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="city-dropdown-header">
                <div>
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <MapPin size={13} className="text-amber-700" />
                    <span>城市與當地天候</span>
                  </div>
                  <div className="text-[10px] text-stone-500">地圖時間與天氣將依當地自動連動調整</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCityMenu(false)}
                  className="city-dropdown-close text-stone-400 hover:text-stone-700 p-1"
                  aria-label="關閉選單"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="city-dropdown-grid">
                {SUPPORTED_CITIES.map((c) => {
                  const isSelected = selectedCityId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCityId(c.id);
                        setStoredUserCityId(c.id);
                        setShowCityMenu(false);
                      }}
                      className={`city-select-card ${isSelected ? 'active' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-stone-900 text-xs">{c.name}</span>
                        <span className="text-[10px] text-stone-500 font-medium">{c.country}</span>
                      </div>
                      <div className="text-[10px] text-stone-500 line-clamp-1">{c.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 左下角：彩蛋收集冊按鈕與新解鎖提示 */}
        <div
          className="island-bottom-left-collection island-ui-interactive"
          aria-label="彩蛋收集冊"
        >
          {recentUnlockedEggToast && (
            <div
              className="island-easter-book-toast"
              onClick={() => {
                setShowEasterEggBook(true);
                setRecentUnlockedEggToast(null);
              }}
            >
              <div className="easter-toast-badge">
                <Sparkles size={13} />
                <span>新彩蛋收入第 {String(recentUnlockedEggToast.slotIndex).padStart(2, '0')} 格</span>
              </div>
              <div className="easter-toast-verse">{recentUnlockedEggToast.verse}</div>
              <div className="easter-toast-time">{recentUnlockedEggToast.unlockedAt}</div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowEasterEggBook((prev) => !prev)}
            className="island-easter-book-btn"
            title="打開彩蛋收集冊：查看已解鎖的隱藏詩句"
          >
            <ScrollText size={16} className="easter-book-icon shrink-0 text-amber-700" />
            <span className="easter-book-btn-title">彩蛋收集冊</span>
            <span className="easter-book-btn-count">
              {collectedEasterEggs.length} / {TOTAL_ISLAND_EASTER_EGGS}
            </span>
          </button>
        </div>

        {/* ============================================================
            主舞台內容：Three.js 3D 立體建模（支援 +8 時區 8 大時辰與天氣動態場景）
            ============================================================ */}
        <IslandScene3D
          view={view}
          timePhase={activeTimePhase}
          timeMode={timeMode}
          localHour={localTimeInfo.hour}
          weather={activeWeather}
          selectedIslandId={selectedIslandId}
          contentCounts={contentCounts}
          avatars={presenceSummary.avatars}
          buildingStats={presenceSummary.buildingStats}
          onSelectIsland={handleSelectIsland}
          onFocusIsland={handleFocusIsland}
          onEasterEggTriggered={handleEasterEggTriggered}
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
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 flex-wrap">
              <MapPin size={14} className="text-amber-700 shrink-0" />
              <span
                onClick={() => {
                  setSelectedDistrictId(null);
                  setSelectedStreetId(null);
                  setSelectedStandId(null);
                }}
                className="cursor-pointer hover:text-stone-900"
              >
                {selectedIsland?.name || '創點源'}
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
              {selectedStreet && selectedDistrict?.id !== 'pain-innovation-tower' && (
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
              {selectedStand && selectedDistrict?.id !== 'career-hanlin-district' && (
                <>
                  <ChevronRight size={12} className="text-stone-400" />
                  <span className="text-emerald-800 font-black">{selectedStand.name}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsRightAtlasOpen(false)}
              className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 shrink-0"
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
                        <span className="text-[10px] text-stone-400 mt-0.5 block truncate">
                          {item.authorName || 'IdeaX 創作者'}
                        </span>
                      </div>
                      <ChevronRight size={15} className="text-stone-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="island-current-intro-box">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                      <span>
                        {selectedStand?.name ||
                          selectedStreet?.name ||
                          selectedDistrict?.name ||
                          selectedIsland?.name}
                      </span>
                    </h2>
                  </div>

                  {(selectedIsland?.id === 'pain' ||
                    selectedIsland?.id === 'career' ||
                    selectedIsland?.id === 'discussion' ||
                    selectedIsland?.id === 'creative') && (
                    <div className="mt-2.5 pt-2.5 border-t border-amber-900/10 flex flex-wrap gap-2">
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
                            <span>懸賞牆</span>
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
                            <span>佈告桌（刊登痛點）</span>
                          </button>
                        </>
                      )}
                      {selectedIsland?.id === 'career' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenFormModal('career_wish')}
                            className="quick-post-btn"
                          >
                            <BriefcaseBusiness size={14} className="text-amber-700" />
                            <span>求籤許願</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDistrictId('career-headhunter-district');
                              setSelectedStreetId(null);
                              setSelectedStandId(null);
                            }}
                            className={`quick-post-btn ${
                              selectedDistrictId === 'career-headhunter-district'
                                ? 'ring-2 ring-amber-700/40 bg-amber-100/90'
                                : ''
                            }`}
                          >
                            <Users size={14} className="text-emerald-700" />
                            <span>人才獵頭/媒合專家</span>
                          </button>
                        </>
                      )}
                      {selectedIsland?.id === 'discussion' && (
                        <button
                          type="button"
                          onClick={() => handleOpenFormModal('discussion')}
                          className="quick-post-btn"
                        >
                          <Users size={14} className="text-sky-700" />
                          <span>發起話題</span>
                        </button>
                      )}
                      {selectedIsland?.id === 'creative' && (
                        selectedDistrict?.id === 'creative-arcade' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenFormModal('game')}
                              className="quick-post-btn"
                            >
                              <Gamepad2 size={14} className="text-amber-700" />
                              <span>上架遊戲</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleDrawRandomGames}
                              className="quick-post-btn"
                            >
                              <Sparkles size={14} className="text-violet-700" />
                              <span>隨機抽 3 款</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenFormModal('proposal')}
                            className="quick-post-btn"
                          >
                            <PanelsTopLeft size={14} className="text-emerald-700" />
                            <span>登錄提案</span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* 島嶼所轄區域（主島、創意島、討論島、徵才島） */}
                {selectedIsland && selectedIsland.id !== 'pain' && !selectedDistrict && (
                  <div className="space-y-2 mt-3">
                    <div className="island-items-list">
                      {selectedIsland.districts.map((dist) => (
                        <button
                          key={dist.id}
                          type="button"
                          onClick={() => {
                            if (dist.id === 'main-trade') return;
                            setSelectedDistrictId(dist.id);
                            setSelectedStreetId(null);
                            setSelectedStandId(null);
                          }}
                          className={`island-choice-row ${dist.id === 'main-trade' ? 'cursor-default opacity-85 hover:border-amber-900/15' : ''}`}
                        >
                          <div className="choice-text">
                            <strong>{dist.name}</strong>
                          </div>
                          <span className="choice-count">
                            {dist.id === 'main-trade' ? '開發中' : <>進入 <ChevronRight size={14} /></>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 東西南北（上下左右按鍵，中間是主島）跳島導航按鍵組 — 位於貿易街下方及各島頂層 */}
                {selectedIsland &&
                  (!selectedDistrict ||
                    (selectedIsland.id === 'pain' && selectedStand?.id !== 'pain-posting-desk')) && (
                    <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-b from-amber-50/85 to-stone-50/90 border border-amber-900/15 shadow-2xs">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                          <Compass size={14} className="text-amber-700 shrink-0" />
                          <span>跳島導航（東西南北）</span>
                        </div>
                        <span className="text-[10px] font-bold text-stone-500">
                          點選方位跳至對應島嶼
                        </span>
                      </div>

                      <div
                        className="grid grid-cols-3 gap-2 items-stretch"
                        role="group"
                        aria-label="東西南北跳島方向鍵"
                      >
                        {/* 左上空位 */}
                        <div className="pointer-events-none flex items-center justify-center">
                          <span className="w-6 h-6 border-t border-l border-amber-900/15 rounded-tl-lg opacity-60" />
                        </div>

                        {/* 上（北）：痛點島 */}
                        <button
                          type="button"
                          onClick={() => handleFocusIsland('pain')}
                          className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedIsland.id === 'pain'
                              ? 'bg-amber-800 text-white border-amber-900 shadow-sm ring-2 ring-amber-600/30'
                              : 'bg-white hover:bg-amber-50/90 text-stone-800 border-amber-900/20 hover:border-amber-700/50 shadow-2xs'
                          }`}
                          title="往北（上）跳至痛點島"
                        >
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-black leading-none mb-1 ${
                              selectedIsland.id === 'pain' ? 'text-amber-200' : 'text-amber-800'
                            }`}
                          >
                            <ChevronUp size={13} strokeWidth={2.6} />
                            <span>北</span>
                          </span>
                          <strong className="text-xs font-black leading-tight">痛點島</strong>
                        </button>

                        {/* 右上空位 */}
                        <div className="pointer-events-none flex items-center justify-center">
                          <span className="w-6 h-6 border-t border-r border-amber-900/15 rounded-tr-lg opacity-60" />
                        </div>

                        {/* 左（西）：創意島 */}
                        <button
                          type="button"
                          onClick={() => handleFocusIsland('creative')}
                          className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedIsland.id === 'creative'
                              ? 'bg-amber-800 text-white border-amber-900 shadow-sm ring-2 ring-amber-600/30'
                              : 'bg-white hover:bg-amber-50/90 text-stone-800 border-amber-900/20 hover:border-amber-700/50 shadow-2xs'
                          }`}
                          title="往西（左）跳至創意島"
                        >
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-black leading-none mb-1 ${
                              selectedIsland.id === 'creative' ? 'text-amber-200' : 'text-amber-800'
                            }`}
                          >
                            <ChevronLeft size={13} strokeWidth={2.6} />
                            <span>西</span>
                          </span>
                          <strong className="text-xs font-black leading-tight">創意島</strong>
                        </button>

                        {/* 中間：主島 */}
                        <button
                          type="button"
                          onClick={() => handleFocusIsland('home')}
                          className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedIsland.id === 'home'
                              ? 'bg-gradient-to-b from-amber-700 to-amber-900 text-white border-amber-950 shadow-sm ring-2 ring-amber-500/40'
                              : 'bg-amber-100/75 hover:bg-amber-200/80 text-amber-950 border-amber-900/30 hover:border-amber-800 shadow-2xs'
                          }`}
                          title="回到中央主島"
                        >
                          <span
                            className={`text-[10px] font-black leading-none mb-1 ${
                              selectedIsland.id === 'home' ? 'text-amber-200' : 'text-amber-800'
                            }`}
                          >
                            中樞
                          </span>
                          <strong className="text-xs font-black leading-tight">主島</strong>
                        </button>

                        {/* 右（東）：討論島 */}
                        <button
                          type="button"
                          onClick={() => handleFocusIsland('discussion')}
                          className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedIsland.id === 'discussion'
                              ? 'bg-amber-800 text-white border-amber-900 shadow-sm ring-2 ring-amber-600/30'
                              : 'bg-white hover:bg-amber-50/90 text-stone-800 border-amber-900/20 hover:border-amber-700/50 shadow-2xs'
                          }`}
                          title="往東（右）跳至討論島"
                        >
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-black leading-none mb-1 ${
                              selectedIsland.id === 'discussion' ? 'text-amber-200' : 'text-amber-800'
                            }`}
                          >
                            <span>東</span>
                            <ChevronRight size={13} strokeWidth={2.6} />
                          </span>
                          <strong className="text-xs font-black leading-tight">討論島</strong>
                        </button>

                        {/* 左下空位 */}
                        <div className="pointer-events-none flex items-center justify-center">
                          <span className="w-6 h-6 border-b border-l border-amber-900/15 rounded-bl-lg opacity-60" />
                        </div>

                        {/* 下（南）：徵才島 */}
                        <button
                          type="button"
                          onClick={() => handleFocusIsland('career')}
                          className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedIsland.id === 'career'
                              ? 'bg-amber-800 text-white border-amber-900 shadow-sm ring-2 ring-amber-600/30'
                              : 'bg-white hover:bg-amber-50/90 text-stone-800 border-amber-900/20 hover:border-amber-700/50 shadow-2xs'
                          }`}
                          title="往南（下）跳至徵才島"
                        >
                          <strong className="text-xs font-black leading-tight mb-1">徵才島</strong>
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-black leading-none ${
                              selectedIsland.id === 'career' ? 'text-amber-200' : 'text-amber-800'
                            }`}
                          >
                            <span>南</span>
                            <ChevronDown size={13} strokeWidth={2.6} />
                          </span>
                        </button>

                        {/* 右下空位 */}
                        <div className="pointer-events-none flex items-center justify-center">
                          <span className="w-6 h-6 border-b border-r border-amber-900/15 rounded-br-lg opacity-60" />
                        </div>
                      </div>
                    </div>
                  )}

                {/* 創意島 > 展覽館：第一層「展場清單」 */}
                {selectedDistrict &&
                  selectedDistrict.id === 'creative-exhibition' &&
                  !selectedStreet &&
                  !selectedStand && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-end">
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
                        {selectedDistrict.streets.map((hall) => (
                          <button
                            key={hall.id}
                            type="button"
                            onClick={() => {
                              setSelectedStreetId(hall.id);
                              setSelectedStandId(null);
                            }}
                            className="island-choice-row"
                          >
                            <div className="choice-text">
                              <strong>{hall.name}</strong>
                            </div>
                            <span className="choice-count">
                              進入 <ChevronRight size={14} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* 創意島 > 展覽館 > 某展場：第二層「展位清單（細分類）」 */}
                {selectedDistrict &&
                  selectedDistrict.id === 'creative-exhibition' &&
                  selectedStreet &&
                  !selectedStand && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStreetId(null);
                            setSelectedStandId(null);
                          }}
                          className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft size={12} /> 回上層
                        </button>
                      </div>
                      <div className="island-items-list">
                        {selectedStreet.stands.map((subStand) => {
                          const standCaseCount = mergedQuestions.filter((q) =>
                            matchesIslandContent(q, subStand.contentFilter),
                          ).length;
                          return (
                            <button
                              key={subStand.id}
                              type="button"
                              onClick={() => setSelectedStandId(subStand.id)}
                              className="island-choice-row"
                            >
                              <div className="choice-text">
                                <strong>{subStand.name}</strong>
                              </div>
                              <span className="choice-count">
                                {standCaseCount} 個攤位 <ChevronRight size={14} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* 創意島 > 電玩城：隨機抽 3 款結果 */}
                {selectedDistrict &&
                  selectedDistrict.id === 'creative-arcade' &&
                  randomPickedGames && (
                    <div className="space-y-2 mt-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-900/15">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-950">🎲 隨機抽出 3 款遊戲</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDrawRandomGames}
                            className="text-[11px] font-bold text-violet-800 hover:underline"
                          >
                            再抽一次
                          </button>
                          <button
                            type="button"
                            onClick={() => setRandomPickedGames(null)}
                            className="text-[11px] font-bold text-stone-500 hover:text-stone-800"
                          >
                            關閉
                          </button>
                        </div>
                      </div>
                      <div className="island-items-list">
                        {randomPickedGames.map((game) => (
                          <button
                            key={game.id}
                            type="button"
                            onClick={() => handleOpenItemPreview(game)}
                            className="island-choice-row"
                          >
                            <div className="choice-text">
                              <strong>{game.appName || game.title}</strong>
                            </div>
                            <span className="choice-count">
                              進入 <ChevronRight size={14} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* 創意島 > 電玩城：依不同種類遊戲分展區 */}
                {selectedDistrict &&
                  selectedDistrict.id === 'creative-arcade' &&
                  !selectedStreet &&
                  !selectedStand && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setRandomPickedGames(null);
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
                        {selectedDistrict.streets.map((street) => {
                          const rawCat = street.name.replace('展區', '');
                          const zoneGames = arcadeGameQuestions.filter((g) => {
                            const tertiary = getEffectiveTertiaryCategory(g);
                            const sub = g.subcategory || '';
                            const title = g.title || '';
                            return (
                              tertiary === rawCat ||
                              sub.includes(rawCat) ||
                              title.includes(rawCat)
                            );
                          });
                          return (
                            <button
                              key={street.id}
                              type="button"
                              onClick={() => {
                                setRandomPickedGames(null);
                                setSelectedStreetId(street.id);
                                setSelectedStandId(null);
                              }}
                              className="island-choice-row"
                            >
                              <div className="choice-text">
                                <strong>{street.name}</strong>
                              </div>
                              <span className="choice-count">
                                {zoneGames.length} 款 <ChevronRight size={14} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* 創意島 > 電玩城 > 特定展區：該種類遊戲作品清單 */}
                {selectedDistrict &&
                  selectedDistrict.id === 'creative-arcade' &&
                  selectedStreet && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStreetId(null);
                            setSelectedStandId(null);
                          }}
                          className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft size={12} /> 回上層
                        </button>
                      </div>
                      {(() => {
                        const rawCat = selectedStreet.name.replace('展區', '');
                        const zoneGames = arcadeGameQuestions.filter((g) => {
                          const tertiary = getEffectiveTertiaryCategory(g);
                          const sub = g.subcategory || '';
                          const title = g.title || '';
                          return (
                            tertiary === rawCat ||
                            sub.includes(rawCat) ||
                            title.includes(rawCat)
                          );
                        });
                        const displayGames = zoneGames.length > 0 ? zoneGames : arcadeGameQuestions.slice(0, 4);
                        return (
                          <div className="island-items-list">
                            {displayGames.map((game) => (
                              <button
                                key={game.id}
                                type="button"
                                onClick={() => handleOpenItemPreview(game)}
                                className="island-choice-row"
                              >
                                <div className="choice-text">
                                  <strong>{game.appName || game.title}</strong>
                                </div>
                                <span className="choice-count">
                                  進入 <ChevronRight size={14} />
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                {/* 徵才島 > 翰林院：五大專業智庫 */}
                {selectedDistrict &&
                  selectedDistrict.id === 'career-hanlin-district' &&
                  !selectedStreet && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-end">
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
                        {selectedDistrict.streets.map((thinkTank) => {
                          const expertCount = hanlinExperts.filter(
                            (exp) => exp.thinkTankId === thinkTank.id,
                          ).length;
                          return (
                            <button
                              key={thinkTank.id}
                              type="button"
                              onClick={() => {
                                setSelectedStreetId(thinkTank.id);
                                setSelectedStandId(null);
                              }}
                              className="island-choice-row"
                            >
                              <div className="choice-text">
                                <strong>{thinkTank.name}</strong>
                              </div>
                              <span className="choice-count">
                                {expertCount} 位專家 <ChevronRight size={14} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* 徵才島 > 翰林院 > 特定智庫專家名冊 */}
                {selectedDistrict &&
                  selectedDistrict.id === 'career-hanlin-district' &&
                  selectedStreet && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStreetId(null);
                            setSelectedStandId(null);
                          }}
                          className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft size={12} /> 回上層
                        </button>
                      </div>

                      <div className="island-items-list">
                        {currentHanlinExperts.map((expert) => (
                          <button
                            key={expert.id}
                            type="button"
                            onClick={() => handleOpenExpertPreview(expert)}
                            className="island-choice-row"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={expert.avatar}
                                alt={expert.name}
                                className="w-9 h-9 rounded-full object-cover border border-amber-900/20 shrink-0"
                              />
                              <div className="choice-text min-w-0">
                                <strong>{expert.name}</strong>
                                <small className="truncate">{expert.title}</small>
                              </div>
                            </div>
                            <span className="choice-count shrink-0">
                              查看 <ChevronRight size={14} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* 徵才島 > 人才獵頭 / 媒合專家 */}
                {selectedDistrict && selectedDistrict.id === 'career-headhunter-district' && (
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center justify-end">
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

                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-900/15 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-amber-900/20 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs p-0.5">
                          <img
                            src="/agents/baimiao.webp"
                            alt="白喵"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-xs text-stone-700">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span>白喵</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-amber-200/80 rounded text-amber-900">
                              市場顧問 Agent
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenFormModal('headhunter_match')}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <span>委託人才獵頭 / 媒合專家</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="island-items-list">
                      {currentHanlinExperts.map((expert) => (
                        <button
                          key={expert.id}
                          type="button"
                          onClick={() => handleOpenExpertPreview(expert)}
                          className="island-choice-row"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={expert.avatar}
                              alt={expert.name}
                              className="w-9 h-9 rounded-full object-cover border border-amber-900/20 shrink-0"
                            />
                            <div className="choice-text min-w-0">
                              <strong>{expert.name}</strong>
                              <small className="truncate">{expert.title}</small>
                            </div>
                          </div>
                          <span className="choice-count shrink-0">
                            查看 <ChevronRight size={14} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 徵才島 > 求職廟：求籤（填需求 匯職缺） */}
                {selectedDistrict && selectedDistrict.id === 'career-temple-district' && (
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center justify-end">
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

                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-900/15 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-amber-900/20 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs p-0.5">
                          <img
                            src="/agents/sousou.webp"
                            alt="搜搜"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-xs text-stone-700">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span>搜搜</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-amber-200/80 rounded text-amber-900">
                              探索者 Agent
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenFormModal('career_wish')}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                          <span>🧧 求籤（填需求）</span>
                          <ArrowRight size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction('jobs')}
                          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-stone-50 border border-amber-900/20 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                        >
                          <BriefcaseBusiness size={13} className="text-amber-700" />
                          <span>匯職缺</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 其他區域（主島、討論島）的街道清單 */}
                {selectedDistrict &&
                  selectedDistrict.id !== 'creative-exhibition' &&
                  selectedDistrict.id !== 'creative-arcade' &&
                  selectedDistrict.id !== 'pain-innovation-tower' &&
                  selectedDistrict.id !== 'career-hanlin-district' &&
                  selectedDistrict.id !== 'career-temple-district' &&
                  selectedDistrict.id !== 'career-headhunter-district' &&
                  !selectedStreet && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-end">
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
                            </div>
                            <span className="choice-count">
                              進入 <ChevronRight size={14} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* 主島 > 中央廣場 > 島覽地圖：新手導覽教學、平台介紹、運作說明、條款聲明（新分頁開啟） */}
                {selectedDistrict?.id === 'main-plaza' && selectedStreet?.id === 'main-quick-street' && (
                  <div className="space-y-2.5 mt-3">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedStreetId(null)}
                        className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft size={12} /> 回上層
                      </button>
                    </div>

                    <div className="space-y-2">
                      <a
                        href="/?onboarding=true"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/60 hover:from-amber-100 hover:to-orange-100/80 border border-amber-900/15 hover:border-amber-900/35 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs block"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white border border-amber-900/15 flex items-center justify-center shrink-0 text-amber-800 shadow-2xs">
                            <Compass className="w-4 h-4 text-amber-700" />
                          </div>
                          <strong className="text-xs font-black text-stone-900">
                            1. 新手導覽教學
                          </strong>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-amber-900 flex items-center gap-1 bg-white/80 px-2 py-1 rounded-lg border border-amber-900/15 group-hover:bg-amber-700 group-hover:text-white transition-all">
                          新分頁進入 ↗
                        </span>
                      </a>

                      <a
                        href="/about?section=intro"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left p-3 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50/60 hover:from-sky-100 hover:to-blue-100/80 border border-sky-900/15 hover:border-sky-900/35 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs block"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white border border-sky-900/15 flex items-center justify-center shrink-0 text-sky-800 shadow-2xs">
                            <Sparkles className="w-4 h-4 text-sky-700" />
                          </div>
                          <strong className="text-xs font-black text-stone-900">
                            2. 平台介紹
                          </strong>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-sky-900 flex items-center gap-1 bg-white/80 px-2 py-1 rounded-lg border border-sky-900/15 group-hover:bg-sky-700 group-hover:text-white transition-all">
                          新分頁進入 ↗
                        </span>
                      </a>

                      <a
                        href="/about?section=tiers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50/60 hover:from-emerald-100 hover:to-teal-100/80 border border-emerald-900/15 hover:border-emerald-900/35 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs block"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white border border-emerald-900/15 flex items-center justify-center shrink-0 text-emerald-800 shadow-2xs">
                            <PanelsTopLeft className="w-4 h-4 text-emerald-700" />
                          </div>
                          <strong className="text-xs font-black text-stone-900">
                            3. 運作說明
                          </strong>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-emerald-900 flex items-center gap-1 bg-white/80 px-2 py-1 rounded-lg border border-emerald-900/15 group-hover:bg-emerald-700 group-hover:text-white transition-all">
                          新分頁進入 ↗
                        </span>
                      </a>

                      <a
                        href="/about?section=terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50/60 hover:from-purple-100 hover:to-indigo-100/80 border border-purple-900/15 hover:border-purple-900/35 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs block"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white border border-purple-900/15 flex items-center justify-center shrink-0 text-purple-800 shadow-2xs">
                            <ScrollText className="w-4 h-4 text-purple-700" />
                          </div>
                          <strong className="text-xs font-black text-stone-900">
                            4. 條款聲明
                          </strong>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-purple-900 flex items-center gap-1 bg-white/80 px-2 py-1 rounded-lg border border-purple-900/15 group-hover:bg-purple-700 group-hover:text-white transition-all">
                          新分頁進入 ↗
                        </span>
                      </a>
                    </div>
                  </div>
                )}

                {/* 主島 > 中央廣場 > 角色介紹：六大 Agent 名冊 */}
                {selectedDistrict?.id === 'main-plaza' && selectedStreet?.id === 'main-agents-street' && (
                  <div className="space-y-2.5 mt-3">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedStreetId(null)}
                        className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft size={12} /> 回上層
                      </button>
                    </div>
                    <div className="space-y-2">
                      {IDEAX_AGENTS.map((agent) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => handleOpenAgentPreview(agent)}
                          className="w-full text-left p-2.5 rounded-2xl bg-amber-50/40 hover:bg-amber-100/60 border border-amber-900/15 hover:border-amber-900/30 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white border border-amber-900/15 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs p-0.5">
                              <img
                                src={agent.img}
                                alt={agent.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <strong className="text-xs font-black text-stone-900">
                                {agent.name}
                              </strong>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-950 border border-amber-300">
                                {agent.title}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-amber-900 flex items-center gap-1">
                            看檔案 <ChevronRight size={14} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStreet &&
                  selectedStreet.id !== 'main-agents-street' &&
                  selectedStreet.id !== 'main-quick-street' &&
                  selectedStreet.id !== 'main-latest-street' &&
                  selectedDistrict?.id !== 'creative-exhibition' &&
                  selectedDistrict?.id !== 'creative-arcade' &&
                  selectedDistrict?.id !== 'pain-innovation-tower' &&
                  selectedDistrict?.id !== 'career-hanlin-district' &&
                  selectedDistrict?.id !== 'career-headhunter-district' &&
                  selectedDistrict?.id !== 'career-temple-district' &&
                  !selectedStand && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedStreetId(null)}
                          className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft size={12} /> 回上層
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
                            </div>
                            <span className="choice-count">
                              進入 <ChevronRight size={14} />
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
                        <span className="text-xs font-black text-amber-950">懸賞牆</span>
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
                      <h4 className="text-xs font-black text-amber-950 mb-2">
                        🖋️ 佈告桌 · 刊登痛點
                      </h4>

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
                            <span>查看已刊登痛點</span>
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
                            placeholder="請輸入痛點標題..."
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          />
                        </div>

                        <div className="island-field-group">
                          <label>分類</label>
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
                          <label>詳細描述</label>
                          <textarea
                            rows={3}
                            required
                            placeholder="請描述痛點情境與期望解決方式..."
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                          />
                        </div>

                        <div className="island-field-group">
                          <label>關鍵標籤（選填）</label>
                          <input
                            type="text"
                            placeholder="例如：自動化, 盤點, AI"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          />
                        </div>

                        <button type="submit" className="island-form-submit-btn">
                          <Send size={14} />
                          <span>刊登痛點</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {selectedStand &&
                  selectedStand.id !== 'pain-bounty-wall' &&
                  selectedStand.id !== 'pain-posting-desk' &&
                  selectedDistrict?.id !== 'career-hanlin-district' && (
                    <div className="mt-2 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStandId(null);
                        }}
                        className="island-back-link mb-2"
                      >
                        <ArrowLeft size={13} /> 回上層
                      </button>
                    </div>
                  )}

                {/* 條列式內容（僅在進入具體看板/攤位/懸賞牆時顯示，不在選單階層顯示） */}
                {(selectedIsland?.id === 'pain' ||
                  selectedStreet?.id === 'main-latest-street' ||
                  Boolean(selectedStand)) &&
                  selectedStand?.id !== 'pain-posting-desk' &&
                  selectedIsland?.id !== 'career' &&
                  selectedDistrict?.id !== 'creative-arcade' && (
                    <div className="mt-3 pt-3 border-t border-stone-200">
                      {selectedStreet?.id === 'main-latest-street' && !selectedStand && (
                        <div className="flex items-center justify-end mb-2">
                          <button
                            type="button"
                            onClick={() => setSelectedStreetId(null)}
                            className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                          >
                            <ArrowLeft size={12} /> 回上層
                          </button>
                        </div>
                      )}

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
                                <span className="item-cat">{q.subcategory || q.category}</span>
                                <strong className="item-title">{q.appName || q.title}</strong>
                              </div>
                              <ChevronRight size={15} className="text-stone-400 shrink-0" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="island-empty-box">
                          <p>暫無內容</p>
                        </div>
                      )}
                    </div>
                  )}
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
                    ? '創新提案攤位'
                    : previewQuestion.postType === 'chat_discussion'
                    ? '交流討論'
                    : isGameQuestion(previewQuestion)
                    ? '遊戲作品'
                    : '作品攤位'}
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
                    <span className="author-date">
                      {previewQuestion.createdAt || '近期發布'}
                    </span>
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

          {leftModalMode === 'expert' && previewExpert && (
            <div className="island-preview-pane">
              <div className="island-pane-header">
                <span className="island-preview-badge">翰林院 · {previewExpert.thinkTankName}</span>
                <button
                  type="button"
                  onClick={() => setLeftModalMode('none')}
                  className="island-drawer-close"
                  aria-label="關閉左側彈窗"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="island-preview-body">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={previewExpert.avatar}
                    alt={previewExpert.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-700/30 shrink-0"
                  />
                  <div>
                    <h2 className="text-lg font-black text-stone-900">{previewExpert.name}</h2>
                    <p className="text-xs font-bold text-amber-900 mt-0.5">{previewExpert.title}</p>
                  </div>
                </div>

                <div className="island-preview-meta mb-3">
                  {previewExpert.skills.map((skill) => (
                    <span key={skill} className="sub-tag">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="island-preview-desc">
                  <p>{previewExpert.bio}</p>
                  {previewExpert.featuredCaseTitle && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-900/15">
                      <div className="text-xs font-black text-amber-950 mb-1">
                        代表實戰案例：{previewExpert.featuredCaseTitle}
                      </div>
                      {previewExpert.featuredCaseOutcome && (
                        <div className="text-xs text-stone-700">{previewExpert.featuredCaseOutcome}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="island-preview-actions">
                  <button
                    type="button"
                    onClick={() => handleOpenFormModal('headhunter_match')}
                    className="island-action-primary-btn"
                  >
                    <Users size={16} />
                    <span>向此專家 / 智庫發起獵才與專案媒合委託</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (previewExpert.solverId) {
                        const matched = (solvers || []).find((s) => s.id === previewExpert.solverId);
                        if (matched) setSelectedSolver(matched);
                      }
                      onAction('experts');
                    }}
                    className="island-action-secondary-btn"
                  >
                    <span>前往平台專家智庫查看完整檔案 ↗</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {leftModalMode === 'agent' && previewAgent && (
            <div className="island-preview-pane">
              <div className="island-pane-header">
                <span className="island-preview-badge">創點源守護者 · {previewAgent.name}</span>
                <button
                  type="button"
                  onClick={() => setLeftModalMode('none')}
                  className="island-drawer-close"
                  aria-label="關閉左側彈窗"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="island-preview-body">
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100/60 border border-amber-900/20 overflow-hidden flex items-center justify-center shrink-0 p-1">
                    <img
                      src={previewAgent.img}
                      alt={previewAgent.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-stone-900">{previewAgent.name}</h2>
                    <p className="text-xs font-bold text-amber-900 mt-0.5">{previewAgent.title}</p>
                    {previewAgent.tagline && (
                      <span className="text-[11px] font-black text-violet-700 block mt-0.5">
                        {previewAgent.tagline}
                      </span>
                    )}
                  </div>
                </div>

                <div className="island-preview-desc mb-3">
                  <p className="text-xs text-stone-700 leading-relaxed">{previewAgent.intro}</p>
                </div>

                <div className="mb-3.5">
                  <h4 className="text-xs font-black text-stone-800 mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-600" /> 職責與守護任務
                  </h4>
                  <ul className="space-y-1 text-xs text-stone-700">
                    {previewAgent.duties.map((duty, dIdx) => (
                      <li key={dIdx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{duty}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-3.5">
                  <h4 className="text-xs font-black text-stone-800 mb-1.5 flex items-center gap-1.5">
                    <MapPin size={13} className="text-stone-500" /> 出沒地點
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {previewAgent.spots.map((spot, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-950 border border-amber-300 font-bold"
                      >
                        {spot}
                      </span>
                    ))}
                  </div>
                </div>

                {previewAgent.idCard && (
                  <div className="mt-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-900/15">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                        <ScrollText size={13} className="text-amber-700" /> 創點源虛擬身分證
                      </span>
                      <span className="text-[10px] text-stone-500 font-bold text-amber-800">點擊看大圖</span>
                    </div>
                    <img
                      src={previewAgent.idCard.thumb}
                      alt={`${previewAgent.name}身分證`}
                      onClick={() =>
                        setViewingIdCard({
                          src: previewAgent.idCard!.full,
                          alt: `${previewAgent.name}的創點源身分證`,
                          name: `創點源身分證-${previewAgent.name}`,
                        })
                      }
                      className="w-full rounded-xl border border-amber-900/20 shadow-xs cursor-zoom-in hover:scale-[1.01] transition-transform"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {leftModalMode === 'form' && (
            <div className="island-form-pane">
              <div className="island-pane-header">
                <h3 className="font-black text-sm text-stone-900">
                  {formType === 'pain_point' && '🔥 創點樓 · 寫下你的難題'}
                  {formType === 'career_wish' && '🧧 求職廟 · 求籤許願'}
                  {formType === 'headhunter_match' && '🤝 徵才島 · 人才獵頭 / 媒合專家委託'}
                  {formType === 'discussion' && '💬 日常討論街 · 發起交流話題'}
                  {formType === 'proposal' && '💡 展覽館 · 登錄創新提案'}
                  {formType === 'game' && '🎮 電玩城 · 上架遊戲'}
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
                  求職許願
                </button>
                <button
                  type="button"
                  className={formType === 'headhunter_match' ? 'active' : ''}
                  onClick={() => handleOpenFormModal('headhunter_match')}
                >
                  獵頭/媒合
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
                <button
                  type="button"
                  className={formType === 'game' ? 'active' : ''}
                  onClick={() => handleOpenFormModal('game')}
                >
                  上架遊戲
                </button>
              </div>

              <div className="island-form-prompt-box">
                <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p>
                  {formType === 'pain_point' && '寫下您切身遇到的問題與需求。'}
                  {formType === 'career_wish' && '填寫求職條件，搜搜將為你在全網匯職缺比對最新機會。'}
                  {formType === 'headhunter_match' && '填寫目標職位或專家條件，由白喵與獵頭團隊為您精準對接。'}
                  {formType === 'discussion' && '開一桌新話題！邀請全島朋友坐下一同切磋探討。'}
                  {formType === 'proposal' && '登錄創新作品與點子，展示給島民與合作夥伴。'}
                  {formType === 'game' && '填寫遊戲名稱與作品資訊，上架至電玩城展區。'}
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
                      {formType === 'career_wish'
                        ? '期望職稱 / 目標職位'
                        : formType === 'headhunter_match'
                        ? '欲獵尋人才職稱 / 欲媒合專家領域'
                        : formType === 'game'
                        ? '遊戲名稱'
                        : '主題標題'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        formType === 'career_wish'
                          ? '例如：資深前端工程師、AI 產品經理...'
                          : formType === 'headhunter_match'
                          ? '例如：尋訪 AI 架構師、媒合生醫法規取證顧問...'
                          : formType === 'pain_point'
                          ? '例如：找尋能自動整理多平台財務報表的工具...'
                          : formType === 'game'
                          ? '請輸入遊戲作品名稱...'
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
                      <option value="法律智財">法律智財</option>
                      <option value="日常生活">日常生活</option>
                      <option value="學術探討">學術探討</option>
                    </select>
                  </div>

                  <div className="island-field-group">
                    <label>
                      {formType === 'career_wish'
                        ? '個人專長技能與工作期望條件'
                        : formType === 'headhunter_match'
                        ? '獵才條件 / 專案專家媒合需求說明'
                        : '詳細需求描述'}
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder={
                        formType === 'career_wish'
                          ? '請描述技能專長、期望地區或薪資條件...'
                          : formType === 'headhunter_match'
                          ? '請描述人才資歷、合作模式或專家條件...'
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
              <div className="guide-modal-top-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowGuideModal(false);
                    setShowIntroVideoModal(true);
                  }}
                  className="guide-modal-video-replay-btn"
                  title="觀看創點源導覽影片"
                >
                  <Film size={14} />
                  <span>導覽影片</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="guide-modal-circle-close"
                  aria-label="關閉說明"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <h2 className="guide-main-title">快來尋找小彩蛋!</h2>
            <p className="guide-main-subtitle">數十處隱藏彩蛋 可與物件們互動</p>

            <p className="guide-main-desc">
              點選島嶼進入探索。電腦版按住左鍵可平移地圖、右鍵拖曳可旋轉並調整俯視角；手機版用單手指移動即可平移並調整俯視角。場景並會隨所在地時辰與天候（清晨・中午・傍晚・晚上及雨天）自動變換。
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

      {/* ============================================================
          左下角「彩蛋收集冊」彈窗 (Easter Egg Collection Book Modal)
          ============================================================ */}
      {showEasterEggBook && (
        <div
          className="island-easter-book-modal-overlay island-ui-interactive"
          onClick={() => setShowEasterEggBook(false)}
        >
          <div
            className="island-easter-book-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="easter-book-modal-header">
              <div>
                <div className="easter-book-modal-badge">
                  <Sparkles size={13} />
                  <span>創點源 · 尋幽探勝錄</span>
                </div>
                <h2 className="easter-book-modal-title">彩蛋收集冊</h2>
                <p className="easter-book-modal-subtitle">
                  與島上物件或 Agent 角色互動即可觸發詩句，首次觸發將按發現順序刊登於收集冊
                </p>
              </div>

              <div className="easter-book-header-right">
                <div className="easter-book-progress-pill">
                  <span>已收集</span>
                  <strong>
                    {collectedEasterEggs.length} / {TOTAL_ISLAND_EASTER_EGGS}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEasterEggBook(false)}
                  className="guide-modal-circle-close"
                  aria-label="關閉彩蛋收集冊"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="easter-book-slots-grid">
              {Array.from({ length: TOTAL_ISLAND_EASTER_EGGS }).map((_, idx) => {
                const record = collectedEasterEggs[idx];
                const slotNum = String(idx + 1).padStart(2, '0');
                return (
                  <div
                    key={`easter-slot-${slotNum}`}
                    className={`easter-slot-card ${record ? 'is-unlocked' : 'is-locked'}`}
                  >
                    <div className="easter-slot-top">
                      <span className="easter-slot-index">第 {slotNum} 格</span>
                      {record ? (
                        <span className="easter-slot-status unlocked">
                          <CheckCircle2 size={12} />
                          已解鎖
                        </span>
                      ) : (
                        <span className="easter-slot-status locked">尚未觸發</span>
                      )}
                    </div>

                    {record ? (
                      <>
                        <div className="easter-slot-verse">{record.verse}</div>
                        <div className="easter-slot-time">
                          <Clock size={11} />
                          <span>{record.unlockedAt.split(' ')[0]}</span>
                        </div>
                      </>
                    ) : (
                      <div className="easter-slot-placeholder">
                        <span>？ 尋訪創點源各處物件與時辰奇景以解鎖此格</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          首次進入創點源導覽影片彈窗 (Intro Video Modal)
          ============================================================ */}
      {showIntroVideoModal && (
        <div
          className="island-intro-video-overlay island-ui-interactive"
          onClick={handleCloseIntroVideo}
        >
          <div
            className="island-intro-video-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseIntroVideo}
              className="island-intro-video-close-btn"
              aria-label="關閉影片"
              title="關閉影片"
            >
              <X size={20} />
            </button>
            {introVideoSrc ? (
              <video
                ref={introVideoRef}
                key={introVideoSrc}
                src={introVideoSrc}
                className="island-intro-video-player"
                controls
                autoPlay
                playsInline
                preload="auto"
                onLoadedData={(e) => attemptAutoPlayIntroVideo(e.currentTarget)}
                onCanPlay={(e) => attemptAutoPlayIntroVideo(e.currentTarget)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-amber-100/90 gap-4 min-h-[280px]">
                <Film size={32} className="text-amber-300 animate-pulse" />
                <div className="text-sm font-bold tracking-wider flex items-center justify-center flex-wrap gap-1 text-center">
                  <span>載入島覽影片...(可跳過,可在下方</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400/20 border border-amber-300/60 text-amber-300 mx-0.5">
                    <HelpCircle size={13} />
                  </span>
                  <span>查看)</span>
                </div>
                <div className="w-56 h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-200 rounded-full"
                    style={{ width: `${Math.max(6, introVideoLoadProgress)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

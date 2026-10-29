import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles,
  Trophy,
  Award,
  Layers,
  Calendar,
  Share2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Upload,
  ArrowRight,
  TrendingUp,
  Coins,
  ShieldCheck,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ChevronDown,
  Filter,
  ExternalLink,
  Lock,
  Clock,
  X,
  Heart,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Globe,
  BookOpen,
  MessageSquare,
  School,
  Percent,
  LogIn,
  User as UserIcon,
  LogOut,
  Bookmark,
  Star,
  Video,
  Send,
  Briefcase,
  GraduationCap,
  Megaphone,
  ArrowUpDown,
  ArrowLeft,
  Flame,
  Compass,
  Image as ImageIcon,
  Link as LinkIcon,
  Folder,
  FolderOpen,
  Download,
  Eye,
  Lightbulb,
  ArrowLeftRight,
} from 'lucide-react';
import {
  StarSeasonProposal,
  CompetitionAccount,
  StarSeasonStage,
  StarSeasonTrack,
  STAR_SEASON_TRACKS,
  OFFICIAL_COMPETITION_TRACKS,
  COMPETITION_POINTS_CONFIG,
  DEFAULT_COMPETITION_SCHEDULE,
  ParticipantRegistrationData,
  JudgeApplicationData,
  ProposalComment,
  CompetitionHomepageStatsConfig,
  CompetitionAdminMetrics,
  getProposalCardAuthorText,
} from '../../types/competition';
import {
  getCompetitionHomepageStatsConfig,
  getCompetitionAggregatedMetrics,
  recordNewExpertApplication,
} from '../../services/competitionAdminSync';
import {
  fetchProposals,
  fetchMyCompetitionAccount,
  claimShareBonus,
  supportProposal,
  submitProposal,
  uploadProposalAttachment,
  adminReviewProposal,
  adminConfirmAward,
  toggleLikeProposal,
  fetchUserLikedProposalIds,
  fetchProposalComments,
  postProposalComment,
  registerParticipant,
  applyJudge,
  fetchMyAmbassadorData,
  bindAmbassadorReferralCode,
  fetchSingleProposal,
  recordProposalView,
} from '../../services/competitionClientService';
import {
  updateSEOForProposal,
  updateSEOForSubpage,
  resetSEOToDefault,
  getProposalShareUrl,
} from '../../services/seoService';
import { shareOrCopyUrl } from '../../utils/shareUtils';
import { resolveUserDisplayName, getUserNameColorClass } from '../../utils/userDisplay';
import { useApp } from '../../context/AppContext';
import { auth } from '../../services/firebase';
import { applyRealClicksToProposals, recordProposalViewClick } from '../../utils/proposalClicks';
import { getUniqueProposalCoverImage } from '../../utils/proposalImageUtils';
import { RulesFullPage } from './RulesFullPage';
import { SubmitProposalFullPage } from './SubmitProposalFullPage';
import { ParticipantFullPage } from './ParticipantFullPage';
import { JudgeFullPage } from './JudgeFullPage';
import { AmbassadorFullPage } from './AmbassadorFullPage';
import { ExploreProposalsFullPage } from './ExploreProposalsFullPage';
import { ProposalDetailFullPage } from './ProposalDetailFullPage';
import { ProposalHeroCarousel } from './ProposalHeroCarousel';
import { CompetitionFooter } from './CompetitionFooter';
import { AdminCompetitionRulesArchiveFolder } from './AdminCompetitionRulesArchiveFolder';
import { AdminCheatSheetFileManagerModal } from './AdminCheatSheetFileManagerModal';
import { MyProposalsAndDraftsModal } from './MyProposalsAndDraftsModal';
import { JudgeEvaluationModal } from './JudgeEvaluationModal';
import { AdminFinalEvaluationManagementModal } from './AdminFinalEvaluationManagementModal';
import { AdminUserManagementModal } from './AdminUserManagementModal';
import { AdminProposalReviewModal } from './AdminProposalReviewModal';
import { CompetitionTermsModal, CompetitionDocumentKey } from './CompetitionTermsModal';
import { ShatterPageTurnTransition } from './ShatterPageTurnTransition';
import { StarSeasonBroadcastBanner } from './StarSeasonBroadcastBanner';
import { StarSeasonGuideModal, GuideRole } from './StarSeasonGuideModal';
import { FloatingStarSeasonGuide } from './FloatingStarSeasonGuide';
import {
  getNominatedProposalIds,
  getIsFinalResultsPublished,
  calculateFinalProposalRankings,
  exportFinalRankingsExcel,
} from '../../services/finalEvaluationService';
import { getCompetitionExperts } from '../../services/competitionAdminSync';
import { getProposalDrafts } from '../../services/draftService';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';
import { findReferencedPainPoint, findProposalsReferencingPainPoint } from '../../utils/painPointLinking';
import { isCardViewsVisible } from '../../utils/questionUtils';
import { resolveClientCompetitionAccount } from '../../utils/competitionAccountUtils';
import { isGuestUser } from '../../utils/userDisplay';
import { GuestBoardGateBlurOverlay } from '../GuestBoardGateBlurOverlay';
import { GUEST_VISIBLE_COUNT, GUEST_BLURRED_TEASER_COUNT, registerGuestListExposure } from '../../utils/guestAccess';
import { isSimulatedUser, isSimulatedQuestion } from '../../data/virtualProposalsSeed';

export const isFakeProposal = (p: any): boolean => {
  if (!p) return false;
  // 小美余 是真實參賽者，其痛點與未來提案一律納入參賽範圍，切勿過濾
  if (
    p.authorName === '小美余' ||
    p.leaderName === '小美余' ||
    p.authorId === '0VcD0rRXRHbfNjmDVVBgk7Iil2F2' ||
    p.userId === '0VcD0rRXRHbfNjmDVVBgk7Iil2F2' ||
    p.id === 'star-prop-1792853867316-1ymcj'
  ) {
    return false;
  }
  const id = String(p.id || '');
  const authorId = String(p.authorId || '');
  if (p.isCompetitionJoined === false || id.startsWith('q-idea-user-')) {
    return true;
  }
  return (
    id.startsWith('demo-') ||
    id.startsWith('test-') ||
    id.startsWith('q-demo-') ||
    id.startsWith('q-mock-') ||
    id.startsWith('q-test-') ||
    id.startsWith('q-vp-') ||
    id.startsWith('q-179') ||
    authorId.startsWith('demo-u-') ||
    authorId.startsWith('test-') ||
    authorId.startsWith('mock-') ||
    authorId.startsWith('u-vp-') ||
    authorId.startsWith('u-agent-') ||
    Boolean(p.isSimulated) ||
    isSimulatedUser(authorId)
  );
};

export type ChallengeSubView = 'home' | 'proposal' | 'explore' | 'rules' | 'submit' | 'participant' | 'judge' | 'ambassador';

interface StarSeasonViewProps {
  onBackToOldSite: () => void;
  onGoToPainPoints?: () => void;
  onOpenAuth: () => void;
  onOpenPainPointInChuangDianZi?: (item: any) => void;
}

export const StarSeasonView: React.FC<StarSeasonViewProps> = ({
  onBackToOldSite,
  onGoToPainPoints,
  onOpenAuth,
  onOpenPainPointInChuangDianZi,
}) => {
  const {
    currentUser,
    setCurrentUser,
    questions,
    setQuestions,
    setSelectedQuestion,
    setAnswers,
    setSolvers,
    availableUsers,
    setAvailableUsers,
    addNotification,
    logoutAccount,
    openAuthModal,
    openAboutModal,
    toggleSecondQuestion,
    setQuestionLikeState,
    isQuestionSeconded,
    getQuestionSecondCount,
    isSimulatedDataPurged,
    isRaceMode,
    publicMetricsConfig,
  } = useApp();
  const [competitionTermsDoc, setCompetitionTermsDoc] = useState<CompetitionDocumentKey | null>(null);
  const isLoggedIn = Boolean(auth.currentUser || (currentUser && currentUser.id && currentUser.id !== 'user-guest'));
  const [proposals, setProposals] = useState<StarSeasonProposal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [account, setAccount] = useState<CompetitionAccount | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  // 「解方提案／痛點問題」預設分頁：跟著正在進行或下一個要開始的階段
  // （報名預熱與痛點徵件期間 → 痛點問題；預先提案以後 → 解方提案）
  const preferredSectionTab = (s: { activeStage: number }): 'solution' | 'pain_point' => (s.activeStage < 2 ? 'pain_point' : 'solution');
  const [exploreInitialTab, setExploreInitialTab] = useState<'solution' | 'pain_point'>(() => preferredSectionTab(getCompetitionStageInfo()));
  const [homepageSectionTab, setHomepageSectionTabState] = useState<'solution' | 'pain_point'>(() => preferredSectionTab(getCompetitionStageInfo()));
  const userPickedSectionTab = useRef(false);
  const setHomepageSectionTab = (t: 'solution' | 'pain_point') => {
    userPickedSectionTab.current = true; // 使用者自己切換過，就不再自動跟著階段改
    setHomepageSectionTabState(t);
  };

  // 創星季當前競賽階段 (報名 10/17、痛點徵件 10/24~11/13、模擬募資與提案 11/14~12/04、決選 12/05~12/11、公布 12/12~12/16)
  const [stageInfo, setStageInfo] = useState(() => getCompetitionStageInfo());
  // 頁面開著時跨到下一個階段：使用者沒手動切換過，就自動換到對應的分頁
  useEffect(() => {
    if (!userPickedSectionTab.current) setHomepageSectionTabState(preferredSectionTab(stageInfo));
  }, [stageInfo.activeStage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleStageChange = () => {
      setStageInfo(getCompetitionStageInfo());
    };
    window.addEventListener('ideax_competition_stage_changed', handleStageChange);
    return () => window.removeEventListener('ideax_competition_stage_changed', handleStageChange);
  }, []);

  // 首頁公開展示數據開關與即時聚合數據
  const [statsConfig, setStatsConfig] = useState<CompetitionHomepageStatsConfig>(() => getCompetitionHomepageStatsConfig());
  const [adminMetrics, setAdminMetrics] = useState<CompetitionAdminMetrics>(() => getCompetitionAggregatedMetrics());

  const currentDisplayName = resolveUserDisplayName(currentUser?.id, currentUser?.name, availableUsers);
  const currentNameColorClass = getUserNameColorClass(currentUser?.id, availableUsers, currentUser);

  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      setStatsConfig(e.detail || getCompetitionHomepageStatsConfig());
      setAdminMetrics(getCompetitionAggregatedMetrics());
    };
    window.addEventListener('ideax_competition_stats_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('ideax_competition_stats_config_updated', handleConfigUpdate);
  }, []);

  // 子網址滿版網頁狀態：home (總覽), proposal (探索提案), rules (競賽辦法), submit (投稿創新idea), participant (申請參賽者), judge (申請專家), ambassador (推廣大使)
  const [currentSubView, setCurrentSubView] = useState<ChallengeSubView>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.history.state?.subView) {
          const stSub = window.history.state.subView;
          if (stSub === 'proposal' || stSub === 'explore' || stSub === 'proposals' || stSub === 'explore-proposals') {
            return 'proposal';
          }
          if (stSub === 'rules') return 'rules';
          if (stSub === 'submit') return 'submit';
          if (stSub === 'participant') return 'participant';
          if (stSub === 'judge') return 'judge';
          if (stSub === 'ambassador') return 'ambassador';
          if (stSub === 'home') return 'home';
        }

        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        const hash = window.location.hash.toLowerCase();

        if (
          search.includes('proposalid=') ||
          search.includes('proposal=') ||
          search.includes('p=') ||
          path.includes('/proposal') ||
          path.includes('/proposals') ||
          path.includes('/explore-proposals') ||
          path.includes('/cases') ||
          search.includes('view=proposal') ||
          search.includes('view=cases') ||
          hash.includes('proposal')
        ) return 'proposal';
        if (path.includes('/rules') || search.includes('view=rules') || hash === '#rules') return 'rules';
        if (
          path.includes('/join') ||
          path.includes('/submit') ||
          search.includes('view=submit') ||
          search.includes('view=join') ||
          hash === '#submit' ||
          hash === '#join'
        ) return 'submit';
        if (path.includes('/participant') || search.includes('view=participant') || hash === '#participant') return 'participant';
        if (
          path.includes('/expert') ||
          path.includes('/judge') ||
          search.includes('view=judge') ||
          search.includes('view=expert') ||
          hash === '#judge' ||
          hash === '#expert'
        ) return 'judge';
        if (path.includes('/ambassador') || search.includes('view=ambassador') || hash === '#ambassador') return 'ambassador';
      }
    } catch {}
    return 'home';
  });

  // 監聽網址路徑變更 (popstate) 與自訂子分頁跳轉事件 (ideax_challenge_navigate)
  useEffect(() => {
    const handleSubViewNavigate = (e?: Event) => {
      let targetSubView: ChallengeSubView | null = null;
      let targetProposalId: string | null = null;

      if (e && (e as CustomEvent).detail?.subView) {
        let rawSub = (e as CustomEvent).detail.subView;
        if (rawSub === 'explore' || rawSub === 'explore-proposals' || rawSub === 'proposals') {
          rawSub = 'proposal';
        }
        targetSubView = rawSub as ChallengeSubView;
        targetProposalId = (e as CustomEvent).detail.proposalId || null;
      } else if (typeof window !== 'undefined') {
        if (window.history.state?.subView) {
          let stSub = window.history.state.subView;
          if (stSub === 'explore' || stSub === 'explore-proposals' || stSub === 'proposals') {
            stSub = 'proposal';
          }
          targetSubView = stSub as ChallengeSubView;
        }

        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        const hash = window.location.hash.toLowerCase();

        if (
          search.includes('proposalid=') ||
          search.includes('proposal=') ||
          search.includes('p=') ||
          path.includes('/proposal') ||
          path.includes('/proposals') ||
          path.includes('/explore-proposals') ||
          path.includes('/cases') ||
          search.includes('view=proposal') ||
          search.includes('view=cases') ||
          hash.includes('proposal')
        ) {
          targetSubView = 'proposal';
          const params = new URLSearchParams(window.location.search);
          targetProposalId = params.get('proposalId') || params.get('proposal') || params.get('p') || null;
        } else if (path.includes('/rules') || search.includes('view=rules') || hash === '#rules') {
          targetSubView = 'rules';
        } else if (
          path.includes('/join') ||
          path.includes('/submit') ||
          search.includes('view=submit') ||
          search.includes('view=join') ||
          hash === '#submit' ||
          hash === '#join'
        ) {
          targetSubView = 'submit';
        } else if (path.includes('/participant') || search.includes('view=participant') || hash === '#participant') {
          targetSubView = 'participant';
        } else if (
          path.includes('/expert') ||
          path.includes('/judge') ||
          search.includes('view=judge') ||
          search.includes('view=expert') ||
          hash === '#judge' ||
          hash === '#expert'
        ) {
          targetSubView = 'judge';
        } else if (path.includes('/ambassador') || search.includes('view=ambassador') || hash === '#ambassador') {
          targetSubView = 'ambassador';
        } else if (path.includes('/challenge') || path === '/') {
          targetSubView = 'home';
        }
      }

      if (targetSubView) {
        const raw = targetSubView as string;
        const normalized = (raw === 'explore' || raw === 'explore-proposals' || raw === 'proposals') ? 'proposal' : targetSubView;
        setCurrentSubView(normalized);
        if (targetProposalId !== null) {
          setSelectedProposalIdForExplore(targetProposalId);
        }
      }
    };

    window.addEventListener('popstate', handleSubViewNavigate);
    window.addEventListener('hashchange', handleSubViewNavigate);
    window.addEventListener('ideax_challenge_navigate', handleSubViewNavigate);
    return () => {
      window.removeEventListener('popstate', handleSubViewNavigate);
      window.removeEventListener('hashchange', handleSubViewNavigate);
      window.removeEventListener('ideax_challenge_navigate', handleSubViewNavigate);
    };
  }, []);

  const [homepageCarouselBatchIndex, setHomepageCarouselBatchIndex] = useState(0);
  const [isHomepageCarouselPaused, setIsHomepageCarouselPaused] = useState(false);
  const [expandedBatchMobileSummaryId, setExpandedBatchMobileSummaryId] = useState<string | null>(null);

  // 痛點問題輪播狀態（三張一批）
  const [homepagePainPointBatchIndex, setHomepagePainPointBatchIndex] = useState(0);
  const [isPainPointCarouselPaused, setIsPainPointCarouselPaused] = useState(false);
  const [isPainPointCarouselTransitionDisabled, setIsPainPointCarouselTransitionDisabled] = useState(false);

  // 提案列表：依時程公開，在第二階段預先提案 (11/14 10:00, activeStage >= 2) 開始前先隱藏創星季提案；創星季全面隱藏假提案與示範提案
  const homepageAllProposals = useMemo(() => {
    if (stageInfo.activeStage < 2) {
      return [];
    }
    const liveFiltered = proposals.filter((p) => {
      if (isFakeProposal(p)) return false;
      return true;
    });
    return liveFiltered.map((p) => ({
      id: p.id,
      title: p.title,
      school: (p as any).schoolOrOrg || '參賽隊伍',
      team: p.authorName || '提案團隊',
      authorName: p.authorName || '提案人',
      track: p.track,
      stage: p.stage,
      cohort: (p as any).cohort || '第一梯次',
      summary: p.summary || p.description || '',
      imageUrl: getUniqueProposalCoverImage(p),
      supportPoints: p.supportPoints || 0,
      supporterCount: p.supporterCount || 0,
      likeCount: p.likeCount || 0,
      commentsCount: p.commentsCount || 0,
      sourcePainPointTitle: p.sourcePainPointTitle,
      referencedPainPoint: p.referencedPainPoint,
    }));
  }, [proposals, isSimulatedDataPurged, stageInfo.activeStage, stageInfo.isProposalStage, stageInfo.isExpertReviewStage, stageInfo.isResultsStage, isRaceMode]);

  // 每批顯示 3 個提案 (未登入訪客可瀏覽前 20 則：前 16 則完整、後 4 則僅預覽)
  const isGuest = isGuestUser(currentUser);
  const homepageProposalBatches = useMemo(() => {
    const list = homepageAllProposals.filter((p) => p.stage !== 'pain_point'); // 依需求：提案輪播只顯示提案解方，不顯示痛點
    const effectiveList = isGuest ? list.slice(0, GUEST_VISIBLE_COUNT) : list;
    if (isGuest) registerGuestListExposure(list);
    const batches: typeof homepageAllProposals[] = [];
    for (let i = 0; i < effectiveList.length; i += 3) {
      batches.push(effectiveList.slice(i, i + 3));
    }
    return batches;
  }, [homepageAllProposals, isGuest]);

  // 建立無限向左循環輪播批次 (末端追加首批，確保輪播完一輪依然持續往左滑動)
  const extendedProposalBatches = useMemo(() => {
    if (homepageProposalBatches.length <= 1) return homepageProposalBatches;
    return [...homepageProposalBatches, homepageProposalBatches[0]];
  }, [homepageProposalBatches, isGuest]);

  const [isCarouselTransitionDisabled, setIsCarouselTransitionDisabled] = useState(false);

  // 向左前進下一批
  const handleCarouselNext = useCallback(() => {
    // 訪客也可以左右切換，瀏覽前 20 則（第 21 則起由下方登入遮罩提示）
    if (homepageProposalBatches.length <= 1) return;
    setHomepageCarouselBatchIndex((prev) => {
      if (prev >= homepageProposalBatches.length) {
        return 1;
      }
      return prev + 1;
    });
  }, [homepageProposalBatches.length, isGuest, onOpenAuth]);

  // 向右上一批
  const handleCarouselPrev = useCallback(() => {
    // 訪客也可以左右切換，瀏覽前 20 則（第 21 則起由下方登入遮罩提示）
    if (homepageProposalBatches.length <= 1) return;
    setHomepageCarouselBatchIndex((prev) => {
      if (prev <= 0) {
        return homepageProposalBatches.length - 1;
      }
      return prev - 1;
    });
  }, [homepageProposalBatches.length, isGuest, onOpenAuth]);

  // 當滑動到末端的複製批次 (index === homepageProposalBatches.length) 時，動畫結束後無縫歸零
  const handleCarouselTransitionEnd = useCallback(() => {
    if (homepageCarouselBatchIndex >= homepageProposalBatches.length) {
      setIsCarouselTransitionDisabled(true);
      setHomepageCarouselBatchIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsCarouselTransitionDisabled(false);
        });
      });
    }
  }, [homepageCarouselBatchIndex, homepageProposalBatches.length]);

  // 自動定時持續向左輪播 (每 4.5 秒向左滑動至下一批，一輪結束後無縫繼續向左)
  useEffect(() => {
    if (homepageProposalBatches.length <= 1 || isHomepageCarouselPaused) return;
    const timer = setInterval(() => {
      handleCarouselNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [homepageProposalBatches.length, isHomepageCarouselPaused, handleCarouselNext, isGuest]);

  const [selectedProposalIdForExplore, setSelectedProposalIdForExplore] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const search = window.location.search;
        const params = new URLSearchParams(search);
        const fromParam = params.get('proposalId') || params.get('proposal') || params.get('p');
        if (fromParam) return fromParam;

        const path = window.location.pathname;
        if (path.includes('/proposal/')) {
          const parts = path.split('/proposal/')[1]?.split('/')[0]?.split('?')[0];
          if (parts) return parts;
        }
      }
    } catch {}
    return null;
  });

  const navigateToSubView = (view: ChallengeSubView, proposalId?: string) => {
    const normalizedView = view === 'explore' ? 'proposal' : view;
    setCurrentSubView(normalizedView);
    setSelectedProposalIdForExplore(proposalId || null);
    try {
      if (typeof window !== 'undefined') {
        const currentParams = new URLSearchParams(window.location.search);
        const isFromCreate =
          currentParams.get('zone') === 'create_ideas' ||
          sessionStorage.getItem('ideax_from_create_ideas') === 'true';
        let targetPath = normalizedView === 'home' ? '/challenge' : `/challenge/${normalizedView}`;
        if (proposalId) {
          targetPath += `?proposalId=${proposalId}${isFromCreate ? '&zone=create_ideas' : ''}`;
        }
        window.history.pushState({ subView: normalizedView, proposalId }, '', targetPath);
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      try {
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search;
        const hash = window.location.hash.toLowerCase();
        const params = new URLSearchParams(search);
        const pId = (e.state && e.state.proposalId) || params.get('proposalId') || params.get('proposal') || params.get('p') || null;
        setSelectedProposalIdForExplore(pId);

        if (path.includes('/proposal') || path.includes('/proposals') || path.includes('/explore') || path.includes('/cases') || search.includes('view=proposal') || search.includes('view=explore') || search.includes('view=cases') || hash === '#proposal' || hash === '#proposals' || hash === '#explore' || hash === '#cases' || pId) {
          setCurrentSubView('proposal');
        } else if (path.includes('/rules') || search.includes('view=rules') || hash === '#rules') {
          setCurrentSubView('rules');
        } else if (path.includes('/submit') || search.includes('view=submit') || hash === '#submit') {
          setCurrentSubView('submit');
        } else if (path.includes('/participant') || search.includes('view=participant') || hash === '#participant') {
          setCurrentSubView('participant');
        } else if (path.includes('/judge') || search.includes('view=judge') || hash === '#judge') {
          setCurrentSubView('judge');
        } else if (path.includes('/ambassador') || search.includes('view=ambassador') || hash === '#ambassador') {
          setCurrentSubView('ambassador');
        } else {
          setCurrentSubView('home');
        }
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 未登入點擊提案或成為專家等需登入功能提示登入（使用 ref 防止重複觸發循環）
  const lastAuthPromptedSubViewRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      (currentSubView === 'submit' || currentSubView === 'participant' || currentSubView === 'judge') &&
      !isLoggedIn
    ) {
      if (lastAuthPromptedSubViewRef.current !== currentSubView) {
        lastAuthPromptedSubViewRef.current = currentSubView;
        onOpenAuth();
      }
    } else {
      lastAuthPromptedSubViewRef.current = null;
    }
  }, [currentSubView, isLoggedIn]);

  // 排序方式：依募資額 (funding)、按讚數 (likes)、討論數 (comments)
  const [sortBy, setSortBy] = useState<'funding' | 'likes' | 'comments'>('funding');

  // 個人列表與頭像選單狀態
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // 專屬報名頁面 (可切換「參賽者」與「評審團」)
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState<boolean>(false);
  const [regModalTab, setRegModalTab] = useState<'participant' | 'judge'>('participant');

  // 管理員專屬：創星季全套規章條款與辦法封存資料夾 Modal (僅管理員可見)
  const [isAdminRulesFolderOpen, setIsAdminRulesFolderOpen] = useState<boolean>(false);

  // 決審評審專屬評分 Modal
  const [isJudgeEvaluationModalOpen, setIsJudgeEvaluationModalOpen] = useState<boolean>(false);
  const [evaluatingJudgeUser, setEvaluatingJudgeUser] = useState<{ id: string; name: string } | null>(null);

  // 管理員專屬：決審評分與獎勵統計分頁控制台
  const [isAdminFinalEvaluationHubOpen, setIsAdminFinalEvaluationHubOpen] = useState<boolean>(false);
  const [isAdminRewardsHubOpen, setIsAdminRewardsHubOpen] = useState<boolean>(false);
  const [isAdminUserManagementOpen, setIsAdminUserManagementOpen] = useState<boolean>(false);
  const [isAdminProposalReviewOpen, setIsAdminProposalReviewOpen] = useState<boolean>(false);
  const [isAdminCheatSheetManagerOpen, setIsAdminCheatSheetManagerOpen] = useState<boolean>(false);

  // 特效：點擊「痛點」或「創新起點」字體碎片掉落並直接跳轉至對應專區
  const [shatterTransition, setShatterTransition] = useState<{
    isActive: boolean;
    clickedWord: 'painPoint' | 'innovation' | null;
    originX: number;
    originY: number;
  }>({
    isActive: false,
    clickedWord: null,
    originX: 0,
    originY: 0,
  });

  const handleTriggerShatterAndJump = (e: React.MouseEvent, word: 'painPoint' | 'innovation') => {
    if (shatterTransition.isActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    setShatterTransition({
      isActive: true,
      clickedWord: word,
      originX,
      originY,
    });

    // 碎片物理掉落過程中 (~480ms)，俐落跳轉
    setTimeout(() => {
      if (word === 'painPoint') {
        if (onGoToPainPoints) {
          onGoToPainPoints();
        } else {
          onBackToOldSite();
        }
      } else {
        navigateToSubView('proposal');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 480);

    // 1s 後復原動畫狀態
    setTimeout(() => {
      setShatterTransition({
        isActive: false,
        clickedWord: null,
        originX: 0,
        originY: 0,
      });
    }, 1000);
  };

  // 特效：點擊「你的」或「我的」黃色彎曲抖動底線，底線旋轉後掉落，2.5秒後彈跳恢復
  const [underlineDropState, setUnderlineDropState] = useState<{
    yourLine: 'idle' | 'dropping' | 'restoring';
    myLine: 'idle' | 'dropping' | 'restoring';
  }>({
    yourLine: 'idle',
    myLine: 'idle',
  });

  const handleDropUnderline = (target: 'yourLine' | 'myLine') => {
    if (underlineDropState[target] === 'dropping') return;
    setUnderlineDropState((prev) => ({ ...prev, [target]: 'dropping' }));
    setTimeout(() => {
      setUnderlineDropState((prev) => ({ ...prev, [target]: 'restoring' }));
      setTimeout(() => {
        setUnderlineDropState((prev) => ({ ...prev, [target]: 'idle' }));
      }, 450);
    }, 2500);
  };

  // 專家名單與評審身分判定 (評審身分為專家，由管理員在後台指派 isJudgeSelected = true)
  const expertsList = useMemo(() => getCompetitionExperts(), [isAdminFinalEvaluationHubOpen, isJudgeEvaluationModalOpen]);
  const isCurrentUserAppointedJudge = useMemo(() => {
    if (!currentUser || currentUser.id === 'user-guest') return false;
    const expertRec = expertsList.find(
      (e) => e.userId === currentUser.id || e.id === currentUser.id || e.expertEmail === currentUser.email
    );
    if (expertRec && expertRec.isJudgeSelected) return true;
    if ((currentUser as any).isJudgeSelected || (currentUser as any).isJudge) return true;
    return false;
  }, [currentUser, expertsList]);

  // 入選提案清單（管理員勾選後自動匯入決選評分區）
  const nominatedProposalIds = useMemo(
    () => getNominatedProposalIds(),
    [isJudgeEvaluationModalOpen, isAdminFinalEvaluationHubOpen]
  );
  const nominatedProposals = useMemo(() => {
    return proposals.filter((p) => !isFakeProposal(p) && (nominatedProposalIds.includes(p.id) || p.rankQualifiedForFinal));
  }, [proposals, nominatedProposalIds]);

  // 前台是否已盛大公布榜單
  const [isFinalResultsPublishedState, setIsFinalResultsPublishedState] = useState<boolean>(() => getIsFinalResultsPublished());
  const finalRankings = useMemo(() => {
    const list = proposals.filter((p) => !isFakeProposal(p));
    return calculateFinalProposalRankings(list);
  }, [proposals, nominatedProposalIds, isAdminFinalEvaluationHubOpen, isFinalResultsPublishedState]);

  // 個人提案與草稿箱 Modal
  const [isMyProposalsModalOpen, setIsMyProposalsModalOpen] = useState<boolean>(false);
  const [proposalDraftsCount, setProposalDraftsCount] = useState<number>(0);

  useEffect(() => {
    const updateDraftsCount = () => {
      const drafts = getProposalDrafts(currentUser?.id);
      setProposalDraftsCount(drafts.length);
    };
    updateDraftsCount();
    window.addEventListener('ideax_drafts_updated', updateDraftsCount);
    return () => {
      window.removeEventListener('ideax_drafts_updated', updateDraftsCount);
    };
  }, [currentUser]);

  // 依指示：競賽模式不設虛擬測試帳號與假資料，完全以真實用戶帳號運作

  // 點擊痛點捷徑直接平滑滑動至痛點專區看板
  const scrollToPainPointsBoard = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onGoToPainPoints) {
      onGoToPainPoints();
    } else {
      onBackToOldSite();
    }
  };


  // 綠色膠囊標籤第二行：日期+XXX(階段名稱)中!
  const stageBadgeSubtitle = useMemo(() => {
    if (stageInfo.activeStage === 0) {
      return stageInfo.isRegistrationOnlyStage ? '10/17 報名開跑・10/24 徵件!' : '10/24 痛點徵件即將開跑!';
    }
    if (stageInfo.isPainPointStage) return '10/24~11/13 痛點徵件中!';
    if (stageInfo.isPreProposalStage) return '11/14~11/15 預先提案中!';
    if (stageInfo.isCrowdfundingActiveStage) return '11/16~12/04 模擬募資中!';
    if (stageInfo.isExpertReviewStage) return '12/05~12/11 進入決選(評審)中!';
    return '12/12~12/16 公布結果中!';
  }, [stageInfo]);

  // 痛點徵件階段：點擊提出痛點（僅在 10/24 00:00 ~ 11/13 16:30 開放）
  const handleOpenPainPointSubmission = () => {
    if (stageInfo.activeStage === 0 || stageInfo.isBeforeStart || stageInfo.isRegistrationOnlyStage) {
      showToast('⚠️ 尚未開放：創星季第一階段「痛點徵件」將於 10/24 00:00 正式開放！目前尚未開放徵件，敬請期待。');
      const el = document.getElementById('homepage-schedule-section') || document.getElementById('homepage-awards-section');
      el?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!stageInfo.isPainPointStage) {
      showToast('ℹ️ 創星季第一階段「痛點徵件」已於 11/13 16:30 截止！目前已開放第二階段「想解方提案」。');
      return;
    }
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    setFormStage('pain_point');
    setIsSubmitModalOpen(true);
  };

  // 個人收藏名單 (已按讚提案)
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState<boolean>(false);
  const [likedProposalIds, setLikedProposalIds] = useState<string[]>([]);

  // 提案討論留言狀態
  const [activeComments, setActiveComments] = useState<ProposalComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);

  // 參賽者報名表單（大專校院募資實戰模擬學習平台體驗規格）
  const [teamName, setTeamName] = useState<string>('');
  const [leaderName, setLeaderName] = useState<string>('');
  const [leaderPhone, setLeaderPhone] = useState<string>('');
  const [leaderEmail, setLeaderEmail] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [showOrganizationOnCard, setShowOrganizationOnCard] = useState<boolean>(false);
  const [department, setDepartment] = useState<string>('');
  const [advisorName, setAdvisorName] = useState<string>('');
  const [teamMembersInput, setTeamMembersInput] = useState<string>('');
  const [participantTrack, setParticipantTrack] = useState<StarSeasonTrack>('ai_applications');
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [participantSummary, setParticipantSummary] = useState<string>('');
  const [participantDescription, setParticipantDescription] = useState<string>('');
  const [participantSourcePainPointId, setParticipantSourcePainPointId] = useState<string>('');
  const [bpFile, setBpFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const [prototypeImgFile, setPrototypeImgFile] = useState<{ url: string; name: string } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [targetFundingAmount, setTargetFundingAmount] = useState<number>(300000);
  const [rewardPlanDescription, setRewardPlanDescription] = useState<string>('搶先體驗資格、限量特製紀念徽章、技術感謝白皮書');
  const [participantPledgeAgreed, setParticipantPledgeAgreed] = useState<boolean>(false);
  const [isSubmittingParticipant, setIsSubmittingParticipant] = useState<boolean>(false);

  // 參賽意向調查 (主辦單位統計參賽分布與管道)
  const [participantExpectedItems, setParticipantExpectedItems] = useState<string[]>(['痛點', '解方']);
  const [participantReferralSource, setParticipantReferralSource] = useState<string>('');
  const [participantReferralSourceOther, setParticipantReferralSourceOther] = useState<string>('');

  // 評審團申請表單（專業評審審查）
  const [judgeName, setJudgeName] = useState<string>('');
  const [judgePhone, setJudgePhone] = useState<string>('');
  const [judgeEmail, setJudgeEmail] = useState<string>('');
  const [judgeOrg, setJudgeOrg] = useState<string>('');
  const [judgeJobTitle, setJudgeJobTitle] = useState<string>('');
  const [judgeDomain, setJudgeDomain] = useState<string>('AI 智慧與科技創新');
  const [judgeExperienceYears, setJudgeExperienceYears] = useState<number>(5);
  const [judgeCredentialsNote, setJudgeCredentialsNote] = useState<string>('');
  const [judgeProofFile, setJudgeProofFile] = useState<{ url: string; name: string } | null>(null);
  const [judgeBio, setJudgeBio] = useState<string>('');
  const [judgePledgeAgreed, setJudgePledgeAgreed] = useState<boolean>(false);
  const [isSubmittingJudge, setIsSubmittingJudge] = useState<boolean>(false);

  // 專家活動得知管道調查
  const [judgeReferralSource, setJudgeReferralSource] = useState<string>('');
  const [judgeReferralSourceOther, setJudgeReferralSourceOther] = useState<string>('');

  // 投稿創新idea 教學視窗狀態
  const [isProposalTutorialModalOpen, setIsProposalTutorialModalOpen] = useState<boolean>(false);
  const [quickPainPointSerial, setQuickPainPointSerial] = useState<string>('');
  const [selectedPainPointTopic, setSelectedPainPointTopic] = useState<{ id: string; title: string; serial?: string } | null>(null);

  // 創星季 30 秒玩法導覽教學 (三大角色引導旅程)
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [guideRole, setGuideRole] = useState<GuideRole>('audience');

  const showToast = (message: string) => {
    addNotification({
      title: '創星季',
      message,
      type: 'system',
    });
  };

  // 關閉點擊外部選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 載入當前使用者收藏名單
  useEffect(() => {
    if (isLoggedIn) {
      fetchUserLikedProposalIds().then((ids) => {
        if (Array.isArray(ids)) setLikedProposalIds(ids);
      }).catch(() => {});
    } else {
      setLikedProposalIds([]);
    }
  }, [isLoggedIn, currentUser?.id]);

  // 篩選狀態 (預設在提案總覽全部)
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 推廣大使推薦碼專區狀態
  const [isAmbassadorModalOpen, setIsAmbassadorModalOpen] = useState<boolean>(false);
  const [ambassadorData, setAmbassadorData] = useState<{
    referralCode?: string;
    totalReferred?: number;
    approvedCount?: number;
    commissionPending?: number;
    referrals?: Array<{
      id: string;
      proposalId: string;
      proposalTitle: string;
      authorName: string;
      status: string;
      rewardAmount: number;
      createdAt: string;
    }>;
  } | null>(null);
  const [inputReferralCode, setInputReferralCode] = useState<string>('');
  const [isBindingReferral, setIsBindingReferral] = useState<boolean>(false);
  const [isLoadingAmbassador, setIsLoadingAmbassador] = useState<boolean>(false);
  const [copiedAmbassadorCode, setCopiedAmbassadorCode] = useState<boolean>(false);
  const [copiedAmbassadorLink, setCopiedAmbassadorLink] = useState<boolean>(false);

  // 開啟推廣大使推薦碼頁面
  const handleOpenAmbassadorModal = async () => {
    setIsProfileMenuOpen(false);
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    setIsAmbassadorModalOpen(true);
    setIsLoadingAmbassador(true);
    try {
      const data = await fetchMyAmbassadorData();
      if (data.success) {
        setAmbassadorData(data);
      }
    } catch {}
    finally {
      setIsLoadingAmbassador(false);
    }
  };

  // 綁定輸入之推薦碼
  const handleBindReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputReferralCode.trim()) {
      showToast('請輸入推薦碼');
      return;
    }
    setIsBindingReferral(true);
    try {
      const res = await bindAmbassadorReferralCode(inputReferralCode.trim());
      if (res.success) {
        showToast(res.message);
        setInputReferralCode('');
        const data = await fetchMyAmbassadorData();
        if (data.success) setAmbassadorData(data);
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '綁定失敗');
    } finally {
      setIsBindingReferral(false);
    }
  };

  // 彈窗狀態
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [selectedProposalForSupport, setSelectedProposalForSupport] = useState<StarSeasonProposal | null>(null);
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<StarSeasonProposal | null>(null);
  const [supportAmount, setSupportAmount] = useState<number>(1000);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0); // 預設展開第一條

  // 提案表單狀態
  const [formStage, setFormStage] = useState<StarSeasonStage>('pain_point');
  const [formTrack, setFormTrack] = useState<StarSeasonTrack>('ai_applications');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formSummary, setFormSummary] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSourcePainPointId, setFormSourcePainPointId] = useState<string>('');
  const [formAmbassadorCode, setFormAmbassadorCode] = useState<string>('');
  const [formAttachment, setFormAttachment] = useState<{ url: string; name: string; size: number; mime: string } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);

  // 敏感資料隔離欄位
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [schoolOrOrg, setSchoolOrOrg] = useState<string>('');
  const [bankCode, setBankCode] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [idNumber, setIdNumber] = useState<string>('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState<boolean>(false);

  // 管理員後台彈窗
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const [adminReviewingProposal, setAdminReviewingProposal] = useState<StarSeasonProposal | null>(null);
  const [adminReviewNote, setAdminReviewNote] = useState<string>('');
  const [adminFinalRankInput, setAdminFinalRankInput] = useState<number>(1);
  const [adminAdoptedApproved, setAdminAdoptedApproved] = useState<boolean>(true);

  // 載入提案資料與依登入身分精確結算創星幣
  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchProposals();
      const effectiveList = list.filter((p) => !isFakeProposal(p));
      setProposals(applyRealClicksToProposals(effectiveList));

      // 嚴格依登入狀態與身份計算創星幣（未登入/登出狀態清空為 null 絕不顯示錢包；已登入依身分配發不同額度）
      const userIsLoggedIn = Boolean(auth.currentUser || (currentUser && currentUser.id && currentUser.id !== 'user-guest'));
      if (!userIsLoggedIn) {
        setAccount(null);
      } else {
        // 先以目前登入身分即時解析創星幣（管理員 1,000萬 / 專家 300萬 / 一般會員與參賽者 10萬）
        const resolvedAccount = resolveClientCompetitionAccount(currentUser, null);
        setAccount(resolvedAccount);

        if (auth.currentUser) {
          try {
            const accRes = await fetchMyCompetitionAccount();
            if (accRes.account) {
              setAccount(resolveClientCompetitionAccount(currentUser, accRes.account));
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('loadData failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id, currentUser?.role, currentUser?.verifiedExpert, currentUser?.expertCertStatus, currentUser?.accountType]);

  // 監聽 URL 參數或路徑，支援以 ?proposalId=xxx 或 /proposal/:id 開啟單一提案
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parseAndOpenProposal = async () => {
      let targetId: string | null = null;
      const params = new URLSearchParams(window.location.search);
      targetId = params.get('proposalId') || params.get('p') || params.get('id');

      if (!targetId) {
        const path = window.location.pathname;
        if (path.includes('/proposal/')) {
          targetId = path.split('/proposal/')[1].split('/')[0].split('?')[0];
        }
      }

      if (!targetId && window.location.hash) {
        const hashStr = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hashStr.startsWith('?') ? hashStr.slice(1) : hashStr);
        targetId = hashParams.get('proposalId') || hashParams.get('p');
        if (!targetId && hashStr.includes('/proposal/')) {
          targetId = hashStr.split('/proposal/')[1].split('/')[0].split('?')[0];
        }
      }

      if (targetId) {
        if (currentSubView === 'proposal' && selectedProposalIdForExplore === targetId) {
          return;
        }
        navigateToSubView('proposal', targetId);
      }
    };

    parseAndOpenProposal();
    window.addEventListener('popstate', parseAndOpenProposal);
    return () => window.removeEventListener('popstate', parseAndOpenProposal);
  }, [currentSubView, selectedProposalIdForExplore]);

  const prevSelectedProposalIdRef = useRef<string | null>(null);

  // 同步 URL 與提案動態 SEO
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (selectedProposalForDetail) {
      prevSelectedProposalIdRef.current = selectedProposalForDetail.id;
      updateSEOForProposal(selectedProposalForDetail);
      const url = new URL(window.location.href);
      if (url.searchParams.get('proposalId') !== selectedProposalForDetail.id) {
        url.searchParams.set('proposalId', selectedProposalForDetail.id);
        window.history.replaceState({ proposalId: selectedProposalForDetail.id }, '', url.toString());
      }
    } else {
      if (currentSubView === 'rules') {
        updateSEOForSubpage('challenge_rules');
      } else if (currentSubView === 'submit' || currentSubView === 'participant') {
        updateSEOForSubpage('challenge_join');
      } else if (currentSubView === 'judge') {
        updateSEOForSubpage('challenge_expert');
      } else if (currentSubView === 'proposal') {
        updateSEOForSubpage('challenge_proposals');
      } else {
        updateSEOForSubpage('challenge');
      }
      if (prevSelectedProposalIdRef.current) {
        prevSelectedProposalIdRef.current = null;
        const url = new URL(window.location.href);
        if (url.searchParams.has('proposalId')) {
          url.searchParams.delete('proposalId');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [selectedProposalForDetail?.id, currentSubView]);

  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null);

  const handleCopyProposalLink = async (proposalId: string) => {
    const canonicalUrl = getProposalShareUrl(proposalId);
    const targetProp = proposals.find((p) => p.id === proposalId) || selectedProposalForDetail;
    const shareTitle = targetProp?.title || '創星季創新提案';

    // 依需求：原生分享與複製必須是單獨網址，不附加文案
    const res = await shareOrCopyUrl({
      title: shareTitle,
      url: canonicalUrl,
    });

    if (res === 'copied') {
      setCopiedProposalId(proposalId);
      showToast('🔗 提案專屬公開網址已複製！');
      setTimeout(() => setCopiedProposalId(null), 2500);
    }
  };

  // 第一階段痛點清單 (供第二階段解法引用，創星季隱藏假資料)
  const painPointProposals = useMemo(() => {
    return proposals.filter((p) => p.stage === 'pain_point' && p.status === 'approved' && !isFakeProposal(p));
  }, [proposals]);

  // 彙整首頁痛點清單（依時程於 10/24 00:00 第一階段痛點徵件開跑後公開，未到時間前先隱藏）
  const homepagePainPoints = useMemo(() => {
    if (stageInfo.activeStage < 1) {
      return [];
    }

    const list: Array<{
      id: string;
      title: string;
      category: string;
      subcategory: string;
      tags: string[];
      authorName: string;
      authorAvatar: string;
      views: number;
      solutionsCount: number;
      description?: string;
      rawProposal?: StarSeasonProposal;
      rawQuestion?: any;
    }> = [];

    // 1. 創星季徵件之痛點提案（排除所有假提案與示範提案）
    (proposals || [])
      .filter((p) => p.stage === 'pain_point' && !isFakeProposal(p))
      .forEach((p) => {
        const trackMeta = STAR_SEASON_TRACKS[p.track] || STAR_SEASON_TRACKS.ai_applications;
        list.push({
          id: p.id,
          title: p.title,
          category: trackMeta.name || '日常疑難',
          subcategory: p.cohort || '痛點徵件',
          tags: ['痛點', trackMeta.name, '徵點子'],
          authorName: p.authorName || '創星季參賽者',
          authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          views: p.viewsCount || 0,
          solutionsCount: p.commentsCount || 0,
          description: p.summary,
          rawProposal: p,
        });
      });

    // 2. 舊站創點子痛點專區問題（在創星季那邊先隱藏模擬假痛點）
    (questions || [])
      .filter((q) => (q.postType === 'pain_point' || q.tags?.includes('痛點') || q.specialZone === 'pain_points') && !isSimulatedQuestion(q) && !isSimulatedUser(q.authorId))
      .forEach((q) => {
        if (!list.some((item) => item.id === q.id || item.title === q.title)) {
          list.push({
            id: q.id,
            title: q.title,
            category: q.category || '日常疑難',
            subcategory: q.subcategory || '其他',
            tags: q.tags || ['生活痛點', '日常難題'],
            authorName: q.authorName || 'IdeaX 創點子用戶',
            authorAvatar: q.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            views: q.views || 0,
            solutionsCount: q.answersCount || 0,
            description: q.description,
            rawQuestion: q,
          });
        }
      });

    return list;
  }, [proposals, questions, stageInfo.activeStage, isRaceMode]);

  // 痛點問題每批 3 個（三張一批輪播，未登入訪客可瀏覽前 20 則）
  const homepagePainPointBatches = useMemo(() => {
    const list = homepagePainPoints;
    const effectiveList = isGuest ? list.slice(0, GUEST_VISIBLE_COUNT) : list;
    if (isGuest) registerGuestListExposure(list);
    const batches: typeof homepagePainPoints[] = [];
    for (let i = 0; i < effectiveList.length; i += 3) {
      batches.push(effectiveList.slice(i, i + 3));
    }
    return batches;
  }, [homepagePainPoints, isGuest]);

  // 建立痛點無限向左循環輪播批次
  const extendedPainPointBatches = useMemo(() => {
    if (homepagePainPointBatches.length <= 1) return homepagePainPointBatches;
    return [...homepagePainPointBatches, homepagePainPointBatches[0]];
  }, [homepagePainPointBatches, isGuest]);

  // 痛點向左前進下一批
  const handlePainPointCarouselNext = useCallback(() => {
    // 訪客也可以左右切換，瀏覽前 20 則（第 21 則起由下方登入遮罩提示）
    if (homepagePainPointBatches.length <= 1) return;
    setHomepagePainPointBatchIndex((prev) => {
      if (prev >= homepagePainPointBatches.length) {
        return 1;
      }
      return prev + 1;
    });
  }, [homepagePainPointBatches.length, isGuest, onOpenAuth]);

  // 痛點向右上一批
  const handlePainPointCarouselPrev = useCallback(() => {
    // 訪客也可以左右切換，瀏覽前 20 則（第 21 則起由下方登入遮罩提示）
    if (homepagePainPointBatches.length <= 1) return;
    setHomepagePainPointBatchIndex((prev) => {
      if (prev <= 0) {
        return homepagePainPointBatches.length - 1;
      }
      return prev - 1;
    });
  }, [homepagePainPointBatches.length, isGuest, onOpenAuth]);

  // 痛點輪播過渡結束處理
  const handlePainPointCarouselTransitionEnd = useCallback(() => {
    if (homepagePainPointBatchIndex >= homepagePainPointBatches.length) {
      setIsPainPointCarouselTransitionDisabled(true);
      setHomepagePainPointBatchIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsPainPointCarouselTransitionDisabled(false);
        });
      });
    }
  }, [homepagePainPointBatchIndex, homepagePainPointBatches.length]);

  // 痛點自動定時持續向左輪播 (每 4.5 秒向左滑動至下一批)
  useEffect(() => {
    if (homepagePainPointBatches.length <= 1 || isPainPointCarouselPaused || homepageSectionTab !== 'pain_point') return;
    const timer = setInterval(() => {
      handlePainPointCarouselNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [homepagePainPointBatches.length, isPainPointCarouselPaused, homepageSectionTab, handlePainPointCarouselNext, isGuest]);

  // 解方卡片角標 (決選 / 冠軍 / 亞軍 / 季軍 / 4~10名)
  const renderProposalCornerBadge = (proposal: any, idx: number) => {
    const rank = proposal.finalRank;
    const isResultsPublished = stageInfo.isResultsStage || (rank !== undefined && rank > 0);

    if (isResultsPublished && rank && rank > 0) {
      if (rank === 1) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 border border-amber-300 shadow-sm shrink-0 flex items-center gap-0.5">
            <span>🏆</span>
            <span>冠軍</span>
          </span>
        );
      }
      if (rank === 2) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-slate-200 to-gray-300 text-slate-800 border border-slate-300 shadow-sm shrink-0 flex items-center gap-0.5">
            <span>🥈</span>
            <span>亞軍</span>
          </span>
        );
      }
      if (rank === 3) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-white border border-amber-600 shadow-sm shrink-0 flex items-center gap-0.5">
            <span>🥉</span>
            <span>季軍</span>
          </span>
        );
      }
      if (rank >= 4 && rank <= 10) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-700/95 text-stone-100 border border-stone-600 shadow-sm shrink-0">
            4~10名
          </span>
        );
      }
    }

    const isFinalist = proposal.isFinalist || proposal.isFinalistSelected || idx < 20;
    if (stageInfo.isExpertReviewStage || isFinalist) {
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-sm shrink-0">
          決選
        </span>
      );
    }

    return null;
  };

  // 痛點獲獎標籤 (冠軍痛點 / 亞軍痛點 / 季軍痛點 / 4~10名痛點 / 決選痛點)
  const getPainPointAwardBadge = (painPointTitle: string, painPointId: string) => {
    const adoptingWinner = proposals.find((p) => {
      if (p.stage === 'pain_point') return false;
      const matchId = p.sourcePainPointId && (p.sourcePainPointId === painPointId || p.sourcePainPointId === painPointTitle);
      const matchTitle = p.sourcePainPointTitle && (p.sourcePainPointTitle.includes(painPointTitle) || painPointTitle.includes(p.sourcePainPointTitle));
      return (matchId || matchTitle) && (p.finalRank || p.isFinalist);
    });

    if (!adoptingWinner) return null;

    const rank = adoptingWinner.finalRank;
    const isResultsPublished = stageInfo.isResultsStage || (rank !== undefined && rank > 0);

    if (isResultsPublished && rank && rank > 0) {
      if (rank === 1) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 border border-amber-300 shadow-2xs shrink-0 flex items-center gap-1">
            <span>🏆</span>
            <span>冠軍痛點</span>
          </span>
        );
      }
      if (rank === 2) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-slate-200 to-gray-300 text-slate-800 border border-slate-300 shadow-2xs shrink-0 flex items-center gap-1">
            <span>🥈</span>
            <span>亞軍痛點</span>
          </span>
        );
      }
      if (rank === 3) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-white border border-amber-600 shadow-2xs shrink-0 flex items-center gap-1">
            <span>🥉</span>
            <span>季軍痛點</span>
          </span>
        );
      }
      if (rank >= 4 && rank <= 10) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-700/95 text-stone-100 border border-stone-600 shadow-2xs shrink-0">
            4~10名痛點
          </span>
        );
      }
    }

    if (stageInfo.isExpertReviewStage || adoptingWinner.isFinalist) {
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs shrink-0">
          決選痛點
        </span>
      );
    }

    return null;
  };

  // 全站統計指標（參賽件數、全網虛擬支持金池、社群支持熱度人次）
  const competitionStats = useMemo(() => {
    const totalCount = proposals.length;
    const totalPoints = proposals.reduce((acc, p) => acc + (p.supportPoints || 0), 0);
    const totalSupporters = proposals.reduce((acc, p) => acc + (p.supporterCount || 0), 0);
    return {
      totalCount,
      totalPoints,
      totalSupporters,
    };
  }, [proposals]);

  // 過濾後的提案列表
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (isFakeProposal(p)) return false;
      if (selectedTrack !== 'all' && p.track !== selectedTrack) return false;
      if (selectedStage !== 'all' && p.stage !== selectedStage) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(kw);
        const matchSummary = p.summary.toLowerCase().includes(kw);
        const matchAuthor = p.authorName.toLowerCase().includes(kw);
        if (!matchTitle && !matchSummary && !matchAuthor) return false;
      }
      return true;
    });
  }, [proposals, selectedTrack, selectedStage, searchKeyword, isRaceMode]);

  // 依募資額、按讚數或討論數排序
  const sortedProposals = useMemo(() => {
    const list = [...filteredProposals];
    if (sortBy === 'funding') {
      return list.sort((a, b) => (b.supportPoints || 0) - (a.supportPoints || 0));
    } else if (sortBy === 'likes') {
      return list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else if (sortBy === 'comments') {
      return list.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    }
    return list;
  }, [filteredProposals, sortBy]);

  // 愛心按讚 / 取消按讚（同步寫入 Firestore 資料庫）
  const handleToggleLike = async (proposalId: string) => {
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    const targetProp = proposals.find((p) => p.id === proposalId);
    const currentLikes = targetProp?.likeCount ?? getQuestionSecondCount(proposalId) ?? 0;
    try {
      const res = await toggleLikeProposal(proposalId, currentLikes);
      if (res.success) {
        setLikedProposalIds(res.likedProposalIds);
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId ? { ...p, likeCount: res.likeCount } : p
          )
        );
        if (selectedProposalForDetail?.id === proposalId) {
          setSelectedProposalForDetail((prev) =>
            prev ? { ...prev, likeCount: res.likeCount } : null
          );
        }
        setQuestionLikeState(proposalId, res.liked, res.likeCount);
        showToast(res.liked ? '❤️ 已按 Like 並加入「我的 Like」清單！' : '已取消 Like');
      }
    } catch {
      const fallback = toggleSecondQuestion(proposalId);
      setLikedProposalIds((prev) =>
        fallback.isSeconded ? Array.from(new Set([...prev, proposalId])) : prev.filter((id) => id !== proposalId)
      );
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId ? { ...p, likeCount: fallback.count } : p
        )
      );
      if (selectedProposalForDetail?.id === proposalId) {
        setSelectedProposalForDetail((prev) =>
          prev ? { ...prev, likeCount: fallback.count } : null
        );
      }
      showToast(fallback.isSeconded ? '❤️ 已按 Like 並加入「我的 Like」清單！' : '已取消 Like');
    }
  };

  // 開啟提案詳情並載入討論留言（點看來看才算一次瀏覽次數）
  const handleOpenProposalDetail = async (proposal: StarSeasonProposal) => {
    const nextViews = recordProposalViewClick(proposal.id, proposal.viewsCount || (proposal as any).views || 0);
    setProposals((prev) =>
      prev.map((p) => (p.id === proposal.id ? { ...p, viewsCount: nextViews } : p))
    );
    setSelectedProposalForDetail({ ...proposal, viewsCount: nextViews });

    // 同步寫入雲端 Firestore 資料庫，解決重整歸零問題
    recordProposalView(proposal.id).then((cloudCount) => {
      if (typeof cloudCount === 'number' && cloudCount > 0) {
        setProposals((prev) =>
          prev.map((p) => (p.id === proposal.id ? { ...p, viewsCount: Math.max(nextViews, cloudCount) } : p))
        );
        setSelectedProposalForDetail((prev) =>
          prev && prev.id === proposal.id ? { ...prev, viewsCount: Math.max(nextViews, cloudCount) } : prev
        );
      }
    });

    setIsLoadingComments(true);
    try {
      const comms = await fetchProposalComments(proposal.id);
      setActiveComments(comms);
    } catch {
      setActiveComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // 發表討論留言
  const handleAddComment = async () => {
    if (!selectedProposalForDetail) return;
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    if (!newCommentText.trim()) {
      showToast('請輸入留言討論內容');
      return;
    }
    setIsSubmittingComment(true);
    try {
      const res = await postProposalComment(selectedProposalForDetail.id, newCommentText.trim());
      if (res.success && res.comment) {
        setActiveComments((prev) => [...prev, res.comment!]);
        setNewCommentText('');
        setProposals((prev) =>
          prev.map((p) =>
            p.id === selectedProposalForDetail.id
              ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
              : p
          )
        );
        setSelectedProposalForDetail((prev) =>
          prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null
        );
        showToast('留言發表成功！');
      } else {
        showToast(res.error || '發表失敗');
      }
    } catch (err: any) {
      showToast(err.message || '發表失敗');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 打開報名頁 (若未登入先連到登入頁)
  const handleOpenRegistration = (tab: 'participant' | 'judge') => {
    setIsProfileMenuOpen(false);
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    setRegModalTab(tab);
    setIsRegistrationModalOpen(true);
  };

  // 參賽者報名提交（大專校院募資模擬學習平台體驗規格）
  const handleSubmitParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !leaderName.trim() || !leaderPhone.trim() || !projectTitle.trim() || !participantSummary.trim()) {
      showToast('請完整填寫團隊名稱、負責人、電話、提案主題與構想摘要');
      return;
    }
    if (!participantReferralSource) {
      showToast('請回答「您從哪裡得知這場比賽？」');
      return;
    }
    if (participantReferralSource === '其他' && !participantReferralSourceOther.trim()) {
      showToast('請填寫其他得知管道說明');
      return;
    }
    if (!participantPledgeAgreed) {
      showToast('請先勾選同意 《IdeaX一般條款》 與 《創星季參賽者條款》');
      return;
    }

    setIsSubmittingParticipant(true);
    try {
      const sourcePainPoint = painPointProposals.find((p) => p.id === participantSourcePainPointId);
      const res = await registerParticipant({
        teamName,
        leaderName,
        leaderPhone,
        leaderEmail: leaderEmail || currentUser.email || '',
        schoolName: schoolName || '學校/機構',
        department: department || '創新學程',
        showOrganization: showOrganizationOnCard,
        advisorName,
        track: participantTrack,
        projectTitle,
        summary: participantSummary,
        description: participantDescription || participantSummary,
        sourcePainPointId: participantSourcePainPointId || undefined,
        sourcePainPointTitle: sourcePainPoint?.title,
        bpDocumentUrl: bpFile?.url,
        bpDocumentName: bpFile?.name,
        bpDocumentSize: bpFile?.size,
        prototypeImageUrl: prototypeImgFile?.url,
        prototypeImageName: prototypeImgFile?.name,
        videoUrl,
        targetFundingAmount: Number(targetFundingAmount) || 300000,
        rewardPlanDescription: rewardPlanDescription || '搶先體驗資格、限量特製紀念徽章、技術感謝白皮書',
        expectedItems: participantExpectedItems,
        referralSource: participantReferralSource === '其他' && participantReferralSourceOther.trim() ? `其他 (${participantReferralSourceOther.trim()})` : participantReferralSource,
        referralSourceOther: participantReferralSourceOther.trim(),
        pledgeAgreed: true,
      });

      if (res.success) {
        showToast(res.message);
        // 舊站用戶新增「創星季」徽章
        const currentBadges = currentUser.competitionBadges || [];
        const nextBadges = Array.from(new Set([...currentBadges, '創星季' as const]));
        const updatedUser = {
          ...currentUser,
          competitionBadges: nextBadges,
        };
        setCurrentUser(updatedUser);
        setAvailableUsers((prev) => prev.map((u) => u.id === currentUser.id ? updatedUser : u));

        // 同步寫入舊站痛點專區之下 answers
        const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${res.proposalId || 'new'}`;
        if (participantSourcePainPointId) {
          const newAns = {
            id: `ans-${res.proposalId || Date.now()}`,
            questionId: participantSourcePainPointId,
            solverId: currentUser.id,
            solverName: currentUser.name || leaderName,
            solverAvatar: currentUser.avatar || '',
            title: projectTitle.trim(),
            content: `💡【創星季提案解方】${projectTitle.trim()}\n\n${participantSummary.trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
            exclusiveChallengeUrl,
            isStarSeasonSolution: true,
            starSeasonProposalId: res.proposalId,
            sourcePainPointProposalId: participantSourcePainPointId,
            price: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setAnswers((prev: any) => [newAns, ...prev]);
          setQuestions((prev: any) =>
            prev.map((q: any) =>
              q.id === participantSourcePainPointId
                ? { ...q, answersCount: (q.answersCount || 0) + 1 }
                : q
            )
          );
        }

        setIsRegistrationModalOpen(false);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '報名失敗');
    } finally {
      setIsSubmittingParticipant(false);
    }
  };

  // 評審團申請提交（同步錄入舊站認證專家身分與名單）
  const handleSubmitJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judgeName.trim() || !judgeOrg.trim() || !judgeJobTitle.trim() || !judgeCredentialsNote.trim()) {
      showToast('請完整填寫姓名、任職單位、職稱與證照或專業證明說明');
      return;
    }
    if (!judgeReferralSource) {
      showToast('請回答「您從哪裡得知這場比賽？」');
      return;
    }
    if (judgeReferralSource === '其他' && !judgeReferralSourceOther.trim()) {
      showToast('請說明其他得知管道');
      return;
    }
    if (!judgePledgeAgreed) {
      showToast('請先勾選同意 《IdeaX一般條款》 與 《創星季專家評審條款》');
      return;
    }

    setIsSubmittingJudge(true);
    try {
      const finalJudgeReferral = judgeReferralSource === '其他' && judgeReferralSourceOther.trim() ? `其他 (${judgeReferralSourceOther.trim()})` : judgeReferralSource;
      const res = await applyJudge({
        name: judgeName,
        phone: judgePhone,
        email: judgeEmail || currentUser.email || '',
        organization: judgeOrg,
        jobTitle: judgeJobTitle,
        domain: judgeDomain,
        experienceYears: Number(judgeExperienceYears) || 5,
        credentialsNote: judgeCredentialsNote,
        credentialProofUrl: judgeProofFile?.url,
        credentialProofName: judgeProofFile?.name,
        bio: judgeBio || `${judgeOrg} ${judgeJobTitle}，創星季專業評審團委員。`,
        referralSource: finalJudgeReferral,
        referralSourceOther: judgeReferralSourceOther.trim(),
        reviewPledgeAgreed: true,
      });

      if (res.success) {
        showToast(res.message);

        try {
          recordNewExpertApplication({
            userId: currentUser.id,
            expertName: judgeName.trim(),
            expertPhone: judgePhone.trim(),
            expertEmail: judgeEmail.trim() || currentUser.email || '',
            organization: judgeOrg.trim(),
            jobTitle: judgeJobTitle.trim(),
            expertiseTracks: ['ict'],
            yearsOfExperience: Number(judgeExperienceYears) || 5,
            bio: judgeBio.trim() || `${judgeOrg.trim()} ${judgeJobTitle.trim()}，創星季專業評審團委員。`,
            proofDocumentUrl: judgeProofFile?.url,
            referralSource: finalJudgeReferral,
            referralSourceOther: judgeReferralSourceOther.trim(),
          });
        } catch (e) {
          console.warn('Sync expert application error:', e);
        }
        // 申請專家的用戶狀態設為 pending（審核中），不可直接通過，需等待管理員審核
        const updatedUser = {
          ...currentUser,
          expertApplicationStatus: 'pending' as const,
          verifiedExpert: false,
          title: `${judgeOrg} ${judgeJobTitle}`,
          domain: judgeDomain as any,
          domains: [judgeDomain as any],
        };
        setCurrentUser(updatedUser);
        setAvailableUsers((prev) => (prev.map((u) => (u.id === currentUser.id ? updatedUser : u))));

        setIsRegistrationModalOpen(false);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '申請失敗');
    } finally {
      setIsSubmittingJudge(false);
    }
  };

  // 複製獨立網址
  const handleCopyUrl = () => {
    const fullUrl = 'https://ideax.tw/challenge';
    navigator.clipboard?.writeText(fullUrl).then(() => {
      setCopiedUrl(true);
      showToast('已複製獨立網址：https://ideax.tw/challenge');
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  // 領取分享獎勵 100 點
  const handleClaimShareBonus = async () => {
    if (!auth.currentUser) {
      onOpenAuth();
      return;
    }
    const res = await claimShareBonus();
    if (res.success) {
      showToast(res.message);
      if (res.account) setAccount(res.account);
    } else {
      showToast(res.message);
    }
  };

  // 支持投點提交 (按照時程開放與封鎖)
  const handleConfirmSupport = async () => {
    if (!selectedProposalForSupport) return;
    if (stageInfo.isPainPointStage) {
      showToast('ℹ️ 創星幣模擬募資將於 11/16 ~ 12/04 正式開跑！目前為第一階段「痛點徵件」期，歡迎先提出痛點或探索題目。');
      return;
    }
    if (stageInfo.isPreProposalStage) {
      showToast('ℹ️ 11/14 ~ 11/15 為「預先提案期」，暫時關閉募資(投資)功能，僅供提案審核與預覽！模擬募資注資將於 11/16 正式開跑。');
      return;
    }
    if (stageInfo.isCrowdfundingClosed) {
      showToast('⚠️ 創星季模擬募資已於 12/04 截止注資！感謝全體會員支持，前 20 名提案已進入決選評選。');
      return;
    }
    if (!stageInfo.isInvestmentEnabled) {
      showToast('ℹ️ 模擬募資(投資)功能僅於 11/16 ~ 12/04 開放！');
      return;
    }
    setIsSubmittingSupport(true);
    try {
      const res = await supportProposal({
        proposalId: selectedProposalForSupport.id,
        points: supportAmount,
      });
      if (res.success) {
        showToast(res.message);
        setIsSupportModalOpen(false);
        setSelectedProposalForSupport(null);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '支持失敗');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // 附件上傳處理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const uploaded = await uploadProposalAttachment(file);
      setFormAttachment(uploaded);
      showToast(`附件 ${file.name} 上傳成功！`);
    } catch (err: any) {
      showToast(err.message || '上傳失敗');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // 提交提案
  const handleSubmitProposalForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }

    if (!formTitle.trim() || !formSummary.trim() || !formDescription.trim()) {
      showToast('請完整填寫標題、摘要與說明');
      return;
    }
    if (formStage === 'solution' && (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim())) {
      showToast('提案請填寫主要聯絡人姓名、電話與 Email（此敏感資料將受安全隔離保護）');
      return;
    }

    // 依競賽時程嚴格開放與封鎖對應階段
    if (formStage === 'solution' && stageInfo.isPainPointStage) {
      showToast('ℹ️ 目前為第一階段「痛點徵件」期（至 11/13 截止）。「想解方/提案」將於 11/14 ~ 12/04 正式開跑，目前優先開放提出痛點！');
      setFormStage('pain_point');
      return;
    }
    if (formStage === 'pain_point' && stageInfo.isProposalStage) {
      showToast('ℹ️ 第一階段「痛點徵件」已於 11/13 截止！現正進行第二階段「想解方」提案（開放至 12/04），歡迎針對現有痛點提出完整方案！');
      setFormStage('solution');
      return;
    }
    if (stageInfo.isProposalClosed) {
      showToast('⚠️ 創星季提案已於 12/04 16:30 截止收件！目前已進入決選評審階段。');
      return;
    }

    setIsSubmittingProposal(true);
    try {
      const sourcePainPoint = painPointProposals.find((p) => p.id === formSourcePainPointId);
      const effectiveContactName = (contactName || currentUser.name || '痛點提問人').trim();
      const effectiveContactPhone = (contactPhone || currentUser.phone || '0900000000').trim();
      const effectiveContactEmail = (contactEmail || currentUser.email || 'user@ideax.tw').trim();

      const res = await submitProposal({
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        userRole: currentUser.role,
        title: formTitle.trim(),
        stage: formStage,
        track: formTrack,
        summary: formSummary.trim(),
        description: formDescription.trim(),
        sourcePainPointProposalId: formStage === 'solution' ? formSourcePainPointId : undefined,
        sourcePainPointTitle: formStage === 'solution' ? sourcePainPoint?.title : undefined,
        attachmentUrl: formAttachment?.url,
        attachmentName: formAttachment?.name,
        attachmentSize: formAttachment?.size,
        attachmentMime: formAttachment?.mime,
        referredByAmbassadorCode: formAmbassadorCode,
        contactName: effectiveContactName,
        contactPhone: effectiveContactPhone,
        contactEmail: effectiveContactEmail,
        schoolOrOrg: formStage === 'solution' ? schoolOrOrg : undefined,
        bankCode: formStage === 'solution' ? bankCode : undefined,
        bankAccount: formStage === 'solution' ? bankAccount : undefined,
        idNumber,
      });

      if (res.success) {
        showToast(res.message);

        // 同步寫入舊站痛點專區與對應提案
        const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${res.proposalId || 'new'}`;
        if (formStage === 'pain_point') {
          const newQ = {
            id: res.proposalId || `star-pain-${Date.now()}`,
            title: `【痛點】${formTitle.trim()}`,
            description: `${formSummary.trim()}\n\n${formDescription.trim()}\n\n🏆 創星季競賽痛點專屬連結：${exclusiveChallengeUrl}`,
            category: '創新創業' as any,
            tags: ['創點子', '痛點', '創星季', STAR_SEASON_TRACKS[formTrack]?.tag || '創新痛點'],
            postType: 'pain_point' as const,
            bounty: 0,
            authorId: currentUser.id,
            authorName: currentUser.name || contactName,
            authorAvatar: currentUser.avatar,
            authorRole: currentUser.role,
            status: 'open' as const,
            answersCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            exclusiveChallengeUrl,
            isStarSeason: true,
            starSeasonProposalId: res.proposalId,
          };
          setQuestions((prev: any) => [newQ, ...prev]);
        } else if (formStage === 'solution' && formSourcePainPointId) {
          const newAns = {
            id: `ans-${res.proposalId || Date.now()}`,
            questionId: formSourcePainPointId,
            solverId: currentUser.id,
            solverName: currentUser.name || contactName,
            solverAvatar: currentUser.avatar,
            title: formTitle.trim(),
            content: `💡【創星季提案解方】${formTitle.trim()}\n\n${formSummary.trim()}\n\n${formDescription.trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
            exclusiveChallengeUrl,
            isStarSeasonSolution: true,
            starSeasonProposalId: res.proposalId,
            sourcePainPointProposalId: formSourcePainPointId,
            price: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setAnswers((prev: any) => [newAns, ...prev]);
          setQuestions((prev: any) =>
            prev.map((q: any) =>
              q.id === formSourcePainPointId
                ? { ...q, answersCount: (q.answersCount || 0) + 1 }
                : q
            )
          );
        }

        setIsSubmitModalOpen(false);
        // 清空表單
        setFormTitle('');
        setFormSummary('');
        setFormDescription('');
        setFormSourcePainPointId('');
        setFormAmbassadorCode('');
        setFormAttachment(null);
        setContactName('');
        setContactPhone('');
        setContactEmail('');
        setSchoolOrOrg('');
        setBankCode('');
        setBankAccount('');
        setIdNumber('');
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '提交失敗');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // 管理員審核提交
  const handleAdminReview = async (status: 'approved' | 'rejected') => {
    if (!adminReviewingProposal) return;
    try {
      const res = await adminReviewProposal({
        proposalId: adminReviewingProposal.id,
        status,
        reviewNote: adminReviewNote,
      });
      if (res.success) {
        showToast(res.message);
        setAdminReviewingProposal(null);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '審核失敗');
    }
  };

  // 管理員最終頒獎確認
  const handleAdminConfirmAward = async () => {
    if (!adminReviewingProposal) return;
    try {
      const res = await adminConfirmAward({
        proposalId: adminReviewingProposal.id,
        finalRank: Number(adminFinalRankInput),
        awardConfirmed: true,
        adoptedSourceApproved: adminAdoptedApproved,
      });
      if (res.success) {
        showToast(res.message);
        setAdminReviewingProposal(null);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '操作失敗');
    }
  };

  // 競賽 FAQ 說明資料 (統一所有官方數字與規則文案)
  const faqList = [
    {
      q: '什麼是「IdeaX 創星季」兩階段競賽？痛點獎勵與採用獎勵是如何運作的？',
      a: 'IdeaX 創星季分為兩階段：第一階段「徵點子」由提案者發布真實痛點，只要成功提出痛點（需過審）即送 200 點（價值 $250 的 IdeaX 創點子平台點數，可用於發布懸賞問題、享受付費功能，點數效期 60 日）。第二階段「想解方」由團隊針對痛點提出具體落地架構；若前十名得獎提案採用了第一階段的痛點，原痛點提出者另享等值好禮（點數效期 60 日）：創新提案排名前 1~3 名採用獲價值 NT$1,500 等值好禮（含 1,200 點 IdeaX 平台提問金，效期 60 日）；排名前 4~10 名採用獲價值 $500 好禮（含 400 點 IdeaX 平台提問金，效期 60 日），經官方管理員核准後發放，建立正向良性的創新激勵生態！',
    },
    {
      q: '模擬募資前 20 名與最終得獎名次（冠、亞、季軍）如何評定？獎勵內容為何？',
      a: '全體大眾與專家的虛擬募資投票排名「前 20 名」代表獲得「入圍決選」資格，並非最終得獎！最終得獎名次由評審團進行專業審查與評分，決選出：冠軍價值 $30,000（NT$20,000 現金 ＋ 8,000 點（價值 $10,000，點數效期 180 日）＋ 官方「創之星」最高榮譽徽章）、亞軍價值 $10,000（NT$6,000 現金 ＋ 3,200 點（價值 NT$4,000，點數效期 180 日）＋ 官方「創之星」最高榮譽徽章）、季軍價值 $5,000（NT$3,000 現金 ＋ 1,600 點（價值 NT$2,000，點數效期 180 日）＋ 官方「創之星」最高榮譽徽章）。獲獎團隊由系統授予「創之星」最高榮譽徽章！',
    },
    {
      q: '創星幣是多少？可以兌現或投資自己嗎？',
      a: '使用 創星幣 支持你認同的創新提案，模擬市場關注度。一般用戶與提案者初始各享有 100,000 創星幣，專家享有 3,000,000 創星幣。1 創星幣 = NT$1 僅作為模擬市場驗證投票權益，非真實現金或法定投資，不可購買、轉帳或兌現。單案支持上限：參賽者與一般用戶對單一解方提案之最高注資上限為 50,000 創星幣，專家對單一解方提案之最高注資上限為 2,000,000 創星幣。可以自我注資！',
    },
    {
      q: '各項競賽獎勵點數的有效期限是多久？',
      a: '重要規範：除了前三名（冠、亞、季軍）獲獎團隊所獲得之獎勵點數效期為 180 日以外，其餘所有的獎勵點數（包含提出痛點過審獎 200 點、痛點採用好禮、推廣大使推薦獎勵 300 點等）效期皆為 60 日。點數可用於 IdeaX 創點子平台提問與付費服務。',
    },
    {
      q: '參賽單位如何計算？每隊有投件數量或痛點數量上限嗎？',
      a: '本競賽「以每個帳號算計一隊」，且「每隊不限提案或痛點數量」！目標不限於青年或學生，亦不一定要團隊，個人獨立參賽或自由組隊皆可。在痛點徵件階段可提交多筆切身痛點，在想解方階段亦可提出多件解方提案。',
    },
    {
      q: '推廣大使獎勵是如何核發的？',
      a: '推廣大使每推薦 1 案審核通過，即享 300 點（價值 $400）（IdeaX 平台點數，用於提問、享受付費服務），多推多得無上限。',
    },
    {
      q: '分享推薦碼如何領取 100 創星幣？有次數限制嗎？',
      a: '每位登入用戶點擊「分享推薦碼領 100 創星幣」，系統將為您的競賽錢包增加 100 創星幣。為維護競賽公平，每個帳號限領一次，創星幣獨立於舊站真實 Balance，不影響舊站任何帳戶資產。',
    },
    {
      q: '創星季的活動各階段時程如何安排？',
      a: '競賽各階段日程如下：\n• 10/17 00:00 ～ 12/04 16:30：報名時段（※ 提痛點之參賽者請於 11/13 16:30 痛點徵件截止前完成報名）\n• 10/24 00:00 ～ 11/13 16:30：第一階段：痛點徵件（提出痛點過審即送 200 點，價值 $250，效期 60 日）\n• 11/14 ～ 11/15：第二階段 (一)：預先提案（【關閉募資(投資)功能】，僅可註冊報名、在線提案、主辦單位審核及預覽）\n• 11/16 ～ 12/04：第二階段 (二)：模擬募資與提案（【全面開放功能】，可報名、提案、創星幣模擬募資(投資)注資投票、主辦單位審核，募資總額前 20 名取得決選資格）\n• 12/05 ～ 12/11：第三階段：進入決選（由評審團進行專業審查與評分）\n• 12/12 ～ 12/16：第四階段：公布結果（於首頁盛大公告最終榜單，頒發榮譽與獎勵）',
    },
  ];

  // 滿版子網址獨立網頁渲染 (探索提案、競賽辦法、投稿、申請參賽者、申請專家、推廣大使推薦碼)
  if (currentSubView === 'proposal' || currentSubView === 'explore') {
    return (
      <>
        <ShatterPageTurnTransition
          isActive={shatterTransition.isActive}
          clickedWord={shatterTransition.clickedWord}
          originX={shatterTransition.originX}
          originY={shatterTransition.originY}
        />
        <ExploreProposalsFullPage
          onNavigate={navigateToSubView}
          onBackToOldSite={onBackToOldSite}
          onOpenAuth={onOpenAuth}
          onOpenPainPointInChuangDianZi={onOpenPainPointInChuangDianZi}
          initialSectionTab={exploreInitialTab}
          initialProposalId={selectedProposalIdForExplore}
          proposals={proposals}
          onRefreshProposals={loadData}
          account={account}
          onRefreshAccount={loadData}
        />
      </>
    );
  }

  if (currentSubView === 'rules') {
    return (
      <RulesFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
        onGoToPainPoints={onGoToPainPoints || onBackToOldSite}
        onOpenAmbassadorModal={() => navigateToSubView('ambassador')}
      />
    );
  }

  if (currentSubView === 'submit') {
    return (
      <>
        <SubmitProposalFullPage
          onNavigate={navigateToSubView}
          onBackToOldSite={onBackToOldSite}
          onOpenAuth={onOpenAuth}
          onGoToPainPoints={onGoToPainPoints || onBackToOldSite}
          painPointProposals={painPointProposals}
          onSuccess={loadData}
        />
        <StarSeasonGuideModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
          initialRole={guideRole}
          onNavigateToExplore={() => navigateToSubView('home')}
          onNavigateToPainPoints={scrollToPainPointsBoard}
          onNavigateToSubmit={() => navigateToSubView('submit')}
          onOpenSubmitPainPoint={handleOpenPainPointSubmission}
          onBackToOldSite={onBackToOldSite}
        />
      </>
    );
  }

  if (currentSubView === 'participant') {
    return (
      <ParticipantFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
        onGoToPainPoints={onGoToPainPoints || onBackToOldSite}
        painPointProposals={painPointProposals}
        onSuccess={loadData}
      />
    );
  }

  if (currentSubView === 'judge') {
    return (
      <JudgeFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
        onGoToPainPoints={onGoToPainPoints || onBackToOldSite}
        onSuccess={loadData}
      />
    );
  }

  if (currentSubView === 'ambassador') {
    return (
      <AmbassadorFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
        onGoToPainPoints={onGoToPainPoints || onBackToOldSite}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 selection:bg-amber-300 selection:text-stone-950 font-sans">
      {/* 點擊「痛點」或「創新起點」之字體碎片炸裂掉落全螢幕動態 */}
      <ShatterPageTurnTransition
        isActive={shatterTransition.isActive}
        clickedWord={shatterTransition.clickedWord}
        originX={shatterTransition.originX}
        originY={shatterTransition.originY}
      />

      {/* 頂部全站提示列與導覽 */}
      <div className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {/* 創星季廣播橫幅：誠徵各行業專家參與注資，注資額300萬（點擊申請） */}
        <StarSeasonBroadcastBanner onApply={() => navigateToSubView('judge')} />

        {/* 導覽列核心主行 */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2">
          {/* 左側：品牌 Logo (點燈泡回舊站首頁，點創星季回競賽首頁) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 -ml-0.5 sm:-ml-2">
            {/* 1. 點左上燈泡圖片回到舊站首頁 (手機版與電腦版適度放大) */}
            <button
              type="button"
              onClick={() => {
                onBackToOldSite();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
              title="點擊回到 IdeaX 創點子平台首頁"
              aria-label="回到 IdeaX 創點子平台首頁"
            >
              <img
                src="/logo-bulb.png"
                alt="IdeaX 創點子平台 - 點擊回首頁"
                className="w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 object-contain shrink-0 drop-shadow-xs group-hover:drop-shadow-md transition-all group-hover:scale-105"
              />
            </button>

            {/* 2. 點創星季則回競賽網站首頁 */}
            <button
              type="button"
              onClick={() => {
                navigateToSubView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center group -ml-0.5"
              title="點擊返回創星季競賽首頁"
              aria-label="回創星季競賽首頁"
            >
              <img
                src="/logo-chuangxingji-text.png"
                alt="創星季 - 點擊回競賽首頁"
                className="h-8.5 sm:h-9.5 md:h-10.5 w-auto object-contain shrink-0 group-hover:opacity-90 group-hover:scale-102 transition-all"
              />
            </button>
          </div>

          {/* 中間：核心導覽列 (風格統一、簡潔俐落) */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-stone-100/80 p-1 rounded-2xl border border-stone-200/80">
            {/* 1. 探索Idea (有色鮮明膠囊) */}
            <button
              type="button"
              onClick={() => navigateToSubView('proposal')}
              className="px-3 py-1.5 rounded-xl text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-300/80 transition-all cursor-pointer font-black flex items-center gap-1.5 shadow-2xs active:scale-98"
            >
              <Compass className="w-3.5 h-3.5 text-amber-700" />
              <span>探索Idea</span>
            </button>

            {/* 2. 痛點 (有色鮮明膠囊) */}
            <button
              type="button"
              onClick={scrollToPainPointsBoard}
              className="px-3 py-1.5 rounded-xl text-orange-950 bg-orange-200/90 hover:bg-orange-300 border border-orange-300/80 transition-all cursor-pointer font-black flex items-center gap-1.5 shadow-2xs active:scale-98 group"
              title="前往 IdeaX 痛點許願池並自動滾動至痛點區域"
            >
              <Layers className="w-3.5 h-3.5 text-orange-700" />
              <span>痛點</span>
              <ArrowRight className="w-3.5 h-3.5 text-orange-800 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 3. 🔰 創星季網站導覽 (三大角色 30 秒上手) */}
            <button
              type="button"
              id="star-tour-nav-guide"
              onClick={() => {
                setGuideRole('audience');
                setIsGuideModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl text-stone-900 bg-amber-400 hover:bg-amber-300 border border-amber-500/40 transition-all cursor-pointer font-black flex items-center gap-1.5 shadow-2xs active:scale-98"
              title="查看創星季網站導覽（觀眾、提案參賽、痛點提問 3 大角色極速引導）"
            >
              <span className="text-xs">🔰</span>
              <span>創星季網站導覽</span>
            </button>

            {/* 4. 競賽辦法 (直接前往專門競賽辦法頁) */}
            <button
              type="button"
              onClick={() => {
                navigateToSubView('rules');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold flex items-center gap-1.5"
              title="前往閱讀完整官方競賽辦法規章"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>競賽辦法</span>
            </button>

            {/* 5. 報名參賽 */}
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  onOpenAuth();
                  return;
                }
                navigateToSubView('participant');
              }}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-stone-500" />
              <span>報名參賽</span>
            </button>

            {/* 6. 成為專家 */}
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  onOpenAuth();
                  return;
                }
                navigateToSubView('judge');
              }}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold flex items-center gap-1.5"
              title="點擊進入成為專家"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
              <span>成為專家</span>
            </button>

            {/* 8. 推廣大使 */}
            <button
              type="button"
              onClick={() => navigateToSubView('ambassador')}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold flex items-center gap-1.5"
            >
              <Megaphone className="w-3.5 h-3.5 text-stone-500" />
              <span>推廣大使</span>
            </button>
          </nav>

          {/* 右側：創星幣錢包 + 頭像/身分控制選單 + 痛點快捷鍵 */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {isLoggedIn && account && (
              <div className="hidden md:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-amber-300 text-xs shadow-2xs">
                <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-stone-500 text-[11px]">創星幣：</span>
                <span className="font-mono font-black text-amber-700 text-sm">
                  {account.availablePoints.toLocaleString()}
                </span>
              </div>
            )}

            {/* 右側個人頭像與帳號控制 (主登入/會員中心入口) */}
            <div className="relative shrink-0" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  if (!isLoggedIn) {
                    onOpenAuth();
                  } else {
                    setIsProfileMenuOpen(!isProfileMenuOpen);
                  }
                }}
                className="inline-flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white hover:bg-amber-50 border border-amber-300 text-xs shadow-2xs text-stone-800 transition-all cursor-pointer active:scale-98"
                title={isLoggedIn ? '點擊展開個人列表選單' : '點擊登入 / 註冊 IdeaX 帳號'}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-stone-950 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs border border-amber-300 overflow-hidden">
                  {isLoggedIn && currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : isLoggedIn && currentUser.name ? (
                    currentUser.name.charAt(0).toUpperCase()
                  ) : (
                    <UserIcon className="w-4 h-4 text-stone-800" />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className={`font-bold leading-tight max-w-[105px] truncate ${currentNameColorClass}`}>
                    {isLoggedIn ? currentDisplayName || '會員' : '登入 / 註冊'}
                  </div>
                  <div className="text-[10px] font-semibold flex items-center gap-1">
                    {isLoggedIn ? (
                      currentUser.role === 'admin' ? (
                        <span className="text-rose-700 font-black">👑 平台管理員</span>
                      ) : currentUser.verifiedExpert || currentUser.role === 'solver' ? (
                        <span className="text-purple-700 font-black">👑 專家</span>
                      ) : currentUser.competitionBadges?.includes('創星季') ? (
                        <span className="text-emerald-700 font-black">★ 創星季參賽者</span>
                      ) : (
                        <span className="text-stone-500">一般會員</span>
                      )
                    ) : (
                      <span className="text-amber-800 font-bold">點此登入</span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isProfileMenuOpen ? 'rotate-180 text-amber-600' : ''}`} />
              </button>

              {/* 個人列表下拉浮層 (Profile Dropdown Menu) */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl border border-amber-300 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5">
                  {/* 會員身分卡片 */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center shrink-0 border border-amber-300 shadow-2xs overflow-hidden">
                        {isLoggedIn && currentUser.avatar ? (
                          <img src={currentUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : isLoggedIn && currentUser.name ? (
                          currentUser.name.charAt(0).toUpperCase()
                        ) : (
                          'U'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`font-black text-sm truncate ${currentNameColorClass}`}>
                          {isLoggedIn ? currentDisplayName || '會員' : '訪客創友'}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {currentUser.role === 'admin' ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                              👑 平台管理員
                            </span>
                          ) : (
                            <>
                              {currentUser.verifiedExpert || currentUser.role === 'solver' || currentUser.expertCertStatus === 'verified' ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                                  👑 競賽專家 (已認證)
                                </span>
                              ) : null}
                              {isCurrentUserAppointedJudge ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                                  ⚖️ 複賽評審委員
                                </span>
                              ) : null}
                              {currentUser.competitionBadges?.includes('創星季') ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 shadow-2xs">
                                  ✨ 創星季參賽者
                                </span>
                              ) : null}
                              {(!currentUser.verifiedExpert && currentUser.role !== 'solver' && currentUser.expertCertStatus !== 'verified' && !currentUser.competitionBadges?.includes('創星季')) ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                  一般會員用戶
                                </span>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isLoggedIn && account && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                        <span className="text-stone-500 font-bold">競賽可用創星幣：</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-amber-700">
                            {account.availablePoints.toLocaleString()} 創星幣
                          </span>
                          {account.role === 'admin' ? (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">1,000萬</span>
                          ) : account.role === 'solver' ? (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">300萬</span>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 核心功能選單列表 (整理區分管理員專區與一般用戶功能列，對調一般用戶收藏與成為專家位置) */}
                  <div className="space-y-3 text-xs font-bold text-stone-700">
                    {/* ===== 1. 創星季管理員專屬功能列 (僅平台管理員可見) ===== */}
                    {/* ===== 1. 創星季管理員專屬功能列 (僅平台管理員可見) ===== */}
                    {(currentUser.role === 'admin' || currentUser.accountType === 'admin') && (
                      <div className="space-y-1.5 p-2 rounded-2xl bg-gradient-to-b from-rose-50/80 to-amber-50/50 border border-rose-200/80">
                        <div className="px-1.5 py-0.5 text-[11px] font-black text-rose-900 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span>👑</span>
                            <span>創星季管理員功能列</span>
                          </span>
                          <span className="text-[9px] font-black font-mono px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                            ADMIN
                          </span>
                        </div>

                        {/* 1. 帳號身份賦權 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsAdminUserManagementOpen(true);
                          }}
                          className="w-full px-2.5 py-2 rounded-xl hover:bg-purple-100 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-white border border-purple-200 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 font-black shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1">
                                <span>帳號身份賦權</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-purple-700 text-white">
                                  權限指派
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">全體會員身分賦權、封鎖註銷與管理員授權</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        {/* 2. 提案審核 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsAdminProposalReviewOpen(true);
                          }}
                          className="w-full px-2.5 py-2 rounded-xl hover:bg-emerald-100 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-white border border-emerald-200 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 font-black shadow-2xs">
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1">
                                <span>提案審核</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                                  即時審查
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">徵點子痛點與解方提案審核、刊登退回與發獎</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        {/* 3. 決審評分 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsAdminFinalEvaluationHubOpen(true);
                          }}
                          className="w-full px-2.5 py-2 rounded-xl hover:bg-amber-100 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-white border border-amber-300 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-2xs font-black">
                              <Trophy className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1">
                                <span>決審評分</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-600 text-white">
                                  評分排名
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">入選提案名單、專家評審指派與算術平均打分</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        {/* 4. 獎勵統計與派發 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsAdminRewardsHubOpen(true);
                          }}
                          className="w-full px-2.5 py-2 rounded-xl hover:bg-emerald-100 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-white border border-emerald-300 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-2xs font-black">
                              <Coins className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1">
                                <span>獎勵統計與派發</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                                  一鍵派發
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">跨身分加總總表、一鍵自動發放獎勵與Excel匯出</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        {/* 5. 官方競賽檔案 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsAdminRulesFolderOpen(true);
                          }}
                          className="w-full px-2.5 py-2 rounded-xl hover:bg-stone-200 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-white border border-stone-200 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                              <Folder className="w-3.5 h-3.5 text-amber-300" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1">
                                <span>官方競賽檔案</span>
                                <span className="text-[8px] px-1 py-0.2 rounded-full bg-stone-950 text-amber-300 font-mono font-black">
                                  機密歸檔
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">全套官方章程規章與管理員版本歸檔條款</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        {/* 6. 懶人包檔案管理 (存入/刪除) */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsAdminCheatSheetManagerOpen(true);
                          }}
                          className="w-full px-2.5 py-2 rounded-xl hover:bg-amber-100 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-white border border-amber-300 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 font-black shadow-2xs">
                              <FolderOpen className="w-3.5 h-3.5 text-stone-950" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1">
                                <span>懶人包檔案管理</span>
                                <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-amber-600 text-white font-mono font-black">
                                  存入/刪除
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">直接存入自訂檔案或刪除現有檔案，同步打包下載</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>
                      </div>
                    )}

                    {/* ===== 2. 評審專屬評分區 (非管理員之指派評審) ===== */}
                    {currentUser.role !== 'admin' && currentUser.accountType !== 'admin' && isCurrentUserAppointedJudge && (
                      <div className="space-y-1.5 p-2 rounded-2xl bg-purple-50/80 border border-purple-200">
                        <div className="px-1.5 py-0.5 text-[11px] font-black text-purple-900 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span>⚖️</span>
                            <span>評審委員專屬功能</span>
                          </span>
                          <span className="text-[9px] font-black font-mono px-1.5 py-0.2 rounded-full bg-purple-700 text-white">
                            JUDGE
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setEvaluatingJudgeUser({
                              id: currentUser?.id || 'user-expert-1',
                              name: currentUser?.name || '柯育任 院長/客座教授',
                            });
                            setIsJudgeEvaluationModalOpen(true);
                          }}
                          className="w-full px-2.5 py-2 rounded-xl hover:bg-purple-100 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-white border border-purple-300 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-200 text-purple-900 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                              <Award className="w-3.5 h-3.5 text-purple-700" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1">
                                <span>決選評分區</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-purple-700 text-white">
                                  評審專屬
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">邊看提案企劃詳情邊評分，暫存或統一送出</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>
                      </div>
                    )}

                    {/* ===== 3. 創星季競賽與個人功能列 (僅一般用戶及評審可見，管理員已移除) ===== */}
                    {currentUser.role !== 'admin' && currentUser.accountType !== 'admin' && (
                      <div className="space-y-1">
                        {/* 玩法導覽 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setGuideRole('audience');
                            setIsGuideModalOpen(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-amber-100/70 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-amber-50/70 border border-amber-200/80"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-300 text-stone-950 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 font-black shadow-2xs text-xs">
                              🔰
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1.5">
                                <span>創星季網站導覽</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 font-mono">
                                  30秒上手
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">觀眾、提案者、痛點提問 3 步教學指南</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        {/* 提案參賽 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            if (!isLoggedIn) {
                              onOpenAuth();
                              return;
                            }
                            navigateToSubView('participant');
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-amber-100/70 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                              <GraduationCap className="w-4 h-4 text-amber-700" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900">提案參賽</div>
                              <div className="text-[10px] text-stone-500 font-normal">填寫團隊資料與創星季企劃滿版報名</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        {/* 🌟 成為專家 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            if (!isLoggedIn) {
                              onOpenAuth();
                              return;
                            }
                            navigateToSubView('judge');
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-purple-50 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                              <ShieldCheck className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1">
                                <span>{currentUser.verifiedExpert || currentUser.role === 'solver' || currentUser.expertCertStatus === 'verified' ? '競賽專家權益說明' : '成為專家'}</span>
                                {(currentUser.verifiedExpert || currentUser.role === 'solver' || currentUser.expertCertStatus === 'verified') ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800">
                                    已自動享有・免填表
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">
                                {(currentUser.verifiedExpert || currentUser.role === 'solver' || currentUser.expertCertStatus === 'verified')
                                  ? '已具認證專家身分，直接享有 300 萬創星幣額度（無需再填報名表）'
                                  : '認證專家身分，享有 300 萬創星幣評選額度'}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        {/* 推廣大使推薦碼 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            navigateToSubView('ambassador');
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-amber-100/70 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                              <Megaphone className="w-4 h-4 text-amber-700" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900">推廣大使推薦碼</div>
                              <div className="text-[10px] text-stone-500 font-normal">專屬推薦碼、輸入綁定與推薦名單滿版專區</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        {/* 競賽辦法與規章 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            navigateToSubView('rules');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-blue-50 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900">競賽辦法與規章</div>
                              <div className="text-[10px] text-stone-500 font-normal">官方賽制規則、評選權重與獎金辦法</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 底部輔助按鍵 */}
                  <div className="pt-2 border-t border-stone-100 space-y-1">
                    {!isLoggedIn ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs text-center cursor-pointer transition-colors"
                      >
                        登入 / 註冊 IdeaX 帳號
                      </button>
                    ) : (
                      <>
                        {/* 切換帳號 */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            if (openAuthModal) {
                              openAuthModal('login', 'switch');
                            } else {
                              onOpenAuth();
                            }
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-700 hover:bg-stone-100 flex items-center justify-between cursor-pointer group transition-all"
                          title="切換已登入帳號或快速切換身分"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-800 group-hover:bg-amber-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="block font-black text-stone-900 group-hover:text-amber-900 transition-colors">
                                切換帳號
                              </span>
                              <span className="text-[10px] text-stone-500 font-normal">
                                快速切換或登入其他身分
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors" />
                        </button>

                        {/* 登出帳號 */}
                        <button
                          type="button"
                          onClick={async () => {
                            setIsProfileMenuOpen(false);
                            try {
                              await auth.signOut();
                            } catch {}
                            logoutAccount();
                            setAccount(null);
                            showToast('已登出目前帳號');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-700 hover:bg-rose-50 flex items-center justify-between cursor-pointer group transition-all"
                          title="登出目前登入帳號"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 group-hover:bg-rose-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                              <LogOut className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="block font-black text-stone-900 group-hover:text-rose-700 transition-colors">
                                登出帳號
                              </span>
                              <span className="text-[10px] text-stone-500 group-hover:text-rose-500 font-normal transition-colors">
                                安全登出目前身分
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-rose-600 transition-colors" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 手機版專屬：🔰 創星季網站導覽 */}
            <button
              type="button"
              onClick={() => {
                setGuideRole('audience');
                setIsGuideModalOpen(true);
              }}
              className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-stone-900 text-xs font-black transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0"
              title="創星季網站導覽"
            >
              <span className="text-[12px]">🔰</span>
              <span className="text-[11px]">網站導覽</span>
            </button>

            {/* 手機版面空間有限：移除競賽辦法按鈕，優先保留痛點（隨著賽程變動，若換至提案階段則自動變換為提案捷徑），並採用向量箭頭圖標 */}
            {stageInfo.isProposalStage ? (
              <button
                type="button"
                onClick={() => setIsProposalTutorialModalOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 text-xs font-black transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 group border border-amber-300"
                title="進入創星季提案教學指南並開始提案"
              >
                <Send className="w-3.5 h-3.5 text-stone-950" />
                <span>提案</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-950 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                type="button"
                onClick={scrollToPainPointsBoard}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-amber-300 text-stone-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 group"
                title="前往 IdeaX 痛點許願池並自動滾動至痛點區域"
              >
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>痛點</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 創星季 主視覺 Banner：主色調黃色，上方淡黃漸層到綠色漸層，白色基底，無黑色 */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-100/80 via-amber-50/40 via-emerald-50/60 to-emerald-100/70 border-b border-emerald-200/80 pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* 右上角空白區塊放上提案上傳的圖片輪播（僅在提案公開階段顯示） */}
          {stageInfo.activeStage >= 2 && homepageAllProposals.length > 0 && (
            <div className="hidden xl:block absolute right-4 lg:right-6 top-0 z-20">
              <ProposalHeroCarousel
                proposals={proposals.filter((p) => !isFakeProposal(p))}
                onSelectProposal={(p) => navigateToSubView('proposal', p.id)}
              />
            </div>
          )}

          <div className="text-center max-w-3xl mx-auto space-y-4">
            {/* 3. 大標語：參考原創比賽海報風格（微傾斜動態、三行大字體交錯錯開排版、手繪粉紅與黃綠油漆筆刷、向前運動斜體感） */}
            <div className="pt-4 pb-2 flex justify-center overflow-visible">
              <div className="inline-block text-left transform -rotate-3 sm:-rotate-4 -skew-x-8 sm:-skew-x-10 italic origin-center select-none max-w-full">
                {/* 第一行：你的 痛點， (靠左) */}
                <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-stone-950 tracking-tight leading-tight flex items-center">
                  <span
                    className="relative inline-block pb-1 cursor-pointer group/yourline"
                    onClick={() => handleDropUnderline('yourLine')}
                    title="點擊底線：旋轉後掉落！"
                  >
                    <span>你的</span>
                    {/* 黃色彎曲抖動底線 (Yellow Curved Jiggle/Wavy Underline) - 點擊底線旋轉後掉落 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDropUnderline('yourLine');
                      }}
                      title="點擊底線：旋轉後掉落！"
                      aria-label="點擊底線旋轉掉落"
                      className={`absolute -bottom-1 sm:-bottom-2.5 left-0 w-full h-3.5 sm:h-5 cursor-pointer z-20 focus:outline-none transition-transform group-hover/yourline:scale-105 active:scale-95 ${
                        underlineDropState.yourLine === 'dropping'
                          ? 'animate-underline-rotate-drop'
                          : underlineDropState.yourLine === 'restoring'
                          ? 'animate-underline-pop-in'
                          : 'animate-wavy-jiggle'
                      }`}
                      style={{ filter: 'drop-shadow(0 2px 5px rgba(234, 179, 8, 0.65))' }}
                    >
                      <svg
                        viewBox="0 0 120 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="none"
                        className="w-full h-full pointer-events-none overflow-visible select-none"
                        aria-hidden="true"
                      >
                        {/* 金黃陰影疊層 */}
                        <path
                          d="M3 11 C 15 3, 27 16, 42 8 C 57 1, 71 15, 86 8 C 98 2, 108 12, 117 7"
                          stroke="#ca8a04"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.35"
                        />
                        {/* 亮黃核心彎曲主筆刷 */}
                        <path
                          d="M3 10 C 15 2, 27 15, 42 7 C 57 0.5, 71 14, 86 7 C 98 1, 108 11, 117 6"
                          stroke="#facc15"
                          strokeWidth="5.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* 高光微反光筆觸 */}
                        <path
                          d="M5 8.5 C 16 1.5, 28 13.5, 42 6 C 56 0, 70 12.5, 85 6 C 96 1, 106 9.5, 115 5.5"
                          stroke="#fef08a"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.9"
                        />
                      </svg>
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleTriggerShatterAndJump(e, 'painPoint')}
                    title="點擊擊碎痛點：字體化為碎片掉落，直接跳轉進入痛點許願池！"
                    aria-label="點擊擊碎痛點並跳轉進入痛點許願池"
                    className={`relative inline-block ml-2 sm:ml-3 cursor-pointer group active:scale-95 transition-all text-left focus:outline-none ${
                      shatterTransition.isActive && shatterTransition.clickedWord === 'painPoint'
                        ? 'opacity-0 scale-90 pointer-events-none'
                        : 'hover:scale-102'
                    }`}
                  >
                    {/* 粉紅油漆筆刷底 */}
                    <svg
                      viewBox="0 0 170 54"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute -inset-x-4 sm:-inset-x-6 -inset-y-2 w-[calc(100%+32px)] sm:w-[calc(100%+48px)] h-[calc(100%+16px)] pointer-events-none -z-10 group-hover:scale-105 transition-transform"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M6 28C14 14 32 9 58 7C86 5 120 7 146 10C162 12 168 18 165 28C162 38 148 44 125 46C95 48 55 47 28 44C12 42 4 36 6 28Z"
                        fill="#fda4af"
                        fillOpacity="0.95"
                      />
                      <path
                        d="M15 19C35 12 68 13 100 11C132 10 156 14 162 21C154 26 132 25 106 24C72 23 38 25 19 26C14 24 13 20 15 19Z"
                        fill="#fb7185"
                        fillOpacity="0.75"
                      />
                      <path
                        d="M22 35C48 38 85 39 122 37C146 36 158 33 156 38C147 44 124 46 96 47C62 48 32 46 18 42C16 38 19 36 22 35Z"
                        fill="#f43f5e"
                        fillOpacity="0.6"
                      />
                    </svg>
                    <span className="relative z-10 text-stone-950">痛點，</span>
                  </button>
                </div>

                {/* 第二行：就是我的 (向右明顯錯開排版) */}
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-stone-950 tracking-tight leading-tight pl-16 sm:pl-28 md:pl-36 lg:pl-44 my-2 sm:my-3">
                  <span>就是</span>
                  <span
                    className="relative inline-block ml-1 pb-1 cursor-pointer group/myline"
                    onClick={() => handleDropUnderline('myLine')}
                    title="點擊底線：旋轉後掉落！"
                  >
                    <span>我的</span>
                    {/* 黃色彎曲抖動底線 (Yellow Curved Jiggle/Wavy Underline) - 點擊底線旋轉後掉落 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDropUnderline('myLine');
                      }}
                      title="點擊底線：旋轉後掉落！"
                      aria-label="點擊底線旋轉掉落"
                      className={`absolute -bottom-1 sm:-bottom-2.5 left-0 w-full h-3.5 sm:h-5 cursor-pointer z-20 focus:outline-none transition-transform group-hover/myline:scale-105 active:scale-95 ${
                        underlineDropState.myLine === 'dropping'
                          ? 'animate-underline-rotate-drop'
                          : underlineDropState.myLine === 'restoring'
                          ? 'animate-underline-pop-in'
                          : 'animate-wavy-jiggle'
                      }`}
                      style={{
                        filter: 'drop-shadow(0 2px 5px rgba(234, 179, 8, 0.65))',
                        animationDelay: underlineDropState.myLine === 'idle' ? '0.22s' : undefined,
                      }}
                    >
                      <svg
                        viewBox="0 0 120 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="none"
                        className="w-full h-full pointer-events-none overflow-visible select-none"
                        aria-hidden="true"
                      >
                        {/* 金黃陰影疊層 */}
                        <path
                          d="M3 11 C 15 3, 27 16, 42 8 C 57 1, 71 15, 86 8 C 98 2, 108 12, 117 7"
                          stroke="#ca8a04"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.35"
                        />
                        {/* 亮黃核心彎曲主筆刷 */}
                        <path
                          d="M3 10 C 15 2, 27 15, 42 7 C 57 0.5, 71 14, 86 7 C 98 1, 108 11, 117 6"
                          stroke="#facc15"
                          strokeWidth="5.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* 高光微反光筆觸 */}
                        <path
                          d="M5 8.5 C 16 1.5, 28 13.5, 42 6 C 56 0, 70 12.5, 85 6 C 96 1, 106 9.5, 115 5.5"
                          stroke="#fef08a"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.9"
                        />
                      </svg>
                    </button>
                  </span>
                </div>

                {/* 第三行：創新起點 (加大醒目大字體 + 鮮亮黃綠油漆筆刷底，回到偏左位置形成鮮明之字交錯) */}
                <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-stone-950 tracking-tight leading-none pl-1 sm:pl-3">
                  <button
                    type="button"
                    onClick={(e) => handleTriggerShatterAndJump(e, 'innovation')}
                    title="點擊啟動創新起點：字體化為碎片掉落，直接跳轉進入提案專區！"
                    aria-label="點擊啟動創新起點並跳轉進入提案專區"
                    className={`relative inline-block cursor-pointer group active:scale-95 transition-all text-left focus:outline-none ${
                      shatterTransition.isActive && shatterTransition.clickedWord === 'innovation'
                        ? 'opacity-0 scale-90 pointer-events-none'
                        : 'hover:scale-102'
                    }`}
                  >
                    {/* 黃綠大筆刷底 */}
                    <svg
                      viewBox="0 0 280 62"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute -inset-x-5 sm:-inset-x-8 -inset-y-2.5 sm:-inset-y-3 w-[calc(100%+40px)] sm:w-[calc(100%+64px)] h-[calc(100%+20px)] sm:h-[calc(100%+24px)] pointer-events-none -z-10 group-hover:scale-105 transition-transform"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M8 34C16 16 45 11 92 8C148 5 210 7 258 11C274 13 278 22 272 33C264 45 245 50 210 52C152 55 86 54 44 49C20 46 6 43 8 34Z"
                        fill="#bef264"
                        fillOpacity="0.95"
                      />
                      <path
                        d="M18 23C40 14 92 15 152 13C208 11 254 16 270 25C258 33 222 30 172 29C116 28 58 30 30 33C21 30 17 26 18 23Z"
                        fill="#84cc16"
                        fillOpacity="0.45"
                      />
                      <path
                        d="M26 42C70 46 130 48 190 46C234 44 262 40 265 46C250 54 210 56 162 57C106 58 54 55 24 50C20 46 22 43 26 42Z"
                        fill="#a3e635"
                        fillOpacity="0.75"
                      />
                    </svg>
                    <span className="relative z-10 text-stone-950 inline-flex items-baseline">
                      創新起點
                      <span
                        className="inline-block text-amber-500 font-black italic tracking-tighter text-[1.18em] sm:text-[1.25em] ml-1 sm:ml-1.5 select-none transition-all animate-exclamation-action group-hover:scale-130 group-hover:rotate-18 drop-shadow-md origin-bottom cursor-pointer"
                        style={{
                          fontFamily: 'Impact, "Arial Black", ui-sans-serif, system-ui, sans-serif',
                          filter: 'drop-shadow(0 2px 6px rgba(245, 158, 11, 0.65))',
                        }}
                        aria-hidden="true"
                        title="點擊啟動創新起點！"
                      >
                        !
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. 副標題說明文字 */}
            <div className="space-y-1.5 text-xs sm:text-sm md:text-base text-stone-700 max-w-xl mx-auto font-medium leading-relaxed">
              <p>加入 IdeaX 創星季，提出創新提案，獲得市場支持與專業回饋。</p>
              <p className="text-amber-700 font-bold">
                提出你的創新提案，讓市場與專業共同驗證。
              </p>
            </div>

            {/* 5. 核心 CTA 按鍵組：風格高度統一，具備一致的圓角、邊框、圖示與視覺層次 */}
            <div id="star-tour-hero-cta" className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 max-w-lg mx-auto">
              {/* 主行動：在痛點徵件尚未開始前為「即將開跑 (10/24徵件)」/「即將徵件 (10/24)」；痛點徵件階段為「提出痛點」；痛點徵件後轉為「我想提案」直到 12/04，12/04後截止 */}
              {stageInfo.isRegistrationOnlyStage ? (
                <button
                  type="button"
                  id="star-tour-submit-proposal-btn"
                  onClick={() => {
                    navigateToSubView('participant');
                  }}
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm sm:text-base shadow-sm border border-amber-400 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  title="創星季線上報名已開跑！點擊前往報名參賽（第一階段痛點徵件將於 10/24 00:00 正式開放）"
                >
                  <Sparkles className="w-4 h-4 text-stone-950" />
                  <span>即將徵件 (10/24)</span>
                </button>
              ) : stageInfo.activeStage === 0 ? (
                <button
                  type="button"
                  id="star-tour-submit-proposal-btn"
                  onClick={() => {
                    showToast('⚠️ 尚未開放：創星季將於 10/17 00:00 開放線上報名參賽，10/24 00:00 正式開放第一階段「痛點徵件」！敬請期待。');
                    const el = document.getElementById('homepage-schedule-section') || document.getElementById('homepage-awards-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm sm:text-base shadow-sm border border-amber-400 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  title="創星季籌備中：10/17 開放報名、10/24 00:00 痛點徵件正式開跑！點擊查看完整賽程時程"
                >
                  <Sparkles className="w-4 h-4 text-stone-950" />
                  <span>即將開跑 (10/24徵件)</span>
                </button>
              ) : stageInfo.isPainPointStage ? (
                <button
                  type="button"
                  id="star-tour-post-painpoint-btn"
                  onClick={handleOpenPainPointSubmission}
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm sm:text-base shadow-sm border border-rose-600 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  title="第一階段痛點徵件中：立即提出產業或生活痛點（過審即送 200 點）"
                >
                  <Flame className="w-4 h-4 text-white" />
                  <span>提出痛點</span>
                </button>
              ) : stageInfo.isProposalStage ? (
                <button
                  type="button"
                  id="star-tour-submit-proposal-btn"
                  onClick={() => setIsProposalTutorialModalOpen(true)}
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm sm:text-base shadow-sm border border-amber-400 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  title="點擊查看提案流程教學（提案開放至 12/04 截止）"
                >
                  <Send className="w-4 h-4 text-stone-950" />
                  <span>我想提案!</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-stone-200 text-stone-500 font-bold text-sm sm:text-base border border-stone-300 flex items-center justify-center gap-2 cursor-not-allowed"
                  title="創星季提案已於 12/04 截止收件，現正進行決選評審"
                >
                  <Clock className="w-4 h-4 text-stone-400" />
                  <span>提案已截止 (12/04截止)</span>
                </button>
              )}

              {/* 次行動 1：探索Idea (高雅白底微邊框卡片，圖示文字一致) */}
              <button
                type="button"
                onClick={() => navigateToSubView('proposal')}
                className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 hover:text-stone-950 font-bold text-sm sm:text-base shadow-2xs border border-stone-200/90 hover:border-amber-300 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                title="進入滿版獨立探索提案頁面"
              >
                <Compass className="w-4 h-4 text-amber-500" />
                <span>探索Idea</span>
              </button>
            </div>

            {/* 6. 次要身分入口：統一边框粗細 (1px)、背景與圖示間距，整齊乾淨 */}
            <div className="mt-6 space-y-4 max-w-5xl mx-auto">
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigateToSubView('ambassador')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 hover:text-stone-950 border border-stone-200/90 hover:border-stone-300 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98"
                  title="點擊進入推廣大使專區：每推薦一案過審即獲 300 點（價值 $400）IdeaX 平台點數（用於提問、享受付費服務）"
                >
                  <Megaphone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>推廣大使 (300點/過審)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      onOpenAuth();
                      return;
                    }
                    navigateToSubView('participant');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 hover:text-stone-950 border border-stone-200/90 hover:border-stone-300 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98"
                >
                  <GraduationCap className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>報名參賽</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      onOpenAuth();
                      return;
                    }
                    navigateToSubView('judge');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 hover:text-stone-950 border border-stone-200/90 hover:border-stone-300 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>成為專家</span>
                </button>
              </div>

              {/* 獎勵簡述 */}
              <div className="pt-2 flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-xs text-stone-600">
                <span className="flex items-center gap-1 font-medium">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>冠軍價值 <strong>$30,000</strong>（亞軍 $10,000 / 季軍 $5,000）</span>
                </span>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  <span>提出痛點過審即送 <strong>200 點</strong>（價值 $250，效期 60 日）</span>
                </span>
                <span className="text-stone-300">•</span>
                {/* 賽程表（移至紅圈：緊鄰痛點過審即送） */}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('homepage-schedule-section');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-950 hover:underline cursor-pointer transition-colors"
                  title="點擊前往查看賽程時程表"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>賽程表 →</span>
                </button>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Heart className="w-3.5 h-3.5 text-emerald-500" />
                  <span>痛點獲前十名採用享 <strong>等值好禮</strong>（最高 $1,000）</span>
                </span>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-yellow-600" />
                  <span>模擬募資前 20 名 <strong>取得入圍決選資格</strong></span>
                </span>
                <span className="text-stone-300">•</span>
                {/* 原位置改為綠色活動獎項文字連結，連到下方活動獎項 */}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('homepage-awards-section');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-950 hover:underline cursor-pointer transition-colors"
                  title="點擊前往查看活動獎項專區"
                >
                  <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                  <span>活動獎項 →</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 主體內容：探索提案獨立專區 Spotlight (獨立子網址: ideax.tw/challenge/proposal) */}
      <div id="cases-overview-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* 🎉 前台盛大公布：創星季決選獲獎榜單 Banner */}
        {isFinalResultsPublishedState && finalRankings.length > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 text-white border-2 border-amber-400 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/40 pb-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-stone-950 text-xs font-black">
                  <Trophy className="w-4 h-4" />
                  <span>2026 IdeaX 創星季 • 決選得獎榜單盛大揭曉</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                  🎉 決選最終評定名次榜單
                </h2>
                <p className="text-xs sm:text-sm text-stone-300">
                  依競賽辦法標準（創新性 40%、完整度 20%、可行性 20%、商業潛力 20%），經評審團審查並採算術平均計算核定。
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => exportFinalRankingsExcel(finalRankings)}
                  className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>匯出決選榜單 Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* 冠亞季軍頒獎台卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {finalRankings.slice(0, 3).map((winner) => (
                <div
                  key={winner.proposalId}
                  className={`p-5 rounded-2xl border transition-all ${
                    winner.rank === 1
                      ? 'bg-gradient-to-b from-amber-900/60 to-stone-900 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                      : winner.rank === 2
                      ? 'bg-gradient-to-b from-stone-800 to-stone-900 border-stone-400'
                      : 'bg-gradient-to-b from-amber-950/60 to-stone-900 border-amber-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">
                      {winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      評審平均分: {winner.averageFinalScore.toFixed(2)} 分
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-400 mt-2">
                    {winner.rank === 1 ? '第一名 (冠軍大獎)' : winner.rank === 2 ? '第二名 (亞軍殊榮)' : '第三名 (季軍殊榮)'}
                  </div>
                  <h3 className="text-base font-black text-white mt-1 line-clamp-1">
                    {winner.proposalTitle}
                  </h3>
                  <div className="text-xs text-stone-300 mt-0.5">
                    團隊：<strong>{winner.authorName}</strong> · 賽道：{winner.trackName}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs font-bold text-amber-200">
                    獲得 {winner.rank === 1 ? 'NT$20,000' : winner.rank === 2 ? 'NT$6,000' : 'NT$3,000'} 現金 ＋ {winner.pointsReward.toLocaleString()} 點平台點數
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🎛️ 競賽網首頁公開展示數據（依照管理員後台顯示設定呈現，競賽模式下暫先隱藏） */}
        {/* 數據為 0 的項目不顯示，避免活動初期整排「0」讓訪客以為沒人參加 */}
        {!isRaceMode && ((statsConfig.showLoggedInUsers && adminMetrics.loggedInUsersCount > 0) ||
          (statsConfig.showParticipants && adminMetrics.participantsCount > 0) ||
          (statsConfig.showExperts && adminMetrics.approvedExpertsCount > 0) ||
          (statsConfig.showProposals && adminMetrics.proposalsCount > 0) ||
          (statsConfig.showPainPoints && adminMetrics.painPointsCount > 0) ||
          (statsConfig.showAllocatedPoints && adminMetrics.totalAllocatedPoints >= 10000)) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {statsConfig.showLoggedInUsers && adminMetrics.loggedInUsersCount > 0 && (
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300/80 shadow-2xs transition-all hover:border-amber-400">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-600">登入會員</span>
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono">
                    {adminMetrics.loggedInUsersCount}
                  </span>
                  <span className="text-xs text-stone-500 font-bold">人</span>
                </div>
              </div>
            )}
            {statsConfig.showParticipants && adminMetrics.participantsCount > 0 && (
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300/80 shadow-2xs transition-all hover:border-amber-400">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-600">參賽團隊</span>
                  <GraduationCap className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono">
                    {adminMetrics.participantsCount}
                  </span>
                  <span className="text-xs text-stone-500 font-bold">隊</span>
                </div>
              </div>
            )}
            {statsConfig.showExperts && adminMetrics.approvedExpertsCount > 0 && (
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300/80 shadow-2xs transition-all hover:border-amber-400">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-600">認證專家</span>
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono">
                    {adminMetrics.approvedExpertsCount}
                  </span>
                  <span className="text-xs text-stone-500 font-bold">位</span>
                </div>
              </div>
            )}
            {statsConfig.showProposals && adminMetrics.proposalsCount > 0 && (
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300/80 shadow-2xs transition-all hover:border-amber-400">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-600">創新提案</span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono">
                    {adminMetrics.proposalsCount}
                  </span>
                  <span className="text-xs text-stone-500 font-bold">件</span>
                </div>
              </div>
            )}
            {statsConfig.showPainPoints && adminMetrics.painPointsCount > 0 && (
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300/80 shadow-2xs transition-all hover:border-amber-400">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-600">痛點徵集</span>
                  <Flame className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                    {adminMetrics.painPointsCount}
                  </span>
                  <span className="text-xs text-stone-500 font-bold">個</span>
                </div>
              </div>
            )}
            {statsConfig.showAllocatedPoints && adminMetrics.totalAllocatedPoints >= 10000 && (
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300/80 shadow-2xs transition-all hover:border-amber-400">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-600">配發點數</span>
                  <Coins className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black text-amber-600 font-mono truncate" title={`${adminMetrics.totalAllocatedPoints.toLocaleString()} 點`}>
                    ${(adminMetrics.totalAllocatedPoints / 10000).toFixed(0)}萬
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-gradient-to-br from-amber-50/80 via-white to-stone-50 rounded-3xl border border-amber-300/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-200/60 pb-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <div id="star-tour-overview-tabs" className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setHomepageSectionTab('solution')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      homepageSectionTab === 'solution'
                        ? 'bg-amber-400 text-stone-950 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 text-amber-700" />
                    <span>解方提案</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomepageSectionTab('pain_point')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      homepageSectionTab === 'pain_point'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>痛點問題</span>
                  </button>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {homepageSectionTab === 'solution'
                    ? stageInfo.activeStage < 2
                      ? '11/14 10:00 開放公開'
                      : '競賽提案公開中'
                    : stageInfo.activeStage < 1
                    ? '10/24 00:00 開放公開'
                    : '痛點徵件公開中'}
                </span>
              </div>
              <p className="text-stone-600 text-xs sm:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
                {homepageSectionTab === 'solution'
                  ? '本屆創星季解方提案庫！匯聚青年原創解法，支援依賽道篩選、按讚收藏與模擬注資投點。'
                  : '生活與產業的真實痛點問題庫！歡迎針對切身痛點進行探索，點進去卡片直接連至創點子查看詳情與提出解方。'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setExploreInitialTab(homepageSectionTab);
                  navigateToSubView('proposal');
                }}
                className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Compass className="w-4 h-4" />
                <span>進入總覽</span>
              </button>
            </div>
          </div>

          {homepageSectionTab === 'solution' ? (
            homepageProposalBatches.length === 0 ? (
              <div className="py-12 px-6 text-center bg-white/90 rounded-3xl border border-amber-200/90 space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-stone-900">
                  {stageInfo.activeStage < 2
                    ? '創星季「解方提案」將於 11/14 10:00 正式開放公開'
                    : '目前尚無已公開之解方提案'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
                  {stageInfo.activeStage < 2
                    ? '目前為賽前報名與第一階段痛點徵集期間，參賽解方提案目前隱藏中，將於第二階段（11/14 10:00 預先提案、11/16 10:00 模擬募資）時間到達時自動公開展示！'
                    : '歡迎各參賽隊伍點擊上方「我想提案!」投件參賽，審核通過後將於此公開展示。'}
                </p>
              </div>
            ) : (
            <>
              {/* 領域探索標籤（四大領域分類：機電運輸、資通訊、生醫化材、服務文創） */}
              <div id="star-tour-painpoint-filter" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-bold text-stone-500 shrink-0">領域：</span>
                {OFFICIAL_COMPETITION_TRACKS.map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => navigateToSubView('proposal')}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-stone-700 border border-stone-200 text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <span>{tr.name}</span>
                  </button>
                ))}
              </div>

              {/* 批次輪播切換與暫停控制按鈕 */}
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsHomepageCarouselPaused((prev) => !prev)}
                  className={`p-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isHomepageCarouselPaused
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                  title={isHomepageCarouselPaused ? '繼續自動向左輪播' : '暫停自動輪播'}
                >
                  {isHomepageCarouselPaused ? <Play className="w-3.5 h-3.5 text-amber-700" /> : <Pause className="w-3.5 h-3.5 text-stone-600" />}
                  <span className="text-[10px] hidden xs:inline">{isHomepageCarouselPaused ? '播放' : '暫停'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCarouselPrev}
                  className="p-1.5 rounded-xl bg-white hover:bg-amber-50 active:scale-95 text-stone-800 border border-stone-200 hover:border-amber-300 shadow-2xs transition-all cursor-pointer"
                  title="上一批提案 (向右回播)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleCarouselNext}
                  className="p-1.5 rounded-xl bg-white hover:bg-amber-50 active:scale-95 text-stone-800 border border-stone-200 hover:border-amber-300 shadow-2xs transition-all cursor-pointer"
                  title="下一批提案 (向左輪播)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 提案滑動輪播視窗：一次顯示 3 個提案，一批一批持續向左滑動 */}
              <div
                className="overflow-hidden relative w-full rounded-3xl"
                onMouseEnter={() => setIsHomepageCarouselPaused(true)}
                onMouseLeave={() => setIsHomepageCarouselPaused(false)}
              >
                <div
                  className={`flex ${isCarouselTransitionDisabled ? '' : 'transition-transform duration-700 ease-in-out'}`}
                  style={{ transform: `translateX(-${homepageCarouselBatchIndex * 100}%)` }}
                  onTransitionEnd={handleCarouselTransitionEnd}
                >
                  {extendedProposalBatches.map((batch, batchIdx) => (
                    <div
                      key={`batch-${batchIdx}`}
                      className="w-full shrink-0 grid grid-cols-1 md:grid-cols-3 gap-5 px-0.5"
                    >
                      {batch.map((p, pIdx) => {
                        const trackInfo = STAR_SEASON_TRACKS[p.track] || STAR_SEASON_TRACKS.ai_applications;
                        return (
                          <div
                            key={p.id}
                            id={batchIdx === 0 && pIdx === 0 ? 'star-tour-proposal-card' : undefined}
                            onClick={() => navigateToSubView('proposal', p.id)}
                            className="bg-white rounded-3xl border border-stone-200/90 hover:border-amber-400 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group overflow-hidden cursor-pointer"
                          >
                            {/* 卡片封面大圖與標籤 */}
                            <div className="relative h-32 sm:h-44 overflow-hidden bg-stone-100 border-b border-stone-100">
                              <img
                                src={p.imageUrl}
                                alt={p.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />

                              {/* 左上角標籤：賽道領域 */}
                              <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-stone-900 border border-white/40 shadow-xs">
                                  {trackInfo.name}
                                </span>
                              </div>

                              {/* 右上角標籤：階段 (競賽網站不需要綠色創星季標籤) */}
                              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] font-black px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs ${
                                    p.stage === 'pain_point'
                                      ? 'bg-rose-500/90 text-white'
                                      : 'bg-emerald-600/90 text-white'
                                  }`}
                                >
                                  {p.stage === 'pain_point' ? '徵點子' : '想解方'}
                                </span>
                              </div>

                              {/* 圖片底部學校/機構與團隊 subtitle 及右下角獲獎/決選標籤 */}
                              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white/95 text-xs font-bold truncate drop-shadow-sm">
                                <div className="flex items-center gap-1.5 truncate">
                                  {getProposalCardAuthorText(p).isOrgVisible ? (
                                    <GraduationCap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                  ) : (
                                    <Users className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                  )}
                                  <span className="truncate">{getProposalCardAuthorText(p).displayText}</span>
                                </div>
                                <div className="shrink-0">
                                  {renderProposalCornerBadge(p, batchIdx * 3 + pIdx)}
                                </div>
                              </div>
                            </div>

                            {/* 卡片內容主體 */}
                            <div className="p-3.5 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                              <div className="space-y-2">
                                <h3 className="font-black text-stone-900 group-hover:text-amber-600 transition-colors line-clamp-2 text-base leading-snug">
                                  {p.title}
                                </h3>

                                {/* 關聯痛點連結 */}
                                {(() => {
                                  const fullProp = proposals.find((item) => item.id === p.id) || (p as any);
                                  const refPainObj = findReferencedPainPoint(fullProp, questions || []);
                                  const rawRef = fullProp?.sourcePainPointTitle || fullProp?.referencedPainPoint;
                                  if (!refPainObj && !rawRef) return null;
                                  return (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (refPainObj) {
                                          if (onOpenPainPointInChuangDianZi) {
                                            onOpenPainPointInChuangDianZi(refPainObj);
                                          } else {
                                            setSelectedQuestion(refPainObj);
                                          }
                                        }
                                      }}
                                      className={`p-2 rounded-xl bg-rose-50/90 border border-rose-200/80 text-[11px] flex items-center justify-between gap-1.5 transition-colors ${
                                        refPainObj ? 'hover:bg-rose-100/80 hover:border-rose-300 cursor-pointer' : ''
                                      }`}
                                      title={refPainObj ? '點擊前往查看對應之痛點貼文' : undefined}
                                    >
                                      <span className="text-rose-900 font-bold truncate">
                                        🎯 解決痛點：{refPainObj ? refPainObj.title : String(rawRef).replace(/^\[[^\]]+\]\s*/, '')}
                                      </span>
                                      {refPainObj && (
                                        <span className="text-[10px] font-black text-rose-700 shrink-0">
                                          查看痛點 ➔
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}

                                <p className="hidden sm:block text-stone-600 text-xs line-clamp-3 leading-relaxed">
                                  {p.summary}
                                </p>
                                <div className="sm:hidden">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedBatchMobileSummaryId(expandedBatchMobileSummaryId === p.id ? null : p.id);
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <HelpCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>？ {expandedBatchMobileSummaryId === p.id ? '收合敘述' : '查看完整敘述'}</span>
                                  </button>
                                  {expandedBatchMobileSummaryId === p.id && (
                                    <p className="mt-1.5 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed animate-in fade-in duration-150">
                                      {p.summary}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* 募得創星幣與支持人數數據展示 */}
                              <div className="pt-2">
                                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50/50 to-orange-50/40 border border-amber-200/90 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-amber-950 font-black">
                                    <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span className="font-mono text-sm sm:text-base font-black">
                                      {p.supportPoints.toLocaleString()}
                                    </span>
                                    <span className="text-xs font-bold text-amber-800">創星幣</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-stone-700 font-bold text-xs sm:text-sm">
                                    <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                    <span className="font-mono font-bold text-stone-800">
                                      {p.supporterCount} 人支持
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 卡片底部操作按鈕與互動計數 */}
                            <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-stone-400 text-xs">
                                <span className="flex items-center gap-1 font-bold hover:text-rose-600 transition-colors">
                                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                                  <span className="font-mono text-[11px]">{p.likeCount}</span>
                                </span>
                                <span className="flex items-center gap-1 font-bold hover:text-amber-600 transition-colors">
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="font-mono text-[11px]">{p.commentsCount}</span>
                                </span>
                                {isCardViewsVisible(publicMetricsConfig, currentUser?.role === 'admin') && (
                                  <span
                                    className="flex items-center gap-1 text-stone-500 text-[11px] font-mono"
                                    title={publicMetricsConfig?.cardViewsScope === 'public' ? '累計點進內頁瀏覽次數' : '管理員限定：累計點進內頁瀏覽次數'}
                                  >
                                    <Eye className="w-3.5 h-3.5 text-stone-400" />
                                    <span>{(p as any).viewsCount || (p as any).views || 0}</span>
                                  </span>
                                )}
                              </div>

                              <div
                                id={batchIdx === 0 && pIdx === 0 ? 'star-tour-card-actions' : undefined}
                                className="flex items-center gap-1.5"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToSubView('proposal', p.id);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer active:scale-95 shrink-0"
                                  title="查看提案完整頁面"
                                >
                                  查看提案
                                </button>
                                {((p as any).externalLink || (p as any).demoUrl) && (
                                  <a
                                    href={(p as any).externalLink || (p as any).demoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                                    title="前往專屬網站或 Demo 連結"
                                  >
                                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>連結</span>
                                    <ExternalLink className="w-3 h-3 text-emerald-600" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToSubView('proposal', p.id);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-2xs active:scale-95 ${
                                    p.stage === 'pain_point'
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                                  }`}
                                  title={p.stage === 'pain_point' ? '查看痛點詳情' : '為此提案注資支持'}
                                >
                                  {p.stage === 'pain_point' ? '查看痛點' : '為他注資'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* 批次指示圓點導航列 */}
              {!isGuest && homepageProposalBatches.length > 1 && (
                <div className="flex items-center justify-center gap-2 pt-1 pb-1">
                  {homepageProposalBatches.map((_, dotIdx) => (
                    <button
                      key={`dot-${dotIdx}`}
                      type="button"
                      onClick={() => setHomepageCarouselBatchIndex(dotIdx)}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        homepageCarouselBatchIndex === dotIdx
                          ? 'w-8 h-2.5 bg-amber-500 shadow-2xs'
                          : 'w-2.5 h-2.5 bg-stone-300 hover:bg-stone-400'
                      }`}
                      title={`切換至第 ${dotIdx + 1} 批提案`}
                    />
                  ))}
                </div>
              )}

              {/* 未登入訪客鎖定提示 */}
              {isGuest && homepageAllProposals.filter((p) => p.stage !== 'pain_point').length > GUEST_VISIBLE_COUNT && (
                <GuestBoardGateBlurOverlay
                  remainingCount={homepageAllProposals.filter((p) => p.stage !== 'pain_point').length - GUEST_VISIBLE_COUNT}
                  totalCount={homepageAllProposals.filter((p) => p.stage !== 'pain_point').length}
                  boardName="創星季解方提案看板"
                  onOpenAuth={onOpenAuth}
                />
              )}
            </>
            )
          ) : homepagePainPoints.length === 0 ? (
            <div className="py-12 px-6 text-center bg-white/90 rounded-3xl border border-rose-200/90 space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-stone-900">
                {stageInfo.activeStage < 1
                  ? '創星季第一階段「痛點徵件」將於 10/24 00:00 正式開放公開'
                  : '目前尚無痛點問題'}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
                {stageInfo.activeStage < 1
                  ? '目前為賽前報名預熱階段（10/17 開放報名），創星季痛點題庫目前隱藏中，將於 10/24 00:00 第一階段痛點徵件開跑時正式公開！'
                  : '歡迎提出生活或產業的真實切身痛點，過審即送 200 點獎勵！'}
              </p>
            </div>
          ) : (
            /* 痛點問題專區（三張一批輪播展示） */
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500 font-medium">
                <span>生活與校園真實切身痛點，點擊卡片直接進入創點子查看詳情與提出解方：</span>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="font-mono text-amber-900 font-black">共 {homepagePainPoints.length} 個切身痛點</span>
                  {homepagePainPointBatches.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePainPointCarouselPrev}
                        className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 shadow-2xs transition-all cursor-pointer"
                        title="上一批痛點"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handlePainPointCarouselNext}
                        className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 shadow-2xs transition-all cursor-pointer"
                        title="下一批痛點"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPainPointCarouselPaused((prev) => !prev)}
                        className={`p-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isPainPointCarouselPaused
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                        }`}
                        title={isPainPointCarouselPaused ? '繼續自動向左輪播' : '暫停自動輪播'}
                      >
                        {isPainPointCarouselPaused ? <Play className="w-3.5 h-3.5 text-rose-700" /> : <Pause className="w-3.5 h-3.5 text-stone-600" />}
                        <span className="text-[10px] hidden xs:inline">{isPainPointCarouselPaused ? '播放' : '暫停'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 痛點輪播容器（三張一批） */}
              <div className="overflow-hidden">
                <div
                  className={`flex ${isPainPointCarouselTransitionDisabled ? '' : 'transition-transform duration-700 ease-out'}`}
                  style={{
                    transform: `translateX(-${homepagePainPointBatchIndex * 100}%)`,
                  }}
                  onTransitionEnd={handlePainPointCarouselTransitionEnd}
                >
                  {extendedPainPointBatches.map((batch, batchIdx) => (
                    <div key={`pp-batch-${batchIdx}`} className="w-full shrink-0 grid grid-cols-1 md:grid-cols-3 gap-5">
                      {batch.map((pp, ppIdx) => (
                        <div
                          key={pp.id}
                          id={batchIdx === 0 && ppIdx === 0 ? 'star-tour-painpoint-card' : undefined}
                          onClick={() => {
                            // 點進去卡片一樣要連到創點子的對應痛點！
                            if (onOpenPainPointInChuangDianZi) {
                              onOpenPainPointInChuangDianZi(pp);
                            } else if (onBackToOldSite) {
                              onBackToOldSite();
                            }
                          }}
                          className="group bg-white rounded-3xl border border-stone-200/90 hover:border-amber-400 p-5 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer space-y-4 hover:-translate-y-0.5"
                        >
                          <div className="space-y-3">
                            {/* 標籤列：領域/分類 + 痛點獎項標籤 (冠軍痛點/亞軍痛點/季軍痛點/4~10名痛點/決選痛點) */}
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80">
                                {pp.subcategory || pp.category}
                              </span>
                              {getPainPointAwardBadge(pp.title, pp.id)}
                            </div>

                            {/* 痛點標題 */}
                            <h3 className="font-black text-stone-900 group-hover:text-amber-600 transition-colors line-clamp-2 text-base leading-snug">
                              {pp.title}
                            </h3>

                            {/* 痛點簡述 (3行) */}
                            <p className="text-stone-600 text-xs line-clamp-3 leading-relaxed bg-stone-50/70 p-3 rounded-2xl border border-stone-100">
                              {pp.description || (pp as any).summary || '生活切身痛點，徵求落地架構與完整解方！點擊卡片直接連至創點子查看完整提問與回覆方案。'}
                            </p>

                            {/* 解決此痛點的提案連結 */}
                            {(() => {
                              const solvingList = findProposalsReferencingPainPoint((pp as any).rawQuestion || (pp as any), questions || []);
                              if (solvingList.length === 0) return null;
                              return (
                                <div className="p-2 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 space-y-1 text-[11px]">
                                  <div className="text-emerald-900 font-black">
                                    💡 解決此痛點的提案（{solvingList.length} 件）
                                  </div>
                                  {solvingList.slice(0, 2).map((sp) => (
                                    <div
                                      key={sp.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const matchedInProposals = proposals.find((item) => item.id === sp.id);
                                        if (matchedInProposals) {
                                          navigateToSubView('proposal', sp.id);
                                        } else {
                                          const matchedQ = (questions || []).find((q) => q.id === sp.id) || sp;
                                          setSelectedQuestion(matchedQ);
                                        }
                                      }}
                                      className="p-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200/70 hover:border-emerald-400 flex items-center justify-between gap-1.5 transition-colors cursor-pointer"
                                      title="點擊查看解決此痛點的提案貼文"
                                    >
                                      <span className="font-bold text-stone-800 truncate">
                                        {sp.postType === 'vibecoding_app' ? '💻 ' : '💡 '}
                                        {sp.title}
                                      </span>
                                      <span className="text-[10px] font-black text-emerald-700 shrink-0">
                                        查看提案 ➔
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>

                          {/* 底部作者與互動 */}
                          <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={pp.authorAvatar}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover border border-stone-200 shrink-0"
                              />
                              <span className="text-xs font-bold text-stone-700 truncate">
                                {pp.authorName}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-stone-400 text-xs shrink-0 font-mono">
                              {/* 痛點附議按鍵（綠色+1圖示） */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const res = toggleSecondQuestion(pp.id);
                                  if (res.isSeconded) {
                                    addNotification(`已為痛點「${pp.title}」附議 +1！`, 'success');
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                                  isQuestionSeconded(pp.id)
                                    ? 'bg-rose-600 text-white border border-rose-600 shadow-2xs font-black'
                                    : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
                                }`}
                                title="附議此痛點 (+1 共鳴支持)"
                              >
                                <span className="font-mono font-black">+1</span>
                                {getQuestionSecondCount(pp.id) > 0 && (
                                  <span className="font-mono font-black">{getQuestionSecondCount(pp.id)}</span>
                                )}
                              </button>

                              <span
                                id={batchIdx === 0 && ppIdx === 0 ? 'star-tour-solutions-received' : undefined}
                                className="flex items-center gap-1 font-bold text-stone-600"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                                <span>{pp.solutionsCount} 個解方</span>
                              </span>
                              {isCardViewsVisible(publicMetricsConfig, currentUser?.role === 'admin') && (
                                <span
                                  className="flex items-center gap-1 text-stone-500 text-[11px] font-mono"
                                  title={publicMetricsConfig?.cardViewsScope === 'public' ? '累計點進內頁瀏覽次數' : '管理員限定：累計點進內頁瀏覽次數'}
                                >
                                  <Eye className="w-3.5 h-3.5 text-stone-400" />
                                  <span>{pp.views || 0}</span>
                                </span>
                              )}
                              <span
                                id={batchIdx === 0 && ppIdx === 0 ? 'star-tour-solve-painpoint-btn' : undefined}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-amber-50 group-hover:bg-amber-400 group-hover:text-stone-950 text-amber-900 text-[10px] font-black transition-colors"
                              >
                                前往查看並提案 →
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* 批次指示圓點導航列 */}
              {!isGuest && homepagePainPointBatches.length > 1 && (
                <div className="flex items-center justify-center gap-2 pt-1 pb-1">
                  {homepagePainPointBatches.map((_, dotIdx) => (
                    <button
                      key={`pp-dot-${dotIdx}`}
                      type="button"
                      onClick={() => setHomepagePainPointBatchIndex(dotIdx)}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        homepagePainPointBatchIndex === dotIdx
                          ? 'w-8 h-2.5 bg-rose-500 shadow-2xs'
                          : 'w-2.5 h-2.5 bg-stone-300 hover:bg-stone-400'
                      }`}
                      title={`切換至第 ${dotIdx + 1} 批痛點`}
                    />
                  ))}
                </div>
              )}

              {/* 未登入訪客鎖定提示 */}
              {isGuest && homepagePainPoints.length > GUEST_VISIBLE_COUNT && (
                <GuestBoardGateBlurOverlay
                  remainingCount={homepagePainPoints.length - GUEST_VISIBLE_COUNT}
                  totalCount={homepagePainPoints.length}
                  boardName="創星季痛點徵件看板"
                  onOpenAuth={onOpenAuth}
                />
              )}

              {/* 查看更多痛點按鈕 */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setExploreInitialTab('pain_point');
                    navigateToSubView('proposal');
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <span>查看所有痛點問題總覽</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 底部醒目 CTA 橫幅 (僅在提案專區展示，痛點專區依需求移除) */}
          {homepageSectionTab === 'solution' && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-100/60 p-4 rounded-2xl border border-amber-300/80">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>探索全部參賽隊伍、完整計畫簡報、模擬注資與智庫專家回饋</span>
              </div>
              <button
                type="button"
                onClick={() => navigateToSubView('proposal')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-300 hover:text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
              >
                <span>進入總覽</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 首頁資訊：活動獎項與賽程時程表專區 */}
        <div className="mt-16 pt-10 border-t border-stone-200 space-y-12">
          {/* 1. 活動獎項專區 */}
          <section id="homepage-awards-section" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Trophy className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-stone-900">
                    活動獎項
                  </h2>
                  <p className="text-xs text-stone-500 font-medium">總獎金回饋、官方「創之星」最高榮譽與雙向共創好禮</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigateToSubView('rules')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer transition-colors self-start sm:self-auto"
              >
                <span>完整競賽辦法</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 前三名大獎卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 冠軍 */}
              <div className="bg-gradient-to-b from-amber-50/80 via-white to-stone-50 p-5 rounded-2xl border-2 border-amber-300 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-stone-950" />
                      <span>第一名</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                      First Prize
                    </span>
                  </div>
                  <h3 className="text-base font-black text-stone-900">🏆 冠軍大獎</h3>
                  <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono tracking-tight">
                    NT$30,000 <span className="text-xs text-stone-500 font-normal">等值獎勵</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed pt-1">
                    <b>NT$20,000 現金</b> ＋ <b>8,000 點</b> IdeaX 平台點數（點數效期 180 日）＋ 官方「創之星」最高榮譽徽章。
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-200/60 text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>官方最高榮耀認證與社群推薦</span>
                </div>
              </div>

              {/* 亞軍 */}
              <div className="bg-gradient-to-b from-stone-50 via-white to-stone-50 p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 flex items-center gap-1">
                      <Award className="w-3 h-3 text-stone-700" />
                      <span>第二名</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      Second Prize
                    </span>
                  </div>
                  <h3 className="text-base font-black text-stone-900">🥈 亞軍殊榮</h3>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 font-mono tracking-tight">
                    NT$10,000 <span className="text-xs text-stone-500 font-normal">等值獎勵</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed pt-1">
                    <b>NT$6,000 現金</b> ＋ <b>3,200 點</b> IdeaX 平台點數（點數效期 180 日）＋ 官方「創之星」榮譽徽章。
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100 text-[11px] font-bold text-stone-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-stone-400" />
                  <span>官方重點孵化推薦方案</span>
                </div>
              </div>

              {/* 季軍 */}
              <div className="bg-gradient-to-b from-stone-50 via-white to-stone-50 p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 flex items-center gap-1">
                      <Award className="w-3 h-3 text-stone-700" />
                      <span>第三名</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      Third Prize
                    </span>
                  </div>
                  <h3 className="text-base font-black text-stone-900">🥉 季軍殊榮</h3>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 font-mono tracking-tight">
                    NT$5,000 <span className="text-xs text-stone-500 font-normal">等值獎勵</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed pt-1">
                    <b>NT$3,000 現金</b> ＋ <b>1,600 點</b> IdeaX 平台點數（點數效期 180 日）＋ 官方「創之星」榮譽徽章。
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100 text-[11px] font-bold text-stone-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-stone-400" />
                  <span>社群高人氣創客推薦</span>
                </div>
              </div>
            </div>

            {/* 人人有獎痛點提出獎、痛點採用獎與推廣大使卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5 text-xs text-stone-700">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>痛點提出獎（人人有獎）</span>
                </div>
                <p className="leading-relaxed text-stone-600">
                  只要成功提出生活或產業痛點（需過審），即送 <b>200 點</b>（價值 $250 的 IdeaX 創點子平台點數，效期 60 日）。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs text-stone-700">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  <span>痛點採用好禮</span>
                </div>
                <p className="leading-relaxed text-stone-600">
                  獲獎提案採用您的痛點：前 1~3 名享價值 <b>NT$1,500</b> 等值好禮（含 1,200 點提問金）；前 4~10 名享價值 <b>$500</b> 好禮（效期 60 日）。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5 text-xs text-stone-700">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-purple-600" />
                  <span>推廣大使推薦獎</span>
                </div>
                <p className="leading-relaxed text-stone-600">
                  每成功推薦 1 案<b className="text-purple-800">解方提案（非痛點）</b>審核通過，推薦人享 <b>300 點</b>（價值 $400）IdeaX 平台點數（效期 60 日，多推多得無上限）。（註：受推薦項目需為「解方提案」，不包含單純痛點提出）
                </p>
              </div>
            </div>

            {/* 點數效期規範提醒 */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300/80 text-xs text-stone-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong className="text-amber-950 font-black">注意點數期限：</strong>前三名獲獎團隊點數效期為 <b>180 日</b>，其餘所有獎勵點數效期皆為 <b>60 日</b>。請把握提問機會，盡快使用完畢 <span className="inline-block animate-exclamation-action text-amber-600 font-black text-sm origin-bottom select-none" title="把握提問機會！">!</span>
              </span>
            </div>
          </section>

          {/* 2. 賽程時程表專區 (移至活動獎項下方) */}
          <section id="homepage-schedule-section" className="space-y-6 pt-6 border-t border-stone-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Calendar className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-stone-900">
                    賽程時程表
                  </h2>
                  <p className="text-xs text-stone-500 font-medium">IdeaX 創星季競賽四階段時程與重要截止時間</p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                  {stageInfo.activeStage === 0 ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>當前狀態：<strong className="text-amber-800 font-black">{stageInfo.stageTitle}</strong>（{stageInfo.stagePeriod}）</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>當前進行：<strong className="text-emerald-800 font-black">{stageInfo.stageTitle}</strong>（{stageInfo.stagePeriod}）</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigateToSubView('rules')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer transition-colors"
                  title="前往閱讀完整競賽辦法"
                >
                  <span>完整競賽辦法</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 報名時段特別公告標籤 */}
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-black text-[11px] shrink-0 shadow-2xs">
                  📝 報名時段
                </span>
                <span className="font-black text-stone-900 font-mono text-sm">
                  10/17 00:00 ～ 12/04 16:30
                </span>
              </div>
              <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                <span>提痛點之參賽者請於 <strong className="font-black text-stone-900 underline underline-offset-2">11/13 16:30</strong> 痛點徵件截止前完成報名</span>
              </div>
            </div>

            {(() => {
              const activeStage = stageInfo.activeStage;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 階段 1: 痛點徵件 */}
                  <div
                    className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                      activeStage === 1
                        ? 'bg-white border-2 border-emerald-500 ring-2 ring-emerald-400/20 shadow-md'
                        : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                    }`}
                  >
                    <div className="flex items-center">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          activeStage === 1
                            ? 'bg-emerald-500 text-white'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        第一階段
                      </span>
                    </div>
                    <div className={`text-sm ${activeStage === 1 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                      痛點徵件
                    </div>
                    <div className={`text-xs font-mono ${activeStage === 1 ? 'font-black text-emerald-700' : 'font-medium text-stone-400'}`}>
                      10/24 00:00 ~ 11/13 16:30
                    </div>
                    <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 1 ? 'text-stone-600' : 'text-stone-400'}`}>
                      提出生活與產業切身痛點（過審即送 200 點），開放各隊選題解題。
                    </p>
                  </div>

                  {/* 階段 2A: 預先提案 (11/14 10:00 ~ 11/15 16:30) */}
                  <div
                    className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                      activeStage === 2
                        ? 'bg-white border-2 border-amber-500 ring-2 ring-amber-400/20 shadow-md'
                        : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                    }`}
                  >
                    <div className="flex items-center">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          activeStage === 2
                            ? 'bg-amber-500 text-stone-950 font-bold'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        第二階段 (一)
                      </span>
                    </div>
                    <div className={`text-sm ${activeStage === 2 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                      預先提案
                    </div>
                    <div className={`text-xs font-mono ${activeStage === 2 ? 'font-black text-amber-700' : 'font-medium text-stone-400'}`}>
                      11/14 10:00 ~ 11/15 16:30
                    </div>
                    <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 2 ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>
                      關閉募資(投資)功能。開放報名、線上提案、主辦審核與預覽。
                    </p>
                  </div>

                  {/* 階段 2B: 模擬募資與提案 (11/16 10:00 ~ 12/04 16:30) */}
                  <div
                    className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                      activeStage === 3
                        ? 'bg-white border-2 border-emerald-500 ring-2 ring-emerald-400/20 shadow-md'
                        : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                    }`}
                  >
                    <div className="flex items-center">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          activeStage === 3
                            ? 'bg-emerald-500 text-white'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        第二階段 (二)
                      </span>
                    </div>
                    <div className={`text-sm ${activeStage === 3 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                      模擬募資與提案
                    </div>
                    <div className={`text-xs font-mono ${activeStage === 3 ? 'font-black text-emerald-700' : 'font-medium text-stone-400'}`}>
                      11/16 10:00 ~ 12/04 16:30
                    </div>
                    <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 3 ? 'text-stone-600' : 'text-stone-400'}`}>
                      開放報名、提案、創星幣注資與審核！總額前 20 名取得決選資格。
                    </p>
                  </div>

                  {/* 階段 3: 進入決選(評審) */}
                  <div
                    className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                      activeStage === 4
                        ? 'bg-white border-2 border-emerald-500 ring-2 ring-emerald-400/20 shadow-md'
                        : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                    }`}
                  >
                    <div className="flex items-center">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          activeStage === 4
                            ? 'bg-emerald-500 text-white'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        第三階段
                      </span>
                    </div>
                    <div className={`text-sm ${activeStage === 4 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                      進入決選(評審)
                    </div>
                    <div className={`text-xs font-mono ${activeStage === 4 ? 'font-black text-emerald-700' : 'font-medium text-stone-400'}`}>
                      12/05 ~ 12/11
                    </div>
                    <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 4 ? 'text-stone-600' : 'text-stone-400'}`}>
                      由評審團進行專業審查與評分。
                    </p>
                  </div>

                  {/* 階段 4: 公布結果 */}
                  <div
                    className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                      activeStage === 5
                        ? 'bg-white border-2 border-emerald-500 ring-2 ring-emerald-400/20 shadow-md'
                        : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                    }`}
                  >
                    <div className="flex items-center">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          activeStage === 5
                            ? 'bg-emerald-500 text-white'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        第四階段
                      </span>
                    </div>
                    <div className={`text-sm ${activeStage === 5 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                      公布結果
                    </div>
                    <div className={`text-xs font-mono ${activeStage === 5 ? 'font-black text-emerald-700' : 'font-medium text-stone-400'}`}>
                      12/12 ~ 12/16 公布
                    </div>
                    <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 5 ? 'text-stone-600' : 'text-stone-400'}`}>
                      於首頁盛大公告最終榜單，頒發榮譽與獎勵。
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 賽程表區塊右下：前往閱讀完整競賽辦法規章 */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  navigateToSubView('rules');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline transition-colors cursor-pointer group"
                title="前往閱讀完整競賽辦法與規章章程"
              >
                <span>前往完整競賽辦法規章</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* 創星季獨立站頁尾 (主辦單位: IdeaX團隊 / logo-6-trans-dark / ideax.office@gmail.com / 造訪IdeaX創點子平台) */}
      <CompetitionFooter
        onBackToOldSite={onBackToOldSite}
        onNavigate={navigateToSubView}
        onOpenGuide={() => {
          setGuideRole('audience');
          setIsGuideModalOpen(true);
        }}
      />

      {/* 提案詳情 Modal (舊版彈窗，依需求全面由具獨立專屬網址之 ProposalDetailFullPage 取代) */}
      {(false as boolean) && selectedProposalForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <img src="/logo-bulb.png" alt="黃色正向去背燈泡" className="w-5 h-5 object-contain shrink-0" />
                <img src="/logo-chuangxingji-text.png" alt="創星季去背" className="h-5 w-auto object-contain shrink-0" />
                <h3 className="text-base font-black text-stone-900 ml-1">提案詳情 — 創新提案</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyProposalLink(selectedProposalForDetail.id)}
                  className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  title="複製此提案專屬公開網址（可於搜尋引擎檢索與社群分享）"
                >
                  {copiedProposalId === selectedProposalForDetail.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-black">已複製連結</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5 text-amber-700" />
                      <span>複製公開網址</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedProposalForDetail(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* 賽道與階段標籤 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  {selectedProposalForDetail.stage === 'pain_point' ? '第一階段：徵點子（痛點）' : '第二階段：想解方（解法）'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-bold">
                  {STAR_SEASON_TRACKS[selectedProposalForDetail.track]?.name}
                </span>
                {selectedProposalForDetail.finalRank && selectedProposalForDetail.finalRank <= 3 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black">
                    第 {selectedProposalForDetail.finalRank} 名獲獎
                  </span>
                )}
              </div>

              {/* 標題 */}
              <h2 className="text-lg font-black text-stone-900 leading-snug">
                {selectedProposalForDetail.title}
              </h2>

              {/* 提案人與學校資訊 */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/60 border border-amber-200">
                <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-950 font-black flex items-center justify-center text-sm border border-amber-300 shrink-0">
                  {selectedProposalForDetail.authorName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    <span>{getProposalCardAuthorText(selectedProposalForDetail).displayText}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      創新盃
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    提交時間：{new Date(selectedProposalForDetail.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* 關聯痛點資訊 */}
              {selectedProposalForDetail.sourcePainPointTitle && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    本解方提案採用的來源痛點：
                  </span>
                  <p className="text-stone-800 font-bold italic">
                    {selectedProposalForDetail.sourcePainPointTitle}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    若獲專家評審評定為前三名獲獎解方，獲獎提案使用之痛點提出者可獲獎勵：價值$1500好禮（1200點提問金,用於IdeaX平台提問或使用特色功能）！
                  </p>
                </div>
              )}

              {/* 提案摘要 */}
              <div>
                <h4 className="font-black text-stone-900 mb-1">
                  {selectedProposalForDetail.stage === 'pain_point' ? '痛點簡述' : '核心摘要與創新價值'}
                </h4>
                <p className="text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                  {selectedProposalForDetail.summary}
                </p>
              </div>

              {/* 詳細說明 */}
              <div>
                <h4 className="font-black text-stone-900 mb-1">
                  {selectedProposalForDetail.stage === 'pain_point' ? '痛點深入說明' : '詳細內容或企畫書'}
                </h4>
                <div className="text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200 whitespace-pre-line">
                  {selectedProposalForDetail.description || selectedProposalForDetail.summary}
                </div>
              </div>

              {/* 圖片展示區 */}
              {selectedProposalForDetail.images && selectedProposalForDetail.images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-black text-stone-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span>圖片展示</span>
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      共 {selectedProposalForDetail.images.length} 張
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {selectedProposalForDetail.images.map((img, idx) => (
                      <div key={idx} className="rounded-2xl overflow-hidden border border-amber-200 bg-white aspect-video shadow-2xs group relative">
                        <img src={img} alt={`img-${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 補充資料區塊 (技術可行性、市場分析與定位、商業模式與財務預測、外部連結) */}
              {(selectedProposalForDetail.technicalFeasibility || selectedProposalForDetail.marketAnalysis || selectedProposalForDetail.businessModelFinancials || selectedProposalForDetail.externalLink) && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                  <h4 className="font-black text-amber-950 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>提案補充資料與延伸連結</span>
                  </h4>

                  {selectedProposalForDetail.technicalFeasibility && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <div className="font-bold text-stone-900 text-[11px] mb-0.5">• 技術可行性說明</div>
                      <p className="text-stone-700 whitespace-pre-line leading-relaxed">{selectedProposalForDetail.technicalFeasibility}</p>
                    </div>
                  )}

                  {selectedProposalForDetail.marketAnalysis && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <div className="font-bold text-stone-900 text-[11px] mb-0.5">• 市場分析與定位</div>
                      <p className="text-stone-700 whitespace-pre-line leading-relaxed">{selectedProposalForDetail.marketAnalysis}</p>
                    </div>
                  )}

                  {selectedProposalForDetail.businessModelFinancials && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <div className="font-bold text-stone-900 text-[11px] mb-0.5">• 商業模式與財務預測</div>
                      <p className="text-stone-700 whitespace-pre-line leading-relaxed">{selectedProposalForDetail.businessModelFinancials}</p>
                    </div>
                  )}

                  {selectedProposalForDetail.externalLink && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60 flex items-center justify-between gap-2">
                      <div className="truncate text-stone-700">
                        <span className="font-bold text-stone-900 mr-1.5">• 外部連結:</span>
                        <a href={selectedProposalForDetail.externalLink} target="_blank" rel="noreferrer" className="text-amber-700 underline font-mono text-[11px]">
                          {selectedProposalForDetail.externalLink}
                        </a>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    </div>
                  )}
                </div>
              )}

              {/* 標籤列展示 (含 AI 市場顧問 Agent 自動賦予標籤) */}
              {selectedProposalForDetail.tags && selectedProposalForDetail.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-stone-500 font-bold">標籤：</span>
                  {selectedProposalForDetail.tags.map((tg, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold">
                      #{tg}
                    </span>
                  ))}
                  {selectedProposalForDetail.aiCategorized && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                      🤖 AI市場顧問智慧領域
                    </span>
                  )}
                </div>
              )}

              {/* 若為痛點專頁：在痛點下方區分兩種提案途徑 */}
              {selectedProposalForDetail.stage === 'pain_point' && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/90 border-2 border-amber-400 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-xs shadow-2xs">
                        💡
                      </div>
                      <span className="font-black text-stone-950 text-sm">針對此痛點提出創新方案</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300">
                      雙軌提案
                    </span>
                  </div>
                  <p className="text-stone-700 text-xs leading-relaxed">
                    你有解決此痛點的產品想法、技術解法或商業模式嗎？您可以選擇<strong>「提案參賽(不賺賞金)」</strong>角逐創星季高額競賽獎金與榮譽，或選擇<strong>「提案懸賞(不參賽)」</strong>在市場賺取解鎖定價或提問懸賞！
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          sessionStorage.setItem(
                            'ideax_challenge_prefill_topic',
                            JSON.stringify({
                              id: selectedProposalForDetail.id,
                              title: selectedProposalForDetail.title,
                              serial: selectedProposalForDetail.id,
                              summary: selectedProposalForDetail.summary,
                              track: selectedProposalForDetail.track,
                            })
                          );
                        } catch {}
                        setSelectedProposalForDetail(null);
                        if (!isLoggedIn) {
                          onOpenAuth();
                          return;
                        }
                        navigateToSubView('submit');
                      }}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                      title="以本痛點為題目投入創星季競賽，角逐競賽大獎（不賺取發布者賞金）"
                    >
                      <Sparkles className="w-4 h-4 text-stone-950" />
                      <span>提案參賽(不賺賞金)</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = selectedProposalForDetail.id;
                        const targetTitle = selectedProposalForDetail.title;
                        setSelectedProposalForDetail(null);
                        const matchQ = questions.find((item) => item.id === targetId || item.title === targetTitle || item.title?.includes(targetTitle));
                        if (matchQ && onOpenPainPointInChuangDianZi) {
                          onOpenPainPointInChuangDianZi(matchQ);
                        } else if (onOpenPainPointInChuangDianZi) {
                          onOpenPainPointInChuangDianZi({
                            id: targetId,
                            title: targetTitle,
                            description: selectedProposalForDetail.summary,
                            postType: 'pain_point',
                          });
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                      title="提交市場付費解鎖方案以獲取商業定價或懸賞（不參賽）"
                    >
                      <Award className="w-4 h-4 text-stone-950" />
                      <span>提案懸賞(不參賽)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 附件檔案 */}
              {selectedProposalForDetail.attachmentUrl && (
                <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate font-bold text-stone-800">
                      {selectedProposalForDetail.attachmentName || '提案簡報與計畫附件'}
                    </span>
                  </div>
                  <a
                    href={selectedProposalForDetail.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-amber-400 text-stone-950 font-black text-xs hover:bg-amber-300 cursor-pointer shrink-0"
                  >
                    下載附件
                  </a>
                </div>
              )}

              {/* 創星幣募資成果展示（純以募得創星幣為主，取消達成率機制） */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50/60 to-orange-50/50 border border-amber-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 font-black flex items-center justify-center text-sm shadow-2xs">
                      🪙
                    </div>
                    <div>
                      <div className="font-bold text-stone-900 text-sm">當前累積募得創星幣</div>
                      <div className="text-[11px] text-stone-500">純以社群與投資者實際注資金額為主</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-black text-amber-900 text-xl sm:text-2xl flex items-baseline justify-end gap-1">
                      <span>{selectedProposalForDetail.supportPoints.toLocaleString()}</span>
                      <span className="text-xs font-bold text-amber-700">創星幣</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs text-stone-700">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    <span>累積支持夥伴：</span>
                    <span className="font-mono font-bold text-stone-900">{selectedProposalForDetail.supporterCount || 0} 人</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                    ⭐ 創星季實時榜單計分
                  </span>
                </div>
              </div>

              {/* 專家評審與教練輔導回饋專區 (教育部 SSP 專屬特色) */}
              <div className="p-3.5 rounded-2xl bg-white border border-stone-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-black text-stone-900">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <span>專家評審與業師教練回饋</span>
                </div>
                {selectedProposalForDetail.reviewNote ? (
                  <p className="text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200 italic">
                    「{selectedProposalForDetail.reviewNote}」
                  </p>
                ) : (
                  <p className="text-stone-400 italic text-[11px]">
                    目前該提案已通過初審，正在進行全體模擬募資中；募資前 20 名將由產學專家小組於 12/01–12/06 決審階段給予深度輔導回饋。
                  </p>
                )}
              </div>

              {/* 愛心 Like 互動條 (參賽者、專家、用戶皆可按 Like 並收入個人清單) */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(selectedProposalForDetail.id)}
                    className={`p-2 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      likedProposalIds.includes(selectedProposalForDetail.id)
                        ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                        : 'bg-white text-rose-600 border-rose-300 hover:bg-rose-100/50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedProposalIds.includes(selectedProposalForDetail.id) ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                    <span>我的 Like</span>
                  </button>
                  <span className="text-xs text-rose-900 font-bold">
                    累計 {selectedProposalForDetail.likeCount || 0} 個 Like
                  </span>
                </div>
                <span className="text-[11px] text-stone-500 hidden sm:inline">
                  點擊 ❤️ Like 後將為此提案累積人氣並收錄至「我的 Like」清單
                </span>
              </div>

              {/* 社群討論串 (交流互動、參賽者與專家討論) */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2 font-black text-stone-900 text-xs">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    <span>社群討論與交流專區</span>
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                      {activeComments.length} 則留言
                    </span>
                  </div>
                  {isLoadingComments && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>載入留言中...</span>
                    </span>
                  )}
                </div>

                {/* 留言列表 */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {activeComments.length === 0 ? (
                    <div className="py-6 text-center text-stone-400 space-y-1">
                      <MessageSquare className="w-8 h-8 mx-auto text-stone-300 stroke-1" />
                      <p className="text-xs">目前尚無討論留言</p>
                      <p className="text-[10px] text-stone-400">歡迎參賽者、顧問專家與會員提出建議、提問或交流！</p>
                    </div>
                  ) : (
                    activeComments.map((cm) => (
                      <div key={cm.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-stone-800">
                            <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-black shrink-0">
                              {cm.authorName.charAt(0)}
                            </div>
                            <span>{cm.authorName}</span>
                            {cm.authorRole === 'expert' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                {cm.roleBadgeText || '評審專家'}
                              </span>
                            ) : cm.authorRole === 'participant' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {cm.roleBadgeText || '創星季參賽者'}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[10px] text-stone-400">
                            {new Date(cm.createdAt).toLocaleDateString()} {new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-stone-700 whitespace-pre-line pl-6.5 leading-relaxed text-[11px]">
                          {cm.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* 留言輸入框 */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder={
                        isLoggedIn
                          ? '留下您對此提案的提問、建議或鼓勵...'
                          : '請先登入後發表討論留言...'
                      }
                      disabled={!isLoggedIn || isSubmittingComment}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 resize-none disabled:bg-stone-100"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">
                      支持友善交流，嚴禁廣告或不當言論
                    </span>
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!isLoggedIn || isSubmittingComment || !newCommentText.trim()}
                      className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      {isSubmittingComment ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>送出留言</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 管理員專屬審核操作列 */}
              {account?.role === 'admin' && (
                <div className="p-3 rounded-2xl bg-stone-100 border border-stone-300 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>提案狀態：</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedProposalForDetail.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedProposalForDetail.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      {selectedProposalForDetail.status === 'approved'
                        ? '✅ 已核准通過'
                        : selectedProposalForDetail.status === 'rejected'
                        ? '❌ 已退回'
                        : '⏳ 待審核'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedProposalForDetail.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await adminReviewProposal({
                            proposalId: selectedProposalForDetail.id,
                            status: 'approved',
                            reviewNote: '管理員審核通過',
                          });
                          showToast(res.message || '✅ 已通過該提案！');
                          setSelectedProposalForDetail((prev) => prev ? { ...prev, status: 'approved' } : null);
                          loadData();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>通過提案</span>
                      </button>
                    )}
                    {selectedProposalForDetail.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const note = window.prompt('請輸入退回原因（將記錄於審核備註）：', '內容需要進一步補充與調整');
                          if (note === null) return;
                          const res = await adminReviewProposal({
                            proposalId: selectedProposalForDetail.id,
                            status: 'rejected',
                            reviewNote: note,
                          });
                          showToast(res.message || '❌ 已退回該提案！');
                          setSelectedProposalForDetail((prev) => prev ? { ...prev, status: 'rejected', reviewNote: note } : null);
                          loadData();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-black text-xs cursor-pointer shadow-xs flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>退回提案</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 底部投點與提案操作按鈕 */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {selectedProposalForDetail.stage === 'pain_point' && (
                  <div className="flex-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            sessionStorage.setItem(
                              'ideax_challenge_prefill_topic',
                              JSON.stringify({
                                id: selectedProposalForDetail.id,
                                title: selectedProposalForDetail.title,
                                serial: selectedProposalForDetail.id,
                                summary: selectedProposalForDetail.summary,
                                track: selectedProposalForDetail.track,
                              })
                            );
                          } catch {}
                          setSelectedProposalForDetail(null);
                          if (!isLoggedIn) {
                            onOpenAuth();
                            return;
                          }
                          navigateToSubView('submit');
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        title="以本痛點為題目投入創星季競賽，角逐競賽大獎（不賺取發布者賞金）"
                      >
                        <Sparkles className="w-4 h-4 text-stone-950" />
                        <span>提案參賽(不賺賞金)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = selectedProposalForDetail.id;
                          const targetTitle = selectedProposalForDetail.title;
                          setSelectedProposalForDetail(null);
                          const matchQ = questions.find((item) => item.id === targetId || item.title === targetTitle || item.title?.includes(targetTitle));
                          if (matchQ && onOpenPainPointInChuangDianZi) {
                            onOpenPainPointInChuangDianZi(matchQ);
                          } else if (onOpenPainPointInChuangDianZi) {
                            onOpenPainPointInChuangDianZi({
                              id: targetId,
                              title: targetTitle,
                              description: selectedProposalForDetail.summary,
                              postType: 'pain_point',
                            });
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        title="提交市場付費解鎖方案以獲取商業定價或懸賞（不參賽）"
                      >
                        <Award className="w-4 h-4 text-stone-950" />
                        <span>提案懸賞(不參賽)</span>
                      </button>
                    </div>
                  )}
                {selectedProposalForDetail.stage !== 'pain_point' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (stageInfo.isPreProposalStage) {
                        showToast('ℹ️ 11/14 ~ 11/15 為預先提案期，募資(投資)功能暫時關閉，僅供提案審核與預覽！11/16 起正式開放注資。');
                        return;
                      }
                      if (!stageInfo.isInvestmentEnabled) {
                        showToast('ℹ️ 創星幣模擬募資將於 11/16 ~ 12/04 開放！');
                        return;
                      }
                      setSelectedProposalForSupport(selectedProposalForDetail);
                      setSelectedProposalForDetail(null);
                      setIsSupportModalOpen(true);
                    }}
                    className={`flex-1 py-2.5 rounded-xl border border-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
                      !stageInfo.isInvestmentEnabled
                        ? 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                        : 'bg-amber-400 hover:bg-amber-300'
                    }`}
                    title={!stageInfo.isInvestmentEnabled ? '預先提案期（11/14~11/15）募資功能關閉，11/16 正式開放' : undefined}
                  >
                    <Heart className={`w-4 h-4 ${stageInfo.isInvestmentEnabled ? 'fill-current text-rose-500' : 'text-stone-400'}`} />
                    <span>
                      {stageInfo.isPreProposalStage
                        ? '預先提案期（募資暫未開放）'
                        : '使用創星幣支持提案'}
                    </span>
                  </button>
                ) : (
                  <div className="flex-1 py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                    <span>💡</span>
                    <span>痛點徵件項目不開放注資創星幣，歡迎針對此痛點提出解方提案！</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedProposalForDetail(null)}
                  className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 提交新提案 Modal (純白背景，金黃標籤，無黑色) */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <img src="/logo-bulb.png" alt="黃色正向去背燈泡" className="w-5 h-5 object-contain shrink-0" />
                <img src="/logo-chuangxingji-text.png" alt="創星季去背" className="h-5 w-auto object-contain shrink-0" />
                <h3 className="text-base font-black text-stone-900 ml-1">投件參賽 — IdeaX 創星季</h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProposalForm} className="space-y-4 text-xs">
              {/* 選擇階段 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1.5">參賽階段</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormStage('pain_point')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      formStage === 'pain_point'
                        ? 'bg-rose-50 border-rose-400 text-rose-950 font-black shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="font-black text-xs">第一階段：徵點子</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">提出生活或校園的真實痛點問題</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStage('solution')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      formStage === 'solution'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-black shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="font-black text-xs">第二階段：想解方</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">針對痛點提出完整可行落地解法</div>
                  </button>
                </div>
              </div>

              {/* 第二階段可選擇引用之來源痛點 */}
              {formStage === 'solution' && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <label className="block font-bold text-amber-900">
                    採用之來源痛點提案（獲獎提案使用之痛點提出者可獲獎勵：價值$1500好禮，含1200點提問金）
                  </label>
                  <select
                    value={formSourcePainPointId}
                    onChange={(e) => setFormSourcePainPointId(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="">-- 自主原創解法（未採用特定痛點） --</option>
                    {painPointProposals.map((pp) => (
                      <option key={pp.id} value={pp.id}>
                        【{STAR_SEASON_TRACKS[pp.track]?.tag}】{pp.title} (by {pp.authorName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 賽道選擇 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1.5">專題賽道</label>
                <select
                  value={formTrack}
                  onChange={(e) => setFormTrack(e.target.value as StarSeasonTrack)}
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                >
                  {OFFICIAL_COMPETITION_TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 標題 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  提案標題 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="簡明扼要點出痛點或解法核心（20字內佳）"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 摘要 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  提案摘要 (100–200字) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="簡單說明痛點受眾、場景，或解方核心運作邏輯..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 詳細說明 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  詳細說明與執行架構 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="具體描述背景調查、技術構想、資源需求或預期成效..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 附件上傳 (PDF/ZIP/簡報) */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">提案企劃簡報或附件 (選填，限 20MB)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 border border-stone-200">
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isUploadingFile ? '上傳中...' : '選擇檔案'}</span>
                    <input
                      type="file"
                      accept=".pdf,.zip,.docx,.pptx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploadingFile}
                    />
                  </label>
                  {formAttachment && (
                    <span className="text-emerald-700 font-bold text-xs truncate max-w-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {formAttachment.name}
                    </span>
                  )}
                </div>
              </div>

              {/* 推廣大使推薦碼 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">推廣大使推薦碼 (選填)</label>
                <input
                  type="text"
                  value={formAmbassadorCode}
                  onChange={(e) => setFormAmbassadorCode(e.target.value)}
                  placeholder="例如：AMB-TAIWAN888（提案過審將為推薦大使記錄 300 點（價值 $400）IdeaX 平台點數，用於提問、享受付費服務）"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 敏感資料隔離區塊 (電話/身分證/銀行帳號，保證隔離) */}
              <div className="pt-3 border-t border-stone-200 space-y-3">
                <div className="flex items-center gap-1.5 text-stone-800 font-black text-xs">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>領獎與聯絡資料（安全私有隔離，絕對不公開）</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">
                      聯絡人姓名 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="真實姓名"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 mb-1">
                      聯絡電話 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="09xx-xxx-xxx"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 mb-1">
                      電子信箱 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">學校 / 機構</label>
                    <input
                      type="text"
                      value={schoolOrOrg}
                      onChange={(e) => setSchoolOrOrg(e.target.value)}
                      placeholder="例如：國立臺灣大學"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>

                  {formStage === 'solution' && (
                    <>
                      <div>
                        <label className="block text-stone-600 mb-1">銀行代號 (選填)</label>
                        <input
                          type="text"
                          value={bankCode}
                          onChange={(e) => setBankCode(e.target.value)}
                          placeholder="例如：822 (中國信託)"
                          className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 mb-1">撥款帳號 (選填)</label>
                        <input
                          type="text"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          placeholder="獲獎撥款用"
                          className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 規章與平台註冊提醒 */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-stone-600 leading-relaxed">
                📌 提交提醒：同意此競賽規章即同意註冊 IdeaX 創點子平台（ideax.tw），並同意由系統自動刊登與存取競賽期間提出的痛點或提案和討論內容。
              </div>

              {/* 提交按鈕 */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingProposal
                    ? (formStage === 'pain_point' ? '痛點發佈中...' : '提案提交中...')
                    : (formStage === 'pain_point' ? '確認送出痛點' : '確認提交提案')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 支持投點 Modal (純白卡片，金黃邊框，無黑色) */}
      {isSupportModalOpen && selectedProposalForSupport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>模擬募資支持投點</span>
              </h3>
              <button
                onClick={() => setIsSupportModalOpen(false)}
                className="text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                <div className="font-bold text-stone-900 line-clamp-2 break-words text-xs sm:text-sm">
                  {selectedProposalForSupport.title}
                </div>
                <div className="text-stone-500 text-[11px] mt-0.5">
                  提案人：{selectedProposalForSupport.authorName}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-medium shrink-0">可用創星幣：</span>
                  <span className="font-mono font-black text-amber-700 text-sm whitespace-nowrap">
                    {account?.availablePoints.toLocaleString() || 0} 創星幣
                  </span>
                </div>

                <div className="bg-white/95 p-3 rounded-xl border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                    <span className="font-bold text-stone-900 text-xs">單案最高注資上限</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200 font-bold whitespace-nowrap">
                      可以自我注資
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                      <div className="text-[11px] text-stone-500 font-medium">參賽者與一般用戶</div>
                      <div className="font-mono font-black text-stone-900 text-xs sm:text-sm mt-0.5 whitespace-nowrap">
                        50,000 <span className="text-[11px] font-sans font-bold text-stone-500">創星幣</span>
                      </div>
                    </div>
                    <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-200/70">
                      <div className="text-[11px] text-purple-700 font-medium">產學研專家</div>
                      <div className="font-mono font-black text-purple-900 text-xs sm:text-sm mt-0.5 whitespace-nowrap">
                        2,000,000 <span className="text-[11px] font-sans font-bold text-purple-600">創星幣</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1.5">支持額度 (創星幣)</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(Number(e.target.value))}
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-mono font-bold text-base focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[1000, 5000, 10000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSupportAmount(amt)}
                    className="py-1.5 px-1 rounded-lg bg-stone-100 hover:bg-amber-100 border border-stone-200 text-[11px] font-bold text-stone-700 cursor-pointer transition-colors whitespace-nowrap text-center"
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmSupport}
                  disabled={isSubmittingSupport}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingSupport ? '處理投點中...' : `確認支持 ${supportAmount.toLocaleString()} 點`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 管理員審核與頒獎 Modal (純白背景，紫色點綴) */}
      {adminReviewingProposal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-purple-300 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-purple-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <span>管理員提案審核與頒獎核定</span>
              </h3>
              <button
                onClick={() => setAdminReviewingProposal(null)}
                className="text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200">
                <div className="font-bold text-stone-900">{adminReviewingProposal.title}</div>
                <div className="text-stone-500 text-[11px] mt-1">目前狀態：{adminReviewingProposal.status}</div>
                <div className="text-stone-500 text-[11px]">
                  支持點數：{adminReviewingProposal.supportPoints.toLocaleString()} 點
                </div>
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1">審核備註</label>
                <textarea
                  rows={2}
                  value={adminReviewNote}
                  onChange={(e) => setAdminReviewNote(e.target.value)}
                  placeholder="審核意見或審查紀錄..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleAdminReview('approved')}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black cursor-pointer shadow-xs"
                >
                  審核通過 (Approved)
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminReview('rejected')}
                  className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black cursor-pointer shadow-xs"
                >
                  駁回 (Reject)
                </button>
              </div>

              {/* 最終得獎核定 */}
              <div className="pt-3 border-t border-stone-200 space-y-2">
                <div className="font-bold text-amber-800">專家評審核定得獎名次 (決選)</div>
                <div className="flex items-center gap-2">
                  <select
                    value={adminFinalRankInput}
                    onChange={(e) => setAdminFinalRankInput(Number(e.target.value))}
                    className="flex-1 bg-white border border-stone-300 rounded-xl p-2 text-stone-900 font-bold"
                  >
                    <option value={1}>冠軍 (價值 $30,000：現金 NT$20,000 + 8,000 點)</option>
                    <option value={2}>亞軍 (價值 $10,000：現金 NT$6,000 + 3,200 點)</option>
                    <option value={3}>季軍 (價值 $5,000：現金 NT$3,000 + 1,600 點)</option>
                    <option value={4}>入圍決選前 10 名 (授予創之星)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAdminConfirmAward}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black cursor-pointer shadow-xs"
                  >
                    確認頒獎
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 推廣大使推薦碼與名單專區 Modal */}
      {isAmbassadorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">推廣大使推薦碼專區</h3>
                  <p className="text-[11px] text-stone-500">推薦夥伴參賽享 300 點（價值 $400）推廣獎勵（IdeaX平台點數，用於提問、享受付費服務）</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAmbassadorModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingAmbassador ? (
              <div className="py-12 text-center text-stone-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                <p className="text-xs">載入推廣大使資料中...</p>
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* 1. 自己的推薦碼與專屬推廣分享 */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/60 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>您的專屬推廣大使代碼</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                      官方認證大使
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-amber-200">
                    <div className="font-mono font-black text-2xl text-stone-900 tracking-wider">
                      {ambassadorData?.referralCode || 'AMB-' + currentUser.id.toUpperCase().slice(-6)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const code = ambassadorData?.referralCode || 'AMB-' + currentUser.id.toUpperCase().slice(-6);
                          navigator.clipboard?.writeText(code).then(() => {
                            setCopiedAmbassadorCode(true);
                            showToast('已複製專屬推薦碼！');
                            setTimeout(() => setCopiedAmbassadorCode(false), 2000);
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        {copiedAmbassadorCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAmbassadorCode ? '已複製' : '複製代碼'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const code = ambassadorData?.referralCode || 'AMB-' + currentUser.id.toUpperCase().slice(-6);
                          const link = `https://ideax.tw/challenge?ref=${code}`;
                          navigator.clipboard?.writeText(link).then(() => {
                            setCopiedAmbassadorLink(true);
                            showToast('已複製專屬推廣連結！');
                            setTimeout(() => setCopiedAmbassadorLink(false), 2000);
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        {copiedAmbassadorLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{copiedAmbassadorLink ? '已複製連結' : '複製推薦連結'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 獎勵政策提示 */}
                  <div className="p-3 rounded-xl bg-white/80 border border-amber-200 text-stone-700 space-y-1">
                    <div className="font-black text-emerald-800 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-emerald-600" />
                      <span>每推薦 1 案審核通過，即享 300 點（價值 $400）推廣獎勵（IdeaX平台點數，用於提問、享受付費服務）！</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      邀請創客、個人或團隊於提案時填入您的推薦碼，或透過您的專屬連結投件，初審過審後獎勵自動計入結算名單。多推多得無上限！
                    </p>
                  </div>
                </div>

                {/* 2. 推廣績效儀表板 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                    <div className="text-[10px] text-stone-500 font-bold">累計推薦提案</div>
                    <div className="font-mono font-black text-lg text-stone-900 mt-0.5">
                      {ambassadorData?.totalReferred || 0} <span className="text-xs font-normal">件</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                    <div className="text-[10px] text-emerald-700 font-bold">審核通過件數</div>
                    <div className="font-mono font-black text-lg text-emerald-900 mt-0.5">
                      {ambassadorData?.approvedCount || 0} <span className="text-xs font-normal">件</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                    <div className="text-[10px] text-amber-800 font-bold">累計推廣點數</div>
                    <div className="font-mono font-black text-lg text-amber-900 mt-0.5">
                      {((ambassadorData?.approvedCount || 0) * 300).toLocaleString()} <span className="text-xs font-normal">點</span>
                    </div>
                  </div>
                </div>

                {/* 3. 輸入推薦碼 (綁定推薦人) */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                  <div className="font-black text-stone-900 flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5 text-amber-600" />
                    <span>輸入推薦碼（綁定您的推薦人）</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    若您是由特定推廣大使或夥伴推薦前來參賽，可在此輸入對方的推薦碼。解方提案通過初審時（非單純痛點提出），對方將獲得 300 點（價值 $400）推薦獎勵（IdeaX平台點數，用於提問、享受付費服務）！
                  </p>
                  <form onSubmit={handleBindReferral} className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={inputReferralCode}
                      onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                      placeholder="請輸入推薦碼 (例如: AMB-USER-XXXX)"
                      className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 font-mono uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isBindingReferral || !inputReferralCode.trim()}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                      {isBindingReferral ? '綁定中...' : '確認綁定'}
                    </button>
                  </form>
                </div>

                {/* 4. 推薦名單 (我的推薦過審清單) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-stone-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>推薦名單與審核進度</span>
                    </div>
                    <span className="text-[10px] text-stone-500">
                      共 {ambassadorData?.referrals?.length || 0} 筆推薦紀錄
                    </span>
                  </div>

                  {!ambassadorData?.referrals || ambassadorData.referrals.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1 text-stone-400">
                      <Users className="w-8 h-8 mx-auto text-stone-300 stroke-1" />
                      <p className="text-xs">目前尚無被推薦之提案紀錄</p>
                      <p className="text-[10px] text-stone-400">
                        趕快複製上方專屬推薦碼或分享連結，邀請身邊的創業團隊與同學投件吧！
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {ambassadorData.referrals.map((ref) => (
                        <div
                          key={ref.id}
                          className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-stone-900 truncate">
                              {ref.proposalTitle}
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-2">
                              <span>提案人：{ref.authorName}</span>
                              <span>•</span>
                              <span>{new Date(ref.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {ref.status === 'approved' ? (
                              <div className="space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                                  審核通過
                                </span>
                                <div className="font-mono font-black text-emerald-700 text-xs">
                                  +300 點
                                </div>
                              </div>
                            ) : ref.status === 'rejected' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 font-bold text-[10px]">
                                未通過
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                                  審核中
                                </span>
                                <div className="text-[10px] text-stone-400 font-medium">
                                  待核發
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 專屬報名中心 Modal (大專校院青年創新創業實戰模擬學習平台體驗規格：可選「參賽者」與「評審團」) */}
      {isRegistrationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">創星季 報名與申請中心</h3>
                  <p className="text-[11px] text-stone-500">參賽提案與評審團資格申請</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegistrationModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab 切換：參賽者 vs 評審團 */}
            <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setRegModalTab('participant')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  regModalTab === 'participant'
                    ? 'bg-amber-400 text-stone-950 font-black shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>參賽者報名</span>
              </button>
              <button
                type="button"
                onClick={() => setRegModalTab('judge')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  regModalTab === 'judge'
                    ? 'bg-purple-600 text-white font-black shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>成為專家 (專業專家團)</span>
              </button>
            </div>

            {/* Tab 1: 參賽者報名表單 */}
            {regModalTab === 'participant' && (
              <form onSubmit={handleSubmitParticipant} className="space-y-4 text-xs">
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-stone-700 leading-relaxed text-[11px]">
                  🌟 <b>參賽身分說明：</b>完成報名後，您的帳號將在舊站獲得「<b>創星季</b>」專屬榮譽徽章！提案將同步納入舊站「創點子/痛點」對應專區，並享有參賽專屬連結。
                </div>

                {/* 團隊與負責人基本資料 */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>參賽者 / 團隊成員資料</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">團隊或個人名稱 *</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="例如: 智創綠能隊 (個人可填姓名或稱號)"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">主要聯絡人 / 提案人姓名 *</label>
                      <input
                        type="text"
                        value={leaderName}
                        onChange={(e) => setLeaderName(e.target.value)}
                        placeholder="請填寫聯絡人姓名"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">聯絡電話 / 手機 *</label>
                      <input
                        type="tel"
                        value={leaderPhone}
                        onChange={(e) => setLeaderPhone(e.target.value)}
                        placeholder="0912-345-678"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">聯絡電子信箱</label>
                      <input
                        type="email"
                        value={leaderEmail}
                        onChange={(e) => setLeaderEmail(e.target.value)}
                        placeholder="team@example.com"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">就讀學校 / 任職單位 (選填)</label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="例如: 國立臺灣科技大學、XX科技公司或自由創客"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="star-modal-show-org-checkbox"
                          checked={showOrganizationOnCard}
                          onChange={(e) => setShowOrganizationOnCard(e.target.checked)}
                          className="rounded border-stone-300 text-amber-600 focus:ring-amber-400"
                        />
                        <label htmlFor="star-modal-show-org-checkbox" className="text-xs text-stone-600 cursor-pointer select-none">
                          <span className="font-bold text-stone-800">在卡片上顯示機構名稱</span>
                          <span className="text-[10px] text-stone-500 ml-1">（未勾選則卡片僅顯示團隊名稱）</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">系所 / 職稱 (選填)</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="例如: 資訊工程系、產品經理或工程師"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">指導顧問 / 業師 (選填)</label>
                      <input
                        type="text"
                        value={advisorName}
                        onChange={(e) => setAdvisorName(e.target.value)}
                        placeholder="例如: 林顧問 / 王業師 (無則免填)"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">團隊其他核心成員 (個人參賽免填)</label>
                      <input
                        type="text"
                        value={teamMembersInput}
                        onChange={(e) => setTeamMembersInput(e.target.value)}
                        placeholder="陳小明(UI設計), 李大華(技術開發)"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 提案內容與對接痛點 */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>提案主題與創新解方構想</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">參賽專案賽道 *</label>
                      <select
                        value={participantTrack}
                        onChange={(e) => setParticipantTrack(e.target.value as StarSeasonTrack)}
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-bold"
                      >
                        {OFFICIAL_COMPETITION_TRACKS.map((tr) => (
                          <option key={tr.id} value={tr.id}>
                            {tr.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">提案主題名稱 *</label>
                      <input
                        type="text"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        placeholder="提案名稱 (例: 智農 AI 蔬果病蟲害即時預警無人機)"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-bold focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  {/* 選擇採用來源痛點 */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      採用的來源痛點（解方發想基準，若無可自訂）
                    </label>
                    <select
                      value={participantSourcePainPointId}
                      onChange={(e) => setParticipantSourcePainPointId(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900"
                    >
                      <option value="">-- 發想全新解方或自定痛點 --</option>
                      {painPointProposals.map((pp) => (
                        <option key={pp.id} value={pp.id}>
                          【{STAR_SEASON_TRACKS[pp.track]?.tag}】{pp.title} ({pp.authorName})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-emerald-700 mt-1">
                      💡 採用平台痛點並獲評審前十名者，該痛點提出者將共享等值好禮獎勵（最高 $1,000）！
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">構想摘要 * (300字以內)</label>
                    <textarea
                      rows={2}
                      value={participantSummary}
                      onChange={(e) => setParticipantSummary(e.target.value)}
                      placeholder="簡述本提案欲解決之核心問題、目標客群與創新切入點..."
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">詳細執行方案與創新價值</label>
                    <textarea
                      rows={3}
                      value={participantDescription}
                      onChange={(e) => setParticipantDescription(e.target.value)}
                      placeholder="詳細說明產品功能、技術架構、市場競爭優勢與商業化落地計畫..."
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* 實戰佐證檔案與影音Demo */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>實戰成果展示與佐證檔案</span>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Demo展示影片連結 (YouTube / Drive)</label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtu.be/..."
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">贊助者回饋方案規劃</label>
                    <input
                      type="text"
                      value={rewardPlanDescription}
                      onChange={(e) => setRewardPlanDescription(e.target.value)}
                      placeholder="搶先體驗名額、限量紀念品、感謝白皮書"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900"
                    />
                  </div>

                  {/* 模擬檔案上傳 (BP 與 原型) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white rounded-xl border border-stone-300 space-y-2">
                      <div className="font-bold text-stone-800 text-[11px] flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>營運計畫簡報 (BP/Pitch Deck)</span>
                      </div>
                      {bpFile ? (
                        <div className="flex items-center justify-between bg-amber-50 p-2 rounded-lg text-[10px] text-amber-900">
                          <span className="truncate">{bpFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setBpFile(null)}
                            className="text-stone-400 hover:text-stone-700 ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBpFile({ url: 'https://example.com/bp.pdf', name: '創新提案計畫書.pdf', size: 2450000 })}
                          className="w-full py-2 border border-dashed border-stone-300 rounded-lg text-stone-500 hover:text-amber-700 hover:border-amber-400 text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>上傳簡報 PDF/PPT</span>
                        </button>
                      )}
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-300 space-y-2">
                      <div className="font-bold text-stone-800 text-[11px] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>產品原型 / 成果圖片</span>
                      </div>
                      {prototypeImgFile ? (
                        <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg text-[10px] text-emerald-900">
                          <span className="truncate">{prototypeImgFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setPrototypeImgFile(null)}
                            className="text-stone-400 hover:text-stone-700 ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrototypeImgFile({ url: 'https://example.com/prototype.jpg', name: '系統原型展示圖.png' })}
                          className="w-full py-2 border border-dashed border-stone-300 rounded-lg text-stone-500 hover:text-emerald-700 hover:border-emerald-400 text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>上傳成果展示圖</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 參賽意向調查與得知管道 */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>參賽意向與活動得知管道</span>
                    </div>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      主辦單位統計
                    </span>
                  </div>

                  {/* 問題一: 預計參加項目? 痛點or解方 (可複選) */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-stone-800 text-[11px]">
                      預計參加項目？（可複選） <span className="text-amber-600 font-semibold">痛點 or 解方</span>
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { id: '痛點', label: '🔥 痛點（提出真實痛點）' },
                        { id: '解方', label: '💡 解方（提交創新專案與企劃）' },
                      ].map((item) => {
                        const isChecked = participantExpectedItems.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-xs select-none ${
                              isChecked
                                ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-black shadow-2xs ring-1 ring-amber-300'
                                : 'bg-white border-stone-300 hover:border-stone-400 text-stone-700 font-medium'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setParticipantExpectedItems([...participantExpectedItems, item.id]);
                                } else {
                                  setParticipantExpectedItems(participantExpectedItems.filter((i) => i !== item.id));
                                }
                              }}
                              className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 shrink-0 cursor-pointer"
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-stone-600 leading-relaxed bg-amber-50/70 p-2 rounded-xl border border-amber-200 font-medium">
                      📌 <strong>備註說明：</strong>此填答僅為讓主辦單位提前了解全體參賽者分布，並不影響參賽權益，仍可一隊提多個痛點與多個解方。
                    </p>
                  </div>

                  {/* 問題二: 您從哪裡得知這場比賽? */}
                  <div className="space-y-1.5 pt-2 border-t border-stone-200/60">
                    <label className="block font-bold text-stone-800 text-[11px]">
                      您從哪裡得知這場比賽？ <span className="text-rose-500 font-bold">*</span> <span className="text-stone-400 font-normal">(單選)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        '獎金獵人',
                        'ACCUPASS',
                        '學校或創新中心',
                        '社群媒體',
                        '網路搜尋或瀏覽',
                        '網路廣告',
                        '朋友',
                        '其他',
                      ].map((source) => {
                        const isSelected = participantReferralSource === source;
                        return (
                          <button
                            type="button"
                            key={source}
                            onClick={() => setParticipantReferralSource(source)}
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] text-left transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-amber-500 text-stone-950 font-black border-amber-500 shadow-2xs ring-1 ring-amber-300'
                                : 'bg-white border-stone-300 hover:border-amber-300 hover:bg-stone-50 text-stone-700 font-medium'
                            }`}
                          >
                            <span>{source}</span>
                            {isSelected && <span className="text-stone-950 font-bold">✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {participantReferralSource === '其他' && (
                      <div className="pt-1.5">
                        <input
                          type="text"
                          value={participantReferralSourceOther}
                          onChange={(e) => setParticipantReferralSourceOther(e.target.value)}
                          placeholder="請說明其他得知管道（例如: 實體海報、系所公告信、社團推播...）"
                          className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 focus:outline-none focus:border-amber-400 text-xs font-medium"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 原創性承諾 */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="participantPledge"
                    checked={participantPledgeAgreed}
                    onChange={(e) => setParticipantPledgeAgreed(e.target.checked)}
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                    required
                  />
                  <label htmlFor="participantPledge" className="text-[11px] text-stone-600 cursor-pointer leading-relaxed">
                    我已閱讀並同意{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAboutModal('general_terms');
                      }}
                      className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
                    >
                      《IdeaX一般條款》
                    </button>
                    {' '}與{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCompetitionTermsDoc('C');
                      }}
                      className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
                    >
                      《創星季參賽者條款》
                    </button>
                    。
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingParticipant}
                    className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingParticipant ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>提交參賽資料中...</span>
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-4 h-4" />
                        <span>確認送出報名提案（獲得創星季徽章）</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: 評審團申請表單 (若已是創點子平台認證專家，直接享有競賽專家身分與權利，無需再填寫表單) */}
            {regModalTab === 'judge' && (
              (currentUser?.verifiedExpert || currentUser?.role === 'solver' || currentUser?.expertCertStatus === 'verified') ? (
                <div className="p-5 rounded-2xl bg-purple-50 border-2 border-purple-200 space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-black text-purple-950 text-sm">
                        👑 您已是創點子平台認證專家，直接享有競賽專家身分與權利！
                      </div>
                      <p className="text-stone-700 leading-relaxed">
                        系統已自動為您開通創星季競賽專家身分與 <strong>3,000,000 點創星幣投資額度</strong>（單案上限 2,000,000 點），<strong>無需再填寫報名競賽專家的表單</strong>。
                      </p>
                      <p className="text-stone-600 leading-relaxed pt-1">
                        ⚖️ <strong>專家與評審之區別：</strong>認證專家享有競賽專家投資與評論權利，但還不是複賽評審；複賽評審是由所有認證專家裡挑選出來的代表，負責評分入圍複賽作品。
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRegistrationModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs cursor-pointer"
                    >
                      我知道了
                    </button>
                  </div>
                </div>
              ) : (
              <form onSubmit={handleSubmitJudge} className="space-y-4 text-xs">
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 leading-relaxed text-[11px]">
                  👑 <b>專家資格權益：</b>審核通過轉為專家帳號，享有 <b>3,000,000 點</b>投資額度（單案上限 2,000,000），並同步錄入認證專家名單（複賽評審將由專家中挑選產生）！
                </div>

                {/* 評審基本資料 */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <UserIcon className="w-4 h-4 text-purple-600" />
                    <span>評審基本資訊</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">評審姓名 *</label>
                      <input
                        type="text"
                        value={judgeName}
                        onChange={(e) => setJudgeName(e.target.value)}
                        placeholder="請填寫真實中文姓名"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">聯絡電話 / 手機</label>
                      <input
                        type="tel"
                        value={judgePhone}
                        onChange={(e) => setJudgePhone(e.target.value)}
                        placeholder="0912-345-678"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">公務 / 聯絡信箱</label>
                      <input
                        type="email"
                        value={judgeEmail}
                        onChange={(e) => setJudgeEmail(e.target.value)}
                        placeholder="judge@institution.org.tw"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">專業審查領域</label>
                      <select
                        value={judgeDomain}
                        onChange={(e) => setJudgeDomain(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-bold"
                      >
                        <option value="AI 智慧與科技創新">AI 智慧與科技創新</option>
                        <option value="智慧物聯與硬體整合">智慧物聯與硬體整合</option>
                        <option value="永續綠能與循環經濟">永續綠能與循環經濟</option>
                        <option value="生活創新與商業模式">生活創新與商業模式</option>
                        <option value="新創早期投資與募資">新創早期投資與募資</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 服務單位、專業職稱與資格證明 (必要規範) */}
                <div className="space-y-3 p-4 rounded-2xl bg-purple-50/50 border border-purple-200">
                  <div className="font-bold text-purple-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>任職單位與專業證件證明 *</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">任職機構 / 服務單位 *</label>
                      <input
                        type="text"
                        value={judgeOrg}
                        onChange={(e) => setJudgeOrg(e.target.value)}
                        placeholder="例如: 國立臺灣大學 / 工研院 / 創投基金"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">現任職稱 *</label>
                      <input
                        type="text"
                        value={judgeJobTitle}
                        onChange={(e) => setJudgeJobTitle(e.target.value)}
                        placeholder="例如: 教授 / 研發總監 / 投資合夥人"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">專業年資</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={judgeExperienceYears}
                      onChange={(e) => setJudgeExperienceYears(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      專業證件、證照或相關專業證明說明 *
                    </label>
                    <textarea
                      rows={2}
                      value={judgeCredentialsNote}
                      onChange={(e) => setJudgeCredentialsNote(e.target.value)}
                      placeholder="請說明您的專業證書、部定教師證照、專利師/律師證照、創業輔導獲獎紀錄或相關機構聘任證明..."
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>

                  {/* 證件檔案模擬上傳 */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">上傳專業證件 / 單位在職證明圖檔</label>
                    {judgeProofFile ? (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-purple-300 text-purple-900">
                        <span className="font-bold">{judgeProofFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setJudgeProofFile(null)}
                          className="text-stone-400 hover:text-stone-700 ml-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setJudgeProofFile({ url: 'https://example.com/proof.pdf', name: '專業證件與在職證明文件.pdf' })}
                        className="w-full py-2.5 border border-dashed border-purple-300 bg-white rounded-xl text-purple-700 hover:bg-purple-50 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>上傳證件 / 證明文件 (PDF/JPG)</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">評審自介與審查輔導經歷</label>
                    <textarea
                      rows={2}
                      value={judgeBio}
                      onChange={(e) => setJudgeBio(e.target.value)}
                      placeholder="簡要自介，將顯示於舊站專家名單與創星季決選評審介紹..."
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                {/* 專家活動得知管道調查 */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>您從哪裡得知這場比賽？</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </div>
                    <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      主辦單位統計 (單選，必選)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    {[
                      '獎金獵人',
                      'ACCUPASS',
                      '學校或創新中心',
                      '社群媒體',
                      '網路搜尋或瀏覽',
                      '網路廣告',
                      '朋友',
                      '其他',
                    ].map((source) => {
                      const isSelected = judgeReferralSource === source;
                      return (
                        <button
                          type="button"
                          key={source}
                          onClick={() => setJudgeReferralSource(source)}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-purple-600 text-white font-black border-purple-600 shadow-2xs ring-1 ring-purple-300'
                              : 'bg-white border-stone-300 hover:border-purple-300 hover:bg-stone-50 text-stone-700 font-medium'
                          }`}
                        >
                          <span>{source}</span>
                          {isSelected && <span className="text-white font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {judgeReferralSource === '其他' && (
                    <div className="pt-1.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={judgeReferralSourceOther}
                        onChange={(e) => setJudgeReferralSourceOther(e.target.value)}
                        placeholder="請說明其他得知管道（例如: 官方邀請、同仁推薦、研討會宣傳...）"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 focus:outline-none focus:border-purple-400 text-xs font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* 公正保密承諾 */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="judgePledge"
                    checked={judgePledgeAgreed}
                    onChange={(e) => setJudgePledgeAgreed(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-400"
                    required
                  />
                  <label htmlFor="judgePledge" className="text-[11px] text-stone-600 cursor-pointer leading-relaxed">
                    我已閱讀並同意{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAboutModal('general_terms');
                      }}
                      className="text-purple-800 font-bold underline hover:text-purple-950 cursor-pointer"
                    >
                      《IdeaX一般條款》
                    </button>
                    {' '}與{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCompetitionTermsDoc('D');
                      }}
                      className="text-purple-800 font-bold underline hover:text-purple-950 cursor-pointer"
                    >
                      《創星季專家評審條款》
                    </button>
                    。
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingJudge}
                    className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingJudge ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>審核申請資料中...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>提交專家申請（同步錄入認證專家身分）</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
              )
            )}
          </div>
        </div>
      )}

      {/* 個人按讚 Like 名單 Modal */}
      {isFavoritesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-xl w-full p-6 space-y-4 my-8 max-h-[85vh] overflow-y-auto shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">我的個人 Like 提案清單</h3>
                  <p className="text-[11px] text-stone-500">按過愛心的參賽作品，隨時掌握募資進度</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFavoritesModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {proposals.filter((p) => likedProposalIds.includes(p.id)).length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Heart className="w-10 h-10 mx-auto text-stone-300 stroke-1" />
                  <p className="text-sm font-bold text-stone-600">目前尚無 Like 的提案</p>
                  <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                    在競賽提案列表點擊愛心圖示，即可將優秀的創意作品收錄至此，方便隨時追蹤與投點！
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {proposals
                    .filter((p) => likedProposalIds.includes(p.id))
                    .map((prop) => (
                      <div
                        key={prop.id}
                        className="p-3.5 rounded-2xl bg-stone-50 hover:bg-amber-50/40 border border-stone-200 hover:border-amber-300 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              {STAR_SEASON_TRACKS[prop.track]?.tag}
                            </span>
                            <span className="text-[10px] font-bold text-stone-500">
                              {prop.authorName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleLike(prop.id)}
                            className="text-rose-500 hover:text-stone-400 p-1 cursor-pointer"
                            title="取消 Like"
                          >
                            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                          </button>
                        </div>

                        <h4 className="font-bold text-stone-900 text-xs line-clamp-1">
                          {prop.title}
                        </h4>

                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-[11px]">
                          <span className="font-mono font-bold text-amber-700">
                            {prop.supportPoints?.toLocaleString() || 0} 點支持
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsFavoritesModalOpen(false);
                                navigateToSubView('proposal', prop.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 cursor-pointer"
                            >
                              完整頁面
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsFavoritesModalOpen(false);
                                setSelectedProposalForSupport(prop);
                                setIsSupportModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-400 text-stone-950 font-black hover:bg-amber-300 cursor-pointer"
                            >
                              支持投點
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 投稿創新idea 教學視窗 Modal */}
      {isProposalTutorialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            {/* 標題列 */}
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-2xs shrink-0">
                  <Send className="w-5 h-5 text-stone-950" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-950">
                    「我想提案!」參賽教學指南
                  </h3>
                  <p className="text-[11px] text-amber-800 font-bold">
                    快速完成提案，讓你的創新點子被市場看見
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProposalTutorialModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 獨立網址公告提示 */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 flex items-center gap-2.5 text-xs text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="font-bold">
                提案是在獨立網址專屬頁面進行：
                <span className="font-mono font-black text-amber-800 ml-1">ideax.tw/challenge/submit</span>
              </div>
            </div>

            {/* 教學流程卡片 */}
            <div className="space-y-4 text-xs">
              {/* 步驟 1 */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-stone-950 text-sm">
                      進入痛點區查看痛點，或是直接輸入「問題序號」開始提案
                    </h4>
                    <p className="text-stone-600 text-[11px] mt-1 leading-relaxed">
                      你可以前往「痛點許願池」探索大眾生活與產業目前尚未解決之真實問題；若已知題目序號，可直接在下方輸入快速啟動提案。
                    </p>
                  </div>
                </div>

                {/* 步驟 1 操作快捷按鍵 */}
                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProposalTutorialModalOpen(false);
                      onBackToOldSite();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Flame className="w-3.5 h-3.5 text-white" />
                    <span>進入痛點區查看痛點清單</span>
                  </button>

                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={quickPainPointSerial}
                      onChange={(e) => setQuickPainPointSerial(e.target.value)}
                      placeholder="輸入序號或痛點 (例: #01, q-1)"
                      className="flex-1 bg-white border border-stone-300 rounded-xl px-2.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsProposalTutorialModalOpen(false);
                        if (quickPainPointSerial.trim()) {
                          try {
                            sessionStorage.setItem('ideax_challenge_prefill_topic', JSON.stringify({
                              id: quickPainPointSerial.trim(),
                              title: `針對問題 ${quickPainPointSerial.trim()} 之解方`,
                              serial: quickPainPointSerial.trim(),
                            }));
                          } catch {}
                        }
                        if (!isLoggedIn) {
                          onOpenAuth();
                          return;
                        }
                        navigateToSubView('submit');
                      }}
                      className="py-2 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs cursor-pointer shadow-2xs shrink-0 transition-colors"
                    >
                      前往提案
                    </button>
                  </div>
                </div>

                {/* 前往提案主按鈕 */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProposalTutorialModalOpen(false);
                      if (quickPainPointSerial.trim()) {
                        try {
                          sessionStorage.setItem('ideax_challenge_prefill_topic', JSON.stringify({
                            id: quickPainPointSerial.trim(),
                            title: `針對問題 ${quickPainPointSerial.trim()} 之解方`,
                            serial: quickPainPointSerial.trim(),
                          }));
                        } catch {}
                      }
                      if (!isLoggedIn) {
                        onOpenAuth();
                        return;
                      }
                      navigateToSubView('submit');
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
                  >
                    <span>前往提案</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* 底部按鈕 */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-stone-500">
                提示：每案通過審核享 100,000 創星幣模擬募資起始金
              </span>
              <button
                type="button"
                onClick={() => setIsProposalTutorialModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold cursor-pointer transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理員專用：規章條款封存資料夾 Modal (僅管理員可見) */}
      {isAdminRulesFolderOpen && (currentUser?.role === 'admin' || currentUser?.accountType === 'admin') && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto my-6 rounded-3xl shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAdminRulesFolderOpen(false)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-stone-950/80 hover:bg-stone-950 text-white flex items-center justify-center cursor-pointer shadow-md transition-all"
              title="關閉資料夾"
            >
              <X className="w-4 h-4" />
            </button>
            <AdminCompetitionRulesArchiveFolder />
          </div>
        </div>
      )}

      {/* 管理員專用：懶人包檔案庫管理 Modal (存入與刪除檔案) */}
      {isAdminCheatSheetManagerOpen && (currentUser?.role === 'admin' || currentUser?.accountType === 'admin') && (
        <AdminCheatSheetFileManagerModal
          isOpen={isAdminCheatSheetManagerOpen}
          onClose={() => setIsAdminCheatSheetManagerOpen(false)}
        />
      )}

      {/* 決選評審專家工作台 Modal (邊看提案企劃詳情邊評分，暫存或統一送出) */}
      {isJudgeEvaluationModalOpen && evaluatingJudgeUser && (
        <JudgeEvaluationModal
          isOpen={isJudgeEvaluationModalOpen}
          onClose={() => setIsJudgeEvaluationModalOpen(false)}
          judgeUser={evaluatingJudgeUser}
          nominatedProposals={nominatedProposals}
          onScoresUpdated={() => {
            setIsFinalResultsPublishedState(getIsFinalResultsPublished());
          }}
        />
      )}

      {/* 1. 管理員專用：帳號身份賦權 Modal */}
      {isAdminUserManagementOpen && (currentUser?.role === 'admin' || currentUser?.accountType === 'admin') && (
        <AdminUserManagementModal
          isOpen={isAdminUserManagementOpen}
          onClose={() => setIsAdminUserManagementOpen(false)}
        />
      )}

      {/* 2. 管理員專用：提案審核 Modal */}
      {isAdminProposalReviewOpen && (currentUser?.role === 'admin' || currentUser?.accountType === 'admin') && (
        <AdminProposalReviewModal
          isOpen={isAdminProposalReviewOpen}
          onClose={() => setIsAdminProposalReviewOpen(false)}
          onNotify={showToast}
        />
      )}

      {/* 3. 管理員專用：決選評分總控制台 Modal */}
      {isAdminFinalEvaluationHubOpen && (currentUser?.role === 'admin' || currentUser?.accountType === 'admin') && (
        <AdminFinalEvaluationManagementModal
          isOpen={isAdminFinalEvaluationHubOpen}
          mode="evaluation"
          onClose={() => {
            setIsAdminFinalEvaluationHubOpen(false);
            setIsFinalResultsPublishedState(getIsFinalResultsPublished());
          }}
          proposals={proposals}
          onProposalsUpdated={() => {
            setIsFinalResultsPublishedState(getIsFinalResultsPublished());
          }}
          onOpenJudgeEvaluationAsUser={(judge) => {
            setEvaluatingJudgeUser(judge);
            setIsJudgeEvaluationModalOpen(true);
          }}
        />
      )}

      {/* 4. 管理員專用：獎勵統計與派發總控制台 Modal */}
      {isAdminRewardsHubOpen && (currentUser?.role === 'admin' || currentUser?.accountType === 'admin') && (
        <AdminFinalEvaluationManagementModal
          isOpen={isAdminRewardsHubOpen}
          mode="rewards"
          onClose={() => {
            setIsAdminRewardsHubOpen(false);
          }}
          proposals={proposals}
          onProposalsUpdated={() => {
            setIsFinalResultsPublishedState(getIsFinalResultsPublished());
          }}
          onOpenJudgeEvaluationAsUser={(judge) => {
            setEvaluatingJudgeUser(judge);
            setIsJudgeEvaluationModalOpen(true);
          }}
        />
      )}

      {/* 創星季競賽規章與條款說明彈窗 */}
      {competitionTermsDoc && (
        <CompetitionTermsModal
          isOpen={Boolean(competitionTermsDoc)}
          onClose={() => setCompetitionTermsDoc(null)}
          initialDoc={competitionTermsDoc}
        />
      )}

      {/* 創星季畫面中上「？」浮動教學導覽鍵 */}
      <FloatingStarSeasonGuide
        onOpenGuide={(role) => {
          if (role) setGuideRole(role);
          setIsGuideModalOpen(true);
        }}
      />

      {/* 創星季 30 秒三大角色極速導覽視窗 Modal */}
      <StarSeasonGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        initialRole={guideRole}
        onNavigateToExplore={() => navigateToSubView('proposal')}
        onNavigateToPainPoints={scrollToPainPointsBoard}
        onNavigateToSubmit={() => navigateToSubView('submit')}
        onOpenSubmitPainPoint={handleOpenPainPointSubmission}
        onBackToOldSite={onBackToOldSite}
      />
    </div>
  );
};

import { VibeCodingExhibitionView } from './components/VibeCodingExhibitionView';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CategoryFilter } from './components/CategoryFilter';
import { SubcategoryBoardBanner } from './components/SubcategoryBoardBanner';
import { QuestionCard } from './components/QuestionCard';
import { QuestionDetailModal } from './components/QuestionDetailModal';
import { SubmitAnswerModal } from './components/SubmitAnswerModal';
import { SolversView } from './components/SolversView';
import { JobExplorerView } from './components/JobExplorerView';
import { MechanismView } from './components/MechanismView';
import { AboutUsView } from './components/AboutUsView';
import { BaiMiaoZoneWalker } from './components/baimiao/BaiMiaoZoneWalker';
import { DuohuiPeek } from './components/agents/DuohuiPeek';
import { AboutUsModal } from './components/AboutUsModal';
import { AuthModal } from './components/AuthModal';
import { CustomerServiceModal } from './components/CustomerServiceModal';
import { GuestBoardGateBlurOverlay } from './components/GuestBoardGateBlurOverlay';
import { isGuestUser } from './utils/userDisplay';
import { CreateIdeasZoneView } from './components/CreateIdeasZoneView';
import { SpecialZonesTopBar } from './components/SpecialZonesTopBar';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobilePwaDownloadWidget } from './components/MobilePwaDownloadWidget';
import { PwaInstallModal } from './components/PwaInstallModal';
import { CenterToast } from './components/CenterToast';
import { SplashScreen } from './components/SplashScreen';
import { RatingModal } from './components/RatingModal';
import { HelpTooltip } from './components/HelpTooltip';
import { AppOnboardingGuide, ONBOARDING_STORAGE_KEY } from './components/AppOnboardingGuide';
import { NewVersionNotice } from './components/NewVersionNotice';
import { FloatingOnboardingCompass } from './components/FloatingOnboardingCompass';
import { GoogleSitelinksModal } from './components/GoogleSitelinksModal';
import { Category, ProblemLevel, Question, Solver, AppTab, QuestionSortOption, PostType, SpecialZone, UserDashboardTab, MarketViewMode } from './types';
import { isMockQuestionId } from './data/mockData';
import { isPainPointQuestion, isL0DiscussionQuestion, isVibeCodingAppQuestion } from './utils/questionUtils';
import { updateSEOForQuestion, updateSEOForSubpage, resetSEOToDefault, GOOGLE_SITELINKS, GoogleSitelinkItem } from './services/seoService';
import { trackPageView } from './utils/googleAnalytics';
import {
  recordUserSearchKeyword,
  recordUserBoard,
  recordUserSpecialZone,
  recordUserViewedQuestion,
  getUserInterestProfile,
  computeQuestionRecommendationScore,
  isUserInterestedInQuestionTopic,
  isQuestionExpired,
} from './services/recommendationService';
import { MessageSquarePlus, Sparkles, Filter, AlertCircle, Flame, MessageCircle, X, Users, ArrowRight, Pin, ShieldAlert, Lightbulb, HelpCircle, ChevronDown, ChevronUp, Search, Heart, ThumbsUp, Square, List, LayoutGrid } from 'lucide-react';
import { GUEST_VISIBLE_COUNT, GUEST_BLURRED_TEASER_COUNT, registerGuestListExposure } from './utils/guestAccess';
import { NotificationOptInPrompt } from './components/NotificationOptInPrompt';
import { MascotHost } from './components/mascot/MascotHost';
import { lazyNamed, preloadWhenIdle } from './utils/lazyNamed';

// 需要時才載入的頁面（程式碼分割）：縮小首頁第一次下載的檔案大小
const CreateQuestionModal = lazyNamed<typeof import('./components/CreateQuestionModal').CreateQuestionModal>(() => import('./components/CreateQuestionModal'), 'CreateQuestionModal');
const UnlockPaywallModal = lazyNamed<typeof import('./components/UnlockPaywallModal').UnlockPaywallModal>(() => import('./components/UnlockPaywallModal'), 'UnlockPaywallModal', { fallback: null });
const SolverProfileModal = lazyNamed<typeof import('./components/SolverProfileModal').SolverProfileModal>(() => import('./components/SolverProfileModal'), 'SolverProfileModal');
const LeaderboardView = lazyNamed<typeof import('./components/LeaderboardView').LeaderboardView>(() => import('./components/LeaderboardView'), 'LeaderboardView');
const MyProjectsView = lazyNamed<typeof import('./components/MyProjectsView').MyProjectsView>(() => import('./components/MyProjectsView'), 'MyProjectsView');
const UserDashboardModal = lazyNamed<typeof import('./components/UserDashboardModal').UserDashboardModal>(() => import('./components/UserDashboardModal'), 'UserDashboardModal');
const AdminDashboardModal = lazyNamed<typeof import('./components/AdminDashboardModal').AdminDashboardModal>(() => import('./components/AdminDashboardModal'), 'AdminDashboardModal');
const AiCrmView = lazyNamed<typeof import('./components/AiCrmView').AiCrmView>(() => import('./components/AiCrmView'), 'AiCrmView');
const MembershipAndTopupFullPage = lazyNamed<typeof import('./components/MembershipAndTopupFullPage').MembershipAndTopupFullPage>(() => import('./components/MembershipAndTopupFullPage'), 'MembershipAndTopupFullPage');
const ChatView = lazyNamed<typeof import('./components/ChatView').ChatView>(() => import('./components/ChatView'), 'ChatView');
const StarSeasonView = lazyNamed<typeof import('./components/challenge/StarSeasonView').StarSeasonView>(() => import('./components/challenge/StarSeasonView'), 'StarSeasonView');
// 首頁載入完成、瀏覽器閒置後，預先下載最常用的頁面（發布、創星季、私訊）
preloadWhenIdle([CreateQuestionModal.preload, StarSeasonView.preload, ChatView.preload]);

const CATEGORIES: Category[] = [
  '專業問題',
  '學術探討',
  '日常疑難',
];

/** 創點子提案獨立頁網址：/ideas/:id */
function parseIdeaDetailPath(): string | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/^\/ideas\/([^/?#]+)\/?$/i);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

function MainContent() {
  const {
    currentUser,
    openCustomerService,
    incrementQuestionViews,
    questions,
    solvers,
    answers,
    getQuestionSecondCount,
    selectedQuestion,
    setSelectedQuestion,
    selectedSolver,
    setSelectedSolver,
    targetAnswerToUnlock,
    setTargetAnswerToUnlock,
    isAboutModalOpen,
    aboutModalInitialSection,
    isPwaInstallModalOpen,
    closePwaInstallModal,
    closeAboutModal,
    searchQuery,
    setSearchQuery,
    searchMode,
    setSearchMode,
    availableUsers,
    startDirectChat,
    openAuthModal,
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    authModalMethod,
    authModalInterceptReason,
    addNotification,
    isDemoMode,
    isNoPaymentMode,
    isRaceMode,
    centerToast,
    hideCenterToast,
    promptLogin,
    isQuestionBookmarked,
    isQuestionSeconded,
    isQuestionLiked,
    isSameQuestionActive,
    bookmarkedQuestionIds,
    likedQuestionIds,
    secondedQuestionIds,
    sameQuestionIds,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedRedirect = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ideax_redirect_path') : '') || '';
        if (storedRedirect) {
          try {
            sessionStorage.removeItem('ideax_redirect_path');
            window.history.replaceState(null, '', storedRedirect);
          } catch {}
        }

        const targetPath = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        const redirectParam = (new URLSearchParams(window.location.search).get('redirect') || '').toLowerCase();

        // 0. 創點子/探索問題/痛點集/VibeCoding/L0討論區 子網址
        const normalizedPath = targetPath.replace(/\/+$/, '');
        if (parseIdeaDetailPath()) return 'explore';
        if (
          normalizedPath === '/explore' ||
          normalizedPath === '/painpoints' ||
          normalizedPath === '/pain-points' ||
          normalizedPath === '/painpoint' ||
          normalizedPath === '/pain-point' ||
          normalizedPath === '/l0-discussion' ||
          normalizedPath === '/l0_discussion' ||
          normalizedPath === '/l0' ||
          normalizedPath === '/discussions' ||
          normalizedPath === '/discussion' ||
          normalizedPath === '/vibecoding' ||
          normalizedPath === '/vibe-coding' ||
          normalizedPath === '/vibecoding-exhibition' ||
          normalizedPath === '/createideas' ||
          normalizedPath === '/create-ideas'
        ) {
          return 'explore';
        }

        // 0.1 痛點/問題/討論詳情子網址（必須帶有非空白題目 ID）
        const questionIdFromPath =
          (targetPath.includes('/question/') && (targetPath.split('/question/')[1]?.split(/[/?#]/)[0] || '').trim()) ||
          (targetPath.includes('/pain-point/') && (targetPath.split('/pain-point/')[1]?.split(/[/?#]/)[0] || '').trim()) ||
          (targetPath.includes('/painpoint/') && (targetPath.split('/painpoint/')[1]?.split(/[/?#]/)[0] || '').trim()) ||
          (targetPath.includes('/painpoints/') && (targetPath.split('/painpoints/')[1]?.split(/[/?#]/)[0] || '').trim()) ||
          (targetPath.includes('/discussion/') && (targetPath.split('/discussion/')[1]?.split(/[/?#]/)[0] || '').trim());

        const searchParamsForInit = new URLSearchParams(window.location.search);
        const qParamInit = searchParamsForInit.get('q') || searchParamsForInit.get('question') || '';
        const isExplicitQId =
          (qParamInit.startsWith('q-') ||
            qParamInit.startsWith('mock-') ||
            qParamInit.startsWith('question-') ||
            qParamInit.startsWith('vp-') ||
            qParamInit.startsWith('vibe-') ||
            qParamInit.startsWith('star-')) &&
          qParamInit.length >= 4;

        if (
          (questionIdFromPath && questionIdFromPath.length > 0) ||
          searchParamsForInit.get('questionId') ||
          searchParamsForInit.get('questionid') ||
          searchParamsForInit.get('question') ||
          isExplicitQId
        ) {
          return 'question_detail';
        }

        // 1. 發布懸賞與獨立專區發布子網址: /create, /vibecoding/publish, /vibecoding/create, /publish
        if (
          targetPath.includes('/create') ||
          targetPath.includes('/publish') ||
          search.includes('action=create') ||
          hash.includes('create')
        ) {
          return 'create_question';
        }

        // 2. 找專家子網址: /solvers
        if (targetPath.includes('/solvers') || search.includes('tab=solvers') || hash.includes('solvers')) {
          return 'solvers';
        }

        // 2.1 匯職缺子網址: /jobs, /job-explorer
        if (
          targetPath.includes('/jobs') ||
          targetPath.includes('/job-explorer') ||
          search.includes('tab=job_explorer') ||
          search.includes('tab=jobs') ||
          hash.includes('job_explorer') ||
          hash.includes('jobs')
        ) {
          return 'job_explorer';
        }

        // 2.5 我的案件獨立網址: /my-projects, /my_projects, /my-cases, /my_cases
        if (
          targetPath.includes('/my-projects') ||
          targetPath.includes('/my_projects') ||
          targetPath.includes('/my-cases') ||
          targetPath.includes('/my_cases') ||
          redirectParam.includes('/my-projects') ||
          redirectParam.includes('/my-cases') ||
          search.includes('tab=my_projects') ||
          search.includes('tab=my_cases') ||
          hash.includes('my-projects') ||
          hash.includes('my_projects') ||
          hash.includes('my-cases')
        ) {
          return 'my_projects';
        }

        // 3. 創星季子網址與捷徑: /challenge, /challenge/join, /challenge/expert, /challenge/proposals, /challenge/rules
        if (
          targetPath.includes('/challenge') ||
          redirectParam.includes('/challenge') ||
          targetPath.includes('/proposal') ||
          redirectParam.includes('/proposal') ||
          targetPath.includes('/cases') ||
          redirectParam.includes('/cases') ||
          targetPath.includes('/star-season') ||
          redirectParam.includes('/star-season') ||
          targetPath.includes('/competition') ||
          redirectParam.includes('/competition') ||
          targetPath.includes('/rules') ||
          targetPath.includes('/submit') ||
          targetPath.includes('/participant') ||
          targetPath.includes('/judge') ||
          targetPath.includes('/ambassador') ||
          search.includes('proposalid=') ||
          search.includes('proposal=') ||
          search.includes('p=') ||
          search.includes('tab=star_season') ||
          search.includes('tab=challenge') ||
          search.includes('tab=proposal') ||
          search.includes('tab=cases') ||
          search.includes('star-season') ||
          search.includes('view=rules') ||
          search.includes('view=proposal') ||
          search.includes('view=submit') ||
          search.includes('view=participant') ||
          search.includes('view=judge') ||
          search.includes('view=ambassador') ||
          hash.includes('rules') ||
          hash.includes('proposal') ||
          hash.includes('submit') ||
          hash.includes('participant') ||
          hash.includes('judge') ||
          hash.includes('ambassador') ||
          hash.includes('star_season') ||
          hash.includes('challenge')
        ) {
          return 'star_season';
        }

        // 4. 其他獨立子網址與分頁
        if (
          targetPath.includes('/membership') ||
          targetPath.includes('/plans') ||
          search.includes('tab=membership')
        ) {
          return 'membership';
        }
        if (
          targetPath.includes('/topup') ||
          targetPath.includes('/recharge') ||
          search.includes('tab=topup') ||
          search.includes('tab=recharge')
        ) {
          return 'topup';
        }
        if (targetPath.includes('/about') || /^\/agents\/?$/.test(targetPath) || search.includes('tab=about') || hash.includes('about')) {
          return 'about';
        }
        if (targetPath.includes('/leaderboard') || search.includes('tab=leaderboard') || hash.includes('leaderboard')) {
          return 'leaderboard';
        }
        if (targetPath.includes('/mechanism') || search.includes('tab=mechanism') || hash.includes('mechanism')) {
          return 'mechanism';
        }
        if (targetPath.includes('/my-projects') || targetPath.includes('/my_projects') || search.includes('tab=my_projects')) {
          return 'my_projects';
        }
        if (targetPath.includes('/chat') || search.includes('tab=chat')) {
          return 'chat';
        }
        if (targetPath.includes('/ai-crm') || targetPath.includes('/ai_crm') || search.includes('tab=ai_crm')) {
          return 'ai_crm';
        }
        if (targetPath.includes('/dashboard') || targetPath.includes('/user_dashboard') || search.includes('tab=user_dashboard')) {
          return 'user_dashboard';
        }
        if (targetPath.includes('/admin') || search.includes('tab=admin_dashboard')) {
          return 'admin_dashboard';
        }
      }
    } catch {}
    return 'explore';
  });
  const [userDashboardTab, setUserDashboardTab] = useState<UserDashboardTab>('overview');
  const [dashboardResetCount, setDashboardResetCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category | '全部'>('全部');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | '全部'>('全部');
  const [selectedLevel, setSelectedLevel] = useState<ProblemLevel | '全部'>('全部');
  const [showPainPointHelp, setShowPainPointHelp] = useState(false);
  const [showL0Help, setShowL0Help] = useState(false);
  const [showOnlyZoneFavorites, setShowOnlyZoneFavorites] = useState(false);
  const [specialZone, setSpecialZone] = useState<SpecialZone>(() => {
    try {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (
          pathname.includes('/vibecoding') ||
          pathname.includes('/vibe-coding') ||
          search.includes('zone=vibecoding') ||
          hash.includes('vibecoding')
        ) {
          return 'vibecoding';
        }
        if (
          pathname.startsWith('/ideas/') ||
          pathname.includes('/createideas') ||
          pathname.includes('/create-ideas') ||
          search.includes('zone=create_ideas') ||
          search.includes('create_ideas') ||
          hash.includes('create_ideas')
        ) {
          return 'create_ideas';
        }
        if (
          pathname.includes('/painpoints') ||
          pathname.includes('/pain-points') ||
          pathname.includes('/painpoint') ||
          search.includes('zone=pain_points') ||
          search.includes('pain_points') ||
          hash.includes('pain_points') ||
          hash.includes('painpoints')
        ) {
          return 'pain_points';
        }
        const normalizedPathname = pathname.replace(/\/+$/, '');
        if (
          normalizedPathname === '/l0-discussion' ||
          normalizedPathname === '/l0_discussion' ||
          normalizedPathname === '/l0' ||
          normalizedPathname === '/discussions' ||
          normalizedPathname === '/discussion' ||
          pathname.startsWith('/l0-discussion/') ||
          pathname.startsWith('/l0_discussion/') ||
          search.includes('zone=l0_discussion') ||
          search.includes('zone=l0') ||
          hash.includes('l0_discussion') ||
          hash.includes('l0-discussion')
        ) {
          return 'l0_discussion';
        }
      }
    } catch {}
    return 'all';
  });
  const [isSitelinksModalOpen, setIsSitelinksModalOpen] = useState(false);
  const [initialPostType, setInitialPostType] = useState<PostType>(() => {
    try {
      if (typeof window !== 'undefined') {
        const p = window.location.pathname.toLowerCase().replace(/\/+$/, '');
        if (
          p === '/vibecoding/publish' ||
          p === '/vibecoding/create' ||
          p === '/vibecoding-publish' ||
          p === '/publish/vibecoding' ||
          p === '/create/vibecoding'
        ) {
          return 'vibecoding_app';
        }
        if (p === '/painpoints/create' || p === '/painpoint/publish' || p === '/publish/painpoint') {
          return 'pain_point';
        }
        if (
          p === '/l0-discussion/create' ||
          p === '/l0-discussion/publish' ||
          p === '/l0_discussion/create' ||
          p === '/discussion/create' ||
          p === '/publish/discussion'
        ) {
          return 'chat_discussion';
        }
        if (p === '/createideas/publish' || p === '/proposal/publish' || p === '/publish/proposal') {
          return 'innovation_proposal';
        }
        const params = new URLSearchParams(window.location.search);
        const typeParam = params.get('type') || params.get('postType');
        if (typeParam === 'vibecoding_app' || typeParam === 'vibecoding') return 'vibecoding_app';
        if (typeParam === 'pain_point' || typeParam === 'painpoint') return 'pain_point';
        if (typeParam === 'innovation_proposal' || typeParam === 'proposal') return 'innovation_proposal';
        if (typeParam === 'chat_discussion' || typeParam === 'discussion') return 'chat_discussion';
      }
    } catch {}
    return 'seek_solution';
  });
  const [initialPublishIdentity, setInitialPublishIdentity] = useState<'admin' | 'platform'>('admin');
  // 問題市場排序方式：預設「最新」，之後按照用戶前一次使用的作為下次預設
  // （記憶欄位改用 v2，讓所有人先從「最新」開始）
  const [sortBy, setSortBy] = useState<QuestionSortOption>(() => {
    try {
      const saved = localStorage.getItem('ideax_market_sort_by_v2');
      if (
        saved === 'recruiting_promoted' ||
        saved === 'latest' ||
        saved === 'most_likes' ||
        saved === 'highest_tips' ||
        saved === 'most_solutions' ||
        saved === 'most_discussions' ||
        saved === 'highest_bounty'
      ) {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    return 'latest';
  });

  const handleSetSortBy = (option: QuestionSortOption) => {
    setSortBy(option);
    try {
      localStorage.setItem('ideax_market_sort_by_v2', option);
    } catch (e) {
      // ignore
    }
  };

  const [userProfileVersion, setUserProfileVersion] = useState(0);

  // 創點子提案獨立頁（/ideas/:id）：開啟時不顯示首頁 Hero 與專區列，整頁只放提案內容
  const [createIdeasDetailId, setCreateIdeasDetailId] = useState<string | null>(() => parseIdeaDetailPath());
  const openIdeaDetail = (proposalId: string) => {
    try {
      const fromList = !parseIdeaDetailPath();
      window.history.pushState({ ideaId: proposalId, ideaFromList: fromList || Boolean(window.history.state?.ideaFromList) }, '', `/ideas/${encodeURIComponent(proposalId)}`);
    } catch {}
    setSelectedQuestion(null);
    setSpecialZone('create_ideas');
    setActiveTab('explore');
    setCreateIdeasDetailId(proposalId);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const scrollToIdeasSearch = () => {
    let tries = 0;
    const go = () => {
      const el = document.getElementById('create-ideas-search');
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'center' });
      else if (tries++ < 20) setTimeout(go, 50);
    };
    setTimeout(go, 30);
  };
  // 離開創點子（切到其他分頁或專區）時關閉提案頁
  useEffect(() => {
    if (createIdeasDetailId && (activeTab !== 'explore' || specialZone !== 'create_ideas')) setCreateIdeasDetailId(null);
  }, [activeTab, specialZone]);

  /** 從提案頁返回：回到創點子列表的搜尋區 */
  const backToIdeasSearch = () => {
    setCreateIdeasDetailId(null);
    setSpecialZone('create_ideas');
    setActiveTab('explore');
    try {
      if (window.history.state?.ideaFromList) {
        // 從列表點進來的：用瀏覽器上一頁回去，避免多一筆歷史紀錄
        window.history.back();
      } else {
        window.history.pushState({ zone: 'create_ideas' }, '', '/?zone=create_ideas');
      }
    } catch {}
    scrollToIdeasSearch();
  };

  // 首次使用引導教學狀態（手動由頁尾、平台介紹或導覽點擊啟動）
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isOnboardingFromAbout, setIsOnboardingFromAbout] = useState(false);
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false);

  // 問題市場版面檢視模式（使用者沒自己選過時的預設）：
  // 電腦一律大卡片；手機版有圖片的看板用大卡片，痛點許願池與 L0 討論區（多半沒有圖片）用條列式
  const defaultViewModeFor = (zone: SpecialZone): MarketViewMode => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return 'large';
    return zone === 'pain_points' || zone === 'l0_discussion' ? 'list' : 'large';
  };
  const readSavedViewMode = (): MarketViewMode | null => {
    try {
      const saved = localStorage.getItem('ideax_market_view_mode');
      if (saved === 'large' || saved === 'list' || saved === 'grid') return saved;
    } catch (e) {
      // ignore
    }
    return null;
  };
  const [viewMode, setViewMode] = useState<MarketViewMode>(() => readSavedViewMode() || defaultViewModeFor(specialZone));

  // 切換看板時，沒自己選過檢視模式的人，跟著看板套用預設
  useEffect(() => {
    if (!readSavedViewMode()) setViewMode(defaultViewModeFor(specialZone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialZone]);

  const handleSetViewMode = (mode: MarketViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('ideax_market_view_mode', mode);
    } catch (e) {
      // ignore
    }
  };

  // 監聽並自動記錄個別用戶最近搜尋的關鍵字（防抖 600ms）
  useEffect(() => {
    // 檢查是否有來自 404.html 的 SPA 轉向，若有則恢復乾淨 URL
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('redirect=')) {
        try {
          const params = new URLSearchParams(search);
          const redirect = params.get('redirect');
          if (redirect) {
            window.history.replaceState(null, '', redirect);
          }
        } catch {}
      }
    }
  }, []);

  // 讀取來自搜尋引擎、Google Sitelinks Searchbox 或外部網址帶入的搜尋詞 (?q=xxx, ?search=xxx)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const queryTerm = params.get('q') || params.get('search') || params.get('keyword');
        const isQuestionId = queryTerm && (queryTerm.startsWith('q-') || queryTerm.startsWith('mock-') || queryTerm.startsWith('question-'));
        if (queryTerm && !isQuestionId && queryTerm.trim().length > 0) {
          const cleanTerm = queryTerm.trim();
          setSearchQuery(cleanTerm);
          setActiveTab('explore');
          setSelectedCategory('全部');
          setSelectedSubcategory('全部');
          setSpecialZone('all');
          setTimeout(() => {
            const el = document.getElementById('market-grid');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 120);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length >= 2) {
      const timer = setTimeout(() => {
        recordUserSearchKeyword(currentUser.id, trimmed);
        setUserProfileVersion((v) => v + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, currentUser.id]);

  const [pinnedBoard, setPinnedBoard] = useState<{ type: 'special_zone' | 'subcategory'; id: string; categoryName?: string } | null>(null);
  const [unpinConfirmOpen, setUnpinConfirmOpen] = useState(false);

  const handleSearchTag = (tag: string) => {
    const rawTag = tag.replace(/^#/, '').trim();
    setSearchQuery(rawTag);
    setActiveTab('explore');
    setSelectedQuestion(null);
    setSelectedSolver(null);
    setSelectedCategory('全部');
    setSelectedSubcategory('全部');
    setSpecialZone('all');
    recordUserSearchKeyword(currentUser.id, rawTag);
    setUserProfileVersion((v) => v + 1);
    setTimeout(() => {
      const el = document.getElementById('market-grid');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ideax_pinned_board');
      if (saved && saved !== 'unpinned') {
        const board = JSON.parse(saved);
        setPinnedBoard(board);
        // 僅在首頁根路徑且無特定子網址或查詢參數時套用釘選看板，避免重整子網址時被釘選看板覆蓋
        const curPath = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/+$/, '') : '';
        const curSearch = typeof window !== 'undefined' ? window.location.search : '';
        if ((curPath === '' || curPath === '/') && !curSearch) {
          if (board.type === 'special_zone') {
            setSpecialZone(board.id as SpecialZone);
            setSelectedCategory('全部');
            setSelectedSubcategory('全部');
          } else if (board.type === 'subcategory') {
            setSelectedCategory((board.categoryName as Category) || '全部');
            setSelectedSubcategory(board.id);
            setSpecialZone('all');
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [isRaceMode]);

  const performUnpin = () => {
    localStorage.setItem('ideax_pinned_board', 'unpinned');
    setPinnedBoard(null);
  };

  const handleTogglePin = (type: 'special_zone' | 'subcategory', id: string, categoryName?: string) => {
    if (pinnedBoard && pinnedBoard.type === type && pinnedBoard.id === id) {
      const skipPrompt = localStorage.getItem('ideax_unpin_skip_prompt') === 'true';
      if (skipPrompt) {
        performUnpin();
      } else {
        setUnpinConfirmOpen(true);
      }
    } else {
      const board = { type, id, categoryName };
      localStorage.setItem('ideax_pinned_board', JSON.stringify(board));
      setPinnedBoard(board);
      if (type === 'special_zone') {
        setSpecialZone(id as SpecialZone);
        setSelectedSubcategory('全部');
        recordUserSpecialZone(currentUser.id, id);
      } else {
        setSelectedCategory((categoryName as Category) || '全部');
        setSelectedSubcategory(id);
        setSpecialZone('all');
        recordUserBoard(currentUser.id, categoryName || '', id);
      }
      setUserProfileVersion((v) => v + 1);
    }
  };

  // 點選看板就要先關閉既有已經開啟的主題專區，並記錄至該用戶之看板瀏覽偏好
  const handleSelectCategory = (cat: Category | '全部') => {
    setSelectedCategory(cat);
    if (cat === '全部') {
      setSelectedSubcategory('全部');
    } else {
      recordUserBoard(currentUser.id, cat, '全部');
      setUserProfileVersion((v) => v + 1);
    }
    setSpecialZone('all');
  };

  const handleSelectSubcategory = (sub: string | '全部') => {
    setSelectedSubcategory(sub);
    if (sub !== '全部') {
      recordUserBoard(currentUser.id, selectedCategory, sub);
      setUserProfileVersion((v) => v + 1);
    }
    setSpecialZone('all');
  };

  const handleSelectSpecialZone = (zone: SpecialZone) => {
    setSpecialZone(zone);
    if (activeTab !== 'explore') {
      setActiveTab('explore');
    }
    setSelectedQuestion(null);
    setSelectedSolver(null);
    if (zone !== 'all') {
      recordUserSpecialZone(currentUser.id, zone);
      setUserProfileVersion((v) => v + 1);
    }
  };

  // 進入 /painpoints、/l0-discussion 專區或手機模式時，自動平滑滾動至市場區塊
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cur = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const isSpecialZonePath =
        cur === '/painpoints' ||
        cur === '/painpoint' ||
        cur === '/pain-points' ||
        cur === '/l0-discussion' ||
        cur === '/l0_discussion' ||
        cur === '/l0' ||
        cur === '/discussions' ||
        cur === '/discussion';
      if (isSpecialZonePath || window.innerWidth < 768) {
        const timer = setTimeout(() => {
          const el = document.getElementById('market-grid');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, isSpecialZonePath ? 150 : 500);
        return () => clearTimeout(timer);
      }
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    }
  }, []);

  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [submitInitialType, setSubmitInitialType] = useState<'discussion' | 'solution'>('solution');
  const [aboutPageSection, setAboutPageSection] = useState<string>(() => {
    try {
      if (/^\/(about\/)?agents\/?$/.test(window.location.pathname)) return 'ip_agents';
    } catch {}
    return 'others';
  });
  // 角色訊息框裡的「認識白喵」捷徑：打開關於 IdeaX 的「原創 IP 與 Agent」
  useEffect(() => {
    const openAgents = () => {
      setAboutPageSection('ip_agents');
      setActiveTab('about');
      try { window.history.pushState(null, '', '/about/agents'); } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('ideax_open_agents', openAgents);
    return () => window.removeEventListener('ideax_open_agents', openAgents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 當任何卡片、痛點或提案關聯點擊設定 selectedQuestion 時，自動進入貼文詳情全頁
  useEffect(() => {
    if (selectedQuestion && activeTab !== 'question_detail' && activeTab !== 'create_question') {
      setActiveTab('question_detail');
      setIsSubmittingAnswer(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedQuestion]);

  // 記錄前一次的分頁，僅在主要分頁切換時回到頁面最頂部（如 explore 切換至 star_season 或 solvers）
  // 在首頁內部選擇看板、切換主題專區 (specialZone) 或分類時，絕對不回滾至頁面最頂端，維持視角平順
  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevActiveTabRef.current !== activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      prevActiveTabRef.current = activeTab;
    }
    try {
      if (typeof window !== 'undefined') {
        const curPath = window.location.pathname.toLowerCase();
        if (activeTab === 'star_season') {
          if (!curPath.startsWith('/challenge') && !curPath.startsWith('/proposal')) {
            const searchStr = window.location.search;
            const target = searchStr ? `/challenge${searchStr}` : '/challenge';
            window.history.pushState({ tab: 'star_season' }, '', target);
          }
          if (curPath === '/challenge' || curPath === '/challenge/') {
            updateSEOForSubpage('challenge');
          } else if (curPath === '/challenge/rules') {
            updateSEOForSubpage('challenge_rules');
          } else if (curPath === '/challenge/join' || curPath === '/challenge/submit') {
            updateSEOForSubpage('challenge_join');
          } else if (curPath === '/challenge/expert' || curPath === '/challenge/judge') {
            updateSEOForSubpage('challenge_expert');
          } else if (curPath === '/challenge/proposals' || curPath === '/challenge/proposal') {
            updateSEOForSubpage('challenge_proposals');
          }
        } else if (activeTab === 'membership') {
          if (curPath !== '/membership') {
            window.history.pushState({ tab: 'membership' }, '', '/membership');
            updateSEOForSubpage('membership');
          }
        } else if (activeTab === 'topup') {
          if (curPath !== '/topup') {
            window.history.pushState({ tab: 'topup' }, '', '/topup');
            updateSEOForSubpage('topup');
          }
        } else if (activeTab === 'create_question') {
          if (initialPostType === 'vibecoding_app') {
            if (curPath !== '/vibecoding/publish' && curPath !== '/vibecoding/create' && curPath !== '/publish/vibecoding') {
              window.history.pushState({ tab: 'create_question', postType: 'vibecoding_app' }, '', '/vibecoding/publish');
              updateSEOForSubpage('vibecoding_publish');
            }
          } else if (initialPostType === 'pain_point') {
            if (curPath !== '/painpoints/create' && curPath !== '/painpoint/publish' && curPath !== '/publish/painpoint') {
              window.history.pushState({ tab: 'create_question', postType: 'pain_point' }, '', '/painpoints/create');
              updateSEOForSubpage('painpoints');
            }
          } else if (initialPostType === 'chat_discussion') {
            if (curPath !== '/l0-discussion/create' && curPath !== '/l0_discussion/create' && curPath !== '/discussion/create') {
              window.history.pushState({ tab: 'create_question', postType: 'chat_discussion' }, '', '/l0-discussion/create');
              updateSEOForSubpage('l0_discussion');
            }
          } else if (curPath !== '/create') {
            window.history.pushState({ tab: 'create_question' }, '', '/create');
            updateSEOForSubpage('create');
          }
        } else if (activeTab === 'solvers') {
          if (curPath !== '/solvers') {
            window.history.pushState({ tab: 'solvers' }, '', '/solvers');
            updateSEOForSubpage('solvers');
          }
        } else if (activeTab === 'job_explorer') {
          if (curPath !== '/jobs' && curPath !== '/job-explorer') {
            window.history.pushState({ tab: 'job_explorer' }, '', '/jobs');
          }
          updateSEOForSubpage('job_explorer');
        } else if (activeTab === 'chat') {
          if (curPath !== '/chat') {
            window.history.pushState({ tab: 'chat' }, '', '/chat');
          }
          updateSEOForSubpage('chat');
        } else if (activeTab === 'my_projects') {
          if (curPath !== '/my-projects' && curPath !== '/my-cases' && curPath !== '/my_projects' && curPath !== '/my_cases') {
            window.history.pushState({ tab: 'my_projects' }, '', '/my-projects');
          }
          updateSEOForSubpage('my_projects');
        } else if (activeTab === 'explore') {
          if (specialZone === 'vibecoding') {
            if (curPath !== '/vibecoding') {
              window.history.pushState({ zone: 'vibecoding' }, '', '/vibecoding');
            }
            updateSEOForSubpage('vibecoding');
          } else if (specialZone === 'pain_points') {
            if (curPath !== '/painpoints') {
              window.history.pushState({ zone: 'pain_points' }, '', '/painpoints');
            }
            updateSEOForSubpage('painpoints');
          } else if (specialZone === 'l0_discussion') {
            if (
              curPath !== '/l0-discussion' &&
              curPath !== '/l0_discussion' &&
              curPath !== '/l0' &&
              curPath !== '/discussions'
            ) {
              window.history.pushState({ zone: 'l0_discussion' }, '', '/l0-discussion');
            }
            updateSEOForSubpage('l0_discussion');
          } else if (specialZone === 'create_ideas') {
            if (curPath.startsWith('/ideas/')) {
              // 提案獨立頁：網址由開啟提案時設定
            } else if (curPath !== '/create-ideas' && curPath !== '/createideas' && !window.location.search.includes('zone=create_ideas')) {
              window.history.pushState({ zone: 'create_ideas' }, '', '/?zone=create_ideas');
            }
          } else if (curPath === '/explore') {
            updateSEOForSubpage('explore');
          } else if (
            specialZone === 'all' &&
            (curPath === '/painpoints' ||
              curPath === '/l0-discussion' ||
              curPath === '/l0_discussion' ||
              curPath === '/l0' ||
              curPath === '/discussions' ||
              curPath === '/discussion' ||
              curPath === '/vibecoding' ||
              curPath === '/create-ideas' ||
              curPath === '/createideas' ||
              curPath.startsWith('/vibecoding/') ||
              curPath.startsWith('/l0-discussion/') ||
              curPath === '/create' ||
              curPath === '/solvers' ||
              curPath === '/my-projects' ||
              curPath === '/my-cases' ||
              curPath === '/my_projects' ||
              curPath === '/my_cases' ||
              curPath.startsWith('/challenge'))
          ) {
            window.history.pushState({ tab: 'explore' }, '', '/');
            resetSEOToDefault();
          }
        }
      }
    } catch {}
  }, [activeTab, specialZone, initialPostType]);

  // Google Analytics (G-4VJ5394Y8K): 自動記錄 SPA 頁面與主題看板瀏覽
  useEffect(() => {
    try {
      const curPath = window.location.pathname + window.location.search + window.location.hash;
      trackPageView(curPath || '/', document.title);
    } catch {}
  }, [activeTab, specialZone, selectedQuestion?.id]);

  const handleNavigateToSitelink = (item: GoogleSitelinkItem) => {
    setSelectedQuestion(null);
    setSelectedSolver(null);

    if (item.id === 'explore') {
      setActiveTab('explore');
      setSpecialZone('all');
      setSelectedCategory('全部');
      setSelectedSubcategory('全部');
      try {
        window.history.pushState({ sitelink: 'explore' }, '', '/explore');
      } catch {}
      updateSEOForSubpage('explore');
      setTimeout(() => {
        const el = document.getElementById('market-grid');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else if (item.id === 'create') {
      setActiveTab('create_question');
      try {
        window.history.pushState({ sitelink: 'create' }, '', '/create');
      } catch {}
      updateSEOForSubpage('create');
    } else if (item.id === 'painpoints') {
      setActiveTab('explore');
      setSpecialZone('pain_points');
      setSelectedCategory('全部');
      setSelectedSubcategory('全部');
      try {
        window.history.pushState({ sitelink: 'painpoints' }, '', '/painpoints');
      } catch {}
      updateSEOForSubpage('painpoints');
      setTimeout(() => {
        const el = document.getElementById('market-grid');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else if (item.id === 'l0_discussion') {
      setActiveTab('explore');
      setSpecialZone('l0_discussion');
      setSelectedCategory('全部');
      setSelectedSubcategory('全部');
      try {
        window.history.pushState({ sitelink: 'l0_discussion' }, '', '/l0-discussion');
      } catch {}
      updateSEOForSubpage('l0_discussion');
      setTimeout(() => {
        const el = document.getElementById('market-grid');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else if (item.id === 'solvers') {
      setActiveTab('solvers');
      try {
        window.history.pushState({ sitelink: 'solvers' }, '', '/solvers');
      } catch {}
      updateSEOForSubpage('solvers');
    } else if (item.id === 'job_explorer') {
      setActiveTab('job_explorer');
      try {
        window.history.pushState({ sitelink: 'job_explorer' }, '', '/jobs');
      } catch {}
      updateSEOForSubpage('job_explorer');
    } else if (item.id === 'my_projects') {
      setActiveTab('my_projects');
      try {
        window.history.pushState({ sitelink: 'my_projects' }, '', '/my-projects');
      } catch {}
      updateSEOForSubpage('my_projects');
    } else if (item.id === 'challenge') {
      setActiveTab('star_season');
      try {
        window.history.pushState({ sitelink: 'challenge', subView: 'home' }, '', '/challenge');
        window.dispatchEvent(new CustomEvent('ideax_challenge_navigate', { detail: { subView: 'home' } }));
      } catch {}
      updateSEOForSubpage('challenge');
    } else if (item.id === 'challenge_join') {
      setActiveTab('star_season');
      try {
        window.history.pushState({ sitelink: 'challenge_join', subView: 'submit' }, '', '/challenge/join');
        window.dispatchEvent(new CustomEvent('ideax_challenge_navigate', { detail: { subView: 'submit' } }));
      } catch {}
      updateSEOForSubpage('challenge_join');
    } else if (item.id === 'challenge_expert') {
      setActiveTab('star_season');
      try {
        window.history.pushState({ sitelink: 'challenge_expert', subView: 'judge' }, '', '/challenge/expert');
        window.dispatchEvent(new CustomEvent('ideax_challenge_navigate', { detail: { subView: 'judge' } }));
      } catch {}
      updateSEOForSubpage('challenge_expert');
    } else if (item.id === 'challenge_proposals') {
      setActiveTab('star_season');
      try {
        window.history.pushState({ sitelink: 'challenge_proposals', subView: 'proposal' }, '', '/challenge/proposals');
        window.dispatchEvent(new CustomEvent('ideax_challenge_navigate', { detail: { subView: 'proposal' } }));
      } catch {}
      updateSEOForSubpage('challenge_proposals');
    } else if (item.id === 'challenge_rules') {
      setActiveTab('star_season');
      try {
        window.history.pushState({ sitelink: 'challenge_rules', subView: 'rules' }, '', '/challenge/rules');
        window.dispatchEvent(new CustomEvent('ideax_challenge_navigate', { detail: { subView: 'rules' } }));
      } catch {}
      updateSEOForSubpage('challenge_rules');
    }
  };

  // 監聽外部自訂事件以開啟 Google Sitelinks 捷徑預覽中心
  useEffect(() => {
    const handleOpenSitelinks = () => {
      setIsSitelinksModalOpen(true);
    };
    const handleNavigateSitelink = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const targetId = customEvent.detail?.id;
      if (!targetId) return;
      const found = GOOGLE_SITELINKS.find((s) => s.id === targetId);
      if (found) {
        handleNavigateToSitelink(found);
      }
    };
    const handleGlobalSearch = (e: Event) => {
      const q = (e as CustomEvent<{ query: string }>).detail?.query;
      if (typeof q === 'string') {
        const cleanTerm = q.trim();
        setSearchQuery(cleanTerm);
        setActiveTab('explore');
        setSelectedCategory('全部');
        setSelectedSubcategory('全部');
        setSpecialZone('all');
        setTimeout(() => {
          const el = document.getElementById('market-grid');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    };
    const handleSelectSpecialZone = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.zone) {
        setActiveTab('explore');
        setSpecialZone(detail.zone);
        setSelectedCategory('全部');
        setSelectedSubcategory('全部');
        setSelectedQuestion(null);
        const el = document.getElementById('market-grid');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('ideax_open_sitelinks', handleOpenSitelinks);
    window.addEventListener('ideax_navigate_sitelink', handleNavigateSitelink);
    window.addEventListener('ideax_global_search', handleGlobalSearch);
    window.addEventListener('ideax_select_special_zone', handleSelectSpecialZone);
    return () => {
      window.removeEventListener('ideax_open_sitelinks', handleOpenSitelinks);
      window.removeEventListener('ideax_navigate_sitelink', handleNavigateSitelink);
      window.removeEventListener('ideax_global_search', handleGlobalSearch);
      window.removeEventListener('ideax_select_special_zone', handleSelectSpecialZone);
    };
  }, []);

  // 小燈泡提醒新提案：點泡泡直接打開那篇貼文
  useEffect(() => {
    const onOpenQuestion = (e: Event) => {
      const id = String((e as CustomEvent).detail?.id || '');
      const found = id ? questions.find((q) => q.id === id) : undefined;
      if (!found) return;
      setSelectedSolver(null);
      setSelectedQuestion(found);
      setActiveTab('question_detail');
      try { window.history.pushState(null, '', `/?question=${found.id}`); } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('ideax:open-question', onOpenQuestion);
    return () => window.removeEventListener('ideax:open-question', onOpenQuestion);
  }, [questions]);

  // 小燈泡對話框的功能捷徑：只打開網站頁面（白名單），需要登入的頁面先請訪客登入
  useEffect(() => {
    const DASH_TABS = new Set(['points_receivables', 'subscriptions', 'profile', 'real_name_auth', 'expert_certification', 'customer_service_report']);
    const onMascotNavigate = (e: Event) => {
      const to = String((e as CustomEvent).detail?.to || '');
      const isGuest = currentUser.id === 'user-guest';
      const needLogin = to === 'my_projects' || to === 'ai_crm' || to.startsWith('dash:');
      if (needLogin && isGuest) { promptLogin('請先登入，才能打開這個頁面喔！'); return; }
      setSelectedQuestion(null);
      setSelectedSolver(null);
      if (to === 'explore') setActiveTab('explore');
      else if (to === 'solvers') setActiveTab('solvers');
      else if (to === 'job_explorer') setActiveTab('job_explorer');
      else if (to === 'headhunter') {
        try { sessionStorage.setItem('ideax_open_headhunter', '1'); } catch {}
        setActiveTab('solvers');
        window.setTimeout(() => window.dispatchEvent(new CustomEvent('ideax:open-headhunter')), 300);
      } else if (to === 'membership') setActiveTab('membership');
      else if (to === 'my_projects') setActiveTab('my_projects');
      else if (to === 'ai_crm') setActiveTab('ai_crm');
      else if (to.startsWith('dash:') && DASH_TABS.has(to.slice(5))) {
        setUserDashboardTab(to.slice(5) as any);
        setActiveTab('user_dashboard');
      } else return;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('ideax:mascot-navigate', onMascotNavigate);
    return () => window.removeEventListener('ideax:mascot-navigate', onMascotNavigate);
  }, [currentUser.id, promptLogin]);

  // Guest intercept: if guest tries to view personal center or my projects or create question, redirect to login
  useEffect(() => {
    if (currentUser.id === 'user-guest' && (activeTab === 'create_question' || activeTab === 'user_dashboard' || activeTab === 'my_projects')) {
      setActiveTab('explore');
      promptLogin('訪客模式請先登入帳號以繼續操作');
    }
  }, [currentUser.id, activeTab, promptLogin]);

  const prevSelectedQuestionIdRef = React.useRef<string | null>(null);

  // Read URL query parameter ?q= or ?questionId= or ?question= or /question/:id on load/change to support direct links & refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parseAndOpenQuestion = () => {
      let targetQId: string | null = null;

      const ideaId = parseIdeaDetailPath();
      setCreateIdeasDetailId(ideaId);
      if (ideaId) {
        setSelectedQuestion(null);
        setSpecialZone('create_ideas');
        setActiveTab('explore');
        return;
      }
      if (window.history.state?.zone === 'create_ideas' || new URLSearchParams(window.location.search).get('zone') === 'create_ideas') {
        // 從提案頁按上一頁回到列表時，停在搜尋區
        const el = document.getElementById('create-ideas-search');
        if (!el) setTimeout(() => document.getElementById('create-ideas-search')?.scrollIntoView({ block: 'center' }), 120);
      }
      
      const path = window.location.pathname;
      const normalizedPath = (path || '').toLowerCase().replace(/\/+$/, '');
      const searchParams = new URLSearchParams(window.location.search);
      const zoneParam = (searchParams.get('zone') || '').toLowerCase();
      const tabParam = (searchParams.get('tab') || '').toLowerCase();

      // 若當前子網址為痛點集或 L0 討論區專區，直接確保選取對應專區並重設題目選取
      if (
        normalizedPath === '/painpoints' ||
        normalizedPath === '/pain-points' ||
        normalizedPath === '/painpoint' ||
        normalizedPath === '/pain-point'
      ) {
        setSelectedQuestion(null);
        setActiveTab('explore');
        setSpecialZone('pain_points');
        return;
      }
      if (
        normalizedPath === '/l0-discussion' ||
        normalizedPath === '/l0_discussion' ||
        normalizedPath === '/l0' ||
        normalizedPath === '/discussions' ||
        normalizedPath === '/discussion'
      ) {
        setSelectedQuestion(null);
        setActiveTab('explore');
        setSpecialZone('l0_discussion');
        return;
      }

      // 1. Check pathname: /question/:id, /pain-point/:id, /discussion/:id
      if (path.includes('/question/')) {
        targetQId = (path.split('/question/')[1]?.split('/')[0]?.split('?')[0] || '').trim();
      } else if (path.includes('/pain-point/')) {
        targetQId = (path.split('/pain-point/')[1]?.split('/')[0]?.split('?')[0] || '').trim();
      } else if (path.includes('/painpoint/')) {
        targetQId = (path.split('/painpoint/')[1]?.split('/')[0]?.split('?')[0] || '').trim();
      } else if (path.includes('/painpoints/')) {
        targetQId = (path.split('/painpoints/')[1]?.split('/')[0]?.split('?')[0] || '').trim();
      } else if (path.includes('/discussion/')) {
        targetQId = (path.split('/discussion/')[1]?.split('/')[0]?.split('?')[0] || '').trim();
      }

      if (!targetQId || targetQId.length === 0) {
        targetQId = null;
      }

      // 2. Check search params: ?questionId=xxx or ?question=xxx or ?id=xxx or ?q=xxx
      if (!targetQId) {
        const candidateId =
          searchParams.get('questionId') ||
          searchParams.get('questionid') ||
          searchParams.get('question') ||
          searchParams.get('qid') ||
          searchParams.get('id');
        const qParam = searchParams.get('q');
        if (candidateId) {
          targetQId = candidateId;
        } else if (qParam) {
          const found = questions.find((q) => q.id === qParam);
          const looksLikeId =
            qParam.startsWith('q-') ||
            qParam.startsWith('mock-') ||
            qParam.startsWith('question-') ||
            qParam.startsWith('vp-') ||
            qParam.startsWith('vibe-') ||
            qParam.startsWith('star-');
          if (found) {
            targetQId = found.id;
          } else if (looksLikeId) {
            targetQId = qParam;
          } else if (qParam.trim().length > 0) {
            // 是搜尋關鍵字（來自 Google 搜尋引擎 Sitelinks Searchbox 或網址搜尋參數）
            setSearchQuery(qParam.trim());
            setActiveTab('explore');
            setSelectedCategory('全部');
            setSelectedSubcategory('全部');
            setSpecialZone('all');
          }
        }
      }

      // 3. Check hash: #questionId=xxx or #/question/xxx or #/pain-point/xxx
      if (!targetQId && window.location.hash) {
        const hashStr = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hashStr.startsWith('?') ? hashStr.slice(1) : hashStr);
        targetQId = hashParams.get('questionId') || hashParams.get('question') || hashParams.get('id');

        if (!targetQId && hashStr.includes('/question/')) {
          targetQId = hashStr.split('/question/')[1].split('/')[0].split('?')[0];
        } else if (!targetQId && hashStr.includes('/pain-point/')) {
          targetQId = hashStr.split('/pain-point/')[1].split('/')[0].split('?')[0];
        } else if (!targetQId && hashStr.includes('/discussion/')) {
          targetQId = hashStr.split('/discussion/')[1].split('/')[0].split('?')[0];
        }
      }

      if (targetQId) {
        const found = questions.find((q) => q.id === targetQId);
        if (found) {
          setSelectedQuestion(found);
          setActiveTab('question_detail');
          setIsSubmittingAnswer(false);
        }
        return;
      }

      // 若非題目詳情頁，同步瀏覽器網址至對應主分頁與子網址
      if (!targetQId) {
        setSelectedQuestion(null);
        if (
          normalizedPath === '/vibecoding' ||
          normalizedPath === '/vibe-coding' ||
          normalizedPath === '/vibecoding-exhibition' ||
          zoneParam === 'vibecoding'
        ) {
          setActiveTab('explore');
          setSpecialZone('vibecoding');
        } else if (
          normalizedPath === '/createideas' ||
          normalizedPath === '/create-ideas' ||
          zoneParam === 'create_ideas'
        ) {
          setActiveTab('explore');
          setSpecialZone('create_ideas');
        } else if (
          normalizedPath === '/painpoints' ||
          normalizedPath === '/pain-points' ||
          normalizedPath === '/painpoint' ||
          normalizedPath === '/pain-point' ||
          zoneParam === 'pain_points'
        ) {
          setActiveTab('explore');
          setSpecialZone('pain_points');
        } else if (
          normalizedPath === '/l0-discussion' ||
          normalizedPath === '/l0_discussion' ||
          normalizedPath === '/l0' ||
          normalizedPath === '/discussions' ||
          normalizedPath === '/discussion' ||
          zoneParam === 'l0_discussion' ||
          zoneParam === 'l0'
        ) {
          setActiveTab('explore');
          setSpecialZone('l0_discussion');
        } else if (
          normalizedPath === '/vibecoding/publish' ||
          normalizedPath === '/vibecoding/create' ||
          normalizedPath === '/publish/vibecoding' ||
          normalizedPath === '/create/vibecoding' ||
          normalizedPath === '/vibecoding-publish'
        ) {
          setActiveTab('create_question');
          setInitialPostType('vibecoding_app');
          setSpecialZone('vibecoding');
        } else if (
          normalizedPath === '/painpoints/create' ||
          normalizedPath === '/painpoint/publish' ||
          normalizedPath === '/publish/painpoint'
        ) {
          setActiveTab('create_question');
          setInitialPostType('pain_point');
          setSpecialZone('pain_points');
        } else if (
          normalizedPath === '/l0-discussion/create' ||
          normalizedPath === '/l0-discussion/publish' ||
          normalizedPath === '/l0_discussion/create' ||
          normalizedPath === '/discussion/create' ||
          normalizedPath === '/publish/discussion'
        ) {
          setActiveTab('create_question');
          setInitialPostType('chat_discussion');
          setSpecialZone('l0_discussion');
        } else if (normalizedPath === '/create' || normalizedPath === '/publish') {
          setActiveTab('create_question');
        } else if (normalizedPath === '/solvers' || tabParam === 'solvers') {
          setActiveTab('solvers');
        } else if (
          normalizedPath === '/jobs' ||
          normalizedPath === '/job-explorer' ||
          tabParam === 'job_explorer' ||
          tabParam === 'jobs'
        ) {
          setActiveTab('job_explorer');
        } else if (
          normalizedPath === '/my-projects' ||
          normalizedPath === '/my_projects' ||
          normalizedPath === '/my-cases' ||
          normalizedPath === '/my_cases' ||
          tabParam === 'my_projects' ||
          tabParam === 'my_cases'
        ) {
          setActiveTab('my_projects');
        } else if (
          normalizedPath.startsWith('/challenge') ||
          normalizedPath.startsWith('/rules') ||
          normalizedPath.startsWith('/proposal') ||
          normalizedPath.startsWith('/cases') ||
          normalizedPath.startsWith('/submit') ||
          normalizedPath.startsWith('/participant') ||
          normalizedPath.startsWith('/judge') ||
          normalizedPath.startsWith('/expert') ||
          normalizedPath.startsWith('/ambassador') ||
          tabParam === 'star_season' ||
          tabParam === 'challenge'
        ) {
          setActiveTab('star_season');
          let subView = 'home';
          if (normalizedPath.includes('/rules')) subView = 'rules';
          else if (normalizedPath.includes('/join') || normalizedPath.includes('/submit')) subView = 'submit';
          else if (normalizedPath.includes('/expert') || normalizedPath.includes('/judge')) subView = 'judge';
          else if (normalizedPath.includes('/proposal') || normalizedPath.includes('/cases')) subView = 'proposal';
          else if (normalizedPath.includes('/participant')) subView = 'participant';
          else if (normalizedPath.includes('/ambassador')) subView = 'ambassador';
          window.dispatchEvent(new CustomEvent('ideax_challenge_navigate', { detail: { subView } }));
        } else if (normalizedPath === '/about/agents' || normalizedPath === '/agents') {
          // 原創 IP 與 Agent 介紹頁
          setAboutPageSection('ip_agents');
          setActiveTab('about');
        } else if (normalizedPath === '/about' || tabParam === 'about') {
          setActiveTab('about');
        } else if (normalizedPath === '/leaderboard' || tabParam === 'leaderboard') {
          setActiveTab('leaderboard');
        } else if (normalizedPath === '/mechanism' || tabParam === 'mechanism') {
          setActiveTab('mechanism');
        } else if (normalizedPath === '/chat' || tabParam === 'chat') {
          setActiveTab('chat');
        } else if (normalizedPath === '/ai-crm' || normalizedPath === '/ai_crm' || tabParam === 'ai_crm') {
          setActiveTab('ai_crm');
        } else if (normalizedPath === '/user_dashboard' || normalizedPath === '/dashboard' || tabParam === 'user_dashboard') {
          setActiveTab('user_dashboard');
        } else if (normalizedPath === '/admin_dashboard' || normalizedPath === '/admin' || tabParam === 'admin_dashboard') {
          setActiveTab('admin_dashboard');
        } else if (normalizedPath === '/membership' || normalizedPath === '/plans' || tabParam === 'membership') {
          setActiveTab('membership');
        } else if (normalizedPath === '/topup' || normalizedPath === '/recharge' || tabParam === 'topup' || tabParam === 'recharge') {
          setActiveTab('topup');
        } else if (
          normalizedPath === '' ||
          normalizedPath === '/' ||
          normalizedPath === '/explore'
        ) {
          setActiveTab('explore');
        }
      }
    };

    parseAndOpenQuestion();

    window.addEventListener('popstate', parseAndOpenQuestion);
    window.addEventListener('hashchange', parseAndOpenQuestion);

    const handleOpenRecharge = () => {
      setSelectedQuestion(null);
      setSelectedSolver(null);
      setUserDashboardTab('points_receivables');
      setActiveTab('user_dashboard');
    };
    window.addEventListener('ideax_open_recharge', handleOpenRecharge);

    return () => {
      window.removeEventListener('popstate', parseAndOpenQuestion);
      window.removeEventListener('hashchange', parseAndOpenQuestion);
      window.removeEventListener('ideax_open_recharge', handleOpenRecharge);
    };
  }, [questions.length]);

  // Synchronize browser URL & dynamic SEO (Title, Description, Schema.org QAPage)
  useEffect(() => {
    updateSEOForQuestion(selectedQuestion, answers);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (selectedQuestion) {
        prevSelectedQuestionIdRef.current = selectedQuestion.id;
        if (url.searchParams.get('q') !== selectedQuestion.id) {
          url.searchParams.set('q', selectedQuestion.id);
          window.history.replaceState({}, '', url.toString());
        }
      } else if (prevSelectedQuestionIdRef.current) {
        // 僅當使用者從已開啟的題目關閉返回時，才清除網址上的題目參數（避免重整瞬間在讀取中把網址參數刪掉）
        prevSelectedQuestionIdRef.current = null;
        const curQ = url.searchParams.get('q');
        let changed = false;
        if (curQ) {
          url.searchParams.delete('q');
          changed = true;
        }
        if (url.searchParams.has('questionId')) {
          url.searchParams.delete('questionId');
          changed = true;
        }
        if (url.searchParams.has('question')) {
          url.searchParams.delete('question');
          changed = true;
        }
        if (url.pathname.startsWith('/question/') || url.pathname.startsWith('/pain-point/') || url.pathname.startsWith('/painpoint/') || url.pathname.startsWith('/discussion/')) {
          url.pathname = '/';
          changed = true;
        }
        if (changed) {
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [selectedQuestion?.id, answers.length]);

  // Filter & Sort questions with comprehensive search covering:
  // - 內文 (Question description, AI analysis, all answer freePreview / fullContent, meeting agendas, phase deliverables)
  // - 標題 (Question title, proposal titles)
  // - 問題 (Categories, subcategories, tags, problem levels, postTypes: 痛點/討論/解答, status)
  // - 人物帳號 (Author name, author ID/account, author title, answer solver name, solver ID, solver title, solvers directory)
  // 基礎有效問題池：已排除管理員下架、已過期之案件；若非測試環境（正式營運模式）則排除模擬數據
  const baseQuestions = useMemo(() => {
    const seenIds = new Set<string>();
    return (isDemoMode
      ? questions
      : questions.filter((q) => Boolean(q && q.id) && !isMockQuestionId(q.id, q.authorId))
    ).filter((q) => {
      if (!q || typeof q.id !== 'string' || !q.id.trim() || typeof q.title !== 'string' || !q.title.trim()) {
        return false;
      }
      if (seenIds.has(q.id)) return false;
      seenIds.add(q.id);

      // 1. 排除已被管理員下架的問題
      if (q.status === 'delisted') return false;

      // 2. 顯示出來的問題不包含過期的（以截止日當日 23:59:59 為最終截止線，過期不顯示；若處於測試示範模式或為示範題目則常態保留以供搜尋與展示）
      if (!isDemoMode && !isMockQuestionId(q.id, q.authorId) && isQuestionExpired(q.deadline)) {
        return false;
      }

      // 3. 已有人提案或接案的問題，只要期限還沒過一樣顯示
      return true;
    });
  }, [questions, isDemoMode]);

  // 各主分類看板之真實問題總數計算（解決非測試環境總題數是零但個別看板錯誤顯示數字之問題）
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      創新創業: 0,
      專業問題: 0,
      學術探討: 0,
      日常疑難: 0,
    };
    baseQuestions.forEach((q) => {
      if (counts[q.category] !== undefined) {
        counts[q.category]++;
      }
    });
    return counts;
  }, [baseQuestions]);

  const isQuestionSavedByUser = (qId: string) =>
    isQuestionBookmarked(qId) ||
    isQuestionSeconded(qId) ||
    isQuestionLiked(qId) ||
    isSameQuestionActive(qId);

  const allPainPointQuestions = useMemo(
    () => baseQuestions.filter(isPainPointQuestion),
    [baseQuestions]
  );
  const painPointsFavoriteCount = useMemo(
    () => allPainPointQuestions.filter((q) => isQuestionSavedByUser(q.id)).length,
    [allPainPointQuestions, bookmarkedQuestionIds, likedQuestionIds, secondedQuestionIds, sameQuestionIds]
  );

  const allL0Questions = useMemo(
    () => baseQuestions.filter(isL0DiscussionQuestion),
    [baseQuestions]
  );
  const l0FavoriteCount = useMemo(
    () => allL0Questions.filter((q) => isQuestionSavedByUser(q.id)).length,
    [allL0Questions, bookmarkedQuestionIds, likedQuestionIds, secondedQuestionIds, sameQuestionIds]
  );

  const subcategoryFavoriteCount = useMemo(() => {
    if (selectedCategory === '全部' || selectedSubcategory === '全部') return 0;
    return baseQuestions.filter(
      (q) =>
        q.category === selectedCategory &&
        (q.subcategory === selectedSubcategory || q.tags.includes(selectedSubcategory)) &&
        isQuestionSavedByUser(q.id)
    ).length;
  }, [baseQuestions, selectedCategory, selectedSubcategory, bookmarkedQuestionIds, likedQuestionIds, secondedQuestionIds, sameQuestionIds]);

  const filteredQuestions = useMemo(() => {
    const rawTerm = searchQuery.trim().toLowerCase();
    const qTerm = rawTerm.replace(/^#/, '').trim();

    return baseQuestions
      .filter((q) => {
        if (
          showOnlyZoneFavorites &&
          (specialZone === 'pain_points' ||
            specialZone === 'l0_discussion' ||
            (selectedCategory !== '全部' && selectedSubcategory !== '全部'))
        ) {
          if (!isQuestionSavedByUser(q.id)) return false;
        }

        const matchesCategory = selectedCategory === '全部' || q.category === selectedCategory;
        const matchesSubcategory =
          selectedSubcategory === '全部' ||
          q.subcategory === selectedSubcategory ||
          q.tags.includes(selectedSubcategory);
        const matchesLevel = selectedLevel === '全部' || q.level === selectedLevel;

        // Special zone filtering (此二分類與看板類型不衝突，痛點特性 > L0，優先歸屬創點子/痛點集)
        let matchesSpecialZone = true;
        if (specialZone === 'pain_points') {
          // 創點子/痛點集：所有透過提出痛點提出的問題和標註痛點/創點子的問題（優先歸屬創點子/痛點集）
          matchesSpecialZone = isPainPointQuestion(q);
        } else if (specialZone === 'l0_discussion') {
          // L0問題討論區：依規範，從「尋求解答」或「提出痛點」提出的問題，就算設定是L0也不要算入L0討論區或L0閒聊討論分類
          matchesSpecialZone = isL0DiscussionQuestion(q);
        } else if (specialZone === 'vibecoding') {
          // VibeCoding展場：僅展示軟體網站提案，嚴格排除痛點、討論、解方提案等其他類型
          matchesSpecialZone = isVibeCodingAppQuestion(q);
        }

        if (!matchesSpecialZone) return false;

        // 核心規則：推播的問題必須在其對應的主題出現，如果某位用戶不關注這個推播問題的主題那就不要把這個問題放在這位用戶的推薦推播名單
        // 注意：若用戶正在進行搜尋 (!qTerm 為 false)，則不套用此推播興趣過濾，保證關鍵字搜尋結果能完整呈現
        const isPromoted = q.status === 'open' && q.isFeatured;
        if (!qTerm && sortBy === 'recruiting_promoted' && isPromoted) {
          const profile = getUserInterestProfile(currentUser.id);
          const hasInterestHistory =
            profile.categories.length > 0 ||
            profile.subcategories.length > 0 ||
            profile.keywords.length > 0 ||
            profile.tags.length > 0 ||
            profile.specialZones.length > 0;

          if (hasInterestHistory) {
            const isInterested = isUserInterestedInQuestionTopic(q, profile);
            if (!isInterested) {
              return false;
            }
          }
        }

        if (!qTerm) {
          return matchesCategory && matchesSubcategory && matchesLevel;
        }

        // 1. 標題 (問題標題)
        const matchTitle = q.title.toLowerCase().includes(qTerm);

        // 2. 內文 (問題詳細背景說明與描述)
        const matchDescription = q.description.toLowerCase().includes(qTerm);

        // 3. 內文 (所有關聯解答方案與留言之內文、完整內容、交付大綱、附件名稱、多階段說明)
        const questionAnswers = answers.filter((a) => a.questionId === q.id);
        const matchAnswersContent = questionAnswers.some((a) => {
          const matchPreview = a.freePreview && a.freePreview.toLowerCase().includes(qTerm);
          const matchFull = a.fullContent && a.fullContent.toLowerCase().includes(qTerm);
          const matchDelivery = a.deliveryType && a.deliveryType.toLowerCase().includes(qTerm);
          const matchMeeting = a.meetingDetails && (
            a.meetingDetails.meetingAgenda.toLowerCase().includes(qTerm) ||
            a.meetingDetails.availableTimeSlots.toLowerCase().includes(qTerm)
          );
          const matchAtt = a.attachments && a.attachments.some((att) => att.name.toLowerCase().includes(qTerm));
          const matchPhases = a.phases && a.phases.some((ph) =>
            ph.title.toLowerCase().includes(qTerm) ||
            ph.description.toLowerCase().includes(qTerm) ||
            (ph.submittedContent && ph.submittedContent.toLowerCase().includes(qTerm))
          );
          return matchPreview || matchFull || matchDelivery || matchMeeting || matchAtt || matchPhases;
        });

        // 4. 問題 (主分類、次分類、標籤、問題等級、問題類型)
        const matchCategory =
          q.category.toLowerCase().includes(qTerm) ||
          (q.subcategory && q.subcategory.toLowerCase().includes(qTerm));
        const matchTags = q.tags.some((t) => t.toLowerCase().includes(qTerm));
        const matchLevel =
          q.level.toLowerCase().includes(qTerm) ||
          (qTerm === 'l0' && q.level === 'L0') ||
          (qTerm === 'l1' && q.level === 'L1') ||
          (qTerm === 'l2' && q.level === 'L2') ||
          (qTerm === 'l3' && q.level === 'L3') ||
          (qTerm === 'l4' && q.level === 'L4');
        const matchPostType =
          (q.postType === 'pain_point' && (qTerm.includes('痛點') || '痛點'.includes(qTerm))) ||
          (q.postType === 'chat_discussion' && (qTerm.includes('討論') || qTerm.includes('閒聊') || '閒聊'.includes(qTerm))) ||
          (q.postType === 'seek_solution' && (qTerm.includes('解答') || qTerm.includes('懸賞') || '懸賞'.includes(qTerm)));
        const matchStatus =
          (q.status === 'open' && (qTerm.includes('招募中') || qTerm.includes('進行中') || qTerm.includes('待解'))) ||
          (q.status === 'solved' && (qTerm.includes('已解決') || qTerm.includes('已採納')));

        // 5. 人物帳號 (提問者姓名、帳號 ID、頭銜)
        const matchAuthor =
          q.authorName.toLowerCase().includes(qTerm) ||
          q.authorId.toLowerCase().includes(qTerm) ||
          (q.authorTitle && q.authorTitle.toLowerCase().includes(qTerm));

        // 6. 人物帳號 (解答專家姓名、專家帳號 ID、專家職稱頭銜)
        const matchAnswerers = questionAnswers.some(
          (a) =>
            a.solverName.toLowerCase().includes(qTerm) ||
            a.solverId.toLowerCase().includes(qTerm) ||
            a.solverTitle.toLowerCase().includes(qTerm)
        );

        // 7. AI 分析內文與專家畫像維度
        const matchAI =
          q.aiAnalysis &&
          (q.aiAnalysis.summary.toLowerCase().includes(qTerm) ||
            q.aiAnalysis.solverProfileAdvice.toLowerCase().includes(qTerm) ||
            q.aiAnalysis.structuredNeed.some((n) => n.toLowerCase().includes(qTerm)));

        // 8. 智庫人物帳號連動（若搜尋某專家之帳號 ID、姓名、技能或簡介，關聯適配該領域問題）
        const matchedSolvers = solvers.filter((s) =>
          s.name.toLowerCase().includes(qTerm) ||
          s.id.toLowerCase().includes(qTerm) ||
          s.title.toLowerCase().includes(qTerm) ||
          (s.bio && s.bio.toLowerCase().includes(qTerm)) ||
          s.skills.some((sk) => sk.toLowerCase().includes(qTerm))
        );
        const matchSolverDomain = matchedSolvers.some(
          (s) =>
            s.id === q.authorId ||
            questionAnswers.some((a) => a.solverId === s.id) ||
            s.domain === q.category ||
            s.subcategory === q.subcategory
        );

        const matchesSearch =
          matchTitle ||
          matchDescription ||
          matchAnswersContent ||
          matchCategory ||
          matchTags ||
          matchLevel ||
          matchPostType ||
          matchStatus ||
          matchAuthor ||
          matchAnswerers ||
          matchAI ||
          matchSolverDomain;

        // 若是在「全部」分類且無特殊專區篩選時進行搜尋，直接以搜尋比對結果呈現
        if (selectedCategory === '全部' && selectedSubcategory === '全部' && specialZone === 'all') {
          return matchesLevel && matchesSearch;
        }

        // 若在特定看板下搜尋且有匹配，展示該看板結果；若看板無結果但全站有精準匹配，亦完整呈現避免空白
        const matchesCurrentFilter = matchesCategory && matchesSubcategory && matchesLevel && matchesSpecialZone;
        return (matchesCurrentFilter && matchesSearch) || matchesSearch;
      })
      .sort((a, b) => {
        // 搜尋時優先將與當前分類看板相符的題目排在最前
        if (qTerm && selectedCategory !== '全部') {
          const filterA = a.category === selectedCategory ? 1 : 0;
          const filterB = b.category === selectedCategory ? 1 : 0;
          if (filterB !== filterA) return filterB - filterA;
        }
        // 1. 推薦（推播問題置頂並注明「招募中」，推播問題與其餘問題一律嚴格按照時間由新到舊排序）
        if (sortBy === 'recruiting_promoted') {
          const isPromotedA = a.status === 'open' && a.isFeatured;
          const isPromotedB = b.status === 'open' && b.isFeatured;

          // 1. 推播問題優先排在推薦的最上面
          if (isPromotedA && !isPromotedB) {
            return -1;
          }
          if (!isPromotedA && isPromotedB) {
            return 1;
          }

          // 2. 若皆為推播問題（推播問題群內部），或皆為其餘問題，一律按照時間由新到舊（最新發布排最前）排序
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          if (timeB !== timeA) {
            return timeB - timeA;
          }
          return b.id.localeCompare(a.id);
        }

        // 最新發布（依時間由新到舊）
        if (sortBy === 'latest') {
          const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return diff !== 0 ? diff : b.id.localeCompare(a.id);
        }

        // 2. 最多解答（方案數最多）
        if (sortBy === 'most_solutions') {
          const aSolutions = answers.filter((ans) => ans.questionId === a.id && (ans.type === 'solution' || !ans.type)).length;
          const bSolutions = answers.filter((ans) => ans.questionId === b.id && (ans.type === 'solution' || !ans.type)).length;
          if (bSolutions !== aSolutions) {
            return bSolutions - aSolutions;
          }
          return b.answersCount - a.answersCount;
        }

        // 3. 熱烈討論（討論數）
        if (sortBy === 'most_discussions') {
          const aDiscussions = answers.filter((ans) => ans.questionId === a.id && ans.type === 'discussion').length;
          const bDiscussions = answers.filter((ans) => ans.questionId === b.id && ans.type === 'discussion').length;
          if (bDiscussions !== aDiscussions) {
            return bDiscussions - aDiscussions;
          }
          return b.views - a.views;
        }

        // 4. 最高懸賞
        if (sortBy === 'highest_bounty') {
          if (b.bounty !== a.bounty) {
            return b.bounty - a.bounty;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        // 5. 最高打賞
        if (sortBy === 'highest_tips') {
          const aTips = a.supportPoints || 0;
          const bTips = b.supportPoints || 0;
          if (bTips !== aTips) {
            return bTips - aTips;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        // 6. 最多回饋（依看板類型：+1 附議 / ❤️ Like / 👍 按讚）
        if (sortBy === 'most_likes') {
          const aScore = getQuestionSecondCount(a.id) + (a.likes || 0) + (a.sameQuestionCount || 0);
          const bScore = getQuestionSecondCount(b.id) + (b.likes || 0) + (b.sameQuestionCount || 0);
          if (bScore !== aScore) {
            return bScore - aScore;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    baseQuestions,
    questions,
    answers,
    solvers,
    selectedCategory,
    selectedSubcategory,
    selectedLevel,
    specialZone,
    sortBy,
    searchQuery,
    currentUser.id,
    userProfileVersion,
    isDemoMode,
    showOnlyZoneFavorites,
    bookmarkedQuestionIds,
    likedQuestionIds,
    secondedQuestionIds,
    sameQuestionIds,
  ]);

  // 搜尋專用：匹配專家智庫與全站人物帳號清單 (支援 ID 與姓名搜尋)
  const matchingSolvers = useMemo(() => {
    const qTerm = searchQuery.trim().toLowerCase();
    if (!qTerm) return [];

    const userMap = new Map<string, {
      id: string;
      name: string;
      avatar: string;
      title: string;
      domain?: string;
      role?: string;
      rating?: number;
      skills?: string[];
      bio?: string;
      isSolver?: boolean;
      solverObj?: any;
    }>();

    availableUsers.forEach((u) => {
      userMap.set(u.id, {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        title: u.title || (u.role === 'admin' ? '平台管理員' : u.role === 'solver' ? '解答專家' : '提問者'),
        domain: u.domain,
        role: u.role,
        skills: u.skills || [],
        bio: u.bio,
      });
    });

    solvers.forEach((s) => {
      const existing = userMap.get(s.id);
      if (existing) {
        existing.isSolver = true;
        existing.solverObj = s;
        if (s.title) existing.title = s.title;
        if (s.domain) existing.domain = s.domain;
        if (s.rating) existing.rating = s.rating;
        if (s.skills) existing.skills = s.skills;
      } else {
        userMap.set(s.id, {
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          title: s.title || '智庫專家',
          domain: s.domain,
          role: 'solver',
          rating: s.rating,
          skills: s.skills || [],
          bio: s.bio,
          isSolver: true,
          solverObj: s,
        });
      }
    });

    return Array.from(userMap.values()).filter((s) => {
      const matchName = s.name.toLowerCase().includes(qTerm);
      const matchId = s.id.toLowerCase().includes(qTerm);
      const matchTitle = s.title.toLowerCase().includes(qTerm);
      const matchBio = s.bio && s.bio.toLowerCase().includes(qTerm);
      const matchSkills = s.skills && s.skills.some((sk) => sk.toLowerCase().includes(qTerm));
      const matchDomain = s.domain && s.domain.toLowerCase().includes(qTerm);
      return (
        matchName ||
        matchId ||
        matchTitle ||
        matchBio ||
        matchSkills ||
        matchDomain
      );
    });
  }, [availableUsers, solvers, searchQuery]);

  const handleOpenCreateWithType = (type: PostType = 'seek_solution', identity?: 'admin' | 'platform') => {
    if (currentUser.id === 'user-guest') {
      promptLogin('訪客模式請先登入帳號以發布問題');
      return;
    }
    if (currentUser.isBlocked) {
      alert(`⚠️ 您的帳號已被管理員執行停權處分（原因：${currentUser.blockedReason || '違反平台規範'}），在解封前無法發布新問題或痛點！如有疑問請聯繫客服。`);
      return;
    }
    setInitialPostType(type);
    if (identity) {
      setInitialPublishIdentity(identity);
    }
    setActiveTab('create_question');

    try {
      if (typeof window !== 'undefined') {
        let targetPath = '/create';
        if (type === 'vibecoding_app') {
          targetPath = '/vibecoding/publish';
          updateSEOForSubpage('vibecoding_publish');
        } else if (type === 'pain_point') {
          targetPath = '/painpoints/create';
          updateSEOForSubpage('painpoints');
        } else if (type === 'chat_discussion') {
          targetPath = '/l0-discussion/create';
          updateSEOForSubpage('l0_discussion');
        } else {
          updateSEOForSubpage('create');
        }
        window.history.pushState({ tab: 'create_question', postType: type }, '', targetPath);
      }
    } catch {}
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-stone-50/50 flex flex-col font-['Noto_Sans_TC',sans-serif] text-stone-900 selection:bg-amber-200">
      {/* App 開啟淡入淡出畫面 (Splash Screen) */}
      <SplashScreen minDurationMs={1400} />

      {/* Navigation (在創星季獨立網站時隱藏舊站導覽列，保持獨立站體驗) */}
      {activeTab !== 'star_season' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedCategory={selectedCategory}
          setSelectedCategory={handleSelectCategory}
          selectedSubcategory={selectedSubcategory}
          setSelectedSubcategory={handleSelectSubcategory}
          specialZone={specialZone}
          setSpecialZone={handleSelectSpecialZone}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectSort={handleSetSortBy}
          onOpenCreateQuestion={() => handleOpenCreateWithType('seek_solution')}
          onOpenCreateQuestionWithType={handleOpenCreateWithType}
          onOpenUserDashboardTab={(tab, scrollSection) => {
            if (currentUser.id === 'user-guest') {
              promptLogin('訪客模式請先登入帳號以查看個人中心');
              return;
            }
            setUserDashboardTab(tab);
            setActiveTab('user_dashboard');
            setDashboardResetCount((prev) => prev + 1);
            if (scrollSection) {
              setTimeout(() => {
                const el = document.getElementById(scrollSection);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 180);
            }
          }}
          onOpenAiCrm={() => setActiveTab('ai_crm')}
          isCategorySidebarOpen={isCategorySidebarOpen}
          setIsCategorySidebarOpen={setIsCategorySidebarOpen}
          onStartOnboarding={() => setIsOnboardingOpen(true)}
          onNavigateToAbout={(section) => {
            setAboutPageSection(section || 'others');
            setActiveTab('about');
            setSelectedQuestion(null);
            setSelectedSolver(null);
          }}
        />
      )}

      {/* 帳號停權警告橫幅 */}
      {currentUser.isBlocked && (
        <div className="bg-rose-600 text-white px-4 py-3 shadow-md animate-in slide-in-from-top-2 z-30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-700 text-amber-300 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm">您的帳號已被平台管理員執行停權處分（封鎖中）</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-800 text-rose-100">限制操作</span>
                </div>
                <p className="text-rose-100 mt-0.5">
                  封鎖原因：<strong>{currentUser.blockedReason || '違反平台規範'}</strong>
                  {currentUser.blockedUntil && (
                    <span className="ml-2">
                      · 期限：<strong>{currentUser.blockedUntil === 'permanent' ? '永久封鎖' : `至 ${new Date(currentUser.blockedUntil).toLocaleString('zh-TW')}`}</strong>
                    </span>
                  )}
                  <span className="ml-2">· 停權期間無法發布問題、提交方案或發送私聊</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => openCustomerService({ subject: '帳號停權處分申訴' })}
              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-900 font-bold rounded-xl transition-colors shrink-0 text-center cursor-pointer shadow-xs"
            >
              聯繫客服申訴
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Page Views */}
      <main className="flex-1 pb-16 lg:pb-0">
        {/* 創點子提案獨立頁（/ideas/:id） */}
        {activeTab === 'explore' && createIdeasDetailId && (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-2 pb-12 sm:pb-16">
            <CreateIdeasZoneView
              detailProposalId={createIdeasDetailId}
              onSelectProposal={(proposal) => openIdeaDetail(proposal.id)}
              onBackFromDetail={backToIdeasSearch}
              onOpenCreateProposal={() => {
                setCreateIdeasDetailId(null);
                setActiveTab('star_season');
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('ideax_challenge_navigate', { detail: { subView: 'submit' } }));
                }, 0);
              }}
              onOpenAuth={() => openAuthModal('login')}
            />
          </div>
        )}

        {/* 1. Explore Tab: Market Grid & Hero */}
        {activeTab === 'explore' && !createIdeasDetailId && (
          <div className="relative">
            {/* Hero Section (探索問題上方區域往下延伸，具備溫潤微金流體光與緊湊銜接) */}
            <div className="relative bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-stone-50/40 pb-1 sm:pb-2">
              <HeroSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                onPostClick={() => handleOpenCreateWithType('seek_solution')}
                onPostPainPointClick={() => handleOpenCreateWithType('pain_point')}
                onFindExpertsClick={() => {
                  setActiveTab('solvers');
                  setSelectedQuestion(null);
                  setSelectedSolver(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onExploreClick={() => {
                  const el = document.getElementById('market-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onLeaderboardClick={() => {
                  handleSetSortBy('highest_bounty');
                  const el = document.getElementById('market-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>

            {/* Questions Market Grid Section */}
            <div id="market-grid" className="scroll-mt-20 max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-1.5 pb-12 sm:pt-2 sm:pb-16">
              <div className="space-y-3 sm:space-y-6">
                {/* 頂部特定主題專區切換列 (常駐置頂，手機版與電腦版皆完美適配無裁切，隨時切換) */}
                {/* 市場顧問白喵在專區框上緣走來走去 */}
                <div className="relative">
                <BaiMiaoZoneWalker />
                <SpecialZonesTopBar
                  currentZone={specialZone}
                  onSelectZone={handleSelectSpecialZone}
                  questions={questions}
                  showAllOption={true}
                  onOpenStarSeason={() => {
                    setSelectedQuestion(null);
                    setSelectedSolver(null);
                    setActiveTab('star_season');
                    try {
                      window.history.pushState(null, '', '/challenge');
                    } catch {}
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
                </div>

                {/* Special Zone Banners */}
                {specialZone === 'vibecoding' && (
                  <VibeCodingExhibitionView
                    onSelectApp={(app) => {
                      setSelectedQuestion(app);
                      setActiveTab('question_detail');
                    }}
                    onOpenCreateApp={() => handleOpenCreateWithType('vibecoding_app')}
                    onCloseZone={() => {
                      setSpecialZone('all');
                    }}
                    onTogglePin={() => handleTogglePin('special_zone', 'vibecoding')}
                    isPinned={pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'vibecoding'}
                    onSwitchZone={handleSelectSpecialZone}
                  />
                )}
                {specialZone === 'create_ideas' && (
                  <CreateIdeasZoneView
                    onSelectProposal={(proposal) => openIdeaDetail(proposal.id)}
                    onOpenCreateProposal={() => {
                      window.history.pushState(
                        { ideaxMain: true, tab: 'star_season', subView: 'submit' },
                        '',
                        '/challenge/submit'
                      );
                      setActiveTab('star_season');
                      setTimeout(() => {
                        window.dispatchEvent(
                          new CustomEvent('ideax_challenge_navigate', {
                            detail: { subView: 'submit' },
                          })
                        );
                      }, 50);
                    }}
                    onCloseZone={() => {
                      setSpecialZone('all');
                    }}
                    onTogglePin={() => handleTogglePin('special_zone', 'create_ideas')}
                    isPinned={pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'create_ideas'}
                    onOpenAuth={() => openAuthModal('login')}
                    onSwitchZone={handleSelectSpecialZone}
                  />
                )}

                {specialZone === 'pain_points' && (
                  <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-rose-500/10 via-rose-100/40 to-orange-50 border-2 border-rose-300 shadow-sm relative overflow-hidden animate-in fade-in duration-200">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-rose-200/40 rounded-full blur-2xl pointer-events-none" />

                    {/* 右上角叉叉按鈕：點擊回到全部問題 */}
                    <button
                      type="button"
                      onClick={() => {
                        setSpecialZone('all');
                        setShowOnlyZoneFavorites(false);
                      }}
                      className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-500 hover:text-stone-900 border border-rose-300 shadow-2xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="回到全部問題"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="relative z-10 space-y-2.5">
                      {/* 第一列：圖示 + 標題 + 釘選 + 數量 */}
                      <div className="flex items-center gap-2.5 flex-wrap pr-10">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                          <Flame className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                        </div>
                        <h1 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                          <span>痛點許願池</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePin('special_zone', 'pain_points')}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'pain_points'
                                ? 'bg-rose-600 text-white border border-rose-700 shadow-xs'
                                : 'bg-white hover:bg-stone-50 text-stone-400 hover:text-stone-700 border border-stone-200'
                            }`}
                            title={pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'pain_points' ? '取消釘選此專區' : '釘選為首頁專區'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'pain_points' ? 'fill-white' : ''}`} />
                          </button>
                          <span className="text-[11px] font-mono font-black text-rose-900 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
                            {allPainPointQuestions.length} 個切身痛點
                          </span>
                        </h1>
                      </div>

                      {/* 第二列：說明按鈕 (左) + 提出痛點 / 解方提案按鈕 (置右) */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPainPointHelp(!showPainPointHelp)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            showPainPointHelp
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white/90 hover:bg-white text-rose-900 border-rose-300'
                          }`}
                          title="點擊展開/收合專區說明"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>說明</span>
                          {showPainPointHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                window.history.pushState({ subView: 'proposal' }, '', '/challenge/proposals');
                              } catch {}
                              setActiveTab('star_season');
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('ideax_challenge_navigate', {
                                  detail: { subView: 'proposal' }
                                }));
                              }, 0);
                            }}
                            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-300 bg-white/90 hover:bg-white text-stone-700 hover:text-stone-950 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                            title="前往創星季查看解方提案"
                          >
                            <span>解方提案 ↗</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCreateWithType('pain_point')}
                            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 border-rose-600 bg-white text-rose-700 hover:bg-rose-600 hover:text-white active:bg-rose-700 active:text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>提出痛點</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 點擊展開之專區介紹 */}
                    {showPainPointHelp && (
                      <div className="relative z-10 mt-3 pt-3 border-t border-rose-200/80 space-y-1.5 animate-in fade-in duration-150">
                        <p className="text-xs font-medium text-stone-700 leading-relaxed">
                          {isRaceMode
                            ? "匯集真實生活與產業未解痛點。創星季競賽期間免費，開放給參賽團隊作為解題題目與共創解方。"
                            : "匯集真實生活與產業未解痛點。發布痛點徵集創新腦洞，各領域人才提供落地解法，由第三方金流安全託管拆款。"}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-rose-800 font-bold pt-0.5">
                          <span>生活產業痛點 · 創新孵化起點</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAboutPageSection('other_2');
                              setActiveTab('about');
                            }}
                            className="underline hover:text-rose-950 cursor-pointer"
                          >
                            查閱完整痛點機制 →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 篩選分類、我的按讚收藏、搜尋、排序與檢視切換 (與創點子 / VibeCoding 統一形式) */}
                    <div className="relative z-10 mt-3 pt-3 border-t border-rose-200/80 space-y-2">
                      {/* 上排：選擇分類下拉選單 (含全部分類) + 我的按讚收藏 */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                        <div className="relative">
                          <select
                            value={selectedCategory}
                            onChange={(e) => {
                              handleSelectCategory(e.target.value as Category | '全部');
                              handleSelectSubcategory('全部');
                              setShowOnlyZoneFavorites(false);
                            }}
                            className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400 ${
                              !showOnlyZoneFavorites
                                ? 'bg-rose-600 text-white border border-rose-600 shadow-xs'
                                : 'bg-white/90 text-stone-800 hover:bg-white border border-rose-300'
                            }`}
                          >
                            <option value="全部" className="bg-white text-stone-900 font-bold">
                              全部分類 ({allPainPointQuestions.length})
                            </option>
                            {(['創新創業', '專業問題', '學術探討', '日常疑難'] as Category[]).map((cat) => {
                              const count = allPainPointQuestions.filter((q) => q.category === cat).length;
                              return (
                                <option key={cat} value={cat} className="bg-white text-stone-900 font-bold">
                                  {cat} ({count})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowOnlyZoneFavorites(!showOnlyZoneFavorites)}
                          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            showOnlyZoneFavorites
                              ? 'bg-rose-600 text-white shadow-xs border border-rose-600'
                              : 'bg-white/90 text-stone-700 hover:bg-white border border-rose-200/90'
                          }`}
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono font-black leading-none shrink-0 ${
                              showOnlyZoneFavorites
                                ? 'bg-white text-rose-700'
                                : 'bg-rose-100 text-rose-700 border border-rose-300'
                            }`}
                          >
                            +1
                          </span>
                          <span className="truncate">我的附議 ({painPointsFavoriteCount})</span>
                        </button>
                      </div>

                      {/* 下排：搜尋框 + 排序下拉選單 + 卡片檢視切換 (大卡片/條列式/小卡片) */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5">
                        <div className="relative flex-1 min-w-[160px]">
                          <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜尋痛點標題、關鍵字或發布者..."
                            className="w-full pl-9 sm:pl-10 pr-7 py-2 sm:py-2.5 rounded-xl border border-rose-200 bg-white text-xs sm:text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0">
                          <select
                            value={sortBy}
                            onChange={(e) => handleSetSortBy(e.target.value as QuestionSortOption)}
                            className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-rose-200 bg-white text-xs sm:text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer shrink-0"
                          >
                            <option value="recruiting_promoted">🔥 熱門推薦</option>
                            <option value="latest">🆕 最新發布</option>
                            <option value="most_likes">🔥 +1 附議最多</option>
                            <option value="highest_tips">🪙 點數支持 高到低</option>
                            <option value="highest_bounty">💰 懸賞金額 高到低</option>
                            <option value="most_solutions">💡 方案數最多</option>
                            <option value="most_discussions">💬 討論數最多</option>
                          </select>

                          {/* 檢視模式切換 (大卡片 / 條列式 / 小卡片) */}
                          <div className="inline-flex rounded-xl bg-white/90 border border-rose-200 p-0.5 sm:p-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSetViewMode('large')}
                              className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                                viewMode === 'large'
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'text-stone-500 hover:text-stone-800'
                              }`}
                              title="大卡片模式"
                            >
                              <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetViewMode('list')}
                              className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                                viewMode === 'list'
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'text-stone-500 hover:text-stone-800'
                              }`}
                              title="條列式清單"
                            >
                              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetViewMode('grid')}
                              className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                                viewMode === 'grid'
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'text-stone-500 hover:text-stone-800'
                              }`}
                              title="小卡片（雙欄方格）"
                            >
                              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {specialZone === 'l0_discussion' && (
                  <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-sky-500/10 via-sky-100/40 to-blue-50 border-2 border-sky-300 shadow-sm relative overflow-hidden animate-in fade-in duration-200">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-sky-200/40 rounded-full blur-2xl pointer-events-none" />

                    {/* 右上角叉叉按鈕：點擊回到全部問題 */}
                    <button
                      type="button"
                      onClick={() => {
                        setSpecialZone('all');
                        setShowOnlyZoneFavorites(false);
                      }}
                      className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-500 hover:text-stone-900 border border-sky-300 shadow-2xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="回到全部問題"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="relative z-10 space-y-2.5">
                      {/* 第一列：圖示 + 標題 + 釘選 + 數量 */}
                      <div className="flex items-center gap-2.5 flex-wrap pr-10">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                          <MessageCircle className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                        </div>
                        <h1 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                          <span>L0 討論區 (免懸賞自由交流)</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePin('special_zone', 'l0_discussion')}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'l0_discussion'
                                ? 'bg-sky-600 text-white border border-sky-700 shadow-xs'
                                : 'bg-white hover:bg-stone-50 text-stone-400 hover:text-stone-700 border border-stone-200'
                            }`}
                            title={pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'l0_discussion' ? '取消釘選此專區' : '釘選為首頁專區'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'l0_discussion' ? 'fill-white' : ''}`} />
                          </button>
                          <span className="text-[11px] font-mono font-black text-sky-900 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-full">
                            {allL0Questions.length} 則免懸賞交流
                          </span>
                        </h1>
                      </div>

                      {/* 第二列：說明按鈕 (左) + 發起討論按鈕 (置右) */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setShowL0Help(!showL0Help)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            showL0Help
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-white/90 hover:bg-white text-sky-900 border-sky-300'
                          }`}
                          title="點擊展開/收合專區說明"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>說明</span>
                          {showL0Help ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCreateWithType('chat_discussion')}
                          className="ml-auto px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 border-sky-600 bg-white text-sky-700 hover:bg-sky-600 hover:text-white active:bg-sky-700 active:text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>發起討論</span>
                        </button>
                      </div>
                    </div>

                    {/* 點擊展開之專區介紹 */}
                    {showL0Help && (
                      <div className="relative z-10 mt-3 pt-3 border-t border-sky-200/80 space-y-1.5 animate-in fade-in duration-150">
                        <p className="text-xs font-medium text-stone-700 leading-relaxed">
                          無門檻日常交流、閒聊討論、觀點碰撞與輕量求助。完全免費公開，適合社群激盪與早期方向探索。
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-sky-800 font-bold pt-0.5">
                          <span>0 門檻自由交流 · 社群觀點激盪</span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('about')}
                            className="underline hover:text-sky-950 cursor-pointer"
                          >
                            查閱平台服務規範 →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 篩選分類、我的按讚收藏、搜尋、排序與檢視切換 (與創點子 / VibeCoding 統一形式) */}
                    <div className="relative z-10 mt-3 pt-3 border-t border-sky-200/80 space-y-2">
                      {/* 上排：選擇分類下拉選單 (含全部分類) + 我的按讚收藏 */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                        <div className="relative">
                          <select
                            value={selectedCategory}
                            onChange={(e) => {
                              handleSelectCategory(e.target.value as Category | '全部');
                              handleSelectSubcategory('全部');
                              setShowOnlyZoneFavorites(false);
                            }}
                            className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                              !showOnlyZoneFavorites
                                ? 'bg-sky-600 text-white border border-sky-600 shadow-xs'
                                : 'bg-white/90 text-stone-800 hover:bg-white border border-sky-300'
                            }`}
                          >
                            <option value="全部" className="bg-white text-stone-900 font-bold">
                              全部分類 ({allL0Questions.length})
                            </option>
                            {(['創新創業', '專業問題', '學術探討', '日常疑難'] as Category[]).map((cat) => {
                              const count = allL0Questions.filter((q) => q.category === cat).length;
                              return (
                                <option key={cat} value={cat} className="bg-white text-stone-900 font-bold">
                                  {cat} ({count})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowOnlyZoneFavorites(!showOnlyZoneFavorites)}
                          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            showOnlyZoneFavorites
                              ? 'bg-sky-600 text-white shadow-xs border border-sky-600'
                              : 'bg-white/90 text-stone-700 hover:bg-white border border-sky-200/90'
                          }`}
                        >
                          <ThumbsUp className={`w-4 h-4 shrink-0 ${showOnlyZoneFavorites ? 'fill-white text-white' : 'text-sky-600'}`} />
                          <span className="truncate">我的按讚 ({l0FavoriteCount})</span>
                        </button>
                      </div>

                      {/* 下排：搜尋框 + 排序下拉選單 + 卡片檢視切換 (大卡片/條列式/小卡片) */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5">
                        <div className="relative flex-1 min-w-[160px]">
                          <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜尋討論標題、關鍵字或發起人..."
                            className="w-full pl-9 sm:pl-10 pr-7 py-2 sm:py-2.5 rounded-xl border border-sky-200 bg-white text-xs sm:text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0">
                          <select
                            value={sortBy}
                            onChange={(e) => handleSetSortBy(e.target.value as QuestionSortOption)}
                            className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-sky-200 bg-white text-xs sm:text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer shrink-0"
                          >
                            <option value="recruiting_promoted">🔥 熱門推薦</option>
                            <option value="latest">🆕 最新發布</option>
                            <option value="most_likes">👍 按讚最多</option>
                            <option value="most_discussions">💬 討論數最多</option>
                            <option value="most_solutions">💡 方案數最多</option>
                            <option value="highest_tips">🪙 點數支持 高到低</option>
                          </select>

                          {/* 檢視模式切換 (大卡片 / 條列式 / 小卡片) */}
                          <div className="inline-flex rounded-xl bg-white/90 border border-sky-200 p-0.5 sm:p-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSetViewMode('large')}
                              className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                                viewMode === 'large'
                                  ? 'bg-sky-600 text-white shadow-2xs'
                                  : 'text-stone-500 hover:text-stone-800'
                              }`}
                              title="大卡片模式"
                            >
                              <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetViewMode('list')}
                              className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                                viewMode === 'list'
                                  ? 'bg-sky-600 text-white shadow-2xs'
                                  : 'text-stone-500 hover:text-stone-800'
                              }`}
                              title="條列式清單"
                            >
                              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetViewMode('grid')}
                              className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                                viewMode === 'grid'
                                  ? 'bg-sky-600 text-white shadow-2xs'
                                  : 'text-stone-500 hover:text-stone-800'
                              }`}
                              title="小卡片（雙欄方格）"
                            >
                              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unified Filter Controls */}
                {!(specialZone !== 'all' || (selectedCategory !== '全部' && selectedSubcategory !== '全部')) && (
                  <CategoryFilter
                    categories={CATEGORIES}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={handleSelectCategory}
                    selectedSubcategory={selectedSubcategory}
                    setSelectedSubcategory={handleSelectSubcategory}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedLevel={selectedLevel}
                    setSelectedLevel={setSelectedLevel}
                    sortBy={sortBy}
                    setSortBy={handleSetSortBy}
                    totalCount={filteredQuestions.length}
                    categoryCounts={categoryCounts}
                    viewMode={viewMode}
                    setViewMode={handleSetViewMode}
                  />
                )}

                {/* 相符人物與專家帳號 (搜尋時即時展示相符的人物帳號) */}
                {searchQuery.trim() && matchingSolvers.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-700" />
                        <h3 className="text-xs sm:text-sm font-black text-amber-950">
                          相符人物與專家帳號 ({matchingSolvers.length})
                        </h3>
                        <span className="text-[11px] text-amber-800 hidden sm:inline">
                          含帳號 ID、姓名、頭銜或專長標籤符合「{searchQuery}」
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('solvers')}
                        className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>查看全部專家名冊</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {matchingSolvers.slice(0, 4).map((solver, idx) => (
                        <div
                          key={`${solver.id || 'solver'}-${idx}`}
                          className="p-3 bg-white rounded-xl border border-amber-200/90 hover:border-amber-400 hover:shadow-sm transition-all flex flex-col justify-between gap-2 group"
                        >
                          <div
                            onClick={() => {
                              if (solver.solverObj) {
                                setSelectedSolver(solver.solverObj);
                                setActiveTab('solver_profile');
                              } else {
                                setSearchQuery(solver.id);
                              }
                            }}
                            className="flex items-center gap-2.5 cursor-pointer"
                          >
                            <img
                              src={solver.avatar}
                              alt={solver.name}
                              className="w-10 h-10 rounded-full object-cover border border-stone-200 group-hover:scale-105 transition-transform shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-xs text-stone-900 group-hover:text-amber-900 truncate">
                                  {solver.name}
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono">
                                  @{solver.id}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                {solver.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                {solver.domain && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-semibold">
                                    {solver.domain}
                                  </span>
                                )}
                                {solver.rating && (
                                  <span className="text-[10px] text-amber-600 font-bold">
                                    ★ {solver.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-stone-400 font-mono truncate">
                              ID: {solver.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser.id === solver.id) {
                                  alert('這是您自己的帳號！');
                                  return;
                                }
                                startDirectChat({
                                  id: solver.id,
                                  name: solver.name,
                                  avatar: solver.avatar,
                                  title: solver.title,
                                });
                                setActiveTab('chat');
                              }}
                              className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-bold text-[10px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                              <span>私聊</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 子領域專屬版面看板 (當選中特定子領域時顯示) */}
                {selectedCategory !== '全部' && selectedSubcategory !== '全部' && (
                  <SubcategoryBoardBanner
                    category={selectedCategory}
                    subcategory={selectedSubcategory}
                    totalQuestionsCount={filteredQuestions.length}
                    totalBountyAmount={isNoPaymentMode || !isDemoMode ? 0 : filteredQuestions.reduce((acc, q) => acc + q.bounty, 0)}
                    onOpenCreateQuestion={() => setActiveTab('create_question')}
                    onSelectCategory={(cat, sub = '全部') => {
                      handleSelectCategory(cat);
                      handleSelectSubcategory(sub);
                      setShowOnlyZoneFavorites(false);
                    }}
                    isPinned={pinnedBoard?.type === 'subcategory' && pinnedBoard?.id === selectedSubcategory}
                    onTogglePin={() => handleTogglePin('subcategory', selectedSubcategory, selectedCategory)}
                    onSearchTag={handleSearchTag}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortBy={sortBy}
                    setSortBy={handleSetSortBy}
                    viewMode={viewMode}
                    setViewMode={handleSetViewMode}
                    showOnlyFavorites={showOnlyZoneFavorites}
                    setShowOnlyFavorites={setShowOnlyZoneFavorites}
                    favoriteCount={subcategoryFavoriteCount}
                  />
                )}

                {/* Questions Grid (創點子專區與 VibeCoding 展場各自擁有專屬獨立展示視圖，不重複顯示一般市場問題卡片) */}
                {specialZone !== 'create_ideas' && specialZone !== 'vibecoding' && (
                  filteredQuestions.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-stone-300 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
                      {showOnlyZoneFavorites ? (
                        specialZone === 'l0_discussion' ? (
                          <ThumbsUp className="w-6 h-6 text-sky-600" />
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-black bg-rose-100 text-rose-700 border border-rose-300">
                            +1
                          </span>
                        )
                      ) : (
                        <Filter className="w-6 h-6" />
                      )}
                    </div>
                    <h3 className="font-bold text-base text-stone-900">
                      {showOnlyZoneFavorites
                        ? specialZone === 'pain_points'
                          ? '尚無附議的痛點'
                          : specialZone === 'l0_discussion'
                          ? '尚無按讚的討論'
                          : '尚無附議或按讚的問題'
                        : '沒有找到相符的問題'}
                    </h3>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      {showOnlyZoneFavorites
                        ? specialZone === 'l0_discussion'
                          ? '瀏覽 L0 討論時點擊卡片上的 👍，即可在此快速查看！'
                          : '瀏覽卡片時點擊 +1，即可自動加入此清單！'
                        : '試著放寬篩選條件或切換分類，或是成為第一個針對此主題提出懸賞提問的人！'}
                    </p>
                    <button
                      onClick={() => {
                        if (showOnlyZoneFavorites) {
                          setShowOnlyZoneFavorites(false);
                        } else {
                          setSelectedCategory('全部');
                          setSelectedSubcategory('全部');
                          setSelectedLevel('全部');
                          setSearchQuery('');
                          setSortBy('latest');
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {showOnlyZoneFavorites ? '返回全部列表' : '重置所有篩選'}
                    </button>
                  </div>
                ) : (
                  (() => {
                    const isGuest = isGuestUser(currentUser);
                    const visibleQuestions = isGuest ? filteredQuestions.slice(0, GUEST_VISIBLE_COUNT) : filteredQuestions;
                    if (isGuest) registerGuestListExposure(filteredQuestions);
                    const blurredQuestions = isGuest && filteredQuestions.length > GUEST_VISIBLE_COUNT ? filteredQuestions.slice(GUEST_VISIBLE_COUNT, GUEST_VISIBLE_COUNT + GUEST_BLURRED_TEASER_COUNT) : [];
                    const boardDisplayName =
                      specialZone === 'pain_points'
                        ? '痛點許願池'
                        : specialZone === 'l0_discussion'
                        ? 'L0 討論區'
                        : selectedSubcategory !== '全部'
                        ? `${selectedSubcategory} 看板`
                        : selectedCategory !== '全部'
                        ? `${selectedCategory} 看板`
                        : '問題市場';

                    return (
                      <>
                        <div
                          id="onboarding-step-5-cards"
                          className={
                            viewMode === 'grid'
                              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
                              : viewMode === 'list'
                              ? 'flex flex-col space-y-2.5 sm:space-y-3'
                              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                          }
                        >
                          {visibleQuestions.map((q, idx) => {
                            const questionAnswers = answers.filter((a) => a.questionId === q.id);
                            const solutionsCount = questionAnswers.filter((a) => a.type === 'solution' || !a.type).length;
                            const discussionsCount = questionAnswers.filter((a) => a.type === 'discussion').length;

                            return (
                              <QuestionCard
                                key={`${q.id || 'question'}-${idx}`}
                                question={q}
                                solutionsCount={solutionsCount}
                                discussionsCount={discussionsCount}
                                viewMode={viewMode}
                                onSelectCategory={(cat, sub) => {
                                  setSelectedCategory(cat);
                                  if (sub) setSelectedSubcategory(sub);
                                }}
                                onSearchTag={handleSearchTag}
                                onClick={() => {
                                  recordUserViewedQuestion(currentUser.id, q);
                                  setUserProfileVersion((v) => v + 1);
                                  setSelectedQuestion(q);
                                  setActiveTab('question_detail');
                                }}
                              />
                            );
                          })}
                        </div>

                        {isGuest && filteredQuestions.length > GUEST_VISIBLE_COUNT && (
                          <GuestBoardGateBlurOverlay
                            remainingCount={filteredQuestions.length - GUEST_VISIBLE_COUNT}
                            totalCount={filteredQuestions.length}
                            boardName={boardDisplayName}
                            onOpenAuth={() => openAuthModal('login')}
                            blurredPreviewChildren={
                              <div
                                className={
                                  viewMode === 'grid'
                                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
                                    : viewMode === 'list'
                                    ? 'flex flex-col space-y-2.5 sm:space-y-3'
                                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                                }
                              >
                                {blurredQuestions.map((q, idx) => (
                                  <QuestionCard
                                    key={`gate-blur-${q.id || 'question'}-${idx}`}
                                    question={q}
                                    solutionsCount={0}
                                    discussionsCount={0}
                                    viewMode={viewMode}
                                  />
                                ))}
                              </div>
                            }
                          />
                        )}
                      </>
                    );
                  })()
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 1.9 Job Explorer Tab: 匯職缺 (探險家 AI) */}
        {activeTab === 'job_explorer' && <JobExplorerView />}

        {/* 2. Solvers Tab: Certified Experts */}
        {activeTab === 'solvers' && (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-2 sm:pt-6 pb-8 sm:pb-10">
            <SolversView
              onSelectSolver={(solver) => {
                setSelectedSolver(solver);
                setActiveTab('solver_profile');
              }}
              onPostQuestionForSolver={(solver) => {
                setSelectedSolver(solver);
                setActiveTab('create_question');
              }}
              onOpenChat={() => {
                setActiveTab('chat');
              }}
              onNavigateToLeaderboard={() => {
                setActiveTab('leaderboard');
              }}
              onPostQuestion={() => handleOpenCreateWithType('seek_solution')}
              onOpenExpertCertification={() => {
                setUserDashboardTab('expert_certification');
                setActiveTab('user_dashboard');
              }}
            />
          </div>
        )}

        {/* 2.5 Star Season Tab: IdeaX 創星季 Innovation Challenge */}
        {activeTab === 'star_season' && (
          <StarSeasonView
            onBackToOldSite={() => {
              setActiveTab('explore');
              setSpecialZone('all');
              setSelectedCategory('全部');
              setSelectedSubcategory('全部');
              setSelectedQuestion(null);
              setSelectedSolver(null);
              try {
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/');
                }
              } catch {}
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToPainPoints={() => {
              setActiveTab('explore');
              setSpecialZone('pain_points');
              setSelectedCategory('全部');
              setSelectedSubcategory('全部');
              setSelectedQuestion(null);
              setSelectedSolver(null);
              try {
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/?zone=pain_points');
                }
              } catch {}
              // 自動平滑下滑至問題市場與痛點專區區域
              const scrollToQuestionsGrid = () => {
                const el = document.getElementById('market-grid');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              };
              scrollToQuestionsGrid();
              setTimeout(scrollToQuestionsGrid, 80);
              setTimeout(scrollToQuestionsGrid, 250);
              setTimeout(scrollToQuestionsGrid, 450);
            }}
            onOpenPainPointInChuangDianZi={(targetPainPoint: any) => {
              let foundQ: Question | undefined;
              if (typeof targetPainPoint === 'string') {
                foundQ = questions.find((q) => q.id === targetPainPoint || q.title === targetPainPoint || q.title.includes(targetPainPoint));
              } else if (targetPainPoint && targetPainPoint.id) {
                foundQ = questions.find((q) => q.id === targetPainPoint.id || q.title === targetPainPoint.title || q.title.includes(targetPainPoint.title));
                if (!foundQ && targetPainPoint.rawQuestion) {
                  foundQ = targetPainPoint.rawQuestion;
                }
              }

              if (!foundQ && targetPainPoint) {
                const titleStr = typeof targetPainPoint === 'string' ? targetPainPoint : (targetPainPoint.title || '痛點提問');
                const cleanTitle = titleStr.startsWith('【痛點】') ? titleStr : `【痛點】${titleStr}`;
                const descStr = targetPainPoint.description || targetPainPoint.summary || '此為創星季參賽者所提出之切身真實痛點問題，歡迎提供落地解決方案。';
                const catStr = targetPainPoint.category || '創新創業';
                const subStr = targetPainPoint.subcategory || '痛點許願池';
                const authName = targetPainPoint.authorName || '創星季參賽者';
                const authAvatar = targetPainPoint.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                const qId = targetPainPoint.id || `star-pain-${Date.now()}`;

                foundQ = {
                  id: qId,
                  title: cleanTitle,
                  description: descStr,
                  category: catStr as any,
                  subcategory: subStr,
                  level: 'L0',
                  bounty: 0,
                  views: targetPainPoint.views || 25,
                  viewsCount: targetPainPoint.views || 25,
                  likes: 8,
                  answersCount: targetPainPoint.solutionsCount || 0,
                  status: 'open',
                  postType: 'pain_point',
                  specialZone: 'pain_points',
                  tags: targetPainPoint.tags || ['痛點', '創星季', '徵點子'],
                  createdAt: new Date().toISOString(),
                  deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
                  authorId: 'participant-user',
                  authorName: authName,
                  authorAvatar: authAvatar,
                  isStarSeason: true,
                };
              }

              if (foundQ) {
                setSelectedQuestion(foundQ);
                setSpecialZone('pain_points');
                setSelectedCategory('全部');
                setSelectedSubcategory('全部');
                setSelectedSolver(null);
                setActiveTab('question_detail');
                try {
                  if (typeof window !== 'undefined') {
                    window.history.pushState(null, '', `/?question=${foundQ.id}`);
                  }
                } catch {}
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            onOpenAuth={() => openAuthModal('login', 'email')}
          />
        )}

        {/* 3. Mechanism Tab (轉向關於我們金流運作) */}
        {activeTab === 'mechanism' && (
          <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
            <AboutUsView
              onBack={() => setActiveTab('explore')}
              initialSection="finance"
              onStartOnboarding={() => {
                setIsOnboardingFromAbout(true);
                setActiveTab('explore');
                setIsOnboardingOpen(true);
              }}
              onNavigateToStarSeason={() => setActiveTab('star_season')}
            />
          </div>
        )}

        {/* 3.1 Leaderboard Tab: 交易榮譽榜 & 數據化激勵 */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-10">
            <LeaderboardView
              onSelectSolver={(solver) => {
                setSelectedSolver(solver);
                setActiveTab('solver_profile');
              }}
              onSelectQuestion={(qId: string) => {
                const found = questions.find((q) => q.id === qId);
                if (found) {
                  setSelectedQuestion(found);
                  setActiveTab('question_detail');
                }
              }}
              onNavigateToSolvers={() => {
                setActiveTab('solvers');
                setSelectedQuestion(null);
                setSelectedSolver(null);
              }}
            />
          </div>
        )}

        {/* 3.2 About Us Tab: 關於我們與條款三大項 */}
        {activeTab === 'about' && (
          <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
            <AboutUsView
              key={aboutPageSection}
              initialSection={aboutPageSection}
              onBack={() => setActiveTab('explore')}
              onStartOnboarding={() => {
                setIsOnboardingFromAbout(true);
                setActiveTab('explore');
                setIsOnboardingOpen(true);
              }}
            />
          </div>
        )}

        {/* 3.3 My Projects Tab: 我的案件專屬獨立頁面 */}
        {activeTab === 'my_projects' && (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-2 sm:pt-6 pb-6 sm:py-8">
            <MyProjectsView
              onOpenQuestion={(qId: string) => {
                const found = questions.find((q) => q.id === qId);
                if (found) {
                  setSelectedQuestion(found);
                  setActiveTab('question_detail');
                }
              }}
            />
          </div>
        )}

        {/* 4. Question Detail Full Page */}
        {activeTab === 'question_detail' && selectedQuestion && !isSubmittingAnswer && (
          <QuestionDetailModal
            isFullPage={true}
            question={selectedQuestion}
            onClose={() => {
              setSelectedQuestion(null);
              setActiveTab('explore');
            }}
            onNavigateToChallengeSubmit={(q) => {
              try {
                sessionStorage.setItem(
                  'ideax_challenge_prefill_topic',
                  JSON.stringify({
                    id: q.id,
                    title: q.title,
                    serial: q.id,
                    summary: q.description,
                  })
                );
                window.history.pushState({ subView: 'submit' }, '', '/challenge/submit');
              } catch {}
              setSelectedQuestion(null);
              setActiveTab('star_season');
            }}
            onOpenSubmitAnswer={(initialType) => {
              if (currentUser.id === 'user-guest') {
                promptLogin('訪客模式請先登入帳號以提出方案');
                return;
              }
              setSubmitInitialType(initialType || 'solution');
              setIsSubmittingAnswer(true);
            }}
            onSelectSolver={(solver) => {
              setSelectedSolver(solver);
              setActiveTab('solver_profile');
            }}
            onOpenChatWithUser={() => {
              setActiveTab('chat');
            }}
            onSelectCategory={(cat, sub = '全部') => {
              setSelectedCategory(cat);
              setSelectedSubcategory(sub);
              setSelectedQuestion(null);
              setActiveTab('explore');
            }}
            onSearchTag={handleSearchTag}
          />
        )}

        {/* 4.1 Submit Answer Full Page (under question) */}
        {activeTab === 'question_detail' && selectedQuestion && isSubmittingAnswer && (
          <SubmitAnswerModal
            isFullPage={true}
            question={selectedQuestion}
            initialType={submitInitialType}
            onClose={() => setIsSubmittingAnswer(false)}
            onSuccess={() => setIsSubmittingAnswer(false)}
          />
        )}

        {/* 5. Create Question Full Page */}
        {activeTab === 'create_question' && (
          <CreateQuestionModal
            isFullPage={true}
            initialPostType={initialPostType}
            initialPublishIdentity={initialPublishIdentity}
            initialCategory={selectedCategory !== '全部' ? selectedCategory : undefined}
            initialSubcategory={selectedSubcategory !== '全部' ? selectedSubcategory : undefined}
            onClose={() => setActiveTab('explore')}
            onSuccess={(newQ) => {
              setSelectedQuestion(newQ);
              setActiveTab('question_detail');
            }}
          />
        )}

        {/* 6. Solver Profile Full Page */}
        {activeTab === 'solver_profile' && selectedSolver && (
          <SolverProfileModal
            isFullPage={true}
            solver={selectedSolver}
            onClose={() => {
              setSelectedSolver(null);
              setActiveTab('solvers');
            }}
            onPostQuestion={(s) => {
              setSelectedSolver(s);
              setActiveTab('create_question');
            }}
            onOpenChat={() => {
              setActiveTab('chat');
            }}
          />
        )}

        {/* 7. User Dashboard & Personal Center Full Page */}
        {activeTab === 'user_dashboard' && (
          <UserDashboardModal
            key={`dashboard_${userDashboardTab}_${dashboardResetCount}`}
            initialTab={userDashboardTab}
            isFullPage={true}
            onClose={() => setActiveTab('explore')}
            onNavigateToTerms={() => setActiveTab('about')}
            onOpenAiCrm={() => setActiveTab('ai_crm')}
            onOpenQuestion={(qId) => {
              let found = questions.find((q) => q.id === qId);
              if (!found && qId === 'q-demo-dispute-1') {
                found = {
                  id: 'q-demo-dispute-1',
                  title: '高分子材料 TFDA 臨床申報專案諮詢履約爭議',
                  authorName: '張先生',
                  authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                  bounty: 6000,
                  category: '專業問題',
                  description: '解答方提供的第二階段送審補件清單未包含今年度衛福部最新格式，提問方申請裁定和解退款。目前由官方仲裁委員會審理中。',
                  status: 'open',
                  createdAt: '4 小時前',
                  views: 128,
                  answersCount: 1,
                  tags: ['生醫專利', 'TFDA', '法規諮詢', '履約爭議'],
                } as any;
              } else if (!found && qId === 'q-demo-dispute-2') {
                found = {
                  id: 'q-demo-dispute-2',
                  title: 'D2C 外送淨利模型試算表交付延遲申訴',
                  authorName: '李小姐',
                  authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                  bounty: 4500,
                  category: '創新創業',
                  description: '解答方承諾之財務模型延遲交付超過約定時限 48 小時，申請和解裁決。',
                  status: 'open',
                  createdAt: '1 天前',
                  views: 94,
                  answersCount: 1,
                  tags: ['財務模型', 'D2C', '履約爭議'],
                } as any;
              }
              if (found) {
                setSelectedQuestion(found);
                setActiveTab('question_detail');
              }
            }}
            onStartOnboarding={() => {
              setIsOnboardingFromAbout(true);
              setActiveTab('explore');
              setIsOnboardingOpen(true);
            }}
            onNavigateToSitelink={handleNavigateToSitelink}
            onOpenChat={() => setActiveTab('chat')}
          />
        )}

        {/* 8. Admin Dashboard & Commission Settings Full Page */}
        {activeTab === 'admin_dashboard' && (
          <AdminDashboardModal
            isFullPage={true}
            onClose={() => setActiveTab('explore')}
          />
        )}

        {/* 9. Chat & Direct Transaction Room Full Page */}
        {activeTab === 'chat' && (
          <ChatView
            onOpenAiCrm={() => setActiveTab('ai_crm')}
            onOpenAdminMailDisputes={() => {
              setUserDashboardTab('admin_mail_disputes');
              setActiveTab('user_dashboard');
            }}
          />
        )}

        {/* 10. AI-CRM Full Page (大師方案專屬主動客戶關係管理系統) */}
        {activeTab === 'ai_crm' && (
          <AiCrmView
            onBack={() => {
              if (currentUser.role === 'admin') {
                setUserDashboardTab('admin_aicrm');
                setActiveTab('user_dashboard');
              } else {
                setActiveTab('explore');
              }
            }}
            onOpenDirectChat={() => {
              setActiveTab('chat');
            }}
          />
        )}

        {/* 11. 會員方案與點數儲值獨立頁面 (/membership, /topup) */}
        {/* 官方客服多慧：在儲值、方案、驗收這些容易卡住的頁面探頭一次 */}
        {(activeTab === 'membership' || activeTab === 'topup') && (
          <DuohuiPeek key="peek-pay" pageKey="membership_topup" message="儲值或會員方案有問題嗎？交給我！" />
        )}
        {activeTab === 'my_projects' && currentUser.id !== 'user-guest' && (
          <DuohuiPeek key="peek-projects" pageKey="my_projects" message="驗收、撥款卡住了嗎？交給我！" />
        )}
        {(activeTab === 'membership' || activeTab === 'topup') && (
          <MembershipAndTopupFullPage
            initialTab={activeTab === 'topup' ? 'topup' : 'membership'}
            onBack={() => setActiveTab('explore')}
          />
        )}

        {/* Fallback if question_detail or solver_profile has no item selected */}
        {((activeTab === 'question_detail' && !selectedQuestion) ||
          (activeTab === 'solver_profile' && !selectedSolver)) && (
          <div className="max-w-md mx-auto my-16 text-center p-8 bg-white rounded-3xl border border-stone-200">
            <p className="text-sm font-bold text-stone-700 mb-4">查無此內容或尚未選擇項目</p>
            <button
              onClick={() => setActiveTab('explore')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-xl text-xs font-bold cursor-pointer"
            >
              返回問題市場
            </button>
          </div>
        )}
      </main>

      {/* Paywall Unlock Modal Overlay */}
      {targetAnswerToUnlock && (
        <UnlockPaywallModal
          isFullPage={false}
          answer={targetAnswerToUnlock}
          onClose={() => setTargetAnswerToUnlock(null)}
          onSuccess={() => setTargetAnswerToUnlock(null)}
        />
      )}

      {/* 關於我們與條款彈窗 */}
      <AboutUsModal
        isOpen={isAboutModalOpen}
        onClose={closeAboutModal}
        initialSection={aboutModalInitialSection}
      />

      {/* 全域 登入 / 註冊彈窗（含創星季獨立站與舊站） */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
        initialMethod={authModalMethod}
        interceptReason={authModalInterceptReason}
      />

      {/* 官方客服與爭議仲裁中心彈窗 */}
      <CustomerServiceModal />

      {/* 取消釘選看板提示彈窗 */}
      {unpinConfirmOpen && (
        <div
          onClick={() => setUnpinConfirmOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-stone-200 p-6 space-y-4 animate-in zoom-in-95 duration-150 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-2xs">
              <Pin className="w-6 h-6 text-amber-700" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-stone-900">取消預設看板</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                若取消釘選將不會將此主題作為預設看板。您確定取消釘選嗎？
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    performUnpin();
                    setUnpinConfirmOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs shadow-xs transition-colors cursor-pointer"
                >
                  是
                </button>
                <button
                  type="button"
                  onClick={() => setUnpinConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  否
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('ideax_unpin_skip_prompt', 'true');
                  performUnpin();
                  setUnpinConfirmOpen(false);
                }}
                className="w-full py-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-50 text-[11px] font-medium transition-colors cursor-pointer"
              >
                不再提醒
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 創點子頁面專屬：右上羅盤浮動懸停導覽入口（只在創點子頁面時出現） */}
      <FloatingOnboardingCompass
        isVisible={!isOnboardingOpen && activeTab !== 'star_season'}
        onStartOnboarding={() => {
          setIsOnboardingFromAbout(true);
          setSelectedQuestion(null);
          setSelectedSolver(null);
          setActiveTab('explore');
          setIsOnboardingOpen(true);
        }}
      />

      {/* Footer (創星季獨立站模式下不顯示舊站大頁尾) */}
      {activeTab !== 'star_season' && (
        <Footer
          onNavClick={(tab, section) => {
            if (section) {
              setAboutPageSection(section);
            } else if (tab === 'about') {
              setAboutPageSection('others');
            }
            setActiveTab(tab);
          }}
          onPostClick={() => setActiveTab('create_question')}
          onSearchTag={(tag) => setSearchQuery(tag)}
          onStartOnboarding={() => {
            setIsOnboardingFromAbout(true);
            setActiveTab('explore');
            setIsOnboardingOpen(true);
          }}
        />
      )}

      {/* 手機行動裝置專屬底部導覽列 (創星季獨立站模式下隱藏，保持獨立單頁體驗) */}
      {activeTab !== 'star_season' && (
        <MobileBottomNav
          activeTab={activeTab}
          userDashboardTab={userDashboardTab}
          onNavigate={(tab) => {
            setSelectedQuestion(null);
            setSelectedSolver(null);
            if (currentUser.id === 'user-guest' && (tab === 'user_dashboard' || tab === 'my_projects')) {
              promptLogin(tab === 'my_projects' ? '訪客模式請先登入帳號以查看我的案件' : '訪客模式請先登入帳號以查看個人中心');
              return;
            }
            if (tab === 'user_dashboard') {
              setUserDashboardTab('overview');
              setActiveTab('user_dashboard');
              setDashboardResetCount((prev) => prev + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
            if (tab === 'my_projects') {
              setActiveTab('my_projects');
              return;
            }
            if (tab === 'explore') {
              setActiveTab('explore');
              setSpecialZone('all');
              setSelectedCategory('全部');
              setSelectedSubcategory('全部');
              setSearchQuery('');
              try {
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/');
                }
              } catch {}
              resetSEOToDefault();
              const scrollToMarket = () => {
                const el = document.getElementById('market-grid');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              };
              scrollToMarket();
              setTimeout(scrollToMarket, 60);
              setTimeout(scrollToMarket, 180);
              return;
            }
            setActiveTab(tab);
          }}
          onOpenCreateQuestion={() => handleOpenCreateWithType('seek_solution')}
        />
      )}

      {/* PWA 安裝與下載指引彈窗 */}
      <PwaInstallModal
        isOpen={isPwaInstallModalOpen}
        onClose={closePwaInstallModal}
      />

      {/* 首次使用步驟式跟隨引導教學（下載一次教學一次，同裝置不同帳號不重複） */}
      <AppOnboardingGuide
        isOpen={isOnboardingOpen}
        isFromAboutUs={isOnboardingFromAbout}
        onClose={(completedAll) => {
          setIsOnboardingOpen(false);
          if (completedAll && isOnboardingFromAbout) {
            setIsOnboardingFromAbout(false);
            try {
              sessionStorage.setItem('ideax_force_chat_onboarding', 'true');
            } catch (e) {
              // ignore
            }
            setSelectedQuestion(null);
            setSelectedSolver(null);
            setActiveTab('chat');
            return;
          }
          setIsOnboardingFromAbout(false);
          setActiveTab('explore');
        }}
        onNavigateTab={(tab) => {
          setSelectedQuestion(null);
          setSelectedSolver(null);
          setActiveTab(tab);
        }}
        onOpenSidebar={() => setIsCategorySidebarOpen(true)}
        onCloseSidebar={() => setIsCategorySidebarOpen(false)}
        onResetFilters={() => {
          setSelectedCategory('全部');
          setSelectedSubcategory('全部');
          setSelectedLevel('全部');
          setSearchQuery('');
          setSpecialZone('all');
        }}
        onOpenUserDashboard={() => {
          setSelectedQuestion(null);
          setSelectedSolver(null);
          setUserDashboardTab('profile');
          setActiveTab('user_dashboard');
        }}
        viewMode={viewMode}
        onSetViewMode={handleSetViewMode}
      />

      {/* 發布內容後詢問是否開啟通知 */}
      <NotificationOptInPrompt />

      {/* 有新版本時提醒更新（開很久沒重新整理的頁面或手機 APP） */}
      <NewVersionNotice />

      {/* 右下角 3D 燈泡吉祥物（管理員可在儀表板調整或關閉；創星季獨立站不顯示） */}
      <MascotHost hidden={activeTab === 'star_season'} />


      {/* 專家評分回饋彈窗 */}
      <RatingModal />

      {/* Google 搜尋多個分頁捷徑 (Sitelinks) 預覽中心與子網址導航彈窗 */}
      <GoogleSitelinksModal
        isOpen={isSitelinksModalOpen}
        onClose={() => setIsSitelinksModalOpen(false)}
        onNavigateToSitelink={handleNavigateToSitelink}
      />

      {/* 螢幕正中央提示浮窗 (Center Toast HUD: 中間跳出提示再消失) */}
      <CenterToast toast={centerToast} onDismiss={hideCenterToast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

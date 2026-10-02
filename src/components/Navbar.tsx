import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { IdeaXLogo } from './IdeaXLogo';
import { CategorySidebar } from './CategorySidebar';
import { NotificationsSidebar } from './NotificationsSidebar';
import { AuthModal } from './AuthModal';
import { AppTab, Category, QuestionSortOption, PostType, SpecialZone, User as UserType, SUBSCRIPTION_PLANS, UserDashboardTab } from '../types';
import {
  Lightbulb,
  PlusCircle,
  Plus,
  Bell,
  Wallet,
  Coins,
  ShieldCheck,
  BadgeCheck,
  ChevronDown,
  UserCheck,
  Briefcase,
  Sliders,
  X,
  ExternalLink,
  MessageCircle,
  PanelLeft,
  User,
  Clock,
  Settings,
  RefreshCw,
  Award,
  ArrowRight,
  Search,
  Sparkles,
  Flame,
  Target,
  LogOut,
  Users,
  Check,
  LogIn,
  ChevronRight,
  Trophy,
  HelpCircle,
  Scale,
  FileText,
  Crown,
  Building2,
  ArrowLeftRight,
  BarChart3,
  LayoutGrid,
  Headphones,
  ShieldAlert,
  Info,
  Send,
  Mail,
  Copy,
  ClipboardList,
} from 'lucide-react';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  selectedCategory?: Category | '全部';
  setSelectedCategory?: (cat: Category | '全部') => void;
  selectedSubcategory?: string | '全部';
  setSelectedSubcategory?: (sub: string | '全部') => void;
  specialZone?: SpecialZone;
  setSpecialZone?: (zone: SpecialZone) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onSelectSort?: (sort: QuestionSortOption) => void;
  onOpenCreateQuestion?: () => void;
  onOpenCreateQuestionWithType?: (type: PostType, identity?: 'admin' | 'platform') => void;
  onOpenUserDashboardTab?: (tab: UserDashboardTab, scrollSection?: string) => void;
  onOpenAiCrm?: () => void;
  isCategorySidebarOpen?: boolean;
  setIsCategorySidebarOpen?: (open: boolean) => void;
  onStartOnboarding?: () => void;
  onNavigateToAbout?: (section?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedCategory = '全部',
  setSelectedCategory,
  selectedSubcategory = '全部',
  setSelectedSubcategory,
  specialZone = 'all',
  setSpecialZone,
  onSelectSort: _onSelectSort,
  onOpenCreateQuestion,
  onOpenCreateQuestionWithType,
  onOpenUserDashboardTab,
  onOpenAiCrm,
  isCategorySidebarOpen: isCategorySidebarOpenProp,
  setIsCategorySidebarOpen: setIsCategorySidebarOpenProp,
  onStartOnboarding,
  onNavigateToAbout,
}) => {
  const {
    currentUser,
    setCurrentUser,
    availableUsers,
    notifications,
    conversations,
    setSelectedQuestion,
    setSelectedSolver,
    questions,
    switchRole,
    openCustomerService,
    isNotificationsSidebarOpen,
    setIsNotificationsSidebarOpen,
    searchQuery,
    setSearchQuery,
    searchMode,
    setSearchMode,
    solvers,
    startDirectChat,
    setActiveConversationId,
    logoutAccount,
    addNotification,
    isNoPaymentMode,
    isDemoMode,
    isAuthModalOpen,
    authModalMode,
    authModalMethod,
    authModalInterceptReason,
    openAuthModal,
    closeAuthModal,
    unreadPersonalCount,
    hasUnreadSystemNotifs,
    pendingDisputesCount,
    addTestAccount,
    promptLogin,
  } = useApp();

  const [internalIsCategorySidebarOpen, setInternalIsCategorySidebarOpen] = useState(false);
  const isCategorySidebarOpen = isCategorySidebarOpenProp !== undefined ? isCategorySidebarOpenProp : internalIsCategorySidebarOpen;
  const setIsCategorySidebarOpen = setIsCategorySidebarOpenProp || setInternalIsCategorySidebarOpen;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isSwitchAccountSectionOpen, setIsSwitchAccountSectionOpen] = useState(false);

  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const createMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userConversations = useMemo(() => {
    return (conversations || []).filter((c) => {
      if (!c) return false;
      if (c.isGroup) return true;
      if (c.participantDetails) {
        return c.participantDetails.some((p) => p.id === currentUser?.id);
      }
      return true;
    });
  }, [conversations, currentUser]);

  const unreadChatCount = useMemo(() => {
    return userConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [userConversations]);

  // 管理員身分：郵件圖示顯示數量直接等於「待裁定」案件數量！一般用戶：僅根據「個人通知」未讀數量（系統通知不計入郵件數字）
  const displayBadgeCount = currentUser.role === 'admin' ? pendingDisputesCount : unreadPersonalCount;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setIsCreateMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
        setIsSwitchAccountSectionOpen(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 搜尋專用：匹配全站會員帳號與專家智庫名冊
  const matchingUsersAndSolvers = React.useMemo(() => {
    const term = (searchQuery || '').trim().toLowerCase();
    
    const userMap = new Map<string, {
      id: string;
      name: string;
      avatar: string;
      title: string;
      role: string;
      isExpert?: boolean;
      isVerified?: boolean;
      domain?: string;
      skills?: string[];
      bio?: string;
      isSolver?: boolean;
      solverObj?: any;
      userObj?: any;
    }>();

    availableUsers.forEach((u) => {
      userMap.set(u.id, {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        title: u.title || (u.role === 'admin' ? '平台管理員' : u.role === 'solver' ? '解答專家' : '提問者'),
        role: u.role,
        isExpert: u.verifiedExpert || !!u.verifiedBadge,
        isVerified: u.realNameAuthStatus === 'verified',
        skills: u.skills || [],
        bio: u.bio,
        userObj: u,
      });
    });

    solvers.forEach((s) => {
      const existing = userMap.get(s.id);
      if (existing) {
        existing.isExpert = true;
        existing.isSolver = true;
        existing.solverObj = s;
        if (s.title) existing.title = s.title;
        if (s.domain) existing.domain = s.domain;
        if (s.skills && s.skills.length > 0) existing.skills = s.skills;
      } else {
        userMap.set(s.id, {
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          title: s.title || '智庫專家',
          role: 'solver',
          isExpert: true,
          domain: s.domain,
          skills: s.skills || [],
          bio: s.bio,
          isSolver: true,
          solverObj: s,
        });
      }
    });

    const list = Array.from(userMap.values());
    if (!term) return list.slice(0, 6);

    return list.filter((u) => {
      const matchId = u.id.toLowerCase().includes(term);
      const matchName = u.name.toLowerCase().includes(term);
      const matchTitle = u.title.toLowerCase().includes(term);
      const matchDomain = u.domain && u.domain.toLowerCase().includes(term);
      const matchBio = u.bio && u.bio.toLowerCase().includes(term);
      const matchSkills = u.skills && u.skills.some((sk) => sk.toLowerCase().includes(term));
      return matchId || matchName || matchTitle || matchDomain || matchBio || matchSkills;
    }).slice(0, 10);
  }, [availableUsers, solvers, searchQuery]);

  // 搜尋專用：匹配問題預覽
  const matchingQuestionsPreview = React.useMemo(() => {
    const term = (searchQuery || '').trim().toLowerCase();
    if (!term) return [];
    return questions.filter((q) => {
      return q.title.toLowerCase().includes(term) || q.description.toLowerCase().includes(term);
    }).slice(0, 4);
  }, [questions, searchQuery]);

  // 動態熱門搜尋標籤
  const navbarHotTags = React.useMemo(() => {
    const tagCountMap: Record<string, { count: number; totalBounty: number }> = {};
    const activeQuestions = questions.filter((q) => q.status !== 'delisted' && q.status !== 'closed');
    const sourceQuestions = activeQuestions.length > 0 ? activeQuestions : questions;

    sourceQuestions.forEach((q) => {
      (q.tags || []).forEach((tag) => {
        const cleanTag = tag.trim();
        if (!cleanTag) return;
        if (!tagCountMap[cleanTag]) {
          tagCountMap[cleanTag] = { count: 0, totalBounty: 0 };
        }
        tagCountMap[cleanTag].count += 1;
        tagCountMap[cleanTag].totalBounty += q.bounty || 0;
      });
    });

    const sortedTags = Object.entries(tagCountMap)
      .sort((a, b) => {
        if (b[1].count !== a[1].count) return b[1].count - a[1].count;
        return b[1].totalBounty - a[1].totalBounty;
      })
      .map(([tag]) => tag);

    const fallbackTags = [
      '商業模式',
      'AI應用',
      '創業痛點',
      '行銷增長',
      '法律智財',
      '水電裝修',
      'TFDA 臨床申報',
      '專利申請',
    ];
    return Array.from(new Set([...sortedTags, ...fallbackTags])).slice(0, 8);
  }, [questions]);

  const handleStartChatWithUser = (target: { id: string; name: string; avatar: string; title: string }) => {
    if (currentUser.id === target.id) {
      addNotification({ title: '提醒', message: '這是您自己的帳號！', type: 'system' });
      return;
    }
    startDirectChat(target);
    setIsSearchDropdownOpen(false);
    setActiveTab('chat');
    setSelectedQuestion(null);
    setSelectedSolver(null);
  };

  const handleViewUserProfile = (target: any) => {
    setIsSearchDropdownOpen(false);
    if (target.solverObj) {
      setSelectedSolver(target.solverObj);
      setActiveTab('solver_profile');
    } else {
      if (setSearchQuery) setSearchQuery(target.id);
      setActiveTab('explore');
    }
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedUserId(id);
    setTimeout(() => setCopiedUserId(null), 2000);
  };

  const handleSidebarSelectCategory = (cat: Category | '全部', sub: string | '全部' = '全部') => {
    if (setSelectedCategory) setSelectedCategory(cat);
    if (setSelectedSubcategory) setSelectedSubcategory(sub);
    setActiveTab('explore');
    setSelectedQuestion(null);
    setSelectedSolver(null);
  };

  const handleOpenDashboard = (tab: UserDashboardTab, scrollSection?: string) => {
    if (isGuest) {
      promptLogin('訪客模式請先登入帳號以查看個人中心');
      return;
    }
    if (onOpenUserDashboardTab) {
      onOpenUserDashboardTab(tab, scrollSection);
    }
    setActiveTab('user_dashboard');
    setIsUserMenuOpen(false);
    setIsSwitchAccountSectionOpen(false);
  };

  const handleSelectAdminIdentity = (identity: 'admin' | 'platform') => {
    setIsCreateMenuOpen(false);
    if (onOpenCreateQuestionWithType) {
      onOpenCreateQuestionWithType('seek_solution', identity);
    } else if (onOpenCreateQuestion) {
      onOpenCreateQuestion();
    } else {
      setActiveTab('create_question');
    }
  };

  const handleSelectPostType = (type: PostType, identity: 'admin' | 'platform' = 'admin') => {
    setIsCreateMenuOpen(false);
    if (onOpenCreateQuestionWithType) {
      onOpenCreateQuestionWithType(type, identity);
    } else if (onOpenCreateQuestion) {
      onOpenCreateQuestion();
    } else {
      setActiveTab('create_question');
    }
  };

  const handleToggleRole = () => {
    if (currentUser.role === 'admin') {
      return;
    } else if (currentUser.role === 'solver') {
      switchRole('questioner');
    } else {
      switchRole('solver');
    }
  };

  const handleSwitchUser = (user: UserType) => {
    setCurrentUser(user);
    setIsUserMenuOpen(false);
    setIsSwitchAccountSectionOpen(false);
    if (user.role === 'admin') {
      handleOpenDashboard('overview');
    }
  };

  const handleLogout = () => {
    logoutAccount(currentUser.id);
    setIsUserMenuOpen(false);
    setIsSwitchAccountSectionOpen(false);
    setActiveTab('explore');
  };

  const isGuest = currentUser.id === 'user-guest';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: 側邊欄入口 + Logo + 導覽（探索問題、認證專家） */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* 左上燈泡圖片左側側邊欄入口 */}
          <button
            id="onboarding-step-6-sidebar-btn"
            type="button"
            onClick={() => setIsCategorySidebarOpen(true)}
            className="p-2 -ml-1 sm:ml-0 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-stone-100 active:bg-amber-100 transition-all flex items-center justify-center cursor-pointer border border-stone-200/90 shadow-2xs group"
            title="開啟熱門看板與主題側邊欄"
            aria-label="開啟熱門看板與主題側邊欄"
          >
            <PanelLeft className="w-5 h-5 text-stone-700 group-hover:text-amber-600 transition-colors" />
            <span className="hidden lg:inline-block ml-1.5 text-xs font-bold text-stone-800 group-hover:text-amber-700">
              版面專區
            </span>
          </button>

          {/* Desktop Logo (點選滑動至問題市場) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveTab('explore');
              setSelectedQuestion(null);
              setSelectedSolver(null);
              setTimeout(() => {
                const el = document.getElementById('market-grid');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }, 50);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('explore');
                setSelectedQuestion(null);
                setSelectedSolver(null);
                setTimeout(() => {
                  const el = document.getElementById('market-grid');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }, 50);
              }
            }}
            title="點擊滑動至問題市場"
            className="hidden sm:flex items-center text-left group transition-transform active:scale-95 cursor-pointer p-1 rounded-xl hover:bg-amber-50/80 transition-colors"
          >
            <IdeaXLogo variant="bulb" size="md" />
          </div>

          {/* Navigation Links: 「找專家」與「我的案件」 */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
            <button
              id="onboarding-step-8-solvers-desktop"
              onClick={() => {
                setActiveTab('solvers');
                setSelectedQuestion(null);
                setSelectedSolver(null);
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 ${
                activeTab === 'solvers'
                  ? 'bg-emerald-50/90 text-emerald-950 font-black border-emerald-400 ring-2 ring-emerald-200 shadow-2xs'
                  : 'bg-white text-stone-800 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-950 shadow-2xs'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>找專家</span>
            </button>
            <button
              onClick={() => {
                if (isGuest) {
                  promptLogin('訪客模式請先登入帳號以查看我的案件');
                  return;
                }
                setActiveTab('my_projects');
                setSelectedQuestion(null);
                setSelectedSolver(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 ${
                activeTab === 'my_projects'
                  ? 'bg-blue-100/90 text-blue-950 font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>我的案件</span>
            </button>
          </nav>
        </div>

        {/* Middle Section: 搜尋欄 (置中、適當寬度且左右留有舒適空間，支援關鍵字與用戶/專家雙模式) */}
        <div className="flex-1 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-2 sm:mx-6 md:mx-8 relative" ref={searchDropdownRef}>
          <div className="relative flex items-center">
            {/* 搜尋圖示（置於左側，取消輸入框內預選類型標籤） */}
            <Search className="absolute left-3 w-4 h-4 text-stone-400 pointer-events-none" />

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery || ''}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onClick={() => setIsSearchDropdownOpen(true)}
              onChange={(e) => {
                if (setSearchQuery) setSearchQuery(e.target.value);
                if (activeTab !== 'explore' && searchMode === 'keywords') setActiveTab('explore');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsSearchDropdownOpen(false);
                  if (searchMode === 'users') {
                    setActiveTab('solvers');
                  } else {
                    setActiveTab('explore');
                  }
                }
              }}
              placeholder={
                searchMode === 'keywords'
                  ? '搜尋關鍵字（問題、方案、討論、內文）...'
                  : '搜尋用戶或專家（輸入 ID 如 user-chen 或姓名）...'
              }
              className="w-full pl-9 sm:pl-10 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm bg-stone-100/90 hover:bg-stone-150 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-xl outline-none focus:ring-2 focus:ring-amber-200 transition-all text-stone-900 placeholder:text-stone-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  if (setSearchQuery) setSearchQuery('');
                }}
                className="absolute right-2.5 p-0.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                title="清除搜尋"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 搜尋下拉選單 (Search Dropdown Popover) */}
          {isSearchDropdownOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 w-[92vw] sm:w-[580px] md:w-[680px] lg:w-[740px] max-w-[95vw] mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[520px] flex flex-col">
              {/* 頂部雙模式選擇標籤 */}
              <div className="p-2.5 bg-stone-50/90 border-b border-stone-100">
                <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider px-1 pb-1.5 flex items-center justify-between">
                  <span>選擇搜尋目標</span>
                  <span className="text-[10px] text-stone-500 font-medium">點選切換分類</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Mode 1: 關鍵字搜尋 */}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode('keywords');
                      searchInputRef.current?.focus();
                    }}
                    className={`p-2.5 rounded-xl text-left transition-all flex items-start gap-2.5 cursor-pointer bg-white ${
                      searchMode === 'keywords'
                        ? 'border-2 border-amber-500 ring-2 ring-amber-100 text-stone-900 shadow-2xs'
                        : 'border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-stone-600'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        searchMode === 'keywords'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black truncate block">搜尋關鍵字</span>
                      <p className="text-[10px] leading-tight truncate mt-0.5 text-stone-500">
                        問題、方案、討論、內文
                      </p>
                    </div>
                  </button>

                  {/* Mode 2: 搜尋用戶或專家 */}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode('users');
                      searchInputRef.current?.focus();
                    }}
                    className={`p-2.5 rounded-xl text-left transition-all flex items-start gap-2.5 cursor-pointer bg-white ${
                      searchMode === 'users'
                        ? 'border-2 border-amber-500 ring-2 ring-amber-100 text-stone-900 shadow-2xs'
                        : 'border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-stone-600'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        searchMode === 'users'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black truncate block">搜尋用戶或專家</span>
                      <p className="text-[10px] leading-tight truncate mt-0.5 text-stone-500">
                        輸入 ID 或名稱
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 下拉內容區塊 */}
              <div className="overflow-y-auto p-3 space-y-3 divide-y divide-stone-100">
                {/* 模式 A：搜尋用戶或專家 (輸入 ID 或名稱) */}
                {searchMode === 'users' ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                        <Users className="w-3.5 h-3.5 text-stone-500" />
                        <span>
                          {searchQuery?.trim()
                            ? `相符用戶與智庫專家 (${matchingUsersAndSolvers.length})`
                            : '推薦專家與平台用戶'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-normal">
                        輸入用戶 ID (如 user-chen) 或姓名
                      </span>
                    </div>

                    {matchingUsersAndSolvers.length > 0 ? (
                      <div className="space-y-1.5">
                        {matchingUsersAndSolvers.map((user) => (
                          <div
                            key={user.id}
                            className="p-2.5 rounded-xl hover:bg-stone-50 border border-stone-100 hover:border-stone-200 transition-all flex items-center justify-between gap-3 group"
                          >
                            <div
                              onClick={() => handleViewUserProfile(user)}
                              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                            >
                              <img
                                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={user.name}
                                className="w-9 h-9 rounded-full object-cover border border-stone-200 group-hover:scale-105 transition-transform shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-xs text-stone-900 group-hover:text-amber-950 truncate">
                                    {user.name}
                                  </span>
                                  {user.isExpert && (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                      ★ 智庫專家
                                    </span>
                                  )}
                                  {user.role === 'admin' && (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                      平台管理員
                                    </span>
                                  )}
                                  {user.role === 'questioner' && !user.isExpert && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                                      提問者
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyId(e, user.id)}
                                    className="font-mono text-stone-600 hover:text-stone-900 hover:underline flex items-center gap-0.5"
                                    title="點擊複製用戶 ID"
                                  >
                                    <span>@{user.id}</span>
                                    <Copy className="w-2.5 h-2.5 text-stone-400" />
                                    {copiedUserId === user.id && (
                                      <span className="text-[9px] text-emerald-600 font-bold">已複製!</span>
                                    )}
                                  </button>
                                  {user.title && (
                                    <span className="truncate max-w-[140px] text-stone-600">
                                      · {user.title}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 快捷操作按鈕：淡淡的框和文字圖示，無花俏色塊 */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartChatWithUser(user)}
                                className="px-2.5 py-1 rounded-lg border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                                title="與此用戶發起私聊"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-stone-500" />
                                <span>私聊</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-stone-50 text-center text-xs text-stone-500 space-y-1">
                        <p className="font-bold text-stone-700">找不到相符的用戶或專家</p>
                        <p className="text-[11px] text-stone-400">
                          請確認 ID 是否正確（例如 <code className="text-stone-700 font-mono">user-chen</code>、<code className="text-stone-700 font-mono">user-1</code>）或輸入用戶姓名。
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between text-xs text-stone-500 border-t border-stone-100">
                      <span>想瀏覽全站專家智庫名冊？</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchDropdownOpen(false);
                          setActiveTab('solvers');
                        }}
                        className="text-stone-700 hover:text-stone-900 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>進入專家專區</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 模式 B：搜尋關鍵字 (問題、方案、討論、內文) */
                  <div className="space-y-3">
                    {/* 熱門話題標籤 */}
                    <div>
                      <div className="text-[11px] font-bold text-stone-500 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>熱門搜尋推薦</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {navbarHotTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (setSearchQuery) setSearchQuery(tag);
                              setActiveTab('explore');
                              setIsSearchDropdownOpen(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 hover:text-amber-950 text-stone-700 text-xs font-semibold transition-colors cursor-pointer border border-stone-200/60"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 相符問題即時預覽 */}
                    {matchingQuestionsPreview.length > 0 && (
                      <div className="pt-2 border-t border-stone-100 space-y-1.5">
                        <div className="text-[11px] font-black text-stone-600 flex items-center justify-between">
                          <span>相關問題與方案 ({matchingQuestionsPreview.length})</span>
                          <span className="text-[10px] text-stone-400">點擊直接查看</span>
                        </div>
                        {matchingQuestionsPreview.map((q) => (
                          <div
                            key={q.id}
                            onClick={() => {
                              setSelectedQuestion(q);
                              setActiveTab('question_detail');
                              setIsSearchDropdownOpen(false);
                            }}
                            className="p-2 rounded-xl hover:bg-amber-50/80 border border-stone-100 hover:border-amber-200 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-stone-900 group-hover:text-amber-950 truncate">
                                {q.title}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-0.5">
                                <span className="font-semibold text-amber-700">NT$ {q.bounty.toLocaleString()}</span>
                                <span>· {q.category}</span>
                                <span>· {q.authorName}{q.authorTitle ? ` · ${q.authorTitle}` : ''}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between text-xs border-t border-stone-100">
                      <span className="text-stone-400 text-[11px]">
                        {searchQuery ? `按 Enter 搜尋「${searchQuery}」全站問題` : '支援搜尋標題、內文、討論與交付內容'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section:
            排版順序：
            1. 簡潔的加號 (+) 發布按鈕 (點擊展開分類：尋求解答 / 提出痛點 / 閒聊討論 / 平台官方貼文)
            2. 私聊
            3. 通知/郵件中心 (管理員身分點擊直接前往申訴與郵件頁面)
            4. 個人欄
            （已移除頂部餘額顯示）
        */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* 1. 簡潔的加號 (+) 發布按鈕 (管理員可選發文身分，一般用戶進入編輯頁，訪客引導登入) */}
          <div className="relative hidden sm:block" ref={createMenuRef}>
            <button
              id="onboarding-step-9-create-desktop"
              onClick={() => {
                if (isGuest) {
                  promptLogin('訪客模式請先登入帳號以發布問題');
                  return;
                }
                if (currentUser.role === 'admin') {
                  setIsCreateMenuOpen(!isCreateMenuOpen);
                } else {
                  if (onOpenCreateQuestionWithType) onOpenCreateQuestionWithType('seek_solution');
                  else if (onOpenCreateQuestion) onOpenCreateQuestion();
                  else setActiveTab('create_question');
                }
              }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black flex items-center justify-center shadow-xs transition-all hover:shadow-md cursor-pointer ${
                activeTab === 'create_question' || isCreateMenuOpen
                  ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                  : 'bg-amber-500 text-stone-950 hover:bg-amber-400 active:bg-amber-600'
              }`}
              title="發布問題"
              aria-label="發布問題"
            >
              <Plus className={`w-5 h-5 stroke-[2.8] transition-transform duration-200 ${isCreateMenuOpen ? 'rotate-45' : ''}`} />
            </button>

            {/* +號點擊展開的管理員發文身分選單 (管理員身分 / 平台身分) */}
            {isCreateMenuOpen && currentUser.role === 'admin' && (
              <div className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-extrabold text-stone-500 border-b border-stone-100 mb-1.5 flex items-center justify-between">
                  <span>選擇發文身分</span>
                  <span className="text-[10px] text-amber-600 font-bold">管理員專屬</span>
                </div>

                {/* ① 管理員身分 */}
                <button
                  type="button"
                  onClick={() => handleSelectAdminIdentity('admin')}
                  className="w-full p-2.5 rounded-xl hover:bg-stone-50 transition-colors flex items-start gap-2.5 text-left cursor-pointer group border border-transparent hover:border-stone-200"
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-stone-200 shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-stone-900 group-hover:text-amber-950 truncate">
                        管理員身分
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 shrink-0">
                        個人席位
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">
                      以管理員（{currentUser.name}）名義發布，進入編輯頁後再選擇類型
                    </div>
                  </div>
                </button>

                {/* ② 平台身分 */}
                <button
                  type="button"
                  onClick={() => handleSelectAdminIdentity('platform')}
                  className="w-full p-2.5 rounded-xl hover:bg-amber-50/60 transition-colors flex items-start gap-2.5 text-left cursor-pointer group border border-transparent hover:border-amber-200 mt-1"
                >
                  <div className="w-9 h-9 rounded-xl bg-stone-950 text-amber-400 flex items-center justify-center font-black shrink-0 mt-0.5 shadow-2xs border border-amber-400 text-base">
                    💡
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-stone-900 group-hover:text-amber-950 truncate">
                        平台身分
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-stone-950 text-amber-300 shrink-0">
                        官方帳號
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">
                      以 💡IdeaX 官方帳號💡 名義發布官方公告、活動或破局懸賞
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 2. 訊息 (電腦版 - 僅保留圖示，數字徽章移至右上角) */}
          <button
            onClick={() => {
              setActiveTab('chat');
              setSelectedQuestion(null);
              setSelectedSolver(null);
              setActiveConversationId(null);
            }}
            className={`hidden sm:flex relative p-2 rounded-xl transition-colors cursor-pointer border ${
              activeTab === 'chat'
                ? 'bg-amber-100/90 text-amber-950 border-amber-300 ring-2 ring-amber-300'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:bg-amber-50 border-stone-200/80'
            }`}
            title={`開啟訊息${unreadChatCount > 0 ? `（${unreadChatCount} 則未讀訊息）` : ''}`}
            aria-label="開啟訊息"
          >
            <MessageCircle className={`w-5 h-5 ${activeTab === 'chat' ? 'text-amber-700' : 'text-stone-700'}`} />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-stone-950 font-black text-[10px] rounded-full ring-2 ring-white flex items-center justify-center shadow-2xs font-mono">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>

          {/* 3. 通知/郵件中心入口 (管理員身分點擊直接前往「申訴與郵件」頁面) */}
          <button
            type="button"
            onClick={() => {
              if (currentUser.role === 'admin') {
                handleOpenDashboard('admin_mail_disputes');
              } else {
                setIsNotificationsSidebarOpen(true);
              }
            }}
            className="hidden sm:flex relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:bg-amber-50 transition-colors cursor-pointer border border-stone-200/80"
            aria-label={currentUser.role === 'admin' ? "申訴與郵件管理中心" : "開啟通知中心右側欄"}
            title={currentUser.role === 'admin' ? `申訴與郵件管理中心（待裁定案件：${pendingDisputesCount} 件）` : "開啟通知中心右側欄"}
          >
            {currentUser.role === 'admin' ? (
              <Mail className="w-5 h-5 text-purple-700" />
            ) : (
              <Bell className="w-5 h-5 text-stone-700" />
            )}
            {displayBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-stone-950 font-black text-[10px] rounded-full ring-2 ring-white flex items-center justify-center shadow-2xs font-mono">
                {displayBadgeCount > 99 ? '99+' : displayBadgeCount}
              </span>
            )}
          </button>

          {/* 3.5 點數 / 應收帳款快捷按鈕 (電腦版) - 全模式配置同步 */}
          <button
            onClick={() => {
              if (currentUser.role === 'solver') {
                handleOpenDashboard('points_receivables');
              } else {
                handleOpenDashboard('points_receivables', 'points-balance-and-records-section');
              }
            }}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-xs transition-all cursor-pointer shadow-2xs hover:shadow-xs group shrink-0 ${
              currentUser.role === 'solver'
                ? 'bg-blue-50/90 hover:bg-blue-100 border-blue-200/90 text-blue-950'
                : 'bg-amber-50/90 hover:bg-amber-100 border-amber-200/90 text-amber-950'
            }`}
            title={currentUser.role === 'solver' ? '應收帳款中心' : '點數中心'}
          >
            {currentUser.role === 'solver' ? (
              <>
                <Building2 className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>{isNoPaymentMode ? '應收 尚未開放' : `應收 NT$ ${(currentUser.withheldPoints || 0).toLocaleString()}`}</span>
              </>
            ) : (
              <>
                <Coins className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="font-mono text-amber-900 font-extrabold">{(currentUser?.balance || 0).toLocaleString()} 點</span>
              </>
            )}
          </button>

          {/* 手機版：餘額按鈕（位於右上角聊天室入口左側，點擊連結到點數儲值或應收帳款管理） - 全模式配置同步 */}
          <button
            type="button"
            onClick={() => {
              if (currentUser.role === 'solver') {
                handleOpenDashboard('points_receivables');
              } else {
                handleOpenDashboard('points_receivables', 'points-balance-and-records-section');
              }
            }}
            className={`sm:hidden flex items-center gap-1 px-2 py-1.5 rounded-xl border font-black text-xs transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
              currentUser.role === 'solver'
                ? 'bg-blue-50/95 hover:bg-blue-100 border-blue-200 text-blue-950'
                : 'bg-amber-50/95 hover:bg-amber-100 border-amber-200 text-amber-950'
            }`}
            title={currentUser.role === 'solver' ? '應收帳款管理' : '點數儲值管理'}
          >
            {currentUser.role === 'solver' ? (
              <>
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[10px] font-bold text-blue-800">應收</span>
                <span className={`text-[11px] font-black text-blue-950 ${isNoPaymentMode ? 'font-sans text-[10px]' : 'font-mono'}`}>
                  {isNoPaymentMode ? '尚未開放' : `NT$${(currentUser.withheldPoints || 0).toLocaleString()}`}
                </span>
              </>
            ) : (
              <>
                <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-mono text-amber-950 font-black text-[11px]">
                  {(currentUser?.balance || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-900 font-bold">點</span>
              </>
            )}
          </button>

          {/* Mobile Message Center Entry (替代頭像) */}
          <button
            onClick={() => {
              setActiveTab('chat');
              setSelectedQuestion(null);
              setSelectedSolver(null);
              setActiveConversationId(null);
            }}
            className="sm:hidden p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-amber-300 text-stone-700 flex items-center justify-center cursor-pointer relative"
            title="訊息"
          >
            <MessageCircle className="w-5 h-5 text-stone-700" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-amber-500 text-stone-950 font-black text-[9px] rounded-full ring-2 ring-white flex items-center justify-center shadow-2xs font-mono">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>

          {/* 4. User Profile Dropdown Menu (個人欄 - 訪客顯示登入按鈕，無頭像與名稱) */}
          {isGuest ? (
            <button
              type="button"
              onClick={() => {
                openAuthModal('login', 'email');
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            >
              <LogIn className="w-4 h-4 text-stone-950" />
              <span>登入 / 註冊</span>
            </button>
          ) : (
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button
                id="onboarding-step-10-profile-desktop"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="relative flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-stone-200 hover:border-amber-300 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-stone-200"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5 flex-wrap">
                    <span>
                      {currentUser.name}
                      {(currentUser.role !== 'questioner' || currentUser.showQuestionerTitle) && currentUser.title
                        ? ` · ${currentUser.title}`
                        : ''}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        currentUser.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : currentUser.role === 'solver'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {currentUser.role === 'admin'
                        ? '管理員'
                        : currentUser.role === 'solver'
                        ? '解答者'
                        : '提問者'}
                    </span>
                  </div>
                </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 max-h-[82vh] overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 custom-scrollbar">
                {/* 用戶資訊與右方切換身份鍵 (Sticky 置頂標頭) */}
                <div className="sticky -top-2 z-10 px-3.5 py-3 border-b border-stone-100 bg-white/95 backdrop-blur-md shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenDashboard('profile');
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center gap-2 min-w-0 text-left hover:opacity-85 transition-opacity cursor-pointer group"
                      title="點擊前往帳號設定頁"
                    >
                      <img
                        src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-xl object-cover ring-1 ring-stone-200 shrink-0 group-hover:ring-amber-500 transition-all"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-black text-stone-900 truncate group-hover:text-amber-600 transition-colors">
                            {currentUser.name}
                            {(currentUser.role !== 'questioner' || currentUser.showQuestionerTitle) && currentUser.title
                              ? ` · ${currentUser.title}`
                              : ''}
                          </p>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                              currentUser.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : currentUser.role === 'solver'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {currentUser.role === 'admin'
                              ? '管理員'
                              : currentUser.role === 'solver'
                              ? '解答者'
                              : '提問者'}
                          </span>
                        </div>
                        {(currentUser.role !== 'questioner' || currentUser.showQuestionerTitle) && currentUser.title && (
                          <p className="text-[10px] text-stone-500 truncate">{currentUser.title}</p>
                        )}
                      </div>
                    </button>

                    {/* 用戶名稱右方切換鍵 */}
                    {currentUser.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => switchRole(currentUser.role === 'solver' ? 'questioner' : 'solver')}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-2xs shrink-0"
                        title="切換提問者 / 解答者身份"
                      >
                        <RefreshCw className="w-3 h-3 text-stone-950" />
                        <span>切換{currentUser.role === 'solver' ? '提問' : '解答'}</span>
                      </button>
                    )}
                  </div>

                  {currentUser.role === 'solver' && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-100/60 border border-amber-200/80 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-600 font-bold">會員等級</span>
                        <span className="font-extrabold text-amber-950">
                          {SUBSCRIPTION_PLANS[currentUser.subscriptionTier || 'free']?.name || '一般會員'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-stone-500">
                        <span>第三方服務費</span>
                        <span className="font-bold text-emerald-800">
                          {SUBSCRIPTION_PLANS[currentUser.subscriptionTier || 'free']?.feeDiscountText || '標準 10%'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 管理員個人中心清單 - 重新整理核心邏輯分類 */}
                {currentUser.role === 'admin' ? (
                  <div className="py-1 divide-y divide-stone-100 text-xs">
                    {/* 分類 0: 📊 總覽與平台數據 (置頂) */}
                    <div className="py-1.5 px-1.5 space-y-0.5 bg-purple-50/40">
                      <p className="px-2 pt-0.5 pb-1 text-[10px] font-black text-purple-900 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <LayoutGrid className="w-3.5 h-3.5 text-purple-700" />
                          <span>管理核心總覽</span>
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 font-bold border border-purple-200">1 項</span>
                      </p>

                      {/* 管理儀表板 */}
                      <button
                        onClick={() => handleOpenDashboard('overview')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-purple-100/70 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-black text-purple-950 group-hover:text-purple-700 transition-colors">管理儀表板</span>
                            <span className="text-[10px] text-purple-700/80 font-normal">全站營運大盤、會員分佈、數據控制與資料庫</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    </div>

                    {/* 分類 1: 💰 財務與點數治理 (全模式配置同步) */}
                    <div className="py-1.5 px-1.5 space-y-0.5">
                      <p className="px-2 pt-0.5 pb-1 text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-600" />
                          <span>財務與點數治理</span>
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">3 項</span>
                      </p>

                      {/* 1. 點數與帳務管理 (整合點數查詢、應收託管與管理員撥付) */}
                      <button
                        onClick={() => handleOpenDashboard('points_receivables')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-2xs">
                            <Coins className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="block font-black text-stone-900">點數與帳務管理</span>
                            </div>
                            <span className="text-[10px] text-stone-500 font-normal">用戶帳目查閱、點數撥發與應收管理</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors" />
                      </button>

                      {/* 3. 交易流水管理 */}
                      <button
                        onClick={() => handleOpenDashboard('transactions')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-black text-stone-900">交易管理</span>
                            <span className="text-[10px] text-stone-500 font-normal">全站交易紀錄、拆款與退款稽核</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors" />
                      </button>
                    </div>

                    {/* 案件管理與問題管理 (業務與內容審核) */}
                    <div className="py-1.5 px-1.5 space-y-0.5">
                      <button
                        onClick={() => handleOpenDashboard('admin_cases')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-purple-50 hover:text-purple-950 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 shadow-2xs">
                            <Briefcase className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-black text-stone-900">案件管理</span>
                            <span className="text-[10px] text-stone-500 font-normal">全站案件詳細狀況與私聊對話稽核</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-purple-700 transition-colors" />
                      </button>

                      {/* 問題管理 (新增於案件管理下方) */}
                      <button
                        onClick={() => handleOpenDashboard('admin_questions')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-purple-50 hover:text-purple-950 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 shadow-2xs">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-black text-stone-900">問題管理</span>
                            <span className="text-[10px] text-stone-500 font-normal">各類問題分佈圓餅圖、違規下架與用戶反饋</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-purple-700 transition-colors" />
                      </button>
                    </div>

                    {/* 分類 2: 👥 用戶與審核認證 */}
                    <div className="py-1.5 px-1.5 space-y-0.5">
                      <p className="px-2 pt-0.5 pb-1 text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span>用戶與審核認證</span>
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">3 項</span>
                      </p>

                      {/* 5. 用戶管理 */}
                      <button
                        onClick={() => handleOpenDashboard('admin_user_management')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-blue-50 hover:text-blue-950 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                            <UserCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-black text-stone-900">用戶管理</span>
                            <span className="text-[10px] text-stone-500 font-normal">會員名冊、帳號停權/解封與黑名單</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-600 transition-colors" />
                      </button>

                      {/* 6. 受理認證 (實名、專家) */}
                      <button
                        onClick={() => handleOpenDashboard('admin_certifications')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-blue-50 hover:text-blue-950 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 shadow-2xs">
                            <BadgeCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-black text-stone-900">受理認證 (實名、專家)</span>
                            <span className="text-[10px] text-stone-500 font-normal">審核通過或移除實名/專家大師身分</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-700 transition-colors" />
                      </button>

                      {/* 7. 用戶分佈與習慣統計 */}
                      <button
                        onClick={() => handleOpenDashboard('admin_user_analytics')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-emerald-50 hover:text-emerald-950 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                            <BarChart3 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="block font-black text-stone-900">用戶分佈與習慣統計</span>
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                數據與 Excel
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-500 font-normal">個資統計、調研問卷圖表與檔案匯出</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-700 transition-colors" />
                      </button>
                    </div>

                    {/* 分類 3: 👑 會員方案與費率 */}
                    <div className="py-1.5 px-1.5 space-y-0.5">
                      <p className="px-2 pt-0.5 pb-1 text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>會員方案與費率</span>
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">1 項</span>
                      </p>

                      {/* 會員方案與費率管理 */}
                      <button
                        onClick={() => handleOpenDashboard('subscriptions')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                            <Crown className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-black text-stone-900">會員方案與費率管理</span>
                            <span className="text-[10px] text-stone-500 font-normal">平台抽成設定與會員訂閱方案編輯</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors" />
                      </button>
                    </div>

                    {/* 分類 4: ⚙️ 帳號 */}
                    <div className="py-1.5 px-1.5 space-y-0.5">
                      <p className="px-2 pt-0.5 pb-1 text-[10px] font-black text-stone-500 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Settings className="w-3 h-3 text-stone-500" />
                          <span>帳號</span>
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 font-bold">2 項</span>
                      </p>

                      {/* 13. 管理員帳號設定 */}
                      <button
                        onClick={() => handleOpenDashboard('profile')}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-850 hover:bg-stone-100 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center shrink-0 shadow-2xs">
                            <Settings className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-black text-stone-900">管理員帳號設定</span>
                            <span className="text-[10px] text-stone-500 font-normal">管理員席位資料與安全維護</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors" />
                      </button>

                      {/* 14. 切換帳號 / 添加測試帳號 */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          openAuthModal('login', 'switch');
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-700 hover:bg-stone-100 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0">
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-black text-stone-900">
                              切換 / 添加測試帳號
                            </span>
                            <span className="text-[10px] text-stone-500 font-normal">
                              快速切換或免註冊新增身分
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors" />
                      </button>

                      {/* 只有管理員帳號才可以新增測試帳號 */}
                      <div className="px-2 pt-1 pb-1 grid grid-cols-3 gap-1 bg-stone-50/80 rounded-xl border border-stone-200/80 my-1">
                        <button
                          type="button"
                          onClick={() => {
                            addTestAccount({ role: 'solver', autoSwitch: true });
                            setIsUserMenuOpen(false);
                          }}
                          className="px-1.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-900 font-bold text-[10px] text-center border border-blue-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                          title="免註冊一鍵建立測試解答者並切換"
                        >
                          + 測試解答者
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            addTestAccount({ role: 'questioner', autoSwitch: true });
                            setIsUserMenuOpen(false);
                          }}
                          className="px-1.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-900 font-bold text-[10px] text-center border border-amber-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                          title="免註冊一鍵建立測試提問者並切換"
                        >
                          + 測試提問者
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            addTestAccount({ role: 'admin', autoSwitch: true });
                            setIsUserMenuOpen(false);
                          }}
                          className="px-1.5 py-1 rounded-lg bg-white hover:bg-purple-50 text-purple-900 font-bold text-[10px] text-center border border-purple-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                          title="免註冊一鍵建立測試管理員並切換"
                        >
                          + 測試管理員
                        </button>
                      </div>

                      {/* 15. 登出帳號 */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 cursor-pointer group transition-all"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <LogOut className="w-3.5 h-3.5" />
                        </div>
                        <span>登出管理員帳號</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-1 divide-y divide-stone-100">

                  {/* 區塊 1：資產與帳務 (全模式配置同步) */}
                  <div className="py-1.5 px-1.5 space-y-0.5">
                    <p className="px-2 pt-0.5 pb-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      資產與帳務
                    </p>
                    <button
                      onClick={() => handleOpenDashboard('points_receivables')}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between cursor-pointer group transition-all ${
                        currentUser.role === 'solver'
                          ? 'text-blue-950 bg-blue-50/80 hover:bg-blue-100'
                          : 'text-amber-950 bg-amber-50/80 hover:bg-amber-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                          currentUser.role === 'solver'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {currentUser.role === 'solver' ? (
                            <Building2 className="w-3.5 h-3.5" />
                          ) : (
                            <Coins className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span>點數 & 收支</span>
                      </div>
                      <span className={`font-mono font-black text-xs ${
                        currentUser.role === 'solver' ? 'text-blue-950' : 'text-amber-900'
                      }`}>
                        {currentUser.role === 'solver'
                          ? (isNoPaymentMode ? '尚未開放' : `NT$ ${(currentUser?.withheldPoints || 0).toLocaleString()}`)
                          : (isNoPaymentMode ? '免點數' : `${(currentUser?.balance || 0).toLocaleString()} 點`)}
                      </span>
                    </button>

                    <button
                      onClick={() => handleOpenDashboard('points_receivables', 'transactions-section')}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-orange-50/80 hover:text-orange-950 flex items-center gap-2.5 cursor-pointer group transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg bg-orange-100/80 text-orange-800 group-hover:bg-orange-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span>交易紀錄</span>
                    </button>

                    <button
                      onClick={() => handleOpenDashboard('subscriptions')}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-purple-50/80 hover:text-purple-950 flex items-center gap-2.5 cursor-pointer group transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-100/80 text-purple-800 group-hover:bg-purple-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                        <Crown className="w-3.5 h-3.5" />
                      </div>
                      <span>會員方案（訂閱與續約）</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onOpenAiCrm) onOpenAiCrm();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-800 hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-stone-950 group-hover:scale-105 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                          <Crown className="w-3.5 h-3.5 fill-stone-950" />
                        </div>
                        <span>AI-CRM (含24hr特助代操)</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        大師專屬
                      </span>
                    </button>
                  </div>

                  {/* 區塊 2：帳號管理 */}
                  <div className="py-1.5 px-1.5 space-y-0.5">
                    <p className="px-2 pt-0.5 pb-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      帳號管理
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('my_projects');
                        setSelectedQuestion(null);
                        setSelectedSolver(null);
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 cursor-pointer group transition-all ${
                        activeTab === 'my_projects'
                          ? 'bg-blue-50 text-blue-950 font-bold'
                          : 'text-stone-700 hover:bg-blue-50/80 hover:text-blue-950'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100/90 text-blue-700 group-hover:bg-blue-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <span>我的案件</span>
                    </button>
                    <button
                      onClick={() => handleOpenDashboard('questions_management')}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-indigo-50/80 hover:text-indigo-950 flex items-center gap-2.5 cursor-pointer group transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-100/90 text-indigo-700 group-hover:bg-indigo-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </div>
                      <span>問題管理</span>
                    </button>
                    <button
                      onClick={() => handleOpenDashboard('honors_achievements')}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-amber-50/80 hover:text-amber-950 flex items-center gap-2.5 cursor-pointer group transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100/90 text-amber-800 group-hover:bg-amber-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <span>個人成就與榮譽</span>
                    </button>
                  </div>

                  {/* 區塊 3：個資與認證 */}
                  <div className="py-1.5 px-1.5 space-y-0.5">
                    <p className="px-2 pt-0.5 pb-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      個資與認證
                    </p>
                    <button
                      onClick={() => handleOpenDashboard('profile')}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-cyan-50/80 hover:text-cyan-950 flex items-center gap-2.5 cursor-pointer group transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg bg-cyan-100/90 text-cyan-800 group-hover:bg-cyan-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span>帳號與基本資料</span>
                    </button>
                    <button
                      onClick={() => handleOpenDashboard('real_name_auth')}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-sky-50/80 hover:text-sky-950 flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-sky-100/90 text-sky-800 group-hover:bg-sky-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <span>實名認證</span>
                      </div>
                      {currentUser.realNameAuthStatus === 'verified' || currentUser.bankAccount?.isVerified ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">已認證</span>
                      ) : null}
                    </button>
                    <button
                      onClick={() => handleOpenDashboard('expert_certification')}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-emerald-50/80 hover:text-emerald-950 flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100/90 text-emerald-800 group-hover:bg-emerald-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <span>專家認證審查</span>
                      </div>
                      {currentUser.verifiedExpert || currentUser.verifiedBadge ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">認證專家</span>
                      ) : null}
                    </button>
                    <div
                      onClick={() => handleOpenDashboard('survey', 'survey-questions-section')}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-purple-50/80 hover:text-purple-950 flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-100/90 text-purple-800 group-hover:bg-purple-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all relative">
                          <ClipboardList className="w-3.5 h-3.5" />
                          {!currentUser.surveyData?.completedAt && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-1.5 ring-white" />
                          )}
                        </div>
                        <span>問卷(客戶調查)</span>
                      </div>
                      {currentUser.surveyData?.completedAt ? (
                        <span className="text-[10px] font-bold text-purple-750 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">已填寫</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            完成即送會員
                          </span>
                          <span
                            className="text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100/90 hover:bg-amber-200 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-0.5 transition-all shadow-2xs cursor-pointer"
                            title="查看會員活動"
                          >
                            <span>查看活動</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 區塊 4：通知與客服支援 */}
                  <div className="py-1.5 px-1.5 space-y-0.5">
                    <p className="px-2 pt-0.5 pb-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      通知與支援
                    </p>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsNotificationsSidebarOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-rose-50/80 hover:text-rose-950 flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-100/90 text-rose-700 group-hover:bg-rose-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <span>通知中心</span>
                      </div>
                      {unreadPersonalCount > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 shadow-2xs">
                          {unreadPersonalCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('about');
                        setSelectedQuestion(null);
                        setSelectedSolver(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-slate-50/80 hover:text-slate-950 flex items-center gap-2.5 cursor-pointer group transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100/90 text-slate-700 group-hover:bg-slate-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span>平台資訊（介紹與條款）</span>
                    </button>
                    {onStartOnboarding && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onStartOnboarding();
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-amber-50/80 hover:text-amber-950 flex items-center gap-2.5 cursor-pointer group transition-all"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-100/90 text-amber-800 group-hover:bg-amber-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </div>
                        <span>使用教學</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        openCustomerService({ subject: '來自右側個人選單之專人諮詢' });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-teal-50/80 hover:text-teal-950 flex items-center gap-2.5 cursor-pointer group transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100/90 text-teal-800 group-hover:bg-teal-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                        <Headphones className="w-3.5 h-3.5" />
                      </div>
                      <span>客服回報</span>
                    </button>
                  </div>

                  {/* 區塊 5：帳號權限與登出 */}
                  <div className="py-1.5 px-1.5 space-y-0.5">
                    <p className="px-2 pt-0.5 pb-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      帳號權限
                    </p>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        openAuthModal('login', 'switch');
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-stone-700 hover:bg-violet-50/80 hover:text-violet-950 flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-violet-100/90 text-violet-800 group-hover:bg-violet-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-black text-stone-900">
                            切換帳號
                          </span>
                          <span className="text-[10px] text-stone-500 font-normal">
                            快速切換或登入其他身分
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-violet-700 transition-colors" />
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-stone-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 cursor-pointer group transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-600 group-hover:bg-rose-100 group-hover:text-rose-700 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <span>登出帳號</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  </div>

      {/* 側邊欄抽屜 (左側熱門版面與專區) */}
      <CategorySidebar
        isOpen={isCategorySidebarOpen}
        onClose={() => setIsCategorySidebarOpen(false)}
        activeTab={activeTab}
        onOpenNotifications={() => {
          if (currentUser.role === 'admin') {
            handleOpenDashboard('admin_mail_disputes');
          } else {
            setIsNotificationsSidebarOpen(true);
          }
        }}
        onNavigateToAbout={(section) => {
          if (onNavigateToAbout) {
            onNavigateToAbout(section);
          } else {
            setActiveTab('about');
            setSelectedQuestion(null);
            setSelectedSolver(null);
          }
        }}
        onNavigateToSolvers={() => {
          setActiveTab('solvers');
          setSelectedQuestion(null);
          setSelectedSolver(null);
        }}
        onNavigateToLeaderboard={() => {
          setActiveTab('leaderboard');
          setSelectedQuestion(null);
          setSelectedSolver(null);
        }}
        onStartOnboarding={onStartOnboarding}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelectCategory={handleSidebarSelectCategory}
        specialZone={specialZone}
        onSelectSpecialZone={(zone) => {
          if (setSpecialZone) setSpecialZone(zone);
          setActiveTab('explore');
          setSelectedQuestion(null);
          setSelectedSolver(null);
        }}
        onOpenCreateQuestion={() => {
          if (isGuest) {
            promptLogin('訪客模式請先登入帳號以發布問題');
            return;
          }
          if (onOpenCreateQuestion) {
            onOpenCreateQuestion();
          } else {
            setActiveTab('create_question');
          }
        }}
        questions={questions}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {/* 右側通知中心抽屜 */}
      <NotificationsSidebar
        isOpen={isNotificationsSidebarOpen}
        onClose={() => setIsNotificationsSidebarOpen(false)}
        onOpenQuestion={(questionId) => {
          const target = questions.find((q) => q.id === questionId);
          if (target) {
            setSelectedQuestion(target);
            setActiveTab('question_detail');
          }
        }}
        onOpenChat={() => {
          setActiveTab('chat');
        }}
        onOpenAiCrm={() => {
          if (onOpenAiCrm) {
            onOpenAiCrm();
          } else {
            setActiveTab('ai_crm');
          }
        }}
        onNavigateToAbout={() => {
          setActiveTab('about');
          setSelectedQuestion(null);
          setSelectedSolver(null);
        }}
      />

      {/* 登入 / 註冊彈窗（含註冊強制勾選一般條款） */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
        initialMethod={authModalMethod}
        interceptReason={authModalInterceptReason}
      />
    </header>
  );
};

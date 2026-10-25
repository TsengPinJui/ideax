import React, { useState, useMemo } from 'react';
import { PublishedPlatformsBadges, usePlatformLinkChooser, platformLinksOf } from './PublishedPlatforms';
import { Question, MarketViewMode, SpecialZone } from '../types';
import { useApp } from '../context/AppContext';
import {
  Search,
  Plus,
  Heart,
  Globe,
  Cpu,
  Gamepad2,
  Workflow,
  Puzzle,
  LayoutGrid,
  Pin,
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Square,
  List,
  Terminal,
  Star,
  Coins,
  Eye,
  MessageCircle,
  Share2,
  ExternalLink,
  Flame,
  ArrowRight,
  Layers,
} from 'lucide-react';
import {
  isGuestUser,
  resolveUserDisplayName,
  resolveUserAvatar,
  getUserNameColorClass,
  isPlatformPublishedWork,
  PLATFORM_CURATED_NAME,
  PLATFORM_CURATED_AVATAR,
} from '../utils/userDisplay';
import { GuestBoardGateBlurOverlay } from './GuestBoardGateBlurOverlay';
import { getUniqueProposalCoverImage } from '../utils/proposalImageUtils';
import { findReferencedPainPoint } from '../utils/painPointLinking';
import { shareOrCopyUrl } from '../utils/shareUtils';
import { getFormattedAppNameAndTitle } from './QuestionCard';
import { GUEST_VISIBLE_COUNT, GUEST_BLURRED_TEASER_COUNT, registerGuestListExposure } from '../utils/guestAccess';
import { ProposalCardMediaBanner } from './ProposalCardMediaBanner';
import { isComingSoonWork, getExperienceScore } from '../utils/experienceRating';
import { getEffectiveQuestionViews } from '../utils/proposalClicks';

interface VibeCodingExhibitionViewProps {
  questions?: Question[];
  onSelectQuestion?: (q: Question) => void;
  onSelectApp?: (q: Question) => void;
  onOpenCreateVibeCoding?: () => void;
  onOpenCreateApp?: () => void;
  onCloseZone?: () => void;
  onTogglePin?: () => void;
  isPinned?: boolean;
  onSwitchZone?: (zone: SpecialZone) => void;
}

import { SOFTWARE_TERTIARY_CATEGORIES, SoftwareCategory } from '../types';

export const VIBE_CATEGORIES = [
  { id: 'all', label: '全部分類', icon: LayoutGrid, description: '全站所有軟體網站、AI 工具與互動遊戲' },
  { id: '遊戲', label: '遊戲', icon: Gamepad2, description: '熱門小遊戲、休閒互動、料理模擬與即時對戰' },
  { id: 'AI工具', label: 'AI工具', icon: Cpu, description: 'AI Agent 助手、生成式創作、視覺影音與數據洞察' },
  { id: '網站程式', label: '網站程式', icon: Globe, description: 'Web 服務、管理系統、電商平台與生活實用工具' },
  { id: '自動化', label: '自動化', icon: Workflow, description: '自動化流程、定時排程與效率工作流' },
  { id: '擴充功能', label: '擴充功能', icon: Puzzle, description: '瀏覽器外掛、開發工具與擴充套件' },
];

export const normalizeVibeCategory = (raw: string): string => {
  const s = (raw || '').trim();
  if (s === '網站程式' || s === '網站功能' || s === 'Web 應用程式' || s === 'Web應用' || s === '網站') return '網站程式';
  if (s === 'AI工具' || s === 'AI 智慧工具' || s === 'AI Agent 助手' || s === 'AI' || s === 'AI應用') return 'AI工具';
  if (s === '遊戲' || s === '小遊戲' || s === '創新互動與遊戲' || s === 'Game') return '遊戲';
  if (s === '自動化' || s === '自動化工作流' || s === '自動化流程' || s === '產業自動化流程') return '自動化';
  if (s === '擴充功能' || s === '瀏覽器擴充功能' || s === '效率工具' || s === '外掛') return '擴充功能';
  return s;
};

// 每個軟體作品嚴格只屬於單一分類
export const getQuestionVibeCategory = (q: Question): string => {
  if (
    q.id?.startsWith('game-hot-') ||
    q.subcategory === '遊戲' ||
    q.subcategories?.includes('遊戲') ||
    (q.tags && (q.tags.includes('遊戲') || q.tags.includes('小遊戲')))
  ) {
    return '遊戲';
  }
  const raw = (Array.isArray(q.subcategories) && q.subcategories[0]) || q.subcategory || '網站程式';
  const normalized = normalizeVibeCategory(raw);
  return ['網站程式', 'AI工具', '遊戲', '自動化', '擴充功能'].includes(normalized) ? normalized : '網站程式';
};

export const getQuestionVibeCategories = (q: Question): string[] => {
  return [getQuestionVibeCategory(q)];
};

export const VibeCodingExhibitionView: React.FC<VibeCodingExhibitionViewProps> = ({
  questions: propQuestions,
  onSelectQuestion,
  onSelectApp,
  onOpenCreateVibeCoding,
  onOpenCreateApp,
  onCloseZone,
  onTogglePin,
  isPinned = false,
  onSwitchZone,
}) => {
  const {
    currentUser,
    questions: contextQuestions,
    answers,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
    isQuestionLiked,
    toggleLikeQuestion,
    isQuestionSeconded,
    showCenterToast,
    addNotification,
    availableUsers,
    setSelectedQuestion,
    openAuthModal,
    publicMetricsConfig,
  } = useApp();
  const questions = propQuestions || contextQuestions || [];
  const handleSelect = onSelectApp || onSelectQuestion || (() => {});
  const handleOpenCreate = onOpenCreateApp || onOpenCreateVibeCoding || (() => {});
  const isAdmin = currentUser?.role === 'admin';
  const shouldShowViews = isAdmin && (publicMetricsConfig?.showCardViews ?? true);

  const [showZoneHelp, setShowZoneHelp] = useState(false);
  // 點「體驗」時，先讓觀眾選作者填的上架平台
  const platformChooser = usePlatformLinkChooser();
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  // 正式上架 (live) ⇄ 即將上架 (coming_soon) 即時切換，互不隸屬
  const [releaseTab, setReleaseTab] = useState<'live' | 'coming_soon'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState<string>('all');
  const [selectedTertiary, setSelectedTertiary] = useState<string>('all');
  const [isGroupedView, setIsGroupedView] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'popular' | 'latest' | 'tipped' | 'liked' | 'discussions' | 'most_views'>('latest');
  const [viewMode, setViewMode] = useState<MarketViewMode>('grid'); // 軟體網站作品牆默認小卡片 (雙欄方格) 顯示
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);

  const vibeApps = useMemo(() => {
    return questions.filter(
      (q) =>
        q.postType === 'vibecoding_app' ||
        q.specialZone === 'vibecoding' ||
        q.category === '網站程式' ||
        (q.category as string) === 'vibecoding' ||
        (q.tags && q.tags.some((t) => t.toLowerCase().includes('vibecoding')))
    );
  }, [questions]);

  // 正式上架作品池（互不隸屬，排除即將上架作品）
  const liveApps = useMemo(() => {
    return vibeApps.filter((q) => !isComingSoonWork(q));
  }, [vibeApps]);

  // 即將上架作品池（互不隸屬，僅收錄即將上架作品）
  const comingSoonApps = useMemo(() => {
    return vibeApps.filter(isComingSoonWork);
  }, [vibeApps]);

  const comingSoonCount = comingSoonApps.length;
  const liveCount = liveApps.length;

  // 當前看板專屬工作池（正式上架與即將上架互不隸屬）
  const activePool = useMemo(() => {
    return releaseTab === 'coming_soon' ? comingSoonApps : liveApps;
  }, [releaseTab, comingSoonApps, liveApps]);

  const isAppSavedByUser = (qId: string) => {
    return (
      isQuestionBookmarked(qId) ||
      isQuestionSeconded(qId) ||
      isQuestionLiked(qId)
    );
  };

  const favoriteCount = useMemo(() => {
    return activePool.filter((q) => isAppSavedByUser(q.id)).length;
  }, [activePool, questions]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activePool.length };
    VIBE_CATEGORIES.forEach((c) => {
      if (c.id !== 'all') counts[c.id] = 0;
    });
    activePool.forEach((q) => {
      const cat = getQuestionVibeCategory(q);
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      }
    });
    return counts;
  }, [activePool]);

  const filteredApps = useMemo(() => {
    let list = [...activePool];

    if (activeTab === 'favorites') {
      list = list.filter((q) => isAppSavedByUser(q.id));
    }

    if (selectedSubcat !== 'all') {
      list = list.filter((q) => getQuestionVibeCategory(q) === selectedSubcat);
      if (selectedTertiary !== 'all') {
        list = list.filter((q) => (q.tertiaryCategory || '') === selectedTertiary);
      }
    }

    if (searchQuery.trim()) {
      const kw = searchQuery.toLowerCase();
      list = list.filter(
        (q) =>
          (q.appName && q.appName.toLowerCase().includes(kw)) ||
          q.title.toLowerCase().includes(kw) ||
          q.description.toLowerCase().includes(kw) ||
          (q.authorName && q.authorName.toLowerCase().includes(kw)) ||
          (q.techArchitecture && q.techArchitecture.toLowerCase().includes(kw)) ||
          (q.referencedPainPoint && q.referencedPainPoint.toLowerCase().includes(kw)) ||
          (q.tags && q.tags.some((t) => t.toLowerCase().includes(kw)))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'tipped') {
        return (b.supportPoints || 0) - (a.supportPoints || 0);
      }
      if (sortBy === 'liked') {
        return (b.likes || 0) - (a.likes || 0);
      }
      if (sortBy === 'discussions') {
        const aDisc = (answers || []).filter((ans) => ans.questionId === a.id).length + (a.answersCount || 0);
        const bDisc = (answers || []).filter((ans) => ans.questionId === b.id).length + (b.answersCount || 0);
        return bDisc - aDisc;
      }
      if (sortBy === 'most_views') {
        const aViews = getEffectiveQuestionViews(a.id, a.views || 0);
        const bViews = getEffectiveQuestionViews(b.id, b.views || 0);
        if (bViews !== aViews) {
          return bViews - aViews;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      const scoreA = (a.likes || 0) * 3 + (a.supportPoints || 0) * 0.5 + (a.views || 0) * 0.1;
      const scoreB = (b.likes || 0) * 3 + (b.supportPoints || 0) * 0.5 + (b.views || 0) * 0.1;
      return scoreB - scoreA;
    });

    return list;
  }, [activePool, activeTab, selectedSubcat, selectedTertiary, searchQuery, sortBy, answers, questions]);

  const totalLikes = useMemo(
    () => activePool.reduce((acc, q) => acc + (q.likes || 0), 0),
    [activePool]
  );
  const totalSupportPoints = useMemo(
    () => activePool.reduce((acc, q) => acc + (q.supportPoints || 0), 0),
    [activePool]
  );

  const groupedSections = useMemo(() => {
    const categoriesToGroup = [
      { id: '遊戲', label: '遊戲專區', icon: Gamepad2, subtitle: '熱門小遊戲、休閒互動、料理模擬與即時對戰' },
      { id: 'AI工具', label: 'AI 智慧工具', icon: Cpu, subtitle: 'AI Agent 助手、生成式創作、視覺影音與智能分析' },
      { id: '網站程式', label: '網站系統與服務', icon: Globe, subtitle: 'Web 服務、管理後台、電商平台與生活實用工具' },
      { id: '自動化', label: '自動化工作流', icon: Workflow, subtitle: '定時排程、跨平台流程整合與效率機器人' },
      { id: '擴充功能', label: '擴充功能與套件', icon: Puzzle, subtitle: '瀏覽器外掛、開發套件與介面增強工具' },
    ];

    return categoriesToGroup
      .map((cat) => {
        const items = filteredApps.filter((q) => getQuestionVibeCategory(q) === cat.id);
        return {
          ...cat,
          items,
          count: items.length,
        };
      })
      .filter((group) => group.count > 0);
  }, [filteredApps]);

  // 收藏切換
  const handleToggleBookmark = (e: React.MouseEvent, q: Question) => {
    e.stopPropagation();
    const isAdded = toggleBookmarkQuestion(q.id);
    if (showCenterToast) {
      showCenterToast(isAdded ? `⭐ 已收藏軟體作品「${q.title}」！` : `已取消收藏「${q.title}」`);
    } else if (addNotification) {
      addNotification(isAdded ? `⭐ 已收藏軟體作品「${q.title}」！` : `已取消收藏「${q.title}」`, 'success');
    }
  };

  // Like 切換
  const handleToggleLike = (e: React.MouseEvent, q: Question) => {
    e.stopPropagation();
    if (!currentUser || currentUser.id === 'user-guest') {
      openAuthModal?.('login');
      return;
    }
    const res = toggleLikeQuestion(q.id);
    if (showCenterToast) {
      showCenterToast(res.isLiked ? `❤️ 已對「${q.title}」按 Like！` : `已取消 Like`);
    } else if (addNotification) {
      addNotification(res.isLiked ? `❤️ 已對「${q.title}」按 Like！` : `已取消 Like`, 'success');
    }
  };

  // 分享作品
  const handleShare = async (e: React.MouseEvent, q: Question) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?questionId=${q.id}`;
    await shareOrCopyUrl({
      title: `【IdeaX 軟體網站】${q.title}`,
      text: `分享軟體網站作品：${q.title}\n${q.description}`,
      url,
    });
    if (showCenterToast) showCenterToast('已複製作品網址！');
  };

  // 渲染大圖卡片 (像創點子創新提案那樣)
  const renderVibeAppCard = (app: Question) => {
    const isBookmarked = isQuestionBookmarked(app.id);
    const isLiked = isQuestionLiked(app.id);
    const { appName: displayAppName, cleanTitle: displayCleanTitle } = getFormattedAppNameAndTitle(app);
    const referencedPainPointObj = findReferencedPainPoint(app, questions);
    const isPlatformWork = isPlatformPublishedWork(app);
    const authorDisplayName = isPlatformWork ? PLATFORM_CURATED_NAME : resolveUserDisplayName(app.authorId, app.authorName, availableUsers);
    const authorDisplayAvatar = isPlatformWork ? PLATFORM_CURATED_AVATAR : resolveUserAvatar(app.authorId, app.authorAvatar, availableUsers);
    const authorColorClass = isPlatformWork ? 'text-amber-800 font-black' : getUserNameColorClass(app.authorId, availableUsers, {
      isOfficial: app.isOfficial,
      name: app.authorName,
      title: app.authorTitle,
    });
    const questionDiscussions = (answers || []).filter((a) => a.questionId === app.id);
    const discussionsCount = questionDiscussions.length || app.answersCount || 0;
    const effectiveViews = getEffectiveQuestionViews(app.id, app.views || 0);

    const coverImg =
      app.coverImage ||
      app.galleryImages?.[0] ||
      app.screenshots?.[0] ||
      getUniqueProposalCoverImage({
        id: app.id,
        title: app.title,
        track: app.subcategory,
      });

    const categories = getQuestionVibeCategories(app);
    const primaryCategory = categories[0] || '網站程式';
    const isComingSoon = isComingSoonWork(app);
    const expScore = getExperienceScore(app);

    // 1. 條列式 (List Mode)
    if (viewMode === 'list') {
      return (
        <div
          key={app.id}
          onClick={() => handleSelect(app)}
          className="bg-white rounded-2xl border border-stone-200 hover:border-indigo-400 p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 group"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-stone-800/80 shrink-0 relative">
              <img src={coverImg} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-90 brightness-115" />
              <img
                src={coverImg}
                alt={app.title}
                className="relative w-full h-full object-contain brightness-[1.08] contrast-[1.02]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getUniqueProposalCoverImage({ id: app.id, title: app.title }, 2);
                }}
              />
              <span className="absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-black/75 text-white backdrop-blur-xs flex items-center gap-0.5">
                <span>{primaryCategory}</span>
                {app.tertiaryCategory && <span className="text-amber-300">› {app.tertiaryCategory}</span>}
              </span>
              {isComingSoon && (
                <span className="absolute bottom-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-stone-950 shadow-xs">
                  ⏳ 即將上架
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {expScore.totalRatings > 0 && (
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded" title={`平均體驗分數：${expScore.score}分（${expScore.totalRatings}人評分）`}>
                    👍 {expScore.score}分
                  </span>
                )}
                {displayAppName && (
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                    {displayAppName}
                  </span>
                )}
                <h3 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {displayCleanTitle || app.title}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-1">
                {app.description}
              </p>
              <div className="flex items-center gap-2 pt-0.5 text-[10px] sm:text-[11px] text-stone-500">
                <span className={`truncate max-w-[110px] flex items-center gap-1 ${authorColorClass}`}>
                  <span>{authorDisplayName}</span>
                  {isPlatformWork && (
                    <span className="text-[9px] font-black px-1 rounded bg-amber-50 text-amber-700 border border-amber-300/80">
                      精選
                    </span>
                  )}
                </span>
                {app.techArchitecture && (
                  <span className="text-indigo-700 font-semibold truncate max-w-[120px]">
                    · {app.techArchitecture}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
            {shouldShowViews && (
              <span
                className="flex items-center gap-1 text-[11px] font-mono text-stone-500"
                title="管理員限定：累計點進內頁瀏覽次數"
              >
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>{effectiveViews}</span>
              </span>
            )}
            <div className="text-right">
              <div className="text-[10px] text-stone-400 font-bold">點數支持</div>
              <div className="text-xs sm:text-sm font-mono font-black text-indigo-900 flex items-center gap-1 justify-end">
                <Coins className="w-3.5 h-3.5 text-indigo-600" />
                <span>{(app.supportPoints || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => handleToggleBookmark(e, app)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-amber-600'
                }`}
                title={isBookmarked ? '⭐ 已收藏' : '⭐ 收藏'}
              >
                <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={(e) => handleToggleLike(e, app)}
                className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                }`}
                title="❤️ Like"
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : 'fill-rose-500 text-rose-500'}`} />
                <span className="font-mono">{app.likes || 0}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 2. 雙欄小卡片 (Grid Mode - 雙欄展示大圖卡片)
    if (viewMode === 'grid') {
      const isCardHovered = hoveredAppId === app.id;
      const fallbackImg = getUniqueProposalCoverImage({ id: app.id, title: app.title, track: primaryCategory });
      return (
        <div
          key={app.id}
          onClick={() => handleSelect(app)}
          onMouseEnter={() => setHoveredAppId(app.id)}
          onMouseLeave={() => setHoveredAppId((prev) => (prev === app.id ? null : prev))}
          className="bg-white rounded-2xl border border-stone-200 hover:border-indigo-400 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group h-full"
        >
          <ProposalCardMediaBanner
            youtubeUrl={app.youtubeUrl || app.vibeCodingData?.youtubeUrl}
            coverMode={app.coverMode || app.vibeCodingData?.coverMode}
            cardHoverMode={app.cardHoverMode || app.vibeCodingData?.cardHoverMode}
            coverImage={app.coverImage || app.vibeCodingData?.coverImageUrl}
            galleryImages={app.galleryImages || app.screenshots || app.vibeCodingData?.screenshots}
            fallbackImage={fallbackImg}
            onFallbackErrorImage={getUniqueProposalCoverImage({ id: app.id, title: app.title }, 2)}
            title={app.title}
            isHovered={isCardHovered}
            heightClass="aspect-video"
          >
            <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10 flex-wrap max-w-[85%]">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-md text-white border border-stone-700/80 shadow-xs flex items-center gap-1">
                <span>{primaryCategory}</span>
                {app.tertiaryCategory && <span className="text-amber-300 font-bold">› {app.tertiaryCategory}</span>}
              </span>
              {isComingSoon && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 border border-amber-600 shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-pulse" />
                  <span>⏳ 即將上架</span>
                </span>
              )}
              {expScore.totalRatings > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-md text-white border border-emerald-400/50 shadow-xs" title={`平均體驗評分：${expScore.score}分`}>
                  👍 {expScore.score}分
                </span>
              )}
            </div>

            <div className="absolute bottom-2 right-2 flex items-center gap-1 z-20">
              <button
                type="button"
                onClick={(e) => handleToggleBookmark(e, app)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all shadow-md cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-400 text-stone-950 scale-105'
                    : 'bg-white/95 backdrop-blur-md text-stone-700 hover:bg-white'
                }`}
                title={isBookmarked ? '⭐ 已收藏' : '⭐ 收藏'}
              >
                <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-stone-950 text-stone-950' : 'text-amber-500'}`} />
              </button>
              <button
                type="button"
                onClick={(e) => handleToggleLike(e, app)}
                className={`h-7 px-2 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all shadow-md cursor-pointer ${
                  isLiked
                    ? 'bg-rose-500 text-white scale-105'
                    : 'bg-white/95 backdrop-blur-md text-rose-600 hover:bg-white'
                }`}
                title="❤️ Like"
              >
                <Heart className={`w-3 h-3 ${isLiked ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                <span className="font-mono">{app.likes || 0}</span>
              </button>
            </div>
          </ProposalCardMediaBanner>

          <div className="p-3 flex-1 flex flex-col justify-between gap-2">
            <div className="space-y-1">
              <h3 className="text-xs sm:text-sm font-black text-stone-900 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug">
                {displayAppName ? (
                  <>
                    <span className="text-indigo-600 font-black mr-1">【{displayAppName}】</span>
                    <span>{displayCleanTitle}</span>
                  </>
                ) : (
                  app.title
                )}
              </h3>
              <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                {app.description}
              </p>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1 text-[10px]">
              <span className={`truncate max-w-[95px] flex items-center gap-1 ${authorColorClass}`}>
                <span>{authorDisplayName}</span>
                {isPlatformWork && (
                  <span className="text-[8px] font-black px-1 rounded bg-amber-50 text-amber-700 border border-amber-300/80">
                    精選
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {shouldShowViews && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-mono text-stone-500"
                    title="管理員限定：累計點進內頁瀏覽次數"
                  >
                    <Eye className="w-3 h-3 text-stone-400" />
                    <span>{effectiveViews}</span>
                  </span>
                )}
                <span className="font-mono font-black text-indigo-700 flex items-center gap-0.5 shrink-0">
                  <Coins className="w-3 h-3" />
                  {(app.supportPoints || 0).toLocaleString()} 點
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3. 大卡片 (Large Mode - 預設含封面大圖，支援滑鼠移入播放影片或圖片輪播)
    const isLargeHovered = hoveredAppId === app.id;
    const fallbackLargeImg = getUniqueProposalCoverImage({ id: app.id, title: app.title, track: primaryCategory });
    return (
      <div
        key={app.id}
        onClick={() => handleSelect(app)}
        onMouseEnter={() => setHoveredAppId(app.id)}
        onMouseLeave={() => setHoveredAppId((prev) => (prev === app.id ? null : prev))}
        className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden cursor-pointer group relative"
      >
        {/* Cover Image / Header Banner (像創點子創新提案的大圖展示) */}
        <ProposalCardMediaBanner
          youtubeUrl={app.youtubeUrl || app.vibeCodingData?.youtubeUrl}
          coverMode={app.coverMode || app.vibeCodingData?.coverMode}
          cardHoverMode={app.cardHoverMode || app.vibeCodingData?.cardHoverMode}
          coverImage={app.coverImage || app.vibeCodingData?.coverImageUrl}
          galleryImages={app.galleryImages || app.screenshots || app.vibeCodingData?.screenshots}
          fallbackImage={fallbackLargeImg}
          onFallbackErrorImage={getUniqueProposalCoverImage({ id: app.id, title: app.title }, 2)}
          title={app.title}
          isHovered={isLargeHovered}
          heightClass="h-40 sm:h-48"
        >
          {/* Top Overlay Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none z-10">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-md text-white border border-stone-700/80 shadow-xs flex items-center gap-1">
                <span>軟體 › {primaryCategory}</span>
                {app.tertiaryCategory && (
                  <>
                    <span className="text-stone-400">›</span>
                    <span className="text-amber-300 font-bold">{app.tertiaryCategory}</span>
                  </>
                )}
              </span>
              {expScore.totalRatings > 0 && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-md text-white border border-emerald-400/50 shadow-xs" title={`平均體驗評分：${expScore.score}分 (${expScore.totalRatings}位評分)`}>
                  👍 {expScore.score}分
                </span>
              )}
            </div>

            {isComingSoon ? (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 border border-amber-600 flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-pulse" />
                <span>⏳ 即將上架</span>
              </span>
            ) : app.demoUrl ? (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-200 border border-emerald-700/80 flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>可試玩體驗</span>
              </span>
            ) : (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-950/80 backdrop-blur-md text-indigo-200 border border-indigo-700/80 shadow-xs">
                軟體作品
              </span>
            )}
          </div>

          {/* ⭐ 收藏 + ❤️ Like 按鈕組 (像創點子那樣) */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-20">
            <button
              type="button"
              onClick={(e) => handleToggleBookmark(e, app)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-md cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-400 text-stone-950 hover:bg-amber-300 scale-105'
                  : 'bg-white/95 backdrop-blur-md text-stone-700 hover:bg-white hover:text-amber-600'
              }`}
              title={isBookmarked ? '⭐ 已收藏（點擊取消）' : '⭐ 收藏作品'}
            >
              <Star className={`w-4 h-4 ${isBookmarked ? 'fill-stone-950 text-stone-950' : 'text-amber-500'}`} />
            </button>
            <button
              type="button"
              onClick={(e) => handleToggleLike(e, app)}
              className={`h-8 px-2.5 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-all shadow-md cursor-pointer ${
                isLiked
                  ? 'bg-rose-500 text-white hover:bg-rose-600 scale-105'
                  : 'bg-white/95 backdrop-blur-md text-rose-600 hover:bg-white hover:text-rose-500'
              }`}
              title={isLiked ? '❤️ 已 Like（點擊取消）' : '❤️ Like 此作品'}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
              <span className="font-mono">{app.likes || 0}</span>
            </button>
          </div>
        </ProposalCardMediaBanner>

        {/* Card Content Body */}
        <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-black text-stone-900 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug">
              {displayAppName ? (
                <>
                  <span className="text-indigo-600 font-black mr-1">【{displayAppName}】</span>
                  <span>{displayCleanTitle}</span>
                </>
              ) : (
                app.title
              )}
            </h3>
            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
              {app.description}
            </p>

            {/* 關聯痛點貼文連結 (解決痛點) */}
            {(referencedPainPointObj || app.referencedPainPoint) && (
              <div
                onClick={(e) => {
                  if (referencedPainPointObj) {
                    e.stopPropagation();
                    setSelectedQuestion(referencedPainPointObj);
                  }
                }}
                className={`p-2 rounded-xl bg-rose-50/90 border border-rose-200/80 text-[11px] text-rose-900 flex items-center justify-between gap-1.5 transition-colors ${
                  referencedPainPointObj ? 'hover:bg-rose-100/80 hover:border-rose-300 cursor-pointer' : ''
                }`}
                title={referencedPainPointObj ? '點擊前往查看對應之痛點貼文' : undefined}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-rose-600 shrink-0">🎯</span>
                  <span className="truncate font-bold">
                    解決痛點：{referencedPainPointObj ? referencedPainPointObj.title : app.referencedPainPoint?.replace(/^\[[^\]]+\]\s*/, '')}
                  </span>
                </div>
                {referencedPainPointObj && (
                  <span className="text-[10px] font-black text-rose-700 shrink-0">
                    查看痛點 ➔
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 開發者與技術架構 */}
          <div className="flex items-center gap-2.5 pt-1 border-t border-stone-100">
            <img
              src={authorDisplayAvatar}
              alt={authorDisplayName}
              className={`w-7 h-7 rounded-full object-cover border shrink-0 ${isPlatformWork ? 'border-amber-400 ring-1 ring-amber-300' : 'border-stone-200'}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs truncate ${authorColorClass}`}>
                  {authorDisplayName}
                </span>
                {isPlatformWork && (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-300/80">
                    精選刊登
                  </span>
                )}
              </div>
              {app.techArchitecture && (
                <div className="text-[10px] text-indigo-700 font-semibold truncate">
                  {app.techArchitecture}
                </div>
              )}
              <PublishedPlatformsBadges platforms={app.publishedPlatforms} size="sm" max={3} linkable={false} className="mt-1" />
            </div>
          </div>

          {/* Data Stats: ［點數支持］ & 按讚收藏 (完全像創點子創新提案那樣！) */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-800 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4 text-indigo-700" />
              </div>
              <div>
                <div className="text-[10px] text-stone-500 font-bold">點數支持</div>
                <div className="text-xs font-mono font-black text-indigo-950">
                  {(app.supportPoints || 0).toLocaleString()} 點
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-stone-500 font-bold">Like</div>
              <div className="text-xs font-mono font-black text-rose-600 flex items-center gap-1 justify-end">
                <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                <span>{app.likes || 0}</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-stone-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1" title="討論數">
                <MessageCircle className="w-3.5 h-3.5 text-stone-400" />
                <span>{discussionsCount}</span>
              </span>
              {shouldShowViews && (
                <span
                  className="flex items-center gap-1 text-[11px] font-mono text-stone-500"
                  title="管理員限定：累計點進內頁瀏覽次數"
                >
                  <Eye className="w-3.5 h-3.5 text-stone-400" />
                  <span>{effectiveViews}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(app.demoUrl || platformLinksOf(app.publishedPlatforms).length > 0) && (
                <a
                  href={app.demoUrl || platformLinksOf(app.publishedPlatforms)[0]?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => platformChooser.onLinkClick(e, { title: app.appName || app.title, demoUrl: app.demoUrl, platforms: app.publishedPlatforms })}
                  className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold text-[10px] flex items-center gap-1 transition-colors"
                  title="開啟線上試用網址"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>前往網站</span>
                </a>
              )}
              <button
                type="button"
                onClick={(e) => handleShare(e, app)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                title="分享作品"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {platformChooser.chooser}
      {/* 專區 Main Banner Block (與創點子統一佈局) */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-500/10 via-indigo-100/40 to-purple-50 border-2 border-indigo-300 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-indigo-200/40 rounded-full blur-2xl pointer-events-none" />

        {/* 右上角叉叉按鈕：點擊回到全部問題 */}
        {onCloseZone && (
          <button
            type="button"
            onClick={onCloseZone}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-500 hover:text-stone-900 border border-indigo-300 shadow-2xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="回到全部問題"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="relative z-10 space-y-2.5">
          {/* 第一列：圖示 + 標題 + 釘選 + 即時切換（🚀 正式上架 ⇄ ⏳ 即將上架，互不隸屬） */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <Terminal className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                <span>軟體網站作品牆</span>
                {onTogglePin && (
                  <button
                    type="button"
                    onClick={onTogglePin}
                    className={`p-1 rounded-lg transition-all cursor-pointer ${
                      isPinned
                        ? 'bg-indigo-600 text-white border border-indigo-700 shadow-xs'
                        : 'bg-white hover:bg-stone-50 text-stone-400 hover:text-stone-700 border border-stone-200'
                    }`}
                    title={isPinned ? '取消釘選此專區' : '釘選為首頁專區'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-white' : ''}`} />
                  </button>
                )}
              </h1>
            </div>

            {/* 即時切換看板：🚀 正式上架 ⇄ ⏳ 即將上架（互不隸屬） */}
            <div className="inline-flex rounded-2xl bg-white/95 p-1 border border-indigo-200 shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setReleaseTab('live');
                  setSelectedSubcat('all');
                  setSelectedTertiary('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  releaseTab === 'live'
                    ? 'bg-indigo-600 text-white shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
                title="切換至正式上架看板（互不隸屬）"
              >
                <span>🚀 正式上架</span>
                <span
                  className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    releaseTab === 'live' ? 'bg-indigo-700 text-white' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {liveCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReleaseTab('coming_soon');
                  setSelectedSubcat('all');
                  setSelectedTertiary('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  releaseTab === 'coming_soon'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-amber-50/60'
                }`}
                title="切換至即將上架看板（互不隸屬）"
              >
                <span>⏳ 即將上架</span>
                <span
                  className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    releaseTab === 'coming_soon'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {comingSoonCount}
                </span>
              </button>
            </div>
          </div>

          {/* 第二列：說明按鈕 (左) + 百里挑一標語 + 刊登作品按鈕 (置右) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowZoneHelp(!showZoneHelp)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  showZoneHelp
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white/90 hover:bg-white text-indigo-900 border-indigo-300'
                }`}
                title="點擊展開/收合專區說明"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>說明</span>
                {showZoneHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <span className="text-xs sm:text-sm font-black text-amber-800 tracking-tight">
                “能上IdeaX的作品都是百里挑一！”
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'favorites' ? 'all' : 'favorites')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  activeTab === 'favorites'
                    ? 'bg-rose-500 text-white shadow-xs border-rose-500 font-black ring-2 ring-rose-200'
                    : 'bg-white text-stone-700 hover:bg-rose-50/60 border-stone-200 hover:border-rose-300'
                }`}
                title={activeTab === 'favorites' ? '查看全部作品' : '查看我收藏/Like的作品'}
              >
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'favorites' ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                <span>收藏</span>
                <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'favorites' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'
                }`}>
                  {favoriteCount}
                </span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white active:bg-emerald-700 active:text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>刊登作品</span>
              </button>
            </div>
          </div>
        </div>

        {/* 點擊 ? 展開之專區介紹 */}
        {showZoneHelp && (
          <div className="relative z-10 mt-3 pt-3 border-t border-indigo-200/80 space-y-1.5 animate-in fade-in duration-150">
            <p className="text-xs font-medium text-stone-700 leading-relaxed">
              收錄網站程式、AI工具、遊戲、自動化與擴充功能，歡迎直接試玩體驗、留言回饋交流或給予開發者點數支持。
            </p>
          </div>
        )}

        {/* 篩選分類、我的收藏、搜尋、排序與檢視切換 */}
        <div className="relative z-10 mt-3 pt-3 border-t border-indigo-200/80 space-y-2">
          {/* 上排：分類標籤按鈕列 (全部分類、遊戲、AI工具、網站程式、自動化、擴充功能) + 我的按讚收藏 */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
            {VIBE_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id] ?? 0;
              const isSelected = activeTab === 'all' && selectedSubcat === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubcat(cat.id);
                    setSelectedTertiary('all');
                    setActiveTab('all');
                  }}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-black ring-2 ring-indigo-200'
                      : 'bg-white/90 hover:bg-white text-stone-700 hover:text-indigo-900 border-indigo-200/80 hover:border-indigo-300'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSelected ? 'text-white' : 'text-indigo-600'}`} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-indigo-700/80 text-white' : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 第三級分類標籤（例如：軟體 > 遊戲 > 模擬） */}
          {selectedSubcat !== 'all' && (SOFTWARE_TERTIARY_CATEGORIES[selectedSubcat as SoftwareCategory] || []).length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs animate-in fade-in duration-150">
              <span className="text-[10px] font-bold text-indigo-900 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded-md shrink-0">
                軟體 › {selectedSubcat} ›
              </span>
              <button
                type="button"
                onClick={() => setSelectedTertiary('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 transition-all cursor-pointer ${
                  selectedTertiary === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs font-black'
                    : 'bg-white/90 hover:bg-white text-stone-700 border border-indigo-200'
                }`}
              >
                全部 ({categoryCounts[selectedSubcat] ?? 0})
              </button>
              {(SOFTWARE_TERTIARY_CATEGORIES[selectedSubcat as SoftwareCategory] || []).map((tCat) => {
                const isTSelected = selectedTertiary === tCat;
                const tCount = activePool.filter(
                  (q) => getQuestionVibeCategory(q) === selectedSubcat && q.tertiaryCategory === tCat
                ).length;
                return (
                  <button
                    key={tCat}
                    type="button"
                    onClick={() => setSelectedTertiary(tCat)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                      isTSelected
                        ? 'bg-indigo-600 text-white shadow-2xs font-black'
                        : 'bg-white/90 hover:bg-white text-stone-700 border border-indigo-200'
                    }`}
                  >
                    <span>{tCat}</span>
                    <span className="text-[10px] opacity-75 font-mono font-normal">({tCount})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 下排：搜尋框 + 排序下拉選單 + 卡片檢視切換 (大卡片/條列式/小卡片) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋作品名稱、功能或開發者..."
                className="w-full pl-9 sm:pl-10 pr-7 py-2 sm:py-2.5 rounded-xl border border-indigo-200 bg-white text-xs sm:text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-indigo-200 bg-white text-xs sm:text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shrink-0"
              >
                <option value="popular">🔥 熱門推薦</option>
                <option value="tipped">🪙 點數支持 高到低</option>
                <option value="liked">❤️ Like 最多</option>
                <option value="discussions">💬 討論數最多</option>
                <option value="latest">🕒 最新發布</option>
                {isAdmin && (
                  <option value="most_views">👁️ 瀏覽次數</option>
                )}
              </select>

              {/* 依分類歸納切換鍵（全部分類時可用） */}
              {selectedSubcat === 'all' && activeTab === 'all' && !searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setIsGroupedView(!isGroupedView)}
                  className={`px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isGroupedView
                      ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-black shadow-2xs'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border-indigo-200'
                  }`}
                  title={isGroupedView ? '目前：依分類歸納分組（點擊切換為平鋪列表）' : '目前：平鋪列表（點擊切換為依分類歸納分組）'}
                >
                  <Layers className={`w-3.5 h-3.5 ${isGroupedView ? 'text-indigo-600' : 'text-stone-400'}`} />
                  <span className="hidden sm:inline">{isGroupedView ? '分類歸納' : '全部平鋪'}</span>
                </button>
              )}

              {/* 檢視模式切換 (大卡片 / 條列式 / 小卡片) */}
              <div className="inline-flex rounded-xl bg-white/90 border border-indigo-200 p-0.5 sm:p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('large')}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'large'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="大卡片模式"
                >
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="條列式清單"
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-indigo-600 text-white shadow-2xs'
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

      {/* Exhibition Grid */}
      {filteredApps.length === 0 ? (
        <div className={`rounded-3xl border p-10 text-center space-y-3 ${
          releaseTab === 'coming_soon'
            ? 'bg-amber-50/40 border-dashed border-amber-300'
            : 'bg-white border-stone-200'
        }`}>
          {releaseTab === 'coming_soon' ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl font-bold shadow-2xs">
                ⏳
              </div>
              <h3 className="text-sm font-black text-stone-900">
                目前尚無即將上架的作品
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                「即將上架」與正式上架互不隸屬，專供預告展示與提前造勢。管理員於後台或創作者於發布/編輯頁皆可設定作品為「即將上架」。
              </p>
              <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setReleaseTab('live')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-2xs"
                >
                  切換至正式上架 ({liveCount})
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-4 py-2 rounded-xl border-2 border-amber-600 bg-white text-amber-800 hover:bg-amber-600 hover:text-white font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>刊登預告作品</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-stone-800">
                {activeTab === 'favorites' ? '尚無 Like 的軟體作品' : '沒有找到符合條件的作品'}
              </h3>
              <p className="text-xs text-stone-500">
                {activeTab === 'favorites'
                  ? '瀏覽作品時點擊 ❤️，即可在此快速查看！'
                  : '試試看切換其他分類，或直接刊登你的第一件軟體作品。'}
              </p>
              {activeTab === 'favorites' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                >
                  瀏覽全部作品
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-4 py-2 rounded-lg border-2 border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white active:bg-emerald-700 active:text-white font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>刊登作品</span>
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        (() => {
          const isGuest = isGuestUser(currentUser);
          const shouldShowGrouped = isGroupedView && selectedSubcat === 'all' && activeTab === 'all' && !searchQuery.trim();

          // 1. 按照分類歸納分組展示（遊戲、AI工具、網站程式、自動化、擴充功能）
          if (shouldShowGrouped) {
            return (
              <div className="space-y-8 animate-in fade-in duration-200">
                {groupedSections.map((group) => {
                  const visibleGroupApps = isGuest ? group.items.slice(0, GUEST_VISIBLE_COUNT) : group.items;
                  const Icon = group.icon;
                  return (
                    <section key={group.id} className="space-y-3.5">
                      <div className="flex items-center justify-between gap-3 pb-2.5 border-b-2 border-indigo-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/90 flex items-center justify-center text-indigo-700 shadow-2xs shrink-0">
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                                {group.label}
                              </h2>
                              <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                {group.count} 件
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 font-medium truncate hidden sm:block">
                              {group.subtitle}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubcat(group.id);
                            setSelectedTertiary('all');
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all cursor-pointer shrink-0"
                        >
                          <span>查看專區</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div
                        className={
                          viewMode === 'grid'
                            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
                            : viewMode === 'list'
                            ? 'flex flex-col space-y-2.5 sm:space-y-3'
                            : 'grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5'
                        }
                      >
                        {visibleGroupApps.map(renderVibeAppCard)}
                      </div>
                    </section>
                  );
                })}

                {isGuest && filteredApps.length > GUEST_VISIBLE_COUNT && (
                  <GuestBoardGateBlurOverlay
                    remainingCount={filteredApps.length - GUEST_VISIBLE_COUNT}
                    totalCount={filteredApps.length}
                    boardName="軟體網站展場"
                    onOpenAuth={() => openAuthModal('login')}
                  />
                )}
              </div>
            );
          }

          // 2. 單一分類或平鋪清單展示
          const visibleApps = isGuest ? filteredApps.slice(0, GUEST_VISIBLE_COUNT) : filteredApps;
          if (isGuest) registerGuestListExposure(filteredApps);
          const blurredApps = isGuest && filteredApps.length > GUEST_VISIBLE_COUNT ? filteredApps.slice(GUEST_VISIBLE_COUNT, GUEST_VISIBLE_COUNT + GUEST_BLURRED_TEASER_COUNT) : [];

          return (
            <>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
                    : viewMode === 'list'
                    ? 'flex flex-col space-y-2.5 sm:space-y-3'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5'
                }
              >
                {visibleApps.map(renderVibeAppCard)}
              </div>

              {isGuest && filteredApps.length > GUEST_VISIBLE_COUNT && (
                <GuestBoardGateBlurOverlay
                  remainingCount={filteredApps.length - GUEST_VISIBLE_COUNT}
                  totalCount={filteredApps.length}
                  boardName="軟體網站展場"
                  onOpenAuth={() => openAuthModal('login')}
                  blurredPreviewChildren={
                    <div
                      className={
                        viewMode === 'grid'
                          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
                          : viewMode === 'list'
                          ? 'flex flex-col space-y-2.5 sm:space-y-3'
                          : 'grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5'
                      }
                    >
                      {blurredApps.map(renderVibeAppCard)}
                    </div>
                  }
                />
              )}
            </>
          );
        })()
      )}
    </div>
  );
};

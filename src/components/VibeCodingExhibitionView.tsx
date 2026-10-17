import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { isGuestUser, resolveUserDisplayName, resolveUserAvatar, getUserNameColorClass } from '../utils/userDisplay';
import { GuestBoardGateBlurOverlay } from './GuestBoardGateBlurOverlay';
import { getUniqueProposalCoverImage } from '../utils/proposalImageUtils';
import { findReferencedPainPoint } from '../utils/painPointLinking';
import { shareOrCopyUrl } from '../utils/shareUtils';
import { getFormattedAppNameAndTitle } from './QuestionCard';

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

const VIBE_CATEGORIES = [
  { id: 'all', label: '全部分類', icon: LayoutGrid },
  { id: '網站程式', label: '網站程式', icon: Globe },
  { id: 'AI工具', label: 'AI工具', icon: Cpu },
  { id: '小遊戲', label: '小遊戲', icon: Gamepad2 },
  { id: '自動化', label: '自動化', icon: Workflow },
  { id: '擴充功能', label: '擴充功能', icon: Puzzle },
];

export const normalizeVibeCategory = (raw: string): string => {
  const s = (raw || '').trim();
  if (s === '網站程式' || s === '網站功能' || s === 'Web 應用程式' || s === 'Web應用') return '網站程式';
  if (s === 'AI工具' || s === 'AI 智慧工具' || s === 'AI Agent 助手') return 'AI工具';
  if (s === '小遊戲' || s === '創新互動與遊戲') return '小遊戲';
  if (s === '自動化' || s === '自動化工作流' || s === '自動化流程' || s === '產業自動化流程') return '自動化';
  if (s === '擴充功能' || s === '瀏覽器擴充功能' || s === '效率工具') return '擴充功能';
  return s;
};

export const getQuestionVibeCategories = (q: Question): string[] => {
  const rawList =
    Array.isArray(q.subcategories) && q.subcategories.length > 0
      ? q.subcategories
      : q.subcategory
      ? [q.subcategory]
      : ['網站程式'];
  const normalized = Array.from(
    new Set(
      rawList
        .map(normalizeVibeCategory)
        .filter((c) => ['網站程式', 'AI工具', '小遊戲', '自動化', '擴充功能'].includes(c))
    )
  );
  return normalized.length > 0 ? normalized.slice(0, 3) : ['網站程式'];
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
  } = useApp();
  const questions = propQuestions || contextQuestions || [];
  const handleSelect = onSelectApp || onSelectQuestion || (() => {});
  const handleOpenCreate = onOpenCreateApp || onOpenCreateVibeCoding || (() => {});

  const [showZoneHelp, setShowZoneHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'latest' | 'tipped' | 'liked' | 'discussions'>('popular');
  const [viewMode, setViewMode] = useState<MarketViewMode>('large');

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

  const isAppSavedByUser = (qId: string) => {
    return (
      isQuestionBookmarked(qId) ||
      isQuestionSeconded(qId) ||
      isQuestionLiked(qId)
    );
  };

  const favoriteCount = useMemo(() => {
    return vibeApps.filter((q) => isAppSavedByUser(q.id)).length;
  }, [vibeApps, questions]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: vibeApps.length };
    VIBE_CATEGORIES.forEach((c) => {
      if (c.id !== 'all') counts[c.id] = 0;
    });
    vibeApps.forEach((q) => {
      const cats = getQuestionVibeCategories(q);
      cats.forEach((cat) => {
        if (counts[cat] !== undefined) {
          counts[cat] += 1;
        }
      });
    });
    return counts;
  }, [vibeApps]);

  const filteredApps = useMemo(() => {
    let list = [...vibeApps];

    if (activeTab === 'favorites') {
      list = list.filter((q) => isAppSavedByUser(q.id));
    }

    if (selectedSubcat !== 'all') {
      list = list.filter((q) => {
        const cats = getQuestionVibeCategories(q);
        return cats.includes(selectedSubcat);
      });
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
      const scoreA = (a.likes || 0) * 3 + (a.supportPoints || 0) * 0.5 + (a.views || 0) * 0.1;
      const scoreB = (b.likes || 0) * 3 + (b.supportPoints || 0) * 0.5 + (b.views || 0) * 0.1;
      return scoreB - scoreA;
    });

    return list;
  }, [vibeApps, activeTab, selectedSubcat, searchQuery, sortBy, answers, questions]);

  const totalLikes = useMemo(
    () => vibeApps.reduce((acc, q) => acc + (q.likes || 0), 0),
    [vibeApps]
  );
  const totalSupportPoints = useMemo(
    () => vibeApps.reduce((acc, q) => acc + (q.supportPoints || 0), 0),
    [vibeApps]
  );

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
      title: `【IdeaX VibeCoding】${q.title}`,
      text: `分享 VibeCoding 軟體作品：${q.title}\n${q.description}`,
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
    const authorDisplayName = resolveUserDisplayName(app.authorId, app.authorName, availableUsers);
    const authorDisplayAvatar = resolveUserAvatar(app.authorId, app.authorAvatar, availableUsers);
    const authorColorClass = getUserNameColorClass(app.authorId, availableUsers, {
      isOfficial: app.isOfficial,
      name: app.authorName,
      title: app.authorTitle,
    });
    const questionDiscussions = (answers || []).filter((a) => a.questionId === app.id);
    const discussionsCount = questionDiscussions.length || app.answersCount || 0;

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

    // 1. 條列式 (List Mode)
    if (viewMode === 'list') {
      return (
        <div
          key={app.id}
          onClick={() => handleSelect(app)}
          className="bg-white rounded-2xl border border-stone-200 hover:border-indigo-400 p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 group"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-24 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0 relative">
              <img
                src={coverImg}
                alt={app.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getUniqueProposalCoverImage({ id: app.id, title: app.title }, 2);
                }}
              />
              <span className="absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-black/75 text-white backdrop-blur-xs">
                {primaryCategory}
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {displayAppName && (
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                    {displayAppName}
                  </span>
                )}
                {app.currentVersion && (
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                    {app.currentVersion}
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
                <span className={`font-bold truncate max-w-[100px] ${authorColorClass}`}>
                  {authorDisplayName}
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
      return (
        <div
          key={app.id}
          onClick={() => handleSelect(app)}
          className="bg-white rounded-2xl border border-stone-200 hover:border-indigo-400 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group h-full"
        >
          <div className="relative h-28 sm:h-36 bg-stone-100 overflow-hidden group/img">
            <img
              src={coverImg}
              alt={app.title}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getUniqueProposalCoverImage({ id: app.id, title: app.title }, 2);
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />

            <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-md text-white border border-stone-700/80 shadow-xs">
                {primaryCategory}
              </span>
              {app.currentVersion && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-blue-600/90 text-white shadow-xs">
                  {app.currentVersion}
                </span>
              )}
            </div>

            <div className="absolute bottom-2 right-2 flex items-center gap-1">
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
          </div>

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
              <span className={`font-bold truncate max-w-[80px] ${authorColorClass}`}>
                {authorDisplayName}
              </span>
              <span className="font-mono font-black text-indigo-700 flex items-center gap-0.5 shrink-0">
                <Coins className="w-3 h-3" />
                {(app.supportPoints || 0).toLocaleString()} 點
              </span>
            </div>
          </div>
        </div>
      );
    }

    // 3. 大卡片 (Large Mode - 預設含封面大圖，像創點子創新提案那樣)
    return (
      <div
        key={app.id}
        onClick={() => handleSelect(app)}
        className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden cursor-pointer group relative"
      >
        {/* Cover Image / Header Banner (像創點子創新提案的大圖展示) */}
        <div className="h-40 sm:h-48 bg-stone-100 relative overflow-hidden group/img">
          <img
            src={coverImg}
            alt={app.title}
            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getUniqueProposalCoverImage({ id: app.id, title: app.title }, 2);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />

          {/* Top Overlay Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-md text-white border border-stone-700/80 shadow-xs">
                {primaryCategory}
              </span>
              {app.currentVersion && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-600/90 backdrop-blur-md text-white shadow-xs">
                  {app.currentVersion}
                </span>
              )}
            </div>

            {app.demoUrl ? (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-200 border border-emerald-700/80 flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>可線上體驗</span>
              </span>
            ) : (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-950/80 backdrop-blur-md text-indigo-200 border border-indigo-700/80 shadow-xs">
                軟體作品
              </span>
            )}
          </div>

          {/* ⭐ 收藏 + ❤️ Like 按鈕組 (像創點子那樣) */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
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
        </div>

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
              className="w-7 h-7 rounded-full object-cover border border-stone-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-bold truncate ${authorColorClass}`}>
                {authorDisplayName}
              </div>
              {app.techArchitecture && (
                <div className="text-[10px] text-indigo-700 font-semibold truncate">
                  {app.techArchitecture}
                </div>
              )}
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
              <span className="flex items-center gap-1" title="瀏覽次數">
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>{app.views || 0}</span>
              </span>
              <span className="flex items-center gap-1" title="討論數">
                <MessageCircle className="w-3.5 h-3.5 text-stone-400" />
                <span>{discussionsCount}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {app.demoUrl && (
                <a
                  href={app.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold text-[10px] flex items-center gap-1 transition-colors"
                  title="開啟線上試用網址"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>體驗</span>
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
          {/* 第一列：圖示 + 標題 + 釘選 + 數量 */}
          <div className="flex items-center gap-2.5 flex-wrap pr-10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Terminal className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-1.5 flex-wrap">
              <span>VibeCoding (軟體與網站作品牆)</span>
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
              <span className="text-[11px] font-mono font-black text-indigo-900 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-full">
                {vibeApps.length} 件作品
              </span>
            </h1>
          </div>

          {/* 第二列：說明按鈕 (左) + 刊登作品按鈕 (置右) */}
          <div className="flex items-center justify-between gap-2">
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

            <div className="ml-auto flex items-center gap-2">
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
              收錄網站程式、AI工具、小遊戲、自動化與擴充功能，可直接試用、留言回饋或給予開發者點數支持。
            </p>
            <div className="text-[11px] text-indigo-800 font-bold">
              累計 {totalLikes.toLocaleString()} 個讚 · 累計支持 {totalSupportPoints.toLocaleString()} 點
            </div>
          </div>
        )}

        {/* 篩選分類、我的收藏、搜尋、排序與檢視切換 */}
        <div className="relative z-10 mt-3 pt-3 border-t border-indigo-200/80 space-y-2">
          {/* 上排：選擇分類下拉選單 (含全部分類) + 我的按讚收藏 */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={selectedSubcat}
                onChange={(e) => {
                  setSelectedSubcat(e.target.value);
                  setActiveTab('all');
                }}
                className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white border border-indigo-600 shadow-xs'
                    : 'bg-white/90 text-stone-800 hover:bg-white border border-indigo-300'
                }`}
              >
                {VIBE_CATEGORIES.map((cat) => {
                  const count = categoryCounts[cat.id] ?? 0;
                  return (
                    <option key={cat.id} value={cat.id} className="bg-white text-stone-900 font-bold">
                      {cat.label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'favorites' ? 'all' : 'favorites')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-rose-600 text-white shadow-xs border border-rose-600'
                  : 'bg-white/90 text-stone-700 hover:bg-white border border-indigo-200/90'
              }`}
            >
              <Heart className={`w-4 h-4 shrink-0 ${activeTab === 'favorites' ? 'fill-white' : 'text-rose-500'}`} />
              <span className="truncate">我的 Like ({favoriteCount})</span>
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
              </select>

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
        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center space-y-3">
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
        </div>
      ) : (
        (() => {
          const isGuest = isGuestUser(currentUser);
          const visibleApps = isGuest ? filteredApps.slice(0, 3) : filteredApps;
          const blurredApps = isGuest && filteredApps.length > 3 ? filteredApps.slice(3, 6) : [];

          return (
            <>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
                    : viewMode === 'list'
                    ? 'flex flex-col space-y-2.5 sm:space-y-3'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5'
                }
              >
                {visibleApps.map(renderVibeAppCard)}
              </div>

              {isGuest && filteredApps.length > 3 && (
                <GuestBoardGateBlurOverlay
                  remainingCount={filteredApps.length - 3}
                  totalCount={filteredApps.length}
                  boardName="VibeCoding 展場"
                  onOpenAuth={() => openAuthModal('login')}
                  blurredPreviewChildren={
                    <div
                      className={
                        viewMode === 'grid'
                          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
                          : viewMode === 'list'
                          ? 'flex flex-col space-y-2.5 sm:space-y-3'
                          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5'
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

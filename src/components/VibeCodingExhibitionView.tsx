import React, { useState, useMemo } from 'react';
import { Question, MarketViewMode } from '../types';
import { useApp } from '../context/AppContext';
import { QuestionCard } from './QuestionCard';
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
  Eye,
} from 'lucide-react';
import { PublishEffectPreviewModal } from './PublishEffectPreviewModal';

interface VibeCodingExhibitionViewProps {
  questions?: Question[];
  onSelectQuestion?: (q: Question) => void;
  onSelectApp?: (q: Question) => void;
  onOpenCreateVibeCoding?: () => void;
  onOpenCreateApp?: () => void;
  onCloseZone?: () => void;
  onTogglePin?: () => void;
  isPinned?: boolean;
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
}) => {
  const {
    currentUser,
    questions: contextQuestions,
    answers,
    isQuestionBookmarked,
    isQuestionSeconded,
    isQuestionLiked,
    isSameQuestionActive,
  } = useApp();
  const questions = propQuestions || contextQuestions || [];
  const handleSelect = onSelectApp || onSelectQuestion || (() => {});
  const handleOpenCreate = onOpenCreateApp || onOpenCreateVibeCoding || (() => {});

  const [showZoneHelp, setShowZoneHelp] = useState(false);
  const [showDemoPreviewModal, setShowDemoPreviewModal] = useState(false);
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
      isQuestionLiked(qId) ||
      isSameQuestionActive(qId)
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
          q.tags.some((t) => t.toLowerCase().includes(kw))
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

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
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
                onClick={() => setShowDemoPreviewModal(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-indigo-300 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-800 font-black text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="預覽兩種類型提案（創新提案 / 軟體與網站作品）的卡片與內頁效果"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>預覽提案效果</span>
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
              <span className="truncate">我的 Like 收藏 ({favoriteCount})</span>
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
                <option value="liked">❤️ Like 收藏最多</option>
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
            {activeTab === 'favorites' ? '尚無 Like 或收藏的軟體作品' : '沒有找到符合條件的作品'}
          </h3>
          <p className="text-xs text-stone-500">
            {activeTab === 'favorites'
              ? '瀏覽作品時點擊 ❤️ 或 ⭐，即可在此快速查看！'
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
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
              : viewMode === 'list'
              ? 'flex flex-col space-y-2.5 sm:space-y-3'
              : 'grid grid-cols-1 md:grid-cols-2 gap-3.5'
          }
        >
          {filteredApps.map((q) => {
            const questionAnswers = (answers || []).filter((a) => a.questionId === q.id);
            const solutionsCount = questionAnswers.filter((a) => a.type === 'solution' || !a.type).length;
            const discussionsCount = questionAnswers.filter((a) => a.type === 'discussion').length;
            return (
              <QuestionCard
                key={q.id}
                question={q}
                solutionsCount={solutionsCount}
                discussionsCount={discussionsCount}
                viewMode={viewMode}
                onClick={() => handleSelect(q)}
              />
            );
          })}
        </div>
      )}

      {showDemoPreviewModal && (
        <PublishEffectPreviewModal
          isOpen={showDemoPreviewModal}
          onClose={() => setShowDemoPreviewModal(false)}
          onConfirmPublish={() => {
            setShowDemoPreviewModal(false);
            handleOpenCreate();
          }}
          postType="vibecoding_app"
          title=""
          description=""
          authorName={currentUser?.name || '開發者範例'}
          authorAvatar={currentUser?.avatar}
          authorTitle={currentUser?.title}
        />
      )}
    </div>
  );
};


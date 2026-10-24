import React, { useState, useMemo } from 'react';
import { Category, ProblemLevel, CATEGORY_HIERARCHY, QuestionSortOption, MarketViewMode, SpecialZone } from '../types';
import { Award, Clock, Flame, Sparkles, Lightbulb, Square, List, LayoutGrid, Coins, SlidersHorizontal, X } from 'lucide-react';
import { LEVEL_CONFIGS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { HelpTooltip } from './HelpTooltip';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: Category | '全部';
  setSelectedCategory: (cat: Category | '全部') => void;
  selectedSubcategory: string | '全部';
  setSelectedSubcategory: (sub: string | '全部') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedLevel: ProblemLevel | '全部';
  setSelectedLevel: (lvl: ProblemLevel | '全部') => void;
  sortBy: QuestionSortOption;
  setSortBy: (sort: QuestionSortOption) => void;
  totalCount: number;
  categoryCounts?: Record<string, number>;
  viewMode?: MarketViewMode;
  setViewMode?: (mode: MarketViewMode) => void;
  specialZone?: SpecialZone;
  onSelectSpecialZone?: (zone: SpecialZone) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  searchQuery,
  setSearchQuery,
  selectedLevel,
  setSelectedLevel,
  sortBy,
  setSortBy,
  totalCount,
  categoryCounts,
  viewMode = 'large',
  setViewMode,
  specialZone,
  onSelectSpecialZone,
}) => {
  const { questions } = useApp();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const currentSubcategories = selectedCategory !== '全部' ? CATEGORY_HIERARCHY[selectedCategory] || [] : [];

  // 動態熱門話題標籤
  const dynamicHotTags = useMemo(() => {
    const tagCountMap: Record<string, { count: number; totalBounty: number }> = {};
    const activeQuestions = questions.filter((q) => q.status !== 'delisted' && q.status !== 'closed');
    const sourceQuestions = activeQuestions.length > 0 ? activeQuestions : questions;

    sourceQuestions.forEach((q) => {
      const inCurrentCategory = selectedCategory === '全部' || q.category === selectedCategory;
      const weight = inCurrentCategory ? 2 : 1;

      (q.tags || []).forEach((tag) => {
        const cleanTag = tag.trim();
        if (!cleanTag) return;
        if (!tagCountMap[cleanTag]) {
          tagCountMap[cleanTag] = { count: 0, totalBounty: 0 };
        }
        tagCountMap[cleanTag].count += weight;
        tagCountMap[cleanTag].totalBounty += q.bounty || 0;
      });
    });

    const sortedTags = Object.entries(tagCountMap)
      .sort((a, b) => {
        if (b[1].count !== a[1].count) {
          return b[1].count - a[1].count;
        }
        return b[1].totalBounty - a[1].totalBounty;
      })
      .map(([tag]) => tag);

    const fallbackTags = [
      '商業模式',
      'AI應用',
      '創業痛點',
      '行銷增長',
      '系統架構',
      '股權募資',
      '合約法律',
      '產品設計',
    ];
    const combined = Array.from(new Set([...sortedTags, ...fallbackTags]));
    return combined.slice(0, 8);
  }, [questions, selectedCategory]);

  // 特定主題專區即時數量統計
  const zoneCounts = useMemo(() => {
    const vibeCount = questions.filter(
      (q) =>
        q.postType === 'vibecoding_app' ||
        q.specialZone === 'vibecoding' ||
        q.category === '網站程式' ||
        (q.category as string) === 'vibecoding' ||
        (q.tags && q.tags.some((t) => t.toLowerCase().includes('vibecoding')))
    ).length;

    const createIdeasCount = questions.filter(
      (q) =>
        q.postType === 'innovation_proposal' ||
        q.specialZone === 'create_ideas' ||
        (q.tags && q.tags.some((t) => t.includes('創新提案') || t.includes('創點子')))
    ).length;

    const painPointsCount = questions.filter(
      (q) =>
        q.postType === 'pain_point' ||
        q.specialZone === 'pain_points' ||
        q.category === '日常疑難' ||
        (q.tags && q.tags.some((t) => t.includes('痛點')))
    ).length;

    const l0Count = questions.filter(
      (q) =>
        q.level === 'L0' ||
        q.bounty === 0 ||
        q.postType === 'chat_discussion' ||
        q.specialZone === 'l0_discussion'
    ).length;

    return {
      vibecoding: vibeCount,
      create_ideas: createIdeasCount > 0 ? createIdeasCount : 16,
      pain_points: painPointsCount,
      l0_discussion: l0Count,
    };
  }, [questions]);

  const hasActiveSubFilter = selectedLevel !== '全部' || Boolean(searchQuery.trim());

  return (
    <div className="space-y-2.5">
      {/* 1. 分類選取列：全寬展示，確保所有分類（全部、創新創業、專業問題、學術探討、日常疑難）清楚可見且隨時可直接點擊 */}
      <div id="onboarding-step-1-categories" className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
        <button
          onClick={() => {
            if (onSelectSpecialZone) onSelectSpecialZone('all');
            setSelectedCategory('全部');
            setSelectedSubcategory('全部');
          }}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
            selectedCategory === '全部' && (!specialZone || specialZone === 'all')
              ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs font-black ring-2 ring-amber-200'
              : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
          }`}
        >
          <span>全部</span>
          <span
            className={`text-[10px] md:text-xs font-mono font-bold ${
              selectedCategory === '全部' && (!specialZone || specialZone === 'all')
                ? 'text-stone-950 font-black'
                : 'text-stone-400'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              if (onSelectSpecialZone) onSelectSpecialZone('all');
              setSelectedCategory(cat);
              setSelectedSubcategory('全部');
            }}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              selectedCategory === cat && (!specialZone || specialZone === 'all')
                ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs font-black ring-2 ring-amber-200'
                : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200 hover:border-stone-300'
            }`}
          >
            <span>{cat}</span>
            <span
              className={`text-[10px] md:text-xs font-mono font-bold ${
                selectedCategory === cat ? 'text-stone-950 font-black' : 'text-stone-400'
              }`}
            >
              {categoryCounts ? (categoryCounts[cat] ?? 0) : 0}
            </span>
          </button>
        ))}
      </div>

      {/* 2. 排序與功能控制列：獨立成排，避免橫向擠壓分類列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 md:pb-3 border-b border-stone-200/80">
        <div id="onboarding-step-2-search" className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          {/* Sort selector */}
          <div className="inline-flex items-center rounded-full bg-stone-100/90 p-0.5 md:p-1 shrink-0">
            <span className="pl-2.5 pr-1 text-[11px] sm:text-xs md:text-sm font-bold text-stone-500 whitespace-nowrap select-none">
              排序:
            </span>
            <button
              onClick={() => setSortBy('recruiting_promoted')}
              className={`px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 whitespace-nowrap ${
                sortBy === 'recruiting_promoted'
                  ? 'bg-white text-stone-950 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
              title="智能推薦排序"
            >
              <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500 shrink-0" />
              <span>推薦</span>
            </button>

            <button
              onClick={() => setSortBy('latest')}
              className={`px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 whitespace-nowrap ${
                sortBy === 'latest'
                  ? 'bg-white text-stone-950 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
              title="依發布時間由新到舊排序"
            >
              <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-sky-500 shrink-0 hidden sm:inline" />
              <span>最新</span>
            </button>

            <button
              onClick={() => setSortBy('most_solutions')}
              className={`px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 whitespace-nowrap ${
                sortBy === 'most_solutions'
                  ? 'bg-white text-stone-950 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
              title="依方案數排序"
            >
              <Lightbulb className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500 shrink-0 hidden sm:inline" />
              <span>方案數</span>
            </button>

            <button
              onClick={() => setSortBy('most_discussions')}
              className={`px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 whitespace-nowrap ${
                sortBy === 'most_discussions'
                  ? 'bg-white text-stone-950 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
              title="依留言數排序"
            >
              <Flame className="w-3 h-3 md:w-3.5 md:h-3.5 text-orange-500 shrink-0 hidden sm:inline" />
              <span>留言數</span>
            </button>

            <button
              onClick={() => setSortBy('highest_bounty')}
              className={`px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 whitespace-nowrap ${
                sortBy === 'highest_bounty'
                  ? 'bg-white text-stone-950 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
              title="依懸賞額排序"
            >
              <Award className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500 shrink-0 hidden sm:inline" />
              <span>懸賞額</span>
            </button>

            <button
              onClick={() => setSortBy('highest_tips')}
              className={`px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 whitespace-nowrap ${
                sortBy === 'highest_tips'
                  ? 'bg-white text-stone-950 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
              title="依總打賞排序"
            >
              <Coins className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-600 shrink-0 hidden sm:inline" />
              <span>總打賞</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 篩選與話題收合鍵 */}
            <button
              id="onboarding-step-3-levels"
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-full text-[11px] sm:text-xs md:text-sm font-bold transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 whitespace-nowrap ${
                isFilterExpanded || hasActiveSubFilter
                  ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-300'
                  : 'bg-stone-100 hover:bg-stone-200/80 text-stone-600'
              }`}
              title="展開等級篩選與熱門話題標籤"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>{selectedLevel !== '全部' ? selectedLevel : '篩選'}</span>
            </button>

            {/* View Mode Switcher */}
            {setViewMode && (
              <div id="onboarding-step-4-viewmode" className="inline-flex rounded-full bg-stone-100/90 p-0.5 md:p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('large')}
                  className={`p-1.5 md:p-2 rounded-full transition-all cursor-pointer ${
                    viewMode === 'large'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="標準卡片"
                >
                  <Square className={`w-3.5 h-3.5 md:w-4 md:h-4 ${viewMode === 'large' ? 'text-indigo-600' : 'text-stone-400'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 md:p-2 rounded-full transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-amber-700 shadow-2xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="緊湊清單"
                >
                  <List className={`w-3.5 h-3.5 md:w-4 md:h-4 ${viewMode === 'list' ? 'text-amber-600' : 'text-stone-400'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 md:p-2 rounded-full transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="雙欄方格"
                >
                  <LayoutGrid className={`w-3.5 h-3.5 md:w-4 md:h-4 ${viewMode === 'grid' ? 'text-emerald-600' : 'text-stone-400'}`} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subcategory Horizontal Strip (僅在選中特定主分類時顯示，極簡無框線設計) */}
      {selectedCategory !== '全部' && currentSubcategories.length > 0 && (
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1 text-xs sm:text-sm animate-in fade-in duration-150">
          <button
            onClick={() => setSelectedSubcategory('全部')}
            className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedSubcategory === '全部'
                ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            全部子領域
          </button>

          {currentSubcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubcategory(sub)}
              className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubcategory === sub
                  ? 'bg-amber-500 text-stone-950 font-black'
                  : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Collapsible Drawer: 難度等級 (L0~L4) & 熱門話題標籤 */}
      {(isFilterExpanded || hasActiveSubFilter) && (
        <div className="p-3 md:p-4 rounded-2xl bg-stone-50/90 border border-stone-200/70 space-y-2.5 md:space-y-3 animate-in fade-in duration-150">
          {/* Level pills (L0 ~ L4) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-none flex-wrap">
              <span className="text-[11px] md:text-xs font-bold text-stone-400 mr-1 flex items-center gap-1">
                <span>懸賞分級</span>
                <HelpTooltip
                  title="L0 ~ L4 懸賞分級說明"
                  content="L0 免費交流與痛點共鳴；L1 ($100~300) 輕量諮詢；L2 ($301~899) 實務解方；L3 ($900~2,999) 深度專案架構；L4 ($3,000+) 企業級破局懸賞。"
                />
              </span>

              <button
                onClick={() => setSelectedLevel('全部')}
                className={`px-2.5 py-0.5 md:px-3.5 md:py-1 rounded-full text-[11px] md:text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedLevel === '全部'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200/70'
                }`}
              >
                全部等級
              </button>

              {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
                const cfg = LEVEL_CONFIGS[lvl];
                if (!cfg) return null;
                const isSelected = selectedLevel === lvl;
                const priceLabel =
                  lvl === 'L0'
                    ? '免費'
                    : lvl === 'L1'
                    ? '$100+'
                    : lvl === 'L2'
                    ? '$301+'
                    : lvl === 'L3'
                    ? '$900+'
                    : '$3,000+';

                return (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(isSelected ? '全部' : lvl)}
                    className={`px-2.5 py-0.5 md:px-3.5 md:py-1 rounded-full text-[11px] md:text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                    }`}
                    title={`${cfg.name}: ${cfg.rangeText}`}
                  >
                    <span>{lvl}</span>
                    <span className="text-[10px] md:text-[11px] opacity-75 font-mono">{priceLabel}</span>
                  </button>
                );
              })}
            </div>

            {hasActiveSubFilter && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLevel('全部');
                  setSearchQuery('');
                }}
                className="text-[11px] md:text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-0.5 shrink-0 cursor-pointer"
              >
                <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span>重置</span>
              </button>
            )}
          </div>

          {/* Hot Topic Tags */}
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-none pt-1 border-t border-stone-200/50">
            <span className="text-[11px] md:text-xs font-bold text-stone-400 shrink-0 mr-1">熱門話題</span>
            {dynamicHotTags.map((tag) => {
              const isActive = searchQuery.trim().toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(isActive ? '' : tag)}
                  className={`px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[11px] md:text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-stone-900 text-amber-400 font-bold'
                      : 'bg-white text-stone-600 hover:text-stone-950 border border-stone-200/60'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

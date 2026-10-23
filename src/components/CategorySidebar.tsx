import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Category, CATEGORY_HIERARCHY, Question, QuestionSortOption, SpecialZone, AppTab } from '../types';
import { useApp } from '../context/AppContext';
import { isMockQuestionId } from '../data/mockData';
import { isQuestionExpired } from '../services/recommendationService';
import { isPainPointQuestion, isL0DiscussionQuestion, isVibeCodingAppQuestion } from '../utils/questionUtils';
import { DEFAULT_DEMO_PROPOSALS } from '../data/competitionProposals';
import {
  X,
  Layers,
  Rocket,
  Briefcase,
  GraduationCap,
  LifeBuoy,
  ChevronRight,
  PlusCircle,
  CheckCircle2,
  Tag,
  Search,
  ArrowRight,
  Sparkles,
  Flame,
  MessageCircle,
  Lightbulb,
  ShieldCheck,
  Trophy,
  Terminal,
  Compass,
} from 'lucide-react';

interface CategorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: Category | '全部';
  selectedSubcategory: string | '全部';
  onSelectCategory: (category: Category | '全部', subcategory?: string | '全部') => void;
  specialZone?: SpecialZone;
  onSelectSpecialZone?: (zone: SpecialZone) => void;
  onSelectSort?: (sort: QuestionSortOption) => void;
  onOpenCreateQuestion?: () => void;
  questions: Question[];
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onNavigateToAbout?: (section?: string) => void;
  onNavigateToJobExplorer?: () => void;
  onNavigateToSolvers?: () => void;
  onNavigateToLeaderboard?: () => void;
  onOpenNotifications?: () => void;
  onStartOnboarding?: () => void;
  onNavigateToStarSeason?: () => void;
  activeTab?: AppTab;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
  specialZone = 'all',
  onSelectSpecialZone,
  onSelectSort: _onSelectSort,
  onOpenCreateQuestion,
  questions,
  searchQuery = '',
  onSearchQueryChange,
  onNavigateToAbout,
  onNavigateToJobExplorer,
  onNavigateToSolvers,
  onNavigateToLeaderboard,
  onOpenNotifications,
  onStartOnboarding,
  onNavigateToStarSeason,
  activeTab = 'explore',
}) => {
  const [sidebarSearch, setSidebarSearch] = useState('');

  const {
    isDemoMode,
  } = useApp();

  const validQuestions = useMemo(() => {
    return (isDemoMode
      ? questions
      : questions.filter((q) => Boolean(q && q.id) && !isMockQuestionId(q.id, q.authorId))
    ).filter((q) => Boolean(q && q.id && q.title) && q.status !== 'delisted' && !isQuestionExpired(q.deadline));
  }, [questions, isDemoMode]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Question counts
  const getCategoryCount = (cat: Category) => {
    return validQuestions.filter((q) => q.category === cat).length;
  };

  const getSubcategoryCount = (cat: Category, sub: string) => {
    return validQuestions.filter((q) => q.category === cat && (q.subcategory === sub || (Array.isArray(q.tags) && q.tags.includes(sub)))).length;
  };

  // 專區數量統計
  // 1. 創點子/痛點集：透過提出痛點提出的問題與標註痛點的問題 (痛點優先歸類)
  const painPointsCount = validQuestions.filter(isPainPointQuestion).length;

  // 創點子 (創新提案) 專區提案數量
  const createIdeasCount = DEFAULT_DEMO_PROPOSALS.length;

  // 2. L0問題討論區：依規範，從「尋求解答」或「提出痛點」提出的問題，就算設定是L0也不要算入L0討論區
  const l0DiscussionCount = validQuestions.filter(isL0DiscussionQuestion).length;
  // 3. VibeCoding 展場：僅統計軟體網站提案，嚴格排除痛點、討論、解方等其他提案
  const vibeCodingCount = validQuestions.filter(isVibeCodingAppQuestion).length;

  const categoryMeta: Record<
    Category,
    { icon: React.FC<{ className?: string }>; color: string; bgColor: string }
  > = {
    創新創業: {
      icon: Rocket,
      color: 'text-amber-700',
      bgColor: 'bg-amber-100/80 text-amber-900 border-amber-200',
    },
    專業問題: {
      icon: Briefcase,
      color: 'text-blue-700',
      bgColor: 'bg-blue-100/80 text-blue-900 border-blue-200',
    },
    學術探討: {
      icon: GraduationCap,
      color: 'text-purple-700',
      bgColor: 'bg-purple-100/80 text-purple-900 border-purple-200',
    },
    日常疑難: {
      icon: LifeBuoy,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100/80 text-emerald-900 border-emerald-200',
    },
    網站程式: {
      icon: Terminal,
      color: 'text-purple-700',
      bgColor: 'bg-purple-100/80 text-purple-900 border-purple-200',
    },
  };

  const handleSelectCategory = (cat: Category | '全部', sub: string | '全部' = '全部') => {
    onSelectCategory(cat, sub);
    onClose();
    setTimeout(() => {
      const el = document.getElementById('market-grid');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSelectZone = (zone: SpecialZone) => {
    if (onSelectSpecialZone) {
      onSelectSpecialZone(zone);
    }
    onClose();
    setTimeout(() => {
      const el = document.getElementById('market-grid');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Filter categories and subcategories based on sidebar search input
  const filteredCategories = (Object.keys(CATEGORY_HIERARCHY) as Category[]).filter((cat) => {
    if (!sidebarSearch.trim()) return true;
    const term = sidebarSearch.trim().toLowerCase();
    const matchCat = cat.toLowerCase().includes(term);
    const subList = CATEGORY_HIERARCHY[cat] || [];
    const matchSub = subList.some((s) => s.toLowerCase().includes(term));
    return matchCat || matchSub;
  });

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex h-screen h-[100dvh] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className="relative z-50 w-[88vw] max-w-xs sm:max-w-sm bg-white h-full h-[100dvh] max-h-[100dvh] shadow-2xl border-r border-stone-200 flex flex-col overflow-hidden animate-in slide-in-from-left duration-250 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="熱門看板與主題"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/95 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-300 text-amber-700 flex items-center justify-center shadow-2xs">
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900">
                熱門看板與主題
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 active:bg-stone-200 text-stone-500 hover:text-stone-800 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar in Left Sidebar */}
        <div className="p-3.5 sm:px-5 border-b border-stone-200/80 bg-white shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => {
                setSidebarSearch(e.target.value);
                if (onSearchQueryChange) {
                  onSearchQueryChange(e.target.value);
                }
              }}
              placeholder="搜尋分類、子領域或話題..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-stone-50 hover:bg-stone-100 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-xl outline-none focus:ring-2 focus:ring-amber-200 transition-all text-stone-900 placeholder:text-stone-400"
            />
            {sidebarSearch && (
              <button
                onClick={() => {
                  setSidebarSearch('');
                  if (onSearchQueryChange) onSearchQueryChange('');
                }}
                className="absolute right-2.5 p-0.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
                title="清除搜尋"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5">
          {/* 🌟 核心功能入口：匯職缺、認證專家智庫 & 交易榮譽榜 */}
          <div className="space-y-2 pb-1">
            <div className="text-[11px] font-bold text-stone-500 px-1 flex items-center justify-between">
              <span>匯職缺、專家智庫與榮譽榜</span>
            </div>

            {/* ⓪ 匯職缺 (專家智庫上方) */}
            <button
              onClick={() => {
                if (onNavigateToJobExplorer) onNavigateToJobExplorer();
                onClose();
              }}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                activeTab === 'job_explorer'
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200 shadow-2xs'
                  : 'bg-white hover:bg-blue-50/40 border-stone-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <Compass className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-blue-700 transition-colors flex items-center gap-1.5">
                    <span>匯職缺</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-stone-500 font-medium leading-snug mt-0.5">一鍵彙集跨海內外全網所有職缺</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-blue-600 transition-colors shrink-0" />
            </button>

            {/* ① 認證專家智庫 */}
            <button
              onClick={() => {
                if (onNavigateToSolvers) onNavigateToSolvers();
                onClose();
              }}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                activeTab === 'solvers'
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200 shadow-2xs'
                  : 'bg-white hover:bg-amber-50/40 border-stone-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                    <span>認證專家智庫</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
                    實名審核與方案實績嚴選顧問
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-colors shrink-0" />
            </button>

            {/* ② 交易榮譽榜 */}
            <button
              onClick={() => {
                if (onNavigateToLeaderboard) onNavigateToLeaderboard();
                onClose();
              }}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200 shadow-2xs'
                  : 'bg-white hover:bg-amber-50/40 border-stone-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <Trophy className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
                    <span>榮譽榜</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                      排行
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
                    卓越解題專家與委託人排行
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-colors shrink-0" />
            </button>
          </div>

          {/* 1. 全部問題入口 (白色/淺灰模塊，淺灰細框) */}
          <button
            onClick={() => {
              if (onSelectSpecialZone) onSelectSpecialZone('all');
              handleSelectCategory('全部', '全部');
            }}
            className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs ${
              selectedCategory === '全部' && specialZone === 'all' && activeTab === 'explore'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200/80 shadow-xs'
                : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  selectedCategory === '全部' && specialZone === 'all' && activeTab === 'explore'
                    ? 'bg-white border-amber-300 text-amber-600 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-400 group-hover:text-stone-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span
                className={`text-xs sm:text-sm font-black transition-colors ${
                  selectedCategory === '全部' && specialZone === 'all' && activeTab === 'explore'
                    ? 'text-amber-950 font-black'
                    : 'text-stone-800 group-hover:text-stone-950'
                }`}
              >
                全部問題
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-colors shrink-0" />
          </button>

          {/* 2. 主題專區（固定順序：創星季、痛點許願池、創點子、VibeCoding 作品牆、L0討論區） */}
          <div id="onboarding-step-7-special-zones" className="space-y-2 pt-1 pb-1">
            <div className="text-[11px] font-bold text-stone-500 px-1 flex items-center justify-between">
              <span>🔥 主題專區</span>
            </div>

            {/* ① ［創星季（限時競賽）］ */}
            <button
              onClick={() => {
                if (onNavigateToStarSeason) {
                  onNavigateToStarSeason();
                }
                onClose();
              }}
              className={`w-full pl-2.5 pr-3 py-2.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs ${
                activeTab === 'star_season'
                  ? 'bg-emerald-50/50 border-emerald-500 ring-3 ring-emerald-300/40 shadow-xs'
                  : 'bg-white hover:bg-emerald-50/30 border-emerald-400 hover:border-emerald-500'
              }`}
              title="前往 IdeaX創星季 競賽挑戰"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center shrink-0">
                  <img
                    src="/logo-chuangxingji-text.png"
                    alt="創星季去背"
                    className="h-6.5 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-emerald-700 transition-colors tracking-tight">
                      創星季
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-600 text-white border border-emerald-500 shadow-2xs shrink-0">
                      11月限定
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-600 mt-0.5 line-clamp-1">
                    分享痛點×創新解方 解題黑客松
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1" />
            </button>

            {/* ② ［痛點許願池］ */}
            <button
              onClick={() => handleSelectZone('pain_points')}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                specialZone === 'pain_points'
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200 shadow-2xs'
                  : 'bg-white hover:bg-rose-50/40 border-stone-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold border border-rose-200 shrink-0">
                  <Flame className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-rose-700 transition-colors flex items-center gap-1.5">
                    <span>痛點許願池</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
                    生活與產業痛點，徵集破局點子
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                  specialZone === 'pain_points'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {painPointsCount} 則
              </span>
            </button>

            {/* ③ ［創點子(創新提案)］專區入口 */}
            <button
              onClick={() => handleSelectZone('create_ideas')}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                specialZone === 'create_ideas'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 shadow-2xs'
                  : 'bg-white hover:bg-emerald-50/40 border-stone-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200 shrink-0">
                  <Lightbulb className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                    <span>創點子（創新提案）</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white shrink-0">HOT</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
                    創星季與社群解放提案，點數支持與作品收藏
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                  specialZone === 'create_ideas'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                {createIdeasCount} 則
              </span>
            </button>

            {/* ④ ［VibeCoding 作品牆］ */}
            <button
              onClick={() => handleSelectZone('vibecoding')}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                specialZone === 'vibecoding'
                  ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200 shadow-2xs'
                  : 'bg-white hover:bg-purple-50/40 border-stone-200 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold border border-purple-200 shrink-0">
                  <Terminal className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-purple-700 transition-colors flex items-center gap-1.5 flex-wrap">
                    <span>軟體網站作品牆</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-600 text-white shrink-0">NEW</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
                    網站、APP、遊戲、小程序 軟體皆可刊登
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                  specialZone === 'vibecoding'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-100 text-purple-900 border border-purple-300'
                }`}
              >
                {vibeCodingCount} 則
              </span>
            </button>

            {/* ⑤ ［L0討論區］ */}
            <button
              onClick={() => handleSelectZone('l0_discussion')}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                specialZone === 'l0_discussion'
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200 shadow-2xs'
                  : 'bg-white hover:bg-blue-50/40 border-stone-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold border border-blue-200 shrink-0">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-blue-700 transition-colors flex items-center gap-1.5">
                    <span>L0討論區</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
                    無賞金交流、閒聊討論與觀點碰撞
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                  specialZone === 'l0_discussion'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {l0DiscussionCount} 則
              </span>
            </button>
          </div>

          <div className="border-t border-stone-200/80 pt-2">
            <div className="text-[11px] font-bold text-stone-500 px-1 mb-2.5">
              📚 分類看板
            </div>
          </div>

          {/* 3. 分類與子領域列表 */}
          {filteredCategories.map((category) => {
            const meta = categoryMeta[category];
            const Icon = meta.icon;
            const subcategories = CATEGORY_HIERARCHY[category] || [];
            const count = getCategoryCount(category);
            const isCatSelected = selectedCategory === category;

            // If searching, filter subcategories
            const matchingSubs = subcategories.filter((sub) => {
              if (!sidebarSearch.trim()) return true;
              return sub.toLowerCase().includes(sidebarSearch.trim().toLowerCase());
            });

            return (
              <div
                key={category}
                className={`rounded-2xl border transition-all ${
                  isCatSelected
                    ? 'border-amber-400 bg-amber-50/20 shadow-xs'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {/* 主分類 */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleSelectCategory(category, '全部')}
                    className="flex items-center gap-2.5 text-left cursor-pointer group flex-1"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${meta.bgColor}`}
                    >
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <span className="font-black text-sm text-stone-900 group-hover:text-amber-600 transition-colors flex items-center gap-1">
                      {category}
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-500 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>

                  <button
                    onClick={() => handleSelectCategory(category, '全部')}
                    className={`shrink-0 px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      isCatSelected && selectedSubcategory === '全部'
                        ? 'bg-amber-500 text-stone-950 shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                    title={`查看 ${category} 全部問題`}
                  >
                    {count} 則
                  </button>
                </div>

                {/* 子領域看板入口列表 */}
                <div className="px-3 pb-3 pt-1 border-t border-stone-100/90 space-y-1">
                  <div className="text-[10px] font-bold text-stone-600 px-1 py-0.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-600" />
                      <span>子領域看板</span>
                    </span>
                    <span className="text-[9px] text-stone-500 font-normal">點擊直達看板</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {matchingSubs.map((sub) => {
                      const subCount = getSubcategoryCount(category, sub);
                      const isSubSelected = isCatSelected && selectedSubcategory === sub;

                      return (
                        <button
                          key={sub}
                          onClick={() => handleSelectCategory(category, sub)}
                          className={`p-1.5 px-2 rounded-xl text-xs transition-all flex items-center justify-between gap-1 text-left cursor-pointer border group/sub ${
                            isSubSelected
                              ? 'bg-amber-500 text-stone-950 font-black border-amber-600 shadow-2xs'
                              : 'bg-stone-50/90 hover:bg-amber-50/80 text-stone-700 hover:text-stone-900 border-stone-200/80 hover:border-amber-300 font-medium'
                          }`}
                          title={`進入「${sub}」子領域看板`}
                        >
                          <span className="truncate">{sub}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {subCount > 0 ? (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                  isSubSelected
                                    ? 'bg-stone-950 text-amber-300'
                                    : 'bg-white text-stone-600 border border-stone-200 group-hover/sub:border-amber-300'
                                }`}
                              >
                                {subCount}
                              </span>
                            ) : (
                              <span className="text-[9px] text-stone-500">0</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="py-8 text-center text-xs text-stone-400">
              找不到符合「{sidebarSearch}」的分類
            </div>
          )}

          <div className="h-6 pb-[env(safe-area-inset-bottom)]" />
        </div>
      </aside>
    </div>,
    document.body
  );
};


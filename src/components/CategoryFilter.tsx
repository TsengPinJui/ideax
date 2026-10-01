import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Category, ProblemLevel, CATEGORY_HIERARCHY, QuestionSortOption } from '../types';
import { Layers, Award, Clock, Flame, CheckCircle2, Tag, Search, X, Sparkles, MessageCircle, Lightbulb, Users, ChevronDown, Check, Copy, ChevronRight } from 'lucide-react';
import { LEVEL_CONFIGS } from '../data/mockData';
import { useApp } from '../context/AppContext';

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
}) => {
  const {
    searchMode,
    setSearchMode,
    solvers,
    availableUsers,
    currentUser,
    startDirectChat,
    setSelectedSolver,
    setSelectedQuestion,
    questions,
  } = useApp();

  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 匹配用戶與專家
  const matchingUsersAndSolvers = useMemo(() => {
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
    }).slice(0, 8);
  }, [availableUsers, solvers, searchQuery]);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedUserId(id);
    setTimeout(() => setCopiedUserId(null), 2000);
  };

  const handleStartChatWithUser = (target: { id: string; name: string; avatar: string; title: string }) => {
    if (currentUser.id === target.id) {
      alert('這是您自己的帳號！');
      return;
    }
    startDirectChat(target);
    setIsSearchDropdownOpen(false);
  };

  const currentSubcategories = selectedCategory !== '全部' ? CATEGORY_HIERARCHY[selectedCategory] || [] : [];

  return (
    <div className="space-y-2 sm:space-y-3.5">
      {/* 1. Main Category Horizontal Bar (問題分類) */}
      <div>
        <div className="hidden sm:flex text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-600" />
          <span>問題分類</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 sm:pb-1 scrollbar-none">
          <button
            onClick={() => {
              setSelectedCategory('全部');
              setSelectedSubcategory('全部');
            }}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === '全部'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            全部分類
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedSubcategory('全部');
              }}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
                  : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedCategory === cat ? 'bg-amber-600/30 text-stone-950 font-black' : 'bg-stone-100 text-stone-500 font-semibold'
                }`}
              >
                {categoryCounts ? (categoryCounts[cat] ?? 0) : 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Subcategory Horizontal Pills */}
      {selectedCategory !== '全部' && currentSubcategories.length > 0 && (
        <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-amber-900 shrink-0 flex items-center gap-1 mr-1">
              <Tag className="w-3.5 h-3.5 text-amber-700" />
              <span>「{selectedCategory}」子領域：</span>
            </span>

            <button
              onClick={() => setSelectedSubcategory('全部')}
              className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubcategory === '全部'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-amber-200'
              }`}
            >
              全部子領域
            </button>

            {currentSubcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub)}
                className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  selectedSubcategory === sub
                    ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                    : 'bg-white text-stone-700 hover:text-stone-950 hover:bg-white/90 border border-amber-200/60'
                }`}
                title={`篩選「${sub}」子領域`}
              >
                <span>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Input Bar (支援關鍵字與用戶/專家雙模式搜尋與下拉選單) */}
      <div className="relative" ref={searchDropdownRef}>
        <div className="relative flex items-center">
          {/* 模式切換按鈕 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSearchDropdownOpen(!isSearchDropdownOpen);
            }}
            className="absolute left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 hover:text-amber-950 text-xs font-black text-stone-700 transition-all cursor-pointer z-10 shrink-0 border border-stone-200"
            title="點擊切換搜尋模式（關鍵字 / 用戶或專家）"
          >
            {searchMode === 'keywords' ? (
              <>
                <Search className="w-3.5 h-3.5 text-amber-600" />
                <span>關鍵字</span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>用戶/專家</span>
              </>
            )}
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchDropdownOpen(true)}
            onClick={() => setIsSearchDropdownOpen(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchMode === 'keywords'
                ? selectedCategory !== '全部'
                  ? `在「${selectedCategory}${selectedSubcategory !== '全部' ? ' · ' + selectedSubcategory : ''}」搜尋關鍵字（問題、方案、討論、內文）...`
                  : '搜尋關鍵字（問題、方案、討論、內文）...'
                : '搜尋用戶或專家（輸入 ID 如 user-chen 或姓名）...'
            }
            className="w-full pl-28 sm:pl-32 pr-24 py-2 sm:py-2.5 rounded-xl bg-white border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-xs sm:text-sm shadow-2xs outline-none transition-all placeholder:text-stone-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 px-2 py-0.5 text-xs text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>清除</span>
            </button>
          )}
        </div>

        {/* 搜尋下拉選單 (Search Dropdown Popover) */}
        {isSearchDropdownOpen && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[460px] flex flex-col">
            {/* 頂部雙模式選擇標籤 */}
            <div className="p-2.5 bg-stone-50/90 border-b border-stone-100">
              <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider px-1 pb-1.5 flex items-center justify-between">
                <span>選擇搜尋目標</span>
                <span className="text-[10px] text-amber-600 font-bold">點選切換模式</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Mode 1: 關鍵字搜尋 */}
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode('keywords');
                    searchInputRef.current?.focus();
                  }}
                  className={`p-2 rounded-xl text-left transition-all flex items-start gap-2 cursor-pointer border ${
                    searchMode === 'keywords'
                      ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-2xs ring-1 ring-amber-400'
                      : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-200'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      searchMode === 'keywords'
                        ? 'bg-stone-950 text-amber-400'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black truncate">關鍵字搜尋</span>
                      {searchMode === 'keywords' && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-stone-950 text-amber-300">
                          已選擇
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[10px] leading-tight truncate mt-0.5 ${
                        searchMode === 'keywords' ? 'text-stone-900 font-medium' : 'text-stone-500'
                      }`}
                    >
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
                  className={`p-2 rounded-xl text-left transition-all flex items-start gap-2 cursor-pointer border ${
                    searchMode === 'users'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-2xs ring-1 ring-purple-400'
                      : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-200'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      searchMode === 'users'
                        ? 'bg-purple-950 text-purple-200'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black truncate">搜尋用戶或專家</span>
                      {searchMode === 'users' && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-950 text-purple-200">
                          已選擇
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[10px] leading-tight truncate mt-0.5 ${
                        searchMode === 'users' ? 'text-purple-100 font-medium' : 'text-stone-500'
                      }`}
                    >
                      輸入 ID 或名稱
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 下拉內容 */}
            <div className="overflow-y-auto p-3 space-y-3">
              {searchMode === 'users' ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-xs font-black text-purple-950">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
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
                          className="p-2.5 rounded-xl hover:bg-purple-50/70 border border-stone-100 hover:border-purple-200 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div
                            onClick={() => {
                              setIsSearchDropdownOpen(false);
                              if (user.solverObj) {
                                setSelectedSolver(user.solverObj);
                              } else {
                                setSearchQuery(user.id);
                              }
                            }}
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          >
                            <img
                              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover border border-stone-200 group-hover:scale-105 transition-transform shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-xs text-stone-900 group-hover:text-purple-950 truncate">
                                  {user.name}
                                </span>
                                {user.isExpert && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    ★ 智庫專家
                                  </span>
                                )}
                                {user.role === 'admin' && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-300">
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
                                  className="font-mono text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-0.5"
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

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartChatWithUser(user)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                              title="與此用戶發起私聊"
                            >
                              <MessageCircle className="w-3 h-3" />
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
                        請確認 ID 是否正確（例如 <code className="text-purple-700 font-mono">user-chen</code>、<code className="text-purple-700 font-mono">user-1</code>）或輸入用戶姓名。
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>熱門推薦關鍵字（點擊立即搜尋）</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '商業模式',
                      'AI應用',
                      '創業痛點',
                      '行銷增長',
                      '系統架構',
                      '股權募資',
                      '合約法律',
                      '產品設計',
                      '職場顧問',
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSearchQuery(tag);
                          setIsSearchDropdownOpen(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 hover:text-amber-950 text-stone-700 text-xs font-semibold transition-colors cursor-pointer border border-stone-200/60"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2.5 Quick Topic Tags: 快速點擊篩選該主題問題 */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 sm:pb-1 scrollbar-none text-xs">
        <span className="text-[11px] font-bold text-stone-500 shrink-0 flex items-center gap-1 mr-0.5">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span className="hidden sm:inline">熱門話題標籤：</span>
          <span className="sm:hidden">話題：</span>
        </span>
        {[
          '商業模式',
          'AI應用',
          '創業痛點',
          '行銷增長',
          '系統架構',
          '股權募資',
          '合約法律',
          '產品設計',
          '職場顧問',
        ].map((tag) => {
          const isActive = searchQuery.trim().toLowerCase() === tag.toLowerCase();
          return (
            <button
              key={tag}
              type="button"
              onClick={() => {
                if (isActive) {
                  setSearchQuery('');
                } else {
                  setSearchQuery(tag);
                }
              }}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                isActive
                  ? 'bg-amber-500 text-stone-950 font-black shadow-2xs ring-1 ring-amber-400'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
              title={`點擊${isActive ? '取消' : '快速搜尋'}「${tag}」話題`}
            >
              <span className={isActive ? 'text-stone-950 font-black' : 'text-amber-600 font-bold'}>#</span>
              <span>{tag}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Third row: Levels & Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pt-1.5 sm:pt-2 border-t border-stone-200/80">
        {/* Level pills (L0 ~ L4) */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 flex-wrap">
          <span className="text-[11px] sm:text-xs font-bold text-stone-400 mr-0.5 flex items-center gap-1">
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 等級:
          </span>

          <button
            onClick={() => setSelectedLevel('全部')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedLevel === '全部'
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            全部
          </button>

          {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
            const cfg = LEVEL_CONFIGS[lvl];
            if (!cfg) return null;
            const isSelected = selectedLevel === lvl;
            const priceLabel = lvl === 'L0' 
              ? '免費' 
              : lvl === 'L1' 
              ? '$100~300' 
              : lvl === 'L2' 
              ? '$301~899' 
              : lvl === 'L3' 
              ? '$900~2,999' 
              : '$3,000+';

            return (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 font-black shadow-2xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
                title={`${cfg.name}: ${cfg.rangeText} (${cfg.example})`}
              >
                <span>{lvl}</span>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-stone-950 font-bold' : 'text-stone-500'}`}>
                  {priceLabel}
                </span>
              </button>
            );
          })}

          {selectedLevel !== '全部' && LEVEL_CONFIGS[selectedLevel] && (
            <span className="text-[11px] sm:text-xs font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-lg border border-amber-300 font-mono whitespace-nowrap ml-0.5 shadow-2xs flex items-center gap-1">
              <span>{LEVEL_CONFIGS[selectedLevel].name}</span>
              <span>·</span>
              <strong className="text-stone-950">{LEVEL_CONFIGS[selectedLevel].rangeText}</strong>
            </span>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5 text-xs self-start sm:self-auto flex-wrap">
          <span className="text-stone-400 font-mono hidden lg:inline">
            共 {totalCount} 則難題
          </span>

          <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-stone-200 overflow-x-auto max-w-full">
            {/* 1. 推薦 */}
            <button
              onClick={() => setSortBy('recruiting_promoted')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                sortBy === 'recruiting_promoted'
                  ? 'bg-amber-500 text-stone-950 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="依您最近搜尋的關鍵字、看板與瀏覽主題為您智能推薦"
            >
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${sortBy === 'recruiting_promoted' ? 'text-yellow-200 fill-yellow-300' : 'text-amber-500 fill-amber-400'}`} />
              <span>推薦</span>
            </button>

            {/* 2. 最多解答 */}
            <button
              onClick={() => setSortBy('most_solutions')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                sortBy === 'most_solutions'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="依收到方案解答總數排序"
            >
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>最多解答</span>
            </button>

            {/* 3. 熱烈討論 */}
            <button
              onClick={() => setSortBy('most_discussions')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                sortBy === 'most_discussions'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="依留言討論熱度排序"
            >
              <Flame className="w-3 h-3 text-orange-500" />
              <span>熱烈討論</span>
            </button>

            {/* 4. 最高懸賞 */}
            <button
              onClick={() => setSortBy('highest_bounty')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                sortBy === 'highest_bounty'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="依懸賞金額高低排序"
            >
              <Award className="w-3 h-3 text-amber-500" />
              <span>最高懸賞</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

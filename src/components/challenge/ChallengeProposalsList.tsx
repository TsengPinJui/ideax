import React, { useState, useMemo } from 'react';
import {
  Search,
  Flame,
  TrendingUp,
  MessageSquare,
  Clock,
  Heart,
  Eye,
  Award,
  Users,
  Tag,
  Coins,
  ShieldCheck,
  PlusCircle,
  Filter,
  Sparkles,
  Info,
} from 'lucide-react';
import { ChallengeProposal, ChallengeCategory } from '../../types/challengeTypes';
import { formatPointAmount, isCategoryMatch } from '../../services/challengeService';

interface ChallengeProposalsListProps {
  proposals: ChallengeProposal[];
  onSelectProposal: (proposal: ChallengeProposal) => void;
  onToggleLike: (proposalId: string) => void;
  currentUserId: string;
  onOpenSubmit: () => void;
}

const CATEGORIES: ('全部' | ChallengeCategory)[] = [
  '全部',
  '科技創新',
  'AI智慧',
  '商業模式',
  '生活永續',
  '社會創新',
  '文創教育',
  '生醫健康',
];

type SortMode = 'funding' | 'likes' | 'comments' | 'newest';

export const ChallengeProposalsList: React.FC<ChallengeProposalsListProps> = ({
  proposals,
  onSelectProposal,
  onToggleLike,
  currentUserId,
  onOpenSubmit,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'全部' | ChallengeCategory>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('funding');

  const hasDemoData = proposals.some((p) => p.isDemo);

  // Filter approved proposals for public explore using normalized isCategoryMatch
  const filteredAndSortedProposals = useMemo(() => {
    let list = proposals.filter((p) => p.status === 'approved');

    if (selectedCategory !== '全部') {
      list = list.filter((p) => isCategoryMatch(p.category, selectedCategory));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.painPoint.toLowerCase().includes(q) ||
          p.solution.toLowerCase().includes(q) ||
          p.teamName.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      if (sortBy === 'funding') {
        return (b.fundingRaised || 0) - (a.fundingRaised || 0);
      }
      if (sortBy === 'likes') {
        return (b.likes || 0) - (a.likes || 0);
      }
      if (sortBy === 'comments') {
        const aCount = (a.comments?.length || 0) + (a.expertReviews?.length || 0);
        const bCount = (b.comments?.length || 0) + (b.expertReviews?.length || 0);
        return bCount - aCount;
      }
      // newest
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }, [proposals, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>競賽提案專區</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                創新季
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            借鏡大專校院創業學習平臺架構：提案總覽、模擬支持、評審點評與完整企劃專頁
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋提案名稱、痛點或團隊..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 focus:border-amber-500 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Demo Mode Notification Banner */}
      {hasDemoData && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">【展示範例模式】</span>
            <span>
              目前列出 7 大領域之示範提案與模擬數據，供平台體驗與審查流程驗證；正式參賽提案經管理員審核通過後將即時刊登。
            </span>
          </div>
        </div>
      )}

      {/* Category Pills & Sort Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-2xs font-black'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 self-end lg:self-auto text-xs font-bold text-stone-500 shrink-0">
          <span className="text-[11px] text-stone-400">排序方式：</span>
          <button
            type="button"
            onClick={() => setSortBy('funding')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              sortBy === 'funding'
                ? 'bg-amber-100 text-amber-950 border border-amber-300 font-black'
                : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            <span>募資金額</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('likes')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              sortBy === 'likes'
                ? 'bg-rose-100 text-rose-900 border border-rose-300 font-black'
                : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>按讚人氣</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('comments')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              sortBy === 'comments'
                ? 'bg-blue-100 text-blue-900 border border-blue-300 font-black'
                : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>討論熱度</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('newest')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              sortBy === 'newest'
                ? 'bg-stone-200 text-stone-900 font-black'
                : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>最新刊登</span>
          </button>
        </div>
      </div>

      {/* Proposals Grid */}
      {filteredAndSortedProposals.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-stone-300 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-stone-800">
            {selectedCategory === '全部' ? '目前尚無正式過審之參賽提案' : `目前「${selectedCategory}」分類尚無參賽提案`}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            立即投稿您的創新創業構想，成為此領域的第一批創新開拓者！
          </p>
          <button
            type="button"
            onClick={onOpenSubmit}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>我要投稿此領域</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProposals.map((proposal) => {
            const isLiked = proposal.likedUserIds?.includes(currentUserId);
            const hasExpertReview = proposal.expertReviews && proposal.expertReviews.length > 0;

            return (
              <div
                key={proposal.id}
                onClick={() => onSelectProposal(proposal)}
                className="bg-white rounded-3xl border border-stone-200 hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group"
              >
                {/* Cover Image & Badges */}
                <div className="relative aspect-16/9 bg-stone-100 overflow-hidden">
                  <img
                    src={proposal.coverImage}
                    alt={proposal.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-black/20" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    {/* 綠色活動標籤「創新季」 */}
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-stone-950 font-black text-[10px] shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />
                      <span>創新季</span>
                    </span>

                    {/* 領域標籤 */}
                    <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-2xs text-stone-200 text-[10px] font-bold border border-white/10">
                      {proposal.category}
                    </span>

                    {/* 展示範例標籤 */}
                    {proposal.isDemo && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black shadow-2xs">
                        展示範例
                      </span>
                    )}

                    {/* 官方認證金色標章 */}
                    {proposal.isCertified && !proposal.isDemo && (
                      <span
                        className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black flex items-center gap-0.5 shadow-2xs"
                        title="通過審核獲得官方「IdeaX 創新挑戰認證」"
                      >
                        <Award className="w-3 h-3" />
                        <span>認證標章</span>
                      </span>
                    )}
                  </div>

                  {/* Like Button on Image */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(proposal.id);
                    }}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                      isLiked
                        ? 'bg-rose-500 text-white'
                        : 'bg-black/50 backdrop-blur-2xs text-white hover:bg-rose-500'
                    }`}
                    title={isLiked ? '取消收藏' : '加入收藏與支持'}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  </button>

                  {/* Bottom Stats on Image */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-mono">
                    <span className="flex items-center gap-1 opacity-90">
                      <Users className="w-3.5 h-3.5 text-amber-300" />
                      <span>{proposal.fundingSupportersCount || 0} 人支持</span>
                    </span>

                    <span className="flex items-center gap-1 opacity-80" title="瀏覽次數">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{proposal.views || 0}</span>
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-2">
                    {/* Author & Team */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
                        {proposal.authorAvatar ? (
                          <img src={proposal.authorAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-amber-400 text-stone-950 font-black text-[10px] flex items-center justify-center">
                            {proposal.authorName.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-stone-700 truncate">
                        {proposal.teamName || proposal.authorName}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono truncate">
                        @{proposal.authorName}
                      </span>
                    </div>

                    {/* Proposal Title */}
                    <h3 className="font-black text-sm sm:text-base text-stone-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                      {proposal.title}
                    </h3>

                    {/* Short Pain Point snippet */}
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      <span className="font-bold text-stone-700">痛點：</span>
                      {proposal.painPoint}
                    </p>
                  </div>

                  {/* Funding & Expert Badge */}
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    {/* Virtual Crowdfunding Raised */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-500 font-bold">虛擬募資進度</span>
                      <span className="font-mono font-black text-base text-amber-600">
                        {formatPointAmount(proposal.fundingRaised || 0)}
                      </span>
                    </div>

                    {/* Expert Review Highlight */}
                    {hasExpertReview && (
                      <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-[11px] text-purple-900 flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                          <span>專家指導意見</span>
                        </span>
                        <span className="font-bold text-purple-700">
                          ★ {proposal.expertReviews[0].rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Solver, Category, ProblemLevel, isCertifiedExpert } from '../types';
import { useApp } from '../context/AppContext';
import { HelpTooltip } from './HelpTooltip';
import { AiHeadhunterModal } from './AiHeadhunterModal';
import {
  ShieldCheck,
  Star,
  Award,
  CheckCircle2,
  TrendingUp,
  Search,
  ExternalLink,
  MessageSquare,
  Sparkles,
  MessageCircle,
  Trophy,
  ArrowRight,
  Coins,
  Plus,
  Zap,
  Bot,
} from 'lucide-react';

interface SolversViewProps {
  onSelectSolver: (solver: Solver) => void;
  onPostQuestionForSolver: (solver: Solver) => void;
  onOpenChat?: (solver: Solver) => void;
  onNavigateToLeaderboard?: () => void;
  onPostQuestion?: () => void;
  onOpenExpertCertification?: () => void;
}

export const SolversView: React.FC<SolversViewProps> = ({
  onSelectSolver,
  onPostQuestionForSolver,
  onOpenChat,
  onNavigateToLeaderboard,
  onPostQuestion,
  onOpenExpertCertification,
}) => {
  const { solvers, startDirectChat, currentUser, openAuthModal } = useApp();
  const [selectedDomain, setSelectedDomain] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHeadhunterOpen, setIsHeadhunterOpen] = useState(false);

  const handleOpenCertification = () => {
    if (currentUser.id === 'user-guest') {
      openAuthModal('login');
      return;
    }
    if (onOpenExpertCertification) {
      onOpenExpertCertification();
    }
  };

  const handleStartChatWithSolver = (e: React.MouseEvent, solver: Solver) => {
    e.stopPropagation();
    startDirectChat({
      id: solver.id,
      name: solver.name,
      avatar: solver.avatar,
      title: solver.title,
    });
    if (onOpenChat) {
      onOpenChat(solver);
    }
  };

  const domains = ['全部', '創新創業', '專業問題', '學術探討', '日常疑難'];

  const filtered = solvers.filter((s) => {
    const matchesDomain = selectedDomain === '全部' || s.domain === selectedDomain;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      (s.bio && s.bio.toLowerCase().includes(q)) ||
      s.skills.some((sk) => sk.toLowerCase().includes(q)) ||
      (s.subcategory && s.subcategory.toLowerCase().includes(q)) ||
      s.domain.toLowerCase().includes(q) ||
      (s.featuredCase && (
        s.featuredCase.title.toLowerCase().includes(q) ||
        (s.featuredCase.description && s.featuredCase.description.toLowerCase().includes(q))
      ));
    return matchesDomain && matchesSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 md:p-7 rounded-3xl bg-white border border-stone-200 relative overflow-hidden shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            {/* Tag Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200/80 whitespace-nowrap">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>IdeaX 認證專家智庫 • 讓想法發光</span>
              </span>
            </div>

            {/* Title & Tooltip & 認證專家優先曝光 (帶箭頭) */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
                認證專家智庫
              </h2>
              <HelpTooltip
                title="認證專家標準說明"
                content="認證專家資格：通過平台專業認證（實名審核與資歷核驗），或 採納方案 ≥ 50 份且評分 ≥ 4 星。成為專家優先獲得曝光，公開展示專業領域、方案採納次數與客戶評分口碑，為您的難題提供破局關鍵方案。"
              />
              <button
                type="button"
                onClick={handleOpenCertification}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 active:scale-95 text-stone-950 border border-amber-400 shadow-2xs text-xs font-black whitespace-nowrap cursor-pointer transition-all group ml-1"
                title="前往申請認證專家，優先獲得官方曝光"
              >
                <Sparkles className="w-3.5 h-3.5 fill-stone-950 shrink-0 group-hover:scale-110 transition-transform" />
                <span>認證專家優先曝光</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-950 stroke-[2.5] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              匯聚各領域資深實務專家與技術顧問，為您的商業問題提供落地破局方案。
            </p>
          </div>

          {/* Action Buttons Toolbar: [AI 獵頭找專家] + [提問懸賞] + [榮譽榜] */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
            <button
              type="button"
              onClick={() => setIsHeadhunterOpen(true)}
              className="px-3.5 py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 hover:from-stone-800 hover:to-stone-750 active:scale-95 text-amber-300 font-black text-xs sm:text-sm shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-amber-500/40 group shrink-0 whitespace-nowrap"
              title="啟動 AI 獵頭搜尋，首搜特惠 30 點（次回 40 點），精準推薦 4 位專家，未滿 4 位不扣點"
            >
              <Bot className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              <span>AI 獵頭找專家</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-black">首搜30點</span>
            </button>

            {onPostQuestion && (
              <button
                type="button"
                onClick={onPostQuestion}
                className="px-3.5 py-2 rounded-xl sm:rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs sm:text-sm shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-amber-400 group shrink-0 whitespace-nowrap"
                title="立即發布問題懸賞或需求委託"
              >
                <Plus className="w-4 h-4 stroke-[3] text-stone-950 group-hover:rotate-90 transition-transform shrink-0" />
                <span>提問懸賞</span>
              </button>
            )}

            {onNavigateToLeaderboard && (
              <button
                type="button"
                onClick={onNavigateToLeaderboard}
                className="px-3.5 py-2 rounded-xl sm:rounded-2xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-850 font-bold text-xs sm:text-sm shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border border-stone-200/80 group shrink-0 whitespace-nowrap"
                title="查看全平台交易榮譽榜與專家排名"
              >
                <Trophy className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform shrink-0" />
                <span>榮譽榜</span>
                <ArrowRight className="w-3 h-3 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {domains.map((dom) => (
              <button
                key={dom}
                onClick={() => setSelectedDomain(dom)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedDomain === dom
                    ? 'bg-amber-500 text-stone-950 font-black shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {dom}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋標題、專長、顧問姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs font-medium outline-hidden focus:ring-2 focus:ring-amber-500/50 bg-stone-50 focus:bg-white transition-all shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Solvers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((s) => {
          // 方案採納次數計算
          const acceptedSolutionsCount = Math.round(s.answerCount * (s.acceptedRate / 100)) || s.answerCount;

          return (
            <div
              key={s.id}
              className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-400 p-5 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Header: Avatar, Name, Verified Expert, Rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={s.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={s.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSolver(s);
                      }}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-stone-200 group-hover:ring-amber-400 hover:scale-105 transition-all cursor-pointer shadow-2xs"
                      title={`點擊查看 ${s.name} 專家個人檔案`}
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-base text-stone-900 group-hover:text-amber-600 transition-colors">
                          {s.name}{s.title ? ` · ${s.title}` : ''}
                        </h3>
                        {isCertifiedExpert(s) && (
                          <span
                            title="認證專家（通過平台認證，或 採納方案 ≥ 50）"
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200"
                          >
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>認證專家</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-stone-500 line-clamp-1">{s.title}</span>
                    </div>
                  </div>

                  {/* 評分 (0~5星) */}
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{s.rating}</span>
                  </div>
                </div>

                {/* Bio */}
                <p className="mt-3 text-xs text-stone-600 line-clamp-2 leading-relaxed">{s.bio}</p>

                {/* Skills Tags */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {s.skills.map((sk) => (
                    <span
                      key={sk}
                      className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md"
                    >
                      #{sk}
                    </span>
                  ))}
                </div>

                {/* Featured Case */}
                {s.featuredCase && (
                  <div className="mt-3.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 space-y-0.5">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      精選實際案例
                    </div>
                    <div className="font-semibold text-stone-900 line-clamp-1">{s.featuredCase.title}</div>
                    <div className="text-[11px] text-stone-500 line-clamp-1">{s.featuredCase.outcome}</div>
                  </div>
                )}
              </div>

              {/* Metrics & Action Footer: 公開顯示專業領域、方案採納次數、評分（0~5星） */}
              <div className="mt-4 pt-3.5 border-t border-stone-100">
                {/* 解答各等級問題數 (L0 ~ L4) */}
                <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-stone-500">解答各等級問題數：</span>
                  <div className="flex items-center gap-1 font-mono">
                    {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
                      const count = (s.levelAnswerCounts && s.levelAnswerCounts[lvl] !== undefined)
                        ? s.levelAnswerCounts[lvl]
                        : lvl === 'L0' ? Math.max(1, Math.round(s.answerCount * 0.15))
                        : lvl === 'L1' ? Math.max(2, Math.round(s.answerCount * 0.35))
                        : lvl === 'L2' ? Math.max(2, Math.round(s.answerCount * 0.28))
                        : lvl === 'L3' ? Math.max(1, Math.round(s.answerCount * 0.16))
                        : Math.max(1, Math.round(s.answerCount * 0.06));
                      return (
                        <span key={lvl} className="px-1 py-0.2 rounded bg-white border border-stone-200 text-stone-700">
                          {lvl}: <strong className="text-amber-800">{count}</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                  <div className="p-1.5 rounded-lg bg-stone-50">
                    <span className="text-[10px] text-stone-400 block">專業領域</span>
                    <span className="font-extrabold text-stone-900 truncate block text-xs">
                      {s.domain}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-50/60 border border-amber-100">
                    <span className="text-[10px] text-amber-800 block">方案採納</span>
                    <span className="font-extrabold text-amber-900 font-mono">{acceptedSolutionsCount} 次</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-stone-50">
                    <span className="text-[10px] text-stone-400 block">評價口碑</span>
                    <span className="font-extrabold text-stone-900 font-mono">
                      {s.rating} ★
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectSolver(s)}
                    className="flex-1 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-800 text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    查看檔案
                  </button>
                  <button
                    onClick={(e) => handleStartChatWithSolver(e, s)}
                    className="px-2.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title={`與 ${s.name} 私聊諮詢`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>私聊</span>
                  </button>
                  <button
                    onClick={() => onPostQuestionForSolver(s)}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>指定提問</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI 獵頭找專家彈窗 */}
      <AiHeadhunterModal
        isOpen={isHeadhunterOpen}
        onClose={() => setIsHeadhunterOpen(false)}
        onSelectSolver={onSelectSolver}
        onOpenChat={onOpenChat}
      />
    </div>
  );
};

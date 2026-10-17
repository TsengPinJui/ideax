import React, { useState } from 'react';
import { Solver, Category, ProblemLevel, isCertifiedExpert } from '../types';
import { useApp } from '../context/AppContext';
import { HelpTooltip } from './HelpTooltip';
import { AiHeadhunterModal } from './AiHeadhunterModal';
import { GuestBoardGateBlurOverlay } from './GuestBoardGateBlurOverlay';
import { isGuestUser } from '../utils/userDisplay';
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
      {/* Top Header & Unified Filter Bar */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tight">
                專家智庫
              </h2>
              <HelpTooltip
                title="認證專家標準"
                content="通過平台實名與資歷核驗，或累積採納方案 ≥ 50 份且評分 ≥ 4.0 星。認證專家享有優先曝光與專屬信譽標章。"
              />
              <button
                type="button"
                onClick={handleOpenCertification}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors group"
                title="申請成為認證專家"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>申請認證曝光</span>
                <ArrowRight className="w-3 h-3 text-amber-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
            <p className="text-xs text-stone-500">
              匯聚各領域實務顧問，為您的難題提供落地破局方案
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none shrink-0">
            <button
              type="button"
              onClick={() => setIsHeadhunterOpen(true)}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-stone-900 hover:bg-stone-800 active:scale-95 text-amber-300 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              title="AI 獵頭精準配對 4 位專家（首搜 30 點，未滿 4 位不扣點）"
            >
              <Bot className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>AI 獵頭配對</span>
            </button>

            {onPostQuestion && (
              <button
                type="button"
                onClick={onPostQuestion}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5] text-stone-950 shrink-0" />
                <span>發布懸賞</span>
              </button>
            )}

            {onNavigateToLeaderboard && (
              <button
                type="button"
                onClick={onNavigateToLeaderboard}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-stone-100 hover:bg-stone-200/80 active:scale-95 text-stone-700 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>榮譽榜</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
            {domains.map((dom) => (
              <button
                key={dom}
                onClick={() => setSelectedDomain(dom)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedDomain === dom
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {dom}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋專長、職稱、顧問姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-full bg-stone-100/80 focus:bg-white border border-transparent focus:border-amber-400 text-xs font-medium outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Solvers Grid & Guest Gate */}
      {(() => {
        const isGuest = isGuestUser(currentUser);
        const visibleSolvers = isGuest ? filtered.slice(0, 3) : filtered;

        const renderSolverCard = (s: Solver, isBlurred = false) => {
          const acceptedSolutionsCount = Math.round(s.answerCount * (s.acceptedRate / 100)) || s.answerCount;
          const levelBreakdownText = (['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[])
            .map((lvl) => {
              const count =
                s.levelAnswerCounts && s.levelAnswerCounts[lvl] !== undefined
                  ? s.levelAnswerCounts[lvl]
                  : lvl === 'L0'
                  ? Math.max(1, Math.round(s.answerCount * 0.15))
                  : lvl === 'L1'
                  ? Math.max(2, Math.round(s.answerCount * 0.35))
                  : lvl === 'L2'
                  ? Math.max(2, Math.round(s.answerCount * 0.28))
                  : lvl === 'L3'
                  ? Math.max(1, Math.round(s.answerCount * 0.16))
                  : Math.max(1, Math.round(s.answerCount * 0.06));
              return `${lvl}: ${count} 件`;
            })
            .join(' ｜ ');

          return (
            <div
              key={s.id}
              onClick={() => {
                if (isBlurred) {
                  openAuthModal('login');
                  return;
                }
                onSelectSolver(s);
              }}
              className="group bg-white rounded-2xl border border-stone-200/80 hover:border-stone-300 p-4 sm:p-5 transition-all duration-200 hover:shadow-md flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Header: Avatar, Name, Verified Badge, Rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={s.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={s.name}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border border-stone-200 group-hover:scale-105 transition-transform shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-sm sm:text-base text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                          {s.name}
                        </h3>
                        {isCertifiedExpert(s) && (
                          <span
                            title="認證專家（通過平台實名認證，或採納方案 ≥ 50）"
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800"
                          >
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>認證</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{s.title}</p>
                    </div>
                  </div>

                  {/* Rating Pill */}
                  <div className="flex items-center gap-1 text-xs font-black text-stone-800 bg-stone-100/80 px-2 py-0.5 rounded-full shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-mono">{s.rating}</span>
                  </div>
                </div>

                {/* Bio */}
                <p className="mt-3 text-xs text-stone-600 line-clamp-2 leading-relaxed">{s.bio}</p>

                {/* Skills Tags */}
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded-md">
                    {s.domain}
                  </span>
                  {s.skills.slice(0, 3).map((sk) => (
                    <span
                      key={sk}
                      className="text-[11px] font-medium text-stone-500 bg-stone-100/70 px-2 py-0.5 rounded-md"
                    >
                      #{sk}
                    </span>
                  ))}
                </div>

                {/* Featured Case (Compact Single Line) */}
                {s.featuredCase && (
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center gap-1.5 text-xs text-stone-600">
                    <span className="text-[10px] font-bold text-stone-400 shrink-0">代表案例</span>
                    <span className="font-semibold text-stone-800 truncate">{s.featuredCase.title}</span>
                  </div>
                )}
              </div>

              {/* Footer: Key Metrics + Actions */}
              <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-1.5 text-xs text-stone-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>
                    已採納 <strong className="font-mono font-black text-stone-900">{acceptedSolutionsCount}</strong> 次
                  </span>
                  <HelpTooltip
                    title={`${s.name} 各等級解答實績`}
                    content={`總解答數 ${s.answerCount} 件（採納率 ${s.acceptedRate}%）。各等級分布：${levelBreakdownText}`}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      if (isBlurred || isGuest) {
                        e.stopPropagation();
                        openAuthModal('login');
                        return;
                      }
                      handleStartChatWithSolver(e, s);
                    }}
                    className="px-2.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title={`與 ${s.name} 私聊諮詢`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-stone-600" />
                    <span>私聊</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isBlurred || isGuest) {
                        openAuthModal('login');
                        return;
                      }
                      onPostQuestionForSolver(s);
                    }}
                    className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>指定提問</span>
                  </button>
                </div>
              </div>
            </div>
          );
        };

        const blurredSolvers = isGuest && filtered.length > 3 ? filtered.slice(3, 6) : [];

        // 空狀態：沒有任何專家時邀請成為第一批認證專家；有專家但搜尋/篩選無結果時提示調整條件
        if (filtered.length === 0) {
          const hasAnySolver = solvers.length > 0;
          return (
            <div className="rounded-3xl border border-dashed border-amber-300 bg-gradient-to-br from-amber-50/80 via-white to-white px-6 py-10 sm:py-14 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-amber-600" />
              </div>
              {hasAnySolver ? (
                <>
                  <h3 className="mt-4 text-lg sm:text-xl font-black text-stone-900">找不到符合條件的專家</h3>
                  <p className="mt-2 text-sm text-stone-500">試試其他關鍵字或領域，或直接發布問題讓專家來找你。</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedDomain('全部');
                      }}
                      className="px-4 py-2 rounded-xl bg-white border border-stone-200 hover:border-stone-300 text-sm font-bold text-stone-700 cursor-pointer"
                    >
                      清除篩選
                    </button>
                    {onPostQuestion && (
                      <button
                        type="button"
                        onClick={onPostQuestion}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-black text-stone-950 cursor-pointer"
                      >
                        發布問題
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="mt-4 text-lg sm:text-xl font-black text-stone-900">專家智庫正在招募第一批認證專家</h3>
                  <p className="mt-2 text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                    通過實名與資歷認證，就能出現在這裡，讓需要你專業的人直接找到你。
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleOpenCertification}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-black text-stone-950 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>申請成為認證專家</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    {onPostQuestion && (
                      <button
                        type="button"
                        onClick={onPostQuestion}
                        className="px-5 py-2.5 rounded-xl bg-white border border-stone-200 hover:border-stone-300 text-sm font-bold text-stone-700 cursor-pointer"
                      >
                        先發布問題
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        }

        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {visibleSolvers.map((s) => renderSolverCard(s))}
            </div>

            {isGuest && filtered.length > 3 && (
              <GuestBoardGateBlurOverlay
                remainingCount={filtered.length - 3}
                totalCount={filtered.length}
                boardName={selectedDomain !== '全部' ? `${selectedDomain} 推薦專家` : '專家智庫'}
                onOpenAuth={() => openAuthModal('login')}
                blurredPreviewChildren={
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {blurredSolvers.map((s) => renderSolverCard(s, true))}
                  </div>
                }
              />
            )}
          </>
        );
      })()}

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

import React, { useMemo, useState } from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Compass, ChevronDown, ChevronUp } from 'lucide-react';
import { Category } from '../types';
import { IdeaXLogo } from './IdeaXLogo';
import { HelpTooltip } from './HelpTooltip';
import { useApp } from '../context/AppContext';
import { YellowLiquidHeroBackground } from './YellowLiquidHeroBackground';

interface HeroSectionProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  selectedCategory: Category | '全部';
  setSelectedCategory: (cat: Category | '全部') => void;
  onPostClick: () => void;
  onPostPainPointClick?: () => void;
  onFindExpertsClick?: () => void;
  onExploreClick: () => void;
  onLeaderboardClick?: () => void;
  highestBountyQuestion?: { id: string; title: string; bounty: number; level: string };
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onPostClick,
  onFindExpertsClick,
  onExploreClick,
  onLeaderboardClick,
}) => {
  const {
    questions,
    answers,
    solvers,
    transactions,
    conversations,
    publicMetricsConfig,
    isNoPaymentMode,
    isDemoMode,
    siteVisitsCount,
    onlineUsersCount,
    realRegisteredUsersCount,
  } = useApp();

  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);

  // 1. 網站造訪量
  const siteVisitsFormatted = useMemo(() => {
    return (siteVisitsCount || 0).toLocaleString();
  }, [siteVisitsCount]);

  // 2. 即時線上人數
  const onlineUsersFormatted = useMemo(() => {
    return `${Math.max(1, onlineUsersCount || 1)}`;
  }, [onlineUsersCount]);

  // 3. 總註冊用戶
  const totalMembersFormatted = useMemo(() => {
    return `${realRegisteredUsersCount || 0}`;
  }, [realRegisteredUsersCount]);

  // 4. 認證專家
  const verifiedSolversFormatted = useMemo(() => {
    return `${(solvers || []).filter((s) => s.verifiedBadge).length}`;
  }, [solvers]);

  // 5. 問題數量
  const questionsCountFormatted = useMemo(() => {
    return `${(questions || []).length}`;
  }, [questions]);

  // 6. 提案數量
  const proposalsCountFormatted = useMemo(() => {
    return `${(answers || []).length}`;
  }, [answers]);

  // 7. 累計解決難題
  const solvedCountFormatted = useMemo(() => {
    const solvedQuestionIds = new Set<string>();
    questions.forEach((q) => {
      if (q.status === 'solved') {
        solvedQuestionIds.add(q.id);
      }
    });
    answers.forEach((a) => {
      if (a.isAccepted) {
        solvedQuestionIds.add(a.questionId);
      }
    });
    const total = solvedQuestionIds.size;
    return total >= 1000 ? `${total.toLocaleString()}+` : `${total}`;
  }, [questions, answers]);

  // 8. 已成交方案
  const totalDealsFormatted = useMemo(() => {
    const solvedQuestions = (questions || []).filter((q) => q.status === 'solved' || q.status === 'closed').length;
    const acceptedAnswers = (answers || []).filter((a) => a.isAccepted).length;
    const questionDeals = Math.max(solvedQuestions, acceptedAnswers);
    const chatDeals = (conversations || []).reduce((acc, conv) => {
      const acceptedOffers = (conv.messages || []).filter(
        (m) => m.offer && (m.offer.status === 'accepted' || m.offer.status === 'completed')
      ).length;
      return acc + acceptedOffers;
    }, 0);
    const total = questionDeals + chatDeals;
    return `${total}`;
  }, [questions, answers, conversations]);

  // 9. 累計懸賞金額
  const totalBountyFormatted = useMemo(() => {
    if (isNoPaymentMode || !isDemoMode) {
      return 'NT$ 0';
    }
    const questionBounties = questions.reduce((acc, q) => acc + (Number(q.bounty) || 0), 0);
    const completedTransactions = transactions
      .filter(
        (t) =>
          (t.type as string) !== '會員方案訂閱' &&
          (t.type as string) !== '點數儲值' &&
          (t.status === '已完成' ||
            t.payoutStatus === '已撥款至銀行帳戶' ||
            t.type.includes('拆款') ||
            t.type.includes('解鎖') ||
            t.type.includes('採納') ||
            t.type.includes('方案'))
      )
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const total = questionBounties + completedTransactions;
    if (total >= 1000000) {
      return `NT$ ${(total / 1000000).toFixed(1)}M+`;
    }
    return `NT$ ${total.toLocaleString()}`;
  }, [questions, transactions, isNoPaymentMode, isDemoMode]);

  // 10. 平台總交易額
  const totalGMVFormatted = useMemo(() => {
    if (isNoPaymentMode || !isDemoMode) return 'NT$ 0';
    const total = (transactions || []).reduce((acc, t) => acc + (t.amount || 0), 0);
    return `NT$ ${total.toLocaleString()}`;
  }, [transactions, isNoPaymentMode, isDemoMode]);

  // 11. 平均回覆速度
  const avgResponseSpeedFormatted = useMemo(() => {
    const responseTimesInHours: number[] = [];

    questions.forEach((q) => {
      const qTime = new Date(q.createdAt).getTime();
      if (isNaN(qTime)) return;

      const qAnswers = answers.filter((a) => a.questionId === q.id);
      if (qAnswers.length > 0) {
        let earliestAnsTime = Infinity;
        qAnswers.forEach((a) => {
          const aTime = new Date(a.createdAt).getTime();
          if (!isNaN(aTime) && aTime >= qTime) {
            if (aTime < earliestAnsTime) {
              earliestAnsTime = aTime;
            }
          }
        });

        if (earliestAnsTime !== Infinity) {
          const diffHours = (earliestAnsTime - qTime) / (1000 * 60 * 60);
          if (diffHours >= 0) {
            responseTimesInHours.push(diffHours);
          }
        }
      }
    });

    if (responseTimesInHours.length === 0) {
      return questions.length === 0 ? '-' : '24 hrs';
    }

    const avgHours = responseTimesInHours.reduce((a, b) => a + b, 0) / responseTimesInHours.length;

    if (avgHours < 1) {
      const mins = Math.max(1, Math.round(avgHours * 60));
      return `${mins} mins`;
    } else if (avgHours < 24) {
      return `${avgHours.toFixed(1)} hrs`;
    } else {
      const days = (avgHours / 24).toFixed(1);
      return `${days} days`;
    }
  }, [questions, answers]);

  // 12. 方案採納滿意度
  const satisfactionRateFormatted = useMemo(() => {
    return '0%';
  }, []);

  // 13. 當前全站最高懸賞題目金額
  const currentHighestBounty = useMemo(() => {
    if (isNoPaymentMode || !isDemoMode) return 0;
    if (!questions || questions.length === 0) return 0;
    return Math.max(...questions.map((q) => Number(q.bounty) || 0), 0);
  }, [questions, isNoPaymentMode, isDemoMode]);

  const allMetricItems = useMemo(() => {
    const list: { key: string; label: string; value: string; unit?: string; accent?: string }[] = [];
    if (publicMetricsConfig.showQuestionsCount) list.push({ key: 'questions', label: '市場問題', value: questionsCountFormatted, unit: '題' });
    if (publicMetricsConfig.showProposalsCount) list.push({ key: 'proposals', label: '專家提案', value: proposalsCountFormatted, unit: '件' });
    if (publicMetricsConfig.showVerifiedSolvers) list.push({ key: 'solvers', label: '認證專家', value: verifiedSolversFormatted, unit: '位' });
    if (publicMetricsConfig.showSolvedCount) list.push({ key: 'solved', label: '已解決', value: solvedCountFormatted });
    if (publicMetricsConfig.showTotalBounty) list.push({ key: 'bounty', label: '累計懸賞', value: totalBountyFormatted, accent: 'text-amber-600' });
    if (publicMetricsConfig.showTotalViews) list.push({ key: 'views', label: '總瀏覽', value: siteVisitsFormatted });
    if (publicMetricsConfig.showOnlineUsers) list.push({ key: 'online', label: '線上人數', value: onlineUsersFormatted, unit: '位', accent: 'text-emerald-600' });
    if (publicMetricsConfig.showTotalMembers) list.push({ key: 'members', label: '註冊會員', value: totalMembersFormatted, unit: '位' });
    if (publicMetricsConfig.showTotalDeals) list.push({ key: 'deals', label: '已成交', value: totalDealsFormatted, unit: '筆' });
    if (publicMetricsConfig.showAvgResponseSpeed) list.push({ key: 'speed', label: '平均回覆', value: avgResponseSpeedFormatted });
    if (publicMetricsConfig.showSatisfactionRate) list.push({ key: 'satisfaction', label: '滿意度', value: satisfactionRateFormatted });
    if (publicMetricsConfig.showTotalGMV) list.push({ key: 'gmv', label: '總交易額', value: totalGMVFormatted });
    return list;
  }, [
    publicMetricsConfig,
    questionsCountFormatted,
    proposalsCountFormatted,
    verifiedSolversFormatted,
    solvedCountFormatted,
    totalBountyFormatted,
    siteVisitsFormatted,
    onlineUsersFormatted,
    totalMembersFormatted,
    totalDealsFormatted,
    avgResponseSpeedFormatted,
    satisfactionRateFormatted,
    totalGMVFormatted,
  ]);

  const visibleMetrics = isMetricsExpanded ? allMetricItems : allMetricItems.slice(0, 4);

  return (
    <section className="relative pt-4 pb-4 sm:pt-8 sm:pb-8 overflow-hidden">
      <YellowLiquidHeroBackground className="h-full" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Official IdeaX Brand Display - 手機版精巧緊湊、電腦版大氣通透 */}
          <div className="relative mb-3 sm:mb-5 group inline-flex max-w-[88%] sm:max-w-sm mx-auto justify-center">
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-amber-400/25 blur-xl scale-105 pointer-events-none" />
            <div className="relative py-2 px-4 sm:py-3 sm:px-5 rounded-2xl sm:rounded-3xl backdrop-blur-md bg-white/85 border border-amber-200/70 shadow-sm flex items-center justify-center gap-2.5 sm:gap-3.5 transition-all duration-300">
              <img
                src="/logo-bulb.png"
                alt="IdeaX 燈泡"
                className="h-16 sm:h-24 md:h-28 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <img
                src="/logo-chuangdianzi-text.png"
                alt="創點子 IdeaX"
                className="h-11 sm:h-16 md:h-18 w-auto object-contain shrink-0"
              />
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-xl sm:text-3xl md:text-[34px] font-black text-stone-900 tracking-tight leading-snug my-1.5 sm:my-2.5">
            一個問題，找到<span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2">更多可能</span>。
          </h1>

          {/* Subtitle */}
          <div className="mt-1 sm:mt-2 mb-3 sm:mb-5 flex items-center justify-center gap-1.5 text-xs sm:text-sm text-stone-600 font-medium">
            <span>痛點許願 · 創新提案 · 專家懸賞</span>
          </div>

          {/* Primary, Find Experts & Explore Action Buttons */}
          <div className="mt-1 sm:mt-2 hidden sm:flex sm:flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
            {/* 1. 主行動：立即發布! */}
            <button
              onClick={onPostClick}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 active:from-amber-600 active:to-amber-600 text-stone-950 font-black text-sm sm:text-base shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center leading-tight cursor-pointer group border border-amber-300/80"
            >
              <span className="flex items-center justify-center gap-1.5 text-sm sm:text-base font-black">
                <IdeaXLogo variant="bulb" size="sm" />
                <span>立即發布!</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-stone-900/80 mt-0.5">(問題、痛點、提案、刊登、討論)</span>
            </button>

            {/* 2. 次行動：找專家 / 徵才 */}
            <button
              onClick={onFindExpertsClick}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-black text-sm sm:text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/80"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>找專家 / 徵才</span>
            </button>

            {/* 3. 探索行動：最新熱門趨勢 (柔和玫瑰粉紅框與羅盤圖示) */}
            <button
              onClick={onExploreClick}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-rose-50/50 active:bg-rose-50 text-stone-800 hover:text-rose-950 font-extrabold text-sm sm:text-base shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border-[1.5px] border-rose-400 hover:border-rose-500 group"
            >
              <Compass className="w-4 h-4 text-rose-500 group-hover:rotate-45 transition-transform" />
              <span>最新熱門趨勢</span>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

        {/* Clean Collapsible Metrics Bar (精簡橫條 + 可展開完整指標) */}
        {(allMetricItems.length > 0 || publicMetricsConfig.showHighestBounty) && (
          <div className="mt-4 sm:mt-7 pt-3 sm:pt-4 border-t border-stone-200/60 max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-2 text-center">
              {visibleMetrics.map((m) => (
                <div key={m.key} className="flex items-baseline gap-1.5">
                  <span className="text-[11px] sm:text-xs text-stone-500 font-medium">{m.label}</span>
                  <span className={`text-sm sm:text-base font-black font-mono ${m.accent || 'text-stone-900'}`}>
                    {m.value}
                  </span>
                  {m.unit && <span className="text-[10px] text-stone-400">{m.unit}</span>}
                </div>
              ))}

              {/* 當前最高賞金快捷膠囊 */}
              {publicMetricsConfig.showHighestBounty && (
                <button
                  id="highest-bounty-section"
                  onClick={onLeaderboardClick}
                  className="scroll-mt-14 sm:scroll-mt-20 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 hover:bg-amber-100/90 border border-amber-200/80 transition-all cursor-pointer group"
                  title="點擊按最高懸賞排序"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span className="text-[11px] font-bold text-stone-600">最高懸賞</span>
                  <span className="text-xs sm:text-sm font-black text-amber-600 font-mono">
                    NT$ {currentHighestBounty.toLocaleString()}
                  </span>
                  <ArrowRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {allMetricItems.length > 4 && (
                <button
                  type="button"
                  onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                >
                  <span>{isMetricsExpanded ? '收合數據' : `更多數據 (${allMetricItems.length})`}</span>
                  {isMetricsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

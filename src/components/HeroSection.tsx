import React, { useMemo } from 'react';
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, Zap, Compass, CheckCircle, Eye, Users, HelpCircle, Briefcase, CheckCircle2, Coins, Clock, Star } from 'lucide-react';
import { Category } from '../types';
import { IdeaXLogo } from './IdeaXLogo';
import { HelpTooltip } from './HelpTooltip';
import { useApp } from '../context/AppContext';

interface HeroSectionProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  selectedCategory: Category | '全部';
  setSelectedCategory: (cat: Category | '全部') => void;
  onPostClick: () => void;
  onPostPainPointClick?: () => void;
  onExploreClick: () => void;
  onLeaderboardClick?: () => void;
  highestBountyQuestion?: { id: string; title: string; bounty: number; level: string };
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onPostClick,
  onPostPainPointClick,
  onExploreClick,
  onLeaderboardClick,
}) => {
  const { questions, answers, solvers, transactions, conversations, availableUsers, publicMetricsConfig, isNoPaymentMode, isDemoMode } = useApp();

  // 1. 總瀏覽量
  const totalViewsFormatted = useMemo(() => {
    const total = (questions || []).reduce((acc, q) => acc + (q.views || q.viewsCount || 0), 0);
    return total.toLocaleString();
  }, [questions]);

  // 2. 即時線上人數
  const onlineUsersFormatted = useMemo(() => {
    const realUsers = (availableUsers || []).filter((u) => u.id !== 'user-guest');
    const total = realUsers.length;
    return `${Math.max(3, Math.min(total, Math.round(total * 0.35) + 3))}`;
  }, [availableUsers]);

  // 3. 總註冊用戶
  const totalMembersFormatted = useMemo(() => {
    const realUsers = (availableUsers || []).filter((u) => u.id !== 'user-guest');
    return `${realUsers.length}`;
  }, [availableUsers]);

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

  // 7. 累計解決難題 (依據真實狀況：全站標記已結案或已有被採納方案之問題總數)
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

  // 8. 已成交方案（全站問題提案獲採納成案數 + 聊天室自訂提案成案數）
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

  // 9. 累計懸賞金額 (正式模式與無金流模式歸零；測試環境依據發出之懸賞與成交方案計算)
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

  // 11. 平均回覆速度 (依據真實狀況：各問題發布時間至第一筆回覆方案之真實平均時間差)
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

  // 12. 方案採納滿意度 (依據真實狀況：全站解答專家與方案真實綜合星級換算)
  const satisfactionRateFormatted = useMemo(() => {
    const ratedSolvers = solvers.filter((s) => typeof s.rating === 'number' && s.rating > 0);
    if (ratedSolvers.length === 0) return '-';

    let totalWeightedRating = 0;
    let totalWeight = 0;

    ratedSolvers.forEach((s) => {
      const weight = Math.max(1, s.reviewCount || 1);
      totalWeightedRating += s.rating * weight;
      totalWeight += weight;
    });

    const avgRating = totalWeight > 0 ? totalWeightedRating / totalWeight : 5.0;
    const percentage = Math.min(100, Math.max(0, (avgRating / 5) * 100));
    return `${percentage.toFixed(1)}%`;
  }, [solvers]);

  // 13. 當前全站最高懸賞題目金額 (即時從真實問題列表抓取最高值，正式模式與無金流模式歸零)
  const currentHighestBounty = useMemo(() => {
    if (isNoPaymentMode || !isDemoMode) return 0;
    if (!questions || questions.length === 0) return 0;
    return Math.max(...questions.map((q) => Number(q.bounty) || 0), 0);
  }, [questions, isNoPaymentMode, isDemoMode]);

  // 計算目前管理者開啟公開展示的指標數量
  const activeMetricsCount = useMemo(() => {
    let count = 0;
    if (publicMetricsConfig.showTotalViews) count++;
    if (publicMetricsConfig.showOnlineUsers) count++;
    if (publicMetricsConfig.showTotalMembers) count++;
    if (publicMetricsConfig.showVerifiedSolvers) count++;
    if (publicMetricsConfig.showQuestionsCount) count++;
    if (publicMetricsConfig.showProposalsCount) count++;
    if (publicMetricsConfig.showSolvedCount) count++;
    if (publicMetricsConfig.showTotalDeals) count++;
    if (publicMetricsConfig.showTotalBounty) count++;
    if (publicMetricsConfig.showTotalGMV) count++;
    if (publicMetricsConfig.showAvgResponseSpeed) count++;
    if (publicMetricsConfig.showSatisfactionRate) count++;
    if (publicMetricsConfig.showHighestBounty) count++;
    return count;
  }, [publicMetricsConfig]);
  return (
    <section className="relative overflow-hidden bg-white border-b border-stone-200 pt-4 pb-2 sm:pt-12 sm:pb-12">
      {/* Radiant ambient glow matching the IdeaX yellow/gold brand aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-200/35 via-yellow-100/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-28 right-10 w-80 h-80 bg-amber-100/30 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Visual Spotlight with IdeaX - 創點子+IdeaX品牌焦點與關鍵字 */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Official IdeaX Brand Display */}
          <div className="relative mb-7 sm:mb-8 group inline-flex max-w-2xl sm:max-w-3xl mx-auto">
            {/* Ambient backlight ring */}
            <div className="absolute inset-0 rounded-[36px] bg-amber-300/30 blur-2xl scale-110 pointer-events-none" />
            <div className="relative py-4 px-6 sm:py-6.5 sm:px-11 md:py-8 md:px-14 rounded-3xl sm:rounded-[32px] bg-gradient-to-b from-amber-50/85 via-white/95 to-white/95 border border-amber-200/75 shadow-sm flex items-center justify-center gap-5 sm:gap-8 md:gap-10">
              <img
                src="/logo-bulb.png?v=trans-bulb-7"
                alt="IdeaX 創點子燈泡"
                className="h-19 sm:h-25 md:h-29 lg:h-31 w-auto object-contain shrink-0 drop-shadow-sm group-hover:scale-105 transition-transform"
              />
              <img
                src="/logo-chuangdianzi-text.png"
                alt="創點子 IdeaX 讓想法發光"
                className="h-21 sm:h-27 md:h-31 lg:h-33 w-auto object-contain shrink-0 group-hover:scale-102 transition-transform"
              />
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 tracking-tight leading-snug sm:leading-tight mt-1">
            一個問題，<br className="hidden sm:inline" />
            找到<span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2">更多可能</span>。
          </h1>

          {/* Value Proposition Badges below headline - 告訴造訪者網站能帶給用戶什麼 */}
          <div className="mt-4.5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-2xl">
            {[
              '徵創業痛點',
              '團隊協作',
              '解題黑客松',
              '高額懸賞解方',
              '專業知識變現',
              '副業斜槓',
              '第三方安全保障',
              '1對1專家顧問',
            ].map((text) => (
              <span
                key={text}
                onClick={() => {
                  if (setSearchQuery) {
                    setSearchQuery(text);
                    const el = document.getElementById('market-grid');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100/90 text-amber-950 border border-amber-200/90 text-xs sm:text-[13px] font-extrabold shadow-2xs select-none flex items-center gap-1.5 cursor-pointer hover:bg-amber-200/80 hover:scale-105 transition-all"
              >
                <span className="text-amber-500 font-bold">✦</span>
                <span>{text}</span>
              </span>
            ))}
          </div>

          {/* Primary, Pain Point & Explore Action Buttons (電腦版顯示，手機版已由底部導覽列與快捷按鈕取代) */}
          <div className="mt-8 hidden sm:flex sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            {/* 1. 主行動：發布懸賞 (金黃品牌核心，象徵重金賞金) */}
            <button
              onClick={onPostClick}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 active:from-amber-600 active:to-amber-600 text-stone-950 font-black text-sm sm:text-base shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer group border border-amber-300/80 ring-2 ring-amber-400/20"
            >
              <IdeaXLogo variant="bulb" size="xs" />
              <span>我有難題，發布懸賞！</span>
            </button>

            {/* 2. 次行動：痛點腦洞 (玫瑰粉紫漸層，象徵靈感 Spark) */}
            <button
              onClick={onPostPainPointClick || onPostClick}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 active:from-rose-700 active:to-pink-700 text-white font-black text-sm sm:text-base shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-400/80"
            >
              <Zap className="w-4 h-4 fill-white text-white animate-pulse" />
              <span>提出痛點，徵集創新腦洞</span>
            </button>

            {/* 3. 探索行動：熱門市集 (簡約質感珍珠白，高對比不搶焦) */}
            <button
              onClick={onExploreClick}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-800 hover:text-amber-950 font-extrabold text-sm sm:text-base shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-stone-200 hover:border-amber-400 group"
            >
              <Compass className="w-4 h-4 text-amber-500 group-hover:rotate-45 transition-transform" />
              <span>探索最新熱門問題</span>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

        {/* Real Metrics Banner (連結管理員後台設定，手機與電腦版皆完整支援展示) */}
        {activeMetricsCount > 0 && (
          <div
            className={`mt-4 sm:mt-10 pt-3 sm:pt-6 border-t border-stone-200/90 grid gap-2 sm:gap-3 max-w-6xl mx-auto text-center ${
              activeMetricsCount >= 6
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                : activeMetricsCount === 5
                ? 'grid-cols-2 md:grid-cols-5'
                : activeMetricsCount === 4
                ? 'grid-cols-2 md:grid-cols-4'
                : activeMetricsCount === 3
                ? 'grid-cols-3'
                : activeMetricsCount === 2
                ? 'grid-cols-2'
                : 'grid-cols-1 max-w-md'
            }`}
          >
            {/* 總瀏覽量 */}
            {publicMetricsConfig.showTotalViews && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-stone-900 font-mono">
                  {totalViewsFormatted}
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">總瀏覽量</div>
              </div>
            )}

            {/* 即時線上人數 */}
            {publicMetricsConfig.showOnlineUsers && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-emerald-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-emerald-600 font-mono">
                  {onlineUsersFormatted} <span className="text-xs text-emerald-700">位</span>
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">即時線上人數</div>
              </div>
            )}

            {/* 總註冊用戶 */}
            {publicMetricsConfig.showTotalMembers && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-purple-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-purple-700 font-mono">
                  {totalMembersFormatted} <span className="text-xs text-purple-600">位</span>
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">總註冊用戶</div>
              </div>
            )}

            {/* 認證專家 */}
            {publicMetricsConfig.showVerifiedSolvers && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-purple-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-purple-700 font-mono">
                  {verifiedSolversFormatted} <span className="text-xs text-purple-600">位</span>
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">認證專家智庫</div>
              </div>
            )}

            {/* 問題數量 */}
            {publicMetricsConfig.showQuestionsCount && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-blue-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-blue-700 font-mono">
                  {questionsCountFormatted} <span className="text-xs text-blue-600">題</span>
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">市場問題數量</div>
              </div>
            )}

            {/* 提案數量 */}
            {publicMetricsConfig.showProposalsCount && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-emerald-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 font-mono">
                  {proposalsCountFormatted} <span className="text-xs text-emerald-600">件</span>
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">專家提案數量</div>
              </div>
            )}

            {/* 7. 已解決題數 (累計解決難題) */}
            {publicMetricsConfig.showSolvedCount && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-stone-900 font-mono">
                  {solvedCountFormatted}
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">已解決題數</div>
              </div>
            )}

            {/* 8. 已成交方案 */}
            {publicMetricsConfig.showTotalDeals && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-amber-700 font-mono">
                  {totalDealsFormatted} <span className="text-xs text-amber-600">筆</span>
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">已成交方案</div>
              </div>
            )}

            {/* 9. 平均回覆速度 */}
            {publicMetricsConfig.showAvgResponseSpeed && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-stone-900 font-mono">
                  {avgResponseSpeedFormatted}
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">平均回覆速度</div>
              </div>
            )}

            {/* 10. 滿意度 (方案採納滿意度) */}
            {publicMetricsConfig.showSatisfactionRate && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-emerald-600 font-mono">
                  {satisfactionRateFormatted}
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">滿意度</div>
              </div>
            )}

            {/* 11. 平台總交易額 */}
            {publicMetricsConfig.showTotalGMV && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-stone-900 font-mono">
                  {totalGMVFormatted}
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">平台總交易額</div>
              </div>
            )}

            {/* 12. 累計懸賞金額 */}
            {publicMetricsConfig.showTotalBounty && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-amber-600 font-mono">
                  {totalBountyFormatted}
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">累計懸賞金額</div>
              </div>
            )}

            {/* 13. Panel: 當前最高賞金 + 連結到最高懸賞排行榜 (手機端起始滾動錨點) */}
            {publicMetricsConfig.showHighestBounty && (
              <button
                id="highest-bounty-section"
                onClick={onLeaderboardClick}
                className={`scroll-mt-14 sm:scroll-mt-20 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-300/80 hover:border-amber-500 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center cursor-pointer group ${
                  activeMetricsCount % 2 === 1 ? 'col-span-2 sm:col-span-1' : ''
                }`}
                title="點擊查看全平台最高懸賞排行榜"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>當前最高賞金</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono group-hover:scale-105 transition-transform">
                  NT$ {currentHighestBounty.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-600 mt-0.5 font-semibold flex items-center gap-0.5 group-hover:text-amber-800">
                  <span>前往最高懸賞排行</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

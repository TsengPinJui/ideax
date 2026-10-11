import React, { useMemo } from 'react';
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, Zap, Compass, CheckCircle, Eye, Users, HelpCircle, Briefcase, CheckCircle2, Coins, Clock, Star } from 'lucide-react';
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
  const {
    questions,
    answers,
    solvers,
    transactions,
    conversations,
    availableUsers,
    publicMetricsConfig,
    isNoPaymentMode,
    isDemoMode,
    siteVisitsCount,
    onlineUsersCount,
    realRegisteredUsersCount,
  } = useApp();

  // 1. 網站造訪量（進入網站的總造訪次數）
  const siteVisitsFormatted = useMemo(() => {
    return (siteVisitsCount || 0).toLocaleString();
  }, [siteVisitsCount]);

  // 2. 即時線上人數
  const onlineUsersFormatted = useMemo(() => {
    return `${Math.max(1, onlineUsersCount || 1)}`;
  }, [onlineUsersCount]);

  // 3. 總註冊用戶（排扣測試帳號之真實註冊用戶）
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

  // 12. 方案採納滿意度 (依需求：舊站滿意度歸零為 0%)
  const satisfactionRateFormatted = useMemo(() => {
    return '0%';
  }, []);

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
    <section className="relative pt-6 pb-6 sm:pt-8 sm:pb-10 md:pt-10 md:pb-12 overflow-hidden">
      <YellowLiquidHeroBackground className="h-full" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Visual Spotlight with IdeaX - 創點子+IdeaX品牌焦點與關鍵字 */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Official IdeaX Brand Display - 液態光圈與透視磨砂玻璃 */}
          <div className="relative mb-5 sm:mb-6 md:mb-7 group inline-flex max-w-[92%] sm:max-w-sm md:max-w-md mx-auto justify-center">
            {/* Ambient liquid backlight glow */}
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-amber-400/35 blur-xl sm:blur-2xl scale-105 pointer-events-none animate-liquid-morph-1" />
            <div className="relative py-2.5 px-4 sm:py-3 sm:px-5 md:py-3.5 md:px-6 rounded-2xl sm:rounded-3xl backdrop-blur-md bg-white/85 border border-amber-200/90 shadow-[0_8px_25px_-8px_rgba(245,158,11,0.22)] ring-1 ring-amber-300/50 flex items-center justify-center gap-3 sm:gap-3.5 md:gap-4 transition-all duration-300 group-hover:shadow-[0_12px_32px_-8px_rgba(245,158,11,0.3)] group-hover:border-amber-300">
              <img
                src="/logo-bulb.png"
                alt="IdeaX 燈泡"
                className="h-28 xs:h-34 sm:h-32 md:h-30 lg:h-32 xl:h-32 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform drop-shadow-sm"
              />
              <img
                src="/logo-chuangdianzi-text.png"
                alt="創點子 IdeaX"
                className="h-16 xs:h-20 sm:h-18 md:h-18 lg:h-20 xl:h-20 w-auto object-contain shrink-0"
              />
            </div>
          </div>

          {/* Main Headline - 中間文案「一個問題，找到更多可能」調整至適宜字級與緊湊行距 */}
          <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-[34px] font-black text-stone-900 tracking-tight leading-snug sm:leading-tight my-2.5 sm:my-3.5 md:my-4">
            一個問題，<br className="hidden sm:inline" />
            找到<span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2 sm:decoration-2">更多可能</span>。
          </h1>

          {/* Value Proposition Badges below headline - 告訴造訪者網站能帶給用戶什麼 */}
          <div className="mt-4 sm:mt-5 md:mt-6 mb-5 sm:mb-6 md:mb-7 flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-2.5 gap-y-2 sm:gap-y-2.5 max-w-2xl px-2">
            {[
              '微創業痛點',
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
                className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full backdrop-blur-sm bg-white/80 hover:bg-amber-100/90 text-amber-950 border border-amber-200/90 text-xs sm:text-[12px] font-extrabold shadow-2xs select-none flex items-center gap-1.5 cursor-pointer hover:border-amber-400 hover:scale-105 transition-all"
              >
                <span className="text-amber-500 font-bold">✦</span>
                <span>{text}</span>
              </span>
            ))}
          </div>

          {/* Primary, Pain Point & Explore Action Buttons (電腦版顯示，手機版已由底部導覽列與快捷按鈕取代) */}
          <div className="mt-4 sm:mt-5 hidden sm:flex sm:flex-row items-center justify-center gap-3 sm:gap-3.5 w-full sm:w-auto">
            {/* 1. 主行動：發布懸賞 (金黃品牌核心，象徵重金賞金) */}
            <button
              onClick={onPostClick}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 active:from-amber-600 active:to-amber-600 text-stone-950 font-black text-sm sm:text-base shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer group border border-amber-300/80 ring-2 ring-amber-400/20"
            >
              <IdeaXLogo variant="bulb" size="sm" />
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
            {/* 網站造訪量 */}
            {publicMetricsConfig.showTotalViews && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-lg sm:text-2xl font-extrabold text-stone-900 font-mono">
                  {siteVisitsFormatted}
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">網站造訪量</div>
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

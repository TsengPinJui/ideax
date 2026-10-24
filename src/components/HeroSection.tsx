import React, { useEffect, useMemo, useState } from 'react';
import { isRealRegisteredUser } from '../data/mockData';
import { getCachedRealTrafficStats } from './AdminSiteTrafficChart';
import { ArrowRight, Sparkles, ShieldCheck, Compass, ChevronDown, ChevronUp, Gift } from 'lucide-react';
import { Category } from '../types';
import { IdeaXLogo } from './IdeaXLogo';
import { HelpTooltip } from './HelpTooltip';
import { useApp } from '../context/AppContext';
import { YellowLiquidHeroBackground } from './YellowLiquidHeroBackground';
import { HomeShowcasePlayer, useShowcaseSlides } from './HomeShowcasePlayer';

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
    homeShowcaseConfig,
    isNoPaymentMode,
    isDemoMode,
    isRaceMode,
    siteVisitsCount,
    uniqueVisitorsCount,
    onlineUsersCount,
    realRegisteredUsersCount,
    availableUsers,
    currentUser,
    openAuthModal,
  } = useApp();

  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
  // 首頁創點子播放區：管理員啟用且有可播放的內容時，取代創點子標誌
  const showcaseSlides = useShowcaseSlides();

  // 今日不重複訪客（瀏覽統計更新時跟著變）
  const utc8Today = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const [todayVisitors, setTodayVisitors] = useState(() => Number(getCachedRealTrafficStats().visitorsDaily?.[utc8Today()]) || 0);
  useEffect(() => {
    const on = () => setTodayVisitors(Number(getCachedRealTrafficStats().visitorsDaily?.[utc8Today()]) || 0);
    window.addEventListener('ideax_site_traffic_updated', on);
    return () => window.removeEventListener('ideax_site_traffic_updated', on);
  }, []);

  // 近 7 天新註冊會員（依註冊日期，不含測試帳號）
  const newMembers7d = useMemo(() => {
    if (!publicMetricsConfig.showNewMembers7d) return 0;
    const since = Date.now() - 7 * 86400000;
    return (availableUsers || []).filter((u) => {
      if (!isRealRegisteredUser(u)) return false;
      const t = Date.parse(String((u as any).registeredAt || u.createdAt || u.joinedDate || ''));
      return Number.isFinite(t) && t >= since;
    }).length;
  }, [availableUsers, publicMetricsConfig.showNewMembers7d]);

  // 匯職缺使用人次：開關打開時才去拿（伺服器只回傳累計數字）
  const [jobsUsers, setJobsUsers] = useState(0);
  useEffect(() => {
    if (!publicMetricsConfig.showJobsUsers) return;
    let alive = true;
    fetch('/api/feature-usage/totals')
      .then((r) => r.json())
      .then((j) => { if (alive) setJobsUsers(Number(j?.totals?.jobs) || 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, [publicMetricsConfig.showJobsUsers]);

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
    if (isRaceMode || isNoPaymentMode || !isDemoMode) return 0;
    if (!questions || questions.length === 0) return 0;
    return Math.max(...questions.map((q) => Number(q.bounty) || 0), 0);
  }, [questions, isNoPaymentMode, isDemoMode, isRaceMode]);

  const allMetricItems = useMemo(() => {
    const list: { key: string; label: string; value: string; unit?: string; accent?: string }[] = [];
    // 競賽模式下暫先隱藏首頁數據
    if (isRaceMode) return list;
    // 統一開關關閉：首頁不顯示任何公開數據
    if (publicMetricsConfig.showPublicMetrics === false) return list;
    if (publicMetricsConfig.showQuestionsCount) list.push({ key: 'questions', label: '發布卡片', value: questionsCountFormatted, unit: '張' });
    if (publicMetricsConfig.showProposalsCount) list.push({ key: 'proposals', label: '提案總數', value: proposalsCountFormatted, unit: '件' });
    if (publicMetricsConfig.showVerifiedSolvers) list.push({ key: 'solvers', label: '認證專家', value: verifiedSolversFormatted, unit: '位' });
    if (publicMetricsConfig.showSolvedCount) list.push({ key: 'solved', label: '已解決', value: solvedCountFormatted });
    if (publicMetricsConfig.showTotalBounty) list.push({ key: 'bounty', label: '累計懸賞', value: totalBountyFormatted, accent: 'text-amber-600' });
    if (publicMetricsConfig.showTotalViews) list.push({ key: 'views', label: '總瀏覽', value: siteVisitsFormatted });
    if (publicMetricsConfig.showUniqueVisitors && (uniqueVisitorsCount || 0) > 0) list.push({ key: 'visitors', label: '不重複訪客', value: (uniqueVisitorsCount || 0).toLocaleString(), unit: '位' });
    if (publicMetricsConfig.showTodayVisitors) list.push({ key: 'today_visitors', label: '今日訪客', value: todayVisitors.toLocaleString(), unit: '位' });
    if (publicMetricsConfig.showNewMembers7d) list.push({ key: 'new_members', label: '本週新會員', value: newMembers7d.toLocaleString(), unit: '位', accent: 'text-purple-600' });
    if (publicMetricsConfig.showJobsUsers) list.push({ key: 'jobs_users', label: '匯職缺使用', value: jobsUsers.toLocaleString(), unit: '人次' });
    if (publicMetricsConfig.showOnlineUsers) list.push({ key: 'online', label: '線上人數', value: onlineUsersFormatted, unit: '位', accent: 'text-emerald-600' });
    if (publicMetricsConfig.showTotalMembers) list.push({ key: 'members', label: '註冊會員', value: totalMembersFormatted, unit: '位' });
    if (publicMetricsConfig.showTotalDeals) list.push({ key: 'deals', label: '已成交', value: totalDealsFormatted, unit: '筆' });
    if (publicMetricsConfig.showAvgResponseSpeed) list.push({ key: 'speed', label: '平均回覆', value: avgResponseSpeedFormatted });
    if (publicMetricsConfig.showSatisfactionRate) list.push({ key: 'satisfaction', label: '滿意度', value: satisfactionRateFormatted });
    if (publicMetricsConfig.showTotalGMV) list.push({ key: 'gmv', label: '總交易額', value: totalGMVFormatted });
    // 數據還是 0 時不顯示，避免新訪客看到「已解決 0、滿意度 0%」而覺得沒人在用；
    // 尚無成交時，「平均回覆」與「滿意度」也沒有參考意義，一併隱藏
    const isZeroLike = (v: string) => /^(NT\$\s*)?[0０]+(\.0+)?\s*(%|萬)?$/.test(String(v).trim()) || String(v).trim() === '-';
    const noSolvedYet = isZeroLike(solvedCountFormatted);
    return list.filter((m) => !isZeroLike(m.value) && !(noSolvedYet && (m.key === 'speed' || m.key === 'satisfaction')));
  }, [
    todayVisitors,
    newMembers7d,
    jobsUsers,
    publicMetricsConfig,
    questionsCountFormatted,
    proposalsCountFormatted,
    verifiedSolversFormatted,
    solvedCountFormatted,
    totalBountyFormatted,
    siteVisitsFormatted,
    uniqueVisitorsCount,
    onlineUsersFormatted,
    totalMembersFormatted,
    totalDealsFormatted,
    avgResponseSpeedFormatted,
    satisfactionRateFormatted,
    totalGMVFormatted,
    isRaceMode,
  ]);

  const visibleMetrics = isMetricsExpanded ? allMetricItems : allMetricItems.slice(0, 4);

  return (
    <section className="relative pt-3 pb-1.5 sm:pt-6 sm:pb-2.5 lg:pt-7 lg:pb-3 overflow-hidden">
      <YellowLiquidHeroBackground className="h-full" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl lg:max-w-5xl mx-auto">
          {/* 首頁創點子播放區：管理員在儀表板啟用並勾選「優秀作品／付費推播／自選」（homeShowcaseConfig，可複選）後輪流播放；
              沒有啟用或沒有可播放的內容時，顯示創點子標誌 */}
          {showcaseSlides.length > 0 ? (
            <div data-home-showcase-slot={homeShowcaseConfig.modes.join(',')} className="relative mb-2 sm:mb-4 w-full max-w-[94%] sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto">
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-amber-400/25 blur-xl scale-105 pointer-events-none" />
              <HomeShowcasePlayer slides={showcaseSlides} />
            </div>
          ) : (
            <div data-home-showcase-slot={homeShowcaseConfig.enabled ? homeShowcaseConfig.modes.join(',') || 'none' : 'off'} className="relative mb-2 sm:mb-4 group inline-flex max-w-[90%] sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto justify-center">
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-amber-400/25 blur-xl scale-105 pointer-events-none" />
              <div className="relative py-2 px-4 sm:py-3.5 sm:px-6 md:py-4 md:px-8 lg:py-5 lg:px-10 rounded-2xl sm:rounded-3xl backdrop-blur-md bg-white/85 border border-amber-200/70 shadow-sm flex items-center justify-center gap-2.5 sm:gap-4 md:gap-5 transition-all duration-300">
                <img
                  src="/logo-bulb.png"
                  alt="IdeaX 燈泡"
                  className="h-16 sm:h-24 md:h-32 lg:h-36 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
                />
                <img
                  src="/logo-chuangdianzi-text.png"
                  alt="創點子 IdeaX"
                  className="h-11 sm:h-16 md:h-[88px] lg:h-[104px] w-auto object-contain shrink-0"
                />
              </div>
            </div>
          )}

          {/* Main Headline（管理員可隱藏：隱藏時只是畫面上看不到，搜尋引擎與讀屏仍讀得到） */}
          <h1 className={homeShowcaseConfig.hideHeroTitles ? 'sr-only' : 'text-xl sm:text-3xl md:text-4xl lg:text-[42px] font-black text-stone-900 tracking-tight leading-snug my-1 sm:my-2'}>
            一個問題，找到<span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2">更多可能</span>。
          </h1>

          {/* Subtitle */}
          {!homeShowcaseConfig.hideHeroTitles && (
            <div className="mt-0.5 sm:mt-1 flex items-center justify-center gap-1.5 text-xs sm:text-base md:text-lg text-stone-600 font-semibold flex-wrap">
              <span>痛點許願 · 創新提案 · 專家懸賞</span>
              <span className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                持續上新中~
              </span>
            </div>
          )}
          {!isRealRegisteredUser(currentUser) && (
            <div className="mt-3 sm:mt-4 w-full max-w-xl rounded-2xl border border-amber-300/90 bg-white/90 p-3 sm:p-4 shadow-md shadow-amber-100/60 backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-4">
                <div className="flex items-center gap-2 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Gift className="h-5 w-5" /></span>
                  <div>
                    <p className="text-sm sm:text-base font-black text-stone-900">新用戶註冊即贈 <span className="text-amber-700">100 平台點</span></p>
                    <p className="text-[10px] sm:text-xs text-stone-500">分享推薦碼 +100 點/人 · 發文再享 +100~300 點</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openAuthModal('register', 'email')}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-amber-600 active:scale-[0.98]"
                >
                  免費註冊領取 <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clean Collapsible Metrics Bar (精簡橫條 + 可展開完整指標) */}
        {!isRaceMode && (allMetricItems.length > 0 || (publicMetricsConfig.showPublicMetrics !== false && publicMetricsConfig.showHighestBounty && currentHighestBounty > 0)) && (
          <div className="mt-2.5 sm:mt-3.5 pt-2 sm:pt-3 border-t border-stone-200/60 max-w-5xl lg:max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 lg:gap-x-10 gap-y-2 text-center">
              {visibleMetrics.map((m) => (
                <div key={m.key} className="flex items-baseline gap-1.5">
                  <span className="text-[11px] sm:text-xs md:text-sm text-stone-500 font-medium">{m.label}</span>
                  <span className={`text-sm sm:text-base md:text-lg lg:text-xl font-black font-mono ${m.accent || 'text-stone-900'}`}>
                    {m.value}
                  </span>
                  {m.unit && <span className="text-[10px] sm:text-xs text-stone-400">{m.unit}</span>}
                </div>
              ))}

              {/* 當前最高賞金快捷膠囊 */}
              {publicMetricsConfig.showPublicMetrics !== false && publicMetricsConfig.showHighestBounty && currentHighestBounty > 0 && (
                <button
                  id="highest-bounty-section"
                  onClick={onLeaderboardClick}
                  className="scroll-mt-14 sm:scroll-mt-20 inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-amber-50/90 hover:bg-amber-100/90 border border-amber-200/80 transition-all cursor-pointer group"
                  title="點擊按最高懸賞排序"
                >
                  <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-600" />
                  <span className="text-[11px] sm:text-xs md:text-sm font-bold text-stone-600">最高懸賞</span>
                  <span className="text-xs sm:text-sm md:text-base font-black text-amber-600 font-mono">
                    NT$ {currentHighestBounty.toLocaleString()}
                  </span>
                  <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {allMetricItems.length > 4 && (
                <button
                  type="button"
                  onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
                  className="inline-flex items-center gap-0.5 text-[11px] sm:text-xs md:text-sm font-semibold text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                >
                  <span>{isMetricsExpanded ? '收合數據' : `更多數據 (${allMetricItems.length})`}</span>
                  {isMetricsExpanded ? <ChevronUp className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <ChevronDown className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

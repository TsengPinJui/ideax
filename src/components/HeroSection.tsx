import React, { useEffect, useMemo, useState } from 'react';
import { isRealRegisteredUser } from '../data/mockData';
import { getCachedRealTrafficStats } from './AdminSiteTrafficChart';
import { ArrowRight, Sparkles, ShieldCheck, Compass, ChevronDown, ChevronUp, Gift, Trophy, Flame, Dices, Lightbulb, Gamepad2 } from 'lucide-react';
import { Category, HomeShowcaseCategory, Question } from '../types';
import { IdeaXLogo } from './IdeaXLogo';
import { HelpTooltip } from './HelpTooltip';
import { useApp } from '../context/AppContext';
import { YellowLiquidHeroBackground } from './YellowLiquidHeroBackground';
import { HomeShowcasePlayer, useShowcaseSlides } from './HomeShowcasePlayer';
import { FeaturedGamesBoard, HotGamesRankingBoard } from './HomeHeroSideBoards';
import { RandomGameDrawModal } from './RandomGameDrawModal';
import { OPEN_QUESTION_EVENT } from './mascot/mascotConfig';
import { isShowcaseGameQuestion } from '../data/hotGamesData';

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
  onOpenAppEmbed?: (app: Question) => void;
  highestBountyQuestion?: { id: string; title: string; bounty: number; level: string };
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onPostClick,
  onFindExpertsClick,
  onExploreClick,
  onLeaderboardClick,
  onOpenAppEmbed,
}) => {
  const [mobileGameTab, setMobileGameTab] = useState<'featured' | 'hot'>('featured');
  const [isRandomDrawOpen, setIsRandomDrawOpen] = useState(false);
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
  const [showcaseCategory, setShowcaseCategory] = useState<HomeShowcaseCategory>(() =>
    homeShowcaseConfig.defaultCategory === 'proposals_software' ? 'proposals_software' : 'games'
  );
  useEffect(() => {
    setShowcaseCategory(homeShowcaseConfig.defaultCategory === 'proposals_software' ? 'proposals_software' : 'games');
  }, [homeShowcaseConfig.defaultCategory]);

  // 首頁創點子播放區：管理員啟用且有可播放的內容時，依當前選擇分類（「提案與軟體」或「遊戲」）播放
  const showcaseSlides = useShowcaseSlides(showcaseCategory);

  // 今日不重複訪客（瀏覽統計更新時跟著變）
  const utc8Today = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const [todayVisitors, setTodayVisitors] = useState(() => Number(getCachedRealTrafficStats().visitorsDaily?.[utc8Today()]) || 0);
  useEffect(() => {
    const on = () => setTodayVisitors(Number(getCachedRealTrafficStats().visitorsDaily?.[utc8Today()]) || 0);
    window.addEventListener('ideax_site_traffic_updated', on);
    return () => window.removeEventListener('ideax_site_traffic_updated', on);
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsRandomDrawOpen(true);
    window.addEventListener('IDEAX_OPEN_RANDOM_GAME_DRAW', handleOpen);
    return () => window.removeEventListener('IDEAX_OPEN_RANDOM_GAME_DRAW', handleOpen);
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

  const handleGameClick = (item: Question) => {
    // 非遊戲作品（創新提案、軟體網站等）優先進入詳細內容頁，遊戲優先全螢幕瀏覽
    if (!isShowcaseGameQuestion(item)) {
      try {
        window.dispatchEvent(new CustomEvent(OPEN_QUESTION_EVENT, { detail: { id: item.id } }));
      } catch {}
      return;
    }
    if (onOpenAppEmbed) {
      onOpenAppEmbed(item);
    } else {
      try {
        window.dispatchEvent(new CustomEvent('IDEAX_OPEN_APP_EMBED', { detail: { app: item } }));
      } catch {}
    }
  };

  const hotMode =
    showcaseCategory === 'proposals_software'
      ? homeShowcaseConfig.hotProposalsMode || 'custom'
      : homeShowcaseConfig.hotGamesMode || 'custom';
  const hotCustomIds =
    showcaseCategory === 'proposals_software'
      ? homeShowcaseConfig.hotProposalIds || []
      : homeShowcaseConfig.hotGameIds || [];

  return (
    <section className="relative pt-3 pb-1.5 sm:pt-6 sm:pb-2.5 lg:pt-7 lg:pb-3 overflow-hidden">
      <YellowLiquidHeroBackground className="h-full" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-7xl mx-auto">
          {/* 首頁輪播與熱度榜分類切換：「創新與軟體」 vs 「遊戲」 */}
          <div className="w-full flex flex-col items-center mb-2 sm:mb-2.5">
            <div
              role="tablist"
              aria-label="首頁輪播與熱度榜分類切換"
              className="inline-flex items-center p-1 rounded-2xl bg-white/85 backdrop-blur-md border border-amber-200/90 shadow-xs gap-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={showcaseCategory === 'proposals_software'}
                onClick={() => setShowcaseCategory('proposals_software')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  showcaseCategory === 'proposals_software'
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-amber-50/70'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                <span>創新與軟體</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={showcaseCategory === 'games'}
                onClick={() => setShowcaseCategory('games')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  showcaseCategory === 'games'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-amber-50/70'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                <span>遊戲</span>
              </button>
            </div>
          </div>

          {/* 首頁三大展示核心：左側「精選 TOP 10」、中間「首頁輪播展示」、右側「熱度榜 TOP 10」 */}
          <div className="w-full mb-3 sm:mb-4">
            <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-2.5 lg:gap-3 xl:gap-4 w-full">
              {/* 左邊：精選榜（依當前分類顯示「精選提案軟體」或「精選遊戲」） */}
              <div className="hidden lg:block w-[130px] xl:w-[145px] shrink-0 h-[380px] text-left">
                <FeaturedGamesBoard
                  questions={questions}
                  carouselQuestions={showcaseSlides.map((s) => s.q)}
                  onSelectGame={handleGameClick}
                  category={showcaseCategory}
                />
              </div>

              {/* 中間：首頁創點子播放區（手機版隱藏，電腦版保留展示） */}
              <div className="hidden lg:flex flex-1 w-full max-w-[94%] sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto flex-col justify-center">
                <p className="mb-2.5 px-2 text-center text-xs sm:text-sm font-black tracking-tight text-amber-900/90">
                  沒上榜？別氣餒 ✨ IdeaX 收錄的都是百里挑一的佳作，加油！💪
                </p>
                {showcaseSlides.length > 0 ? (
                  <div data-home-showcase-slot={`${showcaseCategory}:${homeShowcaseConfig.modes.join(',')}`} className="relative w-full">
                    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-amber-400/25 blur-xl scale-105 pointer-events-none" />
                    <HomeShowcasePlayer slides={showcaseSlides} onSelectSlide={handleGameClick} />
                  </div>
                ) : (
                  <div data-home-showcase-slot={homeShowcaseConfig.enabled ? homeShowcaseConfig.modes.join(',') || 'none' : 'off'} className="relative group inline-flex w-full justify-center">
                    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-amber-400/25 blur-xl scale-105 pointer-events-none" />
                    <div className="relative w-full py-4 px-6 md:py-6 md:px-8 rounded-2xl sm:rounded-3xl backdrop-blur-md bg-white/85 border border-amber-200/70 shadow-sm flex items-center justify-center gap-4 transition-all duration-300">
                      <img
                        src="/logo-bulb.png"
                        alt="IdeaX 燈泡"
                        className="h-20 sm:h-28 md:h-32 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <img
                        src="/logo-chuangdianzi-text.png"
                        alt="創點子 IdeaX"
                        className="h-14 sm:h-20 md:h-24 w-auto object-contain shrink-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 右邊：熱度榜（依當前分類顯示「創新與軟體」或「遊戲」熱度榜） */}
              <div className="hidden lg:block w-[130px] xl:w-[145px] shrink-0 h-[380px] text-left">
                <HotGamesRankingBoard
                  questions={questions}
                  onSelectGame={handleGameClick}
                  mode={hotMode}
                  customIds={hotCustomIds}
                  category={showcaseCategory}
                />
              </div>
            </div>

            {/* 行動裝置 / 平板 (lg:hidden)：輪播 + Tab 切換瀏覽精選榜與熱度榜 */}
            <div className="lg:hidden w-full max-w-[300px] mx-auto mt-1 sm:mt-2 space-y-2.5">
              {showcaseSlides.length > 0 && (
                <div className="w-full">
                  <HomeShowcasePlayer slides={showcaseSlides} onSelectSlide={handleGameClick} />
                </div>
              )}
              <div className="flex items-center justify-center p-1 rounded-2xl bg-amber-100/70 max-w-xs mx-auto mb-2 text-xs font-black shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMobileGameTab('featured')}
                  className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mobileGameTab === 'featured'
                      ? 'bg-white text-amber-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span>{showcaseCategory === 'proposals_software' ? '精選提案軟體' : '精選遊戲'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileGameTab('hot')}
                  className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mobileGameTab === 'hot'
                      ? 'bg-white text-rose-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                  <span>熱度榜</span>
                </button>
              </div>

              {mobileGameTab === 'featured' ? (
                <FeaturedGamesBoard
                  questions={questions}
                  carouselQuestions={showcaseSlides.map((s) => s.q)}
                  onSelectGame={handleGameClick}
                  category={showcaseCategory}
                />
              ) : (
                <HotGamesRankingBoard
                  questions={questions}
                  onSelectGame={handleGameClick}
                  mode={hotMode}
                  customIds={hotCustomIds}
                  category={showcaseCategory}
                />
              )}
            </div>
          </div>

          {/* 首頁隨機看3個提案 / 隨機抽 3 款遊戲按鈕（桌面與手機通用核心展示） */}
          <div className="my-2 sm:my-3 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsRandomDrawOpen(true)}
              className={`group relative inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer border ${
                showcaseCategory === 'proposals_software'
                  ? 'bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600 hover:from-sky-600 hover:to-indigo-600 shadow-sky-200/70 hover:shadow-sky-300/80 border-sky-300/50'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 shadow-amber-200/70 hover:shadow-amber-300/80 border-amber-300/50'
              }`}
              title={
                showcaseCategory === 'proposals_software'
                  ? '隨機抽取 3 個創新與軟體，立即探索靈感！'
                  : '想不到玩什麼？隨機抽取 3 款遊戲，立即線上試玩！'
              }
            >
              <span className="p-1 rounded-full bg-white/20 group-hover:rotate-180 transition-transform duration-500 shrink-0">
                <Dices className="w-4 h-4 text-white" />
              </span>
              <span>{showcaseCategory === 'proposals_software' ? '隨機看3個提案' : '隨機抽 3 款遊戲'}</span>
              <span
                className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-black/20 flex items-center gap-0.5 ${
                  showcaseCategory === 'proposals_software' ? 'text-sky-100' : 'text-amber-100'
                }`}
              >
                <Sparkles
                  className={`w-3 h-3 ${
                    showcaseCategory === 'proposals_software' ? 'text-sky-200' : 'text-amber-200'
                  }`}
                />
                {showcaseCategory === 'proposals_software' ? '探索創新靈感' : '想不到玩什麼？'}
              </span>
            </button>
          </div>

          {/* Main Headline（管理員可隱藏：隱藏時只是畫面上看不到，搜尋引擎與讀屏仍讀得到） */}
          <h1 className={homeShowcaseConfig.hideHeroTitles ? 'sr-only' : 'text-xl sm:text-3xl md:text-4xl lg:text-[42px] font-black text-stone-900 tracking-tight leading-snug my-1 sm:my-2'}>
            一個問題，找到<span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2">更多可能</span>。
          </h1>

          {/* Subtitle */}
          {!homeShowcaseConfig.hideHeroTitles && (
            <div className="mt-0.5 sm:mt-1 flex items-center justify-center gap-1.5 text-xs sm:text-base md:text-lg text-stone-600 font-semibold flex-wrap">
              <span>痛點許願 · 創新提案 · 專家懸賞</span>
              <span className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                持續收錄全球各地優秀作品~ (以中文地區為主)
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-800 tracking-tight">
                <span>【平台嚴選】</span><strong>皆經過人工篩查，可安心遊玩</strong>
              </span>
            </div>
          )}
          {!isRealRegisteredUser(currentUser) && (
            <div className="mt-3 sm:mt-4 w-full max-w-xl rounded-2xl border border-amber-300/90 bg-white/90 p-3 sm:p-4 shadow-md shadow-amber-100/60 backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-4">
                <div className="flex items-center gap-2 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Gift className="h-5 w-5" /></span>
                  <div>
                    <div className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-1.5">
                      <span>新用戶註冊即贈 <span className="text-amber-700">100 平台點</span></span>
                      <HelpTooltip
                        title="平台點數與賞金說明"
                        content={
                          <div className="space-y-1.5 text-left">
                            <p className="text-stone-700 font-medium">
                              點數可於平台懸賞與使用付費功能或用於未來兌換合作商服務
                            </p>
                            <p className="text-amber-800 font-bold bg-amber-50/90 p-1.5 rounded-lg border border-amber-200/80 text-[11px]">
                              註：答題獲得的賞金、提出痛點獲得的打賞，可於未來兌換現金
                            </p>
                          </div>
                        }
                      />
                    </div>
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

      {/* 隨機看3個提案 / 隨機抽 3 款遊戲彈窗 */}
      <RandomGameDrawModal
        isOpen={isRandomDrawOpen}
        onClose={() => setIsRandomDrawOpen(false)}
        questions={questions}
        onSelectGame={handleGameClick}
        category={showcaseCategory}
      />
    </section>
  );
};

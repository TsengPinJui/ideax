import React, { useMemo } from 'react';
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, Zap, Compass, CheckCircle } from 'lucide-react';
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
  const { questions, answers, solvers, transactions, publicMetricsConfig, isNoPaymentMode, isDemoMode } = useApp();

  // 1. 累計解決難題 (依據真實狀況：全站標記已結案或已有被採納方案之問題總數)
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

  // 2. 累計懸賞金額 (正式模式與無金流模式歸零；測試環境依據發出之懸賞與成交方案計算)
  const totalBountyFormatted = useMemo(() => {
    if (isNoPaymentMode || !isDemoMode) {
      return 'NT$ 0';
    }
    // 測試環境 (isDemoMode) 下計算
    // 1. 網站發出的所有問題懸賞總額
    const questionBounties = questions.reduce((acc, q) => acc + (Number(q.bounty) || 0), 0);

    // 2. 網站已完成交易方案的懸賞/成交總額（排除會員訂閱與點數儲值等純儲值流水）
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

  // 3. 平均回覆速度 (依據真實狀況：各問題發布時間至第一筆回覆方案之真實平均時間差)
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

  // 4. 方案採納滿意度 (依據真實狀況：全站解答專家與方案真實綜合星級換算)
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

  // 5. 當前全站最高懸賞題目金額 (即時從真實問題列表抓取最高值，正式模式與無金流模式歸零)
  const currentHighestBounty = useMemo(() => {
    if (isNoPaymentMode || !isDemoMode) return 0;
    if (!questions || questions.length === 0) return 0;
    return Math.max(...questions.map((q) => Number(q.bounty) || 0), 0);
  }, [questions, isNoPaymentMode, isDemoMode]);

  // 計算目前管理者開啟公開展示的指標數量
  const activeMetricsCount = useMemo(() => {
    let count = 0;
    if (publicMetricsConfig.showSolvedCount) count++;
    if (publicMetricsConfig.showTotalBounty) count++;
    if (publicMetricsConfig.showAvgResponseSpeed) count++;
    if (publicMetricsConfig.showSatisfactionRate) count++;
    if (publicMetricsConfig.showHighestBounty) count++;
    return count;
  }, [publicMetricsConfig]);
  return (
    <section className="relative overflow-hidden bg-white border-b border-stone-200 pt-8 pb-12 sm:pt-12 sm:pb-16">
      {/* Radiant ambient glow matching the IdeaX yellow/gold brand aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-200/35 via-yellow-100/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-28 right-10 w-80 h-80 bg-amber-100/30 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Visual Spotlight with IdeaX - 中上大板塊放創點子+IdeaX */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Official IdeaX Brand Display */}
          <div className="relative mb-6 group max-w-lg w-full px-4">
            {/* Ambient backlight ring */}
            <div className="absolute inset-0 rounded-2xl bg-amber-300/25 blur-xl scale-100 pointer-events-none animate-pulse" />
            <div className="relative py-4 px-6 sm:py-5 sm:px-8 rounded-2xl bg-gradient-to-b from-amber-50/70 via-white/95 to-white/95 border border-amber-200/60 shadow-xs flex items-center justify-center">
              <IdeaXLogo variant="chuangdianzi" size="lg" />
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-[1.18] mt-2">
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
              <IdeaXLogo variant="mark" size="xs" />
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

        {/* Real Metrics Banner (管理者自訂公開展示之全站即時數據) */}
        {activeMetricsCount > 0 && (
          <div className={`mt-8 sm:mt-10 pt-4 sm:pt-6 border-t border-stone-200/90 grid gap-2.5 sm:gap-3 max-w-5xl mx-auto text-center ${
            activeMetricsCount === 5 
              ? 'grid-cols-2 md:grid-cols-5' 
              : activeMetricsCount === 4 
              ? 'grid-cols-2 md:grid-cols-4' 
              : activeMetricsCount === 3 
              ? 'grid-cols-3' 
              : activeMetricsCount === 2 
              ? 'grid-cols-2' 
              : 'grid-cols-1 max-w-md'
          }`}>
            {publicMetricsConfig.showSolvedCount && (
              <div className="p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-xl sm:text-2xl font-extrabold text-stone-900 font-mono">
                  {solvedCountFormatted}
                </div>
                <div className="text-xs text-stone-500 mt-1 font-medium">累計解決難題</div>
              </div>
            )}

            {publicMetricsConfig.showTotalBounty && (
              <div className="p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono">
                  {totalBountyFormatted}
                </div>
                <div className="text-xs text-stone-500 mt-1 font-medium">累計懸賞金額</div>
              </div>
            )}

            {publicMetricsConfig.showAvgResponseSpeed && (
              <div className="p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-xl sm:text-2xl font-extrabold text-stone-900 font-mono">
                  {avgResponseSpeedFormatted}
                </div>
                <div className="text-xs text-stone-500 mt-1 font-medium">平均回覆速度</div>
              </div>
            )}

            {publicMetricsConfig.showSatisfactionRate && (
              <div className="p-3 rounded-2xl bg-stone-50/50 border border-stone-100 hover:border-amber-200 transition-colors">
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">
                  {satisfactionRateFormatted}
                </div>
                <div className="text-xs text-stone-500 mt-1 font-medium">方案採納滿意度</div>
              </div>
            )}

            {/* Panel: 當前最高賞金 + 連結到最高懸賞排行榜 */}
            {publicMetricsConfig.showHighestBounty && (
              <button
                onClick={onLeaderboardClick}
                className={`p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-300/80 hover:border-amber-500 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center cursor-pointer group ${
                  activeMetricsCount === 5 ? 'col-span-2 md:col-span-1' : ''
                }`}
                title="點擊查看全平台最高懸賞排行榜"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>當前最高賞金</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono group-hover:scale-105 transition-transform">
                  NT$ {currentHighestBounty.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-600 mt-1 font-semibold flex items-center gap-0.5 group-hover:text-amber-800">
                  <span>前往最高懸賞排行</span>
                  <ArrowRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )}
          </div>
        )}

        {/* 3 Core Value Pillars (分級提問 ~ 自動拆款) */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5 max-w-4xl mx-auto">
          <div className="p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/90 flex items-center justify-between gap-3 hover:border-amber-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
                <Zap className="w-4 h-4 text-amber-700" />
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm text-stone-900">分級提問 (L0 ~ L4)</h3>
            </div>
            <HelpTooltip
              title="分級提問機制說明"
              content="自由設定免費交流或 100 ~ 100,000 點自訂懸賞，吸引具備實戰背景的產業老手為你解題。"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/90 flex items-center justify-between gap-3 hover:border-amber-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
                <Sparkles className="w-4 h-4 text-amber-700" />
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm text-stone-900">AI 智能分析媒合</h3>
            </div>
            <HelpTooltip
              title="AI 智能媒合說明"
              content="自動結構化萃取核心痛點與解題維度，即時精準推薦 3 ~ 5 位適配的認證解答專家。"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/90 flex items-center justify-between gap-3 hover:border-amber-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm text-stone-900">痛點免費＋自動拆款</h3>
            </div>
            <HelpTooltip
              title="交易託管安全說明"
              content="痛點 0 元提出＋深度方案自訂解鎖；買賣雙方由第三方支付託管，平台確認後自動拆款撥付至專家帳戶。"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

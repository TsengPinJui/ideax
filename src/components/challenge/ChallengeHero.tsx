import React from 'react';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Users,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Coins,
  Send,
  HelpCircle,
  Zap,
  Info,
} from 'lucide-react';
import { CHALLENGE_CONSTANTS } from '../../data/challengeData';
import { ChallengeProposal } from '../../types/challengeTypes';
import { formatPointAmount } from '../../services/challengeService';

interface ChallengeHeroProps {
  onOpenSubmit: () => void;
  onExploreProposals: () => void;
  onOpenAmbassador: () => void;
  proposals: ChallengeProposal[];
}

export const ChallengeHero: React.FC<ChallengeHeroProps> = ({
  onOpenSubmit,
  onExploreProposals,
  onOpenAmbassador,
  proposals,
}) => {
  const approvedProposals = proposals.filter((p) => p.status === 'approved');
  const totalFundingRaised = proposals.reduce((acc, p) => acc + (p.fundingRaised || 0), 0);
  const totalLikes = proposals.reduce((acc, p) => acc + (p.likes || 0), 0);
  const hasDemoData = proposals.some((p) => p.isDemo);

  return (
    <div className="relative bg-gradient-to-b from-white via-stone-50/50 to-white text-stone-900 overflow-hidden border-b border-stone-200">
      {/* Background Subtle Tech Blueprint & Glow Accents */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-amber-400/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-48 right-10 w-[350px] h-[350px] bg-emerald-400/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10 space-y-6">
        {/* Main Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          {/* Green Badge for Challenge & Demo Notice */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>【11月限定】IdeaX 創新挑戰季 • 盛大開跑</span>
            </div>

            {hasDemoData && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold shadow-2xs">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>展示範例／非實際賽事資料</span>
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight sm:leading-tight text-stone-950">
            <span className="block">你的 Idea，</span>
            <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 bg-clip-text text-transparent">
              值得被世界看見
            </span>
          </h1>

          <p className="text-stone-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            {CHALLENGE_CONSTANTS.HERO_SUBTITLE}
            <span className="block text-amber-700 font-bold mt-1 text-xs sm:text-sm">
              提出你的創新想法，讓市場與專業者共同驗證。
            </span>
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={onOpenSubmit}
              className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-sm sm:text-base shadow-sm shadow-amber-400/25 flex items-center gap-2 cursor-pointer transition-all group shrink-0"
            >
              <Send className="w-4 h-4 text-stone-950 group-hover:translate-x-0.5 transition-transform" />
              <span>我要投稿</span>
              <ArrowRight className="w-4 h-4 text-stone-950" />
            </button>

            <button
              type="button"
              onClick={onExploreProposals}
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-bold text-sm sm:text-base transition-all active:scale-95 cursor-pointer flex items-center gap-2 shadow-2xs shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>探索 Idea 提案</span>
            </button>

            <button
              type="button"
              onClick={onOpenAmbassador}
              className="px-5 py-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center gap-2 shadow-2xs shrink-0"
              title="校園大使每推薦一件審核通過的提案，可得 $800 推廣費"
            >
              <Users className="w-4 h-4 text-emerald-700" />
              <span>校園大使推廣 ($800/過審)</span>
            </button>
          </div>
        </div>

        {/* Real-time Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5 pt-4">
          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
              <span>參賽創新提案</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-stone-950 font-mono">
                {approvedProposals.length}
              </span>
              <span className="text-xs text-stone-500 ml-1">
                {hasDemoData ? '件 (展示範例)' : '件通過審核'}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
              <span>全網虛擬支持金池</span>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                {formatPointAmount(totalFundingRaised)}
              </span>
              <span className="text-[11px] text-stone-500 ml-1 block font-medium">
                {hasDemoData ? '展示範例投資額' : '全民與專家驗證池'}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
              <span>社群支持熱度</span>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
                {totalLikes.toLocaleString()}
              </span>
              <span className="text-xs text-stone-500 ml-1">
                {hasDemoData ? '次 (展示範例)' : '次心意收藏'}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
              <span>大會官方認證</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                官方證明
              </span>
              <span className="text-[11px] text-stone-500 ml-1 block font-medium">
                經審查確認後依規章頒發
              </span>
            </div>
          </div>
        </div>

        {/* 3-Step Process: 提出 Idea ↓ 虛擬募資驗證、專家評估 ↓ 優秀提案獲得獎勵 */}
        <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-2xs">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-black text-amber-700 uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              CONTEST PROCESS
            </span>
            <h3 className="text-lg sm:text-2xl font-black text-stone-900 mt-2">
              什麼是 IdeaX 創新挑戰季？
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              簡單 3 步驟，讓你的創新創業想法接受真實市場檢驗並獲得破局資源
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200 flex flex-col gap-3 hover:border-amber-400 hover:bg-amber-50/20 transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center font-black text-sm">
                1
              </div>
              <h4 className="font-black text-base text-stone-900">提出創新 Idea</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                填寫結構化痛點與解決方案，通過管理員審核即可於競賽專區公開展示，並獲得專屬綠色「創新季」標籤。
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200 flex flex-col gap-3 hover:border-amber-400 hover:bg-amber-50/20 transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center font-black text-sm">
                2
              </div>
              <h4 className="font-black text-base text-stone-900">虛擬募資驗證 & 專家評估</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                1 點 = NT$1（與主站金流隔離）。一般用戶初始 100,000 點（每案上限 5 萬）；提案帳號初始 100,000 點（每案上限 3 萬）；專家帳號初始 3,000,000 點（每案上限 200 萬）。不可購買、兌現、轉帳或投自己。
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200 flex flex-col gap-3 hover:border-amber-400 hover:bg-amber-50/20 transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center font-black text-sm">
                3
              </div>
              <h4 className="font-black text-base text-stone-900">優秀提案獲得獎勵</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                完賽優秀提案可獲頒「IdeaX 創新挑戰認證」標章，並依大會規章申請後續諮詢機會，校園大使同步結算過審推廣費。
              </p>
            </div>
          </div>
        </div>

        {/* 4-Phase Timeline */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>競賽重要時程規劃</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                整個 11 月熱烈展開，四大階段緊湊推進
              </p>
            </div>
            <span className="text-xs text-amber-900 font-mono font-bold bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              當前階段：提案投稿期 (11/02 ~ 11/15)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CHALLENGE_CONSTANTS.TIMELINE.map((item) => (
              <div
                key={item.phase}
                className={`p-4 rounded-2xl border transition-all ${
                  item.status === 'active'
                    ? 'bg-amber-50/80 border-2 border-amber-400 shadow-xs'
                    : 'bg-white border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      item.status === 'active'
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    Phase 0{item.phase}
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-700">
                    {item.dateRange}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-stone-900">{item.title}</h4>
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

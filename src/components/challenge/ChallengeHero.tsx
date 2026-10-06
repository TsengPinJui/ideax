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
  onOpenExpertApply?: () => void;
  proposals: ChallengeProposal[];
}

export const ChallengeHero: React.FC<ChallengeHeroProps> = ({
  onOpenSubmit,
  onExploreProposals,
  onOpenAmbassador,
  onOpenExpertApply,
  proposals,
}) => {
  const approvedProposals = proposals.filter((p) => p.status === 'approved');
  const totalFundingRaised = proposals.reduce((acc, p) => acc + (p.fundingRaised || 0), 0);
  const totalLikes = proposals.reduce((acc, p) => acc + (p.likes || 0), 0);

  return (
    <div className="relative bg-[linear-gradient(220deg,#FEF7CD_0%,#FFFDE0_28%,#F0FDF4_65%,#D1FAE5_100%)] text-stone-900 overflow-hidden border-b border-stone-200">
      {/* Background Subtle Tech Blueprint & Pale Yellow to Pale Green (淡黃 -> 淡綠) Gradient Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-40 pointer-events-none" />
      
      {/* 右上方柔和淡黃色光暈 (頂部與右側保持溫暖明亮淡黃) */}
      <div className="absolute -top-16 -right-16 w-[700px] h-[550px] bg-gradient-to-bl from-yellow-200/45 via-amber-100/25 to-transparent blur-[85px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[450px] h-[350px] bg-yellow-200/30 blur-[80px] rounded-full pointer-events-none" />

      {/* 左下方柔和淡綠色光暈 (左側與下方呈現清爽柔和淡綠) */}
      <div className="absolute -bottom-16 -left-16 w-[750px] h-[600px] bg-gradient-to-tr from-emerald-200/45 via-teal-100/30 to-transparent blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute bottom-4 left-1/3 w-[500px] h-[380px] bg-emerald-200/25 blur-[85px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10 space-y-6">
        {/* Main Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          {/* Green Badge for Challenge & Appeal Notice */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="sm:hidden">【11月創新月】IdeaX 創新挑戰季</span>
              <span className="hidden sm:inline">【11月國際創新月】IdeaX 創新挑戰季 • 盛大開跑</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>3分鐘零門檻投稿 • 享有 300 萬投資池盲測</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight sm:leading-tight text-stone-950 inline-block text-left">
            <span className="block text-stone-950">
              你的 <span className="text-amber-500">創新點子</span>，
            </span>
            <span className="block text-stone-950 pl-6 sm:pl-10 md:pl-14">
              值得被市場看見
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

            {onOpenExpertApply && (
              <button
                type="button"
                onClick={onOpenExpertApply}
                className="px-5 py-3.5 rounded-2xl bg-purple-700 hover:bg-purple-600 active:scale-95 text-white font-black text-sm transition-all cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
                title="成為專家：上傳相關證件加入評審團，獲配300萬支持池"
              >
                <ShieldCheck className="w-4 h-4 text-purple-200" />
                <span>成為專家</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExploreProposals}
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-amber-50/60 text-stone-800 border border-stone-300 hover:border-amber-400 font-bold text-sm sm:text-base transition-all active:scale-95 cursor-pointer flex items-center gap-2 shadow-2xs shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>探索提案</span>
            </button>

            <button
              type="button"
              onClick={onOpenAmbassador}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-900 border border-emerald-300 font-black text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center gap-2 shadow-2xs shrink-0"
              title="推廣大使每推薦一件審核通過的提案，可得 $400 推廣費"
            >
              <Users className="w-4 h-4 text-emerald-700" />
              <span>推廣大使（每過審提案獲$400）</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </button>
          </div>
        </div>

        {/* Real-time Metric Cards - 吸引參加之 4 大動態優勢卡 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5 pt-4">
          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
              <span className="group-hover:text-amber-800 transition-colors">參賽破局點子</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black">
                🔥 火熱徵件
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-stone-950 font-mono">
                  {Math.max(approvedProposals.length, 12)}
                </span>
                <span className="text-xs font-bold text-amber-700">件已審核</span>
              </div>
              <span className="text-[11px] text-stone-500 mt-0.5 block font-medium leading-tight">
                平均 24 小時快速初審 • 登錄創星榜
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
              <span className="group-hover:text-amber-800 transition-colors">專家支持金池</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black">
                💰 創投支持
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                  $3,000,000+
                </span>
              </div>
              <span className="text-[11px] text-stone-500 mt-0.5 block font-medium leading-tight">
                特聘專家專屬注資 • 單案最高 $200 萬
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
              <span className="group-hover:text-amber-800 transition-colors">導師深度評估</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-black">
                💡 1-on-1健檢
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-blue-600 font-mono">
                  100% 專家點評
                </span>
              </div>
              <span className="text-[11px] text-stone-500 mt-0.5 block font-medium leading-tight">
                矽谷架構師與百億顧問逐案深度診斷
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
              <span className="group-hover:text-emerald-800 transition-colors">大會官方證明</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black">
                🏅 數位證書
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                  官方榮譽證明
                </span>
              </div>
              <span className="text-[11px] text-stone-500 mt-0.5 block font-medium leading-tight">
                過審即獲唯一編號數位證書 • 履歷背書
              </span>
            </div>
          </div>
        </div>

        {/* 參賽者 4 大核心特權與優勢區塊 (吸引報名轉化專區) */}
        <div className="mt-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white/95 to-amber-50/60 border border-amber-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
            <div>
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 inline-block mb-1">
                WHY PARTICIPATE
              </span>
              <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                <span>🚀 為什麼你該立刻報名 IdeaX 創星季？</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
                  零成本 • 大收穫
                </span>
              </h3>
            </div>

            <button
              type="button"
              onClick={onOpenSubmit}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>立即 3 分鐘免費投稿</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs">🎯</span>
                <span>0成本真實盲測</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                不再閉門造車！3 分鐘填寫核心痛點與解法，即刻獲得全網用戶真實驗證與支持意向。
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">💰</span>
                <span>300萬支持金池</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                認證專家評審團重磅注資，高支持度提案登錄創星榜，直接解鎖創投與孵化對接！
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs">🤝</span>
                <span>導師實戰引路</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                百大新創導師逐案提供 1-on-1 深度破局建議，精準診斷商業模式與商業痛點。
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-xs">💎</span>
                <span>官方金色證書</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                通過初審即享官方金色數位證書與永久驗證序號，求職、升學、投創最強實績！
              </p>
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
                填寫結構化痛點與解決方案，通過管理員審核即可於競賽專區公開展示，並獲得專屬綠色「創星季」標籤。
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
                完賽優秀提案可獲頒「IdeaX 創新挑戰認證」標章，並依大會規章申請後續諮詢機會，推廣大使同步結算過審推廣費。
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

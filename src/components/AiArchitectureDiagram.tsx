import React from 'react';
import {
  Sparkles,
  HelpCircle,
  Crown,
  ShieldCheck,
  Target,
  Bot,
  Scale,
  Lock,
  MessageSquare,
  FileCheck,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface AiArchitectureDiagramProps {
  className?: string;
}

export const AiArchitectureDiagram: React.FC<AiArchitectureDiagramProps> = ({
  className = '',
}) => {
  return (
    <div className={`p-4 sm:p-7 rounded-3xl bg-stone-900 text-stone-100 border border-stone-800 shadow-xl space-y-6 ${className}`}>
      {/* 標題區 */}
      <div className="text-center space-y-1.5 pb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-black">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>智能服務組織架構</span>
        </div>
        <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
          創點子 IdeaX • 智能協同服務架構圖
        </h3>
        <p className="text-xs text-stone-400 max-w-xl mx-auto">
          由平台智能大腦統一協調，全天候為發案方、專家與交易安全提供貼心支援。
        </p>
      </div>

      {/* 組織圖核心樹狀結構 */}
      <div className="space-y-4">
        {/* 頂層：核心大腦 */}
        <div className="max-w-md mx-auto p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 text-center font-black shadow-lg relative border border-amber-300">
          <div className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <Sparkles className="w-5 h-5 fill-stone-950" />
            <span>創點子 IdeaX 智能大腦</span>
          </div>
          <p className="text-[11px] font-bold text-stone-800 mt-0.5">
            24 小時全天候運作 • 串聯需求、專家與安心交易
          </p>

          {/* 向下連接線 (中央主幹) */}
          <div className="hidden sm:block absolute -bottom-5 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-amber-400" />
        </div>

        {/* 橫向分支連接線 (桌面版) */}
        <div className="hidden sm:block relative h-4 max-w-4xl mx-auto">
          <div className="absolute top-0 left-[16%] right-[16%] h-0.5 bg-stone-700" />
          <div className="absolute top-0 left-[16%] w-0.5 h-4 bg-stone-700" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-stone-700" />
          <div className="absolute top-0 right-[16%] w-0.5 h-4 bg-stone-700" />
        </div>

        {/* 三大分支組織卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl mx-auto text-xs">
          {/* 分支 1：發案提問夥伴 */}
          <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              {/* 分支頂部標題 */}
              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-amber-300 text-sm">發案提問夥伴</h4>
                  <span className="text-[10px] text-stone-400 block">零門檻快速發問</span>
                </div>
              </div>

              {/* 執行功能項目 */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1">
                  <span className="font-bold text-stone-200 text-[11px] flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span>自動分析痛點難題</span>
                  </span>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    讀懂發案需求重點，自動整理分類並提供合理的預算參考。
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1">
                  <span className="font-bold text-stone-200 text-[11px] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>精準推薦好專家</span>
                  </span>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    自動比對全站專家專長，主動邀請合適人選前來解答。
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1">
                  <span className="font-bold text-stone-200 text-[11px] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>全天候客服解答</span>
                  </span>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    隨時解答平台使用流程與操作指引，提問安心無負擔。
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-700/60 text-[10px] text-amber-300 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>大幅縮短等待時間，快速找到滿意解法</span>
            </div>
          </div>

          {/* 分支 2：智庫解答專家 */}
          <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              {/* 分支頂部標題 */}
              <div className="p-2.5 rounded-xl bg-purple-400/10 border border-purple-400/25 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center font-black shrink-0">
                  <Crown className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-black text-purple-300 text-sm">智庫解答專家</h4>
                  <span className="text-[10px] text-stone-400 block">專屬智能副手</span>
                </div>
              </div>

              {/* 執行功能項目 */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1">
                  <span className="font-bold text-stone-200 text-[11px] flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-purple-400" />
                    <span>自動巡航尋找商機</span>
                  </span>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    全天候自動掃描適合自己專長的好題目，不漏接任何案件。
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1">
                  <span className="font-bold text-stone-200 text-[11px] flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    <span>專屬特助自動代操</span>
                  </span>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    專家忙碌時由特助協助接待客戶，並在最佳時段發送破冰提案。
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1">
                  <span className="font-bold text-stone-200 text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>雙向握手專屬媒合</span>
                  </span>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    系統精準雙向確認雙方需求後，第一時間推播優先提案。
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-700/60 text-[10px] text-purple-300 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>放大專業價值，省時省力高效接案</span>
            </div>
          </div>

          {/* 分支 3：安心交易守護 */}
          <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              {/* 分支頂部標題 */}
              <div className="p-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/25 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-stone-950 flex items-center justify-center font-black shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-emerald-300 text-sm">安心交易守護</h4>
                  <span className="text-[10px] text-stone-400 block">安全防護與保障</span>
                </div>
              </div>

              {/* 執行功能項目 */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1">
                  <span className="font-bold text-stone-200 text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>隱私與個資保護</span>
                  </span>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    自動隱藏對話中的電話與私人通訊軟體帳號，防範私下詐騙。
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1">
                  <span className="font-bold text-stone-200 text-[11px] flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    <span>客觀爭議調解</span>
                  </span>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    專案遇到認知不同時，客觀比對雙方約定，協助公平協商。
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1">
                  <span className="font-bold text-stone-200 text-[11px] flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>第三方價金保障</span>
                  </span>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    發案方確認驗收後才撥款給專家，雙方權益都獲得完整保障。
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-700/60 text-[10px] text-emerald-300 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>人機協同最終把關，每筆合作安心放心</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部總結說明 */}
      <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-800 text-center text-xs text-stone-400">
        所有智能功能皆為輔助與效率提升，方案確認、合約簽署與款項放款均由用戶親自確認掌握。
      </div>
    </div>
  );
};

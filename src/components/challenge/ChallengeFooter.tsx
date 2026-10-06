import React from 'react';
import {
  BookOpen,
  FileText,
  ShieldCheck,
  Search,
  Sparkles,
  Layers,
  FilePlus,
  Trophy,
  Users,
  Award,
  ArrowRight,
  ExternalLink,
  Mail,
  Shield,
} from 'lucide-react';

interface ChallengeFooterProps {
  onOpenRegulations: (tab: 'regulations' | 'participant_terms' | 'expert_terms' | 'faq') => void;
  onOpenGooglePreview: () => void;
  onSelectTab: (tab: any) => void;
  onOpenSubmit: () => void;
  onOpenExpertApply: () => void;
  onOpenAmbassador: () => void;
  onBackToMainPlatform: () => void;
}

export const ChallengeFooter: React.FC<ChallengeFooterProps> = ({
  onOpenRegulations,
  onOpenGooglePreview,
  onSelectTab,
  onOpenSubmit,
  onOpenExpertApply,
  onOpenAmbassador,
  onBackToMainPlatform,
}) => {
  return (
    <footer className="mt-16 bg-white border-t border-stone-200 text-stone-700 font-sans">
      {/* 1. Main Footer Navigation Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Brand & Organizer */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                src="/白底低飽和正向燈泡.png"
                alt="IdeaX"
                className="h-9 w-auto max-w-[36px] object-contain rounded-xl border border-amber-200 shadow-2xs"
              />
              <img
                src="/去背創星季.png"
                alt="創星季"
                className="h-8 w-auto max-w-[88px] object-contain"
              />
            </div>

            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              你的創新點子，值得被市場看見。全台首創真實盲測、虛擬募資度量衡與認證專家深度評核的商業挑戰季。
            </p>

            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>主辦單位：IdeaX創點子團隊</span>
              </span>
            </div>
          </div>

          {/* Col 2: 競賽辦法與規章專區 (新站頁尾重點要求) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>競賽辦法與條款規章</span>
            </div>

            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenRegulations('regulations')}
                  className="font-bold text-amber-900 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors group"
                >
                  <span className="group-hover:underline">📜 《IdeaX 創星季競賽辦法與規章》</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-black">
                    重要
                  </span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => onOpenRegulations('participant_terms')}
                  className="text-stone-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>📋 參賽規則與智慧財產權條款</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => onOpenRegulations('expert_terms')}
                  className="text-stone-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>🛡️ 特聘專家評審與指導條款</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => onOpenRegulations('faq')}
                  className="text-stone-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>💡 點數機制與常見問題 FAQ</span>
                </button>
              </li>

              <li className="pt-1">
                <button
                  type="button"
                  onClick={onOpenGooglePreview}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-200 transition-colors cursor-pointer"
                  title="檢視 Google 搜尋結果與 4 大子連結卡片"
                >
                  <Search className="w-3 h-3 text-blue-600" />
                  <span>Google 搜尋結果預覽 (SEO)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: 競賽快捷導覽 (4大搜尋核心 + 榜單) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>競賽活動快捷導覽</span>
            </div>

            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTab('proposals')}
                  className="text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>提案總覽（7 大主題分類）</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={onOpenSubmit}
                  className="text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FilePlus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>我要提案（3 分鐘免費提交）</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={onOpenExpertApply}
                  className="text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                  <span>成為專家（上傳證件加入評審）</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => onSelectTab('leaderboard')}
                  className="text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>競賽榮譽榜（即時排名）</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => onSelectTab('experts')}
                  className="text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Award className="w-3.5 h-3.5 text-purple-500" />
                  <span>評審團與顧問名冊</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: 大使獎勵與聯絡資訊 */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>大使獎勵與客服</span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-950">
                  推廣大使計劃
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-950">
                  實體獎勵
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-tight">
                每推薦一位創作者且提案通過審核：
              </p>
              <div className="text-xs font-black text-emerald-800">
                每過審提案獲$400
              </div>
              <button
                type="button"
                onClick={onOpenAmbassador}
                className="w-full mt-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition-colors cursor-pointer text-center"
              >
                領取專屬推薦碼
              </button>
            </div>

            <div className="pt-1 text-[11px] text-stone-500 space-y-1">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                <span>客服信箱：support@ideax.tw</span>
              </div>
              <div>服務時間：週一至週五 09:30 ~ 18:30</div>
            </div>
          </div>
        </div>

        {/* 2. Bottom Platform Switch Bar */}
        <div className="mt-10 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span>© 2026 IdeaX 創點子團隊. All Rights Reserved.</span>
            <span className="text-stone-300">•</span>
            <span>IdeaX 創新挑戰季 • 創星季</span>
          </div>

          <button
            type="button"
            onClick={onBackToMainPlatform}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-xs"
          >
            <span>返回 IdeaX 提問懸賞主平台</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>
    </footer>
  );
};

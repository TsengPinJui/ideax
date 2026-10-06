import React from 'react';
import {
  X,
  Search,
  ExternalLink,
  Globe,
  Sparkles,
  Layers,
  FilePlus,
  ShieldCheck,
  BookOpen,
  CheckCircle2,
  Copy,
} from 'lucide-react';

interface ChallengeGooglePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTo: (target: 'proposals' | 'submit' | 'expert' | 'rules') => void;
}

export const ChallengeGooglePreviewModal: React.FC<ChallengeGooglePreviewModalProps> = ({
  isOpen,
  onClose,
  onNavigateTo,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                <span>Google 搜尋結果與 Sitelinks 子連結預覽</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  SEO 已就緒
                </span>
              </h3>
              <p className="text-[11px] text-stone-500">
                符合 Google 結構化數據規範，搜尋「IdeaX 創星季」時展現之富搜尋結果
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Google Search Simulation Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-sm space-y-3 font-sans">
          {/* Simulated Google Search Header */}
          <div className="flex items-center gap-2 pb-2.5 border-b border-stone-100 text-xs text-stone-500">
            <span className="font-bold text-[#4285F4] text-base tracking-tight font-serif">G<span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span></span>
            <div className="flex-1 bg-stone-100/80 px-3 py-1 rounded-full text-[11px] text-stone-600 flex items-center justify-between">
              <span>IdeaX 創新挑戰季 創星季</span>
              <Search className="w-3 h-3 text-stone-400" />
            </div>
          </div>

          {/* Search Result Item (Main Card) */}
          <div className="space-y-1 text-left">
            {/* Breadcrumb URL with Favicon */}
            <div className="flex items-center gap-2 text-xs text-stone-700">
              <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 text-xs shrink-0 overflow-hidden">
                <img src="/白底低飽和正向燈泡.png" alt="IdeaX" className="w-4 h-4 object-contain" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-[11px] font-bold text-stone-800">IdeaX 創點子</div>
                <div className="text-[10px] text-stone-400 truncate">https://ideax.tw › challenge</div>
              </div>
            </div>

            {/* Main Blue Title */}
            <h4 className="text-base sm:text-lg font-bold text-[#1a0dab] hover:underline cursor-pointer pt-0.5 leading-snug">
              IdeaX 創新挑戰季 • 創星季 - 你的創新點子，值得被市場看見
            </h4>

            {/* Snippet Description */}
            <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed pt-0.5">
              IdeaX創點子主辦「創星季」全國商業創新挑戰賽！3分鐘免門檻提交痛點解法，享有300萬特聘專家支持金池盲測、矽谷顧問深度評估診斷與唯一編號官方榮譽數位證書。提案總覽、我要提案、成為專家、活動辦法火熱開放中。
            </p>

            {/* 4 Core Sitelinks (子連結矩陣) */}
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Sitelink 1: 提案總覽 */}
              <div
                onClick={() => {
                  onClose();
                  onNavigateTo('proposals');
                }}
                className="p-3 rounded-xl border border-stone-200/90 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a0dab] group-hover:underline">
                  <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>提案總覽</span>
                  <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-2">
                  探索 7 大主題領域熱門創新提案，涵蓋 AI 智慧應用、綠能與生醫商業模式解法。
                </p>
              </div>

              {/* Sitelink 2: 我要提案 */}
              <div
                onClick={() => {
                  onClose();
                  onNavigateTo('submit');
                }}
                className="p-3 rounded-xl border border-stone-200/90 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a0dab] group-hover:underline">
                  <FilePlus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>我要提案</span>
                  <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-2">
                  零成本 3 分鐘快速提交商業痛點與解法，過審即獲官方金色榮譽數位證書與注資。
                </p>
              </div>

              {/* Sitelink 3: 成為專家 */}
              <div
                onClick={() => {
                  onClose();
                  onNavigateTo('expert');
                }}
                className="p-3 rounded-xl border border-stone-200/90 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a0dab] group-hover:underline">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>成為專家</span>
                  <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-2">
                  歡迎各界顧問與架構師申請認證專家，獲配 300 萬支持金池並注資評點優秀專案。
                </p>
              </div>

              {/* Sitelink 4: 活動辦法 */}
              <div
                onClick={() => {
                  onClose();
                  onNavigateTo('rules');
                }}
                className="p-3 rounded-xl border border-stone-200/90 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a0dab] group-hover:underline">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>活動辦法</span>
                  <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-2">
                  詳細競賽規章、四階段時程、虛擬募資規範與推廣大使每過審提案獲$400獎勵說明。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation confirmation notice */}
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>已完全嵌入 HTML 原始碼：</strong>包含 OpenGraph、Twitter Cards 與 Schema.org JSON-LD 規範（包含 <code>SiteNavigationElement</code> 及 <code>Event</code> 結構化標記），Google 搜尋引擎爬蟲抓取時將自動索引此 4 大子連結。
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};

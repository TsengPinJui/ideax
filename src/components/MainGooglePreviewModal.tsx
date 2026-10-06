import React, { useState } from 'react';
import {
  X,
  Search,
  ExternalLink,
  Globe,
  Sparkles,
  Layers,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Lightbulb,
  FileQuestion,
  Trophy,
  BookOpen,
  ArrowRight,
  Code2,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface MainGooglePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTo: (target: 'explore' | 'create_question' | 'innovation_challenge' | 'solvers' | 'proposals' | 'submit' | 'rules') => void;
  initialMode?: 'main' | 'challenge';
}

export const MainGooglePreviewModal: React.FC<MainGooglePreviewModalProps> = ({
  isOpen,
  onClose,
  onNavigateTo,
  initialMode = 'main',
}) => {
  const [activeMode, setActiveMode] = useState<'main' | 'challenge'>(initialMode);
  const [copied, setCopied] = useState(false);
  const [showJsonLd, setShowJsonLd] = useState(false);

  if (!isOpen) return null;

  const currentUrl = activeMode === 'main' ? 'https://ideax.tw' : 'https://ideax.tw/challenge';

  const handleCopyLink = async () => {
    await copyToClipboard(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const schemaJson = JSON.stringify(
    activeMode === 'main'
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              '@id': 'https://ideax.tw/#website',
              url: 'https://ideax.tw/',
              name: 'IdeaX 創點子',
              alternateName: 'IdeaX 商業問題解決市集與智庫平台',
              description: '全台最具實戰力的新型態商業問題解決市集與智庫平台',
              publisher: {
                '@type': 'Organization',
                name: 'IdeaX 創點子團隊',
                url: 'https://ideax.tw/',
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://ideax.tw/?search={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            },
            {
              '@type': 'SiteNavigationElement',
              '@id': 'https://ideax.tw/#navigation',
              name: 'IdeaX 商業智庫平台導覽快捷索引',
              hasPart: [
                {
                  '@type': 'WebPage',
                  name: '問題市場',
                  description: '探索各領域商業痛點與懸賞問題，提供認證專家破局落地方案與諮詢對接',
                  url: 'https://ideax.tw/?tab=explore',
                },
                {
                  '@type': 'WebPage',
                  name: '我要提問',
                  description: '免費發布商業痛點或設定懸賞發案，享受 24hr AI 智慧特助與專家智庫協助',
                  url: 'https://ideax.tw/?tab=create_question',
                },
                {
                  '@type': 'WebPage',
                  name: '創新點子',
                  description: '探索高價值商業創新專案與創星季挑戰賽精選提案，享受 300 萬投資池盲測',
                  url: 'https://ideax.tw/?tab=innovation_challenge',
                },
                {
                  '@type': 'WebPage',
                  name: '成為專家',
                  description: '歡迎各界顧問與架構師加入 IdeaX 認證專家智庫，接案解題賺取諮詢報酬與聲譽',
                  url: 'https://ideax.tw/?tab=solvers',
                },
              ],
            },
          ],
        }
      : {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SiteNavigationElement',
              '@id': 'https://ideax.tw/challenge#navigation',
              name: '創星季競賽導覽快捷索引',
              hasPart: [
                {
                  '@type': 'WebPage',
                  name: '提案總覽',
                  description: '探索 7 大領域熱門參賽提案，包含 AI 智慧科技、永續生活與商業模式破局解法',
                  url: 'https://ideax.tw/challenge?tab=proposals',
                },
                {
                  '@type': 'WebPage',
                  name: '我要提案',
                  description: '3 分鐘免費提交創新點子，過審即獲官方金色榮譽數位證書與 300 萬支持金池盲測',
                  url: 'https://ideax.tw/challenge?action=submit',
                },
                {
                  '@type': 'WebPage',
                  name: '成為專家',
                  description: '申請加入認證專家評審顧問團，需上傳專業證件，獲配 300 萬專屬注資額度',
                  url: 'https://ideax.tw/challenge?action=expert',
                },
                {
                  '@type': 'WebPage',
                  name: '活動辦法',
                  description: '詳細競賽辦法、賽事四階段時程、虛擬募資規範與推廣大使每過審提案獲$400規則',
                  url: 'https://ideax.tw/challenge?tab=rules',
                },
              ],
            },
          ],
        },
    null,
    2
  );

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
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5 flex-wrap">
                <span>Google 搜尋結果與 Sitelinks 子連結預覽</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  SEO 結構化就緒
                </span>
              </h3>
              <p className="text-[11px] text-stone-500">
                符合 Google 官方 Schema.org 規範，在瀏覽器搜尋時自動展開 4 大快捷子連結條目
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher: 舊網站 (主平台) vs 創星季競賽 */}
        <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveMode('main')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'main'
                ? 'bg-white text-stone-950 shadow-xs ring-1 ring-stone-200 font-black'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>主網站搜尋（問題市場 / 我要提問 / 創新點子 / 成為專家）</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('challenge')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'challenge'
                ? 'bg-white text-stone-950 shadow-xs ring-1 ring-stone-200 font-black'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>創星季競賽（提案總覽 / 我要提案 / 成為專家 / 活動辦法）</span>
          </button>
        </div>

        {/* Google Search Simulation Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3 font-sans">
          {/* Simulated Google Search Header */}
          <div className="flex items-center gap-2 pb-2.5 border-b border-stone-100 text-xs text-stone-500">
            <span className="font-bold text-[#4285F4] text-base tracking-tight font-serif">
              G<span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
            </span>
            <div className="flex-1 bg-stone-100/90 px-3 py-1.5 rounded-full text-[11px] text-stone-700 flex items-center justify-between">
              <span>{activeMode === 'main' ? 'IdeaX 創點子' : 'IdeaX 創新挑戰季 創星季'}</span>
              <Search className="w-3 h-3 text-stone-400" />
            </div>
          </div>

          {/* Search Result Item (Main Card) */}
          <div className="space-y-1.5 text-left">
            {/* Breadcrumb URL with Favicon */}
            <div className="flex items-center gap-2 text-xs text-stone-700">
              <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 text-xs shrink-0 overflow-hidden">
                <img src="/白底低飽和正向燈泡.png" alt="IdeaX" className="w-4 h-4 object-contain" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-[11px] font-bold text-stone-800">IdeaX 創點子</div>
                <div className="text-[10px] text-stone-400 truncate">
                  {activeMode === 'main' ? 'https://ideax.tw' : 'https://ideax.tw › challenge'}
                </div>
              </div>
            </div>

            {/* Main Blue Title */}
            <h4 className="text-base sm:text-lg font-bold text-[#1a0dab] hover:underline cursor-pointer pt-0.5 leading-snug">
              {activeMode === 'main'
                ? 'IdeaX 創點子 - 全台最大商業問題解決市集與智庫平台'
                : 'IdeaX 創新挑戰季 • 創星季 - 你的創新點子，值得被市場看見'}
            </h4>

            {/* Snippet Description */}
            <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed pt-0.5">
              {activeMode === 'main'
                ? '探索高價值商業痛點、發布懸賞發案、對接百大認證專家智庫！提供問題市場、我要提問、創新點子與成為專家四大核心捷徑，快速獲得破局落地方案與顧問諮詢。'
                : 'IdeaX創點子主辦「創星季」全國商業創新挑戰賽！3分鐘免門檻提交痛點解法，享有300萬特聘專家支持金池盲測、矽谷顧問深度評估診斷與唯一編號官方榮譽數位證書。提案總覽、我要提案、成為專家、活動辦法火熱開放中。'}
            </p>

            {/* 4 Core Sitelinks (條目捷徑矩陣) */}
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeMode === 'main' ? (
                <>
                  {/* Sitelink 1: 問題市場 */}
                  <div
                    onClick={() => {
                      onClose();
                      onNavigateTo('explore');
                    }}
                    className="p-3 rounded-xl border border-stone-200/90 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a0dab] group-hover:underline">
                      <FileQuestion className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>問題市場</span>
                      <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-2">
                      探索各領域商業痛點與懸賞問題，提供認證專家破局落地方案與諮詢對接。
                    </p>
                  </div>

                  {/* Sitelink 2: 我要提問 */}
                  <div
                    onClick={() => {
                      onClose();
                      onNavigateTo('create_question');
                    }}
                    className="p-3 rounded-xl border border-stone-200/90 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a0dab] group-hover:underline">
                      <Lightbulb className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>我要提問</span>
                      <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-2">
                      免費發布商業痛點或設定懸賞發案，享受 24hr AI 智慧特助與專家智庫協助。
                    </p>
                  </div>

                  {/* Sitelink 3: 創新點子 */}
                  <div
                    onClick={() => {
                      onClose();
                      onNavigateTo('innovation_challenge');
                    }}
                    className="p-3 rounded-xl border border-stone-200/90 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a0dab] group-hover:underline">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>創新點子</span>
                      <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-2">
                      探索高價值商業創新專案與創星季挑戰賽精選提案，享受 300 萬投資池盲測。
                    </p>
                  </div>

                  {/* Sitelink 4: 成為專家 */}
                  <div
                    onClick={() => {
                      onClose();
                      onNavigateTo('solvers');
                    }}
                    className="p-3 rounded-xl border border-stone-200/90 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a0dab] group-hover:underline">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>成為專家</span>
                      <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-2">
                      歡迎各界顧問與架構師加入 IdeaX 認證專家智庫，接案解題賺取諮詢報酬與聲譽。
                    </p>
                  </div>
                </>
              ) : (
                <>
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
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
                      onNavigateTo('solvers');
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Implementation confirmation notice */}
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>已完全嵌入 HTML 原始碼：</strong>包含 OpenGraph、Twitter Cards 與 Schema.org JSON-LD 規範（包含 <code>SiteNavigationElement</code> 及 <code>WebSite</code> 結構化標記），Google 搜尋引擎爬蟲抓取時將自動索引此 4 大子連結（<strong>問題市場</strong>、<strong>我要提問</strong>、<strong>創新點子</strong>、<strong>成為專家</strong>）。
          </div>
        </div>

        {/* Schema.org code toggle */}
        <div className="space-y-2 pt-1 border-t border-stone-100">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowJsonLd(!showJsonLd)}
              className="text-xs text-stone-600 hover:text-stone-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-stone-400" />
              <span>{showJsonLd ? '收起' : '查看'} Google 爬蟲結構化資料 (Schema.org JSON-LD)</span>
            </button>
            <span className="text-[10px] text-stone-400">已自動掛載於 index.html &lt;head&gt;</span>
          </div>

          {showJsonLd && (
            <pre className="p-3 rounded-xl bg-stone-900 text-amber-400 text-[11px] font-mono overflow-x-auto max-h-48 border border-stone-800">
              {schemaJson}
            </pre>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? '已複製網址' : '複製分享網址'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};

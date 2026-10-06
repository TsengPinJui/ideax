import React, { useState } from 'react';
import { Question, Answer } from '../types';
import { getQuestionShareUrl } from '../services/seoService';
import { copyToClipboard } from '../utils/clipboard';
import {
  X,
  Search,
  Globe,
  Share2,
  Copy,
  Check,
  Code2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  FileText,
  HelpCircle,
} from 'lucide-react';

interface SeoPreviewModalProps {
  question: Question;
  answers: Answer[];
  isOpen: boolean;
  onClose: () => void;
}

export const SeoPreviewModal: React.FC<SeoPreviewModalProps> = ({
  question,
  answers,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [showJsonLd, setShowJsonLd] = useState(false);

  if (!isOpen) return null;

  const pageUrl = getQuestionShareUrl(question.id);
  const questionAnswers = answers.filter((a) => a.questionId === question.id);
  const solutionsCount = questionAnswers.filter((a) => a.type === 'solution' || !a.type).length;
  const discussionsCount = questionAnswers.filter((a) => a.type === 'discussion').length;

  const bountyText =
    question.bounty > 0 ? `【懸賞 NT$ ${question.bounty.toLocaleString()}】` : '【免費探討】';
  const seoTitle = `${bountyText} ${question.title} - IdeaX 創點子知識問答`;
  const plainSnippet = (question.description || '')
    .replace(/\n+/g, ' ')
    .slice(0, 140);

  const handleCopyLink = async () => {
    await copyToClipboard(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const schemaJson = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        name: question.title,
        text: question.description,
        answerCount: questionAnswers.length,
        upvoteCount: question.views || 0,
        dateCreated: question.createdAt,
        author: {
          '@type': 'Person',
          name: question.authorName,
        },
      },
    },
    null,
    2
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <span>搜尋引擎收錄與 SEO 分享</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Google Q&A 相容
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                如何讓提問如知乎、Dcard、PTT 般出現在瀏覽器搜尋結果
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-800 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* 1. Google 搜尋結果即時模擬卡片 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                Google 搜尋結果預覽 (SERP Snippet)
              </span>
              <span className="text-[10px] text-stone-400">桌機與手機搜尋模擬</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-sm font-sans space-y-1.5">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-2 text-[12px] text-stone-600 truncate">
                <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-black text-stone-950 shrink-0">
                  💡
                </div>
                <span className="font-medium text-stone-900">IdeaX 創點子</span>
                <span className="text-stone-300">›</span>
                <span className="text-stone-500 truncate">
                  {question.category} › {question.subcategory || '難題問答'}
                </span>
              </div>

              {/* Clickable Title */}
              <div className="text-base sm:text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer leading-snug">
                {seoTitle}
              </div>

              {/* Rich snippet badges (Like Zhihu/Dcard/StackOverflow) */}
              <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap pt-0.5">
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  ⭐ 4.9 (懸賞 NT$ {question.bounty.toLocaleString()})
                </span>
                <span>•</span>
                <span className="font-medium text-stone-700">{solutionsCount} 個專家方案</span>
                <span>•</span>
                <span>{discussionsCount} 則社群討論</span>
                <span>•</span>
                <span>{question.createdAt}</span>
              </div>

              {/* Snippet text */}
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pt-1">
                <span className="text-stone-400 font-mono text-xs mr-1.5">{question.createdAt} —</span>
                {plainSnippet}... 「查看完整提問背景、已收到的精選方案與深度落地解答步驟。」
              </p>
            </div>
          </div>

          {/* 社群分享卡片預覽 (LINE, Facebook, Threads, Discord, X 縮圖預覽) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-amber-600" />
                社群分享縮圖與卡片預覽 (LINE / FB / Discord / X)
              </span>
              <span className="text-[10px] text-stone-400">OpenGraph &amp; Twitter Card 縮圖</span>
            </div>

            <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-44 h-36 sm:h-auto bg-stone-100 shrink-0 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r border-stone-200">
                  <img
                    src="/圓角正向黃底燈泡.png"
                    alt="IdeaX 縮圖"
                    className="w-full h-full object-contain p-2"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">ideax.market</span>
                    <h5 className="text-sm font-bold text-stone-900 leading-snug line-clamp-2 mt-0.5">
                      {seoTitle}
                    </h5>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                      {plainSnippet}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 text-[11px] text-amber-700 font-semibold">
                    <span>💡 IdeaX 創點子</span>
                    <span>•</span>
                    <span>讓想法發光</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 專屬永久分享連結 (Deep Link) */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-amber-600" />
                本題專屬永久網址 (Permanent Deep Link)
              </span>
              {copied && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 已複製到剪貼簿！
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={pageUrl}
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-mono text-stone-700 select-all outline-hidden"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '已複製' : '複製連結'}</span>
              </button>
            </div>

            <p className="text-[11px] text-stone-500">
              複製此連結可直接在新分頁開啟本題，或轉貼至 LINE、Threads、Facebook、Dcard 累積外部反向連結 (Backlinks)。
            </p>
          </div>

          {/* 3. 像知乎、Dcard、PTT 般的收錄原理說明 */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              問答論壇在瀏覽器中名列前茅的 4 大技術機制
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1">
                <span className="font-bold text-stone-900 block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  1. Google 官方 QAPage 標記
                </span>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  系統已為此題自動注入 Schema.org 結構化問答資料，Google 爬蟲可直接解析「問題+解答數+精華預覽」。
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1">
                <span className="font-bold text-stone-900 block flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  2. 獨立 URL 與語意化網址
                </span>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  每則提問均具備獨立 URL（如 <code className="text-stone-700 font-mono">?q=q-101</code>），使搜尋引擎可逐頁建檔收錄。
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1">
                <span className="font-bold text-stone-900 block flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  3. 公開精華與付費牆防護
                </span>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  討論與方案摘要完全公開供搜尋引流，核心實操方案受付費牆保護，兼顧高排名與變現保護。
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1">
                <span className="font-bold text-stone-900 block flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  4. 反向連結與社群擴散
                </span>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  分享到社群平台或外部論壇討論，將快速提高 Google 蜘蛛檢索頻率，大幅推升在關鍵字搜尋中的排名。
                </p>
              </div>
            </div>
          </div>

          {/* 4. 即時查看 Schema.org 代碼 */}
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
              <span className="text-[10px] text-stone-400">已自動掛載於頁面 &lt;head&gt;</span>
            </div>

            {showJsonLd && (
              <pre className="p-3 rounded-xl bg-stone-900 text-amber-400 text-[11px] font-mono overflow-x-auto max-h-48 border border-stone-800">
                {schemaJson}
              </pre>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-stone-500 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            將連結轉發至各大論壇，可加速搜尋引擎收錄生效
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Check,
  Link as LinkIcon,
  Heart,
  MessageSquare,
  Sparkles,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  LogIn,
  Send,
  Trophy,
  Users,
} from 'lucide-react';
import {
  StarSeasonProposal,
  ProposalComment,
  STAR_SEASON_TRACKS,
  getProposalCardAuthorText,
} from '../../types/competition';
import { getProposalShareUrl } from '../../services/seoService';
import { shareOrCopyUrl, copyPureUrl } from '../../utils/shareUtils';
import { getUserNameColorClass } from '../../utils/userDisplay';

interface ProposalDetailFullPageProps {
  proposal: StarSeasonProposal;
  onBack: () => void;
  onToggleLike: (proposalId: string) => void;
  isLiked: boolean;
  comments: ProposalComment[];
  isLoadingComments?: boolean;
  onAddComment: (text: string) => Promise<void>;
  onSupport?: (proposal: StarSeasonProposal) => void;
  stageInfo?: any;
  isLoggedIn?: boolean;
  onOpenAuth?: () => void;
  onSolvePainPoint?: (proposal: StarSeasonProposal) => void;
  showToast?: (msg: string) => void;
}

export const ProposalDetailFullPage: React.FC<ProposalDetailFullPageProps> = ({
  proposal,
  onBack,
  onToggleLike,
  isLiked,
  comments,
  isLoadingComments = false,
  onAddComment,
  onSupport,
  stageInfo,
  isLoggedIn = false,
  onOpenAuth,
  onSolvePainPoint,
  showToast,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [shared, setShared] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 分享出去（帶文字說明推薦引言，直通 LINE、FB、IG、Threads 等社群；降級時複製純網址）

  // 2. 分享出去（帶文字說明推薦引言，直通 LINE、FB、IG、Threads 等社群）
  const handleShareWithText = async () => {
    const canonicalUrl = getProposalShareUrl(proposal.id);
    const trackInfo = STAR_SEASON_TRACKS[proposal.track] || STAR_SEASON_TRACKS.ai_applications;
    const shareTitle = `【IdeaX 創星季】${proposal.title}`;
    const shareText = `【IdeaX 創星季 • 創新提案】${proposal.title}\n✦ 賽道領域：${trackInfo.name}\n✦ 目前注資支持：NT$ ${(proposal.supportPoints || (proposal as any).raisedPoints || 0).toLocaleString()} 創星幣\n✦ 提案摘要：${proposal.summary || '邀請您一同探索青年跨領域創新解方，為高潛力提案投票注資！'}\n`;

    const res = await shareOrCopyUrl({
      title: shareTitle,
      text: shareText,
      url: canonicalUrl,
    });

    if (res === 'shared') {
      // 原生分享已喚起，依需求不顯示「已開啟分享」提示
    } else if (res === 'copied') {
      // 若桌面瀏覽器不支援原生分享面板，降級複製剪貼簿時亦只複製純網址
      setCopiedUrl(true);
      if (showToast) {
        showToast('🔗 提案純網址已複製到剪貼簿（不含文字）');
      }
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    if (!isLoggedIn) {
      onOpenAuth?.();
      return;
    }

    setIsSubmittingComment(true);
    try {
      await onAddComment(newCommentText.trim());
      setNewCommentText('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const authorInfo = getProposalCardAuthorText(proposal);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-28 font-sans selection:bg-amber-300 selection:text-stone-950">
      {/* 頂部固定麵包屑與動作導覽列 */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer shrink-0 active:scale-95"
              title="返回提案總覽"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回列表</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-medium truncate">
              <span>/</span>
              <span className="text-stone-600">創星季提案</span>
              <span>/</span>
              <span className="text-stone-900 font-bold truncate max-w-[200px]">{proposal.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 分享按鈕 (帶文字說明分享至社群/LINE) */}
            <button
              type="button"
              onClick={handleShareWithText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
              title="帶文字說明分享此提案至社群或好友"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-950" />
              <span>分享提案</span>
            </button>

            {/* 愛心按讚 */}
            <button
              type="button"
              onClick={() => onToggleLike(proposal.id)}
              className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                isLiked
                  ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                  : 'bg-white text-rose-600 border-stone-200 hover:bg-rose-50'
              }`}
              title={isLiked ? '已按讚收藏' : '按讚收藏此提案'}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* 主要提案頁面內容容器 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* 1. 提案頂部標題區塊 */}
        <section className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200/90 shadow-sm space-y-4">
          {/* 賽道與階段標籤 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-black px-3 py-1 rounded-full ${
              proposal.stage === 'pain_point'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {proposal.stage === 'pain_point' ? '第一階段：徵點子（痛點）' : '第二階段：想解方（解法）'}
            </span>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              {STAR_SEASON_TRACKS[proposal.track]?.name || '未分類賽道'}
            </span>

            {proposal.finalRank && proposal.finalRank > 0 && (
              <span className="text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 flex items-center gap-1 shadow-2xs">
                <Trophy className="w-3.5 h-3.5" />
                <span>第 {proposal.finalRank} 名獲獎提案</span>
              </span>
            )}
          </div>

          {/* 提案主標題 */}
          <h1 className="text-xl sm:text-3xl font-black text-stone-900 leading-snug tracking-tight">
            {proposal.title}
          </h1>

          {/* 提案作者與所屬學校 */}
          <div className="flex items-center justify-between gap-3 pt-2 pb-1 border-t border-stone-100 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 font-black flex items-center justify-center text-base shadow-2xs shrink-0">
                {proposal.authorName ? proposal.authorName.charAt(0) : '創'}
              </div>
              <div>
                <div className="font-black text-sm flex items-center gap-2">
                  <span className={getUserNameColorClass(proposal.authorId, undefined, { name: proposal.authorName })}>
                    {authorInfo.displayText}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    參賽團隊
                  </span>
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  發布時間：{new Date(proposal.createdAt).toLocaleDateString('zh-TW')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-stone-500">
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/30" />
                <span className="font-bold text-stone-800">{proposal.likeCount || 0}</span> 按讚
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-stone-800">{proposal.commentsCount || 0}</span> 則留言
              </span>
            </div>
          </div>
        </section>

        {/* 2. 創星幣模擬募資注資橫條 */}
        <section className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 rounded-3xl p-5 sm:p-6 border-2 border-amber-300 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="font-black text-stone-900 text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>使用 創星幣 支持你認同的創新提案</span>
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                模擬市場關注度驗證，推升競賽排名與人氣指數
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-amber-900 text-xl sm:text-2xl">
                {(proposal.supportPoints || 0).toLocaleString()}
              </span>
              <span className="text-xs text-amber-950 font-bold ml-1.5">創星幣</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-600 bg-white/70 px-3.5 py-2.5 rounded-xl border border-amber-200/60">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-500" />
              <span>支持人次：<strong className="text-stone-900 font-mono font-bold">{proposal.supporterCount || 0}</strong> 人</span>
            </span>
            <span className="text-[11px] text-amber-900 font-medium">
              全網人氣排名累計中
            </span>
          </div>

          {onSupport && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSupport(proposal)}
                className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span>使用 創星幣 支持此提案</span>
              </button>
            </div>
          )}
        </section>

        {/* 3. 關聯痛點來源資訊（解方提案才顯示） */}
        {proposal.sourcePainPointTitle && (
          <section className="bg-emerald-50/80 rounded-3xl p-5 sm:p-6 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>本解方提案採用的來源痛點</span>
            </div>
            <p className="text-stone-800 font-bold text-sm bg-white/80 p-3 rounded-2xl border border-emerald-100">
              {proposal.sourcePainPointTitle}
            </p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              ★ 獲專家評審評定為前三名獲獎解方時，此痛點提出者將一併獲得激勵獎勵！
            </p>
          </section>
        )}

        {/* 4. 痛點專用：針對此痛點立即提案 CTA */}
        {proposal.stage === 'pain_point' && onSolvePainPoint && (
          <section className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/90 rounded-3xl p-5 sm:p-6 border-2 border-amber-400 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-sm shadow-2xs">
                  💡
                </div>
                <h3 className="font-black text-stone-950 text-base">針對此痛點提出創新方案</h3>
              </div>
              <span className="text-xs font-bold text-amber-900 bg-amber-200 px-3 py-1 rounded-full border border-amber-300">
                直用提案頁
              </span>
            </div>
            <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">
              你有解決此痛點的產品想法、技術解法或商業模式嗎？點擊立即提出解方，系統將自動為你預選並帶入此題目！
            </p>
            <button
              type="button"
              onClick={() => onSolvePainPoint(proposal)}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-stone-950" />
              <span>我有解方，針對此痛點立即提案</span>
            </button>
          </section>
        )}

        {/* 5. 提案摘要與執行方案 */}
        <section className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200/90 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-stone-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>提案核心摘要</span>
            </h3>
            <div className="text-stone-700 text-sm leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-200/80 font-medium">
              {proposal.summary}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-stone-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>{proposal.stage === 'pain_point' ? '痛點深入說明' : '詳細執行方案與創新價值'}</span>
            </h3>
            <div className="text-stone-700 text-sm leading-relaxed bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200/80 whitespace-pre-line font-medium">
              {proposal.description || proposal.summary}
            </div>
          </div>

          {/* 相片/展示圖片 */}
          {proposal.images && proposal.images.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>專案圖片與雛形照片展示</span>
                </span>
                <span className="text-xs text-stone-400 font-mono">共 {proposal.images.length} 張</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {proposal.images.map((img, idx) => (
                  <div key={idx} className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-video shadow-2xs group relative">
                    <img src={img} alt={`提案圖片-${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 補充資料區塊 */}
          {(proposal.technicalFeasibility || proposal.marketAnalysis || proposal.businessModelFinancials || proposal.externalLink) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <h4 className="font-black text-amber-950 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>提案補充資料與延伸連結</span>
              </h4>

              {proposal.technicalFeasibility && (
                <div className="bg-white p-3 rounded-xl border border-amber-200/60 text-xs">
                  <div className="font-bold text-stone-900 mb-1">• 技術可行性說明</div>
                  <p className="text-stone-700 whitespace-pre-line leading-relaxed">{proposal.technicalFeasibility}</p>
                </div>
              )}

              {proposal.marketAnalysis && (
                <div className="bg-white p-3 rounded-xl border border-amber-200/60 text-xs">
                  <div className="font-bold text-stone-900 mb-1">• 市場分析與定位</div>
                  <p className="text-stone-700 whitespace-pre-line leading-relaxed">{proposal.marketAnalysis}</p>
                </div>
              )}

              {proposal.businessModelFinancials && (
                <div className="bg-white p-3 rounded-xl border border-amber-200/60 text-xs">
                  <div className="font-bold text-stone-900 mb-1">• 商業模式與財務預測</div>
                  <p className="text-stone-700 whitespace-pre-line leading-relaxed">{proposal.businessModelFinancials}</p>
                </div>
              )}

              {proposal.externalLink && (
                <div className="bg-white p-3 rounded-xl border border-amber-200/60 flex items-center justify-between gap-2 text-xs">
                  <div className="truncate text-stone-700">
                    <span className="font-bold text-stone-900 mr-2">• 外部連結:</span>
                    <a href={proposal.externalLink} target="_blank" rel="noreferrer" className="text-amber-700 underline font-mono">
                      {proposal.externalLink}
                    </a>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                </div>
              )}
            </div>
          )}

          {/* 標籤列 */}
          {proposal.tags && proposal.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-stone-100">
              <span className="text-xs text-stone-400 font-bold">主題標籤：</span>
              {proposal.tags.map((tg, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200">
                  #{tg}
                </span>
              ))}
              {proposal.aiCategorized && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                  🤖 AI市場顧問智慧領域
                </span>
              )}
            </div>
          )}

          {/* 簡報或附件檔案 */}
          {proposal.attachmentUrl && (
            <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="font-bold text-stone-800 text-xs sm:text-sm truncate">
                  {proposal.attachmentName || '提案簡報與企劃附件'}
                </span>
              </div>
              <a
                href={proposal.attachmentUrl}
                download={proposal.attachmentName || 'proposal_attachment'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold shrink-0 transition-colors"
              >
                下載檔案
              </a>
            </div>
          )}
        </section>

        {/* 6. 社群留言與回饋討論串 */}
        <section className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>社群回饋與評審討論 ({comments.length})</span>
            </h3>
            <span className="text-xs text-stone-400 font-mono">共 {comments.length} 則回饋</span>
          </div>

          {/* 留言輸入框 */}
          <form onSubmit={handleCommentSubmit} className="space-y-2">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder={isLoggedIn ? '留下你對此提案的建議、合作想法或回饋意見...' : '登入後即可發表對此提案之專業建議與討論回饋...'}
              disabled={!isLoggedIn || isSubmittingComment}
              rows={3}
              className="w-full p-3.5 rounded-2xl border border-stone-200 text-xs sm:text-sm placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-stone-50 focus:bg-white transition-all disabled:opacity-60 resize-none"
            />
            <div className="flex justify-end gap-2">
              {!isLoggedIn ? (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>登入後參與討論</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || isSubmittingComment}
                  className="px-4 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingComment ? '傳送中...' : '發表回饋'}</span>
                </button>
              )}
            </div>
          </form>

          {/* 留言列表 */}
          <div className="space-y-3 pt-2">
            {isLoadingComments ? (
              <div className="text-center py-8 text-stone-400 text-xs">載入留言中...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                目前尚無留言，歡迎成為第一位為此提案提供見解的夥伴！
              </div>
            ) : (
              comments.map((comm) => (
                <div key={comm.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-[10px]">
                        {comm.authorName?.charAt(0) || 'U'}
                      </div>
                      <span className={`font-bold ${getUserNameColorClass(comm.authorId, undefined, { name: comm.authorName, role: comm.authorRole, title: comm.roleBadgeText })}`}>
                        {comm.authorName}
                      </span>
                      {comm.authorRole === 'expert' && (
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold text-[9px]">
                          評審顧問
                        </span>
                      )}
                      {comm.roleBadgeText && comm.authorRole !== 'expert' && (
                        <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-700 font-bold text-[9px]">
                          {comm.roleBadgeText}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(comm.createdAt).toLocaleString('zh-TW')}
                    </span>
                  </div>
                  <p className="text-stone-700 leading-relaxed pl-8 whitespace-pre-line font-medium">
                    {comm.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 7. 底部固定返回動作列（上下留一組就好，分享與收藏常駐頂部導覽列） */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回提案列表</span>
          </button>
        </div>
      </main>
    </div>
  );
};

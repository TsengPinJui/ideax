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
  Edit3,
  Undo2,
  Paperclip,
  Award,
  Coins,
  Star,
  ThumbsUp,
} from 'lucide-react';
import {
  StarSeasonProposal,
  ProposalComment,
  STAR_SEASON_TRACKS,
  getProposalCardAuthorText,
} from '../../types/competition';
import { getProposalShareUrl, getBaseUrl } from '../../services/seoService';
import { shareOrCopyUrl, copyPureUrl } from '../../utils/shareUtils';
import { getUserNameColorClass } from '../../utils/userDisplay';
import { useApp } from '../../context/AppContext';
import { MindMapSection } from '../mindmap/MindMapSection';
import {
  extractProposalSections,
  extractProposalAttachments,
} from '../../utils/proposalContentHelper';
import { ProposalRichContentDisplay } from './ProposalRichContentDisplay';
import { withdrawCompetitionProposal } from '../../services/competitionAdminSync';
import { findReferencedPainPoint, findProposalsReferencingPainPoint } from '../../utils/painPointLinking';
import { isGuestPreviewOnly } from '../../utils/guestAccess';
import { getYoutubeEmbedUrl } from '../../utils/youtubeUtils';

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
  onEditProposal?: (proposal: StarSeasonProposal) => void;
  onWithdrawProposal?: (proposal: StarSeasonProposal) => void;
  showToast?: (msg: string) => void;
  allProposals?: StarSeasonProposal[];
  onSelectProposal?: (proposal: StarSeasonProposal) => void;
  isFromCreateIdeas?: boolean;
  /** 支持用的幣別：創點子提案用點數打賞（points），創星季用創星幣（star，預設） */
  supportCurrency?: 'points' | 'star';
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
  onEditProposal,
  onWithdrawProposal,
  showToast,
  allProposals = [],
  onSelectProposal,
  isFromCreateIdeas: isFromCreateIdeasProp = false,
  supportCurrency = 'star',
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [shared, setShared] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const {
    currentUser,
    questions,
    answers,
    setSelectedQuestion,
    isSimulatedDataPurged,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
    toggleLikeDiscussionAnswer,
    isDiscussionAnswerLiked,
    getDiscussionAnswerLikesCount,
  } = useApp();
  const isBookmarked = isQuestionBookmarked(proposal.id);
  const [localLikedCommentIds, setLocalLikedCommentIds] = useState<string[]>([]);

  const referencedPainPointProposal = React.useMemo(() => {
    if (!proposal.sourcePainPointTitle && !proposal.referencedPainPoint) return null;
    const targetStr = (proposal.sourcePainPointTitle || proposal.referencedPainPoint || '').trim();
    if (!targetStr) return null;
    return (allProposals || []).find((p) => {
      if (p.id === proposal.id) return false;
      return (
        p.id === targetStr ||
        targetStr.includes(p.id) ||
        p.title === targetStr ||
        targetStr.includes(p.title) ||
        (p.title.length > 5 && targetStr.includes(p.title))
      );
    }) || null;
  }, [proposal, allProposals]);

  const referencedPainPointQuestion = React.useMemo(() => {
    return findReferencedPainPoint(proposal as any, questions || []);
  }, [proposal, questions]);

  const referencingProposalsList = React.useMemo(() => {
    if (proposal.stage !== 'pain_point') return [];
    const fromProposals = (allProposals || []).filter((p) => {
      if (p.id === proposal.id) return false;
      const refStr = (p.sourcePainPointTitle || p.referencedPainPoint || '').trim();
      if (!refStr) return false;
      return (
        refStr.includes(proposal.id) ||
        refStr.includes(proposal.title) ||
        (proposal.title.length > 5 && refStr.includes(proposal.title))
      );
    });
    const fromQuestions = findProposalsReferencingPainPoint(proposal as any, questions || []);
    const merged: any[] = [...fromProposals];
    fromQuestions.forEach((q) => {
      if (!merged.some((m) => m.id === q.id)) {
        merged.push({
          ...q,
          summary: q.description,
          isMarketQuestion: true,
        });
      }
    });
    return merged;
  }, [proposal, allProposals, questions]);

  // 自資料庫已同步之 questions.tipsHistory 讀取打賞紀錄（不硬編碼）
  const simulatedTipsList = React.useMemo(() => {
    const matchedQ = (questions || []).find((q) => q.id === proposal.id);
    if (matchedQ?.tipsHistory && matchedQ.tipsHistory.length > 0) {
      return isSimulatedDataPurged
        ? matchedQ.tipsHistory.filter((t) => !t.isSimulated && !t.id.startsWith('tip-sim-'))
        : matchedQ.tipsHistory;
    }
    return [];
  }, [proposal.id, questions, isSimulatedDataPurged]);

  const isFromCreateIdeas = React.useMemo(() => {
    if (isFromCreateIdeasProp) return true;
    if (typeof window === 'undefined') return false;
    try {
      const url = new URL(window.location.href);
      return (
        sessionStorage.getItem('ideax_from_create_ideas') === 'true' ||
        url.searchParams.get('zone') === 'create_ideas'
      );
    } catch {
      return false;
    }
  }, [isFromCreateIdeasProp]);
  const isFromCreate = isFromCreateIdeas;
  // 創點子的提案用「點數」打賞；創星幣只在創星季競賽使用
  const usePoints = supportCurrency === 'points';
  const supportUnit = usePoints ? '點' : '創星幣';

  // 分享出去（帶文字說明推薦引言，直通 LINE、FB、IG、Threads 等社群；降級時複製純網址）

  // 2. 分享出去（帶文字說明推薦引言，直通 LINE、FB、IG、Threads 等社群）
  const handleShareWithText = async () => {
    // 從創點子進來的提案：分享創點子的獨立提案頁網址
    const canonicalUrl = isFromCreateIdeasProp ? `${getBaseUrl()}/ideas/${encodeURIComponent(proposal.id)}` : getProposalShareUrl(proposal.id);
    const trackInfo = STAR_SEASON_TRACKS[proposal.track] || STAR_SEASON_TRACKS.ai_applications;
    const shareTitle = usePoints ? `【IdeaX 創點子】${proposal.title}` : `【IdeaX 創星季】${proposal.title}`;
    const shareText = usePoints
      ? `【IdeaX 創點子 • 創新提案】${proposal.title}\n✦ 提案摘要：${proposal.summary || '邀請您一同來看看這個創新提案！'}\n`
      : `【IdeaX 創星季 • 創新提案】${proposal.title}\n✦ 賽道領域：${trackInfo.name}\n✦ 目前注資創星幣：${(proposal.supportPoints || (proposal as any).raisedPoints || 0).toLocaleString()} 創星幣\n✦ 提案摘要：${proposal.summary || '邀請您一同探索青年跨領域創新解方，為高潛力提案注資創星幣！'}\n`;

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

  const isAuthor = Boolean(
    currentUser &&
    currentUser.id !== 'user-guest' &&
    (currentUser.id === proposal.authorId ||
      currentUser.name === proposal.authorName ||
      (currentUser.email && (proposal as any).authorEmail === currentUser.email))
  );

  const handleEditThisProposal = () => {
    sessionStorage.setItem('ideax_challenge_load_proposal_id', proposal.id);
    if (onEditProposal) {
      onEditProposal(proposal);
    } else {
      window.location.href = `/challenge?subView=submit`;
    }
  };

  const handleWithdrawThisProposal = () => {
    if (
      !window.confirm(
        '確定要撤回此提案嗎？\n\n撤回後本提案將自官方審核清單與公開展示中移除，並保留完整資料轉為「暫存草稿」，您可以隨時修改後重新發布！'
      )
    ) {
      return;
    }
    const res = withdrawCompetitionProposal(proposal.id, currentUser?.id);
    if (res.success) {
      showToast?.('提案已成功撤回為草稿！');
      if (onWithdrawProposal) {
        onWithdrawProposal(proposal);
      } else {
        onBack();
      }
    } else {
      showToast?.(res.message);
    }
  };

  const sections = extractProposalSections(proposal);
  const attachments = extractProposalAttachments(proposal);

  const authorInfo = getProposalCardAuthorText(proposal);

  // 訪客瀏覽規則：列表第 17～20 則僅開放預覽（只顯示前兩張圖片，其餘內容需登入）
  const guestPreviewOnly = (!currentUser || currentUser.id === 'user-guest') && isGuestPreviewOnly(proposal.id);
  const guestPreviewImages = (proposal.images || []).filter(Boolean).slice(0, 2);

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
              title={isFromCreate ? "返回上一頁" : "返回提案總覽"}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isFromCreate ? "返回上一頁" : "返回列表"}</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-medium truncate">
              <span>/</span>
              <span className="text-stone-600">{isFromCreate ? "創點子" : "創星季提案"}</span>
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

            {/* ⭐ 收藏按鈕 */}
            <button
              type="button"
              onClick={() => {
                const isAdded = toggleBookmarkQuestion(proposal.id);
                showToast?.(isAdded ? '⭐ 已收藏並收錄至「我的按讚收藏」' : '已取消收藏');
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                isBookmarked
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-amber-50 hover:text-amber-700'
              }`}
              title={isBookmarked ? '⭐ 已收藏' : '⭐ 收藏'}
            >
              <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
              <span>{isBookmarked ? '已收藏' : '收藏'}</span>
            </button>

            {/* ❤️ Like（創新提案）或 🔥 +1 附議（痛點） */}
            {proposal.stage === 'pain_point' ? (
              <button
                type="button"
                onClick={() => onToggleLike(proposal.id)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                  isLiked
                    ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                    : 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100'
                }`}
                title="🔥 +1 附議此痛點"
              >
                <span>🔥 +1 附議</span>
                <span className="font-mono">({proposal.likeCount || 0})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onToggleLike(proposal.id)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                  isLiked
                    ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                    : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                }`}
                title={isLiked ? '❤️ 已 Like' : '❤️ Like 此提案'}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                <span>Like</span>
                <span className="font-mono">({proposal.likeCount || 0})</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 主要提案頁面內容容器 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 space-y-6">
        {/* 1. 提案頂部標題區塊 */}
        <section id="module-header" className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200/90 shadow-sm space-y-4">
          {/* 賽道與階段標籤 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-black px-3 py-1 rounded-full ${
              proposal.stage === 'pain_point'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {proposal.stage === 'pain_point' ? '第一階段：徵點子（痛點）' : '第二階段：創新提案'}
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
              {proposal.stage === 'pain_point' ? (
                <span className="flex items-center gap-1.5">
                  <span className="font-bold text-orange-700">🔥 +1 附議</span>
                  <span className="font-bold text-stone-800">{proposal.likeCount || 0}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500/30" />
                  <span className="font-bold text-stone-800">{proposal.likeCount || 0}</span> Like
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-stone-800">{proposal.commentsCount || 0}</span> 則留言
              </span>
            </div>
          </div>
        </section>

        {guestPreviewOnly ? (
          <section className="space-y-4">
            {guestPreviewImages.length > 0 && (
              <div className={`grid gap-3 ${guestPreviewImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {guestPreviewImages.map((img, idx) => (
                  <div key={idx} className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-video">
                    <img
                      src={img}
                      alt={`展示圖片-${idx + 1}`}
                      loading="lazy"
                      onError={(e) => {
                        const cell = (e.currentTarget as HTMLImageElement).parentElement;
                        if (cell) cell.style.display = 'none';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-6 text-center">
              <h3 className="text-base sm:text-lg font-black text-stone-900">登入即可查看完整內容</h3>
              <p className="mt-1.5 text-xs sm:text-sm text-stone-500">{usePoints ? '提案內容、點數打賞與留言討論需登入後瀏覽。' : '提案內容、注資創星幣與留言討論需登入後瀏覽。'}</p>
              <button
                type="button"
                onClick={() => onOpenAuth?.()}
                className="mt-4 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-black text-stone-950 cursor-pointer"
              >
                免費登入 / 註冊
              </button>
            </div>
          </section>
        ) : (
        <>
        {/* 2. ［注資創星幣］橫條 */}
        <section id="module-support" className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 rounded-3xl p-5 sm:p-6 border-2 border-amber-300 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="font-black text-stone-900 text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{usePoints ? '用點數打賞支持你認同的創新提案' : '注資創星幣支持你認同的創新提案'}</span>
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                為優質作品表達認同與期待，推升點子排名與人氣指數
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-amber-900 text-xl sm:text-2xl">
                {(proposal.supportPoints || 0).toLocaleString()}
              </span>
              <span className="text-xs text-amber-950 font-bold ml-1.5">{supportUnit}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-600 bg-white/70 px-3.5 py-2.5 rounded-xl border border-amber-200/60">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-500" />
              <span>{usePoints ? '打賞人次' : '注資人次'}：<strong className="text-stone-900 font-mono font-bold">{proposal.supporterCount || 0}</strong> 人</span>
            </span>
            <span className="text-[11px] text-amber-900 font-bold flex items-center gap-1">
              <span>刊登狀態：</span>
              <strong className="text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                {proposal.unpublishAt ? `刊登至 ${proposal.unpublishAt} 止` : '♾️ 預設永久刊登'}
              </strong>
            </span>
          </div>

          {onSupport && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSupport(proposal)}
                className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <Coins className="w-4 h-4 text-amber-950" />
                <span>{usePoints ? '打賞點數' : '注資創星幣'}</span>
              </button>
            </div>
          )}
        </section>

        {/* 3. 關聯痛點與引用痛點資訊 (支援點擊雙向跳轉) */}
        {(proposal.sourcePainPointTitle || proposal.referencedPainPoint) && (
          <section id="module-painpoint" className="bg-emerald-50/80 rounded-3xl p-5 sm:p-6 border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>本解方提案採用的來源/引用痛點</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                痛點許願池
              </span>
            </div>

            {(referencedPainPointProposal || referencedPainPointQuestion) ? (
              <div
                onClick={() => {
                  if (referencedPainPointQuestion) {
                    setSelectedQuestion(referencedPainPointQuestion);
                  } else if (referencedPainPointProposal && onSelectProposal) {
                    onSelectProposal(referencedPainPointProposal);
                  }
                }}
                className="p-3.5 rounded-2xl bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group space-y-1.5 active:scale-[0.99]"
                title="點擊前往查看此痛點完整需求與討論"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
                    {referencedPainPointProposal?.title || referencedPainPointQuestion?.title}
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    +{referencedPainPointProposal?.supporterCount || referencedPainPointQuestion?.secondedCount || 18} 附議
                  </span>
                </div>
                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                  {referencedPainPointProposal?.summary || referencedPainPointQuestion?.description}
                </p>
                <div className="flex items-center justify-between text-xs text-stone-400 pt-1.5 border-t border-emerald-100">
                  <span className="text-stone-700 font-medium">
                    👤 {referencedPainPointProposal?.authorName || referencedPainPointQuestion?.authorName}
                  </span>
                  <span className="text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    前往痛點貼文 ➔
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-stone-800 font-bold text-sm bg-white/80 p-3 rounded-2xl border border-emerald-100">
                {proposal.sourcePainPointTitle || proposal.referencedPainPoint}
              </p>
            )}

            {proposal.sourcePainPointTitle && (
              <p className="text-xs text-emerald-700 leading-relaxed">
                ★ 獲專家評審評定為前三名獲獎解方時，此痛點提出者將一併獲得激勵獎勵！
              </p>
            )}
          </section>
        )}

        {/* 痛點專用：引用此痛點之創新提案與解答（雙向關聯追蹤與互聯） */}
        {proposal.stage === 'pain_point' && (
          <section className="bg-amber-50/70 rounded-3xl p-5 sm:p-6 border border-amber-300 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-stone-950 font-black text-sm sm:text-base">
                <div className="w-7 h-7 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center font-black text-sm shadow-2xs">
                  💡
                </div>
                <span>解決此痛點的提案（{referencingProposalsList.length} 件）</span>
              </div>
              <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                雙向關聯追蹤
              </span>
            </div>

            {referencingProposalsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {referencingProposalsList.map((refP) => (
                  <div
                    key={refP.id}
                    onClick={() => {
                      const matchedInAll = (allProposals || []).find((p) => p.id === refP.id);
                      if (matchedInAll && onSelectProposal) {
                        onSelectProposal(matchedInAll);
                      } else {
                        const matchedQ = (questions || []).find((q) => q.id === refP.id) || refP;
                        setSelectedQuestion(matchedQ);
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-2.5 active:scale-[0.99]"
                    title="點擊前往查看此提案詳情"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {refP.postType === 'vibecoding_app' ? '💻 軟體提案' : '💡 創新提案'}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-amber-700">
                          🪙 {(refP.supportPoints || (usePoints ? 0 : 500)).toLocaleString()} {supportUnit}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                        {refP.title}
                      </h4>
                      <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                        {refP.summary || refP.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                      <span className="font-medium text-stone-700 truncate max-w-[150px] sm:max-w-[200px]">
                        👤 {refP.authorName}
                      </span>
                      <span className="text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform text-xs flex items-center gap-1">
                        前往提案貼文 ➔
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/90 border border-dashed border-amber-300 text-center space-y-2">
                <p className="text-xs text-stone-600 font-medium">
                  目前尚無競賽提案引用此痛點，歡迎成為第一位針對此痛點提出創新方案的團隊！
                </p>
                {onSolvePainPoint && (
                  <button
                    type="button"
                    onClick={() => onSolvePainPoint(proposal)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-black transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>為此痛點提案參賽</span>
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* 希望達成的目標 (選填展示) */}
        {proposal.targetGoal && (
          <section className="bg-amber-50/80 rounded-3xl p-5 sm:p-6 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
              <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
              <span>［希望達成的目標］</span>
            </div>
            <p className="text-stone-800 font-medium text-sm bg-white/80 p-3.5 rounded-2xl border border-amber-200/80 leading-relaxed">
              {proposal.targetGoal}
            </p>
          </section>
        )}

        {/* 心智圖（作者選填，存在原本的提案資料上） */}
        <MindMapSection data={(questions || []).find((q) => q.id === proposal.id)?.mindMap} className="rounded-3xl sm:p-6" />

        {/* 4. 痛點專用：針對此痛點提案雙軌 CTA */}
        {proposal.stage === 'pain_point' && (
          <section className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/90 rounded-3xl p-5 sm:p-6 border-2 border-amber-400 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-sm shadow-2xs">
                  💡
                </div>
                <h3 className="font-black text-stone-950 text-base">針對此痛點提出創新方案</h3>
              </div>
              <span className="text-xs font-bold text-amber-900 bg-amber-200 px-3 py-1 rounded-full border border-amber-300">
                雙軌提案
              </span>
            </div>
            <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">
              你有解決此痛點的產品想法、技術解法或商業模式嗎？您可以選擇<strong>「提案參賽(不賺賞金)」</strong>角逐創星季高額獎項與榮譽，或選擇<strong>「提案懸賞(不參賽)」</strong>在市場獲取商業賞金！
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {onSolvePainPoint && (
                <button
                  type="button"
                  onClick={() => onSolvePainPoint(proposal)}
                  className="py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                  title="以本痛點為題目投入創星季競賽，角逐競賽大獎（不賺取發布者賞金）"
                >
                  <Sparkles className="w-4 h-4 text-stone-950" />
                  <span>提案參賽(不賺賞金)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  try {
                    window.history.pushState({}, '', `/?q=${proposal.id}`);
                    window.dispatchEvent(new Event('popstate'));
                  } catch {}
                  onBack();
                }}
                className="py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                title="前往市場提交解答以獲取商業定價或懸賞（不參賽）"
              >
                <Award className="w-4 h-4 text-stone-950" />
                <span>提案懸賞(不參賽)</span>
              </button>
            </div>
          </section>
        )}

        {/* 作者專屬管理列：編輯與撤回 */}
        {isAuthor && (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/90 border-2 border-amber-300 flex items-center justify-between gap-3 flex-wrap shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-amber-950 text-sm">您是本提案之提交作者</div>
                <div className="text-xs text-stone-600">您可以隨時進行修改、預覽編輯成果，或撤回提案至草稿箱</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEditThisProposal}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 active:scale-98"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>編輯提案</span>
              </button>

              <button
                type="button"
                onClick={handleWithdrawThisProposal}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
                title="撤回至草稿箱"
              >
                <Undo2 className="w-3.5 h-3.5 text-rose-600" />
                <span>撤回為草稿</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. 提案核心摘要與詳細內容或企畫書 */}
        <section id="module-sections" className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200/90 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-stone-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>{proposal.stage === 'pain_point' ? '痛點簡述' : '核心摘要與創新價值'}</span>
            </h3>
            <div className="text-stone-700 text-sm leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-200/80 font-medium">
              {proposal.summary}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-stone-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>{proposal.stage === 'pain_point' ? '痛點深入說明' : '詳細內容或企畫書'}</span>
            </h3>

            {sections.length > 0 ? (
              <ProposalRichContentDisplay
                sections={sections}
                attachments={attachments}
              />
            ) : (
              <div className="text-stone-700 text-sm leading-relaxed bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200/80 whitespace-pre-line font-medium">
                {proposal.description || proposal.summary}
              </div>
            )}
          </div>

          {/* YouTube 介紹影片展示 */}
          {(() => {
            const ytEmbed = getYoutubeEmbedUrl(proposal.youtubeUrl, {
              autoplay: true,
              mute: false,
              controls: true,
            });
            if (!ytEmbed) return null;
            return (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center text-[10px] font-black">▶</span>
                    <span>YouTube 提案介紹影片</span>
                  </h3>
                  <a
                    href={proposal.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <span>前往 YouTube 觀看</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="rounded-2xl overflow-hidden border border-stone-200 bg-black aspect-video shadow-sm">
                  <iframe
                    src={ytEmbed}
                    title={`${proposal.title} - YouTube 介紹影片`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            );
          })()}

          {/* 圖片展示 (相片/展示圖片) */}
          {proposal.images && proposal.images.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>圖片展示</span>
                </span>
                <span className="text-xs text-stone-400 font-mono">共 {proposal.images.length} 張</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {proposal.images.map((img, idx) => (
                  <div key={idx} className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-video shadow-2xs group relative">
                    <img src={img} alt={`展示圖片-${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

        {/* 5.5 模擬注資創星幣紀錄 */}
        <section className="bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-yellow-50/80 rounded-3xl p-5 sm:p-6 border border-amber-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-200/70 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-2xs">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-stone-900 text-sm sm:text-base">
                  {usePoints ? '近期打賞紀錄' : '近期注資創星幣紀錄'} ({simulatedTipsList.length})
                </h3>
                <p className="text-[11px] text-stone-600">
                  {usePoints ? '來自會員的點數打賞與鼓勵留言' : '來自社群專家、投資人與會員的創星幣注資與鼓勵留言'}
                </p>
              </div>
            </div>
            {onSupport && (
              <button
                type="button"
                onClick={() => onSupport(proposal)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{usePoints ? '打賞點數' : '注資創星幣'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {simulatedTipsList.map((tip: any) => (
              <div
                key={tip.id}
                className="p-3.5 rounded-2xl bg-white/95 border border-amber-200/80 shadow-2xs flex flex-col justify-between gap-2"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={tip.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                        alt={tip.userName}
                        className="w-6 h-6 rounded-full object-cover border border-amber-200 shrink-0"
                      />
                      <span className="font-bold text-xs text-stone-900 truncate">
                        {tip.userName}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black text-[11px] shrink-0">
                      +🪙 {(usePoints ? tip.amount : tip.amount * 10).toLocaleString()} {supportUnit}
                    </span>
                  </div>
                  {tip.message && (
                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                      「{tip.message}」
                    </p>
                  )}
                </div>
                <div className="text-[10px] text-stone-400 font-mono text-right">
                  {(() => {
                    const pMs = Date.parse(proposal.createdAt || '') || 0;
                    const tMs = Date.parse(tip.createdAt || '') || 0;
                    return tMs > pMs ? tip.createdAt : new Date(pMs + 3600000 * 2).toISOString();
                  })()}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. 社群留言與回饋討論串 */}
        <section id="module-comments" className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200/90 shadow-sm space-y-5">
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
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
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
              comments.map((comm) => {
                const isAnsLiked = isDiscussionAnswerLiked(comm.id) || localLikedCommentIds.includes(comm.id);
                const baseAnsLikes = getDiscussionAnswerLikesCount(comm.id);
                const displayAnsLikes = baseAnsLikes > 0 ? baseAnsLikes : (localLikedCommentIds.includes(comm.id) ? 1 : 0);
                return (
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            toggleLikeDiscussionAnswer(comm.id);
                            setLocalLikedCommentIds((prev) =>
                              prev.includes(comm.id) ? prev.filter((id) => id !== comm.id) : [...prev, comm.id]
                            );
                          }}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                            isAnsLiked
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          title="👍 按讚此留言"
                        >
                          <ThumbsUp className={`w-3 h-3 ${isAnsLiked ? 'fill-white text-white' : ''}`} />
                          <span>{displayAnsLikes}</span>
                        </button>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {(() => {
                            const pMs = Date.parse(proposal.createdAt || '') || 0;
                            const cMs = Date.parse(comm.createdAt || '') || 0;
                            const safeTime = cMs > pMs ? comm.createdAt : new Date(pMs + 3600000 * 2).toISOString();
                            return new Date(safeTime).toLocaleString('zh-TW');
                          })()}
                        </span>
                      </div>
                    </div>
                    <p className="text-stone-700 leading-relaxed pl-8 whitespace-pre-line font-medium">
                      {comm.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        </>
        )}

        {/* 7. 底部固定返回動作列（上下留一組就好，分享與收藏常駐頂部導覽列） */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isFromCreate ? '返回上一頁' : '返回提案列表'}</span>
          </button>
        </div>
      </main>
    </div>
  );
};

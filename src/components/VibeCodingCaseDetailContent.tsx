import React, { useState } from 'react';
import { Question, Answer, Solver } from '../types';
import { User } from '../types';
import { ProposalChangelogSection } from './ProposalChangelogSection';
import {
  Terminal,
  Sparkles,
  ExternalLink,
  Code2,
  Bookmark,
  Share2,
  ThumbsUp,
  Coins,
  X,
  Flame,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  MessageCircle,
  MessageSquare,
  Cpu,
  Trophy,
  Tag,
  ArrowLeft,
  Globe,
  FileEdit,
  Trash,
  Flag,
  AlertTriangle,
  Send,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  Layers,
  ArrowRight,
  Rocket,
} from 'lucide-react';
import {
  resolveUserDisplayName,
  resolveUserAvatar,
  isUserAccountDeactivated,
  getUserNameColorClass,
} from '../utils/userDisplay';
import { findReferencedPainPoint } from '../utils/painPointLinking';

interface VibeCodingCaseDetailContentProps {
  question: Question;
  onClose: () => void;
  isFullPage?: boolean;
  currentUser: User;
  availableUsers: User[];
  solvers: Solver[];
  allQuestions?: Question[];
  onSelectQuestion?: (q: Question) => void;
  authorDisplayName: string;
  authorDisplayAvatar: string;
  isAuthorDeactivated: boolean;
  isAuthor: boolean;
  isAdmin: boolean;
  canUpdateProposal: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isLiked: boolean;
  likesCount: number;
  onToggleLike: () => void;
  onOpenTipModal: () => void;
  onOpenUpdateModal: () => void;
  onOpenUnifiedActionModal: () => void;
  onOpenConfirmDeleteModal: () => void;
  onOpenDisputeModal: () => void;
  onRelistQuestion: () => void;
  onShare: () => void;
  onPrivateChat: (targetUser: { id: string; name: string; avatar: string; title: string }) => void;
  onSearchTag?: (tag: string) => void;
  discussionAnswers: Answer[];
  quickComment: string;
  setQuickComment: (val: string) => void;
  onQuickCommentSubmit: (e: React.FormEvent) => void;
  onLikeDiscussion: (discId: string) => void;
  isDiscussionLiked: (discId: string) => boolean;
  getDiscussionLikesCount: (discId: string) => number;
  onDeleteDiscussion: (target: { id: string; type: 'solution' | 'discussion'; title?: string }) => void;
  onSelectSolver: (solver: Solver) => void;
}

export const VibeCodingCaseDetailContent: React.FC<VibeCodingCaseDetailContentProps> = ({
  question,
  onClose,
  isFullPage = false,
  currentUser,
  availableUsers,
  solvers,
  allQuestions = [],
  onSelectQuestion,
  authorDisplayName,
  authorDisplayAvatar,
  isAuthorDeactivated,
  isAuthor,
  isAdmin,
  canUpdateProposal,
  isBookmarked,
  onToggleBookmark,
  isLiked,
  likesCount,
  onToggleLike,
  onOpenTipModal,
  onOpenUpdateModal,
  onOpenUnifiedActionModal,
  onOpenConfirmDeleteModal,
  onOpenDisputeModal,
  onRelistQuestion,
  onShare,
  onPrivateChat,
  onSearchTag,
  discussionAnswers,
  quickComment,
  setQuickComment,
  onQuickCommentSubmit,
  onLikeDiscussion,
  isDiscussionLiked,
  getDiscussionLikesCount,
  onDeleteDiscussion,
  onSelectSolver,
}) => {
  // Resolve VibeCoding specific fields from publish payload or vibeCodingData
  const vibeData = (question as any).vibeCodingData;
  const coverImg =
    question.coverImage ||
    vibeData?.coverImageUrl ||
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&auto=format&fit=crop&q=80';

  const rawGallery: string[] =
    (question.galleryImages && question.galleryImages.length > 0
      ? question.galleryImages
      : question.screenshots && question.screenshots.length > 0
      ? question.screenshots
      : vibeData?.screenshots) || [];

  const demoUrl = question.demoUrl || vibeData?.demoUrl;
  const externalFileUrl =
    question.fileUrl && question.fileUrl !== demoUrl ? question.fileUrl : undefined;
  const versionLabel = question.currentVersion || question.version || 'v1.0.0';
  const subcategoryLabel = question.subcategory || vibeData?.appType || '網站程式';
  const referencedPainPointObj = findReferencedPainPoint(question, allQuestions || []);

  const techArchText =
    question.techArchitecture ||
    (vibeData?.techStack && Array.isArray(vibeData.techStack)
      ? vibeData.techStack.join(' + ')
      : '');

  const techPills = techArchText
    ? techArchText
        .split(/[+,、/|]+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  const aiToolsUsed: string[] = Array.isArray(vibeData?.aiToolsUsed) ? vibeData.aiToolsUsed : [];

  // Lightbox state for Cover + Gallery Screenshots
  const allPreviewImages = Array.from(new Set([coverImg, ...rawGallery].filter(Boolean)));
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const totalViews = question.views || question.viewsCount || 0;
  const totalTips = question.supportPoints || 0;

  return (
    <>
      <div
        className={`bg-white rounded-2xl sm:rounded-3xl border border-purple-200/90 shadow-md w-full overflow-hidden ${
          isFullPage
            ? 'max-w-4xl mx-auto my-2'
            : 'max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150'
        }`}
      >
        {/* 1. Top Sticky Header Bar (VibeCoding 專屬導覽列) */}
        <div className="p-3 sm:p-5 border-b border-purple-100 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-100 border border-white/15 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-purple-300" />
              <span>返回 VibeCoding 展場</span>
            </button>

            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-xs flex items-center gap-1.5 border border-purple-300/40">
              <Terminal className="w-3.5 h-3.5 text-purple-200" />
              <span>VibeCoding 展場案例</span>
            </span>

            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/10 text-purple-200 border border-white/15">
              {subcategoryLabel}
            </span>

            {versionLabel && (
              <span className="px-2.5 py-1 rounded-xl text-xs font-black font-mono bg-purple-500/30 text-purple-100 border border-purple-400/40">
                {versionLabel}
              </span>
            )}
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* 按讚支持 */}
            <button
              type="button"
              onClick={onToggleLike}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                isLiked
                  ? 'bg-purple-500 text-white border-purple-300 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-purple-100 border-white/15'
              }`}
              title="為此 VibeCoding 作品按讚支持"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-white text-white' : 'text-purple-300'}`} />
              <span>讚</span>
              {likesCount > 0 && <span className="font-mono">({likesCount})</span>}
            </button>

            {/* 收藏作品 */}
            <button
              type="button"
              onClick={onToggleBookmark}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                isBookmarked
                  ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-purple-100 border-white/15'
              }`}
              title={isBookmarked ? '已收藏作品' : '收藏此作品'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-stone-950 text-stone-950' : 'text-purple-300'}`} />
              <span className="hidden sm:inline">{isBookmarked ? '已收藏' : '收藏'}</span>
            </button>

            {/* 分享作品 */}
            <button
              type="button"
              onClick={onShare}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-purple-100 border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="分享此 VibeCoding 作品連結"
            >
              <Share2 className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden sm:inline">分享作品</span>
            </button>

            {/* 創作者/管理員刪除或管理 */}
            {(isAuthor || isAdmin) ? (
              <button
                type="button"
                onClick={isAdmin ? onOpenUnifiedActionModal : onOpenConfirmDeleteModal}
                className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 transition-colors cursor-pointer"
                title="管理或刪除此作品"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenDisputeModal}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 border border-white/15 transition-colors cursor-pointer"
                title="檢舉不當內容"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}

            {!isFullPage && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className={`p-3.5 sm:p-6 space-y-5 sm:space-y-6 ${!isFullPage ? 'overflow-y-auto' : ''}`}>
          {/* 違規下架官方處置說明 */}
          {question.status === 'delisted' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>此作品因違反平台規範已被管理員下架（前台展場已隱藏）</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onRelistQuestion}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>恢復上架</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenConfirmDeleteModal}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Trash className="w-3 h-3 text-rose-700" />
                      <span>永久抹除</span>
                    </button>
                  </div>
                )}
              </div>
              {question.delistedReason && (
                <p className="text-rose-800 font-medium">下架原因：{question.delistedReason}</p>
              )}
            </div>
          )}

          {/* 2. 作品標題 + 開發者資訊列 */}
          <div className="space-y-3.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 leading-snug tracking-tight">
              {question.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
              {/* Creator Profile */}
              <div className="flex items-center gap-3">
                <img
                  src={authorDisplayAvatar}
                  alt={authorDisplayName}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-purple-200 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-stone-900">
                      <span
                        className={getUserNameColorClass(question.authorId, availableUsers, {
                          isOfficial: question.isOfficial,
                          name: question.authorName,
                          title: question.authorTitle,
                        })}
                      >
                        {authorDisplayName}
                      </span>
                      {authorDisplayName !== '此帳號已註銷' && question.authorTitle && (
                        <span className="text-stone-500 font-normal text-xs"> · {question.authorTitle}</span>
                      )}
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      作品開發者
                    </span>

                    {!isAuthor && !isAuthorDeactivated && (
                      <button
                        type="button"
                        onClick={() =>
                          onPrivateChat({
                            id: question.authorId,
                            name: authorDisplayName,
                            avatar: authorDisplayAvatar,
                            title: question.authorTitle || 'VibeCoding 創作者',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3 text-purple-700" />
                        <span>私聊創作者</span>
                      </button>
                    )}

                    {canUpdateProposal && (
                      <button
                        type="button"
                        onClick={onOpenUpdateModal}
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <FileEdit className="w-3 h-3" />
                        <span>更新作品與日誌</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-0.5 flex-wrap">
                    <span>發布於 {question.createdAt.split('T')[0]}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-stone-400" />
                      <span>{totalViews.toLocaleString()} 次瀏覽</span>
                    </span>
                    <span className="flex items-center gap-1 text-purple-700 font-semibold">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{discussionAnswers.length} 則作品交流</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 打賞支持卡片按鈕 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenTipModal}
                  className="px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 border border-amber-300 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 hover:from-amber-200 hover:to-amber-100 text-amber-950 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Coins className="w-4 h-4 text-amber-600 fill-amber-400" />
                  <span>打賞支持創作者</span>
                  <span className="font-mono font-black text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded">
                    🪙 {(totalTips * 10).toLocaleString()} 點
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. 作品封面大圖 (Cover Image) + 線上體驗 Demo 網址 CTA */}
          <div className="rounded-2xl overflow-hidden border border-purple-200/90 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 shadow-sm">
            <div
              onClick={() => setLightboxIndex(0)}
              className="relative w-full h-52 sm:h-80 overflow-hidden bg-stone-950 cursor-pointer group"
            >
              <img
                src={coverImg}
                alt={question.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/20" />

              <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                <span className="bg-purple-600/90 text-white backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border border-purple-400/50 shadow-sm">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-200" />
                  <span>作品封面展示大圖</span>
                </span>
                {versionLabel && (
                  <span className="bg-black/60 text-purple-200 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-mono font-black border border-purple-400/40">
                    版本：{versionLabel}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(0);
                }}
                className="absolute bottom-3 right-3 bg-black/65 hover:bg-black/80 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5 text-purple-300" />
                <span>點擊放大檢視 ({allPreviewImages.length} 張圖)</span>
              </button>
            </div>

            {/* 網站網址或線上體驗 Demo 連結列 */}
            {(demoUrl || externalFileUrl) && (
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-purple-950/95 via-indigo-950/95 to-slate-900 border-t border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                    <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>網站網址或線上體驗 Demo 連結</span>
                  </div>
                  <p className="text-xs font-mono text-purple-200/90 truncate">
                    {demoUrl || externalFileUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {demoUrl && (
                    <a
                      href={demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                      <span>立即前往體驗 Demo 網站</span>
                    </a>
                  )}
                  {externalFileUrl && (
                    <a
                      href={externalFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-100 border border-white/20 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FolderGit2 className="w-3.5 h-3.5 text-purple-300" />
                      <span>補充參考資料 / 雲端連結</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. 引用相關痛點 & 希望達成的目標（對應發布表單雙欄，支援雙向互聯跳轉） */}
          {(referencedPainPointObj || question.referencedPainPoint || question.targetGoal) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 引用相關痛點 */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/90 via-orange-50/40 to-white border border-rose-300 shadow-2xs space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shadow-2xs">💡</span>
                    <span>欲解決之痛點洞察（引用痛點）</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    痛點許願池
                  </span>
                </div>

                {referencedPainPointObj ? (
                  <div
                    onClick={() => onSelectQuestion && onSelectQuestion(referencedPainPointObj)}
                    className="p-3 rounded-xl bg-white/95 border border-rose-200 hover:border-rose-400 hover:shadow-xs transition-all cursor-pointer group space-y-1.5 active:scale-[0.99]"
                    title="點擊前往查看此痛點完整需求與討論"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-stone-900 group-hover:text-rose-900 transition-colors line-clamp-1">
                        {referencedPainPointObj.title}
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                        +{referencedPainPointObj.secondedCount || 0} 附議
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                      {referencedPainPointObj.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-rose-100">
                      <div className="flex items-center gap-1">
                        <img
                          src={referencedPainPointObj.authorAvatar}
                          alt={referencedPainPointObj.authorName}
                          className="w-3.5 h-3.5 rounded-full object-cover"
                        />
                        <span className="text-stone-700 font-medium">{referencedPainPointObj.authorName}</span>
                      </div>
                      <span className="text-rose-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        前往痛點完整頁面 ➔
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-stone-800 font-medium bg-white/90 p-3 rounded-xl border border-rose-200/60 leading-relaxed">
                    {question.referencedPainPoint || '針對日常數位工作流痛點進行 AI 自動化與體驗重構'}
                  </p>
                )}
              </div>

              {/* 希望達成的目標 (下載量 / 里程碑) */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>［希望達成的目標］</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      下載量 / 里程碑
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800 font-medium bg-white/90 p-3 rounded-xl border border-amber-200/60 leading-relaxed">
                    🎯 {question.targetGoal || '持續迭代產品體驗並累積早期種子用戶回饋'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. 作品簡介與特色說明 (對應發布表單「作品簡介與特色說明 *」) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-2">
                <Code2 className="w-4.5 h-4.5 text-purple-600" />
                <span>作品簡介與特色說明</span>
              </h3>
              {vibeData?.oneLinePitch && (
                <span className="text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                  ✨ {vibeData.oneLinePitch}
                </span>
              )}
            </div>

            <div className="text-stone-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal bg-stone-50/60 p-3.5 sm:p-4 rounded-xl border border-stone-100">
              {question.description || '（尚無詳細作品說明）'}
            </div>

            {/* 關鍵字標籤 */}
            <div className="pt-2 border-t border-stone-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1 mr-1">
                <Tag className="w-3 h-3 text-stone-400" />
                <span>關鍵字標籤：</span>
              </span>
              {question.tags && question.tags.length > 0 ? (
                question.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (onSearchTag) {
                        onSearchTag(tag);
                      }
                    }}
                    className="text-xs font-bold px-2.5 py-0.5 rounded-lg transition-all cursor-pointer border text-purple-800 bg-purple-50 hover:bg-purple-100 border-purple-200/80"
                  >
                    #{tag}
                  </button>
                ))
              ) : (
                <span className="text-xs text-stone-400">#VibeCoding #網站程式</span>
              )}
            </div>
          </div>

          {/* 6. 技術架構 (Front-end / Back-end / AI 模型套件) */}
          {techArchText && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/90 via-indigo-50/50 to-white border border-purple-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-black text-sm text-purple-950 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span>技術架構 (Front-end / Back-end / AI 模型套件)</span>
                </h3>
                {aiToolsUsed.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-stone-500">AI 開發工具：</span>
                    {aiToolsUsed.map((tool, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200"
                      >
                        ⚡ {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {techPills.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {techPills.map((tech: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-white border border-purple-200 text-purple-950 font-mono font-bold text-xs shadow-2xs flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-purple-500" />
                      <span>{tech}</span>
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs font-mono text-stone-600 bg-white/80 px-3 py-2 rounded-xl border border-purple-100">
                完整技術棧：{techArchText}
              </p>
            </div>
          )}

          {/* 7. 功能介面與展示截圖 (0~6 張圖片圖集) */}
          {rawGallery.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>功能介面與展示截圖 ({rawGallery.length} / 6 張)</span>
                </h3>
                <span className="text-[11px] text-stone-400">點擊任一截圖可放大預覽</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {rawGallery.map((imgUrl, idx) => {
                  const previewIdx = allPreviewImages.indexOf(imgUrl);
                  return (
                    <div
                      key={idx}
                      onClick={() => setLightboxIndex(previewIdx >= 0 ? previewIdx : 0)}
                      className="group relative h-32 sm:h-40 rounded-xl overflow-hidden bg-stone-900 border border-stone-200 hover:border-purple-400 transition-all cursor-pointer shadow-2xs"
                    >
                      <img
                        src={imgUrl}
                        alt={`${question.title} 截圖 ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>放大檢視</span>
                        </span>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                        截圖 #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 8. 版本與更新日誌 (Changelog) */}
          <ProposalChangelogSection
            question={question}
            canUpdate={canUpdateProposal}
            onOpenUpdateModal={onOpenUpdateModal}
          />

          {/* 9. 作品試用回饋與技術交流留言區 */}
          <div className="space-y-4 pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-purple-600" />
                <span>作品試用回饋與技術交流（{discussionAnswers.length} 則留言）</span>
              </h3>
              <span className="text-xs text-stone-500">歡迎分享試用心得、功能建議或技術提問</span>
            </div>

            {/* 發表回饋表單 */}
            <form
              onSubmit={onQuickCommentSubmit}
              className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2.5"
            >
              <textarea
                rows={3}
                value={quickComment}
                onChange={(e) => setQuickComment(e.target.value)}
                placeholder="寫下您試用此 VibeCoding 作品的心得、功能許願、UI/UX 建議或技術架構交流..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-stone-900 text-xs sm:text-sm outline-none leading-relaxed bg-white"
              />
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-[11px] text-purple-800/80">
                  所有社群成員皆可免費參與作品回饋交流
                </span>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>發表作品回饋</span>
                </button>
              </div>
            </form>

            {/* 留言列表 */}
            {discussionAnswers.length === 0 ? (
              <div className="p-6 text-center bg-stone-50 rounded-2xl border border-stone-200">
                <MessageSquare className="w-7 h-7 text-purple-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-stone-700">目前尚無作品試用回饋</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  成為第一位試用作品並給創作者鼓勵或建議的夥伴吧！
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {discussionAnswers.map((disc) => {
                  const discDisplayName = resolveUserDisplayName(
                    disc.solverId,
                    disc.solverName,
                    availableUsers
                  );
                  const discDisplayAvatar = resolveUserAvatar(
                    disc.solverId,
                    disc.solverAvatar,
                    availableUsers
                  );
                  const isDiscDeactivated = isUserAccountDeactivated(
                    disc.solverId,
                    availableUsers
                  );
                  const canDeleteDisc =
                    currentUser.id === disc.solverId || currentUser.role === 'admin';

                  return (
                    <div
                      key={disc.id}
                      className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={discDisplayAvatar}
                            alt={discDisplayName}
                            onClick={() => {
                              if (isDiscDeactivated) return;
                              const found = solvers.find(
                                (s) => s.id === disc.solverId || s.name === disc.solverName
                              );
                              if (found) onSelectSolver(found);
                            }}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-stone-200"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs ${
                                  isDiscDeactivated
                                    ? 'text-stone-500 font-bold'
                                    : getUserNameColorClass(disc.solverId, availableUsers, {
                                        name: disc.solverName,
                                        title: disc.solverTitle,
                                        verifiedBadge: disc.solverBadge,
                                      })
                                }`}
                              >
                                {discDisplayName}
                                {discDisplayName !== '此帳號已註銷' && disc.solverTitle && (
                                  <span className="text-stone-500 font-normal">
                                    {' '}
                                    · {disc.solverTitle}
                                  </span>
                                )}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400">
                              {disc.createdAt.split('T')[0]}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!isDiscDeactivated && currentUser.id !== disc.solverId && (
                            <button
                              type="button"
                              onClick={() =>
                                onPrivateChat({
                                  id: disc.solverId,
                                  name: discDisplayName,
                                  avatar: discDisplayAvatar,
                                  title: disc.solverTitle,
                                })
                              }
                              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-stone-600 hover:text-purple-800 hover:bg-purple-50 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3 h-3 text-purple-600" />
                              <span>私聊</span>
                            </button>
                          )}

                          {canDeleteDisc && (
                            <button
                              type="button"
                              onClick={() =>
                                onDeleteDiscussion({
                                  id: disc.id,
                                  type: 'discussion',
                                  title: disc.freePreview
                                    ? disc.freePreview.slice(0, 30)
                                    : '此回饋留言',
                                })
                              }
                              className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                            >
                              <Trash className="w-3 h-3 text-rose-600" />
                              <span>刪除</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line pl-10 font-normal">
                        {disc.freePreview}
                      </div>

                      <div className="pl-10 pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onLikeDiscussion(disc.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                            isDiscussionLiked(disc.id)
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs font-black'
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          <ThumbsUp
                            className={`w-3.5 h-3.5 ${
                              isDiscussionLiked(disc.id) ? 'fill-white text-white' : 'text-stone-400'
                            }`}
                          />
                          <span>讚</span>
                          {(getDiscussionLikesCount(disc.id) > 0 || (disc.likes || 0) > 0) && (
                            <span className="font-mono text-[11px] font-black">
                              {getDiscussionLikesCount(disc.id) || disc.likes || 0}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 10. Sticky Bottom Action Bar (VibeCoding 專屬底欄) */}
        <div className="p-3.5 sm:p-4 border-t border-purple-100 bg-stone-50/95 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sticky bottom-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="text-xs text-stone-500 hidden lg:block">
            <span>
              💡 喜歡這件 VibeCoding 作品嗎？歡迎前往體驗線上網站、按讚收藏或打賞支持創作者持續迭代！
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-nowrap overflow-x-auto">
            {canUpdateProposal && (
              <button
                type="button"
                onClick={onOpenUpdateModal}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
              >
                <FileEdit className="w-3.5 h-3.5 shrink-0" />
                <span>更新作品與日誌</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-200 text-xs font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              返回展場
            </button>

            <button
              type="button"
              onClick={onOpenTipModal}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
            >
              <Coins className="w-3.5 h-3.5 shrink-0" />
              <span>打賞支持</span>
            </button>

            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span>前往體驗網站</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Cover & Gallery Images */}
      {lightboxIndex !== null && allPreviewImages[lightboxIndex] && (
        <div
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full flex flex-col items-center gap-3"
          >
            <div className="w-full flex items-center justify-between text-white px-2">
              <span className="text-xs font-mono font-bold text-purple-200">
                {lightboxIndex === 0 ? '作品封面大圖' : `展示截圖 #${lightboxIndex}`}（
                {lightboxIndex + 1} / {allPreviewImages.length}）
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full max-h-[80vh] flex items-center justify-center">
              {allPreviewImages.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex(
                      (lightboxIndex - 1 + allPreviewImages.length) % allPreviewImages.length
                    )
                  }
                  className="absolute left-2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 cursor-pointer z-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <img
                src={allPreviewImages[lightboxIndex]}
                alt="作品圖片預覽"
                className="max-h-[78vh] max-w-full object-contain rounded-2xl border border-white/15 shadow-2xl"
              />

              {allPreviewImages.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((lightboxIndex + 1) % allPreviewImages.length)
                  }
                  className="absolute right-2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 cursor-pointer z-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

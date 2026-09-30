import React, { useState, useEffect } from 'react';
import { Question, Answer, Solver, Category, AIPreliminaryReport } from '../types';
import { useApp } from '../context/AppContext';
import { LEVEL_CONFIGS } from '../data/mockData';
import { matchSolversWithAI, AISolverMatch, generatePreliminaryReportWithAI, getInitialPreliminaryReport } from '../services/aiService';
import { HelpTooltip } from './HelpTooltip';
import {
  X,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Eye,
  Award,
  Star,
  Send,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  ArrowLeft,
  MessageCircle,
  EyeOff,
  Search,
  Share2,
  Check,
  FileText,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Video,
  Calendar,
  Paperclip,
  Layers,
  Flag,
  ShieldAlert,
  AlertTriangle,
  Bookmark,
  Loader2,
  Tag,
  Edit,
  Trash,
  Crown,
  Copy,
  Compass,
  Lightbulb,
  FileSearch,
} from 'lucide-react';
import { SeoPreviewModal } from './SeoPreviewModal';
import { getQuestionShareUrl } from '../services/seoService';
import { copyToClipboard } from '../utils/clipboard';

interface QuestionDetailModalProps {
  question: Question;
  onClose: () => void;
  onOpenSubmitAnswer: (initialType?: 'discussion' | 'solution') => void;
  onSelectSolver: (solver: Solver) => void;
  onOpenChatWithUser?: (user: { id: string; name: string; avatar: string; title: string }) => void;
  onSelectCategory?: (category: Category, subcategory?: string | '全部') => void;
  isFullPage?: boolean;
  onSearchTag?: (tag: string) => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  question,
  onClose,
  onOpenSubmitAnswer,
  onSelectSolver,
  onOpenChatWithUser,
  onSelectCategory,
  isFullPage = false,
  onSearchTag,
}) => {
  const {
    currentUser,
    answers,
    solvers,
    commissionRate,
    acceptAnswer,
    inviteSolver,
    setTargetAnswerToUnlock,
    startDirectChat,
    submitAnswer,
    reportQuestionDispute,
    resolveDisputeRefund,
    acceptPhaseDelivery,
    releasePhasePayout,
    refundPhasePayout,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
    setQuestions,
    setSearchQuery,
    spendPoints,
    subscribePlan,
    incrementQuestionViews,
    isNoPaymentMode,
  } = useApp();

  useEffect(() => {
    if (question?.id) {
      incrementQuestionViews(question.id, 1);
    }
  }, [question?.id]);

  const isBookmarked = isQuestionBookmarked(question.id);

  // Edit Question State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(question.title);
  const [editDesc, setEditDesc] = useState(question.description);

  const [aiMatches, setAiMatches] = useState<AISolverMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [invitedSolvers, setInvitedSolvers] = useState<Record<string, boolean>>({});

  // Active Tab: 'solutions' (專業方案) vs 'discussions' (討論留言)
  const [activeTab, setActiveTab] = useState<'solutions' | 'discussions'>('solutions');

  // SEO & Share modal
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);

  // Dispute report state
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReasonInput, setDisputeReasonInput] = useState('');

  // Quick discussion comment input inside modal
  const [quickComment, setQuickComment] = useState('');

  // Acceptance review state
  const [acceptingAnswerId, setAcceptingAnswerId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Solution answers collapse / expand states (預設收合，點擊向下展開)
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);

  const toggleAnswerExpand = (answerId: string) => {
    setExpandedAnswers((prev) => ({
      ...prev,
      [answerId]: !prev[answerId],
    }));
  };

  // AI Preliminary Report (達人方案以上免費，一般會員可支付 50 點數解鎖)
  const userTier = currentUser?.subscriptionTier || 'free';
  const isProOrHigher = ['pro', 'expert', 'authority', 'master'].includes(userTier);
  const [preliminaryReport, setPreliminaryReport] = useState<AIPreliminaryReport>(() => {
    return question.aiPreliminaryReport || getInitialPreliminaryReport(question);
  });
  const [isReportUnlocked, setIsReportUnlocked] = useState<boolean>(() => {
    if (isProOrHigher) return true;
    if (question.aiPreliminaryReport?.unlockedUserIds?.includes(currentUser.id)) return true;
    return false;
  });
  const [activeReportTab, setActiveReportTab] = useState<'analysis' | 'solution' | 'direction'>('analysis');
  const [isReportExpanded, setIsReportExpanded] = useState<boolean>(false);
  const [isReportDownloaded, setIsReportDownloaded] = useState<boolean>(false);
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);

  const handleUnlockReport = async () => {
    if (!isProOrHigher) {
      if ((currentUser.balance || 0) < 50) {
        setUnlockNotice(`您的可用點數餘額不足 50 點（目前餘額 ${(currentUser.balance || 0)} 點）。請先儲值點數或升級達人方案享免費查看 50 次！`);
        return;
      }
      spendPoints(50, `解鎖【${question.title}】之 AI 初步問題分析與解題報告`);
    }
    setUnlockNotice(null);
    setIsReportUnlocked(true);
    setIsReportExpanded(true);
    // Fetch live Gemini AI preliminary report in background
    try {
      const liveReport = await generatePreliminaryReportWithAI(question);
      if (liveReport) {
        setPreliminaryReport(liveReport);
      }
    } catch {
      // Keep initial report
    }
  };

  const handleDownloadReport = () => {
    const text = `# IdeaX 初步分析完整報告
專案問題：${question.title}
生成時間：${new Date(preliminaryReport.generatedAt).toLocaleDateString()}

## 一、初步問題分析
核心診斷：${preliminaryReport.problemAnalysis.coreDiagnosis}
關鍵痛點拆解：
${preliminaryReport.problemAnalysis.painPointBreakdown.map((p) => `- ${p}`).join('\n')}
技術與商業阻礙：
${preliminaryReport.problemAnalysis.technicalOrBusinessBarriers.map((b) => `- ${b}`).join('\n')}

## 二、建議解決方案
戰略核心主軸：
${preliminaryReport.recommendedSolutions.strategicPillars.map((s) => `- ${s}`).join('\n')}
階梯式落地步驟：
${preliminaryReport.recommendedSolutions.phaseSteps.map((s) => `步驟 ${s.step}：${s.title} - ${s.desc}`).join('\n')}
預期成效：${preliminaryReport.recommendedSolutions.expectedOutcomes}

## 三、建議解題方向
適配領域：${preliminaryReport.solvingDirections.recommendedDomain}
專家必備特質：${preliminaryReport.solvingDirections.expertCompetencies.join('、')}
避坑與風險防護：
${preliminaryReport.solvingDirections.riskWarnings.map((w) => `- ${w}`).join('\n')}`;

    // Add UTF-8 BOM (\uFEFF) so that text editors and Windows Notepad render Chinese characters cleanly without garbled text (亂碼)
    const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (question.title || '初步分析完整報告').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 30);
    link.download = `IdeaX_${safeTitle}_初步分析報告.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsReportDownloaded(true);
    setTimeout(() => setIsReportDownloaded(false), 2000);
  };

  // Filter answers for this question
  const questionAllAnswers = answers.filter((a) => a.questionId === question.id);
  const solutionAnswers = questionAllAnswers.filter((a) => a.type === 'solution' || !a.type);
  const discussionAnswers = questionAllAnswers.filter((a) => a.type === 'discussion');

  const levelConfig = (question?.level && LEVEL_CONFIGS[question.level]) || LEVEL_CONFIGS.L2 || {
    code: 'L2',
    name: '進階懸賞',
    description: '',
    example: '',
    rangeText: '',
    minPrice: 301,
    maxPrice: 899,
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  };
  const isAuthor = currentUser.id === question.authorId;

  // Load AI matches
  useEffect(() => {
    let isMounted = true;
    setIsMatching(true);
    matchSolversWithAI(question, solvers)
      .then((matches) => {
        if (isMounted) {
          setAiMatches(matches);
          setIsMatching(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsMatching(false);
      });
    return () => {
      isMounted = false;
    };
  }, [question, solvers]);

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editDesc.trim()) return;
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === question.id
          ? { ...q, title: editTitle.trim(), description: editDesc.trim() }
          : q
      )
    );
    question.title = editTitle.trim();
    question.description = editDesc.trim();
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('確定要永久刪除此痛點/問題/討論嗎？此操作無法還原。')) {
      setQuestions((prev) => prev.filter((q) => q.id !== question.id));
      onClose();
    }
  };

  const handleInvite = (solverId: string) => {
    inviteSolver(question.id, solverId);
    setInvitedSolvers((prev) => ({ ...prev, [solverId]: true }));
  };

  const handleConfirmAccept = (ansId: string) => {
    acceptAnswer(ansId, reviewRating, reviewComment);
    setAcceptingAnswerId(null);
  };

  const handleQuickCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickComment.trim()) return;

    submitAnswer({
      questionId: question.id,
      type: 'discussion',
      deliveryType: '交流探討',
      freePreview: quickComment.trim(),
      isPaid: false,
      price: 0,
    });

    setQuickComment('');
    setActiveTab('discussions');
  };

  const handlePrivateChat = (targetUser: { id: string; name: string; avatar: string; title: string }) => {
    startDirectChat(targetUser, question);
    if (onOpenChatWithUser) {
      onOpenChatWithUser(targetUser);
    }
  };

  const handleShareQuestion = async () => {
    const shareUrl = getQuestionShareUrl(question.id);
    const shareText = `【IdeaX 懸賞問題】${question.title}\n${(question.bounty || 0) > 0 ? `懸賞 NT$ ${(question.bounty || 0).toLocaleString()} 元` : '免費探討交流'}\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: question.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if user dismissed native share
      }
    }

    await copyToClipboard(shareUrl);
    setIsShareCopied(true);
    setTimeout(() => setIsShareCopied(false), 2500);
  };

  const content = (
    <div className={`bg-white rounded-3xl border border-stone-200 shadow-sm w-full ${isFullPage ? 'max-w-4xl mx-auto my-2' : 'max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-stone-200 flex items-start justify-between gap-4 bg-white/95 sticky top-0 z-20">
        <div className="space-y-2">
          {isFullPage && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer mb-1"
            >
              <ArrowLeft className="w-4 h-4 text-amber-600" />
              <span>返回問題市場</span>
            </button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {onSelectCategory ? (
              <button
                type="button"
                onClick={() => {
                  onSelectCategory(question.category, '全部');
                  onClose();
                }}
                className="text-xs font-bold text-stone-800 bg-amber-50/80 hover:bg-amber-100 hover:text-stone-950 px-2.5 py-1 rounded-lg border border-amber-200/90 shadow-2xs transition-colors cursor-pointer"
                title={`前往「${question.category}」主分類版面`}
              >
                {question.category}
              </button>
            ) : (
              <span className="text-xs font-bold text-stone-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/90 shadow-2xs">
                {question.category}
              </span>
            )}

            {question.subcategory && (
              onSelectCategory ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory(question.category, question.subcategory);
                    onClose();
                  }}
                  className="text-xs font-bold text-amber-900 bg-white hover:bg-amber-500 hover:text-stone-950 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                  title={`進入「${question.subcategory}」子領域版面`}
                >
                  {question.subcategory}
                </button>
              ) : (
                <span className="text-xs font-semibold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                  {question.subcategory}
                </span>
              )
            )}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${levelConfig.badgeClass}`}>
              {question.level} · {levelConfig.name}
            </span>
            {question.status === 'delisted' ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> 已被管理員下架
              </span>
            ) : question.status === 'solved' ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 已採納方案・已結算
              </span>
            ) : (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                question.isFeatured
                  ? 'bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 text-white border-purple-400/60 shadow-xs'
                  : 'bg-amber-100 text-amber-900 border-amber-200'
              }`}>
                {question.isFeatured && (
                  <Sparkles className="w-3.5 h-3.5 text-purple-200 fill-purple-300 drop-shadow-xs animate-pulse" />
                )}
                <span className={question.isFeatured ? 'font-black text-white' : ''}>招募中</span>
              </span>
            )}
          </div>

          {/* 違規下架官方處置說明 */}
          {question.status === 'delisted' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>此提問因違反平台規範已被管理員強制下架</span>
              </div>
              {question.delistedReason && (
                <p className="text-rose-800 font-medium">違規原因：{question.delistedReason}</p>
              )}
              {question.delistedFeedback && (
                <p className="text-stone-700 bg-white/90 p-2.5 rounded-xl border border-rose-100 mt-1 leading-relaxed">
                  官方處置反饋：{question.delistedFeedback}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 justify-between flex-wrap">
            <div className="flex-1 min-w-[240px]">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-amber-400 focus:border-amber-600 outline-none rounded-xl text-base sm:text-lg font-black text-stone-900 bg-white shadow-2xs"
                />
              ) : (
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 leading-snug">
                  {question.title}
                </h1>
              )}
            </div>

            {isAuthor && (
              <div className="flex items-center gap-1.5 shrink-0">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
                    >
                      儲存
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-all cursor-pointer"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setEditTitle(question.title);
                        setEditDesc(question.description);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Trash className="w-3 h-3" />
                      刪除
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isNoPaymentMode ? (
            <div className="text-right shrink-0">
              <span className="text-[11px] font-semibold text-stone-500 block">無金流交流模式</span>
              <span className="text-xs sm:text-sm font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300">
                全站免費提案
              </span>
            </div>
          ) : (question.bounty || 0) > 0 ? (
            <div className="text-right shrink-0">
              <span className="text-[11px] font-semibold text-stone-500 block">懸賞獎金</span>
              <span className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                NT$ {(question.bounty || 0).toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="text-right shrink-0">
              <span className="text-[11px] font-semibold text-stone-500 block">問題等級</span>
              <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                L0 免費探討
              </span>
            </div>
          )}

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={() => toggleBookmarkQuestion(question.id)}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
              isBookmarked
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-600 hover:text-stone-900'
            }`}
            title={isBookmarked ? '已收藏（點擊取消收藏）' : '收藏此問題'}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500 text-amber-600' : 'text-stone-500'}`} />
            <span className="hidden sm:inline">{isBookmarked ? '已收藏' : '收藏'}</span>
          </button>

          {!isFullPage && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`p-4 sm:p-6 space-y-6 ${!isFullPage ? 'overflow-y-auto' : ''}`}>
        {/* Author info & metadata bar + 私聊按鈕 */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <img
              src={question.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={question.authorName}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-stone-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-800 text-sm">{question.authorName}</span>
                {/* 私聊按鈕 */}
                {!isAuthor && (
                  <button
                    onClick={() =>
                      handlePrivateChat({
                        id: question.authorId,
                        name: question.authorName,
                        avatar: question.authorAvatar,
                        title: '提問發起人',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="與提問發起人建立私密對話"
                  >
                    <MessageCircle className="w-3 h-3 text-amber-700" />
                    <span>私聊提問者</span>
                  </button>
                )}
              </div>
              <span className="text-[11px] text-stone-400">發布於 {question.createdAt.split('T')[0]}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>截止日：{question.deadline}</span>
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-stone-400" />
              <span>{(question.views || 0).toLocaleString()} 次瀏覽</span>
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>{solutionAnswers.length} 個方案</span>
            </span>
            <span className="flex items-center gap-1 text-stone-600 font-bold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{discussionAnswers.length} 則討論</span>
            </span>

            {/* 分享該問題按鈕 */}
            <button
              onClick={handleShareQuestion}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
                isShareCopied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-500 active:scale-95'
              }`}
              title="分享此懸賞問題連結"
            >
              {isShareCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>已複製分享連結！</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>分享問題</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Question Full Description & AI Tags Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>問題詳細背景與解題需求</span>
            </h3>
          </div>

          <div className="text-stone-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
            {isEditing ? (
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={6}
                className="w-full p-3 border border-amber-400 focus:border-amber-600 outline-none rounded-xl text-xs sm:text-sm bg-white font-normal leading-relaxed focus:ring-2 focus:ring-amber-100"
                placeholder="請輸入痛點或討論的詳細需求與內容..."
              />
            ) : (
              <div>
                <div className={`relative ${!isDescExpanded && (question.description?.length || 0) > 200 ? 'max-h-24 overflow-hidden' : ''}`}>
                  <p className="whitespace-pre-line">{question.description || '（無詳細描述）'}</p>
                  {!isDescExpanded && (question.description?.length || 0) > 200 && (
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  )}
                </div>
                {(question.description?.length || 0) > 200 && (
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="mt-1.5 text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {isDescExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>收合需求說明</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>展開完整需求說明</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

            {/* Tags */}
            <div className="pt-2 border-t border-stone-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1 mr-1">
                <Tag className="w-3 h-3 text-stone-400" />
                <span>標籤：</span>
              </span>
              {question.tags && question.tags.length > 0 ? (
                question.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (onSearchTag) {
                        onSearchTag(tag);
                      } else {
                        setSearchQuery(tag);
                        onClose();
                      }
                    }}
                    className="text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 border border-amber-200/90 px-2.5 py-0.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                    title={`點擊搜尋「#${tag}」相關問題`}
                  >
                    #{tag}
                  </button>
                ))
              ) : (
                <span className="text-xs text-stone-400">系統已自動適配主要領域</span>
              )}
            </div>
        </div>

        {/* AI Structured Analysis Panel & Hanging Preliminary Report */}
        {question.aiAnalysis && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-400 text-stone-900 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 fill-stone-900" />
                </div>
                <h4 className="font-bold text-sm text-stone-900">AI 解題分析與建議</h4>
              </div>
              {question.aiAnalysis.marketFitRating && (
                <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
                  評級：{question.aiAnalysis.marketFitRating}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal">
              {question.aiAnalysis.summary}
            </p>

            {/* Structured need checklist */}
            <div className="pt-1">
              <p className="text-xs font-bold text-stone-800 mb-2">建議解答者應涵蓋的 3 大關鍵維度：</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {question.aiAnalysis.structuredNeed.map((need, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-amber-200/70 text-xs text-stone-800 flex items-start gap-2 shadow-2xs font-medium"
                  >
                    <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{need}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 懸掛在 AI 解題分析與建議 下方：IdeaX 初步分析完整報告（可解鎖，預設折疊，展開後模糊化，解鎖後去除模糊並可下載文字檔） */}
            <div className="mt-4 pt-3 border-t border-amber-200/80">
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950 text-white border border-amber-500/30 shadow-sm transition-all">
                {/* Collapsible Header / Trigger Bar */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsReportExpanded(!isReportExpanded)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsReportExpanded(!isReportExpanded); } }}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.03] transition-colors select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-extrabold text-xs sm:text-sm text-white tracking-tight truncate">
                          IdeaX 初步分析完整報告
                        </h5>
                        {isReportUnlocked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            已解鎖
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            50 點數 / 達人年費解鎖
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-300 truncate mt-0.5">
                        含初步問題分析、建議解決方案、建議解題方向
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-stone-400 hidden sm:inline-block">
                      {isReportExpanded ? '點擊收合' : '點擊展開報告'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-amber-300 transition-transform">
                      {isReportExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content Area */}
                {isReportExpanded && (
                  <div className="p-3.5 sm:p-4 pt-0 space-y-3.5 border-t border-white/10 animate-in fade-in duration-200">
                    {/* Top Action Bar if Unlocked */}
                    {isReportUnlocked && (
                      <div className="pt-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xs text-amber-200 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>完整報告已解鎖，支援下載與策略調用</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadReport}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                          title="下載文字檔報告"
                        >
                          {isReportDownloaded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-950" />
                              <span>已下載！</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 text-stone-950" />
                              <span>下載文字檔</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {!isReportUnlocked ? (
                      /* LOCKED STATE: BLURRED CONTENT WITH PAYWALL OVERLAY */
                      <div className="relative rounded-xl overflow-hidden pt-2">
                        {/* Blurred Mock Content (3 Dimensions Preview) */}
                        <div className="filter blur-[6px] opacity-40 select-none pointer-events-none space-y-3 p-4 bg-black/40 rounded-xl border border-white/10">
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
                            <span className="font-bold block">【核心癥結本質診斷】：</span>
                            <p>{preliminaryReport.problemAnalysis.coreDiagnosis || '專案關鍵痛點與商業邊界深度剖析...'}</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                              <span className="font-bold text-amber-200">1. 初步問題分析</span>
                              <p className="text-[11px] text-stone-300">核心癥結剖析、關鍵痛點拆解、商業邊界阻礙</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                              <span className="font-bold text-amber-200">2. 建議解決方案</span>
                              <p className="text-[11px] text-stone-300">三大戰略主軸、階梯式落地三步驟、預期產出</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                              <span className="font-bold text-amber-200">3. 建議解題方向</span>
                              <p className="text-[11px] text-stone-300">最佳適配專家特質、勝任能力、避坑風險防護</p>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs space-y-1">
                            <span className="font-bold text-stone-200">階梯式落地步驟預覽：</span>
                            <p className="text-[11px] text-stone-400">第一階段診斷與邊界收斂、第二階段架構優化、第三階段落地驗證與上線監控...</p>
                          </div>
                        </div>

                        {/* Centered Paywall Unlock Overlay */}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-stone-950/70 backdrop-blur-[2px] rounded-xl text-center space-y-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-500/20 animate-pulse">
                            <Lock className="w-5 h-5" />
                          </div>

                          <div className="max-w-md space-y-1">
                            <h4 className="font-black text-sm sm:text-base text-white">
                              解鎖「IdeaX 初步分析完整報告」
                            </h4>
                            <p className="text-xs text-stone-300">
                              解鎖後立即去除模糊遮罩，並可下載完整文字檔與解題策略
                            </p>
                            <p className="text-[11px] text-amber-300 font-medium">
                              （任何用戶均可支付點數解鎖，達人方案以上享年費解鎖）
                            </p>
                          </div>

                          {/* Unlock Notice if any */}
                          {unlockNotice && (
                            <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2 max-w-md">
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="text-left flex-1">{unlockNotice}</span>
                              <button
                                type="button"
                                onClick={() => setUnlockNotice(null)}
                                className="text-stone-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2.5 flex-wrap justify-center pt-1">
                            {isProOrHigher ? (
                              <button
                                type="button"
                                onClick={handleUnlockReport}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-black text-xs shadow-md hover:from-amber-300 hover:to-yellow-200 transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>👑 達人會員特權：免費立即解鎖報告</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={handleUnlockReport}
                                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>支付 50 點數解鎖</span>
                                </button>
                                <span className="text-stone-400 text-xs font-bold">或</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = subscribePlan('expert');
                                    if (res.success) {
                                      setIsReportUnlocked(true);
                                      setIsReportExpanded(true);
                                      setUnlockNotice('恭喜！已成功開通達人方案，IdeaX 初步分析完整報告已免費解鎖！');
                                    }
                                  }}
                                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Crown className="w-3.5 h-3.5" />
                                  <span>升級達人方案（享年費解鎖）</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* UNLOCKED STATE: FULL UNBLURRED REPORT VIEW */
                      <div className="space-y-3.5 pt-1">
                        {/* Report Sub-Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
                          <button
                            type="button"
                            onClick={() => setActiveReportTab('analysis')}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              activeReportTab === 'analysis'
                                ? 'bg-amber-400 text-stone-950 shadow-sm'
                                : 'text-stone-300 hover:text-white'
                            }`}
                          >
                            <FileSearch className="w-3.5 h-3.5" />
                            <span>1. 初步問題分析</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveReportTab('solution')}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              activeReportTab === 'solution'
                                ? 'bg-amber-400 text-stone-950 shadow-sm'
                                : 'text-stone-300 hover:text-white'
                            }`}
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>2. 建議解決方案</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveReportTab('direction')}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              activeReportTab === 'direction'
                                ? 'bg-amber-400 text-stone-950 shadow-sm'
                                : 'text-stone-300 hover:text-white'
                            }`}
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>3. 建議解題方向</span>
                          </button>
                        </div>

                        {/* TAB 1: PROBLEM ANALYSIS */}
                        {activeReportTab === 'analysis' && (
                          <div className="space-y-3 p-4 rounded-xl bg-black/30 border border-white/10 text-xs">
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 leading-relaxed space-y-1">
                              <span className="font-bold block text-amber-300">【核心癥結本質診斷】：</span>
                              <p className="text-stone-200">{preliminaryReport.problemAnalysis.coreDiagnosis}</p>
                            </div>

                            <div className="space-y-1.5">
                              <span className="font-bold text-stone-300 block">三大關鍵痛點細部拆解：</span>
                              <div className="space-y-1">
                                {preliminaryReport.problemAnalysis.painPointBreakdown.map((pt, i) => (
                                  <div key={i} className="flex items-start gap-2 text-stone-200">
                                    <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 text-[10px] font-bold">
                                      {i + 1}
                                    </span>
                                    <span>{pt}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/10 space-y-1.5">
                              <span className="font-bold text-amber-300 block">技術與商業邊界阻礙：</span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {preliminaryReport.problemAnalysis.technicalOrBusinessBarriers.map((bar, i) => (
                                  <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10 text-stone-300 text-[11px]">
                                    • {bar}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB 2: RECOMMENDED SOLUTIONS */}
                        {activeReportTab === 'solution' && (
                          <div className="space-y-3 p-4 rounded-xl bg-black/30 border border-white/10 text-xs">
                            <div className="space-y-1.5">
                              <span className="font-bold text-stone-300 block">三大戰略核心主軸：</span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {preliminaryReport.recommendedSolutions.strategicPillars.map((pil, i) => (
                                  <div key={i} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-semibold">
                                    {pil}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2 pt-1">
                              <span className="font-bold text-stone-300 block">階梯式落地三步驟：</span>
                              <div className="space-y-2">
                                {preliminaryReport.recommendedSolutions.phaseSteps.map((step) => (
                                  <div key={step.step} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-lg bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center shrink-0">
                                      {step.step}
                                    </span>
                                    <div>
                                      <span className="font-bold text-white block">{step.title}</span>
                                      <p className="text-[11px] text-stone-300 mt-0.5 leading-relaxed">{step.desc}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs">
                              <strong>預期交付成效：</strong> {preliminaryReport.recommendedSolutions.expectedOutcomes}
                            </div>
                          </div>
                        )}

                        {/* TAB 3: SOLVING DIRECTIONS */}
                        {activeReportTab === 'direction' && (
                          <div className="space-y-3 p-4 rounded-xl bg-black/30 border border-white/10 text-xs">
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 flex-wrap gap-2">
                              <span className="text-stone-300">
                                推薦專家領域：<strong className="text-amber-300">{preliminaryReport.solvingDirections.recommendedDomain}</strong>
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {preliminaryReport.solvingDirections.expertCompetencies.map((comp, i) => (
                                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    {comp}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1 text-stone-300">
                              <span className="font-bold text-rose-300 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span>避坑提醒與風險防護事項：</span>
                              </span>
                              <div className="space-y-1 pt-1 text-[11px]">
                                {preliminaryReport.solvingDirections.riskWarnings.map((warn, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <span className="text-rose-400 font-bold">•</span>
                                    <span>{warn}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                          <span>✅ 本報告已解鎖（任何用戶均可支付點數解鎖，達人方案以上享年費解鎖）</span>
                          <span className="font-mono text-[10px]">生成時間：{new Date(preliminaryReport.generatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h4 className="font-bold text-sm text-stone-900">AI 推薦最佳解答專家</h4>
              <HelpTooltip
                title="AI 推薦專家媒合說明"
                content="系統依據過往解題資歷、專長標籤與領域深度，從認證專家智庫中即時精準媒合適配人選。"
              />
            </div>
          </div>

          {isMatching ? (
            <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl animate-pulse">
              AI 正在深入分析專家領域與解題勝率...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {aiMatches.map((match) => {
                if (!match || !match.solver) return null;
                const isInvited = invitedSolvers[match.solver.id];
                return (
                  <div
                    key={match.solver.id}
                    className="p-3.5 rounded-2xl border border-stone-200 bg-white hover:border-amber-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          媒合度 {match.matchScore}%
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{match.solver.rating}</span>
                        </div>
                      </div>

                      <div
                        onClick={() => onSelectSolver(match.solver)}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <img
                          src={match.solver.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={match.solver.name || '專家'}
                          className="w-9 h-9 rounded-xl object-cover ring-1 ring-stone-200"
                        />
                        <div className="overflow-hidden">
                          <h5 className="font-bold text-xs text-stone-900 group-hover:text-amber-600 transition-colors truncate">
                            {match.solver.name || '特邀顧問'}
                          </h5>
                          <p className="text-[11px] text-stone-500 truncate">{match.solver.title}</p>
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-600 mt-2 line-clamp-2 bg-stone-50 p-2 rounded-lg">
                        {match.matchReason}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() =>
                          handlePrivateChat({
                            id: match.solver.id,
                            name: match.solver.name,
                            avatar: match.solver.avatar,
                            title: match.solver.title,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-1"
                        title="私聊諮詢此專家"
                      >
                        <MessageCircle className="w-3 h-3 text-amber-600" />
                        <span>私聊</span>
                      </button>

                      <button
                        onClick={() => handleInvite(match.solver.id)}
                        disabled={isInvited}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          isInvited
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'bg-stone-900 hover:bg-stone-800 text-white shadow-2xs'
                        }`}
                      >
                        {isInvited ? '已邀請' : '邀請回答'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dual-Track Tabs: 討論 (留言式無賞金) vs 方案 (付費解鎖) */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tab Navigation */}
            <div className="inline-flex p-1 rounded-2xl bg-stone-100 border border-stone-200">
              <button
                onClick={() => setActiveTab('solutions')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'solutions'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>解決方案（{solutionAnswers.length}）</span>
              </button>

              <button
                onClick={() => setActiveTab('discussions')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'discussions'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-stone-600" />
                <span>公開討論（{discussionAnswers.length}）</span>
              </button>
            </div>

            {/* Submit Action */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenSubmitAnswer('solution')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>提出方案（可付費、可附件）</span>
              </button>
              <button
                onClick={() => onOpenSubmitAnswer('discussion')}
                className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
                <span>公開討論（無賞金留言）</span>
              </button>
            </div>
          </div>

          {/* TAB 1: SOLUTIONS (付費/解鎖方案) */}
          {activeTab === 'solutions' && (
            <div className="space-y-4">
              {solutionAnswers.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                  <Award className="w-8 h-8 text-amber-600 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-stone-700">目前尚無專家提交深度解決方案</p>
                  <p className="text-xs text-stone-500 mt-1">
                    方案可設定公開顯示精華與付費解鎖內容；懸賞額 NT$ {(question.bounty || 0).toLocaleString()} 或可由您自訂解鎖價格！
                  </p>
                  <button
                    onClick={() => onOpenSubmitAnswer('solution')}
                    className="mt-3 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    搶先提交方案
                  </button>
                </div>
              ) : (
                solutionAnswers.map((ans) => {
                  const isSolver = currentUser.id === ans.solverId;
                  const isUnlocked = isNoPaymentMode || isSolver || ans.isAccepted || (ans.unlockedByUserIds && ans.unlockedByUserIds.includes(currentUser.id)) || (!ans.isPaid);
                  const isAccepted = ans.isAccepted;
                  const isExpanded = expandedAnswers[ans.id] ?? false;

                  return (
                    <div
                      key={ans.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isAccepted
                          ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-400/20'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      {/* Solver profile header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={ans.solverAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={ans.solverName}
                            onClick={() => {
                              const found = solvers.find((s) => s.id === ans.solverId || s.name === ans.solverName);
                              if (found) {
                                onSelectSolver(found);
                              } else {
                                onSelectSolver({
                                  id: ans.solverId,
                                  name: ans.solverName,
                                  title: ans.solverTitle || '專業解答顧問',
                                  avatar: ans.solverAvatar,
                                  domain: question.category,
                                  skills: question.tags || [],
                                  rating: 4.9,
                                  reviewCount: 12,
                                  answerCount: 8,
                                  acceptedRate: 92,
                                  tier: '認證專家',
                                  bio: '專注為提問者提供高效清晰的實務解決方案與落地顧問交付。',
                                  earnings: 12800,
                                  verifiedBadge: true,
                                  featuredCase: {
                                    title: `${question.category}領域實務落地經驗`,
                                    outcome: '成功交付並達成預期實務指標'
                                  }
                                });
                              }
                            }}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-stone-200 cursor-pointer hover:scale-105 hover:ring-2 hover:ring-amber-400 transition-all shadow-2xs"
                            title={`點擊查看 ${ans.solverName} 詳細檔案`}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                onClick={() => {
                                  const found = solvers.find((s) => s.id === ans.solverId || s.name === ans.solverName);
                                  if (found) {
                                    onSelectSolver(found);
                                  } else {
                                    onSelectSolver({
                                      id: ans.solverId,
                                      name: ans.solverName,
                                      title: ans.solverTitle || '專業解答顧問',
                                      avatar: ans.solverAvatar,
                                      domain: question.category,
                                      skills: question.tags || [],
                                      rating: 4.9,
                                      reviewCount: 12,
                                      answerCount: 8,
                                      acceptedRate: 92,
                                      tier: '認證專家',
                                      bio: '專注為提問者提供高效清晰的實務解決方案與落地顧問交付。',
                                      earnings: 12800,
                                      verifiedBadge: true,
                                      featuredCase: {
                                        title: `${question.category}領域實務落地經驗`,
                                        outcome: '成功交付並達成預期實務指標'
                                      }
                                    });
                                  }
                                }}
                                className="font-bold text-sm text-stone-900 hover:text-amber-600 cursor-pointer transition-colors"
                                title={`點擊查看 ${ans.solverName} 詳細檔案`}
                              >
                                {ans.solverName}
                              </h4>
                              
                              {/* Delivery Format Badge */}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 flex items-center gap-1 border border-stone-200">
                                {ans.deliveryFormat === 'file' ? (
                                  <>
                                    <UploadCloud className="w-3 h-3 text-amber-600" />
                                    <span>檔案交付</span>
                                  </>
                                ) : ans.deliveryFormat === 'meeting' ? (
                                  <>
                                    <Video className="w-3 h-3 text-blue-600" />
                                    <span>線上會談</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-3 h-3 text-stone-600" />
                                    <span>文字建議</span>
                                  </>
                                )}
                              </span>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                                {ans.deliveryType}
                              </span>

                              {isAccepted && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500 text-white flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> 最佳方案已採納
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 line-clamp-1">{ans.solverTitle}</p>
                          </div>
                        </div>

                        {/* Actions: 私聊回答者 + Pricing / Access Tag + Quick Expand Button */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <button
                            onClick={() =>
                              handlePrivateChat({
                                id: ans.solverId,
                                name: ans.solverName,
                                avatar: ans.solverAvatar,
                                title: ans.solverTitle,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="與回答者私密溝通客製方案"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span className="hidden sm:inline">私聊回答者</span>
                            <span className="sm:hidden">私聊</span>
                          </button>

                          <div>
                            {ans.isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold">
                                {isUnlocked ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-700" />}
                                <span>{isUnlocked ? '已解鎖全文' : `方案 NT$ ${(ans.price || 0).toLocaleString()}`}</span>
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                免費公開交流
                              </span>
                            )}
                          </div>

                          {/* Quick Toggle Icon */}
                          <button
                            type="button"
                            onClick={() => toggleAnswerExpand(ans.id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                              isExpanded
                                ? 'bg-amber-100 border-amber-300 text-amber-950'
                                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
                            }`}
                            title={isExpanded ? '收合方案' : '向下展開完整方案'}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* When Collapsed: Clean snippet preview with downward expand trigger */}
                      {!isExpanded ? (
                        <div className="space-y-2.5 pt-1">
                          <div className="relative rounded-xl bg-stone-50/80 p-3.5 border border-stone-100 overflow-hidden">
                            <p className="text-xs sm:text-sm text-stone-700 line-clamp-2 leading-relaxed font-normal">
                              {ans.freePreview}
                            </p>
                            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-stone-100/90 to-transparent pointer-events-none" />
                          </div>

                          {/* Delivery Features Tags */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-stone-500">
                            {ans.deliveryFormat === 'file' && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium flex items-center gap-1">
                                <UploadCloud className="w-3 h-3 text-amber-600" />
                                <span>含檔案交付 ({ans.attachments?.length || 1} 份)</span>
                              </span>
                            )}
                            {ans.deliveryFormat === 'meeting' && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-medium flex items-center gap-1">
                                <Video className="w-3 h-3 text-blue-600" />
                                <span>含 1 對 1 線上會談</span>
                              </span>
                            )}
                            {ans.phases && ans.phases.length > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 font-medium flex items-center gap-1">
                                <Layers className="w-3 h-3 text-purple-600" />
                                <span>含 {ans.phases.length} 階段里程碑交付</span>
                              </span>
                            )}
                          </div>

                          {/* Full width expand trigger button */}
                          <button
                            type="button"
                            onClick={() => toggleAnswerExpand(ans.id)}
                            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/70 hover:from-amber-100 hover:to-orange-100 active:bg-amber-200 text-amber-950 font-bold text-xs flex items-center justify-between border border-amber-200/90 transition-all cursor-pointer shadow-2xs group"
                          >
                            <span className="flex items-center gap-1.5">
                              <ChevronDown className="w-4 h-4 text-amber-700 transition-transform group-hover:translate-y-0.5" />
                              <span>展開完整方案（向下展開）</span>
                            </span>
                            {isUnlocked ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✅ 已解鎖完整內容
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-800">
                                查看完整診斷與落地交付
                              </span>
                            )}
                          </button>
                        </div>
                      ) : (
                        /* When Expanded: Full detailed content area */
                        <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                          {/* Content Area: Free preview (顯示的部分) */}
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>顯示的部分（公開精華預覽 / 診斷脈絡）</span>
                            </div>
                            <div className="text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-line font-normal bg-stone-50/80 p-3.5 rounded-xl border border-stone-100">
                              {ans.freePreview}
                            </div>
                          </div>

                          {/* Paywall Protected Area (解鎖的部分) */}
                          {isUnlocked ? (
                            <div className="space-y-3 pt-2 border-t border-stone-100">
                              <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                                <Unlock className="w-3.5 h-3.5" />
                                <span>解鎖的部分（已付費解鎖完整方案內容）</span>
                              </div>

                              {/* 1. 文字交付完整內容 */}
                              {ans.fullContent && (
                                <div className="text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-line font-normal bg-emerald-50/20 p-3.5 rounded-xl border border-emerald-200/60 font-mono">
                                  {ans.fullContent}
                                </div>
                              )}

                              {/* 2. 檔案交付附件清單 */}
                              {ans.attachments && ans.attachments.length > 0 && (
                                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                    <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                                    <span>交付檔案下載清單（共 {ans.attachments.length} 個檔案）</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {ans.attachments.map((att, attIdx) => (
                                      <div
                                        key={attIdx}
                                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200/60 text-xs"
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
                                          <span className="font-bold text-stone-900 truncate">{att.name}</span>
                                          <span className="text-[10px] text-stone-400 font-mono">({att.size})</span>
                                        </div>
                                        <a
                                          href={att.url || '#'}
                                          download={att.name}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>下載</span>
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 3. 線上會談詳細設定 */}
                              {ans.meetingDetails && (
                                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2.5 text-xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                                      <Video className="w-4 h-4 text-blue-600" />
                                      <span>線上會談諮詢詳情</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px]">
                                      {ans.meetingDetails.durationMinutes} 分鐘
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700 bg-white p-2.5 rounded-lg border border-blue-100">
                                    <div>
                                      <span className="text-stone-400 text-[11px] block">會談形式：</span>
                                      <span className="font-bold text-stone-900">{ans.meetingDetails.platform}</span>
                                    </div>
                                    <div>
                                      <span className="text-stone-400 text-[11px] block">可約時段：</span>
                                      <span className="font-bold text-stone-900">{ans.meetingDetails.availableTimeSlots}</span>
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-stone-500 text-[11px] font-bold block mb-1">會談內容大綱與諮詢範疇：</span>
                                    <div className="p-2.5 rounded-lg bg-white border border-blue-100 text-stone-800 leading-relaxed whitespace-pre-line">
                                      {ans.meetingDetails.meetingAgenda}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-[11px] text-blue-700">
                                      已解鎖此會談權益！請點擊「私聊回答者」預約具體會議時間。
                                    </span>
                                    <button
                                      onClick={() =>
                                        handlePrivateChat({
                                          id: ans.solverId,
                                          name: ans.solverName,
                                          avatar: ans.solverAvatar,
                                          title: ans.solverTitle,
                                        })
                                      }
                                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>立即私聊預約時段</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Masked Blurred Paywall Card */
                            <div className="relative mt-2 rounded-2xl overflow-hidden border border-amber-200 bg-gradient-to-b from-stone-50 to-amber-50/40 p-4 sm:p-5 text-center">
                              <div className="absolute inset-0 p-4 filter blur-xs opacity-25 select-none pointer-events-none text-left text-xs leading-relaxed">
                                【執行落地方案與交付清單】一、商業合作權益階梯二、商家異業推廣三步驟破冰法三、專屬附件檔案與線上諮詢走查...
                              </div>

                              <div className="relative z-10 max-w-md mx-auto space-y-2.5">
                                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center shadow-xs">
                                  <Lock className="w-5 h-5" />
                                </div>
                                <h5 className="font-extrabold text-sm sm:text-base text-stone-900">
                                  解鎖【{ans.solverName}】的完整交付方案
                                  {ans.deliveryFormat === 'meeting' && '（含 1 對 1 線上會談）'}
                                  {ans.deliveryFormat === 'file' && '（含專屬實戰檔案下載）'}
                                </h5>
                                <p className="text-xs text-stone-600 leading-relaxed">
                                  {ans.deliveryFormat === 'meeting'
                                    ? `解鎖後即可獲取 ${ans.meetingDetails?.durationMinutes || 30} 分鐘線上會談預約權與諮詢大綱。`
                                    : ans.deliveryFormat === 'file'
                                    ? `解鎖後即可下載完整落地檔案（${ans.attachments?.length || 1} 個檔案）與實施手冊。`
                                    : '提問者或其他看見有興趣的人，皆可付 NT$ ' + (ans.price || 0).toLocaleString() + ' 解鎖完整落地執行內容。'}
                                </p>

                                <div className="flex items-center justify-center gap-3 pt-1">
                                  <button
                                    onClick={() => {
                                      toggleAnswerExpand(ans.id);
                                      setTargetAnswerToUnlock(ans);
                                    }}
                                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                                  >
                                    <span>付 NT$ {(ans.price || 0).toLocaleString()} 解鎖方案</span>
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-[11px] text-stone-500 font-medium">
                                  平台支援第三方支付・確認後自動拆款入解答者帳戶（標準 10% 服務費由賣家吸收）
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 多階段交付方案進度與驗收放款 */}
                          {ans.phases && ans.phases.length > 0 && (
                            <div className="mt-3 p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/90 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                                  <Layers className="w-4 h-4 text-amber-600" />
                                  <span>多階段交付計畫（共 {ans.phases.length} 階段）</span>
                                </div>
                                <span className="text-[11px] text-amber-900 font-mono font-bold">
                                  合計 {ans.phases.reduce((acc, p) => acc + (p.points || 0), 0).toLocaleString()} 點
                                </span>
                              </div>

                              <div className="space-y-2">
                                {ans.phases.map((ph, phIdx) => (
                                  <div
                                    key={ph.id}
                                    className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                      ph.status === 'accepted'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                        : ph.status === 'in_progress'
                                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                                        : 'bg-white border-stone-200 text-stone-700'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 text-[10px] font-black">
                                          第 {ph.phaseNumber} 階段
                                        </span>
                                        <span className="font-bold text-stone-900">{ph.title}</span>
                                        <span className="font-mono font-bold text-amber-800">（{ph.points} 點）</span>
                                      </div>
                                      <p className="text-[11px] text-stone-500 mt-1">{ph.description}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {ph.status === 'accepted' ? (
                                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> 已驗收放款
                                        </span>
                                      ) : ph.status === 'in_progress' ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-amber-800 font-semibold text-[11px]">執行進行中</span>
                                          {isAuthor && (
                                            <button
                                              onClick={() => releasePhasePayout(question.id, ans.id, phIdx)}
                                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer shadow-2xs"
                                            >
                                              驗收放款
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-stone-400 text-[11px]">待接受</span>
                                          {isAuthor && (
                                            <button
                                              onClick={() => acceptPhaseDelivery(question.id, ans.id, phIdx)}
                                              className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] cursor-pointer shadow-2xs"
                                            >
                                              接受並預扣 {ph.points} 點
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Review / Acceptance Status */}
                          {isAccepted && ans.reviewComment && (
                            <div className="mt-3 p-3 rounded-xl bg-emerald-100/60 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">提問者採納評價（{ans.rating || 5} 星）：</span>
                                <span className="ml-1">{ans.reviewComment}</span>
                              </div>
                            </div>
                          )}

                          {/* Accept Button for Question Author */}
                          {isAuthor && question.status !== 'solved' && !isAccepted && (
                            <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
                              {acceptingAnswerId === ans.id ? (
                                <div className="w-full bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-stone-800">
                                      確認採納此方案並發放懸賞金（NT$ {question.bounty}）？
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          onClick={() => setReviewRating(star)}
                                          className={`w-4 h-4 cursor-pointer ${
                                            star <= reviewRating
                                              ? 'fill-amber-400 text-amber-400'
                                              : 'text-stone-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="輸入採納評價回饋（選填）..."
                                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs outline-none focus:border-amber-500 bg-white"
                                  />
                                  <div className="flex justify-end gap-2 pt-1">
                                    <button
                                      onClick={() => setAcceptingAnswerId(null)}
                                      className="px-3 py-1 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-200 cursor-pointer"
                                    >
                                      取消
                                    </button>
                                    <button
                                      onClick={() => handleConfirmAccept(ans.id)}
                                      className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xs cursor-pointer"
                                    >
                                      確認採納並結算
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAcceptingAnswerId(ans.id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>採納此方案為最佳解答</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Bottom Collapse Button */}
                          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                            <span className="text-[11px] text-stone-400">完整方案已向下展開</span>
                            <button
                              type="button"
                              onClick={() => toggleAnswerExpand(ans.id)}
                              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>收合完整方案</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: DISCUSSIONS (留言式無賞金) */}
          {activeTab === 'discussions' && (
            <div className="space-y-4">
              {/* Quick Discussion Comment Box */}
              <form onSubmit={handleQuickCommentSubmit} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                  <MessageSquare className="w-4 h-4 text-stone-500" />
                  <span>公開討論留言（無賞金交流）</span>
                </div>
                <textarea
                  rows={3}
                  value={quickComment}
                  onChange={(e) => setQuickComment(e.target.value)}
                  placeholder="寫下您對此問題的想法、經驗反饋或追問，提問者與所有社群成員皆可共同討論..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 text-stone-900 text-xs sm:text-sm outline-none leading-relaxed bg-white"
                />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] text-stone-400">所有人皆可免費閱讀與參與討論</span>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>發表留言</span>
                  </button>
                </div>
              </form>

              {discussionAnswers.length === 0 ? (
                <div className="p-6 text-center bg-stone-50 rounded-2xl border border-stone-200">
                  <MessageSquare className="w-7 h-7 text-stone-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-stone-600">目前尚無討論留言</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">率先發表您的看法或向提問者詢問更多細節吧！</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {discussionAnswers.map((disc) => (
                    <div key={disc.id} className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={disc.solverAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={disc.solverName}
                            onClick={() => {
                              const found = solvers.find((s) => s.id === disc.solverId || s.name === disc.solverName);
                              if (found) {
                                onSelectSolver(found);
                              } else {
                                onSelectSolver({
                                  id: disc.solverId,
                                  name: disc.solverName,
                                  title: disc.solverTitle || '社群探索會員',
                                  avatar: disc.solverAvatar,
                                  domain: question.category,
                                  skills: question.tags || [],
                                  rating: 4.8,
                                  reviewCount: 6,
                                  answerCount: 4,
                                  acceptedRate: 85,
                                  tier: '一般解答者',
                                  bio: '積極參與問題討論與專業想法交流。',
                                  earnings: 3000,
                                  verifiedBadge: false,
                                  featuredCase: {
                                    title: `${question.category}相關實務交流`,
                                    outcome: '提供多維度思考觀點'
                                  }
                                });
                              }
                            }}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-stone-200 cursor-pointer hover:scale-105 hover:ring-2 hover:ring-amber-400 transition-all shadow-2xs"
                            title={`點擊查看 ${disc.solverName} 詳細檔案`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => {
                                  const found = solvers.find((s) => s.id === disc.solverId || s.name === disc.solverName);
                                  if (found) {
                                    onSelectSolver(found);
                                  } else {
                                    onSelectSolver({
                                      id: disc.solverId,
                                      name: disc.solverName,
                                      title: disc.solverTitle || '社群探索會員',
                                      avatar: disc.solverAvatar,
                                      domain: question.category,
                                      skills: question.tags || [],
                                      rating: 4.8,
                                      reviewCount: 6,
                                      answerCount: 4,
                                      acceptedRate: 85,
                                      tier: '一般解答者',
                                      bio: '積極參與問題討論與專業想法交流。',
                                      earnings: 3000,
                                      verifiedBadge: false,
                                      featuredCase: {
                                        title: `${question.category}相關實務交流`,
                                        outcome: '提供多維度思考觀點'
                                      }
                                    });
                                  }
                                }}
                                className="font-bold text-xs text-stone-900 hover:text-amber-600 cursor-pointer transition-colors"
                                title={`點擊查看 ${disc.solverName} 詳細檔案`}
                              >
                                {disc.solverName}
                              </span>
                              <span className="text-[10px] text-stone-400">{disc.solverTitle}</span>
                            </div>
                            <span className="text-[10px] text-stone-400">{disc.createdAt.split('T')[0]}</span>
                          </div>
                        </div>

                        {/* 私聊該留言者 */}
                        {currentUser.id !== disc.solverId && (
                          <button
                            onClick={() =>
                              handlePrivateChat({
                                id: disc.solverId,
                                name: disc.solverName,
                                avatar: disc.solverAvatar,
                                title: disc.solverTitle,
                              })
                            }
                            className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-stone-600 hover:text-amber-800 hover:bg-amber-50 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3 text-amber-600" />
                            <span>私聊</span>
                          </button>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line pl-10 font-normal">
                        {disc.freePreview}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Sticky Bottom Action Bar */}
      <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50/95 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sticky bottom-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="text-xs text-stone-500 hidden lg:block">
          <span>提問者或社群會員皆可付費解鎖方案；亦可直接採納方案發放懸賞。</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
          <button
            onClick={onClose}
            className="px-3.5 py-2.5 sm:py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            {isFullPage ? '返回問題市場' : '關閉'}
          </button>
          <button
            onClick={() => onOpenSubmitAnswer('solution')}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span>提出方案（可付費解鎖）</span>
          </button>
          <button
            onClick={() => onOpenSubmitAnswer('discussion')}
            className="px-3.5 py-2.5 sm:py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span>公開討論</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return (
      <>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{content}</div>
        <SeoPreviewModal
          question={question}
          answers={answers}
          isOpen={isSeoModalOpen}
          onClose={() => setIsSeoModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {content}
      </div>

      {/* 爭議申訴檢舉彈窗 */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-stone-900">檢舉審查申請（爭議退款）</h3>
              </div>
              <button
                onClick={() => setIsDisputeModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/80 border border-purple-200">
              <span className="text-xs font-bold text-purple-950">爭議退款審查說明</span>
              <HelpTooltip
                title="第三方託管退款機制"
                content={`發布懸賞後之預扣點數由第三方獨立託管，不可由提問者任意撤回。若您發現解答者涉嫌抄襲、惡意灌水、未依約交付或遇技術異常，經審查核實後將全額退還預扣之 ${((question.withheldBounty ?? question.bounty) || 0).toLocaleString()} 點。`}
              />
            </div>

            {/* 申訴檢舉原因快捷選擇 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                申訴與爭議原因類別 *
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                {[
                  { id: 'bug', label: 'APP或網站技術問題(bug)' },
                  { id: 'suggestion', label: '對我們的建議' },
                  { id: 'delivery', label: '交付內容不符 / 爭議' },
                  { id: 'spam', label: '惡意灌水或抄襲' },
                  { id: 'missing', label: '未依約交付 / 失聯' },
                  { id: 'other', label: '其他疑義原因' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const prefix = `【${item.label}】`;
                      if (!disputeReasonInput.startsWith('【')) {
                        setDisputeReasonInput(`${prefix} ` + disputeReasonInput);
                      } else {
                        setDisputeReasonInput(disputeReasonInput.replace(/^【.*?】\s*/, `${prefix} `));
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] transition-all cursor-pointer text-center truncate ${
                      disputeReasonInput.includes(`【${item.label}】`)
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-black'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-purple-50 hover:border-purple-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={4}
              value={disputeReasonInput}
              onChange={(e) => setDisputeReasonInput(e.target.value)}
              placeholder="請詳細說明您提出檢舉申訴的事實與理由（例如：APP操作或網站技術問題(bug)、方案未提供約定之附件、內容與問題無關等）..."
              className="w-full p-3 rounded-xl border border-stone-300 text-xs text-stone-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 leading-relaxed"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDisputeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                取消返回
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!disputeReasonInput.trim()) return;
                  reportQuestionDispute(question.id, disputeReasonInput.trim());
                  setIsDisputeModalOpen(false);
                }}
                disabled={!disputeReasonInput.trim()}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-bold text-xs cursor-pointer shadow-2xs disabled:opacity-50"
              >
                確認送出檢舉審查
              </button>
            </div>
          </div>
        </div>
      )}

      <SeoPreviewModal
        question={question}
        answers={answers}
        isOpen={isSeoModalOpen}
        onClose={() => setIsSeoModalOpen(false)}
      />
    </>
  );
};

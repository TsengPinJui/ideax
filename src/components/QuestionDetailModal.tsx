import React, { useState, useEffect, useRef } from 'react';
import { BaiMiao } from './baimiao/BaiMiao';
import { Question, Answer, Solver, Category, AIPreliminaryReport, BidirectionalHandshakeMatch } from '../types';
import { useApp } from '../context/AppContext';
import { LEVEL_CONFIGS } from '../data/mockData';
import { matchSolversWithAI, AISolverMatch, generatePreliminaryReportWithAI, getInitialPreliminaryReport } from '../services/aiService';
import { computeBidirectionalHandshake } from '../services/bidirectionalMatchService';
import { HelpTooltip } from './HelpTooltip';
import { CopyableUserId } from './CopyableUserId';
import { GuestBoardGateBlurOverlay } from './GuestBoardGateBlurOverlay';
import { isGuestUser } from '../utils/userDisplay';
import { getYoutubeEmbedUrl } from '../utils/youtubeUtils';
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
  Terminal,
  Cpu,
  Globe,
  Image as ImageIcon,
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
  Link as LinkIcon,
  Compass,
  Lightbulb,
  FileSearch,
  Hand,
  ThumbsUp,
  Coins,
  Heart,
  FileEdit,
  Flame,
  Trophy,
  ArrowRight,
  Rocket,
  ArrowLeftRight,
} from 'lucide-react';
import { TipPainPointModal } from './TipPainPointModal';
import { SeoPreviewModal } from './SeoPreviewModal';
import { ProposalChangelogSection } from './ProposalChangelogSection';
import { SimilarRecommendationsSection } from './SimilarRecommendationsSection';
import { UpdateProposalModal } from './UpdateProposalModal';
import { AdminTransferWorkOwnershipModal } from './AdminTransferWorkOwnershipModal';
import { AdminConvertWorkTypeModal } from './AdminConvertWorkTypeModal';
import { getQuestionShareUrl } from '../services/seoService';
import { copyToClipboard } from '../utils/clipboard';
import { shareOrCopyUrl, copyPureUrl } from '../utils/shareUtils';
import {
  resolveUserDisplayName,
  resolveUserAvatar,
  isUserAccountDeactivated,
  getUserNameColorClass,
  isPlatformPublishedWork,
  PLATFORM_CURATED_NAME,
  PLATFORM_CURATED_AVATAR,
} from '../utils/userDisplay';
import { isPainPointQuestion, isL0DiscussionQuestion } from '../utils/questionUtils';
import { syncQuestionToFirestore } from '../services/firestoreSync';
import { marketAdvisorAgent } from '../services/marketAdvisorAgent';
import { isComingSoonWork, getExperienceScore } from '../utils/experienceRating';
import { getAnswerSpecifications } from '../utils/answerUtils';
import { PublishedPlatformsBlock, platformLinksOf, usePlatformLinkChooser } from './PublishedPlatforms';
import { VibeCodingCaseDetailContent } from './VibeCodingCaseDetailContent';
import { findReferencedPainPoint, findProposalsReferencingPainPoint } from '../utils/painPointLinking';
import { isSampleContent } from '../utils/sampleContent';
import { isGuestPreviewOnly } from '../utils/guestAccess';
import { MindMapSection } from './mindmap/MindMapSection';
import { recordQuestionViewClick } from '../utils/proposalClicks';

interface QuestionDetailModalProps {
  question: Question;
  onClose: () => void;
  onOpenSubmitAnswer: (initialType?: 'discussion' | 'solution') => void;
  onSelectSolver: (solver: Solver) => void;
  onOpenChatWithUser?: (user: { id: string; name: string; avatar: string; title: string }) => void;
  onSelectCategory?: (category: Category, subcategory?: string | '全部') => void;
  isFullPage?: boolean;
  onSearchTag?: (tag: string) => void;
  onNavigateToChallengeSubmit?: (question: Question) => void;
  onSelectQuestion?: (q: Question) => void;
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
  onNavigateToChallengeSubmit,
  onSelectQuestion,
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
    questions,
    selectedQuestion,
    setSelectedQuestion,
    setIsCreateQuestionOpen,
    deleteQuestionPermanently,
    deleteAnswerPermanently,
    delistQuestion,
    unpublishOwnQuestion,
    relistQuestion,
    addNotification,
    openAuthModal,
    availableUsers,
    promptLogin,
    openRechargePage,
    autoTagQuestionWithAI,
    toggleSecondQuestion,
    isQuestionSeconded,
    getQuestionSecondCount,
    toggleSameQuestion,
    isSameQuestionActive,
    getQuestionSameCount,
    toggleLikeDiscussionAnswer,
    isDiscussionAnswerLiked,
    getDiscussionAnswerLikesCount,
    toggleLikeQuestion,
    isQuestionLiked,
    getQuestionLikesCount,
  } = useApp();
  // 點「外部連結」時，先讓觀眾選作者填的上架平台
  const platformChooser = usePlatformLinkChooser();

  const isPainPoint = isPainPointQuestion(question);
  const isSeconded = isQuestionSeconded(question.id);
  const secondCount = getQuestionSecondCount(question.id);
  const isSame = isSameQuestionActive(question.id);
  const sameCount = getQuestionSameCount(question.id);
  const isL0Discussion = isL0DiscussionQuestion(question);
  const isLiked = isQuestionLiked(question.id);
  const likesCount = getQuestionLikesCount(question.id);

  const handleSecondClick = () => {
    const res = toggleSecondQuestion(question.id);
    if (res.isSeconded) {
      addNotification(`已為痛點「${question.title}」附議 +1，並同步收錄至「我的按讚收藏」！`, 'success');
    }
  };

  const handleSameQuestionClick = () => {
    const res = toggleSameQuestion(question.id);
    if (res.isSameQuestion) {
      addNotification(`已為此問題「🔥 +1 附議」，並同步收錄至「我的按讚收藏」！`, 'success');
    }
  };

  const handleLikeQuestionClick = () => {
    const res = toggleLikeQuestion(question.id);
    if (res.isLiked) {
      addNotification(`已按讚「${question.title}」，並同步收錄至「我的按讚收藏」！`, 'success');
    }
  };

  const handleLikeDiscussion = (discId: string) => {
    const res = toggleLikeDiscussionAnswer(discId);
    if (res.isLiked) {
      addNotification('已為該討論留言按讚 👍！', 'success');
    }
  };

  const [isAiAutoTagging, setIsAiAutoTagging] = useState(false);

  const handleGoToChallengeProposal = () => {
    if (currentUser.id === 'user-guest') {
      promptLogin('請先登入帳號以參與創星季提案');
      return;
    }
    if (onNavigateToChallengeSubmit) {
      onNavigateToChallengeSubmit(question);
    } else {
      try {
        sessionStorage.setItem(
          'ideax_challenge_prefill_topic',
          JSON.stringify({
            id: question.id,
            title: question.title,
            serial: question.id,
            summary: question.description,
          })
        );
        window.history.pushState({ subView: 'submit' }, '', '/challenge/submit');
        window.dispatchEvent(new Event('popstate'));
      } catch {}
      onClose();
    }
  };

  const handleRunLiveAiAutoTag = async () => {
    setIsAiAutoTagging(true);
    try {
      const res = await autoTagQuestionWithAI(question.id);
      if (res && res.success && res.data) {
        if (addNotification) {
          addNotification({
            title: '白喵已完成分析與貼標籤',
            message: `問題《${question.title.slice(0, 16)}...》已由 AI 智能匹配分類至「${res.data.category} · ${res.data.subcategory || ''}」，並配置標籤：#${(res.data.tags || []).join(' #')}`,
            type: 'system',
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiAutoTagging(false);
    }
  };

  const liveQuestion = questions.find((item) => item.id === question.id) || selectedQuestion || question;
  const isVibeCodingApp =
    liveQuestion?.postType === 'vibecoding_app' ||
    liveQuestion?.specialZone === 'vibecoding' ||
    liveQuestion?.category === '網站程式' ||
    (liveQuestion as any)?.isVibeCodingApp === true;
  const workUrl = liveQuestion.demoUrl || liveQuestion.externalLink || liveQuestion.vibeCodingData?.demoUrl || platformLinksOf(liveQuestion.publishedPlatforms)[0]?.url || '';
  const referencedPainPointObj = findReferencedPainPoint(liveQuestion, questions);
  const referencingProposals = isPainPoint ? findProposalsReferencingPainPoint(liveQuestion, questions) : [];

  const [questionHistory, setQuestionHistory] = useState<Question[]>([]);
  const detailContentScrollRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (detailContentScrollRef.current) {
      detailContentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      detailContentScrollRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToTop();
  }, [liveQuestion?.id]);

  const handleSelectQuestion = (targetQ: Question) => {
    if (liveQuestion && liveQuestion.id !== targetQ.id) {
      setQuestionHistory((prev) => [...prev, liveQuestion]);
    }
    if (onSelectQuestion) {
      onSelectQuestion(targetQ);
    } else if (setSelectedQuestion) {
      setSelectedQuestion(targetQ);
    }
    scrollToTop();
  };

  const handleBackOrClose = () => {
    if (questionHistory.length > 0) {
      const prevQ = questionHistory[questionHistory.length - 1];
      setQuestionHistory((prev) => prev.slice(0, -1));
      if (onSelectQuestion) {
        onSelectQuestion(prevQ);
      } else if (setSelectedQuestion) {
        setSelectedQuestion(prevQ);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onClose();
  };

  const handleCreateProposalForPainPoint = (painPoint: Question) => {
    try {
      sessionStorage.setItem(
        'ideax_prefill_referenced_pain_point',
        JSON.stringify({ id: painPoint.id, title: painPoint.title })
      );
    } catch {}
    if (currentUser.id === 'user-guest') {
      promptLogin('請先登入帳號以針對痛點發起提案');
      return;
    }
    if (setIsCreateQuestionOpen) {
      setIsCreateQuestionOpen(true);
    }
  };

  const viewCountedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!question?.id) return;
    if (viewCountedIdRef.current === question.id) return;
    viewCountedIdRef.current = question.id;

    const nextViews = recordQuestionViewClick(question.id, question.views || 0);
    setQuestions((prev) =>
      prev.map((q) => (q.id === question.id ? { ...q, views: nextViews } : q))
    );
  }, [question?.id, setQuestions]);

  const isBookmarked = isQuestionBookmarked(question.id);
  const isRegisteredParticipant = Boolean(
    currentUser &&
    currentUser.id !== 'user-guest' &&
    (
      currentUser.competitionBadges?.includes('創星季') ||
      (currentUser as any).isCompetitionRegistered ||
      (typeof window !== 'undefined' && currentUser.id && localStorage.getItem(`ideax_participant_registered_${currentUser.id}`))
    )
  );

  // Unified Action Modal State (違規下架 / 直接刪除，均暫存 7 日)
  const [isUnifiedActionModalOpen, setIsUnifiedActionModalOpen] = useState(false);
  const [unifiedActionTab, setUnifiedActionTab] = useState<'violation' | 'delete'>('violation');
  const [delistReasonPreset, setDelistReasonPreset] = useState('違反社群內容規範與文明守則');
  const [delistCustomReason, setDelistCustomReason] = useState('');
  const [delistFeedbackInput, setDelistFeedbackInput] = useState('');
  const [alsoDeleteMarked, setAlsoDeleteMarked] = useState(false);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Deletion Confirmation States
  const [isConfirmDeleteQuestionOpen, setIsConfirmDeleteQuestionOpen] = useState(false);
  const [deletingAnswerTarget, setDeletingAnswerTarget] = useState<{ id: string; type: 'solution' | 'discussion'; title?: string } | null>(null);
  const [isDeletingProcessing, setIsDeletingProcessing] = useState(false);

  const [aiMatches, setAiMatches] = useState<AISolverMatch[]>([]);
  const [handshakeMatches, setHandshakeMatches] = useState<BidirectionalHandshakeMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [invitedSolvers, setInvitedSolvers] = useState<Record<string, boolean>>({});

  // Active Tab: 預設優先顯示 'discussions' (公開討論留言)，再切換至 'solutions' (解決方案)
  const [activeTab, setActiveTab] = useState<'solutions' | 'discussions'>('discussions');

  useEffect(() => {
    setActiveTab('discussions');
  }, [question.id]);

  // SEO & Share modal
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Dispute report state
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReasonInput, setDisputeReasonInput] = useState('');

  // Quick discussion comment input inside modal
  const [quickComment, setQuickComment] = useState('');

  // Acceptance review state
  const [acceptingAnswerId, setAcceptingAnswerId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Dynamic AI Analysis Fallback
  const [dynamicAiAnalysis, setDynamicAiAnalysis] = useState<any>(question.aiAnalysis || null);

  useEffect(() => {
    if (isVibeCodingApp) return;
    if (question.aiAnalysis) {
      setDynamicAiAnalysis(question.aiAnalysis);
    } else if (!dynamicAiAnalysis && question.title) {
      marketAdvisorAgent.classifyAndTagQuestion(question.title, question.description || '')
        .then((res) => {
          if (res) {
            setDynamicAiAnalysis({
              summary: res.summary,
              structuredNeed: res.structuredNeed,
              solverProfileAdvice: res.solverProfileAdvice,
              marketFitRating: '高商業價值',
            });
          }
        })
        .catch(() => {});
    }
  }, [isVibeCodingApp, question.id, question.aiAnalysis, question.title, question.description]);

  const effectiveAiAnalysis = question.aiAnalysis || dynamicAiAnalysis;

  // Solution answers collapse / expand states (預設收合，點擊向下展開)
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [isConvertWorkTypeModalOpen, setIsConvertWorkTypeModalOpen] = useState<boolean>(false);

  const toggleAnswerExpand = (answerId: string) => {
    setExpandedAnswers((prev) => ({
      ...prev,
      [answerId]: !prev[answerId],
    }));
  };

  // AI Preliminary Report (提問者本人、管理員、達人方案以上免費，一般會員可支付 50 點數解鎖)
  const isAuthorUser = currentUser.id === question.authorId || currentUser.id === liveQuestion?.authorId || currentUser.role === 'admin';
  const isOwnPublishedWork = Boolean(
    currentUser.id !== 'user-guest' &&
    (currentUser.id === liveQuestion?.authorId || currentUser.id === liveQuestion?.transferredToUserId) &&
    (liveQuestion?.postType === 'vibecoding_app' || liveQuestion?.postType === 'innovation_proposal' || liveQuestion?.specialZone === 'vibecoding' || liveQuestion?.category === '網站程式')
  );
  const isTransferredWork = Boolean(
    liveQuestion?.isTransferred ||
    liveQuestion?.isOwnershipTransferred ||
    liveQuestion?.transferredToUserId
  );
  const isProposalPublisher = Boolean(
    currentUser?.id &&
    currentUser.id !== 'user-guest' &&
    (
      (liveQuestion?.authorId && currentUser.id === liveQuestion.authorId) ||
      (question?.authorId && currentUser.id === question.authorId) ||
      (!isTransferredWork && currentUser.role === 'admin')
    )
  );
  const canUpdateProposal = (
    liveQuestion?.postType === 'innovation_proposal' ||
    question?.postType === 'innovation_proposal' ||
    liveQuestion?.postType === 'vibecoding_app' ||
    question?.postType === 'vibecoding_app' ||
    liveQuestion?.specialZone === 'vibecoding' ||
    liveQuestion?.category === '網站程式' ||
    (liveQuestion?.tags && (liveQuestion.tags.includes('VibeCoding') || liveQuestion.tags.includes('創新提案'))) ||
    (question?.tags && (question.tags.includes('VibeCoding') || question.tags.includes('創新提案')))
  ) && (isProposalPublisher || isAuthorUser);
  const userTier = currentUser?.subscriptionTier || 'free';
  const isProOrHigher = ['pro', 'expert', 'authority', 'master'].includes(userTier) || isAuthorUser;
  
  // 關鍵規範：L0 與閒聊討論問題不適用 AI 付費深度分析報告功能
  const isL0OrChat = question.level === 'L0' || question.postType === 'chat_discussion';

  const existingReport = liveQuestion?.aiPreliminaryReport || question.aiPreliminaryReport;
  const [preliminaryReport, setPreliminaryReport] = useState<AIPreliminaryReport>(() => {
    return existingReport || getInitialPreliminaryReport(question);
  });
  const [isReportUnlocked, setIsReportUnlocked] = useState<boolean>(() => {
    if (isL0OrChat) return false;
    if (isProOrHigher || isAuthorUser) return true;
    if (existingReport?.unlockedUserIds?.includes(currentUser.id)) return true;
    return false;
  });
  const [activeReportTab, setActiveReportTab] = useState<'analysis' | 'solution' | 'direction'>('analysis');
  const [isReportExpanded, setIsReportExpanded] = useState<boolean>(false);
  const [isReportDownloaded, setIsReportDownloaded] = useState<boolean>(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [unlockNotice, setUnlockNotice] = useState<React.ReactNode | null>(null);

  // 首位解鎖時呼叫 AI 生成並存檔；若已存在儲存的報告則直接重用（L0 與閒聊問題不適用）
  const fetchOrGenerateReport = async () => {
    if (isL0OrChat) return;
    const currentPersisted = liveQuestion?.aiPreliminaryReport || question.aiPreliminaryReport;
    if (currentPersisted && currentPersisted.id && currentPersisted.id.includes('pre-report-live')) {
      setPreliminaryReport(currentPersisted);
      return;
    }

    setIsGeneratingReport(true);
    try {
      const liveReport = await marketAdvisorAgent.generatePreliminaryReport(question);
      if (liveReport) {
        const existingUnlocked = currentPersisted?.unlockedUserIds || [];
        const updatedUnlocked = Array.from(new Set([...existingUnlocked, currentUser.id]));
        const savedReport: AIPreliminaryReport = {
          ...liveReport,
          unlockedUserIds: updatedUnlocked,
        };
        setPreliminaryReport(savedReport);

        // 關鍵規則：儲存至本地狀態與資料庫，下次任何人解鎖可以直接使用！
        const updatedTarget = {
          ...liveQuestion,
          ...question,
          aiPreliminaryReport: savedReport,
        };
        setQuestions((prev) => prev.map((q) => (q.id === question.id ? updatedTarget : q)));
        syncQuestionToFirestore(updatedTarget);
      }
    } catch (e) {
      console.warn('AI report generation error:', e);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // When report is expanded by an unlocked user, fetch live AI report if it was static initial
  useEffect(() => {
    if (isReportUnlocked && isReportExpanded && (!preliminaryReport.id || !preliminaryReport.id.includes('pre-report-live'))) {
      fetchOrGenerateReport();
    }
  }, [isReportUnlocked, isReportExpanded]);

  const handleUnlockReport = async () => {
    if (!isProOrHigher && !isAuthorUser) {
      if ((currentUser.balance || 0) < 30) {
        setUnlockNotice(
          <div className="flex items-center gap-1 flex-wrap">
            <span>您的可用點數餘額不足 30 點（目前餘額 {currentUser.balance || 0} 點）。請</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                openRechargePage();
              }}
              className="px-1 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-950 font-black underline cursor-pointer transition-colors"
            >
              ［先去儲值］
            </button>
            <span>點數或升級達人方案享年費解鎖！</span>
          </div>
        );
        return;
      }
      spendPoints(30, `解鎖【${question.title}】之 AI 初步問題分析與解題報告`);
    }

    setUnlockNotice(null);
    setIsReportUnlocked(true);
    setIsReportExpanded(true);

    const currentPersisted = liveQuestion?.aiPreliminaryReport || question.aiPreliminaryReport;
    if (currentPersisted && currentPersisted.id && currentPersisted.id.includes('pre-report-live')) {
      // 報告已由首位解鎖者生成，本次解鎖直接重複使用已儲存報告，記錄解鎖用戶
      const updatedUnlocked = Array.from(new Set([...(currentPersisted.unlockedUserIds || []), currentUser.id]));
      const updatedReport: AIPreliminaryReport = {
        ...currentPersisted,
        unlockedUserIds: updatedUnlocked,
      };
      setPreliminaryReport(updatedReport);
      const updatedTarget = {
        ...liveQuestion,
        ...question,
        aiPreliminaryReport: updatedReport,
      };
      setQuestions((prev) => prev.map((q) => (q.id === question.id ? updatedTarget : q)));
      syncQuestionToFirestore(updatedTarget);
    } else {
      // 首位點選解鎖，呼叫 AI 生成並儲存
      fetchOrGenerateReport();
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
  const isAdmin = currentUser.role === 'admin';
  const isOwner = currentUser.id === question.authorId;
  const isAuthor = isOwner || isAdmin;
  const isAuthorDeactivated = isUserAccountDeactivated(question.authorId, availableUsers);
  const isPlatformWork = isPlatformPublishedWork(question);
  const authorDisplayName = isPlatformWork
    ? PLATFORM_CURATED_NAME
    : resolveUserDisplayName(question.authorId, question.authorName, availableUsers);
  const authorDisplayAvatar = isPlatformWork
    ? PLATFORM_CURATED_AVATAR
    : resolveUserAvatar(question.authorId, question.authorAvatar, availableUsers);

  const addNotificationRef = useRef(addNotification);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  const handshakeRunForQIdRef = useRef<string | null>(null);

  // Load Dual-Agent AI Handshake & matches
  useEffect(() => {
    if (!question?.id) return;
    if (handshakeRunForQIdRef.current === question.id) return;
    handshakeRunForQIdRef.current = question.id;

    let isMounted = true;
    setIsMatching(true);
    computeBidirectionalHandshake({
      question,
      solvers,
      onSendNotification: (notif) => {
        if (addNotificationRef.current) {
          addNotificationRef.current({
            title: notif.title,
            message: notif.message,
            type: notif.type,
            category: notif.category,
            linkQuestionId: notif.linkQuestionId,
          });
        }
      },
    })
      .then((handshakes) => {
        if (isMounted) {
          setHandshakeMatches(handshakes);
          const mapped: AISolverMatch[] = handshakes.map((h) => {
            const solver = solvers.find((s) => s.id === h.solverId);
            return {
              solverId: h.solverId,
              solver: solver || ({
                id: h.solverId,
                name: h.solverName,
                avatar: h.solverAvatar,
                title: h.solverTitle,
                rating: h.solverRating,
              } as any),
              matchScore: h.handshakeScore,
              matchReason: h.isHandshake
                ? `【🤝 雙向握手】市場顧問契合度 ${h.marketAdvisorScore}% • AICRM 客情巡航 ${h.aicrmCruiseScore}%。${h.marketAdvisorReason}`
                : h.marketAdvisorReason,
              keyStrengths: solver?.skills.slice(0, 3) || [],
              recommendedRole: solver?.title || '特邀顧問',
              hasRelevance: true,
            };
          });
          setAiMatches(mapped);
          setIsMatching(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          // Fallback
          matchSolversWithAI(question, solvers).then((fallback) => {
            if (isMounted) {
              setAiMatches(fallback);
              setIsMatching(false);
            }
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [question?.id, solvers]);

  // 1. 執行違規下架處置（須填寫理由並通知提問者，可選是否同時移入刪除暫存區，均暫存 7 日）
  const handleConfirmUnifiedViolation = () => {
    const finalReason = delistCustomReason.trim() || delistReasonPreset;
    if (!finalReason) return;
    setIsActionProcessing(true);
    try {
      delistQuestion(question.id, finalReason, delistFeedbackInput.trim());
      question.status = 'delisted';
      question.delistedReason = finalReason;
      question.delistedFeedback = delistFeedbackInput.trim() || undefined;
      question.delistedAt = new Date().toISOString();
      if (addNotification) {
        addNotification({
          title: '⚠️ 提問內容違規下架通知',
          message: `您發布的問題《${question.title.slice(0, 24)}...》因「${finalReason}」已被平台管理員強制下架（下架暫存保留 7 日，逾期將自動從資料庫永久刪除）。處置反饋說明：${
            delistFeedbackInput.trim() || '請恪守 IdeaX 社群規範，如有疑義請聯繫官方團隊。'
          }`,
          type: 'system',
        });
      }
      setIsUnifiedActionModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionProcessing(false);
    }
  };

  // 2. 執行直接刪除處置（徹底自全站與雲端資料庫抹除）
  const handleConfirmUnifiedDirectDelete = async () => {
    setIsActionProcessing(true);
    try {
      await deleteQuestionPermanently(question.id);
      if (addNotification) {
        addNotification({
          title: '問題已成功刪除',
          message: `問題《${question.title.slice(0, 16)}...》已自全站徹底永久刪除，原預扣懸賞金已全額退還。`,
          type: 'system',
        });
      }
      setIsUnifiedActionModalOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleRelistQuestion = () => {
    relistQuestion(question.id);
    question.status = 'open';
    question.delistedReason = undefined;
    question.delistedFeedback = undefined;
    question.delistedAt = undefined;
    if (addNotification) {
      addNotification({
        title: '問題已恢復上架',
        message: `問題《${question.title.slice(0, 16)}...》已恢復公開招募與探索。`,
        type: 'system',
      });
    }
  };

  const handleConfirmDeleteQuestion = async () => {
    setIsDeletingProcessing(true);
    try {
      await deleteQuestionPermanently(question.id);
      if (addNotification) {
        addNotification('問題已永久刪除', `已將問題《${question.title.slice(0, 16)}...》自全站徹底永久抹除。`, 'system');
      }
      setIsConfirmDeleteQuestionOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingProcessing(false);
    }
  };

  const handleConfirmDeleteAnswer = async () => {
    if (!deletingAnswerTarget) return;
    setIsDeletingProcessing(true);
    try {
      await deleteAnswerPermanently(deletingAnswerTarget.id);
      setDeletingAnswerTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingProcessing(false);
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

  const [isUrlCopied, setIsUrlCopied] = useState(false);

  // 分享出去（帶文字說明推薦引言，直通 LINE、FB、IG、Threads 等社群；降級時複製純網址）
  const handleShareQuestion = async () => {
    const shareUrl = getQuestionShareUrl(question.id, question.postType);
    const label = isVibeCodingApp
      ? '軟體網站實戰案例'
      : question.postType === 'pain_point'
      ? '痛點洞察'
      : '懸賞問題';
    const shareTitle = `【IdeaX 創點子 • ${label}】${question.title}`;
    const shareText = `【IdeaX 創點子 • ${label}】${question.title}\n${!isVibeCodingApp && (question.bounty || 0) > 0 ? `💰 懸賞金額：NT$ ${(question.bounty || 0).toLocaleString()} 元\n` : ''}${((question as any).summary || question.description?.slice(0, 120) || 'AI 賦能實戰開發案例與落地架構展示！')}\n`;

    const res = await shareOrCopyUrl({
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    });

    if (res === 'shared') {
      // 原生分享已開啟，依需求不顯示「已開啟分享」提示文字
    } else if (res === 'copied') {
      // 若降級到剪貼簿，亦只複製純網址
      setIsUrlCopied(true);
      setTimeout(() => setIsUrlCopied(false), 2500);
    }
  };

  // 訪客瀏覽規則：列表第 17～20 則僅開放預覽（只顯示前兩張圖片，其餘內容需登入）
  const guestPreviewOnly = isGuestUser(currentUser) && isGuestPreviewOnly(question.id);
  const guestPreviewImages = [question.coverImage, ...(question.galleryImages || [])]
    .filter((u): u is string => Boolean(u))
    .slice(0, 2);

  const content = (
    <div className={`bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-sm w-full ${isFullPage ? 'max-w-4xl mx-auto my-2' : 'max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'}`}>
      {/* Header */}
      <div className="p-3 sm:p-6 border-b border-stone-200 flex items-start justify-between gap-4 bg-white/95 sticky top-0 z-20">
        <div className="space-y-2">
          {(isFullPage || questionHistory.length > 0) && (
            <button
              onClick={handleBackOrClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer mb-1"
            >
              <ArrowLeft className="w-4 h-4 text-amber-600" />
              <span>返回上一頁</span>
            </button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {isSampleContent(question) && (
              <span
                className="text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200"
                title="此為平台示範內容，非真實會員發布"
              >
                範例內容
              </span>
            )}
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
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                isPainPoint
                  ? 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold shadow-2xs'
                  : levelConfig.badgeClass
              }`}
            >
              {isPainPoint
                ? '痛點/創點子'
                : `${question.level} · ${levelConfig.name}`}
            </span>
            {question.status === 'delisted' ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> 已被管理員下架
              </span>
            ) : question.status === 'solved' ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 已採納方案・已結算
              </span>
            ) : question.isFeatured ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 text-white border-purple-400/60 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-purple-200 fill-purple-300 drop-shadow-xs animate-pulse" />
                <span className="font-black text-white">招募中</span>
              </span>
            ) : null}
            {isAdmin && question.status !== 'delisted' && (
              <button
                type="button"
                onClick={() => {
                  setUnifiedActionTab('violation');
                  setIsUnifiedActionModalOpen(true);
                }}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="管理員：違規下架處置"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>違規下架</span>
              </button>
            )}
          </div>

          {/* 違規下架官方處置說明 */}
          {question.status === 'delisted' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{question.delistedReason === '作者自行下架' ? '此內容已由作者自行下架（公開列表已隱藏）' : '此提問因違反平台規範已被管理員強制下架（前台市場已隱藏）'}</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleRelistQuestion}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>恢復上架</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmDeleteQuestionOpen(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Trash className="w-3 h-3 text-rose-700" />
                      <span>永久抹除</span>
                    </button>
                  </div>
                )}
              </div>
              {question.delistedReason && question.delistedReason !== '作者自行下架' && (
                <p className="text-rose-800 font-medium">違規原因：{question.delistedReason}</p>
              )}
              {question.delistedFeedback && (
                <p className="text-stone-700 bg-white/90 p-2.5 rounded-xl border border-rose-100 mt-1 leading-relaxed">
                  官方處置反饋：{question.delistedFeedback}
                </p>
              )}
            </div>
          )}

          {isPainPoint ? (
            <div className="flex items-center gap-2">
              <div
                className="text-right shrink-0 px-3 py-1 sm:py-1.5 rounded-xl border border-rose-300 bg-rose-50/80 shadow-2xs"
                title={(question.bounty || 0) > 0 ? '痛點提問懸賞' : '痛點'}
              >
                {(question.bounty || 0) > 0 ? (
                  <>
                    <span className="text-[11px] font-bold text-rose-700 block">
                      痛點懸賞
                    </span>
                    <span className="text-lg sm:text-xl font-black text-rose-600 font-mono">
                      NT$ {(question.bounty || 0).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-base sm:text-lg font-black text-rose-600 font-mono py-0.5 block">
                    痛點
                  </span>
                )}
              </div>
            </div>
          ) : (question.bounty || 0) > 0 ? (
            <div className="text-right shrink-0 px-3 py-1 sm:py-1.5 rounded-xl border border-amber-300 bg-amber-50/60">
              <span className="text-[11px] font-semibold text-amber-800 block">懸賞獎金</span>
              <span className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                NT$ {(question.bounty || 0).toLocaleString()}
              </span>
            </div>
          ) : null /* 無懸賞時，等級已顯示在左側標籤（如「L0 · 免費交流」），不重複顯示 */}

          {/* ⭐ 收藏按鈕 */}
          <button
            type="button"
            onClick={() => toggleBookmarkQuestion(question.id)}
            className={`px-2.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              isBookmarked
                ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs font-black'
                : 'bg-white hover:bg-amber-50/60 border-stone-200 text-stone-600 hover:text-amber-700'
            }`}
            title="⭐ 收藏"
          >
            <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
            <span className="hidden sm:inline">{isBookmarked ? '已收藏' : '收藏'}</span>
          </button>

          {/* 提案發布者本人/管理員專屬：直接編輯提案按鈕 */}
          {canUpdateProposal && (
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="px-3 py-2 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black shadow-xs active:scale-95"
              title="直接編輯您的提案內容、規格、圖片與進度"
            >
              <FileEdit className="w-4 h-4 text-white" />
              <span>編輯提案</span>
            </button>
          )}

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
      <div ref={detailContentScrollRef} className={`p-2.5 sm:p-6 space-y-4 sm:space-y-6 ${!isFullPage ? 'overflow-y-auto' : ''}`}>
        {/* Author info & metadata bar + 私聊按鈕 */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <img
              src={authorDisplayAvatar}
              alt={authorDisplayName}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-stone-200"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">
                  <span className={`font-bold ${isPlatformWork ? 'text-amber-800 font-black' : getUserNameColorClass(question.authorId, availableUsers, { isOfficial: question.isOfficial, name: question.authorName, title: question.authorTitle })}`}>
                    {authorDisplayName}
                  </span>
                  {isPlatformWork && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-300 ml-1.5">
                      精選刊登
                    </span>
                  )}
                  {authorDisplayName !== '此帳號已註銷' && question.authorTitle && !isPlatformWork && (
                    <span className="text-stone-500 font-normal"> · {question.authorTitle}</span>
                  )}
                </span>
                {isAuthorDeactivated && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                    帳號已註銷
                  </span>
                )}
                {/* 私聊按鈕 */}
                {!isAuthor && !isAuthorDeactivated && (
                  <button
                    onClick={() =>
                      handlePrivateChat({
                        id: question.authorId,
                        name: authorDisplayName,
                        avatar: authorDisplayAvatar,
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
                {/* 提案發布者本人專屬：編輯提案按鈕 */}
                {canUpdateProposal && (
                  <button
                    type="button"
                    onClick={() => setIsUpdateModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="重新編輯提案內容、規格與進度"
                  >
                    <FileEdit className="w-3 h-3 text-emerald-600" />
                    <span>編輯提案</span>
                  </button>
                )}

                {/* 管理員專屬：將平台作品轉移給用戶 */}
                {isAdmin && isPlatformWork && (
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg border border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-500 hover:text-stone-950 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="將此平台刊登作品之所有權轉移給指定用戶，等同用戶自己發布的提案，可事後自由編輯"
                  >
                    <UserCheck className="w-3 h-3 text-amber-700" />
                    <span>轉移所有權給用戶</span>
                  </button>
                )}

                {/* 管理員專屬：創新提案 ⇄ 軟體作品 轉性按鍵 */}
                {isAdmin && question.status !== 'delisted' && (
                  <button
                    type="button"
                    onClick={() => setIsConvertWorkTypeModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg border border-purple-400 bg-purple-50 hover:bg-purple-600 text-purple-900 hover:text-white font-black text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="管理員【轉性按鍵】：將此項目在「創新提案」與「軟體作品」之間雙向轉性"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-purple-600 group-hover:text-white" />
                    <span>轉性 (屬性轉換)</span>
                  </button>
                )}
              </div>
              <span className="text-[11px] text-stone-400">發布於 {question.createdAt.split('T')[0]}</span>
            </div>
          </div>

          {/* 數據與互動動作列（上下留一組，俐落緊湊排開，無複製連結） */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3.5 font-medium text-stone-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  {(() => {
                    if (!question.deadline || question.deadline === '永久' || question.deadline === '永久刊登') {
                      return '永久';
                    }
                    const target = new Date(question.deadline).getTime();
                    if (!isNaN(target)) {
                      const diffDays = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
                      return diffDays > 0 ? `${diffDays}天` : '已到期';
                    }
                    return question.deadline;
                  })()}
                </span>
              </span>

              <span className="flex items-center gap-1 text-amber-700 font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>{solutionAnswers.length} 個方案</span>
              </span>
              <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>{discussionAnswers.length} 則討論</span>
              </span>
              {isVibeCodingApp && (() => {
                const exp = getExperienceScore(liveQuestion);
                return (
                  <span
                    className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold"
                    title={exp.totalRatings > 0 ? `共 ${exp.totalRatings} 位探索者評分` : '尚無評分'}
                  >
                    <span>👍 體驗評分：</span>
                    <span className="font-mono font-black">{exp.totalRatings > 0 ? `${exp.score} 分` : '尚無評分'}</span>
                  </span>
                );
              })()}
            </div>

            {/* 單一動作按鈕列 */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 提案發布者本人專屬：直接編輯提案按鈕 */}
              {canUpdateProposal && (
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 border border-emerald-600 bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  title="直接編輯您的提案內容、規格、圖片與進度"
                >
                  <FileEdit className="w-3.5 h-3.5 text-white" />
                  <span>編輯提案</span>
                </button>
              )}

              {/* 創新提案/軟體刊登：❤️ Like ｜ L0討論：👍 按讚 ｜ 問題類型/痛點：🔥 +1 附議 */}
              {question.postType === 'innovation_proposal' || isVibeCodingApp ? (
                <button
                  type="button"
                  onClick={handleLikeQuestionClick}
                  className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                    isLiked || isSeconded
                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  }`}
                  title="❤️ Like（創新提案 / 軟體刊登）"
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked || isSeconded ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                  <span>Like</span>
                  {Math.max(likesCount, secondCount) > 0 && (
                    <span className="font-mono font-black">({Math.max(likesCount, secondCount)})</span>
                  )}
                </button>
              ) : isL0Discussion ? (
                <button
                  type="button"
                  onClick={handleLikeQuestionClick}
                  className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                    isLiked
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                  }`}
                  title="👍 按讚（L0 討論）"
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-white text-white' : 'text-blue-600'}`} />
                  <span>按讚</span>
                  {likesCount > 0 && <span className="font-mono font-black">({likesCount})</span>}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSecondClick}
                  className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                    isSeconded
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-300'
                  }`}
                  title="🔥 +1 附議（問題類型 / 痛點）"
                >
                  <span>🔥 +1 附議</span>
                  {secondCount > 0 && <span className="font-mono font-black">({secondCount})</span>}
                </button>
              )}

              {/* 痛點專用快捷鍵：提案參賽(不賺賞金) */}
              {isPainPoint && (
                <button
                  type="button"
                  onClick={handleGoToChallengeProposal}
                  className="px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 border border-amber-400 bg-amber-400 hover:bg-amber-300 text-stone-950 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  title="針對此痛點投入創星季競賽，角逐最高獎項與榮譽（不賺賞金）"
                >
                  <Sparkles className="w-3.5 h-3.5 text-stone-950 shrink-0" />
                  <span>提案參賽(不賺賞金)</span>
                </button>
              )}

              {/* 讀者打賞支持按鈕（點數存在應收帳款，每週結算） */}
              <button
                type="button"
                onClick={() => setIsTipModalOpen(true)}
                className="px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="打賞支持此痛點/問題作者（點數存在作者應收帳款，每週結算）"
              >
                <Coins className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
                <span>打賞支持</span>
                {question.supportPoints ? (
                  <span className="font-mono font-black text-amber-800">
                    ({question.supportPoints.toLocaleString()}點)
                  </span>
                ) : null}
              </button>

              {/* 分享該問題/痛點按鈕 (帶文字說明推薦引言，不顯示「已開啟分享」) */}
              <button
                onClick={handleShareQuestion}
                className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs shrink-0 bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-500 active:scale-95"
                title={question.postType === 'pain_point' ? '帶文字說明分享此痛點至社群或好友' : '帶文字說明分享此問題'}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{question.postType === 'pain_point' ? '分享痛點' : '分享問題'}</span>
              </button>
            </div>
          </div>
        </div>

        {guestPreviewOnly ? (
          <div className="space-y-4">
            {guestPreviewImages.length > 0 && (
              <div className={`grid gap-2.5 ${guestPreviewImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {guestPreviewImages.map((img, idx) => (
                  <div key={idx} className="relative h-40 sm:h-56 rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                    <img
                      src={img}
                      alt={`${question.title} 預覽圖 ${idx + 1}`}
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
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-6 text-center">
              <h3 className="text-base sm:text-lg font-black text-stone-900">登入即可查看完整內容</h3>
              <p className="mt-1.5 text-xs sm:text-sm text-stone-500">
                完整說明、討論與方案需登入後瀏覽，免費註冊只要 Email 與密碼。
              </p>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="mt-4 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-black text-stone-950 cursor-pointer"
              >
                免費登入 / 註冊
              </button>
            </div>
          </div>
        ) : (
        <>
        {/* 多媒體大圖、YouTube 介紹影片、圖集、技術架構與線上網址 */}
        {(question.youtubeUrl || question.coverImage || (question.galleryImages && question.galleryImages.length > 0) || question.techArchitecture || workUrl || (liveQuestion.publishedPlatforms && liveQuestion.publishedPlatforms.length > 0)) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-50/70 border border-stone-200/90 shadow-2xs space-y-4">
            {/* YouTube 介紹影片 */}
            {(() => {
              const ytEmbed = getYoutubeEmbedUrl(question.youtubeUrl || question.vibeCodingData?.youtubeUrl, {
                autoplay: true,
                mute: false,
                controls: true,
              });
              if (!ytEmbed) return null;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-red-600" />
                      <span>YouTube 提案介紹影片</span>
                    </div>
                    <a
                      href={question.youtubeUrl || question.vibeCodingData?.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <span>於 YouTube 開啟</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-stone-200 shadow-sm">
                    <iframe
                      src={ytEmbed}
                      title={`${question.title} - YouTube 介紹影片`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              );
            })()}
            {/* 封面大圖 */}
            {question.coverImage && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-stone-900 border border-stone-200">
                <img src={question.coverImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-70" />
                <img
                  src={question.coverImage}
                  alt={question.title}
                  className="relative w-full h-full object-contain"
                />
              </div>
            )}
            {/* Gallery Images (0~6張圖片) */}
            {question.galleryImages && question.galleryImages.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <span>功能介面與展示畫冊</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {question.galleryImages.map((imgUrl, idx) => (
                    <a
                      key={idx}
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative h-28 sm:h-36 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 hover:border-purple-400 transition-all cursor-pointer"
                    >
                      <img
                        src={imgUrl}
                        alt={`${question.appName || '作品'} 截圖 ${idx + 1}`}
                        loading="lazy"
                        onError={(e) => {
                          // 圖片失效時整格隱藏，避免出現只剩「截圖」文字的破圖
                          const cell = (e.currentTarget as HTMLImageElement).closest('a');
                          if (cell) (cell as HTMLElement).style.display = 'none';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {/* Tech Architecture & Demo Link Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-100">
              {question.techArchitecture && (
                <div className="p-3 rounded-xl bg-white border border-purple-200 text-xs space-y-1">
                  <div className="font-extrabold text-purple-900 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-600" />
                    <span>技術架構</span>
                  </div>
                  <p className="font-mono text-stone-700 leading-normal">{question.techArchitecture}</p>
                </div>
              )}
              {workUrl && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex flex-col justify-between gap-2">
                  <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>線上成果網站 / 檔案連結</span>
                  </div>
                  <a
                    href={workUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => platformChooser.onLinkClick(e, { title: liveQuestion.appName || liveQuestion.title, demoUrl: workUrl, platforms: liveQuestion.publishedPlatforms })}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>前往網站</span>
                  </a>
                </div>
              )}
              <PublishedPlatformsBlock platforms={liveQuestion.publishedPlatforms} className="sm:col-span-2" />
            </div>
            {platformChooser.chooser}
          </div>
        )}

        {/* 引用相關痛點與希望達成的目標（支援雙向互聯跳轉） */}
        {(referencedPainPointObj || liveQuestion.referencedPainPoint || liveQuestion.targetGoal) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white border border-amber-300/80 shadow-2xs">
            {(referencedPainPointObj || liveQuestion.referencedPainPoint) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shadow-2xs">💡</span>
                    <span>此提案針對之痛點洞察（引用痛點）</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    痛點許願池
                  </span>
                </div>

                {referencedPainPointObj ? (
                  <div
                    onClick={() => handleSelectQuestion(referencedPainPointObj)}
                    className="p-3 rounded-xl bg-white border border-amber-200 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer group space-y-1.5 active:scale-[0.99]"
                    title="點擊前往查看此痛點完整需求與討論"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-stone-900 group-hover:text-amber-900 transition-colors line-clamp-1">
                        {referencedPainPointObj.title}
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                        +{referencedPainPointObj.secondedCount || 0} 附議
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                      {referencedPainPointObj.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-amber-50">
                      <div className="flex items-center gap-1">
                        <img
                          src={referencedPainPointObj.authorAvatar}
                          alt={referencedPainPointObj.authorName}
                          className="w-3.5 h-3.5 rounded-full object-cover"
                        />
                        <span className="text-stone-700 font-medium">{referencedPainPointObj.authorName}</span>
                      </div>
                      <span className="text-amber-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        前往痛點完整頁面 ➔
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-800 font-medium bg-white p-2.5 rounded-xl border border-amber-200/70 leading-relaxed">
                    {liveQuestion.referencedPainPoint}
                  </p>
                )}
              </div>
            )}
            {liveQuestion.targetGoal && (
              <div className="space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{liveQuestion.postType === 'pain_point' ? '期望目標 / 欲達到的改善效果' : '希望達成的目標'}</span>
                    </span>
                    {liveQuestion.currentVersion && (
                      <span className="text-[10px] text-purple-800 font-mono font-black bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded">
                        {liveQuestion.currentVersion}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-800 font-medium bg-white p-2.5 rounded-xl border border-amber-200/70 leading-relaxed">
                    🎯 {liveQuestion.targetGoal}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 心智圖（作者選填） */}
        {(liveQuestion.postType === 'innovation_proposal' || liveQuestion.postType === 'vibecoding_app') && (
          <MindMapSection data={liveQuestion.mindMap} />
        )}

        {/* Question Full Description & AI Tags Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>問題詳細背景與解題需求</span>
            </h3>
          </div>

          <div className="text-stone-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
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
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-lg transition-all cursor-pointer shadow-2xs border text-stone-700 bg-stone-100 hover:bg-stone-200 hover:text-stone-900 border-stone-200"
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



        {effectiveAiAnalysis && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* 市場顧問白喵：戴眼鏡拿紙筆幫你整理重點 */}
                <BaiMiao action="mediate" size={52} className="-my-2 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-stone-900">AI摘要</h4>
                  <p className="text-[10px] text-stone-500">市場顧問白喵幫你整理的重點</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {effectiveAiAnalysis.marketFitRating && (
                  <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
                    評級：{effectiveAiAnalysis.marketFitRating}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal">
              {effectiveAiAnalysis.summary}
            </p>

            {/* Structured need checklist */}
            {effectiveAiAnalysis.structuredNeed && effectiveAiAnalysis.structuredNeed.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-bold text-stone-800 mb-2">建議解答者應涵蓋的 3 大關鍵維度：</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {effectiveAiAnalysis.structuredNeed.map((need: string, idx: number) => (
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
            )}
          </div>
        )}

        {/* 獨立模組：AI Agent「市場顧問」深度付費分析報告（僅適用於 L1~L4 與懸賞問題，L0 與閒聊討論不適用） */}
        {!isL0OrChat && (
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
                    AI Agent「市場顧問」深度付費分析報告
                  </h5>
                  {!isReportUnlocked && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      單次 30 點解鎖 / 達人年費解鎖
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-300 truncate mt-0.5">
                  市場顧問量身撰寫：初步問題剖析、建議解決方案、建議解題方向
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* 市場顧問白喵趴著拿放大鏡研究報告 */}
              <BaiMiao action="inspect" size={64} className="-my-3" />
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      title="下載文字檔報告"
                    >
                      {isReportDownloaded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-950" />
                          <span>已下載 (.txt)</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-stone-950" />
                          <span>下載報告 (.txt)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {isGeneratingReport && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <BaiMiao action="inspect" size={52} className="-my-1 shrink-0" />
                  <span className="animate-pulse">白喵正在分析報告，幫你寫深度分析與三階段解題方向…</span>
                </div>
              )}

                    {!isReportUnlocked ? (
                      /* LOCKED STATE: BLURRED CONTENT WITH PAYWALL OVERLAY (清透毛玻璃，文字更清晰透出) */
                      <div className="relative rounded-xl overflow-hidden pt-2">
                        {/* Blurred Mock Content (3 Dimensions Preview) */}
                        <div className="filter blur-[6px] opacity-85 select-none pointer-events-none space-y-3 p-4 bg-black/15 rounded-xl border border-white/10">
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

                        {/* Centered Paywall Unlock Overlay (高透毛玻璃) */}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 sm:p-4 bg-stone-950/15 backdrop-blur-[2.5px] rounded-xl text-center space-y-3">
                          <div className="bg-stone-900/65 backdrop-blur-md border border-amber-500/35 p-4 sm:p-5 rounded-2xl max-w-md w-full shadow-2xl space-y-2.5">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-500/20 animate-pulse mx-auto">
                              <Lock className="w-5 h-5" />
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-black text-sm sm:text-base text-white">
                                解鎖「IdeaX 初步分析完整報告」
                              </h4>
                              <p className="text-xs text-stone-300">
                                解鎖後去除模糊遮罩，並可下載完整文字檔與解題策略
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
                                  <span>支付 30 點數解鎖</span>
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
          )}

        {/* 提問專家推薦與雙向握手媒合推播（未登入訪客開放前 3 位預覽，其餘模糊遮罩引導登入） */}
        {Boolean(question && (aiMatches.length > 0 || isMatching)) && (
          (() => {
            const isGuest = isGuestUser(currentUser);
            const visibleMatches = isGuest ? aiMatches.slice(0, 3) : aiMatches;

            const renderMatchCard = (match: AISolverMatch, isBlurred = false) => {
              if (!match || !match.solver) return null;
              const isInvited = invitedSolvers[match.solver.id];
              const handshake = handshakeMatches.find((h) => h.solverId === match.solver.id);
              const isHandshake = handshake?.isHandshake ?? (match.matchScore >= 80);

              return (
                <div
                  key={match.solver.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isHandshake
                      ? 'bg-gradient-to-b from-amber-50/80 via-white to-white border-amber-400 ring-2 ring-amber-300/60 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-amber-300'
                  }`}
                >
                  <div>
                    {/* Top Badge & Rating */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {isHandshake ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-pulse" />
                          <span>🤝 雙向握手 {match.matchScore}%</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          媒合度 {match.matchScore}%
                        </span>
                      )}

                      <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{match.solver.rating}</span>
                      </div>
                    </div>

                    {/* Dual Agent Sub-metrics if Handshake */}
                    {isHandshake && handshake && (
                      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100/90 text-amber-900 border border-amber-200">
                          市場顧問 {handshake.marketAdvisorScore}%
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100/90 text-emerald-900 border border-emerald-200">
                          AICRM巡航 {handshake.aicrmCruiseScore}%
                        </span>
                      </div>
                    )}

                    <div
                      onClick={() => {
                        if (isBlurred || isGuest) {
                          openAuthModal('login');
                          return;
                        }
                        onSelectSolver(match.solver);
                      }}
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

                    <p className="text-[11px] text-stone-600 mt-2 line-clamp-2 bg-stone-50 p-2 rounded-lg leading-relaxed">
                      {match.matchReason}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        if (isBlurred || isGuest) {
                          openAuthModal('login');
                          return;
                        }
                        handlePrivateChat({
                          id: match.solver.id,
                          name: match.solver.name,
                          avatar: match.solver.avatar,
                          title: match.solver.title,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-1"
                      title="私聊諮詢此專家"
                    >
                      <MessageCircle className="w-3 h-3 text-amber-600" />
                      <span>私聊</span>
                    </button>

                    <button
                      onClick={() => {
                        if (isBlurred || isGuest) {
                          openAuthModal('login');
                          return;
                        }
                        handleInvite(match.solver.id);
                      }}
                      disabled={isInvited}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        isInvited
                          ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                          : isHandshake
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow-2xs'
                          : 'bg-stone-900 hover:bg-stone-800 text-white shadow-2xs'
                      }`}
                    >
                      {isInvited ? '已邀請' : isHandshake ? '🤝 邀請解答' : '邀請回答'}
                    </button>
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 inline-flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isAuthor ? '提問者專家推薦' : 'AI 媒合解答專家'}</span>
                    </span>
                  </div>
                  <HelpTooltip
                    title="提問專家推薦與雙向握手機制"
                    content="【提問專家推薦】系統依據題意痛點、專長標籤與歷史履約評價，從認證智庫專家庫中即時精準媒合最佳解答專家。
【雙向握手機制說明】提問端由「市場顧問 AI Agent」深度解析痛點意圖，解答端則由「AICRM 客情巡航 Agent」動態評估專家勝率與承接意願。當雙方條件高度契合時即達成「雙向握手」特選標記，提問者可一鍵直接「邀請解答」或發起一對一私聊諮詢！"
                  />
                </div>

                {isMatching ? (
                  <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl animate-pulse">
                    AI 正在深入分析專家領域與解題勝率...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {visibleMatches.map((match) => renderMatchCard(match))}
                    </div>

                    {isGuest && aiMatches.length > 3 && (
                      <GuestBoardGateBlurOverlay
                        remainingCount={aiMatches.length - 3}
                        totalCount={aiMatches.length}
                        boardName="AI 媒合推薦專家"
                        onOpenAuth={() => openAuthModal('login')}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })()
        )}

        {/* Dual-Track Tabs: 公開討論 (留言式無賞金，優先顯示) vs 解決方案 (付費解鎖/延伸提案) */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tab Navigation：討論在前、方案在後 */}
            <div className="inline-flex p-1 rounded-2xl bg-stone-100 border border-stone-200">
              <button
                onClick={() => setActiveTab('discussions')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'discussions'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 hover:text-blue-900'
                }`}
              >
                <MessageSquare className={`w-4 h-4 ${activeTab === 'discussions' ? 'text-white' : 'text-blue-600'}`} />
                <span>公開討論（{discussionAnswers.length}）</span>
              </button>

              <button
                onClick={() => setActiveTab('solutions')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'solutions'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span className="flex items-center gap-1.5">
                  {(solutionAnswers.length + referencingProposals.length) > 0 && (
                    <span className="relative flex h-2 w-2" title="已有落地解決方案">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                    </span>
                  )}
                  <span>解決方案（{solutionAnswers.length + referencingProposals.length}）</span>
                </span>
              </button>
            </div>
          </div>

          {/* TAB: SOLUTIONS (付費/解鎖方案 與 引用此痛點之提案) */}
          {activeTab === 'solutions' && (
            <div className="space-y-4">
              {isPainPoint && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 to-emerald-50/90 border border-amber-200/80 flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-stone-900">痛點解法雙軌機制：</span>
                    <span className="text-stone-600">
                      欲獲取解答賞金或自訂解鎖定價請選擇<strong>「提案懸賞(不參賽)」</strong>；欲投入創星季角逐大獎與榮譽請選擇<strong>「提案參賽(不賺賞金)」</strong>。
                    </span>
                  </div>
                </div>
              )}

              {referencingProposals.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {referencingProposals.map((prop) => (
                    <div
                      key={prop.id}
                      onClick={() => handleSelectQuestion(prop)}
                      className="p-3.5 rounded-xl bg-white border border-amber-200/90 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-2.5 active:scale-[0.99]"
                      title="點擊前往查看此提案詳情"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                            {prop.postType === 'vibecoding_app' ? '軟體網站應用' : '創新解方提案'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-700">
                            🪙 {((prop.supportPoints || 0) * 10).toLocaleString()} 點
                          </span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-amber-900 transition-colors line-clamp-2">
                          {prop.title}
                        </h4>
                        <p className="text-[11px] text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                          {prop.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1.5 border-t border-amber-50">
                        <div className="flex items-center gap-1">
                          <img
                            src={prop.authorAvatar}
                            alt={prop.authorName}
                            className="w-3.5 h-3.5 rounded-full object-cover"
                          />
                          <span className="text-stone-700 font-medium">{prop.authorName}</span>
                        </div>
                        <span className="text-amber-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          前往提案 ➔
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {solutionAnswers.length === 0 && referencingProposals.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                  <Award className="w-8 h-8 text-amber-600 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-stone-700">目前尚無專家提交深度解決方案</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {isPainPoint
                      ? '針對此痛點，您可選擇「提案懸賞(不參賽)」賺取解答賞金與解鎖收入，或「提案參賽(不賺賞金)」投入創星季競賽！'
                      : `方案可設定公開顯示精華與付費解鎖內容；懸賞額 NT$ ${(question.bounty || 0).toLocaleString()} 或可由您自訂解鎖價格！`}
                  </p>
                  <div className="mt-3.5 flex items-center justify-center gap-2.5 flex-wrap">
                    {isPainPoint ? (
                      <>
                        <button
                          onClick={() => {
                            if (currentUser.id === 'user-guest') {
                              promptLogin('訪客模式請先登入帳號以提出方案');
                              return;
                            }
                            onOpenSubmitAnswer('solution');
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="提交付費解鎖或接案方案（不參加創星季競賽）"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>提案懸賞(不參賽)</span>
                        </button>
                        <button
                          onClick={handleGoToChallengeProposal}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="針對此痛點提交創星季競賽提案，角逐競賽大獎（不賺取提問者賞金）"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>提案參賽(不賺賞金)</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (currentUser.id === 'user-guest') {
                            promptLogin('訪客模式請先登入帳號以提出方案');
                            return;
                          }
                          onOpenSubmitAnswer('solution');
                        }}
                        className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
                      >
                        搶先提交方案
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                solutionAnswers.map((ans) => {
                  // 解決方案務必先付費解鎖才能看，除非解鎖價格為零（或非付費公開交流方案）
                  const isZeroPrice = (!ans.isPaid) || ((ans.price || 0) === 0);
                  const isSolver = Boolean(currentUser && currentUser.id !== 'user-guest' && currentUser.id === ans.solverId);
                  const isUnlockedByPayment = Boolean(
                    currentUser &&
                    currentUser.id !== 'user-guest' &&
                    ans.unlockedByUserIds &&
                    ans.unlockedByUserIds.includes(currentUser.id)
                  );
                  const isUnlocked = isZeroPrice || isSolver || isUnlockedByPayment;
                  const isAccepted = ans.isAccepted;
                  const isExpanded = expandedAnswers[ans.id] ?? false;

                  const solverDisplayName = resolveUserDisplayName(ans.solverId, ans.solverName, availableUsers);
                  const solverDisplayAvatar = resolveUserAvatar(ans.solverId, ans.solverAvatar, availableUsers);
                  const solverDeactivated = isUserAccountDeactivated(ans.solverId, availableUsers);
                  const isSolverDeactivated = solverDeactivated;
                  const ansSpec = getAnswerSpecifications(ans);

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
                            src={solverDisplayAvatar}
                            alt={solverDisplayName}
                            onClick={() => {
                              if (isSolverDeactivated) return;
                              const found = solvers.find((s) => s.id === ans.solverId || s.name === ans.solverName);
                              if (found) {
                                onSelectSolver(found);
                              } else {
                                onSelectSolver({
                                  id: ans.solverId,
                                  name: solverDisplayName,
                                  title: ans.solverTitle || '專業解答顧問',
                                  avatar: solverDisplayAvatar,
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
                            className={`w-10 h-10 rounded-xl object-cover ring-1 ring-stone-200 shadow-2xs ${
                              isSolverDeactivated ? 'opacity-80' : 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-amber-400 transition-all'
                            }`}
                            title={isSolverDeactivated ? '此帳號已註銷' : `點擊查看 ${solverDisplayName} 詳細檔案`}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                onClick={() => {
                                  if (isSolverDeactivated) return;
                                  const found = solvers.find((s) => s.id === ans.solverId || s.name === ans.solverName);
                                  if (found) {
                                    onSelectSolver(found);
                                  } else {
                                    onSelectSolver({
                                      id: ans.solverId,
                                      name: solverDisplayName,
                                      title: ans.solverTitle || '專業解答顧問',
                                      avatar: solverDisplayAvatar,
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
                                className={`text-sm ${
                                  isSolverDeactivated ? 'text-stone-500 font-bold' : `${getUserNameColorClass(ans.solverId, availableUsers, { name: ans.solverName, title: ans.solverTitle, verifiedBadge: ans.solverBadge, verifiedExpert: Boolean(ans.solverBadge) || ans.solverId?.startsWith('solver') || ans.solverId?.startsWith('c2') })} hover:opacity-80 cursor-pointer transition-colors`
                                }`}
                                title={isSolverDeactivated ? '此帳號已註銷' : `點擊查看 ${solverDisplayName} 詳細檔案`}
                              >
                                {solverDisplayName}
                                {solverDisplayName !== '此帳號已註銷' && ans.solverTitle && (
                                  <span className="text-stone-500 font-normal"> · {ans.solverTitle}</span>
                                )}
                              </h4>
                              <CopyableUserId userId={ans.solverId} />

                              {isSolverDeactivated && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                                  帳號已註銷
                                </span>
                              )}
                              
                              {/* 方案規格標籤清單（所含內容類型與數量） */}
                              {ansSpec.items.map((it, itIdx) => (
                                <span
                                  key={itIdx}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 flex items-center gap-1 border border-stone-200 shadow-2xs"
                                >
                                  {it.iconType === 'text' && <FileText className="w-3 h-3 text-stone-600" />}
                                  {it.iconType === 'file' && <UploadCloud className="w-3 h-3 text-amber-600" />}
                                  {it.iconType === 'link' && <Paperclip className="w-3 h-3 text-sky-600" />}
                                  {it.iconType === 'meeting' && <Video className="w-3 h-3 text-blue-600" />}
                                  <span>{it.label}</span>
                                </span>
                              ))}

                              {/* 交付方式標籤（一次交付 / 分幾個階段交付） */}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-1 shadow-2xs">
                                <Layers className="w-3 h-3 text-purple-600" />
                                <span>{ansSpec.deliveryMethod}</span>
                              </span>

                              {isAccepted && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500 text-white flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> 最佳方案已採納
                                </span>
                              )}
                            </div>
                            {solverDisplayName !== '此帳號已註銷' && (
                              <p className="text-xs text-stone-500 line-clamp-1">{ans.solverTitle}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions: 私聊回答者 + 刪除提案按鈕 + Pricing / Access Tag + Quick Expand Button */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {!isSolverDeactivated && (
                            <button
                              onClick={() =>
                                handlePrivateChat({
                                  id: ans.solverId,
                                  name: solverDisplayName,
                                  avatar: solverDisplayAvatar,
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
                          )}

                          {/* 刪除提案按鈕 (提案者本人或管理員且未被採納結案) */}
                          {(isSolver || currentUser.role === 'admin') && !ans.isAccepted && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeletingAnswerTarget({
                                  id: ans.id,
                                  type: 'solution',
                                  title: ans.freePreview ? ans.freePreview.slice(0, 30) : '此提案方案',
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 font-bold text-xs flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                              title="永久刪除此提案（直接刪除且不再存在）"
                            >
                              <Trash className="w-3.5 h-3.5 text-rose-600" />
                              <span className="hidden sm:inline">刪除提案</span>
                              <span className="sm:hidden">刪除</span>
                            </button>
                          )}

                          <div>
                            {ans.isPaid ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isUnlocked) {
                                    setTargetAnswerToUnlock(ans);
                                  } else {
                                    toggleAnswerExpand(ans.id);
                                  }
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isUnlocked
                                    ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                                    : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 shadow-2xs'
                                }`}
                                title={isUnlocked ? '點擊收合/展開全文' : `點擊付費解鎖方案 NT$ ${(ans.price || 0).toLocaleString()}`}
                              >
                                {isUnlocked ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-stone-950" />}
                                <span>{isUnlocked ? '已解鎖全文' : `解鎖方案 NT$ ${(ans.price || 0).toLocaleString()}`}</span>
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                公開交流
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
                                </h5>

                                {/* 方案規格（所含內容類型和數量、交付方式） */}
                                <div className="my-2 p-3.5 rounded-2xl bg-white/95 border border-amber-200 shadow-2xs text-left text-xs space-y-2">
                                  <div className="flex items-center justify-between text-xs font-bold text-stone-900 border-b border-stone-100 pb-1.5">
                                    <span className="flex items-center gap-1.5 text-amber-950 font-black">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>方案規格（解鎖後交付內容）</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-bold flex items-center gap-1">
                                      <Layers className="w-3 h-3 text-purple-600" />
                                      <span>{ansSpec.deliveryMethod}</span>
                                    </span>
                                  </div>

                                  <div className="space-y-1.5 text-xs text-stone-700">
                                    <div className="flex items-start gap-1.5 flex-wrap">
                                      <span className="font-bold text-stone-900 shrink-0">所含內容：</span>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {ansSpec.items.map((it, itIdx) => (
                                          <span
                                            key={itIdx}
                                            className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-semibold text-[11px] border border-stone-200 flex items-center gap-1"
                                          >
                                            {it.iconType === 'text' && <FileText className="w-3 h-3 text-stone-600" />}
                                            {it.iconType === 'file' && <UploadCloud className="w-3 h-3 text-amber-600" />}
                                            {it.iconType === 'link' && <Paperclip className="w-3 h-3 text-sky-600" />}
                                            {it.iconType === 'meeting' && <Video className="w-3 h-3 text-blue-600" />}
                                            <span>{it.label}</span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-600 pt-0.5">
                                      <span className="font-bold text-stone-800 shrink-0">交付方式：</span>
                                      <span className="font-semibold text-stone-800">
                                        {ansSpec.deliveryMethod}
                                      </span>
                                      <span className="text-stone-400">
                                        （{ansSpec.isPhased ? `共 ${ans.phases?.length} 個階段，按階段推進並驗收放款` : '解鎖後一次性提供完整內容與專屬資源'}）
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <p className="text-xs text-stone-600 leading-relaxed">
                                  提問者或其他看見有興趣的人，皆可付 NT$ {(ans.price || 0).toLocaleString()} 解鎖完整落地執行內容。
                                </p>

                                <div className="flex items-center justify-center gap-3 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTargetAnswerToUnlock(ans);
                                    }}
                                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                                  >
                                    <span>付 NT$ {(ans.price || 0).toLocaleString()} 解鎖方案</span>
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
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
                                  合計 {ans.phases.reduce((acc, p) => acc + (p.points || p.price || 0), 0).toLocaleString()} 點
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
                                        <span className="font-mono font-bold text-amber-800">（NT$ {(ph.points || ph.price || 0).toLocaleString()} 點）</span>
                                      </div>
                                      {ph.target && (
                                        <div className="text-[11px] text-stone-700 mt-1 flex items-start gap-1">
                                          <span className="font-bold text-amber-900 shrink-0">🎯 階段目標：</span>
                                          <span>{ph.target}</span>
                                        </div>
                                      )}
                                      {ph.deliverables && (
                                        <div className="text-[11px] text-stone-700 mt-0.5 flex items-start gap-1">
                                          <span className="font-bold text-indigo-900 shrink-0">📦 預計交付：</span>
                                          <span>{ph.deliverables}</span>
                                        </div>
                                      )}
                                      {ph.description && ph.description !== ph.target && (
                                        <p className="text-[10px] text-stone-500 mt-0.5">{ph.description}</p>
                                      )}
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
              <form onSubmit={handleQuickCommentSubmit} className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>公開討論留言（無賞金交流）</span>
                </div>
                <textarea
                  rows={3}
                  value={quickComment}
                  onChange={(e) => setQuickComment(e.target.value)}
                  placeholder="寫下您對此問題的想法、經驗反饋或追問，提問者與所有社群成員皆可共同討論..."
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-stone-900 text-xs sm:text-sm outline-none leading-relaxed bg-white"
                />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] text-blue-700/80">所有人皆可免費閱讀與參與討論</span>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>留言</span>
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
                  {discussionAnswers.map((disc) => {
                    const discDisplayName = resolveUserDisplayName(disc.solverId, disc.solverName, availableUsers);
                    const discDisplayAvatar = resolveUserAvatar(disc.solverId, disc.solverAvatar, availableUsers);
                    const isDiscDeactivated = isUserAccountDeactivated(disc.solverId, availableUsers);
                    const canDeleteDisc = currentUser.id === disc.solverId || currentUser.role === 'admin';

                    return (
                      <div key={disc.id} className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={discDisplayAvatar}
                              alt={discDisplayName}
                              onClick={() => {
                                if (isDiscDeactivated) return;
                                const found = solvers.find((s) => s.id === disc.solverId || s.name === disc.solverName);
                                if (found) {
                                  onSelectSolver(found);
                                } else {
                                  onSelectSolver({
                                    id: disc.solverId,
                                    name: discDisplayName,
                                    title: disc.solverTitle || '社群探索會員',
                                    avatar: discDisplayAvatar,
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
                              className={`w-8 h-8 rounded-full object-cover ring-1 ring-stone-200 shadow-2xs ${
                                isDiscDeactivated ? 'opacity-80' : 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-amber-400 transition-all'
                              }`}
                              title={isDiscDeactivated ? '此帳號已註銷' : `點擊查看 ${discDisplayName} 詳細檔案`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={() => {
                                    if (isDiscDeactivated) return;
                                    const found = solvers.find((s) => s.id === disc.solverId || s.name === disc.solverName);
                                    if (found) {
                                      onSelectSolver(found);
                                    } else {
                                      onSelectSolver({
                                        id: disc.solverId,
                                        name: discDisplayName,
                                        title: disc.solverTitle || '社群探索會員',
                                        avatar: discDisplayAvatar,
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
                                  className={`text-xs ${
                                    isDiscDeactivated ? 'text-stone-500 font-bold' : `${getUserNameColorClass(disc.solverId, availableUsers, { name: disc.solverName, title: disc.solverTitle, verifiedBadge: disc.solverBadge })} hover:opacity-80 cursor-pointer transition-colors`
                                  }`}
                                  title={isDiscDeactivated ? '此帳號已註銷' : `點擊查看 ${discDisplayName} 詳細檔案`}
                                >
                                  {discDisplayName}
                                  {discDisplayName !== '此帳號已註銷' && disc.solverTitle && (
                                    <span className="text-stone-500 font-normal"> · {disc.solverTitle}</span>
                                  )}
                                </span>
                                {isDiscDeactivated && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-200">
                                    已註銷
                                  </span>
                                )}
                              </div>
                              {(() => {
                                const qMs = Date.parse(question.createdAt || '') || 0;
                                const dMs = Date.parse(disc.createdAt || '') || 0;
                                const safeDateStr = (dMs > qMs ? disc.createdAt : new Date(qMs + 3600000 * 2).toISOString()).split('T')[0];
                                return <span className="text-[10px] text-stone-400">{safeDateStr}</span>;
                              })()}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* 私聊該留言者 */}
                            {!isDiscDeactivated && currentUser.id !== disc.solverId && (
                              <button
                                onClick={() =>
                                  handlePrivateChat({
                                    id: disc.solverId,
                                    name: discDisplayName,
                                    avatar: discDisplayAvatar,
                                    title: disc.solverTitle,
                                  })
                                }
                                className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-stone-600 hover:text-amber-800 hover:bg-amber-50 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <MessageCircle className="w-3 h-3 text-amber-600" />
                                <span>私聊</span>
                              </button>
                            )}

                            {/* 刪除討論留言按鈕 (發布者本人或管理員) */}
                            {canDeleteDisc && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeletingAnswerTarget({
                                    id: disc.id,
                                    type: 'discussion',
                                    title: disc.freePreview ? disc.freePreview.slice(0, 30) : '此討論留言',
                                  })
                                }
                                className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 font-bold text-[11px] flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                                title="永久刪除此討論（直接刪除且不再存在）"
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

                        {/* 討論訊息按讚按鈕（大拇指圖示） */}
                        <div className="pl-10 pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLikeDiscussion(disc.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                              isDiscussionAnswerLiked(disc.id)
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-black'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                            title="為此討論留言按讚"
                          >
                            <ThumbsUp
                              className={`w-3.5 h-3.5 ${
                                isDiscussionAnswerLiked(disc.id)
                                  ? 'fill-white text-white'
                                  : 'text-stone-400 group-hover:text-blue-500'
                              }`}
                            />
                            <span>讚</span>
                            {(getDiscussionAnswerLikesCount(disc.id) > 0 || (disc.likes || 0) > 0) && (
                              <span className={`font-mono text-[11px] font-black ${
                                isDiscussionAnswerLiked(disc.id) ? 'text-white' : 'text-blue-700'
                              }`}>
                                {getDiscussionAnswerLikesCount(disc.id) || disc.likes || 0}
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
          )}
        </div>

        {/* 最底部更新日誌 (Changelog) */}
        {(liveQuestion.postType === 'innovation_proposal' ||
          liveQuestion.postType === 'vibecoding_app' ||
          liveQuestion.category === '網站程式' ||
          (liveQuestion.updateLogs && liveQuestion.updateLogs.length > 0)) && (
          <ProposalChangelogSection
            question={liveQuestion}
            canUpdate={canUpdateProposal}
            onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          />
        )}

        {/* 頁尾：「相似推薦」橫向右滑探索區塊 */}
        <SimilarRecommendationsSection
          currentQuestion={liveQuestion || question}
          onSelectQuestion={handleSelectQuestion}
          className="mt-4"
        />
        </>
        )}
      </div>

      {/* Modal Sticky Bottom Action Bar */}
      <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50/95 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sticky bottom-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="text-xs text-stone-500 hidden lg:block">
          {isPainPoint ? (
            <span>痛點提案途徑：可選擇「提案懸賞(不參賽)」賺取解鎖定價或懸賞，亦可選擇「提案參賽(不賺賞金)」角逐創星季競賽獎項。</span>
          ) : (
            <span>提問者或社群會員皆可付費解鎖方案；亦可直接採納方案發放懸賞。</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-nowrap overflow-x-auto">
          {isOwnPublishedWork && liveQuestion.status !== 'delisted' && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm('要將這件作品／提案下架嗎？下架後不會出現在公開列表，之後仍可聯繫平台協助恢復。')) return;
                  if (unpublishOwnQuestion(liveQuestion.id)) onClose();
                }}
                className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <span>自行下架</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmDeleteQuestionOpen(true)}
                className="px-3 py-2 rounded-xl border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>永久刪除</span>
              </button>
            </>
          )}
          {isAdmin && question.status !== 'delisted' && (
            <button
              type="button"
              onClick={() => {
                setUnifiedActionTab('violation');
                setIsUnifiedActionModalOpen(true);
              }}
              className="px-3 sm:px-3.5 py-2 rounded-xl border-2 border-rose-600 bg-white text-rose-700 hover:bg-rose-600 hover:text-white active:bg-rose-700 active:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
              title="管理員違規處置：將此提問／作品／提案強制下架"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>違規下架</span>
            </button>
          )}
          {canUpdateProposal && (
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="px-3 sm:px-3.5 py-2 rounded-xl border-2 border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white active:bg-emerald-700 active:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              title="重新編輯提案內容並發布更新日誌"
            >
              <FileEdit className="w-3.5 h-3.5 shrink-0" />
              <span>更新內容</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 sm:px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-200 text-xs font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            {isFullPage ? '返回市場' : '關閉'}
          </button>
          {isPainPoint ? (
            <>
              {/* 痛點選項 1: 提案懸賞(不參賽) */}
              <button
                onClick={() => {
                  if (currentUser.id === 'user-guest') {
                    promptLogin('訪客模式請先登入帳號以提出方案');
                    return;
                  }
                  onOpenSubmitAnswer('solution');
                }}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                title="提交方案以賺取解鎖定價或懸賞金（不參與創星季競賽）"
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>提案懸賞(不參賽)</span>
              </button>
              {/* 痛點選項 2: 提案參賽(不賺賞金) */}
              <button
                onClick={handleGoToChallengeProposal}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                title="針對此痛點提交創星季競賽解方提案，角逐競賽大獎（不賺取提問者賞金）"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>提案參賽(不賺賞金)</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (currentUser.id === 'user-guest') {
                  promptLogin('訪客模式請先登入帳號以提出方案');
                  return;
                }
                onOpenSubmitAnswer('solution');
              }}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>提出方案(賺賞金)</span>
            </button>
          )}
          <button
            onClick={() => {
              if (currentUser.id === 'user-guest') {
                promptLogin('訪客模式請先登入帳號以參與討論');
                return;
              }
              onOpenSubmitAnswer('discussion');
            }}
            className="px-3 sm:px-3.5 py-2 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs active:scale-95 whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>公開討論</span>
          </button>
        </div>
      </div>
    </div>
  );

  const displayContent = isVibeCodingApp ? (
    <VibeCodingCaseDetailContent
      question={liveQuestion}
      isFullPage={isFullPage}
      onClose={onClose}
      authorDisplayName={authorDisplayName}
      authorDisplayAvatar={authorDisplayAvatar}
      authorColorClass={getUserNameColorClass(question.authorId, availableUsers, {
        isOfficial: question.isOfficial,
        name: question.authorName,
        title: question.authorTitle,
      })}
      referencedPainPointObj={referencedPainPointObj}
      onSelectReferencedPainPoint={handleSelectQuestion}
      canUpdateProposal={Boolean(canUpdateProposal)}
      isBookmarked={Boolean(isBookmarked)}
      onToggleBookmark={() => toggleBookmarkQuestion(question.id)}
      isLiked={Boolean(isLiked)}
      likesCount={likesCount}
      onToggleLike={handleLikeQuestionClick}
      onOpenTipModal={() => setIsTipModalOpen(true)}
      onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
      onShare={handleShareQuestion}
      isShareCopied={isUrlCopied}
      discussionsCount={discussionAnswers.length}
      discussionAnswers={discussionAnswers}
      quickComment={quickComment}
      setQuickComment={setQuickComment}
      onQuickCommentSubmit={handleQuickCommentSubmit}
      guestPreviewOnly={guestPreviewOnly}
      onRequestLogin={() => openAuthModal('login')}
      onOpenReportModal={() => setIsDisputeModalOpen(true)}
    />
  ) : (
    content
  );

  return (
    <>
      {isFullPage ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{displayContent}</div>
      ) : (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-4 overflow-y-auto">
          {displayContent}
        </div>
      )}

      {/* 舉報此問題彈窗 */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-stone-900">舉報此問題</h3>
              </div>
              <button
                onClick={() => setIsDisputeModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-950 space-y-1">
              <span className="font-bold block">舉報與違規審查說明</span>
              <p className="text-[11px] text-stone-600 leading-relaxed font-normal">
                若您發現此問題涉及廣告垃圾、侵權抄襲、違法不當或異常，請選擇類別並提交，平台審查小組將於 24 小時內啟動核查。
              </p>
            </div>

            {/* 申訴檢舉原因快捷選擇 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                舉報原因類別 *
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                {[
                  { id: 'fraud', label: '釣魚網站 / 涉嫌詐騙' },
                  { id: 'copyright', label: '盜版侵權 / 抄襲剽竊' },
                  { id: 'illegal', label: '非法資訊 / 兒童不宜暴力' },
                  { id: 'spam', label: '違規廣告 / 惡意灌水' },
                  { id: 'inappropriate', label: '不當言論 / 人身攻擊' },
                  { id: 'other', label: '其他違規或異常原因' },
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
              placeholder="請詳細說明您舉報此問題的事實與理由（例如：內容包含不實商業廣告、侵害專利、惡意洗版等）..."
              className="w-full p-3 rounded-xl border border-stone-300 text-xs text-stone-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 leading-relaxed"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDisputeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!disputeReasonInput.trim()) return;
                  reportQuestionDispute(question.id, disputeReasonInput.trim());
                  setIsDisputeModalOpen(false);
                  setDisputeReasonInput('');
                  if (addNotification) {
                    addNotification({
                      title: '🚩 已收到您的舉報',
                      message: '感謝您的回報！平台審查團隊已收到案件，將於 24 小時內完成調查審核。',
                      type: 'system',
                    });
                  }
                }}
                disabled={!disputeReasonInput.trim()}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-bold text-xs cursor-pointer shadow-2xs disabled:opacity-50"
              >
                確認送出舉報
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 整合版：違規/刪除 處置 Modal (暫存 7 日，期間可恢復，過後永久抹除) */}
      {isUnifiedActionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">問題處置（違規下架 / 直接刪除）</h3>
                  <p className="text-[11px] text-rose-600 font-bold">均暫存 7 日，期間管理員可恢復，過後永久抹除</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnifiedActionModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 目標問題資訊 */}
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <span className="text-stone-500 font-semibold block">目標問題：</span>
              <p className="font-bold text-stone-900 line-clamp-2">{question.title}</p>
              <div className="text-[11px] text-stone-500 pt-0.5 flex items-center gap-2">
                <span>發布者：{authorDisplayName}</span>
                <span>•</span>
                <span>懸賞：{(question.bounty || 0) > 0 ? `NT$ ${(question.bounty || 0).toLocaleString()}` : isPainPoint ? '痛點' : 'L0 免費'}</span>
              </div>
            </div>

            {/* Tab 切換：違規下架 vs 直接刪除 */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-stone-100 border border-stone-200 gap-1">
              <button
                type="button"
                onClick={() => setUnifiedActionTab('violation')}
                className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  unifiedActionTab === 'violation'
                    ? 'bg-white text-rose-900 shadow-xs border border-rose-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>違規下架（填理由並通知）</span>
              </button>
              <button
                type="button"
                onClick={() => setUnifiedActionTab('delete')}
                className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  unifiedActionTab === 'delete'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-300'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Trash className="w-3.5 h-3.5 text-stone-700" />
                <span>直接刪除（無理由直接下架）</span>
              </button>
            </div>

            {/* ① 違規下架模式 */}
            {unifiedActionTab === 'violation' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-800 block">
                    違規原因 <span className="text-rose-500">*（必填，將載於違規通知信函）</span>
                  </label>
                  <div className="space-y-1.5">
                    {[
                      '違反社群守則與文明交流規範',
                      '包含廣告宣傳、垃圾商業推銷或無意義洗版',
                      '涉及未經授權之智慧財產權或個人隱私侵犯',
                      '含有誘導線下直接交易、詐騙疑慮或不實資訊',
                      '問題描述嚴重不明確、無實質需求或重複濫發',
                    ].map((preset) => (
                      <label
                        key={preset}
                        onClick={() => {
                          setDelistReasonPreset(preset);
                          setDelistCustomReason('');
                        }}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition-all ${
                          delistReasonPreset === preset && !delistCustomReason
                            ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                            : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="delist_preset_opt"
                          checked={delistReasonPreset === preset && !delistCustomReason}
                          onChange={() => {}}
                          className="accent-rose-600"
                        />
                        <span>{preset}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-1">
                    <input
                      type="text"
                      value={delistCustomReason}
                      onChange={(e) => setDelistCustomReason(e.target.value)}
                      placeholder="或自行輸入其他違規事由..."
                      className="w-full p-2.5 text-xs rounded-xl border border-stone-300 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-800 block">
                    管理員改善指引或處置說明 <span className="text-stone-400 font-normal">（選填，將通知提問者）</span>
                  </label>
                  <textarea
                    value={delistFeedbackInput}
                    onChange={(e) => setDelistFeedbackInput(e.target.value)}
                    placeholder="例如：請修正問題內含之敏感聯絡資訊後向客服申訴重新上架..."
                    rows={2}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-200 leading-relaxed"
                  />
                </div>

                {/* 違規須填寫理由並且通知但不一定刪除（可選） */}
                <label className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 cursor-pointer hover:bg-stone-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={alsoDeleteMarked}
                    onChange={(e) => setAlsoDeleteMarked(e.target.checked)}
                    className="mt-0.5 accent-rose-600 w-4 h-4 rounded cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-900 block">
                      同時將此問題移入 7 日刪除暫存區（可選）
                    </span>
                    <span className="text-[11px] text-stone-500 leading-relaxed block mt-0.5">
                      若未勾選則僅強制下架停權展示；若勾選則同步標記排程刪除，7 日後自動永久抹除。
                    </span>
                  </div>
                </label>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
                  <p className="font-bold">處置說明：</p>
                  <p>1. 執行後將發送系統違規通知給提問者，並自前台市場與探索頁面即刻隱藏。</p>
                  <p>2. 管理員於 7 日暫存期間內可隨時在「問題或提案」執行「恢復上架」或「立即永久抹除」。</p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUnifiedActionModalOpen(false)}
                    disabled={isActionProcessing}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUnifiedViolation}
                    disabled={isActionProcessing || (!delistReasonPreset && !delistCustomReason.trim())}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isActionProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>正在處理...</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>確認執行違規下架</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ② 直接刪除模式 */}
            {unifiedActionTab === 'delete' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-stone-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-950">
                    <Trash className="w-4 h-4 text-rose-600" />
                    <span>無須填寫理由・直接下架並進入 7 日刪除暫存區</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-stone-600 text-[11px] leading-relaxed pl-1">
                    <li>該問題將直接自全站前台市場、探索列表與排行榜中移除，任何用戶皆無法再看見或提案。</li>
                    <li>進入 <strong>7 日暫存保留期</strong>，期間管理員可隨時自後台「問題或提案」執行「恢復上架」。</li>
                    <li>滿 7 日後系統將自動自雲端資料庫（Firestore）徹底永久抹除資料。</li>
                    {(question.bounty || 0) > 0 && question.status !== 'solved' && (
                      <li className="font-bold text-emerald-800">
                        若有未結案之懸賞，原預扣之 <strong>NT$ {(question.bounty || 0).toLocaleString()}</strong> 點將自動全額原路退還至提問者可用餘額。
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUnifiedActionModalOpen(false)}
                    disabled={isActionProcessing}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUnifiedDirectDelete}
                    disabled={isActionProcessing}
                    className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isActionProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>正在刪除暫存...</span>
                      </>
                    ) : (
                      <>
                        <Trash className="w-3.5 h-3.5 text-rose-400" />
                        <span>確認直接刪除（7日暫存）</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. 刪除問題二次確認 Modal */}
      {isConfirmDeleteQuestionOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900">永久刪除此{isOwnPublishedWork ? '作品／提案' : '問題'}確認</h3>
                <p className="text-xs text-rose-600 font-bold">直接刪除且不再存在・資料庫同步全端抹除</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-stone-700 space-y-2">
              <p className="font-bold text-rose-950">您即將永久刪除以下{isOwnPublishedWork ? '作品／提案' : '問題'}：</p>
              <p className="font-extrabold text-stone-900 bg-white p-2.5 rounded-xl border border-rose-100 line-clamp-2">
                {question.title}
              </p>
              <ul className="list-disc list-inside space-y-1 text-stone-600 pt-1 text-[11px] leading-relaxed">
                <li>此{isOwnPublishedWork ? '作品／提案' : '問題'}將自全站、前台市場、個人中心與雲端資料庫（Firestore）徹底永久抹除。</li>
                {(question.bounty || 0) > 0 && question.status !== 'solved' && (
                  <li className="font-bold text-emerald-800">
                    系統將自動將原發案預扣之懸賞金 <strong>NT$ {(question.bounty || 0).toLocaleString()}</strong> 點 100% 全額原路退還至您的帳戶可用餘額。
                  </li>
                )}
                <li>若此問題已有已採納之交易，受法律與合約存證保護之已完成交易不受影響。</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteQuestionOpen(false)}
                disabled={isDeletingProcessing}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                取消返回
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuestion}
                disabled={isDeletingProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>正在抹除...</span>
                  </>
                ) : (
                  <>
                    <Trash className="w-3.5 h-3.5" />
                    <span>確認永久刪除{isOwnPublishedWork ? '作品／提案' : '問題'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 刪除提案 / 討論二次確認 Modal */}
      {deletingAnswerTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900">
                  {deletingAnswerTarget.type === 'solution' ? '永久刪除提案方案確認' : '永久刪除討論留言確認'}
                </h3>
                <p className="text-xs text-rose-600 font-bold">直接刪除且不再存在・全站與資料庫同步抹除</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-stone-700 space-y-2">
              <p className="font-bold text-rose-950">
                您確定要永久刪除此{deletingAnswerTarget.type === 'solution' ? '提案方案' : '討論留言'}嗎？
              </p>
              {deletingAnswerTarget.title && (
                <p className="text-stone-800 bg-white p-2.5 rounded-xl border border-rose-100 line-clamp-2 text-xs italic">
                  「{deletingAnswerTarget.title}」
                </p>
              )}
              <p className="text-[11px] text-stone-500 leading-relaxed">
                確認後將自雲端資料庫徹底抹除，永不再現，亦不再計入方案統計。此操作無法復原。
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAnswerTarget(null)}
                disabled={isDeletingProcessing}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAnswer}
                disabled={isDeletingProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>正在刪除...</span>
                  </>
                ) : (
                  <>
                    <Trash className="w-3.5 h-3.5" />
                    <span>確認永久刪除</span>
                  </>
                )}
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

      {isTipModalOpen && (
        <TipPainPointModal
          isOpen={isTipModalOpen}
          onClose={() => setIsTipModalOpen(false)}
          question={question}
        />
      )}

      {isUpdateModalOpen && (
        <UpdateProposalModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          question={liveQuestion}
        />
      )}

      {isTransferModalOpen && (
        <AdminTransferWorkOwnershipModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          question={liveQuestion || question}
          onSuccess={() => {
            setIsTransferModalOpen(false);
          }}
        />
      )}

      {isConvertWorkTypeModalOpen && (
        <AdminConvertWorkTypeModal
          isOpen={isConvertWorkTypeModalOpen}
          question={liveQuestion || question}
          onClose={() => setIsConvertWorkTypeModalOpen(false)}
          onSuccess={(updatedList) => {
            setIsConvertWorkTypeModalOpen(false);
            const updated = updatedList[0];
            if (updated && addNotification) {
              addNotification({
                title: '轉性成功',
                message: `已成功將「${updated.appName || updated.title}」轉性為${updated.postType === 'vibecoding_app' ? '「軟體作品」' : '「創新提案」'}！`,
                type: 'system',
              });
            }
          }}
        />
      )}
    </>
  );
};

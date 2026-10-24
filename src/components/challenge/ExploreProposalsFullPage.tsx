import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  ArrowLeft,
  ArrowRight,
  FileText,
  AlertCircle,
  CheckCircle2,
  Coins,
  LogIn,
  RefreshCw,
  Plus,
  Users,
  GraduationCap,
  TrendingUp,
  Award,
  Megaphone,
  Heart,
  Star,
  MessageSquare,
  Percent,
  Search,
  Filter,
  ArrowUpDown,
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  ShieldCheck,
  Flame,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  Layers,
  User as UserIcon,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isGuestUser } from '../../utils/userDisplay';
import { GuestBoardGateBlurOverlay } from '../GuestBoardGateBlurOverlay';
import { getUniqueProposalCoverImage } from '../../utils/proposalImageUtils';
import {
  StarSeasonProposal,
  CompetitionAccount,
  ProposalComment,
  STAR_SEASON_TRACKS,
  OFFICIAL_COMPETITION_TRACKS,
  getProposalCardAuthorText,
} from '../../types/competition';
import { DEFAULT_DEMO_PROPOSALS } from '../../data/competitionProposals';
import { shareOrCopyUrl } from '../../utils/shareUtils';
import { applyRealClicksToProposals, recordProposalViewClick } from '../../utils/proposalClicks';
import { ProposalDetailFullPage } from './ProposalDetailFullPage';
import { isFakeProposal } from './StarSeasonView';
import { isSimulatedUser, isSimulatedQuestion } from '../../data/virtualProposalsSeed';
import {
  likeProposal,
  supportProposal,
  fetchProposalComments,
  postProposalComment,
  fetchUserLikedProposalIds,
  fetchSingleProposal,
  recordProposalView,
} from '../../services/competitionClientService';
import {
  updateSEOForProposal,
  resetSEOToDefault,
  getProposalShareUrl,
} from '../../services/seoService';
import { auth } from '../../services/firebase';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';
import { StarSeasonBroadcastBanner } from './StarSeasonBroadcastBanner';
import { StarSeasonGuideModal } from './StarSeasonGuideModal';
import { findReferencedPainPoint, findProposalsReferencingPainPoint } from '../../utils/painPointLinking';
import { GUEST_VISIBLE_COUNT, GUEST_BLURRED_TEASER_COUNT, registerGuestListExposure } from '../../utils/guestAccess';

interface ExploreProposalsFullPageProps {
  onNavigate: (view: 'home' | 'proposal' | 'explore' | 'rules' | 'submit' | 'participant' | 'judge' | 'ambassador') => void;
  onBackToOldSite: () => void;
  onOpenAuth: () => void;
  onOpenPainPointInChuangDianZi?: (item: any) => void;
  initialSectionTab?: 'solution' | 'pain_point';
  initialProposalId?: string | null;
  proposals: StarSeasonProposal[];
  onRefreshProposals: () => Promise<void>;
  account: CompetitionAccount | null;
  onRefreshAccount: () => Promise<void>;
}

export const ExploreProposalsFullPage: React.FC<ExploreProposalsFullPageProps> = ({
  onNavigate,
  onBackToOldSite,
  onOpenAuth,
  onOpenPainPointInChuangDianZi,
  initialSectionTab,
  initialProposalId,
  proposals: initialProposals,
  onRefreshProposals,
  account,
  onRefreshAccount,
}) => {
  const {
    currentUser,
    addNotification,
    showCenterToast,
    questions,
    setSelectedQuestion,
    toggleSecondQuestion,
    setQuestionLikeState,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
    isQuestionSeconded,
    getQuestionSecondCount,
    isSimulatedDataPurged,
    isRaceMode,
  } = useApp();
  const [stageInfo, setStageInfo] = useState(() => getCompetitionStageInfo());

  useEffect(() => {
    const handleStageChange = () => {
      setStageInfo(getCompetitionStageInfo());
    };
    window.addEventListener('ideax_competition_stage_changed', handleStageChange);
    return () => window.removeEventListener('ideax_competition_stage_changed', handleStageChange);
  }, []);

  // 區分「解方提案」與「痛點問題」兩大部分
  const [activeSectionTab, setActiveSectionTab] = useState<'solution' | 'pain_point'>(initialSectionTab || 'solution');

  const [proposals, setProposals] = useState<StarSeasonProposal[]>(() => {
    const list = initialProposals && initialProposals.length > 0 ? initialProposals : [];
    return applyRealClicksToProposals(list);
  });
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<'funding' | 'likes' | 'comments' | 'latest'>('funding');
  const [cardViewMode, setCardViewMode] = useState<'large' | 'compact'>('large');
  const [likedProposalIds, setLikedProposalIds] = useState<string[]>([]);

  // 彈窗狀態
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<StarSeasonProposal | null>(() => {
    if (initialProposalId && initialProposals && initialProposals.length > 0) {
      return initialProposals.find((p) => p.id === initialProposalId) || null;
    }
    return null;
  });
  const [selectedProposalForSupport, setSelectedProposalForSupport] = useState<StarSeasonProposal | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [supportAmount, setSupportAmount] = useState<number>(1000);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState<boolean>(false);

  // 彈窗狀態：導覽與我的收藏
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState<boolean>(false);

  // 留言狀態
  const [activeComments, setActiveComments] = useState<ProposalComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null);
  const [expandedMobileSummaryId, setExpandedMobileSummaryId] = useState<string | null>(null);

  useEffect(() => {
    if (initialProposals && initialProposals.length > 0) {
      const merged = initialProposals
        .filter((p) => !isFakeProposal(p))
        .map((p) => {
          const matchedQ = (questions || []).find((q) => q.id === p.id);
          if (matchedQ && typeof matchedQ.likes === 'number' && matchedQ.likes > 0) {
            return { ...p, likeCount: matchedQ.likes };
          }
          return p;
        });
      setProposals(applyRealClicksToProposals(merged));
    } else {
      setProposals([]);
    }
  }, [initialProposals, questions, isSimulatedDataPurged, isRaceMode]);

  useEffect(() => {
    if (initialProposalId) {
      const found = proposals.find((p) => p.id === initialProposalId);
      if (found) {
        if (!selectedProposalForDetail || selectedProposalForDetail.id !== initialProposalId) {
          handleOpenProposalDetail(found);
        }
      } else {
        fetchSingleProposal(initialProposalId).then((fetched) => {
          if (fetched && (!selectedProposalForDetail || selectedProposalForDetail.id !== initialProposalId)) {
            handleOpenProposalDetail(fetched);
          }
        });
      }
    }
  }, [initialProposalId, proposals]);

  // 載入當前使用者收藏名單
  useEffect(() => {
    if (auth.currentUser && currentUser.id !== 'user-guest') {
      fetchUserLikedProposalIds()
        .then((ids) => {
          if (Array.isArray(ids)) setLikedProposalIds(ids);
        })
        .catch(() => {});
    } else {
      setLikedProposalIds([]);
    }
  }, [currentUser?.id]);

  // 監聽 URL 參數或子路徑，支援直接開箱提案詳情
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parseAndOpenProposal = async () => {
      let targetId: string | null = null;
      const params = new URLSearchParams(window.location.search);
      targetId = params.get('proposalId') || params.get('p') || params.get('id');

      if (!targetId) {
        const path = window.location.pathname;
        if (path.includes('/proposal/')) {
          targetId = path.split('/proposal/')[1].split('/')[0].split('?')[0];
        }
      }

      if (!targetId && window.location.hash) {
        const hashStr = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hashStr.startsWith('?') ? hashStr.slice(1) : hashStr);
        targetId = hashParams.get('proposalId') || hashParams.get('p');
        if (!targetId && hashStr.includes('/proposal/')) {
          targetId = hashStr.split('/proposal/')[1].split('/')[0].split('?')[0];
        }
      }

      if (targetId) {
        // 若已經正在顯示該提案，切勿重複打開觸發循環
        if (selectedProposalForDetail && selectedProposalForDetail.id === targetId) {
          return;
        }
        let found = proposals.find((p) => p.id === targetId);
        if (!found) {
          found = (await fetchSingleProposal(targetId)) || undefined;
        }
        if (found) {
          handleOpenProposalDetail(found);
        }
      }
    };

    parseAndOpenProposal();
    window.addEventListener('popstate', parseAndOpenProposal);
    return () => window.removeEventListener('popstate', parseAndOpenProposal);
  }, [proposals.length, initialProposalId]);

  const prevExploreProposalIdRef = React.useRef<string | null>(null);

  // 同步 URL 與動態 SEO
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (selectedProposalForDetail) {
      prevExploreProposalIdRef.current = selectedProposalForDetail.id;
      updateSEOForProposal(selectedProposalForDetail);
      const url = new URL(window.location.href);
      if (url.searchParams.get('proposalId') !== selectedProposalForDetail.id) {
        url.searchParams.set('proposalId', selectedProposalForDetail.id);
        window.history.replaceState({ proposalId: selectedProposalForDetail.id }, '', url.toString());
      }
    } else if (prevExploreProposalIdRef.current) {
      prevExploreProposalIdRef.current = null;
      resetSEOToDefault();
      const url = new URL(window.location.href);
      if (url.searchParams.has('proposalId')) {
        url.searchParams.delete('proposalId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [selectedProposalForDetail?.id]);

  const showToast = (message: string) => {
    addNotification({
      title: '探索Idea',
      message,
      type: 'system',
    });
    showCenterToast(
      message.includes('成功') ? '留言發布成功！' : '提示',
      message,
      {
        type: message.includes('成功') ? 'success' : 'info',
        duration: 2200,
      }
    );
  };

  // 篩選提案（依需求：先把創星季的痛點和提案隱藏起來，時間到再公開；創星季全面隱藏假提案與示範提案）
  const filteredProposals = proposals.filter((p) => {
    // 創星季排除假提案與展示用示範提案
    if (isFakeProposal(p)) return false;

    // 嚴格僅顯示提案解方 (stage === 'solution')，排除痛點
    if (p.stage === 'pain_point') return false;

    // 在第二階段預先提案 (11/14 10:00, activeStage >= 2) 時間到達前，隱藏所有創星季提案
    if (stageInfo.activeStage < 2) {
      return false;
    }

    // 當提案階段 (11/14 起) 開始時，排除所有示範資料 (demo- 與 test-)
    if (stageInfo.isProposalStage || stageInfo.isExpertReviewStage || stageInfo.isResultsStage) {
      if (p.id.startsWith('demo-') || p.id.startsWith('test-')) {
        return false;
      }
    }

    if (selectedTrack !== 'all' && p.track !== selectedTrack) return false;
    if (searchKeyword.trim()) {
      const rawKw = searchKeyword.trim().toLowerCase();
      const kw = rawKw.replace(/^#/, '').trim();
      if (kw) {
        const matchTitle = p.title.toLowerCase().includes(kw);
        const matchSummary = p.summary.toLowerCase().includes(kw);
        const matchAuthor = p.authorName.toLowerCase().includes(kw);
        const matchPain = p.sourcePainPointTitle?.toLowerCase().includes(kw) || false;
        const matchTag = p.tags?.some((t: string) => t.toLowerCase().includes(kw)) || false;
        if (!matchTitle && !matchSummary && !matchAuthor && !matchPain && !matchTag) return false;
      }
    }
    return true;
  });

  // 排序提案
  const sortedProposals = [...filteredProposals].sort((a, b) => {
    if (sortBy === 'funding') {
      return (b.supportPoints || 0) - (a.supportPoints || 0);
    }
    if (sortBy === 'likes') {
      return (b.likeCount || 0) - (a.likeCount || 0);
    }
    if (sortBy === 'comments') {
      return (b.commentsCount || 0) - (a.commentsCount || 0);
    }
    if (sortBy === 'latest') {
      return (Date.parse((b as any).createdAt || '') || 0) - (Date.parse((a as any).createdAt || '') || 0);
    }
    return 0;
  });

  // 依賽程階段與結果動態產生解方卡片圖片右下角標籤：
  // 1. 進入決選階段：藍色「決選」
  // 2. 名次公布後：金黃色「冠軍」、灰銀色「亞軍」、銅褐色「季軍」、「4~10名」
  const renderCornerBadge = (proposal: StarSeasonProposal, idx: number) => {
    const rank = proposal.finalRank;
    const isResultsPublished = stageInfo.isResultsStage || (rank !== undefined && rank > 0);

    if (isResultsPublished && rank && rank > 0) {
      if (rank === 1) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 border border-amber-300 shadow-sm shrink-0 flex items-center gap-0.5">
            <span>🏆</span>
            <span>冠軍</span>
          </span>
        );
      }
      if (rank === 2) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-slate-200 to-gray-300 text-slate-800 border border-slate-300 shadow-sm shrink-0 flex items-center gap-0.5">
            <span>🥈</span>
            <span>亞軍</span>
          </span>
        );
      }
      if (rank === 3) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-white border border-amber-600 shadow-sm shrink-0 flex items-center gap-0.5">
            <span>🥉</span>
            <span>季軍</span>
          </span>
        );
      }
      if (rank >= 4 && rank <= 10) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-700/95 text-stone-100 border border-stone-600 shadow-sm shrink-0">
            4~10名
          </span>
        );
      }
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-sm shrink-0">
          決選
        </span>
      );
    }

    // 當賽事進入決選階段時 (stageInfo.isExpertReviewStage 或入圍前20名)：
    const isFinalist = proposal.isFinalist || (proposal.isFinalistSelected) || idx < 20;
    if (stageInfo.isExpertReviewStage || isFinalist) {
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-sm shrink-0">
          決選
        </span>
      );
    }

    return null;
  };

  // 彙整全部痛點問題（依時程於 10/24 00:00 第一階段痛點徵件開跑後公開，未到時間前先隱藏）
  const allPainPoints = useMemo(() => {
    if (stageInfo.activeStage < 1) {
      return [];
    }

    const list: Array<{
      id: string;
      title: string;
      category: string;
      subcategory: string;
      tags: string[];
      authorName: string;
      authorAvatar: string;
      views: number;
      solutionsCount: number;
      description?: string;
      rawProposal?: StarSeasonProposal;
      rawQuestion?: any;
    }> = [];

    // 1. 創星季徵件之痛點提案（排除所有假提案與示範提案）
    (proposals || [])
      .filter((p) => p.stage === 'pain_point' && !isFakeProposal(p))
      .forEach((p) => {
        const trackMeta = STAR_SEASON_TRACKS[p.track] || STAR_SEASON_TRACKS.ai_applications;
        list.push({
          id: p.id,
          title: p.title,
          category: trackMeta.name || '日常疑難',
          subcategory: p.cohort || '痛點徵件',
          tags: ['痛點', trackMeta.name, '徵點子'],
          authorName: p.authorName || '創星季參賽者',
          authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          views: p.viewsCount || 36,
          solutionsCount: p.commentsCount || 0,
          description: p.summary,
          rawProposal: p,
        });
      });

    // 2. 舊站創點子/痛點集問題（在創星季那邊先隱藏模擬假痛點）
    (questions || [])
      .filter((q) => (q.postType === 'pain_point' || q.tags?.includes('痛點') || q.specialZone === 'pain_points') && !isSimulatedQuestion(q) && !isSimulatedUser(q.authorId))
      .forEach((q) => {
        if (!list.some((item) => item.id === q.id || item.title === q.title)) {
          list.push({
            id: q.id,
            title: q.title,
            category: q.category || '日常疑難',
            subcategory: q.subcategory || '其他',
            tags: q.tags || ['生活痛點', '日常難題'],
            authorName: q.authorName || 'IdeaX 創點子用戶',
            authorAvatar: q.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            views: q.views || 0,
            solutionsCount: q.answersCount || 0,
            description: q.description,
            rawQuestion: q,
          });
        }
      });

    return list;
  }, [proposals, questions, stageInfo.activeStage]);

  const filteredPainPoints = useMemo(() => {
    const filtered = allPainPoints.filter((item: any) => {
      if (selectedTrack !== 'all') {
        const trackMeta = STAR_SEASON_TRACKS[selectedTrack as keyof typeof STAR_SEASON_TRACKS];
        if (trackMeta && !item.category.includes(trackMeta.name) && !item.tags.includes(trackMeta.name)) {
          return false;
        }
      }
      if (searchKeyword.trim()) {
        const rawKw = searchKeyword.trim().toLowerCase();
        const kw = rawKw.replace(/^#/, '').trim();
        if (kw) {
          const matchTitle = item.title.toLowerCase().includes(kw);
          const matchDesc = item.description?.toLowerCase().includes(kw);
          const matchAuthor = item.authorName.toLowerCase().includes(kw);
          const matchTag = item.tags.some((t: string) => t.toLowerCase().includes(kw));
          if (!matchTitle && !matchDesc && !matchAuthor && !matchTag) return false;
        }
      }
      return true;
    });
    if (sortBy === 'likes') {
      return [...filtered].sort((a: any, b: any) => getQuestionSecondCount(b.id) - getQuestionSecondCount(a.id));
    }
    if (sortBy === 'comments') {
      return [...filtered].sort((a: any, b: any) => (b.commentsCount || 0) - (a.commentsCount || 0));
    }
    return filtered;
  }, [allPainPoints, selectedTrack, searchKeyword, sortBy, getQuestionSecondCount]);

  // 依採用此痛點的獲獎方案，為對應痛點標注冠軍痛點、亞軍痛點、季軍痛點、4~10名痛點
  const getPainPointAwardBadge = (painPointTitle: string, painPointId: string) => {
    // 尋找採用此痛點之獲獎提案
    const adoptingWinner = proposals.find((p) => {
      if (p.stage === 'pain_point') return false;
      const matchId = p.sourcePainPointId && (p.sourcePainPointId === painPointId || p.sourcePainPointId === painPointTitle);
      const matchTitle = p.sourcePainPointTitle && (p.sourcePainPointTitle.includes(painPointTitle) || painPointTitle.includes(p.sourcePainPointTitle));
      return (matchId || matchTitle) && (p.finalRank || p.isFinalist);
    });

    if (!adoptingWinner) return null;

    const rank = adoptingWinner.finalRank;
    const isResultsPublished = stageInfo.isResultsStage || (rank !== undefined && rank > 0);

    if (isResultsPublished && rank && rank > 0) {
      if (rank === 1) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 border border-amber-300 shadow-2xs shrink-0 flex items-center gap-1">
            <span>🏆</span>
            <span>冠軍痛點</span>
          </span>
        );
      }
      if (rank === 2) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-slate-200 to-gray-300 text-slate-800 border border-slate-300 shadow-2xs shrink-0 flex items-center gap-1">
            <span>🥈</span>
            <span>亞軍痛點</span>
          </span>
        );
      }
      if (rank === 3) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-white border border-amber-600 shadow-2xs shrink-0 flex items-center gap-1">
            <span>🥉</span>
            <span>季軍痛點</span>
          </span>
        );
      }
      if (rank >= 4 && rank <= 10) {
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-700/95 text-stone-100 border border-stone-600 shadow-2xs shrink-0">
            4~10名痛點
          </span>
        );
      }
    }

    // 決選階段或決選提案所採用
    if (stageInfo.isExpertReviewStage || adoptingWinner.isFinalist) {
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs shrink-0">
          決選痛點
        </span>
      );
    }

    return null;
  };

  // 愛心按讚/收藏切換（同步寫入 Firestore 資料庫）
  const handleToggleLike = async (proposalId: string) => {
    if (!currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }
    const targetProp = proposals.find((p) => p.id === proposalId);
    const currentLikes = targetProp?.likeCount ?? getQuestionSecondCount(proposalId) ?? 0;
    try {
      const res = await likeProposal(proposalId, currentLikes);
      if (res.success) {
        setLikedProposalIds((prev) =>
          res.liked ? Array.from(new Set([...prev, proposalId])) : prev.filter((id) => id !== proposalId)
        );
        setProposals((prev) =>
          prev.map((p) => (p.id === proposalId ? { ...p, likeCount: res.likeCount } : p))
        );
        if (selectedProposalForDetail?.id === proposalId) {
          setSelectedProposalForDetail((prev) =>
            prev ? { ...prev, likeCount: res.likeCount } : null
          );
        }
        setQuestionLikeState(proposalId, res.liked, res.likeCount);
        showToast(res.liked ? '❤️ 已按 Like 並加入「我的 Like」清單！' : '已取消 Like');
      }
    } catch {
      const fallback = toggleSecondQuestion(proposalId);
      setLikedProposalIds((prev) =>
        fallback.isSeconded ? Array.from(new Set([...prev, proposalId])) : prev.filter((id) => id !== proposalId)
      );
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, likeCount: fallback.count } : p))
      );
      if (selectedProposalForDetail?.id === proposalId) {
        setSelectedProposalForDetail((prev) =>
          prev ? { ...prev, likeCount: fallback.count } : null
        );
      }
      showToast(fallback.isSeconded ? '❤️ 已按 Like 並加入「我的 Like」清單！' : '已取消 Like');
    }
  };

  // 開啟詳情與留言（點看來看才算一次瀏覽次數）
  const handleOpenProposalDetail = async (proposal: StarSeasonProposal) => {
    const nextViews = recordProposalViewClick(proposal.id, proposal.viewsCount || (proposal as any).views || 36);
    setProposals((prev) =>
      prev.map((p) => (p.id === proposal.id ? { ...p, viewsCount: nextViews } : p))
    );
    setSelectedProposalForDetail({ ...proposal, viewsCount: nextViews });

    // 同步寫入雲端 Firestore 資料庫，解決重新整理或更新歸零問題
    recordProposalView(proposal.id).then((cloudCount) => {
      if (typeof cloudCount === 'number' && cloudCount > 0) {
        setProposals((prev) =>
          prev.map((p) => (p.id === proposal.id ? { ...p, viewsCount: Math.max(nextViews, cloudCount) } : p))
        );
        setSelectedProposalForDetail((prev) =>
          prev && prev.id === proposal.id ? { ...prev, viewsCount: Math.max(nextViews, cloudCount) } : prev
        );
      }
    });

    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('proposalId', proposal.id);
        window.history.replaceState({ proposalId: proposal.id }, '', url.toString());
      }
    } catch {}
    setIsLoadingComments(true);
    try {
      const comms = await fetchProposalComments(proposal.id);
      setActiveComments(comms);
    } catch {
      setActiveComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // 發表留言
  const handleAddComment = async () => {
    if (!selectedProposalForDetail) return;
    if (!auth.currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }
    if (!newCommentText.trim()) {
      showToast('請輸入留言內容');
      return;
    }
    setIsSubmittingComment(true);
    try {
      const res = await postProposalComment(selectedProposalForDetail.id, newCommentText.trim());
      if (res.success && res.comment) {
        setActiveComments((prev) => [...prev, res.comment!]);
        setNewCommentText('');
        setProposals((prev) =>
          prev.map((p) =>
            p.id === selectedProposalForDetail.id
              ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
              : p
          )
        );
        setSelectedProposalForDetail((prev) =>
          prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null
        );
        showToast('留言發表成功！');
      } else {
        showToast(res.error || '發表失敗');
      }
    } catch (err: any) {
      showToast(err.message || '發表失敗');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 支持投點
  const handleConfirmSupport = async () => {
    if (!selectedProposalForSupport) return;
    if (stageInfo.isPainPointStage) {
      showToast('ℹ️ 創星幣模擬募資將於 11/16 ~ 12/04 正式開跑！目前為第一階段「痛點徵件」期。');
      return;
    }
    if (stageInfo.isPreProposalStage) {
      showToast('ℹ️ 11/14 ~ 11/15 為「預先提案期」，暫時關閉募資(投資)功能，僅供提案審核與預覽！模擬募資注資將於 11/16 正式開跑。');
      return;
    }
    if (stageInfo.isCrowdfundingClosed) {
      showToast('⚠️ 創星季模擬募資已於 12/04 截止注資！感謝全體會員支持。');
      return;
    }
    if (!stageInfo.isInvestmentEnabled) {
      showToast('ℹ️ 模擬募資(投資)功能僅於 11/16 ~ 12/04 開放！');
      return;
    }
    if (!auth.currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }
    if (supportAmount <= 0) {
      showToast('請輸入大於 0 之注資創星幣額度');
      return;
    }
    setIsSubmittingSupport(true);
    try {
      const res = await supportProposal({
        proposalId: selectedProposalForSupport.id,
        points: supportAmount,
      });
      if (res.success) {
        showToast(`🎉 成功注資 ${supportAmount.toLocaleString()} 創星幣！感謝您的創星注資。`);
        await onRefreshProposals();
        await onRefreshAccount();
        setIsSupportModalOpen(false);
      } else {
        showToast(res.message || '注資失敗');
      }
    } catch (err: any) {
      showToast(err.message || '注資失敗');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const handleCopyProposalLink = async (pId: string) => {
    const canonicalUrl = getProposalShareUrl(pId);
    const targetProp = proposals.find((p) => p.id === pId) || selectedProposalForDetail;
    const shareTitle = targetProp?.title || '創星季創新提案';

    // 依需求：原生分享與複製必須是單獨網址，不附加文案
    const res = await shareOrCopyUrl({
      title: shareTitle,
      url: canonicalUrl,
    });

    if (res === 'copied') {
      setCopiedProposalId(pId);
      showToast('🔗 提案專屬公開網址已複製！');
      setTimeout(() => setCopiedProposalId(null), 2500);
    }
  };

  // 總計數據
  const totalPoints = proposals.reduce((acc, p) => acc + (p.supportPoints || 0), 0);
  const totalSupporters = proposals.reduce((acc, p) => acc + (p.supporterCount || 0), 0);

  // 1. 點進去提案本身就是有獨立網址的完整全頁面，而非彈出視窗！
  if (selectedProposalForDetail) {
    const isFromCreateIdeasActive =
      sessionStorage.getItem('ideax_from_create_ideas') === 'true' ||
      new URL(window.location.href).searchParams.get('zone') === 'create_ideas';
    return (
      <ProposalDetailFullPage
        proposal={selectedProposalForDetail}
        allProposals={proposals}
        onSelectProposal={(p) => handleOpenProposalDetail(p)}
        isFromCreateIdeas={isFromCreateIdeasActive}
        onBack={() => {
          setSelectedProposalForDetail(null);
          const url = new URL(window.location.href);
          const isFromCreateIdeas =
            sessionStorage.getItem('ideax_from_create_ideas') === 'true' ||
            url.searchParams.get('zone') === 'create_ideas';

          url.searchParams.delete('proposalId');
          url.searchParams.delete('zone');
          window.history.replaceState({}, '', url.toString());

          if (isFromCreateIdeas) {
            sessionStorage.removeItem('ideax_from_create_ideas');
            if (onBackToOldSite) {
              onBackToOldSite();
            }
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent('ideax_select_special_zone', {
                  detail: { zone: 'create_ideas' },
                })
              );
            }, 50);
          }
        }}
        onToggleLike={handleToggleLike}
        isLiked={likedProposalIds.includes(selectedProposalForDetail.id)}
        comments={activeComments}
        isLoadingComments={isLoadingComments}
        onAddComment={async (text) => {
          const res = await postProposalComment(selectedProposalForDetail.id, text);
          if (res.success && res.comment) {
            setActiveComments((prev) => [...prev, res.comment!]);
            setProposals((prev) =>
              prev.map((p) =>
                p.id === selectedProposalForDetail.id
                  ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
                  : p
              )
            );
            setSelectedProposalForDetail((prev) =>
              prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null
            );
            showToast('留言發表成功！');
          } else {
            showToast(res.error || '發表失敗');
          }
        }}
        onSupport={(p) => {
          setSelectedProposalForSupport(p);
          setIsSupportModalOpen(true);
        }}
        stageInfo={stageInfo}
        isLoggedIn={Boolean(auth.currentUser && currentUser.id !== 'user-guest')}
        onOpenAuth={onOpenAuth}
        onSolvePainPoint={(p) => {
          try {
            sessionStorage.setItem(
              'ideax_challenge_prefill_topic',
              JSON.stringify({
                id: p.id,
                title: p.title,
                serial: p.id,
                summary: p.summary,
                track: p.track,
              })
            );
          } catch {}
          setSelectedProposalForDetail(null);
          if (!auth.currentUser || currentUser.id === 'user-guest') {
            onOpenAuth();
            return;
          }
          onNavigate('submit');
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 selection:bg-amber-300 selection:text-stone-950 font-sans">
      {/* 頂部固定導覽列 */}
      <header className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {/* 創星季廣播橫幅：誠徵各行業專家參與注資，注資額300萬（點擊申請） */}
        <StarSeasonBroadcastBanner onApply={() => onNavigate('judge')} />

        {/* 導覽列核心主行 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 左側：品牌 Logo (點燈泡回 IdeaX 創點子平台首頁，點創星季回競賽首頁) */}
            <div className="flex items-center gap-1.5 shrink-0 -ml-1 sm:-ml-2">
              <button
                type="button"
                onClick={() => {
                  onBackToOldSite();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
                title="點擊回到 IdeaX 創點子平台首頁"
                aria-label="回到 IdeaX 創點子平台首頁"
              >
                <img src="/logo-bulb.png" alt="IdeaX 創點子平台 - 點擊回首頁" className="w-10.5 h-10.5 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0 drop-shadow-xs group-hover:scale-105 transition-all" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center group -ml-1"
                title="點擊返回創星季首頁"
                aria-label="回創星季競賽首頁"
              >
                <img src="/logo-chuangxingji-text.png" alt="創星季 - 點擊回競賽首頁" className="h-7.5 sm:h-9 md:h-10.5 w-auto object-contain shrink-0 group-hover:opacity-90 transition-all" />
              </button>
            </div>
          </div>

          {/* 右側：登入、痛點、導覽、我的收藏、回首頁按鈕群 */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* 1. 痛點專區捷徑 */}
            <button
              type="button"
              onClick={() => {
                setActiveSectionTab('pain_point');
                const el = document.getElementById('section-tabs-container') || document.getElementById('market-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                activeSectionTab === 'pain_point'
                  ? 'bg-rose-500 text-white shadow-xs font-black'
                  : 'bg-white hover:bg-rose-50 text-stone-700 border border-stone-200 hover:border-rose-300'
              }`}
              title="切換至切身生活與產業痛點問題清單"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>痛點</span>
            </button>

            {/* 2. 創星季網站導覽 */}
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 border border-amber-500/40 text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-98"
              title="開啟創星季網站導覽（3 大角色 30 秒上手）"
            >
              <span className="text-xs">🔰</span>
              <span className="hidden sm:inline">創星季網站導覽</span>
              <span className="sm:hidden">導覽</span>
            </button>

            {/* 4. 登入 / 註冊 或 已登入狀態 */}
            {currentUser && currentUser.id !== 'user-guest' && currentUser.id !== 'guest' ? (
              <div className="flex items-center gap-1.5 bg-white border border-amber-300 px-2 sm:px-2.5 py-1 rounded-2xl text-xs shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-stone-950 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <span className="font-bold text-stone-800 text-xs truncate max-w-[60px] sm:max-w-[90px]">
                  {currentUser.name}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-stone-800 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-98"
                title="登入或註冊 IdeaX 帳號"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-600" />
                <span>登入</span>
              </button>
            )}

            {/* 5. 回首頁 */}
            <button
              type="button"
              onClick={() => {
                onNavigate('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
              title="返回創星季首頁"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>回首頁</span>
            </button>
          </div>
        </div>
      </header>

      {/* 滿版標題與探索介紹區 */}
      <section className="bg-gradient-to-b from-amber-100/70 via-yellow-50/50 to-stone-50 border-b border-amber-200/70 pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-4xl font-black text-stone-950 tracking-tight">
                  解方提案
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {stageInfo.activeStage < 2 ? '11/14 10:00 開放公開' : '競賽提案公開中'}
                </span>
              </div>
              <p className="text-stone-700 text-xs sm:text-sm mt-1 max-w-2xl font-bold text-amber-900">
                使用 創星幣 支持你認同的創新提案，模擬市場關注度
              </p>
            </div>

            {/* 快速注資點數卡片 */}
            {!isGuestUser(currentUser) && account && (
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300 shadow-2xs flex items-center gap-3 shrink-0 self-start sm:self-auto">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Coins className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-[11px] text-stone-500 font-bold flex items-center gap-1.5">
                    <span>您的可用創星幣</span>
                    {account.role === 'admin' ? (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">👑 管理員</span>
                    ) : account.role === 'solver' ? (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">👑 專家</span>
                    ) : null}
                  </div>
                  <div className="font-mono font-black text-amber-700 text-lg">
                    {account.availablePoints.toLocaleString()} <span className="text-xs text-stone-600">創星幣</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 指標概覽條 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] text-stone-500 font-bold">提案總數</div>
                <div className="text-lg font-black font-mono text-stone-900">{filteredProposals.length} 件</div>
              </div>
              <FileText className="w-4 h-4 text-amber-500" />
            </div>

            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] text-stone-500 font-bold">全網已投創星幣</div>
                <div className="text-lg font-black font-mono text-amber-600">{(stageInfo.activeStage < 2 ? 0 : totalPoints).toLocaleString()} 創星幣</div>
              </div>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>

            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] text-stone-500 font-bold">支持總人次</div>
                <div className="text-lg font-black font-mono text-rose-600">{stageInfo.activeStage < 2 ? 0 : totalSupporters} 次</div>
              </div>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>

            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] text-stone-500 font-bold">前 20 名</div>
                <div className="text-lg font-black text-emerald-700">入圍決選資格</div>
              </div>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
      </section>

      {/* 提案總覽主體內容與篩選器 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* 階段與賽道篩選器 */}
        <div className="space-y-4 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* 切換「解方提案」與「痛點問題」兩大專區 */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200/90 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveSectionTab('solution')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeSectionTab === 'solution'
                    ? 'bg-amber-400 text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-white/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-stone-950" />
                <span>解方提案</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-950/10 font-bold">
                  {filteredProposals.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSectionTab('pain_point')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeSectionTab === 'pain_point'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-white/60'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>痛點問題</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/20 font-bold">
                  {filteredPainPoints.length}
                </span>
              </button>
            </div>

            {/* 我的 Like / 我的附議 + 關鍵字搜尋 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFavoritesModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 hover:border-rose-300 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-98 shrink-0"
                title={activeSectionTab === 'pain_point' ? '查看我的附議清單' : '查看我的個人 Like 提案清單'}
              >
                {activeSectionTab === 'pain_point' ? (
                  <span className="px-1 py-0.2 rounded text-[10px] font-mono font-black leading-none bg-rose-100 text-rose-700 border border-rose-300">
                     +1
                  </span>
                ) : (
                  <Heart className={`w-3.5 h-3.5 ${likedProposalIds.length > 0 ? 'text-rose-500 fill-rose-500' : 'text-stone-400'}`} />
                )}
                <span>{activeSectionTab === 'pain_point' ? '我的附議' : '我的 Like'}</span>
                {likedProposalIds.length > 0 && (
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-black">
                    {likedProposalIds.length}
                  </span>
                )}
              </button>

              <div className="relative flex-1 sm:flex-initial">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜尋提案標題、摘要、提案人..."
                  className="w-full sm:w-64 bg-white border border-stone-200 rounded-xl px-3.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* 領域探索標籤與排序切換列 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
            {/* 領域標籤過濾（分類僅作為方便識別不作為競賽依據） */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
              <button
                onClick={() => setSelectedTrack('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shadow-2xs ${
                  selectedTrack === 'all'
                    ? 'bg-amber-500 text-stone-950 border-amber-500 font-bold'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                全部領域
              </button>
              {OFFICIAL_COMPETITION_TRACKS.map((tr) => (
                <button
                  key={tr.id}
                  onClick={() => setSelectedTrack(tr.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center shadow-2xs ${
                    selectedTrack === tr.id
                      ? 'bg-amber-100 text-amber-950 border-amber-400 font-black'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-amber-50/50'
                  }`}
                >
                  <span>{tr.name}</span>
                </button>
              ))}
            </div>

            {/* 排序方式按鈕：依募資額、按讚數、討論數 */}
            <div className="flex items-center gap-1 shrink-0 bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-2xs self-start md:self-auto">
              <span className="text-[10px] font-black text-stone-400 px-2 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                <span>排序</span>
              </span>
              <button
                type="button"
                onClick={() => setSortBy('funding')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'funding'
                    ? 'bg-amber-400 text-stone-950 shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/70'
                }`}
                title="依募資額高至低排序"
              >
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>依募資額</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('likes')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'likes'
                    ? 'bg-rose-500 text-white shadow-2xs font-black'
                    : 'text-stone-600 hover:text-rose-600 hover:bg-white/70'
                }`}
                title={activeSectionTab === 'pain_point' ? '依 +1 附議數高至低排序' : '依 ❤️ Like 數高至低排序'}
              >
                {activeSectionTab === 'pain_point' ? (
                  <>
                    <span
                      className={`px-1 py-0.2 rounded text-[10px] font-mono font-black leading-none ${
                        sortBy === 'likes' ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700 border border-rose-300'
                      }`}
                    >
                      +1
                    </span>
                    <span>附議數</span>
                  </>
                ) : (
                  <>
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        sortBy === 'likes' ? 'fill-white text-white' : 'text-rose-500 fill-rose-500/20'
                      }`}
                    />
                    <span>Like 數</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSortBy('comments')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'comments'
                    ? 'bg-indigo-600 text-white shadow-2xs font-black'
                    : 'text-stone-600 hover:text-indigo-600 hover:bg-white/70'
                }`}
                title="依討論留言數高至低排序"
              >
                <MessageSquare className={`w-3.5 h-3.5 ${sortBy === 'comments' ? 'text-white' : 'text-indigo-500'}`} />
                <span>討論數</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('latest')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'latest'
                    ? 'bg-sky-600 text-white shadow-2xs font-black'
                    : 'text-stone-600 hover:text-sky-700 hover:bg-white/70'
                }`}
                title="依提交時間由新到舊排序"
              >
                <Clock className={`w-3.5 h-3.5 ${sortBy === 'latest' ? 'text-white' : 'text-sky-500'}`} />
                <span>最新</span>
              </button>
            </div>

            {/* 卡片模式切換：大卡片模式（顯示圖片） vs 簡潔卡片模式 */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setCardViewMode('large')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  cardViewMode === 'large'
                    ? 'bg-white text-stone-900 shadow-2xs font-black'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="大卡片模式：顯示上傳圖片與完整預覽"
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>大卡片</span>
              </button>
              <button
                type="button"
                onClick={() => setCardViewMode('compact')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  cardViewMode === 'compact'
                    ? 'bg-white text-stone-900 shadow-2xs font-black'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="簡潔卡片模式：純文字簡述/概述"
              >
                <FileText className="w-3.5 h-3.5 text-stone-500" />
                <span>簡潔</span>
              </button>
            </div>
          </div>
        </div>

        {/* 提案總覽卡片清單 / 痛點問題專區 (依分頁切換) */}
        {activeSectionTab === 'solution' ? (
          sortedProposals.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-4 shadow-xs">
            <Clock className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-stone-800">
              {stageInfo.activeStage < 2
                ? '創星季「解方提案」將於 11/14 10:00 正式開放公開'
                : '目前尚無符合篩選條件的競賽提案'}
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              {stageInfo.activeStage < 2
                ? '目前尚未到達解方提案公開時程（11/14 10:00 開放預先提案、11/16 10:00 開放創星幣模擬募資），時間到達後將自動公開展示！'
                : '成為本屆創星季的開創先行者！點擊上方「我要投稿」提交您的痛點腦洞或落地解法。'}
            </p>
            {stageInfo.activeStage >= 2 && (
              <button
                onClick={() => {
                  if (!auth.currentUser || currentUser.id === 'user-guest') {
                    onOpenAuth();
                    return;
                  }
                  onNavigate('submit');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-stone-950 font-black text-xs hover:bg-amber-300 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>我要投件參賽</span>
              </button>
            )}
          </div>
        ) : (
          (() => {
            const isGuest = isGuestUser(currentUser);
            const visibleProposals = isGuest ? sortedProposals.slice(0, GUEST_VISIBLE_COUNT) : sortedProposals;
            if (isGuest) registerGuestListExposure(sortedProposals);
            const blurredProposals = isGuest && sortedProposals.length > GUEST_VISIBLE_COUNT ? sortedProposals.slice(GUEST_VISIBLE_COUNT, GUEST_VISIBLE_COUNT + GUEST_BLURRED_TEASER_COUNT) : [];

            const renderProposalCard = (proposal: StarSeasonProposal, idx: number) => {
              const currentPoints = proposal.supportPoints || 0;
              const trackMeta = STAR_SEASON_TRACKS[proposal.track] || STAR_SEASON_TRACKS.ai_applications;
              const supporterCount = proposal.supporterCount || Math.max(1, Math.round(currentPoints / 2500));
              const coverImg = getUniqueProposalCoverImage(proposal, idx);

              return (
                <div
                  key={proposal.id}
                  onClick={() => handleOpenProposalDetail(proposal)}
                  className="bg-white rounded-3xl border border-stone-200/90 hover:border-amber-400 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group overflow-hidden cursor-pointer"
                >
                  {/* 大卡片模式或預設封面大圖 */}
                  {cardViewMode === 'large' && (
                    <div
                      onClick={() => handleOpenProposalDetail(proposal)}
                      className="relative aspect-video overflow-hidden bg-stone-900 border-b border-stone-100 cursor-pointer group/img"
                    >
                      <img src={coverImg} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-70" />
                      <img
                        src={coverImg}
                        alt={proposal.title}
                        className="relative w-full h-full object-contain group-hover/img:scale-[1.03] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                      {/* 左上角標籤：賽道領域 */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-stone-900 border border-white/40 shadow-xs">
                          {trackMeta.name}
                        </span>
                      </div>

                      {/* 右上角標籤：示範標籤與階段標籤 (競賽網站不需要綠色創星季標籤) */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 border border-amber-300 shadow-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-pulse" />
                          示範
                        </span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs ${
                            proposal.stage === 'pain_point'
                              ? 'bg-rose-500/90 text-white'
                              : 'bg-emerald-600/90 text-white'
                          }`}
                        >
                          {proposal.stage === 'pain_point' ? '徵點子' : '想解方'}
                        </span>
                      </div>

                      {/* 圖片底部學校/機構與團隊 subtitle 及右下角獲獎/決選標籤 */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white/95 text-xs font-bold drop-shadow-sm">
                        <div className="flex items-center gap-1.5 truncate">
                          {getProposalCardAuthorText(proposal).isOrgVisible ? (
                            <GraduationCap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          )}
                          <span className="truncate">{getProposalCardAuthorText(proposal).displayText}</span>
                        </div>
                        <div className="shrink-0">
                          {renderCornerBadge(proposal, idx)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 卡片內容主體 */}
                  <div className="p-3.5 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* 簡潔模式時顯示的標籤列 */}
                      {cardViewMode === 'compact' && (
                        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-stone-100">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                              {trackMeta.name}
                            </span>
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              示範
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                proposal.stage === 'pain_point'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {proposal.stage === 'pain_point' ? '徵點子' : '想解方'}
                            </span>
                            <div className="shrink-0">
                              {renderCornerBadge(proposal, idx)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 簡潔模式時顯示團隊與機構資訊 */}
                      {cardViewMode === 'compact' && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-600 font-bold truncate">
                          {getProposalCardAuthorText(proposal).isOrgVisible ? (
                            <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span className="truncate">{getProposalCardAuthorText(proposal).displayText}</span>
                        </div>
                      )}

                      {/* 提案標題 */}
                      <h3
                        onClick={() => handleOpenProposalDetail(proposal)}
                        className="text-base font-black text-stone-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2 cursor-pointer"
                      >
                        {proposal.title}
                      </h3>

                      {/* 若為解方且引用痛點 */}
                      {(() => {
                        const refPainObj = findReferencedPainPoint(proposal as any, questions || []);
                        const rawRef = proposal.sourcePainPointTitle || proposal.referencedPainPoint;
                        if (!refPainObj && !rawRef) return null;
                        return (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (refPainObj) {
                                if (onOpenPainPointInChuangDianZi) {
                                  onOpenPainPointInChuangDianZi(refPainObj);
                                } else {
                                  setSelectedQuestion(refPainObj);
                                }
                              }
                            }}
                            className={`p-2 rounded-xl bg-rose-50/90 border border-rose-200/80 text-[11px] space-y-0.5 transition-colors ${
                              refPainObj ? 'hover:bg-rose-100/80 hover:border-rose-300 cursor-pointer' : ''
                            }`}
                            title={refPainObj ? '點擊前往查看對應之痛點貼文' : undefined}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-rose-900 font-bold flex items-center gap-1">
                                <Flame className="w-3 h-3 text-rose-600" />
                                解決痛點：
                              </span>
                              {refPainObj && (
                                <span className="text-[10px] font-black text-rose-700">
                                  查看痛點貼文 ➔
                                </span>
                              )}
                            </div>
                            <p className="text-stone-800 line-clamp-1 font-bold">
                              {refPainObj ? refPainObj.title : String(rawRef).replace(/^\[[^\]]+\]\s*/, '')}
                            </p>
                          </div>
                        );
                      })()}

                      {/* 摘要說明：電腦版完整呈現、手機版精簡並以？收合 */}
                      <p className="hidden sm:block text-xs text-stone-600 line-clamp-3 leading-relaxed">
                        {proposal.summary}
                      </p>
                      <div className="sm:hidden">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMobileSummaryId(expandedMobileSummaryId === proposal.id ? null : proposal.id);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <HelpCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>？ {expandedMobileSummaryId === proposal.id ? '收合敘述' : '查看完整敘述'}</span>
                        </button>
                        {expandedMobileSummaryId === proposal.id && (
                          <p className="mt-1.5 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed animate-in fade-in duration-150">
                            {proposal.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 募得創星幣與支持人數數據展示 */}
                    <div className="pt-2.5">
                      <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50/50 to-orange-50/40 border border-amber-200/90 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-amber-950 font-black">
                          <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-mono text-sm sm:text-base font-black">
                            {currentPoints.toLocaleString()}
                          </span>
                          <span className="text-xs font-bold text-amber-800">創星幣</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-stone-700 font-bold text-xs sm:text-sm">
                          <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="font-mono font-bold text-stone-800">
                            {supporterCount} 人支持
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 底部操作與互動列 */}
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-stone-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      {/* 社群互動 (⭐ 收藏、❤️ Like、留言) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isAdded = toggleBookmarkQuestion(proposal.id);
                            showToast(isAdded ? '⭐ 已收藏提案，並收錄至我的按讚收藏！' : '已取消收藏提案');
                          }}
                          className={`p-1.5 px-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                            isQuestionBookmarked(proposal.id)
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                          title={isQuestionBookmarked(proposal.id) ? '⭐ 已收藏' : '⭐ 收藏'}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isQuestionBookmarked(proposal.id)
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-stone-400'
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLike(proposal.id);
                          }}
                          className={`p-1.5 px-2 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                            likedProposalIds.includes(proposal.id)
                              ? 'bg-rose-500 text-white border-rose-500'
                              : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                          }`}
                          title={likedProposalIds.includes(proposal.id) ? '❤️ 已 Like' : '❤️ Like'}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              likedProposalIds.includes(proposal.id)
                                ? 'fill-white text-white'
                                : 'fill-rose-500 text-rose-500'
                            }`}
                          />
                          <span className="text-[11px] font-mono">{proposal.likeCount || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProposalDetail(proposal);
                          }}
                          className="p-1.5 px-2 rounded-lg bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 text-amber-600 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="查看評論留言"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[11px] font-mono text-amber-600">{proposal.commentsCount || 0}</span>
                        </button>
                      </div>

                      {/* 按鈕組：查看提案 & 注資創星幣 */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProposalDetail(proposal);
                          }}
                          className="py-1.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors cursor-pointer shrink-0"
                        >
                          查看提案
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (stageInfo.activeStage === 0) {
                              showToast('ℹ️ 創星季籌備中，第一階段痛點徵件將於 10/24 00:00 正式開跑！');
                              return;
                            }
                            if (stageInfo.isPreProposalStage) {
                              showToast('ℹ️ 11/14 ~ 11/15 為預先提案期，暫時關閉募資(投資)功能，僅供審核與預覽！11/16 起開放注資。');
                              return;
                            }
                            if (!stageInfo.isInvestmentEnabled) {
                              showToast('ℹ️ 模擬募資(投資)功能將於 11/16 ~ 12/04 開放！');
                              return;
                            }
                            setSelectedProposalForSupport(proposal);
                            setIsSupportModalOpen(true);
                          }}
                          className={`py-1.5 px-3 rounded-xl text-xs transition-colors cursor-pointer shadow-2xs ${
                            !stageInfo.isInvestmentEnabled
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 font-bold'
                              : 'bg-amber-400 hover:bg-amber-300 text-stone-950 font-black'
                          }`}
                        >
                          {stageInfo.isPreProposalStage ? '預覽中' : '為他注資'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {visibleProposals.map((proposal, idx) => renderProposalCard(proposal, idx))}
                </div>

                {isGuest && sortedProposals.length > GUEST_VISIBLE_COUNT && (
                  <GuestBoardGateBlurOverlay
                    remainingCount={sortedProposals.length - GUEST_VISIBLE_COUNT}
                    totalCount={sortedProposals.length}
                    boardName="創星季解方提案看板"
                    onOpenAuth={onOpenAuth}
                    blurredPreviewChildren={
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {blurredProposals.map((proposal, idx) => renderProposalCard(proposal, idx + 3))}
                      </div>
                    }
                  />
                )}
              </>
            );
          })()
        )
      ) : (
        /* 痛點問題專區（附圖一卡片形式不顯示圖片，3欄展示） */
        filteredPainPoints.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-4 shadow-xs">
            <Clock className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-stone-800">
              {stageInfo.activeStage < 1
                ? '創星季第一階段「痛點徵件」將於 10/24 00:00 正式開放公開'
                : '目前尚無符合篩選條件的痛點問題'}
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              {stageInfo.activeStage < 1
                ? '目前為賽前報名預熱階段，創星季痛點題庫將於 10/24 00:00 第一階段痛點徵件開跑時自動公開展示！'
                : '成為本屆創星季的開創先行者！提出切身的生活或產業瓶頸痛點，過審即享 200 點獎勵！'}
            </p>
            {stageInfo.activeStage >= 1 && (
              <button
                onClick={() => {
                  if (!auth.currentUser || currentUser.id === 'user-guest') {
                    onOpenAuth();
                    return;
                  }
                  onNavigate('submit');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-stone-950 font-black text-xs hover:bg-amber-300 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>提出生活或產業痛點</span>
              </button>
            )}
          </div>
        ) : (
          (() => {
            const isGuest = isGuestUser(currentUser);
            const visiblePainPoints = isGuest ? filteredPainPoints.slice(0, GUEST_VISIBLE_COUNT) : filteredPainPoints;
            if (isGuest) registerGuestListExposure(filteredPainPoints);
            const blurredPainPoints = isGuest && filteredPainPoints.length > GUEST_VISIBLE_COUNT ? filteredPainPoints.slice(GUEST_VISIBLE_COUNT, GUEST_VISIBLE_COUNT + GUEST_BLURRED_TEASER_COUNT) : [];

            const renderPainPointCard = (pp: any) => (
              <div
                key={pp.id}
                onClick={() => {
                  // 點進去卡片一樣要連到創點子的對應痛點！
                  if (onOpenPainPointInChuangDianZi) {
                    onOpenPainPointInChuangDianZi(pp);
                  } else if (onBackToOldSite) {
                    onBackToOldSite();
                  }
                }}
                className="group bg-white rounded-3xl border border-stone-200/90 hover:border-amber-400 p-5 sm:p-6 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer space-y-4 hover:-translate-y-0.5"
              >
                <div className="space-y-3">
                  {/* 標籤列：領域/分類 + 痛點獎項標籤 (冠軍痛點/亞軍痛點/季軍痛點/4~10名痛點/決選痛點) */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-950 border border-amber-200/80">
                        {pp.subcategory || pp.category}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        痛點徵件
                      </span>
                    </div>
                    <div>{getPainPointAwardBadge(pp.title, pp.id)}</div>
                  </div>

                  {/* 痛點標題 */}
                  <h3 className="font-black text-stone-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2 text-base">
                    {pp.title}
                  </h3>

                  {/* 痛點描述/概述 (3行) */}
                  <p className="text-stone-600 text-xs line-clamp-3 leading-relaxed bg-stone-50/70 p-3 rounded-2xl border border-stone-100">
                    {pp.description || '生活切身痛點，徵求落地架構與完整解方！點擊卡片直接連至創點子查看完整提問與回覆方案。'}
                  </p>

                  {/* 標籤 */}
                  {pp.tags && pp.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {pp.tags.slice(0, 4).map((t: string, tidx: number) => (
                        <span
                          key={tidx}
                          className="text-[10px] text-stone-500 font-medium bg-stone-50 px-2 py-0.5 rounded-lg border border-stone-150"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 解決此痛點的提案列表預覽 */}
                  {(() => {
                    const solvingList = findProposalsReferencingPainPoint(pp.rawQuestion || (pp as any), questions || []);
                    if (solvingList.length === 0) return null;
                    return (
                      <div className="p-2.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between text-emerald-900 font-black">
                          <span>💡 解決此痛點的提案（{solvingList.length} 件）</span>
                        </div>
                        <div className="space-y-1">
                          {solvingList.slice(0, 2).map((sp) => (
                            <div
                              key={sp.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                const matchedInProposals = proposals.find((p) => p.id === sp.id);
                                if (matchedInProposals) {
                                  handleOpenProposalDetail(matchedInProposals);
                                } else {
                                  const matchedQ = (questions || []).find((q) => q.id === sp.id) || sp;
                                  setSelectedQuestion(matchedQ);
                                }
                              }}
                              className="p-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200/70 hover:border-emerald-400 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                              title="點擊查看解決此痛點的提案貼文"
                            >
                              <span className="font-bold text-stone-800 truncate">
                                {sp.postType === 'vibecoding_app' ? '💻 ' : '💡 '}
                                {sp.title}
                              </span>
                              <span className="text-[10px] font-black text-emerald-700 shrink-0">
                                查看提案 ➔
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 底部作者與互動 */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={pp.authorAvatar}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-stone-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-800 truncate">
                        {pp.authorName}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        痛點提問人
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-stone-400 text-xs shrink-0 font-mono">
                    {/* ⭐ 收藏按鈕 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const isAdded = toggleBookmarkQuestion(pp.id);
                        showToast(isAdded ? `⭐ 已收藏痛點「${pp.title}」！` : '已取消收藏');
                      }}
                      className={`p-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center border transition-all cursor-pointer active:scale-95 ${
                        isQuestionBookmarked(pp.id)
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-amber-50 hover:text-amber-700'
                      }`}
                      title="⭐ 收藏此痛點"
                    >
                      <Star className={`w-3.5 h-3.5 ${isQuestionBookmarked(pp.id) ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
                    </button>

                    {/* 痛點 +1 附議按鍵 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const res = toggleSecondQuestion(pp.id);
                        if (res.isSeconded) {
                          addNotification(`🔥 已對痛點「${pp.title}」+1 附議！`, 'success');
                        }
                      }}
                      className={`p-1.5 px-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                        isQuestionSeconded(pp.id)
                          ? 'bg-rose-600 text-white border border-rose-600 shadow-2xs font-black'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      }`}
                      title="🔥 +1 附議此痛點"
                    >
                      <span className="font-mono font-black">+1</span>
                      {getQuestionSecondCount(pp.id) > 0 && (
                        <span className="font-mono font-black">{getQuestionSecondCount(pp.id)}</span>
                      )}
                    </button>

                    <span className="flex items-center gap-1 font-bold text-stone-600" title="已有解方或回答數量">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                      <span>{pp.solutionsCount} 個解方</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 group-hover:bg-amber-400 group-hover:text-stone-950 text-amber-900 text-xs font-black transition-colors shadow-2xs">
                      <span>前往創點子</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            );

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {visiblePainPoints.map(renderPainPointCard)}
                </div>

                {isGuest && filteredPainPoints.length > GUEST_VISIBLE_COUNT && (
                  <GuestBoardGateBlurOverlay
                    remainingCount={filteredPainPoints.length - GUEST_VISIBLE_COUNT}
                    totalCount={filteredPainPoints.length}
                    boardName="創星季痛點問題看板"
                    onOpenAuth={onOpenAuth}
                    blurredPreviewChildren={
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {blurredPainPoints.map(renderPainPointCard)}
                      </div>
                    }
                  />
                )}
              </>
            );
          })()
        )
      )}
      </main>

      {/* 提案詳細內容已由獨立完整頁面 ProposalDetailFullPage 呈現 */}

      {/* 注資創星幣 Modal */}
      {isSupportModalOpen && selectedProposalForSupport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>注資創星幣</span>
              </h3>
              <button
                onClick={() => setIsSupportModalOpen(false)}
                className="text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                <div className="font-bold text-stone-900 line-clamp-2 break-words text-xs sm:text-sm">
                  {selectedProposalForSupport.title}
                </div>
                <div className="text-stone-500 text-[11px] mt-0.5">
                  提案人：{selectedProposalForSupport.authorName}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-medium shrink-0">可用創星幣：</span>
                  <span className="font-mono font-black text-amber-700 text-sm whitespace-nowrap">
                    {account?.availablePoints.toLocaleString() || 0} 創星幣
                  </span>
                </div>

                <div className="bg-white/95 p-3 rounded-xl border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                    <span className="font-bold text-stone-900 text-xs">單案最高注資上限</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200 font-bold whitespace-nowrap">
                      可以自我注資
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                      <div className="text-[11px] text-stone-500 font-medium">參賽者與一般用戶</div>
                      <div className="font-mono font-black text-stone-900 text-xs sm:text-sm mt-0.5 whitespace-nowrap">
                        50,000 <span className="text-[11px] font-sans font-bold text-stone-500">創星幣</span>
                      </div>
                    </div>
                    <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-200/70">
                      <div className="text-[11px] text-purple-700 font-medium">產學研專家</div>
                      <div className="font-mono font-black text-purple-900 text-xs sm:text-sm mt-0.5 whitespace-nowrap">
                        2,000,000 <span className="text-[11px] font-sans font-bold text-purple-600">創星幣</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1.5">注資額度 (創星幣)</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(Number(e.target.value))}
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-mono font-bold text-base focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[1000, 5000, 10000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSupportAmount(amt)}
                    className="py-1.5 px-1 rounded-lg bg-stone-100 hover:bg-amber-100 border border-stone-200 text-[11px] font-bold text-stone-700 cursor-pointer transition-colors whitespace-nowrap text-center"
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmSupport}
                  disabled={isSubmittingSupport}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingSupport ? '處理注資中...' : `確認注資 ${supportAmount.toLocaleString()} 創星幣`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 創星季 30 秒三大角色極速導覽視窗 Modal */}
      <StarSeasonGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        initialRole="audience"
        onNavigateToExplore={() => {
          setActiveSectionTab('solution');
          setIsGuideModalOpen(false);
          const el = document.getElementById('section-tabs-container') || document.getElementById('market-grid');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onNavigateToPainPoints={() => {
          setActiveSectionTab('pain_point');
          setIsGuideModalOpen(false);
          const el = document.getElementById('section-tabs-container') || document.getElementById('market-grid');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 個人按讚收藏名單 Modal */}
      {isFavoritesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-xl w-full p-6 space-y-4 my-8 max-h-[85vh] overflow-y-auto shadow-2xl text-stone-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">我的個人 Like 提案清單</h3>
                  <p className="text-[11px] text-stone-500">按過愛心的參賽作品，隨時掌握募資進度</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFavoritesModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {proposals.filter((p) => likedProposalIds.includes(p.id)).length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Heart className="w-10 h-10 mx-auto text-stone-300 stroke-1" />
                  <p className="text-sm font-bold text-stone-600">目前尚無 Like 的提案</p>
                  <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                    在競賽提案列表點擊愛心圖示，即可將優秀的創意作品收錄至此，方便隨時追蹤與注資創星幣！
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {proposals
                    .filter((p) => likedProposalIds.includes(p.id))
                    .map((prop) => (
                      <div
                        key={prop.id}
                        className="p-3.5 rounded-2xl bg-stone-50 hover:bg-amber-50/40 border border-stone-200 hover:border-amber-300 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              {STAR_SEASON_TRACKS[prop.track]?.tag}
                            </span>
                            <span className="text-[10px] font-bold text-stone-500">
                              {prop.authorName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleLike(prop.id)}
                            className="text-rose-500 hover:text-stone-400 p-1 cursor-pointer"
                            title="取消 Like"
                          >
                            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                          </button>
                        </div>

                        <h4
                          onClick={() => {
                            setIsFavoritesModalOpen(false);
                            handleOpenProposalDetail(prop);
                          }}
                          className="font-bold text-stone-900 text-xs line-clamp-1 hover:text-amber-600 cursor-pointer"
                        >
                          {prop.title}
                        </h4>
                        <p className="text-stone-500 text-[11px] line-clamp-1">
                          {prop.summary}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

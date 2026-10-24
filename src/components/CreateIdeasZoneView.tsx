import React, { useState, useMemo, useEffect } from 'react';
import {
  Lightbulb,
  Sparkles,
  Heart,
  Star,
  Search,
  Filter,
  ArrowUpDown,
  Coins,
  Clock,
  Eye,
  MessageSquare,
  Share2,
  X,
  Pin,
  Calendar,
  Trash2,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Award,
  ChevronRight,
  PlusCircle,
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Square,
  List,
  Globe,
  ExternalLink,
  LayoutGrid,
} from 'lucide-react';
import { StarSeasonProposal, STAR_SEASON_TRACKS, OFFICIAL_COMPETITION_TRACKS } from '../types/competition';
import { getInnovationProgressStageMeta } from '../types';
import { useApp } from '../context/AppContext';
import { mapQuestionsToStarSeasonProposals } from '../utils/questionUtils';
import {
  fetchProposals,
  likeProposal,
  fetchUserLikedProposalIds,
  fetchProposalComments,
  postProposalComment,
  recordProposalView,
} from '../services/competitionClientService';
import { ProposalComment } from '../types/competition';
import { ProposalDetailFullPage } from './challenge/ProposalDetailFullPage';
import { TipPainPointModal } from './TipPainPointModal';
import type { Question } from '../types';
import { recordProposalViewClick, getEffectiveProposalViews } from '../utils/proposalClicks';
import { shareOrCopyUrl } from '../utils/shareUtils';
import { auth } from '../services/firebase';
import { findReferencedPainPoint } from '../utils/painPointLinking';
import { getSimulatedCommentsForProposalId } from '../data/virtualProposalsSeed';
import { isGuestUser, getUserNameColorClass } from '../utils/userDisplay';
import { GuestBoardGateBlurOverlay } from './GuestBoardGateBlurOverlay';
import { getUniqueProposalCoverImage } from '../utils/proposalImageUtils';
import { GUEST_VISIBLE_COUNT, GUEST_BLURRED_TEASER_COUNT, registerGuestListExposure } from '../utils/guestAccess';
import { ProposalCardMediaBanner } from './ProposalCardMediaBanner';
import { getCompetitionStageInfo } from '../utils/competitionSchedule';

export function getRemainingDaysText(unpublishAt?: string): string {
  if (!unpublishAt || unpublishAt === '永久' || unpublishAt === '永久刊登') return '永久';
  const target = new Date(unpublishAt).getTime();
  if (isNaN(target)) return unpublishAt;
  const now = new Date().getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '已到期';
  return `${diffDays}天`;
}

/** 卡片上的刊登時間：今天／昨天／N 天前；超過 30 天顯示日期 */
export function getPostedAgoText(createdAt?: string): string {
  if (!createdAt) return '';
  const t = new Date(createdAt).getTime();
  if (isNaN(t)) return createdAt;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((startOfToday.getTime() - t) / 86400000) + 1;
  if (t >= startOfToday.getTime()) return '今天';
  if (days <= 1) return '昨天';
  if (days <= 30) return `${days} 天前`;
  const d = new Date(t);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

interface CreateIdeasZoneViewProps {
  proposals?: StarSeasonProposal[];
  onSelectProposal: (proposal: StarSeasonProposal) => void;
  onOpenCreateProposal?: () => void;
  onCloseZone?: () => void;
  onTogglePin?: () => void;
  isPinned?: boolean;
  onOpenAuth?: () => void;
  onUpdateProposalPublication?: (proposalId: string, unpublishAt?: string, isUnpublished?: boolean) => void;
  onSwitchZone?: (zone: import('../types').SpecialZone) => void;
  /** 獨立提案頁：要顯示的提案 ID（網址 /ideas/:id） */
  detailProposalId?: string | null;
  /** 從提案頁返回創點子列表的搜尋區 */
  onBackFromDetail?: () => void;
}

export const CreateIdeasZoneView: React.FC<CreateIdeasZoneViewProps> = ({
  proposals: initialProposals,
  onSelectProposal,
  onOpenCreateProposal,
  onCloseZone,
  onTogglePin,
  isPinned = false,
  onOpenAuth,
  onUpdateProposalPublication,
  onSwitchZone,
  detailProposalId,
  onBackFromDetail,
}) => {
  const {
    currentUser,
    availableUsers,
    showCenterToast,
    questions,
    answers,
    setSelectedQuestion,
    isQuestionSeconded,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
    isQuestionLiked,
    toggleSecondQuestion,
    setQuestionLikeState,
    isSimulatedDataPurged,
    openAuthModal,
    publicMetricsConfig,
  } = useApp();
  const [showZoneHelp, setShowZoneHelp] = useState(false);
  // 創點子提案的打賞視窗（使用點數）
  const [tipQuestion, setTipQuestion] = useState<Question | null>(null);
  const [dbCompetitionProposals, setDbCompetitionProposals] = useState<StarSeasonProposal[]>(initialProposals || []);

  useEffect(() => {
    if (initialProposals && initialProposals.length > 0) {
      setDbCompetitionProposals(initialProposals);
    } else {
      fetchProposals()
        .then((list) => {
          if (Array.isArray(list)) setDbCompetitionProposals(list);
        })
        .catch(() => {});
    }
  }, [initialProposals]);

  const stageInfo = getCompetitionStageInfo();

  // 1. 載入提案清單 (完全從資料庫 competition_proposals 與 questions 集合讀取，不硬編碼)
  const buildMergedProposals = (baseList?: StarSeasonProposal[]) => {
    const source = baseList && baseList.length > 0 ? baseList : dbCompetitionProposals;
    const mappedFromDbQuestions = mapQuestionsToStarSeasonProposals(questions || []);
    const map = new Map<string, StarSeasonProposal>();
    // 創星季競賽提案於第二階段預先提案 (11/14 10:00, activeStage >= 2) 開跑後才公開
    if (stageInfo.activeStage >= 2) {
      source.forEach((p) => {
        if (p.id.startsWith('demo-') || p.id.startsWith('test-')) return;
        if (!map.has(p.id)) {
          map.set(p.id, p);
        }
      });
    }
    mappedFromDbQuestions.forEach((p) => {
      if (p.id.startsWith('demo-') || p.id.startsWith('test-')) return;
      if (!map.has(p.id)) {
        map.set(p.id, p);
      } else {
        const existing = map.get(p.id)!;
        map.set(p.id, {
          ...existing,
          likeCount: typeof p.likeCount === 'number' ? p.likeCount : existing.likeCount,
          supportPoints: typeof p.supportPoints === 'number' ? p.supportPoints : existing.supportPoints,
          supporterCount: typeof p.supporterCount === 'number' ? p.supporterCount : existing.supporterCount,
          images: p.images && p.images.length > 0 ? p.images : existing.images,
          youtubeUrl: p.youtubeUrl || existing.youtubeUrl,
          coverMode: p.coverMode || existing.coverMode,
          cardHoverMode: p.cardHoverMode || existing.cardHoverMode,
        });
      }
    });
    return Array.from(map.values());
  };

  const [proposalsList, setProposalsList] = useState<StarSeasonProposal[]>(() =>
    buildMergedProposals(initialProposals)
  );

  useEffect(() => {
    setProposalsList(buildMergedProposals(initialProposals));
  }, [initialProposals, dbCompetitionProposals, questions, isSimulatedDataPurged, stageInfo.activeStage]);

  // 2. 收藏名單 (Liked Proposal IDs)
  const [likedProposalIds, setLikedProposalIds] = useState<string[]>([]);
  
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

  // 3. Tab 切換: 'all' 全部提案 vs 'favorites' 我的收藏提案
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  
  // 篩選與搜尋
  const [searchKw, setSearchKw] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'support' | 'likes' | 'discussions' | 'latest'>('latest');
  const [viewMode, setViewMode] = useState<'large' | 'list' | 'grid'>('large');
  const [hoveredProposalId, setHoveredProposalId] = useState<string | null>(null);

  // 創點子內直接檢視提案專頁（不跳轉至創星季網站，返回時直接回到上一頁）
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<StarSeasonProposal | null>(null);
  const [proposalHistory, setProposalHistory] = useState<StarSeasonProposal[]>([]);
  const [activeComments, setActiveComments] = useState<ProposalComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const handleOpenProposalInCreateIdeas = async (proposal: StarSeasonProposal) => {
    if (selectedProposalForDetail && selectedProposalForDetail.id !== proposal.id) {
      setProposalHistory((prev) => [...prev, selectedProposalForDetail]);
    }
    const nextClicks = recordProposalViewClick(proposal.id, proposal.viewsCount || 0);
    const updatedProposal = { ...proposal, viewsCount: nextClicks };
    setSelectedProposalForDetail(updatedProposal);
    setProposalsList((prev) =>
      prev.map((item) => (item.id === proposal.id ? { ...item, viewsCount: nextClicks } : item))
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });

    recordProposalView(proposal.id).then((serverCount) => {
      if (typeof serverCount === 'number') {
        setProposalsList((prev) =>
          prev.map((item) =>
            item.id === proposal.id
              ? { ...item, viewsCount: Math.max(item.viewsCount || 0, serverCount) }
              : item
          )
        );
        setSelectedProposalForDetail((prev) =>
          prev && prev.id === proposal.id
            ? { ...prev, viewsCount: Math.max(prev.viewsCount || 0, serverCount) }
            : prev
        );
      }
    });

    setIsLoadingComments(true);
    try {
      const list = await fetchProposalComments(proposal.id);
      if (list.length > 0) {
        setActiveComments(list);
      } else {
        setActiveComments(getSimulatedCommentsForProposalId(proposal.id, isSimulatedDataPurged));
      }
    } catch {
      setActiveComments(getSimulatedCommentsForProposalId(proposal.id, isSimulatedDataPurged));
    } finally {
      setIsLoadingComments(false);
    }
  };

  // 獨立提案頁：網址上的提案 ID 改變時開啟對應提案（相關提案之間切換也會換網址）
  useEffect(() => {
    if (!detailProposalId) {
      if (selectedProposalForDetail) setSelectedProposalForDetail(null);
      return;
    }
    if (selectedProposalForDetail?.id === detailProposalId) return;
    const found = proposalsList.find((p) => p.id === detailProposalId);
    if (found) handleOpenProposalInCreateIdeas(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailProposalId, proposalsList.length]);

  const handleBackFromProposalDetail = () => {
    if (onBackFromDetail) {
      onBackFromDetail();
      return;
    }
    if (proposalHistory.length > 0) {
      const prevProposal = proposalHistory[proposalHistory.length - 1];
      setProposalHistory((prev) => prev.slice(0, -1));
      setSelectedProposalForDetail(prevProposal);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSelectedProposalForDetail(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ⭐ 收藏切換
  const handleToggleBookmark = (e: React.MouseEvent, proposal: StarSeasonProposal) => {
    e.stopPropagation();
    const isAdded = toggleBookmarkQuestion(proposal.id);
    showCenterToast(
      isAdded
        ? `⭐ 已收藏創新提案「${proposal.title}」，並收錄至「我的按讚收藏」！`
        : `已取消收藏「${proposal.title}」`
    );
  };

  // ❤️ Like 切換 (同步紀錄至 Firestore 資料庫與我的按讚收藏)
  const handleToggleLike = async (e: React.MouseEvent, proposal: StarSeasonProposal) => {
    e.stopPropagation();
    if (!currentUser || currentUser.id === 'user-guest') {
      if (onOpenAuth) onOpenAuth();
      else showCenterToast('請先登入帳號以 Like 提案');
      return;
    }

    try {
      const res = await likeProposal(proposal.id, proposal.likeCount || 0);
      if (res.success) {
        const isNowLiked = res.liked;
        setLikedProposalIds((prev) =>
          isNowLiked ? Array.from(new Set([...prev, proposal.id])) : prev.filter((id) => id !== proposal.id)
        );
        setProposalsList((prev) =>
          prev.map((p) => (p.id === proposal.id ? { ...p, likeCount: res.likeCount } : p))
        );
        setQuestionLikeState(proposal.id, isNowLiked, res.likeCount);
        showCenterToast(
          isNowLiked
            ? '❤️ 已按 Like 並加入「我的 Like」清單！'
            : '已取消 Like'
        );
      }
    } catch {
      const fallback = toggleSecondQuestion(proposal.id);
      setLikedProposalIds((prev) =>
        fallback.isSeconded ? Array.from(new Set([...prev, proposal.id])) : prev.filter((id) => id !== proposal.id)
      );
      setProposalsList((prev) =>
        prev.map((p) => (p.id === proposal.id ? { ...p, likeCount: fallback.count } : p))
      );
      showCenterToast(
        fallback.isSeconded
          ? '❤️ 已按 Like 並加入「我的 Like」清單！'
          : '已取消 Like'
      );
    }
  };

  // 分享提案
  const handleShare = async (e: React.MouseEvent, proposal: StarSeasonProposal) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?proposalId=${proposal.id}`;
    await shareOrCopyUrl({
      title: `【IdeaX 創點子】${proposal.title}`,
      text: `分享創新提案：${proposal.title}\n${proposal.summary}`,
      url,
    });
    showCenterToast('已複製提案網址！');
  };

  // 下架/刊登時間編輯彈窗狀態
  const [editingProposalForTime, setEditingProposalForTime] = useState<StarSeasonProposal | null>(null);
  const [customUnpublishDate, setCustomUnpublishDate] = useState<string>('');
  const [publicationMode, setPublicationMode] = useState<'permanent' | '7days' | '30days' | '90days' | 'custom'>('permanent');

  // 管理員/提案者設定刊登時間二度確認彈窗
  const [showTimeConfirmModal, setShowTimeConfirmModal] = useState<boolean>(false);
  const [pendingTimeSetting, setPendingTimeSetting] = useState<{ unpublishAt?: string; text: string } | null>(null);

  // 儲存刊登時間/下架時間設定 (觸發二度確認)
  const handleInitiateSaveTimeSetting = () => {
    if (!editingProposalForTime) return;

    let nextUnpublishAt: string | undefined = undefined;
    const now = new Date();

    if (publicationMode === '7days') {
      const d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      nextUnpublishAt = d.toISOString().split('T')[0];
    } else if (publicationMode === '30days') {
      const d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      nextUnpublishAt = d.toISOString().split('T')[0];
    } else if (publicationMode === '90days') {
      const d = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      nextUnpublishAt = d.toISOString().split('T')[0];
    } else if (publicationMode === 'custom' && customUnpublishDate) {
      nextUnpublishAt = customUnpublishDate;
    } else {
      nextUnpublishAt = undefined; // 永久刊登
    }

    const textLabel = nextUnpublishAt
      ? `刊登至 ${nextUnpublishAt} (${getRemainingDaysText(nextUnpublishAt)})`
      : '永久刊登';

    setPendingTimeSetting({
      unpublishAt: nextUnpublishAt,
      text: textLabel,
    });
    setShowTimeConfirmModal(true);
  };

  // 執行最終確定二度確認儲存
  const handleConfirmSavePublicationSetting = () => {
    if (!editingProposalForTime || !pendingTimeSetting) return;

    const nextUnpublishAt = pendingTimeSetting.unpublishAt;

    setProposalsList((prev) =>
      prev.map((p) =>
        p.id === editingProposalForTime.id
          ? { ...p, unpublishAt: nextUnpublishAt, isUnpublished: false }
          : p
      )
    );

    if (onUpdateProposalPublication) {
      onUpdateProposalPublication(editingProposalForTime.id, nextUnpublishAt, false);
    }

    showCenterToast(
      nextUnpublishAt
        ? `已更新刊登期限至 ${nextUnpublishAt} (${getRemainingDaysText(nextUnpublishAt)})`
        : '已設為永久刊登！'
    );
    setShowTimeConfirmModal(false);
    setPendingTimeSetting(null);
    setEditingProposalForTime(null);
  };

  // 手動下架提案
  const handleToggleUnpublish = (e: React.MouseEvent, proposal: StarSeasonProposal) => {
    e.stopPropagation();
    const nextStatus = !proposal.isUnpublished;
    setProposalsList((prev) =>
      prev.map((p) => (p.id === proposal.id ? { ...p, isUnpublished: nextStatus } : p))
    );
    if (onUpdateProposalPublication) {
      onUpdateProposalPublication(proposal.id, proposal.unpublishAt, nextStatus);
    }
    showCenterToast(nextStatus ? '提案已手動下架' : '提案已重新上架刊登');
  };

  // 計算有效未下架提案
  const activeProposals = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return proposalsList.filter((p) => {
      if (p.isUnpublished) return false;
      if (p.unpublishAt && p.unpublishAt < todayStr) return false; // 已過下架時間
      return true;
    });
  }, [proposalsList]);

  // 判斷是否為使用者按讚或收藏的提案
  const isProposalSavedByUser = (proposalId: string) => {
    return (
      likedProposalIds.includes(proposalId) ||
      isQuestionSeconded(proposalId) ||
      isQuestionBookmarked(proposalId) ||
      isQuestionLiked(proposalId)
    );
  };

  // 根據 Tab 篩選 (全部 vs 我的收藏)
  const filteredByTabProposals = useMemo(() => {
    if (activeTab === 'favorites') {
      return activeProposals.filter((p) => isProposalSavedByUser(p.id));
    }
    return activeProposals;
  }, [activeProposals, activeTab, likedProposalIds, questions]);

  // 關鍵字與領域篩選
  const finalFilteredProposals = useMemo(() => {
    return filteredByTabProposals.filter((p) => {
      // 領域
      if (selectedTrack !== 'all') {
        const canonicalTrack = STAR_SEASON_TRACKS[p.track]?.id || p.track;
        if (canonicalTrack !== selectedTrack) {
          return false;
        }
      }
      // 關鍵字
      if (searchKw.trim()) {
        const kw = searchKw.trim().toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(kw);
        const matchSummary = p.summary?.toLowerCase().includes(kw);
        const matchAuthor = p.authorName?.toLowerCase().includes(kw);
        const matchTeam = p.teamName?.toLowerCase().includes(kw);
        if (!matchTitle && !matchSummary && !matchAuthor && !matchTeam) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'likes') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      if (sortBy === 'discussions') {
        return (b.commentsCount || 0) - (a.commentsCount || 0);
      }
      if (sortBy === 'latest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      // Default: 最多［點數支持］
      return (b.supportPoints || 0) - (a.supportPoints || 0);
    });
  }, [filteredByTabProposals, selectedTrack, searchKw, sortBy]);

  // 我的收藏數量
  const favoriteCount = useMemo(() => {
    return activeProposals.filter((p) => isProposalSavedByUser(p.id)).length;
  }, [activeProposals, likedProposalIds, questions]);

  // 若在創點子內點進某提案專頁，直接渲染該提案完整專頁，點擊返回直接回到上一頁（不跳轉至創星季網站）
  if (selectedProposalForDetail) {
    const liveProposal =
      proposalsList.find((p) => p.id === selectedProposalForDetail.id) || selectedProposalForDetail;
    const isLiked =
      likedProposalIds.includes(liveProposal.id) || isQuestionSeconded(liveProposal.id);

    return (
      <>
      <ProposalDetailFullPage
        proposal={liveProposal}
        allProposals={activeProposals}
        onSelectProposal={(p) => (detailProposalId !== undefined ? onSelectProposal(p) : handleOpenProposalInCreateIdeas(p))}
        isFromCreateIdeas={true}
        supportCurrency="points"
        onBack={handleBackFromProposalDetail}
        onToggleLike={(pid) => {
          const target = proposalsList.find((p) => p.id === pid) || liveProposal;
          handleToggleLike({ stopPropagation: () => {} } as any, target);
        }}
        isLiked={isLiked}
        comments={activeComments}
        isLoadingComments={isLoadingComments}
        onAddComment={async (text) => {
          const res = await postProposalComment(liveProposal.id, text);
          if (res.success && res.comment) {
            setActiveComments((prev) => [...prev, res.comment!]);
            setProposalsList((prev) =>
              prev.map((p) =>
                p.id === liveProposal.id
                  ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
                  : p
              )
            );
            setSelectedProposalForDetail((prev) =>
              prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null
            );
            showCenterToast('留言發表成功！');
          } else {
            showCenterToast(res.error || '發表失敗');
          }
        }}
        onSupport={async (p) => {
          if (!auth.currentUser || currentUser.id === 'user-guest') {
            if (onOpenAuth) onOpenAuth();
            else showCenterToast('請先登入帳號以支持提案');
            return;
          }
          // 創點子的提案用「點數」打賞：開啟打賞視窗，自選點數與留言
          const q = (questions || []).find((item) => item.id === p.id);
          if (!q) {
            showCenterToast('這是創星季參賽提案，請到創星季頁面用創星幣支持');
            return;
          }
          if (q.authorId === currentUser.id) {
            showCenterToast('無法打賞給自己發布的提案');
            return;
          }
          setTipQuestion(q);
        }}
        stageInfo={{
          isPainPointStage: false,
          isPreProposalStage: false,
          isCrowdfundingClosed: false,
          isInvestmentEnabled: true,
        }}
        isLoggedIn={Boolean(auth.currentUser && currentUser.id !== 'user-guest')}
        onOpenAuth={() => {
          if (onOpenAuth) onOpenAuth();
        }}
        onSolvePainPoint={() => {
          if (onOpenCreateProposal) onOpenCreateProposal();
        }}
        showToast={showCenterToast}
      />
      {tipQuestion && (
        <TipPainPointModal
          question={(questions || []).find((q) => q.id === tipQuestion.id) || tipQuestion}
          onClose={() => setTipQuestion(null)}
        />
      )}
      </>
    );
  }

  if (detailProposalId) {
    const stillLoading = (questions || []).length === 0 && dbCompetitionProposals.length === 0;
    return (
      <div className="max-w-xl mx-auto my-16 p-6 rounded-2xl bg-white border border-stone-200 text-center space-y-3">
        <p className="text-sm font-bold text-stone-800">{stillLoading ? '提案載入中…' : '找不到這個提案，可能已下架或網址有誤。'}</p>
        {!stillLoading && (
          <button
            type="button"
            onClick={() => (onBackFromDetail ? onBackFromDetail() : setSelectedProposalForDetail(null))}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold cursor-pointer"
          >
            回到創點子
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* 專區 Main Banner Block */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-100/50 to-orange-50 border-2 border-amber-300 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />

        {/* 右上角叉叉按鈕：點擊回到全部問題 */}
        {onCloseZone && (
          <button
            type="button"
            onClick={onCloseZone}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-500 hover:text-stone-900 border border-amber-300 shadow-2xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="回到全部問題"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="relative z-10 space-y-2.5">
          {/* 第一列：圖示 + 標題 + 釘選 + 數量 */}
          <div className="flex items-center gap-2.5 flex-wrap pr-10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <Lightbulb className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-1.5 flex-wrap">
              <span>創點子 (創新提案)</span>
              {onTogglePin && (
                <button
                  type="button"
                  onClick={onTogglePin}
                  className={`p-1 rounded-lg transition-all cursor-pointer ${
                    isPinned
                      ? 'bg-amber-500 text-white border border-amber-600 shadow-xs'
                      : 'bg-white hover:bg-stone-50 text-stone-400 hover:text-stone-700 border border-stone-200'
                  }`}
                  title={isPinned ? '取消釘選此專區' : '將此專區設為首頁釘選專區'}
                >
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-white' : ''}`} />
                </button>
              )}
              <span className="text-[11px] font-mono font-black text-amber-900 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full">
                {activeProposals.length} 件專案
              </span>
            </h2>
          </div>

          {/* 第二列：說明按鈕 (左) + 發布創新提案按鈕 (置右) */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowZoneHelp(!showZoneHelp)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                showZoneHelp
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white/90 hover:bg-white text-amber-900 border-amber-300'
              }`}
              title="點擊展開/收合專區說明與刊登規範"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>說明</span>
              {showZoneHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <div className="ml-auto flex items-center gap-2">
              {onOpenCreateProposal && (
                <button
                  type="button"
                  onClick={onOpenCreateProposal}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-stone-950 font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>發布創新提案</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 點擊 ? 展開之專區介紹與刊登規範 */}
        {showZoneHelp && (
          <div className="relative z-10 mt-3 pt-3 border-t border-amber-200/80 space-y-2 animate-in fade-in duration-150">
            <p className="text-xs font-medium text-stone-700 leading-relaxed">
              匯集創星季競賽與全站大眾創新解方與作品！在此自由探索優秀點子、給予<strong>點數支持</strong>，點擊 ❤️ Like 即自動加入您的個人清單。
            </p>
            <div className="flex items-center gap-2 text-[11px] text-amber-900 font-bold bg-amber-100/70 border border-amber-200 px-2.5 py-1.5 rounded-xl w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>刊登規範：所有提案預設為『永久刊登』。提案者可隨時手動下架或自訂刊登期限。</span>
            </div>
          </div>
        )}

        {/* 篩選分類、我的收藏、搜尋與排序控制區 */}
        <div className="relative z-10 mt-3 pt-3 border-t border-amber-200/80 space-y-2">
          {/* 上排：選擇分類下拉選單 (含全部分類) + 我的 Like 收藏 */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={selectedTrack}
                onChange={(e) => {
                  setSelectedTrack(e.target.value);
                  setActiveTab('all');
                }}
                className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  activeTab === 'all'
                    ? 'bg-amber-600 text-white border border-amber-600 shadow-xs'
                    : 'bg-white/90 text-stone-800 hover:bg-white border border-amber-300'
                }`}
              >
                <option value="all" className="bg-white text-stone-900 font-bold">
                  全部分類 ({activeProposals.length})
                </option>
                {OFFICIAL_COMPETITION_TRACKS.map((track) => {
                  const count = activeProposals.filter((p) => (STAR_SEASON_TRACKS[p.track]?.id || p.track) === track.id).length;
                  return (
                    <option key={track.id} value={track.id} className="bg-white text-stone-900 font-bold">
                      {track.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'favorites' ? 'all' : 'favorites')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-rose-600 text-white shadow-xs border border-rose-600'
                  : 'bg-white/90 text-stone-700 hover:bg-white border border-amber-200/90'
              }`}
            >
              <Heart className={`w-4 h-4 shrink-0 ${activeTab === 'favorites' ? 'fill-white' : 'text-rose-500'}`} />
              <span className="truncate">我的 Like ({favoriteCount})</span>
            </button>
          </div>

          {/* 下排：搜尋框 + 排序下拉選單 + 卡片檢視切換 (大卡片/條列式/小卡片) */}
          <div id="create-ideas-search" className="scroll-mt-24 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKw}
                onChange={(e) => setSearchKw(e.target.value)}
                placeholder="搜尋提案標題、作者或團隊..."
                className="w-full pl-9 sm:pl-10 pr-7 py-2 sm:py-2.5 rounded-xl border border-amber-200 bg-white text-xs sm:text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {searchKw && (
                <button
                  type="button"
                  onClick={() => setSearchKw('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-amber-200 bg-white text-xs sm:text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shrink-0"
              >
                <option value="support">點數支持 高到低</option>
                <option value="likes">❤️ Like 最多</option>
                <option value="discussions">💬 討論數最多</option>
                <option value="latest">最新發布</option>
              </select>

              {/* 檢視模式切換 (大卡片 / 條列式 / 小卡片) */}
              <div className="inline-flex rounded-xl bg-white/90 border border-amber-200 p-0.5 sm:p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('large')}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'large'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="大卡片模式"
                >
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="條列式清單"
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="小卡片（雙欄方格）"
                >
                  <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 提案卡片清單列表 */}
      {finalFilteredProposals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center font-bold">
            {activeTab === 'favorites' ? <Heart className="w-6 h-6 text-rose-500" /> : <Lightbulb className="w-6 h-6 text-amber-600" />}
          </div>
          <h3 className="text-base font-black text-stone-800">
            {activeTab === 'favorites' ? '尚無 Like 的創新提案' : '未找到符合條件的創新提案'}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {activeTab === 'favorites'
              ? '瀏覽點子提案時，點擊卡片上的 ❤️ 即可自動加入個人清單，方便隨時追蹤與參考！'
              : '請嘗試清除關鍵字或切換領域分類。'}
          </p>
          {activeTab === 'favorites' && (
            <button
              onClick={() => setActiveTab('all')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer shadow-xs"
            >
              瀏覽全部提案
            </button>
          )}
        </div>
      ) : (
        (() => {
          const isGuest = isGuestUser(currentUser);
          const visibleProposals = isGuest ? finalFilteredProposals.slice(0, GUEST_VISIBLE_COUNT) : finalFilteredProposals;
          if (isGuest) registerGuestListExposure(finalFilteredProposals);
          const blurredProposals =
            isGuest && finalFilteredProposals.length > GUEST_VISIBLE_COUNT ? finalFilteredProposals.slice(GUEST_VISIBLE_COUNT, GUEST_VISIBLE_COUNT + GUEST_BLURRED_TEASER_COUNT) : [];

          const renderProposalCard = (proposal: StarSeasonProposal) => {
            const isLiked = isProposalSavedByUser(proposal.id);
            const isBookmarked = isQuestionBookmarked(proposal.id);
            const trackInfo = STAR_SEASON_TRACKS[proposal.track] || STAR_SEASON_TRACKS.ict;
            const isAuthorOrAdmin =
              currentUser.role === 'admin' ||
              (currentUser.id !== 'user-guest' && currentUser.id === proposal.authorId);

            // 1. 條列式 (List Mode)
            if (viewMode === 'list') {
              return (
                <div
                  key={proposal.id}
                  onClick={() => onSelectProposal(proposal)}
                  className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        {trackInfo.name}
                      </span>
                      <span className="text-[11px] font-bold text-stone-500 truncate">
                        {proposal.authorName}
                        {proposal.teamName ? ` · ${proposal.teamName}` : ''}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-stone-900 truncate group-hover:text-amber-600 transition-colors">
                      {proposal.title}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-1">
                      {proposal.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-black text-amber-700 flex items-center gap-1 justify-end">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{(proposal.supportPoints || 0).toLocaleString()} 點</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end text-[11px] text-stone-400 font-mono mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          {proposal.commentsCount || 0}
                        </span>
                        {currentUser?.role === 'admin' && (publicMetricsConfig?.showCardViews ?? true) && (
                          <span
                            className="flex items-center gap-0.5 text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-mono shadow-2xs"
                            title="管理員限定：累計點進內頁瀏覽次數"
                          >
                            <Eye className="w-2.5 h-2.5 text-purple-600" />
                            <span>{getEffectiveProposalViews(proposal.id, proposal.viewsCount || 0)} 次</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleBookmark(e, proposal)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                        isBookmarked
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-amber-50 hover:text-amber-700'
                      }`}
                      title={isBookmarked ? '⭐ 已收藏' : '⭐ 收藏'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(e, proposal)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                        isLiked
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                      }`}
                      title={isLiked ? '❤️ 已 Like' : '❤️ Like'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : 'fill-rose-500 text-rose-500'}`} />
                      <span className="font-mono">{proposal.likeCount || 0}</span>
                    </button>
                  </div>
                </div>
              );
            }

            // 2. 小卡片 (Grid Mode - 雙欄展示大圖卡片)
            if (viewMode === 'grid') {
              const fallbackImg = getUniqueProposalCoverImage(proposal);
              const isCardHovered = hoveredProposalId === proposal.id;
              return (
                <div
                  key={proposal.id}
                  onClick={() => onSelectProposal(proposal)}
                  onMouseEnter={() => setHoveredProposalId(proposal.id)}
                  onMouseLeave={() => setHoveredProposalId((prev) => (prev === proposal.id ? null : prev))}
                  className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group h-full"
                >
                  <ProposalCardMediaBanner
                    youtubeUrl={proposal.youtubeUrl}
                    coverMode={proposal.coverMode}
                    cardHoverMode={proposal.cardHoverMode}
                    coverImage={(proposal as any).coverImage || proposal.images?.[0]}
                    galleryImages={proposal.images}
                    fallbackImage={fallbackImg}
                    onFallbackErrorImage={getUniqueProposalCoverImage({ id: proposal.id }, 1)}
                    title={proposal.title}
                    isHovered={isCardHovered}
                    heightClass="aspect-video"
                  >
                    <div className="absolute top-2 left-2 pointer-events-none z-10 flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-md text-white border border-stone-700/80 shadow-xs">
                        {trackInfo.name}
                      </span>
                      {getInnovationProgressStageMeta(proposal.proposalProgressStage) && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-emerald-900 border border-emerald-300 shadow-xs">
                          {getInnovationProgressStageMeta(proposal.proposalProgressStage)?.shortLabel}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 flex items-center gap-1 z-20">
                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(e, proposal)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all shadow-md cursor-pointer ${
                          isBookmarked
                            ? 'bg-amber-400 text-stone-950 scale-105'
                            : 'bg-white/95 backdrop-blur-md text-stone-700 hover:bg-white'
                        }`}
                        title={isBookmarked ? '⭐ 已收藏' : '⭐ 收藏'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-stone-950 text-stone-950' : 'text-amber-500'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleLike(e, proposal)}
                        className={`h-7 px-2 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all shadow-md cursor-pointer ${
                          isLiked
                            ? 'bg-rose-500 text-white scale-105'
                            : 'bg-white/95 backdrop-blur-md text-rose-600 hover:bg-white'
                        }`}
                        title="❤️ Like"
                      >
                        <Heart className={`w-3 h-3 ${isLiked ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                        <span className="font-mono">{proposal.likeCount || 0}</span>
                      </button>
                    </div>
                  </ProposalCardMediaBanner>

                  <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-black text-stone-900 line-clamp-2 group-hover:text-amber-600 transition-colors leading-snug">
                        {proposal.title}
                      </h3>
                      <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                        {proposal.summary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1 text-[10px]">
                      <span className="font-bold text-stone-600 truncate max-w-[80px]">
                        {proposal.authorName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(proposal.externalLink || (proposal as any).demoUrl) && (
                          <a
                            href={proposal.externalLink || (proposal as any).demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 px-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                            title="前往專屬網站或 Demo 連結"
                          >
                            <Globe className="w-3 h-3 text-emerald-600" />
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                          </a>
                        )}
                        <span className="font-mono font-black text-amber-700 flex items-center gap-0.5">
                          <Coins className="w-3 h-3" />
                          {(proposal.supportPoints || 0).toLocaleString()} 點
                        </span>
                        {currentUser?.role === 'admin' && (publicMetricsConfig?.showCardViews ?? true) && (
                          <span
                            className="flex items-center gap-0.5 text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.5 rounded text-[9px] font-mono shadow-2xs"
                            title="管理員限定：累計點進內頁瀏覽次數"
                          >
                            <Eye className="w-2.5 h-2.5 text-purple-600" />
                            <span>{getEffectiveProposalViews(proposal.id, proposal.viewsCount || 0)} 次</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 3. 大卡片 (Large Mode - 預設含封面圖，支援滑鼠移入播放影片或圖片輪播)
            const isLargeCardHovered = hoveredProposalId === proposal.id;
            const fallbackCoverImg = getUniqueProposalCoverImage(proposal);
            return (
              <div
                key={proposal.id}
                onClick={() => onSelectProposal(proposal)}
                onMouseEnter={() => setHoveredProposalId(proposal.id)}
                onMouseLeave={() => setHoveredProposalId((prev) => (prev === proposal.id ? null : prev))}
                className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 hover:border-amber-400 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden cursor-pointer group relative"
              >
                {/* Cover Image / Header Banner (像創點子創新提案的大圖展示) */}
                <ProposalCardMediaBanner
                  youtubeUrl={proposal.youtubeUrl}
                  coverMode={proposal.coverMode}
                  cardHoverMode={proposal.cardHoverMode}
                  coverImage={(proposal as any).coverImage || proposal.images?.[0]}
                  galleryImages={proposal.images}
                  fallbackImage={fallbackCoverImg}
                  onFallbackErrorImage={getUniqueProposalCoverImage({ id: proposal.id }, 1)}
                  title={proposal.title}
                  isHovered={isLargeCardHovered}
                  heightClass="aspect-video"
                >
                  {/* Top Overlay Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none z-10">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-md text-white border border-stone-700/80 shadow-xs">
                      {trackInfo.name}
                    </span>

                    {proposal.unpublishAt && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-200 border border-emerald-700/80 flex items-center gap-1 shadow-xs">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>刊登至 {proposal.unpublishAt}</span>
                      </span>
                    )}
                  </div>

                  {/* ⭐ 收藏 + ❤️ Like 按鈕組 (僅顯示圖示) */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-20">
                    <button
                      type="button"
                      onClick={(e) => handleToggleBookmark(e, proposal)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-md cursor-pointer ${
                        isBookmarked
                          ? 'bg-amber-400 text-stone-950 hover:bg-amber-300 scale-105'
                          : 'bg-white/95 backdrop-blur-md text-stone-700 hover:bg-white hover:text-amber-600'
                      }`}
                      title={isBookmarked ? '⭐ 已收藏（點擊取消）' : '⭐ 收藏提案'}
                    >
                      <Star className={`w-4 h-4 ${isBookmarked ? 'fill-stone-950 text-stone-950' : 'text-amber-500'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(e, proposal)}
                      className={`h-8 px-2.5 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-all shadow-md cursor-pointer ${
                        isLiked
                          ? 'bg-rose-500 text-white hover:bg-rose-600 scale-105'
                          : 'bg-white/95 backdrop-blur-md text-rose-600 hover:bg-white hover:text-rose-500'
                      }`}
                      title={isLiked ? '❤️ 已 Like（點擊取消）' : '❤️ Like 此提案'}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                      <span className="font-mono">{proposal.likeCount || 0}</span>
                    </button>
                  </div>
                </ProposalCardMediaBanner>

                {/* Card Content Body */}
                <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <h3 className="text-sm sm:text-base font-black text-stone-900 line-clamp-2 group-hover:text-amber-600 transition-colors leading-snug">
                      {proposal.title}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {proposal.summary}
                    </p>

                    {/* 關聯痛點貼文連結 */}
                    {(() => {
                      const refPainObj = findReferencedPainPoint(proposal as any, questions);
                      const rawRef = proposal.referencedPainPoint || proposal.sourcePainPointTitle;
                      if (!refPainObj && !rawRef) return null;
                      return (
                        <div
                          onClick={(e) => {
                            if (refPainObj) {
                              e.stopPropagation();
                              setSelectedQuestion(refPainObj);
                            }
                          }}
                          className={`p-2 rounded-xl bg-rose-50/90 border border-rose-200/80 text-[11px] text-rose-900 flex items-center justify-between gap-1.5 transition-colors ${
                            refPainObj ? 'hover:bg-rose-100/80 hover:border-rose-300 cursor-pointer' : ''
                          }`}
                          title={refPainObj ? '點擊前往查看對應之痛點貼文' : undefined}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-rose-600 shrink-0">🎯</span>
                            <span className="truncate font-bold">
                              解決痛點：{refPainObj ? refPainObj.title : String(rawRef).replace(/^\[[^\]]+\]\s*/, '')}
                            </span>
                          </div>
                          {refPainObj && (
                            <span className="text-[10px] font-black text-rose-700 shrink-0">
                              查看痛點 ➔
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 提案人與團隊 */}
                  <div className="flex items-center gap-2.5 pt-1 border-t border-stone-100">
                    <img
                      src={
                        proposal.authorAvatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                      }
                      alt={proposal.authorName}
                      className="w-7 h-7 rounded-full object-cover border border-stone-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold truncate ${getUserNameColorClass(proposal.authorId, availableUsers, { name: proposal.authorName, role: proposal.authorRole })}`}>
                        {proposal.authorName}
                      </div>
                      {proposal.teamName && (
                        <div className="text-[10px] text-amber-800 font-semibold truncate">
                          {proposal.teamName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Data Stats: ［點數支持］ & 按讚收藏 */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                        <Coins className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-500 font-bold">點數支持</div>
                        <div className="text-xs font-mono font-black text-amber-900">
                          {(proposal.supportPoints || 0).toLocaleString()} 點
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-stone-500 font-bold">Like</div>
                      <div className="text-xs font-mono font-black text-rose-600 flex items-center gap-1 justify-end">
                        <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                        <span>{proposal.likeCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-stone-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                        <span>{proposal.commentsCount || 0}</span>
                      </span>
                      {currentUser?.role === 'admin' && (publicMetricsConfig?.showCardViews ?? true) && (
                        <span
                          className="flex items-center gap-1 font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg text-[10px] font-mono shadow-2xs"
                          title="管理員限定：累計點進內頁瀏覽次數"
                        >
                          <Eye className="w-3 h-3 text-purple-600" />
                          <span>{getEffectiveProposalViews(proposal.id, proposal.viewsCount || 0)} 次</span>
                        </span>
                      )}
                      <span
                        onClick={
                          isAuthorOrAdmin
                            ? (e) => {
                                e.stopPropagation();
                                setEditingProposalForTime(proposal);
                                setCustomUnpublishDate(proposal.unpublishAt || '');
                              }
                            : undefined
                        }
                        className={`flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200/80 ${
                          isAuthorOrAdmin ? 'hover:bg-amber-200/90 cursor-pointer transition-colors' : ''
                        }`}
                        title={
                          (proposal.createdAt ? `刊登於 ${new Date(proposal.createdAt).toLocaleDateString('zh-TW')}` : '') +
                          (isAuthorOrAdmin ? `｜刊登期限：${getRemainingDaysText(proposal.unpublishAt)}（點擊設定）` : '')
                        }
                      >
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>{getPostedAgoText(proposal.createdAt) || getRemainingDaysText(proposal.unpublishAt)}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {(proposal.externalLink || (proposal as any).demoUrl) && (
                        <a
                          href={proposal.externalLink || (proposal as any).demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="前往專屬網站或 Demo 連結"
                        >
                          <Globe className="w-3 h-3 text-emerald-600" />
                          <span>前往連結</span>
                          <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                        </a>
                      )}
                      <button
                        onClick={(e) => handleShare(e, proposal)}
                        className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                        title="分享提案"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
                    : viewMode === 'list'
                    ? 'flex flex-col space-y-2.5 sm:space-y-3'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5'
                }
              >
                {visibleProposals.map(renderProposalCard)}
              </div>

              {isGuest && finalFilteredProposals.length > GUEST_VISIBLE_COUNT && (
                <GuestBoardGateBlurOverlay
                  remainingCount={finalFilteredProposals.length - GUEST_VISIBLE_COUNT}
                  totalCount={finalFilteredProposals.length}
                  boardName="創點子專區看板"
                  onOpenAuth={() => (onOpenAuth ? onOpenAuth() : openAuthModal('login'))}
                  blurredPreviewChildren={
                    <div
                      className={
                        viewMode === 'grid'
                          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 items-stretch'
                          : viewMode === 'list'
                          ? 'flex flex-col space-y-2.5 sm:space-y-3'
                          : 'grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5'
                      }
                    >
                      {blurredProposals.map(renderProposalCard)}
                    </div>
                  }
                />
              )}
            </>
          );
        })()
      )}

      {/* 編輯刊登時間/下架時間彈窗 (刊登時間即下架時間，預設永久刊登) */}
      {editingProposalForTime && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-stone-200 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>設定提案刊登時間 / 下架期限</span>
              </h3>
              <button
                onClick={() => setEditingProposalForTime(null)}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-stone-600 font-medium">
                提案：<strong className="text-stone-900">{editingProposalForTime.title}</strong>
              </p>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>刊登時間規範：</span>
                </div>
                <p>
                  IdeaX 創點子提案預設為<strong>『永久刊登』</strong>。除非您手動點擊下架，否則專案會持續於全站展示並接受點數支持。您亦可自訂自動下架時間。
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-800">選擇刊登期限模式</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPublicationMode('permanent')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                      publicationMode === 'permanent'
                        ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>永久</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublicationMode('7days')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                      publicationMode === '7days'
                        ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>7天</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublicationMode('30days')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                      publicationMode === '30days'
                        ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>30天</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublicationMode('90days')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                      publicationMode === '90days'
                        ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>90天</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublicationMode('custom')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer col-span-2 ${
                      publicationMode === 'custom'
                        ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <span>📆 自訂下架日期</span>
                  </button>
                </div>

                {publicationMode === 'custom' && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-stone-700 mb-1">指定自動下架日期</label>
                    <input
                      type="date"
                      value={customUnpublishDate}
                      onChange={(e) => setCustomUnpublishDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100 gap-2">
              <button
                type="button"
                onClick={(e) => handleToggleUnpublish(e, editingProposalForTime)}
                className="px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs cursor-pointer"
              >
                {editingProposalForTime.isUnpublished ? '重新上架刊登' : '手動立即下架'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProposalForTime(null)}
                  className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 font-bold text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleInitiateSaveTimeSetting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow-xs"
                >
                  確認設定刊登時間
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 刊登時間變更 — 管理員/提案者二度確認 Modal */}
      {showTimeConfirmModal && editingProposalForTime && pendingTimeSetting && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border-2 border-amber-400 shadow-2xl animate-in zoom-in-95 duration-200 text-stone-900">
            <div className="flex items-center gap-2 text-amber-800 font-black text-base">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <span>刊登時間變更 — 二度確認</span>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed font-medium">
              請二度確認是否將提案「<strong className="text-stone-900 font-black">{editingProposalForTime.title}</strong>」的刊登時間設定為：
            </p>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-center font-mono font-black text-amber-950 text-sm shadow-2xs">
              {pendingTimeSetting.text}
            </div>

            <div className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
              💡 二度確認完成後，系統將即時更新刊登時間，並同步展示給全站訪客與社群會員。
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setShowTimeConfirmModal(false);
                  setPendingTimeSetting(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 font-bold text-xs cursor-pointer"
              >
                返回修改
              </button>
              <button
                type="button"
                onClick={handleConfirmSavePublicationSetting}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow-md active:scale-95 transition-all"
              >
                二度確認並儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

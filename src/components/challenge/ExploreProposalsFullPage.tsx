import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Flame,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  StarSeasonProposal,
  CompetitionAccount,
  ProposalComment,
  STAR_SEASON_TRACKS,
  OFFICIAL_COMPETITION_TRACKS,
} from '../../types/competition';
import {
  likeProposal,
  supportProposal,
  fetchProposalComments,
  postProposalComment,
  fetchUserLikedProposalIds,
} from '../../services/competitionClientService';
import { auth } from '../../services/firebase';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';

interface ExploreProposalsFullPageProps {
  onNavigate: (view: 'home' | 'proposal' | 'explore' | 'rules' | 'submit' | 'participant' | 'judge' | 'ambassador') => void;
  onBackToOldSite: () => void;
  onOpenAuth: () => void;
  proposals: StarSeasonProposal[];
  onRefreshProposals: () => Promise<void>;
  account: CompetitionAccount | null;
  onRefreshAccount: () => Promise<void>;
}

export const ExploreProposalsFullPage: React.FC<ExploreProposalsFullPageProps> = ({
  onNavigate,
  onBackToOldSite,
  onOpenAuth,
  proposals: initialProposals,
  onRefreshProposals,
  account,
  onRefreshAccount,
}) => {
  const { currentUser, addNotification } = useApp();
  const stageInfo = React.useMemo(() => getCompetitionStageInfo(), []);

  const [proposals, setProposals] = useState<StarSeasonProposal[]>(initialProposals);
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<'funding' | 'likes' | 'comments'>('funding');
  const [cardViewMode, setCardViewMode] = useState<'large' | 'compact'>('large');
  const [likedProposalIds, setLikedProposalIds] = useState<string[]>([]);

  // 彈窗狀態
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<StarSeasonProposal | null>(null);
  const [selectedProposalForSupport, setSelectedProposalForSupport] = useState<StarSeasonProposal | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [supportAmount, setSupportAmount] = useState<number>(1000);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState<boolean>(false);

  // 留言狀態
  const [activeComments, setActiveComments] = useState<ProposalComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null);

  useEffect(() => {
    setProposals(initialProposals);
  }, [initialProposals]);

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

  const showToast = (message: string) => {
    addNotification({
      title: '探索Idea',
      message,
      type: 'system',
    });
  };

  // 篩選提案
  const filteredProposals = proposals.filter((p) => {
    if (selectedTrack !== 'all' && p.track !== selectedTrack) return false;
    if (selectedStage !== 'all' && p.stage !== selectedStage) return false;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(kw);
      const matchSummary = p.summary.toLowerCase().includes(kw);
      const matchAuthor = p.authorName.toLowerCase().includes(kw);
      const matchPain = p.sourcePainPointTitle?.toLowerCase().includes(kw) || false;
      if (!matchTitle && !matchSummary && !matchAuthor && !matchPain) return false;
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
    return 0;
  });

  // 愛心按讚/收藏切換
  const handleToggleLike = async (proposalId: string) => {
    if (!auth.currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }
    try {
      const res = await likeProposal(proposalId);
      if (res.success) {
        setLikedProposalIds((prev) =>
          res.liked ? [...prev, proposalId] : prev.filter((id) => id !== proposalId)
        );
        setProposals((prev) =>
          prev.map((p) => (p.id === proposalId ? { ...p, likeCount: res.likeCount } : p))
        );
        if (selectedProposalForDetail?.id === proposalId) {
          setSelectedProposalForDetail((prev) =>
            prev ? { ...prev, likeCount: res.likeCount } : null
          );
        }
        showToast(res.liked ? '❤️ 已按讚並加入您的個人收藏名單！' : '已取消按讚與收藏');
      }
    } catch (err: any) {
      showToast(err.message || '操作失敗');
    }
  };

  // 開啟詳情與留言
  const handleOpenProposalDetail = async (proposal: StarSeasonProposal) => {
    setSelectedProposalForDetail(proposal);
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
      showToast('請輸入大於 0 之支持點數');
      return;
    }
    setIsSubmittingSupport(true);
    try {
      const res = await supportProposal({
        proposalId: selectedProposalForSupport.id,
        points: supportAmount,
      });
      if (res.success) {
        showToast(`🎉 成功支持 ${supportAmount.toLocaleString()} 點！感謝您的創星注資。`);
        await onRefreshProposals();
        await onRefreshAccount();
        setIsSupportModalOpen(false);
      } else {
        showToast(res.message || '投點失敗');
      }
    } catch (err: any) {
      showToast(err.message || '投點失敗');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const handleCopyProposalLink = (pId: string) => {
    const url = `${window.location.origin}/challenge/proposal?proposalId=${pId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedProposalId(pId);
      showToast('提案專屬網址已複製到剪貼簿！');
      setTimeout(() => setCopiedProposalId(null), 2500);
    });
  };

  // 總計數據
  const totalPoints = proposals.reduce((acc, p) => acc + (p.supportPoints || 0), 0);
  const totalSupporters = proposals.reduce((acc, p) => acc + (p.supporterCount || 0), 0);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 selection:bg-amber-300 selection:text-stone-950 font-sans">
      {/* 頂部固定導覽列 */}
      <header className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {/* 導覽列核心主行 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 左側：品牌 Logo (點燈泡回舊站首頁，點創星季回競賽首頁) */}
            <div className="flex items-center gap-1.5 shrink-0 -ml-1 sm:-ml-2">
              <button
                type="button"
                onClick={() => {
                  onBackToOldSite();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
                title="點擊回到 IdeaX 舊站首頁"
                aria-label="回到舊站首頁"
              >
                <img src="/logo-bulb.png" alt="IdeaX - 點擊回舊站首頁" className="w-10.5 h-10.5 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0 drop-shadow-xs group-hover:scale-105 transition-all" />
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

          {/* 右側：簡潔清晰的「回首頁」按鈕 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onNavigate('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
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
              <h1 className="text-2xl sm:text-4xl font-black text-stone-950 tracking-tight">
                當前提案
              </h1>
              <p className="text-stone-700 text-xs sm:text-sm mt-1 max-w-2xl font-bold text-amber-900">
                使用 創星幣 支持你認同的創新提案，模擬市場關注度
              </p>
            </div>

            {/* 快速注資點數卡片 */}
            {account && (
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300 shadow-2xs flex items-center gap-3 shrink-0 self-start sm:self-auto">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Coins className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-[11px] text-stone-500 font-bold">您的可用創星幣</div>
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
                <div className="text-lg font-black font-mono text-stone-900">{proposals.length} 件</div>
              </div>
              <FileText className="w-4 h-4 text-amber-500" />
            </div>

            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] text-stone-500 font-bold">全網已投創星幣</div>
                <div className="text-lg font-black font-mono text-amber-600">{totalPoints.toLocaleString()} 創星幣</div>
              </div>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>

            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] text-stone-500 font-bold">支持總人次</div>
                <div className="text-lg font-black font-mono text-rose-600">{totalSupporters} 次</div>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* 階段與賽道篩選器 */}
        <div className="space-y-4 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* 兩階段分頁標籤切換 */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs max-w-fit">
              <button
                onClick={() => setSelectedStage('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStage === 'all'
                    ? 'bg-amber-400 text-stone-950 shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                全部提案總覽
              </button>
              <button
                onClick={() => setSelectedStage('pain_point')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStage === 'pain_point'
                    ? 'bg-amber-400 text-stone-950 shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                第一階段：徵點子（痛點徵件）
              </button>
              <button
                onClick={() => setSelectedStage('solution')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStage === 'solution'
                    ? 'bg-amber-400 text-stone-950 shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                第二階段：想解方（解法提案）
              </button>
            </div>

            {/* 關鍵字搜尋 */}
            <div className="relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜尋提案標題、摘要、提案人..."
                className="w-full sm:w-64 bg-white border border-stone-200 rounded-xl px-3.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 shadow-2xs"
              />
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
                    ? 'bg-stone-900 text-white border-stone-900'
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
                <ArrowUpDown className="w-3 h-3 text-stone-500" />
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
                title="依按讚愛心數高至低排序"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    sortBy === 'likes' ? 'fill-white text-white' : 'text-rose-500 fill-rose-500/20'
                  }`}
                />
                <span>按讚數</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('comments')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'comments'
                    ? 'bg-stone-900 text-white shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/70'
                }`}
                title="依討論留言數高至低排序"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>討論數</span>
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

        {/* 提案總覽卡片清單 (白色背景，高質感科技感，MOE SSP 風格) */}
        {sortedProposals.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-4 shadow-xs">
            <FileText className="w-12 h-12 text-stone-400 mx-auto" />
            <h3 className="text-base font-bold text-stone-800">目前尚無符合篩選條件的競賽提案</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              成為本屆創星季的開創先行者！點擊上方「我要投稿」提交您的痛點腦洞或落地解法。
            </p>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedProposals.map((proposal, idx) => {
              const currentPoints = proposal.supportPoints || 0;
              const targetPoints = proposal.targetFundingAmount || 100000;
              const progressPct = Math.min(Math.round((currentPoints / targetPoints) * 100), 999);
              const trackMeta = STAR_SEASON_TRACKS[proposal.track];

              return (
                <div
                  key={proposal.id}
                  className="bg-white rounded-3xl border border-stone-200/90 hover:border-amber-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* 大卡片模式時才顯示圖片 */}
                  {cardViewMode === 'large' && proposal.images && proposal.images.length > 0 && (
                    <div
                      onClick={() => handleOpenProposalDetail(proposal)}
                      className="relative -mx-5 -mt-5 mb-4 h-44 overflow-hidden cursor-pointer group/img bg-stone-100 border-b border-stone-100"
                    >
                      <img
                        src={proposal.images[0]}
                        alt={proposal.title}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                      {proposal.images.length > 1 && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-amber-300" />
                          <span>+{proposal.images.length - 1} 張</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* 卡片標題與標籤 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            proposal.stage === 'pain_point'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {proposal.stage === 'pain_point' ? '徵點子' : '想解方'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {trackMeta?.name || '專題賽道'}
                        </span>
                      </div>

                      {/* 入圍或排名標記 */}
                      {idx < 20 ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-300">
                          前20名・入圍決選
                        </span>
                      ) : null}
                    </div>

                    {/* 提案標題 */}
                    <h3
                      onClick={() => handleOpenProposalDetail(proposal)}
                      className="text-base font-black text-stone-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2 cursor-pointer"
                    >
                      {proposal.title}
                    </h3>

                    {/* 若為解方且引用痛點 */}
                    {proposal.sourcePainPointTitle && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] space-y-1">
                        <span className="text-amber-900 font-bold flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-amber-600" />
                          採用痛點提案：
                        </span>
                        <p className="text-stone-700 line-clamp-1 italic font-medium">
                          {proposal.sourcePainPointTitle}
                        </p>
                      </div>
                    )}

                    {/* 摘要說明 */}
                    <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                      {proposal.summary}
                    </p>

                    {/* 虛擬注資進度條 */}
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-500 font-bold flex items-center gap-1">
                          <Percent className="w-3 h-3 text-amber-500" />
                          注資達成率
                        </span>
                        <span className="font-mono font-black text-amber-700">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden border border-stone-200">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progressPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 底部數據與操作按鈕 */}
                  <div className="pt-4 mt-4 border-t border-stone-100 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[10px] font-black border border-amber-200">
                          {proposal.authorName.charAt(0)}
                        </div>
                        <span className="text-stone-800 font-bold truncate max-w-[100px]">
                          {proposal.authorName}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-amber-700 text-sm">
                          {currentPoints.toLocaleString()} 點
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {proposal.supporterCount || 0} 人支持
                        </div>
                      </div>
                    </div>

                    {/* 操作按鈕與互動計數 (按讚愛心、討論留言數、詳情、投點支持) */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* 按讚愛心按鈕 */}
                      <button
                        type="button"
                        onClick={() => handleToggleLike(proposal.id)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                          likedProposalIds.includes(proposal.id)
                            ? 'bg-rose-50 text-rose-600 border-rose-300'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                        title={likedProposalIds.includes(proposal.id) ? '已收藏' : '按讚收藏'}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            likedProposalIds.includes(proposal.id)
                              ? 'fill-rose-500 text-rose-500'
                              : 'text-stone-400'
                          }`}
                        />
                        <span className="text-[11px] font-mono">{proposal.likeCount || 0}</span>
                      </button>

                      {/* 留言討論計數 */}
                      <button
                        type="button"
                        onClick={() => handleOpenProposalDetail(proposal)}
                        className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="查看評論留言"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                        <span className="text-[11px] font-mono">{proposal.commentsCount || 0}</span>
                      </button>

                      {/* 分享連結 */}
                      <button
                        type="button"
                        onClick={() => handleCopyProposalLink(proposal.id)}
                        className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 text-xs font-bold transition-all cursor-pointer"
                        title="複製提案分享連結"
                      >
                        {copiedProposalId === proposal.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5 text-stone-400" />
                        )}
                      </button>

                      {/* 查看詳情按鈕 */}
                      <button
                        type="button"
                        onClick={() => handleOpenProposalDetail(proposal)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors cursor-pointer text-center"
                      >
                        詳情
                      </button>

                      {/* 支持按鈕 */}
                      <button
                        type="button"
                        onClick={() => {
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
                        className={`flex-1 py-2 px-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center shadow-2xs ${
                          !stageInfo.isInvestmentEnabled
                            ? 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                            : 'bg-amber-400 hover:bg-amber-300 text-stone-950 font-black'
                        }`}
                        title={!stageInfo.isInvestmentEnabled ? '預先提案期（11/14~11/15）募資功能關閉，11/16 開放' : undefined}
                      >
                        {stageInfo.isPreProposalStage ? '預覽中' : '支持'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 提案詳細 Modal */}
      {selectedProposalForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    selectedProposalForDetail.stage === 'pain_point'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {selectedProposalForDetail.stage === 'pain_point' ? '第一階段：徵點子' : '第二階段：想解方'}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                  {STAR_SEASON_TRACKS[selectedProposalForDetail.track]?.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedProposalForDetail(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-xl font-black text-stone-950 leading-snug">
                  {selectedProposalForDetail.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-stone-500 text-xs">
                  <span>提案人：{selectedProposalForDetail.authorName}</span>
                  <span>·</span>
                  <span>提交時間：{new Date(selectedProposalForDetail.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* 關聯痛點資訊 */}
              {selectedProposalForDetail.sourcePainPointTitle && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    本解方提案採用的來源痛點：
                  </span>
                  <p className="text-stone-800 font-bold italic">
                    {selectedProposalForDetail.sourcePainPointTitle}
                  </p>
                </div>
              )}

              {/* 提案摘要 */}
              <div>
                <h4 className="font-black text-stone-900 mb-1">提案摘要</h4>
                <p className="text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                  {selectedProposalForDetail.summary}
                </p>
              </div>

              {/* 詳細說明 */}
              <div>
                <h4 className="font-black text-stone-900 mb-1">
                  {selectedProposalForDetail.stage === 'pain_point' ? '痛點詳述說明' : '詳細執行方案與創新價值'}
                </h4>
                <div className="text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200 whitespace-pre-line">
                  {selectedProposalForDetail.description || selectedProposalForDetail.summary}
                </div>
              </div>

              {/* 照片 / 圖片展示區 */}
              {selectedProposalForDetail.images && selectedProposalForDetail.images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-black text-stone-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span>{selectedProposalForDetail.stage === 'pain_point' ? '痛點照片/圖片' : '提案相片展示'}</span>
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      共 {selectedProposalForDetail.images.length} 張
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {selectedProposalForDetail.images.map((img, idx) => (
                      <div key={idx} className="rounded-2xl overflow-hidden border border-amber-200 bg-white aspect-video shadow-2xs group relative">
                        <img src={img} alt={`img-${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 補充資料區塊 (技術可行性、市場分析與定位、商業模式與財務預測、外部連結) */}
              {(selectedProposalForDetail.technicalFeasibility || selectedProposalForDetail.marketAnalysis || selectedProposalForDetail.businessModelFinancials || selectedProposalForDetail.externalLink) && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                  <h4 className="font-black text-amber-950 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>提案補充資料與延伸連結</span>
                  </h4>

                  {selectedProposalForDetail.technicalFeasibility && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <div className="font-bold text-stone-900 text-[11px] mb-0.5">• 技術可行性說明</div>
                      <p className="text-stone-700 whitespace-pre-line leading-relaxed">{selectedProposalForDetail.technicalFeasibility}</p>
                    </div>
                  )}

                  {selectedProposalForDetail.marketAnalysis && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <div className="font-bold text-stone-900 text-[11px] mb-0.5">• 市場分析與定位</div>
                      <p className="text-stone-700 whitespace-pre-line leading-relaxed">{selectedProposalForDetail.marketAnalysis}</p>
                    </div>
                  )}

                  {selectedProposalForDetail.businessModelFinancials && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <div className="font-bold text-stone-900 text-[11px] mb-0.5">• 商業模式與財務預測</div>
                      <p className="text-stone-700 whitespace-pre-line leading-relaxed">{selectedProposalForDetail.businessModelFinancials}</p>
                    </div>
                  )}

                  {selectedProposalForDetail.externalLink && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60 flex items-center justify-between gap-2">
                      <div className="truncate text-stone-700">
                        <span className="font-bold text-stone-900 mr-1.5">• 外部連結:</span>
                        <a href={selectedProposalForDetail.externalLink} target="_blank" rel="noreferrer" className="text-amber-700 underline font-mono text-[11px]">
                          {selectedProposalForDetail.externalLink}
                        </a>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    </div>
                  )}
                </div>
              )}

              {/* 標籤列展示 (含 AI 市場顧問 Agent 自動賦予標籤) */}
              {selectedProposalForDetail.tags && selectedProposalForDetail.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-stone-500 font-bold">標籤：</span>
                  {selectedProposalForDetail.tags.map((tg, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold">
                      #{tg}
                    </span>
                  ))}
                  {selectedProposalForDetail.aiCategorized && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                      🤖 AI市場顧問智慧領域
                    </span>
                  )}
                </div>
              )}

              {/* 若為痛點專頁：直接在此提出方案（直用提案頁） */}
              {selectedProposalForDetail.stage === 'pain_point' && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/90 border-2 border-amber-400 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-xs shadow-2xs">
                        💡
                      </div>
                      <span className="font-black text-stone-950 text-sm">針對此痛點提出創新方案</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300">
                      直用提案頁
                    </span>
                  </div>
                  <p className="text-stone-700 text-xs leading-relaxed">
                    你有解決此痛點的創新產品、商業模式或技術架構嗎？直接點擊下方按鈕提出解方，系統將自動預選帶入此痛點，填寫資料與規格完全比照大賽提案頁！
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          'ideax_challenge_prefill_topic',
                          JSON.stringify({
                            id: selectedProposalForDetail.id,
                            title: selectedProposalForDetail.title,
                            serial: selectedProposalForDetail.id,
                            summary: selectedProposalForDetail.summary,
                            track: selectedProposalForDetail.track,
                          })
                        );
                      } catch {}
                      setSelectedProposalForDetail(null);
                      if (!currentUser || currentUser.id === 'user-guest') {
                        onOpenAuth();
                        return;
                      }
                      onNavigate('submit');
                    }}
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-stone-950" />
                    <span>針對此痛點提出方案（直用提案頁）</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}

              {/* 創星幣募資進度 */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-stone-800">使用 創星幣 支持你認同的創新提案</span>
                  <span className="font-mono font-black text-amber-800 text-sm">
                    {selectedProposalForDetail.supportPoints.toLocaleString()} 創星幣
                  </span>
                </div>
                <div className="w-full bg-white h-2.5 rounded-full overflow-hidden border border-amber-200">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        Math.round(((selectedProposalForDetail.supportPoints || 0) / 100000) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-stone-500 flex justify-between">
                  <span>支持人次：{selectedProposalForDetail.supporterCount || 0} 人</span>
                  <span>目標額度：100,000 創星幣</span>
                </div>
              </div>

              {/* 愛心按讚收藏條 */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(selectedProposalForDetail.id)}
                    className={`p-2 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      likedProposalIds.includes(selectedProposalForDetail.id)
                        ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                        : 'bg-white text-rose-600 border-rose-300 hover:bg-rose-100/50'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        likedProposalIds.includes(selectedProposalForDetail.id)
                          ? 'fill-white text-white'
                          : 'fill-rose-500 text-rose-500'
                      }`}
                    />
                    <span>
                      {likedProposalIds.includes(selectedProposalForDetail.id) ? '已按讚收藏' : '按讚收藏提案'}
                    </span>
                  </button>
                  <span className="text-xs text-rose-900 font-bold">
                    累計 {selectedProposalForDetail.likeCount || 0} 個愛心
                  </span>
                </div>
              </div>

              {/* 社群討論串 */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2 font-black text-stone-900 text-xs">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    <span>社群討論與評審交流區</span>
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                      {activeComments.length} 則留言
                    </span>
                  </div>
                  {isLoadingComments && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>載入留言中...</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {activeComments.length === 0 ? (
                    <div className="py-6 text-center text-stone-400 space-y-1">
                      <MessageSquare className="w-8 h-8 mx-auto text-stone-300 stroke-1" />
                      <p className="text-xs">目前尚無討論留言</p>
                      <p className="text-[10px] text-stone-400">歡迎參賽者、特聘評審與會員提出建議、提問或交流！</p>
                    </div>
                  ) : (
                    activeComments.map((cm) => (
                      <div key={cm.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-stone-800">
                            <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-black shrink-0">
                              {cm.authorName.charAt(0)}
                            </div>
                            <span>{cm.authorName}</span>
                          </div>
                          <span className="text-[10px] text-stone-400">
                            {new Date(cm.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-stone-700 whitespace-pre-line pl-6.5 leading-relaxed text-[11px]">
                          {cm.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <textarea
                    rows={2}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={
                      auth.currentUser && currentUser.id !== 'user-guest'
                        ? '留下您對此提案的提問、建議或鼓勵...'
                        : '請先登入後發表討論留言...'
                    }
                    disabled={!auth.currentUser || currentUser.id === 'user-guest' || isSubmittingComment}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 resize-none disabled:bg-stone-100"
                  />
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!auth.currentUser || currentUser.id === 'user-guest' || isSubmittingComment || !newCommentText.trim()}
                      className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      {isSubmittingComment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>送出留言</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 底部投點與提案操作按鈕 */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {selectedProposalForDetail.stage === 'pain_point' && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          'ideax_challenge_prefill_topic',
                          JSON.stringify({
                            id: selectedProposalForDetail.id,
                            title: selectedProposalForDetail.title,
                            serial: selectedProposalForDetail.id,
                            summary: selectedProposalForDetail.summary,
                            track: selectedProposalForDetail.track,
                          })
                        );
                      } catch {}
                      setSelectedProposalForDetail(null);
                      if (!currentUser || currentUser.id === 'user-guest') {
                        onOpenAuth();
                        return;
                      }
                      onNavigate('submit');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-stone-950" />
                    <span>針對此痛點提出方案（直用提案頁）</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (stageInfo.isPreProposalStage) {
                      showToast('ℹ️ 11/14 ~ 11/15 為預先提案期，募資(投資)功能暫時關閉，僅供提案審核與預覽！11/16 起正式開放注資。');
                      return;
                    }
                    if (!stageInfo.isInvestmentEnabled) {
                      showToast('ℹ️ 創星幣模擬募資將於 11/16 ~ 12/04 開放！');
                      return;
                    }
                    setSelectedProposalForSupport(selectedProposalForDetail);
                    setSelectedProposalForDetail(null);
                    setIsSupportModalOpen(true);
                  }}
                  className={`py-2.5 rounded-xl border border-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
                    !stageInfo.isInvestmentEnabled
                      ? 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                      : selectedProposalForDetail.stage === 'pain_point'
                      ? 'bg-amber-100 hover:bg-amber-200 px-4'
                      : 'flex-1 bg-amber-400 hover:bg-amber-300'
                  }`}
                  title={!stageInfo.isInvestmentEnabled ? '預先提案期（11/14~11/15）募資功能關閉，11/16 正式開放' : undefined}
                >
                  <Heart className={`w-4 h-4 ${stageInfo.isInvestmentEnabled ? 'fill-current text-rose-500' : 'text-stone-400'}`} />
                  <span>
                    {stageInfo.isPreProposalStage
                      ? '預先提案期（募資暫未開放）'
                      : `使用創星幣支持${selectedProposalForDetail.stage === 'pain_point' ? '痛點' : '提案'}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProposalForDetail(null)}
                  className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 支持投點 Modal */}
      {isSupportModalOpen && selectedProposalForSupport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>使用創星幣模擬注資支持</span>
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
                <div className="font-bold text-stone-900 line-clamp-1">
                  {selectedProposalForSupport.title}
                </div>
                <div className="text-stone-500 text-[11px] mt-0.5">
                  提案人：{selectedProposalForSupport.authorName}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">可用創星幣：</span>
                  <span className="font-mono font-bold text-amber-700">
                    {account?.availablePoints.toLocaleString() || 0} 創星幣
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1.5">支持額度 (創星幣)</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(Number(e.target.value))}
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-mono font-bold text-base focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                {[1000, 5000, 10000, 30000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSupportAmount(amt)}
                    className="flex-1 py-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 border border-stone-200 text-[11px] font-bold text-stone-700 cursor-pointer"
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
                  {isSubmittingSupport ? '處理投點中...' : `確認支持 ${supportAmount.toLocaleString()} 點`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

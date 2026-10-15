import React, { useState, useMemo, useEffect } from 'react';
import {
  Lightbulb,
  Sparkles,
  Heart,
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
} from 'lucide-react';
import { StarSeasonProposal, STAR_SEASON_TRACKS } from '../types/competition';
import { DEFAULT_DEMO_PROPOSALS } from '../data/competitionProposals';
import { useApp } from '../context/AppContext';
import { mapQuestionsToStarSeasonProposals } from '../utils/questionUtils';
import { likeProposal, fetchUserLikedProposalIds } from '../services/competitionClientService';
import { shareOrCopyUrl } from '../utils/shareUtils';
import { auth } from '../services/firebase';

export function getRemainingDaysText(unpublishAt?: string): string {
  if (!unpublishAt) return '永久刊登';
  const target = new Date(unpublishAt).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '已到期';
  return `剩餘 ${diffDays} 天`;
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
}) => {
  const { currentUser, showCenterToast, questions } = useApp();
  const [showZoneHelp, setShowZoneHelp] = useState(false);

  // 1. 載入提案清單 (創星季 + 全站創新提案)
  const buildMergedProposals = (baseList?: StarSeasonProposal[]) => {
    const source = baseList && baseList.length > 0 ? baseList : DEFAULT_DEMO_PROPOSALS;
    const mappedVirtual = mapQuestionsToStarSeasonProposals(questions || []);
    const map = new Map<string, StarSeasonProposal>();
    source.forEach((p) => map.set(p.id, p));
    mappedVirtual.forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      } else {
        const existing = map.get(p.id)!;
        map.set(p.id, {
          ...existing,
          images: p.images && p.images.length > 0 ? p.images : existing.images,
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
  }, [initialProposals, questions]);

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
  const [sortBy, setSortBy] = useState<'support' | 'likes' | 'latest'>('support');



  // 按讚/收藏切換 (按讚等同收藏)
  const handleToggleLike = async (e: React.MouseEvent, proposal: StarSeasonProposal) => {
    e.stopPropagation();
    if (!auth.currentUser || currentUser.id === 'user-guest') {
      if (onOpenAuth) onOpenAuth();
      else showCenterToast('請先登入帳號以收藏提案');
      return;
    }

    try {
      const res = await likeProposal(proposal.id);
      if (res.success) {
        const isNowLiked = res.liked;
        setLikedProposalIds((prev) =>
          isNowLiked ? [...prev, proposal.id] : prev.filter((id) => id !== proposal.id)
        );
        setProposalsList((prev) =>
          prev.map((p) => (p.id === proposal.id ? { ...p, likeCount: res.likeCount } : p))
        );
        showCenterToast(
          isNowLiked
            ? '❤️ 已按讚並加入［創點子］個人收藏提案！'
            : '已取消按讚與收藏'
        );
      }
    } catch (err: any) {
      showCenterToast(err.message || '操作失敗');
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

  // 根據 Tab 篩選 (全部 vs 我的收藏)
  const filteredByTabProposals = useMemo(() => {
    if (activeTab === 'favorites') {
      return activeProposals.filter((p) => likedProposalIds.includes(p.id));
    }
    return activeProposals;
  }, [activeProposals, activeTab, likedProposalIds]);

  // 關鍵字與領域篩選
  const finalFilteredProposals = useMemo(() => {
    return filteredByTabProposals.filter((p) => {
      // 領域
      if (selectedTrack !== 'all' && p.track !== selectedTrack) {
        return false;
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
      if (sortBy === 'latest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      // Default: 最多［點數支持］
      return (b.supportPoints || 0) - (a.supportPoints || 0);
    });
  }, [filteredByTabProposals, selectedTrack, searchKw, sortBy]);

  // 我的收藏數量
  const favoriteCount = useMemo(() => {
    return activeProposals.filter((p) => likedProposalIds.includes(p.id)).length;
  }, [activeProposals, likedProposalIds]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 專區 Main Banner Block (手機版緊湊設計，敘述與規範改用 ? 按鈕收合展開) */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-100/50 to-orange-50 border-2 border-amber-300 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
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
              <button
                type="button"
                onClick={() => setShowZoneHelp(!showZoneHelp)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
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
            </h2>
          </div>

          {/* 右上控制鈕 */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenCreateProposal && (
              <button
                type="button"
                onClick={onOpenCreateProposal}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-stone-950 font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>發布創新提案</span>
              </button>
            )}

            {onCloseZone && (
              <button
                type="button"
                onClick={onCloseZone}
                className="px-3 py-2 rounded-xl bg-white/90 hover:bg-white text-stone-800 border border-amber-300 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer hover:border-amber-400 active:scale-98 shrink-0"
                title="返回創星季"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-700" />
                <span>返回創星季</span>
              </button>
            )}
          </div>
        </div>

        {/* 點擊 ? 展開之專區介紹與刊登規範 */}
        {showZoneHelp && (
          <div className="relative z-10 mt-3 pt-3 border-t border-amber-200/80 space-y-2 animate-in fade-in duration-150">
            <p className="text-xs font-medium text-stone-700 leading-relaxed">
              匯集創星季競賽與全站大眾創新解方與作品！在此自由探索優秀點子、給予<strong>點數支持</strong>，按讚即自動加入您的個人收藏名單。
            </p>
            <div className="flex items-center gap-2 text-[11px] text-amber-900 font-bold bg-amber-100/70 border border-amber-200 px-2.5 py-1.5 rounded-xl w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>刊登規範：所有提案預設為『永久刊登』。提案者可隨時手動下架或自訂刊登期限。</span>
            </div>
          </div>
        )}

        {/* Tab 頁籤：［全部提案］ vs ［我的收藏提案］ */}
        <div className="mt-3 pt-3 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white/80 text-stone-700 hover:bg-white border border-amber-200/80'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>全部創新提案 ({activeProposals.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white/80 text-stone-700 hover:bg-white border border-amber-200/80'
              }`}
            >
              <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? 'fill-white' : 'text-rose-500'}`} />
              <span>我的收藏提案 ({favoriteCount})</span>
            </button>
          </div>

          {/* 搜尋與排序 */}
          <div className="flex items-center gap-2 flex-1 max-w-md min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKw}
                onChange={(e) => setSearchKw(e.target.value)}
                placeholder="搜尋提案標題、作者或團隊..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {searchKw && (
                <button
                  onClick={() => setSearchKw('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="support">點數支持 高到低</option>
              <option value="likes">❤️ 按讚收藏最多</option>
              <option value="latest">最新發布</option>
            </select>
          </div>
        </div>

        {/* 領域 Track Filter */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedTrack('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
              selectedTrack === 'all'
                ? 'bg-amber-900 text-white'
                : 'bg-white/70 text-stone-600 hover:bg-white'
            }`}
          >
            全部領域
          </button>
          {Object.entries(STAR_SEASON_TRACKS).map(([key, track]) => (
            <button
              key={key}
              onClick={() => setSelectedTrack(key)}
              className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                selectedTrack === key
                  ? 'bg-amber-900 text-white'
                  : 'bg-white/70 text-stone-600 hover:bg-white'
              }`}
            >
              {track.name}
            </button>
          ))}
        </div>
      </div>

      {/* 提案卡片清單列表 */}
      {finalFilteredProposals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center font-bold">
            {activeTab === 'favorites' ? <Heart className="w-6 h-6 text-rose-500" /> : <Lightbulb className="w-6 h-6 text-amber-600" />}
          </div>
          <h3 className="text-base font-black text-stone-800">
            {activeTab === 'favorites' ? '尚無收藏的創新提案' : '未找到符合條件的創新提案'}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {activeTab === 'favorites'
              ? '瀏覽點子提案時，點擊卡片上的 ❤️ 按讚即可自動加入個人收藏專區，方便隨時追蹤與參考！'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {finalFilteredProposals.map((proposal) => {
            const isLiked = likedProposalIds.includes(proposal.id);
            const trackInfo = STAR_SEASON_TRACKS[proposal.track] || STAR_SEASON_TRACKS.ict;
            const isAuthorOrAdmin =
              currentUser.role === 'admin' ||
              (currentUser.id !== 'user-guest' && currentUser.id === proposal.authorId);

            return (
              <div
                key={proposal.id}
                onClick={() => onSelectProposal(proposal)}
                className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 hover:border-amber-400 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden cursor-pointer group relative"
              >
                {/* Cover Image / Header Banner */}
                <div className="h-36 sm:h-40 bg-stone-100 relative overflow-hidden">
                  {proposal.images && proposal.images.length > 0 ? (
                    <img
                      src={proposal.images[0]}
                      alt={proposal.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-400/20 via-orange-200/30 to-amber-100 flex items-center justify-center">
                      <Lightbulb className="w-12 h-12 text-amber-500/50" />
                    </div>
                  )}

                  {/* Top Overlay Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
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

                  {/* ❤️ 愛心收藏按鈕 */}
                  <button
                    onClick={(e) => handleToggleLike(e, proposal)}
                    className={`absolute bottom-2.5 right-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-md cursor-pointer ${
                      isLiked
                        ? 'bg-rose-500 text-white hover:bg-rose-600 scale-105'
                        : 'bg-white/90 backdrop-blur-md text-stone-600 hover:bg-white hover:text-rose-500'
                    }`}
                    title={isLiked ? '已收藏（點擊取消）' : '按讚即收藏提案'}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
                  </button>
                </div>

                {/* Card Content Body */}
                <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="text-sm sm:text-base font-black text-stone-900 line-clamp-2 group-hover:text-amber-600 transition-colors leading-snug">
                      {proposal.title}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {proposal.summary}
                    </p>
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
                      <div className="text-xs font-bold text-stone-800 truncate">
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
                      <div className="text-[10px] text-stone-500 font-bold">收藏 / 按讚</div>
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
                        <Eye className="w-3.5 h-3.5 text-stone-400" />
                        <span>{proposal.viewsCount || 0}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                        <span>{proposal.commentsCount || 0}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200/80">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>{getRemainingDaysText(proposal.unpublishAt)}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAuthorOrAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProposalForTime(proposal);
                            setCustomUnpublishDate(proposal.unpublishAt || '');
                          }}
                          className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold transition-colors"
                          title="自訂刊登/下架時間"
                        >
                          ⚙️ 刊登時間
                        </button>
                      )}

                      <button
                        onClick={(e) => handleShare(e, proposal)}
                        className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                        title="分享提案"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-amber-800 font-bold flex items-center group-hover:translate-x-0.5 transition-transform">
                        查看專案 ↗
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
                    <span>♾️ 預設永久刊登</span>
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
                    <span>📅 刊登 30 天</span>
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
                    <span>📅 刊登 90 天</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublicationMode('custom')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
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

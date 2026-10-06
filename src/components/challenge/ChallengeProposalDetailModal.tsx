import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Heart,
  Coins,
  ShieldCheck,
  Award,
  Users,
  Eye,
  Calendar,
  Share2,
  Paperclip,
  Download,
  Star,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Building,
  UserCheck,
  CreditCard,
} from 'lucide-react';
import {
  ChallengeProposal,
  ChallengeUserPointWallet,
  ChallengeExpertReview,
} from '../../types/challengeTypes';
import { User } from '../../types';
import {
  formatPointAmount,
  incrementChallengeProposalViews,
  investInChallengeProposal,
  toggleChallengeProposalLike,
  addChallengeExpertReview,
  addChallengeComment,
  getChallengeUserWallet,
} from '../../services/challengeService';
import { CHALLENGE_CONSTANTS } from '../../data/challengeData';

interface ChallengeProposalDetailModalProps {
  proposal: ChallengeProposal;
  onClose: () => void;
  currentUser: User;
  onProposalUpdated: (updated: ChallengeProposal) => void;
  onOpenCertificate: (proposal: ChallengeProposal) => void;
}

export const ChallengeProposalDetailModal: React.FC<ChallengeProposalDetailModalProps> = ({
  proposal,
  onClose,
  currentUser,
  onProposalUpdated,
  onOpenCertificate,
}) => {
  const [currentProp, setCurrentProp] = useState<ChallengeProposal>(proposal);
  const [investAmount, setInvestAmount] = useState<number>(10000);
  const [investMessage, setInvestMessage] = useState('');
  const [investError, setInvestError] = useState('');
  const [investSuccess, setInvestSuccess] = useState(false);

  // Expert review input
  const [expertRating, setExpertRating] = useState<number>(5);
  const [expertAdvice, setExpertAdvice] = useState('');
  const [expertSubmitting, setExpertSubmitting] = useState(false);

  // Comment input
  const [commentText, setCommentText] = useState('');

  const viewedRef = useRef(false);

  // Calculate wallet
  const userRoleType =
    currentUser.role === 'admin'
      ? 'user'
      : (currentUser as any).isExpert || currentUser.title?.includes('專家') || currentUser.title?.includes('顧問')
      ? 'expert'
      : (currentUser as any).isCreator
      ? 'creator'
      : 'user';

  const [wallet, setWallet] = useState<ChallengeUserPointWallet>(() =>
    getChallengeUserWallet(currentUser.id, userRoleType)
  );

  // Increment view once on detail mount (strictly on modal opening)
  useEffect(() => {
    if (!viewedRef.current) {
      viewedRef.current = true;
      incrementChallengeProposalViews(proposal.id);
      setCurrentProp((prev) => ({
        ...prev,
        views: (prev.views || 0) + 1,
      }));
    }
  }, [proposal.id]);

  // Handle ESC close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isLiked = currentProp.likedUserIds?.includes(currentUser.id);
  const isOwner = currentProp.authorId === currentUser.id;
  const isExpert = userRoleType === 'expert' || currentUser.role === 'admin';

  const maxInvestLimit =
    userRoleType === 'expert'
      ? CHALLENGE_CONSTANTS.EXPERT_INVEST_LIMIT
      : userRoleType === 'creator'
      ? CHALLENGE_CONSTANTS.CREATOR_INVEST_LIMIT
      : CHALLENGE_CONSTANTS.USER_INVEST_LIMIT;

  // Handle Like
  const handleLike = async () => {
    const res = await toggleChallengeProposalLike(currentProp.id, currentUser.id);
    const updated: ChallengeProposal = {
      ...currentProp,
      likes: res.likes,
      likedUserIds: res.isLiked
        ? [...(currentProp.likedUserIds || []), currentUser.id]
        : (currentProp.likedUserIds || []).filter((id) => id !== currentUser.id),
    };
    setCurrentProp(updated);
    onProposalUpdated(updated);
  };

  // Handle Invest
  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvestError('');
    setInvestSuccess(false);

    const res = await investInChallengeProposal({
      proposalId: currentProp.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userRole: userRoleType,
      amount: Number(investAmount),
      message: investMessage,
    });

    if (!res.success) {
      setInvestError(res.error || '投資失敗');
      return;
    }

    setInvestSuccess(true);
    setWallet(getChallengeUserWallet(currentUser.id, userRoleType));
    setInvestMessage('');

    // Update current prop
    const updated: ChallengeProposal = {
      ...currentProp,
      fundingRaised: (currentProp.fundingRaised || 0) + Number(investAmount),
      fundingSupportersCount: (currentProp.fundingSupportersCount || 0) + 1,
      investments: [
        {
          id: `inv-${Date.now()}`,
          proposalId: currentProp.id,
          userId: currentUser.id,
          userName: `${currentUser.name} (${userRoleType === 'expert' ? '專家' : '支持者'})`,
          userAvatar: currentUser.avatar,
          userRole: userRoleType,
          amount: Number(investAmount),
          message: investMessage,
          createdAt: new Date().toISOString(),
        },
        ...(currentProp.investments || []),
      ],
    };
    setCurrentProp(updated);
    onProposalUpdated(updated);

    setTimeout(() => setInvestSuccess(false), 4000);
  };

  // Handle Expert Review Submission
  const handleAddExpertReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expertAdvice.trim()) return;

    setExpertSubmitting(true);
    const res = await addChallengeExpertReview({
      proposalId: currentProp.id,
      expertId: currentUser.id,
      expertName: currentUser.name,
      expertAvatar: currentUser.avatar,
      expertTitle: currentUser.title || '認證評審專家',
      expertDomain: currentUser.domain || currentProp.category,
      rating: expertRating,
      advice: expertAdvice,
      isExpertUser: isExpert,
    });

    setExpertSubmitting(false);

    if (res.success && res.review) {
      const updated: ChallengeProposal = {
        ...currentProp,
        expertReviews: [res.review, ...(currentProp.expertReviews || [])],
      };
      setCurrentProp(updated);
      onProposalUpdated(updated);
      setExpertAdvice('');
    } else if (res.error) {
      alert(res.error);
    }
  };

  // Handle Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const res = await addChallengeComment({
      proposalId: currentProp.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      isExpert: isExpert,
      content: commentText,
    });

    if (res.success && res.comment) {
      const updated: ChallengeProposal = {
        ...currentProp,
        comments: [...(currentProp.comments || []), res.comment],
      };
      setCurrentProp(updated);
      onProposalUpdated(updated);
      setCommentText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Bar - Bright Theme */}
        <div className="px-6 py-4 bg-white text-stone-900 flex items-center justify-between shrink-0 border-b border-stone-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
              創新季
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs font-bold">
              {currentProp.category}
            </span>
            {currentProp.isCertified && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1 shadow-2xs">
                <Award className="w-3.5 h-3.5" />
                <span>IdeaX 創新挑戰認證</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentProp.isCertified && (
              <button
                type="button"
                onClick={() => onOpenCertificate(currentProp)}
                className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>檢視認證證書</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 text-stone-800">
          {/* Title & Author Meta */}
          <div className="space-y-4">
            <h1 className="text-xl sm:text-3xl font-black text-stone-950 tracking-tight leading-snug">
              {currentProp.title}
            </h1>

            <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
                  {currentProp.authorAvatar ? (
                    <img src={currentProp.authorAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center">
                      {currentProp.authorName.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-stone-900">
                      {currentProp.teamName || currentProp.authorName}
                    </span>
                    <span className="text-xs text-stone-400 font-mono">
                      @{currentProp.authorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-stone-400" />
                      <span>{currentProp.schoolOrOccupation}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>{new Date(currentProp.submittedAt).toLocaleDateString()} 投稿</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Like & Views */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLike}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    isLiked
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{currentProp.likes || 0} 支持收藏</span>
                </button>

                <div className="px-3 py-2 rounded-2xl bg-stone-100 text-stone-600 text-xs font-mono font-bold flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>{currentProp.views || 0} 瀏覽</span>
                </div>
              </div>
            </div>
          </div>

          {/* Virtual Crowdfunding Highlight Box */}
          <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-300 shadow-xs space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  全網虛擬募資驗證金額 (Idea Point 點數)
                </span>
                <span className="text-2xl sm:text-4xl font-black text-amber-700 font-mono tracking-tight">
                  {formatPointAmount(currentProp.fundingRaised || 0)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-stone-600">
                <div>
                  <span className="text-stone-400 block text-[10px]">支持人次</span>
                  <span className="text-base text-stone-900 font-mono font-black">
                    {currentProp.fundingSupportersCount || 0} 人
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">單案支持上限</span>
                  <span className="text-base text-amber-700 font-mono font-black">
                    ${maxInvestLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Support Form */}
            {!isOwner ? (
              <form onSubmit={handleInvest} className="pt-3 border-t border-amber-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                  <span>💡 投入虛擬點數支持本提案：</span>
                  <span className="text-stone-500">
                    我的可用點數：
                    <strong className="text-amber-700 font-mono font-black ml-1">
                      {formatPointAmount(wallet.availablePoints)}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Coins className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min={100}
                      max={maxInvestLimit}
                      step={500}
                      value={investAmount}
                      onChange={(e) => setInvestAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-amber-200 text-stone-900"
                      placeholder="支持金額 (點)"
                    />
                  </div>

                  <input
                    type="text"
                    value={investMessage}
                    onChange={(e) => setInvestMessage(e.target.value)}
                    placeholder="寫下你的支持寄語（選填）..."
                    className="flex-1 px-3.5 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200 text-stone-900"
                  />

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    立即支持
                  </button>
                </div>

                {investError && (
                  <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{investError}</span>
                  </p>
                )}

                {investSuccess && (
                  <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>成功支持！感謝你為此創新提案注入驗證活水！</span>
                  </p>
                )}
              </form>
            ) : (
              <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-200 text-xs font-bold text-amber-900 text-center">
                這是您自己的提案作品（競賽規範限制：不可投給自己發布的提案作品）
              </div>
            )}
          </div>

          {/* Proposal Core Details (6 Sections) */}
          <div className="space-y-6">
            {/* 1. 痛點描述 */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>1. 痛點描述（你想解決什麼問題？）</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                {currentProp.painPoint}
              </p>
            </div>

            {/* 2. 解決方案 */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>2. 解決方案（你的創新方法）</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                {currentProp.solution}
              </p>
            </div>

            {/* 3 & 4. 目標族群 & 商業模式 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>3. 目標族群 (Target Audience)</span>
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  {currentProp.targetAudience}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>4. 商業模式 (Business Model)</span>
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  {currentProp.businessModel}
                </p>
              </div>
            </div>

            {/* 5. 預期影響 */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>5. 預期影響 (Expected Impact)</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                {currentProp.expectedImpact}
              </p>
            </div>

            {/* 6. 附件/圖片清單 */}
            {currentProp.attachments && currentProp.attachments.length > 0 && (
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-stone-500" />
                  <span>6. 提案附件與補充資料 ({currentProp.attachments.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentProp.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between text-xs hover:border-amber-400 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-bold text-stone-800 truncate">{att.name}</span>
                        {att.size && <span className="text-stone-400 text-[10px]">({att.size})</span>}
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        已附檔
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 收款與完賽資料（僅提案人本人或管理員看見） */}
            {(isOwner || currentUser.role === 'admin') && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1.5 text-stone-700">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                  <span>競賽獎金收款帳戶（僅您本人及管理員可見）</span>
                </div>
                <p className="font-mono">
                  {currentProp.bankName} • 帳號：{currentProp.bankAccount}
                </p>
              </div>
            )}
          </div>

          {/* Section: 專家深度評審專區 */}
          <div className="space-y-4 pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
                  專家評審
                </span>
                <span>認證專家深度指導與評分 ({currentProp.expertReviews?.length || 0})</span>
              </h3>
            </div>

            {/* Expert Review Input (if expert) */}
            {isExpert && (
              <form onSubmit={handleAddExpertReview} className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>以認證專家身分發表指導建議：</span>
                  </span>

                  {/* Star Rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setExpertRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= expertRating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={expertAdvice}
                  onChange={(e) => setExpertAdvice(e.target.value)}
                  placeholder="請針對商業可行性、技術壁壘或市場定位給予具體建議..."
                  className="w-full p-3 bg-white border border-purple-200 focus:border-purple-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-200 resize-none text-stone-900"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={expertSubmitting}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    發布專家評語
                  </button>
                </div>
              </form>
            )}

            {/* Expert Reviews List */}
            {currentProp.expertReviews && currentProp.expertReviews.length > 0 ? (
              <div className="space-y-3">
                {currentProp.expertReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rev.expertAvatar}
                          alt={rev.expertName}
                          className="w-8 h-8 rounded-full object-cover border border-purple-300"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-purple-950">
                              {rev.expertName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">
                              專家
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-500">{rev.expertTitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs font-mono">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{rev.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed bg-white p-3 rounded-xl border border-purple-100 whitespace-pre-wrap">
                      {rev.advice}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic py-2">
                目前尚無專家評審發表評語，審核導師正陸續評鑑中...
              </p>
            )}
          </div>

          {/* Section: 社群支持紀錄與討論 */}
          <div className="space-y-4 pt-4 border-t border-stone-200">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <span>支持動態與社群討論 ({currentProp.comments?.length || 0})</span>
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="對此提案有何想法？留下你的討論或提問..."
                className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200 text-stone-900"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>發布</span>
              </button>
            </form>

            {/* Comments List */}
            {currentProp.comments && currentProp.comments.length > 0 ? (
              <div className="space-y-2.5">
                {currentProp.comments.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-800 flex items-center gap-1.5">
                        <span>{c.userName}</span>
                        {c.isExpert && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                            專家
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">{c.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic py-2">
                歡迎成為第一個留言討論此創新專案的人！
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Coins,
  Trophy,
  Users,
  Compass,
  FilePlus,
  Shield,
  Layers,
  Award,
  Star,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Send,
  Heart,
  MessageSquare,
  Eye,
  Info,
} from 'lucide-react';
import {
  ChallengeTab,
  ChallengeProposal,
  ChallengeExpert,
  ChallengeUserPointWallet,
} from '../../types/challengeTypes';
import { User } from '../../types';
import {
  getChallengeProposals,
  getChallengeExperts,
  getChallengeUserWallet,
  saveChallengeProposals,
  formatPointAmount,
  toggleChallengeProposalLike,
  initChallengeFirestoreSync,
  subscribeChallengeProposals,
} from '../../services/challengeService';
import { CHALLENGE_CONSTANTS } from '../../data/challengeData';
import { useApp } from '../../context/AppContext';

import { ChallengeNavbar } from './ChallengeNavbar';
import { ChallengeHero } from './ChallengeHero';
import { ChallengeProposalsList } from './ChallengeProposalsList';
import { ChallengeLeaderboard } from './ChallengeLeaderboard';
import { ChallengeProposalDetailModal } from './ChallengeProposalDetailModal';
import { ChallengeSubmitModal } from './ChallengeSubmitModal';
import { ChallengeAmbassadorModal } from './ChallengeAmbassadorModal';
import { ChallengeCertificateModal } from './ChallengeCertificateModal';
import { ChallengeAdminModal } from './ChallengeAdminModal';
import { ChallengeFooter } from './ChallengeFooter';
import { ChallengeRegulationsModal } from './ChallengeRegulationsModal';
import { ChallengeGooglePreviewModal } from './ChallengeGooglePreviewModal';
import { ChallengeExpertApplyModal } from './ChallengeExpertApplyModal';
import { ChallengeRoleSelectModal } from './ChallengeRoleSelectModal';

interface InnovationChallengeViewProps {
  onBackToMainPlatform: () => void;
  currentUser: User;
}

export const InnovationChallengeView: React.FC<InnovationChallengeViewProps> = ({
  onBackToMainPlatform,
  currentUser,
}) => {
  const { openAuthModal } = useApp();
  const [activeTab, setActiveTab] = useState<ChallengeTab>('home');
  const [proposals, setProposals] = useState<ChallengeProposal[]>(() =>
    getChallengeProposals(currentUser.id, currentUser.role === 'admin')
  );
  const [experts] = useState<ChallengeExpert[]>(() => getChallengeExperts());

  const isGuest = currentUser.id === 'user-guest' || currentUser.id.startsWith('guest_');

  // Wallet
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

  // Modals state
  const [selectedProposal, setSelectedProposal] = useState<ChallengeProposal | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAmbassadorOpen, setIsAmbassadorOpen] = useState(false);
  const [certificateProposal, setCertificateProposal] = useState<ChallengeProposal | null>(null);

  // New Modals: 競賽辦法、SEO預覽、成為專家審核、身分選擇
  const [isRegulationsOpen, setIsRegulationsOpen] = useState(false);
  const [regulationsInitialTab, setRegulationsInitialTab] = useState<'regulations' | 'participant_terms' | 'expert_terms' | 'faq'>('regulations');
  const [isGooglePreviewOpen, setIsGooglePreviewOpen] = useState(false);
  const [isExpertApplyOpen, setIsExpertApplyOpen] = useState(false);
  const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);

  // Track login transition to trigger role selection
  const prevIsGuestRef = React.useRef(isGuest);

  useEffect(() => {
    if (prevIsGuestRef.current && !isGuest) {
      // User just logged in while on Challenge site: prompt role selection
      setIsRoleSelectOpen(true);
    }
    prevIsGuestRef.current = isGuest;
  }, [isGuest]);

  const handleOpenSubmit = () => {
    if (isGuest) {
      openAuthModal(
        'login',
        'email',
        '參賽網若點「我要投稿」或「成為專家」需先登入帳號，登入後即可選擇「參賽者」或「成為專家」。若尚無帳號請點擊立即註冊。',
        'creator'
      );
      return;
    }
    // If user is already logged in, show role select or submit directly
    if (!(currentUser as any).isCreator && !currentUser.title?.includes('參賽')) {
      setIsRoleSelectOpen(true);
    } else {
      setIsSubmitOpen(true);
    }
  };

  const handleOpenExpertApply = () => {
    if (isGuest) {
      openAuthModal(
        'login',
        'email',
        '參賽網若點「我要投稿」或「成為專家」需先登入帳號，登入後即可選擇「參賽者」或「成為專家」。若尚無帳號請點擊立即註冊。',
        'expert'
      );
      return;
    }
    setIsExpertApplyOpen(true);
  };

  const handleOpenRegulationsModal = (tab: 'regulations' | 'participant_terms' | 'expert_terms' | 'faq' = 'regulations') => {
    setRegulationsInitialTab(tab);
    setIsRegulationsOpen(true);
  };

  // URL parameters routing support (e.g. from Google Search Sitelinks)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const actionParam = params.get('action');

      if (tabParam === 'proposals') {
        setActiveTab('proposals');
      } else if (tabParam === 'rules') {
        handleOpenRegulationsModal('regulations');
      } else if (tabParam === 'leaderboard') {
        setActiveTab('leaderboard');
      } else if (tabParam === 'experts') {
        setActiveTab('experts');
      }

      if (actionParam === 'submit') {
        handleOpenSubmit();
      } else if (actionParam === 'expert') {
        handleOpenExpertApply();
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Firestore Sync & Subscription on mount
  useEffect(() => {
    initChallengeFirestoreSync().then(() => {
      setProposals(getChallengeProposals(currentUser.id, currentUser.role === 'admin'));
    });

    const unsubscribe = subscribeChallengeProposals((list) => {
      setProposals(list);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser.id, currentUser.role]);

  // Scroll to top on tab change
  const handleSelectTab = (tab: ChallengeTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProposalUpdated = (updated: ChallengeProposal) => {
    const list = proposals.map((p) => (p.id === updated.id ? updated : p));
    setProposals(list);
    saveChallengeProposals(list);
    if (selectedProposal && selectedProposal.id === updated.id) {
      setSelectedProposal(updated);
    }
  };

  const handleToggleLike = async (proposalId: string) => {
    const res = await toggleChallengeProposalLike(proposalId, currentUser.id);
    const list = proposals.map((p) => {
      if (p.id === proposalId) {
        return {
          ...p,
          likes: res.likes,
          likedUserIds: res.isLiked
            ? [...(p.likedUserIds || []), currentUser.id]
            : (p.likedUserIds || []).filter((id) => id !== currentUser.id),
        };
      }
      return p;
    });
    setProposals(list);
  };

  const pendingReviewCount = proposals.filter((p) => p.status === 'pending').length;
  const mySubmissions = proposals.filter((p) => p.authorId === currentUser.id);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-emerald-400 selection:text-stone-950">
      {/* 1. Competition Navbar */}
      <ChallengeNavbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onBackToMainPlatform={onBackToMainPlatform}
        currentUser={currentUser}
        wallet={wallet}
        onOpenSubmit={handleOpenSubmit}
        onOpenExpertApply={handleOpenExpertApply}
        onOpenAmbassador={() => setIsAmbassadorOpen(true)}
        pendingReviewCount={pendingReviewCount}
      />

      {/* 2. Main Tab View Content */}
      <main className="flex-1">
        {/* Tab: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-12 pb-20">
            {/* Hero Section */}
            <ChallengeHero
              onOpenSubmit={handleOpenSubmit}
              onExploreProposals={() => handleSelectTab('proposals')}
              onOpenAmbassador={() => setIsAmbassadorOpen(true)}
              onOpenExpertApply={handleOpenExpertApply}
              proposals={proposals}
            />

            {/* Featured Proposals in Home */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                    <span>🔥 熱門參賽提案焦點</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      創星季
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                    獲得大眾支持與專家關注之示範創業專案
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTab('proposals')}
                  className="text-xs font-black text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>查看全部 7 大分類提案</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 3 Featured Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {proposals
                  .filter((p) => p.status === 'approved')
                  .slice(0, 3)
                  .map((proposal) => (
                    <div
                      key={proposal.id}
                      onClick={() => setSelectedProposal(proposal)}
                      className="bg-white rounded-3xl border border-stone-200 hover:border-amber-400 hover:shadow-lg transition-all p-5 flex flex-col justify-between space-y-4 cursor-pointer group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                            創星季
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-stone-500">
                              {proposal.category}
                            </span>
                            {proposal.isDemo && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                範例
                              </span>
                            )}
                          </div>
                        </div>

                        <h4 className="font-black text-base text-stone-900 group-hover:text-amber-700 transition-colors line-clamp-2">
                          {proposal.title}
                        </h4>

                        <p className="text-xs text-stone-600 line-clamp-2">
                          {proposal.painPoint}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">虛擬募資已達</span>
                          <span className="font-mono font-black text-amber-600 text-base">
                            {formatPointAmount(proposal.fundingRaised || 0)}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-stone-400 flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                          <span>{proposal.likes || 0}</span>
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Expert Mentors Highlight - Bright Tech Contest Style */}
            <div className="bg-slate-100/80 border-y border-stone-200 py-12 sm:py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <span className="text-xs font-black text-purple-700 uppercase tracking-wider bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                    EXPERT MENTORS & JUDGES
                  </span>
                  <h3 className="text-xl sm:text-3xl font-black text-stone-900">
                    認證專家評審團陣容
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-500">
                    由商業模式、AI 智慧技術與生醫永續領域導師共同把關深度點評
                  </p>
                  <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 py-1 px-3 rounded-full inline-block mt-1 font-medium">
                    ※ 本名冊為競賽網站展示範例（Demo Mode），導師名單將由大會審查確認後正式公告
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {experts.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={exp.avatar}
                          alt={exp.name}
                          className="w-13 h-13 rounded-2xl object-cover border-2 border-purple-200 shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base text-stone-900">{exp.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                              {exp.isDemo ? '展示範例' : '專家'}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">{exp.title}</p>
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                        {exp.experience}
                      </p>

                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                        <span className="font-bold text-amber-600">
                          ★ {exp.rating.toFixed(1)} 評分
                        </span>
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">
                          專屬投資池 $3,000,000
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Competition Guidelines FAQ Accordion / Box */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="text-center space-y-2">
                <span className="text-xs font-black text-stone-500 uppercase tracking-wider bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                  RULES & GUIDELINES
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-stone-900">
                  競賽規則、點數機制與審核須知
                </h3>
                <p className="text-xs text-stone-500">
                  了解虛擬募資規範、分角色支持上限、分享獎勵與相似提案處理機制
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. 虛擬募資點數機制 */}
                <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-2.5 shadow-2xs">
                  <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>虛擬募資點數與角色上限</span>
                  </h4>
                  <div className="text-xs text-stone-600 space-y-1.5 leading-relaxed">
                    <p>
                      <strong>1 點 = NT$1</strong>，與主站點數與金流完全隔離。
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-700">
                      <li><strong>一般用戶</strong>：初始 100,000 點，每案最高支持 <strong>$50,000</strong></li>
                      <li><strong>提案帳號</strong>：初始 100,000 點，每案最高支持 <strong>$30,000</strong></li>
                      <li><strong>認證專家</strong>：初始 3,000,000 點，每案最高支持 <strong>$2,000,000</strong></li>
                    </ul>
                    <p className="text-[11px] text-red-600 font-bold pt-1">
                      限制：不可購買、不可兌現、不可轉帳、不可支持自己發布的提案作品。
                    </p>
                  </div>
                </div>

                {/* 2. 雙軌獎勵機制區分 */}
                <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-2.5 shadow-2xs">
                  <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>大使推廣費 vs 分享獎勵</span>
                  </h4>
                  <div className="text-xs text-stone-600 space-y-2 leading-relaxed">
                    <div>
                      <strong className="text-emerald-800 block font-black">1. 推廣大使推廣費 ($400/件)：</strong>
                      <span className="text-[11px]">
                        推廣大使每推薦一位創作者且其「<strong>提案審核通過</strong>」，大使可獲得 <strong>NT$ 400 元</strong> 實體推廣費（只按推薦且過審計算，投稿者不領取此款）。
                      </span>
                    </div>
                    <div>
                      <strong className="text-amber-800 block font-black">2. 推薦分享獎勵 (100 點/人)：</strong>
                      <span className="text-[11px]">
                        任何使用者輸入有效推薦碼即可免費領取 <strong>100 點</strong> 競賽專用虛擬投票點數，<strong>每個帳號限領一次</strong>，不可重複領取，不可兌現或移轉主站。
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. 審核與相似提案規則 */}
                <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-2.5 shadow-2xs">
                  <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>投稿審核與評審規章</span>
                  </h4>
                  <div className="text-xs text-stone-600 space-y-1.5 leading-relaxed text-[11px]">
                    <p>
                      提案需符合創新創業與實際痛點解決主題，嚴禁違反法律與抄襲。
                    </p>
                    <p>
                      <strong>相似提案優先原則：</strong>若出現高度相似提案，將以「<strong>最早刊登時間者優先</strong>」，後提交者由審核員通知修改或刪除。
                    </p>
                    <p className="text-stone-700 font-medium">
                      提案通過審核後方於公開專區展示；賽事評選結果與榮譽證明均依正式公告規章辦理，不作任何保證商轉或輔導承諾。
                    </p>
                  </div>
                </div>

                {/* 4. 賽事主辦單位 */}
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <h4 className="font-black text-sm text-amber-950">
                      主辦單位：IdeaX創點子團隊
                    </h4>
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed text-[11px]">
                    本活動由 <strong>IdeaX創點子團隊</strong> 全權主辦與運營，提供創新想法驗證、專家顧問庫資源與早期點數募資評估服務。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: PROPOSALS */}
        {activeTab === 'proposals' && (
          <ChallengeProposalsList
            proposals={proposals}
            onSelectProposal={(p) => setSelectedProposal(p)}
            onToggleLike={handleToggleLike}
            currentUserId={currentUser.id}
            onOpenSubmit={handleOpenSubmit}
          />
        )}

        {/* Tab: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <ChallengeLeaderboard
            proposals={proposals}
            onSelectProposal={(p) => setSelectedProposal(p)}
          />
        )}

        {/* Tab: EXPERTS */}
        {activeTab === 'experts' && (
          <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-black text-purple-700 px-3 py-1 rounded-full bg-purple-50 border border-purple-200">
                認證專家評審名冊（展示範例）
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
                業界領袖與天使導師團
              </h2>
              <p className="text-xs sm:text-sm text-stone-500">
                為參賽提案提供專業指導反饋、商業模式梳理與專屬 3,000,000 虛擬幣投資驗證
              </p>
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-xl inline-block mt-2">
                ※ 本名冊目前為競賽網站展示範例（Demo Mode），正式導師名單將由大會審查確認後正式公布。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {experts.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs hover:border-purple-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={exp.avatar}
                      alt={exp.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-stone-900">{exp.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                          {exp.isDemo ? '展示範例' : '專家'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{exp.title}</p>
                      <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded mt-1 inline-block">
                        專長：{exp.domain}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">{exp.experience}</p>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-600">★ {exp.rating.toFixed(1)} 評鑑星級</span>
                    <span className="font-mono font-bold text-stone-700">
                      已點評 {exp.reviewsCount} 案
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: MY SUBMISSIONS */}
        {activeTab === 'my_submissions' && (
          <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  我的參賽提案 ({mySubmissions.length})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  檢視您所提交的參賽作品審核狀態、募資成果與專家點評
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenSubmit}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <FilePlus className="w-4 h-4" />
                <span>我要投稿新專案</span>
              </button>
            </div>

            {mySubmissions.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-stone-300 space-y-3">
                <FilePlus className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="font-bold text-stone-700">您尚未提交任何參賽提案</h3>
                <p className="text-xs text-stone-500">
                  立即提出你的創新idea，讓全網大眾與認證專家為你驗證！
                </p>
                <button
                  type="button"
                  onClick={handleOpenSubmit}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  立即投稿
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mySubmissions.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProposal(p)}
                    className="p-5 bg-white rounded-3xl border border-stone-200 hover:border-amber-400 shadow-xs cursor-pointer space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        {p.category}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          p.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {p.status === 'approved'
                          ? '已審核通過 (展示中)'
                          : p.status === 'pending'
                          ? '審核中 (未公開)'
                          : '通知修改 / 退回'}
                      </span>
                    </div>

                    <h3 className="font-black text-base text-stone-900 line-clamp-1">{p.title}</h3>
                    <p className="text-xs text-stone-500 line-clamp-2">{p.painPoint}</p>

                    {p.reviewNotes && (
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
                        <span className="font-bold text-stone-800">審核備註：</span>
                        {p.reviewNotes}
                      </div>
                    )}

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="text-stone-500 font-mono">
                        募資：{formatPointAmount(p.fundingRaised || 0)}
                      </span>
                      {p.isCertified && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCertificateProposal(p);
                          }}
                          className="px-2.5 py-1 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg font-bold flex items-center gap-1 text-[11px]"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>檢視參賽證明</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: ADMIN BACKSTAGE */}
        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <ChallengeAdminModal
            onClose={() => setActiveTab('home')}
            proposals={proposals}
            onProposalUpdated={handleProposalUpdated}
            onSelectProposal={(p) => setSelectedProposal(p)}
          />
        )}
      </main>

      {/* Official Challenge Footer with 競賽辦法放在新站頁尾 & SEO Sitelinks 預覽 */}
      <ChallengeFooter
        onOpenRegulations={handleOpenRegulationsModal}
        onOpenGooglePreview={() => setIsGooglePreviewOpen(true)}
        onSelectTab={handleSelectTab}
        onOpenSubmit={handleOpenSubmit}
        onOpenExpertApply={handleOpenExpertApply}
        onOpenAmbassador={() => setIsAmbassadorOpen(true)}
        onBackToMainPlatform={onBackToMainPlatform}
      />

      {/* 3. Modals */}
      {selectedProposal && (
        <ChallengeProposalDetailModal
          onClose={() => setSelectedProposal(null)}
          proposal={selectedProposal}
          currentUser={currentUser}
          onProposalUpdated={handleProposalUpdated}
          onOpenCertificate={(p) => setCertificateProposal(p)}
        />
      )}

      {isSubmitOpen && (
        <ChallengeSubmitModal
          onClose={() => setIsSubmitOpen(false)}
          currentUser={currentUser}
          onSuccess={(newP: ChallengeProposal) => {
            const list = [newP, ...proposals];
            setProposals(list);
            saveChallengeProposals(list);
            setIsSubmitOpen(false);
          }}
        />
      )}

      {isAmbassadorOpen && (
        <ChallengeAmbassadorModal
          onClose={() => setIsAmbassadorOpen(false)}
          currentUser={currentUser}
          proposals={proposals}
        />
      )}

      {certificateProposal && (
        <ChallengeCertificateModal
          onClose={() => setCertificateProposal(null)}
          proposal={certificateProposal}
        />
      )}

      {/* 4. 創星季競賽辦法與規章專屬彈窗 */}
      {isRegulationsOpen && (
        <ChallengeRegulationsModal
          isOpen={isRegulationsOpen}
          onClose={() => setIsRegulationsOpen(false)}
          initialTab={regulationsInitialTab}
          onOpenSubmit={handleOpenSubmit}
        />
      )}

      {/* 5. Google 搜尋結果與 Sitelinks (提案總覽、我要提案、成為專家、活動辦法) 預覽彈窗 */}
      {isGooglePreviewOpen && (
        <ChallengeGooglePreviewModal
          isOpen={isGooglePreviewOpen}
          onClose={() => setIsGooglePreviewOpen(false)}
          onNavigateTo={(target) => {
            if (target === 'proposals') handleSelectTab('proposals');
            else if (target === 'submit') handleOpenSubmit();
            else if (target === 'expert') handleOpenExpertApply();
            else if (target === 'rules') handleOpenRegulationsModal('regulations');
          }}
        />
      )}

      {/* 6. 成為特聘專家：需上傳相關證明或專業證件彈窗 */}
      {isExpertApplyOpen && (
        <ChallengeExpertApplyModal
          isOpen={isExpertApplyOpen}
          onClose={() => setIsExpertApplyOpen(false)}
          currentUser={currentUser}
          onSuccess={(updated) => {
            setWallet(getChallengeUserWallet(updated.id, 'expert'));
          }}
          onOpenRegulations={handleOpenRegulationsModal}
        />
      )}

      {/* 7. 參賽網登入後之身分選擇彈窗（選擇參賽者或專家） */}
      {isRoleSelectOpen && (
        <ChallengeRoleSelectModal
          isOpen={isRoleSelectOpen}
          onClose={() => setIsRoleSelectOpen(false)}
          currentUser={currentUser}
          onSelectCreator={() => {
            setIsRoleSelectOpen(false);
            setIsSubmitOpen(true);
          }}
          onSelectExpert={() => {
            setIsRoleSelectOpen(false);
            setIsExpertApplyOpen(true);
          }}
        />
      )}
    </div>
  );
};


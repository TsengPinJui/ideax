import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Coins,
  Trophy,
  Users,
  Compass,
  FilePlus,
  Shield,
  ShieldCheck,
  Layers,
  Award,
  LogIn,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Check,
  Menu,
  X,
} from 'lucide-react';
import { ChallengeTab, ChallengeUserPointWallet } from '../../types/challengeTypes';
import { User } from '../../types';
import { formatPointAmount } from '../../services/challengeService';
import { useApp } from '../../context/AppContext';

interface ChallengeNavbarProps {
  activeTab: ChallengeTab;
  onSelectTab: (tab: ChallengeTab) => void;
  onBackToMainPlatform: () => void;
  currentUser: User;
  wallet: ChallengeUserPointWallet;
  onOpenSubmit: () => void;
  onOpenExpertApply: () => void;
  onOpenAmbassador: () => void;
  pendingReviewCount: number;
}

export const ChallengeNavbar: React.FC<ChallengeNavbarProps> = ({
  activeTab,
  onSelectTab,
  onBackToMainPlatform,
  currentUser,
  wallet,
  onOpenSubmit,
  onOpenExpertApply,
  onOpenAmbassador,
  pendingReviewCount,
}) => {
  const { openAuthModal, availableUsers, switchAccount, logoutAccount } = useApp();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isGuest = currentUser.id === 'user-guest' || currentUser.id.startsWith('guest_');
  const isExpert = (currentUser as any).isExpert || currentUser.title?.includes('專家') || currentUser.title?.includes('顧問');

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close menus on outside click or ESC key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
        setIsSwitchAccountOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsSwitchAccountOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSwitchUser = (user: User) => {
    switchAccount(user.id);
    setIsUserMenuOpen(false);
    setIsSwitchAccountOpen(false);
  };

  const handleLogout = () => {
    logoutAccount(currentUser.id);
    setIsUserMenuOpen(false);
    setIsSwitchAccountOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 text-stone-900 transition-all shadow-xs">
      {/* Top Banner: 進入IdeaX提問懸賞 & 競賽期間宣傳提示 (黃色主調 + 綠色點綴) */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-stone-950 text-xs font-bold py-2 px-3 sm:px-4 border-b border-amber-300/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-stone-900 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs shrink-0 whitespace-nowrap flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="sm:hidden">11月創新月</span>
              <span className="hidden sm:inline">11月國際創新月</span>
            </span>
            <span className="font-bold text-stone-950 text-[11px] sm:text-xs truncate sm:overflow-visible sm:whitespace-normal">
              🌟 IdeaX 創星季盛大開跑！推廣大使每推薦一件審核通過的提案，可得 <span className="text-emerald-800 font-extrabold underline decoration-emerald-600/50">$400 推廣費</span>
            </span>
          </div>

          {/* 明確顯著的「進入IdeaX提問懸賞」快捷入口 */}
          <button
            type="button"
            onClick={onBackToMainPlatform}
            className="group flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white hover:text-amber-300 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap ml-auto"
            title="前往 IdeaX 提問懸賞與問題交易主平台"
          >
            <span>進入IdeaX提問懸賞</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            <span className="text-[10px] text-stone-400 font-normal hidden lg:inline">| 主站專區</span>
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Competition Brand (使用創星季官方圖片取代原本圖示與文字) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className="flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
            onClick={() => onSelectTab('home')}
            title="返回活動首頁"
          >
            <img
              src="/白底低飽和正向燈泡.png"
              alt="IdeaX"
              className="h-8 sm:h-9 w-auto max-w-[36px] object-contain rounded-xl shrink-0 border border-amber-200/60 shadow-2xs"
            />
            <img
              src="/去背創星季.png"
              alt="創星季"
              className="h-7 sm:h-8 w-auto max-w-[76px] sm:max-w-[88px] object-contain shrink-0"
            />
          </div>
        </div>

        {/* Center: Navigation Tabs with smooth horizontal scroll & no text wrapping / squishing (黃色主調 + 綠色點綴) - 電腦版顯示，手機版收入右上角功能列 */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-stone-600 overflow-x-auto scrollbar-none py-1 flex-nowrap shrink">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'home'
                ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                : 'hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
            <span>活動首頁</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('proposals')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'proposals'
                ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                : 'hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
            <span>探索提案</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('leaderboard')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'leaderboard'
                ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                : 'hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
            <span>競賽榜</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('experts')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'experts'
                ? 'bg-purple-50 text-purple-950 border border-purple-300 font-black shadow-2xs'
                : 'hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
            <span>評審團</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('my_submissions')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'my_submissions'
                ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                : 'hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-700 shrink-0" />
            <span>我的提案</span>
          </button>

          <button
            type="button"
            onClick={onOpenAmbassador}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'ambassador'
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 font-black shadow-2xs'
                : 'hover:text-emerald-900 hover:bg-emerald-50 text-emerald-700'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <span>推廣大使</span>
          </button>

          {/* Admin Backstage Entry */}
          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-red-50 text-red-950 border border-red-300 font-black shadow-2xs'
                  : 'hover:text-red-700 hover:bg-red-50 text-red-600'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>審核後台</span>
              {pendingReviewCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                  {pendingReviewCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Right: 我要投稿（手機與電腦皆保留顯眼） + 電腦版點數/個人資訊 + 手機版右上角功能列 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Virtual Point Wallet (黃色主調) - 電腦版顯示 */}
          <div
            className="hidden lg:flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-2xl text-xs transition-all shadow-2xs shrink-0"
            title={`競賽專屬虛擬點數：可用 ${wallet.availablePoints.toLocaleString()} 點（不可兌現或轉帳）`}
          >
            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-stone-500 font-bold leading-none">虛擬點數</span>
              <span className="font-mono font-black text-amber-700 text-xs">
                {formatPointAmount(wallet.availablePoints)}
              </span>
            </div>
          </div>

          {/* CTA: 我要投稿 (黃色主調) - 手機版與電腦版皆保留於上方外側 */}
          <button
            type="button"
            onClick={onOpenSubmit}
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <FilePlus className="w-4 h-4 shrink-0 text-stone-950" />
            <span>我要投稿</span>
          </button>

          {/* 電腦版專屬：使用者資訊 / 登入按鈕 (手機版收入功能列) */}
          <div className="hidden md:flex items-center gap-2">
            {isGuest ? (
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'email', '參賽網若點「我要投稿」或「成為專家」需先登入帳號，登入後即可選擇「參賽者」或「成為專家」。若尚無帳號請點擊立即註冊。', 'creator')}
                  className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-xs px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                >
                  <FilePlus className="w-3.5 h-3.5 text-stone-950" />
                  <span>提案參賽</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'email', '參賽網若點「我要投稿」或「成為專家」需先登入帳號，登入後即可選擇「參賽者」或「成為專家」。若尚無帳號請點擊立即註冊。', 'expert')}
                  className="flex items-center gap-1 bg-purple-700 hover:bg-purple-600 active:scale-95 text-white font-black text-xs px-2.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                  title="成為專家：上傳相關證件加入評審團，獲配300萬支持池"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                  <span>成為專家</span>
                </button>
              </>
            ) : (
              <>
                {!isExpert && (
                  <button
                    type="button"
                    onClick={onOpenExpertApply}
                    className="flex items-center gap-1 bg-purple-700 hover:bg-purple-600 active:scale-95 text-white font-black text-xs px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                    title="成為專家：上傳相關證明或專業證件，獲配300萬支持池"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                    <span>成為專家</span>
                  </button>
                )}

                <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-stone-50 transition-all cursor-pointer"
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-emerald-300"
                  />
                  <div className="text-left hidden md:block max-w-[100px] truncate">
                    <span className="text-xs font-bold text-stone-900 block truncate">{currentUser.name}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-2">
                    <div className="px-2 py-1.5 border-b border-stone-100">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-stone-900 truncate">{currentUser.name}</span>
                        {currentUser.isCreator ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            創新季參賽者
                          </span>
                        ) : currentUser.role === 'admin' ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                            管理員
                          </span>
                        ) : currentUser.role === 'solver' ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200">
                            解答專家
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                            提問者
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-stone-400">@{currentUser.id}</span>

                      {/* 徽章 */}
                      {(currentUser.hasInnovationCupBadge || (currentUser.badges && currentUser.badges.includes('創新盃'))) && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                            <span>創新盃初賽標章</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 切換帳號區塊 */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setIsSwitchAccountOpen(!isSwitchAccountOpen)}
                        className="w-full px-2.5 py-1.5 rounded-xl hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-stone-500" />
                          <span>切換登入帳號</span>
                        </span>
                        <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isSwitchAccountOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isSwitchAccountOpen && (
                        <div className="p-1 rounded-xl bg-stone-50 border border-stone-100 space-y-1 max-h-40 overflow-y-auto">
                          {availableUsers.map((u) => (
                            <div
                              key={u.id}
                              onClick={() => handleSwitchUser(u)}
                              className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer text-[11px] ${
                                u.id === currentUser.id
                                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                                  : 'hover:bg-white text-stone-700'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                <span className="truncate">{u.name}</span>
                              </div>
                              {u.id === currentUser.id && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-1 border-t border-stone-100 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab('my_submissions');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FilePlus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>查看我的提案</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>登出帳號</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          </div>

          {/* 手機版專屬：右上角功能列按鈕（點擊滑出完整選單） */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-800 shadow-2xs cursor-pointer transition-all relative"
            aria-label="功能選單"
            title="開啟右上角功能列"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-stone-800" />
            ) : (
              <Menu className="w-5 h-5 text-stone-800" />
            )}
            {pendingReviewCount > 0 && currentUser.role === 'admin' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* 手機版：右上角功能列抽屜選單 (使用 createPortal 傳送到 body，徹底避免被 header 或 backdrop-filter 遮擋) */}
      {isMobileMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[99999] md:hidden animate-in fade-in duration-200">
            {/* 半透明遮罩 */}
            <div
              className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* 右側滑出抽屜主體 */}
            <div className="fixed inset-y-0 right-0 w-[85%] max-w-sm h-full h-[100dvh] bg-white shadow-2xl flex flex-col z-[100000] border-l border-stone-200 animate-in slide-in-from-right duration-200 overflow-hidden">
              {/* 抽屜頂部標題與關閉按鈕 */}
              <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <img
                    src="/白底低飽和正向燈泡.png"
                    alt="IdeaX"
                    className="h-7 w-auto max-w-[30px] object-contain rounded-lg shrink-0 border border-amber-200/60 shadow-2xs"
                  />
                  <img
                    src="/去背創星季.png"
                    alt="創星季"
                    className="h-6 w-auto max-w-[68px] object-contain shrink-0"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 active:scale-95 flex items-center justify-center text-stone-600 transition-all cursor-pointer"
                  aria-label="關閉功能列"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 可滾動功能區域 */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {/* 帳號與虛擬點數區塊 */}
                <div className="p-4 border-b border-stone-100 bg-gradient-to-b from-amber-50/40 to-transparent">
                  {isGuest ? (
                    <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-300">尚未登入帳號</p>
                          <p className="text-[11px] text-stone-300">登入或註冊創新季參賽者帳號</p>
                        </div>
                      </div>
                      <div className="pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              openAuthModal('login', 'email', '提案參賽需先登入帳號。登入後即可確認參賽者身分並提交提案；若無帳號請點擊立即註冊選擇「參賽者」或「成為專家」。', 'creator');
                            }}
                            className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-stone-950 font-black text-xs rounded-xl transition-colors text-center shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                            <span>提案參賽</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              openAuthModal('login', 'email', '成為特聘專家需先登入帳號。登入後即可填寫專家資料與證件；若無帳號請點擊立即註冊選擇「成為專家」或「參賽者」。', 'expert');
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black text-xs rounded-xl transition-all text-center shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                            <span>成為專家</span>
                          </button>

                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                          alt={currentUser.name}
                          className="w-11 h-11 rounded-2xl object-cover ring-2 ring-amber-400/50 shadow-2xs shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-stone-900 truncate">{currentUser.name}</span>
                            {currentUser.isCreator ? (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                創新季參賽者
                              </span>
                            ) : currentUser.role === 'admin' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                管理員
                              </span>
                            ) : currentUser.role === 'solver' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200">
                                解答專家
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                                提問者
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-stone-400 block truncate">@{currentUser.id}</span>
                          {(currentUser.hasInnovationCupBadge || (currentUser.badges && currentUser.badges.includes('創新盃'))) && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                <span>創新盃初賽標章</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 虛擬點數卡片 */}
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center font-bold shrink-0">
                            <Coins className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] text-amber-900 font-bold leading-tight">競賽專屬虛擬點數</div>
                            <div className="text-[9px] text-stone-500">可用於支持與投票</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-amber-800 text-sm">
                          {formatPointAmount(wallet.availablePoints)}
                        </span>
                      </div>

                      {/* 切換登入帳號 */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsSwitchAccountOpen(!isSwitchAccountOpen)}
                          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center justify-between transition-colors border border-stone-200/70 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-stone-500" />
                            <span>切換登入帳號</span>
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isSwitchAccountOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isSwitchAccountOpen && (
                          <div className="mt-1.5 p-1 rounded-xl bg-stone-50 border border-stone-200 space-y-1 max-h-36 overflow-y-auto">
                            {availableUsers.map((u) => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  handleSwitchUser(u);
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer text-xs ${
                                  u.id === currentUser.id
                                    ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                                    : 'hover:bg-white text-stone-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                  <span className="truncate">{u.name}</span>
                                </div>
                                {u.id === currentUser.id && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 所有功能列表 */}
                <div className="p-3 space-y-1">
                  <div className="text-[10px] font-bold text-stone-400 px-2 py-1 tracking-wider uppercase">
                    競賽功能分頁
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('home');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                      activeTab === 'home'
                        ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Compass className={`w-4 h-4 ${activeTab === 'home' ? 'text-amber-600' : 'text-stone-500'}`} />
                      <span>活動首頁</span>
                    </div>
                    {activeTab === 'home' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('proposals');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                      activeTab === 'proposals'
                        ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className={`w-4 h-4 ${activeTab === 'proposals' ? 'text-amber-600' : 'text-stone-500'}`} />
                      <span>探索提案（7大領域）</span>
                    </div>
                    {activeTab === 'proposals' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('leaderboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                      activeTab === 'leaderboard'
                        ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Trophy className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'text-amber-600' : 'text-stone-500'}`} />
                      <span>競賽榮譽榜</span>
                    </div>
                    {activeTab === 'leaderboard' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('experts');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                      activeTab === 'experts'
                        ? 'bg-purple-50 text-purple-950 border border-purple-300 font-black shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Award className={`w-4 h-4 ${activeTab === 'experts' ? 'text-purple-600' : 'text-stone-500'}`} />
                      <span>評審團與導師</span>
                    </div>
                    {activeTab === 'experts' && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('my_submissions');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                      activeTab === 'my_submissions'
                        ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FilePlus className={`w-4 h-4 ${activeTab === 'my_submissions' ? 'text-amber-600' : 'text-stone-500'}`} />
                      <span>我的提案進度</span>
                    </div>
                    {activeTab === 'my_submissions' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAmbassador();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>推廣大使計劃</span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-sans tracking-tight">
                      每過審提案獲$400
                    </span>

                  </button>

                  {/* Admin Backstage in Mobile Menu */}
                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('admin');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                        activeTab === 'admin'
                          ? 'bg-red-50 text-red-950 border border-red-300 font-black shadow-2xs'
                          : 'text-red-700 hover:bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span>審核後台管理</span>
                      </div>
                      {pendingReviewCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                          {pendingReviewCount} 待審
                        </span>
                      )}
                    </button>
                  )}

                  {/* 快速返回 IdeaX 提問懸賞主站 */}
                  <div className="pt-3 mt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onBackToMainPlatform();
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-98 text-white flex items-center justify-between text-xs font-black shadow-xs transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span>進入IdeaX提問懸賞</span>
                        <ArrowRight className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-[10px] text-amber-300 font-bold">主站專區 →</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 抽屜底部：登出按鈕 */}
              {!isGuest && (
                <div className="p-3 border-t border-stone-200 bg-stone-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>登出當前帳號</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};

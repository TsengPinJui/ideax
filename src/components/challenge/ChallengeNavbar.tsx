import React from 'react';
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
} from 'lucide-react';
import { ChallengeTab, ChallengeUserPointWallet } from '../../types/challengeTypes';
import { User } from '../../types';
import { formatPointAmount } from '../../services/challengeService';

interface ChallengeNavbarProps {
  activeTab: ChallengeTab;
  onSelectTab: (tab: ChallengeTab) => void;
  onBackToMainPlatform: () => void;
  currentUser: User;
  wallet: ChallengeUserPointWallet;
  onOpenSubmit: () => void;
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
  onOpenAmbassador,
  pendingReviewCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 text-stone-900 transition-all shadow-xs">
      {/* Top Banner: 返回原平台 & 競賽期間宣傳提示 (校園大使每推薦一件審核通過的提案，可得 $800 推廣費) */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-stone-950 text-xs font-bold py-2 px-3 sm:px-4 border-b border-amber-300/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-stone-900 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs shrink-0 whitespace-nowrap">
              11月限定活動
            </span>
            <span className="font-bold text-stone-900 text-[11px] sm:text-xs truncate sm:overflow-visible sm:whitespace-normal">
              🌟 IdeaX 創新挑戰季盛大開跑！校園大使每推薦一件審核通過的提案，可得 $800 推廣費
            </span>
          </div>

          {/* 明確顯著的「返回 IdeaX 原平台」快捷入口 */}
          <button
            type="button"
            onClick={onBackToMainPlatform}
            className="group flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white hover:text-amber-300 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap ml-auto"
            title="回到原 IdeaX 徵點子與問題交易平台"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span>返回 IdeaX 原平台</span>
            <span className="text-[10px] text-stone-400 font-normal hidden lg:inline">| 主站專區</span>
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Competition Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectTab('home')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-stone-950 font-black shadow-md shadow-amber-400/20 ring-1 ring-amber-400/50 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-stone-950" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-black text-sm sm:text-base md:text-lg tracking-tight text-stone-950">
                  IdeaX 創新挑戰季
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  創新季
                </span>
              </div>
              <p className="text-[9px] text-stone-400 font-mono tracking-wider hidden md:block leading-none">
                INNOVATION CHALLENGE 2026
              </p>
            </div>
          </div>
        </div>

        {/* Center: Navigation Tabs with smooth horizontal scroll & no text wrapping / squishing */}
        <nav className="flex items-center gap-1 text-xs font-bold text-stone-600 overflow-x-auto scrollbar-none py-1 flex-nowrap shrink">
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
            <span>宣傳大使</span>
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

        {/* Right: Virtual Points Wallet & Post Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Virtual Point Wallet */}
          <div
            className="hidden sm:flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-2xl text-xs transition-all shadow-2xs shrink-0"
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

          {/* CTA: 我要投稿 */}
          <button
            type="button"
            onClick={onOpenSubmit}
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-xs px-3 sm:px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <FilePlus className="w-4 h-4 shrink-0" />
            <span>我要投稿</span>
          </button>
        </div>
      </div>
    </header>
  );
};

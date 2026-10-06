import React, { useState } from 'react';
import {
  Trophy,
  Coins,
  Heart,
  Award,
  Crown,
  Medal,
  Sparkles,
  ArrowRight,
  Eye,
  Users,
  Info,
} from 'lucide-react';
import { ChallengeProposal } from '../../types/challengeTypes';
import { formatPointAmount } from '../../services/challengeService';

interface ChallengeLeaderboardProps {
  proposals: ChallengeProposal[];
  onSelectProposal: (proposal: ChallengeProposal) => void;
}

type BoardType = 'funding' | 'likes' | 'expert';

export const ChallengeLeaderboard: React.FC<ChallengeLeaderboardProps> = ({
  proposals,
  onSelectProposal,
}) => {
  const [boardType, setBoardType] = useState<BoardType>('funding');

  const approvedProposals = proposals.filter((p) => p.status === 'approved');
  const hasDemoData = approvedProposals.some((p) => p.isDemo);

  const sortedList = [...approvedProposals].sort((a, b) => {
    if (boardType === 'funding') {
      return (b.fundingRaised || 0) - (a.fundingRaised || 0);
    }
    if (boardType === 'likes') {
      return (b.likes || 0) - (a.likes || 0);
    }
    // expert rating / expert review count
    const aRating = a.expertReviews?.[0]?.rating || 0;
    const bRating = b.expertReviews?.[0]?.rating || 0;
    return bRating - aRating;
  });

  return (
    <div className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black">
          <Trophy className="w-3.5 h-3.5 text-amber-600" />
          <span>IdeaX 創新挑戰季 • 榮譽排行榜</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
          頂尖創新提案榜
        </h2>
        <p className="text-xs sm:text-sm text-stone-500">
          全網大眾虛擬支持金與專家深度評分即時同步，見證最具潛力破局者！
        </p>

        {hasDemoData && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>目前為競賽網站展示範例（Demo Mode），正式排名將依大眾實際支持即時更新。</span>
          </div>
        )}

        {/* Board Switcher */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setBoardType('funding')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              boardType === 'funding'
                ? 'bg-amber-400 text-stone-950 shadow-sm font-black'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-700" />
            <span>💰 虛擬募資榜</span>
          </button>

          <button
            type="button"
            onClick={() => setBoardType('likes')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              boardType === 'likes'
                ? 'bg-rose-500 text-white shadow-sm font-black'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>❤️ 人氣心意榜</span>
          </button>

          <button
            type="button"
            onClick={() => setBoardType('expert')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              boardType === 'expert'
                ? 'bg-purple-600 text-white shadow-sm font-black'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>⭐ 專家力挺榜</span>
          </button>
        </div>
      </div>

      {sortedList.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-stone-300 text-stone-400 text-xs">
          目前排行榜尚無正式過審之參賽提案，歡迎搶先投稿！
        </div>
      ) : (
        <>
          {/* Top 3 Podium (if at least 3) */}
          {sortedList.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 max-w-4xl mx-auto items-end">
              {/* Rank 2 (Silver) */}
              <div
                onClick={() => onSelectProposal(sortedList[1])}
                className="order-2 md:order-1 p-5 rounded-3xl bg-white border border-stone-200 shadow-xs hover:border-amber-400 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group"
              >
                <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center font-black font-mono absolute -top-3.5 left-5 shadow-xs">
                  2
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                      {sortedList[1].category}
                    </span>
                    {sortedList[1].isDemo && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                        範例
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-sm text-stone-900 mt-2 line-clamp-2">
                    {sortedList[1].title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {sortedList[1].teamName || sortedList[1].authorName}
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-400">募資總額</span>
                  <span className="font-mono font-black text-amber-600 text-sm">
                    {formatPointAmount(sortedList[1].fundingRaised || 0)}
                  </span>
                </div>
              </div>

              {/* Rank 1 (Gold Champion) */}
              <div
                onClick={() => onSelectProposal(sortedList[0])}
                className="order-1 md:order-2 p-6 rounded-3xl bg-gradient-to-b from-amber-50 via-white to-white border-2 border-amber-400 shadow-md hover:-translate-y-1.5 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative group"
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black font-mono absolute -top-5 left-1/2 -translate-x-1/2 shadow-md shadow-amber-400/30">
                  <Crown className="w-5 h-5 text-stone-950" />
                </div>
                <div className="pt-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950">
                      TOP 1 領先王者
                    </span>
                    {sortedList[0].isDemo && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                        範例
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-base text-stone-900 mt-2.5 line-clamp-2">
                    {sortedList[0].title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 font-bold">
                    {sortedList[0].teamName || sortedList[0].authorName}
                  </p>
                </div>
                <div className="pt-3 border-t border-amber-200 text-center">
                  <span className="text-xs font-bold text-stone-500 block">累計虛擬募資驗證</span>
                  <span className="font-mono font-black text-xl text-amber-600">
                    {formatPointAmount(sortedList[0].fundingRaised || 0)}
                  </span>
                </div>
              </div>

              {/* Rank 3 (Bronze) */}
              <div
                onClick={() => onSelectProposal(sortedList[2])}
                className="order-3 p-5 rounded-3xl bg-white border border-stone-200 shadow-xs hover:border-amber-400 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black font-mono absolute -top-3.5 left-5 shadow-xs">
                  3
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                      {sortedList[2].category}
                    </span>
                    {sortedList[2].isDemo && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                        範例
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-sm text-stone-900 mt-2 line-clamp-2">
                    {sortedList[2].title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {sortedList[2].teamName || sortedList[2].authorName}
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-400">募資總額</span>
                  <span className="font-mono font-black text-amber-600 text-sm">
                    {formatPointAmount(sortedList[2].fundingRaised || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="divide-y divide-stone-100">
              {sortedList.map((proposal, index) => (
                <div
                  key={proposal.id}
                  onClick={() => onSelectProposal(proposal)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-amber-50/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black font-mono text-xs shrink-0 ${
                        index === 0
                          ? 'bg-amber-400 text-stone-950 shadow-2xs'
                          : index === 1
                          ? 'bg-stone-200 text-stone-800'
                          : index === 2
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.2 rounded bg-stone-100 text-stone-600 font-bold">
                          {proposal.category}
                        </span>
                        {proposal.isDemo && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                            展示範例
                          </span>
                        )}
                        <span className="font-black text-sm text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                          {proposal.title}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 truncate">
                        {proposal.teamName || proposal.authorName} ({proposal.schoolOrOccupation})
                      </p>
                    </div>
                  </div>

                  {/* Stats on Right */}
                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-sm sm:text-base text-amber-600 block">
                      {formatPointAmount(proposal.fundingRaised || 0)}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {proposal.fundingSupportersCount || 0} 支持 • {proposal.likes || 0} 收藏
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

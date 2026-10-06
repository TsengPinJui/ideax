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
  CheckCircle2,
} from 'lucide-react';
import { ChallengeProposal } from '../../types/challengeTypes';
import { formatPointAmount, getChallengeContestStatus } from '../../services/challengeService';

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
  const contestStatus = getChallengeContestStatus();

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

        {/* 賽事結算狀態與「創之星」徽章說明橫幅 */}
        {contestStatus.isFinalized ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 border-2 border-amber-400 text-amber-950 text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center justify-center gap-2 font-black text-sm text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>🏆 創星季賽事結果已正式公布 • 前 10 名「創之星」獲獎者榮譽榜</span>
            </div>
            <p className="text-[11px] text-stone-700">
              前 10 名獲獎提案所屬創作者已正式獲頒官方「創之星」徽章，並同步建立可追溯之獲獎記錄。
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200 text-xs text-stone-700 flex items-center justify-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              賽事進行中（未結算）。競賽結果經管理員確認/正式公布後，前 10 名獲獎提案所屬用戶方可取得「創之星」徽章。
            </span>
          </div>
        )}

        {hasDemoData && !contestStatus.isFinalized && (
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                      {sortedList[1].category}
                    </span>
                    {sortedList[1].isDemo && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                        範例
                      </span>
                    )}
                    {(contestStatus.isFinalized || sortedList[1].starOfCreationAwarded) && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-black shadow-2xs flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>創之星 TOP 2</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-sm text-stone-900 mt-2 line-clamp-2">
                    {sortedList[1].title}
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-1 truncate">
                    團隊：{sortedList[1].teamName}
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-500 text-[11px]">虛擬募資額</span>
                  <span className="font-mono font-black text-amber-600">
                    {formatPointAmount(sortedList[1].fundingRaised || 0)}
                  </span>
                </div>
              </div>

              {/* Rank 1 (Gold) */}
              <div
                onClick={() => onSelectProposal(sortedList[0])}
                className="order-1 md:order-2 p-6 rounded-3xl bg-gradient-to-b from-amber-50/60 to-white border-2 border-amber-400 shadow-md hover:-translate-y-1.5 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative group"
              >
                <div className="w-10 h-10 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-black font-mono absolute -top-5 left-1/2 -translate-x-1/2 shadow-md ring-4 ring-white">
                  <Crown className="w-5 h-5 text-stone-950" />
                </div>
                <div className="pt-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                      {sortedList[0].category}
                    </span>
                    {sortedList[0].isDemo && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 font-bold">
                        範例
                      </span>
                    )}
                    {(contestStatus.isFinalized || sortedList[0].starOfCreationAwarded) && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black shadow-2xs flex items-center gap-1 mx-auto mt-1">
                        <Sparkles className="w-3 h-3" />
                        <span>創之星 冠軍 TOP 1</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-base text-stone-900 mt-2 line-clamp-2 leading-snug">
                    {sortedList[0].title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 font-medium">
                    {sortedList[0].teamName} • @{sortedList[0].authorName}
                  </p>
                </div>
                <div className="pt-3 border-t border-amber-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900">👑 目前榜首</span>
                  <span className="font-mono font-black text-amber-700 text-base">
                    {formatPointAmount(sortedList[0].fundingRaised || 0)}
                  </span>
                </div>
              </div>

              {/* Rank 3 (Bronze) */}
              <div
                onClick={() => onSelectProposal(sortedList[2])}
                className="order-3 p-5 rounded-3xl bg-white border border-stone-200 shadow-xs hover:border-amber-400 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-black font-mono absolute -top-3.5 left-5 shadow-xs">
                  3
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                      {sortedList[2].category}
                    </span>
                    {sortedList[2].isDemo && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                        範例
                      </span>
                    )}
                    {(contestStatus.isFinalized || sortedList[2].starOfCreationAwarded) && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-black shadow-2xs flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>創之星 TOP 3</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-sm text-stone-900 mt-2 line-clamp-2">
                    {sortedList[2].title}
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-1 truncate">
                    團隊：{sortedList[2].teamName}
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-500 text-[11px]">虛擬募資額</span>
                  <span className="font-mono font-black text-amber-600">
                    {formatPointAmount(sortedList[2].fundingRaised || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Full Ranked Table */}
          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
              <h3 className="font-black text-stone-900 text-sm sm:text-base flex items-center gap-2">
                <span>全部參賽提案即時名次榜</span>
                <span className="text-xs font-bold text-stone-400">({sortedList.length} 案)</span>
              </h3>
              <span className="text-xs text-stone-400 font-mono">
                {contestStatus.isFinalized ? '結算定案' : '即時更新'}
              </span>
            </div>

            <div className="divide-y divide-stone-100">
              {sortedList.map((item, idx) => {
                const rank = idx + 1;
                const isTop10 = rank <= 10;
                const isWinner = contestStatus.isFinalized && isTop10;

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectProposal(item)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-stone-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Rank Number */}
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black font-mono text-xs sm:text-sm shrink-0 ${
                          rank === 1
                            ? 'bg-amber-400 text-stone-950 font-black'
                            : rank === 2
                            ? 'bg-stone-200 text-stone-800 font-bold'
                            : rank === 3
                            ? 'bg-amber-100 text-amber-900 font-bold'
                            : isWinner
                            ? 'bg-amber-50 text-amber-800 border border-amber-300 font-bold'
                            : 'bg-stone-50 text-stone-500'
                        }`}
                      >
                        {rank}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                            {item.category}
                          </span>
                          {item.isDemo && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                              範例
                            </span>
                          )}
                          {isWinner && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-black shadow-2xs flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>創之星 TOP {rank}</span>
                            </span>
                          )}
                          <span className="text-xs text-stone-400 hidden sm:inline truncate">
                            {item.teamName}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 block font-medium">虛擬支持額</span>
                        <span className="font-mono font-black text-amber-600 text-xs sm:text-sm">
                          {formatPointAmount(item.fundingRaised || 0)}
                        </span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-900 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

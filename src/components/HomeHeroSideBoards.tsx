import React from 'react';
import { Sparkles, Flame, Play, Trophy, ChevronRight } from 'lucide-react';
import type { Question } from '../types';
import { getHotRankedGames, getFeaturedGames } from '../data/hotGamesData';

interface HomeHeroSideBoardsProps {
  questions: Question[];
  onSelectGame: (game: Question) => void;
  className?: string;
}

/**
 * 首頁輪播區左側：精選遊戲（精選裡頭前 10 名）
 */
export const FeaturedGamesBoard: React.FC<{
  questions: Question[];
  onSelectGame: (game: Question) => void;
}> = ({ questions, onSelectGame }) => {
  const featuredList = getFeaturedGames(questions);

  return (
    <div className="w-full h-full flex flex-col rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-sm p-3 sm:p-3.5 transition-all hover:shadow-md">
      {/* 標題欄 */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-1 border-b border-amber-100/80">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-black text-stone-900 tracking-tight flex items-center gap-1">
            <span>精選遊戲</span>
          </h2>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/80">
          TOP 10
        </span>
      </div>

      {/* 列表清單（10 款精選） */}
      <div className="flex-1 flex flex-col justify-between divide-y divide-stone-100/80 text-left">
        {featuredList.map(({ question, rank }) => {
          const isTop3 = rank <= 3;
          const displayTitle = question.appName || question.title.split('—')[0]?.split('|')[0]?.trim() || question.title;

          return (
            <button
              key={`feat-${question.id}-${rank}`}
              type="button"
              onClick={() => onSelectGame(question)}
              className="group w-full py-1.5 px-1.5 rounded-xl flex items-center justify-between gap-2 hover:bg-amber-50/80 active:scale-[0.99] transition-all text-left cursor-pointer"
              title={`點擊全螢幕試玩：《${question.title}》`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-4 text-center font-mono font-black text-xs shrink-0 ${
                    isTop3 ? 'text-amber-600' : 'text-stone-400 font-bold'
                  }`}
                >
                  {rank}
                </span>
                <span className="text-xs font-bold text-stone-800 truncate group-hover:text-amber-800 group-hover:underline decoration-amber-400 underline-offset-2 transition-colors">
                  {displayTitle}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="hidden group-hover:inline-flex items-center gap-0.5 text-[10px] font-black text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded-md animate-in fade-in duration-100">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  試玩
                </span>
                <span className="group-hover:hidden text-[11px] font-bold text-amber-600 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60 font-mono">
                  ★ {question.experienceScore ? `${question.experienceScore}分` : '精選'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 首頁輪播區右側：熱度榜（嚴格按照圖一之 10 款提案對應放置）
 */
export const HotGamesRankingBoard: React.FC<{
  questions: Question[];
  onSelectGame: (game: Question) => void;
}> = ({ questions, onSelectGame }) => {
  const hotList = getHotRankedGames(questions);

  return (
    <div className="w-full h-full flex flex-col rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-sm p-3 sm:p-3.5 transition-all hover:shadow-md">
      {/* 標題欄 */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-1 border-b border-rose-100/80">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-black text-stone-900 tracking-tight flex items-center gap-1">
            <span>熱度榜</span>
          </h2>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80">
          即時排行
        </span>
      </div>

      {/* 列表清單（按照圖一對應之 10 款小遊戲提案） */}
      <div className="flex-1 flex flex-col justify-between divide-y divide-stone-100/80 text-left">
        {hotList.map(({ question, heat, rank }) => {
          const isTop3 = rank <= 3;

          return (
            <button
              key={`hot-${question.id}-${rank}`}
              type="button"
              onClick={() => onSelectGame(question)}
              className="group w-full py-1.5 px-1.5 rounded-xl flex items-center justify-between gap-2 hover:bg-rose-50/70 active:scale-[0.99] transition-all text-left cursor-pointer"
              title={`點擊直接進入全螢幕體驗：《${question.title}》`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* 前三名紅色，4-10名灰色，完全遵照圖一 */}
                <span
                  className={`w-4 text-center font-mono font-black text-xs shrink-0 ${
                    isTop3 ? 'text-red-700 text-sm font-black' : 'text-stone-400 font-bold'
                  }`}
                >
                  {rank}
                </span>
                <span className="text-xs font-semibold text-stone-800 truncate group-hover:text-red-700 group-hover:underline decoration-rose-300 underline-offset-2 transition-colors">
                  {question.title}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="hidden group-hover:inline-flex items-center gap-0.5 text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md animate-in fade-in duration-100">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  體驗
                </span>
                {/* 熱度值 (如 17k, 13k, 9.5k...) 遵照圖一右側字樣 */}
                <span className="group-hover:hidden text-xs font-mono font-semibold text-stone-400">
                  {heat}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

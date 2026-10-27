import React from 'react';
import { Flame, Trophy } from 'lucide-react';
import type { HomeShowcaseCategory, Question } from '../types';
import {
  getHotRankedGames,
  getFeaturedGames,
  getHotRankedProposalsAndSoftware,
  getFeaturedProposalsAndSoftware,
} from '../data/hotGamesData';
import { deriveInnovationProposalName } from '../utils/titleFormat';

interface HomeHeroSideBoardsProps {
  questions: Question[];
  onSelectGame: (game: Question) => void;
  className?: string;
}

/**
 * 首頁輪播區左側：精選榜（支援「提案與軟體」與「遊戲」兩類切換）
 */
export const FeaturedGamesBoard: React.FC<{
  questions: Question[];
  onSelectGame: (game: Question) => void;
  carouselQuestions?: Question[];
  category?: HomeShowcaseCategory;
}> = ({ questions, onSelectGame, carouselQuestions = [], category = 'games' }) => {
  // 按照首頁輪播展示順序排列，不足 10 款則由該分類精選庫依序補滿
  const carouselList: Question[] = [];
  const seenIds = new Set<string>();

  for (const q of carouselQuestions) {
    if (!q || seenIds.has(q.id)) continue;
    seenIds.add(q.id);
    carouselList.push(q);
  }

  if (carouselList.length < 10) {
    const fallbackList =
      category === 'proposals_software'
        ? getFeaturedProposalsAndSoftware(questions)
        : getFeaturedGames(questions);
    for (const item of fallbackList) {
      if (carouselList.length >= 10) break;
      if (!seenIds.has(item.question.id)) {
        seenIds.add(item.question.id);
        carouselList.push(item.question);
      }
    }
  }

  const featuredList = carouselList.slice(0, 10).map((question, idx) => {
    const existingDemoUrl = question.demoUrl || (question as any).vibeCodingData?.demoUrl || '';
    return {
      question:
        category === 'games'
          ? {
              ...question,
              demoUrl: existingDemoUrl || 'https://4388.fun/',
              previewMode: 'embed' as const,
            }
          : existingDemoUrl
          ? {
              ...question,
              demoUrl: existingDemoUrl,
              previewMode: 'embed' as const,
            }
          : question,
      rank: idx + 1,
    };
  });

  const boardTitle = category === 'proposals_software' ? '精選提案軟體' : '精選遊戲';

  return (
    <div className="w-full h-full flex flex-col rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-xs p-2 sm:p-2.5 transition-all hover:shadow-sm overflow-hidden">
      {/* 緊湊標題欄 */}
      <div className="flex items-center justify-between gap-1 pb-1.5 mb-0.5 border-b border-amber-100">
        <div className="flex items-center gap-1 min-w-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Trophy className="w-3 h-3" />
          </div>
          <h2 className="text-xs font-black text-stone-900 tracking-tight truncate">
            {boardTitle}
          </h2>
        </div>
        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 shrink-0">
          TOP 10
        </span>
      </div>

      {/* 列表清單（10 款精選，塞不下自動以 ... 截斷） */}
      <div className="flex-1 flex flex-col justify-between divide-y divide-stone-100/70 text-left overflow-hidden">
        {featuredList.map(({ question, rank }) => {
          const isTop3 = rank <= 3;
          const displayTitle =
            question.appName ||
            deriveInnovationProposalName(question) ||
            question.title.split('—')[0]?.split('|')[0]?.trim() ||
            question.title;

          return (
            <button
              key={`feat-${category}-${question.id}-${rank}`}
              type="button"
              onClick={() => onSelectGame(question)}
              className="group w-full py-1 px-1 rounded-lg flex items-center gap-1.5 hover:bg-amber-50/80 active:scale-[0.99] transition-all text-left cursor-pointer overflow-hidden"
              title={`點擊查看：《${question.title}》`}
            >
              <span
                className={`w-3.5 text-center font-mono font-black text-[11px] shrink-0 ${
                  isTop3 ? 'text-amber-600' : 'text-stone-400 font-bold'
                }`}
              >
                {rank}
              </span>
              <span className="text-xs font-medium text-stone-800 truncate min-w-0 flex-1 group-hover:text-amber-800 transition-colors">
                {displayTitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 首頁輪播區右側：熱度榜（支援「提案與軟體」與「遊戲」兩類切換）
 */
export const HotGamesRankingBoard: React.FC<{
  questions: Question[];
  onSelectGame: (game: Question) => void;
  mode?: 'custom' | 'views';
  customIds?: string[];
  category?: HomeShowcaseCategory;
}> = ({ questions, onSelectGame, mode = 'custom', customIds = [], category = 'games' }) => {
  const hotList =
    category === 'proposals_software'
      ? getHotRankedProposalsAndSoftware(questions, mode, customIds)
      : getHotRankedGames(questions, mode, customIds);

  return (
    <div className="w-full h-full flex flex-col rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-xs p-2 sm:p-2.5 transition-all hover:shadow-sm overflow-hidden">
      {/* 緊湊標題欄 */}
      <div className="flex items-center justify-between gap-1 pb-1.5 mb-0.5 border-b border-rose-100">
        <div className="flex items-center gap-1 min-w-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Flame className="w-3 h-3" />
          </div>
          <h2 className="text-xs font-black text-stone-900 tracking-tight truncate">
            熱度榜
          </h2>
        </div>
        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 shrink-0">
          TOP 10
        </span>
      </div>

      {/* 列表清單（10 款熱門項目，塞不下自動以 ... 截斷） */}
      <div className="flex-1 flex flex-col justify-between divide-y divide-stone-100/70 text-left overflow-hidden">
        {hotList.map(({ question, rank }) => {
          const isTop3 = rank <= 3;

          return (
            <button
              key={`hot-${category}-${question.id}-${rank}`}
              type="button"
              onClick={() => onSelectGame(question)}
              className="group w-full py-1 px-1 rounded-lg flex items-center gap-1.5 hover:bg-rose-50/70 active:scale-[0.99] transition-all text-left cursor-pointer overflow-hidden"
              title={`點擊查看：《${question.title}》`}
            >
              {/* 前三名紅色，4-10名灰色 */}
              <span
                className={`w-3.5 text-center font-mono font-black text-[11px] shrink-0 ${
                  isTop3 ? 'text-red-700 font-black' : 'text-stone-400 font-bold'
                }`}
              >
                {rank}
              </span>
              <span className="text-xs font-medium text-stone-800 truncate min-w-0 flex-1 group-hover:text-red-700 transition-colors">
                {question.appName
                  ? `${question.appName}：${question.title}`
                  : deriveInnovationProposalName(question)
                  ? `${deriveInnovationProposalName(question)}：${question.title}`
                  : question.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};


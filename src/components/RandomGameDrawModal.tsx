import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Dices,
  Play,
  RotateCw,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import type { HomeShowcaseCategory, Question } from '../types';
import { getRandomThreeGames, getRandomThreeProposals } from '../data/hotGamesData';
import { deriveInnovationProposalName } from '../utils/titleFormat';

interface RandomGameDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onSelectGame: (game: Question) => void;
  category?: HomeShowcaseCategory;
}

export const RandomGameDrawModal: React.FC<RandomGameDrawModalProps> = ({
  isOpen,
  onClose,
  questions,
  onSelectGame,
  category = 'games',
}) => {
  const [drawnGames, setDrawnGames] = useState<Question[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [drawCount, setDrawCount] = useState(0);
  const isProposalMode = category === 'proposals_software';

  // 執行抽取 3 個提案或 3 款遊戲
  const rollThreeGames = useCallback(() => {
    setIsRolling(true);
    const prevIds = drawnGames.map((g) => g.id);

    // 短暫的洗牌骰子動畫感 (450ms)
    setTimeout(() => {
      const picks = isProposalMode
        ? getRandomThreeProposals(questions, prevIds)
        : getRandomThreeGames(questions, prevIds);
      setDrawnGames(picks);
      setIsRolling(false);
      setDrawCount((prev) => prev + 1);
    }, 450);
  }, [questions, drawnGames, isProposalMode]);

  // 開啟彈窗或切換分類時自動抽第一輪
  useEffect(() => {
    if (isOpen) {
      rollThreeGames();
    }
  }, [isOpen, isProposalMode]);

  if (!isOpen) return null;

  const cardAccents = isProposalMode
    ? [
        {
          badge: '💡 精選提案 #1',
          bgGlow: 'from-sky-500/10 via-indigo-500/5 to-transparent',
          border: 'border-sky-300 hover:border-sky-400',
          badgeBg: 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white',
          btnBg: 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-sky-200',
        },
        {
          badge: '🚀 熱門創新 #2',
          bgGlow: 'from-indigo-500/10 via-purple-500/5 to-transparent',
          border: 'border-indigo-300 hover:border-indigo-400',
          badgeBg: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
          btnBg: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-200',
        },
        {
          badge: '✨ 潛力佳作 #3',
          bgGlow: 'from-amber-500/10 via-orange-500/5 to-transparent',
          border: 'border-amber-300 hover:border-amber-400',
          badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
          btnBg: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-200',
        },
      ]
    : [
        {
          badge: '👑 今日必玩 #1',
          bgGlow: 'from-amber-500/10 via-orange-500/5 to-transparent',
          border: 'border-amber-300 hover:border-amber-400',
          badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
          btnBg: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-200',
        },
        {
          badge: '🔥 療癒解壓 #2',
          bgGlow: 'from-rose-500/10 via-orange-500/5 to-transparent',
          border: 'border-rose-300 hover:border-rose-400',
          badgeBg: 'bg-gradient-to-r from-rose-500 to-orange-500 text-white',
          btnBg: 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-rose-200',
        },
        {
          badge: '✨ 驚喜黑馬 #3',
          bgGlow: 'from-purple-500/10 via-amber-500/5 to-transparent',
          border: 'border-purple-300 hover:border-purple-400',
          badgeBg: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white',
          btnBg: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-purple-200',
        },
      ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white border ${
          isProposalMode ? 'border-sky-200/80' : 'border-amber-200/80'
        } shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部裝飾背景光 */}
        <div
          className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${
            isProposalMode
              ? 'from-sky-100/70 via-indigo-50/40 to-transparent'
              : 'from-amber-100/70 via-orange-50/40 to-transparent'
          } pointer-events-none`}
        />

        {/* Header 標題欄 */}
        <div className="relative px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${
                isProposalMode
                  ? 'from-sky-500 to-indigo-600 shadow-sky-200'
                  : 'from-amber-500 to-orange-500 shadow-amber-200'
              } text-white flex items-center justify-center shadow-md shrink-0`}
            >
              <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                  {isProposalMode ? '隨機看3個提案' : '隨機抽 3 款遊戲'}
                </h3>
                <span
                  className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${
                    isProposalMode
                      ? 'bg-sky-100 text-sky-800 border-sky-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  第 {drawCount} 次抽取 🎲
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">
                {isProposalMode
                  ? '隨機精選 3 個創新提案與軟體作品，點擊立即查看完整提案或體驗！'
                  : '隨機精選 3 款熱門好玩小遊戲，點擊立即全螢幕線上試玩！'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content 展示卡片區 */}
        <div className="relative flex-1 overflow-y-auto p-4 sm:p-6">
          {isRolling ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${
                    isProposalMode
                      ? 'from-sky-400 via-indigo-500 to-sky-600 shadow-sky-200'
                      : 'from-amber-400 via-orange-500 to-amber-600 shadow-amber-200'
                  } flex items-center justify-center text-white shadow-xl animate-bounce`}
                >
                  <Dices className="w-10 h-10 animate-spin" />
                </div>
                <Sparkles className="w-6 h-6 text-amber-400 absolute -top-2 -right-2 animate-ping" />
              </div>
              <div>
                <p className="text-base font-black text-stone-800 tracking-tight">
                  {isProposalMode ? '正在隨機抽取 3 個提案...' : '正在隨機抽取 3 款遊戲...'}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  {isProposalMode ? '洗牌全站創新提案與軟體作品庫中 🎲' : '洗牌全站遊戲庫與熱度榜中 🎰'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
              {drawnGames.map((game, idx) => {
                const accent = cardAccents[idx % cardAccents.length];
                const cover =
                  game.coverImage ||
                  (game as any).vibeCodingData?.coverImageUrl ||
                  (game as any).screenshotUrl ||
                  game.cardDisplayImage ||
                  (isProposalMode
                    ? 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80'
                    : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80');
                const displayTitle =
                  game.appName ||
                  deriveInnovationProposalName(game) ||
                  game.title.split('—')[0]?.split('|')[0]?.trim() ||
                  game.title;

                return (
                  <div
                    key={`drawn-item-${game.id}-${idx}`}
                    className={`group relative flex flex-col rounded-2xl bg-white border ${accent.border} shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden text-left`}
                  >
                    {/* 頂部徽章 */}
                    <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden">
                      <img
                        src={cover}
                        alt={displayTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = isProposalMode
                            ? 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80'
                            : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                      {/* 幸運抽卡標籤 */}
                      <div className="absolute top-2.5 left-2.5">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs ${accent.badgeBg}`}
                        >
                          {accent.badge}
                        </span>
                      </div>

                      {/* 底部浮動標題 */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <p className="text-xs sm:text-sm font-black text-white drop-shadow-md truncate">
                          {displayTitle}
                        </p>
                        <p className="text-[10px] text-stone-200 truncate mt-0.5">
                          {game.authorName || (isProposalMode ? '創點子提案人' : '獨立遊戲團隊')}
                        </p>
                      </div>
                    </div>

                    {/* 卡片本體簡介 */}
                    <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {/* 標籤群 */}
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {(game.tags || (isProposalMode ? ['創新提案', '軟體作品'] : ['網頁小遊戲', '休閒']))
                            .slice(0, 3)
                            .map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-600"
                              >
                                #{tag}
                              </span>
                            ))}
                        </div>

                        {/* 描述 */}
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {game.description ||
                            (isProposalMode
                              ? '這是一項極具創意與落地價值的創新與軟體作品，歡迎點擊深入了解！'
                              : '這是一款趣味又好上手的精選互動小遊戲，隨點即玩免下載！')}
                        </p>
                      </div>

                      {/* CTA 按鈕 */}
                      <div className="pt-2 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectGame(game);
                          }}
                          className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ${accent.btnBg}`}
                        >
                          {isProposalMode ? (
                            <>
                              <Lightbulb className="w-3.5 h-3.5" />
                              <span>查看提案詳情</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>立即線上試玩</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer 底部控制列 */}
        <div className="px-4 sm:px-6 py-3 border-t border-stone-200 bg-stone-50/80 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
            <Sparkles className={`w-4 h-4 ${isProposalMode ? 'text-sky-500' : 'text-amber-500'}`} />
            <span>
              {isProposalMode
                ? '想看更多？點擊「再看 3 個」隨機換一批提案！'
                : '不滿意這 3 款？點擊「再抽 3 款」隨機換一批！'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isRolling}
              onClick={rollThreeGames}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r ${
                isProposalMode
                  ? 'from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-sky-200'
                  : 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200'
              } disabled:opacity-50 text-white text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
              <span>{isProposalMode ? '🎲 再看 3 個' : '🎲 再抽 3 款'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


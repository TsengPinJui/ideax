import React, { useRef } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Heart, Coins, ArrowRight } from 'lucide-react';
import { Question } from '../types';
import { useApp } from '../context/AppContext';
import { isGameQuestion, getEffectiveTertiaryCategory } from '../utils/gameClassification';
import { getUniqueProposalCoverImage } from '../utils/proposalImageUtils';
import { resolveUserDisplayName } from '../utils/userDisplay';

interface SimilarRecommendationsSectionProps {
  currentQuestion: Question;
  onSelectQuestion: (question: Question) => void;
  className?: string;
}

export const SimilarRecommendationsSection: React.FC<SimilarRecommendationsSectionProps> = ({
  currentQuestion,
  onSelectQuestion,
  className = '',
}) => {
  const { questions, availableUsers } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 計算推薦權重與候選推薦列表
  const similarProposals = React.useMemo(() => {
    if (!questions || questions.length === 0) return [];

    const isCurrentGame = isGameQuestion(currentQuestion);
    const currentTertiary = getEffectiveTertiaryCategory(currentQuestion);
    const currentTags = Array.isArray(currentQuestion.tags) ? currentQuestion.tags : [];
    const currentCat = currentQuestion.category;
    const currentSub = currentQuestion.subcategory;

    const scored = questions
      .filter((q) => q.id !== currentQuestion.id && q.status !== 'delisted')
      .map((q) => {
        let score = 0;
        const qIsGame = isGameQuestion(q);
        const qTertiary = getEffectiveTertiaryCategory(q);
        const qTags = Array.isArray(q.tags) ? q.tags : [];

        // 1. 同為遊戲且第三級細分類一致
        if (isCurrentGame && qIsGame) {
          score += 15;
          if (qTertiary && currentTertiary && qTertiary === currentTertiary) {
            score += 25;
          }
        } else if (!isCurrentGame && !qIsGame) {
          // 非遊戲之軟體/提案：第三級細分類匹配
          if (qTertiary && currentTertiary && qTertiary === currentTertiary) {
            score += 20;
          }
        }

        // 2. 次領域 / 子分類一致
        if (q.subcategory && currentSub && q.subcategory === currentSub) {
          score += 12;
        }

        // 3. 主分類一致
        if (q.category && currentCat && q.category === currentCat) {
          score += 8;
        }

        // 4. 發布類型一致 (作品推薦作品、提案推薦提案)
        if (q.postType && currentQuestion.postType && q.postType === currentQuestion.postType) {
          score += 6;
        }

        // 5. 標籤重疊度
        for (const t of qTags) {
          if (currentTags.includes(t)) {
            score += 4;
          }
        }

        // 6. 點擊/熱度權重加乘
        score += Math.min((q.likes || 0) * 0.5, 10);
        score += Math.min((q.supportPoints || 0) * 0.01, 10);

        return { question: q, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // 取前 10 個推薦項目；若不足則適度補齊同專區或活躍提案
    const topItems = scored.slice(0, 10).map((s) => s.question);
    if (topItems.length < 5) {
      const existingIds = new Set([currentQuestion.id, ...topItems.map((q) => q.id)]);
      const fallbacks = questions.filter((q) => !existingIds.has(q.id) && q.status !== 'delisted').slice(0, 5 - topItems.length);
      topItems.push(...fallbacks);
    }

    return topItems;
  }, [questions, currentQuestion]);

  if (similarProposals.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'left' ? -320 : 320;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-white border border-indigo-100/90 shadow-2xs space-y-3.5 ${className}`}>
      {/* 標題與左右滑動切換鍵 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-stone-900 tracking-tight flex items-center gap-1.5">
              <span>類似推薦</span>
              <span className="text-[11px] font-normal text-indigo-700 bg-indigo-100/70 border border-indigo-200/60 px-2 py-0.2 rounded-full hidden sm:inline-block">
                可向右滑動探索更多
              </span>
            </h3>
            <p className="text-[11px] text-stone-500 truncate">
              根據「{currentQuestion.appName || currentQuestion.title}」所屬領域與特徵為您推薦
            </p>
          </div>
        </div>

        {/* 左右滑動按鈕 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-8 h-8 rounded-xl bg-white border border-stone-200 hover:border-indigo-300 hover:bg-indigo-50 text-stone-600 hover:text-indigo-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer active:scale-95"
            title="向左滑動"
            aria-label="向左滑動"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-8 h-8 rounded-xl bg-white border border-stone-200 hover:border-indigo-300 hover:bg-indigo-50 text-stone-600 hover:text-indigo-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer active:scale-95"
            title="向右滑動"
            aria-label="向右滑動"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 橫向滑動卡片列 (支援觸控右滑 / 滾輪橫向滾動) */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory scroll-smooth -mx-1 px-1"
      >
        {similarProposals.map((item) => {
          const isItemGame = isGameQuestion(item);
          const itemTertiary = getEffectiveTertiaryCategory(item);
          const coverImg =
            item.coverImage ||
            item.cardDisplayImage ||
            item.vibeCodingData?.coverImageUrl ||
            getUniqueProposalCoverImage({ id: item.id, title: item.title });
          const authorName = resolveUserDisplayName(item.authorId, item.authorName, availableUsers);

          const handleCardClick = () => {
            onSelectQuestion(item);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (typeof document !== 'undefined') {
              const scrollContainers = document.querySelectorAll('.overflow-y-auto');
              scrollContainers.forEach((el) => {
                el.scrollTo({ top: 0, behavior: 'smooth' });
                el.scrollTop = 0;
              });
            }
          };

          return (
            <div
              key={item.id}
              onClick={handleCardClick}
              className="w-[240px] sm:w-[270px] shrink-0 snap-start bg-white rounded-2xl border border-stone-200 hover:border-indigo-400 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden cursor-pointer group"
            >
              {/* 封面圖片與浮動分類徽章 */}
              <div className="relative aspect-video w-full bg-stone-100 overflow-hidden">
                <img
                  src={coverImg}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = getUniqueProposalCoverImage({ id: item.id, title: item.title }, 2);
                  }}
                />
                <div className="absolute top-2 left-2 flex items-center gap-1 z-10 max-w-[90%]">
                  {isItemGame ? (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-stone-950/85 backdrop-blur-xs text-white border border-purple-400/80 shadow-xs flex items-center gap-1">
                      <span className="text-purple-300">🎮 遊戲</span>
                      <span className="text-stone-400">›</span>
                      <span className="text-amber-300 font-bold">{itemTertiary}</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-xs text-white border border-stone-700/80 shadow-xs truncate">
                      {item.subcategory || item.category || '作品'}
                    </span>
                  )}
                </div>
              </div>

              {/* 卡片文字內容 */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-black text-stone-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {item.appName ? (
                      <>
                        <span className="text-indigo-600 mr-1">【{item.appName}】</span>
                        <span>{item.title}</span>
                      </>
                    ) : (
                      item.title
                    )}
                  </h4>
                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {item.description || '點擊查看此提案完整內容與展示'}
                  </p>
                </div>

                {/* 底部數據與作者 */}
                <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 font-bold">
                  <span className="truncate max-w-[110px] text-stone-600">
                    {authorName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {(item.supportPoints || 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-indigo-700 font-mono">
                        <Coins className="w-3 h-3 text-indigo-500" />
                        <span>{item.supportPoints}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 text-rose-600 font-mono">
                      <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                      <span>{item.likes || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

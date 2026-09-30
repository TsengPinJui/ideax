import React from 'react';
import { useApp } from '../context/AppContext';
import { Question } from '../types';
import { LEVEL_CONFIGS } from '../data/mockData';
import { Sparkles, MessageSquare, Eye, Clock, Award, CheckCircle2, MessageCircle, Bookmark } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  onClick: () => void;
  solutionsCount?: number;
  discussionsCount?: number;
  onSelectCategory?: (category: import('../types').Category, subcategory?: string | '全部') => void;
  onSearchTag?: (tag: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onClick,
  solutionsCount,
  discussionsCount,
  onSelectCategory,
  onSearchTag,
}) => {
  const { isQuestionBookmarked, toggleBookmarkQuestion, setSearchQuery, isNoPaymentMode } = useApp();
  const isBookmarked = isQuestionBookmarked(question.id);

  const effectiveLevel = isNoPaymentMode ? 'L0' : (question?.level || 'L2');
  const levelConfig = (effectiveLevel && LEVEL_CONFIGS[effectiveLevel]) || LEVEL_CONFIGS.L0;
  const isSolved = question.status === 'solved';
  const isPromoted = question.status === 'open' && question.isFeatured;

  const handleCategoryClick = (e: React.MouseEvent) => {
    if (onSelectCategory) {
      e.stopPropagation();
      onSelectCategory(question.category, '全部');
    }
  };

  const handleSubcategoryClick = (e: React.MouseEvent) => {
    if (onSelectCategory && question.subcategory) {
      e.stopPropagation();
      onSelectCategory(question.category, question.subcategory);
    }
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmarkQuestion(question.id);
  };

  return (
    <article
      onClick={onClick}
      className={`group bg-white rounded-2xl border p-5 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between relative ${
        isPromoted
          ? 'border-purple-300 ring-1 ring-purple-300/40 bg-gradient-to-b from-purple-50/15 via-white to-white'
          : 'border-stone-200 hover:border-amber-400'
      }`}
    >
      <div>
        {/* Top Header: Category, Level & Bounty */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Promoted badge: 以尊貴紫色為主體的「招募中」高質感提示標籤 */}
            {isPromoted && (
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 text-white border border-purple-400/60 shadow-sm shadow-purple-950/25 flex items-center gap-1.5 tracking-wider" title="置頂推播 · 積極招募最佳解答中">
                <Sparkles className="w-3.5 h-3.5 text-purple-200 fill-purple-300 drop-shadow-xs animate-pulse" />
                <span className="font-extrabold tracking-wide text-white">招募中</span>
              </span>
            )}

            {/* Category tag */}
            <button
              type="button"
              onClick={handleCategoryClick}
              className="text-xs font-bold text-stone-800 bg-amber-50/80 hover:bg-amber-100 hover:text-amber-950 px-2.5 py-0.5 rounded-lg border border-amber-200/90 shadow-2xs transition-colors cursor-pointer"
              title={`前往「${question.category}」主分類版面`}
            >
              {question.category}
            </button>

            {/* Subcategory tag */}
            {question.subcategory && (
              <button
                type="button"
                onClick={handleSubcategoryClick}
                className="text-xs font-bold text-amber-900 bg-white hover:bg-amber-500 hover:text-stone-950 px-2 py-0.5 rounded-lg border border-amber-300 shadow-2xs transition-colors cursor-pointer flex items-center gap-0.5"
                title={`進入「${question.subcategory}」子領域看板`}
              >
                <span>{question.subcategory}</span>
              </button>
            )}

            {/* Level badge */}
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${levelConfig.badgeClass}`}
            >
              {question.level} · {levelConfig.name}
            </span>

            {isSolved && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 已採納方案
              </span>
            )}
          </div>

          {/* Bounty Tag & Bookmark Button */}
          <div className="shrink-0 flex items-center gap-1.5">
            {isNoPaymentMode ? (
              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                免費交流
              </span>
            ) : question.bounty > 0 ? (
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-2xs">
                <span className="text-xs text-amber-700 font-medium">懸賞</span>
                <span className="text-sm font-black font-mono">
                  NT$ {question.bounty.toLocaleString()}
                </span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                無賞金問題
              </span>
            )}

            {/* Bookmark button */}
            <button
              type="button"
              onClick={handleBookmarkClick}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-2xs'
                  : 'bg-white/80 hover:bg-stone-100 border-stone-200 text-stone-400 hover:text-stone-700'
              }`}
              title={isBookmarked ? '取消收藏問題' : '收藏此問題'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500 text-amber-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2">
          {question.title}
        </h3>

        {/* Description snippet */}
        <p className="mt-2 text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed font-normal">
          {question.description}
        </p>

        {/* AI Structured analysis chip */}
        {question.aiAnalysis && (
          <div className="mt-3 py-1.5 px-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center gap-2 text-xs text-stone-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate font-medium text-[11px] sm:text-xs">
              AI 診斷：{question.aiAnalysis.structuredNeed[0] || question.aiAnalysis.summary}
            </span>
          </div>
        )}

        {/* Tags */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {question.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onSearchTag) {
                  onSearchTag(tag);
                } else {
                  setSearchQuery(tag);
                }
              }}
              className="text-[11px] font-medium text-stone-600 bg-stone-100/90 hover:bg-amber-100 hover:text-amber-950 hover:border-amber-300 px-2 py-0.5 rounded-md border border-stone-200/90 transition-all cursor-pointer shadow-2xs"
              title={`點擊搜尋「#${tag}」相關問題`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Info: Author, Stats */}
      <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <img
            src={question.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={question.authorName}
            className="w-5 h-5 rounded-full object-cover ring-1 ring-stone-200"
          />
          <span className="font-medium text-stone-700 truncate max-w-[150px] sm:max-w-[200px]" title={`${question.authorName}${question.authorTitle ? ` · ${question.authorTitle}` : ''}`}>
            {question.authorName}
            {question.authorTitle ? ` · ${question.authorTitle}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1" title="瀏覽次數">
            <Eye className="w-3.5 h-3.5 text-stone-400" />
            <span>{(question.views || 0).toLocaleString()}</span>
          </span>

          <span className="flex items-center gap-1 font-bold text-amber-600" title="方案解答數">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
            <span>{solutionsCount ?? question.answersCount} 方案</span>
          </span>

          {discussionsCount !== undefined && discussionsCount > 0 && (
            <span className="flex items-center gap-1 text-stone-500 font-medium" title="討論留言數">
              <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
              <span>{discussionsCount} 討論</span>
            </span>
          )}

          <span className="hidden sm:flex items-center gap-1 text-stone-400" title="截止日期">
            <Clock className="w-3.5 h-3.5" />
            <span>至 {question.deadline}</span>
          </span>
        </div>
      </div>
    </article>
  );
};

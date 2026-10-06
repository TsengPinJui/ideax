import React from 'react';
import { useApp } from '../context/AppContext';
import { Question, MarketViewMode } from '../types';
import { LEVEL_CONFIGS } from '../data/mockData';
import { resolveUserDisplayName, resolveUserAvatar } from '../utils/userDisplay';
import { isPainPointQuestion } from '../utils/questionUtils';
import { Sparkles, MessageSquare, Eye, Clock, Award, CheckCircle2, MessageCircle, Bookmark } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  onClick: () => void;
  solutionsCount?: number;
  discussionsCount?: number;
  onSelectCategory?: (category: import('../types').Category, subcategory?: string | '全部') => void;
  onSearchTag?: (tag: string) => void;
  viewMode?: MarketViewMode;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onClick,
  solutionsCount,
  discussionsCount,
  onSelectCategory,
  onSearchTag,
  viewMode = 'large',
}) => {
  const { isQuestionBookmarked, toggleBookmarkQuestion, setSearchQuery, isNoPaymentMode, availableUsers } = useApp();
  const isBookmarked = isQuestionBookmarked(question.id);

  const effectiveLevel = isNoPaymentMode ? 'L0' : (question?.level || 'L2');
  const levelConfig = (effectiveLevel && LEVEL_CONFIGS[effectiveLevel]) || LEVEL_CONFIGS.L0;
  const isSolved = question.status === 'solved';
  const isPromoted = question.status === 'open' && question.isFeatured;
  const isPainPoint = isPainPointQuestion(question);

  const authorDisplayName = resolveUserDisplayName(question.authorId, question.authorName, availableUsers);
  const authorDisplayAvatar = resolveUserAvatar(question.authorId, question.authorAvatar, availableUsers);

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

  // =========================================================================
  // 3. 方格式 (Grid Mode - 雙欄緊湊卡片)
  // 字更小、顯示的字更少、只顯示題目名稱、$+數字、子領域、1~3個標籤、提問者頭像，招募中就用紫框不貼標籤
  // =========================================================================
  if (viewMode === 'grid') {
    return (
      <article
        onClick={onClick}
        className={`group bg-white rounded-xl border p-2.5 sm:p-3 transition-all duration-200 hover:shadow-xs cursor-pointer flex flex-col justify-between relative h-full ${
          isPromoted
            ? 'border-purple-400 ring-1 ring-purple-300/60 bg-gradient-to-b from-purple-50/20 via-white to-white'
            : isSolved
            ? 'border-emerald-200/90 bg-emerald-50/10 hover:border-emerald-400'
            : 'border-stone-200 hover:border-amber-400'
        }`}
      >
        <div className="space-y-1.5">
          {/* Top Line: 子領域 + $+數字 (招募中不貼標籤，純以紫框突顯) */}
          <div className="flex items-center justify-between gap-1.5">
            <span
              onClick={handleSubcategoryClick}
              className="text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 truncate max-w-[90px] select-none hover:bg-amber-100"
              title={question.subcategory || question.category}
            >
              {question.subcategory || question.category}
            </span>

            {/* $+數字 (痛點提問懸賞匡用紅色框起來) */}
            <div className="shrink-0 font-mono text-right">
              {isNoPaymentMode ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  免費
                </span>
              ) : isPainPoint ? (
                <span
                  className="text-xs sm:text-[13px] font-black font-mono px-1.5 py-0.5 rounded-md border-2 border-rose-500 bg-rose-50 text-rose-600 shadow-2xs ring-1 ring-rose-400/25 inline-block"
                  title="痛點提問懸賞"
                >
                  {question.bounty > 0 ? `$${question.bounty.toLocaleString()}` : '$0痛點'}
                </span>
              ) : question.bounty > 0 ? (
                <span className="text-xs sm:text-[13px] font-black text-amber-600 font-mono">
                  ${question.bounty.toLocaleString()}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                  L0 討論
                </span>
              )}
            </div>
          </div>

          {/* 題目名稱 */}
          <h3 className="text-xs sm:text-[13px] font-bold text-stone-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2">
            {question.title}
          </h3>

          {/* 1~3 個標籤 (方格模式不綁定點擊搜尋，避免手機滑動誤觸) */}
          {question.tags && question.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {question.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className={`text-[9.5px] font-medium px-1.5 py-0.2 rounded border truncate max-w-[80px] select-none pointer-events-none ${
                    isPainPoint
                      ? 'text-rose-600 bg-rose-50 border-rose-200/80'
                      : 'text-stone-600 bg-stone-100 border-stone-200/70'
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Line: 提問者頭像 + 方案/採納狀態 */}
        <div className="mt-2.5 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500">
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <img
              src={authorDisplayAvatar}
              alt={authorDisplayName}
              className="w-4 h-4 rounded-full object-cover ring-1 ring-stone-200 shrink-0"
            />
            <span className="font-medium text-stone-600 truncate max-w-[65px] sm:max-w-[90px]">
              {authorDisplayName}
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-1">
            {isSolved ? (
              <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>已採納</span>
              </span>
            ) : (
              <span className="font-bold font-mono text-amber-700">
                {solutionsCount ?? question.answersCount} 方案
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  // =========================================================================
  // 2. 條列式 (List Mode - 拿掉題目說明、題目分級標籤、收藏鍵、AI診斷和建議)
  // =========================================================================
  if (viewMode === 'list') {
    return (
      <article
        onClick={onClick}
        className={`group bg-white rounded-xl border p-3 sm:p-4 transition-all duration-200 hover:shadow-xs cursor-pointer flex flex-col justify-between relative ${
          isPromoted
            ? 'border-purple-300 ring-1 ring-purple-300/40 bg-gradient-to-r from-purple-50/15 via-white to-white'
            : isSolved
            ? 'border-emerald-200 bg-emerald-50/10 hover:border-emerald-400'
            : 'border-stone-200 hover:border-amber-400'
        }`}
      >
        <div>
          {/* Top Line: 分類、招募中標籤、已採納 與 懸賞金 (拿掉分級標籤、拿掉收藏鍵) */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isPromoted && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 text-white border border-purple-400/60 shadow-2xs flex items-center gap-1 tracking-wider">
                  <Sparkles className="w-3 h-3 text-purple-200 fill-purple-300 animate-pulse" />
                  <span>招募中</span>
                </span>
              )}

              {/* Category tag */}
              <button
                type="button"
                onClick={handleCategoryClick}
                className="text-[11px] font-bold text-stone-800 bg-amber-50/80 hover:bg-amber-100 hover:text-amber-950 px-2 py-0.5 rounded-md border border-amber-200/90 shadow-2xs transition-colors cursor-pointer"
                title={`前往「${question.category}」主分類版面`}
              >
                {question.category}
              </button>

              {/* Subcategory tag */}
              {question.subcategory && (
                <button
                  type="button"
                  onClick={handleSubcategoryClick}
                  className="text-[11px] font-bold text-amber-900 bg-white hover:bg-amber-500 hover:text-stone-950 px-2 py-0.5 rounded-md border border-amber-300 shadow-2xs transition-colors cursor-pointer flex items-center gap-0.5"
                  title={`進入「${question.subcategory}」子領域看板`}
                >
                  <span>{question.subcategory}</span>
                </button>
              )}

              {isSolved && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 已採納方案
                </span>
              )}
            </div>

            {/* Bounty Tag (痛點提問懸賞匡用紅色框起來) */}
            <div className="shrink-0">
              {isNoPaymentMode ? (
                <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-300 shadow-2xs">
                  免費交流
                </span>
              ) : isPainPoint ? (
                <div
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50/90 border-2 border-rose-500 text-rose-950 shadow-2xs ring-1 ring-rose-400/25"
                  title="痛點提問懸賞"
                >
                  <span className="text-[11px] text-rose-600 font-bold">
                    {question.bounty > 0 ? '痛點懸賞' : '痛點'}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-rose-600">
                    {question.bounty > 0 ? `NT$ ${question.bounty.toLocaleString()}` : '$0 免費'}
                  </span>
                </div>
              ) : question.bounty > 0 ? (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 shadow-2xs">
                  <span className="text-[11px] text-amber-700 font-medium">懸賞</span>
                  <span className="text-xs sm:text-sm font-black font-mono">
                    NT$ {question.bounty.toLocaleString()}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                  L0 閒聊討論
                </span>
              )}
            </div>
          </div>

          {/* 題目名稱 (拿掉題目說明、拿掉AI診斷和建議) */}
          <h3 className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2">
            {question.title}
          </h3>

          {/* Tags (條列式模式不綁定點擊搜尋，避免手機滑動誤觸) */}
          {question.tags && question.tags.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {question.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[10.5px] font-medium px-2 py-0.2 rounded border select-none pointer-events-none ${
                    isPainPoint
                      ? 'text-rose-600 bg-rose-50 border-rose-200/80 font-semibold'
                      : 'text-stone-600 bg-stone-100 border-stone-200'
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info: Author, Stats */}
        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <img
              src={authorDisplayAvatar}
              alt={authorDisplayName}
              className="w-4.5 h-4.5 rounded-full object-cover ring-1 ring-stone-200"
            />
            <span className="font-medium text-stone-700 truncate max-w-[140px] sm:max-w-[200px]">
              {authorDisplayName}
            </span>
          </div>

          <div className="flex items-center gap-3 font-medium text-[11px] sm:text-xs">
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
          </div>
        </div>
      </article>
    );
  }

  // =========================================================================
  // 1. 大視窗 (Large Mode - 完整詳細資訊)
  // =========================================================================
  return (
    <article
      onClick={onClick}
      className={`group bg-white rounded-2xl border p-3.5 sm:p-5 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between relative ${
        isPromoted
          ? 'border-purple-300 ring-1 ring-purple-300/40 bg-gradient-to-b from-purple-50/15 via-white to-white'
          : 'border-stone-200 hover:border-amber-400'
      }`}
    >
      <div>
        {/* Top Header: Category, Level & Bounty */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                isPainPoint
                  ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs font-extrabold'
                  : levelConfig.badgeClass
              }`}
            >
              {isPainPoint
                ? '痛點/創點子'
                : `${question.level} · ${levelConfig.name}`}
            </span>

            {isSolved && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 已採納方案
              </span>
            )}
          </div>

          {/* Bounty Tag & Bookmark Button (痛點提問懸賞匡用紅色框起來) */}
          <div className="shrink-0 flex items-center gap-1.5">
            {isNoPaymentMode ? (
              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                免費交流
              </span>
            ) : isPainPoint ? (
              <div
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-50/90 border-2 border-rose-500 text-rose-950 shadow-xs ring-1 ring-rose-400/25"
                title="痛點提問懸賞"
              >
                <span className="text-xs text-rose-600 font-bold">
                  {question.bounty > 0 ? '痛點懸賞' : '痛點'}
                </span>
                <span className="text-sm font-black font-mono text-rose-600">
                  {question.bounty > 0 ? `NT$ ${question.bounty.toLocaleString()}` : '$0 免費'}
                </span>
              </div>
            ) : question.bounty > 0 ? (
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-2xs">
                <span className="text-xs text-amber-700 font-medium">懸賞</span>
                <span className="text-sm font-black font-mono">
                  NT$ {question.bounty.toLocaleString()}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                L0 閒聊討論
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
              className={`text-[11px] font-medium px-2 py-0.5 rounded-md border transition-all cursor-pointer shadow-2xs ${
                isPainPoint
                  ? 'text-rose-600 bg-rose-50/90 hover:bg-rose-100 hover:text-rose-950 hover:border-rose-300 border-rose-200/90 font-semibold'
                  : 'text-stone-600 bg-stone-100/90 hover:bg-amber-100 hover:text-amber-950 hover:border-amber-300 border-stone-200/90'
              }`}
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
            src={authorDisplayAvatar}
            alt={authorDisplayName}
            className="w-5 h-5 rounded-full object-cover ring-1 ring-stone-200"
          />
          <span className="font-medium text-stone-700 truncate max-w-[150px] sm:max-w-[200px]" title={`${authorDisplayName}${authorDisplayName !== '此帳號已註銷' && question.authorTitle ? ` · ${question.authorTitle}` : ''}`}>
            {authorDisplayName}
            {authorDisplayName !== '此帳號已註銷' && question.authorTitle ? ` · ${question.authorTitle}` : ''}
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


import React from 'react';
import { useApp } from '../context/AppContext';
import { Question, MarketViewMode } from '../types';
import { LEVEL_CONFIGS } from '../data/mockData';
import { resolveUserDisplayName, resolveUserAvatar, getUserNameColorClass } from '../utils/userDisplay';
import { isPainPointQuestion, isL0DiscussionQuestion } from '../utils/questionUtils';
import { Sparkles, MessageSquare, Eye, Clock, Award, CheckCircle2, MessageCircle, Bookmark, Share2, Check, Hand, ThumbsUp, Coins } from 'lucide-react';
import { getQuestionShareUrl } from '../services/seoService';
import { shareOrCopyUrl } from '../utils/shareUtils';

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
  const {
    isQuestionBookmarked,
    toggleBookmarkQuestion,
    setSearchQuery,
    isNoPaymentMode,
    availableUsers,
    toggleSecondQuestion,
    isQuestionSeconded,
    getQuestionSecondCount,
    toggleSameQuestion,
    isSameQuestionActive,
    getQuestionSameCount,
    toggleLikeQuestion,
    isQuestionLiked,
    getQuestionLikesCount,
    addNotification,
  } = useApp();
  const isBookmarked = isQuestionBookmarked(question.id);
  const [isShareCopied, setIsShareCopied] = React.useState(false);

  const isSeconded = isQuestionSeconded(question.id);
  const secondCount = getQuestionSecondCount(question.id);
  const isSame = isSameQuestionActive(question.id);
  const sameCount = getQuestionSameCount(question.id);
  const isLiked = isQuestionLiked(question.id);
  const likesCount = getQuestionLikesCount(question.id);

  const handleSecondClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = toggleSecondQuestion(question.id);
    if (res.isSeconded) {
      addNotification(`已為痛點「${question.title}」附議 +1！`, 'success');
    }
  };

  const handleSameQuestionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = toggleSameQuestion(question.id);
    if (res.isSameQuestion) {
      addNotification(`已加入同問！有更多人關注此提問「${question.title}」`, 'success');
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = toggleLikeQuestion(question.id);
    if (res.isLiked) {
      addNotification(`已為討論「${question.title}」按讚！`, 'success');
    }
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getQuestionShareUrl(question.id, question.postType);
    const label = question.postType === 'pain_point' ? '痛點洞察' : '懸賞問題';
    const shareText = `【IdeaX 創點子 • ${label}】${question.title}\n${(question.bounty || 0) > 0 ? `懸賞 NT$ ${(question.bounty || 0).toLocaleString()} 元` : '議題探討'}`;

    const res = await shareOrCopyUrl({
      title: question.title,
      text: shareText,
      url: shareUrl,
    });

    if (res === 'copied') {
      setIsShareCopied(true);
      setTimeout(() => setIsShareCopied(false), 2000);
    }
  };

  const effectiveLevel = isNoPaymentMode ? 'L0' : (question?.level || 'L2');
  const levelConfig = (effectiveLevel && LEVEL_CONFIGS[effectiveLevel]) || LEVEL_CONFIGS.L0;
  const isSolved = question.status === 'solved';
  const isPromoted = question.status === 'open' && question.isFeatured;
  const isPainPoint = isPainPointQuestion(question);
  const isL0Discussion = isL0DiscussionQuestion(question);

  const authorDisplayName = resolveUserDisplayName(question.authorId, question.authorName, availableUsers);
  const authorDisplayAvatar = resolveUserAvatar(question.authorId, question.authorAvatar, availableUsers);
  const authorColorClass = getUserNameColorClass(question.authorId, availableUsers, {
    isOfficial: question.isOfficial,
    name: question.authorName,
    title: question.authorTitle,
  });

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
          {/* Top Line: 子領域 (左) + 綠色「創星季」與 $+數字懸賞 (右上) */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <span
                onClick={handleSubcategoryClick}
                className="text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 truncate max-w-[85px] select-none hover:bg-amber-100"
                title={question.subcategory || question.category}
              >
                {question.subcategory || question.category}
              </span>
            </div>

            {/* 右上角：綠色創星季標籤 + $+數字懸賞 */}
            <div className="shrink-0 font-mono text-right flex items-center gap-1.5">
              {(question.isStarSeason || question.tags?.includes('創星季')) && (
                <span className="bg-emerald-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full shadow-2xs shrink-0 flex items-center gap-0.5" title="創星季參賽題目（擁有獨立網址）">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>創星季</span>
                </span>
              )}
              {isNoPaymentMode ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  免費
                </span>
              ) : isPainPoint ? (
                <span
                  className="text-xs sm:text-[13px] font-black font-mono px-2 py-0.5 rounded-lg border border-rose-300 bg-rose-50/80 text-rose-600 shadow-2xs inline-block"
                  title={question.bounty > 0 ? '痛點提問懸賞' : '痛點'}
                >
                  {question.bounty > 0 ? `$${question.bounty.toLocaleString()}` : '痛點'}
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
                  className="text-[9.5px] font-medium px-1.5 py-0.2 rounded border truncate max-w-[80px] select-none pointer-events-none text-stone-600 bg-stone-100 border-stone-200/70"
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
            <span className={`font-medium truncate max-w-[65px] sm:max-w-[90px] ${authorColorClass}`}>
              {authorDisplayName}
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            {isPainPoint ? (
              <button
                type="button"
                onClick={handleSecondClick}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isSeconded
                    ? 'bg-rose-600 text-white border border-rose-600 shadow-2xs font-black'
                    : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
                }`}
                title="附議此痛點 (+1 共鳴支持)"
              >
                <span className={`font-mono font-black px-1 rounded text-[9px] leading-tight ${isSeconded ? 'bg-white text-rose-800' : 'bg-white text-rose-700 border border-rose-300'}`}>+1</span>
                <span className="font-mono text-[9.5px]">{secondCount || 0}</span>
              </button>
            ) : isL0Discussion ? (
              <button
                type="button"
                onClick={handleLikeClick}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-blue-600 text-white border border-blue-600 shadow-2xs font-black'
                    : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                }`}
                title="為此討論按讚"
              >
                <ThumbsUp className={`w-3 h-3 ${isLiked ? 'fill-white text-white' : 'text-blue-600'}`} />
                <span className="font-mono text-[9.5px]">{likesCount || 0}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSameQuestionClick}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isSame
                    ? 'bg-amber-500 text-stone-950 border border-amber-500 shadow-2xs font-black'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                }`}
                title="我也想知道！加入同問"
              >
                <Hand className={`w-3 h-3 ${isSame ? 'fill-stone-950 text-stone-950' : 'text-amber-700'}`} />
                <span className="font-mono text-[9.5px]">{sameCount || 0}</span>
              </button>
            )}

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

              {/* 綠色創星季標籤 */}
              {(question.isStarSeason || question.tags?.includes('創星季')) && (
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-1 shrink-0" title="創星季參賽題目">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>創星季</span>
                </span>
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
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50/80 border border-rose-300 text-rose-950 shadow-2xs"
                  title={question.bounty > 0 ? '痛點提問懸賞' : '痛點'}
                >
                  {question.bounty > 0 ? (
                    <>
                      <span className="text-[11px] text-rose-600 font-bold">痛點懸賞</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-rose-600">
                        NT$ {question.bounty.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm font-black font-mono text-rose-600">
                      痛點
                    </span>
                  )}
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
                  className="text-[10.5px] font-medium px-2 py-0.2 rounded border select-none pointer-events-none text-stone-600 bg-stone-100 border-stone-200"
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
            <span className={`font-medium truncate max-w-[140px] sm:max-w-[200px] ${authorColorClass}`}>
              {authorDisplayName}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 font-medium text-[11px] sm:text-xs">
            {/* 中卡片互動鍵：只顯示圖示與數字 */}
            {isPainPoint ? (
              <button
                type="button"
                onClick={handleSecondClick}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isSeconded
                    ? 'bg-rose-600 text-white border border-rose-600 shadow-2xs font-black'
                    : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
                }`}
                title="附議此痛點 (+1 共鳴支持)"
              >
                <span className={`font-mono font-black border px-1 py-0.2 rounded text-[10px] leading-tight ${isSeconded ? 'bg-white text-rose-800 border-white' : 'bg-white text-rose-700 border-rose-300'}`}>+1</span>
                <span className="font-mono font-bold text-xs">{secondCount || 0}</span>
              </button>
            ) : isL0Discussion ? (
              <button
                type="button"
                onClick={handleLikeClick}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-blue-600 text-white border border-blue-600 shadow-2xs font-black'
                    : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                }`}
                title="為此討論按讚"
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-white text-white' : 'text-blue-600'}`} />
                <span className="font-mono font-bold text-xs">{likesCount || 0}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSameQuestionClick}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isSame
                    ? 'bg-amber-500 text-stone-950 border border-amber-500 shadow-2xs font-black'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                }`}
                title="我也想知道！加入同問"
              >
                <Hand className={`w-3.5 h-3.5 ${isSame ? 'fill-stone-950 text-stone-950' : 'text-amber-700'}`} />
                <span className="font-mono font-bold text-xs">{sameCount || 0}</span>
              </button>
            )}

            {/* 觀看數 */}
            <span className="flex items-center gap-1 text-stone-400" title="瀏覽次數">
              <Eye className="w-3.5 h-3.5" />
              <span>{(question.views || 0).toLocaleString()}</span>
            </span>

            {/* 討論數量（對話框圖示+數字，淡黃色） */}
            <span className="flex items-center gap-1 text-amber-500 font-semibold" title="討論數量">
              <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-amber-500">{discussionsCount ?? 0}</span>
            </span>

            {/* 方案數：不用圖示，就顯示「（數字）方案」 */}
            {isSolved ? (
              <span className="font-bold text-emerald-600" title="已採納方案">
                已採納
              </span>
            ) : (
              <span className="font-bold font-mono text-amber-700" title="方案數量">
                {solutionsCount ?? question.answersCount} 方案
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

            {/* 綠色創星季標籤 */}
            {(question.isStarSeason || question.tags?.includes('創星季')) && (
              <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1 shrink-0" title="創星季參賽題目">
                <Sparkles className="w-3 h-3" />
                <span>創星季</span>
              </span>
            )}

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
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-50/80 border border-rose-300 text-rose-950 shadow-2xs"
                title={question.bounty > 0 ? '痛點提問懸賞' : '痛點'}
              >
                {question.bounty > 0 ? (
                  <>
                    <span className="text-xs text-rose-600 font-bold">痛點懸賞</span>
                    <span className="text-sm font-black font-mono text-rose-600">
                      NT$ {question.bounty.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-xs sm:text-sm font-black font-mono text-rose-600">
                    痛點
                  </span>
                )}
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

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {question.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded-md transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 痛點打賞總額 (雙幣符號 + 數字) */}
          {isPainPoint && (
            <span
              className="flex items-center gap-1.5 text-amber-950 bg-amber-100/90 hover:bg-amber-200/90 px-2.5 py-1 rounded-xl border border-amber-200/80 font-semibold text-xs shadow-2xs"
              title="打賞總額 (雙幣：🪙 點數 / NT$ 現金)"
            >
              <span className="font-bold text-amber-900">
                🪙 {((question.supportPoints || 0) * 10).toLocaleString()} 點 (NT$ {(question.supportPoints || 0).toLocaleString()})
              </span>
            </span>
          )}

          <span className="flex items-center gap-1 text-amber-600 bg-amber-50/90 px-2.5 py-1 rounded-xl border border-amber-200/80 font-semibold text-xs" title="討論留言數">
            <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-amber-600">{discussionsCount ?? 0} 討論</span>
          </span>

          {/* 4. 方案數 */}
          {isSolved ? (
            <span className="font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>已採納</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 font-bold text-amber-600 text-xs" title="方案解答數">
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              <span>{solutionsCount ?? question.answersCount} 方案</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

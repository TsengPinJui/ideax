import React from 'react';
import { useApp } from '../context/AppContext';
import { Question, MarketViewMode, getInnovationProgressStageMeta } from '../types';
import { LEVEL_CONFIGS } from '../data/mockData';
import {
  resolveUserDisplayName,
  resolveUserAvatar,
  getUserNameColorClass,
  isPlatformPublishedWork,
  PLATFORM_CURATED_NAME,
  PLATFORM_CURATED_AVATAR,
} from '../utils/userDisplay';
import { isPainPointQuestion, isL0DiscussionQuestion } from '../utils/questionUtils';
import { Sparkles, MessageSquare, Eye, Clock, Award, CheckCircle2, MessageCircle, Bookmark, Star, Heart, Share2, Check, Hand, ThumbsUp, Coins, Flame } from 'lucide-react';
import { getQuestionShareUrl } from '../services/seoService';
import { shareOrCopyUrl } from '../utils/shareUtils';
import { findReferencedPainPoint, findProposalsReferencingPainPoint } from '../utils/painPointLinking';
import { getUniqueProposalCoverImage } from '../utils/proposalImageUtils';
import { ProposalCardMediaBanner } from './ProposalCardMediaBanner';
import { extractYoutubeVideoId } from '../utils/youtubeUtils';
import { stripAppNameFromTitle } from '../utils/titleFormat';
import { isComingSoonWork, getExperienceScore } from '../utils/experienceRating';

interface QuestionCardProps {
  question: Question;
  onClick?: () => void;
  solutionsCount?: number;
  discussionsCount?: number;
  onSelectCategory?: (category: import('../types').Category, subcategory?: string | '全部') => void;
  onSearchTag?: (tag: string) => void;
  viewMode?: MarketViewMode;
}

export function getFormattedAppNameAndTitle(question: Question): { appName: string; cleanTitle: string } {
  const isVibe =
    question.category === '網站程式' ||
    question.postType === 'vibecoding_app' ||
    question.specialZone === 'vibecoding' ||
    Boolean(question.appName || question.vibeCodingData?.appName);

  let rawAppName = (question.appName || question.vibeCodingData?.appName || '').trim();
  let rawTitle = (question.title || '').trim();

  if (rawAppName.includes(' — ')) {
    rawAppName = rawAppName.split(' — ')[0].trim();
  }

  const clean = stripAppNameFromTitle(rawTitle, rawAppName);
  return { appName: rawAppName, cleanTitle: clean || rawTitle };
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
    questions,
    answers,
    setSelectedQuestion,
  } = useApp();
  const isBookmarked = isQuestionBookmarked(question.id);
  const [isShareCopied, setIsShareCopied] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

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
      const targetType = isPainPoint ? '痛點' : '問題';
      addNotification(`🔥 已對${targetType}「${question.title}」+1 附議，並收錄至「我的附議」！`, 'success');
    }
  };

  const handleSameQuestionClick = (e: React.MouseEvent) => {
    handleSecondClick(e);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = toggleLikeQuestion(question.id);
    if (res.isLiked) {
      const isProposalOrSoftware = isVibeCoding || isInnovationProposal;
      addNotification(
        isProposalOrSoftware
          ? `❤️ 已對${isVibeCoding ? '軟體刊登' : '創新提案'}「${question.title}」按 Like，並收錄至「我的 Like」！`
          : `👍 已為 L0 討論「${question.title}」按讚，並收錄至「我的按讚」！`,
        'success'
      );
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
  const isVibeCoding =
    question.category === '網站程式' ||
    question.postType === 'vibecoding_app' ||
    question.specialZone === 'vibecoding';
  const isInnovationProposal = question.postType === 'innovation_proposal';
  const displayCategoryLabel = isVibeCoding ? '軟體網站' : question.category;
  const { appName: displayAppName, cleanTitle: displayCleanTitle } = getFormattedAppNameAndTitle(question);
  const referencedPainPointObj = findReferencedPainPoint(question, questions);
  const referencingProposals = isPainPoint ? findProposalsReferencingPainPoint(question, questions) : [];
  const questionDiscussions = React.useMemo(
    () => answers.filter((a) => a.questionId === question.id && a.type === 'discussion'),
    [answers, question.id]
  );

  const isPlatformWork = isPlatformPublishedWork(question);
  const authorDisplayName = isPlatformWork
    ? PLATFORM_CURATED_NAME
    : resolveUserDisplayName(question.authorId, question.authorName, availableUsers);
  const authorDisplayAvatar = isPlatformWork
    ? PLATFORM_CURATED_AVATAR
    : resolveUserAvatar(question.authorId, question.authorAvatar, availableUsers);
  const authorColorClass = isPlatformWork
    ? 'text-amber-800 font-bold'
    : getUserNameColorClass(question.authorId, availableUsers, {
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
    const isAdded = toggleBookmarkQuestion(question.id);
    addNotification(
      isAdded ? `已為「${question.title}」標記，並收錄至「我的清單」！` : `已取消標記「${question.title}」`,
      isAdded ? 'success' : 'info'
    );
  };

  const effectiveYoutubeUrl = question.youtubeUrl || question.vibeCodingData?.youtubeUrl;
  const effectiveCoverMode = question.coverMode || question.vibeCodingData?.coverMode || 'custom_image';
  const effectiveCardHoverMode = question.cardHoverMode || question.vibeCodingData?.cardHoverMode;
  const hasYoutubeVideo = Boolean(extractYoutubeVideoId(effectiveYoutubeUrl));

  // 無圖片貼文之三階內容遞補：1. 詳述 (description) -> 2. AI 摘要 (aiAnalysis.summary) -> 3. 熱門留言 (topComment)
  const cleanDescription = (question.description || '').trim();
  const aiSummaryText = (
    question.aiAnalysis?.summary ||
    question.aiPreliminaryReport?.problemAnalysis?.coreDiagnosis ||
    ''
  ).trim();
  const topCommentObj = React.useMemo(() => {
    const related = answers.filter(
      (a) => a.questionId === question.id && Boolean((a.freePreview || a.fullContent || '').trim())
    );
    if (related.length === 0) return null;
    return [...related].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
  }, [answers, question.id]);
  const topCommentText = topCommentObj
    ? (topCommentObj.freePreview || topCommentObj.fullContent || '').trim()
    : '';
  const topCommentAuthor = topCommentObj
    ? resolveUserDisplayName(topCommentObj.solverId, topCommentObj.solverName, availableUsers)
    : '';

  const effectiveSolutionsCount = solutionsCount ?? question.answersCount ?? 0;
  const hasSolutions = effectiveSolutionsCount > 0;
  const allowCardImage = question.showCardImage !== false;
  // 封面優先採用作者上傳/設定之 coverImage，避免被自動爬取的舊截圖蓋過
  const effectiveDisplayImage = question.coverImage || question.cardDisplayImage || question.vibeCodingData?.coverImageUrl;
  const effectiveGalleryImages = (question.galleryImages && question.galleryImages.length > 0)
    ? question.galleryImages
    : (question.screenshots && question.screenshots.length > 0)
    ? question.screenshots
    : (question.vibeCodingData?.screenshots && question.vibeCodingData.screenshots.length > 0)
    ? question.vibeCodingData.screenshots
    : (question.cardDisplayImage ? [question.cardDisplayImage] : []);

  // =========================================================================
  // 3. 方格式 (Grid Mode - 雙欄緊湊卡片，適合手機與快速瀏覽)
  // =========================================================================
  if (viewMode === 'grid') {
    const isPainPointPost = isPainPoint || question.postType === 'seek_solution';
    const showGridCover =
      !isPainPointPost &&
      allowCardImage &&
      (isVibeCoding ||
        isInnovationProposal ||
        hasYoutubeVideo ||
        Boolean(question.cardDisplayImage) ||
        Boolean(question.coverImage) ||
        Boolean(question.galleryImages && question.galleryImages.length > 0) ||
        Boolean(question.screenshots && question.screenshots.length > 0));

    const gridFallbackImg = getUniqueProposalCoverImage({
      id: question.id,
      title: question.title,
      track: question.subcategory,
    });

    return (
      <article
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group bg-white rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between relative h-full overflow-hidden ${
          showGridCover ? 'p-0' : 'p-3 sm:p-3.5'
        } ${
          isPromoted
            ? 'border-purple-300/90 bg-gradient-to-b from-purple-50/15 via-white to-white'
            : isSolved
            ? 'border-emerald-200/80 bg-emerald-50/5 hover:border-emerald-300'
            : 'border-stone-200/80 hover:border-stone-300'
        }`}
      >
        {showGridCover && (
          <ProposalCardMediaBanner
            youtubeUrl={effectiveYoutubeUrl}
            coverMode={effectiveCoverMode}
            cardHoverMode={effectiveCardHoverMode}
            coverImage={effectiveDisplayImage}
            galleryImages={effectiveGalleryImages}
            fallbackImage={gridFallbackImg}
            onFallbackErrorImage={getUniqueProposalCoverImage({ id: question.id, title: question.title }, 2)}
            title={question.title}
            isHovered={isHovered}
            heightClass="aspect-video"
          >
            <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap pointer-events-none z-10 max-w-[85%]">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-md text-white border border-stone-700/80 shadow-xs">
                {displayCategoryLabel}
              </span>
              {isVibeCoding && isComingSoonWork(question) && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-950 border border-amber-300 shadow-xs">
                  ⏳ 即將開放
                </span>
              )}
              {isVibeCoding && getExperienceScore(question).totalRatings > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-600/90 text-white shadow-xs">
                  👍 {getExperienceScore(question).score}分
                </span>
              )}
            </div>

            <div className="absolute bottom-2 right-2 flex items-center gap-1 z-20">
              <button
                type="button"
                onClick={handleBookmarkClick}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all shadow-md cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-400 text-stone-950 scale-105'
                    : 'bg-white/95 backdrop-blur-md text-stone-700 hover:bg-white'
                }`}
                title={isBookmarked ? '⭐ 已收藏' : '⭐ 收藏'}
              >
                <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-stone-950 text-stone-950' : 'text-amber-500'}`} />
              </button>
              <button
                type="button"
                onClick={handleLikeClick}
                className={`h-7 px-2 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all shadow-md cursor-pointer ${
                  isLiked || isSeconded
                    ? 'bg-rose-500 text-white scale-105'
                    : 'bg-white/95 backdrop-blur-md text-rose-600 hover:bg-white'
                }`}
                title="❤️ Like"
              >
                <Heart className={`w-3 h-3 ${isLiked || isSeconded ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                <span className="font-mono">{Math.max(likesCount || 0, secondCount || 0)}</span>
              </button>
            </div>
          </ProposalCardMediaBanner>
        )}
        <div className={`space-y-1.5 flex-1 flex flex-col ${showGridCover ? 'p-3 pb-0' : ''}`}>
          {/* Top Line: 子領域 + 懸賞金 */}
          <div className="flex items-center justify-between gap-1.5">
            <span
              onClick={handleSubcategoryClick}
              className="text-[10px] font-bold text-stone-500 hover:text-stone-900 truncate max-w-[125px] select-none transition-colors"
              title={
                question.subcategories && question.subcategories.length > 0
                  ? question.subcategories.join(' · ')
                  : question.subcategory || question.category
              }
            >
              {question.subcategories && question.subcategories.length > 0
                ? question.subcategories.slice(0, 3).join(' · ')
                : question.subcategory || question.category}
            </span>

            <div className="shrink-0 font-mono text-right flex items-center gap-1">

              {(question.isStarSeason || question.tags?.includes('創星季')) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="創星季參賽題目" />
              )}
              {isVibeCoding ? (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded shadow-2xs">
                  軟體作品
                </span>
              ) : isInnovationProposal ? (
                <div className="flex items-center gap-1">
                  {getInnovationProgressStageMeta(question.proposalProgressStage) && (
                    <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded shadow-2xs ${getInnovationProgressStageMeta(question.proposalProgressStage)?.badgeClasses}`}>
                      {getInnovationProgressStageMeta(question.proposalProgressStage)?.shortLabel}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shadow-2xs">
                    創新提案
                  </span>
                </div>
              ) : isNoPaymentMode ? (
                <span className="text-[10px] font-semibold text-stone-500">免費</span>
              ) : isPainPoint ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[11px] font-black font-mono">
                  {question.bounty > 0 ? `${question.bounty.toLocaleString()} 點` : '痛點'}
                </span>
              ) : question.bounty > 0 ? (
                <span className="text-xs font-black text-amber-600 font-mono">
                  ${question.bounty.toLocaleString()}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-sky-700">討論</span>
              )}
            </div>
          </div>

          {/* 題目名稱 */}
          <h3 className="text-xs sm:text-[13px] font-bold text-stone-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2">
            {displayAppName ? (
              <>
                <span className="text-blue-600 font-black">{displayAppName}：</span>
                <span>{displayCleanTitle}</span>
              </>
            ) : (
              question.title
            )}
          </h3>

          {/* 標籤 (極簡無外框文字標籤) */}
          {question.tags && question.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {question.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="text-[10px] font-medium text-stone-400 truncate max-w-[80px] select-none pointer-events-none"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 無圖片卡片之空白處自動遞補顯示：1. 詳述 -> 2. AI 摘要 -> 3. 熱門留言 */}
          {!showGridCover && (cleanDescription || aiSummaryText || topCommentText) && (
            <div className="pt-1.5 flex-1 flex flex-col justify-center space-y-1.5">
              {cleanDescription ? (
                <>
                  <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed line-clamp-3 font-normal">
                    {cleanDescription}
                  </p>
                  {aiSummaryText ? (
                    <div className="px-2 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[10px] text-amber-950 leading-snug line-clamp-2 flex items-start gap-1">
                      <img src="/avatars/agent-baimiao.webp" alt="" aria-hidden="true" className="w-3.5 h-3.5 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-amber-200" />
                      <span>
                        <strong className="font-bold">AI 摘要：</strong>
                        {aiSummaryText}
                      </span>
                    </div>
                  ) : topCommentText ? (
                    <div className="px-2 py-1.5 rounded-lg bg-stone-50 border border-stone-200/70 text-[10px] text-stone-600 leading-snug line-clamp-2 flex items-start gap-1">
                      <MessageCircle className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-bold text-stone-700">{topCommentAuthor || '熱門留言'}：</strong>
                        {topCommentText}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : aiSummaryText ? (
                <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-950 leading-relaxed line-clamp-4 flex items-start gap-1.5">
                  <img src="/avatars/agent-baimiao.webp" alt="" aria-hidden="true" className="w-4 h-4 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-amber-200" />
                  <span>
                    <strong className="font-bold">AI 摘要：</strong>
                    {aiSummaryText}
                  </span>
                </div>
              ) : topCommentText ? (
                <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/80 text-[11px] text-stone-600 leading-relaxed line-clamp-4 flex items-start gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold text-stone-700">熱門留言 · {topCommentAuthor}：</strong>
                    {topCommentText}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Bottom Line: 提問者 + 互動與方案數 */}
        <div className={`mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 ${showGridCover ? 'px-3 pb-3' : ''}`}>
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

          <div className="shrink-0 flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={handleBookmarkClick}
              className={`p-1 sm:p-1.5 rounded-full border transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 text-amber-600 border-amber-300'
                  : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-amber-600'
              }`}
              title={isBookmarked ? '⭐ 已收藏' : '⭐ 收藏'}
            >
              <Star className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>

            {isVibeCoding || isInnovationProposal ? (
              <button
                type="button"
                onClick={handleLikeClick}
                className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-0.5 sm:gap-1 transition-all cursor-pointer border ${
                  isLiked || isSeconded
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                }`}
                title="❤️ Like（創新提案 / 軟體刊登）"
              >
                <Heart className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${isLiked || isSeconded ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                <span className="font-mono text-[9.5px] sm:text-xs">{Math.max(likesCount || 0, secondCount || 0)}</span>
              </button>
            ) : isL0Discussion ? (
              <button
                type="button"
                onClick={handleLikeClick}
                className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-0.5 sm:gap-1 transition-all cursor-pointer border ${
                  isLiked
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                }`}
                title="👍 按讚（L0 討論）"
              >
                <ThumbsUp className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                <span className="font-mono text-[9.5px] sm:text-xs">{likesCount || 0}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSecondClick}
                className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-0.5 sm:gap-1 transition-all cursor-pointer border ${
                  isSeconded
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
                }`}
                title="🔥 +1 附議（問題類型 / 痛點）"
              >
                <span className="font-mono font-black">+1</span>
                <span className="font-mono text-[9.5px] sm:text-xs">{secondCount || 0}</span>
              </button>
            )}

            {isSolved ? (
              <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>已採納</span>
              </span>
            ) : hasSolutions ? (
              <span className="font-bold font-mono text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-md flex items-center shadow-2xs" title="已有落地解決方案">
                <span>{effectiveSolutionsCount} 方案</span>
              </span>
            ) : (
              <span className="font-bold font-mono text-stone-500">
                0 方案
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  // =========================================================================
  // 2. 條列式 (List Mode - 極簡高密度清單)
  // =========================================================================
  if (viewMode === 'list') {
    return (
      <article
        onClick={onClick}
        className={`group bg-white rounded-2xl border p-3 sm:p-4 transition-all duration-200 hover:shadow-sm cursor-pointer flex flex-col justify-between relative ${
          isPromoted
            ? 'border-purple-300/80 bg-gradient-to-r from-purple-50/10 via-white to-white'
            : isSolved
            ? 'border-emerald-200/80 bg-emerald-50/5 hover:border-emerald-300'
            : 'border-stone-200/80 hover:border-stone-300'
        }`}
      >
        <div>
          {/* Top Line: 麵包屑分類 + 右側懸賞金 */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-stone-500">
              {isPromoted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                  <span>招募中</span>
                </span>
              )}


              {(question.isStarSeason || question.tags?.includes('創星季')) && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                  <span>創星季</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleCategoryClick}
                className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              >
                {displayCategoryLabel}
              </button>

              {(question.subcategories && question.subcategories.length > 0) ? (
                <>
                  <span className="text-stone-300">/</span>
                  <span className="text-xs font-bold text-stone-700">
                    {question.subcategories.slice(0, 3).join(' · ')}
                  </span>
                </>
              ) : question.subcategory && (
                <>
                  <span className="text-stone-300">/</span>
                  <button
                    type="button"
                    onClick={handleSubcategoryClick}
                    className="text-xs font-bold text-stone-700 hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    {question.subcategory}
                  </button>
                </>
              )}

              {isSolved && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 已採納
                </span>
              )}
            </div>

            {/* Bounty Tag */}
            <div className="shrink-0">
              {isVibeCoding ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black shadow-2xs">
                  軟體作品
                </span>
              ) : isInnovationProposal ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black shadow-2xs">
                  創新提案
                </span>
              ) : isNoPaymentMode ? (
                <span className="text-xs font-semibold text-stone-500">免費交流</span>
              ) : isPainPoint ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-black font-mono">
                  {question.bounty > 0 ? `痛點 ${question.bounty.toLocaleString()} 點` : '痛點'}
                </span>
              ) : question.bounty > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-black font-mono text-amber-600">
                  NT$ {question.bounty.toLocaleString()}
                </span>
              ) : (
                <span className="text-xs font-semibold text-sky-700">討論</span>
              )}
            </div>
          </div>

          {/* 題目名稱 */}
          <h3 className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2">
            {displayAppName ? (
              <>
                <span className="text-blue-600 font-black">{displayAppName}：</span>
                <span>{displayCleanTitle}</span>
              </>
            ) : (
              question.title
            )}
          </h3>

          {/* 對應痛點或解決提案 (精簡單行提示) */}
          {(referencedPainPointObj || question.referencedPainPoint) && (
            <div
              onClick={(e) => {
                if (referencedPainPointObj) {
                  e.stopPropagation();
                  setSelectedQuestion(referencedPainPointObj);
                }
              }}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-rose-700 hover:text-rose-900 font-medium cursor-pointer max-w-full"
            >
              <Flame className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="truncate">
                對應痛點：{referencedPainPointObj ? referencedPainPointObj.title : question.referencedPainPoint?.replace(/^\[[^\]]+\]\s*/, '')}
              </span>
            </div>
          )}

          {isPainPoint && referencingProposals.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setSelectedQuestion(referencingProposals[0]);
              }}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-amber-700 hover:text-amber-950 font-medium cursor-pointer max-w-full"
            >
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">
                已有 {referencingProposals.length} 件解方提案：{referencingProposals[0].title}
              </span>
            </div>
          )}
        </div>

        {/* Footer Info: Author, Stats */}
        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={authorDisplayAvatar}
              alt={authorDisplayName}
              className="w-4.5 h-4.5 rounded-full object-cover ring-1 ring-stone-200 shrink-0"
            />
            <span className={`font-medium truncate max-w-[120px] sm:max-w-[180px] ${authorColorClass}`}>
              {authorDisplayName}
            </span>
            {question.tags && question.tags.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-400">
                {question.tags.slice(0, 3).map((tag, idx) => (
                  <button
                    key={`${tag}-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSearchTag) onSearchTag(tag);
                      else setSearchQuery(tag.replace(/^#/, ''));
                    }}
                    className="hover:text-stone-800 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 font-medium text-[11px] sm:text-xs shrink-0">
            <button
              type="button"
              onClick={handleBookmarkClick}
              className={`p-1.5 sm:p-2 rounded-full text-[11px] sm:text-xs font-bold flex items-center justify-center border transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-amber-50 hover:text-amber-700'
              }`}
              title={isBookmarked ? '⭐ 已收藏' : '⭐ 收藏'}
            >
              <Star className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
            </button>

            {isVibeCoding || isInnovationProposal ? (
              <button
                type="button"
                onClick={handleLikeClick}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                  isLiked || isSeconded
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                }`}
                title="❤️ Like（創新提案 / 軟體刊登）"
              >
                <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLiked || isSeconded ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                <span className="font-mono">{Math.max(likesCount || 0, secondCount || 0)}</span>
              </button>
            ) : isL0Discussion ? (
              <button
                type="button"
                onClick={handleLikeClick}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                }`}
                title="👍 按讚（L0 討論）"
              >
                <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="font-mono">{likesCount || 0}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSecondClick}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                  isSeconded
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
                }`}
                title="🔥 +1 附議（問題類型 / 痛點）"
              >
                <span className="font-mono font-black">+1</span>
                <span className="font-mono">{secondCount || 0}</span>
              </button>
            )}

            <span className="flex items-center gap-1 text-stone-400" title="討論數量">
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="font-mono">{discussionsCount ?? 0}</span>
            </span>

            {isSolved ? (
              <span className="font-bold text-emerald-600">已採納</span>
            ) : hasSolutions ? (
              <span className="font-bold font-mono text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-lg flex items-center shadow-2xs" title="已有落地解決方案">
                <span>{effectiveSolutionsCount} 方案</span>
              </span>
            ) : (
              <span className="font-bold font-mono text-stone-500">
                0 方案
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  // =========================================================================
  // 1. 大視窗 (Large Mode - FlyingV / 嘖嘖 / Apple 卡片式簡約美學，含大圖展示)
  // =========================================================================
  const isPainPointPost = isPainPoint || question.postType === 'seek_solution';
  const hasCoverImage =
    !isPainPointPost &&
    allowCardImage &&
    (isVibeCoding ||
      isInnovationProposal ||
      hasYoutubeVideo ||
      Boolean(question.cardDisplayImage) ||
      Boolean(question.coverImage) ||
      Boolean(question.galleryImages && question.galleryImages.length > 0) ||
      Boolean(question.screenshots && question.screenshots.length > 0) ||
      question.specialZone === 'vibecoding' ||
      question.specialZone === 'create_ideas');

  const fallbackCoverImg = getUniqueProposalCoverImage({
    id: question.id,
    title: question.title,
    track: question.subcategory,
  });

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between relative overflow-hidden ${
        isPromoted
          ? 'border-purple-300/80 bg-gradient-to-b from-purple-50/10 via-white to-white'
          : isSolved
          ? 'border-emerald-200/80 bg-emerald-50/5 hover:border-emerald-300'
          : 'border-stone-200/90 hover:border-amber-400'
      }`}
    >
      <div className="flex-1 flex flex-col">
        {hasCoverImage ? (
          /* 像創點子 (創新提案) 的大圖展示橫幅 (支援滑鼠移到播放 YouTube 影片或圖片輪播) */
          <ProposalCardMediaBanner
            youtubeUrl={effectiveYoutubeUrl}
            coverMode={effectiveCoverMode}
            cardHoverMode={effectiveCardHoverMode}
            coverImage={effectiveDisplayImage}
            galleryImages={effectiveGalleryImages}
            fallbackImage={fallbackCoverImg}
            onFallbackErrorImage={getUniqueProposalCoverImage({ id: question.id, title: question.title }, 2)}
            title={question.title}
            isHovered={isHovered}
            heightClass="aspect-video"
          >
            {/* 左上角標籤：領域分類 */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap pointer-events-none z-10">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-stone-900 border border-white/40 shadow-xs">
                {displayCategoryLabel}
                {question.subcategory ? ` · ${question.subcategory}` : ''}
              </span>
            </div>

            {/* 右上角標籤：軟體作品 / 創新提案 / 創星季 / 有解決方案紅點 */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none z-10 flex-wrap">

              {(question.isStarSeason || question.tags?.includes('創星季')) && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-600/95 backdrop-blur-md text-white shadow-xs flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>創星季</span>
                </span>
              )}
              {isVibeCoding ? (
                <>
                  {isComingSoonWork(question) && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 border border-amber-300 shadow-xs">
                      ⏳ 即將開放
                    </span>
                  )}
                  {getExperienceScore(question).totalRatings > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-600/95 backdrop-blur-md text-white shadow-xs" title={`平均體驗評分：${getExperienceScore(question).score}分`}>
                      👍 {getExperienceScore(question).score}分
                    </span>
                  )}
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-600/95 backdrop-blur-md text-white shadow-xs">
                    軟體作品
                  </span>
                </>
              ) : isInnovationProposal ? (
                <>
                  {getInnovationProgressStageMeta(question.proposalProgressStage) && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-emerald-900 border border-emerald-300 shadow-xs">
                      {getInnovationProgressStageMeta(question.proposalProgressStage)?.label}
                    </span>
                  )}
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 font-black border border-amber-300 shadow-xs">
                    創新提案
                  </span>
                </>
              ) : null}
            </div>

            {/* 右下角浮動操作按鈕 (⭐ 收藏 + ❤️ Like) */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-20">
              <button
                type="button"
                onClick={handleBookmarkClick}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-md cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-400 text-stone-950 hover:bg-amber-300 scale-105'
                    : 'bg-white/95 backdrop-blur-md text-stone-700 hover:bg-white hover:text-amber-600'
                }`}
                title={isBookmarked ? '⭐ 取消收藏' : '⭐ 收藏'}
              >
                <Star className={`w-4 h-4 ${isBookmarked ? 'fill-stone-950 text-stone-950' : 'text-amber-500'}`} />
              </button>
              <button
                type="button"
                onClick={handleLikeClick}
                className={`h-8 px-2.5 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-all shadow-md cursor-pointer ${
                  isLiked || isSeconded
                    ? 'bg-rose-500 text-white hover:bg-rose-600 scale-105'
                    : 'bg-white/95 backdrop-blur-md text-rose-600 hover:bg-white hover:text-rose-500'
                }`}
                title="❤️ Like"
              >
                <Heart className={`w-4 h-4 ${isLiked || isSeconded ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                <span className="font-mono text-xs">{Math.max(likesCount || 0, secondCount || 0)}</span>
              </button>
            </div>
          </ProposalCardMediaBanner>
        ) : (
          /* 非大圖卡片之一般頂部分類標籤與賞金列 */
          <div className="p-4 sm:p-5 pb-0">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {isPromoted && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 flex items-center gap-1 shrink-0"
                    title="置頂招募解答中"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                    <span>招募中</span>
                  </span>
                )}

                {(question.isStarSeason || question.tags?.includes('創星季')) && (
                  <span
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                    title="創星季參賽題目"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>創星季</span>
                  </span>
                )}

                {/* Breadcrumb Category / Subcategory (無外框，簡潔俐落) */}
                <div className="flex items-center gap-1 text-xs text-stone-500 truncate">
                  <button
                    type="button"
                    onClick={handleCategoryClick}
                    className="font-semibold hover:text-stone-900 transition-colors cursor-pointer truncate"
                  >
                    {displayCategoryLabel}
                  </button>
                  {(question.subcategories && question.subcategories.length > 0) ? (
                    <>
                      <span className="text-stone-300">·</span>
                      <span className="font-bold text-stone-700 truncate">
                        {question.subcategories.slice(0, 3).join(' · ')}
                      </span>
                    </>
                  ) : question.subcategory && (
                    <>
                      <span className="text-stone-300">·</span>
                      <button
                        type="button"
                        onClick={handleSubcategoryClick}
                        className="font-bold text-stone-700 hover:text-amber-600 transition-colors cursor-pointer truncate"
                      >
                        {question.subcategory}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Bounty & Bookmark */}
              <div className="shrink-0 flex items-center gap-1.5">
                {isVibeCoding ? (
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                    軟體作品
                  </span>
                ) : isInnovationProposal ? (
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                    創新提案
                  </span>
                ) : isNoPaymentMode ? (
                  <span className="text-xs font-semibold text-stone-500">免費</span>
                ) : isPainPoint ? (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-black font-mono"
                    title="痛點許願"
                  >
                    {question.bounty > 0 ? `痛點 ${question.bounty.toLocaleString()} 點` : '痛點'}
                  </span>
                ) : question.bounty > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50/90 text-amber-800 border border-amber-200/80 text-xs sm:text-sm font-black font-mono">
                    NT$ {question.bounty.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                    討論
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleBookmarkClick}
                  className={`p-1.5 sm:p-2 rounded-full border text-[11px] sm:text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isBookmarked
                      ? 'text-amber-800 bg-amber-50 border-amber-300'
                      : 'text-stone-500 bg-stone-50 border-stone-200 hover:text-amber-700 hover:bg-amber-50/70'
                  }`}
                  title={isBookmarked ? '⭐ 取消收藏' : '⭐ 收藏'}
                >
                  <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isBookmarked ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`p-4 sm:p-5 flex-1 flex flex-col ${hasCoverImage ? 'pt-3.5 sm:pt-4' : 'pt-2 sm:pt-2.5'}`}>

        {/* Title */}
        <h3 className="text-[15px] sm:text-base font-bold text-stone-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2">
          {displayAppName ? (
            <>
              <span className="text-blue-600 font-black">{displayAppName}：</span>
              <span>{displayCleanTitle}</span>
            </>
          ) : (
            question.title
          )}
        </h3>

        {/* Description / AI Summary / Top Comment snippet */}
        {hasCoverImage ? (
          cleanDescription ? (
            <p className="mt-1.5 text-xs text-stone-500 line-clamp-2 leading-relaxed font-normal">
              {cleanDescription}
            </p>
          ) : aiSummaryText ? (
            <p className="mt-1.5 text-xs text-amber-900/90 line-clamp-2 leading-relaxed font-normal">
              <img src="/avatars/agent-baimiao.webp" alt="" aria-hidden="true" className="w-3.5 h-3.5 rounded-full object-cover shrink-0 inline-block align-[-2px] mr-1 ring-1 ring-amber-200" />AI 摘要：{aiSummaryText}
            </p>
          ) : topCommentText ? (
            <p className="mt-1.5 text-xs text-stone-500 line-clamp-2 leading-relaxed font-normal">
              💬 {topCommentAuthor}：{topCommentText}
            </p>
          ) : null
        ) : (
          /* 無圖片大卡片：自動填補空白處（詳述 -> AI 摘要 -> 熱門留言） */
          (cleanDescription || aiSummaryText || topCommentText) && (
            <div className="mt-2 flex-1 flex flex-col justify-center space-y-2">
              {cleanDescription ? (
                <>
                  <p className="text-xs sm:text-[13px] text-stone-600 line-clamp-4 leading-relaxed font-normal">
                    {cleanDescription}
                  </p>
                  {aiSummaryText ? (
                    <div className="px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-950 leading-relaxed line-clamp-2 flex items-start gap-1.5">
                      <img src="/avatars/agent-baimiao.webp" alt="" aria-hidden="true" className="w-4 h-4 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-amber-200" />
                      <span>
                        <strong className="font-bold">AI 摘要：</strong>
                        {aiSummaryText}
                      </span>
                    </div>
                  ) : topCommentText ? (
                    <div className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-600 leading-relaxed line-clamp-2 flex items-start gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-bold text-stone-700">熱門留言 · {topCommentAuthor}：</strong>
                        {topCommentText}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : aiSummaryText ? (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-950 leading-relaxed line-clamp-4 flex items-start gap-1.5">
                  <img src="/avatars/agent-baimiao.webp" alt="" aria-hidden="true" className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-amber-200" />
                  <span>
                    <strong className="font-bold">AI 摘要：</strong>
                    {aiSummaryText}
                  </span>
                </div>
              ) : topCommentText ? (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-600 leading-relaxed line-clamp-4 flex items-start gap-1.5">
                  <MessageCircle className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold text-stone-700">熱門留言 · {topCommentAuthor}：</strong>
                    {topCommentText}
                  </span>
                </div>
              ) : null}
            </div>
          )
        )}

        {/* 對應痛點或解決提案 (精簡為俐落單行膠囊，避免卡片內多層色塊堆疊) */}
        {(referencedPainPointObj || question.referencedPainPoint) && (
          <div
            onClick={(e) => {
              if (referencedPainPointObj) {
                e.stopPropagation();
                setSelectedQuestion(referencedPainPointObj);
              }
            }}
            className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-rose-50/60 hover:bg-rose-50 border border-rose-100 text-[11px] text-rose-900 flex items-center justify-between gap-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="font-semibold truncate">
                對應痛點：{referencedPainPointObj ? referencedPainPointObj.title : question.referencedPainPoint?.replace(/^\[[^\]]+\]\s*/, '')}
              </span>
            </div>
            <span className="text-[10px] font-bold text-rose-600 shrink-0">查看 ➔</span>
          </div>
        )}

        {isPainPoint && referencingProposals.length > 0 && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSelectedQuestion(referencingProposals[0]);
            }}
            className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-amber-50/60 hover:bg-amber-50 border border-amber-100 text-[11px] text-amber-950 flex items-center justify-between gap-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold truncate">
                {referencingProposals.length} 件解方提案：{referencingProposals[0].title}
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-700 shrink-0">查看 ➔</span>
          </div>
        )}

        {/* Tags (最多顯示 3 個，無邊框純淨呈現) */}
        {question.tags && question.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {question.tags.slice(0, 3).map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSearchTag) {
                    onSearchTag(tag);
                  } else {
                    setSearchQuery(tag.replace(/^#/, ''));
                  }
                }}
                className="text-[11px] font-medium text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
                title={`搜尋 #${tag}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Card Footer: 簡潔線條與圖示數據 */}
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={authorDisplayAvatar}
            alt={authorDisplayName}
            className="w-5 h-5 rounded-full object-cover ring-1 ring-stone-200 shrink-0"
          />
          <span className={`font-medium truncate max-w-[120px] sm:max-w-[150px] ${authorColorClass}`}>
            {authorDisplayName}
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-stone-400 font-medium shrink-0">
          {isVibeCoding || isInnovationProposal ? (
            <button
              type="button"
              onClick={handleLikeClick}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                isLiked || isSeconded
                  ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                  : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
              }`}
              title="❤️ Like（創新提案 / 軟體刊登）"
            >
              <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLiked || isSeconded ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
              <span className="font-mono">{Math.max(likesCount || 0, secondCount || 0)}</span>
            </button>
          ) : isL0Discussion ? (
            <button
              type="button"
              onClick={handleLikeClick}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                isLiked
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
              }`}
              title="👍 按讚（L0 討論）"
            >
              <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="font-mono">{likesCount || 0}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSecondClick}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                isSeconded
                  ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                  : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
              }`}
              title="🔥 +1 附議（問題類型 / 痛點）"
            >
              <span className="font-mono font-black">+1</span>
              <span className="font-mono">{secondCount || 0}</span>
            </button>
          )}

          {(question.supportPoints || 0) > 0 && (
            <span
              className="flex items-center gap-1 text-amber-700 font-mono text-[11px] font-bold"
              title="累積獲得打賞支持點數"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>{(question.supportPoints || 0).toLocaleString()}</span>
            </span>
          )}

          <span className="flex items-center gap-1 text-[11px]" title="討論留言數">
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-mono">{discussionsCount ?? questionDiscussions.length}</span>
          </span>

          {isSolved ? (
            <span className="font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              <span>已採納</span>
            </span>
          ) : hasSolutions ? (
            <span
              className="flex items-center gap-1 font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full transition-colors text-[11px] font-mono shadow-2xs"
              title="已有專家提交落地解決方案"
            >
              <span>{effectiveSolutionsCount} 方案</span>
            </span>
          ) : (
            <span
              className="flex items-center gap-1 font-bold text-stone-600 bg-stone-100 group-hover:bg-amber-500 group-hover:text-stone-950 px-2.5 py-0.5 rounded-full transition-colors text-[11px] font-mono"
              title="方案解答數"
            >
              <span>0 方案</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

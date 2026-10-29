import { Question } from '../types';
import { deriveInnovationProposalName } from './titleFormat';
import { generateTitleCover } from './proposalImageUtils';

/**
 * 1. 判斷該提問是否屬於「提出痛點」(pain_point)
 */
export const isPainPointQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'pain_point';
  }
  if (question.specialZone === 'pain_points') return true;
  if (question.tags && question.tags.some((t) => t.includes('痛點'))) return true;
  return false;
};

/**
 * 2. 判斷該提問是否屬於「創新解方 / 創新提案」(innovation_proposal)
 */
export const isInnovationProposalQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'innovation_proposal';
  }
  if (question.specialZone === 'create_ideas') return true;
  return false;
};

/**
 * 3. 判斷該提問是否屬於「軟體網站 / VibeCoding 應用」(vibecoding_app)
 * 核心規則：在 VibeCoding 展場下，嚴格僅展示軟體網站與程式應用作品；
 * 嚴格排除痛點、閒聊討論、尋求解答與創新解方提案。
 */
export const isVibeCodingAppQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'vibecoding_app';
  }
  if (question.specialZone === 'vibecoding') return true;
  return false;
};

/**
 * 4. 判斷該提問是否屬於「L0 討論區 / 閒聊討論」(chat_discussion)
 * 核心規則：從「尋求解答」或「提出痛點」或「創新提案」或「VibeCoding」提出的問題，
 * 就算設定等級是 L0 也不要算入 L0 討論區！
 */
export const isL0DiscussionQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'chat_discussion';
  }
  if (question.specialZone === 'l0_discussion') return true;
  const hasDiscussionTag = question.tags && question.tags.some((t) => t.includes('閒聊') || t.includes('L0討論'));
  if (hasDiscussionTag) return true;
  return false;
};

/**
 * 5. 判斷該提問是否屬於「提問 / 尋求解答」(seek_solution)
 */
export const isSeekSolutionQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'seek_solution';
  }
  if (
    isPainPointQuestion(question) ||
    isInnovationProposalQuestion(question) ||
    isVibeCodingAppQuestion(question) ||
    isL0DiscussionQuestion(question)
  ) {
    return false;
  }
  return true;
};

/**
 * 6. 將平台資料庫之創新提案 Question 轉換為創星季/創點子 StarSeasonProposal 格式（支援後台資料庫同步刪除與更新日誌）
 */
export const questionToStarSeasonProposal = (q: Question): import('../types/competition').StarSeasonProposal => {
  let track: import('../types/competition').StarSeasonTrack = 'ict';
  const text = `${q.category} ${q.subcategory || ''} ${(q.tags || []).join(' ')} ${q.title}`;
  if (q.subcategory === '生醫化材') {
    track = 'biomedical';
  } else if (q.subcategory === '機電運輸') {
    track = 'mechanical_transport';
  } else if (q.subcategory === '服務文創') {
    track = 'cultural_services';
  } else if (q.subcategory === '資通訊') {
    track = 'ict';
  } else if (
    text.includes('醫療') ||
    text.includes('生技') ||
    text.includes('健康') ||
    text.includes('復健') ||
    text.includes('照護') ||
    text.includes('營養') ||
    text.includes('牙') ||
    text.includes('診所') ||
    text.includes('藥')
  ) {
    track = 'biomedical';
  } else if (
    text.includes('製造') ||
    text.includes('物流') ||
    text.includes('農業') ||
    text.includes('儲能') ||
    text.includes('電網') ||
    text.includes('綠能') ||
    text.includes('機械') ||
    text.includes('充電') ||
    text.includes('冷鏈') ||
    text.includes('工廠')
  ) {
    track = 'mechanical_transport';
  } else if (
    text.includes('餐飲') ||
    text.includes('旅宿') ||
    text.includes('書店') ||
    text.includes('團購') ||
    text.includes('租屋') ||
    text.includes('共生') ||
    text.includes('寵物') ||
    text.includes('親子') ||
    text.includes('文創') ||
    text.includes('生活') ||
    q.category === '日常疑難'
  ) {
    track = 'cultural_services';
  } else {
    track = 'ict';
  }

  const resolvedCover = q.coverImage || (q as any).vibeCodingData?.coverImageUrl;
  const resolvedGallery = q.galleryImages || q.screenshots || (q as any).vibeCodingData?.screenshots || [];

  const combinedImgs = Array.from(
    new Set([resolvedCover, ...resolvedGallery].filter((u): u is string => Boolean(u && typeof u === 'string')))
  );

  const imgs =
    combinedImgs.length > 0
      ? combinedImgs
      : [generateTitleCover(q.id, q.appName || q.title)];

  return {
    id: q.id,
    appName: q.appName || deriveInnovationProposalName(q),
    title: q.title,
    stage: q.postType === 'pain_point' ? 'pain_point' : 'solution',
    track,
    summary: q.description.length > 90 ? `${q.description.slice(0, 90)}...` : q.description,
    description: q.description,
    authorId: q.authorId,
    authorName: q.authorName,
    authorAvatar: q.authorAvatar,
    authorRole: 'user',
    teamName: q.authorTitle ? `${q.authorName} ｜ ${q.authorTitle}` : q.authorName,
    organizationName: q.authorTitle,
    showOrganization: Boolean(q.authorTitle),
    sourcePainPointTitle: q.referencedPainPoint,
    referencedPainPoint: q.referencedPainPoint,
    targetGoal: q.targetGoal,
    images: imgs,
    youtubeUrl: q.youtubeUrl,
    coverMode: q.coverMode,
    cardHoverMode: q.cardHoverMode,
    proposalProgressStage: q.proposalProgressStage,
    externalLink: q.demoUrl,
    technicalFeasibility: q.techArchitecture,
    tags: q.tags,
    status: q.status === 'delisted' ? 'rejected' : 'approved',
    supportPoints:
      typeof q.supportPoints === 'number' && q.supportPoints > 0
        ? q.supportPoints < 2000
          ? q.supportPoints * 100
          : q.supportPoints
        : 0,
    supporterCount: typeof q.supporterCount === 'number' ? q.supporterCount : 0,
    targetFundingAmount: 100000,
    viewsCount: typeof q.views === 'number' ? q.views : 0,
    likeCount: typeof q.likes === 'number' ? q.likes : 0,
    commentsCount: typeof q.answersCount === 'number' ? q.answersCount : 0,
    createdAt: q.createdAt,
    updatedAt: q.updateLogs && q.updateLogs.length > 0 ? q.updateLogs[0].timestamp : q.createdAt,
    currentVersion: q.currentVersion,
    updateLogs: q.updateLogs,
  };
};

export const mapQuestionsToStarSeasonProposals = (
  questions: Question[]
): import('../types/competition').StarSeasonProposal[] => {
  return questions
    .filter((q) => isInnovationProposalQuestion(q) && q.status !== 'delisted')
    .map(questionToStarSeasonProposal);
};

/**
 * 判斷卡片內頁瀏覽次數是否對當前使用者可見：
 * 1. 若 showCardViews 為 false，全站與管理員皆不顯示。
 * 2. 若 cardViewsScope 為 'public'，所有人（含訪客、會員、管理員）皆可見。
 * 3. 若 cardViewsScope 為 'admin'（預設），僅具有管理員權限者可見。
 */
export const isCardViewsVisible = (
  config?: import('../types').PublicMetricsConfig | null,
  isAdmin: boolean = false
): boolean => {
  if (!config) return isAdmin;
  const isEnabled = config.showCardViews ?? true;
  if (!isEnabled) return false;
  const scope = config.cardViewsScope ?? 'admin';
  if (scope === 'public') return true;
  return isAdmin;
};


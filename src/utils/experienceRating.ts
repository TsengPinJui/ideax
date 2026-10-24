import { Question } from '../types';

export type ExperienceVote = 'thumbs_up' | 'neutral' | 'thumbs_down';

export interface ExperienceScoreInfo {
  score: number | null; // 0 ~ 100, null if no ratings
  total: number;
  totalRatings: number;
  thumbsUp: number;
  neutral: number;
  thumbsDown: number;
  hasRated?: boolean;
}

const STORAGE_VOTES_KEY = 'ideax_experience_votes';

/** 取得用戶本機已評分的記錄 (questionId -> vote) */
export function getLocalExperienceVotes(): Record<string, ExperienceVote> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 記錄用戶本機評分 */
export function saveLocalExperienceVote(questionId: string, vote: ExperienceVote): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = getLocalExperienceVotes();
    prev[questionId] = vote;
    localStorage.setItem(STORAGE_VOTES_KEY, JSON.stringify(prev));
  } catch {}
}

/**
 * 計算體驗評分平均分數
 * 規則：每個讚 (thumbs_up) 是 100 分，普通 (neutral) 是 0 分，倒讚 (thumbs_down) 是 0 分。
 * 平均分數 = Math.round((thumbsUp * 100 + neutral * 0 + thumbsDown * 0) / total)
 */
export function getExperienceScore(question?: Partial<Question> | null): ExperienceScoreInfo {
  if (!question) {
    return { score: null, total: 0, totalRatings: 0, thumbsUp: 0, neutral: 0, thumbsDown: 0, hasRated: false };
  }

  const thumbsUp = Math.max(0, Number(question.experienceThumbsUpCount) || 0);
  const neutral = Math.max(0, Number(question.experienceNeutralCount) || 0);
  const thumbsDown = Math.max(0, Number(question.experienceThumbsDownCount) || 0);
  const total = thumbsUp + neutral + thumbsDown;

  const localVotes = getLocalExperienceVotes();
  const hasRated = Boolean(question.id && localVotes[question.id]);

  if (total === 0) {
    // 若尚未有投票，但在 question.experienceScore 曾有手動設定
    if (typeof question.experienceScore === 'number' && question.experienceScore >= 0) {
      return { score: Math.min(100, Math.max(0, question.experienceScore)), total: 1, totalRatings: 1, thumbsUp: 1, neutral: 0, thumbsDown: 0, hasRated };
    }
    return { score: null, total: 0, totalRatings: 0, thumbsUp: 0, neutral: 0, thumbsDown: 0, hasRated };
  }

  const score = Math.round((thumbsUp * 100) / total);
  return { score, total, totalRatings: total, thumbsUp, neutral, thumbsDown, hasRated };
}

/**
 * 提交一筆體驗評分
 */
export function calculateNewExperienceRating(
  currentQuestion: Question,
  vote: ExperienceVote
): {
  updatedQuestion: Question;
  score: number;
  total: number;
  thumbsUp: number;
  neutral: number;
  thumbsDown: number;
} {
  const currentUp = Math.max(0, Number(currentQuestion.experienceThumbsUpCount) || 0);
  const currentNeutral = Math.max(0, Number(currentQuestion.experienceNeutralCount) || 0);
  const currentDown = Math.max(0, Number(currentQuestion.experienceThumbsDownCount) || 0);

  const localVotes = getLocalExperienceVotes();
  const previousVote = currentQuestion.id ? localVotes[currentQuestion.id] : undefined;

  let newUp = currentUp;
  let newNeutral = currentNeutral;
  let newDown = currentDown;

  // 若先前投過票，先扣減舊投票
  if (previousVote) {
    if (previousVote === 'thumbs_up') newUp = Math.max(0, newUp - 1);
    else if (previousVote === 'neutral') newNeutral = Math.max(0, newNeutral - 1);
    else if (previousVote === 'thumbs_down') newDown = Math.max(0, newDown - 1);
  }

  // 累加新投票
  if (vote === 'thumbs_up') newUp += 1;
  else if (vote === 'neutral') newNeutral += 1;
  else if (vote === 'thumbs_down') newDown += 1;

  const total = newUp + newNeutral + newDown;
  const score = total > 0 ? Math.round((newUp * 100) / total) : 0;

  if (currentQuestion.id) {
    saveLocalExperienceVote(currentQuestion.id, vote);
  }

  const updatedQuestion: Question = {
    ...currentQuestion,
    experienceThumbsUpCount: newUp,
    experienceNeutralCount: newNeutral,
    experienceThumbsDownCount: newDown,
    experienceScore: score,
    experienceRatingsCount: total,
  };

  return {
    updatedQuestion,
    score,
    total,
    thumbsUp: newUp,
    neutral: newNeutral,
    thumbsDown: newDown,
  };
}

/**
 * 判斷作品是否帶有「即將開放」標籤
 */
export function isComingSoonWork(question?: Partial<Question> | null): boolean {
  if (!question) return false;
  if ((question as any).isComingSoon === true) return true;
  const tags = question.tags || [];
  return tags.some((t) => {
    const s = String(t).trim();
    return s === '即將開放' || s === '即將上線' || s === '即將推出';
  });
}

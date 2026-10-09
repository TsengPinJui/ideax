import { Question } from '../types';

/**
 * 判斷該提問是否屬於「痛點」類型的提問（提出痛點 / 創點子痛點）
 */
export const isPainPointQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType === 'pain_point') return true;
  if (question.tags && question.tags.some((t) => t.includes('痛點') || t.includes('創點子'))) return true;
  if (question.title && (question.title.includes('痛點') || question.title.includes('創點子'))) return true;
  if (question.description && (question.description.includes('痛點') || question.description.includes('創點子'))) return true;
  return false;
};

/**
 * 判斷該提問是否屬於「L0 討論區 / L0 閒聊討論」
 * 核心規則：如果從「尋求解答」(seek_solution) 或「提出痛點」(pain_point) 提出的問題，
 * 就算設定等級是 L0 也不要算入 L0 討論區或 L0 閒聊討論分類！
 */
export const isL0DiscussionQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  // 1. 痛點特性優先排除（提出痛點 / 創點子痛點）
  if (isPainPointQuestion(question) || question.postType === 'pain_point') return false;
  // 2. 從「尋求解答」提出的問題，就算設定是 L0 也不要算入 L0 討論區或 L0 閒聊討論分類
  if (question.postType === 'seek_solution') return false;

  // 3. 專屬「閒聊討論」發布類型或專區
  if (question.postType === 'chat_discussion') return true;
  if (question.specialZone === 'l0_discussion') return true;

  // 4. 若未指定 postType（舊有種子資料），僅在明確有閒聊/討論標籤或純L0非懸賞交流時視為L0討論
  const hasDiscussionTag = question.tags && question.tags.some((t) => t.includes('閒聊') || t.includes('討論') || t.includes('L0討論'));
  if (hasDiscussionTag) return true;

  if (question.level === 'L0' && (!question.bounty || question.bounty === 0) && !question.postType) {
    return true;
  }

  return false;
};

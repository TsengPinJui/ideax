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

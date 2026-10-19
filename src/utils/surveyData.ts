import type { User, UserSurveyData } from '../types';

/**
 * 問卷資料真偽判斷（後台統計與個人中心問卷共用）
 *
 * 舊版註冊流程沒有問問卷題目，卻替每位新用戶存了一份預設答案；提問者「略過個人資料」時，
 * 年齡、行業、職稱也被補成固定值。這些都不是使用者真的回答的，統計時要當成「未填寫」。
 */

// 舊版註冊時自動存入的預設問卷答案
const REGISTRATION_DEFAULTS: Partial<Record<keyof UserSurveyData, string>> = {
  willingQuestionBudget: '2000_5000',
  willingToProvideSolutions: 'very_willing',
  usageFrequency: 'few_times_weekly',
  willingToBeSideHustle: 'considering',
  willingToSubscribeSolverPlan: 'depends_profit',
};

/** 是否為舊版註冊流程自動存入的預設問卷（不是使用者自己填的） */
export function isRegistrationDefaultSurvey(s?: UserSurveyData | null): boolean {
  if (!s) return false;
  if (s.source === 'survey_form') return false; // 從問卷表單送出的一定是使用者填的
  return Object.entries(REGISTRATION_DEFAULTS).every(([k, v]) => (s as any)[k] === v);
}

/** 使用者真的填寫過的問卷；沒填或只有系統預設值時回傳 undefined */
export function realSurvey(u: Pick<User, 'surveyData'>): UserSurveyData | undefined {
  return u.surveyData && !isRegistrationDefaultSurvey(u.surveyData) ? u.surveyData : undefined;
}

/** 註冊時選了「略過個人資料」：年齡、行業、職稱都是系統補的 */
function skippedProfile(u: Pick<User, 'hasCompletedProfile'>): boolean {
  return u.hasCompletedProfile === false;
}

export function realAgeGroup(u: Pick<User, 'ageGroup' | 'hasCompletedProfile'>): User['ageGroup'] | undefined {
  return skippedProfile(u) ? undefined : u.ageGroup || undefined;
}

export function realIndustry(u: Pick<User, 'industry' | 'hasCompletedProfile'>): string | undefined {
  return skippedProfile(u) ? undefined : u.industry || undefined;
}

export function realJobTitle(u: Pick<User, 'jobTitle' | 'hasCompletedProfile'>): string | undefined {
  return skippedProfile(u) ? undefined : (u.jobTitle || '').trim() || undefined;
}

/** 統計圖的「未填寫」欄 */
export const UNFILLED_LABEL = '未填寫';
export const UNFILLED_COLOR = '#9ca3af';

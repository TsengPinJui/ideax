/**
 * 修正以前因程式錯誤寫進資料庫的「不是使用者自己填的」資料。
 * 前端讀資料時會先套用（畫面立刻正確），管理員也可以在後台一次把資料庫裡的舊資料改掉。
 * 這裡只放純函式，不碰資料庫；模擬帳號（isSimulated）一律不動。
 */
import type { Answer, User, UserSurveyData } from '../types';
import { isRegistrationDefaultSurvey } from './surveyData';

export type RepairCategory =
  | 'survey_default' // 註冊時自動存的預設問卷、沒問過的性別與年薪
  | 'skipped_profile' // 略過個人資料時系統補的年齡、行業、職稱、頭銜
  | 'fake_rating' // 沒有任何評價卻有 5 星、100% 採納率
  | 'placeholder_bio' // 系統自動產生的「XXX 的個人簡介。」
  | 'unreviewed_verification' // 註冊為解答者時沒經過審核就變成「已實名認證／認證專家」
  | 'fake_answer_defaults' // 創星季期間新留言被灌的 28 讚、120,000 支持點數、12 則留言與圖庫封面
  | 'fake_solver_rating'; // 解答上預設的 4.9 星

export const REPAIR_CATEGORY_LABELS: Record<RepairCategory, string> = {
  survey_default: '預設問卷與沒問過的性別、年薪',
  skipped_profile: '略過個人資料時系統補的年齡、行業、職稱',
  fake_rating: '沒有評價卻顯示 5 星或 100% 採納率',
  placeholder_bio: '系統自動產生的個人簡介',
  unreviewed_verification: '註冊時未經審核就成為已認證',
  fake_answer_defaults: '留言／方案被預設的假讚數、支持點數、留言數與封面',
  fake_solver_rating: '解答上預設的 4.9 星評分',
};

export const CLIENT_SAFE_CATEGORIES: RepairCategory[] = ['survey_default', 'skipped_profile', 'fake_rating', 'placeholder_bio'];

export const FAKE_STAR_SEASON_COVER =
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80';

const SKIPPED_DEFAULTS: Partial<Record<keyof User, string>> = {
  ageGroup: '25_34',
  industry: '資訊科技 / 軟體互聯網',
  jobTitle: '自由創業者',
  title: '新進提問者',
};

export type FieldFix = { field: string; from: unknown; to: unknown | undefined; category: RepairCategory };

const hasRealSurvey = (s?: UserSurveyData | null) => Boolean(s && !isRegistrationDefaultSurvey(s));
const near = (a?: string, b?: string, ms = 2 * 60 * 1000) => {
  const x = Date.parse(a || ''), y = Date.parse(b || '');
  return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= ms;
};

/**
 * 找出一位會員資料裡要修正的欄位。
 * priv：伺服器端才有的私密資料（user_private：問卷、年薪、實名資料）
 */
export function findUserFixes(
  u: Partial<User> & Record<string, any>,
  priv: Record<string, any> = {},
  categories: RepairCategory[] = CLIENT_SAFE_CATEGORIES
): FieldFix[] {
  if (!u || u.isSimulated || u.id === 'user-guest') return [];
  const on = (c: RepairCategory) => categories.includes(c);
  const fixes: FieldFix[] = [];
  const survey = (priv.surveyData ?? u.surveyData) as UserSurveyData | undefined;
  const realSurvey = hasRealSurvey(survey);

  if (on('survey_default')) {
    if (survey && !realSurvey) fixes.push({ field: 'surveyData', from: '預設問卷', to: undefined, category: 'survey_default' });
    if (!realSurvey && (u.gender === 'male' || u.gender === 'undisclosed')) fixes.push({ field: 'gender', from: u.gender, to: undefined, category: 'survey_default' });
    const salary = priv.annualSalary ?? u.annualSalary;
    if (!realSurvey && salary === 'undisclosed') fixes.push({ field: 'annualSalary', from: salary, to: undefined, category: 'survey_default' });
  }
  if (on('skipped_profile') && u.hasCompletedProfile === false) {
    for (const [k, v] of Object.entries(SKIPPED_DEFAULTS)) {
      if ((u as any)[k] === v) fixes.push({ field: k, from: v, to: undefined, category: 'skipped_profile' });
    }
  }
  if (on('fake_rating')) {
    const reviews = Number(u.reviewCount || 0);
    if (!reviews && u.rating && Number(u.rating) >= 4.9) fixes.push({ field: 'rating', from: u.rating, to: 0, category: 'fake_rating' });
    const submitted = Number(u.submittedSolutionsCount || 0);
    if (!submitted && String(u.acceptanceRate ?? '') === '100') fixes.push({ field: 'acceptanceRate', from: u.acceptanceRate, to: undefined, category: 'fake_rating' });
  }
  if (on('placeholder_bio') && typeof u.bio === 'string' && u.name) {
    const b = u.bio.trim();
    if (b === `${u.name} 的個人簡介。` || b === `${u.name} 的全新註冊個人帳號。`) fixes.push({ field: 'bio', from: b, to: '', category: 'placeholder_bio' });
  }
  if (on('unreviewed_verification')) {
    const rn = priv.realNameAuthData || u.realNameAuthData;
    // 註冊當下就「通過」：通過時間跟申請時間幾乎一樣，沒有管理員審核
    if (u.realNameAuthStatus === 'verified' && rn && near(rn.verifiedAt, rn.appliedAt)) {
      const hasDocs = Boolean(rn.idCardFrontFile || rn.idCardBackFile || u.hasIdDocuments);
      fixes.push({ field: 'realNameAuthStatus', from: 'verified', to: hasDocs ? 'pending' : 'none', category: 'unreviewed_verification' });
      if (u.expertCertStatus !== 'verified') {
        if (u.verifiedExpert) fixes.push({ field: 'verifiedExpert', from: true, to: false, category: 'unreviewed_verification' });
        if (u.verifiedBadge) fixes.push({ field: 'verifiedBadge', from: u.verifiedBadge, to: undefined, category: 'unreviewed_verification' });
      }
    }
  }
  return fixes;
}

/** 前端用：讀進來的會員資料直接套用安全的修正（不含需要私密資料或人工判斷的類別） */
export function repairUserForDisplay<T extends Partial<User>>(u: T): T {
  const fixes = findUserFixes(u as any);
  if (!fixes.length) return u;
  const out: any = { ...u };
  for (const f of fixes) {
    if (f.to === undefined) delete out[f.field];
    else out[f.field] = f.to;
  }
  return out as T;
}

/** 解答／留言：找出被灌的假數字 */
export function findAnswerFixes(
  a: Partial<Answer> & Record<string, any>,
  solverRealRating: number | null,
  categories: RepairCategory[]
): FieldFix[] {
  if (!a || a.isSimulated) return [];
  const fixes: FieldFix[] = [];
  if (categories.includes('fake_answer_defaults') && !a.fakeDefaultsFixed && a.coverImageUrl === FAKE_STAR_SEASON_COVER) {
    const sp = Math.max(0, (Number(a.supportPoints) || 0) - 120000);
    fixes.push({ field: 'likes', from: a.likes, to: Math.max(0, (Number(a.likes) || 0) - 28), category: 'fake_answer_defaults' });
    fixes.push({ field: 'supportPoints', from: a.supportPoints, to: sp || undefined, category: 'fake_answer_defaults' });
    fixes.push({ field: 'commentsCount', from: a.commentsCount, to: Math.max(0, (Number(a.commentsCount) || 0) - 12), category: 'fake_answer_defaults' });
    fixes.push({ field: 'coverImageUrl', from: a.coverImageUrl, to: undefined, category: 'fake_answer_defaults' });
    fixes.push({ field: 'fakeDefaultsFixed', from: undefined, to: true, category: 'fake_answer_defaults' });
  }
  if (categories.includes('fake_solver_rating') && Number(a.solverRating) === 4.9 && !solverRealRating) {
    fixes.push({ field: 'solverRating', from: a.solverRating, to: 0, category: 'fake_solver_rating' });
  }
  return fixes;
}

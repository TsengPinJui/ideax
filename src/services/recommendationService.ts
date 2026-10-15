import { Question, Answer } from '../types';

export interface UserInterestProfile {
  keywords: string[];
  categories: string[];
  subcategories: string[];
  specialZones: string[];
  tags: string[];
  lastUpdated: number;
}

const STORAGE_PREFIX = 'ideax_user_interest_';

/**
 * 判斷問題是否已經過期
 * 規則：以 deadline 當日 23:59:59 為最終截止線，若當前時間已超過則為過期
 */
export function isQuestionExpired(deadline?: string): boolean {
  if (!deadline || deadline === '永久' || deadline === '永久刊登') return false;
  const deadlineStr = deadline.includes('T') ? deadline : `${deadline}T23:59:59`;
  const time = new Date(deadlineStr).getTime();
  return !isNaN(time) && time < Date.now();
}

export function getUserInterestProfile(userId: string = 'guest'): UserInterestProfile {
  if (typeof window === 'undefined') {
    return { keywords: [], categories: [], subcategories: [], specialZones: [], tags: [], lastUpdated: Date.now() };
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse user interest profile:', e);
  }
  return { keywords: [], categories: [], subcategories: [], specialZones: [], tags: [], lastUpdated: Date.now() };
}

export function saveUserInterestProfile(userId: string = 'guest', profile: UserInterestProfile): void {
  if (typeof window === 'undefined') return;
  try {
    profile.lastUpdated = Date.now();
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save user interest profile:', e);
  }
}

/**
 * 記錄個別用戶搜尋過的關鍵字
 */
export function recordUserSearchKeyword(userId: string = 'guest', keyword: string): void {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) return;

  const profile = getUserInterestProfile(userId);
  // 去除舊的相同關鍵字，並置入最新最前面（最多保留 15 個）
  profile.keywords = [trimmed, ...profile.keywords.filter((k) => k !== trimmed)].slice(0, 15);
  saveUserInterestProfile(userId, profile);
}

/**
 * 記錄個別用戶點選或瀏覽過的看板（主分類、次領域）
 */
export function recordUserBoard(userId: string = 'guest', category: string, subcategory?: string): void {
  if (!category || category === '全部') return;
  const profile = getUserInterestProfile(userId);

  profile.categories = [category, ...profile.categories.filter((c) => c !== category)].slice(0, 10);
  if (subcategory && subcategory !== '全部') {
    profile.subcategories = [subcategory, ...profile.subcategories.filter((s) => s !== subcategory)].slice(0, 15);
  }
  saveUserInterestProfile(userId, profile);
}

/**
 * 記錄個別用戶瀏覽過的主題專區
 */
export function recordUserSpecialZone(userId: string = 'guest', zone: string): void {
  if (!zone || zone === 'all') return;
  const profile = getUserInterestProfile(userId);
  profile.specialZones = [zone, ...profile.specialZones.filter((z) => z !== zone)].slice(0, 8);
  saveUserInterestProfile(userId, profile);
}

/**
 * 記錄個別用戶點擊瀏覽過的問題（提煉標籤與領域）
 */
export function recordUserViewedQuestion(userId: string = 'guest', question: Question): void {
  if (!question) return;
  const profile = getUserInterestProfile(userId);

  if (question.category) {
    profile.categories = [question.category, ...profile.categories.filter((c) => c !== question.category)].slice(0, 10);
  }
  if (question.subcategory) {
    profile.subcategories = [question.subcategory, ...profile.subcategories.filter((s) => s !== question.subcategory)].slice(0, 15);
  }
  if (question.tags && question.tags.length > 0) {
    const newTags = question.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    profile.tags = [...new Set([...newTags, ...profile.tags])].slice(0, 20);
  }
  saveUserInterestProfile(userId, profile);
}

/**
 * 判斷問題的主題是否符合用戶的關注偏好
 * 主題包含：
 * - 主分類 (category)
 * - 次領域看板 (subcategory)
 * - 搜尋過的關鍵字 (keywords)
 * - 瀏覽過的問題標籤 (tags)
 * - 瀏覽過的主題專區 (specialZones)
 */
export function isUserInterestedInQuestionTopic(
  q: Question,
  profile: UserInterestProfile
): boolean {
  if (!profile) return true;

  const hasAnyInterest =
    (profile.categories && profile.categories.length > 0) ||
    (profile.subcategories && profile.subcategories.length > 0) ||
    (profile.keywords && profile.keywords.length > 0) ||
    (profile.tags && profile.tags.length > 0) ||
    (profile.specialZones && profile.specialZones.length > 0);

  // 若用戶完全沒有任何歷史記錄，視為尚未建立特定主題偏好（全開放）
  if (!hasAnyInterest) {
    return true;
  }

  // 1. 檢查主分類看板
  if (profile.categories && profile.categories.includes(q.category)) {
    return true;
  }

  // 2. 檢查次領域看板
  if (q.subcategory && profile.subcategories && profile.subcategories.includes(q.subcategory)) {
    return true;
  }

  // 3. 檢查標籤
  if (q.tags && q.tags.length > 0 && profile.tags && profile.tags.length > 0) {
    const qTagsLower = q.tags.map((t) => t.toLowerCase());
    if (profile.tags.some((tag) => qTagsLower.includes(tag))) {
      return true;
    }
  }

  // 4. 檢查搜尋過的關鍵字
  if (profile.keywords && profile.keywords.length > 0) {
    const titleLower = q.title.toLowerCase();
    const descLower = q.description.toLowerCase();
    const catLower = q.category.toLowerCase();
    const subLower = (q.subcategory || '').toLowerCase();
    const tagsLower = q.tags.map((t) => t.toLowerCase());

    const matchesKeyword = profile.keywords.some((k) => {
      return (
        titleLower.includes(k) ||
        descLower.includes(k) ||
        catLower.includes(k) ||
        subLower.includes(k) ||
        tagsLower.some((t) => t.includes(k) || k.includes(t))
      );
    });

    if (matchesKeyword) {
      return true;
    }
  }

  // 5. 檢查主題專區
  if (profile.specialZones && profile.specialZones.length > 0) {
    if (profile.specialZones.includes('high_bounty') && q.bounty >= 5000) return true;
    if (profile.specialZones.includes('urgent') && (q.level === 'L3' || q.level === 'L4')) return true;
    if (profile.specialZones.includes('beginner') && (q.level === 'L0' || q.level === 'L1')) return true;
  }

  return false;
}

/**
 * 計算單一問題對該用戶的「推薦評分」
 * 規則：
 * 1. 付費推播問題（isFeatured 且 status === 'open'）：
 *    必須符合該用戶關注的主題才給予頂級優先置頂分數（100,000+）並放在最上面！
 *    若用戶不關注該主題，則不納入該用戶的推薦推播
 * 2. 命中用戶最近搜尋關鍵字：大幅加權
 * 3. 命中用戶最近瀏覽或釘選看板：深度加權
 * 4. 命中用戶最近瀏覽主題專區：相關性加權
 * 5. 命中用戶常看標籤：主題加權
 * 6. 招募中（open）狀態額外加分
 */
export function computeQuestionRecommendationScore(
  q: Question,
  profile: UserInterestProfile,
  answers: Answer[] = []
): number {
  // 過期或已被管理員下架問題不推薦
  if (isQuestionExpired(q.deadline) || q.status === 'delisted') {
    return -9999;
  }

  const isPaidPromoted = q.status === 'open' && q.isFeatured;
  let score = 0;

  // 1. 付費推播處理：推播問題必須在其對應的主題出現；如果用戶關注該主題才置頂推薦
  if (isPaidPromoted) {
    const isInterested = isUserInterestedInQuestionTopic(q, profile);
    if (isInterested) {
      score += 100000; // 命中用戶關注主題之付費推播，享有頂級置頂權重
    }
  }

  // 2. 關鍵字加權 (Keywords)
  if (profile.keywords && profile.keywords.length > 0) {
    const titleLower = q.title.toLowerCase();
    const descLower = q.description.toLowerCase();
    const tagsLower = q.tags.map((t) => t.toLowerCase());
    const catLower = q.category.toLowerCase();
    const subLower = (q.subcategory || '').toLowerCase();

    profile.keywords.forEach((keyword, index) => {
      // 越新的關鍵字權重稍微更高（遞減系數）
      const recencyWeight = Math.max(0.6, 1 - index * 0.05);

      if (titleLower.includes(keyword)) {
        score += 50 * recencyWeight;
      }
      if (tagsLower.some((t) => t.includes(keyword) || keyword.includes(t))) {
        score += 40 * recencyWeight;
      }
      if (subLower.includes(keyword) || catLower.includes(keyword)) {
        score += 35 * recencyWeight;
      }
      if (descLower.includes(keyword)) {
        score += 20 * recencyWeight;
      }
    });
  }

  // 3. 看板加權 (Categories & Subcategories)
  if (profile.subcategories && q.subcategory) {
    const subIndex = profile.subcategories.indexOf(q.subcategory);
    if (subIndex !== -1) {
      score += Math.max(20, 60 - subIndex * 5); // 最近看過的子看板給予極高加分
    }
  }

  if (profile.categories && profile.categories.length > 0) {
    const catIndex = profile.categories.indexOf(q.category);
    if (catIndex !== -1) {
      score += Math.max(15, 40 - catIndex * 5);
    }
  }

  // 4. 主題專區加權 (Special Zones)
  if (profile.specialZones && profile.specialZones.length > 0) {
    if (profile.specialZones.includes('high_bounty') && q.bounty >= 5000) {
      score += 25;
    }
    if (profile.specialZones.includes('urgent') && (q.level === 'L3' || q.level === 'L4')) {
      score += 25;
    }
    if (profile.specialZones.includes('beginner') && (q.level === 'L0' || q.level === 'L1')) {
      score += 20;
    }
  }

  // 5. 標籤加權 (Tags)
  if (profile.tags && profile.tags.length > 0 && q.tags) {
    const qTagsLower = q.tags.map((t) => t.toLowerCase());
    profile.tags.forEach((tag) => {
      if (qTagsLower.includes(tag)) {
        score += 15;
      }
    });
  }

  // 6. 狀態加分：招募中（open）給予基本推薦優勢
  if (q.status === 'open') {
    score += 25;
  }

  // 7. 懸賞金額與方案活躍度自然微調
  if (q.bounty > 0) {
    score += Math.min(30, Math.log10(q.bounty + 1) * 6);
  }
  const qAnswers = answers.filter((a) => a.questionId === q.id);
  score += Math.min(20, qAnswers.length * 3);

  // 8. 發布時間新鮮度（微加分，避免老問題永遠霸榜）
  const createdTime = new Date(q.createdAt).getTime();
  const now = Date.now();
  const daysOld = Math.max(0, (now - createdTime) / (1000 * 60 * 60 * 24));
  const freshnessBonus = Math.max(0, 15 - daysOld);
  score += freshnessBonus;

  return score;
}

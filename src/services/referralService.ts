import { User, Transaction } from '../types';

/**
 * 產生具有高熵值、不可從公開 ID 推測的隨機專屬推薦碼（例如：IX-9K4M7P）
 */
function generateSaltedRandomCode(seed: string): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 排除易混淆字元 0, O, 1, I
  let h1 = 0xdeadbeef ^ 1337;
  let h2 = 0x41c6ce57 ^ 2026;
  const salted = `ideax_salt_secure_${seed}_2026_salt_entropy`;
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  let num = Math.abs(h1 ^ h2);
  let res = '';
  for (let i = 0; i < 6; i++) {
    res += chars[num % chars.length];
    num = Math.floor(num / chars.length) ^ (Math.abs(h2) >>> (i * 4));
    num = Math.abs(num);
  }
  return `IX-${res}`;
}

/**
 * 取得用戶專屬且完全隨機亂碼的推薦碼（例如：IX-9K4M7P）
 * ⚠️ 嚴格禁止使用用戶公開的 ID 當作推薦碼！
 */
export function getUserReferralCode(user: User): string {
  if (!user || user.id === 'user-guest') return 'IX-GUEST';

  // 1. 若用戶已有儲存專屬的 referralCode（且不等於公開的 userId 或 username）
  if (
    user.referralCode &&
    user.referralCode.trim() &&
    user.referralCode.trim().toUpperCase() !== user.id.toUpperCase() &&
    (!user.username || user.referralCode.trim().toUpperCase() !== user.username.toUpperCase())
  ) {
    return user.referralCode.trim().toUpperCase();
  }

  // 2. 檢查本地持久化儲存的隨機推薦碼
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`ideax_user_random_code_${user.id}`);
      if (stored && stored.trim() && !stored.startsWith('USER-') && stored !== user.id) {
        user.referralCode = stored.trim().toUpperCase();
        return user.referralCode;
      }
    } catch {}
  }

  // 3. 生成確定性高熵不可逆之隨機亂碼（非公開 ID）
  const generated = generateSaltedRandomCode(user.id);
  user.referralCode = generated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`ideax_user_random_code_${user.id}`, generated);
    } catch {}
  }
  return generated;
}

/**
 * 只複製推薦代碼，絕不包含任何網址或其他文字
 */
export async function copyPureReferralCode(code: string): Promise<boolean> {
  const pureCode = code.trim();
  if (!pureCode) return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(pureCode);
      return true;
    }
  } catch (e) {
    console.warn('Clipboard writeText failed, trying fallback:', e);
  }

  // 降級方案：純 input 選取複製純文字
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = pureCode;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (e) {
    console.error('Fallback copy failed:', e);
  }

  return false;
}

/**
 * 檢查輸入字串是否為公開可見之用戶資訊（帳號 ID、用戶名、會員編號、暱稱等）
 * 若是，立即回傳判定，嚴格禁止作為推薦碼兌換！
 */
export function isPublicIdentityString(code: string, availableUsers: User[] = []): boolean {
  const target = code.trim().toUpperCase();
  if (!target) return false;

  // 1. 常見公開前綴特徵
  if (
    target.startsWith('USER-') ||
    target.startsWith('VP-USER') ||
    target.startsWith('AUTHOR-') ||
    /^C\d{8,}/i.test(target) ||
    /^A\d{8,}/i.test(target)
  ) {
    return true;
  }

  // 2. 比對所有會員之公開 ID、username、memberId、name
  for (const u of availableUsers) {
    if (!u) continue;
    if (u.id && u.id.trim().toUpperCase() === target) return true;
    if (u.username && u.username.trim().toUpperCase() === target) return true;
    if (u.memberId && u.memberId.trim().toUpperCase() === target) return true;
    if (u.name && u.name.trim().toUpperCase() === target) return true;
  }

  return false;
}

/**
 * 嚴格查核推薦碼是否有對應的平台真實會員或推廣大使
 * 杜絕隨意亂填代碼或填寫公開用戶 ID 也能兌換點數之漏洞
 */
export function findReferrerUser(cleanCode: string, availableUsers: User[]): User | null {
  const target = cleanCode.trim().toUpperCase();
  if (!target || target.length < 5) return null;

  // ⚠️ 嚴格禁止輸入任何公開的用戶 ID、帳號名或會員編號！公開 ID 絕不能被當作推薦碼兌換！
  if (isPublicIdentityString(target, availableUsers)) {
    return null;
  }

  for (const u of availableUsers) {
    if (!u || u.id === 'user-guest') continue;

    // 嚴格比對專屬隨機亂碼推薦碼 (例如 IX-9K4M7P)
    const userCode = getUserReferralCode(u).toUpperCase();
    if (userCode === target) {
      return u;
    }

    // 比對用戶資料庫中明確指定且非公開 ID 的專屬 referralCode
    if (
      u.referralCode &&
      u.referralCode.trim().toUpperCase() === target &&
      target !== u.id.toUpperCase() &&
      (!u.username || target !== u.username.toUpperCase()) &&
      (!u.memberId || target !== u.memberId.toUpperCase()) &&
      target !== u.name?.toUpperCase() &&
      (u.referralCode.startsWith('IX-') || u.referralCode.startsWith('STAR-') || u.referralCode.startsWith('AMB-'))
    ) {
      return u;
    }

    // 比對推廣大使隨機推薦碼 (STAR-XXXXXX, AMB-XXXXXX)
    const ambCode = (u as any).ambassadorReferralCode;
    if (typeof ambCode === 'string' && ambCode.trim().toUpperCase() === target) {
      return u;
    }
  }

  return null;
}

export interface ReferralHistoryItem {
  id: string;
  code: string;
  sharerId?: string;
  sharerName: string;
  timestamp: string;
  points: number;
}

/**
 * 取得當前用戶的推薦人數據統計（推薦好友數、累積獎勵點數、已兌換紀錄清單）
 */
export function getReferralStats(userId: string): {
  successfulCount: number;
  totalPointsEarned: number;
  redemptionHistory: ReferralHistoryItem[];
} {
  if (typeof window === 'undefined' || !userId) {
    return { successfulCount: 0, totalPointsEarned: 0, redemptionHistory: [] };
  }

  try {
    const rawHistory = localStorage.getItem(`ideax_referral_redemptions_${userId}`);
    const redemptionHistory: ReferralHistoryItem[] = rawHistory ? JSON.parse(rawHistory) : [];
    const successfulCount = Number(localStorage.getItem(`ideax_referral_success_count_${userId}`)) || 0;
    const totalPointsEarned = Number(localStorage.getItem(`ideax_referral_points_earned_${userId}`)) || successfulCount * 100;

    return {
      successfulCount,
      totalPointsEarned,
      redemptionHistory,
    };
  } catch {
    return { successfulCount: 0, totalPointsEarned: 0, redemptionHistory: [] };
  }
}

/**
 * 記錄一次成功兌換（不限次數，推薦越多獎勵越多）
 */
export function recordReferralRedemption(
  redeemerUser: User,
  sharerUser: User | null,
  cleanCode: string
): void {
  if (typeof window === 'undefined') return;

  const nowIso = new Date().toISOString();
  const redemptionItem: ReferralHistoryItem = {
    id: `ref-rd-${Date.now()}`,
    code: cleanCode,
    sharerId: sharerUser?.id,
    sharerName: sharerUser?.name || cleanCode,
    timestamp: nowIso,
    points: 100,
  };

  // 1. 記錄於兌換者本地歷史
  try {
    const raw = localStorage.getItem(`ideax_referral_redemptions_${redeemerUser.id}`);
    const list: ReferralHistoryItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(redemptionItem);
    localStorage.setItem(`ideax_referral_redemptions_${redeemerUser.id}`, JSON.stringify(list));
  } catch {}

  // 2. 記錄於分享者（推薦人）本地成就累計
  if (sharerUser?.id) {
    try {
      const curCount = Number(localStorage.getItem(`ideax_referral_success_count_${sharerUser.id}`)) || 0;
      const curPoints = Number(localStorage.getItem(`ideax_referral_points_earned_${sharerUser.id}`)) || 0;
      localStorage.setItem(`ideax_referral_success_count_${sharerUser.id}`, String(curCount + 1));
      localStorage.setItem(`ideax_referral_points_earned_${sharerUser.id}`, String(curPoints + 100));
    } catch {}
  }
}

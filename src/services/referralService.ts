import { User, Transaction } from '../types';

/**
 * 取得用戶專屬且乾淨易讀的推薦碼（例如：IX-884920 或大寫用戶代碼）
 */
export function getUserReferralCode(user: User): string {
  if (user.referralCode && user.referralCode.trim()) {
    return user.referralCode.trim().toUpperCase();
  }
  if (user.username && user.username.length >= 3 && !user.username.startsWith('user-')) {
    return user.username.toUpperCase();
  }
  const raw = (user.id || 'user').replace(/^user-/, '').replace(/[^a-zA-Z0-9]/g, '');
  const suffix = raw.slice(-6).toUpperCase().padStart(6, '8');
  return `IX-${suffix}`;
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

import { User } from '../types';
import { resolveIdCategory, UserIdentificationLike } from '../services/userIdService';

export const DEACTIVATED_USER_NAME = '此帳號已註銷';

// 灰色中性匿名頭像
export const DEACTIVATED_USER_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/%3E%3C/svg%3E';

/**
 * 檢查該使用者是否已正式註銷帳號
 */
export function isUserAccountDeactivated(
  userId?: string,
  userOrUsersList?: User | User[]
): boolean {
  if (!userId) return false;

  const checkUser = (u: User): boolean => {
    if (u.id !== userId) return false;
    if (u.name === DEACTIVATED_USER_NAME || u.name === '此帳號已註銷') return true;
    if (u.deactivationStatus === 'deactivated') return true;
    if (u.isDeactivated) {
      if (
        !u.deactivationScheduledPurgeAt ||
        Date.now() >= new Date(u.deactivationScheduledPurgeAt).getTime()
      ) {
        return true;
      }
    }
    return false;
  };

  if (userOrUsersList && !Array.isArray(userOrUsersList)) {
    return checkUser(userOrUsersList);
  }

  if (Array.isArray(userOrUsersList)) {
    const u = userOrUsersList.find((item) => item.id === userId);
    if (u) {
      return checkUser(u);
    }
  }

  return false;
}

/**
 * 取得顯示的使用者名稱（若已註銷則顯示「此帳號已註銷」）
 * 依平台規範：企業機構不是在名字裡加上文字說明，而是讓文字變色分辨，因此去除名稱中的「(企業機構)」等文字說明
 */
export function resolveUserDisplayName(
  userId?: string,
  fallbackName?: string,
  usersList?: User[]
): string {
  if (fallbackName === DEACTIVATED_USER_NAME || fallbackName === '此帳號已註銷') {
    return DEACTIVATED_USER_NAME;
  }
  if (isUserAccountDeactivated(userId, usersList)) {
    return DEACTIVATED_USER_NAME;
  }
  let name = fallbackName || '';
  if (userId && usersList) {
    const matched = usersList.find((u) => u.id === userId);
    if (matched && matched.name) {
      name = matched.name;
    }
  }
  if (!name) name = '使用者';
  // 去除文字註解（如「(企業機構)」、「(測試專家/解答者)」、「(一般用戶)」、「(管理員)」等）
  return name
    .replace(/\s*[\(（][^()]*?(?:機構|用戶|管理|法人|專家|解答|提問|測試)[^()]*?[\)）]/g, '')
    .trim();
}

/**
 * 依身分取得使用者名稱文字顏色分辨 class（微亮清晰明朗、質感高級）：
 * 紫色：管理員 (text-purple-700)
 * 藍色：企業機構 (text-blue-700)
 * 綠色：認證專家 (text-emerald-700)
 * 黑色：一般用戶 (text-stone-800)
 */
export function getUserNameColorClass(
  userId?: string,
  usersList?: User[],
  userFallback?: UserIdentificationLike
): string {
  let targetUser: (UserIdentificationLike & { verifiedExpert?: boolean; verifiedBadge?: string }) | undefined = userFallback as any;
  if (userId && usersList) {
    const matched = usersList.find((u) => u.id === userId);
    if (matched) {
      targetUser = { ...matched, ...targetUser };
    }
  }

  // 1. 管理員 (紫色，暗調沉穩威嚴)
  if (
    targetUser?.role === 'admin' ||
    targetUser?.accountType === 'admin' ||
    targetUser?.id === 'user-admin' ||
    targetUser?.id === 'a000000001' ||
    targetUser?.memberId === 'a000000001' ||
    targetUser?.isOfficial ||
    (typeof userId === 'string' && (userId === 'user-admin' || userId === 'a000000001')) ||
    (targetUser?.name && (targetUser.name.includes('管理團隊') || targetUser.name.includes('管理員') || targetUser.name.includes('系統管理')))
  ) {
    return 'text-purple-900 font-bold';
  }

  // 2. 企業機構 (藍色，深邃海藍)
  if (
    targetUser?.accountType === 'enterprise' ||
    targetUser?.role === 'enterprise' ||
    targetUser?.subscriptionTier === 'enterprise' ||
    (targetUser?.memberId && targetUser.memberId.startsWith('b')) ||
    (targetUser?.id && targetUser.id.startsWith('b')) ||
    (typeof userId === 'string' && userId.startsWith('b')) ||
    Boolean(targetUser?.company && targetUser.company.trim() && (targetUser.company.includes('公司') || targetUser.company.includes('科技') || targetUser.company.includes('事務所') || targetUser.company.includes('企業') || targetUser.company.includes('團隊'))) ||
    Boolean(targetUser?.name && (targetUser.name.includes('公司') || targetUser.name.includes('科技') || targetUser.name.includes('事務所') || targetUser.name.includes('企業') || targetUser.name.includes('機構') || targetUser.name.includes('法人') || targetUser.name.includes('團隊'))) ||
    Boolean(targetUser?.title && (targetUser.title.includes('企業') || targetUser.title.includes('機構') || targetUser.title.includes('法人') || targetUser.title.includes('科技')))
  ) {
    return 'text-blue-900 font-bold';
  }

  // 3. 認證專家 (綠色，深林翠綠)
  const isExpert =
    targetUser?.verifiedExpert ||
    Boolean(targetUser?.verifiedBadge) ||
    targetUser?.role === 'solver' ||
    targetUser?.id === 'c200000002' ||
    targetUser?.memberId === 'c200000002' ||
    (typeof userId === 'string' && (userId === 'c200000002' || userId.startsWith('c') || userId.startsWith('solver'))) ||
    (targetUser?.title && (targetUser.title.includes('專家') || targetUser.title.includes('顧問') || targetUser.title.includes('架構師') || targetUser.title.includes('分析師') || targetUser.title.includes('策略師'))) ||
    (targetUser?.name && (targetUser.name.includes('專家') || targetUser.name.includes('解答者') || targetUser.name.includes('顧問'))) ||
    targetUser?.subscriptionTier === 'expert' ||
    targetUser?.subscriptionTier === 'authority' ||
    targetUser?.subscriptionTier === 'master';

  if (isExpert) {
    return 'text-emerald-800 font-bold';
  }

  // 4. 一般用戶 (深炭黑)
  return 'text-stone-900 font-bold';
}

/**
 * 取得顯示的使用者頭像（若已註銷則顯示灰色頭像）
 */
export function resolveUserAvatar(
  userId?: string,
  fallbackAvatar?: string,
  usersList?: User[]
): string {
  if (fallbackAvatar === DEACTIVATED_USER_AVATAR) {
    return DEACTIVATED_USER_AVATAR;
  }
  if (isUserAccountDeactivated(userId, usersList)) {
    return DEACTIVATED_USER_AVATAR;
  }
  return (
    fallbackAvatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );
}

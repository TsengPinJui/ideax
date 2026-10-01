import { User } from '../types';

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
  return fallbackName || '使用者';
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

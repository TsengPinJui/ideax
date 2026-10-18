import { auth } from './firebase';

/**
 * 站內帳號 ID ↔ Firebase 登入帳號 UID 的對照
 *
 * 資料庫規則以「Firebase 登入帳號」判斷誰能讀寫私訊、通知與交易，
 * 所以寫入這些資料時，要把相關的人換成他們的 Firebase UID 一起存。
 */

const directory = new Map<string, string>();

/** Firebase UID 的格式（28 碼英數字） */
export function looksLikeFirebaseUid(id: string | undefined | null): boolean {
  return typeof id === 'string' && /^[A-Za-z0-9]{20,40}$/.test(id);
}

/** 由 AppContext 在會員清單變動時更新 */
export function updateAuthUidDirectory(users: Array<{ id: string; authUid?: string }>) {
  directory.clear();
  for (const u of users || []) {
    if (!u?.id) continue;
    if (u.authUid) directory.set(u.id, u.authUid);
    else if (looksLikeFirebaseUid(u.id)) directory.set(u.id, u.id);
  }
}

/** 目前登入的 Firebase UID（未登入 Firebase 時為 null） */
export function getMyAuthUid(): string | null {
  return auth.currentUser?.uid || null;
}

/** 把站內帳號 ID 換成 Firebase UID；找不到時回傳 null */
export function resolveAuthUid(appUserId: string | undefined | null, myAppUserId?: string): string | null {
  if (!appUserId) return null;
  if (myAppUserId && appUserId === myAppUserId) return getMyAuthUid();
  return directory.get(appUserId) || (looksLikeFirebaseUid(appUserId) ? appUserId : null);
}

let myAppUserIdRef: string | null = null;
export function setMyAppUserId(id: string | null) {
  myAppUserIdRef = id;
}
export function getMyAppUserId(): string | null {
  return myAppUserIdRef;
}

/** 一組站內帳號 ID → 去重後的 Firebase UID 清單（一定包含自己，讓自己之後還能讀寫） */
export function resolveAuthUids(appUserIds: Array<string | undefined | null>): string[] {
  const set = new Set<string>();
  for (const id of appUserIds) {
    const uid = resolveAuthUid(id, myAppUserIdRef || undefined);
    if (uid) set.add(uid);
  }
  const mine = getMyAuthUid();
  if (mine && myAppUserIdRef && appUserIds.includes(myAppUserIdRef)) set.add(mine);
  return Array.from(set);
}

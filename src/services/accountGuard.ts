import type { User as FbUser } from 'firebase/auth';

/**
 * 帳號切換的安全檢查：網站上的「目前身分」只能是「真的用 Firebase 登入的那個帳號」。
 * 以前切換帳號不用密碼，清單裡還自動放了管理員與測試帳號，任何人都能點一下變成別人（含管理員）。
 */

// 管理員 Email 白名單（建置時由環境變數 ADMIN_EMAILS 注入，多組以逗號分隔）
const ADMIN_EMAIL_ALLOWLIST: string[] = String(process.env.ADMIN_EMAILS || 'ideax.office@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** 管理員帳號 admin_001 登入時實際使用的信箱（白名單第一個） */
export const ADMIN_LOGIN_EMAIL = ADMIN_EMAIL_ALLOWLIST[0] || 'ideax.office@gmail.com';

export const isAllowlistedAdminEmail = (email: string): boolean => ADMIN_EMAIL_ALLOWLIST.includes(String(email || '').trim().toLowerCase());

/** 本機開發（localhost）才允許不登入就切換身分做測試；正式站一律要登入 */
export const isLocalDevHost = (): boolean =>
  typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

type AccountLike = { id: string; authUid?: string; email?: string; role?: string };

/** 目前登入的 Firebase 帳號，能不能以這個站內帳號的身分使用網站 */
export function isAuthorizedForAccount(target: AccountLike | null | undefined, fbUser: FbUser | null | undefined): boolean {
  if (!target) return false;
  if (target.id === 'user-guest') return true;
  if (isLocalDevHost()) return true;
  if (!fbUser) return false;
  if (target.authUid && target.authUid === fbUser.uid) return true;
  if (target.id === fbUser.uid) return true;
  const email = String(fbUser.email || '').toLowerCase();
  // 管理員帳號：白名單 Email 且已完成 Email 驗證
  if (target.role === 'admin') return !!email && isAllowlistedAdminEmail(email) && fbUser.emailVerified === true;
  if (email && target.email && target.email.toLowerCase() === email) return true;
  return false;
}

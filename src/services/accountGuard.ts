import type { User as FbUser } from 'firebase/auth';

/**
 * 帳號切換的安全檢查：網站上的「目前身分」只能是「真的用 Firebase 登入的那個帳號」。
 * 以前切換帳號不用密碼，清單裡還自動放了管理員與測試帳號，任何人都能點一下變成別人（含管理員）。
 */

// 管理員 Email 白名單（建置時由環境變數 ADMIN_EMAILS 注入，多組以逗號分隔）
const ADMIN_EMAIL_ALLOWLIST: string[] = String(process.env.ADMIN_EMAILS || 'john25893619@gmail.com,c502828987@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAllowlistedAdminEmail = (email: string): boolean => ADMIN_EMAIL_ALLOWLIST.includes(String(email || '').trim().toLowerCase());

/** 本機開發（localhost）才允許不登入就切換身分做測試；正式站一律要登入 */
export const isLocalDevHost = (): boolean =>
  typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

type AccountLike = { id: string; authUid?: string; email?: string; role?: string };

/**
 * 示範測試帳號：只有「已登入且 Email 已驗證的白名單管理員」可以不用密碼直接切換過去檢視與測試，
 * 其他人一律要用該帳號自己的 Email 與密碼登入。
 */
export const DEMO_ACCOUNTS: Array<{ id: string; aliases: string[]; label: string }> = [
  { id: 'c200000002', aliases: ['solver-2'], label: '認證專家' },
  { id: 'c100000001', aliases: ['user-questioner'], label: '提問者' },
  { id: 'b100000001', aliases: [], label: '企業' },
];
export const isDemoAccountId = (id?: string): boolean =>
  !!id && DEMO_ACCOUNTS.some((d) => d.id === id || d.aliases.includes(id));

/** 目前 Firebase 登入的是白名單管理員（Email 已驗證或授權 UID） */
export const isVerifiedAdminFirebaseUser = (fbUser: FbUser | null | undefined): boolean => {
  if (!fbUser) return false;
  if (fbUser.uid === 'ZRXZWS8iiPg91CUV6vQrehK6ZW62' || fbUser.uid === '3uFheztxFGUlsLy2hbVHNVFduTK2') return true;
  return fbUser.emailVerified === true && !!fbUser.email && isAllowlistedAdminEmail(fbUser.email);
};

/** 管理員切到示範帳號前的管理員帳號編號（用來「回到管理員」） */
export const ADMIN_RETURN_KEY = 'ideax_admin_demo_return_id';

/** 目前登入的 Firebase 帳號，能不能以這個站內帳號的身分使用網站 */
export function isAuthorizedForAccount(target: AccountLike | null | undefined, fbUser: FbUser | null | undefined): boolean {
  if (!target) return false;
  if (target.id === 'user-guest') return true;
  if (isLocalDevHost()) return true;
  if (!fbUser) return false;
  // 管理員可以直接使用示範測試帳號（其他人不行）
  if (isDemoAccountId(target.id) && isVerifiedAdminFirebaseUser(fbUser)) return true;
  if (target.authUid && target.authUid === fbUser.uid) return true;
  if (target.id === fbUser.uid) return true;
  const email = String(fbUser.email || '').toLowerCase();
  // 管理員帳號：白名單最高管理員 Email 或已被授權指派為管理員的用戶帳號
  if (target.role === 'admin') {
    if (!!email && isAllowlistedAdminEmail(email)) return true;
    if (target.authUid && target.authUid === fbUser.uid) return true;
    if (target.id === fbUser.uid) return true;
    if (email && target.email && target.email.toLowerCase() === email) return true;
    return false;
  }
  if (email && target.email && target.email.toLowerCase() === email) return true;
  return false;
}

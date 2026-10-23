import { User, AdminSite } from '../types';

import { isAllowlistedAdminEmail } from '../services/accountGuard';

/**
 * 判定用戶是否為平台初始創始管理員（唯一具有指派其他用戶管理員權限之最高主管）
 * 包含固定系統初始管理員帳號：a000000001, user-admin, 或 isInitialAdmin: true, 以及白名單最高管理員 Email
 */
export function isInitialAdmin(user?: User | null): boolean {
  if (!user) return false;
  return Boolean(
    user.isInitialAdmin === true ||
    user.id === 'a000000001' ||
    user.id === 'user-admin' ||
    user.memberId === 'a000000001' ||
    user.username === 'Admin_001' ||
    (user.email && isAllowlistedAdminEmail(user.email)) ||
    user.role === 'admin'
  );
}

/**
 * 判定用戶是否具備 A 站（IdeaX 創點子主站）管理員權限
 * A 站管理員職權：主站問題市場管理、專家認證受理審核、懸賞點數託管撥付、會員個資與申訴仲裁
 */
export function isSiteAAdmin(user?: User | null): boolean {
  if (!user) return false;
  // 初始管理員自動擁有雙站最高管轄權
  if (isInitialAdmin(user)) return true;
  if (user.role !== 'admin' && user.accountType !== 'admin') return false;
  // 若為管理員但未設定 adminSites，向後相容預設具備 A 站權限
  if (!user.adminSites || user.adminSites.length === 0) return true;
  return user.adminSites.includes('site_a');
}

/**
 * 判定用戶是否具備 B 站（創星季賽事專區）管理員權限
 * B 站管理員職權：創星季參賽提案審查、決審評分、賽事大獎核發、規章條款機密存檔歸檔
 */
export function isSiteBAdmin(user?: User | null): boolean {
  if (!user) return false;
  // 初始管理員自動擁有雙站最高管轄權
  if (isInitialAdmin(user)) return true;
  if (user.role !== 'admin' && user.accountType !== 'admin') return false;
  // 需明確在 adminSites 中包含 'site_b'
  if (!user.adminSites) return false;
  return user.adminSites.includes('site_b');
}

/**
 * 取得用戶的管理員站點權限標籤文字
 */
export function getAdminSiteLabel(user?: User | null): string {
  if (!user || (user.role !== 'admin' && user.accountType !== 'admin')) return '';
  if (isInitialAdmin(user)) return '👑 平台初始總管理員 (雙站全權)';
  const hasA = isSiteAAdmin(user);
  const hasB = isSiteBAdmin(user);
  if (hasA && hasB) return '👑 雙站管理員 (A站主站＋B站創星季)';
  if (hasA) return '🅰️ A站管理員 (IdeaX 主站專屬)';
  if (hasB) return '🅱️ B站管理員 (創星季賽事專屬)';
  return '👑 管理員';
}

/**
 * 取得管理員標籤對應的樣式與徽章顏色
 */
export function getAdminSiteBadgeClass(user?: User | null): string {
  if (!user || (user.role !== 'admin' && user.accountType !== 'admin')) return '';
  if (isInitialAdmin(user)) return 'bg-amber-100 text-amber-900 border-amber-300';
  const hasA = isSiteAAdmin(user);
  const hasB = isSiteBAdmin(user);
  if (hasA && hasB) return 'bg-purple-100 text-purple-900 border-purple-300';
  if (hasA) return 'bg-blue-100 text-blue-900 border-blue-300';
  if (hasB) return 'bg-rose-100 text-rose-900 border-rose-300';
  return 'bg-purple-100 text-purple-900 border-purple-300';
}

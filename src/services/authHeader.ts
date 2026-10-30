import { auth } from './firebase';

/**
 * 呼叫需要身分驗證的後端 API 時使用。
 * 若目前有 Firebase 登入工作階段，附上 ID Token 讓後端驗證身分與管理員權限。
 */
export async function getAuthHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  let user = auth.currentUser;
  if (!user && typeof (auth as any).authStateReady === 'function') {
    try {
      await Promise.race([
        (auth as any).authStateReady(),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
      user = auth.currentUser;
    } catch {
      // ignore
    }
  }
  try {
    const rawUser = typeof localStorage !== 'undefined' ? localStorage.getItem('ideax_v2_user') : null;
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed && (parsed.role === 'admin' || parsed.accountType === 'admin' || parsed.id === 'user-admin' || parsed.id === 'a000000001')) {
        headers['X-IdeaX-Admin-Id'] = String(parsed.authUid || parsed.id || 'a000000001');
      }
    }
  } catch {
    // ignore
  }
  if (!user) return headers;
  try {
    const idToken = await user.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  } catch {
    // 取不到 Token 時以未登入身分呼叫，由後端決定是否拒絕
  }
  return headers;
}


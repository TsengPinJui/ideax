import { auth } from './firebase';

/**
 * 呼叫需要身分驗證的後端 API 時使用。
 * 若目前有 Firebase 登入工作階段，附上 ID Token 讓後端驗證身分與管理員權限。
 */
export async function getAuthHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const user = auth.currentUser;
  if (!user) return headers;
  try {
    const idToken = await user.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  } catch {
    // 取不到 Token 時以未登入身分呼叫，由後端決定是否拒絕
  }
  return headers;
}

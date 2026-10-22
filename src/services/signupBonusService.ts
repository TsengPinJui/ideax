import { getAuthHeaders } from './authHeader';

export interface SignupBonusResult {
  balance: number;
  granted: boolean;
}

/** 新註冊平台點獎勵由伺服器按 Firebase 身分與一次性帳本核發。 */
export async function claimSignupBonus(): Promise<SignupBonusResult> {
  let lastError = '200 平台點尚未入帳，請稍後重新登入再試';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch('/api/auth/claim-signup-bonus', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        return { balance: Number(data.balance) || 0, granted: Boolean(data.granted) };
      }
      lastError = data.error || `註冊獎勵入帳失敗（${response.status}）`;
      if (response.status !== 404 && response.status < 500) break;
    } catch {
      lastError = '目前無法連線確認 200 平台點入帳，請稍後再試';
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw new Error(lastError);
}

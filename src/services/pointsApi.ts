import { getAuthHeaders } from './authHeader';

/**
 * 點數異動一律經由伺服器帳本（/api/points/op）。
 * 資料庫規則禁止前端直接改點數餘額，成功後以伺服器回傳的餘額為準。
 */
export type PointsOpPayload =
  | { op: 'spend'; amount: number; purpose: 'tip' | 'unlock' | 'promote' | 'service' | 'chat_offer' | 'subscription' | 'withdraw'; refId?: string; toUserId?: string; note?: string }
  | { op: 'escrow_hold'; amount: number; refId: string; note?: string }
  | { op: 'escrow_release'; amount: number; refId: string; mode: 'refund' | 'payout'; payerUserId?: string; note?: string }
  | { op: 'admin_adjust'; userId: string; delta: number; note?: string }
  | { op: 'subscribe'; tier: string; cycle?: string }
  | { op: 'payout_request'; amount: number; note?: string };

export type PointsOpResult =
  | {
      ok: true;
      userId: string;
      balance: number;
      withheldPoints: number;
      subscriptionTier?: string;
      subscriptionExpiresAt?: string;
      tipReceivablesPoints?: number;
    }
  | { ok: false; error: string; status: number };

export async function pointsOp(payload: PointsOpPayload): Promise<PointsOpResult> {
  try {
    const res = await fetch('/api/points/op', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error || `點數處理失敗（${res.status}）`, status: res.status };
    }
    return {
      ok: true,
      userId: data.userId,
      balance: Number(data.balance) || 0,
      withheldPoints: Number(data.withheldPoints) || 0,
      subscriptionTier: data.subscriptionTier,
      subscriptionExpiresAt: data.subscriptionExpiresAt,
      tipReceivablesPoints: typeof data.tipReceivablesPoints === 'number' ? data.tipReceivablesPoints : undefined,
    };
  } catch {
    return { ok: false, error: '無法連線到伺服器，點數未異動', status: 0 };
  }
}

/** 資料庫規則禁止前端修改的會員欄位（點數與權限相關） */
export const PROTECTED_USER_FIELDS = [
  'balance',
  'withheldPoints',
  'pendingEarnings',
  'tipReceivablesPoints',
  'thisWeekTipPoints',
  'totalWithdrawn',
  'isBlocked',
  'blockedReason',
  'blockedUntil',
  'blockedAt',
  'blockedByAdminName',
  'adminSites',
  'isSiteAAdmin',
  'isSiteBAdmin',
  'adminIdentityBadge',
  'isInitialAdmin',
  'subscriptionTier',
  'subscriptionExpiresAt',
] as const;

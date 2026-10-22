import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken, isVerifiedAdmin } from './competitionService';

/**
 * 簡易記憶體型流量限制（每個 IP 在時間窗內的最大請求數）。
 * 用途：避免 AI 端點被無限呼叫燒掉 Gemini 費用、驗證碼被暴力寄送。
 * 註：多台伺服器同時運行時各自計數，若日後擴充可改用 Redis 等共享儲存。
 */
export function rateLimit(options: { windowMs: number; max: number; name: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // 定期清除過期紀錄，避免記憶體無限成長
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, Math.max(options.windowMs, 60_000)).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > options.max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: `請求過於頻繁，請 ${retryAfterSec} 秒後再試。`,
        limiter: options.name,
      });
    }
    next();
  };
}

/** 僅允許已驗證的管理員（/admins/{uid} 或 Custom Claims admin=true）通過 */
export async function requireAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(403).json({
        success: false,
        error: req.headers.authorization
          ? '未授權：登入憑證無效或已過期，請登出後重新以管理員 Email 登入'
          : '未授權：沒有登入憑證，請以管理員 Email 登入（不能用本機帳號切換）',
      });
    }
    if (!(await isVerifiedAdmin(authUser.uid))) {
      return res.status(403).json({
        success: false,
        error: `未授權：${authUser.email || authUser.uid} 不在管理員名單。請確認 Vercel 的 ADMIN_EMAILS 包含此 Email 且已完成 Email 驗證，或在 Firestore 的 admins 建立文件 ${authUser.uid}`,
      });
    }
    next();
  } catch {
    return res.status(403).json({ success: false, error: '未授權：僅限認證管理員' });
  }
}

/**
 * 需要登入的 AI 端點：要有有效的 Firebase 登入憑證（訪客不能直接呼叫，避免被拿去免費使用付費 AI 功能或灌爆用量）。
 * 客服對話與常見問題（訪客也要能問）不在此限。
 */
const PUBLIC_AI_PATHS = new Set(['/api/ai/customer-support-chat', '/api/ai/faq-agent-consult']);
export async function requireSignedInForAi(req: Request, res: Response, next: NextFunction) {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (PUBLIC_AI_PATHS.has(path)) return next();
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) return res.status(401).json({ success: false, error: '請先登入再使用 AI 功能' });
    (req as any).authUser = authUser;
    next();
  } catch {
    return res.status(401).json({ success: false, error: '請先登入再使用 AI 功能' });
  }
}

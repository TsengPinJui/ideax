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
    if (!authUser || !(await isVerifiedAdmin(authUser.uid))) {
      return res.status(403).json({ success: false, error: '未授權：僅限認證管理員' });
    }
    next();
  } catch {
    return res.status(403).json({ success: false, error: '未授權：僅限認證管理員' });
  }
}

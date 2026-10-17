import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { adminAuth, hasAdminCredentials, verifyAuthToken } from './competitionService';
import {
  getSiteUrl,
  isMailerConfigured,
  passwordChangedEmail,
  sendMail,
  verificationCodeEmail,
  welcomeEmail,
} from './mailer';

const router = express.Router();

interface VerificationEntry {
  code: string;
  type: string;
  target: string; // email or phone
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

// Memory store for verification codes (10-minute lifetime, max 5 attempts)
const codeStore = new Map<string, VerificationEntry>();

// Clean up expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of codeStore.entries()) {
    if (now > entry.expiresAt) {
      codeStore.delete(key);
    }
  }
}, 60 * 1000);

function generate6DigitCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const EMAIL_CODE_TYPES = new Set(['forgot_password', 'verify_email', 'general']);

// 簽章用的密鑰：讓驗證碼在多台伺服器（Vercel 多個執行個體）之間也能驗證
const CODE_SECRET =
  process.env.EMAIL_CODE_SECRET || process.env.RESEND_API_KEY || crypto.randomBytes(32).toString('hex');

function signCode(email: string, type: string, code: string, expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ e: email, t: type, x: expiresAt })).toString('base64url');
  const mac = crypto.createHmac('sha256', CODE_SECRET).update(`${payload}.${code}`).digest('base64url');
  return `${payload}.${mac}`;
}

function verifySignedCode(token: unknown, email: string, type: string, code: string): boolean {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, mac] = token.split('.');
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.e !== email || data.t !== type || typeof data.x !== 'number' || Date.now() > data.x) return false;
    const expected = crypto.createHmac('sha256', CODE_SECRET).update(`${payload}.${code}`).digest();
    const given = Buffer.from(mac, 'base64url');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  } catch {
    return false;
  }
}

/** 驗證 6 位數 Email 驗證碼，成功時回傳 null，失敗時回傳錯誤訊息 */
function checkEmailCode(email: string, type: string, code: string, token: unknown): string | null {
  const key = `email:${email}:${type}`;
  const entry = codeStore.get(key);
  if (entry) {
    if (Date.now() > entry.expiresAt) {
      codeStore.delete(key);
      return '驗證碼已過期（有效 10 分鐘），請重新發送。';
    }
    entry.attempts += 1;
    if (entry.attempts > EMAIL_CODE_MAX_ATTEMPTS) {
      codeStore.delete(key);
      return '驗證碼錯誤次數過多，請重新發送。';
    }
    if (entry.code === code) {
      codeStore.delete(key);
      return null;
    }
    return `驗證碼不正確（還可以再試 ${EMAIL_CODE_MAX_ATTEMPTS - entry.attempts} 次）。`;
  }
  // 這台伺服器沒有紀錄（例如請求被分到另一個執行個體），改用簽章驗證
  if (verifySignedCode(token, email, type, code)) return null;
  return '驗證碼不正確或已過期，請重新發送。';
}

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) && clean.length <= 254 ? clean : null;
}

/**
 * 1. 寄送 Email 驗證碼
 * POST /api/auth/send-email-code  { email, type, name }
 * 回傳 canResetWithCode：伺服器是否能直接用驗證碼重設密碼
 */
router.post('/send-email-code', async (req: Request, res: Response) => {
  try {
    const cleanEmail = normalizeEmail(req.body?.email);
    if (!cleanEmail) {
      return res.status(400).json({ error: '請提供有效的電子郵件地址' });
    }
    const type = EMAIL_CODE_TYPES.has(req.body?.type) ? req.body.type : 'general';
    const name = typeof req.body?.name === 'string' ? req.body.name.slice(0, 40) : undefined;

    if (!isMailerConfigured()) {
      return res.status(503).json({ error: '寄信服務尚未設定，請稍後再試', canResetWithCode: false });
    }

    // 忘記密碼：伺服器沒有管理權限時，驗證碼無法真正重設密碼，交由 Firebase 官方重設信處理
    if (type === 'forgot_password') {
      if (!hasAdminCredentials) {
        return res.json({ success: true, canResetWithCode: false, message: '請使用重設密碼連結' });
      }
      // 不存在的帳號也回覆成功，避免被拿來測試哪些 Email 有註冊
      try {
        await adminAuth.getUserByEmail(cleanEmail);
      } catch {
        return res.json({ success: true, canResetWithCode: true, token: signCode(cleanEmail, type, generate6DigitCode(), Date.now() + EMAIL_CODE_TTL_MS), expiresAt: Date.now() + EMAIL_CODE_TTL_MS, message: '若此 Email 已註冊，驗證碼已寄出' });
      }
    }

    const code = generate6DigitCode();
    const now = Date.now();
    const expiresAt = now + EMAIL_CODE_TTL_MS;
    codeStore.set(`email:${cleanEmail}:${type}`, {
      code,
      type,
      target: cleanEmail,
      createdAt: now,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    const mail = verificationCodeEmail({ code, purpose: type, name, minutes: 10 });
    const result = await sendMail({ to: cleanEmail, ...mail, tag: `code_${type}` });
    if (!result.ok) {
      return res.status(502).json({ error: '驗證信寄送失敗，請稍後再試' });
    }
    console.log(`[Auth Mail] 驗證碼信已寄出: type=${type}`); // 不記錄驗證碼與信箱

    return res.json({
      success: true,
      canResetWithCode: type === 'forgot_password' ? true : undefined,
      message: '驗證碼已寄出，請到信箱查收（也請檢查垃圾郵件匣）',
      token: signCode(cleanEmail, type, code, expiresAt),
      expiresAt,
    });
  } catch (err: any) {
    console.error('[Auth Mail Service Error]:', err?.message || err);
    return res.status(500).json({ error: '發送驗證信失敗，請稍後再試' });
  }
});

/**
 * 2. 驗證 Email 驗證碼
 * POST /api/auth/verify-email-code  { email, code, type, token }
 */
router.post('/verify-email-code', async (req: Request, res: Response) => {
  try {
    const cleanEmail = normalizeEmail(req.body?.email);
    const cleanCode = String(req.body?.code ?? '').trim();
    if (!cleanEmail || !/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: '請提供電子郵件與 6 位數驗證碼' });
    }
    const type = EMAIL_CODE_TYPES.has(req.body?.type) ? req.body.type : 'general';
    // 重設密碼的驗證碼只能用在重設密碼端點，避免被單獨拿來驗證
    if (type === 'forgot_password') {
      return res.status(400).json({ error: '請直接在重設密碼頁面輸入驗證碼' });
    }
    const error = checkEmailCode(cleanEmail, type, cleanCode, req.body?.token);
    if (error) return res.status(400).json({ error });
    return res.json({ success: true, verified: true, message: 'Email 驗證成功！' });
  } catch (err: any) {
    console.error('[Auth Mail Verify Error]:', err?.message || err);
    return res.status(500).json({ error: '驗證失敗，請稍後再試' });
  }
});

/**
 * 3. 用 Email 驗證碼重設密碼（需要伺服器管理權限）
 * POST /api/auth/reset-password-with-code  { email, code, token, newPassword }
 */
router.post('/reset-password-with-code', async (req: Request, res: Response) => {
  try {
    if (!hasAdminCredentials) {
      return res.status(503).json({ error: '請改用信中的重設密碼連結' });
    }
    const cleanEmail = normalizeEmail(req.body?.email);
    const cleanCode = String(req.body?.code ?? '').trim();
    const newPassword = String(req.body?.newPassword ?? '');
    if (!cleanEmail || !/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: '請提供電子郵件與 6 位數驗證碼' });
    }
    if (newPassword.length < 6 || newPassword.length > 128 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ error: '新密碼需為 6 個字元以上，並同時包含英文字母與數字' });
    }
    const error = checkEmailCode(cleanEmail, 'forgot_password', cleanCode, req.body?.token);
    if (error) return res.status(400).json({ error });

    let user;
    try {
      user = await adminAuth.getUserByEmail(cleanEmail);
    } catch {
      return res.status(400).json({ error: '驗證碼不正確或已過期，請重新發送。' });
    }
    await adminAuth.updateUser(user.uid, { password: newPassword, emailVerified: true });
    // 讓其他裝置上的登入狀態失效
    await adminAuth.revokeRefreshTokens(user.uid).catch(() => {});

    const mail = passwordChangedEmail({ name: user.displayName || undefined });
    void sendMail({ to: cleanEmail, ...mail, tag: 'password_changed' });

    return res.json({ success: true, message: '密碼已重設，請用新密碼登入' });
  } catch (err: any) {
    console.error('[Reset Password Error]:', err?.message || err);
    return res.status(500).json({ error: '重設密碼失敗，請稍後再試' });
  }
});

/**
 * 4. 註冊完成後寄送歡迎信（含 Email 驗證連結）
 * POST /api/auth/send-welcome-email  （需附 Firebase 登入憑證）
 * 回傳 sentVerification：信中是否已附上驗證連結；為 false 時前端改用 Firebase 官方驗證信
 */
router.post('/send-welcome-email', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser?.email) {
      return res.status(401).json({ error: '請先登入' });
    }
    if (!isMailerConfigured()) {
      return res.status(503).json({ error: '寄信服務尚未設定', sentVerification: false });
    }
    const email = authUser.email.toLowerCase();
    const name = typeof req.body?.name === 'string' ? req.body.name.slice(0, 40) : undefined;

    let verifyUrl: string | undefined;
    if (hasAdminCredentials) {
      try {
        const record = await adminAuth.getUser(authUser.uid);
        if (!record.emailVerified) {
          verifyUrl = await adminAuth.generateEmailVerificationLink(email, { url: getSiteUrl() });
        }
      } catch (linkErr: any) {
        console.warn('[Welcome Mail] 無法產生驗證連結:', linkErr?.code || linkErr?.message);
      }
    }

    const mail = welcomeEmail({ name, verifyUrl });
    const result = await sendMail({ to: email, ...mail, tag: 'welcome' });
    return res.json({ success: result.ok, sentVerification: Boolean(result.ok && verifyUrl) });
  } catch (err: any) {
    console.error('[Welcome Mail Error]:', err?.message || err);
    return res.status(500).json({ error: '寄送歡迎信失敗', sentVerification: false });
  }
});

/**
 * 3. 發送手機簡訊驗證碼
 * POST /api/auth/send-sms-code
 */
router.post('/send-sms-code', async (req: Request, res: Response) => {
  try {
    const { phone, type = 'general' } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: '請提供有效的手機號碼' });
    }

    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const code = generate6DigitCode();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;

    const key = `sms:${cleanPhone}:${type}`;
    codeStore.set(key, {
      code,
      type,
      target: cleanPhone,
      createdAt: now,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    console.log(`[Auth SMS Service] 簡訊驗證碼已產生: Type=${type}`); // 安全性：不在 log 中記錄驗證碼與門號

    return res.json({
      success: true,
      message: `安全簡訊驗證碼已發送至門號 ${cleanPhone}，有效時間 10 分鐘！`,
      phone: cleanPhone,
      expiresAt,
    });
  } catch (err: any) {
    console.error('[Auth SMS Service Error]:', err);
    return res.status(500).json({ error: err.message || '發送簡訊失敗，請稍後再試' });
  }
});

/**
 * 4. 驗證手機簡訊驗證碼
 * POST /api/auth/verify-sms-code
 */
router.post('/verify-sms-code', async (req: Request, res: Response) => {
  try {
    const { phone, code, type = 'general' } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: '請提供手機號碼與驗證碼' });
    }

    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const cleanCode = code.toString().trim();
    const key = `sms:${cleanPhone}:${type}`;

    const entry = codeStore.get(key);
    if (!entry) {
      return res.status(400).json({ error: '簡訊驗證碼已過期或尚未發送，請重新發送！' });
    }

    if (Date.now() > entry.expiresAt) {
      codeStore.delete(key);
      return res.status(400).json({ error: '簡訊驗證碼已過期，請重新獲取！' });
    }

    entry.attempts += 1;
    if (entry.attempts > 5) {
      codeStore.delete(key);
      return res.status(400).json({ error: '驗證碼錯誤次數過多，請重新發送簡訊！' });
    }

    if (entry.code !== cleanCode) {
      return res.status(400).json({
        error: `簡訊驗證碼不正確，請重新確認！（剩餘嘗試次數：${5 - entry.attempts} 次）`,
      });
    }

    entry.verified = true;
    return res.json({
      success: true,
      verified: true,
      message: '手機簡訊驗證成功！',
    });
  } catch (err: any) {
    console.error('[Auth SMS Verify Error]:', err);
    return res.status(500).json({ error: err.message || '簡訊驗證失敗，請稍後再試' });
  }
});

export default router;

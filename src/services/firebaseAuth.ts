import { getAuthHeaders } from './authHeader';
import {
  signInWithCustomToken,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  confirmPasswordReset,
  verifyPasswordResetCode,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  updatePassword,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, firebaseConfig } from './firebase';

export async function loginWithFirebaseEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  } catch (error: any) {
    console.warn('Firebase email login error:', error);
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      throw new Error('帳號或密碼不正確，請重新確認後再試！');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('電子郵件格式不正確！');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('登入失敗次數過多，為保護帳號安全，請稍後幾分鐘再試。');
    }
    throw new Error(error.message || '登入失敗，請確認網路連線');
  }
}

export async function registerWithFirebaseEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  } catch (error: any) {
    console.warn('Firebase email register error:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('此電子郵件已被註冊，請直接以該帳號登入！');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('密碼強度不足，請設定至少 6 位元密碼！');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('電子郵件格式不正確！');
    }
    throw new Error(error.message || '註冊失敗，請稍後再試');
  }
}

export async function sendFirebasePasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    console.warn('Firebase password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      throw new Error('找不到此電子郵件註冊的帳號，請確認後再試！');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('電子郵件格式不正確！');
    }
    throw new Error(error.message || '發送密碼重設信失敗，請稍後再試');
  }
}

export async function confirmFirebasePasswordReset(actionCodeOrLink: string, newPassword: string): Promise<string> {
  let oobCode = actionCodeOrLink.trim();
  if (oobCode.includes('oobCode=')) {
    try {
      const url = new URL(oobCode);
      oobCode = url.searchParams.get('oobCode') || oobCode;
    } catch {
      const match = oobCode.match(/oobCode=([^&]+)/);
      if (match) oobCode = match[1];
    }
  }

  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    await confirmPasswordReset(auth, oobCode, newPassword.trim());
    return email;
  } catch (error: any) {
    console.warn('Firebase confirm password reset error:', error);
    if (error.code === 'auth/expired-action-code') {
      throw new Error('此安全認證代碼或連結已過期，請重新發送密碼重設信！');
    } else if (error.code === 'auth/invalid-action-code') {
      throw new Error('此安全認證代碼或連結無效，請確認由信箱取得之完整連結或代碼！');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('新密碼強度不足，請設定至少 6 位元密碼！');
    }
    throw new Error(error.message || '確認重設密碼失敗，請稍後再試');
  }
}


/**
 * 手機瀏覽器：社群登入改用「整頁跳轉」（不開新視窗）。
 * 只在登入處理頁與網站同網域時使用（VITE_FIREBASE_AUTH_DOMAIN），否則跳轉回來會遺失登入狀態。
 */
const SOCIAL_REDIRECT_FLAG = 'ideax_social_redirect_provider';
export function prefersRedirectLogin(): boolean {
  if (typeof window === 'undefined') return false;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  return mobile && firebaseConfig.authDomain === window.location.hostname;
}
async function startSocialRedirect(kind: 'google' | 'facebook', provider: GoogleAuthProvider | FacebookAuthProvider): Promise<never> {
  try {
    sessionStorage.setItem(SOCIAL_REDIRECT_FLAG, kind);
    localStorage.setItem(SOCIAL_REDIRECT_FLAG, kind);
  } catch {}
  await signInWithRedirect(auth, provider);
  // 頁面會跳轉離開，這個 Promise 不會結束
  return new Promise<never>(() => {});
}

export type SocialRedirectOutcome =
  | { provider: 'google' | 'facebook'; user: FirebaseUser }
  | { provider: 'google' | 'facebook'; error: string; code?: string };

/** 網站載入時呼叫：完成整頁跳轉回來的社群登入 */
export async function consumeSocialRedirectResult(): Promise<SocialRedirectOutcome | null> {
  let kind: 'google' | 'facebook' | null = null;
  try {
    kind = (sessionStorage.getItem(SOCIAL_REDIRECT_FLAG) || localStorage.getItem(SOCIAL_REDIRECT_FLAG)) as any;
  } catch {}
  if (!kind) return null;
  try {
    sessionStorage.removeItem(SOCIAL_REDIRECT_FLAG);
    localStorage.removeItem(SOCIAL_REDIRECT_FLAG);
  } catch {}
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) return { provider: kind, user: result.user };
    return null;
  } catch (error: any) {
    if (error?.code === 'auth/account-exists-with-different-credential') {
      return { provider: kind, code: error.code, error: '這個 Email 已經用其他方式（Email 密碼或另一個社群帳號）註冊過，請改用原本的方式登入。' };
    }
    return { provider: kind, code: error?.code, error: error?.message || '社群登入失敗，請稍後再試。' };
  }
}

export async function loginWithFirebaseGoogle(): Promise<FirebaseUser> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    if (prefersRedirectLogin()) return await startSocialRedirect('google', provider);
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (error: any) {
    console.warn('Firebase Google login error:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('您已取消 Google 登入視窗。');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('登入彈出視窗已被瀏覽器封鎖，請允許快顯視窗後重試！');
    }
    throw new Error(error.message || 'Google 登入失敗');
  }
}

export async function loginWithFirebaseFacebook(): Promise<FirebaseUser> {
  try {
    const provider = new FacebookAuthProvider();
    // 不主動強制要求 email scope，避免 Meta 應用程式未啟用 email 權限時噴出 Invalid Scopes: email 錯誤
    if (prefersRedirectLogin()) return await startSocialRedirect('facebook', provider);
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (error: any) {
    console.warn('Firebase Facebook login error:', error);
    if (error.code === 'auth/account-exists-with-different-credential') {
      const customErr: any = new Error('這個 Facebook 帳號的 Email 已經用其他方式（Email 密碼或 Google）註冊過，請改用原本的方式登入。');
      customErr.code = error.code;
      customErr.email = error.customData?.email;
      customErr.customData = error.customData;
      throw customErr;
    } else if (
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      const cancelErr: any = new Error('您已取消 Facebook 登入視窗。');
      cancelErr.code = error.code;
      throw cancelErr;
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('登入彈出視窗已被瀏覽器封鎖，請允許快顯視窗後重試！');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Firebase 控制台尚未啟用「Facebook」提供者，請於 Firebase Console > Authentication > Sign-in method 填寫 Facebook App ID & App Secret 啟用。');
    }
    throw new Error(error.message || 'Facebook 登入失敗');
  }
}

export function createRecaptchaVerifier(container: HTMLElement | string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, container, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      // Response expired
    },
  });
}

export async function loginWithFirebasePhone(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  let formatted = phoneNumber.trim().replace(/[\s-]/g, '');
  if (formatted.startsWith('09')) {
    formatted = '+886' + formatted.slice(1);
  } else if (!formatted.startsWith('+')) {
    formatted = '+886' + formatted;
  }

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, formatted, appVerifier);
    return confirmationResult;
  } catch (error: any) {
    console.warn('Firebase Phone auth error:', error);
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('無效的手機號碼格式，請確認是否為台灣手機 09xx 或包含國碼 +886');
    } else if (error.code === 'auth/missing-phone-number') {
      throw new Error('請輸入手機號碼！');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('簡訊發送額度已滿，請稍後再試或使用 Google / Facebook / 密碼登入');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Firebase 控制台尚未啟用「電話 (Phone)」提供者，請於 Firebase Console > Authentication > Sign-in method 開啟電話登入');
    } else if (error.code === 'auth/captcha-check-failed') {
      throw new Error('reCAPTCHA 安全驗證失敗，請重新嘗試');
    }
    throw new Error(error.message || '發送簡訊驗證碼失敗，請稍後再試');
  }
}

export async function verifyFirebasePhoneCode(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<FirebaseUser> {
  try {
    const credential = await confirmationResult.confirm(code.trim());
    return credential.user;
  } catch (error: any) {
    console.warn('Firebase phone confirm error:', error);
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('驗證碼不正確，請重新確認簡訊中的 6 位數字代碼！');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('驗證碼已過期，請重新發送簡訊！');
    }
    throw new Error(error.message || '手機驗證碼確認失敗');
  }
}

export async function sendFirebaseEmailVerification(user?: FirebaseUser): Promise<void> {
  const targetUser = user || auth.currentUser;
  if (!targetUser) {
    throw new Error('找不到目前的登入用戶以發送認證信');
  }
  try {
    await sendEmailVerification(targetUser);
  } catch (error: any) {
    console.warn('Firebase email verification send error:', error);
    if (error.code === 'auth/too-many-requests') {
      throw new Error('發送次數過多，請稍後幾分鐘再試。');
    }
    throw new Error(error.message || '發送認證信失敗，請稍後再試');
  }
}

// 伺服器回傳的驗證碼簽章（讓多台伺服器之間也能驗證），只存在記憶體中
const emailCodeTokens = new Map<string, string>();
const tokenKey = (email: string, type: string) => `${email.trim().toLowerCase()}:${type}`;

/**
 * 寄送 6 位數 Email 驗證碼（由 IdeaX 創點子團隊 noreply@ideax.tw 寄出）
 * canResetWithCode = true：可直接用驗證碼重設密碼；false：請改用 Firebase 重設密碼連結
 */
export async function sendEmailVerificationCode(
  email: string,
  type: 'forgot_password' | 'verify_email' | 'general' = 'general',
  name?: string
): Promise<{ success: boolean; message: string; canResetWithCode?: boolean; expiresAt?: number }> {
  let res: Response;
  try {
    res = await fetch('/api/auth/send-email-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), type, name }),
    });
  } catch {
    throw new Error('無法連線寄送驗證信，請檢查網路');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.error || '寄送驗證信失敗');
    err.canResetWithCode = data.canResetWithCode;
    throw err;
  }
  if (data.token) emailCodeTokens.set(tokenKey(email, type), data.token);
  return data;
}

/** 驗證 Email 驗證碼（重設密碼請改用 resetPasswordWithEmailCode） */
export async function verifyEmailCode(
  email: string,
  code: string,
  type: 'verify_email' | 'general' = 'general'
): Promise<{ success: boolean; verified: boolean; message?: string }> {
  let res: Response;
  try {
    res = await fetch('/api/auth/verify-email-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        code: code.trim(),
        type,
        token: emailCodeTokens.get(tokenKey(email, type)),
      }),
    });
  } catch {
    throw new Error('無法連線驗證，請檢查網路');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '驗證碼錯誤或過期');
  return data;
}

/** 用 Email 收到的 6 位數驗證碼直接重設密碼 */
export async function resetPasswordWithEmailCode(email: string, code: string, newPassword: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/auth/reset-password-with-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        code: code.trim(),
        newPassword,
        token: emailCodeTokens.get(tokenKey(email, 'forgot_password')),
      }),
    });
  } catch {
    throw new Error('無法連線重設密碼，請檢查網路');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '重設密碼失敗，請稍後再試');
  emailCodeTokens.delete(tokenKey(email, 'forgot_password'));
}

/**
 * 註冊完成後寄送 IdeaX 歡迎信（含 Email 驗證連結）
 * 回傳 sentVerification = false 時，請改寄 Firebase 官方驗證信
 */
export async function sendWelcomeEmail(name?: string): Promise<{ sentVerification: boolean }> {
  try {
    const res = await fetch('/api/auth/send-welcome-email', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    return { sentVerification: Boolean(res.ok && data.sentVerification) };
  } catch {
    return { sentVerification: false };
  }
}

/**
 * 伺服器端發送手機簡訊驗證碼
 */
export async function sendBackendSmsCode(
  phone: string,
  type: string = 'general'
): Promise<{ success: boolean; message: string; code?: string; expiresAt?: number }> {
  try {
    const res = await fetch('/api/auth/send-sms-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), type }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '發送簡訊失敗');
    }
    return data;
  } catch (err: any) {
    console.warn('Send SMS code error:', err);
    throw new Error(err.message || '無法發送簡訊驗證碼');
  }
}

/**
 * 伺服器端驗證手機簡訊驗證碼
 */
export async function verifyBackendSmsCode(
  phone: string,
  code: string,
  type: string = 'general'
): Promise<{ success: boolean; verified: boolean }> {
  try {
    const res = await fetch('/api/auth/verify-sms-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), code: code.trim(), type }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '簡訊驗證碼錯誤或已過期');
    }
    return data;
  } catch (err: any) {
    console.warn('Verify SMS code error:', err);
    throw new Error(err.message || '驗證失敗');
  }
}

export async function logoutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signout warning:', err);
  }
}

export async function updateFirebaseUserPassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.log('Firebase currentUser not found in memory, skipping Firebase updatePassword');
    return;
  }
  try {
    await updatePassword(user, newPassword.trim());
  } catch (error: any) {
    console.warn('Firebase update password error:', error);
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('基於安全考量，更新密碼前請重新登入！');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('新密碼強度不足，請設定至少 6 位元密碼！');
    }
    throw new Error(error.message || '更新雲端密碼失敗，請稍後再試');
  }
}

/**
 * 以「帳號名稱或手機號碼＋密碼」登入：由伺服器查出對應的 Email 並驗證密碼，
 * 成功後回傳一次性登入憑證（前端不會拿到別人的 Email）。
 */
export async function loginWithIdentifierPassword(identifier: string, password: string): Promise<{ user: FirebaseUser; userId?: string }> {
  const res = await fetch('/api/auth/password-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.customToken) {
    throw new Error(data.error || '帳號或密碼不正確，請重新確認後再試！');
  }
  const cred = await signInWithCustomToken(auth, data.customToken);
  return { user: cred.user, userId: data.userId };
}

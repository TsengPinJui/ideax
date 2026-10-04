import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';

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

export async function loginWithFirebaseGoogle(): Promise<FirebaseUser> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
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
    provider.addScope('email');
    provider.addScope('public_profile');
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (error: any) {
    console.warn('Firebase Facebook login error:', error);
    if (error.code === 'auth/account-exists-with-different-credential') {
      throw new Error('此 Facebook 帳號綁定的 Email 已在平台使用其他方式（例如 Google 或密碼）註冊，請使用原方式登入！');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('您已取消 Facebook 登入視窗。');
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

export async function logoutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signout warning:', err);
  }
}

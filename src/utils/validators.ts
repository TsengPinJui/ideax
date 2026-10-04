/**
 * 通用帳號與密碼格式驗證器
 */

export interface PasswordValidationResult {
  isValid: boolean;
  message: string;
  hasLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
}

export interface UsernameValidationResult {
  isValid: boolean;
  message: string;
}

export function validatePassword(pwd: string): PasswordValidationResult {
  const hasLength = pwd.length >= 6 && pwd.length <= 20;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const isValid = hasLength && hasLetter && hasNumber;
  let message = '';
  if (!hasLength) message = '密碼長度需為 6 ~ 20 字元';
  else if (!hasLetter) message = '密碼需包含至少 1 個英文字母';
  else if (!hasNumber) message = '密碼需包含至少 1 個數字';
  return { isValid, message, hasLength, hasLetter, hasNumber };
}

export function validateUsername(username: string): UsernameValidationResult {
  const trimmed = username.trim();
  if (trimmed.includes('@')) {
    // Email 格式驗證
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return {
      isValid: isEmail,
      message: isEmail ? '' : '電子郵件格式不正確',
    };
  }
  // 手機號碼格式驗證
  if (/^09\d{8}$/.test(trimmed.replace(/[\s-]/g, '')) || /^\+8869\d{8}$/.test(trimmed.replace(/[\s-]/g, ''))) {
    return {
      isValid: true,
      message: '',
    };
  }
  // 一般使用者名稱格式驗證 (4~20位英數字或底線)
  const isUsername = /^[a-zA-Z0-9_]{4,20}$/.test(trimmed);
  return {
    isValid: isUsername,
    message: isUsername ? '' : '帳號需為 4 ~ 20 位英數字或底線，或輸入正確手機/Email',
  };
}

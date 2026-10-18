import type { User } from '../types';

/**
 * 會員私密資料：不放在公開的 users 文件，改存 user_private/{會員編號}
 * 只有本人與管理員能讀；其他會員看不到別人的聯絡方式與財務資料。
 */
export const PRIVATE_PROFILE_FIELDS = ['email', 'phone', 'bankAccount', 'surveyData', 'annualSalary'] as const;
export type PrivateProfileField = (typeof PRIVATE_PROFILE_FIELDS)[number];

export function pickPrivateProfile(u: Partial<User>): Partial<User> {
  const out: Record<string, any> = {};
  for (const k of PRIVATE_PROFILE_FIELDS) {
    const v = (u as any)?.[k];
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out as Partial<User>;
}

export function omitPrivateProfile<T extends Record<string, any>>(u: T): T {
  const out: Record<string, any> = { ...u };
  for (const k of PRIVATE_PROFILE_FIELDS) delete out[k];
  return out as T;
}

/** 手機號碼比對用（去掉空白與連字號） */
export function normalizePhone(phone: unknown): string | undefined {
  if (typeof phone !== 'string') return undefined;
  const clean = phone.replace(/[\s-]/g, '');
  return clean || undefined;
}

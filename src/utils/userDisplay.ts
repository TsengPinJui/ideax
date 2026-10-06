export const ANONYMOUS_USER_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23CBD5E1"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>';

export const DEFAULT_USER_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export function resolveUserAvatar(avatar?: string | null, isAnonymous?: boolean): string {
  if (isAnonymous) {
    return ANONYMOUS_USER_AVATAR;
  }
  if (!avatar || avatar.trim() === '') {
    return DEFAULT_USER_AVATAR;
  }
  return avatar;
}

export function resolveUserName(name?: string | null, isAnonymous?: boolean): string {
  if (isAnonymous) {
    return '匿名提問者';
  }
  if (!name || name.trim() === '') {
    return '創點子用戶';
  }
  return name;
}

import { User } from '../types';
import { resolveIdCategory, getFormattedPlatformId, UserIdentificationLike } from '../services/userIdService';
import { VIRTUAL_PERSONAS } from '../data/virtualProposalsSeed';

export const DEACTIVATED_USER_NAME = '此帳號已註銷';

// 灰色中性匿名頭像
export const DEACTIVATED_USER_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/%3E%3C/svg%3E';

// 新用戶預設灰色人形頭像（深灰色圓形頭部與平滑圓弧肩部人形剪影）
export const DEFAULT_GREY_SILHOUETTE_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"%3E%3Ccircle cx="120" cy="74" r="46" fill="%232b2c3a"/%3E%3Cpath d="M28 214 C28 152, 68 136, 120 136 C172 136, 212 152, 212 214 Z" fill="%232b2c3a"/%3E%3C/svg%3E';

export const isGuestUser = (u: any): boolean => {
  if (!u || !u.id) return true;
  if (u.isGuest === true) return true;
  const id = String(u.id).trim();
  const name = String(u.name || '').trim();
  const email = String(u.email || '').trim().toLowerCase();
  return (
    id === 'user-guest' ||
    id === 'user_guest' ||
    id === 'guest' ||
    id === 'c000000000' ||
    name === '未登入訪客' ||
    name === '訪客探索身分' ||
    name === '訪客用戶' ||
    name === '訪客身份 (未登入)' ||
    email === 'guest@ideax.user' ||
    email === 'guest@ideax.tw'
  );
};

/**
 * 檢查該使用者是否已正式註銷帳號
 */
export function isUserAccountDeactivated(
  userId?: string,
  userOrUsersList?: User | User[]
): boolean {
  if (!userId) return false;

  const checkUser = (u: User): boolean => {
    if (u.id !== userId) return false;
    if (u.name === DEACTIVATED_USER_NAME || u.name === '此帳號已註銷') return true;
    if (u.deactivationStatus === 'deactivated') return true;
    if (u.isDeactivated) {
      if (
        !u.deactivationScheduledPurgeAt ||
        Date.now() >= new Date(u.deactivationScheduledPurgeAt).getTime()
      ) {
        return true;
      }
    }
    return false;
  };

  if (userOrUsersList && !Array.isArray(userOrUsersList)) {
    return checkUser(userOrUsersList);
  }

  if (Array.isArray(userOrUsersList)) {
    const u = userOrUsersList.find((item) => item.id === userId);
    if (u) {
      return checkUser(u);
    }
  }

  return false;
}

export const USER_ALIAS_MAP: Record<string, string> = {
  'user-admin': 'a000000001',
  'a000000001': 'user-admin',
  'user-questioner': 'c100000001',
  'c100000001': 'user-questioner',
  'solver-2': 'c200000002',
  'c200000002': 'solver-2',
  'solver-1': 'c100000003',
  'c100000003': 'solver-1',
};

export const LEGACY_TO_CANONICAL_ID_MAP: Record<string, string> = {
  'user-admin': 'a000000001',
  'user-questioner': 'c100000001',
  'solver-2': 'c200000002',
  'solver-1': 'c100000003',
};

const CANONICAL_CORE_PROFILES: Record<
  string,
  {
    name: string;
    role: 'questioner' | 'solver' | 'admin';
    accountType: 'user' | 'enterprise' | 'admin';
    memberId: string;
    username: string;
    email: string;
    title: string;
    avatar: string;
    verifiedExpert?: boolean;
    isInitialAdmin?: boolean;
  }
> = {
  c100000001: {
    name: '林書豪',
    role: 'questioner',
    accountType: 'user',
    memberId: 'c100000001',
    username: 'user_questioner',
    email: 'shuhao.lin@startup.tw',
    title: '新創團隊創始人',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    verifiedExpert: false,
    isInitialAdmin: false,
  },
  'user-questioner': {
    name: '林書豪',
    role: 'questioner',
    accountType: 'user',
    memberId: 'c100000001',
    username: 'user_questioner',
    email: 'shuhao.lin@startup.tw',
    title: '新創團隊創始人',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    verifiedExpert: false,
    isInitialAdmin: false,
  },
  c200000002: {
    name: '陳怡君',
    role: 'solver',
    accountType: 'user',
    memberId: 'c200000002',
    username: 'solver_yichun',
    email: 'yichun.chen.tech@gmail.com',
    title: '資深全端系統架構師 / AI 應用工程顧問',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    verifiedExpert: true,
    isInitialAdmin: false,
  },
  'solver-2': {
    name: '陳怡君',
    role: 'solver',
    accountType: 'user',
    memberId: 'c200000002',
    username: 'solver_yichun',
    email: 'yichun.chen.tech@gmail.com',
    title: '資深全端系統架構師 / AI 應用工程顧問',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    verifiedExpert: true,
    isInitialAdmin: false,
  },
  c100000003: {
    name: '柯育任',
    role: 'solver',
    accountType: 'user',
    memberId: 'c100000003',
    username: 'solver_koyuren',
    email: 'koyuren.advisor@gmail.com',
    title: '前知名外送平台產品總監 / 新創商業策略顧問',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    verifiedExpert: true,
    isInitialAdmin: false,
  },
  'solver-1': {
    name: '柯育任',
    role: 'solver',
    accountType: 'user',
    memberId: 'c100000003',
    username: 'solver_koyuren',
    email: 'koyuren.advisor@gmail.com',
    title: '前知名外送平台產品總監 / 新創商業策略顧問',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    verifiedExpert: true,
    isInitialAdmin: false,
  },
  b100000001: {
    name: '傘動科技',
    role: 'questioner',
    accountType: 'enterprise',
    memberId: 'b100000001',
    username: 'enterprise_sandong',
    email: 'contact@sandong.tech',
    title: '新創企業法人委託端',
    avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
    verifiedExpert: false,
    isInitialAdmin: false,
  },
  a000000001: {
    name: 'IdeaX 管理團隊',
    role: 'admin',
    accountType: 'admin',
    memberId: 'a000000001',
    username: 'Admin_001',
    email: 'operations@ideax.io',
    title: '平台總管',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    verifiedExpert: true,
    isInitialAdmin: true,
  },
  'user-admin': {
    name: 'IdeaX 管理團隊',
    role: 'admin',
    accountType: 'admin',
    memberId: 'a000000001',
    username: 'Admin_001',
    email: 'operations@ideax.io',
    title: '平台總管',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    verifiedExpert: true,
    isInitialAdmin: true,
  },
};

export interface CustomUserProfileOverride {
  name?: string;
  title?: string;
  avatar?: string;
  bio?: string;
  username?: string;
  company?: string;
  phone?: string;
  email?: string;
  updatedAt: string;
}

const CUSTOM_USER_PROFILES_KEY = 'ideax_custom_user_profiles_v2';

export function getCustomUserProfiles(): Record<string, CustomUserProfileOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_USER_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomUserProfile(
  userId: string,
  override: Omit<CustomUserProfileOverride, 'updatedAt'>
): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    const map = getCustomUserProfiles();
    const now = new Date().toISOString();
    const existing = map[userId] || {};
    const merged: CustomUserProfileOverride = {
      ...existing,
      ...Object.fromEntries(Object.entries(override).filter(([_, v]) => v !== undefined)),
      updatedAt: now,
    };
    map[userId] = merged;
    const aliasId = USER_ALIAS_MAP[userId];
    if (aliasId) {
      map[aliasId] = merged;
    }
    localStorage.setItem(CUSTOM_USER_PROFILES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * 修正並還原被誤改為「IdeaX 小助手」或角色錯亂之帳號身分與名稱，同時完整保留使用者主動修改之個人名稱與資料
 */
export function restoreCanonicalUserIdentity(u: User): User {
  if (!u || !u.id) return u;
  if (u.id === 'user-guest') return u;

  const customProfiles = getCustomUserProfiles();
  const aliasId = USER_ALIAS_MAP[u.id];
  const custom = customProfiles[u.id] || (aliasId ? customProfiles[aliasId] : undefined);

  // 1. 僅根據明確的 ID、memberId、專屬 Email 或專屬 Username 識別核心帳號，絕不以職稱模糊匹配避免產生重複帳號
  let canonicalKey: string | undefined = CANONICAL_CORE_PROFILES[u.id]
    ? u.id
    : u.memberId && CANONICAL_CORE_PROFILES[u.memberId]
    ? u.memberId
    : undefined;

  if (!canonicalKey) {
    if (u.email === 'shuhao.lin@startup.tw' || u.username === 'user_questioner') {
      canonicalKey = 'c100000001';
    } else if (u.email === 'yichun.chen.tech@gmail.com' || u.username === 'solver_yichun') {
      canonicalKey = 'c200000002';
    } else if (u.email === 'koyuren.advisor@gmail.com' || u.username === 'solver_koyuren') {
      canonicalKey = 'c100000003';
    } else if (u.email === 'contact@sandong.tech' || u.username === 'enterprise_sandong') {
      canonicalKey = 'b100000001';
    } else if (u.email === 'operations@ideax.io' || u.username === 'Admin_001') {
      canonicalKey = 'a000000001';
    }
  }

  if (canonicalKey && CANONICAL_CORE_PROFILES[canonicalKey]) {
    const canon = CANONICAL_CORE_PROFILES[canonicalKey];
    const isAdminCanon = canon.role === 'admin';

    // 非管理員若無主動改名紀錄且名稱被污染為管理員名稱，還原為預設名稱；若有主動改名紀錄則優先採用改名後名稱
    const isCorruptedNonAdminName =
      !isAdminCanon &&
      Boolean(u.name && (u.name.includes('小助手') || u.name === 'IdeaX 管理團隊'));
    const isCorruptedAdminName =
      isAdminCanon && !custom?.name && Boolean(u.name && u.name.includes('小助手'));

    const resolvedName =
      custom?.name ||
      (isCorruptedNonAdminName || isCorruptedAdminName || !u.name ? canon.name : u.name);

    const isCorruptedNonAdminTitle =
      !isAdminCanon &&
      Boolean(u.title && (u.title.includes('平台審核與交易治理總監') || u.title === '平台總管'));

    const resolvedTitle =
      custom?.title !== undefined
        ? custom.title
        : isCorruptedNonAdminTitle || !u.title
        ? canon.title
        : u.title;

    const isCorruptedNonAdminAvatar =
      !isAdminCanon && Boolean(u.avatar && u.avatar.includes('logo-bulb'));

    const resolvedAvatar =
      custom?.avatar ||
      (isCorruptedNonAdminAvatar || !u.avatar || (!custom?.avatar && u.avatar.includes('logo-bulb'))
        ? canon.avatar
        : u.avatar);

    return {
      ...u,
      id: canon.memberId, // 統一收斂至唯一標準 ID，杜絕舊版別名與新版代碼並存造成重複帳號
      name: resolvedName,
      role: canon.role,
      accountType: canon.accountType,
      memberId: canon.memberId,
      username: custom?.username || canon.username,
      // 安全性：不再補上任何預設密碼；管理員一律透過 Firebase Authentication 驗證
      password: isAdminCanon ? undefined : u.password,
      email: custom?.email || canon.email,
      title: resolvedTitle,
      avatar: resolvedAvatar,
      bio: custom?.bio !== undefined ? custom.bio : u.bio,
      company: custom?.company !== undefined ? custom.company : u.company,
      phone: custom?.phone !== undefined ? custom.phone : u.phone,
      verifiedExpert: canon.verifiedExpert ?? u.verifiedExpert,
      isInitialAdmin: isAdminCanon ? true : false,
      adminSites: isAdminCanon ? ['site_a', 'site_b'] : undefined,
    };
  }

  // 2. 其他模擬專家與虛擬角色帳號還原（若無主動改名）
  if (u.id && u.id.startsWith('u-vc-') && !custom?.name) {
    const vp = VIRTUAL_PERSONAS.find((p) => p.id === u.id);
    if (vp) {
      return {
        ...u,
        name: vp.name,
        title: custom?.title !== undefined ? custom.title : vp.title,
        avatar: custom?.avatar || vp.avatar,
      };
    }
  }

  const otherMocks: Record<string, string> = {
    'solver-3': '張維哲',
    'solver-4': '黃雅筑',
    'solver-5': '李立衡博士',
    'solver-6': '周承翰',
    'solver-7': '徐宛婷',
    'solver-8': '陳金水 師傅',
    'user-author-2': '黃柏翰',
    'user-author-3': '高宇翔 CTO',
    c000000000: '訪客探索身分',
  };
  if (otherMocks[u.id] && !custom?.name && (!u.name || u.name.includes('小助手') || u.name === 'IdeaX 管理團隊')) {
    return {
      ...u,
      name: otherMocks[u.id],
    };
  }

  // 自動判定是否已完成基本資料：註冊時跳過、事後已補填電話與職稱/產業的帳號，視為已完成
  const effectivePhone = custom?.phone !== undefined ? custom.phone : u.phone;
  const effectiveTitle = custom?.title !== undefined ? custom.title : (u.industry || u.jobTitle || u.title);
  const shouldMarkProfileCompleted =
    u.hasCompletedProfile === true ||
    Boolean(effectivePhone && String(effectivePhone).trim() && effectiveTitle);

  // 3. 若有使用者主動修改之個人資料，優先套用
  if (custom) {
    return {
      ...u,
      name: custom.name || u.name,
      title: custom.title !== undefined ? custom.title : u.title,
      avatar: custom.avatar || u.avatar,
      bio: custom.bio !== undefined ? custom.bio : u.bio,
      username: custom.username || u.username,
      company: custom.company !== undefined ? custom.company : u.company,
      phone: custom.phone !== undefined ? custom.phone : u.phone,
      email: custom.email || u.email,
      ...(shouldMarkProfileCompleted ? { hasCompletedProfile: true } : {}),
    };
  }

  // 4. 若一般真實註冊用戶名稱被誤覆蓋為「IdeaX 小助手」，從實名資料、銀行戶名或信箱還原
  if (u.name && (u.name === 'IdeaX 小助手' || u.name.includes('小助手'))) {
    const recoveredName =
      (u.realNameAuthData?.legalName && !u.realNameAuthData.legalName.includes('小助手')
        ? u.realNameAuthData.legalName
        : undefined) ||
      (u.bankAccount?.accountHolder &&
      !u.bankAccount.accountHolder.includes('小助手') &&
      !u.bankAccount.accountHolder.includes('IdeaX')
        ? u.bankAccount.accountHolder
        : undefined) ||
      (u.username && u.username.toLowerCase() !== 'admin_001' ? u.username : undefined) ||
      (u.email ? u.email.split('@')[0] : '平台會員');

    return {
      ...u,
      name: recoveredName,
      ...(shouldMarkProfileCompleted ? { hasCompletedProfile: true } : {}),
    };
  }

  if (shouldMarkProfileCompleted && u.hasCompletedProfile === false) {
    return {
      ...u,
      hasCompletedProfile: true,
    };
  }

  return u;
}

/**
 * 智慧合併並刪除重複帳號（涵蓋舊版別名 ID、相同 memberId、相同 Email、相同 Username、相同姓名及訪客冗餘帳號）
 */
export function deduplicateUsersList(
  rawUsers: User[],
  deletedUserIds?: Set<string>
): {
  uniqueUsers: User[];
  duplicateIdsToRemove: string[];
  removedIds: string[];
  removedDuplicateNames: string[];
  removedNames: string[];
} {
  const uniqueUsers: User[] = [];
  const duplicateIdsToRemove = new Set<string>();
  const removedDuplicateNames: string[] = [];

  const byId = new Map<string, number>();
  const byMemberId = new Map<string, number>();
  const byEmail = new Map<string, number>();
  const byUsername = new Map<string, number>();
  const byName = new Map<string, number>();

  const isGuestAccount = (u: any): boolean => {
    return isGuestUser(u);
  };

  const mergeTwoUsers = (primary: User, secondary: User): User => {
    const isAdmin =
      primary.id === 'a000000001' ||
      secondary.id === 'a000000001' ||
      primary.role === 'admin' ||
      secondary.role === 'admin';
    const maxBalance = Math.max(
      typeof primary.balance === 'number' ? primary.balance : 0,
      typeof secondary.balance === 'number' ? secondary.balance : 0
    );
    const maxWithheld = Math.max(
      typeof primary.withheldPoints === 'number' ? primary.withheldPoints : 0,
      typeof secondary.withheldPoints === 'number' ? secondary.withheldPoints : 0
    );

    return restoreCanonicalUserIdentity({
      ...secondary,
      ...primary,
      id: primary.id,
      memberId: primary.memberId || secondary.memberId,
      balance: isAdmin ? (maxBalance > 0 ? maxBalance : 50000) : maxBalance,
      withheldPoints: maxWithheld,
      realNameAuthStatus:
        primary.realNameAuthStatus === 'verified' || secondary.realNameAuthStatus === 'verified'
          ? 'verified'
          : primary.realNameAuthStatus || secondary.realNameAuthStatus,
      realNameAuthData: primary.realNameAuthData || secondary.realNameAuthData,
      expertApplicationStatus:
        primary.expertApplicationStatus === 'approved' || secondary.expertApplicationStatus === 'approved'
          ? 'approved'
          : primary.expertApplicationStatus || secondary.expertApplicationStatus,
      expertApplicationData: primary.expertApplicationData || secondary.expertApplicationData,
      verifiedExpert: Boolean(primary.verifiedExpert || secondary.verifiedExpert),
      bankAccount: primary.bankAccount || secondary.bankAccount,
      isBlocked: primary.isBlocked ?? secondary.isBlocked,
      blockedReason: primary.blockedReason || secondary.blockedReason,
      blockedUntil: primary.blockedUntil || secondary.blockedUntil,
      isDeactivated: primary.isDeactivated ?? secondary.isDeactivated,
      deactivationStatus: primary.deactivationStatus || secondary.deactivationStatus,
      deactivationRequestedAt: primary.deactivationRequestedAt || secondary.deactivationRequestedAt,
      deactivationScheduledPurgeAt: primary.deactivationScheduledPurgeAt || secondary.deactivationScheduledPurgeAt,
      deactivationReason: primary.deactivationReason || secondary.deactivationReason,
    });
  };

  for (const raw of rawUsers) {
    if (!raw || !raw.id) continue;
    const originalId = String(raw.id).trim();

    if (isGuestAccount(raw)) {
      if (originalId !== 'user-guest') {
        duplicateIdsToRemove.add(originalId);
      }
      continue;
    }

    // 檢查是否已被後台管理員永久刪除
    if (deletedUserIds && deletedUserIds.size > 0) {
      const aliasId = USER_ALIAS_MAP[originalId];
      if (
        originalId !== 'a000000001' &&
        originalId !== 'user-admin' &&
        (deletedUserIds.has(originalId) ||
          (aliasId && deletedUserIds.has(aliasId)) ||
          (raw.memberId && deletedUserIds.has(raw.memberId)))
      ) {
        duplicateIdsToRemove.add(originalId);
        continue;
      }
    }

    // 標準化身分（例如 user-admin -> a000000001, user-questioner -> c100000001 等）
    const u = restoreCanonicalUserIdentity(raw);
    if (originalId !== u.id) {
      duplicateIdsToRemove.add(originalId);
    }

    const normId = u.id.trim();
    const normMemberId = (u.memberId || '').trim();
    const normEmail = (u.email || '').trim().toLowerCase();
    const normUsername = (u.username || '').trim().toLowerCase();
    const normName = (u.name || '').trim();
    const canMatchByName =
      normName.length > 0 &&
      normName !== DEACTIVATED_USER_NAME &&
      normName !== '此帳號已註銷' &&
      normName !== '平台會員';

    let existingIdx: number | undefined = byId.get(normId);
    if (existingIdx === undefined && normMemberId) {
      existingIdx = byMemberId.get(normMemberId);
    }
    if (existingIdx === undefined && normEmail) {
      existingIdx = byEmail.get(normEmail);
    }
    if (existingIdx === undefined && normUsername) {
      existingIdx = byUsername.get(normUsername);
    }
    // 絕不可僅因姓名相同就誤把兩位不同會員合併與刪除（真實註冊會員必須依明確的 id, memberId, email, username 判定）
    if (existingIdx === undefined && canMatchByName && Boolean(CANONICAL_CORE_PROFILES[u.id])) {
      const candidateIdx = byName.get(normName);
      if (candidateIdx !== undefined && Boolean(CANONICAL_CORE_PROFILES[uniqueUsers[candidateIdx].id])) {
        existingIdx = candidateIdx;
      }
    }

    if (existingIdx !== undefined) {
      const existing = uniqueUsers[existingIdx];
      // 優先保留標準核心 ID (a000000001, c100000001, c200000002, c100000003, b100000001) 或較早註冊之主帳號
      const isCandidateCanonicalCore = Boolean(CANONICAL_CORE_PROFILES[u.id] && !CANONICAL_CORE_PROFILES[existing.id]);
      const primary = isCandidateCanonicalCore ? u : existing;
      const secondary = isCandidateCanonicalCore ? existing : u;

      if (secondary.id !== primary.id) {
        duplicateIdsToRemove.add(secondary.id);
      }
      if (originalId !== primary.id) {
        duplicateIdsToRemove.add(originalId);
      }
      removedDuplicateNames.push(secondary.name || secondary.id);

      const merged = mergeTwoUsers(primary, secondary);
      uniqueUsers[existingIdx] = merged;

      byId.set(merged.id.trim(), existingIdx);
      if (merged.memberId) byMemberId.set(merged.memberId.trim(), existingIdx);
      if (merged.email) byEmail.set(merged.email.trim().toLowerCase(), existingIdx);
      if (merged.username) byUsername.set(merged.username.trim().toLowerCase(), existingIdx);
      if (merged.name && merged.name !== DEACTIVATED_USER_NAME) {
        byName.set(merged.name.trim(), existingIdx);
      }
    } else {
      const newIdx = uniqueUsers.length;
      const isAdmin = u.id === 'a000000001' || u.role === 'admin';
      const cleanUser: User = {
        ...u,
        balance: isAdmin
          ? typeof u.balance === 'number' && u.balance > 0
            ? u.balance
            : 50000
          : typeof u.balance === 'number'
          ? u.balance
          : 0,
        withheldPoints: typeof u.withheldPoints === 'number' ? u.withheldPoints : 0,
      };
      uniqueUsers.push(cleanUser);
      byId.set(normId, newIdx);
      if (normMemberId) byMemberId.set(normMemberId, newIdx);
      if (normEmail) byEmail.set(normEmail, newIdx);
      if (normUsername) byUsername.set(normUsername, newIdx);
      if (canMatchByName) byName.set(normName, newIdx);
    }
  }

  const duplicateArray = Array.from(duplicateIdsToRemove);
  return {
    uniqueUsers,
    duplicateIdsToRemove: duplicateArray,
    removedIds: duplicateArray,
    removedDuplicateNames,
    removedNames: removedDuplicateNames,
  };
}

/**
 * 取得顯示的使用者名稱（若已註銷則顯示「此帳號已註銷」）
 * 支援全站即時連動：無論在導覽列、問題卡片、解答列表、聊天室、交易紀錄或帳號切換器，皆優先顯示使用者最新修改之名稱
 */
export function resolveUserDisplayName(
  userId?: string,
  fallbackName?: string,
  usersList?: User[]
): string {
  if (fallbackName === DEACTIVATED_USER_NAME || fallbackName === '此帳號已註銷') {
    return DEACTIVATED_USER_NAME;
  }
  if (isUserAccountDeactivated(userId, usersList)) {
    return DEACTIVATED_USER_NAME;
  }

  let name = '';

  if (userId) {
    // 1. 優先檢查使用者主動儲存之最新全站改名設定
    const customProfiles = getCustomUserProfiles();
    const aliasId = USER_ALIAS_MAP[userId];
    const custom = customProfiles[userId] || (aliasId ? customProfiles[aliasId] : undefined);
    if (custom?.name) {
      name = custom.name;
    }

    // 2. 從傳入的 usersList 查找最新使用者物件
    if (!name && usersList && usersList.length > 0) {
      const matched = usersList.find(
        (u) => u.id === userId || (aliasId && u.id === aliasId)
      );
      if (matched) {
        const restored = restoreCanonicalUserIdentity(matched);
        if (restored.name) {
          name = restored.name;
        }
      }
    }

    // 3. 若呼叫端未傳入 usersList，從 localStorage 中的當前用戶或全站用戶清單查找最新名稱
    if (!name && typeof window !== 'undefined') {
      try {
        const savedCurrentRaw = localStorage.getItem('ideax_user');
        if (savedCurrentRaw) {
          const savedCurrent = JSON.parse(savedCurrentRaw);
          if (savedCurrent && (savedCurrent.id === userId || (aliasId && savedCurrent.id === aliasId))) {
            const restored = restoreCanonicalUserIdentity(savedCurrent);
            if (restored.name) name = restored.name;
          }
        }
        if (!name) {
          const savedUsersRaw = localStorage.getItem('ideax_users');
          if (savedUsersRaw) {
            const savedUsers: User[] = JSON.parse(savedUsersRaw);
            const matched = Array.isArray(savedUsers)
              ? savedUsers.find((u) => u.id === userId || (aliasId && u.id === aliasId))
              : undefined;
            if (matched) {
              const restored = restoreCanonicalUserIdentity(matched);
              if (restored.name) name = restored.name;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // 4. Fallback
  if (!name) {
    if (fallbackName && !fallbackName.includes('小助手')) {
      name = fallbackName;
    } else if (userId && CANONICAL_CORE_PROFILES[userId]) {
      name = CANONICAL_CORE_PROFILES[userId].name;
    } else {
      name = fallbackName || '使用者';
    }
  }

  // 去除文字註解（如「(企業機構)」、「(測試專家/解答者)」、「(一般用戶)」、「(管理員)」等）
  return name
    .replace(/\s*[\(（][^()]*?(?:機構|用戶|管理|法人|專家|解答|提問|測試)[^()]*?[\)）]/g, '')
    .trim();
}

/**
 * 依身分取得使用者名稱文字顏色分辨 class（不使用金色字）：
 * 1. 管理員 (Admin) -> 紫色 (text-purple-700 font-bold)
 * 2. 企業機構 (Enterprise) -> 藍色 (text-blue-700 font-bold)
 * 3. 認證專家 (Solver / Expert) -> 綠色 (text-emerald-700 font-bold)
 * 4. 一般用戶 (General User) -> 黑色 (text-stone-900 font-bold)
 */
export function getUserNameColorClass(
  userId?: string,
  usersList?: User[],
  userFallback?: UserIdentificationLike
): string {
  let targetUser: (UserIdentificationLike & { verifiedExpert?: boolean; verifiedBadge?: string; isAmbassador?: boolean }) | undefined = userFallback as any;
  if (userId && usersList) {
    const matched = usersList.find((u) => u.id === userId || (USER_ALIAS_MAP[userId] && u.id === USER_ALIAS_MAP[userId]));
    if (matched) {
      targetUser = { ...matched, ...targetUser };
    }
  }
  if (targetUser && targetUser.id) {
    targetUser = restoreCanonicalUserIdentity(targetUser as User) as any;
  }

  const effectiveId = userId || targetUser?.id || '';
  const idCategory = resolveIdCategory(targetUser || { id: effectiveId });

  // 1. 管理員 -> 紫色 (text-purple-700 font-bold)
  if (
    (idCategory as string) === 'a' ||
    effectiveId === 'user-admin' ||
    effectiveId === 'a000000001' ||
    targetUser?.role === 'admin' ||
    targetUser?.accountType === 'admin' ||
    targetUser?.memberId === 'a000000001' ||
    targetUser?.isOfficial ||
    (targetUser?.name && (targetUser.name.includes('管理團隊') || targetUser.name.includes('管理員') || targetUser.name.includes('系統管理') || targetUser.name.includes('官方')))
  ) {
    return 'text-purple-700 font-bold';
  }

  // 2. 企業機構 -> 藍色 (text-blue-700 font-bold)
  if (
    (idCategory as string) === 'b' ||
    targetUser?.accountType === 'enterprise' ||
    targetUser?.role === 'enterprise' ||
    targetUser?.subscriptionTier === 'enterprise' ||
    (targetUser?.memberId && targetUser.memberId.startsWith('b')) ||
    effectiveId.startsWith('b') ||
    (targetUser?.accountType !== 'user' &&
      effectiveId !== 'c100000001' &&
      effectiveId !== 'user-questioner' &&
      effectiveId !== 'c200000002' &&
      effectiveId !== 'solver-2' &&
      effectiveId !== 'c100000003' &&
      effectiveId !== 'solver-1' &&
      !effectiveId.startsWith('u-vc-') &&
      Boolean(
        targetUser?.name &&
          (targetUser.name.includes('公司') ||
            targetUser.name.includes('科技') ||
            targetUser.name.includes('事務所') ||
            targetUser.name.includes('企業') ||
            targetUser.name.includes('機構') ||
            targetUser.name.includes('法人'))
      ))
  ) {
    return 'text-blue-700 font-bold';
  }

  // 3. 認證專家 -> 綠色 (text-emerald-700 font-bold)
  if (
    !effectiveId.startsWith('u-vc-') &&
    (targetUser?.role === 'solver' ||
      targetUser?.verifiedExpert ||
      Boolean(targetUser?.verifiedBadge) ||
      effectiveId.startsWith('c2') ||
      effectiveId.startsWith('solver'))
  ) {
    return 'text-emerald-700 font-bold';
  }

  // 4. 一般用戶 -> 黑色 (text-stone-900 font-bold)
  return 'text-stone-900 font-bold';
}

/**
 * 依身分與帳號 ID 提供專屬、各自獨立之高品質預設頭像（避免全部帳號顯示同一張照片）
 */
export function getDefaultAvatarForUser(userId?: string, role?: string, accountType?: string): string {
  if (!userId) {
    return DEFAULT_GREY_SILHOUETTE_AVATAR;
  }
  const aliasId = USER_ALIAS_MAP[userId];
  const canon = CANONICAL_CORE_PROFILES[userId] || (aliasId ? CANONICAL_CORE_PROFILES[aliasId] : undefined);
  if (canon?.avatar) {
    return canon.avatar;
  }

  const mockAvatars: Record<string, string> = {
    'solver-3': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'solver-4': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'solver-5': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    'solver-6': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    'solver-7': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'solver-8': 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    'user-author-2': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    'user-author-3': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    c000000000: DEFAULT_GREY_SILHOUETTE_AVATAR,
    'user-guest': DEFAULT_GREY_SILHOUETTE_AVATAR,
  };
  if (mockAvatars[userId]) {
    return mockAvatars[userId];
  }

  // 依身分與 ID 類別給予不同且明確區隔之頭像
  if (userId.startsWith('a') || role === 'admin' || accountType === 'admin') {
    return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80';
  }
  if (userId.startsWith('b') || role === 'enterprise' || accountType === 'enterprise') {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80';
  }
  return DEFAULT_GREY_SILHOUETTE_AVATAR;
}

/**
 * 取得顯示的使用者頭像（若已註銷則顯示灰色頭像，並優先讀取使用者最新更換之頭像）
 * 各身分與帳號擁有專屬各自獨立之頭像，絕不彼此覆蓋或誤植為同一張照片
 */
export function resolveUserAvatar(
  userId?: string,
  fallbackAvatar?: string,
  usersList?: User[]
): string {
  if (fallbackAvatar === DEACTIVATED_USER_AVATAR) {
    return DEACTIVATED_USER_AVATAR;
  }
  if (isUserAccountDeactivated(userId, usersList)) {
    return DEACTIVATED_USER_AVATAR;
  }
  if (userId) {
    // 1. 優先檢查使用者主動上傳之個人專屬頭像 (含 base64 或自訂圖檔)
    const customProfiles = getCustomUserProfiles();
    const aliasId = USER_ALIAS_MAP[userId];
    const custom = customProfiles[userId] || (aliasId ? customProfiles[aliasId] : undefined);
    if (custom?.avatar && custom.avatar.trim() && !custom.avatar.includes('logo-bulb')) {
      return custom.avatar;
    }

    // 2. 核心官方帳號及固定保留角色專屬頭像
    const canon = CANONICAL_CORE_PROFILES[userId] || (aliasId ? CANONICAL_CORE_PROFILES[aliasId] : undefined);
    if (canon?.avatar) {
      return canon.avatar;
    }

    // 2b. 範例創作者帳號：一律使用目前的頭像（雲端或瀏覽器裡可能還存著舊照片）
    if (userId.startsWith('u-vc-')) {
      const vp = VIRTUAL_PERSONAS.find((p) => p.id === userId);
      if (vp) return vp.avatar;
    }

    // 3. 從傳入的 usersList 中查找該帳號
    if (usersList && usersList.length > 0) {
      const matched = usersList.find((u) => u.id === userId || (aliasId && u.id === aliasId));
      if (matched && matched.avatar && matched.avatar.trim() && !matched.avatar.includes('logo-bulb')) {
        return matched.avatar;
      }
    }

    // 4. 從 localStorage 查找
    if (typeof window !== 'undefined') {
      try {
        const savedCurrentRaw = localStorage.getItem('ideax_user') || localStorage.getItem('ideax_current_user');
        if (savedCurrentRaw) {
          const cur = JSON.parse(savedCurrentRaw);
          if (cur && (cur.id === userId || (aliasId && cur.id === aliasId)) && cur.avatar && !cur.avatar.includes('logo-bulb')) {
            return cur.avatar;
          }
        }
      } catch {}
    }

    return getDefaultAvatarForUser(userId);
  }

  if (fallbackAvatar && !fallbackAvatar.includes('logo-bulb')) {
    return fallbackAvatar;
  }

  return getDefaultAvatarForUser(userId);
}

/** 是否已具備發布所需的基本資料（電話＋職稱或產業） */
export function hasFilledRequiredProfile(u: Partial<User> | null | undefined): boolean {
  if (!u) return false;
  const phoneOk = Boolean(u.phone && String(u.phone).trim());
  const titleOk = Boolean(u.industry || u.jobTitle || u.title);
  return u.hasCompletedProfile === true ? Boolean(u.phone || u.email) : phoneOk && titleOk;
}

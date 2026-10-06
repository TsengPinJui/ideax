/**
 * 創點子 IdeaX - 會員與使用者 ID 規格生成與格式化服務
 * 
 * 規格要求：
 * ID 種類：
 * - 一般用戶: c
 * - 管理員: a
 * - 企業機構: b
 * 
 * 編碼格式：
 * 首字英文字母 (a / b / c) + 亂數編排 9 碼，共 10 碼。
 * 範例：
 * - 一般用戶: c829301948
 * - 管理員: a001928374
 * - 企業機構: b928374619
 */

export type PlatformIdCategory = 'user' | 'admin' | 'enterprise';

export interface UserIdentificationLike {
  id?: string;
  memberId?: string;
  accountType?: PlatformIdCategory;
  role?: string;
  company?: string;
  subscriptionTier?: string;
  industry?: string;
  jobTitle?: string;
}

export const ID_PREFIX_MAP: Record<PlatformIdCategory, 'a' | 'b' | 'c'> = {
  admin: 'a',
  enterprise: 'b',
  user: 'c',
};

export const ID_TYPE_INFO: Record<
  PlatformIdCategory,
  {
    prefix: 'a' | 'b' | 'c';
    label: string;
    description: string;
    badgeClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  admin: {
    prefix: 'a',
    label: '管理員',
    description: '平台管理方與官方團隊 (a)',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-300',
  },
  enterprise: {
    prefix: 'b',
    label: '企業機構',
    description: '企業法人、新創機構與團隊 (b)',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-300',
  },
  user: {
    prefix: 'c',
    label: '一般用戶',
    description: '提問者、解題專家與個人會員 (c)',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-300',
  },
};

/**
 * 判定使用者所屬之 ID 種類 (admin: a, enterprise: b, user: c)
 */
export const resolveIdCategory = (userOrRole?: UserIdentificationLike | string): PlatformIdCategory => {
  if (!userOrRole) return 'user';

  if (typeof userOrRole === 'string') {
    const s = userOrRole.trim().toLowerCase();
    if (s === 'admin' || s === 'user-admin' || s.startsWith('a') && s.length === 10) return 'admin';
    if (s === 'enterprise' || s.startsWith('b') && s.length === 10) return 'enterprise';
    return 'user';
  }

  const u = userOrRole;

  // 1. 若已有明確 accountType
  if (u.accountType === 'admin') return 'admin';
  if (u.accountType === 'enterprise') return 'enterprise';
  if (u.accountType === 'user') return 'user';

  // 2. 若 ID 或 memberId 本身為標準 10 碼，由首字反推
  const candidateId = (u.memberId || u.id || '').trim();
  if (/^[abc][0-9a-zA-Z]{9}$/.test(candidateId)) {
    const first = candidateId[0].toLowerCase();
    if (first === 'a') return 'admin';
    if (first === 'b') return 'enterprise';
    if (first === 'c') return 'user';
  }

  // 3. 管理員判定
  if (u.role === 'admin' || u.id === 'user-admin') {
    return 'admin';
  }

  // 4. 企業機構判定 (企業會員、企業角色、或登記有機構公司名稱)
  if (
    u.role === 'enterprise' ||
    u.subscriptionTier === 'enterprise' ||
    Boolean(u.company && u.company.trim() && (u.company.includes('公司') || u.company.includes('科技') || u.company.includes('事務所') || u.company.includes('企業') || u.company.includes('團隊')))
  ) {
    return 'enterprise';
  }

  // 5. 預設為一般用戶 (c)
  return 'user';
};

/**
 * 依據種類生成標準 10 碼 ID：
 * 首字英文字母 (a / b / c) + 亂數編排 9 碼，共 10 碼。
 */
export const generatePlatformUserId = (category: PlatformIdCategory = 'user'): string => {
  const prefix = ID_PREFIX_MAP[category] || 'c';

  // 亂數編排 9 碼數字（000000000 ~ 999999999）
  let digits = '';
  for (let i = 0; i < 9; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }

  return `${prefix}${digits}`;
};

/**
 * 驗證字串是否為合法的 10 碼平台會員 ID (首字 a/b/c + 9 碼字元)
 */
export const isValidPlatformUserId = (id?: string): boolean => {
  if (!id) return false;
  return /^[abc][0-9a-zA-Z]{9}$/.test(id.trim());
};

// 系統核心預置帳號之穩定 10 碼對應表
const DETERMINISTIC_BUILTIN_IDS: Record<string, string> = {
  'user-admin': 'a000000001',
  'user-questioner': 'c100000001',
  'solver-2': 'c200000002',
  'solver-1': 'c100000003',
  'solver-3': 'c300000003',
  'solver-4': 'c400000004',
  'solver-5': 'c500000005',
  'user-guest': 'c000000000',
};

/**
 * 取得用戶之規範化 10 碼 ID（首字英文字母 + 亂數編排 9 碼，共 10 碼）：
 * 1. 若用戶已有合法 10 碼 memberId，優先回傳。
 * 2. 若用戶之原始 id 已為合法 10 碼，直接回傳。
 * 3. 若為核心內建帳號，回傳固定對應之標準 10 碼。
 * 4. 其餘字串透過確定性 Hash 演算法，根據其種類映射為固定的 10 碼標準 ID，確保不隨重繪跳動。
 */
export const getFormattedPlatformId = (
  userOrId?: UserIdentificationLike | string | null
): string => {
  if (!userOrId) return 'c000000000';

  let rawId = '';
  let category: PlatformIdCategory = 'user';

  if (typeof userOrId === 'string') {
    rawId = userOrId.trim();
    category = resolveIdCategory(rawId);
  } else {
    // 優先檢查 memberId
    if (userOrId.memberId && isValidPlatformUserId(userOrId.memberId)) {
      return userOrId.memberId;
    }
    rawId = (userOrId.id || '').trim();
    category = resolveIdCategory(userOrId);
  }

  // 若 rawId 本身已符合 10 碼規範
  if (isValidPlatformUserId(rawId)) {
    return rawId;
  }

  // 檢查內建常數映射
  if (DETERMINISTIC_BUILTIN_IDS[rawId]) {
    return DETERMINISTIC_BUILTIN_IDS[rawId];
  }

  // 確定性 Hash 生成 9 碼數字，維持跨 render 不變
  const prefix = ID_PREFIX_MAP[category];
  let hash = 0;
  for (let i = 0; i < rawId.length; i++) {
    hash = (hash * 31 + rawId.charCodeAt(i)) >>> 0;
  }
  const digits = (hash % 1000000000).toString().padStart(9, '0');

  return `${prefix}${digits}`;
};

/**
 * 取得 ID 的型別標籤資訊（用於 UI 標註與提示）
 */
export const getPlatformIdBadge = (formattedIdOrType?: string) => {
  const category = resolveIdCategory(formattedIdOrType || 'user');
  return ID_TYPE_INFO[category];
};

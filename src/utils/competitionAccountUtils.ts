import { User } from '../types';
import { CompetitionAccount } from '../types/competition';

/**
 * 依據登入身分計算創星幣初始額度與身分角色：
 * - 平台管理員 (admin): 10,000,000 創星幣 (1,000萬)
 * - 產學研專家 / 評審委員 (expert / solver / judge): 3,000,000 創星幣 (300萬)
 * - 校園推廣大使 (ambassador): 100,000 創星幣 (10萬 + 推廣獎勵)
 * - 一般會員 / 參賽者 (user / participant): 100,000 創星幣 (10萬)
 * - 訪客 / 登出狀態: null (0 點，不顯示錢包)
 */
export function getIdentityCompetitionPoints(user: User | null | undefined): {
  role: 'admin' | 'solver' | 'user';
  initialPoints: number;
  roleLabel: string;
} {
  if (!user || !user.id || user.id === 'user-guest') {
    return { role: 'user', initialPoints: 0, roleLabel: '訪客' };
  }

  // 1. 平台管理員 -> 10,000,000 創星幣 (1,000萬)
  if (user.role === 'admin' || user.accountType === 'admin') {
    return { role: 'admin', initialPoints: 10_000_000, roleLabel: '平台管理員' };
  }

  // 2. 產學研認證專家 / 評審委員 -> 3,000,000 創星幣 (300萬)
  if (
    user.verifiedExpert ||
    user.role === 'solver' ||
    user.expertCertStatus === 'verified' ||
    (user as any).accountType === 'expert'
  ) {
    return { role: 'solver', initialPoints: 3_000_000, roleLabel: '競賽專家' };
  }

  // 3. 校園推廣大使 -> 100,000 創星幣 + 推廣獎勵
  if (((user.competitionBadges as any) || []).includes('推廣大使') || (user.role as string) === 'ambassador') {
    return { role: 'user', initialPoints: 100_000, roleLabel: '推廣大使' };
  }

  // 4. 一般會員與參賽者 -> 100,000 創星幣 (10萬)
  return {
    role: 'user',
    initialPoints: 100_000,
    roleLabel: user.competitionBadges?.includes('創星季') ? '創星季參賽者' : '一般會員',
  };
}

/**
 * 本地取得或初始化用戶創星幣帳戶
 * - 若未登入，嚴格回傳 null，絕不顯示錢包
 * - 若已登入，根據身分 (管理員 1,000萬 / 專家 300萬 / 一般用戶 10萬) 配發對應創星幣
 */
export function resolveClientCompetitionAccount(
  user: User | null | undefined,
  serverAccount?: CompetitionAccount | null
): CompetitionAccount | null {
  if (!user || !user.id || user.id === 'user-guest') {
    return null;
  }

  const { role, initialPoints } = getIdentityCompetitionPoints(user);

  // 如果有後端回傳的帳戶
  if (serverAccount) {
    // 若身份應有額度高於後端記錄（例如管理員或升級為專家），自動升級
    const effectiveInitial = Math.max(serverAccount.initialPoints || 0, initialPoints);
    const spent = serverAccount.spentPoints || 0;
    const effectiveAvailable = Math.max(0, effectiveInitial - spent);

    return {
      ...serverAccount,
      role,
      initialPoints: effectiveInitial,
      availablePoints: Math.max(serverAccount.availablePoints || 0, effectiveAvailable),
    };
  }

  // 本地快取或非同步模式下的帳戶解析
  let spentPoints = 0;
  let bonusPoints = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      spentPoints = Number(localStorage.getItem(`ideax_star_spent_${user.id}`)) || 0;
      bonusPoints = Number(localStorage.getItem(`ideax_star_bonus_${user.id}`)) || 0;
    }
  } catch {}

  const availablePoints = Math.max(0, initialPoints - spentPoints + bonusPoints);

  return {
    userId: user.id,
    role,
    initialPoints,
    availablePoints,
    spentPoints,
    referralCode: user.referralCode || `STAR-${user.id.slice(-6).toUpperCase()}`,
    isRegisteredParticipant: user.competitionBadges?.includes('創星季'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

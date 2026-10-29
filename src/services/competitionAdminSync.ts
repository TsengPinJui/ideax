import {
  ParticipantRegistrationData,
  StarSeasonProposal,
  StarSeasonStage,
  StarSeasonTrack,
  CompetitionHomepageStatsConfig,
  DEFAULT_HOMEPAGE_STATS_CONFIG,
  CompetitionAdminMetrics,
  COMPETITION_POINTS_CONFIG,
  UserCompetitionRewardSummary,
  AdminTotalRewardsMetrics,
} from '../types/competition';
import { syncPlatformSettingsToFirestore } from './firestoreSync';
import { isRealRegisteredUser } from '../data/mockData';
import { User } from '../types';

export interface CompetitionRegistrationRecord extends ParticipantRegistrationData {
  id: string;
  userId: string;
  proposalId: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface CompetitionExpertRecord {
  id: string;
  userId: string;
  expertName: string;
  expertPhone: string;
  expertEmail: string;
  organization: string;
  jobTitle: string;
  expertiseTracks: StarSeasonTrack[];
  yearsOfExperience: number;
  bio: string;
  proofDocumentUrl?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  pointsAllocated: number; // 3,000,000
  singleProjectCap: number; // 2,000,000
  isJudgeSelected?: boolean; // 由專家中選出參與複賽評審
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  referralSource?: string;
  referralSourceOther?: string;
  createdAt: string;
}

const REGISTRATIONS_STORAGE_KEY = 'ideax_competition_registrations';
const PROPOSALS_STORAGE_KEY = 'ideax_competition_admin_proposals';
const EXPERTS_STORAGE_KEY = 'ideax_competition_admin_experts';
const HOMEPAGE_STATS_CONFIG_KEY = 'ideax_competition_homepage_stats_config';

// 初始示範專家資料清空歸零（由真實用戶操作建立）
const INITIAL_EXPERTS: CompetitionExpertRecord[] = [];

// 初始示範參賽報名資料清空歸零（由真實用戶報名建立）
const INITIAL_REGISTRATIONS: CompetitionRegistrationRecord[] = [];

// 初始示範提案審核資料清空歸零（由真實提案建立）
const INITIAL_PROPOSALS: StarSeasonProposal[] = [];

// 已確認真實參賽隊伍與隊長名單（靠臉解決、超級痛點、創星漫遊者）
const CONFIRMED_REAL_TEAM_NAMES = new Set(['靠臉解決', '超級痛點', '創星漫遊者']);
const CONFIRMED_REAL_PARTICIPANT_UIDS = new Set([
  '0VcD0rRXRHbfNjmDVVBgk7Iil2F2', // 小美余 (靠臉解決)
  'bqUlZCdy1aeg6wGHOvhGdgOrkOd2', // ching (超級痛點)
  '2e9KwdV4uvT1DdcLvnVR9tBO4dD3', // 陳天奉 (創星漫遊者)
]);

export function isFakeOrVirtualRegistration(r: any): boolean {
  if (!r || typeof r !== 'object') return true;
  const id = String(r.id || '').trim();
  const userId = String(r.userId || '').trim();
  const teamName = String(r.teamName || '').trim();
  const leaderName = String(r.leaderName || '').trim();
  const schoolName = String(r.schoolName || '').trim();
  const leaderEmail = String(r.leaderEmail || '').trim().toLowerCase();

  if (CONFIRMED_REAL_TEAM_NAMES.has(teamName) || CONFIRMED_REAL_PARTICIPANT_UIDS.has(userId)) {
    return false;
  }

  if (!teamName || !leaderName) return true;

  return (
    id.startsWith('test-') ||
    id.startsWith('demo-') ||
    id.startsWith('mock-') ||
    id.startsWith('reg-demo-') ||
    id.startsWith('reg-test-') ||
    userId.startsWith('test-') ||
    userId.startsWith('demo-') ||
    userId.startsWith('mock-') ||
    userId.startsWith('u-vp-') ||
    userId.startsWith('u-vc-') ||
    userId.startsWith('u-agent-') ||
    userId.startsWith('user-') ||
    userId.startsWith('exp-') ||
    userId === 'user-guest' ||
    userId === 'a000000001' ||
    userId === 'c100000001' ||
    userId === 'c200000002' ||
    teamName.includes('測試') ||
    teamName.includes('示範') ||
    teamName.includes('虛擬') ||
    teamName.includes('假團隊') ||
    teamName.toLowerCase().includes('demo') ||
    teamName.toLowerCase().includes('test') ||
    leaderName.includes('測試') ||
    leaderName.includes('示範') ||
    leaderName.includes('虛擬') ||
    schoolName.includes('測試') ||
    schoolName.includes('示範') ||
    leaderEmail.endsWith('@ideax.demo') ||
    leaderEmail.endsWith('@example.com') ||
    Boolean((r as any).isSimulated)
  );
}

export function isFakeOrVirtualProposal(p: any): boolean {
  if (!p || typeof p !== 'object') return true;
  const id = String(p.id || '').trim();
  const authorId = String(p.authorId || p.userId || '').trim();
  const authorName = String(p.authorName || p.leaderName || '').trim();
  const teamName = String(p.teamName || '').trim();
  const title = String(p.title || p.projectTitle || '').trim();

  if (
    CONFIRMED_REAL_TEAM_NAMES.has(teamName) ||
    CONFIRMED_REAL_PARTICIPANT_UIDS.has(authorId) ||
    authorName === '小美余' ||
    authorName === '陳天奉' ||
    authorName === 'ching' ||
    id === 'star-prop-1792853867316-1ymcj'
  ) {
    return false;
  }

  if (!title) return true;

  return (
    p.isCompetitionJoined === false ||
    id.startsWith('q-idea-user-') ||
    id.startsWith('q-pain-user-') ||
    id.startsWith('vibe-app-') ||
    id.startsWith('game-hot-') ||
    id.startsWith('prop-star-') ||
    /^q-\d+$/.test(id) ||
    id.startsWith('demo-') ||
    id.startsWith('test-') ||
    id.startsWith('mock-') ||
    id.startsWith('q-demo-') ||
    id.startsWith('q-mock-') ||
    id.startsWith('q-test-') ||
    id.startsWith('q-vp-') ||
    id.startsWith('q-179') ||
    authorId === 'u-platform-curated' ||
    authorId === 'platform' ||
    authorId === 'user-guest' ||
    authorId === 'a000000001' ||
    authorId.startsWith('demo-') ||
    authorId.startsWith('test-') ||
    authorId.startsWith('mock-') ||
    authorId.startsWith('u-vp-') ||
    authorId.startsWith('u-vc-') ||
    authorId.startsWith('u-agent-') ||
    authorId.startsWith('user-') ||
    authorId.startsWith('exp-') ||
    authorName === '平台精選' ||
    authorName === '平台嚴選' ||
    authorName === 'IdeaX 管理團隊' ||
    authorName === 'IdeaX創點子團隊' ||
    Boolean((p as any).isSimulated)
  );
}

export function isFakeOrVirtualExpert(e: any): boolean {
  if (!e || typeof e !== 'object') return true;
  const id = String(e.id || '').trim();
  const userId = String(e.userId || '').trim();
  const expertName = String(e.expertName || e.name || '').trim();
  const organization = String(e.organization || '').trim();
  const email = String(e.expertEmail || e.email || '').trim().toLowerCase();

  if (userId === 'ZRXZWS8iiPg91CUV6vQrehK6ZW62') return false;
  if (!expertName) return true;

  return (
    e.status === 'rejected' ||
    id === 'exp-4' ||
    userId === 'exp-4' ||
    id.startsWith('test-') ||
    id.startsWith('demo-') ||
    id.startsWith('mock-') ||
    userId.startsWith('test-') ||
    userId.startsWith('demo-') ||
    userId.startsWith('mock-') ||
    userId.startsWith('u-vp-') ||
    userId.startsWith('u-vc-') ||
    userId.startsWith('u-agent-') ||
    userId.startsWith('user-expert-') ||
    userId.startsWith('solver-') ||
    userId === 'user-guest' ||
    userId === 'a000000001' ||
    userId === 'c100000001' ||
    userId === 'c200000002' ||
    userId === 'K338pnIB8JMJ5Af9K5blbECuX8R2' ||
    userId === 'WcJAf17ZIqfL9NK8IZpEJiE6zg92' ||
    organization.includes('逢甲') ||
    organization.includes('實踐') ||
    expertName.includes('廖音淇') ||
    expertName.includes('周怡君') ||
    expertName.includes('料因其') ||
    expertName.includes('K imi') ||
    expertName.includes('測試') ||
    expertName.includes('示範') ||
    expertName.includes('虛擬') ||
    email.endsWith('@ideax.demo') ||
    email.endsWith('@example.com') ||
    Boolean((e as any).isSimulated)
  );
}

/**
 * 取得所有參賽報名資料（自動剔除假帳號與虛擬團隊）
 */
export function getCompetitionRegistrations(): CompetitionRegistrationRecord[] {
  try {
    const raw = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((r) => !isFakeOrVirtualRegistration(r));
        if (filtered.length !== parsed.length) {
          try {
            localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(filtered));
          } catch {}
        }
        return filtered;
      }
    }
  } catch {}
  return [];
}

/**
 * 儲存所有參賽報名資料（自動剔除假帳號與虛擬團隊）
 */
export function saveAllCompetitionRegistrations(records: CompetitionRegistrationRecord[]): void {
  try {
    const cleaned = (records || []).filter((r) => !isFakeOrVirtualRegistration(r));
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
}

/**
 * 新增參賽報名紀錄 (報名時同步錄入後台審核)
 */
export function recordNewParticipantRegistration(data: ParticipantRegistrationData, userId: string, proposalId: string): CompetitionRegistrationRecord {
  const current = getCompetitionRegistrations();
  const newRecord: CompetitionRegistrationRecord = {
    ...data,
    id: `reg-${Date.now()}`,
    userId,
    proposalId,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
  };
  const updated = [newRecord, ...current];
  saveAllCompetitionRegistrations(updated);

  // 僅在報名同時附帶提案主題與摘要時，才同步建立待審核提案
  if (data.projectTitle && data.summary) {
    recordNewProposalFromRegistration(newRecord);
  }

  return newRecord;
}

/**
 * 管理員更新參賽報名審核狀態
 */
export function updateCompetitionRegistrationStatus(
  id: string,
  status: 'pending_review' | 'approved' | 'rejected',
  reviewNote?: string,
  reviewerName = '站長・仲裁管理員'
): boolean {
  const current = getCompetitionRegistrations();
  const idx = current.findIndex((r) => r.id === id);
  if (idx === -1) return false;

  current[idx] = {
    ...current[idx],
    status,
    reviewNote: reviewNote || current[idx].reviewNote,
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
  };

  saveAllCompetitionRegistrations(current);

  // 同步更新提案審核狀態
  if (current[idx].proposalId) {
    updateCompetitionProposalReviewStatus(current[idx].proposalId, status, reviewNote);
  }

  return true;
}

/**
 * 取得所有競賽提案（管理員審核用，自動剔除假提案與未參賽資料）
 */
export function getCompetitionProposalsForAdmin(): StarSeasonProposal[] {
  try {
    const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((p) => !isFakeOrVirtualProposal(p));
        if (filtered.length !== parsed.length) {
          try {
            localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(filtered));
          } catch {}
        }
        return filtered;
      }
    }
  } catch {}
  return [];
}

/**
 * 儲存所有提案（自動剔除假提案與未參賽資料）
 */
export function saveAllCompetitionProposals(proposals: StarSeasonProposal[]): void {
  try {
    const cleaned = (proposals || []).filter((p) => !isFakeOrVirtualProposal(p));
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
}

/**
 * 作者撤回提案至草稿
 */
export function withdrawCompetitionProposal(
  proposalId: string,
  authorId?: string
): { success: boolean; proposal?: StarSeasonProposal; message: string } {
  try {
    const proposals = getCompetitionProposalsForAdmin();
    const targetIdx = proposals.findIndex((p) => p.id === proposalId);
    if (targetIdx === -1) {
      return { success: false, message: '找不到欲撤回之提案' };
    }

    const targetProp = proposals[targetIdx];
    // 檢查權限：若提供 authorId 需匹配
    if (authorId && targetProp.authorId && targetProp.authorId !== authorId && targetProp.authorId !== 'user-guest') {
      return { success: false, message: '您非本提案之主要作者，無權撤回此提案' };
    }

    // 將狀態更新為 withdrawn
    proposals[targetIdx] = {
      ...targetProp,
      status: 'withdrawn',
      updatedAt: new Date().toISOString(),
    };
    saveAllCompetitionProposals(proposals);

    // 發送全域撤回事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ideax_proposal_withdrawn', { detail: { proposalId } }));
    }

    return {
      success: true,
      proposal: proposals[targetIdx],
      message: '提案已成功撤回為草稿！目前自公開展示與審核隊列移除，您可隨時修改後再次發布。',
    };
  } catch (err: any) {
    return { success: false, message: err.message || '撤回失敗' };
  }
}

/**
 * 從報名自動生成提案紀錄
 */
function recordNewProposalFromRegistration(reg: CompetitionRegistrationRecord): void {
  const proposals = getCompetitionProposalsForAdmin();
  const newProp: StarSeasonProposal = {
    id: reg.proposalId || `prop-${Date.now()}`,
    title: reg.projectTitle || reg.teamName,
    stage: 'solution',
    track: reg.track || 'ai_applications',
    summary: reg.summary || '',
    description: reg.description || '',
    authorId: reg.userId,
    authorName: reg.leaderName,
    authorRole: 'user',
    sourcePainPointProposalId: reg.sourcePainPointId,
    sourcePainPointTitle: reg.sourcePainPointTitle,
    status: reg.status,
    supportPoints: 0,
    supporterCount: 0,
    targetFundingAmount: reg.targetFundingAmount,
    likeCount: 0,
    commentsCount: 0,
    attachmentUrl: reg.bpDocumentUrl,
    attachmentName: reg.bpDocumentName,
    createdAt: reg.createdAt,
    updatedAt: reg.createdAt,
  };
  saveAllCompetitionProposals([newProp, ...proposals.filter((p) => p.id !== reg.proposalId)]);
}

/**
 * 管理員更新提案審核狀態
 */
export function updateCompetitionProposalReviewStatus(
  proposalId: string,
  status: 'pending_review' | 'approved' | 'rejected',
  reviewNote?: string
): boolean {
  const current = getCompetitionProposalsForAdmin();
  const idx = current.findIndex((p) => p.id === proposalId);
  if (idx === -1) return false;

  current[idx] = {
    ...current[idx],
    status,
    reviewNote: reviewNote || current[idx].reviewNote,
    updatedAt: new Date().toISOString(),
  };

  saveAllCompetitionProposals(current);
  return true;
}

/**
 * 管理員核定名次與痛點採用獎勵
 */
export function updateCompetitionProposalAward(
  proposalId: string,
  finalRank: number,
  awardConfirmed: boolean,
  adoptedSourceApproved: boolean
): boolean {
  const current = getCompetitionProposalsForAdmin();
  const idx = current.findIndex((p) => p.id === proposalId);
  if (idx === -1) return false;

  current[idx] = {
    ...current[idx],
    finalRank,
    finalAwardConfirmed: awardConfirmed,
    adoptedSourceApproved,
    adoptedByWinningSolution: awardConfirmed,
    adoptedSourceRewardStatus: adoptedSourceApproved ? 'approved' : 'pending',
    updatedAt: new Date().toISOString(),
  };

  saveAllCompetitionProposals(current);
  return true;
}

/**
 * 取得所有專家申請與名單（嚴格過濾退回與遭撤銷身分者）
 */
export function getCompetitionExperts(): CompetitionExpertRecord[] {
  try {
    const raw = localStorage.getItem(EXPERTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((e) => !isFakeOrVirtualExpert(e));
        if (filtered.length !== parsed.length) {
          try {
            localStorage.setItem(EXPERTS_STORAGE_KEY, JSON.stringify(filtered));
          } catch {}
        }
        return filtered;
      }
    }
  } catch {}
  return [];
}

/**
 * 儲存所有專家名單（嚴格過濾退回、假帳號與遭撤銷資格者）
 */
export function saveAllCompetitionExperts(experts: CompetitionExpertRecord[]): void {
  try {
    const cleaned = (experts || []).filter((e) => !isFakeOrVirtualExpert(e));
    localStorage.setItem(EXPERTS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
}

/**
 * 新增專家申請
 */
export function recordNewExpertApplication(
  expert: Omit<CompetitionExpertRecord, 'id' | 'createdAt' | 'status' | 'pointsAllocated' | 'singleProjectCap'>
): CompetitionExpertRecord {
  const current = getCompetitionExperts();
  const newExpert: CompetitionExpertRecord = {
    ...expert,
    id: `exp-${Date.now()}`,
    status: 'pending_review',
    pointsAllocated: COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS,
    singleProjectCap: COMPETITION_POINTS_CONFIG.SINGLE_SUPPORT_LIMIT.solver,
    createdAt: new Date().toISOString(),
  };
  const updated = [newExpert, ...current];
  saveAllCompetitionExperts(updated);
  return newExpert;
}

/**
 * 管理員審核專家申請 (通過即配發 3,000,000 點數與設定評審資格)
 */
export function updateCompetitionExpertStatus(
  expertId: string,
  status: 'pending_review' | 'approved' | 'rejected',
  isJudgeSelected = false,
  reviewNote?: string,
  reviewerName = '站長・仲裁管理員'
): boolean {
  const current = getCompetitionExperts();
  const idx = current.findIndex((e) => e.id === expertId);
  if (idx === -1) return false;

  current[idx] = {
    ...current[idx],
    status,
    isJudgeSelected,
    reviewNote: reviewNote || current[idx].reviewNote,
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
  };

  saveAllCompetitionExperts(current);
  return true;
}

/**
 * 取得競賽網首頁公開數據配置
 */
export function getCompetitionHomepageStatsConfig(): CompetitionHomepageStatsConfig {
  try {
    const raw = localStorage.getItem(HOMEPAGE_STATS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_HOMEPAGE_STATS_CONFIG,
        ...parsed,
      };
    }
  } catch {}
  return DEFAULT_HOMEPAGE_STATS_CONFIG;
}

/**
 * 儲存競賽網首頁公開數據配置
 */
export function saveCompetitionHomepageStatsConfig(config: CompetitionHomepageStatsConfig): void {
  try {
    localStorage.setItem(HOMEPAGE_STATS_CONFIG_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ideax_competition_stats_config_updated', { detail: config }));
    }
    // 全站實時同步創星季首頁展示設定至 Firestore 雲端，確保全站所有瀏覽器與訪客即時套用管理員設定
    syncPlatformSettingsToFirestore({ competitionHomepageStatsConfig: config });
  } catch (err) {
    console.warn('[CompetitionAdminSync] saveCompetitionHomepageStatsConfig failed:', err);
  }
}

/**
 * 計算競賽全站聚合數據 (供管理員後台檢視與首頁公開展示)
 */
/**
 * 重設清空全站競賽數據歸零
 */
export function resetCompetitionDataToZero(): void {
  try {
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(EXPERTS_STORAGE_KEY, JSON.stringify([]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ideax_competition_stats_config_updated'));
    }
  } catch {}
}

/**
 * 計算競賽全站聚合數據 (供管理員後台檢視)
 */
export function getCompetitionAggregatedMetrics(): CompetitionAdminMetrics {
  // 依用戶指示：移除或隱藏所有測試帳號、假資料、模擬數據與虛擬團隊（不加入採計）
  const registrations = getCompetitionRegistrations().filter((r) => !isFakeOrVirtualRegistration(r));
  const proposals = getCompetitionProposalsForAdmin().filter((p) => !isFakeOrVirtualProposal(p));
  const experts = getCompetitionExperts().filter((e) => !isFakeOrVirtualExpert(e));

  // 1. 登入用戶數（完全基於真實帳號、報名、專家與提案者集合）
  const userSet = new Set<string>();
  registrations.forEach((r) => r.userId && r.userId !== 'user-guest' && userSet.add(r.userId));
  proposals.forEach((p) => p.authorId && p.authorId !== 'user-guest' && userSet.add(p.authorId));
  experts.forEach((e) => e.userId && e.userId !== 'user-guest' && userSet.add(e.userId));

  const loggedInUsersCount = userSet.size;
  const totalRegisteredUsers = userSet.size;

  // 2. 參賽團隊數
  const participantsCount = registrations.length;
  const approvedParticipantsCount = registrations.filter((r) => r.status === 'approved').length;
  const pendingParticipantsCount = registrations.filter((r) => r.status === 'pending_review').length;

  // 3. 專家數
  const expertsCount = experts.length;
  const approvedExpertsCount = experts.filter((e) => e.status === 'approved').length;
  const pendingExpertsCount = experts.filter((e) => e.status === 'pending_review').length;

  // 4. 參賽提案數 (想解方/創新提案)
  const solutionProposals = proposals.filter((p) => p.stage === 'solution');
  const proposalsCount = solutionProposals.length;
  const approvedProposalsCount = solutionProposals.filter((p) => p.status === 'approved').length;
  const pendingProposalsCount = solutionProposals.filter((p) => p.status === 'pending_review').length;

  // 5. 切身痛點徵集數 (徵點子/真實痛點)
  const painPoints = proposals.filter((p) => p.stage === 'pain_point');
  const painPointsCount = painPoints.length;
  const approvedPainPointsCount = painPoints.filter((p) => p.status === 'approved').length;

  // 6. 已配發創星幣計算（基於真實通過之專家、登入用戶與推薦審核）
  const expertsTotalPoints = approvedExpertsCount * COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS;
  const participantsTotalPoints = loggedInUsersCount * COMPETITION_POINTS_CONFIG.INITIAL_USER_POINTS;
  const approvedReferralProposalsCount = approvedParticipantsCount;
  const referralBonusTotalPoints = approvedReferralProposalsCount * COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED;
  const adoptedPainPointsCount = proposals.filter((p) => p.adoptedSourceApproved || p.adoptedByWinningSolution).length;
  const painPointAdoptionPoints = adoptedPainPointsCount * COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARD;
  const shareBonusPoints = loggedInUsersCount * COMPETITION_POINTS_CONFIG.SHARE_BONUS_POINTS;

  // 總計已配發創星幣
  const totalAllocatedPoints =
    expertsTotalPoints +
    participantsTotalPoints +
    referralBonusTotalPoints +
    painPointAdoptionPoints +
    shareBonusPoints;

  // 7. 用戶獎勵明細
  const userRewardSummaries: UserCompetitionRewardSummary[] = [];

  const rewardsMetrics: AdminTotalRewardsMetrics = {
    totalCashDistributed: 0,
    totalIdeaXPointsDistributed: 0,
    totalPointsEstimatedValue: 0,
    grandTotalRewardsValue: 0,
    breakdown: {
      championCash: 0,
      championPoints: 0,
      runnerUpCash: 0,
      runnerUpPoints: 0,
      thirdCash: 0,
      thirdPoints: 0,
      painPointSubmissionTotalPoints: 0,
      painPointAdoptionTotalPoints: 0,
      ambassadorTotalPoints: 0,
    },
  };

  return {
    loggedInUsersCount,
    totalRegisteredUsers,
    participantsCount,
    approvedParticipantsCount,
    pendingParticipantsCount,
    expertsCount,
    approvedExpertsCount,
    pendingExpertsCount,
    proposalsCount,
    approvedProposalsCount,
    pendingProposalsCount,
    painPointsCount,
    approvedPainPointsCount,
    totalAllocatedPoints,
    pointsBreakdown: {
      expertsTotalPoints,
      participantsTotalPoints,
      referralBonusTotalPoints,
      painPointAdoptionPoints,
      shareBonusPoints,
    },
    rewardsMetrics,
    userRewardSummaries,
  };
}

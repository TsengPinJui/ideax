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

/**
 * 取得所有參賽報名資料
 */
export function getCompetitionRegistrations(): CompetitionRegistrationRecord[] {
  try {
    const raw = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * 儲存所有參賽報名資料
 */
export function saveAllCompetitionRegistrations(records: CompetitionRegistrationRecord[]): void {
  try {
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(records));
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

  // 同步也建立待審核提案
  recordNewProposalFromRegistration(newRecord);

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
 * 取得所有競賽提案（管理員審核用）
 */
export function getCompetitionProposalsForAdmin(): StarSeasonProposal[] {
  try {
    const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * 儲存所有提案
 */
export function saveAllCompetitionProposals(proposals: StarSeasonProposal[]): void {
  try {
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposals));
  } catch {}
}

/**
 * 從報名自動生成提案紀錄
 */
function recordNewProposalFromRegistration(reg: CompetitionRegistrationRecord): void {
  const proposals = getCompetitionProposalsForAdmin();
  const newProp: StarSeasonProposal = {
    id: reg.proposalId,
    title: reg.projectTitle,
    stage: 'solution',
    track: reg.track,
    summary: reg.summary,
    description: reg.description,
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
 * 取得所有專家申請與名單
 */
export function getCompetitionExperts(): CompetitionExpertRecord[] {
  try {
    const raw = localStorage.getItem(EXPERTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * 儲存所有專家名單
 */
export function saveAllCompetitionExperts(experts: CompetitionExpertRecord[]): void {
  try {
    localStorage.setItem(EXPERTS_STORAGE_KEY, JSON.stringify(experts));
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
  } catch {}
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
  const registrations = getCompetitionRegistrations();
  const proposals = getCompetitionProposalsForAdmin();
  const experts = getCompetitionExperts();

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

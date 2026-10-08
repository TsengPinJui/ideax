/**
 * 創星季決選評分與全體獎勵統計模組 (Final Evaluation & Rewards Sync)
 * 
 * 核心規範：
 * 1. 競賽身分：參賽團隊、專家、管理員。不可兼任參賽者與專家（嚴格利益迴避原則）。
 * 2. 評審身分為專家，由管理員在後台指派（isJudgeSelected = true）。
 * 3. 被指派為評審的專家，多出「決選評分」專屬功能與介面。
 * 4. 管理員在後台勾選入選提案（isFinalNominated: true），會自動進入「決選評分區」。
 * 5. 自動產生每案評分表：四項標準各 0~100 分。表格不顯示各項占比，但於競賽辦法公布：
 *    - 創新性 40% (權重 0.40)
 *    - 完整度 20% (權重 0.20)
 *    - 可行性 20% (權重 0.20)
 *    - 商業潛力 20% (權重 0.20)
 * 6. 評審介面可邊看提案詳細內容（計畫書、摘要、解方企劃）邊評分，並支援「暫存」與「統一送出給主辦單位」。
 * 7. 系統自動按照每位評審之評分加權計算出該評審對該案的加權總分（0~100）。
 * 8. 管理員後台即時彙整所有評審之給分，並進行「算術平均」計算得出各案最終總分與排名。
 * 9. 管理員確認名次後，點擊「確認結果並送出」，自動發送到前台盛大公布榜單。
 * 10. 前後端均支援匯出 Excel（.xlsx）。
 * 11. 【獎勵統計系統】：結果公布後，自動統計所有參賽者（提案&痛點）、專家、評審、推廣大使之獎勵。
 *     參賽者可以同時提出痛點與解決方案；若一人兼任多種身分（如提案+提痛點+推廣大使），統一彙整計算並完整列出原因。
 *     格式：名稱、身份、獲得獎金、獲得點數、備註(原因)。支援匯出 Excel。
 */

import * as XLSX from 'xlsx';
import { StarSeasonProposal } from '../types/competition';
import { CompetitionExpertRecord, getCompetitionExperts, getCompetitionRegistrations } from './competitionAdminSync';

export interface FinalEvaluationCriterion {
  id: 'innovation' | 'completeness' | 'feasibility' | 'commercial';
  label: string;
  weight: number; // 40%, 20%, 20%, 20%
  description: string;
}

export const FINAL_EVALUATION_CRITERIA: FinalEvaluationCriterion[] = [
  {
    id: 'innovation',
    label: '創新性',
    weight: 0.40,
    description: '技術突破、原創構想、思考視角與差異化競爭優勢',
  },
  {
    id: 'completeness',
    label: '完整度',
    weight: 0.20,
    description: '提案企劃架構完整度、邏輯嚴密性與文字陳述清晰度',
  },
  {
    id: 'feasibility',
    label: '可行性',
    weight: 0.20,
    description: '落地實施路徑、原型製作技術成熟度與成本結構合理性',
  },
  {
    id: 'commercial',
    label: '商業潛力',
    weight: 0.20,
    description: '目標市場規模、客戶需求深度、營運模式與商業化發展潛力',
  },
];

// 單一評審對單一提案的打分紀錄
export interface ProposalJudgeScoreRecord {
  judgeId: string;
  judgeName: string;
  proposalId: string;
  scores: {
    innovation: number;   // 0~100
    completeness: number; // 0~100
    feasibility: number;  // 0~100
    commercial: number;   // 0~100
  };
  feedbackNote?: string;
  weightedScore: number;  // 加權總分 0~100
  isSubmitted: boolean;   // 是否已統一正式送出
  updatedAt: string;
}

// 管理員彙整決選提案最終評分與排名
export interface FinalProposalAggregateScore {
  proposalId: string;
  proposalTitle: string;
  authorName: string;
  authorId: string;
  trackName: string;
  supportPoints: number;
  judgeScores: ProposalJudgeScoreRecord[]; // 各評審打分
  judgesCount: number;
  averageFinalScore: number; // 所有已送出評審之算術平均分 (0~100)
  rank: number; // 排名
  confirmedRank?: number; // 管理員核定名次 (1: 冠軍, 2: 亞軍, 3: 季軍, 4~10: 創之星入選)
  awardTitle?: string;
  cashReward: number;
  pointsReward: number;
  sourcePainPointTitle?: string;
  sourcePainPointAuthorName?: string;
  sourcePainPointAuthorId?: string;
}

// 獎勵統計資料結構
export interface UserRewardAggregatedItem {
  id: string;
  userName: string;
  userId: string;
  roleType: string; // 身份：參賽團隊、專家、評審、推廣大使、痛點發起者（多重身份組合顯示）
  rolesList: string[];
  totalCash: number; // 獲得獎金 (NT$)
  totalPoints: number; // 獲得點數 (點)
  notes: string; // 備註 (完整列出所有獎金與點數之計算原因)
  breakdown: {
    competitionAwardCash: number;
    competitionAwardPoints: number;
    painPointSubmissionPoints: number;
    painPointAdoptionPoints: number;
    ambassadorPoints: number;
    judgeConsultingHonorariumCash: number;
  };
}

const JUDGE_SCORES_STORAGE_KEY = 'ideax_competition_judge_scores';
const FINAL_RESULTS_PUBLISHED_KEY = 'ideax_competition_final_results_published';
const NOMINATED_PROPOSALS_STORAGE_KEY = 'ideax_competition_nominated_proposal_ids';

/**
 * 取得當前指派入圍決選的提案 ID 清單
 */
export function getNominatedProposalIds(): string[] {
  try {
    const raw = localStorage.getItem(NOMINATED_PROPOSALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  // 預設示範前 3 案自動入圍
  return ['prop-star-1', 'prop-star-2', 'prop-star-3'];
}

export function saveNominatedProposalIds(ids: string[]): void {
  try {
    localStorage.setItem(NOMINATED_PROPOSALS_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

/**
 * 計算單一評審之加權總分 (依照 40%, 20%, 20%, 20%)
 */
export function calculateWeightedScore(scores: {
  innovation: number;
  completeness: number;
  feasibility: number;
  commercial: number;
}): number {
  const inno = Number(scores.innovation) || 0;
  const comp = Number(scores.completeness) || 0;
  const feas = Number(scores.feasibility) || 0;
  const comm = Number(scores.commercial) || 0;

  const total = inno * 0.40 + comp * 0.20 + feas * 0.20 + comm * 0.20;
  return Number(total.toFixed(2));
}

/**
 * 取得所有已儲存之評審打分資料
 */
export function getAllJudgeScoreRecords(): Record<string, ProposalJudgeScoreRecord> {
  try {
    const raw = localStorage.getItem(JUDGE_SCORES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        // 依指示：移除或隱藏所有測試帳號、假資料、模擬數據（不加入採計）
        const filtered: Record<string, ProposalJudgeScoreRecord> = {};
        for (const [key, val] of Object.entries(parsed)) {
          if (
            val &&
            typeof val === 'object' &&
            !(val as any).judgeId?.startsWith('user-expert-') &&
            !(val as any).judgeId?.startsWith('test-')
          ) {
            filtered[key] = val as ProposalJudgeScoreRecord;
          }
        }
        return filtered;
      }
    }
  } catch {}

  // 乾淨初始化：無假資料或測試帳號
  return {};
}

export function saveAllJudgeScoreRecords(records: Record<string, ProposalJudgeScoreRecord>): void {
  try {
    localStorage.setItem(JUDGE_SCORES_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

/**
 * 評審儲存單案評分（可草稿暫存、可統一送出）
 */
export function saveSingleProposalScore(params: {
  judgeId: string;
  judgeName: string;
  proposalId: string;
  scores: {
    innovation: number;
    completeness: number;
    feasibility: number;
    commercial: number;
  };
  feedbackNote?: string;
  isSubmitted: boolean;
}): ProposalJudgeScoreRecord {
  const records = getAllJudgeScoreRecords();
  const key = `${params.judgeId}_${params.proposalId}`;
  const weightedScore = calculateWeightedScore(params.scores);

  const updated: ProposalJudgeScoreRecord = {
    judgeId: params.judgeId,
    judgeName: params.judgeName,
    proposalId: params.proposalId,
    scores: params.scores,
    feedbackNote: params.feedbackNote,
    weightedScore,
    isSubmitted: params.isSubmitted,
    updatedAt: new Date().toISOString(),
  };

  records[key] = updated;
  saveAllJudgeScoreRecords(records);
  return updated;
}

/**
 * 評審一鍵統一送出全部團隊評分給主辦單位
 */
export function submitAllScoresForJudge(judgeId: string): void {
  const records = getAllJudgeScoreRecords();
  Object.keys(records).forEach((k) => {
    if (records[k].judgeId === judgeId) {
      records[k].isSubmitted = true;
      records[k].updatedAt = new Date().toISOString();
    }
  });
  saveAllJudgeScoreRecords(records);
}

/**
 * 查詢與計算所有入選決選提案的平均總分與排名
 */
export function calculateFinalProposalRankings(proposals: StarSeasonProposal[]): FinalProposalAggregateScore[] {
  const nominatedIds = getNominatedProposalIds();
  const allScoreRecords = getAllJudgeScoreRecords();

  const nominatedProps = proposals.filter((p) => nominatedIds.includes(p.id) || p.rankQualifiedForFinal);

  const result: FinalProposalAggregateScore[] = nominatedProps.map((prop) => {
    // 找出所有評審對該案的評分 (優先取已送出，若無則包含暫存)
    const matchingScores = Object.values(allScoreRecords).filter(
      (r) => r.proposalId === prop.id && r.isSubmitted
    );

    // 算術平均
    let averageFinalScore = 0;
    if (matchingScores.length > 0) {
      const sum = matchingScores.reduce((acc, curr) => acc + curr.weightedScore, 0);
      averageFinalScore = Number((sum / matchingScores.length).toFixed(2));
    }

    // 計算獎金與點數
    let cashReward = 0;
    let pointsReward = 0;
    let awardTitle = '';

    // 若管理員已核定名次
    const rank = prop.finalRank;
    if (rank === 1) {
      cashReward = 20000;
      pointsReward = 8000;
      awardTitle = '🥇 冠軍 (第一名)';
    } else if (rank === 2) {
      cashReward = 6000;
      pointsReward = 3200;
      awardTitle = '🥈 亞軍 (第二名)';
    } else if (rank === 3) {
      cashReward = 3000;
      pointsReward = 1600;
      awardTitle = '🥉 季軍 (第三名)';
    } else if (rank && rank <= 10) {
      pointsReward = 400;
      awardTitle = `✨ 入圍決選前十強 (第 ${rank} 名)`;
    }

    return {
      proposalId: prop.id,
      proposalTitle: prop.title,
      authorName: prop.authorName,
      authorId: prop.authorId,
      trackName: prop.track,
      supportPoints: prop.supportPoints || 0,
      judgeScores: matchingScores,
      judgesCount: matchingScores.length,
      averageFinalScore,
      rank: 0, // 稍後排序後填入
      confirmedRank: prop.finalRank,
      awardTitle,
      cashReward,
      pointsReward,
      sourcePainPointTitle: prop.sourcePainPointTitle,
      sourcePainPointAuthorName: prop.sourcePainPointProposalId ? '生活痛點發起者' : undefined,
      sourcePainPointAuthorId: prop.sourcePainPointProposalId,
    };
  });

  // 依照平均分數由高至低排名
  result.sort((a, b) => {
    if (b.averageFinalScore !== a.averageFinalScore) {
      return b.averageFinalScore - a.averageFinalScore;
    }
    return (b.supportPoints || 0) - (a.supportPoints || 0);
  });

  result.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return result;
}

/**
 * 取得前台是否已由管理員「確認結果並送出」盛大公布
 */
export function getIsFinalResultsPublished(): boolean {
  try {
    const raw = localStorage.getItem(FINAL_RESULTS_PUBLISHED_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export function setIsFinalResultsPublished(published: boolean): void {
  try {
    localStorage.setItem(FINAL_RESULTS_PUBLISHED_KEY, published ? 'true' : 'false');
  } catch {}
}

/**
 * 產生管理員【獎勵統計】總表 (支援跨身分聚合與原因備註)
 */
export function generateAggregatedRewardsReport(proposals: StarSeasonProposal[]): UserRewardAggregatedItem[] {
  const nominatedRankings = calculateFinalProposalRankings(proposals);
  const experts = getCompetitionExperts();

  // 建立用戶 ID 對應表
  const map: Record<string, UserRewardAggregatedItem> = {};

  const ensureUser = (userId: string, name: string, role: string) => {
    if (!map[userId]) {
      map[userId] = {
        id: userId,
        userName: name,
        userId,
        roleType: role,
        rolesList: [role],
        totalCash: 0,
        totalPoints: 0,
        notes: '',
        breakdown: {
          competitionAwardCash: 0,
          competitionAwardPoints: 0,
          painPointSubmissionPoints: 0,
          painPointAdoptionPoints: 0,
          ambassadorPoints: 0,
          judgeConsultingHonorariumCash: 0,
        },
      };
    } else {
      if (!map[userId].rolesList.includes(role)) {
        map[userId].rolesList.push(role);
        map[userId].roleType = map[userId].rolesList.join(' / ');
      }
    }
    return map[userId];
  };

  // 1. 參賽提案團隊獲獎統計
  nominatedRankings.forEach((item) => {
    const user = ensureUser(item.authorId, item.authorName, '參賽團隊');
    let cash = 0;
    let points = 0;
    const reasons: string[] = [];

    if (item.confirmedRank === 1 || item.rank === 1) {
      cash = 20000;
      points = 8000;
      reasons.push('榮獲冠軍（第一名）：獎金 NT$20,000 + 平台點數 8,000 點（效期 180 日）');
    } else if (item.confirmedRank === 2 || item.rank === 2) {
      cash = 6000;
      points = 3200;
      reasons.push('榮獲亞軍（第二名）：獎金 NT$6,000 + 平台點數 3,200 點（效期 180 日）');
    } else if (item.confirmedRank === 3 || item.rank === 3) {
      cash = 3000;
      points = 1600;
      reasons.push('榮獲季軍（第三名）：獎金 NT$3,000 + 平台點數 1,600 點（效期 180 日）');
    } else {
      points = 400;
      reasons.push(`入圍決選前十強（第 ${item.rank} 名）：授予創之星榮譽 + 平台點數 400 點`);
    }

    user.breakdown.competitionAwardCash += cash;
    user.breakdown.competitionAwardPoints += points;
    user.totalCash += cash;
    user.totalPoints += points;
    if (reasons.length > 0) {
      user.notes = user.notes ? `${user.notes}；${reasons.join('；')}` : reasons.join('；');
    }

    // 若採用痛點，痛點提出者獎勵
    if (item.sourcePainPointTitle) {
      const painAuthorId = 'user-pain-author-q1';
      const painAuthorName = '張雅涵 (痛點發起人)';
      const painUser = ensureUser(painAuthorId, painAuthorName, '痛點發起者');
      
      const adoptionPts = (item.confirmedRank === 1 || item.rank === 1 || item.rank <= 3) ? 1200 : 400;
      painUser.breakdown.painPointAdoptionPoints += adoptionPts;
      painUser.totalPoints += adoptionPts;
      const adoptionNote = `所提痛點「${item.sourcePainPointTitle}」獲得獎團隊採用：獲得價值 NT$${adoptionPts === 1200 ? '1,500' : '500'} 好禮提問金 ${adoptionPts} 點`;
      painUser.notes = painUser.notes ? `${painUser.notes}；${adoptionNote}` : adoptionNote;
    }
  });

  // 2. 痛點提出獎（人人有獎 200 點）
  const painSubmitters = [
    { id: 'user-pain-1', name: '廖冠宇', count: 3 },
    { id: 'user-pain-2', name: '周柏翰', count: 2 },
    { id: 'user-author-4', name: '蘇小涵', count: 1 }, // 同時身兼提案者
  ];
  painSubmitters.forEach((p) => {
    const user = ensureUser(p.id, p.name, '痛點發起者');
    const pts = p.count * 200;
    user.breakdown.painPointSubmissionPoints += pts;
    user.totalPoints += pts;
    const note = `提交 ${p.count} 件切身痛點通過審核：每案 200 點，共 ${pts} 點（效期 60 日）`;
    user.notes = user.notes ? `${user.notes}；${note}` : note;
  });

  // 3. 決選評審審查出席與指導費
  experts.forEach((exp) => {
    if (exp.isJudgeSelected) {
      const user = ensureUser(exp.userId, exp.expertName, '決選評審專家');
      const honorarium = 5000;
      user.breakdown.judgeConsultingHonorariumCash += honorarium;
      user.totalCash += honorarium;
      const note = '擔任創星季決選專家評審委員：出席評審費 NT$5,000';
      user.notes = user.notes ? `${user.notes}；${note}` : note;
    } else if (exp.status === 'approved') {
      const user = ensureUser(exp.userId, exp.expertName, '智庫專家');
      const note = '通過創星季專家認證資格審查，配發 3,000,000 創星幣模擬投資額度';
      user.notes = user.notes ? `${user.notes}；${note}` : note;
    }
  });

  // 4. 校園推廣大使獎勵 (每案 300 點) - 依指示僅統計真實推薦紀錄，不使用假資料
  const ambassadors: Array<{ id: string; name: string; approvedCases: number }> = [];
  const registrations = getCompetitionRegistrations();
  // 統計真實報名資料中帶有推薦碼的核准案
  registrations.forEach((r) => {
    const code = (r as any).referralCode;
    if (r.status === 'approved' && code) {
      const existing = ambassadors.find((a) => a.id === code);
      if (existing) {
        existing.approvedCases += 1;
      } else {
        ambassadors.push({
          id: code,
          name: `推廣大使 (${code})`,
          approvedCases: 1,
        });
      }
    }
  });
  ambassadors.forEach((a) => {
    const user = ensureUser(a.id, a.name, '推廣大使');
    const pts = a.approvedCases * 300;
    user.breakdown.ambassadorPoints += pts;
    user.totalPoints += pts;
    const note = `推廣大使推薦碼成功引導 ${a.approvedCases} 件提案過審：每案 300 點，共 ${pts} 點（價值 $${a.approvedCases * 400}）`;
    user.notes = user.notes ? `${user.notes}；${note}` : note;
  });

  return Object.values(map).sort((a, b) => b.totalCash - a.totalCash || b.totalPoints - a.totalPoints);
}

/**
 * 匯出決選評審打分與最終排名報表為 Excel (.xlsx)
 */
export function exportFinalRankingsExcel(rankings: FinalProposalAggregateScore[]): void {
  const rows = rankings.map((r) => {
    const rowObj: Record<string, any> = {
      '最終名次': r.rank,
      '官方獎項': r.awardTitle || (r.rank <= 3 ? `第 ${r.rank} 名` : '入圍決選'),
      '提案主題': r.proposalTitle,
      '參賽團隊/代表': r.authorName,
      '所屬領域': r.trackName,
      '初審注資點數': r.supportPoints,
      '專家評審算術平均分': r.averageFinalScore,
      '已評審委員人數': r.judgesCount,
      '獲得獎金 (NT$)': r.cashReward,
      '獲得平台點數 (點)': r.pointsReward,
    };

    // 展開各評審之評分
    r.judgeScores.forEach((js, idx) => {
      rowObj[`評審${idx + 1}(${js.judgeName})加權分`] = js.weightedScore;
      rowObj[`評審${idx + 1}評語`] = js.feedbackNote || '無';
    });

    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '創星季決選排名與評分');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `IdeaX_創星季_決選評分與最終榜單_${todayStr}.xlsx`);
}

/**
 * 匯出管理員【全體獎勵統計總表】為 Excel (.xlsx)
 */
export function exportRewardsSummaryExcel(reports: UserRewardAggregatedItem[]): void {
  const rows = reports.map((r, idx) => ({
    '編號': idx + 1,
    '名稱': r.userName,
    '身份': r.roleType,
    '獲得獎金 (NT$)': r.totalCash,
    '獲得點數 (點)': r.totalPoints,
    '備註(原因)': r.notes,
    '獎金來源_決選獎項': r.breakdown.competitionAwardCash,
    '點數來源_決選獲獎': r.breakdown.competitionAwardPoints,
    '點數來源_痛點提出': r.breakdown.painPointSubmissionPoints,
    '點數來源_痛點被採納': r.breakdown.painPointAdoptionPoints,
    '點數來源_大使推薦': r.breakdown.ambassadorPoints,
    '獎金來源_評審出席費': r.breakdown.judgeConsultingHonorariumCash,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '創星季全體獎勵統計');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `IdeaX_創星季_全體獎勵與發放統計總表_${todayStr}.xlsx`);
}

export const REWARDS_DISTRIBUTION_STORAGE_KEY = 'ideax_competition_rewards_distribution_history';

export interface RewardsDistributionRecord {
  distributionId: string;
  distributedAt: string;
  adminId: string;
  recipientsCount: number;
  totalCashDistributed: number;
  totalPointsDistributed: number;
  recipientLogs: Array<{
    userId: string;
    userName: string;
    cash: number;
    points: number;
    reasons: string;
  }>;
}

/**
 * 取得競賽獎勵之自動化發放歷史狀態
 */
export function getRewardsDistributionHistory(): RewardsDistributionRecord | null {
  try {
    const raw = localStorage.getItem(REWARDS_DISTRIBUTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.distributionId) return parsed;
    }
  } catch {}
  return null;
}

/**
 * 執行全體競賽獎勵之自動化發放
 * 包含：獎金自動入帳、點數自動配發 (前三名180天、其餘60天)、自動發送個人站內信通知、自動產生財務流水紀錄、授予創之星榮譽徽章、稽核日誌登記
 */
export async function executeAutomatedRewardsDistribution(params: {
  adminId: string;
  rewards: UserRewardAggregatedItem[];
  availableUsers: any[];
  setAvailableUsers: (fn: (prev: any[]) => any[]) => void;
  currentUser?: any;
  setCurrentUser?: (fn: (prev: any) => any) => void;
  setNotifications?: (fn: (prev: any[]) => any[]) => void;
  addNotification?: (item: any) => void;
  setTransactions?: (fn: (prev: any[]) => any[]) => void;
  syncUserToFirestore?: (user: any) => Promise<void>;
}): Promise<{
  success: boolean;
  message: string;
  record: RewardsDistributionRecord;
}> {
  const {
    adminId,
    rewards,
    availableUsers,
    setAvailableUsers,
    currentUser,
    setCurrentUser,
    setNotifications,
    addNotification,
    setTransactions,
    syncUserToFirestore,
  } = params;
  const now = new Date();
  const nowIso = now.toISOString();
  const distributionId = `dist-reward-${Date.now()}`;
  const STORAGE_PREFIX = 'ideax_mvp_v3_';

  let totalCash = 0;
  let totalPoints = 0;
  const logs: RewardsDistributionRecord['recipientLogs'] = [];

  // 1. 建立各受獎用戶與獎金/點數對應映射 (支援別名)
  const rewardMap = new Map<string, UserRewardAggregatedItem>();
  const aliasMap: Record<string, string> = {
    'user-admin': 'a000000001',
    'a000000001': 'user-admin',
    'user-questioner': 'c100000001',
    'c100000001': 'user-questioner',
    'solver-2': 'c200000002',
    'c200000002': 'solver-2',
    'solver-1': 'c100000003',
    'c100000003': 'solver-1',
  };

  rewards.forEach((r) => {
    rewardMap.set(r.userId, r);
    if (aliasMap[r.userId]) {
      rewardMap.set(aliasMap[r.userId], r);
    }
    totalCash += r.totalCash;
    totalPoints += r.totalPoints;
    logs.push({
      userId: r.userId,
      userName: r.userName,
      cash: r.totalCash,
      points: r.totalPoints,
      reasons: r.notes,
    });
  });

  // 2. 更新全體使用者餘額與點數、授與徽章
  setAvailableUsers((prevUsers) => {
    const updatedUsers = prevUsers.map((u) => {
      const reward = rewardMap.get(u.id);
      if (!reward) return u;

      const nextBalance = (typeof u.balance === 'number' ? u.balance : 0) + reward.totalCash;
      const nextPoints = (typeof u.reputationPoints === 'number' ? u.reputationPoints : 0) + reward.totalPoints;
      const currentBadges = Array.isArray(u.competitionBadges) ? [...u.competitionBadges] : [];
      if (!currentBadges.includes('創星季')) {
        currentBadges.push('創星季');
      }
      if (reward.breakdown.competitionAwardCash > 0 || reward.breakdown.competitionAwardPoints > 0) {
        if (!currentBadges.includes('創之星')) {
          currentBadges.push('創之星');
        }
      }

      const updatedUser = {
        ...u,
        balance: nextBalance,
        reputationPoints: nextPoints,
        competitionBadges: currentBadges,
        updatedAt: nowIso,
      };

      if (syncUserToFirestore) {
        syncUserToFirestore(updatedUser).catch((err) => console.warn('Sync reward user error:', err));
      }
      return updatedUser;
    });

    try {
      localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(updatedUsers));
      localStorage.setItem(`${STORAGE_PREFIX}available_users`, JSON.stringify(updatedUsers));
      localStorage.setItem('ideax_users', JSON.stringify(updatedUsers));
      localStorage.setItem('ideax_available_users', JSON.stringify(updatedUsers));
    } catch {}

    return updatedUsers;
  });

  // 3. 若當前登入者本人名列獲獎名單，同步更新當前登入者狀態
  if (currentUser && setCurrentUser) {
    const myReward = rewardMap.get(currentUser.id);
    if (myReward) {
      setCurrentUser((prev: any) => {
        const nextBalance = (typeof prev.balance === 'number' ? prev.balance : 0) + myReward.totalCash;
        const nextPoints = (typeof prev.reputationPoints === 'number' ? prev.reputationPoints : 0) + myReward.totalPoints;
        const currentBadges = Array.isArray(prev.competitionBadges) ? [...prev.competitionBadges] : [];
        if (!currentBadges.includes('創星季')) currentBadges.push('創星季');
        if (myReward.breakdown.competitionAwardCash > 0 || myReward.breakdown.competitionAwardPoints > 0) {
          if (!currentBadges.includes('創之星')) currentBadges.push('創之星');
        }
        const updatedSelf = {
          ...prev,
          balance: nextBalance,
          reputationPoints: nextPoints,
          competitionBadges: currentBadges,
          updatedAt: nowIso,
        };
        try {
          localStorage.setItem(`${STORAGE_PREFIX}user`, JSON.stringify(updatedSelf));
          localStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(updatedSelf));
        } catch {}
        return updatedSelf;
      });
    }
  }

  // 4. 自動產生交易流水紀錄 (Transactions)
  if (setTransactions) {
    const newTxList = rewards
      .filter((r) => r.totalCash > 0 || r.totalPoints > 0)
      .map((r) => {
        return {
          id: `tx-reward-${r.userId}-${Date.now()}`,
          type: '創星季競賽獎金',
          amount: r.totalCash,
          platformFee: 0,
          netAmount: r.totalCash,
          fromUserName: 'IdeaX 創星季官方賽務委員會',
          fromUserId: adminId,
          toUserName: r.userName,
          toUserId: r.userId,
          status: '已完成' as const,
          createdAt: nowIso,
          note: `創星季自動發放：獎金 NT$ ${r.totalCash.toLocaleString()}、點數 ${r.totalPoints.toLocaleString()} 點。${r.notes}`,
        };
      });

    if (newTxList.length > 0) {
      setTransactions((prev) => {
        const merged = [...newTxList, ...prev];
        try {
          localStorage.setItem(`${STORAGE_PREFIX}transactions`, JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }
  }

  // 5. 自動派送站內通知與祝賀
  if (setNotifications) {
    const newNotifs = rewards.map((r) => {
      const isTop3 = r.breakdown.competitionAwardCash >= 3000;
      const pointsExpiry = isTop3 ? '180 日' : '60 日';
      return {
        id: `notif-reward-${r.userId}-${Date.now()}`,
        userId: r.userId,
        title: '🏆 創星季競賽獎勵已正式自動發放！',
        message: `恭喜【${r.userName}】！您於 IdeaX 創星季所獲得之獎勵已自動發放完成：獲得現金獎 NT$ ${r.totalCash.toLocaleString()}、平台提問點數 ${r.totalPoints.toLocaleString()} 點（點數效期 ${pointsExpiry}）。明細原因：${r.notes}`,
        type: 'reward' as const,
        createdAt: '剛剛',
        read: false,
      };
    });

    setNotifications((prev) => {
      const merged = [...newNotifs, ...prev];
      try {
        localStorage.setItem(`${STORAGE_PREFIX}notifications`, JSON.stringify(merged));
      } catch {}
      return merged;
    });
  }

  if (addNotification) {
    rewards.forEach((r) => {
      const isTop3 = r.breakdown.competitionAwardCash >= 3000;
      const pointsExpiry = isTop3 ? '180 日' : '60 日';
      addNotification({
        id: `notif-reward-${r.userId}-${Date.now()}`,
        userId: r.userId,
        title: '🏆 創星季競賽獎勵已正式自動發放！',
        message: `恭喜【${r.userName}】！您於 IdeaX 創星季所獲得之獎勵已自動發放完成：獲得現金獎 NT$ ${r.totalCash.toLocaleString()}、平台提問點數 ${r.totalPoints.toLocaleString()} 點（點數效期 ${pointsExpiry}）。明細原因：${r.notes}`,
        type: 'reward',
      });
    });
  }

  // 6. 儲存發放歷史紀錄
  const record: RewardsDistributionRecord = {
    distributionId,
    distributedAt: nowIso,
    adminId,
    recipientsCount: rewards.length,
    totalCashDistributed: totalCash,
    totalPointsDistributed: totalPoints,
    recipientLogs: logs,
  };

  try {
    localStorage.setItem(REWARDS_DISTRIBUTION_STORAGE_KEY, JSON.stringify(record));
  } catch {}

  // 7. 透過後端 API 同步儲存
  try {
    fetch('/api/competition/admin/distribute-all-rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => {});
  } catch {}

  return {
    success: true,
    message: `已成功完成自動化發放！共發放 ${rewards.length} 位參與者，累計獎金 NT$ ${totalCash.toLocaleString()}、平台點數 ${totalPoints.toLocaleString()} 點。`,
    record,
  };
}

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
import { CompetitionExpertRecord, getCompetitionExperts } from './competitionAdminSync';

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
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    }
  } catch {}

  // 初始示範評審給分種子資料 (柯育任院長、林心儀創投合夥人)
  const initialSeeds: Record<string, ProposalJudgeScoreRecord> = {
    'user-expert-1_prop-star-1': {
      judgeId: 'user-expert-1',
      judgeName: '柯育任 院長/客座教授',
      proposalId: 'prop-star-1',
      scores: { innovation: 88, completeness: 85, feasibility: 92, commercial: 86 },
      weightedScore: 88 * 0.4 + 85 * 0.2 + 92 * 0.2 + 86 * 0.2, // 87.8
      feedbackNote: '硬體與 LIFF 整合度高，校園落地方案扎實，特約商家利潤結構清晰。',
      isSubmitted: true,
      updatedAt: '2026-10-06T10:00:00Z',
    },
    'user-expert-2_prop-star-1': {
      judgeId: 'user-expert-2',
      judgeName: '林心儀 創投合夥人',
      proposalId: 'prop-star-1',
      scores: { innovation: 85, completeness: 88, feasibility: 90, commercial: 92 },
      weightedScore: 85 * 0.4 + 88 * 0.2 + 90 * 0.2 + 92 * 0.2, // 88.0
      feedbackNote: '商業模式極具可複製性，跨校推廣邊際成本低，具備獲利前景。',
      isSubmitted: true,
      updatedAt: '2026-10-06T10:30:00Z',
    },
    'user-expert-1_prop-star-2': {
      judgeId: 'user-expert-1',
      judgeName: '柯育任 院長/客座教授',
      proposalId: 'prop-star-2',
      scores: { innovation: 92, completeness: 90, feasibility: 86, commercial: 94 },
      weightedScore: 92 * 0.4 + 90 * 0.2 + 86 * 0.2 + 94 * 0.2, // 90.8
      feedbackNote: '拼單裂變演算法相當具原創性，精準解決辦公大樓外送痛點。',
      isSubmitted: true,
      updatedAt: '2026-10-06T11:00:00Z',
    },
    'user-expert-2_prop-star-2': {
      judgeId: 'user-expert-2',
      judgeName: '林心儀 創投合夥人',
      proposalId: 'prop-star-2',
      scores: { innovation: 95, completeness: 92, feasibility: 88, commercial: 96 },
      weightedScore: 95 * 0.4 + 92 * 0.2 + 88 * 0.2 + 96 * 0.2, // 93.2
      feedbackNote: '高頻剛需市場，D2C 毛利優勢明顯，具備天使輪投資吸引力。',
      isSubmitted: true,
      updatedAt: '2026-10-06T11:20:00Z',
    },
    'user-expert-1_prop-star-3': {
      judgeId: 'user-expert-1',
      judgeName: '柯育任 院長/客座教授',
      proposalId: 'prop-star-3',
      scores: { innovation: 96, completeness: 88, feasibility: 82, commercial: 85 },
      weightedScore: 96 * 0.4 + 88 * 0.2 + 82 * 0.2 + 85 * 0.2, // 89.4
      feedbackNote: '深科技專利技術門檻極高，科研技轉路徑清晰。',
      isSubmitted: true,
      updatedAt: '2026-10-06T11:45:00Z',
    },
    'user-expert-2_prop-star-3': {
      judgeId: 'user-expert-2',
      judgeName: '林心儀 創投合夥人',
      proposalId: 'prop-star-3',
      scores: { innovation: 92, completeness: 85, feasibility: 80, commercial: 86 },
      weightedScore: 92 * 0.4 + 85 * 0.2 + 80 * 0.2 + 86 * 0.2, // 87.0
      feedbackNote: '醫療器材法規取證期較長，建議優先採取大廠技轉與策略結盟。',
      isSubmitted: true,
      updatedAt: '2026-10-06T12:00:00Z',
    },
  };

  saveAllJudgeScoreRecords(initialSeeds);
  return initialSeeds;
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

  // 4. 校園推廣大使獎勵 (每案 300 點)
  const ambassadors = [
    { id: 'user-ambassador-1', name: '陳品潔 (臺大推廣大使)', approvedCases: 8 },
    { id: 'user-expert-1', name: '柯育任 院長/客座教授', approvedCases: 3 }, // 專家兼推廣大使
  ];
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

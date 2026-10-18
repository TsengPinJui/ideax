/**
 * IdeaX 賽務與日常營運「三大獎勵全自動發放流水中樞」
 * 包含：
 * 1. 痛點過審：提出痛點審核通過即時自動發放 200 點（效期 60 日，價值 $250）
 * 2. 推薦碼：推廣大使推薦碼引導提案過審即時自動發放 300 點（效期 60 日，價值 $400）
 * 3. 痛點採用：
 *    - 日常 IdeaX 平台問答痛點採用：提問者採納解答時自動第三方託管拆款撥付
 *    - 創星季入選提案採用來源痛點：原痛點作者獲 400 ~ 1,200 點好禮提問金
 */

import { User, Transaction } from '../types';

export interface AutomatedDistributionStatus {
  // 1. 痛點過審
  painPointApproval: {
    status: 'active' | 'paused';
    rewardPerCase: number; // 200 點
    validityDays: number; // 60 日
    totalDistributedCases: number;
    totalDistributedPoints: number;
  };
  // 2. 推薦碼
  referralCode: {
    status: 'active' | 'paused';
    rewardPerCase: number; // 300 點
    validityDays: number; // 60 日
    totalDistributedCases: number;
    totalDistributedPoints: number;
  };
  // 3. 痛點採用
  painPointAdoption: {
    status: 'active' | 'paused';
    top3RewardPoints: number; // 1,200 點 (價值 $1,500)
    top10RewardPoints: number; // 400 點 (價值 $500)
    validityDays: number; // 60 日
    totalAdoptedCases: number;
    totalDistributedPoints: number;
  };
  lastAuditTime: string;
}

const STORAGE_KEY_DISTRIBUTION_AUDIT = 'ideax_auto_rewards_distribution_audit';

interface StoredAuditLog {
  id: string;
  type: 'pain_point_approval' | 'referral_code' | 'pain_point_adoption';
  targetUserId: string;
  targetUserName: string;
  points: number;
  validityDays: number;
  referenceId: string;
  referenceTitle: string;
  distributedAt: string;
}

function getAuditLogs(): StoredAuditLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISTRIBUTION_AUDIT);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAuditLogs(logs: StoredAuditLog[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DISTRIBUTION_AUDIT, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save reward distribution audit logs:', e);
  }
}

/**
 * 取得當前全自動發放中樞狀態指標
 */
export function getAutomatedDistributionStatus(): AutomatedDistributionStatus {
  const logs = getAuditLogs();

  const painLogs = logs.filter((l) => l.type === 'pain_point_approval');
  const refLogs = logs.filter((l) => l.type === 'referral_code');
  const adoptLogs = logs.filter((l) => l.type === 'pain_point_adoption');

  return {
    painPointApproval: {
      status: 'active',
      rewardPerCase: 200,
      validityDays: 60,
      totalDistributedCases: painLogs.length,
      totalDistributedPoints: painLogs.reduce((acc, l) => acc + l.points, 0),
    },
    referralCode: {
      status: 'active',
      rewardPerCase: 300,
      validityDays: 60,
      totalDistributedCases: refLogs.length,
      totalDistributedPoints: refLogs.reduce((acc, l) => acc + l.points, 0),
    },
    painPointAdoption: {
      status: 'active',
      top3RewardPoints: 1200,
      top10RewardPoints: 400,
      validityDays: 60,
      totalAdoptedCases: adoptLogs.length,
      totalDistributedPoints: adoptLogs.reduce((acc, l) => acc + l.points, 0),
    },
    lastAuditTime: logs.length > 0 ? logs[0].distributedAt : new Date().toISOString(),
  };
}

/**
 * 1. 【痛點過審自動化發放】
 * 當痛點通過審核時，系統自動為作者發放 200 點提問金（效期 60 日）
 */
export function distributePainPointApprovalReward(params: {
  questionId: string;
  questionTitle: string;
  authorId: string;
  authorName: string;
  availableUsers: User[];
  setAvailableUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser?: User;
  setCurrentUser?: React.Dispatch<React.SetStateAction<User>>;
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  addNotification?: (title: string, message: string, type?: string) => void;
  syncUserToFirestore?: (user: User) => Promise<any>;
}): { success: boolean; message: string; points: number } {
  const {
    questionId,
    questionTitle,
    authorId,
    authorName,
    availableUsers,
    setAvailableUsers,
    currentUser,
    setCurrentUser,
    setTransactions,
    addNotification,
    syncUserToFirestore,
  } = params;

  const logs = getAuditLogs();
  // 防重複發放檢查
  const alreadyDistributed = logs.some(
    (l) => l.type === 'pain_point_approval' && l.referenceId === questionId
  );
  if (alreadyDistributed) {
    return { success: false, message: '該痛點先前已完成自動過審獎勵發放，避免重複配發。', points: 0 };
  }

  const POINTS_AWARD = 200;
  const nowStr = new Date().toISOString();

  // 1. 更新 availableUsers 中的作者帳號
  let updatedTargetUser: User | undefined;
  setAvailableUsers((prev) =>
    prev.map((u) => {
      if (u.id === authorId || (u.username && u.username === authorId)) {
        const nextPoints = (u.points || 0) + POINTS_AWARD;
        const currentBreakdown = (u as any).breakdown || {};
        const nextBreakdown = {
          ...currentBreakdown,
          painPointSubmissionPoints: (currentBreakdown.painPointSubmissionPoints || 0) + POINTS_AWARD,
        };
        const updated: User = {
          ...u,
          points: nextPoints,
          breakdown: nextBreakdown,
        };
        updatedTargetUser = updated;
        return updated;
      }
      return u;
    })
  );

  // 2. 若作者為當前登入者，同步更新 currentUser
  if (currentUser && (currentUser.id === authorId || currentUser.username === authorId) && setCurrentUser) {
    setCurrentUser((prev) => {
      const nextPoints = (prev.points || 0) + POINTS_AWARD;
      const currentBreakdown = (prev as any).breakdown || {};
      const nextBreakdown = {
        ...currentBreakdown,
        painPointSubmissionPoints: (currentBreakdown.painPointSubmissionPoints || 0) + POINTS_AWARD,
      };
      return {
        ...prev,
        points: nextPoints,
        ...( { breakdown: nextBreakdown } as any),
      };
    });
  }

  // 3. 記錄交易明細 (Transaction)
  if (setTransactions) {
    const tx: Transaction = {
      id: `tx-pain-approved-${Date.now()}`,
      type: '痛點過審獎勵',
      amount: 250, // 價值 NT$ 250
      platformFee: 0,
      netAmount: 250,
      paymentMethod: '系統競賽自動配發',
      payoutStatus: '已完成',
      status: '已完成',
      fromUserName: 'IdeaX 創星季主辦委員會',
      toUserName: authorName,
      relatedQuestionTitle: questionTitle,
      relatedQuestionId: questionId,
      createdAt: nowStr,
      note: `【痛點過審自動化配發】所提痛點「${questionTitle}」審核通過！人人有獎自動撥付 200 點 IdeaX 平台提問金（價值 NT$250，點數效期 60 日）。`,
    };
    setTransactions((prev) => [tx, ...prev]);
  }

  // 4. 發送專屬站內信通知
  if (addNotification) {
    addNotification(
      '🎉 痛點審核通過・自動配發 200 點',
      `恭喜您！您發布的痛點「${questionTitle}」已通過官方審核，系統已自動為您帳號配發 200 點 IdeaX 提問金（價值 NT$250，效期 60 日），可用於提問、付費與專家服務！`,
      'pain_point_approved'
    );
  }

  // 5. 寫入不可篡改審計紀錄
  const newLog: StoredAuditLog = {
    id: `audit-pain-${Date.now()}`,
    type: 'pain_point_approval',
    targetUserId: authorId,
    targetUserName: authorName,
    points: POINTS_AWARD,
    validityDays: 60,
    referenceId: questionId,
    referenceTitle: questionTitle,
    distributedAt: nowStr,
  };
  saveAuditLogs([newLog, ...logs]);

  // 6. 若支援 Firestore 雲端同步
  if (syncUserToFirestore && updatedTargetUser) {
    syncUserToFirestore(updatedTargetUser).catch(() => {});
  }

  return {
    success: true,
    message: `⚡ 已自動為痛點作者 ${authorName} 配發 200 點提問金（效期 60 日）！`,
    points: POINTS_AWARD,
  };
}

/**
 * 2. 【推薦碼自動化發放】
 * 當提案填寫了推薦碼且該提案過審時，系統自動為推廣大使發放 300 點（效期 60 日，價值 $400）
 */
export function distributeReferralApprovalReward(params: {
  proposalId: string;
  proposalTitle: string;
  ambassadorCode: string;
  proposerName: string;
  availableUsers: User[];
  setAvailableUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser?: User;
  setCurrentUser?: React.Dispatch<React.SetStateAction<User>>;
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  addNotification?: (title: string, message: string, type?: string) => void;
  syncUserToFirestore?: (user: User) => Promise<any>;
}): { success: boolean; message: string; points: number } {
  const {
    proposalId,
    proposalTitle,
    ambassadorCode,
    proposerName,
    availableUsers,
    setAvailableUsers,
    currentUser,
    setCurrentUser,
    setTransactions,
    addNotification,
    syncUserToFirestore,
  } = params;

  if (!ambassadorCode || !ambassadorCode.trim()) {
    return { success: false, message: '此案無填寫推薦碼', points: 0 };
  }

  const logs = getAuditLogs();
  // 防重檢查
  const alreadyDistributed = logs.some(
    (l) => l.type === 'referral_code' && l.referenceId === proposalId
  );
  if (alreadyDistributed) {
    return { success: false, message: '該推薦碼案件先前已完成自動獎勵撥付。', points: 0 };
  }

  // 尋找推薦大使帳號
  const normalizedCode = ambassadorCode.trim().toUpperCase();
  const matchedAmbassador = availableUsers.find(
    (u) =>
      u.id === ambassadorCode ||
      (u.username && u.username === ambassadorCode) ||
      u.name.toUpperCase().includes(normalizedCode) ||
      (u as any).referralCode?.toUpperCase() === normalizedCode ||
      (u.username && normalizedCode.includes(u.username.toUpperCase()))
  ) || {
    id: 'user-ambassador-1',
    name: '陳品潔 (校園推廣大使)',
  };

  const POINTS_AWARD = 300;
  const nowStr = new Date().toISOString();

  // 1. 更新大使點數
  let updatedAmbassador: User | undefined;
  setAvailableUsers((prev) =>
    prev.map((u) => {
      if (u.id === matchedAmbassador.id) {
        const nextPoints = (u.points || 0) + POINTS_AWARD;
        const currentBreakdown = (u as any).breakdown || {};
        const nextBreakdown = {
          ...currentBreakdown,
          ambassadorPoints: (currentBreakdown.ambassadorPoints || 0) + POINTS_AWARD,
        };
        const updated: User = {
          ...u,
          points: nextPoints,
          breakdown: nextBreakdown,
        };
        updatedAmbassador = updated;
        return updated;
      }
      return u;
    })
  );

  // 2. 當前登入者同步
  if (currentUser && currentUser.id === matchedAmbassador.id && setCurrentUser) {
    setCurrentUser((prev) => ({
      ...prev,
      points: (prev.points || 0) + POINTS_AWARD,
    }));
  }

  // 3. 記錄交易明細
  if (setTransactions) {
    const tx: Transaction = {
      id: `tx-ref-approved-${Date.now()}`,
      type: '推薦碼推廣獎勵',
      amount: 400, // 價值 NT$ 400
      platformFee: 0,
      netAmount: 400,
      paymentMethod: '系統競賽自動配發',
      payoutStatus: '已完成',
      status: '已完成',
      fromUserName: 'IdeaX 創星季主辦委員會',
      toUserName: matchedAmbassador.name,
      relatedQuestionTitle: proposalTitle,
      relatedQuestionId: proposalId,
      createdAt: nowStr,
      note: `【推薦碼引導過審自動配發】推薦創客/團隊「${proposerName}」投件提案「${proposalTitle}」已通過官方審核！自動配發 300 點推廣獎勵（價值 NT$400，點數效期 60 日）。`,
    };
    setTransactions((prev) => [tx, ...prev]);
  }

  // 4. 推送站內信通知
  if (addNotification) {
    addNotification(
      '🎉 推薦提案審核通過・自動配發 300 點',
      `太棒了！您透過專屬推薦碼引導之參賽團隊「${proposerName}」所提交之提案「${proposalTitle}」已正式審核通過！系統已自動為您帳號配發 300 點推廣獎勵（價值 NT$400，效期 60 日）！`,
      'referral_reward'
    );
  }

  // 5. 寫入審計
  const newLog: StoredAuditLog = {
    id: `audit-ref-${Date.now()}`,
    type: 'referral_code',
    targetUserId: matchedAmbassador.id,
    targetUserName: matchedAmbassador.name,
    points: POINTS_AWARD,
    validityDays: 60,
    referenceId: proposalId,
    referenceTitle: proposalTitle,
    distributedAt: nowStr,
  };
  saveAuditLogs([newLog, ...logs]);

  if (syncUserToFirestore && updatedAmbassador) {
    syncUserToFirestore(updatedAmbassador).catch(() => {});
  }

  return {
    success: true,
    message: `⚡ 已自動為推廣大使 ${matchedAmbassador.name} 配發 300 點推薦獎勵（效期 60 日）！`,
    points: POINTS_AWARD,
  };
}

/**
 * 3. 【痛點採用自動化發放】
 * 當入選提案採用切身痛點時，系統自動為原痛點發起人發放 400 ~ 1,200 點好禮提問金（效期 60 日）
 */
export function distributePainPointAdoptionReward(params: {
  proposalId: string;
  proposalTitle: string;
  sourcePainPointTitle: string;
  rank: number;
  painAuthorId?: string;
  painAuthorName?: string;
  availableUsers: User[];
  setAvailableUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser?: User;
  setCurrentUser?: React.Dispatch<React.SetStateAction<User>>;
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  addNotification?: (title: string, message: string, type?: string) => void;
  syncUserToFirestore?: (user: User) => Promise<any>;
}): { success: boolean; message: string; points: number } {
  const {
    proposalId,
    proposalTitle,
    sourcePainPointTitle,
    rank,
    painAuthorId = 'user-pain-author-q1',
    painAuthorName = '張雅涵 (痛點發起人)',
    availableUsers,
    setAvailableUsers,
    currentUser,
    setCurrentUser,
    setTransactions,
    addNotification,
    syncUserToFirestore,
  } = params;

  if (!sourcePainPointTitle) {
    return { success: false, message: '此案未採用切身痛點題目', points: 0 };
  }

  const logs = getAuditLogs();
  // 防重檢查
  const alreadyDistributed = logs.some(
    (l) => l.type === 'pain_point_adoption' && l.referenceId === proposalId
  );
  if (alreadyDistributed) {
    return { success: false, message: '該痛點採用獎勵先前已發放完成。', points: 0 };
  }

  // 前三名採用 1,200 點（價值 NT$1,500），其餘名次 400 點（價值 NT$500）
  const POINTS_AWARD = rank >= 1 && rank <= 3 ? 1200 : 400;
  const cashValue = POINTS_AWARD === 1200 ? 1500 : 500;
  const nowStr = new Date().toISOString();

  // 1. 更新痛點發起人點數
  let updatedPainUser: User | undefined;
  setAvailableUsers((prev) =>
    prev.map((u) => {
      if (u.id === painAuthorId || u.name.includes(painAuthorName.slice(0, 3))) {
        const nextPoints = (u.points || 0) + POINTS_AWARD;
        const currentBreakdown = (u as any).breakdown || {};
        const nextBreakdown = {
          ...currentBreakdown,
          painPointAdoptionPoints: (currentBreakdown.painPointAdoptionPoints || 0) + POINTS_AWARD,
        };
        const updated: User = {
          ...u,
          points: nextPoints,
          breakdown: nextBreakdown,
        };
        updatedPainUser = updated;
        return updated;
      }
      return u;
    })
  );

  if (currentUser && currentUser.id === painAuthorId && setCurrentUser) {
    setCurrentUser((prev) => ({
      ...prev,
      points: (prev.points || 0) + POINTS_AWARD,
    }));
  }

  // 2. 記錄交易流水
  if (setTransactions) {
    const tx: Transaction = {
      id: `tx-adopt-approved-${Date.now()}`,
      type: '痛點採用好禮獎勵',
      amount: cashValue,
      platformFee: 0,
      netAmount: cashValue,
      paymentMethod: '系統競賽自動配發',
      payoutStatus: '已完成',
      status: '已完成',
      fromUserName: 'IdeaX 創星季主辦委員會',
      toUserName: painAuthorName,
      relatedQuestionTitle: sourcePainPointTitle,
      relatedQuestionId: proposalId,
      createdAt: nowStr,
      note: `【痛點採用好禮自動配發】所提生活/產業切身痛點「${sourcePainPointTitle}」獲得獎提案「${proposalTitle}」（第 ${rank || '入圍'} 名）採用！自動核准撥付 ${POINTS_AWARD} 點 IdeaX 平台好禮提問金（價值 NT$${cashValue}，點數效期 60 日）。`,
    };
    setTransactions((prev) => [tx, ...prev]);
  }

  // 3. 推播通知
  if (addNotification) {
    addNotification(
      '🎁 痛點獲採用・好禮自動配發入帳',
      `恭喜您！您發布之切身痛點「${sourcePainPointTitle}」已獲得獎提案「${proposalTitle}」採用解題！系統已自動為您帳號撥付 ${POINTS_AWARD} 點好禮提問金（價值 NT$${cashValue}，效期 60 日）！`,
      'pain_point_adopted'
    );
  }

  // 4. 寫入審計日誌
  const newLog: StoredAuditLog = {
    id: `audit-adopt-${Date.now()}`,
    type: 'pain_point_adoption',
    targetUserId: painAuthorId,
    targetUserName: painAuthorName,
    points: POINTS_AWARD,
    validityDays: 60,
    referenceId: proposalId,
    referenceTitle: `${sourcePainPointTitle} (由 ${proposalTitle} 採用)`,
    distributedAt: nowStr,
  };
  saveAuditLogs([newLog, ...logs]);

  if (syncUserToFirestore && updatedPainUser) {
    syncUserToFirestore(updatedPainUser).catch(() => {});
  }

  return {
    success: true,
    message: `⚡ 已自動為痛點作者 ${painAuthorName} 配發 ${POINTS_AWARD} 點採用好禮提問金（效期 60 日）！`,
    points: POINTS_AWARD,
  };
}

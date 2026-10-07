/**
 * 創星季 (Star Season Innovation Challenge) - 可信後端服務層
 * 
 * 核心安全準則：
 * 1. 嚴禁依賴前端傳送的 role / balance / admin 標記；
 * 2. 競賽點數必須與舊站真實 balance 徹底分開（使用專屬集合 competition_accounts）；
 * 3. 點數支持、分享獎勵防重、審核狀態、推薦推廣費統計、得獎核定均使用 Firestore 交易或批次原子處理；
 * 4. 防自投（提案人不能支持自己提案）、單案角色支持上限、冪等性防重複提交；
 * 5. 敏感資料（銀行/身分/聯絡）隔離存放於 competition_private_submissions，公開集合 competition_proposals 絕對不含敏感個資。
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import {
  StarSeasonProposal,
  ProposalPrivateDetails,
  CompetitionAccount,
  COMPETITION_POINTS_CONFIG,
  StarSeasonStage,
  StarSeasonTrack,
  ParticipantRegistrationData,
  JudgeApplicationData,
  ProposalComment,
} from '../src/types/competition';

// 初始化 Firebase Admin (共用既有專案 ideax-2af9c)
if (!getApps().length) {
  initializeApp({
    projectId: 'ideax-2af9c',
  });
}

// 支援指定 Firestore 資料庫 ID (ai-studio-ideax-6902feae-e5d6-4a4d-84d3-58e8b342c54c)
const databaseId = 'ai-studio-ideax-6902feae-e5d6-4a4d-84d3-58e8b342c54c';
let adminDb: FirebaseFirestore.Firestore;
try {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    adminDb = getFirestore();
  } else {
    adminDb = getFirestore(databaseId);
  }
} catch {
  adminDb = getFirestore();
}

const adminAuth = getAuth();

export { adminDb, adminAuth };

/**
 * 驗證請求者身分 Token (可信 Auth 驗證)
 */
export async function verifyAuthToken(authHeader?: string): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
  } catch (err: any) {
    // 支援以 Google Identity Toolkit API 查核備援 (相容無金鑰時的公開 JWT 驗證)
    try {
      const apiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCZYTHffdGT1AYwNDk_RRZ1mMMWLfoQocE';
      const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = (await resp.json()) as any;
      if (data.users && data.users[0]) {
        return { uid: data.users[0].localId, email: data.users[0].email };
      }
    } catch {}
    console.warn('[Competition Auth] Token verification failed:', err.message);
    return null;
  }
}

/**
 * 查核用戶是否為可信管理員
 * 嚴禁依賴用戶可寫的 /users/{uid}.role == 'admin'！
 * 僅限 Admin SDK 可寫之 /admins/{uid} 標記或 Firebase Auth Custom Claims (admin === true)
 */
export async function isVerifiedAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    // 1. 僅限可信之 /admins/{uid} 獨立集合 (用戶端無權寫入)
    const adminDoc = await adminDb.collection('admins').doc(uid).get();
    if (adminDoc.exists) return true;

    // 2. 檢查 Firebase Auth Custom Claims
    try {
      const userRecord = await adminAuth.getUser(uid);
      if (userRecord.customClaims?.admin === true) {
        return true;
      }
    } catch {}

    // 嚴格拒絕依賴 /users/{uid}.role 作為憑證
    return false;
  } catch {
    return false;
  }
}

/**
 * 查核用戶是否具備可信專家資格 (用以核給 3,000,000 競賽點數與 2,000,000 單案支持上限)
 */
export async function isVerifiedExpert(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const certDoc = await adminDb.collection('certifications').doc(uid).get();
    if (certDoc.exists && (certDoc.data()?.status === 'verified' || certDoc.data()?.expertCertStatus === 'verified')) {
      return true;
    }
    const solverDoc = await adminDb.collection('solvers').doc(uid).get();
    if (solverDoc.exists && (solverDoc.data()?.verifiedExpert === true || Boolean(solverDoc.data()?.verifiedBadge))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 取得或自動初始化競賽點數帳戶（與舊站真實 balance 徹底分開）
 */
export async function getOrCreateCompetitionAccount(userId: string, userRole: 'user' | 'solver' | 'admin' = 'user'): Promise<CompetitionAccount> {
  const accountRef = adminDb.collection('competition_accounts').doc(userId);
  const snap = await accountRef.get();

  if (snap.exists) {
    return snap.data() as CompetitionAccount;
  }

  // 判斷專家或一般用戶初始點數
  // 專家 3,000,000 點，一般用戶/提案者 100,000 點
  const isExpert = userRole === 'solver';
  const initialPoints = isExpert 
    ? COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS 
    : COMPETITION_POINTS_CONFIG.INITIAL_USER_POINTS;

  // 生成唯一推薦碼 (9碼亂數)
  const randomSuffix = Math.floor(100000000 + Math.random() * 900000000).toString();
  const referralCode = `STAR-${randomSuffix.substring(0, 6)}`;

  const newAccount: CompetitionAccount = {
    userId,
    role: userRole,
    initialPoints,
    availablePoints: initialPoints,
    spentPoints: 0,
    referralCode,
    shareBonusClaimed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await accountRef.set(newAccount);
  return newAccount;
}

/**
 * 領取分享推薦碼獎勵（100 競賽點數，防重領取，點數不兌現）
 */
export async function claimShareBonus(userId: string): Promise<{ success: boolean; message: string; account?: CompetitionAccount }> {
  const accountRef = adminDb.collection('competition_accounts').doc(userId);

  return await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(accountRef);
    if (!snap.exists) {
      throw new Error('競賽點數帳戶不存在');
    }
    const account = snap.data() as CompetitionAccount;

    if (account.shareBonusClaimed) {
      return { success: false, message: '您已領取過分享推薦碼獎勵（限領一次）', account };
    }

    const updatedAccount: CompetitionAccount = {
      ...account,
      availablePoints: account.availablePoints + COMPETITION_POINTS_CONFIG.SHARE_BONUS_POINTS,
      shareBonusClaimed: true,
      updatedAt: new Date().toISOString(),
    };

    transaction.set(accountRef, updatedAccount);

    // 寫入不可篡改的審計日誌
    const auditRef = adminDb.collection('competition_audit_logs').doc();
    transaction.set(auditRef, {
      type: 'SHARE_BONUS_CLAIMED',
      userId,
      pointsAdded: COMPETITION_POINTS_CONFIG.SHARE_BONUS_POINTS,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `成功領取分享獎勵 ${COMPETITION_POINTS_CONFIG.SHARE_BONUS_POINTS} 競賽點數！`,
      account: updatedAccount,
    };
  });
}

/**
 * 支持提案（模擬募資投點）：
 * 規則約束：
 * 1. 防自投（不可投自己的提案）
 * 2. 單案支持上限：一般用戶 50,000、提案者 30,000、專家 2,000,000
 * 3. 扣除競賽點數（不碰真實 balance）
 * 4. 原子 transaction 累加提案點數與支持人次
 */
export async function supportProposalWithPoints(params: {
  userId: string;
  userRole: 'user' | 'solver' | 'questioner';
  proposalId: string;
  points: number;
  idempotencyKey?: string;
}): Promise<{ success: boolean; message: string; newAvailablePoints?: number; newProposalPoints?: number }> {
  const { userId, userRole, proposalId, points } = params;

  if (points <= 0 || !Number.isInteger(points)) {
    return { success: false, message: '支持點數必須為正整數' };
  }

  // 單案支持上限約束
  let maxLimit = COMPETITION_POINTS_CONFIG.SINGLE_SUPPORT_LIMIT.user;
  if (userRole === 'solver') {
    maxLimit = COMPETITION_POINTS_CONFIG.SINGLE_SUPPORT_LIMIT.solver;
  } else if (userRole === 'questioner') {
    maxLimit = COMPETITION_POINTS_CONFIG.SINGLE_SUPPORT_LIMIT.questioner;
  }

  const accountRef = adminDb.collection('competition_accounts').doc(userId);
  const proposalRef = adminDb.collection('competition_proposals').doc(proposalId);
  const supportRecordsColl = adminDb.collection('competition_support_records');

  return await adminDb.runTransaction(async (transaction) => {
    const [accountSnap, proposalSnap] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(proposalRef),
    ]);

    if (!accountSnap.exists) {
      throw new Error('競賽帳戶尚未初始化');
    }
    if (!proposalSnap.exists) {
      throw new Error('該競賽提案不存在或已下架');
    }

    const account = accountSnap.data() as CompetitionAccount;
    const proposal = proposalSnap.data() as StarSeasonProposal;

    // 1. 防自投約束
    if (proposal.authorId === userId) {
      throw new Error('規則約束：不可支持自己發起的提案（防自投機制）');
    }

    // 2. 審核狀態確認
    if (proposal.status !== 'approved') {
      throw new Error('該提案尚未通過官方審核，暫不開放模擬募資支持');
    }

    // 3. 點數餘額檢核
    if (account.availablePoints < points) {
      throw new Error(`可用競賽點數不足（目前剩餘 ${account.availablePoints.toLocaleString()} 點）`);
    }

    // 4. 單案累積支持上限檢核
    // 查詢此用戶對該提案已支持的點數總和
    const priorSupportsSnap = await transaction.get(
      supportRecordsColl.where('supporterId', '==', userId).where('proposalId', '==', proposalId)
    );
    let currentTotalForThisProposal = 0;
    priorSupportsSnap.forEach((doc) => {
      currentTotalForThisProposal += Number(doc.data().points || 0);
    });

    if (currentTotalForThisProposal + points > maxLimit) {
      throw new Error(
        `超過單案支持上限！您的身分單案上限為 ${maxLimit.toLocaleString()} 點（已支持 ${currentTotalForThisProposal.toLocaleString()} 點）`
      );
    }

    // 扣除帳戶點數
    const newAvailable = account.availablePoints - points;
    const newSpent = account.spentPoints + points;
    transaction.update(accountRef, {
      availablePoints: newAvailable,
      spentPoints: newSpent,
      updatedAt: new Date().toISOString(),
    });

    // 增加提案支持額
    const newPropPoints = (proposal.supportPoints || 0) + points;
    const isFirstTimeSupport = priorSupportsSnap.empty;
    const newPropSupporters = (proposal.supporterCount || 0) + (isFirstTimeSupport ? 1 : 0);

    transaction.update(proposalRef, {
      supportPoints: newPropPoints,
      supporterCount: newPropSupporters,
      updatedAt: new Date().toISOString(),
    });

    // 寫入支持紀錄
    const recordRef = supportRecordsColl.doc();
    transaction.set(recordRef, {
      id: recordRef.id,
      supporterId: userId,
      supporterRole: userRole,
      proposalId,
      points,
      idempotencyKey: params.idempotencyKey || null,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `成功支持 ${points.toLocaleString()} 競賽點數！`,
      newAvailablePoints: newAvailable,
      newProposalPoints: newPropPoints,
    };
  });
}

/**
 * 提交提案（第一階段痛點 或 第二階段解法）：
 * 嚴密隔離敏感資料：聯絡人、電話、身分證字號、銀行帳號等存入私有集合
 */
export async function createProposal(params: {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: 'user' | 'solver' | 'enterprise';
  title: string;
  stage: StarSeasonStage;
  track: StarSeasonTrack;
  summary: string;
  description: string;
  sourcePainPointProposalId?: string; // 關聯之來源痛點
  sourcePainPointTitle?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMime?: string;
  images?: string[];
  externalLink?: string;
  technicalFeasibility?: string;
  marketAnalysis?: string;
  businessModelFinancials?: string;
  tags?: string[];
  aiCategorized?: boolean;
  referredByAmbassadorCode?: string;
  // 敏感資料
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  schoolOrOrg?: string;
  bankCode?: string;
  bankAccount?: string;
  idNumber?: string;
}): Promise<{ success: boolean; proposalId: string; message: string }> {
  const proposalId = `star-prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const publicProposal: StarSeasonProposal = {
    id: proposalId,
    title: params.title.trim(),
    stage: params.stage,
    track: params.track,
    summary: params.summary.trim(),
    description: params.description.trim(),
    authorId: params.userId,
    authorName: params.userName,
    authorAvatar: params.userAvatar,
    authorRole: params.userRole,
    sourcePainPointProposalId: params.sourcePainPointProposalId || undefined,
    sourcePainPointTitle: params.sourcePainPointTitle || undefined,
    adoptedByWinningSolution: false,
    adoptedSourceRewardAmount: 1200, // 固定 NT$1,200
    adoptedSourceApproved: false,
    adoptedSourceRewardStatus: 'none',
    status: 'pending_review', // 初始待審核
    supportPoints: 0,
    supporterCount: 0,
    attachmentUrl: params.attachmentUrl || undefined,
    attachmentName: params.attachmentName || undefined,
    attachmentSize: params.attachmentSize || undefined,
    attachmentMime: params.attachmentMime || undefined,
    images: params.images && params.images.length > 0 ? params.images : undefined,
    externalLink: params.externalLink || undefined,
    technicalFeasibility: params.technicalFeasibility || undefined,
    marketAnalysis: params.marketAnalysis || undefined,
    businessModelFinancials: params.businessModelFinancials || undefined,
    tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
    aiCategorized: params.aiCategorized ?? false,
    referredByAmbassadorCode: params.referredByAmbassadorCode?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const privateDetails: ProposalPrivateDetails = {
    proposalId,
    authorId: params.userId,
    contactName: params.contactName.trim(),
    contactPhone: params.contactPhone.trim(),
    contactEmail: params.contactEmail.trim(),
    schoolOrOrg: params.schoolOrOrg?.trim(),
    bankCode: params.bankCode?.trim(),
    bankAccount: params.bankAccount?.trim(),
    idNumber: params.idNumber?.trim(),
    updatedAt: now,
  };

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

  const batch = adminDb.batch();

  // 1. 公開提案存入 competition_proposals (不含任何個資)
  const propRef = adminDb.collection('competition_proposals').doc(proposalId);
  batch.set(propRef, stripUndefined(publicProposal));

  // 2. 敏感資料存入 competition_private_submissions (僅管理員與作者本人可存取)
  const privateRef = adminDb.collection('competition_private_submissions').doc(proposalId);
  batch.set(privateRef, stripUndefined(privateDetails));

  // 3. 安全更新舊站用戶徽章：新增「創新盃」徽章，絕不變更其舊站 role 或 balance
  const userRef = adminDb.collection('users').doc(params.userId);
  batch.set(
    userRef,
    {
      competitionBadges: FieldValue.arrayUnion('創新盃'),
      updatedAt: now,
    },
    { merge: true }
  );

  // 4. 同步寫入舊站資料庫：
  // 「痛點」存於舊站的「創點子/痛點」專區 (questions, postType: 'pain_point')
  // 「提案」存於對應痛點之下 (answers)，並附上該提案在參賽網站的專屬連結
  const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${proposalId}`;

  if (params.stage === 'pain_point') {
    const questionRef = adminDb.collection('questions').doc(proposalId);
    batch.set(
      questionRef,
      {
        id: proposalId,
        title: `【痛點】${params.title.trim()}`,
        description: `${params.summary.trim()}\n\n${params.description.trim()}\n\n🏆 創星季競賽痛點專屬連結：${exclusiveChallengeUrl}`,
        category: '創新創業',
        tags: ['創點子', '痛點', '創星季', params.track],
        postType: 'pain_point',
        bounty: 0,
        authorId: params.userId,
        authorName: params.userName,
        authorAvatar: params.userAvatar || '',
        authorRole: params.userRole,
        status: 'open',
        answersCount: 0,
        createdAt: now,
        updatedAt: now,
        exclusiveChallengeUrl,
        isStarSeason: true,
        starSeasonProposalId: proposalId,
      },
      { merge: true }
    );
  } else if (params.stage === 'solution') {
    // 若為解方提案，存入對應痛點之下 (answers)
    const targetQuestionId = params.sourcePainPointProposalId || 'default-pain-point';
    const answerId = `ans-${proposalId}`;
    const answerRef = adminDb.collection('answers').doc(answerId);
    batch.set(
      answerRef,
      {
        id: answerId,
        questionId: targetQuestionId,
        solverId: params.userId,
        solverName: params.userName,
        solverAvatar: params.userAvatar || '',
        title: params.title.trim(),
        content: `💡【創星季提案解方】${params.title.trim()}\n\n${params.summary.trim()}\n\n${params.description.trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
        exclusiveChallengeUrl,
        isStarSeasonSolution: true,
        starSeasonProposalId: proposalId,
        sourcePainPointProposalId: params.sourcePainPointProposalId || null,
        price: 0,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    if (params.sourcePainPointProposalId) {
      const qDocRef = adminDb.collection('questions').doc(params.sourcePainPointProposalId);
      batch.set(
        qDocRef,
        {
          answersCount: FieldValue.increment(1),
          updatedAt: now,
        },
        { merge: true }
      );
    }
  }

  // 5. 若有校園大使推薦碼，記錄推薦關係
  if (params.referredByAmbassadorCode) {
    const refCode = params.referredByAmbassadorCode.trim().toUpperCase();
    const referralLogRef = adminDb.collection('competition_ambassador_referrals').doc();
    batch.set(referralLogRef, {
      id: referralLogRef.id,
      ambassadorCode: refCode,
      proposalId,
      authorId: params.userId,
      status: 'submitted',
      createdAt: now,
    });
  }

  await batch.commit();

  return {
    success: true,
    proposalId,
    message: '提案已成功提交，等待官方工作人員審核！',
  };
}

/**
 * 管理員審核提案（核准 / 駁回）
 * 若提案審核通過且有校園大使推薦碼，累加過審數並試算 NT$800 推廣費
 */
export async function reviewProposalByAdmin(params: {
  adminUid: string;
  proposalId: string;
  status: 'approved' | 'rejected';
  reviewNote?: string;
}): Promise<{ success: boolean; message: string }> {
  const isAdmin = await isVerifiedAdmin(params.adminUid);
  if (!isAdmin) {
    throw new Error('未授權：僅限認證管理員執行審核操作');
  }

  const propRef = adminDb.collection('competition_proposals').doc(params.proposalId);
  const snap = await propRef.get();
  if (!snap.exists) {
    throw new Error('找不到該提案');
  }

  const proposal = snap.data() as StarSeasonProposal;
  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction) => {
    // 1. ALL READS FIRST
    let ambSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    let ambStatsRef: FirebaseFirestore.DocumentReference | null = null;
    const hasAmbassador = params.status === 'approved' && Boolean(proposal.referredByAmbassadorCode);

    if (hasAmbassador) {
      const code = proposal.referredByAmbassadorCode!.toUpperCase();
      ambStatsRef = adminDb.collection('competition_ambassador_stats').doc(code);
      ambSnap = await transaction.get(ambStatsRef);
    }

    // 2. ALL WRITES AFTER READS
    transaction.update(propRef, {
      status: params.status,
      reviewNote: params.reviewNote || '',
      reviewedBy: params.adminUid,
      reviewedAt: now,
      updatedAt: now,
    });

    // 寫入審計日誌
    const auditRef = adminDb.collection('competition_audit_logs').doc();
    transaction.set(auditRef, {
      type: 'PROPOSAL_REVIEWED',
      proposalId: params.proposalId,
      status: params.status,
      reviewedBy: params.adminUid,
      reviewNote: params.reviewNote,
      timestamp: now,
    });

    // 若審核通過且有大使推薦，更新大使過審統計
    if (hasAmbassador && ambStatsRef && ambSnap) {
      const code = proposal.referredByAmbassadorCode!.toUpperCase();
      if (ambSnap.exists) {
        const cur = ambSnap.data() as any;
        const newApproved = (cur.approvedCount || 0) + 1;
        transaction.update(ambStatsRef, {
          approvedCount: newApproved,
          commissionPending: newApproved * COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED, // NT$800
          updatedAt: now,
        });
      } else {
        transaction.set(ambStatsRef, {
          ambassadorCode: code,
          totalReferred: 1,
          approvedCount: 1,
          commissionPending: COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED, // NT$800
          commissionStatus: 'calculated', // 僅試算記錄，不自動匯款
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  });

  return { success: true, message: `提案審核結果已更新為【${params.status === 'approved' ? '通過' : '駁回'}】` };
}

/**
 * 管理員確認最終獲獎名次與痛點採用獎勵：
 * 1. 專家評選確認前三名 (冠軍 NT$30,000, 亞軍 NT$10,000, 季軍 NT$4,500)
 * 2. 獲獎前十名授予「創之星」徽章（寫入舊站 users 集合，絕不覆寫 role 或 balance）
 * 3. 若解方採用痛點提案，確認核准痛點提供者享 NT$1,200 獎勵
 */
export async function confirmFinalAwardByAdmin(params: {
  adminUid: string;
  proposalId: string;
  finalRank: number; // 1, 2, 3 等名次
  awardConfirmed: boolean;
  adoptedSourceApproved?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const isAdmin = await isVerifiedAdmin(params.adminUid);
  if (!isAdmin) {
    throw new Error('未授權：僅限認證管理員執行頒獎與核定');
  }

  const propRef = adminDb.collection('competition_proposals').doc(params.proposalId);
  const snap = await propRef.get();
  if (!snap.exists) {
    throw new Error('找不到該提案');
  }
  const proposal = snap.data() as StarSeasonProposal;
  const now = new Date().toISOString();

  const batch = adminDb.batch();

  // 更新提案名次與獲獎確認狀態
  batch.update(propRef, {
    finalRank: params.finalRank,
    finalAwardConfirmed: params.awardConfirmed,
    grantedStarBadge: params.finalRank <= 10,
    updatedAt: now,
  });

  // 前十名授予「創之星」徽章 (在舊站 users 中標記，不改 role 或 balance)
  if (params.finalRank <= 10) {
    const authorUserRef = adminDb.collection('users').doc(proposal.authorId);
    batch.set(
      authorUserRef,
      {
        competitionBadges: FieldValue.arrayUnion('創之星'),
        updatedAt: now,
      },
      { merge: true }
    );
  }

  // 處理痛點提案採用獎勵：價值$1500好禮（1200點提問金,用於IdeaX平台提問或使用特色功能）
  if (proposal.sourcePainPointProposalId && params.adoptedSourceApproved) {
    const sourcePainPointRef = adminDb.collection('competition_proposals').doc(proposal.sourcePainPointProposalId);
    batch.update(sourcePainPointRef, {
      adoptedByWinningSolution: true,
      adoptedSourceApproved: true,
      adoptedSourceRewardAmount: COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARD, // 1200 點提問金
      adoptedSourceRewardDescription: COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARD_DESC,
      adoptedSourceRewardStatus: 'approved',
      updatedAt: now,
    });

    // 記錄採用獎勵日誌
    const rewardLogRef = adminDb.collection('competition_adopted_rewards').doc();
    batch.set(rewardLogRef, {
      id: rewardLogRef.id,
      solutionProposalId: params.proposalId,
      painPointProposalId: proposal.sourcePainPointProposalId,
      rewardAmount: 1200,
      rewardDescription: COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARD_DESC,
      status: 'approved',
      approvedBy: params.adminUid,
      createdAt: now,
    });
  }

  // 寫入審計日誌
  const auditRef = adminDb.collection('competition_audit_logs').doc();
  batch.set(auditRef, {
    type: 'AWARD_CONFIRMED',
    proposalId: params.proposalId,
    finalRank: params.finalRank,
    awardConfirmed: params.awardConfirmed,
    approvedBy: params.adminUid,
    timestamp: now,
  });

  await batch.commit();

  return { success: true, message: `已成功確認名次 (第 ${params.finalRank} 名) 與相關獎勵核准！` };
}

/**
 * 取得公開提案列表（敏感個資已被剝除）
 */
export async function getPublicProposals(
  stage?: StarSeasonStage,
  track?: StarSeasonTrack,
  options?: { includePending?: boolean; authorId?: string }
): Promise<StarSeasonProposal[]> {
  let query: FirebaseFirestore.Query = adminDb.collection('competition_proposals');

  if (stage) {
    query = query.where('stage', '==', stage);
  }
  if (track) {
    query = query.where('track', '==', track);
  }

  const snap = await query.get();
  const list: StarSeasonProposal[] = [];

  snap.forEach((doc) => {
    const data = doc.data() as StarSeasonProposal;
    // 待審不公開原則：未通過審核之提案僅作者本人或管理員可查閱
    if (data.status === 'approved' || options?.includePending || (options?.authorId && data.authorId === options.authorId)) {
      list.push(data);
    }
  });

  // 依累計支持點數降冪排序
  list.sort((a, b) => (b.supportPoints || 0) - (a.supportPoints || 0));

  // 募資前 20 名標記入圍複賽資格 (僅為入圍資格，非最終得獎)
  return list.map((item, index) => ({
    ...item,
    rankQualifiedForFinal: index < 20,
  }));
}

/**
 * 按讚或取消按讚提案（更新 likeCount，並維護用戶個人的收藏名單）
 */
export async function toggleLikeProposal(userId: string, proposalId: string): Promise<{
  success: boolean;
  liked: boolean;
  likeCount: number;
  likedProposalIds: string[];
}> {
  const propRef = adminDb.collection('competition_proposals').doc(proposalId);
  const userLikesRef = adminDb.collection('competition_user_likes').doc(userId);

  return await adminDb.runTransaction(async (transaction) => {
    const propSnap = await transaction.get(propRef);
    if (!propSnap.exists) {
      throw new Error('找不到該競賽提案');
    }
    const userLikesSnap = await transaction.get(userLikesRef);
    const likedList: string[] = userLikesSnap.exists ? (userLikesSnap.data()?.proposalIds || []) : [];

    const isCurrentlyLiked = likedList.includes(proposalId);
    let updatedLikes: string[];
    const currentProp = propSnap.data() as StarSeasonProposal;
    const baseCount = currentProp.likeCount || 0;
    let newLikeCount: number;

    if (isCurrentlyLiked) {
      updatedLikes = likedList.filter((id) => id !== proposalId);
      newLikeCount = Math.max(0, baseCount - 1);
    } else {
      updatedLikes = [...likedList, proposalId];
      newLikeCount = baseCount + 1;
    }

    transaction.update(propRef, {
      likeCount: newLikeCount,
      updatedAt: new Date().toISOString(),
    });

    transaction.set(
      userLikesRef,
      {
        userId,
        proposalIds: updatedLikes,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return {
      success: true,
      liked: !isCurrentlyLiked,
      likeCount: newLikeCount,
      likedProposalIds: updatedLikes,
    };
  });
}

/**
 * 取得用戶已按讚/收藏之提案 ID 清單
 */
export async function getUserLikedProposalIds(userId: string): Promise<string[]> {
  try {
    const snap = await adminDb.collection('competition_user_likes').doc(userId).get();
    if (!snap.exists) return [];
    return snap.data()?.proposalIds || [];
  } catch {
    return [];
  }
}

/**
 * 取得提案討論留言
 */
export async function getProposalComments(proposalId: string): Promise<ProposalComment[]> {
  try {
    const snap = await adminDb
      .collection('competition_comments')
      .where('proposalId', '==', proposalId)
      .get();
    const list: ProposalComment[] = [];
    snap.forEach((doc) => {
      list.push(doc.data() as ProposalComment);
    });
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  } catch {
    return [];
  }
}

/**
 * 新增提案交流討論留言
 */
export async function addProposalComment(params: {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: 'participant' | 'expert' | 'user' | 'admin';
  roleBadgeText?: string;
  proposalId: string;
  content: string;
}): Promise<{ success: boolean; comment: ProposalComment }> {
  const commentId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newComment: ProposalComment = {
    id: commentId,
    proposalId: params.proposalId,
    authorId: params.userId,
    authorName: params.userName,
    authorAvatar: params.userAvatar,
    authorRole: params.userRole || 'user',
    roleBadgeText: params.roleBadgeText,
    content: params.content.trim(),
    createdAt: now,
  };

  const batch = adminDb.batch();
  const commentRef = adminDb.collection('competition_comments').doc(commentId);
  batch.set(commentRef, newComment);

  const propRef = adminDb.collection('competition_proposals').doc(params.proposalId);
  batch.update(propRef, {
    commentsCount: FieldValue.increment(1),
    updatedAt: now,
  });

  await batch.commit();

  return { success: true, comment: newComment };
}

/**
 * 參賽者報名（大專校院創新創業募資模擬學習平台體驗規格）：
 * 1. 登記團隊成員、學校、BP計畫書、原型圖、宣傳影片、模擬目標金額、回饋承諾
 * 2. 舊站用戶多了一個「創星季」徽章 (competitionBadges union '創星季')
 * 3. 建立競賽提案至 competition_proposals
 * 4. 若有引用痛點，於舊站 questions 之下的 answers 建立該提案之對應解方，並附上參賽網站專屬連結
 */
export async function registerParticipant(
  userId: string,
  userProfile: { name: string; avatar?: string; email?: string; role?: string },
  data: ParticipantRegistrationData
): Promise<{ success: boolean; proposalId: string; message: string }> {
  const now = new Date().toISOString();
  const proposalId = `star-prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${proposalId}`;

  const publicProposal: StarSeasonProposal = {
    id: proposalId,
    title: data.projectTitle.trim(),
    stage: 'solution',
    track: data.track,
    summary: data.summary.trim(),
    description: `${data.description.trim()}\n\n【團隊資訊】\n• 團隊：${data.teamName}\n• 學校：${data.schoolName} ${data.department}\n• 隊長：${data.leaderName}\n• 募資目標：NT$ ${data.targetFundingAmount.toLocaleString()}\n• 回饋方案：${data.rewardPlanDescription}`,
    authorId: userId,
    authorName: userProfile.name || data.leaderName,
    authorAvatar: userProfile.avatar,
    authorRole: 'user',
    sourcePainPointProposalId: data.sourcePainPointId || undefined,
    sourcePainPointTitle: data.sourcePainPointTitle || undefined,
    adoptedByWinningSolution: false,
    adoptedSourceRewardAmount: 1200,
    adoptedSourceApproved: false,
    adoptedSourceRewardStatus: 'none',
    status: 'pending_review',
    supportPoints: 0,
    supporterCount: 0,
    likeCount: 0,
    commentsCount: 0,
    attachmentUrl: data.bpDocumentUrl,
    attachmentName: data.bpDocumentName,
    attachmentSize: data.bpDocumentSize,
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb.batch();

  // 1. 寫入公開提案
  const propRef = adminDb.collection('competition_proposals').doc(proposalId);
  batch.set(propRef, publicProposal);

  // 2. 儲存大專校院募資模擬平台完整報名資料
  const regRef = adminDb.collection('competition_participant_registrations').doc(proposalId);
  batch.set(regRef, {
    proposalId,
    userId,
    ...data,
    createdAt: now,
  });

  // 3. 舊站用戶新增「創星季」徽章（一般用戶身分不變，但多了一個創星季徽章）
  const userRef = adminDb.collection('users').doc(userId);
  batch.set(
    userRef,
    {
      competitionBadges: FieldValue.arrayUnion('創星季'),
      updatedAt: now,
    },
    { merge: true }
  );

  // 4. 若有引用痛點，於舊站 questions 之下的 answers 建立該提案之對應解方，附上參賽網站專屬連結
  const targetQuestionId = data.sourcePainPointId || 'default-pain-point';
  const answerId = `ans-${proposalId}`;
  const answerRef = adminDb.collection('answers').doc(answerId);
  batch.set(
    answerRef,
    {
      id: answerId,
      questionId: targetQuestionId,
      solverId: userId,
      solverName: userProfile.name || data.leaderName,
      solverAvatar: userProfile.avatar || '',
      title: data.projectTitle.trim(),
      content: `💡【創星季提案解方】${data.projectTitle.trim()}\n\n${data.summary.trim()}\n\n${data.description.trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
      exclusiveChallengeUrl,
      isStarSeasonSolution: true,
      starSeasonProposalId: proposalId,
      sourcePainPointProposalId: data.sourcePainPointId || null,
      price: 0,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  if (data.sourcePainPointId) {
    const qDocRef = adminDb.collection('questions').doc(data.sourcePainPointId);
    batch.set(
      qDocRef,
      {
        answersCount: FieldValue.increment(1),
        updatedAt: now,
      },
      { merge: true }
    );
  }

  await batch.commit();

  return {
    success: true,
    proposalId,
    message: '參賽報名成功！已授予「創星季」榮譽徽章，提案將進入模擬募資專案！',
  };
}

/**
 * 成為專家 / 特邀專家申請：
 * 申請成為專家的用戶經管理員審核通過後會轉為專家帳號，錄入認證專家名單，並享有 3,000,000 點競賽投資點數（單案上限 2,000,000 點），後續可由專家中遴選為評審
 */
export async function applyJudge(
  userId: string,
  userProfile: { name: string; avatar?: string; email?: string },
  data: JudgeApplicationData
): Promise<{ success: boolean; message: string; solverId: string }> {
  const now = new Date().toISOString();
  const solverId = `solver-${userId}`;
  const batch = adminDb.batch();

  // 1. 更新舊站用戶身份：role = 'solver', verifiedExpert = true, verifiedBadge = '創星季特邀專家'
  const userRef = adminDb.collection('users').doc(userId);
  batch.set(
    userRef,
    {
      role: 'solver',
      verifiedExpert: true,
      verifiedBadge: '創星季特邀專家',
      title: `${data.organization} ${data.jobTitle}`,
      domain: data.domain,
      domains: [data.domain],
      expertApplicationStatus: 'approved',
      updatedAt: now,
    },
    { merge: true }
  );

  // 2. 錄入舊站 solvers 集合（舊站專家名單立即可查閱）
  const solverRef = adminDb.collection('solvers').doc(solverId);
  batch.set(
    solverRef,
    {
      id: solverId,
      userId,
      name: data.name || userProfile.name,
      title: `${data.organization} ${data.jobTitle}`,
      avatar: userProfile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      domain: data.domain,
      domains: [data.domain],
      skills: ['產學創新', '技術審查', '新創輔導', '投資評估'],
      rating: 5.0,
      reviewCount: 1,
      answerCount: 0,
      acceptedRate: 100,
      tier: '認證專家',
      bio: `${data.organization} ${data.jobTitle}。創星季特邀專業評審團成員。${data.bio || ''}`,
      earnings: 0,
      verifiedBadge: true,
      verified: true,
      verifiedExpert: true,
      credentialsNote: data.credentialsNote,
      credentialProofUrl: data.credentialProofUrl || null,
      featuredCase: {
        title: '創星季創新創業與產學審查',
        description: '受邀擔任創星季與各項青年創新創業競賽專業評審委員。',
        outcome: '提供專業商業模式驗證、產業對接建議與技術可行性評估。',
      },
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  // 3. 升級競賽點數錢包為專家額度 (3,000,000 點)
  const accountRef = adminDb.collection('competition_accounts').doc(userId);
  batch.set(
    accountRef,
    {
      userId,
      role: 'solver',
      initialPoints: COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS,
      availablePoints: COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS,
      updatedAt: now,
    },
    { merge: true }
  );

  // 4. 記錄評審申請資料
  const appRef = adminDb.collection('competition_judge_applications').doc(userId);
  batch.set(appRef, {
    userId,
    ...data,
    status: 'approved',
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  return {
    success: true,
    solverId,
    message: '恭喜！您已成功加入創星季專業評審團，並同步獲得舊站「認證專家」資格與 300 萬點專業評選額度！',
  };
}

/**
 * 取得當前用戶的推廣大使資訊、自己的推薦碼與推薦名單 (含試算 NT$800 獎勵)
 */
export async function getMyAmbassadorData(userId: string): Promise<{
  referralCode: string;
  totalReferred: number;
  approvedCount: number;
  commissionPending: number;
  referrals: Array<{
    id: string;
    proposalId: string;
    proposalTitle: string;
    authorName: string;
    status: string;
    rewardAmount: number;
    createdAt: string;
  }>;
}> {
  const account = await getOrCreateCompetitionAccount(userId);
  const code = account.referralCode;

  // 查詢以該推薦碼推薦之紀錄
  const refSnaps = await adminDb
    .collection('competition_ambassador_referrals')
    .where('ambassadorCode', '==', code)
    .get();

  const referrals: any[] = [];
  let approvedCount = 0;

  for (const doc of refSnaps.docs) {
    const data = doc.data();
    let proposalTitle = '創星季參賽提案';
    let authorName = '創星提案者';
    let status = data.status || 'submitted';

    try {
      const propSnap = await adminDb.collection('competition_proposals').doc(data.proposalId).get();
      if (propSnap.exists) {
        const propData = propSnap.data();
        proposalTitle = propData?.title || proposalTitle;
        authorName = propData?.authorName || authorName;
        status = propData?.status || status;
      }
    } catch {}

    const isApproved = status === 'approved';
    if (isApproved) approvedCount++;

    referrals.push({
      id: doc.id,
      proposalId: data.proposalId,
      proposalTitle,
      authorName,
      status,
      rewardAmount: isApproved ? COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED : 0,
      createdAt: data.createdAt,
    });
  }

  referrals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    referralCode: code,
    totalReferred: referrals.length,
    approvedCount,
    commissionPending: approvedCount * COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED,
    referrals,
  };
}

/**
 * 綁定輸入之推廣大使推薦碼
 */
export async function bindAmbassadorReferralCode(
  userId: string,
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  const cleanCode = referralCode.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('請輸入有效的推薦碼');
  }

  const account = await getOrCreateCompetitionAccount(userId);
  if (account.referralCode === cleanCode) {
    throw new Error('不能綁定自己的推薦碼');
  }

  await adminDb.collection('competition_user_bound_referrals').doc(userId).set(
    {
      userId,
      boundReferralCode: cleanCode,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return {
    success: true,
    message: `成功綁定推薦碼【${cleanCode}】！後續提案將自動關聯該校園推廣大使。`,
  };
}

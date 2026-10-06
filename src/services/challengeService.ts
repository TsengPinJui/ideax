/**
 * IdeaX 創新挑戰季 (IdeaX Innovation Challenge) 核心業務邏輯與 Firebase Firestore 整合服務
 * 遵循教育部大專校院創新創業平台架構精神：提案總覽、模擬支持、教練/評審指導與完整企劃專頁
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ChallengeProposal,
  ChallengeExpert,
  ChallengeAmbassador,
  ChallengeUserPointWallet,
  ChallengeProposalStatus,
  ChallengeCategory,
  ChallengeInvestment,
  ChallengeExpertReview,
  ChallengeComment,
} from '../types/challengeTypes';
import {
  CHALLENGE_CONSTANTS,
  INITIAL_CHALLENGE_PROPOSALS,
  INITIAL_CHALLENGE_EXPERTS,
  INITIAL_CHALLENGE_AMBASSADORS,
} from '../data/challengeData';

const PROPOSALS_KEY = 'ideax_challenge_proposals_v9';
const WALLETS_KEY = 'ideax_challenge_wallets_v9';
const AMBASSADORS_KEY = 'ideax_challenge_ambassadors_v9';
const EXPERTS_KEY = 'ideax_challenge_experts_v9';

// 清除舊版快取
try {
  for (let i = 1; i <= 8; i++) {
    localStorage.removeItem(`ideax_challenge_proposals_v${i}`);
    localStorage.removeItem(`ideax_challenge_experts_v${i}`);
    localStorage.removeItem(`ideax_challenge_ambassadors_v${i}`);
  }
} catch {}

// 記憶體快取
let cachedProposals: ChallengeProposal[] = [];

// ==========================================
// 1. 正規化與範例資料防護 (Data Normalization)
// ==========================================

const VALID_CATEGORIES: ChallengeCategory[] = [
  '科技創新',
  'AI智慧',
  '商業模式',
  '生活永續',
  '社會創新',
  '文創教育',
  '生醫健康',
];

export const normalizeProposal = (p: any): ChallengeProposal => {
  if (!p) return INITIAL_CHALLENGE_PROPOSALS[0];

  const isOldSeed =
    p.id === 'prop-1' ||
    p.id === 'prop-2' ||
    p.id === 'prop-3' ||
    p.id === 'prop-4' ||
    p.id === 'prop-5';

  const isDemo = p.isDemo === true || isOldSeed || (typeof p.id === 'string' && p.id.startsWith('demo-'));

  // 1. 分類精準正規化
  let category: ChallengeCategory = '科技創新';
  const rawCat = (p.category || '').toString().trim();

  if (VALID_CATEGORIES.includes(rawCat as ChallengeCategory)) {
    category = rawCat as ChallengeCategory;
  } else {
    // 容錯映射
    if (rawCat.includes('AI') || rawCat.includes('智慧')) {
      category = 'AI智慧';
    } else if (rawCat.includes('科技') || rawCat.includes('VR') || rawCat.includes('軟體')) {
      category = '科技創新';
    } else if (rawCat.includes('商業') || rawCat.includes('商模') || rawCat.includes('共享')) {
      category = '商業模式';
    } else if (rawCat.includes('永續') || rawCat.includes('生活') || rawCat.includes('循環')) {
      category = '生活永續';
    } else if (rawCat.includes('社會') || rawCat.includes('小農') || rawCat.includes('偏鄉')) {
      category = '社會創新';
    } else if (rawCat.includes('文創') || rawCat.includes('教育') || rawCat.includes('繪本')) {
      category = '文創教育';
    } else if (rawCat.includes('生醫') || rawCat.includes('健康') || rawCat.includes('醫療') || rawCat.includes('心理')) {
      category = '生醫健康';
    }
  }

  // 2. 標題與範例標籤
  let title = (p.title || '').toString();
  if (isDemo && !title.includes('【展示範例】')) {
    title = `【展示範例】${title.replace(/^【.*?】/, '').trim()}`;
  }

  // 3. 匿名化評審導師
  const expertReviews = (p.expertReviews || []).map((rev: any, idx: number) => ({
    ...rev,
    expertName: rev.expertName?.includes('展示範例')
      ? rev.expertName
      : `【展示範例】評審導師 ${String.fromCharCode(65 + (idx % 3))}`,
    expertTitle: rev.expertTitle?.includes('展示範例')
      ? rev.expertTitle
      : `${rev.expertDomain || '專業領域'}顧問（展示範例）`,
  }));

  // 4. 匿名化投資支持者
  const investments = (p.investments || []).map((inv: any, idx: number) => ({
    ...inv,
    userName:
      inv.userName?.includes('陳宥任') ||
      inv.userName?.includes('黃宏達') ||
      inv.userName?.includes('林欣宜')
        ? `【展示範例】評審導師 ${String.fromCharCode(65 + (idx % 3))}`
        : inv.userName || '支持夥伴',
  }));

  return {
    ...p,
    id: p.id || `prop-${Date.now()}`,
    title,
    category,
    isDemo,
    status: (p.status === 'delisted' ? 'rejected' : p.status) || 'approved',
    fundingRaised: typeof p.fundingRaised === 'number' ? p.fundingRaised : 0,
    fundingSupportersCount: typeof p.fundingSupportersCount === 'number' ? p.fundingSupportersCount : 0,
    views: typeof p.views === 'number' ? p.views : 0,
    likes: typeof p.likes === 'number' ? p.likes : 0,
    likedUserIds: Array.isArray(p.likedUserIds) ? p.likedUserIds : [],
    isCertified: p.isCertified ?? true,
    expertReviews,
    investments,
    comments: Array.isArray(p.comments) ? p.comments : [],
    attachments: Array.isArray(p.attachments) ? p.attachments : [],
    phone: p.phone || '',
    bankName: p.bankName || '',
    bankAccount: p.bankAccount || '',
  };
};

// ==========================================
// 2. 類別比對輔助 (Category Matching)
// ==========================================

export const isCategoryMatch = (pCategory: string, selectedCategory: string): boolean => {
  if (!selectedCategory || selectedCategory === '全部') return true;
  if (!pCategory) return false;

  const p = pCategory.trim();
  const target = selectedCategory.trim();

  // 1. 完全相同
  if (p === target) return true;
  if (p.toLowerCase() === target.toLowerCase()) return true;

  // 2. 語意包含比對
  if (target === 'AI智慧' && (p.includes('AI') || p.includes('智慧'))) return true;
  if (target === '科技創新' && (p.includes('科技') || p.includes('軟體') || p.includes('硬體'))) return true;
  if (target === '生醫健康' && (p.includes('生醫') || p.includes('醫療') || p.includes('健康'))) return true;
  if (target === '生活永續' && (p.includes('永續') || p.includes('生活') || p.includes('循環'))) return true;
  if (target === '社會創新' && p.includes('社會')) return true;
  if (target === '文創教育' && (p.includes('文創') || p.includes('教育'))) return true;
  if (target === '商業模式' && (p.includes('商業') || p.includes('商模'))) return true;

  return false;
};

// ==========================================
// 3. 初始化與 Firestore 監聽 (絕不寫入假種子資料)
// ==========================================

export const initChallengeFirestoreSync = async () => {
  try {
    const proposalsColl = collection(db, 'challenge_proposals');
    const proposalsSnap = await getDocs(proposalsColl);

    if (!proposalsSnap.empty) {
      const realDocs = proposalsSnap.docs
        .map((d) => d.data() as ChallengeProposal)
        .filter((p) => p && !p.id.startsWith('prop-1') && !p.id.startsWith('prop-2') && !p.id.startsWith('prop-3') && !p.id.startsWith('prop-4') && !p.id.startsWith('prop-5'));
      
      if (realDocs.length > 0) {
        cachedProposals = realDocs.map(normalizeProposal);
        localStorage.setItem(PROPOSALS_KEY, JSON.stringify(cachedProposals));
      }
    }
  } catch (err) {
    console.warn('Firestore sync note:', err);
  }
};

export const subscribeChallengeProposals = (
  onUpdate: (proposals: ChallengeProposal[]) => void
) => {
  try {
    const q = collection(db, 'challenge_proposals');
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const userSubmitted = snapshot.docs
            .map((d) => d.data() as ChallengeProposal)
            .filter((p) => p && !p.id.startsWith('prop-1') && !p.id.startsWith('prop-2') && !p.id.startsWith('prop-3') && !p.id.startsWith('prop-4') && !p.id.startsWith('prop-5'));
          
          const combined = [
            ...userSubmitted.map(normalizeProposal),
            ...INITIAL_CHALLENGE_PROPOSALS.map(normalizeProposal),
          ];

          const uniqueMap = new Map<string, ChallengeProposal>();
          for (const p of combined) {
            uniqueMap.set(p.id, p);
          }
          const list = Array.from(uniqueMap.values());
          cachedProposals = list;
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('Firestore subscription notice:', error);
      }
    );
  } catch (e) {
    return () => {};
  }
};

// ==========================================
// 4. 提案資料存取與敏感資料保護 (Privacy & RBAC)
// ==========================================

export const getChallengeProposals = (
  viewerUserId?: string,
  isAdmin?: boolean
): ChallengeProposal[] => {
  try {
    const demos = INITIAL_CHALLENGE_PROPOSALS.map(normalizeProposal);
    const realProposals = cachedProposals.filter(
      (p) => !p.isDemo && p.id && !p.id.startsWith('demo-')
    );

    const uniqueMap = new Map<string, ChallengeProposal>();
    // Prepend real proposals, then demos for full 7-category coverage
    for (const p of [...realProposals, ...demos]) {
      uniqueMap.set(p.id, normalizeProposal(p));
    }

    const list = Array.from(uniqueMap.values());
    return sanitizeProposalsForViewer(list, viewerUserId, isAdmin);
  } catch (err) {
    console.error('Failed to load challenge proposals:', err);
    return INITIAL_CHALLENGE_PROPOSALS.map(normalizeProposal);
  }
};

export const saveChallengeProposals = async (proposals: ChallengeProposal[]): Promise<void> => {
  try {
    cachedProposals = proposals;
    localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals));
  } catch (err) {
    console.error('Failed to save challenge proposals locally:', err);
  }
};

/**
 * 敏感資料脫敏：只有本人與管理員能見真實銀行帳戶與電話
 */
export const sanitizeProposalsForViewer = (
  proposals: ChallengeProposal[],
  viewerUserId?: string,
  isAdmin?: boolean
): ChallengeProposal[] => {
  return proposals.map((p) => {
    const isOwner = viewerUserId && p.authorId === viewerUserId;
    if (isAdmin || isOwner) {
      return p;
    }
    return {
      ...p,
      phone: p.phone ? `${p.phone.slice(0, 4)}***${p.phone.slice(-3)}` : '未公開',
      bankName: p.bankName ? '已設定（僅提案者本人與審核方可見）' : '未設定',
      bankAccount: p.bankAccount ? '******（安全保護中）' : '未設定',
    };
  });
};

// ==========================================
// 5. 虛擬點數系統 (與主站完全隔離，不可兌現、不可轉帳)
// ==========================================

export const getChallengeUserWallet = (
  userId: string,
  role: 'user' | 'creator' | 'expert' = 'user'
): ChallengeUserPointWallet => {
  try {
    const raw = localStorage.getItem(`${WALLETS_KEY}_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  const totalPoints = CHALLENGE_CONSTANTS.INITIAL_POINTS[role] || 100000;

  const newWallet: ChallengeUserPointWallet = {
    userId,
    role,
    totalPoints,
    availablePoints: totalPoints,
    spentPoints: 0,
    investedRecords: [],
    claimedShareBonusCodes: [],
    totalShareBonusPoints: 0,
  };

  saveChallengeUserWallet(newWallet);
  return newWallet;
};

export const saveChallengeUserWallet = (wallet: ChallengeUserPointWallet) => {
  try {
    localStorage.setItem(`${WALLETS_KEY}_${wallet.userId}`, JSON.stringify(wallet));
  } catch {}
};

/**
 * 虛擬點數支持 (投資) 核心業務邏輯
 */
export interface InvestOptions {
  proposalId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: 'user' | 'creator' | 'expert';
  amount: number;
  message?: string;
}

export const investInChallengeProposal = async (
  optionsOrProposalId: string | InvestOptions,
  userId?: string,
  userName?: string,
  amount?: number,
  message?: string,
  userRole: 'user' | 'creator' | 'expert' = 'user'
): Promise<{ success: boolean; message: string; error?: string; updatedProposal?: ChallengeProposal }> => {
  let opts: InvestOptions;
  if (typeof optionsOrProposalId === 'object') {
    opts = optionsOrProposalId;
  } else {
    opts = {
      proposalId: optionsOrProposalId,
      userId: userId || '',
      userName: userName || '支持夥伴',
      userRole,
      amount: amount || 0,
      message,
    };
  }

  if (opts.amount <= 0) {
    const err = '支持點數必須大於 0 點';
    return { success: false, message: err, error: err };
  }

  const proposals = getChallengeProposals(opts.userId, false);
  const target = proposals.find((p) => p.id === opts.proposalId);

  if (!target) {
    const err = '找不到目標提案';
    return { success: false, message: err, error: err };
  }

  // 1. 不可支持自己
  if (target.authorId === opts.userId) {
    const err = '依競賽公正規章，不可將點數支持自己的提案';
    return { success: false, message: err, error: err };
  }

  // 2. 角色單案投資上限檢查
  const maxAllowed = CHALLENGE_CONSTANTS.SINGLE_PROPOSAL_MAX_INVESTMENT[opts.userRole] || 50000;
  const wallet = getChallengeUserWallet(opts.userId, opts.userRole);

  const existingInvestmentAmount = (target.investments || [])
    .filter((inv) => inv.userId === opts.userId)
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (existingInvestmentAmount + opts.amount > maxAllowed) {
    const remaining = maxAllowed - existingInvestmentAmount;
    const err = `超出您所屬角色「${opts.userRole === 'expert' ? '專家評審' : opts.userRole === 'creator' ? '提案帳號' : '一般用戶'}」的單案支持上限（上限 $${maxAllowed.toLocaleString()}，您目前此案剩餘額度：$${Math.max(0, remaining).toLocaleString()}）`;
    return {
      success: false,
      message: err,
      error: err,
    };
  }

  // 3. 餘額檢查
  if (wallet.availablePoints < opts.amount) {
    const err = `您的競賽虛擬點數餘額不足（目前可用：${wallet.availablePoints.toLocaleString()} 點）`;
    return {
      success: false,
      message: err,
      error: err,
    };
  }

  // 4. 扣除與記錄
  const newInvestment: ChallengeInvestment = {
    id: `inv-${Date.now()}`,
    proposalId: opts.proposalId,
    userId: opts.userId,
    userName: opts.userName,
    userAvatar: opts.userAvatar,
    userRole: opts.userRole,
    amount: opts.amount,
    message: opts.message,
    createdAt: new Date().toISOString(),
  };

  wallet.availablePoints -= opts.amount;
  wallet.spentPoints += opts.amount;
  wallet.investedRecords = wallet.investedRecords || [];
  wallet.investedRecords.push({
    proposalId: opts.proposalId,
    amount: opts.amount,
    investedAt: new Date().toISOString(),
  });
  saveChallengeUserWallet(wallet);

  const isFirstTimeBacker = !target.investments?.some((i) => i.userId === opts.userId);
  const updatedInvestments = [...(target.investments || []), newInvestment];
  const newFunding = (target.fundingRaised || 0) + opts.amount;
  const newBackers = (target.fundingSupportersCount || 0) + (isFirstTimeBacker ? 1 : 0);

  const updatedProposal: ChallengeProposal = {
    ...target,
    fundingRaised: newFunding,
    fundingSupportersCount: newBackers,
    investments: updatedInvestments,
  };

  const updatedList = proposals.map((p) => (p.id === opts.proposalId ? updatedProposal : p));
  await saveChallengeProposals(updatedList);

  // Firestore 同步 (若為正式資料)
  if (!target.isDemo) {
    try {
      const proposalRef = doc(db, 'challenge_proposals', opts.proposalId);
      await updateDoc(proposalRef, {
        fundingRaised: newFunding,
        fundingSupportersCount: newBackers,
        investments: updatedInvestments,
      });
    } catch (e) {
      console.warn('Firestore update investment notice:', e);
    }
  }

  return {
    success: true,
    message: `成功支持 $${opts.amount.toLocaleString()} 點！感謝您為創新想法注入實質市場驗證。`,
    updatedProposal,
  };
};

// ==========================================
// 6. 提案投稿 (Submit Proposal)
// ==========================================

export const submitChallengeProposal = async (
  proposalInput: Partial<ChallengeProposal> & {
    title: string;
    category: ChallengeCategory;
    authorId: string;
    authorName: string;
    teamName: string;
    email: string;
    phone: string;
    schoolOrOccupation: string;
    painPoint: string;
    solution: string;
    targetAudience: string;
    businessModel: string;
    expectedImpact: string;
    bankName: string;
    bankAccount: string;
  }
): Promise<{ success: boolean; message: string; error?: string; proposal?: ChallengeProposal }> => {
  try {
    const id = `prop-${Date.now()}`;
    const newProposal: ChallengeProposal = {
      title: proposalInput.title,
      category: proposalInput.category,
      authorId: proposalInput.authorId,
      authorName: proposalInput.authorName,
      authorAvatar: proposalInput.authorAvatar,
      teamName: proposalInput.teamName,
      email: proposalInput.email,
      phone: proposalInput.phone,
      schoolOrOccupation: proposalInput.schoolOrOccupation,
      referralCode: proposalInput.referralCode,
      painPoint: proposalInput.painPoint,
      solution: proposalInput.solution,
      targetAudience: proposalInput.targetAudience,
      businessModel: proposalInput.businessModel,
      expectedImpact: proposalInput.expectedImpact,
      coverImage: proposalInput.coverImage,
      bankName: proposalInput.bankName,
      bankAccount: proposalInput.bankAccount,
      payoutNotes: proposalInput.payoutNotes,
      id,
      status: 'pending', // 預設待審核
      submittedAt: new Date().toISOString(),
      fundingRaised: 0,
      fundingSupportersCount: 0,
      views: 1,
      likes: 0,
      likedUserIds: [],
      isCertified: false,
      isDemo: false,
      investments: [],
      comments: [],
      expertReviews: [],
      attachments: proposalInput.attachments || [],
    };

    // 1. 本地儲存
    const currentList = getChallengeProposals(proposalInput.authorId, false);
    const updatedList = [newProposal, ...currentList];
    await saveChallengeProposals(updatedList);

    // 2. 寫入 Firestore 集合 challenge_proposals
    try {
      const docRef = doc(db, 'challenge_proposals', id);
      await setDoc(docRef, newProposal);
    } catch (fsErr) {
      console.warn('Firestore save notice:', fsErr);
    }

    // 3. 若有使用推薦碼，記錄推薦
    if (proposalInput.referralCode) {
      await recordAmbassadorReferral(proposalInput.referralCode, id, proposalInput.title, proposalInput.authorName);
    }

    return {
      success: true,
      message: '提案已成功提交！管理員審核通過後將正式公開於競賽專區並開放全民模擬支持。',
      proposal: newProposal,
    };
  } catch (err: any) {
    const errorMsg = err.message || '提交失敗，請檢查網路連線後重試';
    return {
      success: false,
      message: errorMsg,
      error: errorMsg,
    };
  }
};

// ==========================================
// 7. 管理員審核與下架 (Admin Review)
// ==========================================

export const reviewChallengeProposal = async (
  proposalId: string,
  decision: ChallengeProposalStatus,
  reviewNotes: string,
  adminId: string
): Promise<{ success: boolean; message: string; proposal?: ChallengeProposal; error?: string }> => {
  const proposals = getChallengeProposals(adminId, true);
  const target = proposals.find((p) => p.id === proposalId);

  if (!target) {
    const err = '找不到目標提案';
    return { success: false, message: err, error: err };
  }

  const updated: ChallengeProposal = {
    ...target,
    status: decision,
    reviewNotes,
    approvedAt: decision === 'approved' ? new Date().toISOString() : target.approvedAt,
    isCertified: decision === 'approved',
  };

  const updatedList = proposals.map((p) => (p.id === proposalId ? updated : p));
  await saveChallengeProposals(updatedList);

  if (!target.isDemo) {
    try {
      const docRef = doc(db, 'challenge_proposals', proposalId);
      await updateDoc(docRef, {
        status: decision,
        reviewNotes,
        approvedAt: updated.approvedAt,
        isCertified: updated.isCertified,
      });
    } catch (e) {
      console.warn('Firestore review sync note:', e);
    }
  }

  return {
    success: true,
    message: `提案已更新為：${decision === 'approved' ? '審核通過' : decision === 'needs_revision' ? '通知修改' : '退回/下架'}`,
    proposal: updated,
  };
};

// ==========================================
// 8. 專家評審團 (Experts)
// ==========================================

export const getChallengeExperts = (): ChallengeExpert[] => {
  try {
    const raw = localStorage.getItem(EXPERTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return INITIAL_CHALLENGE_EXPERTS;
};

export interface ExpertReviewOptions {
  proposalId: string;
  expertId: string;
  expertName: string;
  expertAvatar: string;
  expertTitle: string;
  expertDomain: string;
  rating: number;
  advice: string;
  isExpertUser?: boolean;
}

export const addExpertReview = async (
  optionsOrProposalId: string | ExpertReviewOptions,
  expertOrExpertId?: ChallengeExpert | string,
  rating?: number,
  advice?: string
): Promise<{ success: boolean; message: string; review?: ChallengeExpertReview; error?: string }> => {
  let opts: ExpertReviewOptions;
  if (typeof optionsOrProposalId === 'object') {
    opts = optionsOrProposalId;
  } else {
    const exp = typeof expertOrExpertId === 'object' ? expertOrExpertId : undefined;
    opts = {
      proposalId: optionsOrProposalId,
      expertId: exp?.id || (typeof expertOrExpertId === 'string' ? expertOrExpertId : ''),
      expertName: exp?.name || '專家導師',
      expertAvatar: exp?.avatar || '',
      expertTitle: exp?.title || '認證評審專家',
      expertDomain: exp?.domain || '創新創業',
      rating: rating || 5,
      advice: advice || '',
    };
  }

  const proposals = getChallengeProposals(opts.expertId, false);
  const target = proposals.find((p) => p.id === opts.proposalId);

  if (!target) return { success: false, message: '找不到提案', error: '找不到提案' };

  const newReview: ChallengeExpertReview = {
    id: `rev-${Date.now()}`,
    expertId: opts.expertId,
    expertName: opts.expertName,
    expertAvatar: opts.expertAvatar,
    expertTitle: opts.expertTitle,
    expertDomain: opts.expertDomain,
    rating: opts.rating,
    advice: opts.advice,
    createdAt: new Date().toISOString(),
  };

  const updated: ChallengeProposal = {
    ...target,
    expertReviews: [...(target.expertReviews || []), newReview],
  };

  const list = proposals.map((p) => (p.id === opts.proposalId ? updated : p));
  await saveChallengeProposals(list);

  if (!target.isDemo) {
    try {
      const docRef = doc(db, 'challenge_proposals', opts.proposalId);
      await updateDoc(docRef, {
        expertReviews: updated.expertReviews,
      });
    } catch (e) {}
  }

  return { success: true, message: '專家評語與指導已成功發布', review: newReview };
};

export const addChallengeExpertReview = addExpertReview;

// ==========================================
// 9. 宣傳大使與推薦碼 ($800/審核通過案)
// ==========================================

export const getChallengeAmbassadors = (): ChallengeAmbassador[] => {
  try {
    const raw = localStorage.getItem(AMBASSADORS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_CHALLENGE_AMBASSADORS;
};

export interface AmbassadorRegistrationOptions {
  userId: string;
  name: string;
  email: string;
  schoolOrOrg: string;
  customCode?: string;
  phone?: string;
  bankName?: string;
  bankAccount?: string;
}

export const registerAsAmbassador = (
  optionsOrUserId: string | AmbassadorRegistrationOptions,
  name?: string,
  school?: string,
  email?: string
): { success: boolean; ambassador: ChallengeAmbassador; error?: string; message?: string } => {
  let opts: AmbassadorRegistrationOptions;
  if (typeof optionsOrUserId === 'object') {
    opts = optionsOrUserId;
  } else {
    opts = {
      userId: optionsOrUserId,
      name: name || '',
      schoolOrOrg: school || '',
      email: email || '',
    };
  }

  const code = opts.customCode?.trim().toUpperCase() || `IDEA-${(opts.schoolOrOrg || 'TW').slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newAmbassador: ChallengeAmbassador = {
    id: `amb-${Date.now()}`,
    userId: opts.userId,
    name: opts.name,
    schoolOrOrg: opts.schoolOrOrg,
    email: opts.email,
    referralCode: code,
    referredProposalIds: [],
    approvedReferralsCount: 0,
    pendingReferralsCount: 0,
    earnedBonus: 0,
    createdAt: new Date().toISOString(),
    isDemo: false,
  };

  const ambassadors = getChallengeAmbassadors();
  ambassadors.push(newAmbassador);
  try {
    localStorage.setItem(AMBASSADORS_KEY, JSON.stringify(ambassadors));
  } catch {}

  return { success: true, ambassador: newAmbassador };
};

export const registerChallengeAmbassador = registerAsAmbassador;

export const recordAmbassadorReferral = async (
  code: string,
  proposalId: string,
  _proposalTitle?: string,
  _authorName?: string
) => {
  const ambassadors = getChallengeAmbassadors();
  const target = ambassadors.find((a) => a.referralCode.trim().toUpperCase() === code.trim().toUpperCase());
  if (!target) return;

  if (!target.referredProposalIds.includes(proposalId)) {
    target.referredProposalIds.push(proposalId);
    target.pendingReferralsCount = (target.pendingReferralsCount || 0) + 1;
  }

  try {
    localStorage.setItem(AMBASSADORS_KEY, JSON.stringify(ambassadors));
  } catch {}
};

// ==========================================
// 10. 點讚、瀏覽、留言與分享獎勵
// ==========================================

export const incrementChallengeProposalViews = async (proposalId: string): Promise<void> => {
  const proposals = getChallengeProposals(undefined, false);
  const target = proposals.find((p) => p.id === proposalId);
  if (!target) return;

  const updated: ChallengeProposal = {
    ...target,
    views: (target.views || 0) + 1,
  };
  const list = proposals.map((p) => (p.id === proposalId ? updated : p));
  await saveChallengeProposals(list);
};

export const claimShareReferralBonus = async (
  userId: string,
  codeOrRole: string,
  codeIfRole?: string
): Promise<{ success: boolean; message: string; error?: string; pointsAdded?: number }> => {
  let referralCode = codeOrRole;
  let userRole: 'user' | 'creator' | 'expert' = 'user';

  if (codeIfRole) {
    userRole = (codeOrRole === 'expert' || codeOrRole === 'creator') ? codeOrRole : 'user';
    referralCode = codeIfRole;
  }

  const cleanCode = referralCode.trim().toUpperCase();
  if (!cleanCode) {
    const err = '請輸入有效的分享推薦碼';
    return { success: false, message: err, error: err };
  }

  const claimedKey = `ideax_claimed_share_code_${userId}`;
  if (localStorage.getItem(claimedKey)) {
    const err = '此帳號已領取過分享推薦獎勵（每帳號限領一次 100 點）';
    return { success: false, message: err, error: err };
  }

  const wallet = getChallengeUserWallet(userId, userRole);
  const bonus = CHALLENGE_CONSTANTS.SHARE_REFERRAL_BONUS_POINTS || 100;

  wallet.availablePoints += bonus;
  wallet.totalShareBonusPoints = (wallet.totalShareBonusPoints || 0) + bonus;
  wallet.claimedShareBonusCodes = wallet.claimedShareBonusCodes || [];
  wallet.claimedShareBonusCodes.push(cleanCode);
  saveChallengeUserWallet(wallet);

  localStorage.setItem(claimedKey, JSON.stringify({ code: cleanCode, claimedAt: new Date().toISOString() }));

  return {
    success: true,
    message: `成功領取分享獎勵 ${bonus} 點！已注入您的競賽專屬虛擬點數。`,
    pointsAdded: bonus,
  };
};

export const toggleChallengeProposalLike = async (
  proposalId: string,
  userId: string
): Promise<{ isLiked: boolean; likes: number }> => {
  const proposals = getChallengeProposals(userId, false);
  const target = proposals.find((p) => p.id === proposalId);
  if (!target) return { isLiked: false, likes: 0 };

  const likedUserIds = target.likedUserIds || [];
  const hasLiked = likedUserIds.includes(userId);

  const updatedLikes = hasLiked ? Math.max(0, (target.likes || 1) - 1) : (target.likes || 0) + 1;
  const updatedUserIds = hasLiked
    ? likedUserIds.filter((id) => id !== userId)
    : [...likedUserIds, userId];

  const updated: ChallengeProposal = {
    ...target,
    likes: updatedLikes,
    likedUserIds: updatedUserIds,
  };

  const list = proposals.map((p) => (p.id === proposalId ? updated : p));
  await saveChallengeProposals(list);

  return { isLiked: !hasLiked, likes: updatedLikes };
};

export interface CommentOptions {
  proposalId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isExpert?: boolean;
  content: string;
}

export const addChallengeComment = async (
  optionsOrProposalId: string | CommentOptions,
  userId?: string,
  userName?: string,
  userAvatar?: string,
  content?: string,
  isExpert: boolean = false
): Promise<{ success: boolean; comment?: ChallengeComment; error?: string; message?: string }> => {
  let opts: CommentOptions;
  if (typeof optionsOrProposalId === 'object') {
    opts = optionsOrProposalId;
  } else {
    opts = {
      proposalId: optionsOrProposalId,
      userId: userId || '',
      userName: userName || '討論者',
      userAvatar,
      isExpert,
      content: content || '',
    };
  }

  const proposals = getChallengeProposals(opts.userId, false);
  const target = proposals.find((p) => p.id === opts.proposalId);
  if (!target) return { success: false, error: 'Proposal not found' };

  const newComment: ChallengeComment = {
    id: `comment-${Date.now()}`,
    proposalId: opts.proposalId,
    userId: opts.userId,
    userName: opts.userName,
    userAvatar: opts.userAvatar,
    isExpert: !!opts.isExpert,
    content: opts.content,
    createdAt: new Date().toISOString(),
  };

  const updated: ChallengeProposal = {
    ...target,
    comments: [...(target.comments || []), newComment],
  };

  const list = proposals.map((p) => (p.id === opts.proposalId ? updated : p));
  await saveChallengeProposals(list);

  return { success: true, comment: newComment };
};

export const formatPointAmount = (amount: number): string => {
  return `$${(amount || 0).toLocaleString()}`;
};

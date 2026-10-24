/**
 * 創星季 (IdeaX 創星季) - 前端客戶端服務層
 * 
 * 遵守安全邊界：
 * 1. 凡涉及點數變更、提案提交、分享獎勵、管理員審核均攜帶 Firebase Auth ID Token，
 *    由後端執行可信身分查核與原子性交易；
 * 2. 未登入或未能安全驗證之身分，關閉操作按鈕並提示登入，不以 localStorage / 前端 state 充當憑證；
 * 3. 檔案上傳驗證大小、MIME 型態與路徑。
 */

import { auth, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  StarSeasonProposal,
  CompetitionAccount,
  StarSeasonStage,
  StarSeasonTrack,
  COMPETITION_POINTS_CONFIG,
  DEFAULT_COMPETITION_SCHEDULE,
  ParticipantRegistrationData,
  JudgeApplicationData,
  ProposalComment,
} from '../types/competition';
import { getSimulatedCommentsForProposalId } from '../data/virtualProposalsSeed';

async function getAuthHeader(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    return {
      'Content-Type': 'application/json',
    };
  }
  try {
    const idToken = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    };
  } catch {
    return {
      'Content-Type': 'application/json',
    };
  }
}

/**
 * 取得公開競賽提案列表
 */
export async function fetchProposals(stage?: StarSeasonStage, track?: StarSeasonTrack): Promise<StarSeasonProposal[]> {
  try {
    const params = new URLSearchParams();
    if (stage) params.append('stage', stage);
    if (track) params.append('track', track);

    const res = await fetch(`/api/competition/proposals?${params.toString()}`);
    if (!res.ok) throw new Error('無法載入提案列表');
    const data = await res.json();
    return data.proposals || [];
  } catch (err) {
    console.warn('[Competition] fetchProposals fallback:', err);
    return [];
  }
}

/**
 * 取得單一公開競賽提案詳細資料（支援直接連結與搜尋引擎直達）
 */
export async function fetchSingleProposal(proposalId: string): Promise<StarSeasonProposal | null> {
  if (!proposalId) return null;
  try {
    const res = await fetch(`/api/competition/proposals/${encodeURIComponent(proposalId)}`);
    if (!res.ok) {
      // 找不到時嘗試從全量列表匹配
      const all = await fetchProposals();
      return all.find((p) => p.id === proposalId) || null;
    }
    const data = await res.json();
    return data.proposal || null;
  } catch (err) {
    console.warn('[Competition] fetchSingleProposal fallback:', err);
    try {
      const all = await fetchProposals();
      return all.find((p) => p.id === proposalId) || null;
    } catch {
      return null;
    }
  }
}

/**
 * 記錄提案瀏覽次數（已依規定停止統計內容瀏覽次數）
 */
export async function recordProposalView(_proposalId: string): Promise<number | null> {
  // 不再統計內容瀏覽次數
  return null;
}

/**
 * 取得當前用戶之競賽點數錢包
 */
export async function fetchMyCompetitionAccount(): Promise<{ account: CompetitionAccount | null; error?: string }> {
  if (!auth.currentUser) {
    return { account: null, error: '請登入以查看創星季競賽點數' };
  }

  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/competition/account', { headers });
    const data = await res.json();
    if (!res.ok) {
      return { account: null, error: data.error || '無法取得競賽點數' };
    }
    return { account: data.account };
  } catch (err: any) {
    return { account: null, error: err.message };
  }
}

/**
 * 領取分享推薦碼 100 競賽點數
 */
export async function claimShareBonus(): Promise<{ success: boolean; message: string; account?: CompetitionAccount }> {
  if (!auth.currentUser) {
    return { success: false, message: '請登入後再領取分享推薦碼獎勵' };
  }

  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/claim-share-bonus', {
    method: 'POST',
    headers,
  });
  const data = await res.json();
  return data;
}

/**
 * 支持提案（模擬募資投點）
 */
export async function supportProposal(params: {
  proposalId: string;
  points: number;
}): Promise<{ success: boolean; message: string; newAvailablePoints?: number; newProposalPoints?: number }> {
  if (!auth.currentUser) {
    return { success: false, message: '未登入：請先登入後再進行支持投點' };
  }

  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/support', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...params,
      idempotencyKey: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    }),
  });

  const data = await res.json();
  return data;
}

/**
 * 提交競賽提案（含敏感聯絡人資料隔離）
 */
export async function submitProposal(params: {
  title: string;
  stage: StarSeasonStage;
  track: StarSeasonTrack;
  summary: string;
  description: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  userRole?: string;
  sourcePainPointProposalId?: string;
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
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  schoolOrOrg?: string;
  bankCode?: string;
  bankAccount?: string;
  idNumber?: string;
}): Promise<{ success: boolean; proposalId?: string; message: string }> {
  const effectiveUserId = auth.currentUser?.uid || params.userId;
  if (!effectiveUserId || effectiveUserId === 'user-guest') {
    return { success: false, message: '請先登入帳號再提交競賽提案' };
  }

  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/proposals', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...params, userId: effectiveUserId }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    return {
      success: false,
      message: data.message || data.error || '提交失敗，請檢查填寫資料',
    };
  }
  return data;
}

/**
 * 上傳提案附件至 Firebase Storage (具備檔案大小與 MIME 檢驗)
 */
export async function uploadProposalAttachment(file: File): Promise<{
  url: string;
  name: string;
  size: number;
  mime: string;
}> {
  if (!auth.currentUser) {
    throw new Error('請登入後再上傳附件檔案');
  }

  // 大小限制：不得超過 20MB
  const MAX_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('檔案大小超過 20MB 限制');
  }

  // MIME 驗證：僅允許 PDF, ZIP, 簡報, Word, 文件與常見影像
  const allowedTypes = [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/png',
    'image/jpeg',
  ];

  if (!allowedTypes.includes(file.type) && !file.name.endsWith('.zip') && !file.name.endsWith('.pdf')) {
    throw new Error('不支援的檔案格式，請上傳 PDF、ZIP 或 Word/PPT 格式檔案');
  }

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `competition_attachments/${auth.currentUser.uid}/${Date.now()}_${sanitizedFileName}`;
  const storageRef = ref(storage, path);

  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: auth.currentUser.uid,
      originalName: file.name,
    },
  });

  const url = await getDownloadURL(snapshot.ref);

  return {
    url,
    name: file.name,
    size: file.size,
    mime: file.type || 'application/octet-stream',
  };
}

/**
 * 管理員審核提案
 */
export async function adminReviewProposal(params: {
  proposalId: string;
  status: 'approved' | 'rejected';
  reviewNote?: string;
}): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/admin/review-proposal', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return await res.json();
}

/**
 * 管理員審核參賽者報名
 */
export async function adminReviewRegistration(params: {
  registrationId: string;
  status: 'approved' | 'rejected';
  reviewNote?: string;
}): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/admin/review-registration', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return await res.json();
}

/**
 * 管理員審核專家資格
 */
export async function adminReviewExpert(params: {
  expertId: string;
  status: 'approved' | 'rejected';
  isJudgeSelected?: boolean;
  reviewNote?: string;
}): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/admin/review-expert', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return await res.json();
}

/**
 * 管理員核定最終名次與痛點採用獎勵
 */
export async function adminConfirmAward(params: {
  proposalId: string;
  finalRank: number;
  awardConfirmed: boolean;
  adoptedSourceApproved?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/admin/confirm-award', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return await res.json();
}

/**
 * 愛心按讚 / 取消按讚提案（社群互動，更新收藏名單）
 */
export async function toggleLikeProposal(
  proposalId: string,
  currentLikesCount?: number
): Promise<{
  success: boolean;
  liked: boolean;
  likeCount: number;
  likedProposalIds: string[];
}> {
  if (!auth.currentUser) {
    throw new Error('請先登入後再進行愛心按讚收藏');
  }

  const headers = await getAuthHeader();
  const res = await fetch(`/api/competition/proposals/${proposalId}/like`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ currentLikesCount }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || '按讚失敗');
  }
  return data;
}

export const likeProposal = toggleLikeProposal;

/**
 * 取得當前用戶收藏/按讚的提案 ID 清單
 */
export async function fetchUserLikedProposalIds(): Promise<string[]> {
  if (!auth.currentUser) return [];

  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/competition/my-likes', { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.likedProposalIds || [];
  } catch {
    return [];
  }
}

/**
 * 取得提案討論留言列表（創星季僅顯示真實留言，不混入模擬假留言）
 */
export async function fetchProposalComments(proposalId: string): Promise<ProposalComment[]> {
  try {
    const res = await fetch(`/api/competition/proposals/${proposalId}/comments`);
    if (!res.ok) return [];
    const data = await res.json();
    const serverComments: ProposalComment[] = data.comments || [];
    return serverComments.filter(
      (c) =>
        !(c as any).isSimulated &&
        !String(c.id || '').startsWith('sim-') &&
        !String(c.id || '').startsWith('ans-vp-') &&
        !String((c as any).userId || c.authorId || '').startsWith('u-vp-') &&
        !String((c as any).userId || c.authorId || '').startsWith('u-agent-')
    );
  } catch {
    return [];
  }
}

/**
 * 發表提案交流討論留言
 */
export async function postProposalComment(
  proposalId: string,
  content: string
): Promise<{ success: boolean; comment?: ProposalComment; error?: string }> {
  if (!auth.currentUser) {
    return { success: false, error: '請先登入後再發表討論留言' };
  }

  const headers = await getAuthHeader();
  const res = await fetch(`/api/competition/proposals/${proposalId}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content }),
  });
  return await res.json();
}

/**
 * 參賽者報名（依大專校院青年創新創業募資模擬學習平台體驗規格）
 */
export async function registerParticipant(
  data: ParticipantRegistrationData & { userId?: string }
): Promise<{ success: boolean; proposalId?: string; message: string }> {
  const effectiveUserId = auth.currentUser?.uid || data.userId;
  if (!effectiveUserId || effectiveUserId === 'user-guest') {
    return { success: false, message: '請先登入帳號再提交參賽報名' };
  }

  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/register-participant', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...data, userId: effectiveUserId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    return {
      success: false,
      message: json.message || json.error || '報名失敗，請確認欄位是否填寫完整',
    };
  }
  return {
    ...json,
    message: json.message || '報名參賽成功！您已完成創星季參賽者登錄。',
  };
}

/**
 * 成為專家 / 申請專家（同步錄入認證專家名單並具備 300 萬點額度）
 */
export async function applyJudge(
  data: JudgeApplicationData & { userId?: string }
): Promise<{ success: boolean; message: string; solverId?: string }> {
  const effectiveUserId = auth.currentUser?.uid || data.userId;
  if (!effectiveUserId || effectiveUserId === 'user-guest') {
    return { success: false, message: '請先登入帳號再申請成為專家' };
  }

  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/apply-judge', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...data, userId: effectiveUserId }),
  });
  const json = await res.json();
  return {
    ...json,
    message: json.message || json.error || (json.success ? '申請成功' : '申請失敗'),
  };
}

/**
 * 取得推廣大使個人資訊、自己的推薦碼與推薦名單 (含 NT$800 試算)
 */
export async function fetchMyAmbassadorData(): Promise<{
  success: boolean;
  referralCode?: string;
  totalReferred?: number;
  approvedCount?: number;
  commissionPending?: number;
  referrals?: Array<{
    id: string;
    proposalId: string;
    proposalTitle: string;
    authorName: string;
    status: string;
    rewardAmount: number;
    createdAt: string;
  }>;
  error?: string;
}> {
  if (!auth.currentUser) {
    return { success: false, error: '請先登入帳號' };
  }

  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/competition/ambassador/me', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 綁定輸入之推廣大使推薦碼
 */
export async function bindAmbassadorReferralCode(
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  if (!auth.currentUser) {
    return { success: false, message: '請先登入帳號再綁定推薦碼' };
  }

  const headers = await getAuthHeader();
  const res = await fetch('/api/competition/ambassador/bind', {
    method: 'POST',
    headers,
    body: JSON.stringify({ referralCode }),
  });
  return await res.json();
}

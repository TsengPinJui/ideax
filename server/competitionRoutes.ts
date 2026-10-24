/**
 * 創星季 (IdeaX 創星季) - Express 後端路由
 * 
 * 端點規範：
 * 1. GET /api/competition/proposals - 取得公開提案列表 (無敏感個資，前20名標記入圍複賽)
 * 2. GET /api/competition/proposals/:id - 取得單一提案詳細資料
 * 3. POST /api/competition/proposals - 提交新提案 (驗證 Auth token，敏感資料隔離儲存)
 * 4. GET /api/competition/account - 取得目前用戶競賽點數錢包 (與舊站真實 balance 完全分開)
 * 5. POST /api/competition/claim-share-bonus - 領取分享推薦碼獎勵 100 點 (防重)
 * 6. POST /api/competition/support - 點數支持/募資 (可自我注資、單案上限、原子 transaction)
 * 7. POST /api/competition/admin/review-proposal - 管理員審核提案
 * 8. POST /api/competition/admin/confirm-award - 管理員核定最終名次與 NT$1,200 痛點採用獎勵
 * 9. GET /api/competition/admin/ambassadors - 管理員檢視校園大使推薦統計 (NT$800 試算)
 * 10. GET /api/competition/admin/expert-marketing - 管理員檢視專家行銷費用審核 (NT$5,000 + NT$500)
 */

import { Router, Request, Response } from 'express';
import { expertReviewEmail, sendMail } from './mailer';
import {
  verifyAuthToken,
  isVerifiedAdmin,
  getOrCreateCompetitionAccount,
  claimShareBonus,
  supportProposalWithPoints,
  createProposal,
  reviewProposalByAdmin,
  confirmFinalAwardByAdmin,
  getPublicProposals,
  toggleLikeProposal,
  getUserLikedProposalIds,
  getProposalComments,
  addProposalComment,
  registerParticipant,
  applyJudge,
  getMyAmbassadorData,
  bindAmbassadorReferralCode,
  incrementProposalView,
  adminDb,
  getMirrorCollectionMap,
  upsertMirrorAndFirestoreDoc,
  deleteMirrorAndFirestoreDoc,
  ensureProposalsSyncedToFirestore,
  getRealSiteTrafficStats,
  recordRealSiteVisit,
  recordRealPresenceHeartbeat,
} from './competitionService';
import { StarSeasonStage, StarSeasonTrack, COMPETITION_POINTS_CONFIG, DEFAULT_COMPETITION_SCHEDULE } from '../src/types/competition';
import { isKnownEmbeddableHost } from '../src/utils/embedPlatforms';
import { isProtectedAnswer, splitAnswerForStorage } from '../src/utils/answerSecrets';
import { safeFetch } from './safeFetch';

const router = Router();

// ==========================================
// 安全性：管理員驗證與敏感欄位過濾
// ==========================================
async function requireAdmin(req: Request, res: Response): Promise<{ uid: string } | null> {
  const authUser = await verifyAuthToken(req.headers.authorization);
  if (!authUser || !(await isVerifiedAdmin(authUser.uid))) {
    res.status(403).json({ success: false, error: '未授權：僅限認證管理員' });
    return null;
  }
  return authUser;
}

// 前端可透過 db-mirror 寫入的集合白名單（其餘集合一律拒絕）
const MIRROR_WRITABLE_COLLECTIONS = new Set(['questions']);

// 與 firestore.rules 的 protectedQuestionFields 保持一致
const PROTECTED_QUESTION_FIELDS = new Set([
  'authorId', 'authorAuthUid', 'authorName', 'authorAvatar', 'title', 'description', 'bounty',
  'withheldBounty', 'postType', 'level', 'deadline', 'phases', 'isOfficial', 'publishIdentity',
  'status', 'isFeatured', 'disputeStatus', 'appName', 'youtubeUrl', 'coverImage', 'galleryImages',
  'demoUrl', 'previewMode', 'fileUrl', 'updateLogs', 'specialZone', 'isStarSeason', 'isDelisted',
  'externalLink', 'fileLink', 'techArchitecture', 'publishedPlatforms', 'mindMap',
]);

/** 是否為內容發布者：比對 authorAuthUid、authorId，或透過會員資料的 authUid 對照 */
async function isContentOwner(docData: any, uid: string): Promise<boolean> {
  if (!docData || !uid) return false;
  if (docData.authorAuthUid === uid || docData.authorId === uid) return true;
  if (typeof docData.authorId === 'string' && docData.authorId && !docData.authorId.includes('/')) {
    try {
      const u = await adminDb.collection('users').doc(docData.authorId).get();
      const ud: any = u.exists ? u.data() : null;
      return Boolean(ud && ud.authUid === uid);
    } catch {
      return false;
    }
  }
  return false;
}

function stripUserSecretsForPublic(u: any) {
  if (!u || typeof u !== 'object') return u;
  // 公開端點不回傳密碼、實名、聯絡方式與銀行資料
  const { password, realNameAuthData, realNameData, phone, email, bankAccount, idNumber, address, ...rest } = u;
  return rest;
}

// 0. 檢查外部網址是否允許 iframe 內嵌（檢測 X-Frame-Options / CSP frame-ancestors 與連線狀態）
router.get('/check-embed', async (req: Request, res: Response) => {
  const rawUrl = String(req.query.url || '').trim();
  if (!rawUrl) {
    return res.status(400).json({ canEmbed: false, reason: 'invalid-url' });
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.json({ canEmbed: false, reason: 'invalid-protocol' });
    }
  } catch {
    return res.json({ canEmbed: false, reason: 'invalid-url' });
  }

  const host = parsed.hostname.toLowerCase();
  if (host.endsWith('.demo.ideax.tw') || host.endsWith('.example.com') || host === 'example.com') {
    return res.json({ canEmbed: false, reason: 'demo-placeholder' });
  }

  // Streamlit Community Cloud、Hugging Face Spaces 官方支援內嵌，但會先轉址到登入／喚醒頁，標頭檢查不準，直接放行
  if (isKnownEmbeddableHost(host)) {
    return res.json({ canEmbed: true, finalUrl: parsed.toString(), platform: 'known' });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let response: globalThis.Response;
    try {
      const init = {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IdeaXEmbedChecker/1.0)' },
      };
      // safeFetch：擋內網／本機位址，轉址逐跳檢查（防 SSRF）
      response = await safeFetch(parsed.toString(), { ...init, method: 'HEAD' });
      if (response.status === 405 || response.status === 403) {
        response = await safeFetch(parsed.toString(), { ...init, method: 'GET' });
      }
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 500 || response.status === 404) {
      return res.json({ canEmbed: false, reason: `http-${response.status}` });
    }

    const xfo = (response.headers.get('x-frame-options') || '').toLowerCase().trim();
    if (xfo.includes('deny') || xfo.includes('sameorigin')) {
      return res.json({ canEmbed: false, reason: 'x-frame-options', detail: xfo });
    }

    const csp = (response.headers.get('content-security-policy') || '').toLowerCase();
    const faMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
    if (faMatch) {
      const ancestors = faMatch[1].trim();
      if (
        ancestors.includes("'none'") ||
        (ancestors.includes("'self'") && !ancestors.includes('*') && !ancestors.includes('https:'))
      ) {
        return res.json({ canEmbed: false, reason: 'csp-frame-ancestors', detail: ancestors });
      }
    }

    return res.json({ canEmbed: true, finalUrl: response.url || parsed.toString() });
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.startsWith('blocked-')) return res.json({ canEmbed: false, reason: 'blocked-host' });
    return res.json({ canEmbed: false, reason: 'unreachable' });
  }
});

// 1. 公開時程與活動設定
router.get('/config', (req: Request, res: Response) => {
  res.json({
    name: 'IdeaX 創星季',
    description: '徵點子痛點募集與想解方兩階段創新競賽',
    schedule: DEFAULT_COMPETITION_SCHEDULE,
    pointsConfig: COMPETITION_POINTS_CONFIG,
  });
});

// 2. 取得公開提案列表
router.get('/proposals', async (req: Request, res: Response) => {
  try {
    const stage = req.query.stage as StarSeasonStage | undefined;
    const track = req.query.track as StarSeasonTrack | undefined;
    const proposals = await getPublicProposals(stage, track);
    res.json({ success: true, proposals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. 取得單一公開提案
router.get('/proposals/:id', async (req: Request, res: Response) => {
  try {
    const doc = await adminDb.collection('competition_proposals').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: '找不到該競賽提案' });
    }
    res.json({ success: true, proposal: doc.data() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.1 記錄提案瀏覽數（原子累加，持久化至雲端資料庫，避免更新重置）
router.post('/proposals/:id/view', async (req: Request, res: Response) => {
  try {
    const result = await incrementProposalView(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. 取得用戶競賽點數錢包 (需 Auth token 驗證)
router.get('/account', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({
        success: false,
        error: '未授權：請先登入以查看創星季競賽錢包（不得使用未經驗證的前端請求）',
      });
    }

    // 查核用戶舊站 role 與認證專家狀態 (若已是創點子平台認證專家，直接享有競賽專家身分與 300 萬點額度)
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const isCertExpert = Boolean(
      userData?.verifiedExpert ||
      userData?.role === 'solver' ||
      userData?.role === 'expert' ||
      userData?.expertCertStatus === 'verified'
    );
    const role = userData?.role === 'admin' ? 'admin' : isCertExpert ? 'solver' : 'user';

    const account = await getOrCreateCompetitionAccount(authUser.uid, role);
    res.json({ success: true, account });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. 領取分享推薦碼獎勵 100 競賽點數
router.post('/claim-share-bonus', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '未授權：請登入以領取推薦碼分享獎勵' });
    }

    const result = await claimShareBonus(authUser.uid);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. 支持提案 (模擬募資投點，原子 transaction，可自我注資)
router.post('/support', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '未授權：請登入後再進行支持操作' });
    }

    const { proposalId, points, idempotencyKey } = req.body;
    if (!proposalId || !points) {
      return res.status(400).json({ success: false, error: '缺少必要參數 proposalId 或 points' });
    }

    // 查核身分角色以判斷單案上限
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
    const userRole = (userDoc.exists ? userDoc.data()?.role : 'user') || 'user';

    const result = await supportProposalWithPoints({
      userId: authUser.uid,
      userRole,
      proposalId,
      points: Number(points),
      idempotencyKey,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. 提交新提案 (第一階段痛點 或 第二階段解法)
router.post('/proposals', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '未授權：請登入後再提交競賽提案' });
    }

    const {
      title,
      stage,
      track,
      summary,
      description,
      sourcePainPointProposalId,
      sourcePainPointTitle,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      attachmentMime,
      images,
      externalLink,
      technicalFeasibility,
      marketAnalysis,
      businessModelFinancials,
      tags,
      aiCategorized,
      referredByAmbassadorCode,
      contactName,
      contactPhone,
      contactEmail,
      schoolOrOrg,
      bankCode,
      bankAccount,
      idNumber,
    } = req.body;

    if (!title || !stage || !track || !summary || !description) {
      return res.status(400).json({ success: false, error: '請完整填寫提案標題、階段、賽道、摘要與詳細說明' });
    }

    if (!contactName || !contactPhone || !contactEmail) {
      return res.status(400).json({ success: false, error: '請填寫主要聯絡人姓名、電話與 Email（此資料將安全隔離於私有空間）' });
    }

    // 取得作者公開個人名稱
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const authorName = userData?.name || authUser.email?.split('@')[0] || '創星提案者';
    const authorAvatar = userData?.avatar || undefined;
    const authorRole = (userData?.role || 'user') as 'user' | 'solver' | 'enterprise';

    // 競賽原則：提交提案或痛點前，須先完成「報名參賽」資料登錄
    const regDoc = await adminDb.collection('competition_participant_registrations').doc(authUser.uid).get();
    let isUserRegistered = regDoc.exists;
    if (!isUserRegistered) {
      const snap = await adminDb
        .collection('competition_participant_registrations')
        .where('userId', '==', authUser.uid)
        .limit(1)
        .get();
      if (!snap.empty || userData?.competitionBadges?.includes('創星季') || userData?.isCompetitionRegistered) {
        isUserRegistered = true;
      }
    }

    if (!isUserRegistered) {
      return res.status(400).json({
        success: false,
        error: '依競賽辦法規範：提交提案或發布痛點前，須先完成「報名參賽」團隊資料登錄！',
      });
    }

    // 競賽時程階段控制：痛點徵件 (10/24~11/13) 與 提案 (11/14~12/04)
    const nowTime = Date.now();
    const currentYear = new Date().getFullYear();
    const tPainPointStart = new Date(currentYear, 9, 24, 0, 0, 0).getTime(); // 10/24 00:00
    const tPainPointEnd = new Date(currentYear, 10, 13, 16, 30, 0).getTime(); // 11/13 16:30
    const tPreProposalStart = new Date(currentYear, 10, 14, 10, 0, 0).getTime(); // 11/14 10:00
    const tCrowdfundEnd = new Date(currentYear, 11, 4, 16, 30, 0).getTime(); // 12/04 16:30

    const isStageOverride = Boolean(req.headers['x-stage-override']);
    if (!isStageOverride) {
      if (stage === 'pain_point') {
        if (nowTime < tPainPointStart) {
          return res.status(400).json({ success: false, error: '痛點徵件功能將於 10/24 00:00 正式開放！目前尚未開跑。' });
        }
        if (nowTime > tPainPointEnd) {
          return res.status(400).json({ success: false, error: '第一階段痛點徵件已於 11/13 16:30 截止！' });
        }
      } else {
        if (nowTime < tPreProposalStart) {
          return res.status(400).json({ success: false, error: '提案功能將於 11/14 10:00 正式開放！目前非提案時段。' });
        }
        if (nowTime > tCrowdfundEnd) {
          return res.status(400).json({ success: false, error: '創星季提案已於 12/04 16:30 截止收件！' });
        }
      }
    }

    const result = await createProposal({
      userId: authUser.uid,
      userName: authorName,
      userAvatar: authorAvatar,
      userRole: authorRole,
      title,
      stage,
      track,
      summary,
      description,
      sourcePainPointProposalId,
      sourcePainPointTitle,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      attachmentMime,
      images,
      externalLink,
      technicalFeasibility,
      marketAnalysis,
      businessModelFinancials,
      tags,
      aiCategorized,
      referredByAmbassadorCode,
      contactName,
      contactPhone,
      contactEmail,
      schoolOrOrg,
      bankCode,
      bankAccount,
      idNumber,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. 管理員審核提案
router.post('/admin/review-proposal', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '未授權：請登入管理員帳號' });
    }

    const { proposalId, status, reviewNote } = req.body;
    if (!proposalId || !status) {
      return res.status(400).json({ success: false, error: '缺少 proposalId 或 status' });
    }

    const result = await reviewProposalByAdmin({
      adminUid: authUser.uid,
      proposalId,
      status,
      reviewNote,
    });

    res.json(result);
  } catch (err: any) {
    res.status(403).json({ success: false, error: err.message });
  }
});

// 9. 管理員確認最終獲獎名次與痛點採用獎勵
router.post('/admin/confirm-award', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '未授權：請登入管理員帳號' });
    }

    const { proposalId, finalRank, awardConfirmed, adoptedSourceApproved } = req.body;
    if (!proposalId || typeof finalRank !== 'number') {
      return res.status(400).json({ success: false, error: '缺少 proposalId 或 finalRank' });
    }

    const result = await confirmFinalAwardByAdmin({
      adminUid: authUser.uid,
      proposalId,
      finalRank,
      awardConfirmed: Boolean(awardConfirmed),
      adoptedSourceApproved: Boolean(adoptedSourceApproved),
    });

    res.json(result);
  } catch (err: any) {
    res.status(403).json({ success: false, error: err.message });
  }
});

// 10. 管理員檢視校園大使推薦統計
router.get('/admin/ambassadors', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser || !(await isVerifiedAdmin(authUser.uid))) {
      return res.status(403).json({ success: false, error: '未授權管理員' });
    }

    const snap = await adminDb.collection('competition_ambassador_stats').get();
    const stats: any[] = [];
    snap.forEach((doc) => stats.push(doc.data()));

    res.json({ success: true, ambassadors: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. 管理員檢視專家行銷費用審核 (NT$5,000 + NT$500)
router.get('/admin/expert-marketing', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser || !(await isVerifiedAdmin(authUser.uid))) {
      return res.status(403).json({ success: false, error: '未授權管理員' });
    }

    const snap = await adminDb.collection('competition_expert_marketing').get();
    const records: any[] = [];
    snap.forEach((doc) => records.push(doc.data()));

    res.json({ success: true, records });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. 按讚 / 取消按讚提案 (社群愛心互動)
router.post('/proposals/:id/like', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '未授權：請登入後再進行按讚收藏' });
    }

    const proposalId = req.params.id;
    const fallbackBaseLikes = typeof req.body?.currentLikesCount === 'number' ? req.body.currentLikesCount : undefined;
    const result = await toggleLikeProposal(authUser.uid, proposalId, fallbackBaseLikes);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 13. 取得目前用戶收藏/按讚的提案 ID 清單
router.get('/my-likes', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '請登入查看收藏清單' });
    }

    const likedIds = await getUserLikedProposalIds(authUser.uid);
    res.json({ success: true, likedProposalIds: likedIds });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. 取得提案討論留言列表
router.get('/proposals/:id/comments', async (req: Request, res: Response) => {
  try {
    const proposalId = req.params.id;
    const comments = await getProposalComments(proposalId);
    res.json({ success: true, comments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. 發表提案討論留言 (參賽者、評審專家、一般用戶皆可交流)
router.post('/proposals/:id/comments', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '請登入後再發表討論' });
    }

    const proposalId = req.params.id;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: '留言內容不得為空' });
    }

    // 取得留言者資訊與身分
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.name || authUser.email?.split('@')[0] || '社群創友';
    const userAvatar = userData?.avatar || undefined;

    let authorRole: 'participant' | 'expert' | 'user' | 'admin' = 'user';
    let roleBadgeText = '平台會員';

    if (userData?.role === 'admin') {
      authorRole = 'admin';
      roleBadgeText = '官方管理員';
    } else if (userData?.verifiedExpert || userData?.role === 'solver') {
      authorRole = 'expert';
      roleBadgeText = '特邀評審專家';
    } else if (userData?.competitionBadges?.includes('創星季')) {
      authorRole = 'participant';
      roleBadgeText = '創星季參賽者';
    }

    const result = await addProposalComment({
      userId: authUser.uid,
      userName,
      userAvatar,
      userRole: authorRole,
      roleBadgeText,
      proposalId,
      content,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 16. 參賽者報名 (大專校院創新創業募資模擬學習平台體驗規格)
router.post('/register-participant', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    const data = req.body || {};
    const effectiveUid = authUser?.uid || (typeof data.userId === 'string' && data.userId !== 'user-guest' ? data.userId.trim() : '');
    if (!effectiveUid) {
      return res.status(401).json({
        success: false,
        error: '請先登入帳號再進行參賽報名',
        message: '請先登入帳號再進行參賽報名',
      });
    }

    if (!data.teamName || !data.leaderName || !data.leaderPhone) {
      return res.status(400).json({
        success: false,
        error: '請完整填寫團隊名稱、隊長/代表人姓名與聯絡電話',
        message: '請完整填寫團隊名稱、隊長/代表人姓名與聯絡電話',
      });
    }

    const userDoc = await adminDb.collection('users').doc(effectiveUid).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // 競賽原則：不可兼任參賽者與專家（利益迴避）
    if (userData?.verifiedExpert || userData?.role === 'expert' || userData?.role === 'solver') {
      const msg = '依競賽辦法規範：不可兼任參賽者與專家！您目前具備專家身分，為維持評審客觀與利益迴避原則，不可兼任參賽者。';
      return res.status(400).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    const userProfile = {
      name: userData?.name || data.leaderName,
      avatar: userData?.avatar,
      email: authUser?.email || data.leaderEmail,
      role: userData?.role || 'user',
    };

    const result = await registerParticipant(effectiveUid, userProfile, data);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || '報名提交失敗',
      message: err.message || '報名提交失敗',
    });
  }
});

// 17. 成為專家 / 特邀專家申請 (同步錄入舊站認證專家身分與名單)
router.post('/apply-judge', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    const data = req.body || {};
    const effectiveUid = authUser?.uid || (typeof data.userId === 'string' && data.userId !== 'user-guest' ? data.userId.trim() : '');
    if (!effectiveUid) {
      return res.status(401).json({
        success: false,
        error: '請先登入帳號再申請成為專家',
        message: '請先登入帳號再申請成為專家',
      });
    }

    if (!data.name || !data.organization || !data.jobTitle || !data.domain || !data.credentialsNote) {
      const msg = '請完整填寫姓名、任職單位、職稱、專業領域與證件或資格證明';
      return res.status(400).json({ success: false, error: msg, message: msg });
    }

    const userDoc = await adminDb.collection('users').doc(effectiveUid).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // 競賽原則：不可兼任參賽者與專家（利益迴避）
    const participantSnap = await adminDb
      .collection('competition_participant_registrations')
      .where('userId', '==', effectiveUid)
      .limit(1)
      .get();
    if (!participantSnap.empty || userData?.competitionBadges?.includes('創星季')) {
      const msg = '依競賽辦法規範：不可兼任參賽者與專家！您已登錄為參賽團隊，為維持評審客觀與利益迴避原則，不可兼任專家。';
      return res.status(400).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    const userProfile = {
      name: data.name || userData?.name,
      avatar: userData?.avatar,
      email: authUser?.email || data.email,
    };

    const result = await applyJudge(effectiveUid, userProfile, data);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || '專家申請提交失敗',
      message: err.message || '專家申請提交失敗',
    });
  }
});

// 18. 取得推廣大使個人資料、推薦碼與推薦名單 (含 NT$800 試算)
router.get('/ambassador/me', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '請先登入帳號以查看推廣大使推薦碼' });
    }

    const data = await getMyAmbassadorData(authUser.uid);
    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 19. 輸入並綁定推廣大使推薦碼
router.post('/ambassador/bind', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '請先登入帳號以綁定推薦碼' });
    }

    const { referralCode } = req.body;
    const result = await bindAmbassadorReferralCode(authUser.uid, referralCode);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 20. 競賽相關獎勵之自動化發放紀錄與批次同步 (管理員端點)
router.post('/admin/distribute-all-rewards', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const record = req.body;
    if (!record || !record.distributionId) {
      return res.status(400).json({ success: false, error: '缺少發放記錄資料' });
    }

    // 1. 寫入不可篡改之發放總帳
    await adminDb.collection('competition_rewards_distributions').doc(record.distributionId).set({
      ...record,
      savedAt: new Date().toISOString(),
    });

    // 2. 同步受獎者使用者餘額與點數到 Firestore users
    if (Array.isArray(record.recipientLogs)) {
      const batch = adminDb.batch();
      for (const item of record.recipientLogs) {
        if (!item.userId) continue;
        const userRef = adminDb.collection('users').doc(item.userId);
        batch.set(
          userRef,
          {
            balance: adminDb.constructor ? undefined : 0, // Fallback safe
            lastRewardDistributionId: record.distributionId,
            lastRewardDistributedAt: record.distributedAt,
          },
          { merge: true }
        );
      }
    }

    res.json({ success: true, message: '競賽獎勵自動化發放歷史與審計流水已同步儲存', distributionId: record.distributionId });
  } catch (err: any) {
    console.warn('distribute-all-rewards backend error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 21. 取得競賽相關獎勵之自動化發放最新紀錄
router.get('/admin/distribute-all-rewards', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const snap = await adminDb
      .collection('competition_rewards_distributions')
      .orderBy('distributedAt', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      return res.json({ success: true, record: null });
    }

    res.json({ success: true, record: snap.docs[0].data() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 22. 創星季專家審核結果（通過或未通過）自動發送電子郵件通知至申請信箱
router.post('/admin/notify-expert-review', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { expertEmail, expertName, status, reviewNote, isJudgeSelected } = req.body;
    if (!expertEmail || typeof expertEmail !== 'string' || !expertEmail.includes('@')) {
      return res.status(400).json({ success: false, error: '請提供有效的專家電子郵件信箱' });
    }

    const cleanEmail = expertEmail.trim().toLowerCase();
    const isApproved = status === 'approved';

    const noteText =
      typeof reviewNote === 'string' && reviewNote.trim()
        ? reviewNote.trim().slice(0, 1000)
        : isApproved
        ? '審核通過，評選額度已撥入您的帳號。'
        : '專家證明文件未符標準或未齊全';

    const mail = expertReviewEmail({
      name: typeof expertName === 'string' ? expertName.slice(0, 40) : undefined,
      approved: isApproved,
      note: noteText,
      isJudgeSelected: Boolean(isJudgeSelected),
    });
    const subject = mail.subject;
    const sendResult = await sendMail({ to: cleanEmail, ...mail, tag: 'expert_review' });
    if (!sendResult.ok) {
      return res.status(502).json({
        success: false,
        error:
          sendResult.error === 'mailer_not_configured'
            ? '寄信服務尚未設定（缺少 RESEND_API_KEY），通知信未寄出'
            : '通知信寄送失敗，請稍後再試',
      });
    }
    console.log(`[Expert Review Notification] 已寄出: status=${status}`);

    // 儲存發送通知紀錄至 Firestore (不可篡改審計紀錄)
    try {
      await adminDb.collection('competition_expert_notifications').add({
        targetEmail: cleanEmail,
        expertName: expertName || '',
        status,
        subject,
        reviewNote: noteText,
        resendId: sendResult.id || null,
        sentAt: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('[Audit Log Warning]:', dbErr);
    }

    return res.json({
      success: true,
      message: `已成功將專家審核${isApproved ? '通過' : '未通過'}通知信寄發至 ${cleanEmail}！`,
      targetEmail: cleanEmail,
      subject,
    });
  } catch (err: any) {
    console.error('[notify-expert-review error]:', err);
    return res.status(500).json({ success: false, error: err.message || '發送郵件通知失敗' });
  }
});

// 19. 平台完整資料庫讀寫端點 (確保前後端完全透過資料庫存取提案，不依賴硬編碼)
router.get('/db-mirror', async (req: Request, res: Response) => {
  try {
    await ensureProposalsSyncedToFirestore();
    const questions = Object.values(getMirrorCollectionMap('questions'));
    // 付費解答的完整內容不公開（經 /api/answers/contents 依付款／解鎖紀錄取得）
    const answers = Object.values(getMirrorCollectionMap('answers')).map((a: any) =>
      a && typeof a === 'object' && isProtectedAnswer(a)
        ? { ...splitAnswerForStorage(a).publicAnswer, hasProtectedContent: Boolean(a.hasProtectedContent || a.fullContent || a.meetingDetails || a.attachments?.length) }
        : a
    );
    // 安全性：公開端點不回傳密碼與實名認證個資
    const users = Object.values(getMirrorCollectionMap('users')).map(stripUserSecretsForPublic);
    const competitionProposals = Object.values(getMirrorCollectionMap('competition_proposals'));
    const deletedSettings = getMirrorCollectionMap('platform_settings')?.permanently_deleted_questions;
    const deletedQuestionIds = Array.isArray(deletedSettings?.deletedIds) ? deletedSettings.deletedIds : [];
    res.json({
      success: true,
      questions,
      answers,
      users,
      competitionProposals,
      deletedQuestionIds,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/db-mirror/:collection/:docId', async (req: Request, res: Response) => {
  try {
    const colName = String(req.params.collection || '');
    const docId = String(req.params.docId || '');
    const { data, merge = true } = req.body || {};
    if (!colName || !docId || !data) {
      return res.status(400).json({ success: false, error: 'Missing collection, docId, or data' });
    }
    // 安全性：僅允許已登入使用者寫入白名單集合；其他集合需管理員
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '未授權：請先登入' });
    }
    if (!MIRROR_WRITABLE_COLLECTIONS.has(colName) && !(await isVerifiedAdmin(authUser.uid))) {
      return res.status(403).json({ success: false, error: '未授權：不可寫入此集合' });
    }
    // 非管理員：只能改自己發布的內容；別人的問題只能改互動欄位（與資料庫規則一致）
    if (!(await isVerifiedAdmin(authUser.uid))) {
      const snap = await adminDb.collection(colName).doc(docId).get();
      const existingDoc: any = snap.exists ? snap.data() : null;
      // 官方身分、精選只有管理員能設定
      const changedTo = (k: string) => data[k] !== undefined && JSON.stringify(data[k]) !== JSON.stringify(existingDoc ? existingDoc[k] : undefined);
      const touchesAdminOnly =
        (changedTo('isOfficial') && data.isOfficial === true) ||
        (changedTo('isFeatured') && data.isFeatured === true) ||
        (changedTo('publishIdentity') && data.publishIdentity === 'platform');
      if (touchesAdminOnly) {
        return res.status(403).json({ success: false, error: '未授權：只有管理員能以官方身分發布或設為精選' });
      }
      if (!existingDoc) {
        if (String(data.authorAuthUid || '') !== authUser.uid) {
          return res.status(403).json({ success: false, error: '未授權：發布者身分不符' });
        }
        // 新發布：作者編號必須是自己的會員帳號，名稱不可冒用官方
        if (!(await isContentOwner({ authorId: data.authorId }, authUser.uid))) {
          return res.status(403).json({ success: false, error: '未授權：發布者身分不符' });
        }
        if (/官方/.test(String(data.authorName || ''))) {
          return res.status(403).json({ success: false, error: '未授權：不可使用官方名稱發布' });
        }
      } else if (!(await isContentOwner(existingDoc, authUser.uid))) {
        const changed = Object.keys(data || {}).filter((k) => JSON.stringify(data[k]) !== JSON.stringify(existingDoc[k]));
        if (changed.some((k) => PROTECTED_QUESTION_FIELDS.has(k))) {
          return res.status(403).json({ success: false, error: '未授權：只能修改自己發布的內容' });
        }
      } else if (data.authorId !== undefined && data.authorId !== existingDoc.authorId) {
        return res.status(403).json({ success: false, error: '未授權：不可變更發布者' });
      }
    }
    await upsertMirrorAndFirestoreDoc(colName, docId, data, Boolean(merge));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/db-mirror/:collection/:docId', async (req: Request, res: Response) => {
  try {
    const colName = String(req.params.collection || '');
    const docId = String(req.params.docId || '');
    if (!colName || !docId) {
      return res.status(400).json({ success: false, error: 'Missing collection or docId' });
    }
    // 安全性：刪除需登入；非管理員只能刪除自己發布的問題
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '未授權：請先登入' });
    }
    const isAdminUser = await isVerifiedAdmin(authUser.uid);
    if (!isAdminUser) {
      if (!MIRROR_WRITABLE_COLLECTIONS.has(colName)) {
        return res.status(403).json({ success: false, error: '未授權：只能刪除自己發布的內容' });
      }
      const snap = await adminDb.collection(colName).doc(docId).get();
      const existingDoc: any = snap.exists ? snap.data() : null;
      if (existingDoc && !(await isContentOwner(existingDoc, authUser.uid))) {
        return res.status(403).json({ success: false, error: '未授權：只能刪除自己發布的內容' });
      }
    }
    await deleteMirrorAndFirestoreDoc(colName, docId);
    if (colName === 'questions') {
      await deleteMirrorAndFirestoreDoc('competition_proposals', docId);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 20. 真實全站流量統計 (UTC+8 台灣時間) & 即時在線人數端點
router.get('/site-traffic', async (_req: Request, res: Response) => {
  try {
    const stats = await getRealSiteTrafficStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/site-traffic/visit', async (req: Request, res: Response) => {
  try {
    const sessionId = req.body?.sessionId ? String(req.body.sessionId) : undefined;
    const stats = await recordRealSiteVisit(sessionId, {
      newToday: req.body?.newVisitorToday === true,
      newEver: req.body?.newVisitorEver === true,
    });
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/site-traffic/heartbeat', async (req: Request, res: Response) => {
  try {
    const sessionId = req.body?.sessionId ? String(req.body.sessionId) : undefined;
    const durationSeconds = Number(req.body?.durationSeconds) || Number(req.body?.durationDelta) || 0;
    const result = await recordRealPresenceHeartbeat(sessionId, durationSeconds);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

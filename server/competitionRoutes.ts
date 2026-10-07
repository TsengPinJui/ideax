/**
 * 創星季 (IdeaX 創星季) - Express 後端路由
 * 
 * 端點規範：
 * 1. GET /api/competition/proposals - 取得公開提案列表 (無敏感個資，前20名標記入圍複賽)
 * 2. GET /api/competition/proposals/:id - 取得單一提案詳細資料
 * 3. POST /api/competition/proposals - 提交新提案 (驗證 Auth token，敏感資料隔離儲存)
 * 4. GET /api/competition/account - 取得目前用戶競賽點數錢包 (與舊站真實 balance 完全分開)
 * 5. POST /api/competition/claim-share-bonus - 領取分享推薦碼獎勵 100 點 (防重)
 * 6. POST /api/competition/support - 點數支持/募資 (防自投、單案上限、原子 transaction)
 * 7. POST /api/competition/admin/review-proposal - 管理員審核提案
 * 8. POST /api/competition/admin/confirm-award - 管理員核定最終名次與 NT$1,200 痛點採用獎勵
 * 9. GET /api/competition/admin/ambassadors - 管理員檢視校園大使推薦統計 (NT$800 試算)
 * 10. GET /api/competition/admin/expert-marketing - 管理員檢視專家行銷費用審核 (NT$5,000 + NT$500)
 */

import { Router, Request, Response } from 'express';
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
  adminDb,
} from './competitionService';
import { StarSeasonStage, StarSeasonTrack, COMPETITION_POINTS_CONFIG, DEFAULT_COMPETITION_SCHEDULE } from '../src/types/competition';

const router = Router();

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

    // 查核用戶舊站 role (判斷是否為專家 solver)
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
    const role = (userDoc.exists ? userDoc.data()?.role : 'user') || 'user';

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

// 6. 支持提案 (模擬募資投點，原子 transaction，防自投)
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
    const result = await toggleLikeProposal(authUser.uid, proposalId);
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
    if (!authUser) {
      return res.status(401).json({ success: false, error: '請先登入帳號再進行參賽報名' });
    }

    const data = req.body;
    if (!data.teamName || !data.leaderName || !data.leaderPhone || !data.projectTitle || !data.summary) {
      return res.status(400).json({ success: false, error: '請完整填寫團隊名稱、負責人、提案主題與構想摘要' });
    }

    const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userProfile = {
      name: userData?.name || data.leaderName,
      avatar: userData?.avatar,
      email: authUser.email || data.leaderEmail,
      role: userData?.role || 'user',
    };

    const result = await registerParticipant(authUser.uid, userProfile, data);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 17. 成為專家 / 特邀專家申請 (同步錄入舊站認證專家身分與名單)
router.post('/apply-judge', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuthToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ success: false, error: '請先登入帳號再申請成為專家' });
    }

    const data = req.body;
    if (!data.name || !data.organization || !data.jobTitle || !data.domain || !data.credentialsNote) {
      return res.status(400).json({ success: false, error: '請完整填寫姓名、任職單位、職稱、專業領域與證件或資格證明' });
    }

    const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userProfile = {
      name: data.name || userData?.name,
      avatar: userData?.avatar,
      email: authUser.email || data.email,
    };

    const result = await applyJudge(authUser.uid, userProfile, data);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
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

export default router;

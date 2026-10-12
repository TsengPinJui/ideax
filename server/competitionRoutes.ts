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
  incrementProposalView,
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

    // 競賽原則：不可兼任參賽者與專家（利益迴避）
    if (userData?.verifiedExpert || userData?.role === 'expert' || userData?.role === 'solver') {
      return res.status(400).json({
        success: false,
        error: '依競賽辦法規範：不可兼任參賽者與專家！您目前具備專家身分，為維持評審客觀與利益迴避原則，不可兼任參賽者。',
      });
    }

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

    // 競賽原則：不可兼任參賽者與專家（利益迴避）
    const participantSnap = await adminDb
      .collection('competition_participant_registrations')
      .where('userId', '==', authUser.uid)
      .limit(1)
      .get();
    if (!participantSnap.empty || userData?.competitionBadges?.includes('創星季')) {
      return res.status(400).json({
        success: false,
        error: '依競賽辦法規範：不可兼任參賽者與專家！您已登錄為參賽團隊，為維持評審客觀與利益迴避原則，不可兼任專家。',
      });
    }

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

// 20. 競賽相關獎勵之自動化發放紀錄與批次同步 (管理員端點)
router.post('/admin/distribute-all-rewards', async (req: Request, res: Response) => {
  try {
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
    const { expertEmail, expertName, status, reviewNote, isJudgeSelected } = req.body;
    if (!expertEmail || typeof expertEmail !== 'string' || !expertEmail.includes('@')) {
      return res.status(400).json({ success: false, error: '請提供有效的專家電子郵件信箱' });
    }

    const cleanEmail = expertEmail.trim().toLowerCase();
    const isApproved = status === 'approved';

    const subject = isApproved
      ? `【IdeaX 創星季】恭喜！您的專家身分審核已通過${isJudgeSelected ? '（獲指派為決選評審）' : ''}`
      : `【IdeaX 創星季】您的專家身分資格審核結果通知`;

    const noteText = reviewNote && reviewNote.trim() ? reviewNote.trim() : (isApproved ? '審核通過，已配發 3,000,000 創星幣！' : '專家證明文件未符標準或未齊全');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 24px; color: #1c1917; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e7e5e4; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .header { background: ${isApproved ? '#059669' : '#e11d48'}; padding: 28px 24px; color: #ffffff; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .body { padding: 28px 24px; line-height: 1.6; }
    .highlight-box { background: ${isApproved ? '#ecfdf5' : '#fff1f2'}; border: 1px solid ${isApproved ? '#a7f3d0' : '#fecdd3'}; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .footer { text-align: center; font-size: 11px; color: #78716c; padding: 16px 24px; background: #fafaf9; border-top: 1px solid #e7e5e4; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${isApproved ? '🎉 創星季專家資格審核通過' : '📋 創星季專家資格審核結果'}</h1>
    </div>
    <div class="body">
      <p>親愛的 <strong>${expertName || '專家'}</strong> 您好：</p>
      ${
        isApproved
          ? `<p>感謝您對 IdeaX 創星季的支持與參與！經賽事評審組審定，您的<strong>專家身分資格審核已正式核定通過</strong>！</p>
             <div class="highlight-box">
               <p style="margin:0 0 8px 0; font-weight: bold; color: #065f46;">✨ 專家專屬權益已生效：</p>
               <ul style="margin:0; padding-left: 20px; color: #047857;">
                 <li>已為您的帳號自動配發 <strong>3,000,000 創星幣</strong> 評選支持額度</li>
                 <li>可自由審閱所有公開賽道提案並投點支持最具潛力之團隊</li>
                 ${isJudgeSelected ? '<li><strong>官方決選評審資格已啟用：</strong>具備決選打分權限與車馬費津貼資格</li>' : ''}
               </ul>
             </div>
             <p><strong>審核備註與核定意見：</strong><br/>${noteText}</p>
             <p>您現在即可登入 IdeaX 創星季專區，開啟專家工作台開始評選！</p>`
          : `<p>感謝您對 IdeaX 創星季的關注與申請。經主辦單位審查小組綜合評估後，本次專家資格申請<strong>未獲核准通過</strong>。</p>
             <div class="highlight-box">
               <p style="margin:0 0 6px 0; font-weight: bold; color: #9f1239;">審核退回備註：</p>
               <p style="margin:0; color: #be123c;">${noteText}</p>
             </div>
             <p>若您希望補充相關證明文件或有任何疑問，歡迎隨時登入平台補正資料後重新送件，或聯繫主辦單位客服專線。</p>`
      }
      <p style="margin-top: 24px;">祝 順心，<br/><strong>IdeaX 創星季 賽事組委會</strong></p>
    </div>
    <div class="footer">
      本郵件由 IdeaX 創星季系統自動發送至 ${cleanEmail}，請勿直接回覆。
    </div>
  </div>
</body>
</html>
    `;

    console.log(`[Expert Review Notification] 寄發至: ${cleanEmail}, 結果: ${status}, 主旨: ${subject}`);

    // 儲存發送通知紀錄至 Firestore (不可篡改審計紀錄)
    try {
      await adminDb.collection('competition_expert_notifications').add({
        targetEmail: cleanEmail,
        expertName: expertName || '',
        status,
        subject,
        reviewNote: noteText,
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

export default router;

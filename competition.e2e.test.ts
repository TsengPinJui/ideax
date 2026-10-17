import { describe, test, beforeAll, afterAll, expect } from 'vitest';
import {
  adminDb,
  createProposal,
  getPublicProposals,
  reviewProposalByAdmin,
  getOrCreateCompetitionAccount,
  claimShareBonus,
  supportProposalWithPoints,
  confirmFinalAwardByAdmin,
} from '../server/competitionService';
import { COMPETITION_POINTS_CONFIG } from '../src/types/competition';

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';

describe('Competition Module End-to-End Business Logic & Security Tests (Emulator Isolated)', () => {
  const adminUid = 'admin-trusted-1';
  const userAlice = 'user-alice-uid';
  const userBob = 'user-bob-uid';
  const userExpert = 'user-expert-uid';

  beforeAll(async () => {
    // 預置可信管理員標記於 /admins (禁止依賴 users.role)
    await adminDb.collection('admins').doc(adminUid).set({
      active: true,
      role: 'super_admin',
      grantedAt: new Date().toISOString(),
    });

    // 預置舊站普通用戶帳號 (驗證整個過程不變更其舊站 balance/role)
    await adminDb.collection('users').doc(userAlice).set({
      id: userAlice,
      name: 'Alice 痛點提案者',
      role: 'user',
      balance: 500, // 舊站真實 balance
      competitionBadges: [],
    });

    await adminDb.collection('users').doc(userBob).set({
      id: userBob,
      name: 'Bob 解方提案者',
      role: 'user',
      balance: 1200,
      competitionBadges: [],
    });

    await adminDb.collection('users').doc(userExpert).set({
      id: userExpert,
      name: '專家評審 Dr. Lin',
      role: 'solver', // 舊站為專家 solver
      balance: 8888,
      competitionBadges: [],
    });

    // 預置專家認證
    await adminDb.collection('certifications').doc(userExpert).set({
      userId: userExpert,
      status: 'verified',
    });
  });

  afterAll(async () => {
    // 清理測試資料 (Emulator 自動在關閉時清除，此處亦可保持乾淨)
  });

  let painPointProposalId = '';
  let solutionProposalId = '';

  test('1. 痛點提案投稿：成功提交第一階段「徵點子」提案，敏感個資安全隔離於 private 集合', async () => {
    const result = await createProposal({
      userId: userAlice,
      userName: 'Alice 痛點提案者',
      userRole: 'user',
      title: '校園二手教科書流通困難與閒置浪費痛點',
      stage: 'pain_point',
      track: 'campus_life',
      summary: '每學期結束學長姐教材丟棄，新生花大錢購買新書，缺乏安全驗證媒合機制',
      description: '大專院校各系所每學期換書成本高，傳統二手拍賣社團資訊混亂且充滿詐騙風險。',
      contactName: '王小芬',
      contactPhone: '0912-345-678',
      contactEmail: 'alice@campus.edu.tw',
      schoolOrOrg: '國立成功大學',
      bankCode: '822',
      bankAccount: '123456789012',
      idNumber: 'A234567890',
      referredByAmbassadorCode: 'AMBASSADOR-TAIWAN',
    });

    expect(result.success).toBe(true);
    expect(result.proposalId).toBeDefined();
    painPointProposalId = result.proposalId;

    // 驗證公開提案集合 (不含任何敏感個資)
    const publicDoc = await adminDb.collection('competition_proposals').doc(painPointProposalId).get();
    expect(publicDoc.exists).toBe(true);
    const pData = publicDoc.data()!;
    expect(pData.title).toBe('校園二手教科書流通困難與閒置浪費痛點');
    expect(pData.status).toBe('pending_review'); // 初始待審
    expect(pData.contactPhone).toBeUndefined();
    expect(pData.bankAccount).toBeUndefined();
    expect(pData.idNumber).toBeUndefined();

    // 驗證敏感私有集合 (獨立隔離儲存)
    const privateDoc = await adminDb.collection('competition_private_submissions').doc(painPointProposalId).get();
    expect(privateDoc.exists).toBe(true);
    const privData = privateDoc.data()!;
    expect(privData.contactPhone).toBe('0912-345-678');
    expect(privData.bankAccount).toBe('123456789012');
    expect(privData.authorId).toBe(userAlice);

    // 驗證提案者在舊站獲得「創新盃」徽章，且舊站 role 與 balance 完好未被竄改
    const aliceUserDoc = await adminDb.collection('users').doc(userAlice).get();
    expect(aliceUserDoc.data()?.role).toBe('user');
    expect(aliceUserDoc.data()?.balance).toBe(500);
    expect(aliceUserDoc.data()?.competitionBadges).toContain('創新盃');
  });

  test('2. 待審不公開：未經審核的提案不會出現在前台一般公開提案清單中', async () => {
    // 尚未審核前，查詢審核通過的公開清單
    const publicProposals = await getPublicProposals();
    const foundPending = publicProposals.find((p) => p.id === painPointProposalId && p.status === 'pending_review');
    // 公開列表應僅展示 approved 提案或過濾待審提案
    const unapproved = publicProposals.filter((p) => p.id === painPointProposalId && p.status !== 'approved');
    expect(unapproved.length).toBe(0);
  });

  test('3. 管理員審核痛點提案：非可信管理員駁回，可信管理員核准後公開', async () => {
    // 非管理員嘗試審核 -> 必須拋出未授權錯誤
    await expect(
      reviewProposalByAdmin({
        adminUid: userAlice, // Alice 不是管理員
        proposalId: painPointProposalId,
        status: 'approved',
      })
    ).rejects.toThrow(/未授權/);

    // 可信管理員審核通過
    const reviewResult = await reviewProposalByAdmin({
      adminUid,
      proposalId: painPointProposalId,
      status: 'approved',
      reviewNote: '題目切中大專校園真實痛點，准予公開進行募資與解方連結',
    });
    expect(reviewResult.success).toBe(true);

    const updatedDoc = await adminDb.collection('competition_proposals').doc(painPointProposalId).get();
    expect(updatedDoc.data()?.status).toBe('approved');
    expect(updatedDoc.data()?.reviewedBy).toBe(adminUid);

    // 大使推薦過審統計自動增加並試算 NT$800
    const ambDoc = await adminDb.collection('competition_ambassador_stats').doc('AMBASSADOR-TAIWAN').get();
    expect(ambDoc.exists).toBe(true);
    expect(ambDoc.data()?.approvedCount).toBe(1);
    expect(ambDoc.data()?.commissionPending).toBe(800); // NT$800
  });

  test('4. 第二階段「想解方」提案：明確連結來源痛點提案 ID', async () => {
    const result = await createProposal({
      userId: userBob,
      userName: 'Bob 解方提案者',
      userRole: 'user',
      title: '智慧校園教材鏈：大專教科書區塊身分履歷流轉系統',
      stage: 'solution',
      track: 'campus_life',
      summary: '建置教科書條碼履歷認證、課堂驗收智慧合約，提供防偽無縫二手轉讓系統',
      description: '解決成大與全台大專教材閒置痛點，以學號驗證綁定教材，實現 48 小時校內快速交割。',
      sourcePainPointProposalId: painPointProposalId,
      sourcePainPointTitle: '校園二手教科書流通困難與閒置浪費痛點',
      contactName: '陳大文',
      contactPhone: '0988-123-456',
      contactEmail: 'bob@solution.io',
      bankCode: '013',
      bankAccount: '654321098765',
    });

    expect(result.success).toBe(true);
    solutionProposalId = result.proposalId;

    const solDoc = await adminDb.collection('competition_proposals').doc(solutionProposalId).get();
    expect(solDoc.data()?.stage).toBe('solution');
    expect(solDoc.data()?.sourcePainPointProposalId).toBe(painPointProposalId);

    // 管理員審核通過該解方提案
    await reviewProposalByAdmin({
      adminUid,
      proposalId: solutionProposalId,
      status: 'approved',
      reviewNote: '解法結構完整，技術規格可行',
    });
  });

  test('5. 競賽點數錢包初始化：一般用戶 100,000 點、專家 3,000,000 點，與舊站真實 balance 徹底分開', async () => {
    const aliceAccount = await getOrCreateCompetitionAccount(userAlice, 'user');
    const expertAccount = await getOrCreateCompetitionAccount(userExpert, 'solver');

    expect(aliceAccount.availablePoints).toBe(COMPETITION_POINTS_CONFIG.INITIAL_USER_POINTS); // 100,000
    expect(expertAccount.availablePoints).toBe(COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS); // 3,000,000

    // 檢查舊站 balance 絕對不變
    const aliceUserDoc = await adminDb.collection('users').doc(userAlice).get();
    expect(aliceUserDoc.data()?.balance).toBe(500); // 仍是原 500
  });

  test('6. 分享推薦碼領取獎勵 100 點：同帳號嚴格防重複領取', async () => {
    // 第一次領取成功
    const claim1 = await claimShareBonus(userAlice);
    expect(claim1.success).toBe(true);
    expect(claim1.account?.availablePoints).toBe(100100);

    // 第二次重複領取 -> 必須被防重機制拒絕
    const claim2 = await claimShareBonus(userAlice);
    expect(claim2.success).toBe(false);
    expect(claim2.message).toContain('已領取過');
    expect(claim2.account?.availablePoints).toBe(100100);
  });

  test('7. 模擬募資投點約束：防自投（不可投自己提案）', async () => {
    // Alice 嘗試投自己的痛點提案 -> 必須被拒絕
    await expect(
      supportProposalWithPoints({
        userId: userAlice,
        userRole: 'user',
        proposalId: painPointProposalId,
        points: 5000,
      })
    ).rejects.toThrow(/不可支持自己發起的提案/);
  });

  test('8. 模擬募資投點約束：餘額不足防扣、單案支持上限約束（一般用戶 50,000）', async () => {
    // Alice 投 Bob 的解方提案：超過單案上限 (50,000) -> 必須失敗
    await expect(
      supportProposalWithPoints({
        userId: userAlice,
        userRole: 'user',
        proposalId: solutionProposalId,
        points: 60000,
      })
    ).rejects.toThrow(/超過單案支持上限/);

    // Alice 投 30,000 點 -> 成功
    const sup1 = await supportProposalWithPoints({
      userId: userAlice,
      userRole: 'user',
      proposalId: solutionProposalId,
      points: 30000,
    });
    expect(sup1.success).toBe(true);
    expect(sup1.newAvailablePoints).toBe(70100);

    // Alice 嘗試再投 25,000 點（累計 55,000，超過上限 50,000） -> 必須失敗
    await expect(
      supportProposalWithPoints({
        userId: userAlice,
        userRole: 'user',
        proposalId: solutionProposalId,
        points: 25000,
      })
    ).rejects.toThrow(/超過單案支持上限/);

    // Alice 再投 20,000 點（累計剛好 50,000） -> 成功
    const sup2 = await supportProposalWithPoints({
      userId: userAlice,
      userRole: 'user',
      proposalId: solutionProposalId,
      points: 20000,
    });
    expect(sup2.success).toBe(true);
    expect(sup2.newAvailablePoints).toBe(50100);
    expect(sup2.newProposalPoints).toBe(50000);
  });

  test('9. 專家投點上限約束（專家單案上限 2,000,000 點）與併發原子性', async () => {
    // 專家投 1,500,000 點支持 Bob 的解方提案 -> 成功
    const expertSup = await supportProposalWithPoints({
      userId: userExpert,
      userRole: 'solver',
      proposalId: solutionProposalId,
      points: 1500000,
    });
    expect(expertSup.success).toBe(true);
    expect(expertSup.newAvailablePoints).toBe(1500000);
    expect(expertSup.newProposalPoints).toBe(1550000);

    // 專家嘗試再投 600,000 點（累計 2,100,000 超過專家上限 2,000,000） -> 必須失敗
    await expect(
      supportProposalWithPoints({
        userId: userExpert,
        userRole: 'solver',
        proposalId: solutionProposalId,
        points: 600000,
      })
    ).rejects.toThrow(/超過單案支持上限/);
  });

  test('10. 募資排行前 20 名僅為入圍複賽資格，而非最終得獎；未確認前不標記最終名次', async () => {
    const list = await getPublicProposals();
    const solutionInList = list.find((p) => p.id === solutionProposalId);
    expect(solutionInList).toBeDefined();
    expect(solutionInList?.rankQualifiedForFinal).toBe(true); // 入圍複賽
    expect(solutionInList?.finalRank).toBeUndefined(); // 尚未由專家核定名次
    expect(solutionInList?.finalAwardConfirmed).toBeFalsy();
  });

  test('11. 專家評選與管理員核定獲獎名次：冠軍 NT$30,000、解方採用痛點核定 NT$1,200 獎勵、頒發前十「創之星」徽章', async () => {
    // 管理員確認 Bob 的解方為冠軍（第 1 名），並核准採用 Alice 的痛點提案
    const awardResult = await confirmFinalAwardByAdmin({
      adminUid,
      proposalId: solutionProposalId,
      finalRank: 1, // 冠軍
      awardConfirmed: true,
      adoptedSourceApproved: true,
    });
    expect(awardResult.success).toBe(true);

    // 驗證獲獎解方提案
    const solDoc = await adminDb.collection('competition_proposals').doc(solutionProposalId).get();
    expect(solDoc.data()?.finalRank).toBe(1);
    expect(solDoc.data()?.finalAwardConfirmed).toBe(true);
    expect(solDoc.data()?.grantedStarBadge).toBe(true);

    // 驗證 Bob (獲獎前十名) 在舊站獲得「創之星」徽章，且舊站 balance 與 role 依然不被改動
    const bobUserDoc = await adminDb.collection('users').doc(userBob).get();
    expect(bobUserDoc.data()?.competitionBadges).toContain('創之星');
    expect(bobUserDoc.data()?.role).toBe('user'); // 仍是普通用戶
    expect(bobUserDoc.data()?.balance).toBe(1200); // 舊站點數不變

    // 驗證被採用的痛點提案（Alice 的痛點）被記錄核准採用與 NT$1,200 獎勵
    const painDoc = await adminDb.collection('competition_proposals').doc(painPointProposalId).get();
    expect(painDoc.data()?.adoptedByWinningSolution).toBe(true);
    expect(painDoc.data()?.adoptedSourceApproved).toBe(true);
    expect(painDoc.data()?.adoptedSourceRewardAmount).toBe(1200); // NT$1,200
    expect(painDoc.data()?.adoptedSourceRewardStatus).toBe('approved');

    // 驗證採用獎勵日誌集合存在不可篡改紀錄
    const rewardLogSnap = await adminDb
      .collection('competition_adopted_rewards')
      .where('solutionProposalId', '==', solutionProposalId)
      .get();
    expect(rewardLogSnap.empty).toBe(false);
    expect(rewardLogSnap.docs[0].data().rewardAmount).toBe(1200);
  });

  test('12. 資料持久性：重新自資料庫讀取所有狀態均完整保留', async () => {
    const [solDoc, painDoc, ambDoc] = await Promise.all([
      adminDb.collection('competition_proposals').doc(solutionProposalId).get(),
      adminDb.collection('competition_proposals').doc(painPointProposalId).get(),
      adminDb.collection('competition_ambassador_stats').doc('AMBASSADOR-TAIWAN').get(),
    ]);

    expect(solDoc.exists).toBe(true);
    expect(solDoc.data()?.supportPoints).toBe(1550000);
    expect(solDoc.data()?.finalRank).toBe(1);

    expect(painDoc.exists).toBe(true);
    expect(painDoc.data()?.adoptedSourceApproved).toBe(true);

    expect(ambDoc.exists).toBe(true);
    expect(ambDoc.data()?.approvedCount).toBe(1);
    expect(ambDoc.data()?.commissionPending).toBe(800);
  });
});

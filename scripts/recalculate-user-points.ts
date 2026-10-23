import { adminDb } from '../server/competitionService';

interface UserUpdateSummary {
  id: string;
  name: string;
  email?: string;
  role?: string;
  oldBalance: number;
  newBalance: number;
  painPointsCount: number;
  proposalsOrAppsCount: number;
  isAdmin: boolean;
  isGuest: boolean;
}

export async function recalculateUserPoints(apply: boolean = false) {
  if (!adminDb) {
    console.error('adminDb not initialized');
    process.exit(1);
  }

  // 1. Fetch all questions from Firestore
  const questionsSnap = await adminDb.collection('questions').get();
  console.log(`Fetched ${questionsSnap.size} total questions.`);

  const authorPainPoints: Record<string, number> = {};
  const authorProposalsOrApps: Record<string, number> = {};

  for (const qDoc of questionsSnap.docs) {
    const q = qDoc.data();
    const authorId = q.authorId || '';
    const authorAuthUid = q.authorAuthUid || '';
    const postType = q.postType || '';
    const isSimulated = q.isSimulated || false;

    // Check pain point
    const isPainPoint =
      postType === 'pain_point' ||
      q.category === '日常疑難' ||
      (q.tags && q.tags.includes('痛點')) ||
      q.isPainPoint === true;

    // Check innovation proposal or app
    const isProposalOrApp =
      postType === 'innovation_proposal' ||
      postType === 'vibecoding_app' ||
      q.specialZone === 'vibecoding' ||
      (q.tags && (q.tags.includes('VibeCoding') || q.tags.includes('軟體作品') || q.tags.includes('創新提案')));

    const targetKeys = new Set<string>();
    if (authorId) targetKeys.add(authorId);
    if (authorAuthUid) targetKeys.add(authorAuthUid);

    for (const key of targetKeys) {
      if (isPainPoint) {
        authorPainPoints[key] = (authorPainPoints[key] || 0) + 1;
      }
      if (isProposalOrApp) {
        authorProposalsOrApps[key] = (authorProposalsOrApps[key] || 0) + 1;
      }
    }
  }

  // 2. Fetch all users from Firestore
  const usersSnap = await adminDb.collection('users').get();
  console.log(`Fetched ${usersSnap.size} total users from Firestore.`);

  const summaries: UserUpdateSummary[] = [];
  const batch = adminDb.batch();
  let updatedCount = 0;
  let skippedAdminsCount = 0;
  let skippedGuestsCount = 0;

  for (const uDoc of usersSnap.docs) {
    const u = uDoc.data();
    const id = uDoc.id;
    const authUid = u.authUid || '';

    // Check if guest
    const isGuest = id === 'user-guest' || id === 'guest';
    if (isGuest) {
      skippedGuestsCount++;
      continue;
    }

    // Check if admin (管理員除外，保留不歸零)
    const isAdmin =
      u.role === 'admin' ||
      u.accountType === 'admin' ||
      u.isOfficial === true ||
      u.memberId === 'a000000001' ||
      id === 'a000000001' ||
      id === 'user-admin' ||
      u.email === 'john25893619@gmail.com' ||
      id === 'ZRXZWS8iiPg91CUV6vQrehK6ZW62' ||
      (u.name && (u.name.includes('管理團隊') || u.name.includes('系統管理')));

    const oldBalance = Number(u.balance) || 0;

    if (isAdmin) {
      skippedAdminsCount++;
      summaries.push({
        id,
        name: u.name || '',
        email: u.email,
        role: u.role,
        oldBalance,
        newBalance: oldBalance,
        painPointsCount: 0,
        proposalsOrAppsCount: 0,
        isAdmin: true,
        isGuest: false,
      });
      continue;
    }

    // Calculate count of pain points & proposals/apps for this user
    const painCount = (authorPainPoints[id] || 0) + (authUid && authUid !== id ? (authorPainPoints[authUid] || 0) : 0);
    const proposalCount = (authorProposalsOrApps[id] || 0) + (authUid && authUid !== id ? (authorProposalsOrApps[authUid] || 0) : 0);

    // Rule:
    // 成功註冊：+100
    // 發布痛點：+100
    // 發布創新提案或刊登作品：+200
    const newBalance = 100 + (painCount * 100) + (proposalCount * 200);

    summaries.push({
      id,
      name: u.name || '',
      email: u.email,
      role: u.role,
      oldBalance,
      newBalance,
      painPointsCount: painCount,
      proposalsOrAppsCount: proposalCount,
      isAdmin: false,
      isGuest: false,
    });

    if (apply) {
      batch.update(uDoc.ref, {
        balance: newBalance,
        pointsRecalculatedAt: new Date().toISOString(),
        pointsRecalculatedReason: '系統規則點數重算：成功註冊+100、發布痛點+100、發布提案或作品+200',
      });
      updatedCount++;
    }
  }

  if (apply) {
    await batch.commit();
    console.log(`\n🎉 成功更新 ${updatedCount} 位真實用戶點數資料！`);
  } else {
    console.log(`\n[DRY RUN 模擬預覽] 未寫入資料庫。若要執行寫入請傳入 apply = true`);
  }

  console.log(`\n統計摘要：`);
  console.log(`- 總計用戶文件：${usersSnap.size}`);
  console.log(`- 略過管理員（保留點數）：${skippedAdminsCount}`);
  console.log(`- 略過訪客：${skippedGuestsCount}`);
  console.log(`- 需重算更新之真實用戶：${summaries.filter((s) => !s.isAdmin).length}`);

  console.log(`\n部分更新清單預覽（前 20 筆）：`);
  console.table(
    summaries.filter((s) => !s.isAdmin).slice(0, 20).map((s) => ({
      用戶ID: s.id.slice(0, 14),
      用戶姓名: s.name,
      原點數: s.oldBalance,
      新點數: s.newBalance,
      痛點數: s.painPointsCount,
      提案與作品數: s.proposalsOrAppsCount,
    }))
  );
}

// 支援直接執行
const applyFlag = process.argv.includes('--apply');
recalculateUserPoints(applyFlag).catch((e) => {
  console.error('Recalculation error:', e);
  process.exit(1);
});

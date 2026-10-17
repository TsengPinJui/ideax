import { describe, test, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = 'ideax-test-project';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';
const [host, portStr] = EMULATOR_HOST.split(':');
const port = parseInt(portStr || '8085', 10);

describe('Hardened DRAFT Firestore Rules: Positive & Negative Tests', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'DRAFT_firestore.rules'), 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host,
        port,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // =========================================================================
  // 1. 舊站回歸相容與權限邊界測試
  // =========================================================================

  test('舊站相容：未登入訪客可公開讀取 questions 與 answers', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('questions').doc('q-demo-1').set({
        title: '公開提問',
        authorId: 'author-1',
      });
      await context.firestore().collection('answers').doc('ans-demo-1').set({
        content: '公開解答',
        solverId: 'solver-1',
      });
    });

    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(unauthDb.collection('questions').doc('q-demo-1').get());
    await assertSucceeds(unauthDb.collection('answers').doc('ans-demo-1').get());
  });

  test('舊站相容：登入用戶可發布提問與回答', async () => {
    const userDb = testEnv.authenticatedContext('user-alice').firestore();
    await assertSucceeds(
      userDb.collection('questions').doc('q-new-1').set({
        authorId: 'user-alice',
        title: '測試提問',
        bounty: 500,
        createdAt: new Date().toISOString(),
      })
    );

    await assertSucceeds(
      userDb.collection('answers').doc('ans-new-1').set({
        solverId: 'user-alice',
        questionId: 'q-new-1',
        content: '測試解答內容',
        createdAt: new Date().toISOString(),
      })
    );
  });

  test('舊站防護：一般用戶不可自行將 role 更改提升為 admin 或竄改 balance', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('user-alice').set({
        id: 'user-alice',
        role: 'user',
        balance: 1000,
        name: 'Alice',
      });
    });

    const userDb = testEnv.authenticatedContext('user-alice').firestore();
    // 嘗試提權 -> 必須失敗
    await assertFails(
      userDb.collection('users').doc('user-alice').update({
        role: 'admin',
      })
    );
    // 嘗試自我增減真實 balance -> 必須失敗
    await assertFails(
      userDb.collection('users').doc('user-alice').update({
        balance: 999999,
      })
    );
  });

  test('舊站防護：使用者不可直接寫入 /admins 集合自我授權', async () => {
    const userDb = testEnv.authenticatedContext('user-alice').firestore();
    await assertFails(
      userDb.collection('admins').doc('user-alice').set({
        admin: true,
      })
    );
  });

  test('舊站防護：非相關方用戶無法窺看他人交易紀錄 transactions', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('transactions').doc('tx-secret-1').set({
        fromUserId: 'user-alice',
        toUserId: 'user-bob',
        amount: 5000,
      });
    });

    const charlieDb = testEnv.authenticatedContext('user-charlie').firestore();
    await assertFails(charlieDb.collection('transactions').doc('tx-secret-1').get());

    // 交易參與方 Alice 可讀取
    const aliceDb = testEnv.authenticatedContext('user-alice').firestore();
    await assertSucceeds(aliceDb.collection('transactions').doc('tx-secret-1').get());
  });

  test('舊站防護：用戶端禁止直接建立 transactions（需經後端）', async () => {
    const aliceDb = testEnv.authenticatedContext('user-alice').firestore();
    await assertFails(
      aliceDb.collection('transactions').doc('tx-fake-1').set({
        fromUserId: 'user-alice',
        toUserId: 'user-bob',
        amount: 99999,
      })
    );
  });

  // =========================================================================
  // 2. 創星季 (IdeaX 創星季) 權限與安全隔離測試 (正向與負向)
  // =========================================================================

  test('負向防護：客戶端禁止直接 create / update / delete competition_proposals', async () => {
    const aliceDb = testEnv.authenticatedContext('user-alice').firestore();
    // 嘗試直接透過瀏覽器發布提案 -> 必須被規則拒絕 (一律強制經由可信後端)
    await assertFails(
      aliceDb.collection('competition_proposals').doc('star-fake-1').set({
        title: '前端直接寫入之惡意提案',
        authorId: 'user-alice',
        status: 'approved',
        supportPoints: 9999999,
      })
    );
  });

  test('公開性與待審不公開：僅通過審核之提案對所有人公開，待審提案非作者不可讀', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      // 1. 已審核通過提案
      await context.firestore().collection('competition_proposals').doc('star-approved').set({
        title: '已通過審核痛點提案',
        authorId: 'user-alice',
        status: 'approved',
        supportPoints: 10000,
      });
      // 2. 待審核提案 (pending_review)
      await context.firestore().collection('competition_proposals').doc('star-pending').set({
        title: '待審核中痛點提案',
        authorId: 'user-alice',
        status: 'pending_review',
        supportPoints: 0,
      });
    });

    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const bobDb = testEnv.authenticatedContext('user-bob').firestore();
    const aliceDb = testEnv.authenticatedContext('user-alice').firestore();

    // 通過審核：所有人均可讀
    await assertSucceeds(unauthDb.collection('competition_proposals').doc('star-approved').get());
    await assertSucceeds(bobDb.collection('competition_proposals').doc('star-approved').get());

    // 待審核：訪客與路人 Bob 均不可讀 (待審不公開)
    await assertFails(unauthDb.collection('competition_proposals').doc('star-pending').get());
    await assertFails(bobDb.collection('competition_proposals').doc('star-pending').get());

    // 待審核：提案作者 Alice 本人可查閱
    await assertSucceeds(aliceDb.collection('competition_proposals').doc('star-pending').get());
  });

  test('極度敏感個資隔離：非作者與非管理員絕不可讀取 competition_private_submissions，且禁止客戶端直接寫入', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('competition_private_submissions').doc('star-1').set({
        authorId: 'user-alice',
        contactPhone: '0912-345-678',
        bankAccount: '822-000123456789',
        idNumber: 'A123456789',
      });
    });

    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const bobDb = testEnv.authenticatedContext('user-bob').firestore();
    const aliceDb = testEnv.authenticatedContext('user-alice').firestore();

    // 訪客讀取 -> 拒絕
    await assertFails(unauthDb.collection('competition_private_submissions').doc('star-1').get());
    // 他人 Bob 讀取 -> 拒絕
    await assertFails(bobDb.collection('competition_private_submissions').doc('star-1').get());
    // 作者 Alice 本人讀取 -> 允許
    await assertSucceeds(aliceDb.collection('competition_private_submissions').doc('star-1').get());

    // 客戶端直接寫入敏感資料 -> 拒絕 (必須走後端)
    await assertFails(
      aliceDb.collection('competition_private_submissions').doc('star-2').set({
        authorId: 'user-alice',
        contactPhone: '0900-000-000',
      })
    );
  });

  test('點數隔離與防竄改：客戶端禁止直接寫入 competition_accounts，且不得讀取他人錢包', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('competition_accounts').doc('user-alice').set({
        userId: 'user-alice',
        availablePoints: 100000,
        spentPoints: 0,
      });
    });

    const bobDb = testEnv.authenticatedContext('user-bob').firestore();
    const aliceDb = testEnv.authenticatedContext('user-alice').firestore();

    // Bob 嘗試讀取 Alice 的競賽點數錢包 -> 拒絕
    await assertFails(bobDb.collection('competition_accounts').doc('user-alice').get());

    // Alice 讀取自己的競賽點數錢包 -> 允許
    await assertSucceeds(aliceDb.collection('competition_accounts').doc('user-alice').get());

    // Alice 嘗試直接透過客戶端增減自己的點數 -> 必須被拒絕 (防直接注入)
    await assertFails(
      aliceDb.collection('competition_accounts').doc('user-alice').update({
        availablePoints: 99999999,
      })
    );
  });

  test('支持紀錄與審計日誌：禁止用戶端直接新增 competition_support_records 或 competition_audit_logs', async () => {
    const aliceDb = testEnv.authenticatedContext('user-alice').firestore();

    // 嘗試直接偽造支持紀錄
    await assertFails(
      aliceDb.collection('competition_support_records').doc('sup-fake-1').set({
        supporterId: 'user-alice',
        points: 50000,
        proposalId: 'star-1',
      })
    );

    // 嘗試直接寫入審計日誌
    await assertFails(
      aliceDb.collection('competition_audit_logs').doc('log-fake-1').set({
        action: 'FORGE_AUDIT',
      })
    );
  });

  test('管理員可信驗證：需在 /admins 存在方能執行管理操作', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      // 僅在 /admins 建立可信標記
      await context.firestore().collection('admins').doc('admin-super').set({
        active: true,
      });
      // 待審提案
      await context.firestore().collection('competition_proposals').doc('star-pending-2').set({
        title: '待審提案2',
        authorId: 'user-charlie',
        status: 'pending_review',
      });
    });

    const adminDb = testEnv.authenticatedContext('admin-super').firestore();
    // 管理員可讀取待審提案
    await assertSucceeds(adminDb.collection('competition_proposals').doc('star-pending-2').get());

    // 純在 users.role 標記 admin 者，無法繞過 /admins 檢查
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('fake-admin').set({
        role: 'admin',
      });
    });
    const fakeAdminDb = testEnv.authenticatedContext('fake-admin').firestore();
    await assertFails(fakeAdminDb.collection('competition_proposals').doc('star-pending-2').get());
  });

  test('全域防線：未聲明之未知集合一律拒絕 (Default Deny)', async () => {
    const aliceDb = testEnv.authenticatedContext('user-alice').firestore();
    await assertFails(aliceDb.collection('unknown_hack_backdoor').doc('leak').get());
    await assertFails(aliceDb.collection('unknown_hack_backdoor').doc('leak').set({ bad: true }));
  });
});

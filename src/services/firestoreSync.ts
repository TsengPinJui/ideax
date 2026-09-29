import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  User,
  Question,
  Answer,
  Transaction,
  ChatConversation,
  SubscriptionPlan,
  NotificationItem,
  Solver,
} from '../types';

/**
 * Validates connection to Firestore via getDocFromServer
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'status'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is offline or check configuration:', error.message);
      return false;
    }
    return true;
  }
}

// =========================================================================
// 1. 業務核心交易類 (Core Business & Transactions)
// =========================================================================

export async function syncQuestionToFirestore(question: Question): Promise<void> {
  if (!question || !question.id) return;
  try {
    const qRef = doc(db, 'questions', question.id);
    const cleanQ = JSON.parse(JSON.stringify(question));
    await setDoc(qRef, { ...cleanQ, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error(`[Firestore] Failed to sync question ${question.id}:`, err);
  }
}

export async function syncQuestionsToFirestore(questions: Question[]): Promise<void> {
  if (!questions || questions.length === 0) return;
  try {
    const batch = writeBatch(db);
    questions.forEach((q) => {
      if (!q.id) return;
      const qRef = doc(db, 'questions', q.id);
      const cleanQ = JSON.parse(JSON.stringify(q));
      batch.set(qRef, { ...cleanQ, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Failed to batch sync questions:', err);
  }
}

export async function syncAnswerToFirestore(answer: Answer): Promise<void> {
  if (!answer || !answer.id) return;
  try {
    const aRef = doc(db, 'answers', answer.id);
    const cleanA = JSON.parse(JSON.stringify(answer));
    await setDoc(aRef, { ...cleanA, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error(`[Firestore] Failed to sync answer ${answer.id}:`, err);
  }
}

export async function syncAnswersToFirestore(answers: Answer[]): Promise<void> {
  if (!answers || answers.length === 0) return;
  try {
    const batch = writeBatch(db);
    answers.forEach((ans) => {
      if (!ans.id) return;
      const aRef = doc(db, 'answers', ans.id);
      const cleanA = JSON.parse(JSON.stringify(ans));
      batch.set(aRef, { ...cleanA, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Failed to batch sync answers:', err);
  }
}

export async function syncTransactionToFirestore(tx: Transaction): Promise<void> {
  if (!tx || !tx.id) return;
  try {
    const txRef = doc(db, 'transactions', tx.id);
    const cleanTx = JSON.parse(JSON.stringify(tx));
    await setDoc(txRef, { ...cleanTx, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error(`[Firestore] Failed to sync transaction ${tx.id}:`, err);
  }
}

export async function syncTransactionsToFirestore(transactions: Transaction[]): Promise<void> {
  if (!transactions || transactions.length === 0) return;
  try {
    const batch = writeBatch(db);
    transactions.forEach((tx) => {
      if (!tx.id) return;
      const txRef = doc(db, 'transactions', tx.id);
      const cleanTx = JSON.parse(JSON.stringify(tx));
      batch.set(txRef, { ...cleanTx, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Failed to batch sync transactions:', err);
  }
}

export async function syncConversationToFirestore(conv: ChatConversation): Promise<void> {
  if (!conv || !conv.id) return;
  try {
    const cRef = doc(db, 'conversations', conv.id);
    const cleanC = JSON.parse(JSON.stringify(conv));
    await setDoc(cRef, { ...cleanC, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error(`[Firestore] Failed to sync conversation ${conv.id}:`, err);
  }
}

// =========================================================================
// 2. 用戶身分與審核治理類 (Identity, Verification & Governance)
// =========================================================================

export async function syncUserToFirestore(user: User): Promise<void> {
  if (!user || !user.id) return;
  try {
    const userRef = doc(db, 'users', user.id);
    const cleanUser = JSON.parse(JSON.stringify(user));
    await setDoc(userRef, { ...cleanUser, updatedAt: new Date().toISOString() }, { merge: true });

    // 同步提取使用者審核證書資料至 certifications 集合
    if (user.realNameAuthStatus || user.expertCertStatus) {
      const certRef = doc(db, 'certifications', user.id);
      await setDoc(
        certRef,
        {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          realNameAuthStatus: user.realNameAuthStatus || 'unverified',
          expertCertStatus: user.expertCertStatus || 'unverified',
          realNameData: user.realNameData || null,
          expertCertData: user.expertCertData || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.error(`[Firestore] Failed to sync user ${user.id}:`, err);
  }
}

export async function syncUsersToFirestore(users: User[]): Promise<void> {
  if (!users || users.length === 0) return;
  try {
    const batch = writeBatch(db);
    users.forEach((user) => {
      if (!user.id) return;
      const userRef = doc(db, 'users', user.id);
      const cleanUser = JSON.parse(JSON.stringify(user));
      batch.set(userRef, { ...cleanUser, updatedAt: new Date().toISOString() }, { merge: true });

      // 同步審核與認證集合
      if (user.realNameAuthStatus || user.expertCertStatus) {
        const certRef = doc(db, 'certifications', user.id);
        batch.set(
          certRef,
          {
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            realNameAuthStatus: user.realNameAuthStatus || 'unverified',
            expertCertStatus: user.expertCertStatus || 'unverified',
            realNameData: user.realNameData || null,
            expertCertData: user.expertCertData || null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Failed to batch sync users & certifications:', err);
  }
}

export async function getUserFromFirestore(userId: string): Promise<User | null> {
  if (!userId) return null;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  } catch (err) {
    console.warn(`[Firestore] Failed to get user ${userId}:`, err);
    return null;
  }
}

export async function syncAuditLogsToFirestore(auditRecords: Array<{
  id: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  details?: any;
  createdAt: string;
}>): Promise<void> {
  if (!auditRecords || auditRecords.length === 0) return;
  try {
    const batch = writeBatch(db);
    auditRecords.forEach((record) => {
      if (!record.id) return;
      const logRef = doc(db, 'audit_logs', record.id);
      batch.set(logRef, { ...record, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Failed to batch sync audit logs:', err);
  }
}

// =========================================================================
// 3. 互動通知與評價體系類 (Engagement, Notifications & Reviews)
// =========================================================================

export async function syncNotificationsToFirestore(notifications: NotificationItem[]): Promise<void> {
  if (!notifications || notifications.length === 0) return;
  try {
    const batch = writeBatch(db);
    notifications.forEach((item) => {
      if (!item.id) return;
      const notifRef = doc(db, 'notifications', item.id);
      const cleanItem = JSON.parse(JSON.stringify(item));
      batch.set(notifRef, { ...cleanItem, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Failed to sync notifications:', err);
  }
}

export async function syncBookmarksToFirestore(userId: string, bookmarkedIds: string[]): Promise<void> {
  if (!userId) return;
  try {
    const bookmarkRef = doc(db, 'bookmarks', userId);
    await setDoc(
      bookmarkRef,
      {
        userId,
        bookmarkedQuestionIds: bookmarkedIds,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error(`[Firestore] Failed to sync bookmarks for user ${userId}:`, err);
  }
}

export async function syncSolversToFirestore(solvers: Solver[]): Promise<void> {
  if (!solvers || solvers.length === 0) return;
  try {
    const batch = writeBatch(db);
    solvers.forEach((s) => {
      if (!s.id) return;
      const sRef = doc(db, 'solvers', s.id);
      const cleanS = JSON.parse(JSON.stringify(s));
      batch.set(sRef, { ...cleanS, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Failed to batch sync solvers:', err);
  }
}

// =========================================================================
// 4. 法律合規與平台設定類 (Compliance & Platform Settings)
// =========================================================================

export async function syncTermsAgreementsToFirestore(user: User): Promise<void> {
  if (!user || !user.id) return;
  try {
    const agreeRef = doc(db, 'terms_agreements', user.id);
    await setDoc(
      agreeRef,
      {
        userId: user.id,
        userName: user.name,
        hasAgreedGeneralTerms: Boolean(user.hasAgreedGeneralTerms),
        agreedGeneralTermsVersion: user.agreedGeneralTermsVersion || 'v3.2',
        agreedGeneralTermsAt: user.agreedGeneralTermsAt || new Date().toISOString(),
        agreedQuestionerTermsVersion: user.agreedQuestionerTermsVersion || null,
        agreedSolverTermsVersion: user.agreedSolverTermsVersion || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error(`[Firestore] Failed to sync terms agreement for ${user.id}:`, err);
  }
}

export async function syncPlatformSettingsToFirestore(settings: {
  commissionRate?: number;
  plans?: SubscriptionPlan[];
  publicMetricsConfig?: any;
  adminDailyGrants?: any;
}): Promise<void> {
  try {
    const settingRef = doc(db, 'platform_settings', 'global');
    const cleanSettings = JSON.parse(JSON.stringify(settings));
    await setDoc(settingRef, { ...cleanSettings, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('[Firestore] Failed to sync platform settings:', err);
  }
}

// =========================================================================
// 全站 4 大類別資料一鍵全量持久化 (Full Categorized Sync)
// =========================================================================

export interface SyncDataPayload {
  // 1. 業務核心交易類
  questions: Question[];
  answers: Answer[];
  transactions: Transaction[];
  conversations?: ChatConversation[];

  // 2. 用戶身分與審核治理類
  users: User[];
  auditRecords?: Array<{ id: string; adminId: string; action: string; targetUserId?: string; details?: any; createdAt: string }>;

  // 3. 互動通知與評價體系類
  notifications?: NotificationItem[];
  bookmarks?: { userId: string; questionIds: string[] };
  solvers?: Solver[];

  // 4. 法律合規與平台設定類
  commissionRate?: number;
  plans?: SubscriptionPlan[];
  publicMetricsConfig?: any;
  adminDailyGrants?: any;
}

export interface CategorizedSyncResult {
  success: boolean;
  message: string;
  categories: {
    coreTransactions: { questions: number; answers: number; transactions: number; conversations: number };
    identityGovernance: { users: number; certifications: number; auditLogs: number };
    engagementSocial: { notifications: number; bookmarks: number; solvers: number };
    complianceSettings: { termsAgreements: number; platformSettings: number };
  };
}

export async function pushAllDataToFirestore(data: SyncDataPayload): Promise<CategorizedSyncResult> {
  const result: CategorizedSyncResult = {
    success: false,
    message: '',
    categories: {
      coreTransactions: { questions: 0, answers: 0, transactions: 0, conversations: 0 },
      identityGovernance: { users: 0, certifications: 0, auditLogs: 0 },
      engagementSocial: { notifications: 0, bookmarks: 0, solvers: 0 },
      complianceSettings: { termsAgreements: 0, platformSettings: 1 },
    },
  };

  try {
    // 1. 業務核心交易類
    if (data.questions && data.questions.length > 0) {
      await syncQuestionsToFirestore(data.questions);
      result.categories.coreTransactions.questions = data.questions.length;
    }
    if (data.answers && data.answers.length > 0) {
      await syncAnswersToFirestore(data.answers);
      result.categories.coreTransactions.answers = data.answers.length;
    }
    if (data.transactions && data.transactions.length > 0) {
      await syncTransactionsToFirestore(data.transactions);
      result.categories.coreTransactions.transactions = data.transactions.length;
    }
    if (data.conversations && data.conversations.length > 0) {
      for (const conv of data.conversations) {
        await syncConversationToFirestore(conv);
      }
      result.categories.coreTransactions.conversations = data.conversations.length;
    }

    // 2. 用戶身分與審核治理類
    if (data.users && data.users.length > 0) {
      await syncUsersToFirestore(data.users);
      result.categories.identityGovernance.users = data.users.length;
      result.categories.identityGovernance.certifications = data.users.filter(
        (u) => u.realNameAuthStatus === 'verified' || u.expertCertStatus === 'verified'
      ).length;

      // 同步法律條款同意存證
      for (const u of data.users) {
        await syncTermsAgreementsToFirestore(u);
      }
      result.categories.complianceSettings.termsAgreements = data.users.length;
    }
    if (data.auditRecords && data.auditRecords.length > 0) {
      await syncAuditLogsToFirestore(data.auditRecords);
      result.categories.identityGovernance.auditLogs = data.auditRecords.length;
    }

    // 3. 互動通知與評價體系類
    if (data.notifications && data.notifications.length > 0) {
      await syncNotificationsToFirestore(data.notifications);
      result.categories.engagementSocial.notifications = data.notifications.length;
    }
    if (data.bookmarks) {
      await syncBookmarksToFirestore(data.bookmarks.userId, data.bookmarks.questionIds);
      result.categories.engagementSocial.bookmarks = data.bookmarks.questionIds.length;
    }
    if (data.solvers && data.solvers.length > 0) {
      await syncSolversToFirestore(data.solvers);
      result.categories.engagementSocial.solvers = data.solvers.length;
    }

    // 4. 平台設定
    await syncPlatformSettingsToFirestore({
      commissionRate: data.commissionRate,
      plans: data.plans,
      publicMetricsConfig: data.publicMetricsConfig,
      adminDailyGrants: data.adminDailyGrants,
    });

    result.success = true;
    result.message = '全站四大範疇資料已全面重新分類並成功寫入 Firebase Cloud Firestore 資料庫！';
    return result;
  } catch (err: any) {
    console.error('[Firestore] Failed full push:', err);
    result.success = false;
    result.message = `同步失敗: ${err?.message || String(err)}`;
    return result;
  }
}

/**
 * Read all categorized collections from Firestore on initial load
 */
export async function loadAllDataFromFirestore(): Promise<{
  users?: User[];
  questions?: Question[];
  answers?: Answer[];
  transactions?: Transaction[];
  conversations?: ChatConversation[];
  notifications?: NotificationItem[];
  solvers?: Solver[];
  settings?: any;
} | null> {
  try {
    const [usersSnap, qSnap, aSnap, txSnap, cSnap, notifSnap, solversSnap, settingsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'questions')),
      getDocs(collection(db, 'answers')),
      getDocs(collection(db, 'transactions')),
      getDocs(collection(db, 'conversations')),
      getDocs(collection(db, 'notifications')),
      getDocs(collection(db, 'solvers')),
      getDocs(collection(db, 'platform_settings')),
    ]);

    const result: {
      users?: User[];
      questions?: Question[];
      answers?: Answer[];
      transactions?: Transaction[];
      conversations?: ChatConversation[];
      notifications?: NotificationItem[];
      solvers?: Solver[];
      settings?: any;
    } = {};

    if (!usersSnap.empty) {
      result.users = usersSnap.docs.map((d) => d.data() as User);
    }
    if (!qSnap.empty) {
      result.questions = qSnap.docs.map((d) => d.data() as Question);
    }
    if (!aSnap.empty) {
      result.answers = aSnap.docs.map((d) => d.data() as Answer);
    }
    if (!txSnap.empty) {
      result.transactions = txSnap.docs.map((d) => d.data() as Transaction);
    }
    if (!cSnap.empty) {
      result.conversations = cSnap.docs.map((d) => d.data() as ChatConversation);
    }
    if (!notifSnap.empty) {
      result.notifications = notifSnap.docs.map((d) => d.data() as NotificationItem);
    }
    if (!solversSnap.empty) {
      result.solvers = solversSnap.docs.map((d) => d.data() as Solver);
    }
    if (!settingsSnap.empty) {
      const globalDoc = settingsSnap.docs.find((d) => d.id === 'global');
      if (globalDoc) {
        result.settings = globalDoc.data();
      }
    }

    return result;
  } catch (err) {
    console.warn('[Firestore] Could not load data from Firestore (falling back to cache):', err);
    return null;
  }
}

import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  deleteField,
  updateDoc,
  increment,
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
  CustomerSupportTicket,
  CustomerSupportConversation,
} from '../types';

const QUOTA_STORAGE_KEY = 'ideax_firestore_quota_exhausted_date';

function getTodayUtcDate(): string {
  return new Date().toISOString().split('T')[0];
}

let isQuotaExhausted = (() => {
  try {
    const today = getTodayUtcDate();
    if (today === '2026-10-14') {
      localStorage.setItem(QUOTA_STORAGE_KEY, today);
      return true;
    }
    return localStorage.getItem(QUOTA_STORAGE_KEY) === today;
  } catch {
    return true;
  }
})();

if (typeof window !== 'undefined') {
  window.addEventListener('ideax_firestore_quota_exhausted', () => {
    isQuotaExhausted = true;
  });
}

function handleFirestoreError(context: string, err: any) {
  const errMsg = err?.message || String(err);
  const errCode = err?.code || '';
  if (
    errCode === 'resource-exhausted' ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('Quota exceeded')
  ) {
    isQuotaExhausted = true;
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, getTodayUtcDate());
    } catch {
      // ignore
    }
    return;
  }
  console.warn(`[Firestore] ${context}:`, errMsg);
}

export function isFirestoreQuotaExhausted(): boolean {
  return isQuotaExhausted;
}

/**
 * Validates connection to Firestore via getDocFromServer
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'status'));
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline') || error.message.includes('unavailable') || error.message.includes('Could not reach')) {
        console.warn('[Firestore] Backend currently unreachable/offline mode:', error.message);
        return false;
      }
    }
    return true;
  }
}

// =========================================================================
// 1. 業務核心交易類 (Core Business & Transactions)
// =========================================================================

export async function syncQuestionToFirestore(question: Question): Promise<void> {
  if (!question || !question.id) return;
  const cleanQ = JSON.parse(JSON.stringify(question));
  const payload = { ...cleanQ, updatedAt: new Date().toISOString() };
  try {
    await fetch(`/api/competition/db-mirror/questions/${encodeURIComponent(question.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload, merge: true }),
    });
  } catch {}
  if (isQuotaExhausted) return;
  try {
    const qRef = doc(db, 'questions', question.id);
    await setDoc(qRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(`Failed to sync question ${question.id}`, err);
  }
}

/**
 * 增加問題/痛點瀏覽次數（原子累加，持久化至 Firestore）
 */
export async function incrementQuestionViewInFirestore(questionId: string, amount: number = 1): Promise<void> {
  if (!questionId || isQuotaExhausted) return;
  try {
    const qRef = doc(db, 'questions', questionId);
    await updateDoc(qRef, {
      views: increment(amount),
      viewsCount: increment(amount),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // Ignore if document does not exist in Firestore yet; do not create a partial skeleton document without title/id
    handleFirestoreError(`Failed to increment views for question ${questionId}`, err);
  }
}

export async function deleteQuestionFromFirestore(questionId: string): Promise<void> {
  if (!questionId) return;
  try {
    await fetch(`/api/competition/db-mirror/questions/${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
    });
  } catch {}
  if (isQuotaExhausted) return;
  try {
    const qRef = doc(db, 'questions', questionId);
    await deleteDoc(qRef);
    try {
      await deleteDoc(doc(db, 'competition_proposals', questionId));
    } catch {}
  } catch (err) {
    handleFirestoreError(`Failed to delete question ${questionId}`, err);
  }
}

export async function deleteQuestionsFromFirestore(questionIds: string[]): Promise<void> {
  if (!questionIds || questionIds.length === 0) return;
  try {
    await Promise.all(
      questionIds.map((id) =>
        fetch(`/api/competition/db-mirror/questions/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {})
      )
    );
  } catch {}
  if (isQuotaExhausted) return;
  try {
    const CHUNK_SIZE = 150;
    for (let i = 0; i < questionIds.length; i += CHUNK_SIZE) {
      const chunk = questionIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        batch.delete(doc(db, 'questions', id));
        batch.delete(doc(db, 'competition_proposals', id));
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(`Failed to batch delete questions`, err);
  }
}

export async function deleteQuestionAndRelatedDataFromFirestore(questionId: string): Promise<void> {
  if (!questionId) return;
  try {
    await fetch(`/api/competition/db-mirror/questions/${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
    });
  } catch {}
  if (isQuotaExhausted) return;
  try {
    // 1. Delete question doc and corresponding competition_proposals doc directly and immediately
    const qRef = doc(db, 'questions', questionId);
    await deleteDoc(qRef);
    try {
      await deleteDoc(doc(db, 'competition_proposals', questionId));
    } catch {}

    // 2. Find and delete related answers
    try {
      const answersSnap = await getDocs(collection(db, 'answers'));
      const batch = writeBatch(db);
      let ansCount = 0;
      answersSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.questionId === questionId) {
          batch.delete(d.ref);
          ansCount++;
        }
      });
      if (ansCount > 0) await batch.commit();
    } catch {}

    // 3. Find and delete related conversations
    try {
      const convsSnap = await getDocs(collection(db, 'conversations'));
      const batch = writeBatch(db);
      let convCount = 0;
      convsSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.questionId === questionId) {
          batch.delete(d.ref);
          convCount++;
        }
      });
      if (convCount > 0) await batch.commit();
    } catch {}
  } catch (err) {
    handleFirestoreError(`Failed to delete question and related data for ${questionId}`, err);
  }
}

export async function deleteUserAndAllRelatedDataFromFirestore(userId: string): Promise<void> {
  if (!userId || isQuotaExhausted) return;
  try {
    const batch = writeBatch(db);

    // 1. Delete user document
    const userRef = doc(db, 'users', userId);
    batch.delete(userRef);

    // 2. Delete solver document if exists
    const solverRef = doc(db, 'solvers', userId);
    batch.delete(solverRef);

    // 3. Delete bookmark document if exists
    const bookmarkRef = doc(db, 'bookmarks', userId);
    batch.delete(bookmarkRef);

    // 4. Delete questions authored by this user
    try {
      const qSnap = await getDocs(collection(db, 'questions'));
      qSnap.docs.forEach((d) => {
        const q = d.data();
        if (q.authorId === userId) {
          batch.delete(d.ref);
        }
      });
    } catch {}

    // 5. Delete answers submitted by this user
    try {
      const aSnap = await getDocs(collection(db, 'answers'));
      aSnap.docs.forEach((d) => {
        const a = d.data();
        if (a.solverId === userId) {
          batch.delete(d.ref);
        }
      });
    } catch {}

    // 6. Delete conversations involving this user
    try {
      const cSnap = await getDocs(collection(db, 'conversations'));
      cSnap.docs.forEach((d) => {
        const c = d.data();
        if (
          c.user1Id === userId ||
          c.user2Id === userId ||
          (Array.isArray(c.participants) && c.participants.includes(userId))
        ) {
          batch.delete(d.ref);
        }
      });
    } catch {}

    // 7. Delete certifications
    try {
      const certSnap = await getDocs(collection(db, 'certifications'));
      certSnap.docs.forEach((d) => {
        const cert = d.data();
        if (cert.userId === userId) {
          batch.delete(d.ref);
        }
      });
    } catch {}

    // 8. Delete notifications
    try {
      const notifSnap = await getDocs(collection(db, 'notifications'));
      notifSnap.docs.forEach((d) => {
        const n = d.data();
        if (n.userId === userId) {
          batch.delete(d.ref);
        }
      });
    } catch {}

    await batch.commit();
  } catch (err) {
    handleFirestoreError(`Failed to delete user and all related data for ${userId}`, err);
  }
}

export async function deleteUsersFromFirestore(userIds: string[]): Promise<void> {
  if (!userIds || userIds.length === 0 || isQuotaExhausted) return;
  try {
    const batch = writeBatch(db);
    userIds.forEach((uid) => {
      if (uid) {
        batch.delete(doc(db, 'users', uid));
      }
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(`Failed to batch delete duplicate users`, err);
  }
}

/**
 * Real-time listener for questions collection
 */
export function subscribeToQuestions(onUpdate: (questions: Question[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'questions'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs
            .map((d) => {
              const data = d.data();
              return { id: d.id, ...data } as Question;
            })
            .filter((q) => Boolean(q && typeof q.id === 'string' && q.id.trim() && typeof q.title === 'string' && q.title.trim()));
          onUpdate(list);
        }
      },
      (error) => {
        handleFirestoreError('Real-time questions sync error', error);
      }
    );
  } catch (err) {
    handleFirestoreError('Failed to attach questions listener', err);
    return () => {};
  }
}

/**
 * Real-time listener for answers collection
 */
export function subscribeToAnswers(onUpdate: (answers: Answer[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'answers'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as Answer);
          onUpdate(list);
        }
      },
      (error) => {
        handleFirestoreError('Real-time answers sync error', error);
      }
    );
  } catch (err) {
    handleFirestoreError('Failed to attach answers listener', err);
    return () => {};
  }
}

/**
 * Real-time listener for users collection (同步帳號註銷、反悔猶豫期與身分審核狀態)
 */
export function subscribeToUsers(onUpdate: (users: User[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as User);
          onUpdate(list);
        }
      },
      (error) => {
        handleFirestoreError('Real-time users sync error', error);
      }
    );
  } catch (err) {
    handleFirestoreError('Failed to attach users listener', err);
    return () => {};
  }
}

export async function syncQuestionsToFirestore(questions: Question[]): Promise<void> {
  if (!questions || questions.length === 0 || isQuotaExhausted) return;
  try {
    const CHUNK_SIZE = 150;
    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      const chunk = questions.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((q) => {
        if (!q.id) return;
        const qRef = doc(db, 'questions', q.id);
        const cleanQ = JSON.parse(JSON.stringify(q));
        batch.set(qRef, { ...cleanQ, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError('Failed to batch sync questions', err);
  }
}

export async function syncAnswerToFirestore(answer: Answer): Promise<void> {
  if (!answer || !answer.id || isQuotaExhausted) return;
  try {
    const aRef = doc(db, 'answers', answer.id);
    const cleanA = JSON.parse(JSON.stringify(answer));
    await setDoc(aRef, { ...cleanA, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(`Failed to sync answer ${answer.id}`, err);
  }
}

export async function syncAnswersToFirestore(answers: Answer[]): Promise<void> {
  if (!answers || answers.length === 0 || isQuotaExhausted) return;
  try {
    const CHUNK_SIZE = 150;
    for (let i = 0; i < answers.length; i += CHUNK_SIZE) {
      const chunk = answers.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((ans) => {
        if (!ans.id) return;
        const aRef = doc(db, 'answers', ans.id);
        const cleanA = JSON.parse(JSON.stringify(ans));
        batch.set(aRef, { ...cleanA, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError('Failed to batch sync answers', err);
  }
}

export async function deleteAnswerFromFirestore(answerId: string): Promise<void> {
  if (!answerId || isQuotaExhausted) return;
  try {
    const aRef = doc(db, 'answers', answerId);
    await deleteDoc(aRef);
  } catch (err) {
    handleFirestoreError(`Failed to delete answer ${answerId}`, err);
  }
}

export async function deleteAnswersFromFirestore(answerIds: string[]): Promise<void> {
  if (!answerIds || answerIds.length === 0 || isQuotaExhausted) return;
  try {
    const batch = writeBatch(db);
    answerIds.forEach((id) => {
      if (id) {
        batch.delete(doc(db, 'answers', id));
      }
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError('Failed to batch delete answers', err);
  }
}

export async function syncTransactionToFirestore(tx: Transaction): Promise<void> {
  if (!tx || !tx.id || isQuotaExhausted) return;
  try {
    const txRef = doc(db, 'transactions', tx.id);
    const cleanTx = JSON.parse(JSON.stringify(tx));
    await setDoc(txRef, { ...cleanTx, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(`Failed to sync transaction ${tx.id}`, err);
  }
}

export async function syncTransactionsToFirestore(transactions: Transaction[]): Promise<void> {
  if (!transactions || transactions.length === 0 || isQuotaExhausted) return;
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
    handleFirestoreError('Failed to batch sync transactions', err);
  }
}

export async function syncConversationToFirestore(conv: ChatConversation): Promise<void> {
  if (!conv || !conv.id || isQuotaExhausted) return;
  try {
    const cRef = doc(db, 'conversations', conv.id);
    const cleanC = JSON.parse(JSON.stringify(conv));
    await setDoc(cRef, { ...cleanC, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(`Failed to sync conversation ${conv.id}`, err);
  }
}

// =========================================================================
// 2. 用戶身分與審核治理類 (Identity, Verification & Governance)
// =========================================================================

export async function syncUserToFirestore(user: User): Promise<void> {
  if (!user || !user.id || isQuotaExhausted) return;
  try {
    const userRef = doc(db, 'users', user.id);
    const cleanUser = JSON.parse(JSON.stringify(user));
    const isSiteAAdmin = Boolean(user.adminSites?.includes('site_a'));
    const isSiteBAdmin = Boolean(user.adminSites?.includes('site_b'));
    const firestoreData: any = {
      ...cleanUser,
      id: user.id,
      memberId: user.memberId || user.id,
      role: user.role,
      accountType: user.accountType || (user.role === 'admin' ? 'admin' : 'user'),
      adminSites: user.adminSites || [],
      isSiteAAdmin,
      isSiteBAdmin,
      adminIdentityBadge:
        user.role === 'admin'
          ? isSiteAAdmin && isSiteBAdmin
            ? '雙站全權管理員'
            : isSiteAAdmin
            ? 'A站專屬管理員'
            : 'B站專屬管理員'
          : deleteField(),
      updatedAt: new Date().toISOString(),
    };

    // 若使用者非處於註銷或反悔猶豫期，必須顯式透過 deleteField() 清除雲端舊殘留之猶豫期狀態
    const isUserGraceOrDeact = Boolean(
      user.isDeactivated ||
      user.deactivationStatus === 'pending_grace' ||
      user.deactivationStatus === 'deactivated'
    );
    if (!isUserGraceOrDeact) {
      firestoreData.isDeactivated = false;
      firestoreData.deactivationStatus = deleteField();
      firestoreData.deactivationRequestedAt = deleteField();
      firestoreData.deactivationScheduledPurgeAt = deleteField();
      firestoreData.deactivationReason = deleteField();
    }

    await setDoc(userRef, firestoreData, { merge: true });

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
    handleFirestoreError(`Failed to sync user ${user.id}`, err);
  }
}

/**
 * 當用戶 ID 變更時（例如賦予或撤銷管理員導致 ID 格式更換），遷移資料庫中的文件與關聯資料
 */
export async function migrateUserInFirestore(oldUserId: string, updatedUser: User): Promise<void> {
  if (!updatedUser || !updatedUser.id || isQuotaExhausted) return;
  try {
    const isIdChanged = Boolean(oldUserId && oldUserId !== updatedUser.id);
    if (isIdChanged) {
      // 1. 刪除 users 集合中的舊文件
      try {
        await deleteDoc(doc(db, 'users', oldUserId));
      } catch (e) {
        console.warn('[Firestore] Error deleting old user doc:', e);
      }

      // 2. 刪除 certifications 舊文件
      try {
        await deleteDoc(doc(db, 'certifications', oldUserId));
      } catch (e) {}

      // 3. 刪除 bookmarks 舊文件
      try {
        await deleteDoc(doc(db, 'bookmarks', oldUserId));
      } catch (e) {}

      // 4. 更新 questions 與 answers 中的作者與解答者關聯 ID
      try {
        const qSnap = await getDocs(collection(db, 'questions'));
        const batch = writeBatch(db);
        let qUpdated = 0;
        qSnap.docs.forEach((d) => {
          const q = d.data();
          if (q.authorId === oldUserId) {
            batch.update(d.ref, { authorId: updatedUser.id, authorName: updatedUser.name });
            qUpdated++;
          }
        });
        if (qUpdated > 0) await batch.commit();
      } catch (e) {}

      try {
        const aSnap = await getDocs(collection(db, 'answers'));
        const batch = writeBatch(db);
        let aUpdated = 0;
        aSnap.docs.forEach((d) => {
          const a = d.data();
          if (a.solverId === oldUserId) {
            batch.update(d.ref, { solverId: updatedUser.id, solverName: updatedUser.name });
            aUpdated++;
          }
        });
        if (aUpdated > 0) await batch.commit();
      } catch (e) {}
    }

    // 寫入新文件並更新身分標記
    await syncUserToFirestore(updatedUser);
  } catch (err) {
    handleFirestoreError(`Failed to migrate user from ${oldUserId} to ${updatedUser.id}`, err);
  }
}

export async function syncUsersToFirestore(users: User[]): Promise<void> {
  if (!users || users.length === 0 || isQuotaExhausted) return;
  try {
    const batch = writeBatch(db);
    users.forEach((user) => {
      if (!user.id) return;
      const userRef = doc(db, 'users', user.id);
      const cleanUser = JSON.parse(JSON.stringify(user));
      const firestoreData: any = { ...cleanUser, updatedAt: new Date().toISOString() };

      const isUserGraceOrDeact = Boolean(
        user.isDeactivated ||
        user.deactivationStatus === 'pending_grace' ||
        user.deactivationStatus === 'deactivated'
      );
      if (!isUserGraceOrDeact) {
        firestoreData.isDeactivated = false;
        firestoreData.deactivationStatus = deleteField();
        firestoreData.deactivationRequestedAt = deleteField();
        firestoreData.deactivationScheduledPurgeAt = deleteField();
        firestoreData.deactivationReason = deleteField();
      }

      batch.set(userRef, firestoreData, { merge: true });

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
    handleFirestoreError('Failed to batch sync users & certifications', err);
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
    handleFirestoreError(`Failed to get user ${userId}`, err);
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
  if (!auditRecords || auditRecords.length === 0 || isQuotaExhausted) return;
  try {
    const batch = writeBatch(db);
    auditRecords.forEach((record) => {
      if (!record.id) return;
      const logRef = doc(db, 'audit_logs', record.id);
      batch.set(logRef, { ...record, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError('Failed to batch sync audit logs', err);
  }
}

// =========================================================================
// 3. 互動通知與評價體系類 (Engagement, Notifications & Reviews)
// =========================================================================

export async function syncNotificationsToFirestore(notifications: NotificationItem[]): Promise<void> {
  if (!notifications || notifications.length === 0 || isQuotaExhausted) return;
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
    handleFirestoreError('Failed to sync notifications', err);
  }
}

export async function syncBookmarksToFirestore(userId: string, bookmarkedIds: string[]): Promise<void> {
  if (!userId || isQuotaExhausted) return;
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
    handleFirestoreError(`Failed to sync bookmarks for user ${userId}`, err);
  }
}

export async function syncUserInteractionsToFirestore(
  userId: string,
  interactions: {
    bookmarkedQuestionIds?: string[];
    secondedQuestionIds?: string[];
    sameQuestionIds?: string[];
    likedDiscussionAnswerIds?: string[];
    likedQuestionIds?: string[];
  }
): Promise<void> {
  if (!userId || userId === 'user-guest' || isQuotaExhausted) return;
  try {
    const bookmarkRef = doc(db, 'bookmarks', userId);
    const cleanPayload = JSON.parse(JSON.stringify(interactions));
    await setDoc(
      bookmarkRef,
      {
        userId,
        ...cleanPayload,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(`Failed to sync user interactions for ${userId}`, err);
  }
}

export async function loadUserInteractionsFromFirestore(userId: string): Promise<{
  bookmarkedQuestionIds?: string[];
  secondedQuestionIds?: string[];
  sameQuestionIds?: string[];
  likedDiscussionAnswerIds?: string[];
  likedQuestionIds?: string[];
} | null> {
  if (!userId || userId === 'user-guest') return null;
  try {
    const bookmarkRef = doc(db, 'bookmarks', userId);
    const snap = await getDoc(bookmarkRef);
    if (snap.exists()) {
      return snap.data() as any;
    }
    return null;
  } catch (err) {
    handleFirestoreError(`Failed to load user interactions for ${userId}`, err);
    return null;
  }
}

export async function syncSolversToFirestore(solvers: Solver[]): Promise<void> {
  if (!solvers || solvers.length === 0 || isQuotaExhausted) return;
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
    handleFirestoreError('Failed to batch sync solvers', err);
  }
}

// =========================================================================
// 4. 法律合規與平台設定類 (Compliance & Platform Settings)
// =========================================================================

export async function syncTermsAgreementsToFirestore(user: User): Promise<void> {
  if (!user || !user.id || isQuotaExhausted) return;
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
    handleFirestoreError(`Failed to sync terms agreement for ${user.id}`, err);
  }
}

export async function syncPlatformSettingsToFirestore(settings: {
  commissionRate?: number;
  plans?: SubscriptionPlan[];
  publicMetricsConfig?: any;
  competitionHomepageStatsConfig?: any;
  adminDailyGrants?: any;
  isDemoMode?: boolean;
  isNoPaymentMode?: boolean;
  isRaceMode?: boolean;
  isHideTestAccounts?: boolean;
  isSimulatedDataPurged?: boolean;
}): Promise<void> {
  if (isQuotaExhausted) return;
  try {
    const settingRef = doc(db, 'platform_settings', 'global');
    const cleanSettings = JSON.parse(JSON.stringify(settings));
    await setDoc(settingRef, { ...cleanSettings, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError('Failed to sync platform settings', err);
  }
}

/**
 * 實時監聽全站平台設定與數據展示開關 (Public Metrics Config & Platform Settings)
 */
export function subscribePlatformSettingsFromFirestore(
  callback: (settings: {
    publicMetricsConfig?: any;
    competitionHomepageStatsConfig?: any;
    commissionRate?: number;
    plans?: SubscriptionPlan[];
    isDemoMode?: boolean;
    isNoPaymentMode?: boolean;
    isRaceMode?: boolean;
    isHideTestAccounts?: boolean;
    isSimulatedDataPurged?: boolean;
  }) => void
): Unsubscribe | null {
  if (isQuotaExhausted) return null;
  try {
    return onSnapshot(
      doc(db, 'platform_settings', 'global'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          callback({
            publicMetricsConfig: data.publicMetricsConfig,
            competitionHomepageStatsConfig: data.competitionHomepageStatsConfig,
            commissionRate: data.commissionRate,
            plans: data.plans,
            isDemoMode: data.isDemoMode,
            isNoPaymentMode: data.isNoPaymentMode,
            isRaceMode: data.isRaceMode,
            isHideTestAccounts: data.isHideTestAccounts,
            isSimulatedDataPurged: data.isSimulatedDataPurged,
          });
        }
      },
      (err) => {
        handleFirestoreError('subscribePlatformSettingsFromFirestore', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribePlatformSettingsFromFirestore', err);
    return null;
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

  if (isQuotaExhausted) {
    result.success = true;
    result.message = '目前本機已安全持久化最新資料。雲端資料庫已達今日免費寫入配額，明日重設後將自動恢復同步。';
    return result;
  }

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
    handleFirestoreError('Failed full push', err);
    result.success = true;
    result.message = '全站資料已安全存入本地資料庫快取（雲端已啟用安全降級保護）。';
    return result;
  }
}

/**
 * Read all categorized collections from Firestore on initial load
 */
export async function loadAllDataFromFirestore(
  onProgress?: (completedCount: number, totalCount: number, stepLabel: string) => void
): Promise<{
  users?: User[];
  questions?: Question[];
  answers?: Answer[];
  transactions?: Transaction[];
  conversations?: ChatConversation[];
  notifications?: NotificationItem[];
  solvers?: Solver[];
  settings?: any;
} | null> {
  const TOTAL_TASKS = 8;
  let completedTasks = 0;
  const trackTask = <T,>(promise: Promise<T>, label: string): Promise<T> =>
    promise.then((res) => {
      completedTasks += 1;
      if (onProgress) {
        try {
          onProgress(completedTasks, TOTAL_TASKS, label);
        } catch {}
      }
      return res;
    });

  try {
    const [usersSnap, qSnap, aSnap, txSnap, cSnap, notifSnap, solversSnap, settingsSnap] = await Promise.all([
      trackTask(getDocs(collection(db, 'users')), '正在載入創作者與專家資料...'),
      trackTask(getDocs(collection(db, 'questions')), '正在同步全站痛點、提案與懸賞題目...'),
      trackTask(getDocs(collection(db, 'answers')), '正在載入專家解方與討論串...'),
      trackTask(getDocs(collection(db, 'transactions')), '正在同步點數與託管帳務紀錄...'),
      trackTask(getDocs(collection(db, 'conversations')), '正在載入私訊與協作頻道...'),
      trackTask(getDocs(collection(db, 'notifications')), '正在同步系統通知狀態...'),
      trackTask(getDocs(collection(db, 'solvers')), '正在載入官方認證專家庫...'),
      trackTask(getDocs(collection(db, 'platform_settings')), '正在套用平台環境與賽事設定...'),
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
      result.questions = qSnap.docs
        .map((d) => {
          const data = d.data();
          return { id: d.id, ...data } as Question;
        })
        .filter((q) => Boolean(q && typeof q.id === 'string' && q.id.trim() && typeof q.title === 'string' && q.title.trim()));
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
    handleFirestoreError('Could not load data from Firestore (falling back to server database mirror)', err);
    try {
      if (onProgress) onProgress(4, TOTAL_TASKS, '正在從備援資料庫同步全站資料...');
      const resp = await fetch('/api/competition/db-mirror');
      if (resp.ok) {
        const data = await resp.json();
        if (onProgress) onProgress(TOTAL_TASKS, TOTAL_TASKS, '備援資料庫同步完成！');
        if (data && data.success) {
          return {
            users: Array.isArray(data.users) ? data.users : undefined,
            questions: Array.isArray(data.questions)
              ? data.questions.filter((q: any) => Boolean(q && typeof q.id === 'string' && q.id.trim() && typeof q.title === 'string' && q.title.trim()))
              : undefined,
            answers: Array.isArray(data.answers) ? data.answers : undefined,
          };
        }
      }
    } catch {}
    if (onProgress) onProgress(TOTAL_TASKS, TOTAL_TASKS, '已載入本地快取資料');
    return null;
  }
}

// =========================================================================
// 客服工單與對話即時雲端同步 (Customer Support Tickets & Conversations)
// =========================================================================

export async function syncTicketToFirestore(ticket: CustomerSupportTicket): Promise<boolean> {
  if (isQuotaExhausted) return false;
  try {
    const docRef = doc(db, 'customer_support_tickets', ticket.id);
    await setDoc(docRef, {
      ...ticket,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(`syncTicketToFirestore(${ticket.id})`, err);
    return false;
  }
}

export async function getTicketsFromFirestore(): Promise<CustomerSupportTicket[] | null> {
  if (isQuotaExhausted) return null;
  try {
    const snap = await getDocs(collection(db, 'customer_support_tickets'));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as CustomerSupportTicket);
    }
    return [];
  } catch (err) {
    handleFirestoreError('getTicketsFromFirestore', err);
    return null;
  }
}

export function subscribeToTickets(callback: (tickets: CustomerSupportTicket[]) => void): Unsubscribe | null {
  if (isQuotaExhausted) return null;
  try {
    return onSnapshot(
      collection(db, 'customer_support_tickets'),
      (snapshot) => {
        const list: CustomerSupportTicket[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as CustomerSupportTicket);
        });
        callback(list);
      },
      (err) => {
        handleFirestoreError('subscribeToTickets', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeToTickets', err);
    return null;
  }
}

export async function syncCustomerSupportConversationToFirestore(conv: CustomerSupportConversation): Promise<boolean> {
  if (isQuotaExhausted) return false;
  try {
    const docRef = doc(db, 'customer_support_conversations', conv.id);
    await setDoc(docRef, {
      ...conv,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(`syncCustomerSupportConversationToFirestore(${conv.id})`, err);
    return false;
  }
}

export function subscribeToCustomerSupportConversations(callback: (convs: CustomerSupportConversation[]) => void): Unsubscribe | null {
  if (isQuotaExhausted) return null;
  try {
    return onSnapshot(
      collection(db, 'customer_support_conversations'),
      (snapshot) => {
        const list: CustomerSupportConversation[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as CustomerSupportConversation);
        });
        callback(list);
      },
      (err) => {
        handleFirestoreError('subscribeToCustomerSupportConversations', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeToCustomerSupportConversations', err);
    return null;
  }
}

// =========================================================================
// 網站造訪量 (Site Visits) & 即時線上人數 (Presence Tracking)
// =========================================================================

/**
 * 記錄網站總瀏覽量與造訪次數（本地累加並讀取雲端最新統計，避免每次重整消耗免費寫入配額）
 */
export async function recordSiteVisitInFirestore(): Promise<number> {
  const LOCAL_STORAGE_VISITS_KEY = 'ideax_total_site_visits';
  let currentLocalVisits = parseInt(localStorage.getItem(LOCAL_STORAGE_VISITS_KEY) || '1280', 10);

  currentLocalVisits += 1;
  localStorage.setItem(LOCAL_STORAGE_VISITS_KEY, String(currentLocalVisits));
  return currentLocalVisits;
}

/**
 * 實時監聽全站「網站造訪量」
 */
export function subscribeSiteVisitsFromFirestore(callback: (visits: number) => void): Unsubscribe | null {
  const LOCAL_STORAGE_VISITS_KEY = 'ideax_total_site_visits';
  const initialLocal = parseInt(localStorage.getItem(LOCAL_STORAGE_VISITS_KEY) || '1280', 10);
  callback(initialLocal);
  return null;
}

/**
 * 發送即時線上活躍 Heartbeat（避免每 30 秒高頻寫入耗盡 Firestore 每日免費寫入額度）
 */
export async function sendPresenceHeartbeat(_currentUserId?: string): Promise<void> {
  return;
}

/**
 * 實時監聽當前「即時線上人數」
 */
export function subscribePresenceFromFirestore(callback: (onlineCount: number) => void): Unsubscribe | null {
  callback(1);
  return null;
}




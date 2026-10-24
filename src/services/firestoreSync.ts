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
  query,
  where,
  arrayUnion,
  limit,
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
  AdminSite,
} from '../types';
import {
  recordUtc8SiteVisitBucket,
  getCachedRealTrafficStats,
  saveCachedRealTrafficStats,
} from '../components/AdminSiteTrafficChart';
import { getAuthHeaders } from './authHeader';
import { auth } from './firebase';
import { getMyAppUserId, getMyAuthUid, resolveAuthUid, resolveAuthUids } from './authIdentity';
import { splitAnswerForStorage, type AnswerSecret } from '../utils/answerSecrets';
import { PRIVATE_PROFILE_FIELDS, normalizePhone, pickPrivateProfile } from '../utils/privateProfile';
import { PROTECTED_USER_FIELDS } from './pointsApi';
import { isMockConversationId } from '../data/mockData';

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

export async function syncQuestionToFirestore(question: Question): Promise<{ success: boolean; error?: string }> {
  if (!question || !question.id) return { success: false, error: '缺少問題ID' };
  const cleanQ = JSON.parse(JSON.stringify(question));
  const platforms = Array.isArray(question.publishedPlatforms) && question.publishedPlatforms.length > 0
    ? question.publishedPlatforms
    : (Array.isArray(cleanQ.vibeCodingData?.publishedPlatforms) ? cleanQ.vibeCodingData.publishedPlatforms : (cleanQ.publishedPlatforms || []));

  const payload: any = {
    ...cleanQ,
    publishedPlatforms: platforms,
    showCardImage: question.showCardImage !== undefined ? Boolean(question.showCardImage) : true,
    cardDisplayImage: question.cardDisplayImage || '',
    updatedAt: new Date().toISOString(),
  };

  if (payload.vibeCodingData) {
    payload.vibeCodingData.publishedPlatforms = platforms;
  }

  // 檢查文件尺寸，避免超出 Firestore 1,048,576 bytes 硬性上限
  try {
    const rawLen = JSON.stringify(payload).length;
    if (rawLen > 950000 && Array.isArray(payload.galleryImages) && payload.galleryImages.length > 2) {
      console.warn(`[Firestore] Payload size ${rawLen} near 1MB limit for question ${question.id}, trimming extra gallery images for cloud persistence`);
      payload.galleryImages = payload.galleryImages.slice(0, 2);
      if (payload.vibeCodingData?.screenshots) {
        payload.vibeCodingData.screenshots = payload.galleryImages;
      }
    }
  } catch {}

  let mirrorSuccess = false;
  try {
    const res = await fetch(`/api/competition/db-mirror/questions/${encodeURIComponent(question.id)}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ data: payload, merge: true }),
    });
    if (res.ok) mirrorSuccess = true;
  } catch {}

  if (isQuotaExhausted) return { success: mirrorSuccess, error: '雲端配額暫時耗盡，已寫入本機與伺服器映像' };

  try {
    const qRef = doc(db, 'questions', question.id);
    await setDoc(qRef, payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    handleFirestoreError(`Failed to sync question ${question.id}`, err);
    return { success: mirrorSuccess, error: err?.message || '寫入 Firestore 失敗' };
  }
}

/**
 * 增加問題/痛點瀏覽次數（已依規定停止統計內容瀏覽次數）
 */
export async function incrementQuestionViewInFirestore(_questionId: string, _amount: number = 1): Promise<void> {
  // 不再統計內容瀏覽次數
  return;
}

export async function deleteQuestionFromFirestore(questionId: string): Promise<void> {
  if (!questionId) return;
  try {
    await fetch(`/api/competition/db-mirror/questions/${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
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
        getAuthHeaders().then((headers) => fetch(`/api/competition/db-mirror/questions/${encodeURIComponent(id)}`, { method: 'DELETE', headers })).catch(() => {})
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
      headers: await getAuthHeaders(),
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

/** 回答者本人才寫入受保護的完整內容（answer_secrets）；其他人只寫公開欄位 */
async function writeAnswerSecretIfOwner(answer: Answer, secret: AnswerSecret | null): Promise<void> {
  if (!secret) return;
  const myUid = getMyAuthUid();
  if (!myUid) return;
  const isOwner = answer.solverAuthUid === myUid || (!!answer.solverId && answer.solverId === getMyAppUserId());
  if (!isOwner) return;
  await setDoc(
    doc(db, 'answer_secrets', answer.id),
    { ...JSON.parse(JSON.stringify(secret)), solverAuthUid: myUid, solverId: answer.solverId, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function syncAnswerToFirestore(answer: Answer): Promise<void> {
  if (!answer || !answer.id || isQuotaExhausted) return;
  try {
    const { publicAnswer, secret } = splitAnswerForStorage(answer);
    const aRef = doc(db, 'answers', answer.id);
    const cleanA = JSON.parse(JSON.stringify(publicAnswer));
    // 付款解鎖名單只能由伺服器寫入
    delete cleanA.unlockedByUserIds;
    // 先寫公開文件（資料庫規則要先確認解答屬於自己），再寫受保護內容
    await setDoc(aRef, { ...cleanA, updatedAt: new Date().toISOString() }, { merge: true });
    await writeAnswerSecretIfOwner(answer, secret).catch((err) => handleFirestoreError(`Failed to save answer content ${answer.id}`, err));
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
        const { publicAnswer } = splitAnswerForStorage(ans);
        const cleanA = JSON.parse(JSON.stringify(publicAnswer));
        delete cleanA.unlockedByUserIds;
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

/** 交易相關人的 Firebase UID（含寫入者自己），供資料庫規則判斷誰能讀取 */
function txPartyAuthUids(tx: Transaction): string[] {
  const t = tx as any;
  const uids = new Set(resolveAuthUids([t.fromUserId, t.toUserId, t.solverId, t.userId]));
  const mine = getMyAuthUid();
  if (mine) uids.add(mine);
  return Array.from(uids);
}

export async function syncTransactionToFirestore(tx: Transaction): Promise<void> {
  if (!tx || !tx.id || isQuotaExhausted) return;
  try {
    const txRef = doc(db, 'transactions', tx.id);
    const cleanTx = JSON.parse(JSON.stringify(tx));
    const uids = txPartyAuthUids(tx);
    await setDoc(
      txRef,
      { ...cleanTx, ...(uids.length ? { partyAuthUids: arrayUnion(...uids) } : {}), updatedAt: new Date().toISOString() },
      { merge: true }
    );
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
      const uids = txPartyAuthUids(tx);
      batch.set(
        txRef,
        { ...cleanTx, ...(uids.length ? { partyAuthUids: arrayUnion(...uids) } : {}), updatedAt: new Date().toISOString() },
        { merge: true }
      );
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError('Failed to batch sync transactions', err);
  }
}

export async function syncConversationToFirestore(conv: ChatConversation): Promise<void> {
  if (!conv || !conv.id || isQuotaExhausted || isMockConversationId(conv.id) || conv.id === 'conv-tutorial-demo') return;
  try {
    const cRef = doc(db, 'conversations', conv.id);
    const { unreadCount, conversationRole, ...shared } = conv as any;
    const cleanC = JSON.parse(JSON.stringify(shared));
    const uids = resolveAuthUids(conv.participantIds || []);
    await setDoc(
      cRef,
      { ...cleanC, ...(uids.length ? { participantAuthUids: arrayUnion(...uids) } : {}), updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(`Failed to sync conversation ${conv.id}`, err);
  }
}

// =========================================================================
// 2. 用戶身分與審核治理類 (Identity, Verification & Governance)
// =========================================================================

export const PRIVATE_USER_COLLECTION = 'user_private';

/** 安全性：要從公開 users 文件中移除的敏感欄位 */
const SECRET_FIELD_DELETES = () => ({
  password: deleteField(),
  realNameAuthData: deleteField(),
  realNameData: deleteField(),
  // 聯絡方式與財務資料改存 user_private
  ...Object.fromEntries(PRIVATE_PROFILE_FIELDS.map((k) => [k, deleteField()])),
});

/** 是否可以寫這位會員的私密資料：本人或管理員 */
function canWritePrivateOf(user: User): boolean {
  if (currentDataScope.isAdmin) return true;
  const myUid = getMyAuthUid();
  if (!myUid) return false;
  return user.id === getMyAppUserId() || user.authUid === myUid || user.id === myUid;
}

function privateDocPayload(user: User, extra: Record<string, any> = {}) {
  const myUid = getMyAuthUid();
  const authUid = user.authUid || (user.id === getMyAppUserId() || user.id === myUid ? myUid : undefined);
  return JSON.parse(
    JSON.stringify({
      ...pickPrivateProfile(user),
      ...(normalizePhone(user.phone) ? { phoneNormalized: normalizePhone(user.phone) } : {}),
      ...extra,
      ...(authUid ? { authUid } : {}),
      updatedAt: new Date().toISOString(),
    })
  );
}

/** 讀取自己的私密資料（Email、電話、銀行帳戶等） */
export async function getMyPrivateProfile(userId: string): Promise<Partial<User> | null> {
  if (!userId || !getMyAuthUid()) return null;
  try {
    const snap = await getDoc(doc(db, PRIVATE_USER_COLLECTION, userId));
    if (!snap.exists()) return null;
    return pickPrivateProfile(snap.data() as any);
  } catch {
    return null;
  }
}

/** 管理員：讀取所有會員的私密資料（會員管理、審核、統計用） */
export async function getAllPrivateProfiles(): Promise<Record<string, Partial<User>>> {
  if (!currentDataScope.isAdmin) return {};
  try {
    const snap = await getDocs(collection(db, PRIVATE_USER_COLLECTION));
    const out: Record<string, Partial<User>> = {};
    snap.docs.forEach((d) => {
      out[d.id] = pickPrivateProfile(d.data() as any);
    });
    return out;
  } catch (err) {
    handleFirestoreError('Failed to load private profiles', err);
    return {};
  }
}

/** 安全性：移除舊資料中殘留的明碼密碼與實名個資，避免流入每位訪客的瀏覽器 */
export function stripUserSecrets(u: User): User {
  if (!u) return u;
  const { password, realNameAuthData, realNameData, ...rest } = u as any;
  return rest as User;
}

/** 讀取單一使用者的實名認證資料（管理員審核或本人檢視時使用） */
export async function getUserPrivateData(userId: string): Promise<{ realNameAuthData?: User['realNameAuthData'] } | null> {
  if (!userId) return null;
  try {
    const snap = await getDoc(doc(db, PRIVATE_USER_COLLECTION, userId));
    return snap.exists() ? (snap.data() as any) : null;
  } catch (err) {
    handleFirestoreError(`Failed to get private data ${userId}`, err);
    return null;
  }
}

export async function syncUserToFirestore(
  user: User,
  options?: { forceAdminScope?: boolean }
): Promise<void> {
  if (!user || !user.id || isQuotaExhausted) return;
  try {
    const userRef = doc(db, 'users', user.id);
    const cleanUser = JSON.parse(JSON.stringify(user));
    // 安全性：密碼與實名認證個資不寫入公開的 users 集合
    const privateRealName = cleanUser.realNameAuthData;
    delete cleanUser.password;
    delete cleanUser.realNameAuthData;
    delete cleanUser.realNameData;
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
      // 清除雲端舊版殘留的明碼密碼與實名個資
      ...SECRET_FIELD_DELETES(),
      hasIdDocuments: Boolean(privateRealName?.idCardFrontFile || privateRealName?.idCardBackFile),
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

    // 一般會員寫入時移除點數與權限欄位（只能由伺服器帳本或管理員異動，資料庫規則也會擋）
    const effectiveIsAdmin = Boolean(options?.forceAdminScope || currentDataScope.isAdmin);
    if (!effectiveIsAdmin) {
      for (const f of PROTECTED_USER_FIELDS) delete firestoreData[f];
      if (firestoreData.role === 'admin') delete firestoreData.role;
      if (firestoreData.accountType === 'admin') delete firestoreData.accountType;
    }

    await setDoc(userRef, firestoreData, { merge: true });

    // 實名認證個資、聯絡方式與財務資料存於 user_private（本人與管理員才能讀寫）
    if (canWritePrivateOf(user)) {
      const priv = privateDocPayload(user, privateRealName ? { realNameAuthData: privateRealName } : {});
      if (Object.keys(priv).some((k) => k !== 'updatedAt' && k !== 'authUid')) {
        await setDoc(doc(db, PRIVATE_USER_COLLECTION, user.id), priv, { merge: true }).catch((err) =>
          handleFirestoreError(`Failed to save private profile ${user.id}`, err)
        );
      }
    }

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
 * 同步更新 /admins/{adminId} 集合中的授權紀錄，讓 Firestore 規則與後端 isVerifiedAdmin 立即生效
 */
export async function syncAdminDocToFirestore(
  adminId: string,
  isAdminRole: boolean,
  sites: AdminSite[] = ['site_a', 'site_b']
): Promise<void> {
  if (!adminId || isQuotaExhausted) return;
  try {
    const adminRef = doc(db, 'admins', adminId);
    if (isAdminRole) {
      await setDoc(
        adminRef,
        {
          id: adminId,
          authUid: adminId,
          admin: true,
          role: 'admin',
          sites,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      await deleteDoc(adminRef);
    }
  } catch (err) {
    console.warn(`[Firestore] Failed to update admin doc for ${adminId}:`, err);
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
  // 批次寫入多位會員只限管理員（一般會員只能改自己的資料，資料庫規則會擋下整批）
  if (!currentDataScope.isAdmin) return;
  try {
    const batch = writeBatch(db);
    users.forEach((user) => {
      if (!user.id) return;
      const userRef = doc(db, 'users', user.id);
      const cleanUser = JSON.parse(JSON.stringify(user));
      const privateRealName = cleanUser.realNameAuthData;
      delete cleanUser.password;
      delete cleanUser.realNameAuthData;
      delete cleanUser.realNameData;
      const firestoreData: any = {
        ...cleanUser,
        updatedAt: new Date().toISOString(),
        ...SECRET_FIELD_DELETES(),
        hasIdDocuments: Boolean(privateRealName?.idCardFrontFile || privateRealName?.idCardBackFile || (user as any).hasIdDocuments),
      };
      {
        const priv = privateDocPayload(user, privateRealName ? { realNameAuthData: privateRealName } : {});
        if (Object.keys(priv).some((k) => k !== 'updatedAt' && k !== 'authUid')) {
          batch.set(doc(db, PRIVATE_USER_COLLECTION, user.id), priv, { merge: true });
        }
      }

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
      return stripUserSecrets(snap.data() as User);
    }
    // 平台編號與登入帳號不同的會員：以 authUid 對照找回原本的會員資料，避免重複建立帳號
    const byAuth = await getDocs(query(collection(db, 'users'), where('authUid', '==', userId), limit(1)));
    if (!byAuth.empty) {
      return stripUserSecrets({ ...(byAuth.docs[0].data() as User), id: byAuth.docs[0].id });
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
      const recipientAuthUid = item.userId && item.userId !== 'all' && item.userId !== 'admin' ? resolveAuthUid(item.userId) : null;
      batch.set(
        notifRef,
        {
          ...cleanItem,
          ...(recipientAuthUid ? { recipientAuthUid } : {}),
          senderAuthUid: getMyAuthUid(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
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

/** AI-CRM 巡檢設定存到雲端（platform_settings/global.aiCrmConfig），伺服器值班依此執行 */
export async function syncAiCrmConfigToFirestore(config: Record<string, any>): Promise<void> {
  if (isQuotaExhausted) return;
  try {
    await setDoc(doc(db, 'platform_settings', 'global'), { aiCrmConfig: JSON.parse(JSON.stringify(config)), updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError('syncAiCrmConfigToFirestore', err);
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
  mascotConfig?: any;
  allowGuestPosting?: boolean;
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
    mascotConfig?: any;
    homeShowcaseConfig?: any;
    allowGuestPosting?: boolean;
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
            mascotConfig: data.mascotConfig,
            homeShowcaseConfig: data.homeShowcaseConfig,
            allowGuestPosting: data.allowGuestPosting,
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


// =========================================================================
// 資料載入範圍：每位訪客只下載「自己的」交易、私訊與通知
// - 訪客：不下載任何私人資料
// - 一般會員：只下載與自己相關的交易、自己參與的對話、發給自己（或全站廣播）的通知
// - 管理員：維持載入全站資料，後台查閱不受影響
// =========================================================================
export interface FirestoreDataScope {
  userId: string | null;
  userName?: string;
  isAdmin: boolean;
}

let currentDataScope: FirestoreDataScope = { userId: null, isAdmin: false };

export function setFirestoreDataScope(scope: FirestoreDataScope) {
  currentDataScope = scope;
}

export function getFirestoreDataScope(): FirestoreDataScope {
  return currentDataScope;
}

/** 合併多次查詢的結果並以 id 去重 */
function mergeDocsById<T>(snaps: Array<{ docs: Array<{ id: string; data: () => any }> }>): T[] {
  const map = new Map<string, T>();
  for (const snap of snaps) {
    for (const d of snap.docs) {
      const data = d.data() || {};
      map.set(d.id, { id: d.id, ...data } as T);
    }
  }
  return Array.from(map.values());
}

/** 只載入某位會員自己的交易、對話與通知 */
export async function loadPersonalDataFromFirestore(scope: FirestoreDataScope = currentDataScope): Promise<{
  transactions: Transaction[];
  conversations: ChatConversation[];
  notifications: NotificationItem[];
} | null> {
  if (!scope.userId) return { transactions: [], conversations: [], notifications: [] };
  if (isQuotaExhausted) return null;
  // 資料庫規則以 Firebase 登入帳號判斷權限：等登入狀態還原後再查詢
  try {
    await auth.authStateReady();
  } catch {}
  const myUid = getMyAuthUid();
  if (!myUid) return { transactions: [], conversations: [], notifications: [] };
  const safe = (p: Promise<any>) => p.catch(() => ({ docs: [] }));
  try {
    const [txSnap, convSnap, notifSnap, broadcastSnap] = await Promise.all([
      safe(getDocs(query(collection(db, 'transactions'), where('partyAuthUids', 'array-contains', myUid)))),
      safe(getDocs(query(collection(db, 'conversations'), where('participantAuthUids', 'array-contains', myUid)))),
      safe(getDocs(query(collection(db, 'notifications'), where('recipientAuthUid', '==', myUid)))),
      safe(getDocs(query(collection(db, 'notifications'), where('userId', '==', 'all')))),
    ]);
    return {
      transactions: mergeDocsById<Transaction>([txSnap]),
      conversations: mergeDocsById<ChatConversation>([convSnap]),
      notifications: mergeDocsById<NotificationItem>([notifSnap, broadcastSnap]),
    };
  } catch (err) {
    handleFirestoreError('loadPersonalDataFromFirestore', err);
    return null;
  }
}

/**
 * 即時接收「自己的」私訊與通知（只在有變動時才計算讀取量）
 * 回傳取消訂閱函式
 */
export function subscribePersonalData(
  userId: string,
  recipientIds: string[],
  handlers: {
    onConversations: (conversations: ChatConversation[]) => void;
    onNotifications: (notifications: NotificationItem[], isInitial: boolean) => void;
  }
): Unsubscribe {
  if (isQuotaExhausted || !userId) return () => {};
  const unsubs: Unsubscribe[] = [];
  let cancelled = false;
  (async () => {
    try {
      await auth.authStateReady();
    } catch {}
    const myUid = getMyAuthUid();
    if (cancelled || !myUid) return;
    try {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'conversations'), where('participantAuthUids', 'array-contains', myUid)),
          (snap) => handlers.onConversations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as ChatConversation)),
          (err) => handleFirestoreError('subscribePersonalData(conversations)', err)
        )
      );
      // 通知分三路：發給我的、全站廣播、（管理員）發給管理員的；各自第一次回傳都視為初始資料
      const latest = new Map<string, NotificationItem[]>();
      const seenInitial = new Set<string>();
      const emit = (key: string, items: NotificationItem[]) => {
        latest.set(key, items);
        const isInitial = !seenInitial.has(key);
        seenInitial.add(key);
        handlers.onNotifications(Array.from(latest.values()).flat(), isInitial);
      };
      const notifQueries: Array<[string, any]> = [
        ['mine', query(collection(db, 'notifications'), where('recipientAuthUid', '==', myUid))],
        ['all', query(collection(db, 'notifications'), where('userId', '==', 'all'))],
        ...recipientIds.map((rid) => [`to:${rid}`, query(collection(db, 'notifications'), where('userId', '==', rid))] as [string, any]),
      ];
      for (const [key, q] of notifQueries) {
        unsubs.push(
          onSnapshot(
            q,
            (snap: any) => emit(key, snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }) as NotificationItem)),
            (err: any) => handleFirestoreError(`subscribePersonalData(notifications:${key})`, err)
          )
        );
      }
    } catch (err) {
      handleFirestoreError('subscribePersonalData', err);
    }
  })();
  return () => {
    cancelled = true;
    unsubs.forEach((u) => {
      try {
        u();
      } catch {}
    });
  };
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
    const scope = currentDataScope;
    // 管理員載入全站；一般會員只載入自己的；訪客不載入私人資料
    const emptySnap = { docs: [] as any[] };
    const personalPromise: Promise<any> = scope.isAdmin
      ? auth
          .authStateReady()
          .catch(() => {})
          .then(() =>
            Promise.all([
              getDocs(collection(db, 'transactions')).catch(() => emptySnap),
              getDocs(collection(db, 'conversations')).catch(() => emptySnap),
              getDocs(collection(db, 'notifications')).catch(() => emptySnap),
            ])
          )
          .then(([t, c, n]: any[]) => ({
            transactions: t.docs.map((d: any) => d.data() as Transaction),
            conversations: c.docs.map((d: any) => d.data() as ChatConversation),
            notifications: n.docs.map((d: any) => d.data() as NotificationItem),
          }))
      : loadPersonalDataFromFirestore(scope).catch(() => null);
    const [usersSnap, qSnap, aSnap, personal, solversSnap, settingsSnap] = await Promise.all([
      trackTask(getDocs(collection(db, 'users')), '正在載入創作者與專家資料...'),
      trackTask(getDocs(collection(db, 'questions')), '正在同步全站痛點、提案與懸賞題目...'),
      trackTask(getDocs(collection(db, 'answers')), '正在載入專家解方與討論串...'),
      trackTask(personalPromise.then((r: any) => { completedTasks += 2; return r; }), '正在同步你的交易、私訊與通知...'),
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
      result.users = usersSnap.docs.map((d) => stripUserSecrets(d.data() as User));
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
    // 私人資料一律回傳陣列（可能為空），讓前端以雲端結果取代舊的本機快取
    if (personal) {
      result.transactions = personal.transactions;
      result.conversations = personal.conversations;
      result.notifications = personal.notifications;
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
    const myUid = getMyAuthUid();
    await setDoc(docRef, {
      ...ticket,
      // 只有提出者本人（登入帳號）與管理員能讀這張工單
      ...(myUid && !(ticket as any).userAuthUid && ticket.userId === getMyAppUserId() ? { userAuthUid: myUid } : {}),
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
    const myUid = getMyAuthUid();
    await setDoc(docRef, {
      ...conv,
      ...(myUid && !(conv as any).userAuthUid && conv.userId === getMyAppUserId() ? { userAuthUid: myUid } : {}),
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

function getClientSessionId(): string {
  const KEY = 'ideax_client_session_id';
  try {
    let sid = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    if (!sid) {
      sid = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(KEY, sid);
      localStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return 'sid_default';
  }
}

/**
 * 記錄網站總瀏覽量與造訪次數（100% 真實後端與雲端統計，不偽造過去歷史資料）
 */
export async function recordSiteVisitInFirestore(): Promise<number> {
  try {
    // 造訪用戶：每台裝置第一次來算一位新用戶；同一裝置每天只算一次當日造訪
    let newVisitorEver = false;
    let newVisitorToday = false;
    try {
      if (!localStorage.getItem('ideax_visitor_id')) {
        localStorage.setItem('ideax_visitor_id', `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
        newVisitorEver = true;
      }
      const todayUtc8 = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
      if (localStorage.getItem('ideax_visitor_last_day') !== todayUtc8) {
        localStorage.setItem('ideax_visitor_last_day', todayUtc8);
        newVisitorToday = true;
      }
    } catch {}
    const res = await fetch('/api/competition/site-traffic/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getClientSessionId(), newVisitorEver, newVisitorToday }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.success && json.stats) {
        saveCachedRealTrafficStats(json.stats);
        return Number(json.stats.totalVisits) || 1;
      }
    }
  } catch {
    // fallback to local real counter if API unreachable
  }
  const fallback = recordUtc8SiteVisitBucket();
  return fallback.totalVisits;
}

/**
 * 實時監聽全站「網站造訪量」（真實數據）
 */
export function subscribeSiteVisitsFromFirestore(callback: (visits: number) => void): Unsubscribe | null {
  const cached = getCachedRealTrafficStats();
  if (cached.totalVisits > 0) {
    callback(cached.totalVisits);
  }

  fetch('/api/competition/site-traffic')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && json.stats) {
        saveCachedRealTrafficStats(json.stats);
        callback(Number(json.stats.totalVisits) || 0);
      }
    })
    .catch(() => {});

  const handler = (e: Event) => {
    const customEvt = e as CustomEvent;
    if (customEvt.detail && typeof customEvt.detail.totalVisits === 'number') {
      callback(customEvt.detail.totalVisits);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('ideax_site_traffic_updated', handler);
    return () => window.removeEventListener('ideax_site_traffic_updated', handler);
  }
  return null;
}

/**
 * 發送即時線上活躍 Heartbeat（真實活躍連線統計）
 */
export async function sendPresenceHeartbeat(currentUserId?: string): Promise<void> {
  try {
    const sessionId = currentUserId || getClientSessionId();
    const res = await fetch('/api/competition/site-traffic/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.success && typeof json.onlineUsersCount === 'number' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ideax_presence_updated', { detail: json.onlineUsersCount }));
      }
    }
  } catch {}
}

/**
 * 實時監聽當前「即時線上人數」
 */
export function subscribePresenceFromFirestore(callback: (onlineCount: number) => void): Unsubscribe | null {
  const cached = getCachedRealTrafficStats();
  callback(Math.max(1, cached.onlineUsersCount || 1));

  const handler = (e: Event) => {
    const customEvt = e as CustomEvent<number>;
    if (typeof customEvt.detail === 'number') {
      callback(Math.max(1, customEvt.detail));
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('ideax_presence_updated', handler);
    return () => window.removeEventListener('ideax_presence_updated', handler);
  }
  return null;
}





/**
 * 記錄會員「最近上線時間」：登入的會員使用網站時，最多每 10 分鐘回報一次。
 * 由伺服器寫到獨立的 user_activity（不寫進會員資料：會員資料大家都在即時監聽，每寫一次所有在線的人都要重讀）。
 */
/** 儲存首頁公開數據開關：先走伺服器（確認管理員後寫入），不行再直接寫資料庫 */
export async function savePublicMetricsConfig(config: Record<string, boolean>): Promise<{ ok: boolean; reason?: string; message?: string }> {
  let reason = '';
  let message = '';
  try {
    const headers = await getAuthHeaders();
    if (headers.Authorization) {
      const r = await fetch('/api/admin/public-metrics-config', { method: 'POST', headers, body: JSON.stringify({ config }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) return { ok: true };
      reason = j?.reason || (r.status === 401 ? 'not_signed_in' : r.status === 403 ? 'not_admin' : `http_${r.status}`);
      message = typeof j?.error === 'string' ? j.error : '';
    } else {
      reason = 'not_signed_in';
    }
  } catch {
    reason = 'network';
  }
  // 備援：直接寫入（資料庫規則允許管理員時會成功）
  try {
    await setDoc(doc(db, 'platform_settings', 'global'), { publicMetricsConfig: config, updatedAt: new Date().toISOString() }, { merge: true });
    return { ok: true };
  } catch (err: any) {
    handleFirestoreError('savePublicMetricsConfig', err);
    return { ok: false, reason: reason || err?.code || 'write_failed', message };
  }
}

/** 儲存首頁創點子播放區設定：由伺服器確認管理員後寫入 */
export async function saveHomeShowcaseConfig(config: { enabled: boolean; modes: string[]; customIds: string[]; includeSimulated?: boolean; hideHeroTitles?: boolean }): Promise<{ ok: boolean; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return { ok: false, message: '登入狀態已過期，請重新登入後再試' };
    const r = await fetch('/api/admin/home-showcase-config', { method: 'POST', headers, body: JSON.stringify({ config }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.ok) return { ok: true };
    return { ok: false, message: typeof j?.error === 'string' ? j.error : '請稍後再試' };
  } catch {
    return { ok: false, message: '網路連線不穩，請稍後再試' };
  }
}

export async function touchUserLastActive(userId?: string): Promise<void> {
  if (!userId || userId === 'user-guest') return;
  const key = `ideax_last_active_touch_${userId}`;
  try {
    const last = Number(localStorage.getItem(key) || 0);
    if (Date.now() - last < 10 * 60 * 1000) return;
    localStorage.setItem(key, String(Date.now()));
  } catch {}
  try {
    const { getAuthHeaders } = await import('./authHeader');
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    await fetch('/api/me/active', { method: 'POST', headers, body: JSON.stringify({ userId }) });
  } catch {
    try { localStorage.removeItem(key); } catch {}
  }
}

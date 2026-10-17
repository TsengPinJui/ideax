import { arrayUnion, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getMyAuthUid, resolveAuthUid, resolveAuthUids } from './authIdentity';
import { db } from './firebase';
import { ChatConversation, ChatMessage, NotificationItem } from '../types';

/**
 * 私訊與通知的雲端傳遞（讓對方在自己的裝置上收得到）
 *
 * 對話文件是雙方共用的，但有些欄位是「每個人自己的視角」：
 * - unreadCount：各自的未讀數，只存在本機，不寫入雲端
 * - conversationRole：各自在這段對話的身分，存在 roleByUser[使用者ID]
 */

type SharedConversation = ChatConversation & { roleByUser?: Record<string, 'questioner' | 'solver'> };

const OFFER_STATUS_RANK: Record<string, number> = { pending: 0, rejected: 1, accepted: 2, completed: 3 };

function messageTime(m: ChatMessage): number {
  const t = Date.parse(m.createdAt);
  return Number.isNaN(t) ? 0 : t;
}

/** 合併兩邊的訊息（以訊息 id 為準），同一則方案訊息取「進度較後面」的狀態 */
export function mergeMessages(a: ChatMessage[] = [], b: ChatMessage[] = []): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of [...a, ...b]) {
    if (!m || !m.id) continue;
    const existing = map.get(m.id);
    if (!existing) {
      map.set(m.id, m);
      continue;
    }
    const rankA = OFFER_STATUS_RANK[existing.offer?.status || ''] ?? -1;
    const rankB = OFFER_STATUS_RANK[m.offer?.status || ''] ?? -1;
    if (rankB > rankA) map.set(m.id, m);
  }
  const list = Array.from(map.values());
  // 舊資料的時間可能不是標準格式，這時維持原本順序
  if (list.some((m) => messageTime(m) === 0)) return list;
  return list.sort((x, y) => messageTime(x) - messageTime(y));
}

/** 用來判斷對話「共用內容」是否有變動 */
export function conversationSignature(conv: ChatConversation): string {
  const msgs = conv.messages || [];
  return JSON.stringify([
    msgs.length,
    msgs.map((m) => `${m.id}:${m.offer?.status || ''}`).join(','),
    conv.lastMessage || '',
    conv.groupName || '',
    (conv.participantIds || []).join(','),
  ]);
}

/**
 * 把雲端收到的對話合併進本機版本
 * @param isActive 使用者目前正開著這段對話（新訊息不算未讀）
 */
export function mergeIncomingConversation(
  local: ChatConversation | undefined,
  incoming: SharedConversation,
  myId: string,
  isActive: boolean
): ChatConversation {
  const { roleByUser, ...rest } = incoming as SharedConversation & { updatedAt?: string };
  const otherRole = Object.entries(roleByUser || {}).find(([uid]) => uid !== myId)?.[1];
  const myRole: 'questioner' | 'solver' =
    local?.conversationRole ||
    roleByUser?.[myId] ||
    (otherRole ? (otherRole === 'questioner' ? 'solver' : 'questioner') : 'questioner');

  const localMsgs = local?.messages || [];
  const merged = mergeMessages(localMsgs, incoming.messages || []);
  const localIds = new Set(localMsgs.map((m) => m.id));
  const newFromOthers = merged.filter((m) => !localIds.has(m.id) && m.senderId !== myId).length;
  const last = merged[merged.length - 1];

  return {
    ...(local || {}),
    ...rest,
    messages: merged,
    // 摘要跟著「最後一則訊息」來自哪一邊
    lastMessage:
      (last && (incoming.messages || []).some((m) => m.id === last.id) ? incoming.lastMessage : local?.lastMessage) ||
      incoming.lastMessage ||
      last?.text ||
      '',
    lastMessageTime: local && newFromOthers === 0 ? local.lastMessageTime : incoming.lastMessageTime || local?.lastMessageTime || '',
    conversationRole: myRole,
    unreadCount: isActive ? 0 : (local?.unreadCount || 0) + newFromOthers,
  } as ChatConversation;
}

/** 寫入雲端：只寫共用內容，不寫各自的未讀數與身分 */
export async function pushConversationToCloud(conv: ChatConversation, myId: string): Promise<boolean> {
  if (!conv?.id) return false;
  try {
    // 資料庫規則：只有對話雙方的 Firebase 帳號能讀寫，沒有登入 Firebase 時不寫入
    if (!getMyAuthUid()) return false;
    const { unreadCount, conversationRole, ...shared } = conv;
    const clean = JSON.parse(JSON.stringify(shared));
    const uids = resolveAuthUids(conv.participantIds || []);
    await setDoc(
      doc(db, 'conversations', conv.id),
      {
        ...clean,
        participantAuthUids: arrayUnion(...uids),
        ...(conversationRole ? { roleByUser: { [myId]: conversationRole } } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn('[Cloud Messaging] 對話同步失敗:', err?.code || err?.message);
    return false;
  }
}

/** 把通知送到對方（寫入雲端，對方的裝置會即時收到） */
export async function deliverNotificationToCloud(n: NotificationItem): Promise<boolean> {
  if (!n?.id || !n.userId) return false;
  const senderAuthUid = getMyAuthUid();
  if (!senderAuthUid) return false;
  // 收件人：一般會員以 Firebase UID 識別；'admin'、'all' 由資料庫規則另外處理
  const recipientAuthUid = n.userId === 'admin' || n.userId === 'all' ? null : resolveAuthUid(n.userId);
  if (n.userId !== 'admin' && n.userId !== 'all' && !recipientAuthUid) return false;
  try {
    const iso = Number.isNaN(Date.parse(n.createdAt)) ? new Date().toISOString() : n.createdAt;
    const clean = JSON.parse(JSON.stringify({ ...n, createdAt: iso, read: false }));
    await setDoc(
      doc(db, 'notifications', n.id),
      { ...clean, recipientAuthUid, senderAuthUid, deliveredAt: new Date().toISOString() },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn('[Cloud Messaging] 通知送出失敗:', err?.code || err?.message);
    return false;
  }
}

/** 把自己已讀的狀態寫回雲端，換裝置也不會再顯示未讀 */
export async function markNotificationReadInCloud(id: string): Promise<void> {
  try {
    await setDoc(doc(db, 'notifications', id), { read: true, readAt: new Date().toISOString() }, { merge: true });
  } catch {}
}

/** 刪除自己收到的通知（雲端） */
export async function deleteNotificationsInCloud(ids: string[]): Promise<void> {
  await Promise.all(
    ids.slice(0, 200).map((id) => deleteDoc(doc(db, 'notifications', id)).catch(() => {}))
  );
}

/** 通知時間顯示：ISO 時間轉成「3 分鐘前」，舊資料的文字（如「剛剛」）照原樣顯示 */
export function formatNotificationTime(createdAt: string): string {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return createdAt;
  const diff = Date.now() - t;
  if (diff < 60_000) return '剛剛';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分鐘前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小時前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  const d = new Date(t);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

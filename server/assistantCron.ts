/**
 * AI 特助伺服器值班（由 Vercel Cron 每 5 分鐘呼叫一次）
 *
 * 1. 送出到期的排程訊息（不必專家開著網站）
 * 2. 代回客戶訊息：客戶傳訊後專家超過設定時間未回覆，由 AI 依專家設定代答並通知專家
 * 3. AI-CRM 巡檢：依間隔掃描新案件，挑出符合專家專長的通知專家
 *
 * 以服務帳戶（firebase-admin）讀寫，不受前端資料庫規則限制。
 */
import { getApps } from 'firebase-admin/app';
import firebaseConfigJson from '../firebase-applet-config.json';
import { hasAdminCredentials } from './competitionService';

type ReplyGenerator = (params: any) => Promise<{ source: string; data: any }>;

export interface AssistantTickResult {
  experts: number;
  scheduledSent: number;
  autoReplies: number;
  crmScans: number;
  crmMatches: number;
  errors: string[];
  durationMs: number;
}

const MAX_AUTO_REPLIES_PER_TICK = 15;
const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000; // 只代回 24 小時內的客戶訊息，避免第一次執行時回覆大量舊訊息
const DEFAULT_SCAN_HOURS = 2;

function nowIso() {
  return new Date().toISOString();
}

function msgTime(m: any): number {
  const t = Date.parse(m?.createdAt);
  return Number.isNaN(t) ? 0 : t;
}

function isAiOrSystem(m: any): boolean {
  if (!m) return true;
  if (m.isSystem || m.isAiAssistant) return true;
  const name = String(m.senderName || '');
  return name.includes('AI特助') || name.includes('AI 特助') || name.includes('AI軍師') || name.includes('AI 軍師');
}

function getScanIntervalHours(crmConfig: any, now: Date): number {
  if (!crmConfig) return DEFAULT_SCAN_HOURS;
  if (crmConfig.scheduleMode === 'fixed_interval') return Number(crmConfig.autoScanIntervalHours) || DEFAULT_SCAN_HOURS;
  // 智慧時段（台灣時間）
  const hour = (now.getUTCHours() + 8) % 24;
  const minute = now.getUTCMinutes();
  const hm = hour * 60 + minute;
  if (hm >= 9 * 60 && hm < 18 * 60) return Number(crmConfig.peakIntervalHours) || 1;
  if (hm >= 18 * 60 && hm < 23 * 60 + 30) return Number(crmConfig.eveningIntervalHours) || 2;
  return Number(crmConfig.offPeakIntervalHours) || 6;
}

export async function runAssistantTick(generateReply: ReplyGenerator): Promise<AssistantTickResult> {
  const started = Date.now();
  const result: AssistantTickResult = {
    experts: 0,
    scheduledSent: 0,
    autoReplies: 0,
    crmScans: 0,
    crmMatches: 0,
    errors: [],
    durationMs: 0,
  };
  if (!hasAdminCredentials) {
    result.errors.push('伺服器尚未設定 FIREBASE_SERVICE_ACCOUNT');
    return result;
  }

  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = getApps()[0];
  const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
  const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  const now = new Date();

  const settingsSnap = await db.collection('platform_settings').doc('global').get().catch(() => null);
  const crmConfig = settingsSnap?.exists ? (settingsSnap.data() as any)?.aiCrmConfig : null;

  const expertsSnap = await db.collection('users').where('assistant24hrConfig.isEnabled', '==', true).get();
  result.experts = expertsSnap.size;

  const userCache = new Map<string, any>();
  const getUser = async (id: string) => {
    if (!id) return null;
    if (userCache.has(id)) return userCache.get(id);
    const snap = await db.collection('users').doc(id).get().catch(() => null);
    const data = snap?.exists ? { id: snap.id, ...(snap.data() as any) } : null;
    userCache.set(id, data);
    return data;
  };
  const authUidOf = (u: any) => (u ? u.authUid || (/^[A-Za-z0-9]{20,40}$/.test(u.id) ? u.id : null) : null);

  const notify = async (recipient: any, title: string, message: string, extra: Record<string, any> = {}) => {
    const recipientAuthUid = authUidOf(recipient);
    if (!recipient?.id) return;
    const id = `notif-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.collection('notifications').doc(id).set({
      id,
      userId: recipient.id,
      recipientAuthUid: recipientAuthUid || null,
      senderAuthUid: 'system',
      category: 'personal',
      title,
      message,
      type: extra.type || 'chat_message',
      createdAt: nowIso(),
      read: false,
      ...extra,
    });
  };

  // 找或建立專家與客戶的一對一對話
  const findOrCreateConversation = async (expert: any, client: any, questionId?: string, questionTitle?: string) => {
    const snap = await db.collection('conversations').where('participantIds', 'array-contains', expert.id).get();
    const existing = snap.docs.find((d) => {
      const c = d.data() as any;
      return !c.isGroup && Array.isArray(c.participantIds) && c.participantIds.includes(client.id);
    });
    if (existing) return existing.ref;
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ref = db.collection('conversations').doc(id);
    await ref.set({
      id,
      participantIds: [expert.id, client.id],
      participantAuthUids: [authUidOf(expert), authUidOf(client)].filter(Boolean),
      participantDetails: [
        { id: expert.id, name: expert.name || '專家', avatar: expert.avatar || '', title: expert.title || '專家' },
        { id: client.id, name: client.name || '客戶', avatar: client.avatar || '', title: client.title || '平台會員' },
      ],
      roleByUser: { [expert.id]: 'solver', [client.id]: 'questioner' },
      ...(questionId ? { relatedQuestionId: questionId, relatedQuestionTitle: questionTitle || '' } : {}),
      lastMessage: '',
      lastMessageTime: nowIso(),
      messages: [],
      createdAt: nowIso(),
    });
    return ref;
  };

  const appendMessage = async (ref: FirebaseFirestore.DocumentReference, message: any, summary: string) => {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.data() || {}) as any;
      const messages = Array.isArray(data.messages) ? data.messages : [];
      tx.set(
        ref,
        { messages: [...messages, message], lastMessage: summary, lastMessageTime: message.createdAt, updatedAt: nowIso() },
        { merge: true }
      );
    });
  };

  let repliesBudget = MAX_AUTO_REPLIES_PER_TICK;

  for (const expertDoc of expertsSnap.docs) {
    const expert = { id: expertDoc.id, ...(expertDoc.data() as any) };
    userCache.set(expert.id, expert);
    const config = expert.assistant24hrConfig || {};
    if (expert.isBlocked) continue;

    // ---------- 1. 到期的排程訊息 ----------
    try {
      const tasks: any[] = Array.isArray(config.scheduledTasks) ? config.scheduledTasks : [];
      let changed = false;
      const updatedTasks = [];
      for (const task of tasks) {
        if (task.status !== 'pending' || !task.autoExecute || !(Number(task.scheduledTimestamp) <= Date.now())) {
          updatedTasks.push(task);
          continue;
        }
        changed = true;
        const client = (await getUser(task.clientId)) || { id: task.clientId, name: task.clientName, avatar: task.clientAvatar };
        try {
          const ref = await findOrCreateConversation(expert, client, task.questionId, task.questionTitle);
          const text = `[24hr AI特助代操] ${task.messageTemplate}`;
          await appendMessage(
            ref,
            {
              id: `msg-sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              senderId: expert.id,
              senderName: `${expert.name || '專家'} 的 24hr AI 特助`,
              senderAvatar: expert.avatar || '',
              text,
              createdAt: nowIso(),
              isAiAssistant: true,
            },
            text.slice(0, 60)
          );
          await notify(client, `${expert.name || '專家'} 傳了訊息給你`, task.messageTemplate.slice(0, 80));
          updatedTasks.push({ ...task, status: 'completed', executedAt: nowIso(), executionResult: '已由 AI 特助於伺服器值班時自動送出' });
          result.scheduledSent++;
        } catch (err: any) {
          updatedTasks.push({ ...task, status: 'pending', executionResult: `送出失敗：${err?.message || err}` });
          result.errors.push(`scheduled:${task.id}`);
        }
      }
      if (changed) {
        await expertDoc.ref.update({ 'assistant24hrConfig.scheduledTasks': updatedTasks });
      }
    } catch (err: any) {
      result.errors.push(`tasks:${expert.id}:${err?.message || err}`);
    }

    // ---------- 2. 代回客戶訊息 ----------
    try {
      const offlineMs = Math.max(1, Number(config.offlineTriggerMinutes) || 20) * 60 * 1000;
      const dailyLimit = Number(config.dailyMessageLimitPerChat) || 30;
      const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
      const convSnap = await db.collection('conversations').where('participantIds', 'array-contains', expert.id).get();
      for (const convDoc of convSnap.docs) {
        if (repliesBudget <= 0) break;
        const conv = convDoc.data() as any;
        if (conv.isGroup) continue;
        const messages: any[] = Array.isArray(conv.messages) ? conv.messages : [];
        const last = messages[messages.length - 1];
        if (!last || last.senderId === expert.id || isAiOrSystem(last)) continue;
        const lastAt = msgTime(last);
        if (!lastAt || Date.now() - lastAt < offlineMs || Date.now() - lastAt > REPLY_WINDOW_MS) continue;
        const todayAiCount = messages.filter(
          (m) => m.senderId === expert.id && isAiOrSystem(m) && String(m.createdAt || '').slice(0, 10) === today
        ).length;
        if (todayAiCount >= dailyLimit) continue;

        const reply = await generateReply({
          solverName: expert.name,
          solverTitle: expert.title,
          tone: config.tone,
          toneDescription: config.toneDescription,
          faqList: config.faqList,
          customPrompts: config.customPrompts,
          requireHumanApprovalForDeals: config.requireHumanApprovalForDeals !== false,
          enableConfidentialityFirewall: config.enableConfidentialityFirewall !== false,
          conversationHistory: messages.slice(-8).map((m) => ({
            senderName: m.senderName,
            text: m.text,
            isSelf: m.senderId === expert.id,
          })),
          latestMessage: last.text,
        });
        const replyText = String(reply?.data?.replyText || '').trim();
        if (!replyText) continue;
        await appendMessage(
          convDoc.ref,
          {
            id: `msg-assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: expert.id,
            senderName: `${expert.name || '專家'} 的 24hr AI 特助`,
            senderAvatar: expert.avatar || '',
            text: replyText,
            createdAt: nowIso(),
            isAiAssistant: true,
          },
          `[24hr AI特助代答] ${replyText.slice(0, 30)}...`
        );
        repliesBudget--;
        result.autoReplies++;
        const clientName = last.senderName || '客戶';
        const need = reply?.data?.identifiedNeed ? `需求摘要：${reply.data.identifiedNeed}` : '';
        await notify(
          expert,
          `AI 特助已代你回覆 ${clientName}`,
          `${clientName}：「${String(last.text || '').slice(0, 40)}」${need ? `\n${need}` : ''}${reply?.data?.shouldHandoverToHuman ? '\n建議你親自接手這段對話。' : ''}`,
          { linkChatId: convDoc.id }
        );
        await expertDoc.ref.update({
          'assistant24hrConfig.totalAssistedCount': FieldValue.increment(1),
          'assistant24hrConfig.lastActiveAt': nowIso(),
        });
      }
    } catch (err: any) {
      result.errors.push(`reply:${expert.id}:${err?.message || err}`);
    }

    // ---------- 3. AI-CRM 巡檢 ----------
    try {
      if (crmConfig && crmConfig.isEnabled === false) continue;
      const intervalMs = getScanIntervalHours(crmConfig, now) * 3600 * 1000;
      const lastScanAt = Date.parse(expert.aiCrmLastScanAt || '') || 0;
      if (Date.now() - lastScanAt < intervalMs) continue;
      result.crmScans++;
      const since = lastScanAt || Date.now() - 24 * 3600 * 1000;
      const domains = new Set<string>([expert.domain, ...(expert.domains || [])].filter(Boolean));
      const skills = new Set<string>([...(expert.skills || []), ...(expert.subdomains || []), expert.subdomain].filter(Boolean).map(String));
      const qSnap = await db
        .collection('questions')
        .where('createdAt', '>=', new Date(since).toISOString())
        .limit(200)
        .get();
      const matches = qSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((q) => q.status === 'open' && q.authorId !== expert.id)
        .filter((q) => {
          if (domains.size === 0 && skills.size === 0) return Number(q.bounty) > 0;
          if (domains.has(q.category)) return true;
          const tags = [...(q.tags || []), q.subcategory, ...(q.subcategories || [])].filter(Boolean).map(String);
          return tags.some((t) => skills.has(t));
        })
        .sort((a, b) => (Number(b.bounty) || 0) - (Number(a.bounty) || 0))
        .slice(0, 5);
      if (matches.length > 0) {
        result.crmMatches += matches.length;
        const list = matches.map((q) => `・${q.title}${Number(q.bounty) > 0 ? `（懸賞 ${q.bounty} 點）` : ''}`).join('\n');
        await notify(expert, `AI-CRM 巡檢：發現 ${matches.length} 個適合你的新案件`, list, {
          type: 'ai_match',
          category: 'system',
          linkQuestionId: matches[0].id,
        });
      }
      await expertDoc.ref.update({ aiCrmLastScanAt: nowIso(), aiCrmLastScanMatches: matches.length });
    } catch (err: any) {
      result.errors.push(`crm:${expert.id}:${err?.message || err}`);
    }
  }

  result.durationMs = Date.now() - started;
  return result;
}

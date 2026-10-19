import { getAuthHeaders } from './authHeader';

/** 吉祥物：提問（伺服器以內建 AI 分流給三個 Dify 助理）與互動統計 */
export type MascotAgent = 'cs' | 'market_advisor' | 'aicrm';

const VISITOR_KEY = 'ideax_mascot_visitor';
export function mascotVisitorId(): string {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return 'guest';
  }
}

/** 先問伺服器這題要轉接給哪位助理（很快，用來顯示「正在轉接…職稱」） */
export type MascotRoute = { outOfScope: false; agent: MascotAgent; agentLabel: string; available: boolean } | { outOfScope: true; reply: string };
export async function routeMascot(message: string): Promise<MascotRoute | null> {
  try {
    const res = await fetch('/api/mascot/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) return null;
    if (data.outOfScope) return { outOfScope: true, reply: String(data.reply || '') };
    return { outOfScope: false, agent: data.agent, agentLabel: data.agentLabel, available: data.available !== false };
  } catch {
    return null;
  }
}

export async function askMascot(
  message: string,
  conversationIds: Partial<Record<MascotAgent, string>>,
  agent?: MascotAgent
): Promise<{ ok: true; reply: string; agent?: MascotAgent; agentLabel?: string; conversationId?: string; source?: string } | { ok: false; error: string; timedOut?: boolean }> {
  // 伺服器最多等助理 3 分鐘＋小燈泡代答，前端最多等 5 分鐘
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300000);
  try {
    const res = await fetch('/api/mascot/ask', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationIds, agent, visitorId: mascotVisitorId() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) return { ok: false, error: data.error || (res.status === 429 ? '問得太快了，休息一下再問我～' : '暫時無法回答，請稍後再試') };
    return { ok: true, reply: data.reply, agent: data.agent, agentLabel: data.agentLabel, conversationId: data.conversationId, source: data.source };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { ok: false, error: '這個問題小燈泡還要回去研究研究！很抱歉讓你都那麼久~', timedOut: true };
    return { ok: false, error: '連線不穩，請稍後再試' };
  } finally {
    clearTimeout(timer);
  }
}

export type MascotEventType = 'impression' | 'click' | 'drag' | 'open' | 'collapse' | 'expand' | 'session' | 'sad' | 'comfort' | 'unanswered';
export function trackMascotEvent(type: MascotEventType, durationMs?: number) {
  try {
    const body = JSON.stringify({ type, durationMs });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/mascot/event', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/mascot/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {}
}

export interface MascotDayStats {
  day: string;
  counts: Partial<Record<MascotEventType | 'ask', number>>;
  agents: Partial<Record<MascotAgent, number>>;
  interactionMs: number;
}

export async function fetchMascotStats(days = 14): Promise<MascotDayStats[] | null> {
  try {
    const res = await fetch(`/api/admin/mascot-stats?days=${days}`, { headers: await getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success ? data.days : null;
  } catch {
    return null;
  }
}

/** 後台轉接檢查（管理員） */
export interface MascotAgentCheck {
  agent: MascotAgent;
  label: string;
  envName: string | null;
  configured: boolean;
  keyTail: string | null;
  difyAppName: string | null;
  nameLooksRight: boolean | null;
  sharedWith: string[];
}
export async function fetchMascotAgentCheck(): Promise<MascotAgentCheck[] | null> {
  try {
    const res = await fetch('/api/admin/mascot-agents', { headers: await getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success ? data.agents : null;
  } catch {
    return null;
  }
}
export async function testMascotRoute(message: string, ask: boolean): Promise<any> {
  try {
    const res = await fetch('/api/admin/mascot-route-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ message, ask }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success ? data : { error: data.error || '測試失敗' };
  } catch {
    return { error: '連線失敗' };
  }
}

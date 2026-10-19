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

export async function askMascot(
  message: string,
  conversationIds: Partial<Record<MascotAgent, string>>
): Promise<{ ok: true; reply: string; agent: MascotAgent; agentLabel: string; conversationId?: string } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/mascot/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationIds, visitorId: mascotVisitorId() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) return { ok: false, error: data.error || (res.status === 429 ? '問得太快了，休息一下再問我～' : '暫時無法回答，請稍後再試') };
    return { ok: true, reply: data.reply, agent: data.agent, agentLabel: data.agentLabel, conversationId: data.conversationId };
  } catch {
    return { ok: false, error: '連線不穩，請稍後再試' };
  }
}

export function trackMascotEvent(type: 'impression' | 'click' | 'drag' | 'open' | 'collapse' | 'expand' | 'session', durationMs?: number) {
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
  counts: Partial<Record<'impression' | 'click' | 'drag' | 'open' | 'ask' | 'collapse' | 'expand' | 'session', number>>;
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

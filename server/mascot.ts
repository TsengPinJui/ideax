/**
 * 網站吉祥物：提問分流（內建 AI 判斷類型 → 轉給三個 Dify 助理）與互動統計
 */
import { getApps } from 'firebase-admin/app';
import firebaseConfigJson from '../firebase-applet-config.json';
import { hasAdminCredentials } from './competitionService';

export type MascotAgent = 'cs' | 'market_advisor' | 'aicrm';

export const MASCOT_AGENTS: Record<MascotAgent, { label: string; envKeys: string[]; persona: string }> = {
  cs: {
    label: '官方客服特助',
    envKeys: ['DIFY_CS_API_KEY', 'DIFY_API_KEY'],
    persona: '你是「創點子 IdeaX」官方客服特助，負責帳號、登入、點數、付款、發布規則、平台操作等客服問題。回答簡潔、友善、具體。',
  },
  market_advisor: {
    label: '市場顧問',
    envKeys: ['DIFY_MARKET_ADVISOR_API_KEY'],
    persona: '你是「創點子 IdeaX」市場顧問，協助使用者探索有興趣的主題、釐清問題、建議要找哪個領域的專家、怎麼在平台上發問或提案。',
  },
  aicrm: {
    label: '業務顧問',
    envKeys: ['DIFY_AICRM_API_KEY', 'DIFY_API_KEY'],
    persona: '你是「創點子 IdeaX」業務顧問，負責會員方案、企業合作、成為專家、創星季參賽與商務洽詢。回答清楚並引導下一步。',
  },
};

const KEYWORDS: Array<[MascotAgent, RegExp]> = [
  ['cs', /登入|登錄|密碼|帳號|註冊|驗證|點數|儲值|退款|付款|扣款|發票|錯誤|無法|不能|bug|客服|檢舉|停權|刪除|隱私/i],
  ['aicrm', /方案|訂閱|會員|價格|收費|合作|企業|廠商|贊助|專家申請|成為專家|認證|創星季|參賽|報名|商務|洽談/i],
];

function keywordRoute(message: string): MascotAgent {
  for (const [agent, re] of KEYWORDS) if (re.test(message)) return agent;
  return 'market_advisor';
}

/** 內建 AI 判斷問題類型（逾時或失敗時改用關鍵字判斷） */
export async function classifyMascotQuestion(
  message: string,
  generateText: (prompt: string, system?: string) => Promise<string | null>
): Promise<{ agent: MascotAgent; by: 'ai' | 'keyword' }> {
  const prompt = `請判斷以下使用者訊息該交給哪一位助理處理，只回答一個代碼：
cs = 客服問題（帳號、登入、點數、付款、平台操作、錯誤回報、檢舉）
aicrm = 商務與會員（會員方案、價格、企業合作、成為專家、創星季參賽報名）
market_advisor = 主題探索與問題諮詢（對什麼主題有興趣、想解決什麼問題、找專家、怎麼發問或提案、其他一般問題）

使用者訊息：「${message.slice(0, 500)}」`;
  try {
    const text = await Promise.race([
      generateText(prompt, '你是分流器，只輸出 cs、aicrm 或 market_advisor 其中一個代碼，不要輸出其他文字。'),
      new Promise<null>((r) => setTimeout(() => r(null), 6000)),
    ]);
    const m = String(text || '').toLowerCase().match(/market_advisor|aicrm|cs/);
    if (m) return { agent: m[0] as MascotAgent, by: 'ai' };
  } catch {}
  return { agent: keywordRoute(message), by: 'keyword' };
}

export function mascotAgentKey(agent: MascotAgent): string {
  for (const k of MASCOT_AGENTS[agent].envKeys) {
    const v = process.env[k];
    if (v) return v;
  }
  return '';
}

// ───────────── 統計 ─────────────
const EVENT_TYPES = ['impression', 'click', 'drag', 'open', 'ask', 'collapse', 'expand', 'session'] as const;
export type MascotEventType = (typeof EVENT_TYPES)[number];

async function getDb() {
  if (!hasAdminCredentials) return null;
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = getApps()[0];
  const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
  return { db: dbId ? getFirestore(app, dbId) : getFirestore(app), FieldValue };
}

function twDay(d = new Date()): string {
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

export async function recordMascotEvent(input: { type: string; durationMs?: number; agent?: string; visitorId?: string }) {
  const type = String(input?.type || '') as MascotEventType;
  if (!EVENT_TYPES.includes(type)) return false;
  const conn = await getDb();
  if (!conn) return false;
  const { db, FieldValue } = conn;
  const patch: Record<string, any> = { [`counts.${type}`]: FieldValue.increment(1), updatedAt: new Date().toISOString() };
  if (type === 'session') {
    const ms = Math.max(0, Math.min(30 * 60 * 1000, Math.floor(Number(input.durationMs) || 0)));
    patch.interactionMs = FieldValue.increment(ms);
  }
  if (type === 'ask' && input.agent && input.agent in MASCOT_AGENTS) {
    patch[`agents.${input.agent}`] = FieldValue.increment(1);
  }
  await db.collection('mascot_stats').doc(twDay()).set({ day: twDay() }, { merge: true });
  await db.collection('mascot_stats').doc(twDay()).update(patch);
  return true;
}

export async function getMascotStats(days = 14) {
  const conn = await getDb();
  if (!conn) return { days: [] };
  const { db } = conn;
  const n = Math.max(1, Math.min(90, Math.floor(days)));
  const ids: string[] = [];
  for (let i = n - 1; i >= 0; i--) ids.push(twDay(new Date(Date.now() - i * 86400000)));
  const snaps = await db.getAll(...ids.map((id) => db.collection('mascot_stats').doc(id)));
  return {
    days: snaps.map((s: any, i: number) => {
      const d = s.exists ? s.data() || {} : {};
      return { day: ids[i], counts: d.counts || {}, agents: d.agents || {}, interactionMs: d.interactionMs || 0 };
    }),
  };
}

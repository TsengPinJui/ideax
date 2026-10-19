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
    persona: '你是「創點子 IdeaX」官方客服特助，負責帳號／帳戶、登入、個人資料、點數儲值與撥款、懸賞分級規則、退款與爭議申訴、會員方案、成為專家、創星季報名、平台操作與錯誤回報等問題。回答簡潔、友善、具體；不確定的資訊請引導聯繫 support@ideax.tw，不要捏造。',
  },
  market_advisor: {
    label: '市場顧問',
    envKeys: ['DIFY_MARKET_ADVISOR_API_KEY'],
    persona: '你是「創點子 IdeaX」市場顧問，負責題目分類與價值分級（L0～L4）、建議懸賞與標籤、媒合推薦合適的專家、深度問題分析報告，以及合約履約爭議的調解建議。語氣客觀專業。',
  },
  aicrm: {
    label: '業務顧問',
    envKeys: ['DIFY_AICRM_API_KEY', 'DIFY_API_KEY'],
    persona: '你是「創點子 IdeaX」業務顧問（AI-CRM 特助），協助認證專家找高價值案子與懸賞好題、評估發案方成案意向、試算實收淨利、規劃提案切入方式與跟進時段、撰寫破冰話術。不誇大保證獲利。',
  },
};

/**
 * 關鍵字分流（依三位助理的實際職責）：
 * - 官方客服特助：帳號帳戶、登入、點數儲值與撥款、懸賞分級規則、退款與爭議工單、會員方案、成為專家、創星季報名、平台操作與錯誤（也是預設）
 * - 市場顧問：幫使用者的題目分類與建議懸賞、找專家媒合、分析報告、履約個案的調解和解建議
 * - 業務顧問：專家找案子、高賞好題、成案意向、實收試算、破冰話術與跟進
 */
const KEYWORDS: Record<MascotAgent, RegExp> = {
  cs: /登入|登錄|登出|密碼|帳號|帳戶|账户|账号|個人資料|頭像|暱稱|綁定|手機號|信箱|e-?mail|註冊|驗證|實名|點數|儲值|加值|退費|退款|付款|扣款|刷卡|發票|提領|出金|匯款|撥款|放款|驗收|方案|訂閱|會員|價格|費用|收費|抽成|手續費|懸賞規則|分級|\bL[0-4]\b|成為專家|專家認證|申請專家|專家申請|創星季|參賽|報名|規則|條款|怎麼用|如何使用|操作|教學|刪文|通知|錯誤|bug|當機|閃退|無法|不能|打不開|客服|工單|爭議|糾紛|檢舉|詐騙|停權|封鎖|隱私|個資/i,
  market_advisor: /找.{0,15}專家|推薦.{0,10}專家|專家推薦|合適的專家|適合的專家|媒合|獵頭|延攬|誰能解|誰可以幫|幫我分類|分類一下|歸類|標籤|題目價值|值多少|建議懸賞|懸賞多少|該定多少|定多少|分析報告|深度報告|診斷|調解建議|和解方案|需求蔓延|履約|市場分析|市場趨勢|有興趣|主題/i,
  aicrm: /接案|找案子|案源|商機|好題|高賞|高額懸賞|適合我.*題|推薦.*(題目|案子)|成案|意向|破冰|話術|跟進|追蹤客戶|客戶猶豫|發案方|實收|淨利|收益|來賺|賺錢|代操|拓客|潛在客戶|提案切入|切入方針/i,
};

function keywordMatches(message: string): MascotAgent[] {
  return (Object.keys(KEYWORDS) as MascotAgent[]).filter((a) => KEYWORDS[a].test(message));
}

/** 解析分流器輸出：只認完整代碼，避免說明文字裡順帶出現其他代碼而誤判 */
function parseAgent(text: string | null | undefined): MascotAgent | null {
  const t = String(text || '').trim().toLowerCase();
  const m = t.match(/\b(market_advisor|aicrm|cs)\b/);
  return m ? (m[1] as MascotAgent) : null;
}

/**
 * 判斷要轉接哪位助理：
 * 1. 只命中一類關鍵字 → 直接轉接（快又穩，例如「帳戶」一定找客服）
 * 2. 命中多類或都沒命中 → 交給內建 AI 判斷
 * 3. AI 逾時或失敗 → 命中多類時依序取客服 > 市場 > 業務；都沒命中則由客服接手
 */
export async function classifyMascotQuestion(
  message: string,
  generateText: (prompt: string, system?: string) => Promise<string | null>
): Promise<{ agent: MascotAgent; by: 'keyword' | 'ai' | 'default' }> {
  const hits = keywordMatches(message);
  if (hits.length === 1) return { agent: hits[0], by: 'keyword' };
  const prompt = `請判斷以下使用者訊息該交給哪一位助理處理，只回答一個代碼：
cs = 官方客服特助：帳號／帳戶、登入、個人資料、點數儲值、撥款與提領、付款發票、懸賞分級（L0～L4）規則、退款與爭議申訴、專人工單、會員方案與費用、成為專家、創星季報名、平台規則與操作、錯誤回報、檢舉，以及其他一般問題
market_advisor = 市場顧問：幫使用者自己的題目做分類、評估價值並建議懸賞與標籤、尋找或推薦合適的專家、深度問題分析報告、針對履約個案提出調解與和解建議
aicrm = 業務顧問（給專家用）：找案子與高賞好題、評估發案方成案意向、實收淨利試算、提案切入方式、跟進時段與破冰話術

使用者訊息：「${message.slice(0, 500)}」`;
  try {
    const text = await Promise.race([
      generateText(prompt, '你是分流器，只輸出 cs、market_advisor 或 aicrm 其中一個代碼，不要輸出其他文字。'),
      new Promise<null>((r) => setTimeout(() => r(null), 6000)),
    ]);
    const agent = parseAgent(text);
    if (agent && (!hits.length || hits.includes(agent))) return { agent, by: 'ai' };
  } catch {}
  for (const a of ['cs', 'market_advisor', 'aicrm'] as const) if (hits.includes(a)) return { agent: a, by: 'keyword' };
  return { agent: 'cs', by: 'default' };
}

export function mascotAgentKey(agent: MascotAgent): string {
  for (const k of MASCOT_AGENTS[agent].envKeys) {
    const v = process.env[k];
    if (v) return v;
  }
  return '';
}

// ───────────── 統計 ─────────────
const EVENT_TYPES = ['impression', 'click', 'drag', 'open', 'ask', 'collapse', 'expand', 'session', 'sad', 'comfort'] as const;
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

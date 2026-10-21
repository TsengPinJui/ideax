/**
 * 網站吉祥物：提問分流（內建 AI 判斷類型 → 轉給三個 Dify 助理）與互動統計
 */
import { getApps } from 'firebase-admin/app';
import firebaseConfigJson from '../firebase-applet-config.json';
import { hasAdminCredentials } from './competitionService';

export type MascotAgent = 'cs' | 'market_advisor' | 'aicrm' | 'explorer';

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
    envKeys: ['DIFY_AICRM_API_KEY'], // 沒設定就由小燈泡（Gemini）代答，不借用客服的金鑰
    persona: '你是「創點子 IdeaX」業務顧問（AI-CRM 特助），協助認證專家找高價值案子與懸賞好題、評估發案方成案意向、試算實收淨利、規劃提案切入方式與跟進時段、撰寫破冰話術。不誇大保證獲利。',
  },
  explorer: {
    label: '探險家',
    envKeys: ['DIFY_EXPLORER_API_KEY', 'DIFY_JOB_EXPLORER_API_KEY', 'DIFY_EXPLORER_WEB_URL'],
    persona: '你是「創點子 IdeaX」匯職缺 AI 特助「探險家」，專門在「匯職缺」頁面協助求職者以自然語言分析最在意的求職條件（薪資、地點、經歷、學歷、行業、工作環境、其他待遇），並結合全網搜尋媒合適合職位。',
  },
};

export const DEFAULT_EXPLORER_UDIFY_URL = 'https://udify.app/agent/bEV82Byu5zk9O4Q5';

export function extractUdifyAppCode(keyOrUrl: string): string | null {
  const s = String(keyOrUrl || '').trim();
  if (!s || s.startsWith('app-')) return null;
  const m = s.match(/udify\.app\/(?:agent|chat|workflow)\/([A-Za-z0-9_-]+)/i);
  if (m && m[1]) return m[1];
  if (/^[A-Za-z0-9]{12,24}$/.test(s)) return s;
  return null;
}

/**
 * 關鍵字分流（依三位助理的實際職責）：
 * - 官方客服特助：帳號帳戶、登入、點數儲值與撥款、懸賞分級規則、退款與爭議工單、會員方案、成為專家、創星季報名、平台操作與錯誤（也是預設）
 * - 市場顧問：幫使用者的題目分類與建議懸賞、找專家媒合、分析報告、履約個案的調解和解建議
 * - 業務顧問：專家找案子、高賞好題、成案意向、實收試算、破冰話術與跟進
 */
const KEYWORDS: Record<MascotAgent, RegExp> = {
  cs: /登入|登錄|登出|密碼|帳號|帳戶|账户|账号|個人資料|頭像|暱稱|綁定|手機號|信箱|e-?mail|註冊|驗證|實名|點數|儲值|加值|退費|退款|付款|扣款|刷卡|發票|提領|出金|匯款|撥款|放款|驗收|方案|訂閱|會員|價格|費用|收費|抽成|手續費|懸賞規則|分級|\bL[0-4]\b|成為專家|專家認證|申請專家|專家申請|創星季|參賽|報名|規則|條款|怎麼用|如何使用|操作|教學|刪文|通知|錯誤|bug|當機|閃退|無法|不能|打不開|客服|工單|爭議|糾紛|檢舉|詐騙|停權|封鎖|隱私|個資/i,
  market_advisor: /找.{0,15}專家|推薦.{0,10}專家|專家推薦|合適的專家|適合的專家|媒合|獵頭|延攬|誰能解|誰可以幫|幫我分類|分類一下|歸類|標籤|題目價值|值多少|建議懸賞|懸賞多少|該定多少|定多少|分析報告|深度報告|診斷|調解建議|和解方案|需求蔓延|履約|市場分析|市場趨勢/i,
  aicrm: /接案|找案子|案源|商機|好題|高賞|高額懸賞|適合我.*題|推薦.*(題目|案子)|成案|意向|破冰|話術|跟進|追蹤客戶|客戶猶豫|發案方|實收|淨利|收益|來賺|賺錢|代操|拓客|潛在客戶|提案切入|切入方針/i,
  explorer: /匯職缺|全網搜職|探險家/i,
};

function keywordMatches(message: string): MascotAgent[] {
  return (Object.keys(KEYWORDS) as MascotAgent[]).filter((a) => KEYWORDS[a].test(message));
}

/** 解析分流器輸出：只認完整代碼，避免說明文字裡順帶出現其他代碼而誤判 */
function parseAgent(text: string | null | undefined): MascotAgent | 'none' | null {
  const t = String(text || '').trim().toLowerCase();
  const m = t.match(/\b(market_advisor|aicrm|cs|none)\b/);
  return m ? (m[1] as MascotAgent | 'none') : null;
}

/** 三位助理都不負責的問題：固定回覆，不讓任何 AI 隨意作答 */
export const MASCOT_OUT_OF_SCOPE_REPLY = '這個問題我還暫時無法回答喔~小燈泡將持續學習！';

/** 客戶管理、找案子這類問題：小燈泡介紹 007 並帶路到 AI-CRM 頁（只介紹與帶路，不透過對話框啟動付費功能） */
export const MASCOT_REFER_007_REPLY = '這題要找我們的 007！🤖 他是 AI CRM Agent，身上有雷達、軍師、特助三件法寶：巡航找案子、分析成案意向、幫你管理跟進任務。點下面的按鈕，我帶你去 007 的基地～';
export const MASCOT_REFER_007_ACTIONS = [{ label: '帶我去找 007', to: 'ai_crm' }];
/** 等了很久、小燈泡也無法代答時的道歉文字 */
export const MASCOT_APOLOGY_REPLY = '這個問題小燈泡還要回去研究研究！很抱歉讓你都那麼久~';
/** 等助理多久後改由小燈泡代答（前端提示的時間點要一致） */
export const MASCOT_AGENT_WAIT_MS = 180000;

/**
 * 小燈泡代答（助理超過三分鐘沒回或出錯時）：
 * 只能根據下面的平台基本規則回答；涉及帳戶狀態、餘額、訂單、個人資料、或規則裡沒寫的事，一律回 CANNOT_ANSWER，
 * 由前端顯示道歉文字，避免隨意回答。
 */
const PROXY_FACTS = `IdeaX 創點子平台基本規則（以網站最新公告為準）：
- 痛點可免費提出，提問者不用預付；專家可自訂金額交付解法，其他有相同痛點的人可付費解鎖。
- 懸賞分級：L0 免費交流 0 點；L1 基礎懸賞 100～300 點；L2 進階懸賞 301～899 點；L3 高階挑戰 900～2,999 點；L4 企業級顧問 3,000 點以上。平台沒有「每次提問扣 10 點」的規則。
- 金流：發案時資金由第三方金流託管預扣；提問者驗收並點「採納放款」後進入 7 日交易猶豫期；平台每月 5 號把上月收益匯到專家實名帳戶。
- 徵件期限到了沒有專家投標，點數全額退回提問者錢包。
- 退款：交付檔案損毀且 48 小時內未補正、全文惡意抄襲、或約定的視訊會談無故缺席，提問方可申請全額退款。
- 退款糾紛、詐騙檢舉或複雜個案可開立「專人工單」，審查專員會在 3 個工作天內調查並回覆。
- 隱私：實名認證證件照片審核後即永久銷毀；聊天室圖片 7 日後清除；帳號註銷有 7 日反悔期；付費會員等級不會在公開頁面顯示。
- 官方客服信箱 support@ideax.tw，服務時間平日 09:30～18:30。`;

/** 各助理代答時可以做的事（依三位助理的實際定位），以及不能捏造的範圍 */
const PROXY_ROLES: Record<MascotAgent, { can: string }> = {
  cs: {
    can: '回答平台規則、點數與懸賞分級、撥款與退款規則、隱私、會員與一般操作問題，並安撫使用者情緒、引導開立專人工單。',
  },
  market_advisor: {
    can: '依使用者描述的題目，建議主領域（創新創業／專業問題／學術探討／日常疑難）、價值分級（L0～L4）與合理懸賞範圍、3～5 個標籤；針對履約糾紛提供客觀的調解思路（例如比例折讓結案或限期補正驗收）。',
  },
  aicrm: {
    can: '協助專家試算實收（權威方案平台服務費 5%、實收 95%；大師方案服務費 2%、實收 98%；一般抽成 25%）、建議提案切入方式（先對焦關鍵痛點→提出架構與里程碑→說明交付清單與驗收）、建議跟進時段（上午 10:00～11:30、午後 14:30～16:00、晚間 19:30～21:00）、提供破冰話術方向。不可保證獲利。',
  },
  explorer: {
    can: '引導使用者前往「匯職缺」頁面使用「探險家」搜尋職缺，小燈泡本身不提供工作建議。',
  },
};

export async function proxyAnswerWithGemini(
  message: string,
  agent: MascotAgent,
  generateText: (prompt: string, system?: string) => Promise<string | null>,
  timeoutMs = 90000
): Promise<string | null> {
  const label = MASCOT_AGENTS[agent].label;
  const system = `你是 IdeaX 創點子的吉祥物「小燈泡」。${label}暫時無法回覆，你要代替${label}回答使用者。
你可以做的事：${PROXY_ROLES[agent].can}
規則：
1. 平台規則只能依據下方提供的資料，不可自行編造規則、數字或功能。
2. 不可捏造任何具體的專家姓名、題目、案件、使用者帳戶狀態、餘額、訂單或交易紀錄；需要查資料才能回答、涉及使用者個人帳戶，或需要人工處理（例如退款核准、帳號解鎖）的問題，一律只輸出 CANNOT_ANSWER。
3. 與 IdeaX 平台、提問解題、找專家、接案無關的問題，只輸出 CANNOT_ANSWER。
4. 可以回答時，用繁體中文、親切口語、200 字以內，結尾提醒「詳細以網站公告為準，也可以寫信到 support@ideax.tw」。
${PROXY_FACTS}`;
  try {
    const text = await Promise.race([
      generateText(`使用者的問題：「${message.slice(0, 600)}」`, system),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    const t = String(text || '').trim();
    if (!t || /CANNOT_ANSWER/i.test(t)) return null;
    return t;
  } catch {
    return null;
  }
}

/** 助理回覆只是一句「答不出來」時，改用固定回覆；有附上指引（例如客服信箱）的較長回覆照常保留 */
export function normalizeAgentReply(reply: string): { reply: string; unanswered: boolean } {
  const t = String(reply || '').trim();
  if (!t) return { reply: MASCOT_OUT_OF_SCOPE_REPLY, unanswered: true };
  const refusal = /無法回答|無法提供|無法協助|不在.{0,8}(服務|回答)?範圍|超出.{0,8}範圍|沒有相關資(訊|料)|查無相關|我不清楚|我不知道|不確定答案/;
  const hasGuidance = /support@|工單|客服|聯繫|聯絡|信箱|建議您|可以(先)?(到|至|前往)/.test(t);
  if (t.length <= 80 && refusal.test(t) && !hasGuidance) return { reply: MASCOT_OUT_OF_SCOPE_REPLY, unanswered: true };
  return { reply: t, unanswered: false };
}

/**
 * 判斷要轉接哪位助理：
 * 1. 只命中一類關鍵字 → 直接轉接（快又穩，例如「帳戶」一定找客服）
 * 2. 命中多類或都沒命中 → 交給內建 AI 判斷
 * 3. 都沒命中且 AI 判斷為三位助理都不負責（none）→ 不轉接，直接回固定文字
 * 4. AI 逾時或失敗 → 命中多類時依序取客服 > 市場 > 業務；都沒命中則由客服接手（客服設定為不捏造）
 */
export async function classifyMascotQuestion(
  message: string,
  generateText: (prompt: string, system?: string) => Promise<string | null>
): Promise<{ agent: MascotAgent | 'none'; by: 'keyword' | 'ai' | 'default' }> {
  const hits = keywordMatches(message);
  if (hits.length === 1) return { agent: hits[0], by: 'keyword' };
  const prompt = `請判斷以下使用者訊息該交給哪一位助理處理，只回答一個代碼：
cs = 官方客服特助：帳號／帳戶、登入、個人資料、點數儲值、撥款與提領、付款發票、懸賞分級（L0～L4）規則、退款與爭議申訴、專人工單、會員方案與費用、成為專家、創星季報名、平台規則與操作、錯誤回報、檢舉，以及其他一般問題
market_advisor = 市場顧問：幫使用者自己的題目做分類、評估價值並建議懸賞與標籤、尋找或推薦合適的專家、深度問題分析報告、針對履約個案提出調解與和解建議
aicrm = 業務顧問（給專家用）：找案子與高賞好題、評估發案方成案意向、實收淨利試算、提案切入方式、跟進時段與破冰話術
none = 與 IdeaX 平台、提問解題、找專家、接案完全無關的問題（例如天氣、新聞、股價、閒聊八卦、代寫作業或程式、醫療或法律個人諮詢、其他網站的問題）。打招呼或詢問 IdeaX 是什麼請回 cs，只有明確無關時才回 none

使用者訊息：「${message.slice(0, 500)}」`;
  try {
    const text = await Promise.race([
      generateText(prompt, '你是分流器，只輸出 cs、market_advisor、aicrm 或 none 其中一個代碼，不要輸出其他文字。'),
      new Promise<null>((r) => setTimeout(() => r(null), 6000)),
    ]);
    const agent = parseAgent(text);
    if (agent === 'none' && !hits.length) return { agent: 'none', by: 'ai' };
    if (agent && agent !== 'none' && (!hits.length || hits.includes(agent))) return { agent, by: 'ai' };
  } catch {}
  for (const a of ['cs', 'market_advisor', 'aicrm'] as const) if (hits.includes(a)) return { agent: a, by: 'keyword' };
  return { agent: 'cs', by: 'default' };
}

/**
 * 小燈泡先判斷、再轉接：
 * - mascot：小燈泡自己回答（輕鬆聊天、平台基本規則就答得出來的簡單問題）；答不出來時 escalateTo 指定要轉給誰
 * - market_advisor：題目分類、懸賞建議、調解等需要專業處理的，直接轉市場顧問
 * - none：與平台無關、需要真實資料的問題（新聞、股價、醫療法律、代寫作業…），不隨意回答
 */
const CHAT_RE = /^(你好|您好|妳好|嗨|哈囉|安安|hi|hello|hey|yo|早安|午安|晚安|早|謝謝|感謝|謝啦|掰掰|再見|bye)|你是誰|妳是誰|你叫什麼|你幾歲|你住(在)?哪|你(好|很|真)可愛|好可愛|陪我聊|聊聊天|聊天|好無聊|無聊|哈哈|笑死|我好累|好累|加油|心情|你會什麼|你可以做什麼|你喜歡/i;
export async function planMascotRoute(
  message: string,
  generateText: (prompt: string, system?: string) => Promise<string | null>
): Promise<{ agent: 'mascot' | 'market_advisor' | 'none' | 'refer_007'; escalateTo: 'cs' | null; by: string }> {
  const hits = keywordMatches(message);
  // 只命中業務類（找案子、成案意向、跟進…）：小燈泡介紹 007，帶到 AI-CRM 頁自己操作
  if (hits.length === 1 && hits[0] === 'aicrm') return { agent: 'refer_007', escalateTo: null, by: 'keyword' };
  if (!hits.length && CHAT_RE.test(message)) return { agent: 'mascot', escalateTo: null, by: 'keyword' };
  if (hits.length === 1 && hits[0] === 'market_advisor') return { agent: 'market_advisor', escalateTo: null, by: 'keyword' };
  // 只有客服類關鍵字：小燈泡先試，答不了再轉客服；同時碰到市場顧問的關鍵字才交給 AI 判斷
  if (hits.length && !hits.includes('market_advisor')) return { agent: 'mascot', escalateTo: 'cs', by: 'keyword' };
  const prompt = `請判斷以下使用者訊息屬於哪一類，只回答一個代碼：
chat = 打招呼、閒聊、聊心情、問小燈泡自己的事
cs = 和 IdeaX 平台有關的問題（帳號、點數、懸賞、撥款、退款、會員、規則、操作、錯誤回報、一般平台疑問）
market_advisor = 請市場顧問處理：幫自己的題目分類、評估價值與建議懸賞、履約糾紛的調解建議
none = 與 IdeaX 無關、需要真實資料或專業判斷的問題（新聞、天氣、股價、醫療或法律個人諮詢、代寫作業或程式、其他網站）

使用者訊息：「${message.slice(0, 500)}」`;
  try {
    const text = await Promise.race([
      generateText(prompt, '你是分流器，只輸出 chat、cs、market_advisor 或 none 其中一個代碼，不要輸出其他文字。'),
      new Promise<null>((r) => setTimeout(() => r(null), 6000)),
    ]);
    const m = String(text || '').trim().toLowerCase().match(/\b(market_advisor|chat|cs|none)\b/);
    if (m) {
      if (m[1] === 'chat') return { agent: 'mascot', escalateTo: null, by: 'ai' };
      if (m[1] === 'cs') return { agent: 'mascot', escalateTo: 'cs', by: 'ai' };
      if (m[1] === 'market_advisor') return { agent: 'market_advisor', escalateTo: null, by: 'ai' };
      return { agent: 'none', escalateTo: null, by: 'ai' };
    }
  } catch {}
  return { agent: 'mascot', escalateTo: 'cs', by: 'default' };
}

/** 小燈泡自己回答：輕鬆聊天，或平台基本規則就答得出來的簡單問題；其餘一律 CANNOT_ANSWER（交給客服或不回答） */
export async function mascotSelfAnswer(
  message: string,
  generateText: (prompt: string, system?: string) => Promise<string | null>,
  timeoutMs = 25000
): Promise<string | null> {
  const system = `你是 IdeaX 創點子平台的吉祥物「小燈泡」，一顆會發光的果凍燈泡，住在網站右下角。個性開朗、熱心、有點怕高，喜歡新點子，看到大家來找你會很開心。
你可以做兩件事：
1. 輕鬆聊天：打招呼、聊心情、鼓勵使用者、介紹自己（你是 IdeaX 的吉祥物，可以陪聊，也可以幫忙找對的 AI 助理）。
2. 回答平台的簡單問題：只能根據下方平台規則回答，規則裡有完整答案才回答。
規則：
- 需要查使用者自己的帳戶、點數、交易、訂單，需要人工處理，或下方規則沒有寫到的平台問題，只輸出 CANNOT_ANSWER（會交給官方客服）。
- 與 IdeaX 無關、需要真實資料或專業判斷的問題（新聞、天氣、股價、醫療、法律、代寫作業或程式），只輸出 CANNOT_ANSWER。
- 不可以捏造任何數字、規則、人名、案件或功能。
- 用繁體中文、親切口語，120 字以內，可以用 1 個表情符號。
${PROXY_FACTS}`;
  try {
    const text = await Promise.race([
      generateText(`使用者說：「${message.slice(0, 600)}」`, system),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    const t = String(text || '').trim();
    if (!t || /CANNOT_ANSWER/i.test(t)) return null;
    return t;
  } catch {
    return null;
  }
}

/** 這位助理實際用哪個環境變數的金鑰（給後台轉接檢查用，不回傳金鑰本身） */
export function mascotAgentKeyInfo(agent: MascotAgent): { envName: string | null; key: string } {
  for (const k of MASCOT_AGENTS[agent].envKeys) {
    const v = process.env[k];
    if (v) return { envName: k, key: v };
  }
  if (agent === 'explorer') {
    return { envName: 'DIFY_EXPLORER_WEB_URL', key: DEFAULT_EXPLORER_UDIFY_URL };
  }
  return { envName: null, key: '' };
}

/** 用金鑰或 udify Web URL 向 Dify 查這把金鑰屬於哪個應用（名稱），確認沒有接錯 */
export async function fetchDifyAppName(key: string): Promise<string | null> {
  if (!key) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);
  try {
    const udifyCode = extractUdifyAppCode(key);
    if (udifyCode) {
      const pRes = await fetch('https://udify.app/api/passport', {
        headers: { 'X-App-Code': udifyCode },
        signal: controller.signal,
      });
      if (!pRes.ok) return null;
      const pData: any = await pRes.json().catch(() => null);
      const token = pData?.access_token;
      if (!token) return null;
      const sRes = await fetch('https://udify.app/api/site', {
        headers: { 'X-App-Code': udifyCode, 'X-App-Passport': token },
        signal: controller.signal,
      });
      if (!sRes.ok) return null;
      const sData: any = await sRes.json().catch(() => null);
      const title = sData?.site?.title;
      return typeof title === 'string' && title ? title : null;
    }

    const base = (process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1').replace(/\/+$/, '');
    const r = await fetch(`${base}/info`, { headers: { Authorization: `Bearer ${key}` }, signal: controller.signal });
    if (!r.ok) return null;
    const d: any = await r.json().catch(() => null);
    return typeof d?.name === 'string' && d.name ? d.name : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** 應用名稱看起來是否對應到這位助理（只是提醒用的粗略判斷） */
export const MASCOT_AGENT_NAME_HINTS: Record<MascotAgent, RegExp> = {
  cs: /客服|support|service|\bcs\b/i,
  market_advisor: /市場|market|顧問|advisor/i,
  aicrm: /crm|業務|客情|商機|sales/i,
  explorer: /探險家|搜職|搜搜|求職|職缺|explorer|job/i,
};

export function mascotAgentKey(agent: MascotAgent): string {
  for (const k of MASCOT_AGENTS[agent].envKeys) {
    const v = process.env[k];
    if (v) return v;
  }
  if (agent === 'explorer') {
    return DEFAULT_EXPLORER_UDIFY_URL;
  }
  return '';
}

// ───────────── 統計 ─────────────
const EVENT_TYPES = ['impression', 'click', 'drag', 'open', 'ask', 'collapse', 'expand', 'session', 'sad', 'comfort', 'unanswered', 'chat_mascot', 'chat_agent', 'mascot_answered', 'escalated'] as const;
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
  if (type === 'session' || type === 'chat_mascot' || type === 'chat_agent') {
    const ms = Math.max(0, Math.min(30 * 60 * 1000, Math.floor(Number(input.durationMs) || 0)));
    // session：和吉祥物互動的時間；chat_mascot／chat_agent：對話框裡跟小燈泡聊／跟 AI 客服談的時間
    patch[type === 'session' ? 'interactionMs' : type === 'chat_mascot' ? 'chatMascotMs' : 'chatAgentMs'] = FieldValue.increment(ms);
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
      return { day: ids[i], counts: d.counts || {}, agents: d.agents || {}, interactionMs: d.interactionMs || 0, chatMascotMs: d.chatMascotMs || 0, chatAgentMs: d.chatAgentMs || 0 };
    }),
  };
}

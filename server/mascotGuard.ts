/**
 * 問問小燈泡的個資護欄（在轉接任何助理之前、以及回覆送出之前執行）：
 * 1. 詢問「別人」的帳戶、交易、聯絡方式等資料 → 直接婉拒，不轉接
 * 2. 詢問「自己」的帳目、點數、交易、訂單等資料 → 不讓 AI 回答，告訴他去哪裡自己查，或寫信給人工客服
 * 3. 問題裡的 Email、電話、身分證字號、銀行帳號 → 先遮掉再交給助理（無法驗證身分，不讓助理拿去查人）
 * 4. 助理或 Gemini 的回覆若出現上述資料 → 遮掉（官方信箱除外）
 * 5. 平台的付費功能（AI 獵頭、解鎖方案、深度分析報告、AI-CRM）不能透過小燈泡或任何 AI 免費使用：
 *    要求直接執行 → 說明是付費功能並告訴他在哪裡使用；只是問怎麼用、多少錢 → 照常交給客服說明
 * 6. AI-CRM（巡航、推薦您來賺、策略軍師、24hr 特助）是會員訂閱功能：一律不能從對話框使用，只提供網站上的使用路徑與需要的方案
 */

import { SUBSCRIPTION_PLANS } from '../src/types';

export const SUPPORT_EMAIL = 'support@ideax.tw';

/**
 * 對話框裡的功能捷徑按鈕：to 只能是網站預先定義好的目的地（前端也有白名單），
 * 只負責「打開網站頁面」，功能本身仍由使用者在網站介面操作。
 */
export interface MascotAction { label: string; to: string }
const MAIL_ACTION: MascotAction = { label: '寫信給人工客服', to: 'mailto' };
const DASHBOARD_HINT = '個人中心（電腦版點右上角頭像，手機版點底部「我的」）';
const MASK = '［已隱藏］';

const PRIVATE_DATA = '(帳戶|帳號|账户|账号|資料|個資|餘額|點數|交易|訂單|電話|手機|信箱|e-?mail|地址|身分|身份|收入|收益|紀錄|密碼|銀行|實名|證件)';
// 「別人／某某／他／對方……的」＋私人資料
const OTHERS_RE = new RegExp(`(別人|他人|其他(用戶|會員|使用者)|某(人|位|個)(用戶|會員|使用者)?|(這|那)(個|位)(用戶|會員|使用者|人|專家|提問者)|對方|(?<!其)他|她)的.{0,8}${PRIVATE_DATA}`, 'i');
const LOOKUP_OTHERS_RE = /(幫我|請|可以)?(查|查詢|調閱|告訴我).{0,6}(這個|那個|某個|某位|這位|那位)?(人|用戶|會員|使用者|帳號)/;

// 自己的帳目類資料（要查個人資料的問題）
const OWN_TOPICS: Array<{ re: RegExp; where: string; actions: MascotAction[] }> = [
  { re: /餘額|點數|剩.{0,2}點|(多少|幾)點|儲值紀錄|消費紀錄|扣款紀錄|交易紀錄|交易明細|帳務|帳目|收支|撥款|提領|收益|收入|發票/, where: `${DASHBOARD_HINT} →「點數 & 收支」`, actions: [{ label: '打開「點數 & 收支」', to: 'dash:points_receivables' }] },
  { re: /訂單|案件|解鎖紀錄|購買紀錄/, where: `${DASHBOARD_HINT} →「我的案件」`, actions: [{ label: '打開「我的案件」', to: 'my_projects' }] },
  { re: /會員等級|我的方案|訂閱狀態|會員到期/, where: `${DASHBOARD_HINT} →「會員方案」`, actions: [{ label: '打開「會員方案」', to: 'dash:subscriptions' }] },
  { re: /實名|認證狀態|審核狀態/, where: `${DASHBOARD_HINT} →「實名認證」或「專家認證」`, actions: [{ label: '打開「實名認證」', to: 'dash:real_name_auth' }, { label: '打開「專家認證」', to: 'dash:expert_certification' }] },
  { re: /個人資料|基本資料|綁定|暱稱|頭像/, where: `${DASHBOARD_HINT} →「帳號與基本資料」`, actions: [{ label: '打開「帳號與基本資料」', to: 'dash:profile' }] },
];
// 明確在問「自己的」帳目資料；只問操作方法（怎麼、如何…）且沒有在查數字或紀錄的，照常交給客服
const OWN_RES = [
  /(我的|自己的).{0,6}(餘額|點數|交易|紀錄|明細|帳務|帳目|收支|撥款|提領|收益|收入|發票|訂單|案件|會員等級|方案|訂閱|實名|認證|個人資料|基本資料)/,
  /我(還|目前|現在)?(有|剩)(多少|幾)/,
  /(查|看|確認).{0,4}(我的|自己的)?(餘額|剩餘點數|點數餘額|交易紀錄|交易明細|帳務|帳目|收支|撥款紀錄|提領紀錄|訂單)/,
];
const HOWTO_RE = /怎麼|如何|要怎|方法|步驟|在哪|哪裡/;
const CHECKING_RE = /多少|剩|紀錄|明細|不見|少了|沒收到|沒有入帳|對不上|不對|錯了|查/;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?886[-\s]?|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}|\b0\d{1,2}[-\s]?\d{6,8}\b/g;
const TWID_RE = /\b[A-Z][12]\d{8}\b/gi;
const LONG_DIGITS_RE = /\b\d{10,16}\b/g;

function maskPII(text: string): string {
  return text
    .replace(EMAIL_RE, (m) => (m.toLowerCase().endsWith('@ideax.tw') ? m : MASK))
    .replace(PHONE_RE, MASK)
    .replace(TWID_RE, MASK)
    .replace(LONG_DIGITS_RE, MASK);
}

/**
 * 指名找角色（007、aicrm、多慧、客服、搜搜、白喵…）：先介紹是誰、給捷徑，
 * 不然「找 aicrm 顧問」會被當成「找顧問」＝AI 獵頭。
 */
const AGENT_INTENT_RE = /找|問|叫|聯絡|聯繫|轉接|轉給|轉到|呼叫|召喚|見|認識|介紹|是誰|誰是|在哪|去哪|跟.{0,4}聊|和.{0,4}聊|我要|我想/;
const AGENT_DIRECTORY: Array<{ key: string; re: RegExp; reply: string; actions: MascotAction[] }> = [
  {
    key: '007',
    re: /007|ai[\s-]*crm|\bcrm\b|業務顧問|crm\s*(顧問|助理|agent)/i,
    reply: '007 是我們的 AI CRM Agent 🤖，身上有雷達、軍師、特助三件法寶：巡航找案子、分析成案意向、管理跟進任務。點下面的按鈕，我帶你去 007 的基地～',
    actions: [{ label: '帶我去找 007', to: 'ai_crm' }],
  },
  {
    key: 'duohui',
    re: /多慧|頂多慧|貓頭鷹|官方客服|客服(人員|專員|助理|agent)?|真人客服|人工客服/i,
    reply: '多慧是我們的官方客服 Agent 🦉，平台操作、點數託管、驗收撥款、退款爭議都可以問她。點下面的按鈕直接打開客服視窗；也可以把問題打給我，我幫你轉給她。',
    actions: [{ label: '找多慧（客服）', to: 'customer_service' }, MAIL_ACTION],
  },
  {
    key: 'sousou',
    re: /搜搜|探索者|探險家|找工作.{0,3}(agent|助理)/i,
    reply: '搜搜是我們的探索者 Agent，在「匯職缺」幫你一次搜遍各大求職網。點下面的按鈕去找他～',
    actions: [{ label: '前往「匯職缺」', to: 'job_explorer' }],
  },
  {
    key: 'baimiao',
    re: /白喵|市場顧問/,
    reply: '白喵是我們的市場顧問 Agent 🐱，你發布問題時她會幫忙分類、貼標籤；想問題目分類、懸賞建議，直接把問題打給我，我幫你轉給白喵。',
    actions: [{ label: '去發布問題', to: 'create' }],
  },
];

// 付費功能：命中「要求執行」的說法才攔下；純粹詢問用法或價格（且沒有要求執行）就放行給客服說明
const PAID_FEATURES: Array<{ key: string; name: string; doRe: RegExp; where: string; actions: MascotAction[] }> = [
  {
    key: 'headhunter', name: 'AI 獵頭配對',
    doRe: /獵頭|延攬|媒合|(找|推薦|介紹|配對).{0,15}(專家|顧問|高手|人才)|專家推薦|(合適|適合)的專家|誰(能|可以)(解|幫)/,
    where: '「專家智庫」頁的「AI 獵頭配對」',
    actions: [{ label: '前往 AI 獵頭配對', to: 'headhunter' }],
  },
  {
    key: 'unlock', name: '解鎖方案',
    doRe: /解鎖|(看|告訴我|給我|貼|分享|透露).{0,8}(解答|解法|方案內容|答案|完整方案|付費內容)|(這|那)(題|個問題|篇)的(解答|答案|解法|方案)|付費(方案|內容|解答)的內容/,
    where: '問題頁中想看的方案，用點數解鎖',
    actions: [{ label: '前往問題列表', to: 'explore' }],
  },
  {
    key: 'report', name: '市場顧問深度分析報告',
    doRe: /(分析|診斷|評估)報告|深度分析|完整分析|幫我分析(這|我)?(個|的)?(問題|題目|專案)/,
    where: '問題頁中的「市場顧問深度分析報告」（適用 L1～L4 懸賞問題）',
    actions: [{ label: '前往問題列表', to: 'explore' }],
  },
];
// AI-CRM（會員訂閱功能）：各功能需要的方案，依會員方案權益表
const AICRM_FEATURES: Array<{ key: string; name: string; doRe: RegExp; tiers: string[] }> = [
  {
    key: 'aicrm_radar', name: 'AI-CRM 客情巡航與意向偵測',
    doRe: /成案(機率|意向|指數)|意向(指數|偵測|分數)|發案方.{0,6}(心理|猶豫|意向)|客戶猶豫|猶豫期|客情巡航|巡航|巡檢/,
    tiers: ['pro', 'expert', 'authority', 'master'],
  },
  {
    key: 'aicrm_bounty', name: '優質提案推薦您來賺',
    doRe: /(推薦|找|挑).{0,8}(高賞|好題|案子|題目|案源)|高賞好題|實收(試算|淨利)|提案切入|切入方針|推薦您來賺/,
    tiers: ['authority', 'master'],
  },
  {
    key: 'aicrm_strategy', name: 'AI-CRM 策略軍師與 24hr 特助代操',
    doRe: /破冰|話術|跟進(時段|時間|時程)|時程推演|代操|拓客|潛在客戶|軍師|AI ?特助|24 ?hr ?特助|業務特助|特助代操/i,
    tiers: ['master'],
  },
];
const planName = (tier: string) => (tier === 'guest' ? '訪客' : (SUBSCRIPTION_PLANS as any)[tier]?.name || '一般會員');

const ASK_ABOUT_RE = /怎麼(用|使用|開通|申請|收費)|如何(使用|開通|申請)|是什麼|什麼是|介紹一下|多少錢|多少點|費用|價格|收費|規則|有哪些功能|在哪(裡)?(用|使用)?/;
const DO_IT_RE = /幫我|給我|替我|請(你)?(幫|直接)|直接|推薦|告訴我|寫(一|個|份|段)|產生|生成|分析一下/;

export type MascotGuardResult =
  | { action: 'reply'; reason: 'others' | 'own_account' | 'paid_feature' | 'agent_directory'; reply: string; feature?: string; actions: MascotAction[] }
  | { action: 'pass'; message: string };

export function guardMascotQuestion(raw: string): MascotGuardResult {
  const message = String(raw || '');
  const hasPII = EMAIL_RE.test(message) || PHONE_RE.test(message) || TWID_RE.test(message);
  EMAIL_RE.lastIndex = 0; PHONE_RE.lastIndex = 0; TWID_RE.lastIndex = 0;

  // 帶著 Email／電話要求查資料：無法確認是不是本人，一律不查
  const piiLookup = hasPII && /(查|查詢|調閱|告訴我|給我|看一下)/.test(message) && new RegExp(PRIVATE_DATA, 'i').test(message);
  if (OTHERS_RE.test(message) || (hasPII && LOOKUP_OTHERS_RE.test(message)) || piiLookup) {
    return {
      action: 'reply',
      reason: 'others',
      actions: [MAIL_ACTION],
      reply: '為了保護每位用戶的隱私，小燈泡不能提供或查詢其他人的帳戶、交易或聯絡資料喔！如果你和對方有交易上的問題，可以在案件的聊天室溝通，或寫信到 support@ideax.tw 請人工客服協助。',
    };
  }

  if (OWN_RES.some((re) => re.test(message)) && !(HOWTO_RE.test(message) && !CHECKING_RE.test(message))) {
    const topic = OWN_TOPICS.find((t) => t.re.test(message));
    if (topic) {
      return {
        action: 'reply',
        reason: 'own_account',
        actions: [...topic.actions, MAIL_ACTION],
        reply: `你的個人帳目資料只有你自己看得到，小燈泡沒辦法替你查喔！請到 ${topic.where} 查看；如果資料有疑問，可以寫信到 ${SUPPORT_EMAIL}，人工客服會協助你確認（平日 09:30～18:30）。`,
      };
    }
  }

  // 指名找角色：介紹並給捷徑（訊息短、而且有「找／問／是誰…」的意思才算）
  if (message.length <= 40 && AGENT_INTENT_RE.test(message)) {
    const who = AGENT_DIRECTORY.find((a) => a.re.test(message));
    if (who) return { action: 'reply', reason: 'agent_directory', feature: who.key, reply: who.reply, actions: who.actions };
  }

  // 付費功能：要求直接執行就說明並指路；只是詢問用法或價格就放行給客服
  const paid = PAID_FEATURES.find((f) => f.doRe.test(message));
  if (paid && !(ASK_ABOUT_RE.test(message) && !DO_IT_RE.test(message))) {
    return {
      action: 'reply',
      reason: 'paid_feature',
      feature: paid.key,
      actions: paid.actions,
      reply: `「${paid.name}」是平台的付費功能，小燈泡不能直接幫你使用喔！請到 ${paid.where}。想先了解怎麼使用或費用，也可以問我「${paid.name}怎麼用」或「${paid.name}多少錢」。`,
    };
  }

  // AI-CRM：會員訂閱功能，一律請用戶到網站介面使用（不從對話框調用）
  const crm = AICRM_FEATURES.find((f) => f.doRe.test(message));
  if (crm && !(ASK_ABOUT_RE.test(message) && !DO_IT_RE.test(message))) {
    return {
      action: 'reply',
      reason: 'paid_feature',
      feature: crm.key,
      actions: [{ label: '帶我去找 007', to: 'ai_crm' }, { label: '查看會員方案', to: 'membership' }],
      reply: `「${crm.name}」是會員訂閱功能（「${planName(crm.tiers[0])}」以上），由 AI CRM Agent 007 負責，小燈泡不能在對話框幫你使用喔！請到 個人中心（電腦版點右上角頭像，手機版點底部「我的」）→「AI-CRM 客戶關係管理」使用；想升級方案可以到「會員方案」。`,
    };
  }

  // 匯職缺／求職與工作建議：小燈泡不能提供用戶工作建議，僅提供「匯職缺」的捷徑按鍵
  const JOB_SEARCH_RE = /匯職缺|全網搜職|探險家|找工作|求職|職缺|職位|工作建議|職涯建議|推薦.{0,6}工作|適合.{0,6}工作|(找|搜|尋|有沒有|推薦).{0,10}(工作|職缺|職位|正職|兼職|打工|實習|工程師|行政|門市|行銷|業務|設計)|應徵|轉職|跳槽|履歷|面試|月薪|年薪|底薪|頂薪/i;
  if (JOB_SEARCH_RE.test(message)) {
    return {
      action: 'reply',
      reason: 'paid_feature',
      feature: 'job_explorer',
      actions: [{ label: '前往「匯職缺」', to: 'job_explorer' }],
      reply: '小燈泡不直接提供工作建議喔！請點擊下方捷徑前往「匯職缺」跨平台找工作，根據你的篩選條件與需求搜尋合適職位。',
    };
  }

  // 其餘問題照常轉接，但先把 Email、電話、證件、帳號遮掉
  return { action: 'pass', message: maskPII(message) };
}

/** 回覆送出前再遮一次個資（官方 @ideax.tw 信箱保留） */
export function redactMascotReply(text: string): string {
  return maskPII(String(text || ''));
}

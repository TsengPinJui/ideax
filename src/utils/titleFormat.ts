/**
 * 標題與作品名稱格式化工具
 * 遵循平台規範：避免標題裡出現作品名稱，若有則自動移除。
 */

const COMMON_TECH_TERMS = new Set([
  'AI',
  '3D',
  'APP',
  'WEB',
  'RPG',
  'ETF',
  'PWA',
  'UI',
  'UX',
  'NO',
  'CODE',
  'VR',
  'AR',
  'SAAS',
  'TOOL',
  'TOOLS',
  'API',
  'DEV',
  'BOT',
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 移除標題中重複出現的作品名稱、書名號/括弧包裹名稱、以及前綴/後綴符號
 *
 * @param title 原始標題
 * @param appName 作品/軟體名稱（可選）
 * @returns 去除作品名稱後乾淨的標題
 */
export function stripAppNameFromTitle(title: string | undefined | null, appName?: string | null): string {
  if (!title) return '';
  let clean = String(title).trim();

  // 常見分隔符：: ： | ｜ - ─ — – · / 
  const sepClass = '[:：|｜\\-─—–·/]+';

  // 收集作品名稱及其分詞
  const brandNames = new Set<string>();
  if (appName && String(appName).trim()) {
    const raw = String(appName).trim();
    brandNames.add(raw);

    // 移除括號後的純名稱（例如 "AI偽人殺 (Find the AI)" -> "AI偽人殺"）
    const noParen = raw.replace(/[\\(（].*?[\\)）]/g, '').trim();
    if (noParen.length >= 2) brandNames.add(noParen);

    // 依空格、括號、斜線、橫線等切出各子片段（例如 "HookLab 提詞工作台" -> "HookLab", "提詞工作台"）
    raw
      .split(/[\s（）()|/·・\-─—–]+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 2 && !COMMON_TECH_TERMS.has(p.toUpperCase()))
      .forEach((p) => brandNames.add(p));
  }

  // 1. 若標題本身以「候選名稱 + 分隔符」開頭（例如 "台灣釣點地圖——全台最佳釣點" 或 "笑話製造機 ｜ 台灣專屬搞笑"）
  const startSepMatch = clean.match(new RegExp(`^([^:：|｜\\-─—–·/]{2,30})\\s*${sepClass}\\s*(.+)$`));
  if (startSepMatch) {
    const prefix = startSepMatch[1].trim();
    const rest = startSepMatch[2].trim();
    if (rest.length >= 4) {
      if (appName && (brandNames.has(prefix) || appName.includes(prefix) || prefix.includes(appName))) {
        clean = rest;
      }
    }
  }

  // 2. 針對所有已知名稱（由長到短排序）進行精確剝除
  const sortedNames = Array.from(brandNames).sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    if (!name || name.length < 2) continue;
    const esc = escapeRegex(name);

    // 剝除包含括弧或書名號的名稱：例如《織夢島》、 【織夢島】、 [織夢島]
    clean = clean.replace(new RegExp(`[【《（\\(\\[]${esc}[】》）\\)\\]]`, 'gi'), '');

    // 剝除置首的名稱（可帶分隔符或空格）：例如 "IdeaX 創點子："、"HookLab - "、"HookLab "
    clean = clean.replace(new RegExp(`^${esc}(?:\\s*${sepClass}\\s*|\\s+)`, 'gi'), '');

    // 剝除置尾的名稱（由分隔符或空格連接）：例如 "：ShaderVibe 3D"、" HookLab"
    clean = clean.replace(new RegExp(`(?:\\s*${sepClass}\\s*|\\s+)${esc}\\s*$`, 'gi'), '');

    // 剝除在標點或括弧前相連的獨立品牌詞（例如 "小幫手 RubricMate（支援..." -> "小幫手（支援..."）
    clean = clean.replace(new RegExp(`(?:\\s*)${esc}(?=[\\s（(，,。.！!？?])`, 'gi'), '');

    // 剝除括弧內僅有名稱的情況：例如 "(HookLab)" -> ""
    clean = clean.replace(new RegExp(`\\([\\s]*${esc}[\\s]*\\)`, 'gi'), '');
  }

  // 3. 清理首尾殘留的孤立分隔符或標點符號
  clean = clean
    .replace(new RegExp(`^${sepClass}\\s*`, 'g'), '')
    .replace(new RegExp(`\\s*${sepClass}$`, 'g'), '')
    .trim();

  // 若清理後只剩極短字元，退回原始標題
  return clean.length >= 2 ? clean : String(title).trim();
}

/**
 * 預設與現有創新提案之標準簡短「提案名稱」對照表
 */
export const CANONICAL_INNOVATION_PROPOSAL_NAMES: Record<string, string> = {
  'q-vp-idea-ideax': 'IdeaX 創點子',
  'q-vp-idea-gosun': 'GoSun 晴享傘',
  'q-vp-idea-deeperdigger': 'DeeperDigger 深度挖掘',
  'q-vp-idea-nexsight': 'NexSight 洞鑑',
  'q-vp-idea-pace': 'PACE 一人行銷工作台',
  'q-vp-idea-aiyaya': 'AI壓呀',
  'q-vp-idea-stallmatch': 'StallMatch 攤車通',
  'q-vp-idea-01': '早餐店語音接單通',
  'q-vp-idea-02': '校園穿搭盲盒',
  'q-vp-idea-03': '民宿離線NFC門鎖',
  'q-vp-idea-04': '四色多語防呆藥袋',
  'q-vp-idea-05': '遠距新人求救膠囊',
  'q-vp-idea-06': 'LoRa 溫室環控黑盒',
  'q-vp-idea-07': 'NFC 感溫封箱貼紙',
  'q-vp-idea-08': '工廠碳足跡快篩盒',
  'q-vp-idea-09': '扁平書本包鮮食',
  'q-vp-idea-10': '裝潢追加款雙簽存證',
  'q-vp-idea-11': '深夜無人共讀室',
  'q-vp-idea-12': '社區藥局測肌力墊',
  'q-vp-idea-13': '超市動態惜食價牌',
  'q-vp-idea-14': '社區充電智慧排程盒',
  'q-vp-idea-15': '醜蔬果微醺氣泡禮盒',
  'q-vp-idea-16': '懷舊桌遊家族有聲書',
  'q-vp-idea-17': '公益物資掃碼回報貼',
  'q-vp-idea-agent-bulb': '一句話智慧分流',
  'q-vp-idea-agent-sousou': '一份履歷投全網',
  'q-vp-idea-agent-baimiao': '提案自動貼標籤',
};

/**
 * 自動為創新提案（或一般提案物件）擷取或產生簡短「提案名稱」
 */
export function deriveInnovationProposalName(item?: {
  id?: string;
  title?: string;
  appName?: string;
  vibeCodingData?: { appName?: string };
  postType?: string;
  category?: string;
  specialZone?: string;
} | null): string {
  if (!item) return '';
  if (item.id && CANONICAL_INNOVATION_PROPOSAL_NAMES[item.id]) {
    return CANONICAL_INNOVATION_PROPOSAL_NAMES[item.id];
  }
  const existing = (item.appName || item.vibeCodingData?.appName || '').trim();
  if (existing) {
    return existing.includes(' — ') ? existing.split(' — ')[0].trim() : existing;
  }

  const rawTitle = (item.title || '').trim();
  if (!rawTitle) return '';

  // 1. 若有《名稱》或【名稱】或「名稱」
  const bracketMatch = rawTitle.match(/^[《【「\[]([^》】」\]]{2,16})[》】」\]]/);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1].trim();
  }

  // 2. 若有「名稱：副標」或「名稱｜副標」或「名稱 - 副標」
  const sepMatch = rawTitle.match(/^([^:：|｜\-─—–，,。！？!?]{2,16})\s*[:：|｜\-─—–]\s*.+$/);
  if (sepMatch && sepMatch[1]) {
    return sepMatch[1].trim();
  }

  // 3. 從標題去除常見動詞前綴後擷取核心名詞短語（控制在 4~10 字內）
  let core = rawTitle
    .replace(/^(把|將|讓|給|結合|打造|建立|推出|建立一套|設計一套|開發一套|透過|利用|以|在)/, '')
    .trim();

  const clauseParts = core.split(/[，,、：:｜|。！？!?；;（(]/).map((s) => s.trim()).filter(Boolean);
  const firstClause = clauseParts[0] || core;

  // 若第一子句含有「變成...的...」或「做成...」取後段關鍵名詞
  const transformMatch = firstClause.match(/(?:變成|轉化為|做成|打造為|升級為)(.+)$/);
  if (transformMatch && transformMatch[1] && transformMatch[1].trim().length >= 3) {
    const target = transformMatch[1].trim().replace(/^(一個|一套|一座|一間|可|能)/, '');
    return target.slice(0, 10);
  }

  return firstClause.slice(0, 10);
}

/**
 * 自動校驗並規範化 Question 物件中的標題（確保標題不含重複之作品名稱，且創新提案自動具備 appName）
 */
export function sanitizeQuestionTitle<
  T extends {
    id?: string;
    title?: string;
    appName?: string;
    postType?: string;
    category?: string;
    specialZone?: string;
  }
>(question: T): T {
  if (!question || !question.title) return question;
  const isInnovation =
    question.postType === 'innovation_proposal' ||
    question.category === '創新提案' ||
    question.specialZone === 'create_ideas' ||
    Boolean(question.id && CANONICAL_INNOVATION_PROPOSAL_NAMES[question.id]);

  const resolvedAppName =
    question.appName?.trim() ||
    (isInnovation ? deriveInnovationProposalName(question) : '');

  const cleanTitle = stripAppNameFromTitle(question.title, resolvedAppName || question.appName);
  if (cleanTitle !== question.title || (resolvedAppName && resolvedAppName !== question.appName)) {
    return {
      ...question,
      ...(resolvedAppName ? { appName: resolvedAppName } : {}),
      title: cleanTitle,
    };
  }
  return question;
}

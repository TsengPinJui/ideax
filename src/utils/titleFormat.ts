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
 * 自動校驗並規範化 Question 物件中的標題（確保標題不含重複之作品名稱）
 */
export function sanitizeQuestionTitle<T extends { title?: string; appName?: string }>(question: T): T {
  if (!question || !question.title) return question;
  const cleanTitle = stripAppNameFromTitle(question.title, question.appName);
  if (cleanTitle !== question.title) {
    return { ...question, title: cleanTitle };
  }
  return question;
}

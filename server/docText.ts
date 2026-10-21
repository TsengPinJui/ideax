/**
 * 上傳文件（PDF / Word）轉成可給 AI 分析的內容。
 * - PDF：直接交給 Gemini 讀（掃描檔也看得懂），這裡只驗證檔頭
 * - Word（.docx）：解壓縮後取出內文文字
 * 檔案只在記憶體中處理，不寫入硬碟或資料庫。
 */
import JSZip from 'jszip';

export const MAX_DOC_BYTES = 4 * 1024 * 1024; // Vercel 單次請求上限約 4.5MB

export type DocKind = 'pdf' | 'docx';

export function detectDocKind(buf: Buffer, fileName = ''): DocKind | 'doc' | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  // docx 是 zip（PK\x03\x04）
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return 'docx';
  // 舊版 .doc（OLE 檔頭 D0 CF 11 E0）
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'doc';
  if (/\.pdf$/i.test(fileName)) return null;
  return null;
}

const decodeXml = (t: string) =>
  t
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

function xmlToText(xml: string): string {
  return decodeXml(
    xml
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tc>/g, '\t')
      .replace(/<[^>]+>/g, '')
  );
}

/** 取出 .docx 內文（含表格、頁首頁尾、文字方塊），上限 30,000 字 */
export async function extractDocxText(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files).filter((n) =>
    /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(n)
  );
  // 防 zip bomb：只讀內文相關 XML，且合計解壓不超過 10MB
  let total = 0;
  const parts: string[] = [];
  for (const n of names.sort((a, b) => (a === 'word/document.xml' ? -1 : b === 'word/document.xml' ? 1 : 0))) {
    const f = zip.file(n);
    if (!f) continue;
    const xml = await f.async('string');
    total += xml.length;
    if (total > 10 * 1024 * 1024) break;
    parts.push(xmlToText(xml));
  }
  return parts
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 30000);
}

// 再保險一次：AI 若還是吐出 Email、電話、身分證字號，移除
const scrubPii = (t: string) =>
  t
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '')
    .replace(/(\+?886[-\s]?|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, '')
    .replace(/\b[A-Z][12]\d{8}\b/g, '');

const asStrArr = (v: any, max: number, len = 30) =>
  Array.isArray(v) ? v.map((x) => scrubPii(String(x || '')).trim().slice(0, len)).filter(Boolean).slice(0, max) : [];

/** 把 AI 回覆整理成安全的結構化條件，並重組成一句搜尋需求 */
export function buildJobDocResult(parsed: any) {
  const roles = asStrArr(parsed.roles, 3);
  const regions = asStrArr(parsed.regions, 4, 12);
  const jobTypes = asStrArr(parsed.jobTypes, 3, 6).filter((t) => ['全職', '兼職', '實習', '約聘', '遠端'].includes(t));
  const skills = asStrArr(parsed.skills, 8);
  const industries = asStrArr(parsed.industries, 3);
  const education = scrubPii(String(parsed.education || '')).trim().slice(0, 40);
  const rawYears = parsed.experienceYears;
  const years = rawYears === null || rawYears === undefined || rawYears === '' ? NaN : Number(rawYears);
  const experienceYears = Number.isFinite(years) && years >= 0 && years < 60 ? Math.round(years * 10) / 10 : null;
  const expectedSalary = scrubPii(String(parsed.expectedSalary || '')).trim().slice(0, 40);

  // 依結構化欄位重組搜尋句（不直接信任 AI 的 brief，避免夾帶其他內容）
  const pieces: string[] = [];
  pieces.push(`想找${regions.length ? `${regions.join('、')}的` : ''}${roles.length ? roles.join('或') : '適合的'}工作`);
  if (jobTypes.length) pieces.push(jobTypes.join('、'));
  if (education) pieces.push(education);
  if (experienceYears !== null) pieces.push(`${experienceYears} 年相關經驗`);
  if (skills.length) pieces.push(`熟悉 ${skills.slice(0, 6).join('、')}`);
  if (industries.length) pieces.push(`偏好${industries.join('、')}產業`);
  if (expectedSalary) pieces.push(`期望薪資 ${expectedSalary}`);
  const brief = scrubPii(pieces.join('，')).slice(0, 300);

  return {
    docType: ['履歷', '求職需求', '職缺說明', '其他'].includes(parsed.docType) ? parsed.docType : '其他',
    roles, regions, jobTypes, education, experienceYears, skills, industries, expectedSalary,
    summary: scrubPii(String(parsed.summary || '').trim()).slice(0, 60),
    brief,
  };
}

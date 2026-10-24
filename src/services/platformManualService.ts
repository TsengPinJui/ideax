import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import {
  PlatformDocument,
  DEFAULT_PLATFORM_DOCUMENTS,
  INITIAL_VERSION_LOGS,
  PlatformVersionLog,
} from '../data/platformManualData';
import { APP_VERSION, APP_RELEASE_DATE, APP_RELEASE_TIME, APP_SEQUENCE_NUMBER } from '../data/versionData';

const STORAGE_KEY_DOCS = 'ideax_platform_internal_docs_v1';
const STORAGE_KEY_VERSION_META = 'ideax_platform_version_meta_v1';

export interface VersionState {
  currentVersion: string;
  seqNumber: string;
  lastReleaseDate: string;
  lastReleaseTime: string;
  dailyIncrementCount: number;
  letterSuffix: string;
}

/**
 * 依版本規則取得最新版本號與發布時間戳記：
 * - 固定記錄發布時間（最後更新：2026.10.07 10:06），不隨系統時鐘持續跳動
 * - 依當前號碼每次增加 0.0.1
 * - 單日最多 +0.2.0 (即單日最多遞增 20 次 0.0.1)
 * - 到達上限下次尾號加上字母，例如 v1.6.0a, v1.6.0b
 * - 隔日開始的下一個版本回到 v1.6.1 (去除字母並進位)
 */
export function getCalculatedVersionState(): VersionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VERSION_META);
    if (raw) {
      const parsed: VersionState = JSON.parse(raw);
      // 若儲存的版號或更新時間與代碼最新設定不一致，以最新靜態常數為準
      if (
        parsed &&
        parsed.currentVersion === `v${APP_VERSION}` &&
        parsed.seqNumber === APP_SEQUENCE_NUMBER &&
        parsed.lastReleaseDate === APP_RELEASE_DATE &&
        parsed.lastReleaseTime === APP_RELEASE_TIME
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading version state:', e);
  }

  // 靜態版本發布紀錄（固定依 UTC+8 台灣時間發布戳記）
  const authoritativeState: VersionState = {
    currentVersion: APP_VERSION ? `v${APP_VERSION}` : 'v3.7.0',
    seqNumber: APP_SEQUENCE_NUMBER || '#198',
    lastReleaseDate: APP_RELEASE_DATE || '2026.10.25',
    lastReleaseTime: APP_RELEASE_TIME || '00:48',
    dailyIncrementCount: 1,
    letterSuffix: '',
  };
  try {
    localStorage.setItem(STORAGE_KEY_VERSION_META, JSON.stringify(authoritativeState));
  } catch {
    // ignore
  }
  return authoritativeState;
}

/**
 * 推進一個新版本 (當代碼或手冊有重大更動時)
 */
export function bumpVersionState(reason?: string): VersionState {
  const currentState = getCalculatedVersionState();
  const now = new Date();
  // 強制以 Asia/Taipei (UTC+8 台灣時間) 格式化日期與時間，避免被伺服器或容器的 UTC+0 時區干擾
  const taipeiDateParts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const taipeiTimeParts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const year = taipeiDateParts.find((p) => p.type === 'year')?.value || '2026';
  const month = taipeiDateParts.find((p) => p.type === 'month')?.value || '10';
  const day = taipeiDateParts.find((p) => p.type === 'day')?.value || '25';
  const todayStr = `${year}.${month}.${day}`;

  const hour = taipeiTimeParts.find((p) => p.type === 'hour')?.value || '00';
  const minute = taipeiTimeParts.find((p) => p.type === 'minute')?.value || '00';
  const timeStr = `${hour}:${minute}`;

  // Parse current version numbers: v1.5.7 -> [1, 5, 7]
  const cleanVer = currentState.currentVersion.replace(/^v/, '').replace(/[a-z]+$/i, '');
  const parts = cleanVer.split('.').map(Number);
  let major = isNaN(parts[0]) ? 1 : parts[0];
  let minor = isNaN(parts[1]) ? 5 : parts[1];
  let patch = isNaN(parts[2]) ? 7 : parts[2];

  // Calculate sequence number (from #001 incrementing)
  const currentSeqNum = parseInt(currentState.seqNumber.replace('#', ''), 10) || 8;
  const nextSeqNum = `#${String(currentSeqNum + 1).padStart(3, '0')}`;

  let nextVersion = '';
  let nextLetterSuffix = '';
  let nextDailyCount = currentState.dailyIncrementCount;

  // Check if today is a new day
  const isNewDay = currentState.lastReleaseDate !== todayStr;

  if (isNewDay) {
    // 隔日：重設單日增量，去除字母，推進至下一個 patch
    patch += 1;
    if (patch >= 10) {
      minor += 1;
      patch = 0;
    }
    nextVersion = `v${major}.${minor}.${patch}`;
    nextDailyCount = 1;
    nextLetterSuffix = '';
  } else {
    // 同一天內：
    // 單日最多 +0.2.0 (即累計 20 次 0.0.1)
    if (nextDailyCount < 20) {
      patch += 1;
      if (patch >= 10) {
        minor += 1;
        patch = 0;
      }
      nextVersion = `v${major}.${minor}.${patch}`;
      nextDailyCount += 1;
      nextLetterSuffix = '';
    } else {
      // 超過單日上限，加字母後綴如 v1.5.7a, v1.5.7b
      if (!currentState.letterSuffix) {
        nextLetterSuffix = 'a';
      } else {
        const nextCharCode = currentState.letterSuffix.charCodeAt(0) + 1;
        nextLetterSuffix = String.fromCharCode(nextCharCode);
      }
      nextVersion = `v${major}.${minor}.${patch}${nextLetterSuffix}`;
    }
  }

  const newState: VersionState = {
    currentVersion: nextVersion,
    seqNumber: nextSeqNum,
    lastReleaseDate: todayStr,
    lastReleaseTime: timeStr,
    dailyIncrementCount: nextDailyCount,
    letterSuffix: nextLetterSuffix,
  };

  try {
    localStorage.setItem(STORAGE_KEY_VERSION_META, JSON.stringify(newState));
  } catch (e) {
    console.warn('Failed to save version state:', e);
  }

  return newState;
}

/**
 * 取得內部清單所有文件 (含預設 00~05 與自訂新增檔案)
 */
export function getPlatformDocuments(): PlatformDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCS);
    if (raw) {
      const parsed: PlatformDocument[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load custom platform documents:', e);
  }
  return DEFAULT_PLATFORM_DOCUMENTS;
}

/**
 * 儲存內部清單所有文件
 */
export function savePlatformDocuments(docs: PlatformDocument[]) {
  try {
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
  } catch (e) {
    console.warn('Failed to save platform documents:', e);
  }
}

/**
 * 取得標準資料夾名稱
 * 例：IdeaX平台內部清單_2026.10.06_v1.5.7
 */
export function getStandardFolderName(versionState?: VersionState): string {
  const state = versionState || getCalculatedVersionState();
  return `IdeaX平台內部清單_${state.lastReleaseDate}_${state.currentVersion}`;
}

/**
 * 將單一文件轉換為 Markdown 內容
 */
export function formatDocumentToMarkdown(doc: PlatformDocument, versionState?: VersionState): string {
  const state = versionState || getCalculatedVersionState();
  let md = `# 【${doc.title}】\n\n`;
  md += `> **創點子 IdeaX 平台內部技術與運維規範**\n`;
  md += `> 版本：${state.currentVersion} | 序號：${state.seqNumber} | 更新日期：${state.lastReleaseDate} ${state.lastReleaseTime}\n`;
  md += `> 分類：${doc.subtitle} | 模組數：${doc.modules.length}\n\n`;
  md += `---\n\n`;

  doc.modules.forEach((mod, idx) => {
    md += `## ${idx + 1}. ${mod.title}\n\n`;
    if (mod.summary) {
      md += `*摘要：${mod.summary}*\n\n`;
    }
    md += `${mod.content}\n\n`;
    md += `---\n\n`;
  });

  md += `\n*版權所有 © 2026 創點子 IdeaX 平台內部機密檔案*\n`;
  return md;
}

/**
 * 一鍵打包下載整個資料夾 (.zip)
 */
export async function downloadAllDocumentsZip(docs: PlatformDocument[], versionState?: VersionState): Promise<void> {
  const state = versionState || getCalculatedVersionState();
  const folderName = getStandardFolderName(state);
  const zip = new JSZip();
  const rootFolder = zip.folder(folderName) || zip;

  // 1. 加入每個 Markdown 文件
  docs.forEach((doc) => {
    if (doc.isCustom && doc.fileData) {
      // 自訂上傳檔案
      const filename = `${doc.code || doc.title}.${doc.fileType || 'txt'}`;
      rootFolder.file(filename, doc.fileData);
    } else {
      const filename = `${doc.code || doc.title}.md`;
      const mdContent = formatDocumentToMarkdown(doc, state);
      rootFolder.file(filename, mdContent);
    }
  });

  // 2. 加入整體目錄與 Metadata JSON
  const manifest = {
    folderName,
    exportedAt: `${state.lastReleaseDate} ${state.lastReleaseTime}`,
    version: state.currentVersion,
    sequenceNumber: state.seqNumber,
    totalDocuments: docs.length,
    documents: docs.map((d) => ({
      code: d.code,
      title: d.title,
      modulesCount: d.modules.length,
      category: d.category,
      updatedAt: d.updatedAt,
    })),
  };
  rootFolder.file('00_清單目錄與元數據.json', JSON.stringify(manifest, null, 2));

  // 3. 生成並觸發下載
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 下載單一文件為 Word 檔 (.doc / .docx compatible HTML)
 */
export function downloadDocumentAsWord(doc: PlatformDocument, versionState?: VersionState): void {
  const state = versionState || getCalculatedVersionState();
  const filename = `${doc.code || doc.title}_${state.currentVersion}.doc`;

  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${doc.title}</title>
      <style>
        body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; line-height: 1.6; color: #1c1917; padding: 20px; }
        h1 { color: #d97706; font-size: 24pt; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; }
        h2 { color: #1c1917; font-size: 16pt; margin-top: 24px; border-left: 4px solid #f59e0b; padding-left: 8px; }
        h3 { color: #44403c; font-size: 13pt; margin-top: 16px; }
        .meta-box { background-color: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
        .badge { background-color: #fef3c7; color: #92400e; font-weight: bold; padding: 2px 8px; border-radius: 4px; font-size: 10pt; }
        .summary { color: #78716c; font-style: italic; margin-bottom: 12px; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #d6d3d1; padding: 8px 12px; text-align: left; font-size: 10pt; }
        th { background-color: #f5f5f4; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 9pt; color: #a8a29e; text-align: center; border-top: 1px solid #e7e5e4; padding-top: 12px; }
      </style>
    </head>
    <body>
      <h1>${doc.title}</h1>
      <div class="meta-box">
        <p><strong>創點子 IdeaX 平台內部規格書</strong></p>
        <p>
          <span class="badge">版本：${state.currentVersion}</span>
          <span class="badge">序號：${state.seqNumber}</span>
          <span class="badge">更新日期：${state.lastReleaseDate} ${state.lastReleaseTime}</span>
        </p>
        <p>${doc.subtitle}</p>
      </div>
  `;

  doc.modules.forEach((mod, idx) => {
    html += `
      <h2>${idx + 1}. ${mod.title}</h2>
      ${mod.summary ? `<p class="summary"><strong>摘要：</strong>${mod.summary}</p>` : ''}
      <div>${mod.content.replace(/\n/g, '<br/>').replace(/### /g, '<h3>').replace(/## /g, '<h2>')}</div>
      <hr style="border: 0; border-top: 1px dashed #e7e5e4; margin: 24px 0;" />
    `;
  });

  html += `
      <div class="footer">
        創點子 IdeaX 平台內部機密檔案 • 保留所有權利 • 生成時間：${state.lastReleaseDate} ${state.lastReleaseTime}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 下載單一文件為 PDF 檔 (.pdf)
 */
export function downloadDocumentAsPdf(doc: PlatformDocument, versionState?: VersionState): void {
  const state = versionState || getCalculatedVersionState();
  const docPdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  const pageWidth = docPdf.internal.pageSize.getWidth();
  const pageHeight = docPdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // Header Banner
  docPdf.setFillColor(254, 243, 199);
  docPdf.rect(margin, cursorY, contentWidth, 22, 'F');
  docPdf.setDrawColor(245, 158, 11);
  docPdf.rect(margin, cursorY, contentWidth, 22, 'S');

  docPdf.setFontSize(14);
  docPdf.setTextColor(146, 64, 14);
  docPdf.text(`IdeaX Platform Specification: ${doc.code || doc.title}`, margin + 5, cursorY + 8);

  docPdf.setFontSize(9);
  docPdf.setTextColor(180, 83, 9);
  docPdf.text(`Version: ${state.currentVersion} | Seq: ${state.seqNumber} | Date: ${state.lastReleaseDate} ${state.lastReleaseTime}`, margin + 5, cursorY + 16);

  cursorY += 30;

  // Document Content
  doc.modules.forEach((mod, idx) => {
    if (cursorY > pageHeight - 35) {
      docPdf.addPage();
      cursorY = margin;
    }

    docPdf.setFontSize(12);
    docPdf.setTextColor(28, 25, 23);
    docPdf.text(`${idx + 1}. ${mod.title}`, margin, cursorY);
    cursorY += 6;

    if (mod.summary) {
      docPdf.setFontSize(9);
      docPdf.setTextColor(120, 113, 108);
      const splitSummary = docPdf.splitTextToSize(`Summary: ${mod.summary}`, contentWidth);
      docPdf.text(splitSummary, margin, cursorY);
      cursorY += splitSummary.length * 4.5 + 2;
    }

    docPdf.setFontSize(9);
    docPdf.setTextColor(68, 64, 60);
    // Strip markdown chars for clean PDF text
    const cleanContent = mod.content
      .replace(/###\s+/g, '')
      .replace(/##\s+/g, '')
      .replace(/\*\*/g, '')
      .replace(/\|/g, ' ')
      .replace(/---/g, '');
    const splitContent = docPdf.splitTextToSize(cleanContent, contentWidth);

    splitContent.forEach((line: string) => {
      if (cursorY > pageHeight - 20) {
        docPdf.addPage();
        cursorY = margin;
      }
      docPdf.text(line, margin, cursorY);
      cursorY += 4.5;
    });

    cursorY += 8;
  });

  // Footer on current page
  docPdf.setFontSize(8);
  docPdf.setTextColor(168, 162, 158);
  docPdf.text(`IdeaX Confidential Document • ${state.currentVersion} • Generated at ${state.lastReleaseDate}`, margin, pageHeight - 10);

  docPdf.save(`${doc.code || doc.title}_${state.currentVersion}.pdf`);
}

/**
 * 下載單一版本紀錄為 Markdown 檔案
 */
export function downloadVersionLogAsMarkdown(log: PlatformVersionLog): void {
  const content = `# IdeaX 平台版本更新紀錄 (${log.version})

* **版本號碼**：${log.version}
* **遞增序號**：${log.seqNumber}
* **發布日期**：${log.releaseDate}
* **發布時間**：${log.releaseTime}
* **負責單位**：${log.author}

## 版本摘要
${log.summary}

## 詳細變更清單
${log.changes.map((c, i) => `${i + 1}. ${c}`).join('\n')}

---
*版權所有 © 2026 創點子 IdeaX Platform. 內部機密規格檔案。*
`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `IdeaX_版本紀錄_${log.seqNumber}_${log.version}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 下載全部歷史版本歷程為 Markdown 檔案
 */
export function downloadAllVersionLogsAsMarkdown(logs: PlatformVersionLog[]): void {
  let content = `# IdeaX 創點子 平台全歷史版本演進與發布歷程總表

> 最後更新時間：${APP_RELEASE_DATE} ${APP_RELEASE_TIME} (依發布戳記靜態存檔)
> 當前正式版本：v${APP_VERSION} (${APP_SEQUENCE_NUMBER})
> 收錄自 2026.09.22 專案啟動建置起之所有版本歷程

---

`;

  logs.forEach((log) => {
    content += `## [${log.seqNumber}] ${log.version} - ${log.releaseDate} ${log.releaseTime}
**發布單位**：${log.author}  
**更新摘要**：${log.summary}  

### 變更項目：
${log.changes.map((c, i) => `${i + 1}. ${c}`).join('\n')}

---

`;
  });

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `IdeaX_全版本歷史歷程總清單_${APP_RELEASE_DATE}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


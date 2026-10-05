import JSZip from 'jszip';
import { PlatformManualDoc } from '../data/platformManual/fileStorage';
import { APP_VERSION, APP_RELEASE_DATE } from '../data/versionData';
import { OPERATIONS_GUIDE } from '../data/platformManual/operationsGuide';
import { FEATURES_SPEC } from '../data/platformManual/featuresSpec';
import { RULES_AND_LOGIC } from '../data/platformManual/rulesAndLogic';
import { ARCHITECTURE_AND_SECURITY } from '../data/platformManual/architectureAndSecurity';
import { ADMIN_MAINTENANCE } from '../data/platformManual/adminMaintenance';
import { generateVersionInfoMarkdown } from '../data/platformManual/versionHistory';

/**
 * 取得依規範命名的資料夾名稱：IdeaX平台清單_版本_最後更新日期
 */
export const getPlatformManualFolderName = (): string => {
  return `IdeaX平台清單_v${APP_VERSION}_${APP_RELEASE_DATE}`;
};

/**
 * 將結構化資料轉換為人類易讀的文字條列格式（避免 JSON 原始碼傾倒）
 */
export const formatDataToHumanReadableText = (data: any, level = 0): string => {
  if (typeof data !== 'object' || data === null) {
    return String(data);
  }
  let out = '';
  const indent = '  '.repeat(level);
  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        out += `${indent}${idx + 1}. \n${formatDataToHumanReadableText(item, level + 1)}\n`;
      } else {
        out += `${indent}- ${item}\n`;
      }
    });
  } else {
    Object.entries(data).forEach(([key, val]) => {
      if (typeof val === 'object' && val !== null) {
        out += `${indent}【${key}】:\n${formatDataToHumanReadableText(val, level + 1)}\n`;
      } else {
        out += `${indent}- ${key}: ${val}\n`;
      }
    });
  }
  return out;
};

/**
 * 將指定模組轉換為格式工整的單獨 Markdown / 純文字文字檔內容
 */
export const formatDocToMarkdown = (doc: PlatformManualDoc): string => {
  if (doc.content) {
    return doc.content;
  }

  // 00 版本資訊
  if (doc.id === '00_version_info') {
    return generateVersionInfoMarkdown();
  }

  // 01 系統操作手冊
  if (doc.id === '01_operations') {
    let md = `# 📘 ${OPERATIONS_GUIDE.title}\n\n`;
    md += `> **說明**：${OPERATIONS_GUIDE.summary}\n\n---\n\n`;
    OPERATIONS_GUIDE.sections.forEach((sec) => {
      md += `## 👤 角色視角：${sec.role}\n\n`;
      sec.steps.forEach((st) => {
        md += `### ${st.name}\n${st.description}\n\n`;
      });
    });
    return md;
  }

  // 02 核心功能規格清單
  if (doc.id === '02_features') {
    let md = `# 📘 ${FEATURES_SPEC.title}\n\n`;
    md += `> **說明**：${FEATURES_SPEC.summary}\n\n---\n\n`;
    FEATURES_SPEC.modules.forEach((mod) => {
      md += `## ⚡ ${mod.moduleName}\n\n`;
      mod.specs.forEach((sp) => {
        md += `- ${sp}\n`;
      });
      md += `\n`;
    });
    return md;
  }

  // 03 平台運作規則與商業邏輯
  if (doc.id === '03_rules') {
    let md = `# 📘 ${RULES_AND_LOGIC.title}\n\n`;
    md += `> **說明**：${RULES_AND_LOGIC.summary}\n\n---\n\n`;
    RULES_AND_LOGIC.rules.forEach((r) => {
      md += `## ⚖️ ${r.category}\n\n`;
      r.details.forEach((d) => {
        md += `- ${d}\n`;
      });
      md += `\n`;
    });
    return md;
  }

  // 04 技術架構與安全機制
  if (doc.id === '04_architecture') {
    let md = `# 📘 ${ARCHITECTURE_AND_SECURITY.title}\n\n`;
    md += `> **說明**：${ARCHITECTURE_AND_SECURITY.summary}\n\n---\n\n`;
    ARCHITECTURE_AND_SECURITY.specifications.forEach((spec) => {
      md += `## 🛡️ ${spec.domain}\n\n`;
      spec.points.forEach((p) => {
        md += `- ${p}\n`;
      });
      md += `\n`;
    });
    return md;
  }

  // 05 管理員運維應變守則
  if (doc.id === '05_maintenance') {
    let md = `# 📘 ${ADMIN_MAINTENANCE.title}\n\n`;
    md += `> **說明**：${ADMIN_MAINTENANCE.summary}\n\n---\n\n`;
    ADMIN_MAINTENANCE.protocols.forEach((p) => {
      md += `## 🛠️ ${p.topic}\n\n`;
      p.steps.forEach((s) => {
        md += `- ${s}\n`;
      });
      md += `\n`;
    });
    return md;
  }

  if (doc.data) {
    return `# ${doc.title}\n\n${doc.description || ''}\n\n` + formatDataToHumanReadableText(doc.data);
  }

  return `# ${doc.title}\n\n${doc.description || ''}`;
};

/**
 * 將 Markdown 文字轉換為 Word (.doc) 標準相容 HTML
 * 可直接被 Microsoft Word, WPS, Google Docs 完美原生打開與編輯
 */
export const convertMarkdownToWordHtml = (title: string, markdown: string): string => {
  const bodyHtml = markdown
    .replace(/^# (.*$)/gim, '<h1 style="color:#1c1917; font-size:22pt; font-weight:bold; border-bottom:2px solid #f59e0b; padding-bottom:6pt; margin-top:20pt; margin-bottom:10pt;">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 style="color:#292524; font-size:16pt; font-weight:bold; border-bottom:1px solid #e7e5e4; padding-bottom:4pt; margin-top:16pt; margin-bottom:8pt;">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 style="color:#44403c; font-size:13pt; font-weight:bold; margin-top:12pt; margin-bottom:6pt;">$1</h3>')
    .replace(/^\> (.*$)/gim, '<blockquote style="border-left:4px solid #f59e0b; padding:8pt 12pt; color:#78716c; background:#fffbeb; margin:10pt 0;">$1</blockquote>')
    .replace(/^\- (.*$)/gim, '<li style="margin-bottom:4pt; color:#292524; line-height:1.5;">$1</li>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background:#f5f5f4; color:#d97706; padding:2pt 4pt; border-radius:3pt; font-family:Consolas, monospace;">$1</code>')
    .replace(/\n\n/gim, '</p><p style="margin:8pt 0; line-height:1.6; color:#292524;">');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  body { font-family: "Microsoft JhengHei", "PingFang TC", "微軟正黑體", sans-serif; font-size: 11pt; line-height: 1.6; color: #1c1917; padding: 20pt; }
  h1, h2, h3 { font-family: "Microsoft JhengHei", "PingFang TC", "微軟正黑體", sans-serif; }
  ul { padding-left: 20pt; }
  hr { border: 0; border-top: 1px solid #d6d3d1; margin: 16pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
  th, td { border: 1px solid #d6d3d1; padding: 6pt 10pt; text-align: left; }
  th { background-color: #f5f5f4; font-weight: bold; }
</style>
</head>
<body>
<p style="margin:8pt 0; line-height:1.6; color:#292524;">
${bodyHtml}
</p>
</body>
</html>`;
};

/**
 * 下載單檔為 Word 格式 (.doc)
 */
export const downloadDocAsWord = (doc: PlatformManualDoc) => {
  const mdContent = formatDocToMarkdown(doc);
  const wordHtml = convertMarkdownToWordHtml(doc.title, mdContent);
  const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8;' });
  const baseName = doc.name.replace(/\.[^/.]+$/, '');
  const filename = `${baseName}.doc`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 下載單檔為純文字格式 (.txt 或 .md)
 */
export const downloadDocAsText = (doc: PlatformManualDoc, extension: 'txt' | 'md' = 'txt') => {
  const content = formatDocToMarkdown(doc);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const baseName = doc.name.replace(/\.[^/.]+$/, '');
  const filename = `${baseName}.${extension}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 一鍵打包下載整個資料夾 (產生 .zip 壓縮包)
 * 包含：純文字檔 (.txt) + Markdown檔 (.md) + Word文件 (.doc)
 * 徹底不使用 JSON，方便任何軟體直接開啟
 */
export const downloadEntireManualFolderZip = async (documents: PlatformManualDoc[]) => {
  const zip = new JSZip();
  const folderName = getPlatformManualFolderName();
  const rootFolder = zip.folder(folderName) || zip;

  // 1. 生成資料夾總目錄說明 (README_目錄說明.txt)
  let readme = `========================================================\r\n`;
  readme += `  IdeaX 平台內部清單與手冊庫 (v${APP_VERSION} - ${APP_RELEASE_DATE})\r\n`;
  readme += `========================================================\r\n\r\n`;
  readme += `本壓縮資料夾包含 IdeaX 平台當前所有系統手冊、功能清單、商業規則、技術架構與運維守則。\r\n`;
  readme += `格式皆為 Microsoft Word 相容檔 (.doc) 與 文字檔 (.txt / .md)，可直接使用 Word、WPS 或記事本開啟閱讀。\r\n\r\n`;
  readme += `【檔案清單目錄】(共 ${documents.length} 份文件)：\r\n`;

  documents.forEach((doc, idx) => {
    const baseName = doc.name.replace(/\.[^/.]+$/, '');
    readme += `${idx + 1}. ${baseName} - ${doc.title} (${doc.description || ''})\r\n`;
  });

  readme += `\r\n--------------------------------------------------------\r\n`;
  readme += `*由 IdeaX 運營管理中樞一鍵打包導出 (時區：UTC+8)*\r\n`;

  rootFolder.file('README_目錄說明.txt', readme);

  // 2. 將每份檔案寫入 ZIP 內部 (提供 Word 檔與文字檔，不使用 JSON)
  for (const doc of documents) {
    const rawBaseName = doc.name.replace(/\.[^/.]+$/, '');

    if (doc.dataUrl) {
      // 處理二進位附件 (PDF, 圖片等)
      try {
        const base64Data = doc.dataUrl.split(',')[1];
        if (base64Data) {
          rootFolder.file(doc.name, base64Data, { base64: true });
          continue;
        }
      } catch (err) {
        console.error('Failed to parse base64 for file', doc.name, err);
      }
    }

    // 取得人類易讀文字內容
    const mdContent = formatDocToMarkdown(doc);

    // (A) Word 檔 (.doc)
    const wordHtml = convertMarkdownToWordHtml(doc.title, mdContent);
    rootFolder.file(`${rawBaseName}.doc`, wordHtml);

    // (B) 純文字檔 (.txt)
    rootFolder.file(`${rawBaseName}.txt`, mdContent);

    // (C) Markdown 檔 (.md)
    rootFolder.file(`${rawBaseName}.md`, mdContent);
  }

  // 3. 生成 ZIP 二進位 Blob 並觸發下載
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${folderName}.zip`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

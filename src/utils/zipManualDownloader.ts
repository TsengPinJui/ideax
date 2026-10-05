import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
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
 * 輔助函式：將 Markdown 字串渲染為清晰專業的 A4 頁面 Canvas 陣列
 */
const renderMarkdownToA4Canvases = (
  title: string,
  docName: string,
  markdown: string
): HTMLCanvasElement[] => {
  const canvasWidth = 1240;
  const canvasHeight = 1754; // A4 standard 150 DPI proportion (1240 x 1754)
  const marginX = 80;
  const startY = 100;
  const contentWidth = canvasWidth - marginX * 2;
  const maxY = canvasHeight - 90;

  const rawLines = markdown.split('\n');

  interface RenderItem {
    text: string;
    type: 'h1' | 'h2' | 'h3' | 'body' | 'quote' | 'hr';
    fontSize: number;
    isBold: boolean;
    color: string;
  }

  const pages: RenderItem[][] = [[]];
  let currentPageIndex = 0;
  let currentY = startY;

  const testCanvas = document.createElement('canvas');
  const testCtx = testCanvas.getContext('2d')!;

  for (const rawLine of rawLines) {
    let lineType: 'h1' | 'h2' | 'h3' | 'body' | 'quote' | 'hr' = 'body';
    let fontSize = 21;
    let isBold = false;
    let color = '#292524';
    let textToWrap = rawLine;

    if (rawLine.startsWith('# ')) {
      lineType = 'h1';
      fontSize = 32;
      isBold = true;
      color = '#1c1917';
      textToWrap = rawLine.replace(/^#\s+/, '');
    } else if (rawLine.startsWith('## ')) {
      lineType = 'h2';
      fontSize = 25;
      isBold = true;
      color = '#292524';
      textToWrap = rawLine.replace(/^##\s+/, '');
    } else if (rawLine.startsWith('### ')) {
      lineType = 'h3';
      fontSize = 22;
      isBold = true;
      color = '#44403c';
      textToWrap = rawLine.replace(/^###\s+/, '');
    } else if (rawLine.startsWith('> ')) {
      lineType = 'quote';
      fontSize = 20;
      isBold = false;
      color = '#78716c';
      textToWrap = rawLine.replace(/^>\s+/, '');
    } else if (rawLine.trim() === '---') {
      lineType = 'hr';
      textToWrap = '';
    }

    testCtx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;

    if (lineType === 'hr') {
      const lineHeight = 28;
      if (currentY + lineHeight > maxY) {
        pages.push([]);
        currentPageIndex++;
        currentY = startY;
      }
      pages[currentPageIndex].push({ text: '', type: 'hr', fontSize, isBold, color });
      currentY += lineHeight;
      continue;
    }

    if (!textToWrap.trim()) {
      currentY += 16;
      continue;
    }

    let currentLineStr = '';
    for (let i = 0; i < textToWrap.length; i++) {
      const char = textToWrap[i];
      const testStr = currentLineStr + char;
      const metrics = testCtx.measureText(testStr);
      if (metrics.width > contentWidth && currentLineStr.length > 0) {
        const itemLineHeight = fontSize * 1.5;
        if (currentY + itemLineHeight > maxY) {
          pages.push([]);
          currentPageIndex++;
          currentY = startY;
        }
        pages[currentPageIndex].push({ text: currentLineStr, type: lineType, fontSize, isBold, color });
        currentY += itemLineHeight;
        currentLineStr = char;
      } else {
        currentLineStr = testStr;
      }
    }
    if (currentLineStr) {
      const itemLineHeight = fontSize * 1.5;
      if (currentY + itemLineHeight > maxY) {
        pages.push([]);
        currentPageIndex++;
        currentY = startY;
      }
      pages[currentPageIndex].push({ text: currentLineStr, type: lineType, fontSize, isBold, color });
      currentY += itemLineHeight + (lineType === 'h1' ? 14 : lineType === 'h2' ? 10 : 4);
    }
  }

  const canvases: HTMLCanvasElement[] = [];
  const totalPages = pages.length;

  pages.forEach((pageItems, pIndex) => {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvasWidth;
    pageCanvas.height = canvasHeight;
    const ctx = pageCanvas.getContext('2d')!;

    // 背景白底
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 頂部邊界與裝飾條
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(marginX, 50, contentWidth, 4);

    // 頂部頁首標記
    ctx.font = '15px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#78716c';
    ctx.fillText(`IdeaX 平台清單規格手冊 • ${title || docName}`, marginX, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`v${APP_VERSION} (${APP_RELEASE_DATE})`, canvasWidth - marginX, 40);
    ctx.textAlign = 'left';

    // 頁底頁碼
    ctx.fillStyle = '#a8a29e';
    ctx.font = '14px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${pIndex + 1} 頁 / 共 ${totalPages} 頁`, canvasWidth / 2, canvasHeight - 40);
    ctx.textAlign = 'left';

    // 內容繪製
    let drawY = startY;
    pageItems.forEach((item) => {
      if (item.type === 'hr') {
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(marginX, drawY + 8);
        ctx.lineTo(canvasWidth - marginX, drawY + 8);
        ctx.stroke();
        drawY += 24;
        return;
      }

      ctx.font = `${item.isBold ? 'bold' : 'normal'} ${item.fontSize}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
      ctx.fillStyle = item.color;

      if (item.type === 'quote') {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(marginX - 10, drawY - item.fontSize + 2, contentWidth + 20, item.fontSize * 1.4);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(marginX - 10, drawY - item.fontSize + 2, 4, item.fontSize * 1.4);
        ctx.fillStyle = item.color;
      }

      ctx.fillText(item.text, marginX, drawY);

      if (item.type === 'h1') {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(marginX, drawY + 8);
        ctx.lineTo(marginX + Math.min(320, contentWidth), drawY + 8);
        ctx.stroke();
      }

      drawY += item.fontSize * 1.5 + (item.type === 'h1' ? 14 : item.type === 'h2' ? 10 : 4);
    });

    canvases.push(pageCanvas);
  });

  return canvases;
};

/**
 * 下載單檔為 PDF 格式 (.pdf)
 */
export const downloadDocAsPdf = async (doc: PlatformManualDoc): Promise<void> => {
  // 1. 若該檔案本身已是 PDF 附件 (含 dataUrl)，直接下載原檔
  if (doc.dataUrl && (doc.name.toLowerCase().endsWith('.pdf') || doc.fileType === 'pdf')) {
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.setAttribute('download', doc.name.toLowerCase().endsWith('.pdf') ? doc.name : `${doc.name}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // 2. 使用 Canvas + jsPDF 繪製繁體中文完整排版之標準 PDF
  const mdContent = formatDocToMarkdown(doc);
  const canvases = renderMarkdownToA4Canvases(doc.title, doc.name, mdContent);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  canvases.forEach((canvas, index) => {
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (index > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  });

  const baseName = doc.name.replace(/\.[^/.]+$/, '');
  pdf.save(`${baseName}.pdf`);
};

/**
 * 建立標準 POSIX Ustar TAR 歸檔二進位 Blob
 */
export const createTarBlob = (files: Array<{ name: string; data: Uint8Array }>): Blob => {
  const blocks: Uint8Array[] = [];
  const encoder = new TextEncoder();

  const writeString = (buf: Uint8Array, offset: number, length: number, str: string) => {
    const encoded = encoder.encode(str);
    for (let i = 0; i < Math.min(encoded.length, length); i++) {
      buf[offset + i] = encoded[i];
    }
  };

  for (const file of files) {
    const header = new Uint8Array(512);

    // 0..99: name
    writeString(header, 0, 100, file.name);
    // 100..107: mode
    writeString(header, 100, 8, '0000644 ');
    // 108..115: uid
    writeString(header, 108, 8, '0000000 ');
    // 116..123: gid
    writeString(header, 116, 8, '0000000 ');
    // 124..135: size in octal
    const sizeOctal = file.data.length.toString(8).padStart(11, '0') + ' ';
    writeString(header, 124, 12, sizeOctal);
    // 136..147: mtime in octal
    const mtimeOctal = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + ' ';
    writeString(header, 136, 12, mtimeOctal);
    // 148..155: chksum blank spaces
    for (let i = 148; i < 156; i++) header[i] = 32;
    // 156: typeflag
    header[156] = 48; // '0'
    // 257..262: magic
    writeString(header, 257, 6, 'ustar');
    // 263..264: version
    writeString(header, 263, 2, '00');

    // 計算 Checksum
    let chk = 0;
    for (let i = 0; i < 512; i++) chk += header[i];
    const chkOctal = chk.toString(8).padStart(6, '0') + '\0 ';
    writeString(header, 148, 8, chkOctal);

    blocks.push(header);
    blocks.push(file.data);

    // 512 邊界填充
    const pad = (512 - (file.data.length % 512)) % 512;
    if (pad > 0) {
      blocks.push(new Uint8Array(pad));
    }
  }

  // 結尾兩個 512-byte zero blocks
  blocks.push(new Uint8Array(1024));

  return new Blob(blocks as any, { type: 'application/x-tar' });
};

/**
 * 下載整個資料夾為 TAR 歸檔包 (.tar)
 */
export const downloadEntireManualFolderTar = async (documents: PlatformManualDoc[]): Promise<void> => {
  const folderName = getPlatformManualFolderName();
  const tarFiles: Array<{ name: string; data: Uint8Array }> = [];
  const encoder = new TextEncoder();

  // 1. 生成資料夾總目錄說明
  let readme = `========================================================\r\n`;
  readme += `  IdeaX 平台內部清單與手冊庫 (v${APP_VERSION} - ${APP_RELEASE_DATE})\r\n`;
  readme += `========================================================\r\n\r\n`;
  readme += `本 TAR 歸檔資料夾包含 IdeaX 平台當前所有系統手冊、功能清單、商業規則、技術架構與運維守則。\r\n`;
  readme += `共 ${documents.length} 份文件檔案，包含獨立 Markdown (.md) 與純文字 (.txt) 格式。\r\n\r\n`;
  documents.forEach((doc, idx) => {
    readme += `${idx + 1}. ${doc.name} - ${doc.title} (${doc.description || ''})\r\n`;
  });
  readme += `\r\n*由 IdeaX 運營管理中樞打包導出 (時區：UTC+8)*\r\n`;

  tarFiles.push({
    name: `${folderName}/README_目錄說明.txt`,
    data: encoder.encode(readme),
  });

  // 2. 逐一寫入各章節檔案
  for (const doc of documents) {
    const rawBaseName = doc.name.replace(/\.[^/.]+$/, '');
    const mdContent = formatDocToMarkdown(doc);

    tarFiles.push({
      name: `${folderName}/Markdown/${rawBaseName}.md`,
      data: encoder.encode(mdContent),
    });
    tarFiles.push({
      name: `${folderName}/純文字/${rawBaseName}.txt`,
      data: encoder.encode(mdContent),
    });
  }

  const tarBlob = createTarBlob(tarFiles);
  const url = URL.createObjectURL(tarBlob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${folderName}.tar`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 下載整個清單為單一彙整 Word 文檔 (.doc)
 */
export const downloadEntireManualFolderWord = (documents: PlatformManualDoc[]): void => {
  const folderName = getPlatformManualFolderName();
  let combinedMarkdown = `# 📘 IdeaX 平台內部清單與全手冊合輯 (v${APP_VERSION})\n\n`;
  combinedMarkdown += `> **版本資訊**：v${APP_VERSION}（發布日期：${APP_RELEASE_DATE}，UTC+8）  \n`;
  combinedMarkdown += `> **文檔類型**：全清單整合版 (Microsoft Word 格式，收錄 ${documents.length} 份文件)  \n\n---\n\n`;

  documents.forEach((doc, idx) => {
    const mdContent = formatDocToMarkdown(doc);
    combinedMarkdown += `\n\n# 【第 ${idx + 1} 卷】${doc.title || doc.name}\n\n`;
    combinedMarkdown += `${mdContent}\n\n---\n\n`;
  });

  const wordHtml = convertMarkdownToWordHtml('IdeaX 平台全手冊合輯', combinedMarkdown);
  const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${folderName}_全手冊合輯.doc`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 下載整個清單為單一彙整 PDF 完整手冊 (.pdf)
 */
export const downloadEntireManualFolderPdf = async (documents: PlatformManualDoc[]): Promise<void> => {
  const folderName = getPlatformManualFolderName();
  let combinedMarkdown = `# 📘 IdeaX 平台內部清單與全手冊合輯 (v${APP_VERSION})\n\n`;
  combinedMarkdown += `> **版本資訊**：v${APP_VERSION}（發布日期：${APP_RELEASE_DATE}，UTC+8）  \n`;
  combinedMarkdown += `> **文檔類型**：全手冊整合版 (PDF 格式，收錄 ${documents.length} 份文件)  \n\n---\n\n`;

  documents.forEach((doc, idx) => {
    const mdContent = formatDocToMarkdown(doc);
    combinedMarkdown += `\n\n# 【第 ${idx + 1} 卷】${doc.title || doc.name}\n\n`;
    combinedMarkdown += `${mdContent}\n\n---\n\n`;
  });

  const canvases = renderMarkdownToA4Canvases('全手冊合輯', 'IdeaX 平台全手冊合輯', combinedMarkdown);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  canvases.forEach((canvas, index) => {
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (index > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  });

  pdf.save(`${folderName}_全手冊合輯.pdf`);
};

/**
 * 下載整個清單為 JSON 結構化資料備份檔 (.json)
 */
export const downloadEntireManualFolderJson = (documents: PlatformManualDoc[]): void => {
  const folderName = getPlatformManualFolderName();
  const exportPayload = {
    platform: 'IdeaX',
    exportType: 'platform_manual_full_backup',
    version: APP_VERSION,
    releaseDate: APP_RELEASE_DATE,
    exportedAt: new Date().toISOString(),
    totalDocuments: documents.length,
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      title: doc.title,
      description: doc.description,
      fileType: doc.fileType,
      isCustom: !!doc.isCustom,
      content: formatDocToMarkdown(doc),
      dataUrl: doc.dataUrl || undefined,
    })),
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${folderName}_備份資料.json`);
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
  readme += `【檔案格式說明】：\r\n`;
  readme += `1. 根目錄提供【00_IdeaX平台全手冊合輯.doc】：單一完整 Word 文檔，可用 Microsoft Word 或 WPS 直接開啟查閱全文。\r\n`;
  readme += `2. 【Word文檔 (.doc)】資料夾：各章節獨立之 Word 格式文檔，排版清晰美觀。\r\n`;
  readme += `3. 【純文字檔 (.txt)】資料夾：各章節純文字版本，任何電腦記事本皆可直接打開。\r\n\r\n`;
  readme += `【手冊章節清單】(共 ${documents.length} 份文件)：\r\n`;

  documents.forEach((doc, idx) => {
    const baseName = doc.name.replace(/\.[^/.]+$/, '');
    readme += `${idx + 1}. ${baseName} - ${doc.title} (${doc.description || ''})\r\n`;
  });

  readme += `\r\n--------------------------------------------------------\r\n`;
  readme += `*由 IdeaX 運營管理中樞一鍵打包導出 (時區：UTC+8)*\r\n`;

  rootFolder.file('README_目錄說明.txt', readme);

  // 2. 建立 Word 文檔資料夾與純文字資料夾
  const wordSubFolder = rootFolder.folder('Word文檔 (.doc)') || rootFolder;
  const textSubFolder = rootFolder.folder('純文字檔 (.txt)') || rootFolder;

  let combinedMarkdown = `# 📘 IdeaX 平台內部清單與手冊合輯 (v${APP_VERSION})\n\n`;
  combinedMarkdown += `> **發布日期**：${APP_RELEASE_DATE} (UTC+8)  \n`;
  combinedMarkdown += `> **文檔類型**：全手冊整合版 (Microsoft Word 格式)  \n\n---\n\n`;

  // 3. 將每份檔案寫入 ZIP 內部
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
    combinedMarkdown += `${mdContent}\n\n---\n\n`;

    // (A) Word 文檔 (.doc) 寫入 Word文檔 資料夾
    const wordHtml = convertMarkdownToWordHtml(doc.title, mdContent);
    wordSubFolder.file(`${rawBaseName}.doc`, wordHtml);

    // (B) 純文字檔 (.txt) 寫入 純文字檔 資料夾
    textSubFolder.file(`${rawBaseName}.txt`, mdContent);
  }

  // 4. 根目錄寫入一份「00_IdeaX平台全手冊合輯.doc」大合集 Word 文檔
  const combinedWordHtml = convertMarkdownToWordHtml('IdeaX 平台全手冊合輯', combinedMarkdown);
  rootFolder.file(`00_IdeaX平台全手冊合輯_v${APP_VERSION}.doc`, combinedWordHtml);

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

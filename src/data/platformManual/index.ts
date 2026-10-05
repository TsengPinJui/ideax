/**
 * 平台內部清單 (IdeaX Platform Internal Directory & Manual)
 * 集中整合操作手冊、功能清單、運作規則、技術架構、運維守則與測試守則建議
 *
 * ⚠️ 開發維護準則 (Maintenance Protocol):
 * 每當平台有任何功能迭代、規則修訂、架構更新或測試規範補充時，
 * 工程師「必須主動同步更新」此目錄下對應的手冊與清單檔案，確保管理員查閱與導出內容為最新狀態。
 */

import { APP_VERSION, APP_RELEASE_DATE } from '../versionData';
import { OPERATIONS_GUIDE } from './operationsGuide';
import { FEATURES_SPEC } from './featuresSpec';
import { RULES_AND_LOGIC } from './rulesAndLogic';
import { ARCHITECTURE_AND_SECURITY } from './architectureAndSecurity';
import { ADMIN_MAINTENANCE } from './adminMaintenance';
import {
  VERSION_GOVERNANCE_RULES,
  VERSION_HISTORY_LOG,
  generateVersionInfoMarkdown,
} from './versionHistory';

export interface ManualFolderItem {
  id: string;
  code: string;
  name: string;
  title: string;
  description: string;
  itemCount: number;
  data: any;
}

export const getPlatformManualManifest = () => {
  return {
    platformName: '創點子 IdeaX - 平台內部清單',
    version: APP_VERSION,
    folders: [
      {
        id: '00_version_info',
        code: '00',
        name: '00_版本資訊',
        title: '【版本資訊】與維護規則',
        description: '記錄當前版號、更新日期、單日 0.2.0 增量上限與版本演進歷程',
        itemCount: VERSION_HISTORY_LOG.length,
        data: {
          governance: VERSION_GOVERNANCE_RULES,
          history: VERSION_HISTORY_LOG,
          markdown: generateVersionInfoMarkdown(),
        },
      },
      {
        id: '01_operations',
        code: '01',
        name: '01_系統操作手冊',
        title: OPERATIONS_GUIDE.title,
        description: OPERATIONS_GUIDE.summary,
        itemCount: OPERATIONS_GUIDE.sections.length,
        data: OPERATIONS_GUIDE,
      },
      {
        id: '02_features',
        code: '02',
        name: '02_核心功能規格清單',
        title: FEATURES_SPEC.title,
        description: FEATURES_SPEC.summary,
        itemCount: FEATURES_SPEC.modules.length,
        data: FEATURES_SPEC,
      },
      {
        id: '03_rules',
        code: '03',
        name: '03_平台運作規則與商業邏輯',
        title: RULES_AND_LOGIC.title,
        description: RULES_AND_LOGIC.summary,
        itemCount: RULES_AND_LOGIC.rules.length,
        data: RULES_AND_LOGIC,
      },
      {
        id: '04_architecture',
        code: '04',
        name: '04_技術架構與安全機制',
        title: ARCHITECTURE_AND_SECURITY.title,
        description: ARCHITECTURE_AND_SECURITY.summary,
        itemCount: ARCHITECTURE_AND_SECURITY.specifications.length,
        data: ARCHITECTURE_AND_SECURITY,
      },
      {
        id: '05_maintenance',
        code: '05',
        name: '05_管理員運維應變守則',
        title: ADMIN_MAINTENANCE.title,
        description: ADMIN_MAINTENANCE.summary,
        itemCount: ADMIN_MAINTENANCE.protocols.length,
        data: ADMIN_MAINTENANCE,
      },
    ] as ManualFolderItem[],
  };
};

/**
 * 自動生成完整 Markdown 規格書全文（支援直接下載或複製）
 */
export const generateFullManualMarkdown = (): string => {
  const manifest = getPlatformManualManifest();

  let md = `# 📘 ${manifest.platformName}\n\n`;
  md += `> **系統版本**：v${manifest.version}  \n`;
  md += `> **文檔狀態**：已與生產代碼庫即時同步 (Production Synced)  \n\n`;
  md += `---\n\n`;

  md += `## 📑 目錄架構 (Table of Contents)\n\n`;
  manifest.folders.forEach((f, idx) => {
    md += `${idx + 1}. [${f.title}](#${f.id}) - ${f.description}\n`;
  });
  md += `\n---\n\n`;

  // 1. 操作手冊
  md += `<a id="01_operations"></a>\n`;
  md += `## 📂 ${OPERATIONS_GUIDE.title}\n\n`;
  md += `*${OPERATIONS_GUIDE.summary}*\n\n`;
  OPERATIONS_GUIDE.sections.forEach((sec) => {
    md += `### 👤 角色視角：${sec.role}\n\n`;
    sec.steps.forEach((st) => {
      md += `#### ${st.name}\n${st.description}\n\n`;
    });
  });
  md += `---\n\n`;

  // 2. 功能規格
  md += `<a id="02_features"></a>\n`;
  md += `## 📂 ${FEATURES_SPEC.title}\n\n`;
  md += `*${FEATURES_SPEC.summary}*\n\n`;
  FEATURES_SPEC.modules.forEach((mod) => {
    md += `### ⚡ 模組：${mod.moduleName}\n\n`;
    mod.specs.forEach((sp) => {
      md += `- ${sp}\n`;
    });
    md += `\n`;
  });
  md += `---\n\n`;

  // 3. 平台規則與運作邏輯
  md += `<a id="03_rules"></a>\n`;
  md += `## 📂 ${RULES_AND_LOGIC.title}\n\n`;
  md += `*${RULES_AND_LOGIC.summary}*\n\n`;
  RULES_AND_LOGIC.rules.forEach((r) => {
    md += `### ⚖️ 類別：${r.category}\n\n`;
    r.details.forEach((d) => {
      md += `- ${d}\n`;
    });
    md += `\n`;
  });
  md += `---\n\n`;

  // 4. 技術架構與安全機制
  md += `<a id="04_architecture"></a>\n`;
  md += `## 📂 ${ARCHITECTURE_AND_SECURITY.title}\n\n`;
  md += `*${ARCHITECTURE_AND_SECURITY.summary}*\n\n`;
  ARCHITECTURE_AND_SECURITY.specifications.forEach((spec) => {
    md += `### 🛡️ 領域：${spec.domain}\n\n`;
    spec.points.forEach((p) => {
      md += `- ${p}\n`;
    });
    md += `\n`;
  });
  md += `---\n\n`;

  // 5. 管理員運維守則
  md += `<a id="05_maintenance"></a>\n`;
  md += `## 📂 ${ADMIN_MAINTENANCE.title}\n\n`;
  md += `*${ADMIN_MAINTENANCE.summary}*\n\n`;
  ADMIN_MAINTENANCE.protocols.forEach((p) => {
    md += `### 🛠️ 處置項目：${p.topic}\n\n`;
    p.steps.forEach((s) => {
      md += `- ${s}\n`;
    });
    md += `\n`;
  });

  md += `\n---\n`;
  md += `*本文件由 IdeaX 運營管理中樞自動化生成與歸檔（版本 v${manifest.version}）*\n`;

  return md;
};

/**
 * 瀏覽器原生觸發一鍵下載檔案（支援 Word 文件 .doc、純文字檔 .txt、Markdown .md，徹底不使用 JSON）
 */
export const downloadManualExport = (format: 'markdown' | 'word' | 'txt' = 'markdown') => {
  const manifest = getPlatformManualManifest();
  const fullText = generateFullManualMarkdown();
  
  if (format === 'word') {
    const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${manifest.platformName} 全手冊清單</title>
<style>
body { font-family: "Microsoft JhengHei", "PingFang TC", "微軟正黑體", sans-serif; font-size: 11pt; line-height: 1.6; padding: 24pt; color: #1c1917; }
h1, h2, h3 { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; }
</style>
</head>
<body>
<pre style="white-space: pre-wrap; font-family: 'Microsoft JhengHei', sans-serif; font-size: 11pt; line-height: 1.6;">${fullText}</pre>
</body>
</html>`;
    const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8;' });
    const filename = `IdeaX平台清單_v${APP_VERSION}_${APP_RELEASE_DATE}.doc`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const ext = format === 'txt' ? 'txt' : 'md';
  const filename = `IdeaX平台清單_v${APP_VERSION}_${APP_RELEASE_DATE}.${ext}`;
  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

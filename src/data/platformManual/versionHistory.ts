/**
 * 平台版本資訊與版號維護規則 (IdeaX Version Governance & Changelog)
 * 嚴格遵循單日 0.2.0 增量上限與跨日重置機制
 */

import { APP_VERSION, APP_RELEASE_DATE } from '../versionData';

export interface VersionLogItem {
  seq: number; // 版本序號（全局累計遞增，例如 1, 2, 3...）
  seqCode: string; // 格式化版本序號（例如 "#004"）
  letterSuffix?: string; // 結尾字母 (例如 "a", "b")
  letterSeq?: number; // 結尾字母單獨記數 (若為 'a' 則為 1，'b' 則為 2...)
  version: string;
  date: string;
  isMajor?: boolean;
  title: string;
  summary: string;
  changes: string[];
  note?: string;
}

/**
 * 輔助函式：分析版本號是否有結尾字母，並算出字母單獨記數 (a->1, b->2)
 */
export const parseVersionSequence = (versionStr: string) => {
  const match = versionStr.match(/^(v?[\d.]+)([a-z])$/i);
  if (match) {
    const letter = match[2].toLowerCase();
    const letterSeq = letter.charCodeAt(0) - 96; // 'a' -> 1, 'b' -> 2
    return {
      baseVersion: match[1],
      letterSuffix: letter,
      letterSeq,
    };
  }
  return {
    baseVersion: versionStr,
    letterSuffix: undefined,
    letterSeq: undefined,
  };
};

/**
 * 版本控制治理原則 (Versioning Governance Rules)
 */
export const VERSION_GOVERNANCE_RULES = {
  ruleName: 'IdeaX 平台版本推進規則守則',
  specifications: [
    {
      topic: '基本版本號結構',
      detail: '採用語意化版本規格 (Semantic Versioning)：vMajor.Minor.Patch (例如 v1.5.2)。',
    },
    {
      topic: '版本序號規範 (Release Sequence Number)',
      detail: '每一版皆具備全局連續遞增之「版本序號」(格式如 #001, #002...)；若單日達上限而產生結尾字母版號 (例如 v1.7.2a、v1.7.2b)，此類結尾字母版本亦「單獨佔有一個序號獨立計數」(例如 #021 為 v1.7.2、#022 為 v1.7.2a)，且同時單獨標註字母擴充記數 (例如 a 為擴充#1、b 為擴充#2)，確保每一版皆有獨一無二的序號可供溯源。',
    },
    {
      topic: '單日版本增量上限 (Daily Cap: 0.2.0)',
      detail: '同一日曆天內之常態更新，版本號 Minor 遞增上限嚴格限制為 +0.2.0（例如當前為 1.5.2，單日最高只推進至 1.7.2）。',
    },
    {
      topic: '達上限後之後綴擴充機制',
      detail: '若單日已達 0.2.0 增量上限，當日後續之版本更新自動在版本尾端追加小寫英文字母（例如單日第 21 次更新為 v1.7.2a，依序為 v1.7.2b、v1.7.2c ...），結尾字母單獨記數（a 為第 1 次擴充，b 為第 2 次擴充），並於版號紀錄中載明「已達單日 0.2.0 上限，改以字母遞增」。',
    },
    {
      topic: '隔日啟動與重置原則',
      detail: '跨日（次日）之第一次更新，自動解除小寫字母後綴，並以末位 Patch +1 啟動（例如前日最高為 v1.7.2a，隔日第一次更新即以 v1.7.3 起算），同時重置當日 0.2.0 的可用增量額度與版本序號續接。',
    },
    {
      topic: '重大更新內容註記',
      detail: '凡涉及架構演進、核心金流調配、法規安全審核、系統全新模組發布之改動，需特別標註【重大更新】並條列核心亮點。',
    },
    {
      topic: '時區判定基準 (UTC+8 臺灣標準時間)',
      detail: '全平台版本更新日期、清單資料夾命名與版本資訊日誌，一律以 UTC+8（臺灣標準時間）為唯一定義與紀錄基準。',
    },
    {
      topic: '全站前後端與內部清單版本同步原則 (Full-Stack Version Sync)',
      detail: '每次版本推進更新時，版本號（如 v1.5.5）與最後更新日期（如 2026.10.05）必須百分之百同步更新於：(1) 全域版本設定 (versionData.ts) 與專案配置 (package.json)；(2) 平台內部清單各大手冊與 ZIP 下載資料夾命名；(3) 前端相應展示位置（全站頁尾 Footer、用戶個人儀表板、超管控制台、關於我們頁面）；(4) 後端運行狀態與檢查介面（/api/health 與 /api/version），杜絕任何一處前後端顯示不一致。',
    },
    {
      topic: '文件儲存與導出格式規格 (Text & Word First)',
      detail: '平台內部手冊、各模組檔案與 ZIP 打包導出，嚴禁使用 JSON 格式儲存或傾倒原始碼；一律採用排版工整之純文字檔 (.txt / .md) 與 Microsoft Word 相容文件 (.doc / .docx)，保障任何作業系統、文書軟體或行動裝置皆能直接點開閱讀。',
    },
  ],
};

/**
 * 歷史與當前版本歷程清單 (Changelog)
 */
export const VERSION_HISTORY_LOG: VersionLogItem[] = [
  {
    seq: 7,
    seqCode: '#007',
    version: APP_VERSION,
    date: APP_RELEASE_DATE,
    isMajor: false,
    title: '手冊全面改用文字檔與 Word 格式儲存導出，徹底淘汰 JSON',
    summary: '依指令全面移除 JSON 格式儲存與導出，所有系統手冊與打包檔案改以排版工整之 Word 檔 (.doc) 與純文字檔 (.txt / .md) 提供，支援 Office Word 直接開啟。',
    changes: [
      '徹底移除 JSON 檔案儲存與導出選項。',
      'ZIP 全夾打包自動生成 Microsoft Word 相容文件 (.doc) 與純文字檔 (.txt / .md)。',
      '單檔檢視提供「下載 Word 檔 (.doc)」與「下載文字檔 (.txt)」雙重快捷功能。',
      '自訂檔案上傳支援 .docx, .doc, .md, .txt, .pdf, .csv，並自動轉換結構化文字。',
      '依版本治理原則同步推進全站前後端至 v1.5.5（序號 #007）。',
    ],
    note: '全面提升內部清單文件閱覽便利度，支援 Word 原生開啟。',
  },
  {
    seq: 6,
    seqCode: '#006',
    version: '1.5.4',
    date: '2026.10.05',
    isMajor: false,
    title: '移除未指示新增之 06 測試手冊並精簡內部清單為五大手冊',
    summary: '依使用者指示徹底移除 06 測試手冊模組，精簡內部手冊結構為 00 版本資訊與 01~05 五大核心手冊。',
    changes: [
      '徹底移除 testingGuidelines.ts 及其相依引用與視圖渲染。',
      '精簡「平台內部清單」模組架構為 00 版本資訊 + 01~05 五大核心手冊。',
      '落實全站前後端同步原則推進至 v1.5.4（序號 #006）。',
    ],
    note: '嚴格遵循使用者指示，剔除非必要之冗餘模組。',
  },
  {
    seq: 5,
    seqCode: '#005',
    version: '1.5.3',
    date: '2026.10.05',
    isMajor: false,
    title: '校訂創始發布歷史紀錄與落實版本序號自動謄寫機制',
    summary: '依指令校訂 #001 創始紀錄為「IdeaX 創點子知識問答與專家協作平台正式啟動」，並調整起始日期為 2026.09.22，依規範自動遞增版本至 v1.5.3。',
    changes: [
      '校正 #001 (v1.0.0) 創立日為 2026.09.22。',
      '修正初始發布紀錄名稱為「IdeaX 創點子知識問答與專家協作平台正式啟動」。',
      '確立全站時區以 UTC+8（臺灣標準時間）為基準，日期校訂為 2026.10.05。',
      '落實版本推進原則核算推進至 v1.5.3，序號配發 #005 並自動謄寫紀錄。',
      '自動同步「平台內部清單」各模組版本與 ZIP 下載資料夾命名。',
    ],
    note: '落實使用者規範之版本自動推進與歷程自動謄寫機制（時區：UTC+8）。',
  },
  {
    seq: 4,
    seqCode: '#004',
    version: '1.5.2',
    date: '2026.10.05',
    isMajor: true,
    title: '平台內部清單管理系統、檔案上傳/刪除/全夾 ZIP 下載與身分權限隔離',
    summary: '為管理員打造高安全性內部文件治理中心，支援動態擴展自訂規範並保障非管理員不可見。',
    changes: [
      '新增「平台內部清單」管理中樞，整合 00~05 六大系統手冊與管理規範。',
      '支援管理員在線檔案上傳 (.docx, .doc, .md, .txt, .pdf, .csv) 與自訂新增手冊筆記。',
      '支援單檔與批次刪除防呆機制，並提供系統預設基準模組一鍵恢復功能。',
      '導入 JSZip 實現「一鍵下載整個資料夾 (.zip)」，檔案依規範命名為 IdeaX平台清單_v版本_最後更新日期。',
      '實施嚴格身分隔離防護：僅 currentUser.role === "admin" 席位可檢視與調用，組件層與入口層徹底杜絕非管理員存取。',
      '確立「版本序號」編碼規則：包含全局流水號序號，若有結尾字母版號亦單獨計數。',
      '建立正式【版本資訊】規範文件，落實單日上限 0.2.0 與隔日 Patch 推進機制。',
    ],
    note: '本版本包含管理員重大內部治理、版本序號機制與資安隔離升級。',
  },
  {
    seq: 3,
    seqCode: '#003',
    version: '1.5.0',
    date: '2026.10.05',
    isMajor: true,
    title: '系統五大核心模組規格整合與安全邊界防護',
    summary: '完善平台端到端操作手冊、商業規則、運維 SOP 與技術架構規格手冊。',
    changes: [
      '架構規格全面盤點，強化 Firebase Security Rules 與身分驗證邊界。',
      '整合操作手冊、功能規格、商業邏輯、架構安全與運維 SOP 五大手冊。',
    ],
  },
  {
    seq: 2,
    seqCode: '#002',
    version: '1.4.0',
    date: '2026.10.03',
    isMajor: false,
    title: '案件多階段驗收交付、合約協議自動生成與憑證匯出',
    summary: '實現大額專案的分段驗收託管與商業合約法律簽署。',
    changes: [
      '新增階梯式分段里程碑驗收交付與請款功能。',
      '新增爭議案件線上調解協議書自動生成。',
      '支援個人綜合交易對帳單與年度扣繳憑單匯出。',
    ],
  },
  {
    seq: 1,
    seqCode: '#001',
    version: '1.0.0',
    date: '2026.09.22',
    isMajor: true,
    title: 'IdeaX 創點子知識問答與專家協作平台正式啟動',
    summary: '知識變現、懸賞問題市場與雙向評價信任體系正式啟動。',
    changes: [
      '上架問題市場、專家認證申請、即時通訊中樞。',
      '會員訂閱與點數錢包系統發布。',
    ],
  },
];

/**
 * 產生 Markdown 格式的完整【版本資訊】文件
 */
export const generateVersionInfoMarkdown = (): string => {
  let md = `# 🏷️ IdeaX 平台【版本資訊】與維護規則\n\n`;
  md += `> **當前最新版本**：v${APP_VERSION}  \n`;
  md += `> **最後更新日期**：${APP_RELEASE_DATE}  \n\n---\n\n`;

  md += `## 📜 版本號推進與治理規則守則\n\n`;
  VERSION_GOVERNANCE_RULES.specifications.forEach((rule, idx) => {
    md += `### ${idx + 1}. ${rule.topic}\n`;
    md += `${rule.detail}\n\n`;
  });

  md += `---\n\n`;
  md += `## 🕒 版本更新歷程紀錄 (Version Changelog)\n\n`;

  VERSION_HISTORY_LOG.forEach((log) => {
    const letterInfo = log.letterSuffix ? ` (字母擴充記數: #${log.letterSeq} [${log.letterSuffix}])` : '';
    md += `### [版本序號 ${log.seqCode}] v${log.version}${letterInfo} - ${log.date} ${log.isMajor ? '🔥【重大更新】' : ''}\n`;
    md += `**${log.title}**  \n`;
    md += `*${log.summary}*\n\n`;
    md += `- **版本序號**：\`${log.seqCode}\`（全局累計第 #${log.seq} 版）\n`;
    if (log.letterSuffix) {
      md += `- **字母單獨記數**：第 ${log.letterSeq} 次字母擴充 [${log.letterSuffix}]\n`;
    }
    md += `- **發布日期**：${log.date}\n\n`;
    md += `**主要更新細項：**\n`;
    log.changes.forEach((c) => {
      md += `- ${c}\n`;
    });
    if (log.note) {
      md += `\n> 💡 **備註說明**：${log.note}\n`;
    }
    md += `\n`;
  });

  md += `---\n`;
  md += `*本文件收錄於 IdeaX 平台內部清單中，隨每次版本發布由系統即時同步維護。*\n`;

  return md;
};

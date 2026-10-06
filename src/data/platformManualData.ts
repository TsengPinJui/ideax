/**
 * 平台內部清單與版本治理資料模型
 */

export interface PlatformDocumentModule {
  id: string;
  title: string;
  summary: string;
  content: string;
  status?: string;
  tags?: string[];
}

export interface PlatformDocument {
  id: string;
  code: string; // e.g. "00_版本資訊"
  title: string;
  subtitle: string;
  category: 'version' | 'manual' | 'specs' | 'rules' | 'tech' | 'ops' | 'custom';
  icon: string; // Lucide icon identifier
  color: string;
  moduleCount: number;
  modules: PlatformDocumentModule[];
  createdAt: string;
  updatedAt: string;
  isCustom?: boolean;
  fileData?: string; // For uploaded files (base64 / raw text)
  fileType?: string;
  fileSize?: string;
}

export interface PlatformVersionLog {
  seqNumber: string; // e.g. "#008"
  version: string;    // e.g. "v1.5.7"
  releaseDate: string; // e.g. "2026.10.06"
  releaseTime: string; // e.g. "02:45"
  author: string;
  summary: string;
  changes: string[];
}

export const INITIAL_VERSION_LOGS: PlatformVersionLog[] = [
  {
    seqNumber: '#009',
    version: 'v1.5.8',
    releaseDate: '2026.10.06',
    releaseTime: '03:15',
    author: 'IdeaX 核心架構團隊',
    summary: 'AI 介紹頁底部新增平台全景架構與 AI/Agent 協同功能圖，AICRM 標籤順序與版面優化。',
    changes: [
      '於關於我們與機制說明頁面（AI 介紹篇章）底部新增「平台全景架構與 AI/Agent 協同功能圖」互動視圖。',
      '提供「全域系統架構」、「Agent 協同管線」與「雙引擎無縫備援」三種切換模式，清晰解構發案端、解答端與多 Agent 矩陣。',
      '優化 AICRM 標籤排序（巡航雷達 ➔ 雙向握手 ➔ 優質提案 ➔ 特助代操 ➔ 轉化漏斗），移除子版面干擾提示。',
      '更新雙向媒合特聘流程與「雙向握手」在發案與專家端之即時推播機制。',
    ],
  },
  {
    seqNumber: '#008',
    version: 'v1.5.7',
    releaseDate: '2026.10.06',
    releaseTime: '02:45',
    author: 'IdeaX 管理團隊',
    summary: '管理員控制台頁尾新增「平台內部清單」文檔中心、去背低飽和品牌燈泡識別替換與全模組規格書打包導出。',
    changes: [
      '新增管理員控制台頁尾「平台內部清單」多合一文檔中心，支援 ZIP 打包下載、Word 與 PDF 匯出、在線預覽與檔案上傳。',
      '實作版本號單日 +0.2.0 上限治理演算法、後綴字母自動升軌 (如 v1.5.7a) 與 #001 遞增序號機制。',
      '全站頂部導覽、首頁 Hero 焦點、發布懸賞按鈕與頁尾全面換裝去背正向低飽和金黃燈泡識別圖標。',
      '整合 00~05 共六大核心內部技術與運營手冊，並開放自訂文檔擴充。',
    ],
  },
  {
    seqNumber: '#007',
    version: 'v1.5.6',
    releaseDate: '2026.10.06',
    releaseTime: '01:30',
    author: 'IdeaX 開發核心',
    summary: '還原管理員治理模式快速鍵、優化多帳號切換與修復 TypeScript 型別宣告。',
    changes: [
      '還原 Navbar 管理員頭像下拉選單頂部之紫色「治理模式」快捷切換按鈕。',
      '重構財務治理、案件私聊稽核與爭議調解四大管理分區。',
      '補齊 vite-env.d.ts 環境定義，實現全站 Linter 與 Vite Build 零錯誤。',
    ],
  },
  {
    seqNumber: '#006',
    version: 'v1.5.5',
    releaseDate: '2026.10.05',
    releaseTime: '23:10',
    author: 'IdeaX 產品團隊',
    summary: '創星季 Innovation Challenge 年度大賽專題系統上線。',
    changes: [
      '建置創星季百萬獎金池動態看板、四專題賽道過濾、提案投件與特聘專家榮譽榜。',
      '打造電子榮譽獎狀與完賽證書防偽生成器，支援動態鋼印與 PDF 匯出。',
      '建置管理員創星季專題專用審核與撥付後台。',
    ],
  },
  {
    seqNumber: '#005',
    version: 'v1.5.4',
    releaseDate: '2026.10.05',
    releaseTime: '18:20',
    author: 'IdeaX 運營組',
    summary: 'AI-CRM 智慧客情巡航系統與 24hr 特助功能增強。',
    changes: [
      '升級 AI-CRM 即時巡航對話推薦引導。',
      '強化專家履約履歷與評價權重統計演算法。',
    ],
  },
  {
    seqNumber: '#004',
    version: 'v1.5.3',
    releaseDate: '2026.10.04',
    releaseTime: '21:00',
    author: 'IdeaX 核心架構',
    summary: '安全金流拆款機制與託管合約雙重簽核系統升級。',
    changes: [
      '支援第三方支付虛擬帳號託管與分階段請款。',
      '新增履約偏差與和解仲裁機制。',
    ],
  },
  {
    seqNumber: '#003',
    version: 'v1.5.2',
    releaseDate: '2026.10.03',
    releaseTime: '16:00',
    author: 'IdeaX 產品架構',
    summary: '問題懸賞與痛點市集分流機制上線。',
    changes: [
      '實作 L1 痛點免費提出與 L2/L3 高額懸賞題目結構。',
      '專家自訂解鎖定價與即時問答溝通模組。',
    ],
  },
  {
    seqNumber: '#002',
    version: 'v1.5.1',
    releaseDate: '2026.10.02',
    releaseTime: '14:00',
    author: 'IdeaX 團隊',
    summary: '多角色權限與會員訂閱中心（Free / Pro / Enterprise）。',
    changes: [
      '建立提問者、解題者、校園大使與管理員四大權限角色。',
      '完成會員方案訂閱降級與發票報帳功能。',
    ],
  },
  {
    seqNumber: '#001',
    version: 'v1.5.0',
    releaseDate: '2026.10.01',
    releaseTime: '10:00',
    author: 'IdeaX 創始團隊',
    summary: '創點子 IdeaX 商業智庫與問題解決平台系統立項上線。',
    changes: [
      '全站 PWA 基礎架構、響應式佈局與品牌主視覺奠基。',
      '確立「一個問題，找到更多可能」之核心理念。',
    ],
  },
];

export const DEFAULT_PLATFORM_DOCUMENTS: PlatformDocument[] = [
  {
    id: 'doc-00',
    code: '00_版本資訊',
    title: '00_版本資訊',
    subtitle: '記錄當前版號、更新日期、單日 0.2.0 增量上限與維護規則',
    category: 'version',
    icon: 'Sparkles',
    color: 'amber',
    moduleCount: 7,
    createdAt: '2026.10.01',
    updatedAt: '2026.10.06 02:45',
    modules: [
      {
        id: 'm-00-1',
        title: '當前運行版本 (Production) 與序號定義',
        summary: '管理當前系統運作版本號、增量序號與最後更新時間戳記。',
        content: `### 當前運行版本與序號規格

* **版本號碼**：v1.5.7
* **遞增序號**：#008（從 #001 依序遞增）
* **發布日期**：2026.10.06
* **發布時間**：02:45
* **發布狀態**：Production（正式運作中）
* **運作模式**：單日 0.2.0 增量限制與尾號字母計數規範持續生效中。`,
      },
      {
        id: 'm-00-2',
        title: '單日版本增量上限 (Daily Cap: 0.2.0)',
        summary: '嚴格規範單日版本號累計增加上限為 +0.2.0，確保版本號有序推進。',
        content: `### 版本號推進與治理規則守則

1. **單日版本增量上限 (Daily Cap: 0.2.0)**：
   - 同一天內進行常態更新，版本號 Minor 遞增上限嚴格限制為 **+0.2.0**。
   - 例：若當日起始版本為 v1.5.0，則當日一般版號最高僅能推進至 v1.7.0。

2. **到達單日上限後之字母後綴規則**：
   - 當單日更新次數超過 +0.2.0 上限時，版號維持於當前基底，於尾端追加英文字母後綴。
   - 命名序列：例如 \`v1.5.7a\` -> \`v1.5.7b\` -> \`v1.5.7c\`。

3. **跨日自動重設與下一版進位**：
   - 換日（隔日 00:00 後）開始的下一個版本將去除字母後綴，並自然回歸標準次版號遞增。
   - 例：從 \`v1.5.7a\` 跨日後下一個更新版本自動推進為 \`v1.5.8\`。

4. **序號記錄 (#001 累加)**：
   - 每次 AI Studio 產生重大功能或檔案變動，序號均自動 +1，終身保留歷史可追溯性。`,
      },
      {
        id: 'm-00-3',
        title: '資料夾命名規範與自動封裝',
        summary: '規範每次打包下載與備份之資料夾標準格式。',
        content: `### 內部資料夾標準命名規範

* **命名格式**：\`IdeaX平台內部清單_(日期)_(版本)\`
* **實例範例**：\`IdeaX平台內部清單_2026.10.06_v1.5.7\`
* **內含檔案**：
  1. 00_版本資訊 (.md / .docx / .pdf)
  2. 01_系統操作手冊 (.md / .docx / .pdf)
  3. 02_核心功能規格清單 (.md / .docx / .pdf)
  4. 03_平台運作規則與商業邏輯 (.md / .docx / .pdf)
  5. 04_技術架構與安全機制 (.md / .docx / .pdf)
  6. 05_管理員運維應變守則 (.md / .docx / .pdf)
  7. 管理員自訂上傳之附加附件檔案。`,
      },
      {
        id: 'm-00-4',
        title: '版本更新歷程總表 (Changelog History)',
        summary: '全站歷史發布紀錄與重要里程碑追蹤。',
        content: `### 完整版本發布里程碑歷程

| 序號 | 版本號 | 發布日期 | 發布時間 | 責任單位 | 主要更新項目 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#009** | **v1.5.8** | 2026.10.06 | 03:15 | IdeaX 架構團隊 | AI 介紹頁底部新增平台全景架構與 AI/Agent 協同功能圖，AICRM 標籤順序與版面優化 |
| **#008** | **v1.5.7** | 2026.10.06 | 02:45 | IdeaX 管理團隊 | 管理員頁尾平台內部清單文檔中心、ZIP/Word/PDF 打包與去背燈泡換裝 |
| **#007** | **v1.5.6** | 2026.10.06 | 01:30 | IdeaX 開發核心 | 治理模式按鈕還原、選單架構修復與 TypeScript 零錯誤驗證 |
| **#006** | **v1.5.5** | 2026.10.05 | 23:10 | IdeaX 產品團隊 | 創星季 Innovation Challenge 百萬獎金會場與防偽證書生成 |
| **#005** | **v1.5.4** | 2026.10.05 | 18:20 | IdeaX 運營組 | AI-CRM 客情巡航與 24hr 特助深度整合 |
| **#004** | **v1.5.3** | 2026.10.04 | 21:00 | IdeaX 核心架構 | 履約仲裁與第三方託管安全金流升級 |
| **#003** | **v1.5.2** | 2026.10.03 | 16:00 | IdeaX 產品架構 | 痛點市集與高額懸賞階梯式問題模型上線 |
| **#002** | **v1.5.1** | 2026.10.02 | 14:00 | IdeaX 團隊 | 四大角色權限系統與 Pro 會員訂閱中心 |
| **#001** | **v1.5.0** | 2026.10.01 | 10:00 | IdeaX 創始團隊 | 創點子 IdeaX 商業問題解決平台正式立項開源 |`,
      },
      {
        id: 'm-00-5',
        title: '系統環境識別與多模式切換',
        summary: '正式環境、測試帳號展示與無金流體驗模式規範。',
        content: `### 系統運作環境狀態規範

* **Production Mode (正式運營)**：啟用真實懸賞金託管、專家身分驗證與交易發票開立。
* **Demo / Test Mode (測試模式)**：啟用預設模擬數據、測試帳號一鍵切換與假金流模擬。
* **No Payment Mode (無金流體驗)**：所有題目免收金流手續費，提供初創團隊探索體驗。
* **Hide Test Accounts Mode**：一鍵隱藏全站所有測試標籤用戶，呈現乾淨商業環境。`,
      },
      {
        id: 'm-00-6',
        title: '文檔自動同步與持久化規範',
        summary: 'AI Studio 代碼更動後文檔中心之更新機制。',
        content: `### 文檔自動同步與備份機制

1. **實時動態渲染**：內部清單文檔直接綁定全站最新代碼架構與組件定義，確保隨時導出最新規格。
2. **多格式輸出支援**：
   - **.ZIP**：一鍵打包全部 Markdown + JSON 索引。
   - **.DOC / .DOCX**：保留標準排版、表格與顏色之 Word 文檔。
   - **.PDF**：向量級清晰排版，附正式版權宣告與防偽頁首。
3. **本地與雲端雙備份**：支援管理員手動上傳自訂附件，並於 localStorage / Firestore 同步留存。`,
      },
      {
        id: 'm-00-7',
        title: '智慧財產權與保密宣告',
        summary: '內部清單文件之法律效力與機密等級。',
        content: `### 內部機密與版權保護宣告

* **文件等級**：IdeaX 內部商業機密 (Class-A Confidential)
* **適用對象**：僅授權 IdeaX 核心管理團隊、治理審核委員與簽約技術架構師查閱。
* **禁止行為**：未經授權禁止外流、公開發布或作為第三方衍生產品開發依據。
* **版權所有**：Copyright © 2026 創點子 IdeaX Platform. All Rights Reserved.`,
      },
    ],
  },
  {
    id: 'doc-01',
    code: '01_系統操作手冊',
    title: '01_系統操作手冊',
    subtitle: '包含提問者發案、專家競標、保證金存提與管理員審核全流程',
    category: 'manual',
    icon: 'UserCheck',
    color: 'blue',
    moduleCount: 5,
    createdAt: '2026.10.01',
    updatedAt: '2026.10.06 02:45',
    modules: [
      {
        id: 'm-01-1',
        title: '提問者發布懸賞與痛點操作指引',
        summary: '引導提問者從建立問題、設定懸賞金到驗收解方的完整路徑。',
        content: `### 提問者操作標準作業程序 (SOP)

1. **發布問題**：
   - 點擊頂部或首頁「我有難題，發布懸賞！」或「提出痛點」按鈕。
   - 填寫題目名稱、所屬領域分類、懸賞金額（痛點 L1 可免費發布）、詳細描述與期望交付產出。
2. **審核專家提案**：
   - 收到專家提案後，可查看專家之身分認證、星級雷達圖、歷史評等與提案摘要。
   - 透過內建安全聊天室進行 1 對 1 匿名或實名需求釐清。
3. **採納與撥款**：
   - 滿意提案後點選「採納並託管資金」，確認交付無誤後點擊「驗收撥款」。`,
      },
      {
        id: 'm-01-2',
        title: '解題專家接單、交付與請款流程',
        summary: '專家投標、里程碑交付、補充說明與收益提領指引。',
        content: `### 解題專家接案與收益提領 SOP

1. **探索題目**：進入「問題市場」按領域分類（AI科技、行銷運營、商業策略等）搜尋目標案件。
2. **提交提案**：針對題目提出痛點剖析、解決路徑、預估交付天數與解鎖報價。
3. **交付產出**：於案件管理介面提交報告文字、附件檔案或雲端協作連結。
4. **請款結算**：買家驗收後，懸賞點數即時入帳「我的錢包」，可隨時申請銀行帳戶提領。`,
      },
      {
        id: 'm-01-3',
        title: '會員錢包、儲值點數與開立發票操作',
        summary: '點數存提、綠界支付、發票載具設定與交易明細導出。',
        content: `### 財務模組與錢包操作規範

* **點數比率**：1 點數 (Idea Points) 等值於 NT$ 1 元。
* **儲值渠道**：信用卡即時刷卡、ATM 虛擬帳號、LINE Pay、超商條碼。
* **提領規範**：每週二固定批次撥付，提領免額外平台轉帳手續費（銀行跨行費另計）。
* **發票開立**：支援個人電子發票載具、公司統一編號三聯式發票自動寄送 Email。`,
      },
      {
        id: 'm-01-4',
        title: '創星季 Innovation Challenge 參賽全指南',
        summary: '年度百萬大賽投件、賽道選擇、專家特聘與證書領取手冊。',
        content: `### 創星季參賽與評審指南

1. **賽道選擇**：四大專題（AI Agent 落地、ESG 永續循環、出海新零售、智慧醫療）。
2. **投件流程**：填寫專題企劃書、上傳 Demo 影片或簡報，取得專屬參賽序號。
3. **專家評審**：由特聘產業評審進行三階段評分（初審、複賽、決賽路演）。
4. **獎金與證書**：入圍即頒發區塊鏈防偽電子證書，決賽優勝直接撥付獎金池份額。`,
      },
      {
        id: 'm-01-5',
        title: 'AI-CRM 智慧巡航與 24hr 特助使用守則',
        summary: '智能助理巡檢、自動匹配合適專家與即時客訴應對。',
        content: `### AI-CRM 智慧客情巡航系統操作說明

* **智慧媒合**：依據提問內容向量語義，自動推薦全站前 5% 最適解題專家。
* **24hr 特助代操**：提問者可授權 AI 特助協助過濾無效提案、初篩方案並生成摘要對比報告。
* **異常巡檢**：自動偵測對話中之外部聯絡方式誘導、敏感商業機密洩漏並給予安全提醒。`,
      },
    ],
  },
  {
    id: 'doc-02',
    code: '02_核心功能規格清單',
    title: '02_核心功能規格清單',
    subtitle: '完整涵蓋 10 大核心系統模組規格與技術邊界定義',
    category: 'specs',
    icon: 'Sparkle',
    color: 'amber',
    moduleCount: 10,
    createdAt: '2026.10.01',
    updatedAt: '2026.10.06 02:45',
    modules: [
      {
        id: 'm-02-1',
        title: '問題市集與階梯式懸賞架構',
        summary: 'L1/L2/L3 分級機制與智慧搜尋過濾。',
        content: `### 問題懸賞規格清單
- **L1 痛點腦洞**：NT$ 0 免費提問，專家自訂解鎖費。
- **L2 標準懸賞**：NT$ 500 ~ 5,000，針對具體技術或運營難題。
- **L3 重金專案**：NT$ 5,000 ~ 100,000+，企業級商業諮詢與架構開發。`,
      },
      {
        id: 'm-02-2',
        title: '專家多維能力雷達圖與認證體系',
        summary: '身分實名驗證、專家徽章與動態技能雷達圖。',
        content: `### 專家認證規格
- **實名身分證件稽核**：OCR 驗證與專業證照人工複審。
- **六維能力雷達**：專業深度、交付速度、溝通滿意度、複購率、創新性、合規度。`,
      },
      {
        id: 'm-02-3',
        title: '智慧合約託管與雙向驗收機制',
        summary: '資金第三方託管與滿意度確權。',
        content: `### 資金安全託管機制
- 發布懸賞時資金進入平台安全託管池。
- 驗收通過後系統即時觸發自動分賬結算。`,
      },
      {
        id: 'm-02-4',
        title: '創星季百萬獎金池與證書生成引擎',
        summary: '防偽證書生成、向量鋼印與即時獎金計算。',
        content: `### 創星季系統規格
- 動態計算四階段倒數（初賽截止、評審複選、決賽路演、獎金撥付）。
- HTML5 Canvas + SVG 向量級防偽電子證書即時生成與下載。`,
      },
      {
        id: 'm-02-5',
        title: '即時通訊與私聊對話稽核系統',
        summary: 'WebSocket 雙向通訊、檔案傳輸與敏感詞防護。',
        content: `### 聊天室模組規格
- 支援文字、圖片、PDF 預覽與合約卡片即時發送。
- 管理員後台私聊合規性安全稽核通道。`,
      },
      {
        id: 'm-02-6',
        title: '爭議調解與仲裁法庭系統',
        summary: '申訴發起、證據舉證與仲裁委員投票。',
        content: `### 仲裁機制規格
- 提問者或專家均可發起爭議仲裁。
- 系統指派 3 位公正專家與 1 位管理員組成審議委員會。`,
      },
      {
        id: 'm-02-7',
        title: '會員方案與訂閱計費中心',
        summary: 'Free, Pro, Enterprise 會員權益與手續費折扣。',
        content: `### 訂閱中心規格
- **Free**：基礎提問與競標，平台手續費 15%。
- **Pro (NT$ 899/月)**：免手續費提問、優先推薦、手續費降至 8%。
- **Enterprise (NT$ 3,999/月)**：專屬 1 對 1 商業顧問、自訂合約與手續費 5%。`,
      },
      {
        id: 'm-02-8',
        title: '管理員全功能後台與指標看板',
        summary: 'GMV、活躍用戶、案件全生命週期管理。',
        content: `### 管理後台規格
- 財務撥付、點數發放、手續費率全域調控。
- 網站指標即時開關與首頁 Banner 公開控制。`,
      },
      {
        id: 'm-02-9',
        title: 'PWA 漸進式網頁應用與離線快取',
        summary: 'Service Worker 快取、Manifest 與原生安裝支援。',
        content: `### PWA 規格
- 支援 iOS Safari / Android Chrome / Desktop 一鍵加入主畫面。
- 離線時自動快取已載入之問題清單與手冊資料。`,
      },
      {
        id: 'm-02-10',
        title: '多語系與響應式跨裝置適配',
        summary: '桌面端、平板與手機端極致響應式排版。',
        content: `### 裝置適配規格
- 支援 320px ~ 4K 超寬螢幕自適應。
- 底部導覽列與頂部 Sticky Header 流暢轉場。`,
      },
    ],
  },
  {
    id: 'doc-03',
    code: '03_平台運作規則與商業邏輯',
    title: '03_平台運作規則與商業邏輯',
    subtitle: '交易手續費率、智財歸屬、退款保障與專家信譽評等法',
    category: 'rules',
    icon: 'Scale',
    color: 'emerald',
    moduleCount: 5,
    createdAt: '2026.10.01',
    updatedAt: '2026.10.06 02:45',
    modules: [
      {
        id: 'm-03-1',
        title: '交易手續費率與階梯分潤模型',
        summary: '平台標準抽成、會員折扣與行銷分潤算法。',
        content: `### 手續費與分潤模型
* **基礎抽成**：平台標準服務費率為案件總額之 10% ~ 15%。
* **會員優惠**：Pro 會員享 8% 優惠費率；Enterprise 會員享 5%。
* **創作者分潤**：解答專家獲得案件總額之 85% ~ 95% 實收淨額。`,
      },
      {
        id: 'm-03-2',
        title: '智慧財產權 (IP) 歸屬與非公開保護條款',
        summary: '買方版權轉移、商業秘密保障與競業限制條款。',
        content: `### 智財權歸屬守則
* **驗收後轉讓**：提問者驗收付款完成之當下，該解答之著作財產權自動無條件移轉予提問者。
* **保密義務**：專家未經提問者書面同意，不得將提問者之商業數據或專有架構揭露予第三方。`,
      },
      {
        id: 'm-03-3',
        title: '退款保障機制與爭議處理程序',
        summary: '無解退款、延期違約與部分交付裁決。',
        content: `### 退款與保障機制
* **逾期未交付**：專家超過約定天數且無合理說明，提問者可申請全額退還託管懸賞金。
* **品質爭議**：由平台審議委員會介入評定交付完成度，支援「按比例退款」或「重新修改交付」。`,
      },
      {
        id: 'm-03-4',
        title: '專家信譽積分 (Karma) 與獎懲升降級規範',
        summary: '好評加分、違規扣分、封鎖與優先推薦機制。',
        content: `### 信譽積分規範
* **起始分**：新註冊專家預設 100 分。
* **獎勵**：五星好評 +5 分、準時交付 +2 分。
* **懲處**：惡意棄標 -20 分、涉嫌抄襲扣除 50 分並暫停接單 14 天。`,
      },
      {
        id: 'm-03-5',
        title: '反作弊、防洗錢與異常金流監控規則',
        summary: '同 IP 互刷偵測、單日大額異常交易攔截。',
        content: `### 風控機制
* 系統即時監控關聯帳號自提自標等刷單行為。
* 單日出金超過 NT$ 50,000 觸發二次人工作業審核。`,
      },
    ],
  },
  {
    id: 'doc-04',
    code: '04_技術架構與安全機制',
    title: '04_技術架構與安全機制',
    subtitle: '前端 React 19、雙引擎資料庫、RBAC 權限與資安加密',
    category: 'tech',
    icon: 'Cpu',
    color: 'purple',
    moduleCount: 4,
    createdAt: '2026.10.01',
    updatedAt: '2026.10.06 02:45',
    modules: [
      {
        id: 'm-04-1',
        title: '前端技術棧與現代化 UI 架構',
        summary: 'React 19, TypeScript, Tailwind CSS, Vite, Motion。',
        content: `### 前端架構規範
* **Framework**：React 19 (SPA Architecture)
* **Build Tool**：Vite 8.3 + TypeScript
* **Styling**：Tailwind CSS (Zero-Pill Discipline, Elegant Typography)
* **Animation**：Motion (Framer Motion 12) + Lucide Icons`,
      },
      {
        id: 'm-04-2',
        title: '後端與資料庫雙引擎 (Firestore + Cloud SQL)',
        summary: '即時文檔存儲與關聯資料庫高併發設計。',
        content: `### 資料持久化架構
* **Firestore**：即時聊天室、通知推送、即時線上狀態同步。
* **Cloud SQL (PostgreSQL)**：財務帳務日誌、發票記錄、高併發交易交易鎖定。`,
      },
      {
        id: 'm-04-3',
        title: '資安防護與 RBAC 角色權限矩陣',
        summary: 'XSS/CSRF 防護、資料加密脫敏與嚴密權限隔離。',
        content: `### 資訊安全守則
* **身分驗證**：Firebase Auth + JWT Token 驗證。
* **資料脫敏**：用戶身分證件與銀行帳號全數進行 AES-256 加密存儲。
* **RBAC**：Admin, Ambassador, Solver, User, Guest 五層級嚴密路由保護。`,
      },
      {
        id: 'm-04-4',
        title: 'API 效能優化與 CDN 快取加速',
        summary: '圖片自動壓縮、Service Worker 與邊緣節點加速。',
        content: `### 效能指標 (Core Web Vitals)
* LCP < 1.2s，FID < 50ms，CLS < 0.05。
* 全站靜態資源經由 Google Cloud CDN 全球邊緣節點加速分發。`,
      },
    ],
  },
  {
    id: 'doc-05',
    code: '05_管理員運維應變守則',
    title: '05_管理員運維應變守則',
    subtitle: '高負載降級處置、異常交易凍結、爭議仲裁介入與緊急維護 SOP',
    category: 'ops',
    icon: 'Wrench',
    color: 'rose',
    moduleCount: 4,
    createdAt: '2026.10.01',
    updatedAt: '2026.10.06 02:45',
    modules: [
      {
        id: 'm-05-1',
        title: '流量激增與高負載降級應變 SOP',
        summary: '快取策略切換、非核心功能暫停與自動擴展。',
        content: `### 高負載應急流程
1. 觸發自動降級：關閉非必要之即時動畫與大圖高頻輪播。
2. 提高 CDN 快取命中率至 95% 以上。
3. Cloud Run 自動水平擴展實例節點。`,
      },
      {
        id: 'm-05-2',
        title: '惡意刷單與異常資金凍結處置程序',
        summary: '一鍵鎖定帳戶、資金原路退回與記錄留存。',
        content: `### 資金凍結 SOP
1. 管理員於「交易治理後台」點擊「緊急凍結」。
2. 系統暫停該帳號之所有提領與競標權限。
3. 寄送系統安全通知至該用戶註冊郵箱進行人工身分核實。`,
      },
      {
        id: 'm-05-3',
        title: '重大爭議案件平台快速介入流程',
        summary: '24 小時內專案調解組成立與裁決執行。',
        content: `### 爭議調解 SOP
1. 接獲申訴 2 小時內完成雙方舉證資料調閱。
2. 12 小時內召開線上仲裁委員會。
3. 24 小時內出具具有法律保障之平台仲裁裁決書。`,
      },
      {
        id: 'm-05-4',
        title: '系統緊急維護與停機公告發布流程',
        summary: '維護模式啟用、用戶橫幅公告與資料完整性備份。',
        content: `### 停機維護標準規範
1. 提前 24 小時發布全站頂部跑馬燈公告。
2. 切換至維護模式 (Maintenance Mode)。
3. 完成數據庫全量快照備份後執行更新發布。`,
      },
    ],
  },
];

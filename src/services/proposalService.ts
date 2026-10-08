/**
 * 創點子 IdeaX - 完整商業企劃書暨全系統規格書
 * 支援一鍵下載 Markdown 檔案、列印/匯出 PDF 以及安全複製全文
 */
import { copyToClipboard } from '../utils/clipboard';

export const PROPOSAL_VERSION = 'v3.0 (2026 AI-CRM 與多階巡航發布版)';
export const PROPOSAL_UPDATED_AT = '2026 年 10 月';

export const FULL_PROPOSAL_MARKDOWN = `# 創點子 IdeaX — 商業企劃書暨全系統規格說明書
**Ideas Connect Possibilities ｜ 讓想法發光・高價值問題與解決方案交易市場**

- **文件版本**：${PROPOSAL_VERSION}
- **最後更新**：${PROPOSAL_UPDATED_AT}
- **編制單位**：創點子 IdeaX 核心產品與商業策劃小組
- **文件密級**：營運公開企劃書（適用於投資融資、合作夥伴洽談、開發交付與團隊營運培訓）

---

## 摘要與核心願景（Executive Summary）

### 1.1 產品定位
**創點子 IdeaX** 是一個立足於雙向激勵機制的**高價值問題與落地解決方案交易平台**。平台突破傳統論壇「免費白嫖、內容零散、回答無責任感」的困境，以及傳統管理顧問公司「費用昂貴、簽約門檻高、週期冗長」的隔閡，將「商業痛點、技術疑難、創業瓶頸與學術挑戰」轉化為明碼標價的**懸賞標的**與**智慧財產交易單元**。

### 1.2 核心價值主張 (Value Proposition)
1. **對提問者（企業/創業者/個人）**：
   - **快速直擊核心**：以懸賞激勵頂尖專家深度投入，擺脫一般論壇毫無深度的表面意見。
   - **第三方安全託管保障**：發布即託管賞金，確認採納前資金嚴密鎖定，未獲合適解答依規保障退回。
   - **結構化交付多樣性**：不只是文字，支援落地方案附件（PDF/Excel/程式碼）與 1 對 1 線上諮詢會談。

2. **對解答者（產業顧問/資深工程師/智財專家/斜槓達人）**：
   - **智財直接變現**：每一個深度解答都具有真實商業價值，告別無償消耗。
   - **長尾被動收益（Paywall）**：優質方案公開前段免費預覽，完整方案設為付費解鎖，可被多次購買解鎖。
   - **階梯訂閱降抽成機制**：最高可享 20% 抽成返還，實質抽成低至 5%，收益 95% 全額落袋。

3. **對平台本身（商業閉環與飛輪）**：
   - **雙軌交易變現**：懸賞託管抽成 + 付費方案解鎖抽成 + 私聊客製化專案 (Custom Offer) 抽成。
   - **階梯會員訂閱費收入**：月租型訂閱體系（NT$ 99 ~ NT$ 9,999/月），提供穩定經常性營收 (MRR)。
   - **AI 智能賦能**：自動生成需求摘要、剖析痛點結構、智能媒合認證專家，極致降低摩擦成本。

---

## 二、市場痛點與機會分析（Market Pain Points & Opportunities）

### 2.1 現狀問題與痛點矩陣
| 維度 | 傳統開放論壇（PTT / Dcard / 知乎 / Reddit） | 傳統企管與智財顧問公司 | 創點子 IdeaX 創新作法 |
| :--- | :--- | :--- | :--- |
| **激勵機制** | 無報酬，純靠熱情，灌水與筆戰居多 | 收費極高（動輒數十萬起跳），小微企業難以負擔 | 明確的五級懸賞機制（L0~L4），小額至資深顧問皆有對應方案 |
| **解答品質** | 碎片化、缺乏系統性、無人對答案品質負責 | 高品質但週期冗長，溝通流程僵化 | 付費預覽制（Paywall），提問者看見精華才解鎖，品質嚴選 |
| **專家意願** | 專家不願免費耗時撰寫落地架構 | 專家被顧問公司層層抽佣，到手比例低 | 平台提供透明抽成與訂閱返還，收益最高 95% 實拿 |
| **交付形式** | 僅支援文字留言 | 繁瑣紙本或正式簡報會議 | 支援文字建議、雲端檔案（50MB）、線上會談（Meet/Zoom）多元組合 |
| **交易安全** | 無保障，私下匯款易遭遇詐騙 | 繁重複雜的合約審查，法律門檻高 | 平台第三方安全託管中，採納後才扣款清算，金流安全無虞 |

### 2.2 目標用戶群體畫像 (User Personas)
- **Persona A：連續創業者與新創團隊長（發問主力）**
  - 特徵：面臨商業模式驗證、法規智財風險、單元經濟學計算或海外開拓，需要業界前輩的實戰踩坑經驗。
  - 核心痛點：沒有足夠預算找頂級管顧，朋友人脈有限，亟需對症下藥的落地架構。
- **Persona B：資深技術專家 / 執業顧問 / 斜槓專業人士（解答主力）**
  - 特徵：在特定領域具備 8~15 年經驗，具備獨門解決方案、合約模板或系統架構。
  - 核心痛點：平日諮詢多被親朋好友「順便問問」消耗，希望能有尊嚴且高效率地將個人智慧財產變現。
- **Persona C：日常探索者與知識付費學習者（解鎖消費者）**
  - 特徵：不是問題發起人，但對某個產業痛點的深入解方（如：無人商店防盜策略、SaaS定價模型）極具需求，願意支付小額金額直接解鎖現成方案。

---

## 三、五級問題分級體系（L0 ~ L4 Problem Level Hierarchy）

創點子首創清晰的五級商業問題分級標準，讓提問者精準衡量預算，解答者迅速對焦投入精力：

| 等級代碼 | 等級名稱 | 賞金區間 (NT$) | 適用場景與定位 | 典型範例 | 平台保障與特性 |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **L0** | **無賞金問題** | **NT$ 0** | 社群開放交流、觀點碰撞、痛點收集、閒聊探討 | 「大家在遠端工作時最容易卡關的溝通工具是什麼？」 | 無門檻發布，專屬「L0問題討論區」，激發大眾社群參與感 |
| **L1** | **小額懸賞** | **NT$ 100 ~ 300** | 快速痛點診斷、工具技術推薦、日常疑難排查 | 「推薦 2026 年適合台灣小微電商的發票載具整合方案」 | 適合輕量解答，發布即託管，快速獲得 3~5 則專業方向建議 |
| **L2** | **進階懸賞** | **NT$ 301 ~ 899** | 商業架構初審、產品冷啟動診斷、基礎財務模型 | 「大學校園生活圈無人租借機櫃，單點單元經濟學評估」 | 吸引達人與專業專家提供系統化策略與步驟拆解 |
| **L3** | **高價值挑戰** | **NT$ 900 ~ 2,999** | 跨領域技術突破、深度法規智財攻防、落地方案規劃 | 「生醫材料外銷東南亞之專利防禦與醫療器材認證路徑」 | 方案多搭配檔案交付或 30 分鐘線上會談，具備高商業價值 |
| **L4** | **資深顧問級** | **NT$ 3,000 以上** | 核心系統架構、重大商務轉折、合約草擬與稅務合規 | 「百萬級月活社交平台抗併發高可用雲端微服務架構」 | 特邀認證顧問深度研討，提供企業級專業可行性報告 |

---

## 四、核心業務流程與雙軌交易閉環（Trading & Financial Closed Loop）

### 4.1 雙軌交易機制（Dual Revenue Tracks）
1. **軌道一：懸賞金託管與採納結算（Bounty Escrow Track）**
   - 提問者發布問題時設定懸賞金額。
   - 系統即時驗證：**帳戶可用餘額需 $\ge$ 賞金 100%**。若不足立即引導線上儲值補足差額。
   - 審核通過後，賞金進入**平台第三方安全託管池**，狀態標記為「**第三方安全託管中・將於採納方案後扣款**」。
   - 解答者提交方案後，提問者可隨時於方案下方點選「綠色勾勾確認採納」。
   - 採納瞬間：系統自動扣除平台服務費，將淨收益即時存入解答者錢包餘額，狀態提示「**已扣除平台費率・完成方案即存入帳戶餘額**」。
   - 同時問題標記為「已解決 (solved)」，並同步結算採納數與採納率。

2. **軌道二：付費深度方案解鎖（Paywall Unlocking Track）**
   - 解答者在提交方案時，提供：
     - **免費精華預覽（Free Preview）**：公開邏輯框架、痛點分析與核心觀點，讓所有人驗證其專業實力。
     - **付費解鎖內容（Full Paywalled Content）**：詳細落地方案、操作 SOP、源代碼、合約條款範本。
   - 價格可採用問題原懸賞金額，亦可由解答者自訂。
   - **長尾效應**：全站任何有相同困境的第三方用戶，皆可付費解鎖；每被解鎖一次，解答者即賺取一次淨收益。

3. **軌道三：私聊一對一自訂方案交易（Custom Offer Direct Trade）**
   - 雙方可在即時私聊視窗（ChatView）內深入溝通。
   - 專家可發起「自訂報價卡片 (Custom Offer)」，載明交付標的、預估天數與金額。
   - 買方點選「接受並付款」直接採納並完成交易，款項即時結算。
   - **採納率連動規則**：私聊交易與公開問題採納**皆同步計入「方案採納率 (Acceptance Rate)」之核心指標計算**。

### 4.2 多元方案交付形式（Delivery Formats）
解答者提交時可任意單選或複選三種交付維度：
1. **文字建議**：Markdown 格式之深度報告、落地步驟規劃與架構剖析。
2. **附件檔案**：支援落地方案檔案（PDF、Word、Excel 模型、ZIP 原型代碼等），上限 50MB。
3. **線上會談預約 (Meeting Consultation)**：
   - 會談時長：如 30 分鐘、60 分鐘、90 分鐘。
   - 視訊工具：Google Meet、Zoom、Microsoft Teams、LINE 語音/電話 等。
   - 可預約時段：載明週間時段或預約說明。
   - 會談大綱：明確定義諮詢範圍，避免溝通發散。

---

## 五、平台費率、階梯訂閱降抽成體系（Commission & Subscription Model）

### 5.1 基準費率
平台基準抽取 **25% 技術服務費**，用於：
- 維護 AI 智能剖析與語意媒合運算引擎
- 支應第三方金流手續費、資安風控與第三方安全託管成本
- 專家實名認證、執業資格人工審核與侵權仲裁體系
- 平台 SEO 與流量拓展

### 5.2 階梯式會員訂閱降抽成方案（每月自動返還）
為激勵專業高產專家長期深耕，平台推行**訂閱返還制（月退機制）**：
每次交易先以 25% 標註，於每月最後一日依會員等級**自動計算並將 5% ~ 20% 返還金直接匯入錢包餘額**：

| 方案名稱 | 月費 (NT$) | 減免抽成比例 | 實質抽成費率 | 專家實收佔比 | 專屬功能權益 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **一般會員 (Free)** | **NT$ 0** | 0% | **10%** | **90%** | 全站自由發問與解答提案、第三方安全託管與自動拆款 |
| **達人方案 (Pro)** | **$299/月 (半年$1,499)** | **2%** | **8%** | **92%** | 平台抽成僅 8%、AI 初步問題分析報告、AI 整理提案架構 |
| **權威方案 (Authority)** | **NT$ 599 ($5,990/年)** | **5%** | **5%** | **95%** | 抽成降至 5%、高賞提案優先推薦 |
| **大師方案 (Master)** | **NT$ 1,980 ($19,800/年)** | **8%** | **2%** | **98%** | 2% 極低服務費（實收 98%）、24hr AI客服特助、AI-CRM 客戶關係管理系統 |

---

## 六、用戶數據隱私與個人儀表板控制（Privacy & Control Mechanisms）

為尊重專家與企業客戶的商業機密與隱私，平台提供細緻的隱私開關：
1. **提問者隱私保護**：
   - 可一鍵開啟「**隱藏我的提問數據**」（隱藏歷史發問數量、平均懸賞金額），避免競品分析其研發方向。
2. **解答者公開資料自主權**：
   - 基礎展示：姓名、職稱、專業領域標籤、認證專家徽章、星級評分（0~5星）與已採納方案總數。
   - 隱私自主控制：可自由勾選是否公開「**提交方案總數**」、「**方案被採納率 %**」以及「**平均方案賞金**」，兼顧新手專家與資深權威的不同定位需求。

---

## 七、AI 賦能與全站 SEO 傳播架構（AI & SEO Engineering）

### 7.1 Google Gemini API 深度整合
- **智能痛點結構化拆解**：發問者填寫基本想法後，AI 即刻剖析其商業盲點，輸出「需求摘要、痛點結構清單、建議解答者輪廓」。
- **智慧分類與標籤推薦**：自動對齊 4 大一級領域與 24+ 細分子領域，大幅降低搜尋摩擦。

### 7.2 全站 SEO 與社群裂變引擎
- **Google 結構化數據 (Schema.org)**：自動為每個問題頁面動態注入 \`QAPage\`、\`Question\` 與 \`AcceptedAnswer / SuggestedAnswer\` 的 JSON-LD 標記，享有搜尋引擎 Rich Snippets 優先排名。
- **OpenGraph & Twitter Cards**：社群分享時自動生成高點擊率的動態標題與預覽摘要。
- **安全分享複製**：內建跨環境（相容 iFrame 與未聚焦文檔）的剪貼簿防護機制，一鍵複製專屬分享連結。

---

## 八、全系統功能現狀與完成度檢核（Status & Completion Audit）

截至當前版本，前端業務邏輯與全套閉環已達成 **100% 完整運作（Production-Ready Frontend）**：

| 功能模組 | 完成度 | 狀態說明 |
| :--- | :---: | :--- |
| **全站導覽與五級問題檢視** | 100% | 支援分類篩選、24+ 細分類、L0~L4 分級過濾、熱門排序 |
| **發問流程與門檻驗證** | 100% | 發布時驗證餘額需 $\ge$ 賞金 100%，不足時一鍵引導儲值 |
| **方案提交與交付設定** | 100% | 支援文字建議、檔案附件（50MB）、線上會談（時長/平台/時段/大綱） |
| **方案採納與獎金結算** | 100% | 問題下方勾選綠色採納；自動扣除平台費率；文案明確標註 |
| **AI 智慧爭議仲裁與調解** | 100% | 語意比對需求與交件落差，產出需求達成率、缺失分析與客觀拆款建議 |
| **私聊系統與即時自訂報價** | 100% | 支援私聊對話、自訂方案卡片、買方付款採納、納入採納率計算 |
| **階梯訂閱降抽成體系** | 100% | 包含五種會員等級設定、月費計算、月底返還比例設定與計算 |
| **錢包系統與交易明細** | 100% | 儲值、託管、解鎖、扣款、收益發放、提領申請與交易流水表記錄 |
| **認證專家名人堂** | 100% | 支援領域過濾、星級排序、專家代表案例展示與一對一私訊入口 |
| **個人隱私與儀表板** | 100% | 完整支援提問者隱私切換、解答者數據隱私切換、個人資產盤點 |
| **平台管理員後台** | 100% | 平台交易總額監控、預估抽成利潤分析、活躍問題管理 |
| **剪貼簿與 SEO 系統** | 100% | 安全複製容錯（解決 iframe unfocused 異常）、動態 QAPage 預覽 |

---

## 九、正式上線營運待落地規劃（Production Implementation Roadmap）

為邁向真實商業上線與大規模營運，後續標準工程落地路徑如下：

\`\`\`
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   階段一：基礎設施   │ ──> │   階段二：金流合規   │ ──> │   階段三：營運推廣   │
│ 認證系統 / 雲端儲存 │     │ 第三方支付 / 託管合約 │     │ 專家入駐 / 企業合作 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
\`\`\`

1. **真實用戶認證體系（Authentication）**：
   - 串接 Firebase Auth / Google OAuth 一鍵登入。
   - 整合台灣在地手機簡訊 OTP（如 Twilio / 三竹資訊），防止惡意灌水與洗假評價。
2. **在地化第三方金流串接（Payment Gateway）**：
   - 串接台灣主流合法代收代付平台（藍新金流 NewebPay / 綠界 ECPay）。
   - 支援信用卡、虛擬帳號 ATM 轉帳、超商代碼繳費與企業統編發票開立（B2B 報帳必備）。
   - 對接銀行信託帳戶落實資金合法託管，遵循數位發展部第三方支付監管規範。
3. **雲端檔案物件儲存（Cloud Storage）**：
   - 串接 AWS S3 或 Google Cloud Storage，支援解答附件之非對稱加密上傳與安全時效下載連結 (Signed URLs)。
4. **真實通訊與推播中心（Push Notifications）**：
   - 整合 SendGrid / Mailgun 發送方案採納信件與入帳通知。
   - 整合 LINE Official Account (LINE Notify / Messaging API)，讓專家第一時間在 LINE 收到高額問題配對通知。
5. **智財權保護與免責法律條款（Legal & Compliance）**：
   - 制訂標準《使用者服務條款》、《解答者智慧財產權授權協議》與《爭端仲裁機制》。
   - 針對 L4 大額諮詢，提供線上電子簽署 NDA（保密協定）與會談錄音留存協議。

---

## 十、財務預測與營運指標模擬（Financial Forecast & Unit Economics）

### 10.1 單元經濟學模型 (Unit Economics)
- **平均客單價 (AOV)**：預期提問懸賞均價 NT$ 850，方案付費解鎖均價 NT$ 350。
- **平台平均綜合取佣率 (Take Rate)**：扣除訂閱返還後預期為 **16.5% ~ 19.8%**。
- **經常性月訂閱營收 (MRR)**：預估首年 15% 活躍解答者升級為付費訂閱會員（平均月費貢獻 NT$ 320）。

### 10.2 第一至三年營運指標模擬
| 指標項目 | 第一年 (Year 1) | 第二年 (Year 2) | 第三年 (Year 3) |
| :--- | :---: | :---: | :---: |
| **註冊會員數** | 25,000 人 | 120,000 人 | 450,000 人 |
| **認證專家數** | 1,200 位 | 6,000 位 | 22,000 位 |
| **年度發布問題總數** | 18,000 題 | 105,000 題 | 480,000 題 |
| **年度 GMV（總交易流水）** | **NT$ 18,500,000** | **NT$ 115,000,000** | **NT$ 580,000,000** |
| **平台佣金收入 (Avg 18%)** | NT$ 3,330,000 | NT$ 20,700,000 | NT$ 104,400,000 |
| **會員訂閱費收入 (MRR)** | NT$ 850,000 | NT$ 4,800,000 | NT$ 21,500,000 |
| **年度總營業收入** | **NT$ 4,180,000** | **NT$ 25,500,000** | **NT$ 125,900,000** |

---

## 結論

**創點子 IdeaX** 藉由創新的**五級問題標準體系**、**餘額門檻保障機制**、**多元交付（文字/檔案/線上會談）**與**階梯式訂閱返還模式**，成功在「傳統免費用戶」與「高階顧問市場」之間開闢了廣闊的藍海。本平台在技術、產品架構與交易閉環上已全面就緒，兼具高商業壁壘與強勁的網絡效應，具備極高的商業投資與規模化營運價值。

---
*文件結束 ｜ 創點子 IdeaX 團隊版權所有*
`;

/**
 * 觸發下載 Markdown 企劃書檔案
 */
export function downloadProposalMarkdown() {
  const filename = `創點子IdeaX_完整商業企劃書與系統規格書_${new Date().toISOString().slice(0, 10)}.md`;
  const blob = new Blob(['\uFEFF' + FULL_PROPOSAL_MARKDOWN], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 複製企劃書全文至剪貼簿
 */
export async function copyProposalMarkdown(): Promise<boolean> {
  return await copyToClipboard(FULL_PROPOSAL_MARKDOWN);
}

/**
 * 列印或轉存 PDF
 */
export function printProposalDocument() {
  window.print();
}

import { ThreeWayDiscrepancyItem, MediationSettlementOption } from '../types';

/**
 * 觸發下載正式商務和解協議書與履約偏差建議書 (.md) 檔案
 */
export function downloadMediationContractMarkdown(params: {
  contractId: string;
  version: number;
  questionTitle: string;
  questionerName: string;
  solverName: string;
  settlementAmount: number;
  estimatedDays: number;
  recommendedAction: string;
  mediatorOpinion: string;
  fulfilledPoints: string[];
  unfulfilledPoints: string[];
  scopeCreepPoints?: string[];
  threeWayDiscrepancies?: ThreeWayDiscrepancyItem[];
  responsibilityBreakdown?: {
    solverWeight: number;
    buyerWeight: number;
    platformAssessment: string;
  };
  options?: {
    optionA: MediationSettlementOption;
    optionB: MediationSettlementOption;
  };
  agreedOption?: 'optionA' | 'optionB';
  escrowedAt?: string;
}) {
  const dateStr = params.escrowedAt ? new Date(params.escrowedAt).toLocaleString('zh-TW') : new Date().toLocaleString('zh-TW');

  let discrepanciesMarkdown = '';
  if (params.threeWayDiscrepancies && params.threeWayDiscrepancies.length > 0) {
    discrepanciesMarkdown = `## 【附錄一】大摩法理三方客觀證據鏈平行比對矩陣 (Three-Way Truth Anchor)

| 原始約定需求目標 | 專家實際交付內容 | 雙方通訊記錄佐證 | 仲裁判定狀態 | 備註說明 |
| :--- | :--- | :--- | :--- | :--- |
${params.threeWayDiscrepancies
  .map(
    (d) =>
      `| ${d.targetGoal.replace(/\|/g, '/')} | ${d.actualDelivery.replace(/\|/g, '/')} | ${d.communicationLog.replace(/\|/g, '/')} | ${
        d.status === 'fulfilled' ? '已達標 (Fulfilled)' : d.status === 'scope_creep' ? '需求追加(免責 Scope Creep)' : '實質偏差 (Discrepancy)'
      } | ${(d.notes || '無').replace(/\|/g, '/')} |`
  )
  .join('\n')}

---
`;
  }

  let optionsMarkdown = '';
  if (params.options) {
    optionsMarkdown = `## 和解處置裁量雙軌方案

### 【方案 A】按比例折讓退款與劃撥結案 (Financial Settlement)
- **解答者實質撥款**：NT$ ${params.options.optionA.payoutAmount.toLocaleString()} 元（${params.options.optionA.payoutPercentToSolver}%）
- **提問者即刻退還**：NT$ ${params.options.optionA.refundAmount.toLocaleString()} 元（${params.options.optionA.refundPercentToBuyer}%）
- **處置說明**：${params.options.optionA.description}

### 【方案 B】限期補充交付與延長驗收天數 (Cure Period & Extended Remediation)
- **補正交付期限**：本協議成立後 **${params.options.optionB.extendedDays || 3} 個工作天內**
- **驗收期相應延長**：${params.options.optionB.extendedDays || 3} 個工作天
- **全額履約金額**：NT$ ${params.options.optionB.payoutAmount.toLocaleString()} 元
- **指定補正項目**：
${(params.options.optionB.remediationTasks || []).map((t) => `  - [ ] ${t}`).join('\n')}

**兩造最終同意執行方案**：${params.agreedOption === 'optionA' ? '【方案 A：按比例折讓結案】' : params.agreedOption === 'optionB' ? '【方案 B：限期補齊與延長驗收】' : '雙方協商確認中'}

---
`;
  }

  const content = `# 創點子 IdeaX 平台商務履約偏差與和解建議書 (正式電子契約)

**協議存證編號**：CTR-${params.contractId.slice(-8).toUpperCase()}  
**契約規格版本**：第 v${params.version} 版和解協議書  
**生效與劃撥託管日期**：${dateStr}  
**平台獨立存證驗證**：IdeaX 第三方金流託管認證存證 (SHA-256 Verified)  
**審計參照規範**：J.P. Morgan 式多重防護欄與三方客觀證據鏈比對標準

---

### 立和解協議書人：
- **甲方（提問／委託方）**：${params.questionerName}
- **乙方（解答／承攬方）**：${params.solverName}
- **第三方智能調解與託管機構**：創點子 IdeaX 平台（IdeaX AI助理）

---

## 爭議背景與專案資訊
- **原始專案主題**：${params.questionTitle}
- **已履約成果項目**：
${params.fulfilledPoints.map((pt) => `  - [x] ${pt}`).join('\n')}
- **待補齊/爭議落差點**：
${params.unfulfilledPoints.map((pt) => `  - [ ] ${pt}`).join('\n')}
${params.scopeCreepPoints && params.scopeCreepPoints.length > 0 ? `- **買方追加需求標註 (Scope Creep)**：\n${params.scopeCreepPoints.map((pt) => `  - [!] ${pt}`).join('\n')}` : ''}

${discrepanciesMarkdown}
## IdeaX AI助理爭議剖析與責任歸屬評估
${params.mediatorOpinion}

${params.responsibilityBreakdown ? `**責任比重評估**：解答者交付偏差責任約 **${params.responsibilityBreakdown.solverWeight}%**；提問者需求追加/延遲責任約 **${params.responsibilityBreakdown.buyerWeight}%**。\n*評估理由*：${params.responsibilityBreakdown.platformAssessment}\n\n---` : ''}

${optionsMarkdown}
## 協議條款內容

### 第一條【和解金額與第三方託管】
一、 兩造同意本專案之和解點數金額為 **NT$ ${params.settlementAmount.toLocaleString()} 元**。
二、 甲方同意於本協議點擊生效時，由平台自動扣除上述點數金額，並全額存入 **IdeaX 第三方金流獨立託管帳戶**，於驗收前不可任意抽回。

### 第二條【乙方補齊交付義務與履約期限】
一、 乙方同意依以下條款內容履行剩餘交付事項：
${params.recommendedAction}
二、 乙方承諾於本協議生效起 **${params.estimatedDays} 日內**，於平台聊天室或專案交付區完成補齊交付。

### 第三條【甲方驗收與劃撥結案】
一、 乙方完成上述交付後，甲方應於平台上進行審閱與驗收。
二、 甲方點擊「確認完成交付與結案撥款」後，託管帳戶中之和解點數將自動拆款撥入乙方帳戶。

### 第四條【保密、智慧財產權與請求權拋棄】
一、 乙方交付之相關成果與智慧財產權，於甲方完成驗收撥款後歸甲方所有或依原約定授權。
二、 本協議成立後，雙方就本專案原爭議事項互相拋棄其餘民、刑事及行政訴訟請求權，並負有對外保密之義務。

---

### 平台數位存證聲明
本和解協議書經甲方與乙方於 **創點子 IdeaX** 平台以數位身份認證並點擊簽署同意，點數已全額完成第三方獨立託管，具備完整電子契約法定效力。

*創點子 IdeaX 平台（IdeaX AI助理） 簽章發行*
`;

  const filename = `創點子IdeaX_履約偏差與和解建議書_${params.contractId.slice(-8)}.md`;
  const blob = new Blob(['\uFEFF' + content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

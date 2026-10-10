# IdeaX 專案開發與版本治理守則 (Project Rules)

## 核心鐵律：每次更新版本同步規範 (Mandatory Version Sync Rule)

每次專案進行任何修改（包含功能新增、Bug 修復、UI 樣式調整、合約條款修訂、時程異動等），**必須在同一次更新中同步更新以下所有位置的版本號、發布日期與歷程清單**，嚴格禁止任何遺漏或脫節：

### 1. 平台版本統一設定 (`src/data/versionData.ts`)
- `APP_VERSION`：推進至最新版號（例如 `1.80`）
- `APP_RELEASE_DATE`：當日日期（例如 `2026.10.10`）
- `APP_RELEASE_TIME`：發布時間（例如 `17:00`）
- `APP_LAST_UPDATED`：完整時間字串（例如 `2026.10.10 17:00 (UTC+8)`）
- `APP_SEQUENCE_NUMBER`：遞增序號（例如 `#025`）

### 2. 專案設定檔 (`package.json`)
- `"version"` 欄位同步對齊至最新版號（例如 `"1.80"`）。

### 3. 平台手冊與內部清單文件 (`src/data/platformManualData.ts`)
- **`INITIAL_VERSION_LOGS`**：置頂新增該次版本的變更摘要（包含序號 `seqNumber`、版本 `version`、日期 `releaseDate`、時間 `releaseTime`、作者與具體變更項目 `changes`）。
- **模組 `m-00-1`**：同步更新「當前運行版本規格」（版本號碼、遞增序號、最後更新日期與時間）。
- **模組 `m-00-4`**：在「版本更新歷程總表 (Markdown 表格)」最上方插入最新版本紀錄列。

### 4. 全站頁尾版本標籤 (Footers)
- 主站頁尾：`src/components/Footer.tsx`（已自動引入 `versionData.ts`）
- 創星季競賽站頁尾：`src/components/challenge/CompetitionFooter.tsx`（已自動引入 `versionData.ts`）

---

## 品牌與主體法律稱謂準則 (Team Identity Guideline)
- **嚴格統一名稱**：全站所有對外呈現、條款協議、憑證收據、對帳單、競賽章程一律使用「**IdeaX 創點子團隊**」。
- **去公司化、去機構化**：嚴禁使用「公司」、「機構」、「法人」或虛擬之股份有限等稱謂。

---

## 雙網站導覽懸浮鍵行為規範 (Guide Floating Keys)
- **左側邊上下拖曳**：主站羅盤（🧭）與創星季問號（❓）導覽懸浮鍵必須橫向固定於螢幕左側（`left-3.5 sm:left-6`），**不可脫離左側邊**。
- 支援滑鼠按住與觸控螢幕垂直（上下）拖曳換位，具備位移 > 4px 防誤觸判斷，並將使用者高度座標記憶至 `localStorage`。

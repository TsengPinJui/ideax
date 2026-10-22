# 匯職缺來源連結與檔案上傳

## 搜尋流程

- `/api/job-explorer/search` 與 `/api/job-explorer/search-stream` 只依輸入條件產生求職網站搜尋入口。
- 搜尋 API 不請求第三方網站、不解析或驗證職缺頁面、不回傳職缺明細。
- 前端保存的搜尋工作階段只包含對話訊息與來源連結，最長保留五分鐘；舊版工作階段快取在載入時清除。
- 使用者點選連結後，職缺內容、薪資與招募狀態均以來源網站顯示為準。
- 舊的 `/api/job-explorer/check-link` 已停用並回傳 HTTP 410。

## 上傳格式與資料流

- 接受 PDF、DOCX、PNG、JPG／JPEG、WebP，單檔上限 4MB。
- 伺服器依檔案簽章判斷實際格式；不依使用者提供的副檔名或 MIME type 信任檔案內容。
- PDF 與圖片以 inline data 傳給 Gemini；DOCX 只在記憶體中解壓並抽取文字。
- 原始檔案只存在本次 HTTP 請求處理期間的伺服器記憶體，不寫入 Firestore、其他資料庫或檔案儲存，也不把原始檔名加入對話紀錄。
- Gemini 回覆只整理求職條件，輸出另經個資遮罩；擷取出的條件會顯示於使用者對話中。
- 檔案內容會傳給 Gemini 服務進行本次分析；IdeaX 不控制該外部服務自身的資料處理政策。

## 修改位置

- 格式簽章、大小限制、DOCX 文字擷取：`server/docText.ts`
- Gemini 請求與 API 路由：`server.ts`
- 檔案選擇及條件呈現：`src/components/JobExplorerView.tsx`
- 來源搜尋 URL：`server/jobSearchLinks.ts`

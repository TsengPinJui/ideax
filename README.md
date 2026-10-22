<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# IdeaX 創點子

IdeaX 是以 React、Vite 與 Express 建置的知識轉化平台。

## 本機開發

需要 Node.js 22。安裝相依套件後執行：

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

`npm run build` 會建置前端、SEO 頁面及部署用 API bundle。伺服器程式變更也可單獨執行 `npm run build:api` 更新 API bundle。

## 匯職缺資料處理

匯職缺會依搜尋條件產生求職網站的搜尋入口；IdeaX 不擷取或保存第三方職缺明細。PDF、DOCX、PNG、JPG／JPEG、WebP 履歷或求職需求檔案僅在本次請求記憶體中送至 Gemini 整理條件，不寫入 IdeaX 資料庫。限制與流程請見 [`docs/JobExplorer_SourceLink_And_Upload.md`](docs/JobExplorer_SourceLink_And_Upload.md)。

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6902feae-e5d6-4a4d-84d3-58e8b342c54c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

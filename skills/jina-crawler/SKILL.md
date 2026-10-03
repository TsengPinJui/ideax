---
name: market-advisor-jina-crawler
description: 專門用於「創點子 IdeaX」平台的 Jina 網頁即時爬蟲與市場情報蒐集技能，透過 Jina Reader (https://r.jina.ai/<url>) 與 Jina Search (https://s.jina.ai/<query>) 自主爬取即時公開市場數據、競品情報與法規資訊。
---

# Jina 網頁即時爬蟲與市場情報蒐集技能 (Jina Crawler Skill)

## 技能概述
本技能賦予「市場顧問」自主連網檢索與爬取即時公開網頁資訊之能力。當面對最新科技突破、產業法規變更、競品即時定價或特定網址之商業痛點時，市場顧問可自主使用 Jina Reader API 爬取網頁乾淨 Markdown 內容，為分析報告與調解判斷提供真實數據佐證。

## 工具調用方式
1. **爬取指定網頁 (URL Crawling)**：
   - 透過 `https://r.jina.ai/{TARGET_URL}` 抓取目標網頁並轉為乾淨的 Markdown 格式。
2. **即時市場搜尋 (Web Search)**：
   - 透過 `https://s.jina.ai/{QUERY}` 搜尋最新市場報告、競品規格、官方政策與新聞情報。

## 自主觸發時機
- **題目分析時**：當問題涉及最新法規、特定外部軟體或特定網址時，自主爬取解析。
- **付費報告時**：檢索當前產業最新市場規模數據與同業 Benchmark。
- **爭議仲裁時**：若合約約定參考特定外部規範或開源專案版本，可自主爬取查核。

## API 呼叫規格
```typescript
interface JinaCrawlerInput {
  url?: string;     // 目標網址，例如 "https://example.com/api-docs"
  query?: string;   // 搜尋關鍵字，例如 "台灣生醫器材 FDA 認證最新時程 2026"
}

interface JinaCrawlerOutput {
  title: string;
  content: string;  // 乾淨的 Markdown 內文
  url: string;
  description?: string;
  source: string;
}
```

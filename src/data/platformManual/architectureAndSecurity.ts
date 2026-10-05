/**
 * 04_技術架構與安全機制 (Technical Architecture & Security)
 * 詳列前端技術棧、資安防護、資料快取、PWA 離線機制與身分鑑權
 */

export const ARCHITECTURE_AND_SECURITY = {
  id: '04_architecture_and_security',
  title: '04. 技術架構與安全防護規格',
  lastUpdated: '2026.10.05',
  summary: 'React 19 + TypeScript + Vite + Tailwind CSS + Firestore 數據隔離與資安合規規範。',
  specifications: [
    {
      domain: '1. 前端架構與核心技術棧',
      points: [
        '核心框架：React 19 (SPA 架構) + TypeScript 嚴格型別定義。',
        '建構工具：Vite 高效極速熱更新與模組打包。',
        '樣式系統：Tailwind CSS (採用 @import "tailwindcss" 現代化架構，無冗餘樣式表)。',
        '圖示庫：Lucide React 精簡向量圖示套件。',
        '全域狀態中樞：React Context API (AppContext) 集中治理所有會員、懸賞、方案、聊天、通知與系統運營模式。'
      ]
    },
    {
      domain: '2. 資料持久化與沙盒快取機制',
      points: [
        '雲端資料庫：Firebase Firestore 結構化文件存儲，具備即時監聽與高可靠性。',
        '本機記憶體機制：瀏覽器 LocalStorage 用於安全儲存自訂看板釘選（ideax_pinned_board）、通知閱讀狀態與使用者偏好。',
        '沙盒資料隔離：測試帳號與示範資料具備獨立標識（isDemo / mockTag），正式營運模式下一鍵物理過濾，保障商業數據真實性。'
      ]
    },
    {
      domain: '3. 資安防護與合規治理',
      points: [
        'XSS 防護：React 虛擬 DOM 自動轉義純文字；所有富文本渲染經嚴格字串清理與標籤過濾。',
        'CSRF 與權限攔截：管理員專屬 API 與操作均執行 RBAC（基於角色的存取控制）雙重校驗（role === "admin"）。',
        '訪客保護 (Guest Intercept)：未登入訪客嘗試操作「發布提問」、「查看我的案件」或「進入會員中心」時，系統即時彈窗攔截並提示註冊登入。',
        '帳號風控阻擋：被管理員標記為 `isBlocked: true` 之帳號，所有寫入操作（發問、回答、聊天）於客戶端與伺服端均全面阻斷。'
      ]
    },
    {
      domain: '4. PWA 離線技術與安裝引擎',
      points: [
        'Service Worker：註冊專屬後台服務執行緒，快取關鍵 UI 靜態資產。',
        'Web App Manifest：配置標準 `manifest.json`，支援 192x192 與 512x512 高解析度圖標與 standalone 全螢幕顯示模式。',
        '自製跨平台捷徑生成器：針對無法直接觸發瀏覽器原生物件之場景，提供 `.url` / `.mobileconfig` 輔助下載與一鍵安裝指引。'
      ]
    }
  ]
};

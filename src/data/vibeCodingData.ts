import { Question } from '../types';
import { SEED_TIME_ANCHOR_MS } from './seedTime';

export const DEFAULT_VIBECODING_APPS: Question[] = [
  {
    id: 'vibe-app-1',
    appName: 'VibeForm AI',
    title: '輸入需求文字直接產生動態表單與邏輯問卷',
    description: '為行銷與營運人員設計的表單生成網站。不用寫 HTML 或 JavaScript，只要輸入一句話（例如「需要一份估價與客戶需求調查表」），就能自動做出有跳題邏輯與欄位驗證的問卷，並支援匯出 JSON 或直接發布。',
    category: '網站程式',
    subcategory: 'AI工具',
    subcategories: ['AI工具'],
    tertiaryCategory: '智能助手',
    tags: ['AI工具', 'AI料理', '食譜換算', 'PWA應用', '智慧廚房', '料理教練'],
    level: 'L0',
    bounty: 0,
    status: 'open',
    authorId: 'user-vibecoder-chef',
    authorName: '阿倫師（星級主廚開發者）',
    authorAvatar: '/seed-covers/vibe-app-ezcook-pwa.png',
    createdAt: new Date(SEED_TIME_ANCHOR_MS - 3600000 * 6).toISOString(),
    deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
    views: 1520,
    likes: 286,
    secondedCount: 79,
    sameQuestionCount: 38,
    answersCount: 9,
    postType: 'vibecoding_app',
    specialZone: 'vibecoding',
    referencedPainPoint: '[q-vp-pain-17] 週末去大賣場買菜塞滿冰箱，結果忘記最裡面冰了什麼，每個月都在丟爛掉的葉菜跟過期牛奶',
    targetGoal: '希望半年內達成 100,000 次安裝下載，協助 2 萬名租屋族與廚房新手告別黑暗料理！',
    currentVersion: 'v1.2.0',
    updateLogs: [
      {
        id: 'log-vibe-4-2',
        timestamp: '2026/10/22 10:30',
        version: 'v1.2.0',
        content: '重大升級！新增「拍照看鍋況」多模態 AI 視覺辨識、全螢幕大字高對比烹飪模式、Web Speech 即時語音播報與精選 YouTube 多國語系影音畫中畫同步對照。',
        note: '星級廚房教練正式上線版本',
        authorId: 'user-vibecoder-chef',
        authorName: '阿倫師（星級主廚開發者）',
        authorAvatar: '/seed-covers/vibe-app-ezcook-pwa.png',
        updatedFields: ['內容說明', '技術架構', '成果網址', '版本號'],
      },
      {
        id: 'log-vibe-4-1',
        timestamp: '2026/10/18 14:20',
        version: 'v1.1.0',
        content: '導入動態人份等比自動換算引擎、備料劃線檢查清單與 PWA 離線秒開快取支援。',
        note: '備料體驗與離線能力優化',
        authorId: 'user-vibecoder-chef',
        authorName: '阿倫師（星級主廚開發者）',
        authorAvatar: '/seed-covers/vibe-app-ezcook-pwa.png',
        updatedFields: ['內容說明', '版本號'],
      }
    ],
    coverImage: '/seed-covers/vibe-app-4.jpg',
    galleryImages: [
      '/seed-covers/vibe-app-4.jpg',
      '/seed-covers/vibe-app-ezcook-mobile-1.png',
      '/seed-covers/vibe-app-ezcook-pwa.png'
    ],
    techArchitecture: 'React 19 + TypeScript + Vite + Tailwind CSS + Gemini 2.5 Flash / 3.8 Flash (Multimodal Vision & Audio API) + Web Speech API (TTS) + Service Worker PWA + YouTube IFrame Player API',
    demoUrl: 'https://ez-cook.onrender.com/',
    previewMode: 'embed',
    fileLink: 'https://ez-cook.onrender.com/',
    publishedPlatforms: [
      { name: 'PWA Web App', url: 'https://ez-cook.onrender.com/' },
      { name: '線上體驗', url: 'https://ez-cook.onrender.com/' }
    ],
    supportPoints: 3600,
    tippersCount: 42,
    tipsHistory: [
      { id: 'tip-vibe4-1', userId: 'vp-user-01', userName: '林家豪 研發長', amount: 600, message: '拍照看鍋況收汁熟度太神了！對於新手來說火候最難掌握，這個功能真的解決大痛點！', createdAt: new Date(SEED_TIME_ANCHOR_MS - 3600000 * 6).toISOString() },
      { id: 'tip-vibe4-2', userId: 'vp-user-04', userName: '陳美玲 營養師', amount: 500, message: '份量自動等比換算超貼心，食材備料清單一目了然，已加到手機主畫面天天用！', createdAt: new Date(SEED_TIME_ANCHOR_MS - 3600000 * 3).toISOString() }
    ]
  }
];

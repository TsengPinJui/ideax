import { Question, Solution, Solver, User, Answer, Transaction, ChatConversation, ProblemLevel } from '../types';

export const LEVEL_CONFIGS: Record<ProblemLevel, { name: string; rangeText: string; example: string }> = {
  L0: { name: '觀點交流', rangeText: '免費諮詢 / 痛點初探', example: '各領域痛點反饋或架構初步健檢' },
  L1: { name: '輕量診斷', rangeText: 'NT$ 100 ~ 300', example: '小模組代碼修復、快速功能諮詢' },
  L2: { name: '核心模組', rangeText: 'NT$ 301 ~ 899', example: 'API 對接、單一模組開發、資料庫調優' },
  L3: { name: '系統整合', rangeText: 'NT$ 900 ~ 2,999', example: '全端系統設計、微服務拆分、商業計畫書' },
  L4: { name: '戰略重構', rangeText: 'NT$ 3,000+', example: '高併發容災架構、AI 落地、企業級數位轉型' },
};

export const GUEST_USER: User = {
  id: 'user-guest',
  name: '訪客用戶',
  email: 'guest@ideax.tw',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  title: '訪客瀏覽者',
  role: 'guest',
  balance: 0,
  pendingEarnings: 0,
  reputation: 100,
  joinedDate: '2026-01-01',
  domains: ['資訊科技'],
  skills: [],
};

export const CLEAN_CORE_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'Admin_001',
    password: 'John930521',
    name: 'IdeaX 管理團隊',
    email: 'admin@ideax.tw',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    title: '平台官方營運團隊',
    role: 'admin',
    balance: 50000,
    pendingEarnings: 0,
    withheldPoints: 0,
    reputation: 100,
    joinedDate: '2026-01-01',
    domains: ['平台管理', '系統運營', '爭議裁決'],
    skills: ['金流管理', '用戶仲裁', '系統設定'],
    isVerifiedSolver: true,
    verifiedExpert: true,
    verifiedBadge: '官方認證',
  },
];

export const INITIAL_CURRENT_USER: User = {
  id: 'user-me-1',
  name: '張維哲 (Alex)',
  email: 'alex.chang@ideax.tw',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  title: '資深全端架構師 & 新創顧問',
  bio: '專注於高併發系統架構、AI Agentic Workflow 落地與企業數位轉型。累積輔導超過 30+ 新創與中大型企業完成核心技術落地。',
  domain: '資訊科技',
  domains: ['資訊科技', '創新創業', '產品設計'],
  skills: ['AI Agent', '系統架構', '高併發優化', '雲端部署', '商業策略'],
  balance: 86500,
  pendingEarnings: 0,
  reputation: 100,
  joinedDate: '2026-01-10',
  rating: 4.95,
  reviewCount: 38,
  acceptanceRate: 94,
  acceptedSolutionsCount: 26,
  isVerifiedSolver: true,
  verifiedExpert: true,
  verifiedBadge: '認證專家',
  realNameAuthStatus: 'verified',
  realName: '張維哲',
  memberTier: 'pro',
  memberExpireAt: '2026-12-31',
  autoRenewSubscription: true,
  role: 'solver',
};

export const INITIAL_SOLVERS: Solver[] = [
  {
    id: 'solver-1',
    userId: 'user-solver-1',
    name: '林怡君 (Eva)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    title: 'AI 產品架構師 & 認證顧問',
    domain: '資訊科技',
    domains: ['資訊科技', '創新創業'],
    skills: ['大語言模型微調', 'Agentic Workflow', 'RAG 架構', '企業私有化部署'],
    bio: '前矽谷 AI 獨角獸技術主管，擁有 8 年企業級大語言模型落地輔導經驗，主導超過 40+ 專案。',
    rating: 4.98,
    reviewCount: 52,
    answerCount: 64,
    acceptedRate: 96,
    acceptedSolutionsCount: 48,
    tier: '認證專家',
    hourlyRate: 3500,
    pricePerSession: 2500,
    completedProjects: 45,
    earnings: 380000,
    verifiedBadge: true,
    verified: true,
    verifiedExpert: true,
    featuredCase: {
      title: '百億級零售集團私有化 AI 客服與行銷 Agent 落地',
      outcome: '降低 65% 人工客服耗時，回答準確率達 98.4%，三週內完成交付。',
    },
  },
  {
    id: 'solver-2',
    userId: 'user-solver-2',
    name: '陳致遠 (David)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: '跨國電商金流與稅務策略長',
    domain: '法規稅務',
    domains: ['法規稅務', '營運管理'],
    skills: ['跨境金流架構', 'Shopify Payments', '多幣別結算', '東南亞稅務合規'],
    bio: '曾任跨國電商平台亞太區財務長，精通美日及東南亞多渠道結算路徑與外匯申報架構。',
    rating: 4.92,
    reviewCount: 41,
    answerCount: 46,
    acceptedRate: 92,
    acceptedSolutionsCount: 35,
    tier: '認證專家',
    hourlyRate: 3000,
    pricePerSession: 2000,
    completedProjects: 32,
    earnings: 260000,
    verifiedBadge: true,
    verified: true,
    verifiedExpert: true,
    featuredCase: {
      title: '年營收 3 億 D2C 品牌全球金流架構重構',
      outcome: '節省 3.8% 跨國交易手續費，完全規避反洗錢凍結風險。',
    },
  },
  {
    id: 'solver-3',
    userId: 'user-solver-3',
    name: '黃浩然 (Ray)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    title: '資深資料庫架構師 & 容災專家',
    domain: '資訊科技',
    domains: ['資訊科技'],
    skills: ['PostgreSQL 調優', '分庫分表', '高可用容災', '百萬 QPS 壓測'],
    bio: '金融證券核心系統架構師，專精零停機灰度遷移與尖峰併發資料庫調優。',
    rating: 4.95,
    reviewCount: 34,
    answerCount: 39,
    acceptedRate: 95,
    acceptedSolutionsCount: 30,
    tier: '認證專家',
    hourlyRate: 3200,
    pricePerSession: 2200,
    completedProjects: 28,
    earnings: 210000,
    verifiedBadge: true,
    verified: true,
    verifiedExpert: true,
    featuredCase: {
      title: 'FinTech 交易所零停機分庫分表架構改造',
      outcome: '將尖峰響應延遲由 1200ms 降至 18ms，達成 99.999% 高可用。',
    },
  },
];

export const MOCK_SOLVERS: Solver[] = INITIAL_SOLVERS;

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    authorId: 'client-1',
    authorName: '林執行長 (AI SaaS 創辦人)',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    authorTitle: 'B2B SaaS 創辦人',
    title: '【懸賞 NT$ 120,000】B2B 企業級 AI Agent 自動化流暢落地 SOP 與架構規劃',
    description: '我們正在為一家中大型製造客戶導入基於 LLM 的企業級 Agentic Workflow，需具備私有化部署、資料安全隔離、工具調用延遲優化及 POC 驗收指標。徵求具備實戰架構經驗的專家提供完整落地藍圖與選型指南。',
    category: '資訊科技',
    subcategory: '人工智慧',
    tags: ['AI Agent', '企業落地', 'POC驗收', '架構規劃'],
    level: 'L3',
    bounty: 120000,
    deadline: '2026-10-25',
    status: 'open',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    views: 486,
    viewsCount: 486,
    answersCount: 3,
  },
  {
    id: 'q-2',
    authorId: 'client-2',
    authorName: '陳策略長 (D2C 跨境電商)',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorTitle: '跨境電商營運總監',
    title: '【懸賞 NT$ 85,000】歐美與東南亞跨國多渠道金流拆款與稅務合規架構設計',
    description: '目前拓展北美 Shopify 與東南亞 Shopee，面臨多幣別結算、在地收單手續費過高及各國外匯申報稽核風險。徵求專家出具多渠道金流矩陣與在地合規申報路徑。',
    category: '法規稅務',
    subcategory: '稅務法規',
    tags: ['跨境金流', '稅務合規', 'Shopify', '外匯申報'],
    level: 'L3',
    bounty: 85000,
    deadline: '2026-10-28',
    status: 'open',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    views: 312,
    viewsCount: 312,
    answersCount: 2,
  },
  {
    id: 'q-3',
    authorId: 'client-3',
    authorName: '黃合夥人 (FinTech 區塊鏈)',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    authorTitle: '技術總監',
    title: '【懸賞 NT$ 60,000】分散式高併發資料庫效能調優與零停機容災',
    description: '尖峰期資料庫讀寫延遲飆高至 1200ms，需在不停機且保障一致性的前提下，規劃讀寫分離、快取穿透防護與分庫分表平滑遷移方案。',
    category: '資訊科技',
    subcategory: '資料庫',
    tags: ['資料庫調優', '高併發', '分庫分表', '零停機容災'],
    level: 'L2',
    bounty: 60000,
    deadline: '2026-10-30',
    status: 'open',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    views: 245,
    viewsCount: 245,
    answersCount: 1,
  },
  {
    id: 'q-4',
    authorId: 'client-4',
    authorName: '林創辦人 (餐飲連鎖品牌)',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    authorTitle: '品牌主理人',
    title: '【痛點免費提出】連鎖餐飲會員私域流量裂變與外送平台抽成解法',
    description: '經營 12 家連鎖門市，外送平台抽成高達 35%，希望打造自營 LINE 官方帳號會員集點與外帶訂餐系統，徵求具備實戰轉化經驗的行銷專家提供解法。',
    category: '行銷成長',
    subcategory: '私域營銷',
    tags: ['私域流量', '餐飲行銷', 'LINE會員', '外送平台'],
    level: 'L1',
    bounty: 0,
    deadline: '2026-11-05',
    status: 'open',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    views: 520,
    viewsCount: 520,
    answersCount: 4,
  },
];

export const MOCK_QUESTIONS: Question[] = INITIAL_QUESTIONS;

export const INITIAL_SOLUTIONS: Solution[] = [
  {
    id: 'sol-1',
    questionId: 'q-1',
    authorId: 'user-solver-1',
    authorName: '林怡君 (Eva)',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    authorTitle: 'AI 產品架構師 & 認證顧問',
    summary: '提供兩週 POC 驗收藍圖，包含 LangChain/LlamaIndex 選型對比、企業私有化 VPC 資料隔離架構圖、工具調用延遲優化 SOP 與驗收指標評分表。',
    fullContent: '本方案分為三大階段：第一階段為私有化基礎建設與資安隔離，第二階段為 Agentic Workflow 狀態機編排，第三階段為 POC 指標壓測與監控看板對接。提供完整架構圖與可部署腳本範例。',
    priceType: 'bounty',
    price: 120000,
    deliverables: {
      hasText: true,
      hasFiles: true,
      hasMeeting: true,
      meetingDurationMinutes: 60,
    },
    isAccepted: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    views: 88,
    upvotes: 12,
  },
];

export const MOCK_ANSWERS: Answer[] = [
  {
    id: 'ans-1',
    questionId: 'q-1',
    type: 'solution',
    solverId: 'solver-1',
    solverName: '林怡君 (Eva)',
    solverTitle: 'AI 產品架構師 & 認證顧問',
    solverAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    solverRating: 4.98,
    freePreview: '提供兩週 POC 驗收藍圖，包含 LangChain/LlamaIndex 選型對比、企業私有化 VPC 資料隔離架構圖、工具調用延遲優化 SOP 與驗收指標評分表。',
    fullContent: '本方案分為三大階段：第一階段為私有化基礎建設與資安隔離，第二階段為 Agentic Workflow 狀態機編排，第三階段為 POC 指標壓測與監控看板對接。提供完整架構圖與可部署腳本範例。',
    deliveryFormat: 'file',
    deliveryFormats: ['text', 'file', 'meeting'],
    deliveryType: '落地實踐路徑',
    isPaid: true,
    price: 120000,
    isAccepted: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    likes: 12,
    rating: 5,
  },
  {
    id: 'ans-2',
    questionId: 'q-2',
    type: 'solution',
    solverId: 'solver-2',
    solverName: '陳致遠 (David)',
    solverTitle: '跨國電商金流與稅務策略長',
    solverAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    solverRating: 4.92,
    freePreview: '梳理 Shopify Payments 在美日歐之收單路由與結算拆款，設計防範反洗錢被鎖帳號之外幣帳戶架構。',
    fullContent: '提供詳細金流路由圖表與合規申報備案範本，並推薦低手續費當地第三方收單商與清算結匯方案。',
    deliveryFormat: 'text',
    deliveryFormats: ['text', 'file'],
    deliveryType: '商業策略架構',
    isPaid: true,
    price: 85000,
    isAccepted: false,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    likes: 8,
    rating: 5,
  },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    type: '提案懸賞',
    amount: 120000,
    platformFee: 0,
    netAmount: 120000,
    fromUserName: '林執行長 (AI SaaS 創辦人)',
    fromUserId: 'client-1',
    toUserName: '平台託管池',
    status: '已完成',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    note: '發布問題 q-1 懸賞金託管',
  },
  {
    id: 'tx-2',
    type: '提案懸賞',
    amount: 85000,
    platformFee: 0,
    netAmount: 85000,
    fromUserName: '陳策略長 (D2C 跨境電商)',
    fromUserId: 'client-2',
    toUserName: '平台託管池',
    status: '已完成',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    note: '發布問題 q-2 懸賞金託管',
  },
];

export const MOCK_USERS: User[] = [
  CLEAN_CORE_USERS[0],
  INITIAL_CURRENT_USER,
  {
    id: 'user-solver-1',
    name: '林怡君 (Eva)',
    email: 'eva.lin@ideax.tw',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    title: 'AI 產品架構師 & 認證顧問',
    role: 'solver',
    balance: 380000,
    pendingEarnings: 0,
    reputation: 98,
    joinedDate: '2026-01-15',
    domains: ['資訊科技', '創新創業'],
    skills: ['大語言模型微調', 'Agentic Workflow', 'RAG 架構'],
    verifiedExpert: true,
    verifiedBadge: '認證專家',
  },
  {
    id: 'user-solver-2',
    name: '陳致遠 (David)',
    email: 'david.chen@ideax.tw',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: '跨國電商金流與稅務策略長',
    role: 'solver',
    balance: 260000,
    pendingEarnings: 0,
    reputation: 95,
    joinedDate: '2026-01-20',
    domains: ['法規稅務', '營運管理'],
    skills: ['跨境金流架構', 'Shopify Payments', '多幣別結算'],
    verifiedExpert: true,
    verifiedBadge: '認證專家',
  },
  {
    id: 'user-questioner',
    name: '林執行長 (AI SaaS 創辦人)',
    email: 'client1@ideax.tw',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'B2B SaaS 創辦人',
    role: 'questioner',
    balance: 150000,
    pendingEarnings: 0,
    reputation: 92,
    joinedDate: '2026-02-01',
    domains: ['資訊科技'],
    skills: ['SaaS 創業', '產品定義'],
  },
];

export const DEMO_CORE_TEST_USERS: User[] = MOCK_USERS;

export const MOCK_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-1',
    participantIds: ['user-me-1', 'user-solver-1'],
    participantNames: {
      'user-me-1': '張維哲 (Alex)',
      'user-solver-1': '林怡君 (Eva)',
    },
    participantAvatars: {
      'user-me-1': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'user-solver-1': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
    participantDetails: [
      {
        id: 'user-me-1',
        name: '張維哲 (Alex)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        title: '生醫科技創業者',
      },
      {
        id: 'user-solver-1',
        name: '林怡君 (Eva)',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        title: '資深軟體架構師',
      },
    ],
    messages: [
      {
        id: 'msg-1',
        senderId: 'user-solver-1',
        senderName: '林怡君 (Eva)',
        senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        text: '您好！關於您的 AI Agent 落地問題，我有針對私有化隔離的架構設計方案，歡迎參考。',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        isRead: true,
      },
    ],
    lastMessageText: '您好！關於您的 AI Agent 落地問題，我有針對私有化隔離的架構設計方案，歡迎參考。',
    lastMessageTime: new Date(Date.now() - 3600000 * 3).toISOString(),
    unreadCount: 0,
  },
];

export const CLEAN_CORE_QUESTIONS: Question[] = [];
export const CLEAN_CORE_ANSWERS: Answer[] = [];
export const CLEAN_CORE_SOLVERS: Solver[] = [];

export const isTestAccountUserId = (userId?: string): boolean => {
  if (!userId) return false;
  const testIds = [
    'user-questioner',
    'solver-1',
    'solver-2',
    'solver-3',
    'solver-4',
    'solver-5',
    'user-solver-1',
    'user-solver-2',
    'user-solver-3',
    'user-solver-4',
    'user-solver-5',
    'user-me-1',
    'client-1',
    'client-2',
    'client-3',
    'client-4',
    'user-author-2',
    'user-author-3',
  ];
  return testIds.includes(userId) || userId.startsWith('test-') || (userId.startsWith('solver-') && userId !== 'user-admin');
};

export const isMockQuestionId = (id?: string, authorId?: string): boolean => {
  if (!id) return false;
  if (id.startsWith('mock-') || id.startsWith('q-')) return true;
  if (authorId && isTestAccountUserId(authorId)) return true;
  return false;
};

export const isMockAnswerId = (id?: string): boolean => {
  if (!id) return false;
  return id.startsWith('mock-') || id.startsWith('ans-') || id.startsWith('sol-');
};

export const isMockSolverId = (id?: string): boolean => {
  if (!id) return false;
  return id.startsWith('solver-') || id.startsWith('mock-');
};

export const isMockTransactionId = (id?: string): boolean => {
  if (!id) return false;
  return id.startsWith('mock-') || id.startsWith('tx-');
};

export const isMockConversationId = (id?: string): boolean => {
  if (!id) return false;
  return id.startsWith('mock-') || id.startsWith('conv-') || id.startsWith('c-');
};

/**
 * 創點子 IdeaX - 型別系統定義
 */

export type UserRole = 'questioner' | 'solver' | 'admin' | 'user' | 'enterprise';

export interface DeviceAccount {
  userId: string;
  isLoggedIn: boolean;
  lastLoginAt: string;
}

/**
 * 平台核心角色定義：提問者、一般討論、解答者、認證專家、企業機構、平台管理方
 */
export type PlatformRole = 
  | 'questioner' 
  | 'discussion' 
  | 'solver' 
  | 'certified_expert'
  | 'enterprise'
  | 'platform_admin';

export interface PlatformRoleInfo {
  id: PlatformRole;
  name: string;
  nameEn: string;
  badge: string;
  badgeClass: string;
  description: string;
  keyResponsibilities: string[];
}


export type AppTab = 
  | 'explore'
  | 'solvers'
  | 'star_season'
  | 'mechanism'
  | 'about'
  | 'leaderboard'
  | 'create_question'
  | 'user_dashboard'
  | 'admin_dashboard'
  | 'question_detail'
  | 'solver_profile'
  | 'chat'
  | 'my_projects'
  | 'ai_crm'
  | 'membership'
  | 'topup'
  | 'job_explorer';

export type AboutSection = 
  | 'list'
  | 'ip_agents'                     // 原創IP與Agent角色介紹專區
  | 'contact'                       // 聯絡我們與客服中心
  | 'download_app'                  // 下載APP專區
  | 'solver_terms'                  // 接案服務條款（解答者條款）
  | 'questioner_terms'              // 提問服務條款（提問者條款）
  | 'general_terms'                 // 服務條款（一般服務條款）
  | 'recharge_subscription_terms'   // 點數儲值與會員方案訂閱服務條款
  | 'copyright_policy'              // 著作權保護政策相關條款
  | 'disclaimer'                    // 免責聲明
  | 'privacy_policy'                // 隱私權聲明
  | 'anti_fraud_aml_policy'         // 反詐騙與防制洗錢政策
  | 'refund_dispute_policy'         // 退款政策與爭議調解處理辦法
  | 'community_guidelines'          // 社群守則與內容管理規範
  | 'about_ideax';                  // 關於創點子 / 平台介紹

export type UserDashboardTab = 
  | 'points_receivables'
  | 'overview'
  | 'profile'
  | 'about_and_support'
  | 'switch_account'
  | 'admin_management'
  | 'admin_cases'
  | 'admin_questions'
  | 'admin_user_management'
  | 'admin_user_analytics'
  | 'admin_certifications'
  | 'admin_aicrm'
  | 'admin_mail_disputes'
  | 'admin_transfer_points'
  | 'questions_management'
  | 'honors_achievements'
  | 'proposals'
  | 'transactions'
  | 'subscriptions'
  | 'real_name_auth'
  | 'expert_certification'
  | 'ai_assistant_settings'
  | 'ai_crm'
  | 'survey'
  | 'settings';

export type QuestionSortOption = 
  | 'latest'              // 🆕 最新發布（依發布時間由新到舊）
  | 'recruiting_promoted' // ✨推薦（依用戶最近搜尋關鍵字、主題、看板個性化推薦，付費推播置頂並註明招募中）
  | 'most_solutions'      // 最多解答（方案數最多 / 提案數最高）
  | 'most_discussions'    // 熱烈討論（討論數）
  | 'highest_bounty'      // 最高懸賞
  | 'highest_tips'        // 最高打賞
  | 'most_likes'          // 按讚數最多
  | 'most_views';        // 觀看數最高

export type Category = 
  | '創新創業'
  | '專業問題'
  | '學術探討'
  | '日常疑難'
  | '網站程式';

export type Subcategory =
  // 創新創業
  | '資訊科技'
  | '生醫材料'
  | '機械工業'
  | '服務餐飲'
  | '文創工藝'
  // 專業問題
  | '水電'
  | '室內裝修'
  | '法律智財'
  | '會計稅務'
  | '企業管理'
  // 學術探討
  | '生技醫療'
  | '資訊工程'
  | '電機'
  | '法律政治'
  | '商管'
  | '文學'
  | '社會科學'
  | '藝術設計'
  // 日常疑難
  | '職場'
  | '家務'
  | '感情'
  | '時事'
  | '購物'
  | '其他'
  | '小遊戲';

export const CATEGORY_HIERARCHY: Record<Category, string[]> = {
  '創新創業': ['資訊科技', '生醫材料', '機械工業', '服務餐飲', '文創工藝'],
  '專業問題': ['水電', '室內裝修', '法律智財', '會計稅務', '企業管理'],
  '學術探討': ['生技醫療', '資訊工程', '電機', '法律政治', '商管', '文學', '社會科學', '藝術設計'],
  '日常疑難': ['職場', '家務', '感情', '時事', '購物', '其他'],
  '網站程式': ['網站程式', 'AI工具', '小遊戲', '自動化', '擴充功能'],
};

export const VIBECODING_CATEGORIES = ['網站程式', 'AI工具', '小遊戲', '自動化', '擴充功能'] as const;

export type ProblemLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export type MarketViewMode = 'large' | 'list' | 'grid'; // 問題市場檢視模式：大視窗 / 條列式 / 方格

export type SearchMode = 'keywords' | 'users'; // 關鍵字（問題、方案、討論、內文） | 用戶或專家（輸入 ID 或名稱）

export interface RechargePackage {
  id: string;
  price: number; // 方案價金 NT$
  points: number; // 儲值獲得點數
  totalPoints: number; // 總點數
  bonusPoints?: number; // 額外回饋點數
  commissionAmount?: number;
  tag?: string;
  isPopular?: boolean;
}

export const RECHARGE_PACKAGES: RechargePackage[] = [
  {
    id: 'pack-299',
    price: 299,
    points: 210,
    totalPoints: 210,
    tag: '輕量入門',
  },
  {
    id: 'pack-599',
    price: 599,
    points: 510,
    totalPoints: 510,
    tag: '超值熱門',
    isPopular: true,
  },
  {
    id: 'pack-999',
    price: 999,
    points: 830,
    totalPoints: 830,
    tag: '行家推薦',
  },
  {
    id: 'pack-2999',
    price: 2999,
    points: 2610,
    totalPoints: 2610,
    tag: '尊榮首選',
  },
];

export interface DeliveryPhase {
  id: string;
  phaseNumber: number;
  title: string;
  description: string;
  points: number;
  price?: number; // 階段價格 NT$ / 點數
  target?: string; // 階段目標
  deliverables?: string; // 預計交付成果
  estimatedDelivery?: string; // 預計交付時程與方式
  status: 'pending_acceptance' | 'in_progress' | 'submitted' | 'accepted' | 'refunded';
  submittedContent?: string;
  submittedAttachments?: SolutionAttachment[];
  acceptedAt?: string;
}

/** VibeCoding 作品上架平台：名稱（預設選項或自填）＋選填網址 */
export interface PublishedPlatform { name: string; url?: string }

export type PostType = 'seek_solution' | 'pain_point' | 'chat_discussion' | 'innovation_proposal' | 'vibecoding_app'; // 尋求解答 | 提出痛點 | 閒聊討論 | 創新提案

export type SpecialZone = 'all' | 'l0_discussion' | 'pain_points' | 'create_ideas' | 'vibecoding'; // 全部 | L0問題討論區 | 痛點許願池 | 創點子(創新提案)

export interface LevelConfig {
  code: ProblemLevel;
  name: string;
  description: string;
  example: string;
  rangeText: string;
  minPrice: number;
  maxPrice: number;
  badgeClass: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'expert' | 'authority' | 'master' | (string & {});

export interface SubscriptionBillingCycle {
  cycle: 'monthly' | 'semi_annual' | 'annual';
  price: number;
  label: string;
  savingsText?: string;
  durationMonths: number;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  pricingText: string;
  monthlyPrice: number; // 參考月費 NT$
  periodPriceText?: string;
  billingCycles: SubscriptionBillingCycle[];
  platformFeeRate: number; // 0.10 (10%), 0.05 (5%), 0.00 (0%), -0.02 (-2%)
  feeDiscountText: string; // '標準 10%' | '-5%（半價）' | '-10%（免服務費）' | '免服務費 + 額外回饋 2% BONUS'
  sellerPayoutRate: number; // 0.90, 0.95, 1.00, 1.02
  sellerPayoutText: string; // '90%' | '95%' | '100%' | '102%'
  effectiveRateText: string; // '10%' | '5%' | '0%' | '+2% BONUS'
  rebatePercent: number; // 相容性
  badgeClass: string;
  tagline: string;
  benefits: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: '一般會員',
    pricingText: '免費使用',
    monthlyPrice: 0,
    billingCycles: [
      { cycle: 'monthly', price: 0, label: '免費方案', durationMonths: 1 },
    ],
    platformFeeRate: 0.10,
    feeDiscountText: '標準 10% 服務費',
    sellerPayoutRate: 0.90,
    sellerPayoutText: '90%',
    effectiveRateText: '10%',
    rebatePercent: 0,
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
    tagline: '標準費率，由解答者吸收 10% 服務費',
    benefits: [
      '全站發問與解答提案',
      'AI-CRM 專家工作台：基礎題庫瀏覽與功能預覽',
    ],
  },
  pro: {
    // 相容別名導向達人方案
    id: 'pro',
    name: '達人方案',
    pricingText: '$299/月 或 $1,499/半年',
    monthlyPrice: 299,
    billingCycles: [
      { cycle: 'monthly', price: 299, label: '月繳 NT$ 299/月', durationMonths: 1 },
      { cycle: 'semi_annual', price: 1499, label: '半年繳 NT$ 1,499/半年', savingsText: '約 $249/月，現省 $295', durationMonths: 6 },
    ],
    platformFeeRate: 0.08,
    feeDiscountText: '費率 8%（實收 92%）',
    sellerPayoutRate: 0.92,
    sellerPayoutText: '92%',
    effectiveRateText: '8%',
    rebatePercent: 2,
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
    tagline: '費率僅 8%！解答者實收高達 92%',
    benefits: [
      '全站發問與解答提案',
      '費率 8%（解答者實收 92%）',
      'AI 初步問題分析報告：免費查看 50 次',
      'AI 提案架構整理：一鍵整理為 4 層架構',
      '🎯 AI-CRM 24hr 客情巡航：基礎巡航與意向偵測',
      '🤝 雙向握手提案：市場顧問 × AICRM 雙向專屬媒合推播',
    ],
  },
  expert: {
    id: 'expert',
    name: '達人方案',
    pricingText: '$299/月 或 $1,499/半年',
    monthlyPrice: 299,
    billingCycles: [
      { cycle: 'monthly', price: 299, label: '月繳 NT$ 299/月', durationMonths: 1 },
      { cycle: 'semi_annual', price: 1499, label: '半年繳 NT$ 1,499/半年', savingsText: '約 $249/月，現省 $295', durationMonths: 6 },
    ],
    platformFeeRate: 0.08,
    feeDiscountText: '費率 8%（實收 92%）',
    sellerPayoutRate: 0.92,
    sellerPayoutText: '92%',
    effectiveRateText: '8%',
    rebatePercent: 2,
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
    tagline: '費率僅 8%！解答者實收高達 92%',
    benefits: [
      '全站發問與解答提案',
      '費率 8%（解答者實收 92%）',
      'AI 初步問題分析報告：免費查看 50 次',
      'AI 提案架構整理：一鍵整理為 4 層架構',
      '🎯 AI-CRM 24hr 客情巡航：基礎巡航與意向偵測',
      '🤝 雙向握手提案：市場顧問 × AICRM 雙向專屬媒合推播',
    ],
  },
  authority: {
    id: 'authority',
    name: '權威方案',
    pricingText: '$599/月 或 $5,990/年',
    monthlyPrice: 599,
    billingCycles: [
      { cycle: 'monthly', price: 599, label: '月繳 NT$ 599/月', durationMonths: 1 },
      { cycle: 'annual', price: 5990, label: '年繳 NT$ 5,990/年', savingsText: '年繳現省 NT$ 1,198', durationMonths: 12 },
    ],
    platformFeeRate: 0.05,
    feeDiscountText: '服務費 5%（-5% 減免，實收 95%）',
    sellerPayoutRate: 0.95,
    sellerPayoutText: '95%',
    effectiveRateText: '5%',
    rebatePercent: 5,
    badgeClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-700 font-black shadow-2xs',
    tagline: '服務費僅 5%（-5%）！實收 95% ＋ 升級無限次 AI 分析報告 ＋ 優先推薦曝光',
    benefits: [
      '全站發問與解答提案',
      '服務費僅 5%（-5% 減免，實收 95%）',
      'AI 初步問題分析報告：全站免費無限次查看及下載報告',
      'AI 提案架構整理：一鍵整理為 4 層架構',
      '✨ 升級高賞提案優先推薦曝光',
      '🎯 AI-CRM 24hr 客情巡航雷達：實時巡弋全站題庫與發案者猶豫期',
      '🤝 雙向握手提案：市場顧問 × AICRM 即時推播雙向高契合專案商機',
      '💰 優質提案推薦您來賺：智能過濾高額懸賞好題與三階段破局方針',
    ],
  },
  master: {
    id: 'master',
    name: '大師方案',
    pricingText: '$1,980/月 或 $19,800/年',
    monthlyPrice: 1980,
    billingCycles: [
      { cycle: 'monthly', price: 1980, label: '月繳 NT$ 1,980/月', durationMonths: 1 },
      { cycle: 'annual', price: 19800, label: '年繳 NT$ 19,800/年', savingsText: '年繳現省 NT$ 3,960', durationMonths: 12 },
    ],
    platformFeeRate: 0.02,
    feeDiscountText: '服務費僅 2%（-8% 減免，實收 98%）',
    sellerPayoutRate: 0.98,
    sellerPayoutText: '98%',
    effectiveRateText: '2%',
    rebatePercent: 8,
    badgeClass: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-stone-950 border-amber-500 font-black shadow-sm',
    tagline: '極低 2% 服務費！實收高達 98% ＋ AI-CRM 客戶關係管理',
    benefits: [
      '全站發問與解答提案',
      '服務費極低 2%（-8% 減免，實收高達 98%）',
      'AI 初步問題分析報告：全站免費無限次查看及下載報告',
      'AI 提案架構整理：一鍵整理為 4 層架構',
      '高賞提案最高優先級推薦曝光',
      '🎯 AI-CRM 24hr 客情巡航雷達：即時客情意向偵測與高價值客戶巡航',
      '🤝 雙向握手提案：市場顧問 × AICRM 即時推播雙向高契合專案商機',
      '💰 優質提案推薦您來賺：智能過濾高額懸賞好題與三階段破局方針',
      '🧠 AI-CRM 24hr 策略軍師：心理學破冰話術擬定與時程推演',
      '🤖 24hr AI 特助代操：全自動化離線對談與排程破冰代操發送',
      '📊 客情轉化漏斗分析：即時追蹤跟進轉化率、意向週期與收益成長',
    ],
  },
};

// 24hr AI軍師代客服務相關結構
export interface AssistantFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface AssistantCustomPrompt {
  id: string;
  instruction: string;
  isEnabled: boolean;
}

export interface AssistantScheduledTask {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  questionId?: string;
  questionTitle?: string;
  strategySource: string; // 由 AI-CRM 作為軍師產出之策略名稱
  suggestedAction: string; // 行動指示
  messageTemplate: string; // 24hr特助作為代操者將發送的客製化訊息
  scheduledTime: string; // 排定發送時間說明或時間字串
  scheduledTimestamp: number; // 排定時間戳記
  status: 'pending' | 'executing' | 'completed' | 'cancelled';
  executedAt?: string;
  executionResult?: string;
  autoExecute: boolean; // 是否全自動代操（true: 時間到由24hr特助代操發送；false: 需專家確認後發送）
  createdAt: string;
}

export interface Assistant24hrConfig {
  isEnabled: boolean; // 是否啟用 24hr AI軍師代客服務
  tone: 'adaptive' | 'professional' | 'warm' | 'technical' | 'authoritative'; // 交談語氣 (adaptive: 依AI判定客戶習慣客製語氣)
  toneDescription?: string; // 希望的回答方向（自然語言）
  faqList: AssistantFaqItem[]; // 客戶常見問題 FAQ 與期望回答
  offlineTriggerMinutes: number; // 專家離線召喚時間 (預設 20 分鐘)
  requireHumanApprovalForDeals: boolean; // 產出交易但仍要專家事後親自確認 (預設 true)
  customPrompts: AssistantCustomPrompt[]; // 其他希望的 prompt 指令 (多筆)
  dailyMessageLimitPerChat: number; // 單對話單日最大代答上限 (預設 30 則/日/聊天室，避免惡意消耗 Tokens)
  enableConfidentialityFirewall: boolean; // 嚴格商業機密與個資防火牆 (防止資料洩漏)
  scheduledTasks?: AssistantScheduledTask[]; // 由 AI-CRM 作為軍師規劃，24hr 特助作為代操者的排定任務清單
  todayReplyCount?: number; // 今日代答計數
  totalAssistedCount?: number; // 累計協助代答次數
  lastActiveAt?: string;
}

export const DEFAULT_ASSISTANT_24HR_CONFIG: Assistant24hrConfig = {
  isEnabled: false,
  tone: 'professional',
  toneDescription: '以專業嚴謹且具同理心的態度接待，釐清客戶時程與需求痛點，引導具體合作方向。',
  faqList: [
    {
      id: 'faq-1',
      question: '最快什麼時候可以開始執行專案？',
      answer: '確認需求與里程碑報價後，通常可在 1~2 個工作天內排程啟動。',
    },
    {
      id: 'faq-2',
      question: '初步諮詢的收費方式為何？',
      answer: '平台提供履約款項託管保證，所有報價均依里程碑分階段驗收才撥款，正式報價將由專家親自確認後出具。',
    },
    {
      id: 'faq-3',
      question: '如果專案規格有變更怎麼處理？',
      answer: '可隨時透過聊天室補充規格並協商調整里程碑，雙方同意後才會變更交付計畫。',
    },
  ],
  offlineTriggerMinutes: 20,
  requireHumanApprovalForDeals: true,
  customPrompts: [
    {
      id: 'prompt-1',
      instruction: '勿代替專家向客戶做出任何絕對保證成效（如「保證獲利」、「保證過審」）之承諾。',
      isEnabled: true,
    },
    {
      id: 'prompt-2',
      instruction: '提及專家資歷時，以個人檔案公開領域與成功案例為主，請勿虛構或捏造不可考的背書。',
      isEnabled: true,
    },
  ],
  dailyMessageLimitPerChat: 30,
  enableConfidentialityFirewall: true,
  todayReplyCount: 0,
  totalAssistedCount: 0,
  scheduledTasks: [
    {
      id: 'task-1',
      clientId: 'client-101',
      clientName: '陳執行長 (智網生醫)',
      clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      questionId: 'q-demo-1',
      questionTitle: '高頻生醫檢測儀硬體規格選型與 FDA 規範疑難',
      strategySource: 'AI-CRM 軍師策略：客戶猶豫期痛點破冰（意向評分 94%）',
      suggestedAction: '24hr 特助代操發送：關鍵技術時程切角與痛點案例說明',
      messageTemplate: '陳執行長您好！我是專家的 24hr AI 業務特助。AI-CRM 系統監測到您的 FDA 認證規格案近期正進入審查倒數，專家已針對您提出的硬體公差疑慮梳理出 3 點解套關鍵，特別請我向您主動說明。請問方便安排 15 分鐘線上確認嗎？',
      scheduledTime: '今日 19:30 (晚間決策尖峰期)',
      scheduledTimestamp: Date.now() + 1000 * 60 * 90,
      status: 'pending',
      autoExecute: true,
      createdAt: '今日 14:20',
    },
    {
      id: 'task-2',
      clientId: 'client-102',
      clientName: '林總監 (綠能前瞻科技)',
      clientAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      questionId: 'q-demo-2',
      questionTitle: '儲能系統微電網即時負載調控演算法優化',
      strategySource: 'AI-CRM 軍師策略：提案檢視後未回覆（發案超過 18 小時）',
      suggestedAction: '24hr 特助代操發送：提供同業專利落地數據與里程碑諮詢時段',
      messageTemplate: '林總監您好！我是專家的 AI 特助。感謝您檢視專家的微電網調控提案！專家本週四尚保留下午 14:00~15:00 一個諮詢時段，可直接為貴司推演動態調頻演算法模擬，若您有需要我可立即為您保留！',
      scheduledTime: '明日 09:30 (晨間開工期)',
      scheduledTimestamp: Date.now() + 1000 * 60 * 60 * 18,
      status: 'pending',
      autoExecute: true,
      createdAt: '今日 16:00',
    },
    {
      id: 'task-3',
      clientId: 'client-103',
      clientName: '王創辦人 (智鏈物聯)',
      clientAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      questionId: 'q-demo-3',
      questionTitle: '智慧物流跨國冷鏈感測節點架構評估',
      strategySource: 'AI-CRM 軍師策略：冷鏈感測規格確認（初次觸達破冰）',
      suggestedAction: '24hr 特助已代操發送：冷鏈架構快速自我健檢清單',
      messageTemplate: '王創辦人您好！專家的 24hr AI 特助已為您送上冷鏈物聯網硬體通訊協議評估清單，隨時歡迎在聊天室進一步討論！',
      scheduledTime: '今日 11:15',
      scheduledTimestamp: Date.now() - 1000 * 60 * 180,
      status: 'completed',
      executedAt: '今日 11:15',
      executionResult: '特助已代操發送成功，客戶已閱讀並留下 1 則回覆訊息！',
      autoExecute: true,
      createdAt: '今日 09:30',
    },
  ],
};

export interface BankAccountInfo {
  bankName: string; // 例如 '822 中國信託商業銀行'
  bankCode: string; // '822'
  branchName?: string; // '敦南分行'
  accountNumber: string; // '0000123456789'
  accountHolder: string; // '林書豪'
  isVerified?: boolean;
}

export interface UserSurveyData {
  source?: 'survey_form'; // 從個人中心問卷表單送出（使用者自己填的）；舊版註冊自動存的預設答案沒有這個標記
  desiredServices?: string[]; // 期望在IdeaX使用的服務 (可多選)
  desiredServicesCustom?: string; // 期望在IdeaX使用的服務 (自填)
  relatedDomains?: string[]; // 相關領域 (可多選)
  relatedDomainsCustom?: string; // 相關領域 (自行輸入)
  willingPointsPerQuestion?: string; // 通常願意花多少點數提問懸賞？
  willingQuestionBudget?: string; // 若遇到棘手問題，一次性尋求專家解答願支付多少預算？
  monthlyQuestionBudget?: string; // 每個月願意花多少錢在提問上？（附點數儲值與新台幣對照）
  willingToProvideSolutions?: string; // 是否願意有償為其他提問提供解方(為人解答)?
  usageFrequency?: string; // 您多久打開一次 IdeaX ?
  willingToBeSideHustle?: string; // 您是否願意將解答作為您的副業(有償)?
  willingToSubscribeSolverPlan?: string; // 您是否願意花錢訂閱解答者的優惠方案?
  feedbackSuggestions?: string; // 給我們的建議，自由填寫
  completedAt?: string;
  updatedAt?: string;
}

export type AdminSite = 'site_a' | 'site_b'; // 'site_a': IdeaX 主站 | 'site_b': 創星季賽事專區

export interface User {
  id: string;
  authUid?: string; // 對應的 Firebase 登入帳號 UID（資料庫權限以此判斷）
  aiCrmLastScanAt?: string; // 伺服器 AI-CRM 最後巡檢時間
  aiCrmLastScanMatches?: number; // 最後一次巡檢找到的案件數
  memberId?: string; // 規範ID（首字英文字母+亂數編排9碼，共10碼，例如 c123456789, a000000001, b987654321）
  accountType?: 'user' | 'admin' | 'enterprise'; // ID種類：一般用戶 (c) | 管理員 (a) | 企業機構 (b)
  username?: string; // 註冊帳號 (4~20 位英數字或底線)
  password?: string; // 帳號密碼 (6~20 位英數組合)
  rememberLogin?: boolean; // 記得並保持登入狀態
  name: string;
  title: string;
  avatar: string;
  role: UserRole;
  isTestAccount?: boolean; // 是否為一鍵生成或測試帳號
  isGuest?: boolean; // 是否為訪客（未登入）模式
  isSimulated?: boolean; // 是否為系統模擬創作者帳號（可於未來一鍵刪除）
  simulatedBatchId?: string; // 模擬資料批次標記 (例如 ideax_virtual_seed_v1)
  isInitialAdmin?: boolean; // 是否為系統初始創始管理員（唯一具有指派其他用戶為管理員之權限）
  adminSites?: AdminSite[]; // 授權管轄站點清單：['site_a'] (IdeaX主站) | ['site_b'] (創星季賽事專區) | ['site_a', 'site_b'] (雙站管理員)
  balance: number; // 相容欄位（預設 0，全面以第三方支付與直接撥款為主）
  points?: number; // 平台點數/提問金（可用於發布問題懸賞、付費服務與專家諮詢）
  breakdown?: any; // 競賽與活動獎勵加總細項快照
  pendingEarnings?: number; // 待結算/託管中收益 NT$
  reputation: number; // 信用值 / 聲望
  joinedDate: string;
  registeredAt?: string; // 註冊日期時間 (ISO 或 YYYY-MM-DD)
  createdAt?: string; // 帳號建立時間
  lastLoginAt?: string; // 最近登入時間 (ISO)
  lastActiveAt?: string; // 最近上線/活躍時間 (ISO)
  updatedAt?: string;
  bio?: string;
  email: string;

  // 基本個資
  gender?: 'male' | 'female' | 'other' | 'undisclosed'; // 性別
  ageGroup?: 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_above'; // 年齡層
  industry?: string; // 行業
  jobTitle?: string; // 職位
  annualSalary?: 'under_500k' | '500k_1000k' | '1000k_2000k' | '2000k_3000k' | 'above_3000k' | 'undisclosed'; // 目前薪水(年)
  company?: string; // 公司 (選填)
  phone?: string; // 電話

  // 調研問卷數據
  surveyData?: UserSurveyData;

  // 解答者撥款銀行帳戶與第三方銷售
  bankAccount?: BankAccountInfo;
  totalRevenue?: number; // 累計第三方銷售成交金額 NT$
  totalPaidOut?: number; // 累計已撥款至銀行帳戶 NT$
  escrowedEarnings?: number; // 託管中待確認撥款 NT$

  // 解答者公開展示資訊
  domain?: Category; // 專業領域
  domains?: Category[]; // 複選認證領域 (1~5個)
  subdomain?: string; // 子領域
  subdomains?: string[]; // 複選認證子領域 (1~5個)
  skills?: string[]; // 專長標籤
  verifiedExpert?: boolean; // 是否為認證專家
  verifiedBadge?: string; // 專家認證徽章稱號
  competitionBadges?: Array<'創新盃' | '創之星' | '創星季'>; // 競賽徽章：提案者標記「創新盃」；前十名官方核發「創之星」；創星季參賽者標記「創星季」
  rating?: number; // 評分（0~5星）
  reviewCount?: number;
  acceptedSolutionsCount?: number; // 方案採納次數（公開）
  featuredCase?: {
    title: string;
    description?: string;
    outcome?: string;
    files?: Array<{ name: string; size?: string; url?: string }>;
    images?: Array<{ url: string; caption?: string }>;
  };
  showRecentSolutions?: boolean;
  assistant24hrConfig?: Assistant24hrConfig; // 24hr AI軍師代客服務設定 (權威方案以上)

  // 默認隱藏顯示（可選擇公開）
  reputationPoints?: number; // 榮譽點數
  submittedSolutionsCount?: number; // 提交方案數量
  acceptanceRate?: number; // 被採納率 (%)
  avgSolutionBounty?: number; // 平均方案賞金 NT$
  showSubmittedCount?: boolean; // 默認隱藏 (false)
  showAcceptanceRate?: boolean; // 默認隱藏 (false)
  showAvgSolutionBounty?: boolean; // 默認隱藏 (false)

  // 提問者數據隱私與公開設定
  showQuestionerTitle?: boolean; // 提問者是否顯示頭銜或職位（可選擇是否顯示，預設關閉保護隱私）
  showQuestionerBio?: boolean; // 提問者是否顯示個人簡介或專業背景（可選擇是否顯示，預設關閉保護隱私）
  hideQuestionStats?: boolean; // 是否隱藏提問數據（提問數、平均方案賞金）
  syncChatNotifications?: boolean; // 收到指定提問或邀請回答時，是否在聊天室同步提示通知

  // 提問者每週榮譽（問題上討論榜、方案榜前10的次數，每週一結算）
  weeklyTop10DiscussionCount?: number; // 問題登上每週「討論榜前10」累計次數
  weeklyTop10SolutionCount?: number; // 問題登上每週「方案榜前10」累計次數
  weeklyTop10Honors?: Array<{
    id: string;
    weekRange: string; // 例如 '2026 第 38 週 (09/15 ~ 09/21)'
    boardType: 'discussion' | 'solution'; // 討論榜 vs 方案榜
    questionId: string;
    questionTitle: string;
    rank: number; // 1 ~ 10
    settledAt: string; // 例如 '2026-09-22 00:00'
    metricText: string; // 例如 '48 則熱烈交流討論' 或 '12 份高價值專家方案'
  }>;

  // 訂閱與提領
  subscriptionTier?: SubscriptionTier; // 訂閱降抽成方案
  subscriptionExpiresAt?: string; // 訂閱到期日
  nextSubscriptionTier?: SubscriptionTier; // 下個期間生效之方案（轉換為一般會員視為取消資格）
  nextSubscriptionCycle?: 'monthly' | 'semi_annual' | 'annual'; // 下個期間計費週期

  // 點數獎勵紀錄
  hasReceivedFirstPostBonus?: boolean; // 是否已領取首次發文加碼 200 點獎勵
  nextSubscriptionEffectiveAt?: string; // 下個期間生效日期 (到期日即為下期起算日)
  totalWithdrawn?: number; // 累積撥款入帳金額 NT$
  withheldPoints?: number; // 託管中懸賞金額 NT$

  // 痛點讀者打賞支持金（應收帳款與每週結算）
  tipReceivablesPoints?: number; // 累計待提領讀者打賞點數（存於應收帳款）
  bountyReceivablesPoints?: number; // 待撥款的方案與懸賞收入（採納懸賞、階段驗收、付費解鎖、聊天室方案；由伺服器入帳）
  thisWeekTipPoints?: number; // 本週獲得打賞點數（每週一 00:00 統一結算）
  weeklyTipSettlements?: Array<{
    id: string;
    weekLabel: string; // 例如 '2026 第 42 週 (10/12 ~ 10/18)'
    points: number; // 本週獲得打賞點數
    grossAmount: number; // 換算法幣金額 NT$
    feeRate: number; // 手續費率 (如 0.10)
    feeAmount: number; // 手續費 NT$
    netAmount: number; // 應撥款淨額 NT$
    settledAt: string; // 結算時間
    status: 'pending_withdrawal' | 'withdrawn' | 'processing';
  }>;

  // 交易成就化、榮譽化與各等級問題統計
  honorTitle?: string; // 榮譽稱號，如「傳奇解答國師」、「黃金天使提問家」
  honorLevel?: number; // 榮譽等級 1~5
  levelAnswerCounts?: Record<ProblemLevel, number>; // 各等級解答統計 (L0 ~ L4)
  levelQuestionCounts?: Record<ProblemLevel, number>; // 各等級提問統計 (L0 ~ L4)
  achievementsCount?: number; // 解鎖成就數量

  // 收藏問題列表
  bookmarkedQuestionIds?: string[]; // 收藏之問題 ID 清單

  // 註冊偏好與個資狀態
  hasCompletedProfile?: boolean; // 是否已完成個人資料填寫（提問者若跳過則為 false，用到相關功能時需補填）
  interests?: string[]; // 提問者感興趣的領域與主題清單，用於推播精選題目

  // 帳號註銷與 7 日反悔期
  isDeactivated?: boolean; // 是否已申請註銷帳號或已註銷
  deactivationStatus?: 'pending_grace' | 'deactivated'; // pending_grace: 7日反悔猶豫期中; deactivated: 7日屆滿已正式註銷
  deactivationRequestedAt?: string; // 申請註銷之時間戳記 (ISO string)
  deactivationScheduledPurgeAt?: string; // 7日反悔期屆滿時間 (ISO string = deactivationRequestedAt + 7 days)
  deactivationReason?: string; // 註銷原因

  // 條款同意紀錄 (版本管理與首次操作同意)
  hasAgreedGeneralTerms?: boolean; // 通用服務條款（註冊/登入即同意）
  agreedGeneralTermsVersion?: string;
  agreedGeneralTermsAt?: string;

  hasAgreedQuestionerTerms?: boolean; // 首次提問同意提問者條款
  agreedQuestionerTermsVersion?: string;
  agreedQuestionerTermsAt?: string;

  hasAgreedSolverTerms?: boolean; // 首次提交方案同意解答者條款
  agreedSolverTermsVersion?: string;
  agreedSolverTermsAt?: string;

  // 實名認證 (KYC / 實名身分核驗)
  realNameAuthStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  realNameData?: any;
  hasIdDocuments?: boolean; // 是否已上傳身分證件（公開旗標，實際證件資料存於 user_private）
  realNameAuthData?: {
    legalName: string; // 真實姓名 (必填)
    idNumber: string; // 身分證字號 / 居留證號 (必填)
    nationality: string; // 國籍 (必填)
    birthDate: string; // 出生年月日 (必填)
    phoneNumber: string; // 聯絡電話 / 手機 (必填)
    email: string; // 聯絡電子信箱 (必填)
    idCardFrontFile?: {
      name: string;
      size?: string;
      url?: string;
      storagePath?: string;
      isStorage?: boolean;
      uploadedAt?: string;
    }; // 身分證正面 (必填)
    idCardBackFile?: {
      name: string;
      size?: string;
      url?: string;
      storagePath?: string;
      isStorage?: boolean;
      uploadedAt?: string;
    }; // 身分證反面 (必填)
    idAddress?: string; // 身分證住址（戶籍住址）
    address?: string; // 戶籍 / 通訊地址 (選填)
    emergencyContactName?: string; // 緊急聯絡人姓名 (選填)
    emergencyContactPhone?: string; // 緊急聯絡人電話 (選填)
    idIssueDate?: string; // 發證日期 (選填)
    idIssueType?: string; // 初發 / 補發 / 換發 (選填)
    agreedAmlPolicy?: boolean; // 洗錢防制與個資授權同意
    verifiedAt?: string;
    appliedAt?: string;
  };

  // 專家資格審查申請 (每 7 日可申請一次)
  expertApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  expertCertStatus?: 'none' | 'pending' | 'approved' | 'verified' | 'rejected' | 'unverified';
  expertCertData?: any;
  lastExpertAppliedAt?: string; // ISO 日期
  expertApplicationRejectReason?: string;
  expertApplicationData?: {
    domain: string;
    domains?: string[]; // 申請之複選主領域 (1~5個)
    subdomain?: string;
    subdomains?: string[]; // 申請之複選子領域 (1~5個)
    professionalTitle: string;
    yearsOfExperience?: string;
    credentialsFiles: Array<{
      name: string;
      size?: string;
      url?: string;
      storagePath?: string;
      isStorage?: boolean;
      uploadedAt?: string;
    }>;
    proofDescription: string;
    proofFiles: Array<{
      name: string;
      size?: string;
      url?: string;
      storagePath?: string;
      isStorage?: boolean;
      uploadedAt?: string;
    }>;
    portfolioLink?: string;
    agreedPrivacy: boolean;
    appliedAt: string;
  };

  // 用戶管理與封鎖狀態
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  blockedUntil?: string; // ISO 日期字串 或 'permanent' (永久封鎖)
  blockedByAdminName?: string;
}

export interface Solver {
  id: string;
  userId?: string;
  name: string;
  title: string;
  avatar: string;
  domain: Category;
  domains?: Category[]; // 複選認證領域 (1~5個)
  subdomain?: string;
  subcategory?: string;
  skills: string[];
  rating: number; // 1.0 ~ 5.0
  reviewCount: number;
  answerCount: number;
  acceptedRate: number; // 例如 88%
  tier: '一般解答者' | '專業解答者' | '認證專家' | '特邀顧問';
  bio: string;
  hourlyRate?: number;
  earnings: number;
  verifiedBadge: boolean;
  verified?: boolean;
  verifiedExpert?: boolean;
  featuredCase: {
    title: string;
    description?: string;
    outcome: string;
    files?: Array<{ name: string; size?: string; url?: string }>;
    images?: Array<{ url: string; caption?: string }>;
  };
  // 解答各等級問題數統計 (L0 ~ L4) 與榮譽
  levelAnswerCounts?: Record<ProblemLevel, number>;
  honorTitle?: string;
}

/**
 * 認證專家判定標準：通過平台認證，或 採納方案 ≥ 50
 */
export const isCertifiedExpert = (solver?: {
  verifiedBadge?: boolean | string;
  verifiedExpert?: boolean;
  answerCount?: number;
  acceptedRate?: number;
  acceptedSolutionsCount?: number;
  rating?: number;
  tier?: string;
} | null): boolean => {
  if (!solver) return false;
  // 1. 通過平台專業認證 (實名審查/特邀專家/認證專家)
  if (solver.verifiedBadge || solver.verifiedExpert) return true;
  if (solver.tier === '認證專家' || solver.tier === '特邀顧問') return true;

  // 2. 或 採納方案 ≥ 50 份 且 評分 ≥ 4.0 星
  const acceptedCount = solver.acceptedSolutionsCount !== undefined
    ? solver.acceptedSolutionsCount
    : (solver.answerCount !== undefined && solver.acceptedRate !== undefined)
      ? Math.round(solver.answerCount * (solver.acceptedRate / 100))
      : (solver.answerCount || 0);

  const currentRating = solver.rating !== undefined ? solver.rating : 5.0;

  return acceptedCount >= 50 && currentRating >= 4.0;
};

export interface ProposalUpdateLog {
  id: string;
  timestamp: string; // 更新時間 (例如: 2026/10/15 14:30)
  version?: string; // 若為 VibeCoding 應用之版本號碼 (選填，例如: v1.0.0, v2.0.0)
  content: string; // 更新內容 (每次重新發布前的必填項目)
  note?: string; // 提案者註記 (選填)
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  updatedFields?: string[]; // 變更欄位標籤列表
}

export interface Question {
  id: string;
  title: string;
  description: string;
  category: Category;
  subcategory?: string;
  subcategories?: string[];
  tags: string[];
  level: ProblemLevel;
  bounty: number; // 懸賞金額 NT$
  status: 'open' | 'solved' | 'closed' | 'delisted';
  delistedReason?: string; // 違規下架事由
  delistedFeedback?: string; // 管理員給予提問者之處置說明與改善指引
  delistedAt?: string; // 下架時間
  authorId: string;
  authorAuthUid?: string; // 發布者的 Firebase 帳號（資料庫權限用）
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  deadline: string;
  views: number;
  viewsCount?: number;
  likes?: number; // 痛點/提問按讚數
  secondedCount?: number; // 痛點附議數（綠色+1）
  sameQuestionCount?: number; // 提問同問數（舉手）
  answersCount: number;
  authorTitle?: string;
  invitedSolverIds?: string[];
  isFeatured?: boolean;
  postType?: PostType; // 尋求解答 | 提出痛點 | 閒聊討論 | 創新提案 | 程式或網站
  appName?: string; // 作品名稱 / 軟體或網站名稱 (VibeCoding展場必填，以藍色顯示於卡片左下角)
  referencedPainPoint?: string; // 引用相關痛點 (選填)
  coverImage?: string; // 大圖/封面圖 (VibeCoding展場/創新提案)
  galleryImages?: string[]; // 上傳 0~6 張截圖/圖片
  youtubeUrl?: string; // YouTube 介紹影片連結 (創新提案 / 軟體提案)
  coverMode?: 'custom_image' | 'youtube_video'; // 封面選擇：自訂封面圖 或 直接用 YouTube 影片當封面
  cardHoverMode?: 'video_autoplay' | 'image_carousel'; // 卡片模式滑鼠移入時展示：影片自動播放 或 圖片輪播
  showCardImage?: boolean; // 可以選擇是否顯示圖片在卡片（預設 true 若有上傳圖片；若設為 false 則卡片不顯示大圖，改顯示詳述/AI摘要/熱門留言）
  cardDisplayImage?: string; // 可選擇一張指定圖片展示於卡片
  proposalProgressStage?: InnovationProgressStage | string; // 創新提案完程度：初步構想(0~2)、正在計畫(3~6)、實行中(7~9)、已完成(10)、成功驗證,持續精進 (11 up)
  techArchitecture?: string; // 技術架構 (VibeCoding展場)
  demoUrl?: string; // 網站網址或嵌入預覽連結
  externalLink?: string; // 外部連結 / 專屬網站連結 (選填)
  previewMode?: 'embed' | 'external'; // 作品預覽模式：'embed' 內嵌網頁互動 | 'external' 外部連結開啟
  fileLink?: string; // 檔案下載連結
  fileUrl?: string; // 檔案下載連結 / 成果檔案
  targetGoal?: string; // 希望達成的目標 (選填)
  currentVersion?: string; // 若為 VibeCoding 應用之版本號碼 (選填，例如: v1.0.0, v2.0.0)
  updateLogs?: ProposalUpdateLog[]; // 提案更新日誌 (最底部顯示時間與提案者註記內容)
  specialZone?: SpecialZone; // 專屬專區 (全部 | L0問題討論區 | 創點子/痛點集)
  withheldBounty?: number; // 已保留之懸賞點數（交易履約保障中，採納時發動撥付）
  disputeStatus?: 'none' | 'pending_review' | 'resolved_refunded' | 'rejected'; // 疑義檢舉審查狀態
  disputeReason?: string; // 檢舉疑義事由
  phases?: DeliveryPhase[]; // 多階段交付計畫
  isPhasedDelivery?: boolean; // 是否啟用多階段交付
  isOfficial?: boolean; // 是否為平台官方貼文 (💡IdeaX 官方帳號💡)
  publishIdentity?: 'admin' | 'platform' | 'user'; // 發布身分（管理員個人身分 / 平台官方身分 / 用戶個人身分）
  isTransferred?: boolean; // 是否已轉移給用戶名下
  isOwnershipTransferred?: boolean; // 所有權是否已移轉給用戶
  transferredToUserId?: string; // 轉移接管之用戶 ID
  transferredAt?: string; // 所有權轉移時間戳記
  aiAnalysis?: {
    summary: string;
    structuredNeed: string[];
    solverProfileAdvice: string;
    marketFitRating?: string;
  };
  aiPreliminaryReport?: AIPreliminaryReport;
  exclusiveChallengeUrl?: string; // 創星季參賽網站專案連結
  isStarSeason?: boolean;
  starSeasonProposalId?: string;
  supportPoints?: number; // 獲得讀者支持打賞總點數
  supportPointsWithdrawn?: number; // 該作品/提案累積已提領之打賞金額（已提領者不計入轉移後新受讓者之可提領賞金）
  tippersCount?: number; // 打賞支持人數
  supporterCount?: number; // 痛點附議或支持者計數
  screenshots?: string[]; // 截圖清單（相容 galleryImages）
  version?: string; // 相容 currentVersion
  vibeCodingData?: any; // VibeCoding 專屬規格與作品資料
  publishedPlatforms?: PublishedPlatform[]; // VibeCoding 作品已上架的平台（選填，可附網址）
  mindMap?: MindMapData | null; // 心智圖（創新提案、VibeCoding 作品選填）
  isSimulated?: boolean; // 是否為系統模擬貼文（可於未來一鍵刪除）
  simulatedBatchId?: string; // 模擬資料批次標記 (例如 ideax_virtual_seed_v1)
  tipsHistory?: Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    amount: number;
    message?: string;
    createdAt: string;
    isSimulated?: boolean;
  }>;
}

export interface AIPreliminaryReport {
  id: string;
  generatedAt: string;
  problemAnalysis: {
    coreDiagnosis: string;
    painPointBreakdown: string[];
    technicalOrBusinessBarriers: string[];
  };
  recommendedSolutions: {
    strategicPillars: string[];
    phaseSteps: { step: number; title: string; desc: string }[];
    expectedOutcomes: string;
  };
  solvingDirections: {
    recommendedDomain: string;
    expertCompetencies: string[];
    riskWarnings: string[];
  };
  costPoints: number; // 解鎖所需點數（達人方案以上免費）
  unlockedUserIds?: string[];
}

export interface AiCrmLead {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  clientRole: string;
  questionId?: string;
  questionTitle?: string;
  lastActiveTime: string;
  statusType: 'proposal_viewed_no_reply' | 'profile_favorited' | 'board_follower' | 'high_intent_inquiry';
  statusDescription: string;
  urgency: 'high' | 'medium' | 'low';
  aiInsight: string;
  aiRecommendedAction: string;
  suggestedMessage: string;
  hasSent: boolean;
  sentAt?: string;
  isScheduled?: boolean; // 策略是否已排定並轉移至 24hr 特助佇列
  scheduledTaskId?: string; // 關聯之特助代操任務 ID
  scheduledTime?: string; // 排定發送時間

  // --- AICRM 定時主動關注與深度分析欄位 ---
  clientStatus?: string; // 用戶當前評估狀態（如：猶豫評估中、迫切尋求交付、預算比對中）
  clientNeedsAnalysis?: {
    corePainPoints: string[]; // 用戶核心痛點拆解
    budgetIntent: string; // 預算承受意向區間
    decisionFactors: string[]; // 關鍵決策影響因子
    interactionSignals: string[]; // 系統定時巡檢監測到的互動訊號
  };
  strategyBlueprint?: {
    strategyName: string; // 策略名稱（如：雙里程碑低門檻破冰策略）
    tacticalSteps: Array<{ step: number; title: string; desc: string }>; // 階段執行藍圖
    suggestedOfferType: string; // 建議方案形式（如：階段交付專案、線上專家諮詢、急件客製）
    suggestedPriceRange: string; // 建議報價與成交區間
    dealProbability: number; // 預估成交率 %（如 88%）
    bestContactTime: string; // 最佳跟進時間窗口
    riskAssessment: string; // 避坑與風險防護提示
  };
}

export interface AiCrmPushNotification {
  id: string;
  targetAudience: string;
  triggerEvent: string;
  content: string;
  status: 'sent' | 'scheduled';
  clicksCount: number;
}

export interface TimeSlotConfig {
  name: string; // 時段名稱
  rangeText: string; // 區間標示 (如 09:00 - 18:00)
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  intervalHours: number; // 該時段巡航頻率 (小時)
  badgeTheme: 'emerald' | 'amber' | 'purple' | 'blue';
  focusSummary: string; // 核心監控重心
}

export interface AiCrmSystemConfig {
  isEnabled: boolean; // 系統總開關
  requiredTier: SubscriptionTier; // 最低資格方案（預設 master 大師方案）
  hesitationDaysThreshold: number; // 提問者猶豫期觸發天數（預設 3 天）
  highIntentBountyThreshold: number; // 高意向懸賞判定門檻（預設 3000 元）
  toneStyle: 'professional' | 'consultative' | 'friendly' | 'efficient'; // 預設 AI 語氣風格
  autoScanIntervalHours: number; // 自動掃描頻率（固定模式小時數）
  allowCustomTone: boolean; // 是否允許專家自訂提示詞/語氣
  boardPushEnabled: boolean; // 主題看板主動推播擴散開關
  maxPushesPerDay: number; // 每日推播上限

  // --- 時段動態自適應策略 ---
  scheduleMode: 'smart_time_slots' | 'fixed_interval'; // 巡航模式：智慧時段動態 / 固定頻率
  peakIntervalHours: number; // 日間尖峰 (09:00 - 18:00) 頻率（預設 1 小時）
  eveningIntervalHours: number; // 晚間熱門 (18:00 - 23:30) 頻率（預設 2 小時）
  offPeakIntervalHours: number; // 深夜離峰 (23:30 - 09:00) 頻率（預設 6 小時）
}

export type AnswerType = 'discussion' | 'solution'; // 討論（留言式無賞金）vs 方案（含免費預覽與付費解鎖內容）

export type DeliveryFormat = 'text' | 'file' | 'meeting'; // 文字建議 | 檔案 | 線上會談

export interface SolutionAttachment {
  name: string;
  size: string;
  sizeBytes?: number;
  type: string;
  url?: string;
  dataUrl?: string;
}

export interface SolutionMeetingDetails {
  durationMinutes: number; // 會談時長（如 30 分鐘、60 分鐘）
  platform: 'Google Meet' | 'Zoom' | 'Teams' | 'LINE 語音 / 電話' | '其他線上會議'; // 形式
  availableTimeSlots: string; // 可約時段 / 時間說明
  meetingAgenda: string; // 會談內容大綱與諮詢範疇
}

export interface Answer {
  id: string;
  questionId: string;
  type?: AnswerType; // 預設 'solution'
  solverId: string;
  solverAuthUid?: string; // 回答者的 Firebase 帳號（資料庫權限用）
  solverName: string;
  solverTitle: string;
  solverAvatar: string;
  solverBadge?: string;
  solverRating: number;
  deliveryFormat?: DeliveryFormat; // 單一形式（相容舊格式）
  deliveryFormats?: DeliveryFormat[]; // 方案交付形式複選：['text', 'file', 'meeting']
  freePreview: string; // 方案免費預覽（若為 discussion 則為一般討論留言內容）
  fullContent?: string; // 付費完整方案（若為 discussion 則無）
  attachments?: SolutionAttachment[]; // 檔案交付附件清單（最多 3 個，單檔 50MB 內）
  meetingDetails?: SolutionMeetingDetails; // 線上會談詳細設定（時間、形式、內容）
  deliveryType?: '商業策略架構' | '財務與數據模型' | '落地實踐路徑' | '線上諮詢會談' | '技術選型報告' | '交流探討' | string;
  isPaid: boolean;
  price: number; // 解鎖費用 NT$（若為方案默認該題懸賞金，亦可由回答者自訂金額；任何人皆可付費解鎖）
  unlockedByUserIds?: string[]; // 已解鎖此方案的用戶 ID 清單
  isUnlockedByCurrentUser?: boolean;
  hasProtectedContent?: boolean; // 完整內容存放於受保護區（answer_secrets），需解鎖後由伺服器取得
  isAccepted?: boolean;
  createdAt: string;
  rating?: number;
  reviewComment?: string;
  likes?: number;
  phases?: DeliveryPhase[]; // 多階段交付方案
  isPhasedDelivery?: boolean; // 是否為多階段交付方案
  exclusiveChallengeUrl?: string; // 創星季參賽網站提案連結
  isStarSeasonSolution?: boolean;
  starSeasonProposalId?: string;
  sourcePainPointProposalId?: string;
  supportPoints?: number; // 創星季模擬募資點數
  coverImageUrl?: string; // 提案卡片封面圖片
  fakeDefaultsFixed?: boolean; // 已扣掉以前創星季預設的假讚數／點數／留言數
  commentsCount?: number; // 討論數
  isSimulated?: boolean; // 是否為系統模擬解答/討論留言（可於未來一鍵刪除）
  simulatedBatchId?: string; // 模擬資料批次標記 (例如 ideax_virtual_seed_v1)
}

export interface ChatCustomOffer {
  id: string;
  title: string;
  description: string;
  deliveryType: string;
  price: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  creatorId: string;
  creatorName: string;
  buyerId?: string;
  deliverables?: string[];
  estimatedDays?: number;
  paywalledContent?: string;
}

export interface ThreeWayDiscrepancyItem {
  targetGoal: string;        // 原始需求目標
  actualDelivery: string;    // 專家交付內容
  communicationLog: string;  // 雙方通訊記錄佐證
  status: 'fulfilled' | 'discrepancy' | 'scope_creep'; // 達標 | 實質偏差 | 需求追加(免責)
  notes?: string;
}

export interface MediationSettlementOption {
  type: 'refund_ratio' | 'extend_remediation';
  title: string;
  description: string;
  payoutPercentToSolver: number;
  refundPercentToBuyer: number;
  payoutAmount: number;
  refundAmount: number;
  extendedDays?: number;
  remediationTasks?: string[];
}

export interface ChatAIMediation {
  fulfillmentScore: number;
  fulfilledPoints: string[];
  unfulfilledPoints: string[];
  scopeCreepPoints?: string[]; // 買方追加需求或非合約內要求
  recommendedAction: string;
  suggestedPayoutRatio: number;
  suggestedRefundRatio?: number;
  mediatorOpinion: string;
  agreedByBuyer?: boolean;
  agreedBySeller?: boolean;

  // 大摩法理三方比對與客觀履約偏差報告 (JPMC Three-Way Discrepancy & Verification)
  reportTitle?: string;
  baselineGoals?: string[]; // 原始需求目標
  actualDeliverablesSummary?: string[]; // 專家實際交付內容
  communicationHighlights?: string[]; // 雙方通訊重要佐證
  threeWayDiscrepancies?: ThreeWayDiscrepancyItem[]; // 三方交叉對照矩陣
  responsibilityBreakdown?: {
    solverWeight: number; // 專家責任比重 %
    buyerWeight: number;  // 提問者追加/延遲責任比重 %
    platformAssessment: string; // 權重評估理由
  };
  options?: {
    optionA: MediationSettlementOption; // 方案 A：按比例折讓結案
    optionB: MediationSettlementOption; // 方案 B：限期補充交付與延長驗收
  };
  selectedOptionByBuyer?: 'optionA' | 'optionB';
  selectedOptionBySeller?: 'optionA' | 'optionB';
  agreedOption?: 'optionA' | 'optionB';

  // 編輯歷史、版本號與差異標示
  version?: number;
  settlementAmount?: number; // 和解點數/金額 (NT$)
  previousSettlementAmount?: number;
  estimatedDays?: number; // 履約時間 (天數)
  previousEstimatedDays?: number;
  previousAction?: string; // 修訂前的舊條款內容 (刪除對照)
  lastModifiedByRole?: 'questioner' | 'solver' | 'buyer' | 'seller';
  lastModifiedByName?: string;
  modificationNotes?: string;
  modifiedDiffs?: {
    label: string;
    oldVal: string;
    newVal: string;
  }[];

  // 交易託管與履約狀態：'negotiating' (協商中) | 'escrowed' (已扣款託管) | 'completed' (買方點擊驗收完成)
  status?: 'negotiating' | 'escrowed' | 'completed';
  escrowedAt?: string;
  completedAt?: string;
}

export interface ChatUserCard {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
  role?: string;
  isVerified?: boolean;
  isExpert?: boolean;
  reputationScore?: number;
  bio?: string;
  skills?: string[];
  totalAnswered?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
  offer?: ChatCustomOffer;
  aiMediation?: ChatAIMediation;
  attachment?: {
    type: 'image' | 'file';
    url?: string;
    name: string;
    size?: string;
  };
  userCard?: ChatUserCard;
  isAiAssistant?: boolean; // 是否為 24hr AI軍師代答
}

export interface ChatConversation {
  id: string;
  participantIds: string[]; // [user1, user2]
  participantId?: string;
  questionId?: string;
  isGroup?: boolean;
  groupName?: string;
  participantDetails: {
    id: string;
    name: string;
    avatar: string;
    title: string;
  }[];
  conversationRole?: 'questioner' | 'solver'; // 該對話中當前用戶固定的身份模式
  relatedQuestionId?: string;
  relatedQuestionTitle?: string;
  lastMessage?: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export type PaymentMethod = 'credit_card' | 'line_pay' | 'apple_pay' | 'atm_transfer';

export interface Transaction {
  id: string;
  type: 
    | '提案懸賞'
    | '方案解鎖'
    | '解答採納撥付'
    | '階段交付撥付'
    | '自訂提案支付'
    | '自訂提案收入'
    | '自訂提案退款'
    | '懸賞逾期退款'
    | '階段專案退款'
    | '點數儲值退款'
    | '爭議調解退款'
    | '解鎖未成案退款'
    | '解答者收益'
    | '私聊自訂方案交易' 
    | '會員訂閱' 
    | '點數儲值'
    | '痛點讀者打賞'
    | '提痛點打賞收益'
    | '打賞提現申請'
    | '打賞撥款'
    | '爭議審查退款' 
    | '點數扣抵'
    | '管理員轉入點數'
    // 相容歷史類型
    | '會員方案訂閱' 
    | '錢包儲值'
    | '儲值'
    | '第三方懸賞託管' 
    | '第三方採納拆款撥付' 
    | '第三方方案解鎖' 
    | '階段交付拆款撥付'
    | '懸賞託管' 
    | '付費解鎖方案' 
    | '預扣額折抵解鎖'
    | '解答者收益發放' 
    | '平台抽成' 
    | '提領申請' 
    | '錢包儲值' 
    | '訂閱會員方案' 
    | '月底抽成返還'
    | '爭議申訴退還預扣'
    | '階段方案預扣'
    | '階段款項結算'
    | '點數儲值'
    | '付費推播方案'
    | '管理員手動調整'
    | '提現申請'
    | '託管退款'
    | string;
  amount: number; // 交易總額 NT$（買家/提問者支付金額）
  platformFee: number; // 平台服務費 NT$（賣家吸收，依會員等級 10% / 5% / 0%）
  feeRate?: number; // 服務費率（0.10, 0.05, 0, -0.02）
  bonusAmount?: number; // 大師方案額外加碼 2% BONUS NT$
  netAmount: number; // 解答者實收撥款金額 NT$（撥入銀行帳戶）
  paymentMethod?: string; // '信用卡' | 'LINE Pay' | 'Apple Pay' | 'ATM 虛擬帳號'
  payoutStatus?: '已撥款至銀行帳戶' | '安全託管中' | '已原路退款' | '已完成' | string;
  bankAccountSnapshot?: string; // 撥款銀行帳戶快照，例如 '822 中國信託 (***5821)'
  relatedQuestionTitle?: string;
  relatedQuestionId?: string;
  fromUserName: string;
  fromUserId?: string;
  toUserName?: string;
  toUserId?: string;
  userId?: string;
  solverId?: string;
  rating?: number; // 1~5 星評分
  reviewComment?: string; // 交易評價
  status: '成功' | '處理中' | '已完成';
  createdAt: string;
  note?: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  category: 'questioner' | 'solver' | 'transaction';
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
  rewardPointsBonus?: string;
}

export interface HonorTitleInfo {
  role: 'questioner' | 'solver';
  title: string;
  level: number;
  badgeClass: string;
  icon: string;
  requirementText: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  title: string;
  role: 'questioner' | 'solver';
  honorTitle: string;
  score: number;
  primaryStatLabel: string;
  primaryStatValue: string | number;
  secondaryStatLabel: string;
  secondaryStatValue: string | number;
  levelCounts: Record<ProblemLevel, number>;
  domain: Category;
  achievementsCount: number;
}

export interface NotificationItem {
  id: string;
  userId?: string; // 專屬目標用戶 ID (如 'user-1', 'admin' 等，若未指定則為通用廣播)
  category?: 'personal' | 'system'; // 'personal': 個人通知 (計入郵件圖示角標) | 'system': 系統通知 (在系統通知區亮紅點，不計入郵件數字)
  title: string;
  message: string;
  type: 'ai_match' | 'handshake' | 'new_answer' | 'new_discussion' | 'payment_unlocked' | 'solution_accepted' | 'chat_message' | 'system';
  createdAt: string;
  read: boolean;
  linkQuestionId?: string;
  linkChatId?: string;
}

export interface BidirectionalHandshakeMatch {
  id: string;
  questionId: string;
  questionTitle: string;
  questionBounty: number;
  questionCategory: string;
  questionAuthorId: string;
  questionAuthorName: string;
  solverId: string;
  solverName: string;
  solverTitle: string;
  solverAvatar: string;
  solverRating: number;
  
  // Dual-Agent Matching Metrics
  marketAdvisorScore: number;    // 市場顧問 Agent 契合度 (0~100)
  marketAdvisorReason: string;   // 市場顧問分析理由
  aicrmCruiseScore: number;      // AI-CRM 客情巡航指數 (0~100)
  aicrmCruiseReason: string;     // AI-CRM 巡航分析理由
  isHandshake: boolean;          // 是否達成雙向握手 (兩者皆高於閥值)
  handshakeScore: number;        // 綜合握手指數
  
  // Handshake Blueprint & Strategy
  recommendedStrategy: string;
  estimatedNetProfit?: number;
  bestOutreachTime?: string;
  status: 'matched' | 'notified' | 'connected' | 'accepted';
  createdAt: string;
}

/**
 * 首頁「創點子」播放區（目前預留：先保存設定，播放功能之後再開放）；播放內容可複選
 * - excellent：創星季比賽的優秀作品
 * - paid：付費推播
 * - custom：管理員自選
 */
export type HomeShowcaseMode = 'excellent' | 'paid' | 'custom';
export interface HomeShowcaseConfig {
  enabled: boolean;
  /** 可複選：要播放哪幾種內容 */
  modes: HomeShowcaseMode[];
  /** 管理員自選：要播放的作品（問題／提案）ID，最多 30 個，依勾選順序 */
  customIds: string[];
  /** 優秀作品、付費推播也播放虛擬（模擬）卡片；真實作品夠多後可以關掉。預設開 */
  includeSimulated?: boolean;
  /** 隱藏首頁的大標題「一個問題，找到更多可能。」與小標題（只是視覺上隱藏，搜尋引擎仍讀得到） */
  hideHeroTitles?: boolean;
  updatedAt?: string;
}
export const HOME_SHOWCASE_MODES: HomeShowcaseMode[] = ['excellent', 'paid', 'custom'];
export const DEFAULT_HOME_SHOWCASE_CONFIG: HomeShowcaseConfig = { enabled: false, modes: ['excellent'], customIds: [], includeSimulated: true };
export const HOME_SHOWCASE_MAX_CUSTOM = 30;

/** 心智圖：中心主題往外分支，最多 3 層、40 個節點 */
export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
}
export interface MindMapData {
  root: MindMapNode;
  updatedAt?: string;
}

export interface PublicMetricsConfig {
  showPublicMetrics?: boolean;     // 統一開關：關閉時首頁不顯示任何公開數據（沒設定過視為開啟）
  showSolvedCount: boolean;        // 累計解決難題 / 已解決題數
  showTotalBounty: boolean;        // 累計懸賞金額
  showAvgResponseSpeed: boolean;   // 平均回覆速度
  showSatisfactionRate: boolean;   // 方案採納滿意度 / 滿意度
  showHighestBounty: boolean;      // 當前最高賞金
  showTotalViews?: boolean;        // 網站總瀏覽量（進入網站的總瀏覽次數）
  showUniqueVisitors?: boolean;    // 不重複訪客（不重複裝置數）
  showTodayVisitors?: boolean;     // 今日不重複訪客
  showNewMembers7d?: boolean;      // 近 7 天新註冊會員
  showJobsUsers?: boolean;         // 匯職缺使用人次（累計）
  showOnlineUsers?: boolean;       // 即時線上人數
  showTotalMembers?: boolean;      // 總註冊用戶
  showVerifiedSolvers?: boolean;   // 認證專家
  showQuestionsCount?: boolean;    // 問題數量
  showProposalsCount?: boolean;    // 提案數量
  showTotalDeals?: boolean;        // 已成交方案
  showTotalGMV?: boolean;          // 平台總交易額
}

/** 各項公開數據的開關（不含統一開關），計算「已公開 N / M 項」用 */
export const PUBLIC_METRIC_TOGGLE_KEYS: Array<keyof PublicMetricsConfig> = [
  'showTotalViews', 'showUniqueVisitors', 'showTodayVisitors', 'showOnlineUsers', 'showTotalMembers', 'showNewMembers7d', 'showVerifiedSolvers',
  'showQuestionsCount', 'showProposalsCount', 'showJobsUsers', 'showSolvedCount', 'showTotalBounty', 'showHighestBounty', 'showTotalDeals',
  'showAvgResponseSpeed', 'showSatisfactionRate', 'showTotalGMV',
];
export const countPublicMetrics = (c: PublicMetricsConfig) => PUBLIC_METRIC_TOGGLE_KEYS.filter((k) => c[k] === true).length;

// =========================================================================
// AI 客服與智慧工單 / FAQ 體系 (AI Customer Support & FAQ Suite)
// =========================================================================

export interface CustomerSupportMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  toolUsed?: string;
  dataCard?: {
    type: 'balance' | 'orders' | 'proposals' | 'ticket' | 'faq';
    title: string;
    details: Array<{ label: string; value: string }>;
  };
  quickOptions?: string[];
  isEscalated?: boolean;
  ticketId?: string;
}

export interface CustomerSupportConversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: string;
  startedAt: string;
  endedAt?: string;
  summary: string;
  category: 'account' | 'billing' | 'matching' | 'dispute' | 'general';
  messages: CustomerSupportMessage[];
  status: 'resolved' | 'escalated' | 'active';
  satisfaction?: 'positive' | 'negative';
  ticketId?: string;
  extractedFaqCandidate?: {
    question: string;
    answer: string;
    category: string;
  };
}

export interface CustomerSupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  category: 'delivery_dispute' | 'payment' | 'payout' | 'account' | 'feature' | 'bug' | 'suggestion' | 'other';
  description: string;
  priority: 'normal' | 'urgent';
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  adminNote?: string;
  relatedOrderId?: string;
  conversationId?: string;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags?: string[];
  helpfulCount?: number;
  source?: 'system' | 'auto_mined';
  recommendedByAdmin?: boolean;
}

export interface CollectedUserQuestion {
  id: string;
  conversationId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  question: string;
  category: string;
  timestamp: string;
  aiAnswerSnippet?: string;
  status: 'collected' | 'aggregated';
  resolvedByAi?: boolean;
}

export interface DraftFaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags?: string[];
  status: 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  sourceQuestions?: string[];
  isAiGenerated?: boolean;
  adminNotes?: string;
}

export type InnovationProgressStage =
  | 'initial_idea'
  | 'planning'
  | 'in_progress'
  | 'completed'
  | 'validated_refining';

export interface InnovationProgressStageMeta {
  id: InnovationProgressStage;
  label: string;
  shortLabel: string;
  scoreRange: string;
  badgeClasses: string;
}

export const INNOVATION_PROGRESS_STAGES: InnovationProgressStageMeta[] = [
  {
    id: 'initial_idea',
    label: '初步構想(0~2)',
    shortLabel: '初步構想',
    scoreRange: '0~2',
    badgeClasses: 'bg-stone-100 text-stone-700 border-stone-300',
  },
  {
    id: 'planning',
    label: '正在計畫(3~6)',
    shortLabel: '正在計畫',
    scoreRange: '3~6',
    badgeClasses: 'bg-sky-50 text-sky-800 border-sky-300',
  },
  {
    id: 'in_progress',
    label: '實行中(7~9)',
    shortLabel: '實行中',
    scoreRange: '7~9',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  {
    id: 'completed',
    label: '已完成(10)',
    shortLabel: '已完成',
    scoreRange: '10',
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  {
    id: 'validated_refining',
    label: '成功驗證,持續精進 (11 up)',
    shortLabel: '成功驗證,持續精進',
    scoreRange: '11 up',
    badgeClasses: 'bg-purple-50 text-purple-800 border-purple-300',
  },
];

export function getInnovationProgressStageMeta(stage?: string | null): InnovationProgressStageMeta | undefined {
  if (!stage) return undefined;
  return INNOVATION_PROGRESS_STAGES.find(
    (s) => s.id === stage || s.label === stage || s.shortLabel === stage
  );
}



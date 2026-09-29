/**
 * 創點子 IdeaX - 型別系統定義
 */

export type UserRole = 'questioner' | 'solver' | 'admin';

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
  | 'ai_crm';

export type AboutSection = 
  | 'list'
  | 'solver_terms'                  // 接案會員服務條款（解答者條款）
  | 'questioner_terms'              // 提問會員服務條款（提問者條款）
  | 'general_terms'                 // 服務條款（一般服務條款）
  | 'recharge_subscription_terms'   // 點數儲值與會員方案訂閱服務條款
  | 'copyright_policy'              // 著作權保護政策相關條款
  | 'disclaimer'                    // 免責聲明
  | 'privacy_policy'                // 隱私權聲明
  | 'anti_fraud_aml_policy'         // 反詐騙與防制洗錢政策
  | 'refund_dispute_policy'         // 退款政策與爭議調解處理辦法
  | 'community_guidelines'          // 社群守則與內容管理規範
  | 'about_ideax';                  // 關於創點子 / 關於出任務

export type UserDashboardTab = 
  | 'points_receivables'
  | 'overview'
  | 'profile'
  | 'switch_account'
  | 'admin_management'
  | 'admin_cases'
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
  | 'survey'
  | 'settings';

export type QuestionSortOption = 
  | 'recruiting_promoted' // 招募中（付費推播）放在最前面，默認排序
  | 'most_solutions'      // 最多解答（方案數最多）
  | 'most_discussions'    // 熱烈討論（討論數）
  | 'highest_bounty';     // 最高懸賞

export type Category = 
  | '創新創業'
  | '專業問題'
  | '學術探討'
  | '日常疑難';

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
  | '其他';

export const CATEGORY_HIERARCHY: Record<Category, string[]> = {
  '創新創業': ['資訊科技', '生醫材料', '機械工業', '服務餐飲', '文創工藝'],
  '專業問題': ['水電', '室內裝修', '法律智財', '會計稅務', '企業管理'],
  '學術探討': ['生技醫療', '資訊工程', '電機', '法律政治', '商管', '文學', '社會科學', '藝術設計'],
  '日常疑難': ['職場', '家務', '感情', '時事', '購物', '其他'],
};

export type ProblemLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export type SearchMode = 'keywords' | 'users'; // 關鍵字（問題、方案、討論、內文） | 用戶或專家（輸入 ID 或名稱）

export interface RechargePackage {
  id: string;
  price: number; // 儲值台幣金額 NT$
  basePoints: number; // 基礎點數
  bonusPoints: number; // 贈送點數
  totalPoints: number; // 總實得點數
  commissionAmount: number; // 儲值時抽成差額 NT$
  tag?: string;
  isPopular?: boolean;
}

export const RECHARGE_PACKAGES: RechargePackage[] = [
  {
    id: 'pack-299',
    price: 299,
    basePoints: 210,
    bonusPoints: 0,
    totalPoints: 210,
    commissionAmount: 89,
    tag: '輕量入門',
  },
  {
    id: 'pack-599',
    price: 599,
    basePoints: 510,
    bonusPoints: 0,
    totalPoints: 510,
    commissionAmount: 89,
    tag: '超值熱門',
    isPopular: true,
  },
  {
    id: 'pack-999',
    price: 999,
    basePoints: 830,
    bonusPoints: 0,
    totalPoints: 830,
    commissionAmount: 169,
    tag: '行家推薦',
  },
  {
    id: 'pack-2999',
    price: 2999,
    basePoints: 2610,
    bonusPoints: 0,
    totalPoints: 2610,
    commissionAmount: 389,
    tag: '尊榮首選',
  },
];

export interface DeliveryPhase {
  id: string;
  phaseNumber: number;
  title: string;
  description: string;
  points: number;
  status: 'pending_acceptance' | 'in_progress' | 'submitted' | 'accepted' | 'refunded';
  submittedContent?: string;
  submittedAttachments?: SolutionAttachment[];
  acceptedAt?: string;
}

export type PostType = 'seek_solution' | 'pain_point' | 'chat_discussion'; // 尋求解答 | 提出痛點 | 閒聊討論

export type SpecialZone = 'all' | 'l0_discussion' | 'pain_points'; // 全部 | L0問題討論專區 | 創點子/痛點專區

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
    ],
  },
  pro: {
    // 相容別名導向達人方案
    id: 'pro',
    name: '達人方案',
    pricingText: '6 個月 $1,499（$249/月）',
    monthlyPrice: 249,
    billingCycles: [
      { cycle: 'semi_annual', price: 1499, label: '6 個月 $1,499', savingsText: '約 $249/月', durationMonths: 6 },
    ],
    platformFeeRate: 0.05,
    feeDiscountText: '服務費 -5%（半價）',
    sellerPayoutRate: 0.95,
    sellerPayoutText: '95%',
    effectiveRateText: '5%',
    rebatePercent: 5,
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
    tagline: '服務費砍半！實質僅收 5% 服務費，實收 95%',
    benefits: [
      '全站發問與解答提案',
      'AI 初步問題分析報告：免費查看 50 次',
      'AI 提案架構整理：一鍵整理為 4 層架構',
    ],
  },
  expert: {
    id: 'expert',
    name: '達人方案',
    pricingText: '6 個月 $1,499（$249/月）',
    monthlyPrice: 249,
    billingCycles: [
      { cycle: 'semi_annual', price: 1499, label: '6 個月 $1,499', savingsText: '約 $249/月', durationMonths: 6 },
    ],
    platformFeeRate: 0.05,
    feeDiscountText: '服務費 -5%（半價）',
    sellerPayoutRate: 0.95,
    sellerPayoutText: '95%',
    effectiveRateText: '5%',
    rebatePercent: 5,
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
    tagline: '服務費砍半！實質僅收 5% 服務費，實收 95%',
    benefits: [
      '全站發問與解答提案',
      'AI 初步問題分析報告：免費查看 50 次',
      'AI 提案架構整理：一鍵整理為 4 層架構',
    ],
  },
  authority: {
    id: 'authority',
    name: '權威方案',
    pricingText: '$1,490/月 或 $14,900/年',
    monthlyPrice: 1490,
    billingCycles: [
      { cycle: 'monthly', price: 1490, label: '月繳 NT$ 1,490/月', durationMonths: 1 },
      { cycle: 'annual', price: 14900, label: '年繳 NT$ 14,900/年', savingsText: '年繳現省 NT$ 2,980', durationMonths: 12 },
    ],
    platformFeeRate: 0.00,
    feeDiscountText: '服務費 -10%（免服務費）',
    sellerPayoutRate: 1.00,
    sellerPayoutText: '100%',
    effectiveRateText: '0%',
    rebatePercent: 10,
    badgeClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-700 font-black shadow-2xs',
    tagline: '免平台服務費！解答者 100% 全額入帳',
    benefits: [
      '全站發問與解答提案',
      'AI 初步問題分析報告：全站免費無限次查看及下載報告',
      'AI 提案架構整理：一鍵整理為 4 層架構',
      '高價值商業案件優先推薦',
    ],
  },
  master: {
    id: 'master',
    name: '大師方案',
    pricingText: '$3,990/月 或 $43,990/年',
    monthlyPrice: 3990,
    billingCycles: [
      { cycle: 'monthly', price: 3990, label: '月繳 NT$ 3,990/月', durationMonths: 1 },
      { cycle: 'annual', price: 43990, label: '年繳 NT$ 43,990/年', savingsText: '現省 NT$ 3,890', durationMonths: 12 },
    ],
    platformFeeRate: -0.02,
    feeDiscountText: '免服務費 + 額外回饋 2% BONUS',
    sellerPayoutRate: 1.02,
    sellerPayoutText: '102%',
    effectiveRateText: '+2% BONUS',
    rebatePercent: 12,
    badgeClass: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-stone-950 border-amber-500 font-black shadow-sm',
    tagline: '0 服務費 ＋ 平台額外補貼 2% BONUS（實收高達 102%！）',
    benefits: [
      '全站發問與解答提案',
      'AI 初步問題分析報告：全站免費無限次查看及下載報告',
      'AI 提案架構整理：一鍵整理為 4 層架構',
      '高價值商業案件優先推薦',
      'AI-CRM 主動客戶關係管理系統：管理案件小秘書(高端限定)',
      '主題看板專家方案主動推播：高端限定(高效曝光、精準媒合)',
      '⚡ 雙效 BUFF：管理案件小秘書 ＋ 高效精準媒合，打造主動接案成長飛輪',
    ],
  },
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
  desiredServices?: string[]; // 期望在IdeaX使用的服務 (可多選)
  desiredServicesCustom?: string; // 期望在IdeaX使用的服務 (自填)
  relatedDomains?: string[]; // 相關領域 (可多選)
  relatedDomainsCustom?: string; // 相關領域 (自行輸入)
  willingQuestionBudget?: string; // 願意一次花多少錢在尋求解答(自行提問)?
  willingToProvideSolutions?: string; // 是否願意有償為其他提問提供解方(為人解答)?
  usageFrequency?: string; // 您多久打開一次 IdeaX ?
  willingToBeSideHustle?: string; // 您是否願意將解答作為您的副業(有償)?
  willingToSubscribeSolverPlan?: string; // 您是否願意花錢訂閱解答者的優惠方案?
  feedbackSuggestions?: string; // 給我們的建議，自由填寫
  completedAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  title: string;
  avatar: string;
  role: UserRole;
  balance: number; // 相容欄位（預設 0，全面以第三方支付與直接撥款為主）
  pendingEarnings: number; // 待結算/託管中收益 NT$
  reputation: number; // 信用值 / 聲望
  joinedDate: string;
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
  skills?: string[]; // 專長標籤
  verifiedExpert?: boolean; // 是否為認證專家
  verifiedBadge?: string; // 專家認證徽章稱號
  rating?: number; // 評分（0~5星）
  reviewCount?: number;
  acceptedSolutionsCount?: number; // 方案採納數量（公開）
  featuredCase?: {
    title: string;
    description?: string;
    outcome?: string;
    files?: Array<{ name: string; size?: string; url?: string }>;
    images?: Array<{ url: string; caption?: string }>;
  };
  showRecentSolutions?: boolean;

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
  totalWithdrawn?: number; // 累積撥款入帳金額 NT$
  withheldPoints?: number; // 託管中懸賞金額 NT$

  // 交易成就化、榮譽化與各等級問題統計
  honorTitle?: string; // 榮譽稱號，如「傳奇解答國師」、「黃金天使提問家」
  honorLevel?: number; // 榮譽等級 1~5
  levelAnswerCounts?: Record<ProblemLevel, number>; // 各等級解答統計 (L0 ~ L4)
  levelQuestionCounts?: Record<ProblemLevel, number>; // 各等級提問統計 (L0 ~ L4)
  achievementsCount?: number; // 解鎖成就數量

  // 收藏問題列表
  bookmarkedQuestionIds?: string[]; // 收藏之問題 ID 清單

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
  realNameAuthData?: {
    legalName: string; // 真實姓名 (必填)
    idNumber: string; // 身分證字號 / 居留證號 (必填)
    nationality: string; // 國籍 (必填)
    birthDate: string; // 出生年月日 (必填)
    phoneNumber: string; // 聯絡電話 / 手機 (必填)
    email: string; // 聯絡電子信箱 (必填)
    idCardFrontFile?: { name: string; size?: string; url?: string }; // 身分證正面 (必填)
    idCardBackFile?: { name: string; size?: string; url?: string }; // 身分證反面 (必填)
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
    subdomain?: string;
    professionalTitle: string;
    yearsOfExperience?: string;
    credentialsFiles: Array<{ name: string; size?: string; url?: string }>;
    proofDescription: string;
    proofFiles: Array<{ name: string; size?: string; url?: string }>;
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
  verifiedBadge?: boolean;
  verifiedExpert?: boolean;
  answerCount?: number;
  acceptedRate?: number;
  acceptedSolutionsCount?: number;
  tier?: string;
} | null): boolean => {
  if (!solver) return false;
  // 1. 通過平台專業認證 (實名審查/特邀專家/認證專家)
  if (solver.verifiedBadge || solver.verifiedExpert) return true;
  if (solver.tier === '認證專家' || solver.tier === '特邀顧問') return true;

  // 2. 或 採納方案 ≥ 50 份
  const acceptedCount = solver.acceptedSolutionsCount !== undefined
    ? solver.acceptedSolutionsCount
    : (solver.answerCount !== undefined && solver.acceptedRate !== undefined)
      ? Math.round(solver.answerCount * (solver.acceptedRate / 100))
      : (solver.answerCount || 0);

  return acceptedCount >= 50;
};

export interface Question {
  id: string;
  title: string;
  description: string;
  category: Category;
  subcategory?: string;
  tags: string[];
  level: ProblemLevel;
  bounty: number; // 懸賞金額 NT$
  status: 'open' | 'solved' | 'closed';
  authorId: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  deadline: string;
  views: number;
  viewsCount?: number;
  answersCount: number;
  authorTitle?: string;
  invitedSolverIds?: string[];
  isFeatured?: boolean;
  postType?: PostType; // 尋求解答 | 提出痛點 | 閒聊討論
  withheldBounty?: number; // 已保留之懸賞點數（交易履約保障中，採納時發動撥付）
  disputeStatus?: 'none' | 'pending_review' | 'resolved_refunded' | 'rejected'; // 疑義檢舉審查狀態
  disputeReason?: string; // 檢舉疑義事由
  phases?: DeliveryPhase[]; // 多階段交付計畫
  isPhasedDelivery?: boolean; // 是否啟用多階段交付
  isOfficial?: boolean; // 是否為平台官方貼文 (💡IdeaX 官方帳號💡)
  publishIdentity?: 'admin' | 'platform'; // 發布身分（管理員個人身分 / 平台官方身分）
  aiAnalysis?: {
    summary: string;
    structuredNeed: string[];
    solverProfileAdvice: string;
    marketFitRating?: string;
  };
  aiPreliminaryReport?: AIPreliminaryReport;
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
  solverName: string;
  solverTitle: string;
  solverAvatar: string;
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
  isAccepted?: boolean;
  createdAt: string;
  rating?: number;
  reviewComment?: string;
  likes?: number;
  phases?: DeliveryPhase[]; // 多階段交付方案
  isPhasedDelivery?: boolean; // 是否為多階段交付方案
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
    | '第三方懸賞託管' 
    | '第三方採納拆款撥付' 
    | '第三方方案解鎖' 
    | '階段交付拆款撥付'
    | '私聊自訂方案交易' 
    | '會員方案訂閱' 
    | '爭議審查退款' 
    | '點數扣抵'
    | '管理員轉入點數'
    | '儲值'
    // 相容歷史類型
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
    | '階段款項結算';
  amount: number; // 交易總額 NT$（買家/提問者支付金額）
  platformFee: number; // 平台服務費 NT$（賣家吸收，依會員等級 10% / 5% / 0%）
  feeRate?: number; // 服務費率（0.10, 0.05, 0, -0.02）
  bonusAmount?: number; // 大師方案額外加碼 2% BONUS NT$
  netAmount: number; // 解答者實收撥款金額 NT$（撥入銀行帳戶）
  paymentMethod?: string; // '信用卡' | 'LINE Pay' | 'Apple Pay' | 'ATM 虛擬帳號'
  payoutStatus?: '已撥款至銀行帳戶' | '第三方安全託管中' | '已原路退款' | '已完成';
  bankAccountSnapshot?: string; // 撥款銀行帳戶快照，例如 '822 中國信託 (***5821)'
  relatedQuestionTitle?: string;
  relatedQuestionId?: string;
  fromUserName: string;
  toUserName?: string;
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
  title: string;
  message: string;
  type: 'ai_match' | 'new_answer' | 'new_discussion' | 'payment_unlocked' | 'solution_accepted' | 'chat_message' | 'system';
  createdAt: string;
  read: boolean;
  linkQuestionId?: string;
  linkChatId?: string;
}

export interface PublicMetricsConfig {
  showSolvedCount: boolean;        // 累計解決難題
  showTotalBounty: boolean;        // 累計懸賞金額
  showAvgResponseSpeed: boolean;   // 平均回覆速度
  showSatisfactionRate: boolean;   // 方案採納滿意度
  showHighestBounty: boolean;      // 當前最高賞金
}


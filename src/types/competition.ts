/**
 * IdeaX 創星季 (Star Season Innovation Challenge) - 型別與常數定義
 * 
 * 遵守活動最終規則：
 * 1. 活動對外名稱為「IdeaX 創星季」，徽章/活動標籤為「創星季」。
 * 2. 兩階段內容：第一階段「徵點子」提交痛點；第二階段「想解方」提出解法。
 *    痛點獎勵：只要成功提出痛點（需過審）即送 100 點（價值 $125 的 IdeaX 創點子平台點數，可用於發布懸賞問題、享受付費功能，點數效期 60 日）。
 *    若獲獎提案使用之痛點提出者可另獲獎勵：價值 $1,500 好禮（1,200 點提問金），明確記錄關聯與人工審核。
 * 3. 募資前 20 名僅為入圍決選資格，由專家評選；冠軍 NT$30,000、亞軍 NT$10,000、季軍 NT$4,000。
 * 4. 活動時程明示為「暫定」，支援可配置化。
 * 5. 校園大使每推薦一件審核通過提案，即享 400 點推廣獎勵（IdeaX平台點數，用於提問、享受付費服務）。
 * 6. 找專家行銷費：邀約 NT$5,000，另每位專家 NT$500，由管理員人工審核與記錄付款狀態，不自動出款。
 * 7. 分享推薦碼獎勵 100 創星幣（每帳號防重領取，不兌現）。
 * 8. 創星幣初始：一般用戶/提案者 100,000 創星幣，專家 3,000,000 創星幣（1創星幣=NT$1 僅供模擬市場關注度驗證）。
 *    單案支持上限：一般用戶 50,000、提案者 30,000、專家 2,000,000；禁止自投、購買、兌現。
 * 9. 創星幣與舊站真實 balance 嚴格隔離，互不影響。
 * 10. 競賽分類：此競賽不另設類別，只要是解決所提痛點且需求獲市場認同、技術受專家認可即可。
 *     提案時仍可自由標注相關領域。（分類僅作為方便識別不作為競賽依據）
 */

export type StarSeasonStage = 'pain_point' | 'solution'; // 第一階段：徵點子（痛點）/ 第二階段：想解方（解法）

// 官方四大領域分類：機電運輸、資通訊、生醫化材、服務文創
export type StarSeasonTrack = 
  | 'mechanical_transport' // 機電運輸
  | 'ict'                  // 資通訊
  | 'biomedical'           // 生醫化材
  | 'cultural_services'   // 服務文創
  // 相容歷史舊鍵名
  | 'ai_applications'
  | 'campus_life'
  | 'hardware_iot'
  | 'social_impact';

export interface TrackInfo {
  id: StarSeasonTrack;
  name: string;
  tag: string;
  description: string;
  color: string;
}

export const STAR_SEASON_TRACKS: Record<string, TrackInfo> = {
  mechanical_transport: {
    id: 'mechanical_transport',
    name: '機電運輸',
    tag: '機電運輸',
    description: '智慧機械、無人載具、智慧電網、電動車、智慧物流與綠能裝備',
    color: 'blue',
  },
  ict: {
    id: 'ict',
    name: '資通訊',
    tag: '資通訊',
    description: 'AI 智慧應用與代理人、物聯網軟硬整合、雲端 SaaS、晶片設計與資安',
    color: 'purple',
  },
  biomedical: {
    id: 'biomedical',
    name: '生醫化材',
    tag: '生醫化材',
    description: '生技醫療、數位健康、先進材料、農業生技與綠色化學',
    color: 'emerald',
  },
  cultural_services: {
    id: 'cultural_services',
    name: '服務文創',
    tag: '服務文創',
    description: '生活服務商模創新、文化創意 IP、青年共享經濟與地方創生',
    color: 'amber',
  },

  // 歷史鍵名無縫相容
  ai_applications: {
    id: 'ict',
    name: '資通訊',
    tag: '資通訊',
    description: 'AI 智慧應用與代理人、物聯網軟硬整合、雲端 SaaS、晶片設計與資安',
    color: 'purple',
  },
  campus_life: {
    id: 'cultural_services',
    name: '服務文創',
    tag: '服務文創',
    description: '生活服務商模創新、文化創意 IP、青年共享經濟與地方創生',
    color: 'amber',
  },
  hardware_iot: {
    id: 'mechanical_transport',
    name: '機電運輸',
    tag: '機電運輸',
    description: '智慧機械、無人載具、智慧電網、電動車、智慧物流與綠能裝備',
    color: 'blue',
  },
  social_impact: {
    id: 'cultural_services',
    name: '服務文創',
    tag: '服務文創',
    description: '生活服務商模創新、文化創意 IP、青年共享經濟與地方創生',
    color: 'amber',
  },
};

/** 官方四大領域標準列表 */
export const OFFICIAL_COMPETITION_TRACKS: TrackInfo[] = [
  STAR_SEASON_TRACKS.mechanical_transport,
  STAR_SEASON_TRACKS.ict,
  STAR_SEASON_TRACKS.biomedical,
  STAR_SEASON_TRACKS.cultural_services,
];

export type ProposalReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'withdrawn';

export interface StarSeasonProposal {
  id: string;
  title: string;
  stage: StarSeasonStage;
  track: StarSeasonTrack;
  summary: string;
  description: string;
  
  // 提案人資訊（公開）
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: 'user' | 'solver' | 'enterprise'; // 在舊站仍為普通身分
  
  // 兩階段關聯：想解方採用特定痛點
  sourcePainPointProposalId?: string; // 關聯之來源痛點 ID
  sourcePainPointTitle?: string;
  adoptedByWinningSolution?: boolean; // 是否獲獎並採用該痛點
  adoptedSourceRewardAmount?: number; // 提問金 1,200 點（價值 $1,500 好禮）
  adoptedSourceRewardDescription?: string; // 「價值$1500好禮（1200點提問金,用於IdeaX平台提問或使用特色功能）」
  adoptedSourceApproved?: boolean; // 管理員人工審核通過
  adoptedSourceRewardStatus?: 'none' | 'pending' | 'approved' | 'paid';
  
  // 圖片與相片展示 (痛點 0~3 張圖片；提案 1~3 張照片)
  images?: string[];
  
  // 補充資料與外部連結
  externalLink?: string; // 補充資料連結 / 外部連結 (選填)
  technicalFeasibility?: string; // 技術可行性 (補充資料)
  marketAnalysis?: string; // 市場分析與定位 (補充資料)
  businessModelFinancials?: string; // 商業模式與財務預測 (補充資料)
  
  // AI 市場顧問 Agent 自動賦予標籤與分類判定
  tags?: string[];
  aiCategorized?: boolean; // 若為痛點且未填領域，記錄由 AI 市場顧問賦予領域分類
  
  // 審核治理
  status: ProposalReviewStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  
  // 模擬募資與點數支持（完全獨立於舊站 balance）
  supportPoints: number; // 累計支持競賽點數
  supporterCount: number; // 支持人次
  targetFundingAmount?: number; // 模擬募資目標額度
  
  // 複賽入圍與最終獎項
  rankQualifiedForFinal?: boolean; // 募資前 20 名進入複賽資格（僅為入圍，非最終得獎）
  finalRank?: number; // 專家評選最終名次 (1: 冠軍 NT$30,000, 2: 亞軍 NT$10,000, 3: 季軍 NT$4,000)
  finalAwardConfirmed?: boolean; // 官方確認獲獎
  grantedStarBadge?: boolean; // 前十名授予「創之星」徽章
  
  // 附件資訊 (Firebase Storage)
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMime?: string;
  
  // 按讚（愛心）與討論串（社群交流互動）
  likeCount?: number; // 愛心按讚數
  likedUserIds?: string[]; // 已按讚使用者清單
  commentsCount?: number; // 討論留言數

  // 校園大使推廣推薦關聯
  referredByAmbassadorCode?: string;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 提案交流討論留言模型
 */
export interface ProposalComment {
  id: string;
  proposalId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: 'participant' | 'expert' | 'user' | 'admin';
  roleBadgeText?: string; // 「創星季參賽者」 | 「評審專家」 | 「平台會員」 | 「管理員」
  content: string;
  createdAt: string;
}

/**
  * 參賽者報名與上傳資料結構
  */
export interface ParticipantRegistrationData {
  teamName: string; // 團隊/專題名稱
  leaderName: string; // 隊長/負責人姓名
  leaderPhone: string; // 隊長聯絡電話
  leaderEmail: string; // 隊長 Email
  schoolName: string; // 就讀大專院校
  department: string; // 系所年級
  advisorName?: string; // 指導老師/業師 (選填)
  teamMembers?: Array<{ name: string; department?: string; role?: string }>; // 團隊成員名單
  track: StarSeasonTrack; // 參賽賽道
  projectTitle: string; // 提案主題
  summary: string; // 提案構想摘要
  description: string; // 核心解方詳細說明
  sourcePainPointId?: string; // 關聯第一階段痛點 ID
  sourcePainPointTitle?: string;
  
  // 大專募資模擬平台規範繳交核心文件
  bpDocumentUrl?: string; // ① 營運構想計畫書 (BP / PDF)
  bpDocumentName?: string;
  bpDocumentSize?: number;
  prototypeImageUrl?: string; // ② 產品或原型展示圖
  prototypeImageName?: string;
  videoUrl?: string; // ③ 創業宣傳概念影片連結 (YouTube / 影音宣傳連結)
  targetFundingAmount: number; // ④ 模擬募資目標金額 (NT$100,000 ~ NT$1,000,000)
  rewardPlanDescription: string; // ⑤ 模擬募資回饋承諾方案 (支持者回饋設計)
  pledgeAgreed: boolean; // 原創性與競賽自律規範承諾
}

/**
 * 評審團申請資料結構 (專業評審審查)
 */
export interface JudgeApplicationData {
  name: string; // 姓名
  phone: string; // 聯絡電話
  email: string; // 電子信箱
  organization: string; // 服務單位 / 學校或機構
  jobTitle: string; // 職稱 / 職位
  domain: string; // 專業領域
  experienceYears: number; // 專業資歷 (年)
  credentialsNote: string; // 相關證明或專業證件說明 / 證號
  credentialProofUrl?: string; // 證明文件 / 證照或聘書圖片
  credentialProofName?: string;
  bio: string; // 個人經歷與審查簡歷
  reviewPledgeAgreed: boolean; // 恪守保密與公正評審承諾
}

/**
 * 敏感資料隔離模型：
 * 聯絡人、身分證件、銀行匯款帳號等一律存放於私有集合，前端公開提案完全不包含這些欄位
 */
export interface ProposalPrivateDetails {
  proposalId: string;
  authorId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  schoolOrOrg?: string;
  bankCode?: string;
  bankAccount?: string;
  idNumber?: string;
  updatedAt: string;
}

/**
 * 競賽點數帳戶（與舊站 balance 徹底隔離）
 */
export interface CompetitionAccount {
  userId: string;
  role: 'user' | 'solver' | 'admin';
  initialPoints: number; // 一般用戶 100,000 / 專家 3,000,000
  availablePoints: number;
  spentPoints: number;
  referralCode: string;
  shareBonusClaimed: boolean; // 分享推薦碼 100 點獎勵防重
  createdAt: string;
  updatedAt: string;
}

export const COMPETITION_POINTS_CONFIG = {
  INITIAL_USER_POINTS: 100_000, // 一般用戶與提案者
  INITIAL_EXPERT_POINTS: 3_000_000, // 專家
  SINGLE_SUPPORT_LIMIT: {
    user: 50_000,       // 一般用戶單案上限
    questioner: 30_000, // 提案者單案上限
    solver: 2_000_000,  // 專家單案上限
  },
  SHARE_BONUS_POINTS: 100, // 分享推薦碼 100 創星幣

  // 校園推廣大使獎勵：每推薦 1 案審核通過即享 300 點（價值 $400）（IdeaX 平台點數）
  AMBASSADOR_REWARD_PER_APPROVED_POINTS: 300,
  AMBASSADOR_REWARD_PER_APPROVED_VALUE: 400,
  AMBASSADOR_REWARD_PER_APPROVED: 300,

  EXPERT_INVITE_BASE_FEE: 5_000,       // 專家邀約固定 NT$5,000
  EXPERT_INVITE_PER_EXPERT: 500,       // 另每位專家 NT$500

  // 人人有獎：只要提出痛點並過審可獲得 200 點（價值 $250）
  PAIN_POINT_SUBMISSION_REWARD: 200,
  PAIN_POINT_SUBMISSION_REWARD_VALUE: 250,
  PAIN_POINT_SUBMISSION_REWARD_DESC: '只要提出痛點並過審可獲得 200 點（價值 $250 的 IdeaX 創點子平台點數，可用於發布懸賞問題、享受付費功能，點數效期 60 日）',

  // 痛點採用獎：前十名得獎提案若採用第一階段痛點，原痛點提出者另享等值好禮
  PAIN_POINT_ADOPTION_REWARDS: {
    TOP_1_3: {
      points: 800,
      value: 1000,
      description: '創新提案排名前 1~3 名採用：獲價值 $1,000 好禮（800 點 IdeaX 平台提問金）',
    },
    TOP_4_10: {
      points: 400,
      value: 500,
      description: '創新提案排名前 4~10 名採用：獲價值 $500 好禮（400 點 IdeaX 平台提問金）',
    },
  },
  PAIN_POINT_ADOPTION_REWARD: 800,
  PAIN_POINT_ADOPTION_REWARD_DESC: '獲獎提案採用之痛點好禮（800 點 / 400 點 IdeaX 平台提問金）',

  // 決選獎項榮譽與獎勵機制
  AWARDS: {
    CHAMPION: {
      totalValue: 30_000,
      cash: 20_000,
      points: 8_000,
      pointsValue: 10_000,
      title: '冠軍',
      description: '價值 $30,000（NT$20,000 現金 ＋ 8,000 點（價值 $10,000）＋ 官方「創之星」最高榮譽徽章）',
    },
    RUNNER_UP: {
      totalValue: 10_000,
      cash: 6_000,
      points: 3_200,
      pointsValue: 4_000,
      title: '亞軍',
      description: '價值 $10,000（NT$6,000 現金 ＋ 3,200 點（價值 NT$4,000）＋ 官方「創之星」最高榮譽徽章）',
    },
    THIRD: {
      totalValue: 5_000,
      cash: 3_000,
      points: 1_600,
      pointsValue: 2_000,
      title: '季軍',
      description: '價值 $5,000（NT$3,000 現金 ＋ 1,600 點（價值 NT$2,000）＋ 官方「創之星」最高榮譽徽章）',
    },
  },
};

/**
 * 競賽時程配置
 * 10/31~11/13 痛點徵件
 * 11/14~12/04 募資期間
 * 12/05~12/11 複賽評選
 * 12/16前 公布結果
 */
export interface CompetitionScheduleConfig {
  stage1Submission: {
    title: string;
    period: string;
    isTentative?: boolean;
  };
  stage2Solution?: {
    title: string;
    period: string;
    isTentative?: boolean;
  };
  crowdfunding: {
    title: string;
    period: string;
    isTentative?: boolean;
  };
  expertReview: {
    title: string;
    period: string;
    isTentative?: boolean;
  };
  resultsAnnouncement: {
    title: string;
    period: string;
    isTentative?: boolean;
  };
}

export const DEFAULT_COMPETITION_SCHEDULE: CompetitionScheduleConfig = {
  stage1Submission: {
    title: '第一階段：痛點徵件',
    period: '10/31 00:00 – 11/13 16:30',
    isTentative: false,
  },
  stage2Solution: {
    title: '想解方（預先提案 11/14 10:00~11/15 16:30・模擬募資提案 11/16 10:00~12/04 16:30）',
    period: '11/14 10:00 – 12/04 16:30',
    isTentative: false,
  },
  crowdfunding: {
    title: '第二階段：模擬募資（11/16 10:00 ~ 12/04 16:30 全體會員使用創星幣模擬注資投票，總額前 20 名取得決選資格）',
    period: '11/16 10:00 – 12/04 16:30',
    isTentative: false,
  },
  expertReview: {
    title: '第三階段：進入決選(評審)（由大會之產學研專家與導師進行專業審查、深度指導與評分）',
    period: '12/05 – 12/11',
    isTentative: false,
  },
  resultsAnnouncement: {
    title: '第四階段：公布結果（於首頁盛大公告最終榜單，頒發榮譽與獎勵）',
    period: '12/16 前公布',
    isTentative: false,
  },
};

/**
 * 競賽網首頁數據展示開關設定
 * 管理員可於後台自由勾選欲於競賽網首頁公開展示之數據指標
 */
export interface CompetitionHomepageStatsConfig {
  showLoggedInUsers: boolean;   // 登入用戶數
  showParticipants: boolean;    // 參賽者數
  showExperts: boolean;         // 專家數
  showProposals: boolean;       // 提案數
  showPainPoints: boolean;      // 痛點數
  showAllocatedPoints: boolean; // 已配發點數
}

export const DEFAULT_HOMEPAGE_STATS_CONFIG: CompetitionHomepageStatsConfig = {
  showLoggedInUsers: true,
  showParticipants: true,
  showExperts: true,
  showProposals: true,
  showPainPoints: true,
  showAllocatedPoints: true,
};

export interface UserCompetitionRewardSummary {
  userId: string;
  userName: string;
  userRole: string;
  userEmail?: string;
  userPhone?: string;

  // 1. 痛點過審獎勵 (每案過審 200 點，價值 $250)
  approvedPainPointsCount: number;
  painPointSubmissionPoints: number; // approvedPainPointsCount * 200
  painPointSubmissionValue: number;  // approvedPainPointsCount * 250

  // 2. 痛點採用好禮獎勵 (前1~3名 800 點 / 價值 $1,000; 前4~10名 400 點 / 價值 $500)
  adoptedTop3Count: number;
  adoptedTop4To10Count: number;
  painPointAdoptionPoints: number; // adoptedTop3Count * 800 + adoptedTop4To10Count * 400
  painPointAdoptionValue: number;  // adoptedTop3Count * 1000 + adoptedTop4To10Count * 500

  // 3. 校園推廣大使獎勵 (每推薦1案過審 300 點，價值 $400)
  ambassadorApprovedCount: number;
  ambassadorPoints: number; // ambassadorApprovedCount * 300
  ambassadorValue: number;  // ambassadorApprovedCount * 400

  // 4. 決選獲獎獎勵
  awardRank?: number;
  awardCash: number;           // 現金 (冠軍 20,000 / 亞軍 6,000 / 季軍 3,000)
  awardPoints: number;         // 點數 (冠軍 8,000 / 亞軍 3,200 / 季軍 1,600)
  awardPointsValue: number;    // 點數等值 (冠軍 10,000 / 亞軍 4,000 / 季軍 2,000)
  awardTotalValue: number;     // 冠軍 30,000 / 亞軍 10,000 / 季軍 5,000

  // 當前累積獲得獎金與點數獎勵總計
  totalCashReward: number;           // 現金總額 (NT$)
  totalIdeaXPoints: number;          // IdeaX 平台點數總額 (點)
  totalPointsEstimatedValue: number; // 點數等值總價值 (NT$)
  grandTotalValue: number;           // 現金 + 點數等值總價值 (NT$)
}

export interface AdminTotalRewardsMetrics {
  totalCashDistributed: number;          // 全用戶累積已核發/應發獎金總額 (NT$)
  totalIdeaXPointsDistributed: number;   // 全用戶累積已配發 IdeaX 平台點數總額 (點)
  totalPointsEstimatedValue: number;     // 全用戶點數等值總價值 (NT$)
  grandTotalRewardsValue: number;        // 全用戶總額 (現金 + 點數價值 NT$)
  
  // 明細拆解
  breakdown: {
    championCash: number;
    championPoints: number;
    runnerUpCash: number;
    runnerUpPoints: number;
    thirdCash: number;
    thirdPoints: number;
    painPointSubmissionTotalPoints: number;
    painPointAdoptionTotalPoints: number;
    ambassadorTotalPoints: number;
  };
}

/**
 * 競賽管理員後台聚合數據結構
 */
export interface CompetitionAdminMetrics {
  // 1. 登入用戶數
  loggedInUsersCount: number;
  totalRegisteredUsers: number;

  // 2. 參賽者數
  participantsCount: number;
  approvedParticipantsCount: number;
  pendingParticipantsCount: number;

  // 3. 專家數
  expertsCount: number;
  approvedExpertsCount: number;
  pendingExpertsCount: number;

  // 4. 提案數 (想解方/創新提案)
  proposalsCount: number;
  approvedProposalsCount: number;
  pendingProposalsCount: number;

  // 5. 痛點數 (徵點子/切身痛點)
  painPointsCount: number;
  approvedPainPointsCount: number;

  // 6. 已配發創星幣總額（全網模擬募資流動幣池）
  totalAllocatedPoints: number;
  pointsBreakdown: {
    expertsTotalPoints: number;       // 專家帳號配發 (專家數 * 3,000,000)
    participantsTotalPoints: number;  // 參賽與用戶帳號配發 (用戶數 * 100,000)
    referralBonusTotalPoints: number; // 推薦碼獎勵配發 (過審推薦數 * 300 點)
    painPointAdoptionPoints: number;  // 痛點採用獎勵配發
    shareBonusPoints: number;         // 分享推薦碼獎勵 (每人 100 創星幣)
  };

  // 7. 全用戶獎金與點數獎勵統計 (管理員後台同步計算)
  rewardsMetrics: AdminTotalRewardsMetrics;
  userRewardSummaries: UserCompetitionRewardSummary[];
}


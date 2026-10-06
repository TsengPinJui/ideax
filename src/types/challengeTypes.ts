/**
 * IdeaX 創新挑戰季 (IdeaX Innovation Challenge) 型別定義
 */

export type ChallengeCategory = 
  | '科技創新'
  | 'AI智慧'
  | '商業模式'
  | '生活永續'
  | '社會創新'
  | '文創教育'
  | '生醫健康';

export type ChallengeProposalStatus = 
  | 'pending'         // 待管理員審核
  | 'approved'        // 審核通過，公開展示
  | 'needs_revision'  // 通知修改 (如相似提案需調整)
  | 'rejected';       // 退回 / 下架

export interface ChallengeProposalAttachment {
  id: string;
  name: string;
  type: string;
  size?: string;
  url?: string;
}

export interface ChallengeExpertReview {
  id: string;
  expertId: string;
  expertName: string;
  expertAvatar: string;
  expertTitle: string;
  expertDomain: string;
  rating: number; // 1 ~ 5
  advice: string; // 專家評估、建議與破局指導
  createdAt: string;
}

export interface ChallengeInvestment {
  id: string;
  proposalId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: 'user' | 'creator' | 'expert';
  amount: number; // 虛擬募資幣 Idea Point (1 IP = 1 元)
  message?: string;
  createdAt: string;
}

export interface ChallengeComment {
  id: string;
  proposalId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isExpert: boolean;
  content: string;
  createdAt: string;
}

export interface ChallengeProposal {
  id: string;
  title: string;                 // 提案名稱
  category: ChallengeCategory;   // 產業領域
  authorId: string;              // 提案帳號 ID
  authorName: string;            // 提案帳號名稱
  authorAvatar?: string;
  
  // 報名基本資料 (完賽會自動錄入舊網站新建帳號)
  teamName: string;              // 姓名／團隊名稱
  email: string;                 // Email
  phone: string;                 // 聯絡電話 / 通訊方式
  schoolOrOccupation: string;    // 學校／職業
  referralCode?: string;         // 宣傳大使推薦碼 (選填)

  // 提案核心資料
  painPoint: string;             // 痛點描述：「你想解決什麼問題？」
  solution: string;              // 解決方案：「你的創新方法」
  targetAudience: string;        // 目標族群
  businessModel: string;         // 商業模式
  expectedImpact: string;        // 預期影響
  coverImage?: string;           // 提案主視覺或封面圖
  attachments: ChallengeProposalAttachment[]; // 圖片／文件附件

  // 收款資料 (競賽獎金使用，未來轉為平台帳號資料)
  bankName: string;              // 銀行代碼與名稱
  bankAccount: string;           // 銀行帳戶與戶名
  payoutNotes?: string;          // 匯款備註

  // 競賽動態與數據
  status: ChallengeProposalStatus;
  reviewNotes?: string;          // 審核意見或相似提案說明
  submittedAt: string;
  approvedAt?: string;
  fundingRaised: number;         // 累計虛擬募資金額 ($)
  fundingSupportersCount: number;// 支持人數 (投資人次)
  views: number;                 // 瀏覽數 (點進去才計算)
  likes: number;                 // 支持/按心收藏數
  likedUserIds: string[];        // 點心收藏的用戶清單
  isCertified: boolean;          // 是否獲得「IdeaX 創新挑戰認證」標章
  isDemo?: boolean;              // 是否為展示範例資料
  isTop10Winner?: boolean;       // 是否為賽後結算前十名獲獎提案
  top10Rank?: number;            // 結算名次 1 ~ 10
  starOfCreationAwarded?: boolean;// 是否已獲頒「創之星」徽章

  // 互動紀錄
  expertReviews: ChallengeExpertReview[];
  investments: ChallengeInvestment[];
  comments: ChallengeComment[];
}

export interface ChallengeFinalAwardRecord {
  rank: number;
  proposalId: string;
  proposalTitle: string;
  authorId: string;
  authorName: string;
  teamName: string;
  category: ChallengeCategory;
  fundingRaised: number;
  likes: number;
  badgeName: '創之星';
  finalizedAt: string;
}

export interface ChallengeContestStatus {
  isFinalized: boolean; // 是否已由管理員確認公布前十名
  finalizedAt?: string;
  finalizedByAdminId?: string;
  top10Winners: ChallengeFinalAwardRecord[];
}


export interface ChallengeExpert {
  id: string;
  name: string;
  title: string;
  domain: string;
  avatar: string;
  experience: string; // 經歷與背景
  rating: number;     // 評價評分 (例如 4.9)
  reviewsCount: number;
  totalFundPool: number; // 專家帳號初始 3,000,000 虛擬幣
  remainingFundPool: number;
  isDemo?: boolean;   // 是否為展示範例資料
}

export interface ChallengeAmbassador {
  id: string;
  userId: string;
  name: string;
  email: string;
  schoolOrOrg: string;
  referralCode: string;          // 專屬推薦碼
  approvedReferralsCount: number;// 推薦且已「過審」的提案數量
  pendingReferralsCount: number; // 推薦但尚在審核中的提案數量
  earnedBonus: number;           // 累計宣傳獎勵 (過審數量 × $400)
  referredProposalIds: string[]; // 推薦的提案 ID 清單
  createdAt: string;
  isDemo?: boolean;              // 是否為展示範例資料
}

export interface ChallengeUserPointWallet {
  userId: string;
  role: 'user' | 'creator' | 'expert';
  totalPoints: number;           // 一般/提案帳號 100,000 點，專家 3,000,000 點
  availablePoints: number;
  spentPoints: number;
  investedRecords: {
    proposalId: string;
    amount: number;
    investedAt: string;
  }[];
  // 分享獎勵：推薦碼每人 100 點 (避免重複領取)
  claimedShareBonusCodes?: string[];
  totalShareBonusPoints?: number;
}

export type ChallengeTab = 
  | 'home'          // 競賽首頁 Landing
  | 'proposals'     // 競賽提案專區 (探索與募資)
  | 'submit'        // 我要投稿
  | 'my_submissions'// 我的參賽作品
  | 'leaderboard'   // 競賽排行榜 (募資榜/人氣榜)
  | 'experts'       // 評審專家團
  | 'ambassador'    // 校園宣傳大使專區
  | 'admin';        // 競賽管理審核後台

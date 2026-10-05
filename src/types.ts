export type ProblemLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export type Category = 
  | '創新創業'
  | '行銷成長'
  | '產品設計'
  | '資訊科技'
  | '營運管理'
  | '法規稅務'
  | '專業問題'
  | '其他領域';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  title?: string;
  bio?: string;
  domain?: Category;
  domains?: Category[];
  skills?: string[];
  balance: number; // 儲值點數錢包
  frozenBalance?: number;
  rating?: number;
  reviewCount?: number;
  acceptanceRate?: number;
  acceptedSolutionsCount?: number;
  isVerifiedSolver?: boolean;
  verifiedExpert?: boolean;
  verifiedBadge?: string;
  realNameAuthStatus?: 'none' | 'pending' | 'verified';
  realName?: string;
  nationalId?: string;
  bankCode?: string;
  bankAccount?: string;
  bankAccountName?: string;
  isCustomAnonymous?: boolean;
  showTitlePublicly?: boolean;
  showBioPublicly?: boolean;
  memberTier?: 'free' | 'starter' | 'pro' | 'enterprise';
  memberExpireAt?: string;
  autoRenewSubscription?: boolean;
  role?: 'user' | 'solver' | 'admin';
  createdAt?: string;
}

export interface Attachment {
  name: string;
  size: string;
  url: string;
  type?: string;
}

export interface Solution {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorTitle?: string;
  summary: string;
  fullContent?: string;
  priceType: 'free' | 'bounty' | 'custom_price';
  price?: number;
  deliverables?: {
    hasText: boolean;
    hasFiles: boolean;
    hasMeeting: boolean;
    files?: Attachment[];
    meetingDurationMinutes?: number;
  };
  isAccepted: boolean;
  acceptedAt?: string;
  createdAt: string;
  views?: number;
  upvotes?: number;
}

export interface Question {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorTitle?: string;
  isAnonymous?: boolean;
  title: string;
  description: string;
  category: Category;
  subcategory?: string;
  tags: string[];
  level: ProblemLevel;
  bounty: number;
  deadline?: string;
  status: 'open' | 'solved' | 'closed';
  acceptedSolutionId?: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  answersCount: number;
  attachments?: Attachment[];
  aiAnalysis?: {
    painPointSummary: string;
    feasibilityScore: number;
    recommendedSkills: string[];
    suggestedPriceRange: string;
  };
}

export interface Solver {
  id: string;
  userId?: string;
  name: string;
  avatar: string;
  title: string;
  domain: Category;
  domains: Category[];
  skills: string[];
  bio: string;
  rating: number;
  reviewCount: number;
  answerCount: number;
  acceptedRate: number;
  acceptedSolutionsCount?: number;
  tier: '一般解答者' | '專業解答者' | '認證專家' | '特邀顧問';
  hourlyRate?: number;
  pricePerSession?: number;
  completedProjects?: number;
  earnings: number;
  verifiedBadge: boolean;
  badge?: string;
  verified?: boolean;
  verifiedExpert?: boolean;
  featuredCase?: {
    title: string;
    description?: string;
    outcome: string;
    files?: Array<{ name: string; size?: string; url?: string }>;
    images?: Array<{ url: string; caption?: string }>;
  };
  levelAnswerCounts?: Record<ProblemLevel, number>;
  honorTitle?: string;
}

export interface AiCrmLead {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  clientRole?: string;
  category?: Category;
  subcategory?: string;
  questionId?: string;
  questionTitle?: string;
  lastActiveTime?: string;
  lastInteraction?: string;
  statusType?: 'proposal_viewed_no_reply' | 'profile_favorited' | 'board_follower' | 'high_intent_inquiry';
  statusDescription?: string;
  clientPainPoint?: string;
  hesitationReason?: string;
  recommendedPitchAngle?: string;
  aiCustomMessage?: string;
  bestContactTime?: string;
  createdAt?: string;
  urgency: 'high' | 'medium' | 'low';
  clientIntentScore?: number;
  aiInsight?: string;
  aiRecommendedAction: string;
  suggestedMessage?: string;
  hasSent: boolean;
  sentAt?: string;
  isScheduled?: boolean;
  scheduledTaskId?: string;
  scheduledTime?: string;
  clientStatus?: string;
  clientNeedsAnalysis?: {
    corePainPoints: string[];
    budgetIntent: string;
    decisionFactors: string[];
    interactionSignals: string[];
  };
  strategyBlueprint?: {
    strategyName: string;
    conversionProbability: number;
    recommendedAngles: string[];
    bestContactTime: string;
    suggestedPitchPrice: string;
    riskMitigationTips: string[];
  };
}

export interface AssistantScheduledTask {
  id: string;
  leadId?: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  questionId?: string;
  questionTitle?: string;
  strategySource?: string;
  suggestedAction?: string;
  messageTemplate?: string;
  customMessage?: string;
  scheduledTime: string;
  scheduledTimestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'cancelled';
  executedAt?: string;
  executionResult?: string;
  autoExecute: boolean;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
}

export interface DirectConversation {
  id: string;
  participantUser: {
    id: string;
    name: string;
    avatar: string;
    title?: string;
  };
  question?: Question;
  messages: DirectMessage[];
  lastMessageAt: string;
  unreadCount: number;
}

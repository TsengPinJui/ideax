import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Question,
  ProposalUpdateLog,
  Solver,
  Answer,
  Transaction,
  User,
  NotificationItem,
  ChatConversation,
  ChatMessage,
  ChatCustomOffer,
  AnswerType,
  SubscriptionTier,
  SubscriptionPlan,
  SUBSCRIPTION_PLANS,
  Category,
  RECHARGE_PACKAGES,
  DeliveryPhase,
  AboutSection,
  PublicMetricsConfig,
  AiCrmSystemConfig,
  ChatUserCard,
  SearchMode,
  DeviceAccount,
  Assistant24hrConfig,
  DEFAULT_ASSISTANT_24HR_CONFIG,
  AIPreliminaryReport,
  AdminSite,
} from '../types';
import {
  isInitialAdmin,
  isSiteAAdmin,
  isSiteBAdmin,
  getAdminSiteLabel,
} from '../utils/adminPermissions';
import { restoreCanonicalUserIdentity, USER_ALIAS_MAP, deduplicateUsersList, isGuestUser } from '../utils/userDisplay';
import {
  MOCK_QUESTIONS,
  MOCK_SOLVERS,
  MOCK_ANSWERS,
  MOCK_TRANSACTIONS,
  MOCK_USERS,
  MOCK_CONVERSATIONS,
  CLEAN_CORE_USERS,
  DEMO_CORE_TEST_USERS,
  GUEST_USER,
  CLEAN_CORE_QUESTIONS,
  CLEAN_CORE_ANSWERS,
  CLEAN_CORE_SOLVERS,
  CORE_TEST_ACCOUNTS,
  CORE_PRESERVED_USER_IDS,
  isTestAccountUserId,
  isRealRegisteredUser,
  isMockQuestionId,
  isMockAnswerId,
  isMockSolverId,
  isMockTransactionId,
  isMockConversationId,
} from '../data/mockData';
import {
  ALL_VIRTUAL_PROPOSALS_SEED,
  ALL_VIRTUAL_ANSWERS_SEED,
  VIRTUAL_PERSONA_USERS,
  SIMULATED_BATCH_ID,
  enrichQuestionWithSimulatedData,
  isSimulatedUser,
  isSimulatedQuestion,
  isSimulatedAnswer,
} from '../data/virtualProposalsSeed';
import { CURRENT_TERMS_VERSION } from '../data/termsData';
import { parseScheduleTimestamp } from '../utils/scheduleUtils';
import { analyzeQuestionWithAI, AIAnalysisResult, generate24hrAssistantReply } from '../services/aiService';
import { logoutFromFirebase } from '../services/firebaseAuth';
import { getFormattedPlatformId, generatePlatformUserId } from '../services/userIdService';
import {
  testFirestoreConnection,
  syncUserToFirestore,
  migrateUserInFirestore,
  syncUsersToFirestore,
  syncQuestionToFirestore,
  syncQuestionsToFirestore,
  deleteQuestionFromFirestore,
  deleteQuestionsFromFirestore,
  deleteQuestionAndRelatedDataFromFirestore,
  deleteUserAndAllRelatedDataFromFirestore,
  deleteUsersFromFirestore,
  subscribeToQuestions,
  subscribeToUsers,
  syncAnswerToFirestore,
  syncAnswersToFirestore,
  deleteAnswerFromFirestore,
  deleteAnswersFromFirestore,
  syncTransactionToFirestore,
  syncTransactionsToFirestore,
  syncConversationToFirestore,
  syncNotificationsToFirestore,
  syncBookmarksToFirestore,
  syncUserInteractionsToFirestore,
  loadUserInteractionsFromFirestore,
  syncSolversToFirestore,
  syncTermsAgreementsToFirestore,
  syncPlatformSettingsToFirestore,
  subscribePlatformSettingsFromFirestore,
  syncAuditLogsToFirestore,
  pushAllDataToFirestore,
  loadAllDataFromFirestore,
  loadPersonalDataFromFirestore,
  getUserFromFirestore,
  syncAiCrmConfigToFirestore,
  subscribePersonalData,
  setFirestoreDataScope,
  incrementQuestionViewInFirestore,
  subscribeToTickets,
  recordSiteVisitInFirestore,
  subscribeSiteVisitsFromFirestore,
  sendPresenceHeartbeat,
  subscribePresenceFromFirestore,
  CategorizedSyncResult,
} from '../services/firestoreSync';
import { getStoredTickets } from '../services/customerSupportService';
import { CenterToastData } from '../components/CenterToast';
import { getCachedRealTrafficStats } from '../components/AdminSiteTrafficChart';
import { PwaNotificationService } from '../services/pwaNotificationService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth as firebaseAuthInstance } from '../services/firebase';
import { setMyAppUserId, updateAuthUidDirectory } from '../services/authIdentity';
import { pointsOp, PointsOpPayload } from '../services/pointsApi';
import {
  conversationSignature,
  deliverNotificationToCloud,
  deleteNotificationsInCloud,
  markNotificationReadInCloud,
  mergeIncomingConversation,
  pushConversationToCloud,
} from '../services/cloudMessaging';

/**
 * 把雲端載入的「自己的」資料合併進本機資料（以 id 為準，雲端版本優先）。
 * 私訊與通知目前有部分只存在本機，合併而非取代，避免本機紀錄被清掉。
 */
function mergeServerIntoLocal<T extends { id: string }>(local: T[], server: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local || []) if (item && item.id) map.set(item.id, item);
  for (const item of server || []) if (item && item.id) map.set(item.id, item);
  return Array.from(map.values());
}

/** 停權是否仍在有效期間（blockedUntil 為 'permanent' 或未來時間） */
function isBlockActive(u?: Partial<User> | null): boolean {
  if (!u || !u.isBlocked) return false;
  const until = u.blockedUntil;
  if (!until || until === 'permanent') return true;
  const t = Date.parse(until);
  return Number.isNaN(t) ? true : t > Date.now();
}

function describeBlockUntil(until?: string): string {
  if (!until || until === 'permanent') return '永久停權';
  const t = Date.parse(until);
  return Number.isNaN(t) ? until : `至 ${new Date(t).toLocaleDateString('zh-TW')}`;
}

/** 寄送帳號停權／解除停權通知信（管理員限定，背景執行） */
async function sendAccountNoticeEmail(payload: { email?: string; name?: string; kind: 'blocked' | 'unblocked'; reason?: string; untilText?: string }) {
  if (!payload.email) return;
  try {
    const { getAuthHeaders } = await import('../services/authHeader');
    await fetch('/api/admin/account-notice', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(payload) });
  } catch {}
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User | ((prev: User) => User)) => void;
  availableUsers: User[];
  setAvailableUsers: React.Dispatch<React.SetStateAction<User[]>>;
  siteVisitsCount: number;
  uniqueVisitorsCount: number;
  onlineUsersCount: number;
  realRegisteredUsers: User[];
  realRegisteredUsersCount: number;
  commissionRate: number; // 預設 0.25 (25%)
  setCommissionRate: (rate: number) => void;
  subscriptionPlans: Record<SubscriptionTier, SubscriptionPlan>;
  updateSubscriptionPlan: (tier: SubscriptionTier, monthlyPrice: number, rebatePercent: number, customBaseRate?: number) => void;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  solvers: Solver[];
  setSolvers: React.Dispatch<React.SetStateAction<Solver[]>>;
  answers: Answer[];
  setAnswers: React.Dispatch<React.SetStateAction<Answer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  notifications: NotificationItem[];
  allNotifications: NotificationItem[];
  personalNotifications: NotificationItem[];
  systemNotifications: NotificationItem[];
  unreadPersonalCount: number;
  unreadSystemCount: number;
  hasUnreadSystemNotifs: boolean;
  addNotification: (notifOrTitle: Partial<NotificationItem> | string, message?: string, type?: any, targetUserId?: string, category?: 'personal' | 'system') => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updateNotification: (id: string, updates: Partial<NotificationItem>) => void;
  conversations: ChatConversation[];
  setConversations: React.Dispatch<React.SetStateAction<ChatConversation[]>>;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  selectedQuestion: Question | null;
  setSelectedQuestion: (q: Question | null) => void;
  selectedSolver: Solver | null;
  setSelectedSolver: (s: Solver | null) => void;
  isNotificationsSidebarOpen: boolean;
  setIsNotificationsSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  
  // Modals
  isCreateQuestionOpen: boolean;
  setIsCreateQuestionOpen: (open: boolean) => void;
  isSubmitAnswerOpen: boolean;
  setIsSubmitAnswerOpen: (open: boolean) => void;
  isUserDashboardOpen: boolean;
  setIsUserDashboardOpen: (open: boolean) => void;
  isAdminDashboardOpen: boolean;
  setIsAdminDashboardOpen: (open: boolean) => void;
  targetAnswerToUnlock: Answer | null;
  setTargetAnswerToUnlock: (ans: Answer | null) => void;
  isCustomerServiceOpen: boolean;
  customerServiceContext: any;
  closeCustomerService: () => void;
  openCustomerService: (ctx?: any) => void;
  isRatingModalOpen: boolean;
  ratingTarget: any;
  closeRatingModal: () => void;
  openRatingModal: (target: any) => void;

  // Terms & About Us Modal & Agreement
  isAboutModalOpen: boolean;
  aboutModalInitialSection: AboutSection;
  openAboutModal: (section?: AboutSection) => void;
  closeAboutModal: () => void;
  hasAgreedTerms: (type: 'general' | 'questioner' | 'solver') => boolean;
  recordTermsAgreement: (type: 'general' | 'questioner' | 'solver', version?: string) => void;

  // Auth Modal Global Control
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  authModalMethod: 'email' | 'phone' | 'switch';
  authModalInterceptReason?: string;
  openAuthModal: (mode?: 'login' | 'register', method?: 'email' | 'phone' | 'switch', interceptReason?: string) => void;
  closeAuthModal: () => void;

  // Identity Switcher & Solver Profile Preferences
  switchRole: (role: 'questioner' | 'solver' | 'admin') => void;
  updateSolverPreferences: (prefs: {
    domain?: Category;
    skills?: string[];
    showSubmittedCount?: boolean;
    showAcceptanceRate?: boolean;
    showAvgSolutionBounty?: boolean;
  }) => void;

  createQuestion: (q: Partial<Question>) => Question;
  updateProposalContent: (
    questionId: string,
    params: {
      appName?: string;
      title?: string;
      description?: string;
      subcategory?: string;
      subcategories?: string[];
      targetGoal?: string;
      referencedPainPoint?: string;
      tags?: string[];
      demoUrl?: string;
      fileLink?: string;
      techArchitecture?: string;
      coverImage?: string;
      galleryImages?: string[];
      youtubeUrl?: string;
      coverMode?: 'custom_image' | 'youtube_video';
      cardHoverMode?: 'video_autoplay' | 'image_carousel';
      showCardImage?: boolean;
      cardDisplayImage?: string;
      proposalProgressStage?: string;
      version?: string;
      updateContent?: string;
      updateNote?: string;
      changelogContent?: string;
      changelogNote?: string;
    }
  ) => { success: boolean; ok?: boolean; message: string; reason?: string; updatedQuestion?: Question };
  submitAnswer: (ans: Partial<Answer>) => Answer;
  unlockAnswer: (answerId: string, useWithheldOffset?: boolean, paymentMethod?: string) => boolean;
  acceptAnswer: (answerId: string, rating?: number, review?: string) => void;
  rateSolver: (solverId: string, rating: number, reviewComment?: string, transactionId?: string) => void;
  inviteSolver: (questionId: string, solverId: string) => void;
  depositBalance: (amount: number) => void;
  depositPackage: (packageId: string) => void;
  withdrawBalance: (amount: number) => boolean;
  spendPoints: (amount: number, note?: string) => boolean;
  reportQuestionDispute: (questionId: string, reason: string) => void;
  resolveDisputeRefund: (questionId: string) => void;
  acceptPhaseDelivery: (questionId: string, answerId: string, phaseIndex: number) => void;
  releasePhasePayout: (questionId: string, answerId: string, phaseIndex: number) => void;
  refundPhasePayout: (questionId: string, answerId: string, phaseIndex: number) => void;
  togglePrivacySettings: (hideStats: boolean) => void;
  subscribePlan: (
    tier: SubscriptionTier,
    cycle?: 'monthly' | 'semi_annual' | 'annual',
    paymentMethod?: string
  ) => { success: boolean; message: string };
  cancelPendingPlanChange: () => { success: boolean; message: string };
  updateBankAccount: (bankInfo: import('../types').BankAccountInfo) => void;
  updateTransactionNote: (transactionId: string, note: string) => void;
  calculateSplitPayout: (amount: number, solverId?: string) => {
    tier: SubscriptionTier;
    planName: string;
    feeDiscountText: string;
    feeRate: number;
    platformFee: number;
    bonusAmount: number;
    netPayout: number;
    sellerPayoutRate: number;
    sellerPayoutText: string;
    bankAccountSnapshot: string;
  };
  
  // Bookmark & Promotion actions
  bookmarkedQuestionIds: string[];
  toggleBookmarkQuestion: (questionId: string) => boolean;
  isQuestionBookmarked: (questionId: string) => boolean;
  promoteQuestion: (questionId: string) => boolean;
  incrementQuestionViews: (questionId: string, amount?: number) => void;

  // 痛點附議 (+1) 與 提問同問 (舉手) 與 討論按讚 (大拇指)
  secondedQuestionIds: string[];
  toggleSecondQuestion: (questionId: string) => { isSeconded: boolean; count: number };
  setQuestionLikeState: (questionId: string, liked: boolean, likeCount: number) => void;
  isQuestionSeconded: (questionId: string) => boolean;
  getQuestionSecondCount: (questionId: string) => number;
  sameQuestionIds: string[];
  toggleSameQuestion: (questionId: string) => { isSameQuestion: boolean; count: number };
  isSameQuestionActive: (questionId: string) => boolean;
  getQuestionSameCount: (questionId: string) => number;
  likedDiscussionAnswerIds: string[];
  toggleLikeDiscussionAnswer: (answerId: string) => { isLiked: boolean; count: number };
  isDiscussionAnswerLiked: (answerId: string) => boolean;
  getDiscussionAnswerLikesCount: (answerId: string) => number;
  likedQuestionIds: string[];
  toggleLikeQuestion: (questionId: string) => { isLiked: boolean; count: number };
  isQuestionLiked: (questionId: string) => boolean;
  getQuestionLikesCount: (questionId: string) => number;
  resolvedDisputeIds: string[];
  markDisputeResolved: (disputeId: string, questionId?: string) => void;
  pendingDisputesCount: number;
  pendingTicketsCount: number;
  pendingReportsCount: number;
  adminMailBadgeCount: number;
  delistQuestion: (questionId: string, reason: string, feedback?: string) => void;
  relistQuestion: (questionId: string) => void;
  deleteQuestionPermanently: (questionId: string) => Promise<void>;
  deleteQuestionsBatchPermanently: (questionIds: string[]) => Promise<number>;
  deleteAnswerPermanently: (answerId: string) => Promise<void>;
  purgeExpiredDelistedQuestions: () => Promise<number>;
  requestAccountDeactivation: (reason?: string, targetUserId?: string) => Promise<void>;
  cancelAccountDeactivation: (targetUser?: User | string) => Promise<User | null>;
  checkUserDeactivationStatus: (target: User) => {
    canLogin: boolean;
    restoredUser?: User;
    wasInGracePeriod: boolean;
    errorReason?: string;
  };
  purgeAccountPermanently: (userId: string) => Promise<void>;
  purgeExpiredDeactivatedAccounts: () => Promise<number>;
  removeDuplicateAccounts: () => Promise<{ removedCount: number; removedNames: string[]; remainingCount: number }>;
  deleteUserAccountPermanently: (userId: string) => Promise<{ success: boolean; message: string }>;
  addTestAccount: (options?: {
    name?: string;
    role?: 'questioner' | 'solver' | 'admin';
    title?: string;
    balance?: number;
    verifiedExpert?: boolean;
    autoSwitch?: boolean;
  }) => User;
  pullAllDataFromFirestore: () => Promise<boolean>;

  // AI Auto-Tagging & Categorization
  autoTagQuestionWithAI: (questionId: string) => Promise<{ success: boolean; data?: AIAnalysisResult }>;
  autoTagAllMyQuestionsWithAI: () => Promise<number>;
  saveQuestionPreliminaryReport: (
    questionId: string,
    report: AIPreliminaryReport,
    unlockUserId?: string
  ) => Promise<Question | null>;
  unlockQuestionPreliminaryReport: (
    questionId: string,
    userId: string
  ) => Promise<boolean>;

  // Chat actions
  startDirectChat: (targetUser: { id: string; name: string; avatar: string; title: string }, question?: Question) => string;
  createGroupConversation: (groupName: string, participantIds: string[]) => string;
  sendMessage: (
    conversationId: string,
    text: string,
    offer?: Omit<ChatCustomOffer, 'id' | 'status' | 'creatorId' | 'creatorName'>,
    attachment?: { type: 'image' | 'file'; url?: string; name: string; size?: string },
    userCard?: ChatUserCard
  ) => void;
  acceptChatOffer: (conversationId: string, messageId: string) => boolean;
  confirmCustomOfferDelivery: (conversationId: string, messageId: string) => boolean;
  toggleMediationAgreement: (conversationId: string, messageId: string, role: 'buyer' | 'seller') => void;
  submitPhaseDeliverable: (
    questionId: string,
    answerId: string,
    phaseIndex: number,
    content: string,
    attachments?: import('../types').SolutionAttachment[]
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  markAllPersonalNotificationsRead: () => void;
  markAllSystemNotificationsRead: () => void;

  // Public Metrics Controls (Admin)
  publicMetricsConfig: PublicMetricsConfig;
  updatePublicMetricsConfig: (config: Partial<PublicMetricsConfig>) => void;

  // AI-CRM System Config (Admin)
  aiCrmConfig: AiCrmSystemConfig;
  updateAiCrmConfig: (config: Partial<AiCrmSystemConfig>) => void;

  // 24hr AI特助代客服務 (權威方案以上)
  updateAssistant24hrConfig: (config: Assistant24hrConfig) => void;

  // Admin Account & User Management
  blockUser: (userId: string, duration: number | 'permanent', reason: string) => { success: boolean; message: string };
  unblockUser: (userId: string) => { success: boolean; message: string };
  adminUpdateUserVerification: (
    userId: string,
    type: 'real_name' | 'expert',
    action: 'approve' | 'revoke',
    notes?: string,
    approvedDomains?: string[]
  ) => { success: boolean; message: string };
  grantUserAdminRole: (
    targetUserId: string,
    sites: AdminSite[]
  ) => { success: boolean; message: string };
  updateSubscriptionPlanFull: (tier: SubscriptionTier, updatedData: Partial<SubscriptionPlan>) => void;
  addSubscriptionPlan: (newPlan: SubscriptionPlan) => { success: boolean; message: string };
  deleteSubscriptionPlan: (tierId: string) => { success: boolean; message: string };
  adjustUserBalance: (userId: string, deltaPoints: number, reason: string) => boolean;

  // Admin Transfer Points & Daily Quota (每日配額 50,000 點)
  adminDailyQuota: number;
  getAdminRemainingDailyQuota: (adminId?: string) => number;
  adminTransferPoints: (targetUserId: string, points: number, reason: string) => { success: boolean; message: string; remainingQuota?: number };
  adminResetDailyPoints: () => { success: boolean; message: string };

  // Pain Point Tipping & Weekly Payout (痛點打賞支持點數與週結撥款)
  tipPainPoint: (questionId: string, amount: number, message?: string, paymentSource?: 'wallet' | 'direct') => { success: boolean; message: string };
  requestTipPayout: (amountPoints: number) => { success: boolean; message: string; netCash?: number };

  // Cloud Firestore Persistence & Sync
  isFirestoreConnected: boolean;
  lastSyncTime: string | null;
  syncAllToCloud: () => Promise<CategorizedSyncResult>;
  initialBootProgress: number;
  initialBootStatusText: string;
  isInitialBootComplete: boolean;

  // Demo Mode & Mock Data Management (管理員示範資料與測試模式開關)
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
  clearMockData: () => void;
  resetDemoData: () => void;
  isSimulatedDataPurged: boolean;
  simulatedStats: {
    simulatedQuestionsCount: number;
    simulatedUsersCount: number;
    simulatedAnswersCount: number;
    simulatedTransactionsCount: number;
  };
  purgeAllSimulatedData: () => Promise<{
    deletedQuestions: number;
    deletedAnswers: number;
    deletedUsers: number;
    purgedQuestions: number;
    purgedAnswers: number;
    purgedUsers: number;
  }>;
  restoreAllSimulatedData: () => Promise<void>;

  // No Payment Mode (無金流環境開關：全站免付費，僅開放免費提問、無償解答與諮詢提案)
  isNoPaymentMode: boolean;
  setNoPaymentMode: (enabled: boolean) => void;
  toggleNoPaymentMode: () => void;

  // Hide Test Accounts (隱藏測試帳號開關：僅保留管理員與真實用戶)
  isHideTestAccounts: boolean;
  setHideTestAccounts: (enabled: boolean) => void;
  toggleHideTestAccounts: () => void;

  // Race Mode (競賽模式開關：痛點限定 L0 並附綠色「創星季」標籤與獨立網址，方案以競賽圖文卡片展示並含獨立網址，痛點按提案數/讚數/觀看數/討論數排序)
  isRaceMode: boolean;
  setRaceMode: (enabled: boolean) => void;
  toggleRaceMode: () => void;

  // Device Logged-In Accounts Management (本裝置曾經登錄的帳號)
  deviceAccounts: DeviceAccount[];
  switchAccount: (userId: string) => boolean;
  logoutAccount: (userId?: string) => void;
  removeDeviceAccount: (userId: string) => boolean;
  addDeviceAccount: (userId: string) => boolean;

  // PWA Install Modal Global State
  isPwaInstallModalOpen: boolean;
  openPwaInstallModal: () => void;
  closePwaInstallModal: () => void;

  // Center Toast Notification State & Triggers (中央彈出式提示再消失)
  centerToast: CenterToastData | null;
  showCenterToast: (
    title: string,
    subtitle?: string,
    options?: {
      actionLabel?: string;
      onAction?: () => void;
      type?: 'lock' | 'info' | 'warning' | 'success';
      duration?: number;
    }
  ) => void;
  hideCenterToast: () => void;
  promptLogin: (customSubtitle?: string) => void;
  openRechargePage: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'ideax_mvp_v3_';

// 判斷是否為環境設定或模式變更相關之通知，此類通知全面刪除不再儲存或展示
const isModeOrEnvNotification = (title?: string, message?: string) => {
  const text = `${title || ''} ${message || ''}`;
  if (!text.trim()) return false;

  return (
    text.includes('捷徑描述檔') ||
    text.includes('已為您下載 IdeaX App') ||
    text.includes('無金流模式') ||
    text.includes('正式營運模式') ||
    text.includes('示範測試模式') ||
    text.includes('純淨營運模式') ||
    text.includes('示範測試') ||
    text.includes('純淨營運') ||
    text.includes('測試環境') ||
    text.includes('隱藏測試帳號') ||
    text.includes('顯示測試帳號') ||
    text.includes('環境設定') ||
    text.includes('模式設定') ||
    text.includes('假資料已清除') ||
    text.includes('模擬假資料') ||
    text.includes('展示問題') ||
    text.includes('模擬專家') ||
    text.includes('測試交易數據') ||
    text.includes('已切換至') ||
    text.includes('已啟用示範') ||
    text.includes('測試環境 (TEST)') ||
    text.includes('無金流模式 (FREE)') ||
    text.includes('正式營運模式 (NORM)') ||
    text.includes('競賽模式 (RACE)') ||
    (text.includes('模式') && (text.includes('啟用') || text.includes('切換') || text.includes('開啟') || text.includes('關閉') || text.includes('恢復') || text.includes('隱藏') || text.includes('純淨') || text.includes('示範') || text.includes('營運') || text.includes('測試'))) ||
    (text.includes('環境') && (text.includes('啟用') || text.includes('切換') || text.includes('開啟') || text.includes('關閉') || text.includes('恢復') || text.includes('測試')))
  );
};

// 檢測當前運營模式 (FREE: 無金流模式, NORM: 正式營運模式, TEST: 測試環境, RACE: 競賽模式)
export type PlatformMode = 'TEST' | 'NORM' | 'FREE' | 'RACE';

const getInitialPlatformMode = (): PlatformMode => {
  try {
    const savedMode = localStorage.getItem(`${STORAGE_KEY_PREFIX}platform_mode`);
    if (savedMode === 'RACE' || savedMode === 'TEST' || savedMode === 'FREE' || savedMode === 'NORM') {
      return savedMode as PlatformMode;
    }
    const isRace = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_race_mode`);
    if (isRace !== null) {
      if (isRace === 'true') return 'RACE';
      if (isRace === 'false') {
        const isFree = localStorage.getItem(`${STORAGE_KEY_PREFIX}no_payment_mode`) === 'true';
        if (isFree) return 'FREE';
        const isNorm = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_norm_mode`) === 'true';
        if (isNorm) return 'NORM';
        const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
        if (isDemo) return 'TEST';
      }
    }
    const isFree = localStorage.getItem(`${STORAGE_KEY_PREFIX}no_payment_mode`) === 'true';
    if (isFree) return 'FREE';

    const isNorm = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_norm_mode`) === 'true';
    if (isNorm) return 'NORM';

    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
    if (isDemo) return 'TEST';
  } catch {
    // ignore
  }
  // 默認規則：預設開啟競賽模式 (RACE)
  return 'RACE';
};

const getInitialIsDemoMode = (): boolean => {
  return getInitialPlatformMode() === 'TEST';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Demo Mode State (管理員示範資料與測試模式開關：默認開啟測試環境，除非開啟正式營運模式或無金流模式)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => getInitialPlatformMode() === 'TEST');

  // Auth Modal Global Control State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalMethod, setAuthModalMethod] = useState<'email' | 'phone' | 'switch'>('email');
  const [authModalInterceptReason, setAuthModalInterceptReason] = useState<string | undefined>(undefined);

  const openAuthModal = (
    mode: 'login' | 'register' = 'login',
    method: 'email' | 'phone' | 'switch' = 'email',
    interceptReason?: string
  ) => {
    setAuthModalMode(mode);
    setAuthModalMethod(method);
    setAuthModalInterceptReason(interceptReason);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalInterceptReason(undefined);
  };

  // Center Toast State (中央浮動彈出提示)
  const [centerToast, setCenterToast] = useState<CenterToastData | null>(null);

  const hideCenterToast = useCallback(() => {
    setCenterToast(null);
  }, []);

  const showCenterToast = useCallback(
    (
      title: string,
      subtitle?: string,
      options?: {
        actionLabel?: string;
        onAction?: () => void;
        type?: 'lock' | 'info' | 'warning' | 'success';
        duration?: number;
      }
    ) => {
      setCenterToast({
        id: Date.now(),
        title,
        subtitle,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
        type: options?.type || 'lock',
        duration: options?.duration || 2000,
      });
    },
    []
  );

  const promptLogin = useCallback(
    (_customSubtitle?: string) => {
      // 訪客點擊需登入的功能時，直接開啟登入視窗（原本只跳 2 秒提示，需再點一次才會登入，容易被當成按鈕失效）
      openAuthModal('login', 'email');
    },
    [showCenterToast, openAuthModal]
  );

  // PWA Install Modal State
  const [isPwaInstallModalOpen, setIsPwaInstallModalOpen] = useState(false);
  const openPwaInstallModal = () => setIsPwaInstallModalOpen(true);
  const closePwaInstallModal = () => setIsPwaInstallModalOpen(false);
  const [isNoPaymentMode, setIsNoPaymentMode] = useState<boolean>(() => getInitialPlatformMode() === 'FREE');

  const setNoPaymentMode = (enabled: boolean) => {
    setIsNoPaymentMode(enabled);
    setIsRaceMode(false);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}is_race_mode`, 'false');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}platform_mode`, enabled ? 'FREE' : 'NORM');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}no_payment_mode`, String(enabled));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}is_norm_mode`, String(!enabled));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}demo_mode`, 'false');
    } catch {
      // ignore
    }
    // 全站實時同步模式至 Firestore
    syncPlatformSettingsToFirestore({
      isNoPaymentMode: enabled,
      isRaceMode: false,
      isDemoMode: false,
      isHideTestAccounts: true,
    });
    // 開啟無金流模式或正式營運模式時，自動退出測試環境，並隱藏測試環境模擬資料與測試帳號
    setIsDemoMode(false);
    setHideTestAccounts(true);
    setQuestions((prev) => prev.filter((q) => !isMockQuestionId(q.id, q.authorId)));
    setSolvers((prev) => prev.filter((s) => !isMockSolverId(s.id) && !isTestAccountUserId(s.id)));
    setAnswers((prev) => prev.filter((a) => !isMockAnswerId(a.id)));
    setTransactions((prev) => prev.filter((t) => !isMockTransactionId(t.id)));
    setConversations((prev) => prev.filter((c) => !isMockConversationId(c.id)));
    setBookmarkedQuestionIds((prev) => prev.filter((id) => !isMockQuestionId(id)));

    // 拋棄式測試帳號清單（排除固定保留供切換之 1~3 核心測試角色）
    const disposableTestAccountIds = ['solver-3', 'solver-4', 'solver-5', 'user-author-2', 'user-author-3'];
    setAvailableUsers((prev) => {
      const cleanList = prev
        .filter((u) => !disposableTestAccountIds.includes(u.id));

      // 確保 1~3 個核心測試角色始終保留
      CORE_TEST_ACCOUNTS.forEach((cta) => {
        if (!cleanList.some((u) => u.id === cta.id)) {
          cleanList.push(cta);
        }
      });

      const adminIdx = cleanList.findIndex((u) => u.id === 'user-admin' || u.id === 'a000000001');
      if (adminIdx === -1) {
        cleanList.unshift(CLEAN_CORE_USERS[0]);
      } else if (!enabled && (!cleanList[adminIdx].balance || cleanList[adminIdx].balance === 0)) {
        // 切換回正式營運模式 (NORM) 時，恢復管理員營運點數
        cleanList[adminIdx] = { ...cleanList[adminIdx], balance: 50000 };
      }
      return deduplicateUsersList(cleanList, getDeletedUserIds()).uniqueUsers;
    });

    setCurrentUser((curr) => {
      if (curr.id === 'user-guest') return curr;
      // 保留之 1~3 核心測試身分絕不強制切至訪客，維持正常登入操作
      if (CORE_PRESERVED_USER_IDS.includes(curr.id)) {
        if (curr.id === 'user-admin' && !enabled && (!curr.balance || curr.balance === 0)) {
          return { ...curr, balance: 50000 };
        }
        return curr;
      }
      if (disposableTestAccountIds.includes(curr.id)) {
        return GUEST_USER;
      }
      return curr;
    });
  };

  const toggleNoPaymentMode = () => {
    setNoPaymentMode(!isNoPaymentMode);
  };

  // Hide Test Accounts State (隱藏測試帳號：測試環境預設 false，其他兩個模式預設 true)
  const [isHideTestAccounts, setIsHideTestAccounts] = useState<boolean>(() => {
    try {
      const isDemo = getInitialIsDemoMode();
      if (isDemo) {
        return false;
      }
      return true; // 其他兩個模式預設隱藏測試帳號
    } catch {
      // ignore
    }
    return false;
  });

  // 是否已執行「一鍵清除全部模擬數據（模擬帳號、模擬貼文、模擬留言與模擬打賞）」
  const [isSimulatedDataPurged, setIsSimulatedDataPurged] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
    } catch {
      return false;
    }
  });

  const setHideTestAccounts = (enabled: boolean) => {
    setIsHideTestAccounts(enabled);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}hide_test_accounts`, String(enabled));
    } catch {
      // ignore
    }
    syncPlatformSettingsToFirestore({ isHideTestAccounts: enabled });
    const disposableTestAccountIds = ['solver-3', 'solver-4', 'solver-5', 'user-author-2', 'user-author-3'];
    if (enabled) {
      // 1. 隱藏拋棄式模擬帳號，但永久保留 1~3 個核心測試身分
      setAvailableUsers((prev) => {
        const filtered = prev.filter((u) => !disposableTestAccountIds.includes(u.id));
        CORE_TEST_ACCOUNTS.forEach((cta) => {
          if (!filtered.some((u) => u.id === cta.id)) {
            filtered.push(cta);
          }
        });
        return deduplicateUsersList(filtered, getDeletedUserIds()).uniqueUsers;
      });

      // 2. 當前使用者若為拋棄式測試帳號才自動切換至訪客；核心測試帳號維持登入
      setCurrentUser((curr) => {
        if (curr.id === 'user-guest' || CORE_PRESERVED_USER_IDS.includes(curr.id)) return curr;
        if (disposableTestAccountIds.includes(curr.id)) {
          return GUEST_USER;
        }
        return curr;
      });

      // 3. 隱藏測試帳號所發布的問題
      setQuestions((prev) => prev.filter((q) => !isMockQuestionId(q.id, q.authorId) && !isTestAccountUserId(q.authorId)));

      // 4. 隱藏測試帳號的專家
      setSolvers((prev) => prev.filter((s) => !isMockSolverId(s.id) && !isTestAccountUserId(s.id)));

      // 5. 隱藏測試帳號提交的方案與解答
      setAnswers((prev) => prev.filter((a) => !isMockAnswerId(a.id) && !isTestAccountUserId(a.solverId)));

      // 6. 隱藏測試帳號的交易紀錄
      setTransactions((prev) => prev.filter((t) => !isMockTransactionId(t.id)));

      // 7. 隱藏測試帳號的聊天室對話
      setConversations((prev) => prev.filter((c) => !isMockConversationId(c.id) && !(c.participantIds && c.participantIds.some((pId) => isTestAccountUserId(pId)))));

      // 8. 移除測試問題書籤
      setBookmarkedQuestionIds((prev) => prev.filter((id) => !isMockQuestionId(id)));
    } else {
      // 僅在測試環境 (isDemoMode) 下允許恢復測試帳號與示範問題、專家、解答、對話與交易；其他兩個模式絕不添加
      if (isDemoMode) {
        setAvailableUsers((prev) => {
          const list = [...prev];
          DEMO_CORE_TEST_USERS.forEach((core) => {
            if (!list.some((u) => u.id === core.id)) {
              list.push(core);
            }
          });
          return deduplicateUsersList(list, getDeletedUserIds()).uniqueUsers;
        });

        const deletedQIds = getDeletedQuestionIds();
        setQuestions((prev) => {
          const merged = [...prev];
          MOCK_QUESTIONS.forEach((q) => {
            if (!deletedQIds.has(q.id) && !merged.some((m) => m.id === q.id)) merged.push(q);
          });
          return merged;
        });
        setSolvers((prev) => {
          const merged = [...prev];
          MOCK_SOLVERS.forEach((s) => {
            if (!merged.some((m) => m.id === s.id)) merged.push(s);
          });
          return merged;
        });
        setAnswers((prev) => {
          const merged = [...prev];
          MOCK_ANSWERS.forEach((a) => {
            if (!merged.some((m) => m.id === a.id)) merged.push(a);
          });
          return merged;
        });
        setTransactions((prev) => {
          const merged = [...prev];
          MOCK_TRANSACTIONS.forEach((t) => {
            if (!merged.some((m) => m.id === t.id)) merged.push(t);
          });
          return merged;
        });
        setConversations((prev) => {
          const merged = [...prev];
          MOCK_CONVERSATIONS.forEach((c) => {
            if (!merged.some((m) => m.id === c.id)) merged.push(c);
          });
          return merged;
        });
      }
    }
  };

  const toggleHideTestAccounts = () => {
    setHideTestAccounts(!isHideTestAccounts);
  };

  // Race Mode (競賽模式：痛點限定 L0 且標注綠色「創星季」標籤與獨立網址，方案圖文卡片展示並含獨立網址)
  const [isRaceMode, setIsRaceMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_race_mode`);
      if (stored !== null) return stored === 'true';
    } catch {}
    return true; // 預設開啟競賽模式
  });

  const setRaceMode = (enabled: boolean) => {
    setIsRaceMode(enabled);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}is_race_mode`, String(enabled));
    } catch {}
    syncPlatformSettingsToFirestore({
      isRaceMode: enabled,
      isDemoMode: enabled ? false : isDemoMode,
      isNoPaymentMode: enabled ? false : isNoPaymentMode,
    });
    if (enabled) {
      setIsDemoMode(false);
      setIsNoPaymentMode(false);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}platform_mode`, 'RACE');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}demo_mode`, 'false');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}no_payment_mode`, 'false');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}is_norm_mode`, 'false');
      } catch {}
    } else {
      // 關閉競賽模式時，預設自動切回正式營運模式 (NORM)
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}platform_mode`, 'NORM');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}is_norm_mode`, 'true');
      } catch {}
    }
  };

  const toggleRaceMode = () => {
    setRaceMode(!isRaceMode);
  };

  // Load initial state with localStorage support (依使用者要求：絕對不預設任何帳號登入，一律以未登入訪客開始)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const isAuthenticated = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_authenticated`) === 'true';
      const isExplicitLogin = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_explicit_login`) === 'true';

      // 依使用者指示「不要預設有任何帳號登入」：
      // 未明確點擊登入的使用者，初次載入或重整一律為訪客身分 (GUEST_USER)，清除任何舊版殘留之預設登入身分
      if (!isAuthenticated || !isExplicitLogin) {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_authenticated`);
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_explicit_login`);
        return GUEST_USER;
      }

      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}user`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name && !isGuestUser(parsed)) {
          // 若為舊版遺留之預設管理員/測試帳號且未曾明確手動登入過，一律清除並還原為訪客
          if (!isExplicitLogin && (parsed.id === 'user-admin' || isTestAccountUserId(parsed.id))) {
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_authenticated`);
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_explicit_login`);
            return GUEST_USER;
          }

          const restored = restoreCanonicalUserIdentity(parsed);
          const isAdmin = restored.id === 'user-admin' || restored.id === 'a000000001' || restored.role === 'admin';
          return {
            ...(isAdmin ? CLEAN_CORE_USERS[0] : {}),
            ...restored,
            balance: isAdmin
              ? (typeof restored.balance === 'number' && restored.balance > 0 ? restored.balance : 50000)
              : (typeof restored.balance === 'number' ? restored.balance : 0),
            withheldPoints: typeof restored.withheldPoints === 'number' ? restored.withheldPoints : 0,
            pendingEarnings: typeof restored.pendingEarnings === 'number' ? restored.pendingEarnings : 0,
            reputation: typeof restored.reputation === 'number' ? restored.reputation : 100,
            totalRevenue: typeof restored.totalRevenue === 'number' ? restored.totalRevenue : 0,
            totalPaidOut: typeof restored.totalPaidOut === 'number' ? restored.totalPaidOut : 0,
            escrowedEarnings: typeof restored.escrowedEarnings === 'number' ? restored.escrowedEarnings : 0,
            reputationPoints: typeof restored.reputationPoints === 'number' ? restored.reputationPoints : 0,
          };
        }
      }
    } catch {
      // ignore
    }
    return GUEST_USER;
  });

  const openRechargePage = useCallback(() => {
    if (currentUser.id === 'user-guest') {
      openAuthModal('login', 'email');
      return;
    }
    window.dispatchEvent(new CustomEvent('ideax_open_recharge'));
  }, [currentUser.id, openAuthModal]);

  // 永久刪除之帳號 ID 黑名單（管理員於後台刪除之重複帳號或虛擬帳號，不再自動種子生成）
  const getDeletedUserIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}permanently_deleted_user_ids`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {
      // ignore
    }
    return new Set();
  };

  const [availableUsers, setAvailableUsers] = useState<User[]>(() => {
    const isDemo = getInitialIsDemoMode();
    const isPurged = localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
    const deletedUsers = getDeletedUserIds();
    const activeVirtualPersonas = isPurged ? [] : VIRTUAL_PERSONA_USERS;
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`) || localStorage.getItem(`${STORAGE_KEY_PREFIX}available_users`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          const usersList = parsed
            .filter((u: any) => !isPurged || !isSimulatedUser(u))
            .map((u: any) => {
              const restored = restoreCanonicalUserIdentity(u);
              const isAdmin = restored.id === 'user-admin' || restored.id === 'a000000001' || restored.role === 'admin';
              return {
                ...restored,
                balance: isAdmin
                  ? (typeof restored.balance === 'number' && restored.balance > 0 ? restored.balance : 50000)
                  : (typeof restored.balance === 'number' ? restored.balance : 0),
                withheldPoints: typeof restored.withheldPoints === 'number' ? restored.withheldPoints : 0,
              };
            });

          const disposableTestAccountIds = ['solver-3', 'solver-4', 'solver-5', 'user-author-2', 'user-author-3'];
          if (!isDemo) {
            // 正式模式：過濾拋棄式測試帳號，永久保留核心身分與虛擬創作者帳號（若未清除模擬資料），並自動去重
            const cleanList = usersList.filter((u: any) => !disposableTestAccountIds.includes(u.id));
            CORE_TEST_ACCOUNTS.forEach((cta) => {
              if (deletedUsers.has(cta.id)) return;
              const existingIdx = cleanList.findIndex((u: any) => u.id === cta.id);
              if (existingIdx === -1) {
                cleanList.push(cta as any);
              } else {
                cleanList[existingIdx] = restoreCanonicalUserIdentity({ ...cta, ...cleanList[existingIdx] }) as any;
              }
            });
            activeVirtualPersonas.forEach((vp) => {
              if (deletedUsers.has(vp.id)) return;
              if (!cleanList.some((u: any) => u.id === vp.id)) {
                cleanList.push(vp as any);
              }
            });
            const { uniqueUsers } = deduplicateUsersList(cleanList, deletedUsers);
            return uniqueUsers;
          }

          // 測試環境 (TEST)：以 saved users 為主，智慧合併模擬用戶、虛擬創作者與測試帳號並自動去重
          const combined = [
            ...(isPurged ? [] : MOCK_USERS),
            ...CORE_TEST_ACCOUNTS,
            ...activeVirtualPersonas,
            ...usersList,
          ];
          const { uniqueUsers } = deduplicateUsersList(combined, deletedUsers);
          return uniqueUsers;
        }
      }
    } catch {
      // ignore
    }
    const baseUsers = isDemo
      ? [...(isPurged ? [] : MOCK_USERS), ...activeVirtualPersonas]
      : [...CORE_TEST_ACCOUNTS, ...activeVirtualPersonas];
    return deduplicateUsersList(baseUsers, deletedUsers).uniqueUsers;
  });

  // 嚴格過濾真實註冊用戶（排扣訪客、測試帳號）
  const realRegisteredUsers = useMemo(() => {
    return availableUsers.filter((u) => isRealRegisteredUser(u));
  }, [availableUsers]);

  const realRegisteredUsersCount = realRegisteredUsers.length;

  // 全站「網站造訪量」與「即時線上人數」狀態與實時雲端同步（從 1,700 基數起算真實累加）
  const [siteVisitsCount, setSiteVisitsCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('ideax_real_site_traffic_utc8_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        return Number(parsed?.totalVisits) || 2500;
      }
      return 2500;
    } catch {
      return 2500;
    }
  });
  const [onlineUsersCount, setOnlineUsersCount] = useState<number>(1);
  // 不重複造訪用戶數（每台裝置算一位）
  const [uniqueVisitorsCount, setUniqueVisitorsCount] = useState<number>(() => getCachedRealTrafficStats().uniqueVisitorsTotal || 0);

  // 1. 記錄進入網站之瀏覽量 & 實時監聽全站瀏覽量與造訪用戶數
  useEffect(() => {
    const refreshVisitors = () => setUniqueVisitorsCount(getCachedRealTrafficStats().uniqueVisitorsTotal || 0);
    recordSiteVisitInFirestore().then((visits) => {
      setSiteVisitsCount(visits);
      refreshVisitors();
    });
    const unsub = subscribeSiteVisitsFromFirestore((visits) => {
      setSiteVisitsCount(visits);
      refreshVisitors();
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 2. 即時線上 Heartbeat & 實時監聽活躍連線數
  useEffect(() => {
    sendPresenceHeartbeat(currentUser?.id);
    const heartbeatTimer = setInterval(() => {
      sendPresenceHeartbeat(currentUser?.id);
    }, 25000);

    const unsub = subscribePresenceFromFirestore((count) => {
      setOnlineUsersCount(count);
    });

    return () => {
      clearInterval(heartbeatTimer);
      if (unsub) unsub();
    };
  }, [currentUser?.id]);

  // 3. 實時監聽全站平台「數據顯示設定與營運模式」(Public Metrics Config & Platform Settings)
  useEffect(() => {
    const unsub = subscribePlatformSettingsFromFirestore((settings) => {
      if (settings.publicMetricsConfig) {
        setPublicMetricsConfig((prev) => {
          const merged = { ...prev, ...settings.publicMetricsConfig };
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}public_metrics_config`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (settings.competitionHomepageStatsConfig) {
        try {
          localStorage.setItem('ideax_competition_homepage_stats_config', JSON.stringify(settings.competitionHomepageStatsConfig));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ideax_competition_stats_config_updated', { detail: settings.competitionHomepageStatsConfig }));
          }
        } catch {}
      }
      if (typeof settings.isDemoMode === 'boolean') {
        const targetVal = settings.isDemoMode;
        setIsDemoMode((curr) => {
          if (curr !== targetVal) {
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}demo_mode`, String(targetVal));
            } catch {}
          }
          return targetVal;
        });
      }
      if (typeof settings.isNoPaymentMode === 'boolean') {
        const targetVal = settings.isNoPaymentMode;
        setIsNoPaymentMode((curr) => {
          if (curr !== targetVal) {
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}no_payment_mode`, String(targetVal));
            } catch {}
          }
          return targetVal;
        });
      }
      if (typeof settings.isRaceMode === 'boolean') {
        const targetVal = settings.isRaceMode;
        setIsRaceMode((curr) => {
          if (curr !== targetVal) {
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}is_race_mode`, String(targetVal));
            } catch {}
          }
          return targetVal;
        });
      }
      if (typeof settings.isHideTestAccounts === 'boolean') {
        const targetVal = settings.isHideTestAccounts;
        setIsHideTestAccounts((curr) => {
          if (curr !== targetVal) {
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}hide_test_accounts`, String(targetVal));
            } catch {}
          }
          return targetVal;
        });
      }
      if (typeof settings.isSimulatedDataPurged === 'boolean') {
        const targetVal = settings.isSimulatedDataPurged;
        setIsSimulatedDataPurged((curr) => {
          if (curr !== targetVal) {
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`, String(targetVal));
            } catch {}
          }
          return targetVal;
        });
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const DEVICE_ACCOUNTS_KEY = `${STORAGE_KEY_PREFIX}device_accounts`;

  const [deviceAccounts, setDeviceAccounts] = useState<DeviceAccount[]>(() => {
    try {
      const isAuthenticated = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_authenticated`) === 'true';
      const isExplicitLogin = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_explicit_login`) === 'true';
      if (!isAuthenticated || !isExplicitLogin) {
        return [];
      }
      const saved = localStorage.getItem(DEVICE_ACCOUNTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 若目前未登入（如剛進入網站或剛下載之用戶），絕不殘留任何舊版預設之管理員或訪客帳號，並去除別名重複
          const seenIds = new Set<string>();
          const cleaned = parsed.filter((a: any) => {
            if (!a || !a.userId || a.userId === 'user-guest') return false;
            const aliasId = USER_ALIAS_MAP[a.userId];
            if (seenIds.has(a.userId) || (aliasId && seenIds.has(aliasId))) return false;
            seenIds.add(a.userId);
            if (aliasId) seenIds.add(aliasId);
            return true;
          });
          return cleaned;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(DEVICE_ACCOUNTS_KEY, JSON.stringify(deviceAccounts));
    } catch {
      // ignore
    }
  }, [deviceAccounts]);

  useEffect(() => {
    if (!currentUser || currentUser.id === 'user-guest') return;
    setDeviceAccounts((prev) => {
      const aliasId = USER_ALIAS_MAP[currentUser.id];
      const idx = prev.findIndex((a) => a.userId === currentUser.id || (aliasId && a.userId === aliasId));
      const now = new Date().toISOString();
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], userId: currentUser.id, isLoggedIn: true, lastLoginAt: now };
        return updated;
      }
      return [
        { userId: currentUser.id, isLoggedIn: true, lastLoginAt: now },
        ...prev,
      ];
    });
  }, [currentUser?.id]);

  const [commissionRate, setCommissionRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}commission`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'number') return parsed;
      }
    } catch {
      // ignore
    }
    return 0.10; // 預設 10%
  });

  const getDeletedQuestionIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}permanently_deleted_question_ids`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const getDeletedAnswerIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}permanently_deleted_answer_ids`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const [questions, setQuestions] = useState<Question[]>(() => {
    const getRealClicks = (): Record<string, number> => {
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}question_real_clicks`);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    };
    const realClicks = getRealClicks();
    const deletedIds = getDeletedQuestionIds();
    const isDemo = getInitialIsDemoMode();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const isPurged = localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
    const activeVirtualSeeds = isPurged ? [] : ALL_VIRTUAL_PROPOSALS_SEED;
    const virtualSeedMap = new Map(
      [...ALL_VIRTUAL_PROPOSALS_SEED, ...MOCK_QUESTIONS].map((vq) => [vq.id, vq])
    );
    const sanitizeQuestion = (rawQ: any): Question => {
      const seedQ = virtualSeedMap.get(rawQ?.id);
      const hasUserUpdates =
        Array.isArray(rawQ?.updateLogs) &&
        rawQ.updateLogs.length > (seedQ?.updateLogs?.length || 0);
      const q = {
        ...rawQ,
        ...(seedQ && !hasUserUpdates
          ? {
              appName: seedQ.appName || rawQ.appName,
              title: seedQ.title,
              description: seedQ.description,
              category: seedQ.category,
              subcategory: seedQ.subcategory,
              subcategories: seedQ.subcategories,
              tags: seedQ.tags,
              coverImage: seedQ.coverImage || rawQ.coverImage,
              galleryImages: seedQ.galleryImages || rawQ.galleryImages,
              demoUrl: seedQ.demoUrl || rawQ.demoUrl,
              vibeCodingData: seedQ.vibeCodingData || rawQ.vibeCodingData,
            }
          : {
              subcategories: rawQ.subcategories || seedQ?.subcategories,
            }),
      };
      const count = typeof realClicks[q.id] === 'number' ? realClicks[q.id] : (q.views || 0);
      return {
        ...q,
        title: typeof q.title === 'string' ? q.title : '',
        description: typeof q.description === 'string' ? q.description : '',
        tags: Array.isArray(q.tags) ? q.tags : [],
        bounty: typeof q.bounty === 'number' ? q.bounty : 0,
        withheldBounty: typeof q.withheldBounty === 'number' ? q.withheldBounty : (q.bounty || 0),
        views: count,
        viewsCount: count,
      };
    };

    const isValidQ = (q: any): boolean =>
      Boolean(q && typeof q.id === 'string' && q.id.trim().length > 0 && typeof q.title === 'string' && q.title.trim().length > 0);

    const dedupeQuestions = (list: Question[]): Question[] => {
      const seen = new Set<string>();
      const out: Question[] = [];
      for (const item of list) {
        if (item && item.id && !seen.has(item.id)) {
          seen.add(item.id);
          out.push(item);
        }
      }
      return out;
    };

    const isDelistedExpired = (q: any): boolean => {
      if (q.status === 'delisted' && q.delistedAt) {
        return now - new Date(q.delistedAt).getTime() >= SEVEN_DAYS_MS;
      }
      return false;
    };

    if (!isDemo) {
      // 非測試環境（競賽模式、營運模式、無金流模式）：排除測試帳號模擬題目，載入資料庫與虛擬創作者提案（若未在後台刪除或一鍵清除模擬資料）
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}questions`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const validParsed = parsed.filter((q: any) => isValidQ(q) && (!isPurged || !isSimulatedQuestion(q)));
            const existingIds = new Set(validParsed.map((q: any) => q.id));
            const missingVirtual = activeVirtualSeeds.filter(
              (vq) => !existingIds.has(vq.id) && !deletedIds.has(vq.id)
            );
            return dedupeQuestions(
              [...missingVirtual, ...validParsed]
                .filter((q: any) => isValidQ(q) && !deletedIds.has(q.id) && !isMockQuestionId(q.id, q.authorId) && !isDelistedExpired(q))
                .map(sanitizeQuestion)
            );
          }
        }
      } catch {
        // ignore
      }
      return dedupeQuestions(
        activeVirtualSeeds
          .filter((q) => !deletedIds.has(q.id) && !isDelistedExpired(q))
          .map(sanitizeQuestion)
      );
    }
    // 測試環境 (TEST / DEMO)：加回所有題目與虛擬創作者提案，嚴格過濾黑名單（永久刪除與過期下架）
    const combinedSeeds = isPurged ? [] : [...ALL_VIRTUAL_PROPOSALS_SEED, ...MOCK_QUESTIONS];
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}questions`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validParsed = parsed.filter((q: any) => isValidQ(q) && (!isPurged || (!isSimulatedQuestion(q) && !isMockQuestionId(q.id, q.authorId))));
          const parsedIdMap = new Set(validParsed.map((q: any) => q.id));
          const missingSeeds = combinedSeeds.filter((mq) => !parsedIdMap.has(mq.id) && !deletedIds.has(mq.id));
          return dedupeQuestions(
            [...missingSeeds, ...validParsed]
              .filter((q: any) => isValidQ(q) && !deletedIds.has(q.id) && !isDelistedExpired(q))
              .map(sanitizeQuestion)
          );
        }
      }
    } catch {
      // ignore
    }
    return dedupeQuestions(
      combinedSeeds
        .filter((q) => !deletedIds.has(q.id) && !isDelistedExpired(q))
        .map(sanitizeQuestion)
    );
  });

  const [solvers, setSolvers] = useState<Solver[]>(() => {
    const isDemo = getInitialIsDemoMode();
    if (!isDemo) {
      // 非測試環境：不保留任何模擬專家資料
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}solvers`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((s: any) => !isMockSolverId(s.id) && !isTestAccountUserId(s.id));
          }
        }
      } catch {
        // ignore
      }
      return [];
    }
    // 測試環境 (TEST / DEMO)：加回所有模擬專家資料
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}solvers`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          const customSolvers = parsed.filter((s: any) => !isMockSolverId(s.id) && !isTestAccountUserId(s.id));
          return [...MOCK_SOLVERS, ...customSolvers];
        }
      }
    } catch {
      // ignore
    }
    return MOCK_SOLVERS;
  });

  const [answers, setAnswers] = useState<Answer[]>(() => {
    const isDemo = getInitialIsDemoMode();
    const isPurged = localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
    const deletedAnsIds = getDeletedAnswerIds();
    const deletedQIds = getDeletedQuestionIds();
    const virtualAnsMap = new Map(ALL_VIRTUAL_ANSWERS_SEED.map((va) => [va.id, va]));

    const isAnswerValid = (a: any) => {
      if (!a || !a.id) return false;
      if (deletedAnsIds.has(a.id)) return false;
      if (a.questionId && deletedQIds.has(a.questionId)) return false;
      if (isPurged && (isSimulatedAnswer(a) || isMockAnswerId(a.id))) return false;
      // 淘汰舊版固定數量之殘留模擬解答/討論（若不在最新 ALL_VIRTUAL_ANSWERS_SEED 中）
      if (typeof a.id === 'string' && a.id.startsWith('ans-sim-') && !virtualAnsMap.has(a.id)) return false;
      return true;
    };

    const mergeWithVirtualAnswers = (baseList: Answer[]): Answer[] => {
      const seen = new Set<string>();
      const out: Answer[] = [];
      const activeVirtualAns = isPurged ? [] : ALL_VIRTUAL_ANSWERS_SEED;
      for (const rawA of [...baseList, ...activeVirtualAns]) {
        if (isAnswerValid(rawA) && !seen.has(rawA.id)) {
          seen.add(rawA.id);
          const seedAns = virtualAnsMap.get(rawA.id);
          const a = seedAns
            ? {
                ...rawA,
                ...seedAns,
                likes: Math.max(rawA.likes || 0, seedAns.likes || 0),
                isSimulated: true,
                simulatedBatchId: SIMULATED_BATCH_ID,
              }
            : rawA;
          out.push({
            ...a,
            price: typeof a.price === 'number' ? a.price : 0,
          });
        }
      }
      return out;
    };

    if (!isDemo) {
      // 非測試環境：排除舊式測試帳號解答，但保留真實解答與虛擬創作者模擬留言討論
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}answers`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleanParsed = parsed.filter((a: any) => !isMockAnswerId(a.id) && isAnswerValid(a));
            return mergeWithVirtualAnswers(cleanParsed);
          }
        }
      } catch {
        // ignore
      }
      return mergeWithVirtualAnswers([]);
    }
    // 測試環境 (TEST / DEMO)：加回模擬解答方案與虛擬創作者模擬留言討論（需過濾已刪除黑名單）
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}answers`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const customAnswers = parsed.filter((a: any) => !isMockAnswerId(a.id) && isAnswerValid(a));
          const validMocks = isPurged ? [] : MOCK_ANSWERS.filter(isAnswerValid);
          return mergeWithVirtualAnswers([...validMocks, ...customAnswers]);
        }
      }
    } catch {
      // ignore
    }
    return mergeWithVirtualAnswers(isPurged ? [] : MOCK_ANSWERS.filter(isAnswerValid));
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const isDemo = getInitialIsDemoMode();
    if (!isDemo) {
      // 非測試環境：不保留任何模擬交易帳目
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}transactions`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((t: any) => !isMockTransactionId(t.id));
          }
        }
      } catch {
        // ignore
      }
      return [];
    }
    // 測試環境 (TEST / DEMO)：加回所有模擬交易紀錄
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}transactions`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const customTx = parsed.filter((t: any) => !isMockTransactionId(t.id));
          return [...MOCK_TRANSACTIONS, ...customTx];
        }
      }
    } catch {
      // ignore
    }
    return MOCK_TRANSACTIONS;
  });

  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    const isDemo = getInitialIsDemoMode();
    if (!isDemo) {
      // 非測試環境：不保留任何模擬對話
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}conversations`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((c: any) => !isMockConversationId(c.id));
          }
        }
      } catch {
        // ignore
      }
      return [];
    }
    // 測試環境 (TEST / DEMO)：加回所有模擬聊天室對話
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}conversations`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const customConv = parsed.filter((c: any) => !isMockConversationId(c.id));
          return [...MOCK_CONVERSATIONS, ...customConv];
        }
      }
    } catch {
      // ignore
    }
    return MOCK_CONVERSATIONS;
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const fromUrl = urlParams.get('conv') || urlParams.get('cid') || urlParams.get('chatId') || urlParams.get('id');
        if (fromUrl) return fromUrl;
        return localStorage.getItem(`${STORAGE_KEY_PREFIX}active_conversation_id`) || null;
      }
    } catch {}
    return null;
  });
  const [isNotificationsSidebarOpen, setIsNotificationsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('keywords');

  // 收藏問題狀態清單 (Bookmarked Questions)
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<string[]>(() => {
    const isDemo = getInitialIsDemoMode();
    if (!isDemo) {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}bookmarks`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((id: string) => !isMockQuestionId(id));
          }
        }
      } catch {
        // ignore
      }
      return [];
    }
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}bookmarks`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const merged = [...parsed];
          ['q-1', 'q-3'].forEach((id) => {
            if (!merged.includes(id)) merged.push(id);
          });
          return merged;
        }
      }
    } catch {
      // ignore
    }
    return ['q-1', 'q-3'];
  });

  // 痛點附議狀態 (+1)
  const [secondedQuestionIds, setSecondedQuestionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}seconded_questions`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // 提問同問狀態 (舉手)
  const [sameQuestionIds, setSameQuestionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}same_questions`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // 討論留言按讚狀態 (大拇指)
  const [likedDiscussionAnswerIds, setLikedDiscussionAnswerIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}liked_discussions`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // L0討論提問按讚狀態 (大拇指)
  const [likedQuestionIds, setLikedQuestionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}liked_questions`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}notifications`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((n) => !isModeOrEnvNotification(n.title, n.message));
        }
      }
    } catch {}
    const isDemo = getInitialIsDemoMode();
    if (!isDemo) return [];
    return [
      {
        id: 'notif-1',
        userId: 'user-chen',
        title: 'AI 智慧專家媒合推薦',
        message: '您的問題「校園共享雨傘如何從租借轉向商家合作」已有 3 位推薦解答者，媒合度最高達 96%！',
        type: 'ai_match',
        createdAt: '10 分鐘前',
        read: false,
        linkQuestionId: 'q-1',
      },
      {
        id: 'notif-2',
        userId: 'user-chen',
        title: '新解答方案已提交',
        message: '柯育任 顧問已為您的懸賞問題提交「商業策略架構」深度方案，歡迎前往查看預覽與解鎖。',
        type: 'new_answer',
        createdAt: '1 小時前',
        read: false,
        linkQuestionId: 'q-1',
      },
    ];
  });

  // Selected views
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedSolver, setSelectedSolver] = useState<Solver | null>(null);

  // Modals state
  const [isCreateQuestionOpen, setIsCreateQuestionOpen] = useState(false);
  const [isSubmitAnswerOpen, setIsSubmitAnswerOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [targetAnswerToUnlock, setTargetAnswerToUnlock] = useState<Answer | null>(null);
  const [isCustomerServiceOpen, setIsCustomerServiceOpen] = useState(false);
  const [customerServiceContext, setCustomerServiceContext] = useState<any>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<any>(null);

  const openCustomerService = (ctx?: any) => {
    setCustomerServiceContext(ctx || null);
    setIsCustomerServiceOpen(true);
  };
  const closeCustomerService = () => {
    setIsCustomerServiceOpen(false);
    setCustomerServiceContext(null);
  };

  const openRatingModal = (target: any) => {
    setRatingTarget(target);
    setIsRatingModalOpen(true);
  };
  const closeRatingModal = () => {
    setIsRatingModalOpen(false);
    setRatingTarget(null);
  };

  // Public Metrics Config (Admin customizes which stats to display publicly)
  const defaultPublicMetricsConfig: PublicMetricsConfig = {
    showSolvedCount: true,
    showTotalBounty: true,
    showAvgResponseSpeed: true,
    showSatisfactionRate: true,
    showHighestBounty: true,
    showTotalViews: false,
    showOnlineUsers: false,
    showTotalMembers: false,
    showVerifiedSolvers: false,
    showQuestionsCount: false,
    showProposalsCount: false,
    showTotalDeals: false,
    showTotalGMV: false,
  };

  const [publicMetricsConfig, setPublicMetricsConfig] = useState<PublicMetricsConfig>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}public_metrics_config`);
      if (saved) {
        return { ...defaultPublicMetricsConfig, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return defaultPublicMetricsConfig;
  });

  const updatePublicMetricsConfig = (config: Partial<PublicMetricsConfig>) => {
    setPublicMetricsConfig((prev) => {
      const next = { ...prev, ...config };
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}public_metrics_config`, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      // 全站實時同步指標展示設定至 Firestore 雲端，使其他所有使用者與瀏覽器即時生效
      syncPlatformSettingsToFirestore({ publicMetricsConfig: next });
      return next;
    });
  };

  // AI-CRM System Config (Admin settings)
  const [aiCrmConfig, setAiCrmConfig] = useState<AiCrmSystemConfig>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}ai_crm_config`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      isEnabled: true,
      requiredTier: 'master',
      hesitationDaysThreshold: 3,
      highIntentBountyThreshold: 3000,
      toneStyle: 'professional',
      autoScanIntervalHours: 2,
      allowCustomTone: true,
      boardPushEnabled: true,
      maxPushesPerDay: 5,
      scheduleMode: 'smart_time_slots',
      peakIntervalHours: 1,
      eveningIntervalHours: 2,
      offPeakIntervalHours: 6,
    };
  });

  const updateAiCrmConfig = (config: Partial<AiCrmSystemConfig>) => {
    setAiCrmConfig((prev) => {
      const next = { ...prev, ...config };
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}ai_crm_config`, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      // 存到雲端，伺服器值班巡檢依此設定的間隔執行
      void syncAiCrmConfigToFirestore(next);
      return next;
    });
  };

  // 24hr AI特助代客服務設定更新 (權威方案以上)
  const updateAssistant24hrConfig = (newConfig: Assistant24hrConfig) => {
    setCurrentUser((prev) => {
      const updated = {
        ...prev,
        assistant24hrConfig: newConfig,
      };
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      syncUserToFirestore(updated);
      return updated;
    });
    setAvailableUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, assistant24hrConfig: newConfig } : u))
    );
  };

  // About & Terms Modal State
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [aboutModalInitialSection, setAboutModalInitialSection] = useState<AboutSection>('list');

  const openAboutModal = (section: AboutSection = 'list') => {
    setAboutModalInitialSection(section);
    setIsAboutModalOpen(true);
  };

  const closeAboutModal = () => {
    setIsAboutModalOpen(false);
  };

  const hasAgreedTerms = (type: 'general' | 'questioner' | 'solver'): boolean => {
    if (!currentUser) return false;
    if (type === 'general') {
      return Boolean(currentUser.hasAgreedGeneralTerms ?? true);
    }
    if (type === 'questioner') {
      return currentUser.agreedQuestionerTermsVersion === CURRENT_TERMS_VERSION;
    }
    if (type === 'solver') {
      return currentUser.agreedSolverTermsVersion === CURRENT_TERMS_VERSION;
    }
    return false;
  };

  const recordTermsAgreement = (type: 'general' | 'questioner' | 'solver', version: string = CURRENT_TERMS_VERSION) => {
    const nowIso = new Date().toISOString();
    setCurrentUser((prev) => {
      let updated = { ...prev };
      if (type === 'general') {
        updated = {
          ...updated,
          hasAgreedGeneralTerms: true,
          agreedGeneralTermsVersion: version,
          agreedGeneralTermsAt: nowIso,
        };
      } else if (type === 'questioner') {
        updated = {
          ...updated,
          hasAgreedQuestionerTerms: true,
          agreedQuestionerTermsVersion: version,
          agreedQuestionerTermsAt: nowIso,
        };
      } else if (type === 'solver') {
        updated = {
          ...updated,
          hasAgreedSolverTerms: true,
          agreedSolverTermsVersion: version,
          agreedSolverTermsAt: nowIso,
        };
      }

      // Also sync to availableUsers
      setAvailableUsers((users) =>
        users.map((u) => (u.id === updated.id ? updated : u))
      );

      return updated;
    });
  };

  // Cloud Firestore Sync State & Real Boot Progress
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [initialBootProgress, setInitialBootProgress] = useState<number>(18);
  const [initialBootStatusText, setInitialBootStatusText] = useState<string>('正在連線至雲端資料庫...');
  const [isInitialBootComplete, setIsInitialBootComplete] = useState<boolean>(false);

  // Save to localStorage & Cloud Firestore
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(currentUser));
    if (currentUser && currentUser.id && !isGuestUser(currentUser)) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}is_authenticated`, 'true');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}is_explicit_login`, 'true');
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_authenticated`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_explicit_login`);
      return;
    }

    const aliasId = USER_ALIAS_MAP[currentUser.id];
    const isTargetId = (id?: string) => Boolean(id && (id === currentUser.id || (aliasId && id === aliasId)));

    setAvailableUsers((users) => {
      let changed = false;
      const next = users.map((u) => {
        if (isTargetId(u.id)) {
          if (
            u.avatar !== currentUser.avatar ||
            u.name !== currentUser.name ||
            u.title !== currentUser.title ||
            u.bio !== currentUser.bio ||
            u.domain !== currentUser.domain ||
            u.balance !== currentUser.balance ||
            u.withheldPoints !== currentUser.withheldPoints
          ) {
            changed = true;
            return { ...u, ...currentUser, id: u.id };
          }
        }
        return u;
      });
      return changed ? next : users;
    });

    // Sync to solvers directory if currentUser is listed as a solver
    setSolvers((prevSolvers) => {
      let changed = false;
      const next = prevSolvers.map((s) => {
        if (isTargetId(s.id) || isTargetId(s.userId)) {
          if (s.avatar !== currentUser.avatar || s.name !== currentUser.name || s.title !== currentUser.title) {
            changed = true;
            return {
              ...s,
              name: currentUser.name,
              avatar: currentUser.avatar,
              title: currentUser.title || s.title,
              bio: currentUser.bio || s.bio,
            };
          }
        }
        return s;
      });
      return changed ? next : prevSolvers;
    });

    // Propagate updated name & avatar across questions, answers, and conversations site-wide
    setQuestions((prevQuestions) => {
      let changed = false;
      const next = prevQuestions.map((q) => {
        if (isTargetId(q.authorId)) {
          if (q.authorName !== currentUser.name || q.authorAvatar !== currentUser.avatar) {
            changed = true;
            return {
              ...q,
              authorName: currentUser.name,
              authorAvatar: currentUser.avatar,
              authorTitle: currentUser.title || q.authorTitle,
            };
          }
        }
        return q;
      });
      return changed ? next : prevQuestions;
    });

    setAnswers((prevAnswers) => {
      let changed = false;
      const next = prevAnswers.map((a) => {
        if (isTargetId(a.solverId)) {
          if (a.solverName !== currentUser.name || a.solverAvatar !== currentUser.avatar) {
            changed = true;
            return {
              ...a,
              solverName: currentUser.name,
              solverAvatar: currentUser.avatar,
              solverTitle: currentUser.title || a.solverTitle,
            };
          }
        }
        return a;
      });
      return changed ? next : prevAnswers;
    });

    setConversations((prevConvs) => {
      let changed = false;
      const next = prevConvs.map((c: any) => {
        let convChanged = false;
        let updatedC = { ...c };
        if (isTargetId(c.user1Id) && (c.user1Name !== currentUser.name || c.user1Avatar !== currentUser.avatar)) {
          updatedC.user1Name = currentUser.name;
          updatedC.user1Avatar = currentUser.avatar;
          convChanged = true;
        }
        if (isTargetId(c.user2Id) && (c.user2Name !== currentUser.name || c.user2Avatar !== currentUser.avatar)) {
          updatedC.user2Name = currentUser.name;
          updatedC.user2Avatar = currentUser.avatar;
          convChanged = true;
        }
        if (isTargetId(c.participantId) && (c.participantName !== currentUser.name || c.participantAvatar !== currentUser.avatar)) {
          updatedC.participantName = currentUser.name;
          updatedC.participantAvatar = currentUser.avatar;
          convChanged = true;
        }
        if (convChanged) {
          changed = true;
          return updatedC;
        }
        return c;
      });
      return changed ? next : prevConvs;
    });
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(availableUsers));
  }, [availableUsers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}commission`, JSON.stringify(commissionRate));
  }, [commissionRate]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}transactions`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}conversations`, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId) {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}active_conversation_id`, activeConversationId);
      } catch {}
    } else {
      try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}active_conversation_id`);
      } catch {}
    }
  }, [activeConversationId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}bookmarks`, JSON.stringify(bookmarkedQuestionIds));
  }, [bookmarkedQuestionIds]);

  useEffect(() => {
    const cleanNotifications = notifications.filter((n) => !isModeOrEnvNotification(n.title, n.message));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}notifications`, JSON.stringify(cleanNotifications));
  }, [notifications]);

  // 掛載時自動清空既有資料庫/localStorage 中殘留的環境與模式變更通知
  useEffect(() => {
    setNotifications((prev) => {
      const clean = prev.filter((n) => !isModeOrEnvNotification(n.title, n.message));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}notifications`, JSON.stringify(clean));
      } catch {}
      return clean;
    });
  }, []);

  // Pull all data fresh from Firestore into local state & storage
  // ===================================================================
  // 點數帳本：正式模式下點數異動一律經由伺服器
  // （競賽模式的創星幣、無金流模式、測試模式維持原本的本機模擬）
  // ===================================================================
  const isRealPointsEconomy = !isRaceMode && !isNoPaymentMode && !isDemoMode;
  const realPointsEconomyRef = useRef(isRealPointsEconomy);
  realPointsEconomyRef.current = isRealPointsEconomy;

  // 正式模式：自己的點數以雲端（伺服器帳本）為準
  useEffect(() => {
    if (!isRealPointsEconomy || isScopeGuest) return;
    const latest = availableUsers.find((u) => u.id === currentUser.id);
    if (!latest) return;
    const fields = ['balance', 'withheldPoints', 'tipReceivablesPoints', 'thisWeekTipPoints'] as const;
    const changed = fields.some((f) => typeof (latest as any)[f] === 'number' && (latest as any)[f] !== (currentUser as any)[f]);
    if (!changed) return;
    setCurrentUser((prev) => {
      if (prev.id !== latest.id) return prev;
      const next: any = { ...prev };
      for (const f of fields) if (typeof (latest as any)[f] === 'number') next[f] = (latest as any)[f];
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableUsers, isRealPointsEconomy]);
  const runPointsOp = (payload: PointsOpPayload, failTitle = '點數處理失敗', onFail?: () => void) => {
    if (!isRealPointsEconomy) return;
    const myId = currentUser.id;
    void pointsOp(payload).then(async (r) => {
      if (r.ok) {
        const patch: Partial<User> = { balance: r.balance, withheldPoints: r.withheldPoints };
        if (r.subscriptionTier) {
          patch.subscriptionTier = r.subscriptionTier as SubscriptionTier;
          patch.subscriptionExpiresAt = r.subscriptionExpiresAt;
        }
        setAvailableUsers((prev) => prev.map((u) => (u.id === r.userId ? { ...u, ...patch } : u)));
        if (r.userId === myId) {
          setCurrentUser((prev) => (prev.id === myId ? { ...prev, ...patch } : prev));
        }
        return;
      }
      // 伺服器拒絕：還原畫面上已先套用的變更（例如已解鎖的內容、已開通的方案）
      try {
        onFail?.();
      } catch {}
      showCenterToast(failTitle, `${r.error}。點數已恢復為伺服器上的紀錄。`, { type: 'warning', duration: 4500 } as any);
      try {
        const fresh = await getUserFromFirestore(myId);
        if (fresh) {
          setCurrentUser((prev) =>
            prev.id === myId
              ? {
                  ...prev,
                  balance: fresh.balance ?? prev.balance,
                  withheldPoints: fresh.withheldPoints ?? prev.withheldPoints,
                  subscriptionTier: fresh.subscriptionTier ?? prev.subscriptionTier,
                  subscriptionExpiresAt: fresh.subscriptionExpiresAt ?? prev.subscriptionExpiresAt,
                }
              : prev
          );
        }
      } catch {}
    });
  };

  // 告訴資料層「現在是誰」：一般會員只下載自己的交易、私訊與通知；管理員載入全站
  const isScopeGuest = !currentUser?.id || currentUser.id === 'user-guest';
  setFirestoreDataScope({
    userId: isScopeGuest ? null : currentUser.id,
    userName: isScopeGuest ? undefined : currentUser.name,
    isAdmin: !isScopeGuest && currentUser.role === 'admin',
  });

  // 站內帳號 ↔ Firebase 登入帳號對照（資料庫以 Firebase 帳號判斷誰能讀寫私訊、通知、交易）
  setMyAppUserId(isScopeGuest ? null : currentUser.id);
  useEffect(() => {
    updateAuthUidDirectory(availableUsers);
  }, [availableUsers]);

  // 登入 Firebase 後，把 Firebase UID 記在自己的會員資料上，讓別人傳訊時找得到
  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuthInstance, (fbUser) => {
      if (!fbUser) return;
      setCurrentUser((prev) => {
        if (!prev?.id || prev.id === 'user-guest' || prev.role === 'admin') return prev;
        const sameAccount =
          prev.id === fbUser.uid ||
          (!!prev.email && !!fbUser.email && prev.email.toLowerCase() === fbUser.email.toLowerCase());
        if (!sameAccount || prev.authUid === fbUser.uid) return prev;
        const updated = { ...prev, authUid: fbUser.uid };
        setAvailableUsers((users) => users.map((u) => (u.id === prev.id ? { ...u, authUid: fbUser.uid } : u)));
        void syncUserToFirestore(updated);
        return updated;
      });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  // 正在使用中的帳號被管理員停權：雲端會員資料更新後立即登出
  useEffect(() => {
    if (isScopeGuest || currentUser.role === 'admin') return;
    const latest = availableUsers.find((u) => u.id === currentUser.id);
    if (!latest || !isBlockActive(latest)) return;
    const reason = latest.blockedReason || '違反平台規範';
    const untilText = describeBlockUntil(latest.blockedUntil);
    logoutAccount();
    setTimeout(() => {
      try {
        window.alert(`您的帳號已被停權（${untilText}），已自動登出。\n理由：${reason}\n如有疑問請聯絡客服。`);
      } catch {}
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableUsers, currentUser.id, currentUser.role, isScopeGuest]);

  // 登入、登出或切換帳號後，重新載入「這位會員自己的」私人資料
  const lastScopedUserKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = isScopeGuest ? 'guest' : `${currentUser.id}:${currentUser.role === 'admin' ? 'admin' : 'member'}`;
    const prevKey = lastScopedUserKeyRef.current;
    lastScopedUserKeyRef.current = key;
    if (prevKey === null || prevKey === key) return; // 首次載入由開站流程處理
    const isDemoNow = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
    if (isDemoNow) return;
    if (key === 'guest') return; // 登出時不清除本機資料（部分私訊只存在本機）
    let cancelled = false;
    (async () => {
      if (currentUser.role === 'admin') {
        await pullAllDataFromFirestore();
        return;
      }
      const personal = await loadPersonalDataFromFirestore();
      if (cancelled || !personal) return;
      setTransactions((prev) => mergeServerIntoLocal(prev, personal.transactions.filter((t) => !isMockTransactionId(t.id))));
      setConversations((prev) => mergeServerIntoLocal(prev, personal.conversations.filter((c) => !isMockConversationId(c.id))));
      setNotifications((prev) =>
        mergeServerIntoLocal(prev, personal.notifications.filter((n) => !isModeOrEnvNotification(n.title, n.message)))
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, currentUser.role]);

  // ===================================================================
  // 私訊與通知的雲端傳遞
  // - 接收：即時監聽「自己的」對話與通知
  // - 送出：自己參與的對話有新內容時寫入雲端；發給別人的通知寫入雲端
  // ===================================================================
  const cloudConvSigRef = useRef<Map<string, string>>(new Map());
  const cloudConvReadyRef = useRef(false);
  const cloudNotifIdsRef = useRef<Set<string>>(new Set());
  const notifReadSyncedRef = useRef<Set<string>>(new Set());
  const deliveredNotifIdsRef = useRef<Set<string> | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversationId;
  const isCloudMessagingOn = !isScopeGuest && localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) !== 'true';

  useEffect(() => {
    if (!isCloudMessagingOn) return;
    const myId = currentUser.id;
    cloudConvReadyRef.current = false;
    cloudConvSigRef.current = new Map();
    const recipientIds = currentUser.role === 'admin' ? ['admin'] : [];
    const unsubscribe = subscribePersonalData(myId, recipientIds, {
      onConversations: (serverConvs) => {
        const isFirstSnapshot = !cloudConvReadyRef.current;
        const incomingAlerts: Array<{ name: string; text: string }> = [];
        setConversations((prev) => {
          const map = new Map(prev.map((c) => [c.id, c]));
          for (const sc of serverConvs) {
            if (!sc?.id || isMockConversationId(sc.id)) continue;
            const before = map.get(sc.id);
            const isActive = activeConversationIdRef.current === sc.id;
            const merged = mergeIncomingConversation(before, sc as any, myId, isActive);
            if (!isFirstSnapshot && !isActive) {
              const knownIds = new Set((before?.messages || []).map((m) => m.id));
              const newest = merged.messages.filter((m) => !knownIds.has(m.id) && m.senderId !== myId).pop();
              if (newest) incomingAlerts.push({ name: newest.senderName, text: merged.lastMessage || newest.text });
            }
            map.set(sc.id, merged);
            // 記下雲端版本，若合併後內容相同就不必再寫回
            cloudConvSigRef.current.set(sc.id, conversationSignature(sc));
          }
          return Array.from(map.values());
        });
        cloudConvReadyRef.current = true;
        // 狀態更新完成後才會知道有哪些新訊息，所以延後到下一輪再跳通知
        setTimeout(() => {
          if (incomingAlerts.length > 0) {
            incomingAlerts.slice(0, 3).forEach((a) =>
              PwaNotificationService.sendNativeNotification({
                title: `${a.name || '有人'} 傳了私訊給你`,
                body: (a.text || '').slice(0, 80) || '點此查看',
                url: '/chat',
                group: 'chat_message',
              })
            );
          }
        }, 50);
      },
      onNotifications: (serverNotifs, isInitial) => {
        const fresh: NotificationItem[] = [];
        serverNotifs.forEach((n) => cloudNotifIdsRef.current.add(n.id));
        setNotifications((prev) => {
          const localById = new Map(prev.map((n) => [n.id, n]));
          let changed = false;
          for (const n of serverNotifs) {
            if (isModeOrEnvNotification(n.title, n.message)) continue;
            const local = localById.get(n.id);
            if (!local) {
              fresh.push(n);
              changed = true;
            } else if (n.read && !local.read) {
              // 在別的裝置已讀
              localById.set(n.id, { ...local, read: true });
              changed = true;
            }
          }
          if (!changed) return prev;
          const updated = prev.map((n) => localById.get(n.id) || n);
          return [...fresh, ...updated];
        });
        // 開站後才收到的新通知，跳出系統通知（使用中時由服務層自動略過）
        if (!isInitial) {
          setTimeout(() => {
            fresh
              .filter((n) => !n.read && (n.userId === myId || n.userId === 'all'))
              .slice(0, 3)
              .forEach((n) => {
                PwaNotificationService.sendNativeNotification({
                  title: n.title || 'IdeaX 創點子',
                  body: n.message || '您有一則新通知',
                  url: n.linkQuestionId
                    ? `/?q=${encodeURIComponent(n.linkQuestionId)}`
                    : n.linkChatId || n.type === 'chat_message'
                    ? '/chat'
                    : '/',
                  group: n.type === 'system' ? undefined : n.type,
                });
              });
          }, 50);
        }
      },
    });
    return () => {
      cloudConvReadyRef.current = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, currentUser.role, isCloudMessagingOn]);

  // 送出：自己參與的對話有新訊息、方案狀態改變時，寫入雲端讓對方收到
  useEffect(() => {
    if (!isCloudMessagingOn) return;
    const myId = currentUser.id;
    const timer = setTimeout(() => {
      // 等雲端資料先載入，避免用舊的本機版本蓋掉對方的新訊息
      if (!cloudConvReadyRef.current) return;
      for (const conv of conversations) {
        if (!conv?.id || isMockConversationId(conv.id)) continue;
        if (!Array.isArray(conv.participantIds) || !conv.participantIds.includes(myId)) continue;
        if (!conv.messages || conv.messages.length === 0) continue;
        const sig = conversationSignature(conv);
        if (cloudConvSigRef.current.get(conv.id) === sig) continue;
        cloudConvSigRef.current.set(conv.id, sig);
        void pushConversationToCloud(conv, myId);
      }
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, currentUser.id, isCloudMessagingOn]);

  // 送出：發給別人的通知寫入雲端；自己已讀的通知把狀態寫回雲端
  useEffect(() => {
    if (!isCloudMessagingOn) return;
    const myId = currentUser.id;
    // 第一次執行時，把已存在的通知視為「已處理」，只送出之後新產生的
    if (deliveredNotifIdsRef.current === null) {
      deliveredNotifIdsRef.current = new Set(notifications.map((n) => n.id));
      return;
    }
    const delivered = deliveredNotifIdsRef.current;
    for (const n of notifications) {
      if (!n?.id) continue;
      if (n.userId && n.userId !== myId && !delivered.has(n.id) && !cloudNotifIdsRef.current.has(n.id)) {
        delivered.add(n.id);
        void deliverNotificationToCloud(n);
      }
      if (n.read && (n.userId === myId || n.userId === 'admin') && cloudNotifIdsRef.current.has(n.id) && !notifReadSyncedRef.current.has(n.id)) {
        notifReadSyncedRef.current.add(n.id);
        void markNotificationReadInCloud(n.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, currentUser.id, isCloudMessagingOn]);

  const pullAllDataFromFirestore = async (): Promise<boolean> => {
    try {
      const cloudData = await loadAllDataFromFirestore();
      if (!cloudData) return false;
      const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
      const deletedIds = getDeletedQuestionIds();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (cloudData.questions && cloudData.questions.length > 0) {
        const getRealClicks = (): Record<string, number> => {
          try {
            const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}question_real_clicks`);
            return raw ? JSON.parse(raw) : {};
          } catch {
            return {};
          }
        };
        const realClicks = getRealClicks();
        const expiredIds: string[] = [];
        const filteredQ = cloudData.questions
          .filter((q) => Boolean(q && typeof q.id === 'string' && q.id.trim() && typeof q.title === 'string' && q.title.trim()) && !deletedIds.has(q.id) && (isDemo || !isMockQuestionId(q.id, q.authorId)))
          .filter((q) => {
            if (q.status === 'delisted' && q.delistedAt) {
              if (now - new Date(q.delistedAt).getTime() >= SEVEN_DAYS_MS) {
                expiredIds.push(q.id);
                return false;
              }
            }
            return true;
          })
          .map((q) => {
            const seedQ = ALL_VIRTUAL_PROPOSALS_SEED.find((sq) => sq.id === q.id) || MOCK_QUESTIONS.find((mq) => mq.id === q.id);
            const hasUserUpdates =
              Array.isArray(q?.updateLogs) &&
              q.updateLogs.length > (seedQ?.updateLogs?.length || 0);
            const highestViews = Math.max(
              typeof q.views === 'number' ? q.views : 0,
              typeof q.viewsCount === 'number' ? q.viewsCount : 0,
              typeof realClicks[q.id] === 'number' ? realClicks[q.id] : 0
            );
            return {
              ...q,
              ...(seedQ && !hasUserUpdates
                ? {
                    appName: seedQ.appName || q.appName,
                    title: seedQ.title,
                    description: seedQ.description,
                    authorName: seedQ.authorName,
                    tipsHistory: seedQ.tipsHistory || q.tipsHistory,
                    category: seedQ.category,
                    subcategory: seedQ.subcategory,
                    subcategories: seedQ.subcategories,
                    tags: seedQ.tags,
                  }
                : {
                    subcategories: q.subcategories || seedQ?.subcategories,
                  }),
              tags: Array.isArray(seedQ?.tags || q.tags) ? (seedQ && !hasUserUpdates ? seedQ.tags : q.tags) : [],
              views: highestViews,
              viewsCount: highestViews,
            };
          });

        if (expiredIds.length > 0) {
          deleteQuestionsFromFirestore(expiredIds);
          try {
            const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}permanently_deleted_question_ids`);
            const list: string[] = raw ? JSON.parse(raw) : [];
            expiredIds.forEach((id) => {
              if (!list.includes(id)) list.push(id);
            });
            localStorage.setItem(`${STORAGE_KEY_PREFIX}permanently_deleted_question_ids`, JSON.stringify(list));
          } catch {}
        }

        const isPurgedPull = localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
        const existingCloudQIds = new Set(filteredQ.map((q) => q.id));
        const missingVirtualForCloud = isPurgedPull
          ? []
          : ALL_VIRTUAL_PROPOSALS_SEED.filter((vq) => !existingCloudQIds.has(vq.id) && !deletedIds.has(vq.id));
        if (missingVirtualForCloud.length > 0) {
          syncQuestionsToFirestore(missingVirtualForCloud);
        }
        const seenPull = new Set<string>();
        const finalMergedQ = [...filteredQ, ...missingVirtualForCloud].filter((q) => {
          if (!q || !q.id || seenPull.has(q.id)) return false;
          if (isPurgedPull && (isSimulatedQuestion(q) || isMockQuestionId(q.id, q.authorId))) return false;
          seenPull.add(q.id);
          return true;
        });

        setQuestions(finalMergedQ);
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(finalMergedQ));
        } catch {}
      }

      if (cloudData.users && cloudData.users.length > 0) {
        const isPurgedPull = localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
        const repairedCloudUsers = cloudData.users
          .filter((cu) => !isPurgedPull || !isSimulatedUser(cu))
          .map((cu) => restoreCanonicalUserIdentity(cu));

        const deletedUsers = getDeletedUserIds();
        setAvailableUsers((prevUsers) => {
          const combined = [...(prevUsers || []), ...repairedCloudUsers];
          const { uniqueUsers, removedIds } = deduplicateUsersList(combined, deletedUsers);
          if (removedIds.length > 0) {
            deleteUsersFromFirestore(removedIds);
          }
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(uniqueUsers));
            localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(uniqueUsers));
          } catch {}
          return uniqueUsers;
        });
        if (currentUser && currentUser.id && currentUser.id !== 'user-guest') {
          setCurrentUser((prev) => {
            const found = repairedCloudUsers.find((u) => u.id === prev.id || (USER_ALIAS_MAP[prev.id] && u.id === USER_ALIAS_MAP[prev.id]));
            if (found) {
              const restoredFound = restoreCanonicalUserIdentity({ ...found, ...prev, id: prev.id });
              return (restoredFound.id === 'user-admin' || restoredFound.id === 'a000000001' || restoredFound.role === 'admin')
                ? { ...restoredFound, balance: typeof restoredFound.balance === 'number' && restoredFound.balance > 0 ? restoredFound.balance : 50000 }
                : restoredFound;
            }
            return restoreCanonicalUserIdentity(prev);
          });
        }
      }

      if (cloudData.answers && cloudData.answers.length > 0) {
        const isPurgedPull = localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
        const deletedAnsIds = getDeletedAnswerIds();
        const virtualAnsMap = new Map(ALL_VIRTUAL_ANSWERS_SEED.map((va) => [va.id, va]));
        const obsoleteSimIds: string[] = [];
        const rawCleanAns = (!isDemo ? cloudData.answers.filter((a) => !isMockAnswerId(a.id)) : cloudData.answers).filter((a) => {
          if (typeof a?.id === 'string' && a.id.startsWith('ans-sim-') && !virtualAnsMap.has(a.id)) {
            obsoleteSimIds.push(a.id);
            return false;
          }
          if (isPurgedPull && (isSimulatedAnswer(a) || isMockAnswerId(a.id))) return false;
          return true;
        });
        if (obsoleteSimIds.length > 0) {
          deleteAnswersFromFirestore(obsoleteSimIds);
        }
        const ansSeen = new Set<string>();
        const mergedAns: Answer[] = [];
        const activeVirtualAns = isPurgedPull ? [] : ALL_VIRTUAL_ANSWERS_SEED;
        for (const rawA of [...rawCleanAns, ...activeVirtualAns]) {
          if (rawA && rawA.id && !deletedAnsIds.has(rawA.id) && !deletedIds.has(rawA.questionId) && !ansSeen.has(rawA.id)) {
            ansSeen.add(rawA.id);
            const seedAns = virtualAnsMap.get(rawA.id);
            mergedAns.push(
              seedAns
                ? {
                    ...rawA,
                    ...seedAns,
                    likes: Math.max(rawA.likes || 0, seedAns.likes || 0),
                    isSimulated: true,
                    simulatedBatchId: SIMULATED_BATCH_ID,
                  }
                : rawA
            );
          }
        }
        setAnswers(mergedAns);
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(mergedAns));
        } catch {}
      }

      // 雲端資料一律合併進本機（私訊與通知有部分只存在本機，取代會讓聊天室消失）；交易紀錄管理員以全站取代
      const isAdminScope = currentUser.role === 'admin';
      if (Array.isArray(cloudData.transactions) && cloudData.transactions.length > 0) {
        const cleanTx = !isDemo ? cloudData.transactions.filter((t) => !isMockTransactionId(t.id)) : cloudData.transactions;
        setTransactions((prev) => (isAdminScope ? cleanTx : mergeServerIntoLocal(prev, cleanTx)));
      }

      if (Array.isArray(cloudData.conversations) && cloudData.conversations.length > 0) {
        const cleanConv = !isDemo ? cloudData.conversations.filter((c) => !isMockConversationId(c.id)) : cloudData.conversations;
        setConversations((prev) => mergeServerIntoLocal(prev, cleanConv));
      }

      if (Array.isArray(cloudData.notifications) && cloudData.notifications.length > 0) {
        const cleanNotifs = cloudData.notifications.filter((n) => !isModeOrEnvNotification(n.title, n.message));
        setNotifications((prev) => mergeServerIntoLocal(prev, cleanNotifs));
      }

      if (cloudData.solvers && cloudData.solvers.length > 0) {
        const cleanSolvers = !isDemo ? cloudData.solvers.filter((s) => !isMockSolverId(s.id) && !isTestAccountUserId(s.id)) : cloudData.solvers;
        setSolvers(cleanSolvers);
      }

      if (cloudData.settings && typeof cloudData.settings.commissionRate === 'number') {
        setCommissionRate(cloudData.settings.commissionRate);
      }

      setLastSyncTime(new Date().toLocaleTimeString('zh-TW'));
      return true;
    } catch (err) {
      console.warn('pullAllDataFromFirestore error:', err);
      return false;
    }
  };

  // Initial check & hydration / initial seed to Firestore + real-time listeners
  useEffect(() => {
    let mounted = true;
    let unsubQuestions: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;

    (async () => {
      try {
        if (mounted) {
          setInitialBootProgress(22);
          setInitialBootStatusText('正在驗證雲端資料庫連線...');
        }
        const connected = await testFirestoreConnection();
        if (mounted) {
          setIsFirestoreConnected(connected);
          setInitialBootProgress(28);
          setInitialBootStatusText('雲端連線就緒，正在同步全站痛點與提案...');
        }

        // Auto purge expired 7-day delisted/deleted questions on startup
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const deletedIds = getDeletedQuestionIds();
        const expiredIdsOnBoot: string[] = [];

        setQuestions((prev) => {
          const seen = new Set<string>();
          const remaining = prev.filter((q) => {
            if (!q || typeof q.id !== 'string' || !q.id.trim() || typeof q.title !== 'string' || !q.title.trim()) return false;
            if (seen.has(q.id)) return false;
            seen.add(q.id);
            if (deletedIds.has(q.id)) return false;
            if (q.status === 'delisted' && q.delistedAt) {
              if (now - new Date(q.delistedAt).getTime() >= SEVEN_DAYS_MS) {
                expiredIdsOnBoot.push(q.id);
                return false;
              }
            }
            return true;
          });
          if (expiredIdsOnBoot.length > 0) {
            deleteQuestionsFromFirestore(expiredIdsOnBoot);
            try {
              const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}permanently_deleted_question_ids`);
              const list: string[] = raw ? JSON.parse(raw) : [];
              expiredIdsOnBoot.forEach((id) => {
                if (!list.includes(id)) list.push(id);
              });
              localStorage.setItem(`${STORAGE_KEY_PREFIX}permanently_deleted_question_ids`, JSON.stringify(list));
            } catch {}
          }
          return remaining;
        });

        const cloudData = await loadAllDataFromFirestore((completedCount, totalCount, stepLabel) => {
          if (!mounted) return;
          const nextPct = Math.min(86, 28 + Math.round((completedCount / totalCount) * 58));
          setInitialBootProgress((prev) => Math.max(prev, nextPct));
          setInitialBootStatusText(stepLabel);
        });
        if (!mounted) return;
        setInitialBootProgress((prev) => Math.max(prev, 88));
        setInitialBootStatusText('正在整合痛點、創新提案與專家解方...');

        if (cloudData && cloudData.settings) {
          if (cloudData.settings.publicMetricsConfig) {
            setPublicMetricsConfig((prev) => {
              const merged = { ...prev, ...cloudData.settings.publicMetricsConfig };
              try {
                localStorage.setItem(`${STORAGE_KEY_PREFIX}public_metrics_config`, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
          if (cloudData.settings.competitionHomepageStatsConfig) {
            try {
              localStorage.setItem('ideax_competition_homepage_stats_config', JSON.stringify(cloudData.settings.competitionHomepageStatsConfig));
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('ideax_competition_stats_config_updated', { detail: cloudData.settings.competitionHomepageStatsConfig }));
              }
            } catch {}
          }
        }

        const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';

        if (cloudData && ((cloudData.questions && cloudData.questions.length > 0) || (cloudData.users && cloudData.users.length > 0))) {
          if (cloudData.users && cloudData.users.length > 0) {
            const repairedCloudUsers = cloudData.users.map((cu) => {
              const repaired = restoreCanonicalUserIdentity(cu);
              // 只修自己的帳號（資料庫規則不允許改別人的資料）
              if (cu.hasCompletedProfile === false && repaired.hasCompletedProfile === true && connected && cu.id === currentUser?.id) {
                syncUserToFirestore(repaired).catch(() => {});
              }
              return repaired;
            });

            const deletedUsers = getDeletedUserIds();
            setAvailableUsers((prevUsers) => {
              const combined = [...(prevUsers || []), ...(cloudData.users || [])];
              const { uniqueUsers, removedIds } = deduplicateUsersList(combined, deletedUsers);
              if (removedIds.length > 0 && connected) {
                deleteUsersFromFirestore(removedIds);
              }
              try {
                localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(uniqueUsers));
                localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(uniqueUsers));
              } catch {}
              return uniqueUsers;
            });
            if (currentUser && currentUser.id && currentUser.id !== 'user-guest') {
              setCurrentUser((prev) => {
                const foundUser = repairedCloudUsers.find((u) => u.id === prev.id || (USER_ALIAS_MAP[prev.id] && u.id === USER_ALIAS_MAP[prev.id]));
                if (foundUser) {
                  const restoredFound = restoreCanonicalUserIdentity({
                    ...foundUser,
                    ...prev,
                    id: prev.id,
                    hasCompletedProfile: Boolean(foundUser.hasCompletedProfile || prev.hasCompletedProfile),
                  });
                  return (restoredFound.id === 'user-admin' || restoredFound.id === 'a000000001' || restoredFound.role === 'admin')
                    ? { ...restoredFound, balance: typeof restoredFound.balance === 'number' && restoredFound.balance > 0 ? restoredFound.balance : 50000 }
                    : restoredFound;
                }
                return restoreCanonicalUserIdentity(prev);
              });
            }
          }
          if (cloudData.questions && cloudData.questions.length > 0) {
            const currentDeleted = getDeletedQuestionIds();
            const isPurgedBoot = localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
            const getRealClicks = (): Record<string, number> => {
              try {
                const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}question_real_clicks`);
                return raw ? JSON.parse(raw) : {};
              } catch {
                return {};
              }
            };
            const realClicks = getRealClicks();
            const questionsNeedingCloudUpdate: Question[] = [];
            const filteredQ = cloudData.questions
              .filter(
                (q) =>
                  Boolean(q && typeof q.id === 'string' && q.id.trim() && typeof q.title === 'string' && q.title.trim()) &&
                  !currentDeleted.has(q.id) &&
                  (isDemo || !isMockQuestionId(q.id, q.authorId)) &&
                  (!isPurgedBoot || (!isSimulatedQuestion(q) && !isMockQuestionId(q.id, q.authorId)))
              )
              .filter((q) => {
                if (q.status === 'delisted' && q.delistedAt) {
                  return now - new Date(q.delistedAt).getTime() < SEVEN_DAYS_MS;
                }
                return true;
              })
              .map((rawQ) => {
                const seedQ = ALL_VIRTUAL_PROPOSALS_SEED.find((sq) => sq.id === rawQ.id) || MOCK_QUESTIONS.find((mq) => mq.id === rawQ.id);
                const hasUserUpdates =
                  Array.isArray(rawQ?.updateLogs) &&
                  rawQ.updateLogs.length > (seedQ?.updateLogs?.length || 0);
                const highestViews = Math.max(
                  typeof rawQ.views === 'number' ? rawQ.views : 0,
                  typeof rawQ.viewsCount === 'number' ? rawQ.viewsCount : 0,
                  typeof realClicks[rawQ.id] === 'number' ? realClicks[rawQ.id] : 0
                );
                const finalQ: Question = {
                  ...rawQ,
                  ...(seedQ && !hasUserUpdates
                    ? {
                        appName: seedQ.appName || rawQ.appName,
                        title: seedQ.title,
                        description: seedQ.description,
                        category: seedQ.category,
                        subcategory: seedQ.subcategory,
                        subcategories: seedQ.subcategories,
                        tags: seedQ.tags,
                        coverImage: seedQ.coverImage || rawQ.coverImage,
                        galleryImages: seedQ.galleryImages || rawQ.galleryImages,
                        demoUrl: seedQ.demoUrl || rawQ.demoUrl,
                        vibeCodingData: seedQ.vibeCodingData || rawQ.vibeCodingData,
                      }
                    : {
                        subcategories: rawQ.subcategories || seedQ?.subcategories,
                      }),
                  views: highestViews,
                  viewsCount: highestViews,
                };
                return finalQ;
              });
            const existingCloudQIds = new Set(filteredQ.map((q) => q.id));
            const isSeedMigratedV8 = localStorage.getItem(`${STORAGE_KEY_PREFIX}db_seed_v8`) === 'true';
            const priorityIds = new Set([
              'q-vp-idea-ideax',
              'q-vp-vibe-ideax',
              'q-vp-vibe-nexsight',
              'q-vp-idea-gosun',
              'q-vp-vibe-gosun',
              'q-vp-idea-deeperdigger',
              'q-vp-vibe-deeperdigger',
              'q-vp-vibe-aiwolf',
              'q-vp-vibe-mazewar',
              'q-vp-idea-pace',
              'q-vp-vibe-pace',
              'q-vp-idea-aiyaya',
              'q-vp-vibe-aiyaya',
              'q-vp-idea-stallmatch',
              'q-vp-vibe-stallmatch',
            ]);
            const missingVirtualForCloud = isPurgedBoot
              ? []
              : ALL_VIRTUAL_PROPOSALS_SEED.filter(
                  (vq) =>
                    !currentDeleted.has(vq.id) &&
                    (!existingCloudQIds.has(vq.id) || (!isSeedMigratedV8 && priorityIds.has(vq.id)))
                );
            if (connected) {
              if (missingVirtualForCloud.length > 0) {
                syncQuestionsToFirestore(missingVirtualForCloud);
                syncUsersToFirestore(VIRTUAL_PERSONA_USERS);
              }
              try {
                localStorage.setItem(`${STORAGE_KEY_PREFIX}db_seed_v8`, 'true');
              } catch {}
            }
            const mergedById = new Map<string, Question>();
            filteredQ.forEach((q) => mergedById.set(q.id, q));
            missingVirtualForCloud.forEach((vq) => mergedById.set(vq.id, vq));
            const finalMergedQ = Array.from(mergedById.values());
            setQuestions(finalMergedQ);
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(finalMergedQ));
            } catch {
              // ignore
            }
          }
          if (cloudData.answers && cloudData.answers.length > 0) {
            const isPurgedBoot = localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
            const deletedAnsIds = getDeletedAnswerIds();
            const currentDeletedQ = getDeletedQuestionIds();
            const virtualAnsMap = new Map(ALL_VIRTUAL_ANSWERS_SEED.map((va) => [va.id, va]));
            const obsoleteSimIds: string[] = [];
            const rawCloudAns = (!isDemo ? cloudData.answers.filter((a) => !isMockAnswerId(a.id)) : cloudData.answers).filter((a) => {
              if (typeof a?.id === 'string' && a.id.startsWith('ans-sim-') && !virtualAnsMap.has(a.id)) {
                obsoleteSimIds.push(a.id);
                return false;
              }
              if (isPurgedBoot && (isSimulatedAnswer(a) || isMockAnswerId(a.id))) return false;
              return true;
            });
            if (obsoleteSimIds.length > 0 && connected) {
              deleteAnswersFromFirestore(obsoleteSimIds);
            }
            const seenAns = new Set<string>();
            const finalAns: Answer[] = [];
            const answersToSync: Answer[] = [];
            const activeVirtualAns = isPurgedBoot ? [] : ALL_VIRTUAL_ANSWERS_SEED;
            const cloudAnsMap = new Map(rawCloudAns.map((ca) => [ca.id, ca]));
            for (const rawA of [...rawCloudAns, ...activeVirtualAns]) {
              if (rawA && rawA.id && !deletedAnsIds.has(rawA.id) && !currentDeletedQ.has(rawA.questionId) && !seenAns.has(rawA.id)) {
                seenAns.add(rawA.id);
                const seedAns = virtualAnsMap.get(rawA.id);
                if (seedAns) {
                  const mergedSimAns: Answer = {
                    ...rawA,
                    ...seedAns,
                    likes: Math.max(rawA.likes || 0, seedAns.likes || 0),
                    isSimulated: true,
                    simulatedBatchId: SIMULATED_BATCH_ID,
                  };
                  finalAns.push(mergedSimAns);
                  const existingCloudA = cloudAnsMap.get(rawA.id);
                  if (!existingCloudA || existingCloudA.freePreview !== mergedSimAns.freePreview || !existingCloudA.isSimulated) {
                    answersToSync.push(mergedSimAns);
                  }
                } else {
                  finalAns.push(rawA);
                }
              }
            }
            if (answersToSync.length > 0 && connected) {
              syncAnswersToFirestore(answersToSync);
            }
            setAnswers(finalAns);
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(finalAns));
            } catch {}
          }
          // 雲端資料一律合併進本機（私訊與通知有部分只存在本機，取代會讓聊天室消失）；交易紀錄管理員以全站取代
          const isAdminBoot = currentUser.role === 'admin';
          if (Array.isArray(cloudData.transactions) && cloudData.transactions.length > 0) {
            const bootTx = !isDemo ? cloudData.transactions.filter((t) => !isMockTransactionId(t.id)) : cloudData.transactions;
            setTransactions((prev) => (isAdminBoot ? bootTx : mergeServerIntoLocal(prev, bootTx)));
          }
          if (Array.isArray(cloudData.conversations) && cloudData.conversations.length > 0) {
            const bootConv = !isDemo ? cloudData.conversations.filter((c) => !isMockConversationId(c.id)) : cloudData.conversations;
            setConversations((prev) => mergeServerIntoLocal(prev, bootConv));
          }
          if (Array.isArray(cloudData.notifications) && cloudData.notifications.length > 0) {
            const bootNotifs = cloudData.notifications.filter((n) => !isModeOrEnvNotification(n.title, n.message));
            setNotifications((prev) => mergeServerIntoLocal(prev, bootNotifs));
          }
          if (cloudData.solvers && cloudData.solvers.length > 0) {
            if (!isDemo) {
              setSolvers(cloudData.solvers.filter((s) => !isMockSolverId(s.id) && !isTestAccountUserId(s.id)));
            } else {
              setSolvers(cloudData.solvers);
            }
          }
          if (cloudData.settings) {
            if (typeof cloudData.settings.commissionRate === 'number') {
              setCommissionRate(cloudData.settings.commissionRate);
            }
          }
          if (mounted) setLastSyncTime(new Date().toLocaleTimeString('zh-TW'));
        } else if (connected) {
          // 若雲端為空，自動執行初次全量雙向種子寫入
          await pushAllDataToFirestore({
            users: availableUsers,
            questions,
            answers,
            transactions,
            conversations,
            notifications,
            bookmarks: { userId: currentUser.id, questionIds: bookmarkedQuestionIds },
            solvers,
            commissionRate,
            plans: Object.values(subscriptionPlans),
            adminDailyGrants,
          });
          if (mounted) setLastSyncTime(new Date().toLocaleTimeString('zh-TW'));
        }

        // Attach real-time snapshot listener for questions
        unsubQuestions = subscribeToQuestions((updatedCloudQuestions) => {
          if (!mounted || !updatedCloudQuestions) return;
          const currentDeleted = getDeletedQuestionIds();
          const isCurrentDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
          const isPurgedSnap = localStorage.getItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`) === 'true';
          const valid = updatedCloudQuestions
            .filter(
              (q) =>
                Boolean(q && typeof q.id === 'string' && q.id.trim() && typeof q.title === 'string' && q.title.trim()) &&
                !currentDeleted.has(q.id) &&
                (isCurrentDemo || !isMockQuestionId(q.id, q.authorId)) &&
                (!isPurgedSnap || (!isSimulatedQuestion(q) && !isMockQuestionId(q.id, q.authorId)))
            )
            .filter((q) => {
              if (q.status === 'delisted' && q.delistedAt) {
                return Date.now() - new Date(q.delistedAt).getTime() < SEVEN_DAYS_MS;
              }
              return true;
            })
            .map((rawQ) => ({
              ...rawQ,
              tags: Array.isArray(rawQ.tags) ? rawQ.tags : [],
            }));
          const seenValid = new Set<string>();
          const finalValid = valid.filter((q) => {
            if (!q || !q.id || seenValid.has(q.id)) return false;
            seenValid.add(q.id);
            return true;
          });
          setQuestions(finalValid);
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(finalValid));
          } catch {}
          setLastSyncTime(new Date().toLocaleTimeString('zh-TW'));
        });

        // Attach real-time snapshot listener for users (同步註銷與反悔猶豫期狀態)
        unsubUsers = subscribeToUsers((updatedCloudUsers) => {
          if (!mounted || !updatedCloudUsers || updatedCloudUsers.length === 0) return;
          setAvailableUsers((prevUsers) => {
            const userMap = new Map<string, User>();
            prevUsers.forEach((u) => userMap.set(u.id, restoreCanonicalUserIdentity(u)));
            updatedCloudUsers.forEach((rawCu) => {
              const cu = restoreCanonicalUserIdentity(rawCu);
              const local = userMap.get(cu.id);
              if (local) {
                // 若本地該用戶處於正常使用（非註銷/已取消猶豫期），雲端不得重新蓋回猶豫期
                const isLocalActive = !local.isDeactivated && !local.deactivationStatus;
                const isCloudDeactivated = Boolean(
                  cu.isDeactivated ||
                  cu.deactivationStatus === 'pending_grace' ||
                  cu.deactivationStatus === 'deactivated'
                );
                const finalDeact = isLocalActive ? false : isCloudDeactivated;

                userMap.set(
                  cu.id,
                  restoreCanonicalUserIdentity({
                    ...cu,
                    ...local,
                    isDeactivated: finalDeact,
                    deactivationStatus: finalDeact ? (cu.deactivationStatus || (cu.isDeactivated ? 'pending_grace' : undefined)) : undefined,
                    deactivationRequestedAt: finalDeact ? cu.deactivationRequestedAt : undefined,
                    deactivationScheduledPurgeAt: finalDeact ? cu.deactivationScheduledPurgeAt : undefined,
                    deactivationReason: finalDeact ? cu.deactivationReason : undefined,
                    // 正式模式：點數以雲端（伺服器帳本）為準
                    ...(realPointsEconomyRef.current
                      ? {
                          balance: typeof cu.balance === 'number' ? cu.balance : local.balance,
                          withheldPoints: typeof cu.withheldPoints === 'number' ? cu.withheldPoints : local.withheldPoints,
                          tipReceivablesPoints: typeof cu.tipReceivablesPoints === 'number' ? cu.tipReceivablesPoints : local.tipReceivablesPoints,
                          thisWeekTipPoints: typeof cu.thisWeekTipPoints === 'number' ? cu.thisWeekTipPoints : local.thisWeekTipPoints,
                        }
                      : {}),
                    // 停權狀態以雲端為準（管理員在其他裝置停權／解除停權時要即時生效）
                    ...('isBlocked' in (rawCu as any)
                      ? {
                          isBlocked: Boolean(cu.isBlocked),
                          blockedReason: cu.blockedReason,
                          blockedUntil: cu.blockedUntil,
                          blockedAt: cu.blockedAt,
                          blockedByAdminName: cu.blockedByAdminName,
                        }
                      : {}),
                  })
                );
              } else {
                userMap.set(cu.id, cu);
              }
            });
            const { uniqueUsers, removedIds } = deduplicateUsersList(
              Array.from(userMap.values()),
              getDeletedUserIds()
            );
            if (removedIds.length > 0) {
              deleteUsersFromFirestore(removedIds);
            }
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(uniqueUsers));
              localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(uniqueUsers));
            } catch {}
            return uniqueUsers;
          });
          setCurrentUser((prev) => (prev && prev.id !== 'user-guest' ? restoreCanonicalUserIdentity(prev) : prev));
          setLastSyncTime(new Date().toLocaleTimeString('zh-TW'));
        });
        if (mounted) {
          setInitialBootProgress((prev) => Math.max(prev, 95));
          setInitialBootStatusText('正在完成版面與即時資料通道初始化...');
        }
      } catch (err) {
        console.warn('Firestore initial boot load:', err);
      } finally {
        if (typeof window !== 'undefined' && document.readyState !== 'complete') {
          if (mounted) {
            setInitialBootStatusText('正在完成頁面資源載入...');
          }
          await new Promise<void>((resolve) => {
            const onWindowLoad = () => {
              window.removeEventListener('load', onWindowLoad);
              resolve();
            };
            window.addEventListener('load', onWindowLoad);
            setTimeout(() => {
              window.removeEventListener('load', onWindowLoad);
              resolve();
            }, 4000);
          });
        }
        if (mounted) {
          setInitialBootProgress(100);
          setInitialBootStatusText('資料載入完成，即刻探索！');
          setIsInitialBootComplete(true);
        }
      }
    })();

    return () => {
      mounted = false;
      if (unsubQuestions) unsubQuestions();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const syncAllToCloud = async () => {
    const result = await pushAllDataToFirestore({
      users: availableUsers,
      questions,
      answers,
      transactions,
      conversations,
      notifications,
      bookmarks: { userId: currentUser.id, questionIds: bookmarkedQuestionIds },
      solvers,
      commissionRate,
      plans: Object.values(subscriptionPlans),
      adminDailyGrants,
    });
    if (result.success) {
      setLastSyncTime(new Date().toLocaleTimeString('zh-TW'));
    }
    return result;
  };

  // Keep selectedQuestion up to date when questions update
  useEffect(() => {
    if (selectedQuestion) {
      const updated = questions.find((q) => q.id === selectedQuestion.id);
      if (
        updated &&
        (updated.title !== selectedQuestion.title ||
          updated.description !== selectedQuestion.description ||
          updated.status !== selectedQuestion.status ||
          updated.answersCount !== selectedQuestion.answersCount ||
          updated.bounty !== selectedQuestion.bounty ||
          updated.views !== selectedQuestion.views ||
          updated.likes !== selectedQuestion.likes ||
          updated.secondedCount !== selectedQuestion.secondedCount ||
          updated.sameQuestionCount !== selectedQuestion.sameQuestionCount ||
          updated.supportPoints !== selectedQuestion.supportPoints)
      ) {
        setSelectedQuestion(updated);
      }
    }
  }, [questions, selectedQuestion?.id]);

  // 登入帳號切換時，自 Firestore 載入該用戶之個人互動清單（收藏、附議、同問、按讚）
  useEffect(() => {
    if (!currentUser?.id || currentUser.id === 'user-guest') return;
    let active = true;
    loadUserInteractionsFromFirestore(currentUser.id).then((cloudInteractions) => {
      if (!active || !cloudInteractions) return;
      const cloudBmIds = (cloudInteractions as any).questionIds || cloudInteractions.bookmarkedQuestionIds;
      if (Array.isArray(cloudBmIds)) {
        setBookmarkedQuestionIds((prev) => {
          const merged = Array.from(new Set([...prev, ...cloudBmIds]));
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}bookmarks`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (Array.isArray(cloudInteractions.secondedQuestionIds)) {
        setSecondedQuestionIds((prev) => {
          const merged = Array.from(new Set([...prev, ...cloudInteractions.secondedQuestionIds!]));
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}seconded_questions`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (Array.isArray(cloudInteractions.sameQuestionIds)) {
        setSameQuestionIds((prev) => {
          const merged = Array.from(new Set([...prev, ...cloudInteractions.sameQuestionIds!]));
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}same_questions`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (Array.isArray(cloudInteractions.likedDiscussionAnswerIds)) {
        setLikedDiscussionAnswerIds((prev) => {
          const merged = Array.from(new Set([...prev, ...cloudInteractions.likedDiscussionAnswerIds!]));
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}liked_discussions`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (Array.isArray(cloudInteractions.likedQuestionIds)) {
        setLikedQuestionIds((prev) => {
          const merged = Array.from(new Set([...prev, ...cloudInteractions.likedQuestionIds!]));
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}liked_questions`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  const [subscriptionPlans, setSubscriptionPlans] = useState<Record<SubscriptionTier, SubscriptionPlan>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}plans`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed.authority?.monthlyPrice === 599 &&
          parsed.authority?.platformFeeRate === 0.05 &&
          parsed.master?.monthlyPrice === 1980 &&
          parsed.master?.platformFeeRate === 0.02 &&
          (parsed.expert?.monthlyPrice === 299 || parsed.pro?.monthlyPrice === 299)
        ) {
          return parsed;
        }
      } catch {}
    }
    return SUBSCRIPTION_PLANS;
  });

  const updateSubscriptionPlan = (tier: SubscriptionTier, monthlyPrice: number, rebatePercent: number, customBaseRate?: number) => {
    const base = typeof customBaseRate === 'number' ? customBaseRate : commissionRate;
    setSubscriptionPlans((prev) => {
      const existing = prev[tier] || SUBSCRIPTION_PLANS[tier];
      const effectiveRate = base - rebatePercent / 100;
      const effectivePercent = Math.round(base * 100 - rebatePercent);
      const sellerPayoutPercent = 100 - effectivePercent;

      let feeDiscountText = `服務費 -${rebatePercent}%（實抽 ${effectivePercent}%）`;
      let sellerPayoutText = `${sellerPayoutPercent}%`;
      let effectiveRateText = `${effectivePercent}%`;

      if (effectivePercent < 0) {
        const bonus = Math.abs(effectivePercent);
        feeDiscountText = `免服務費 + 額外回饋 ${bonus}% BONUS`;
        sellerPayoutText = `${sellerPayoutPercent}%`;
        effectiveRateText = `+${bonus}% BONUS`;
      } else if (effectivePercent === 0) {
        feeDiscountText = `服務費 -${rebatePercent}%（免服務費）`;
        sellerPayoutText = '100%';
        effectiveRateText = '0%';
      } else if (rebatePercent === 0) {
        feeDiscountText = `標準 ${effectivePercent}% 服務費`;
        sellerPayoutText = `${sellerPayoutPercent}%`;
        effectiveRateText = `${effectivePercent}%`;
      }

      // Dynamic billing cycles and pricingText if monthlyPrice changed
      let pricingText = existing.pricingText;
      let billingCycles = existing.billingCycles ? [...existing.billingCycles] : [];
      if (tier === 'expert' || tier === 'pro') {
        pricingText = `6 個月 $${monthlyPrice * 6 || 1499}（$${monthlyPrice || 249}/月）`;
        if (billingCycles.length > 0) {
          billingCycles[0] = { ...billingCycles[0], price: monthlyPrice * 6, savingsText: `約 $${monthlyPrice}/月` };
        }
      } else if (tier === 'authority') {
        pricingText = `$${monthlyPrice}/月 或 $${monthlyPrice * 10}/年`;
        if (billingCycles.length > 0) {
          billingCycles[0] = { ...billingCycles[0], price: monthlyPrice, label: `月繳 NT$ ${monthlyPrice}/月` };
        }
        if (billingCycles.length > 1) {
          billingCycles[1] = { ...billingCycles[1], price: monthlyPrice * 10, label: `年繳 NT$ ${monthlyPrice * 10}/年` };
        }
      } else if (tier === 'master') {
        pricingText = `$${monthlyPrice}/月 或 $${monthlyPrice * 10}/年`;
        if (billingCycles.length > 0) {
          billingCycles[0] = { ...billingCycles[0], price: monthlyPrice, label: `月繳 NT$ ${monthlyPrice}/月` };
        }
        if (billingCycles.length > 1) {
          billingCycles[1] = { ...billingCycles[1], price: monthlyPrice * 10, label: `年繳 NT$ ${monthlyPrice * 10}/年` };
        }
      }

      const updated: Record<SubscriptionTier, SubscriptionPlan> = {
        ...prev,
        [tier]: {
          ...existing,
          monthlyPrice,
          rebatePercent,
          platformFeeRate: effectiveRate,
          sellerPayoutRate: sellerPayoutPercent / 100,
          sellerPayoutText,
          feeDiscountText,
          effectiveRateText,
          pricingText,
          billingCycles,
        },
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}plans`, JSON.stringify(updated));
      return updated;
    });
  };

  const updateSubscriptionPlanFull = (tier: SubscriptionTier, updatedData: Partial<SubscriptionPlan>) => {
    setSubscriptionPlans((prev) => {
      const existing = prev[tier] || SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS] || {
        id: tier,
        name: String(tier),
        pricingText: '',
        monthlyPrice: 0,
        billingCycles: [{ cycle: 'monthly', price: 0, label: '月繳', durationMonths: 1 }],
        platformFeeRate: 0.10,
        feeDiscountText: '標準 10%',
        sellerPayoutRate: 0.90,
        sellerPayoutText: '90%',
        effectiveRateText: '10%',
        rebatePercent: 0,
        badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
        tagline: '',
        benefits: [],
      };
      const updated: Record<SubscriptionTier, SubscriptionPlan> = {
        ...prev,
        [tier]: {
          ...existing,
          ...updatedData,
        },
      };
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}plans`, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const addSubscriptionPlan = (newPlan: SubscriptionPlan): { success: boolean; message: string } => {
    if (!newPlan.id || !newPlan.name) {
      return { success: false, message: '方案代號與名稱不可為空' };
    }
    setSubscriptionPlans((prev) => {
      const updated = {
        ...prev,
        [newPlan.id]: newPlan,
      };
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}plans`, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    return { success: true, message: `已成功新增方案「${newPlan.name}」！` };
  };

  const deleteSubscriptionPlan = (tierId: string): { success: boolean; message: string } => {
    if (tierId === 'free') {
      return { success: false, message: '一般會員 (Free) 為系統預設基礎方案，不可刪除。' };
    }
    setSubscriptionPlans((prev) => {
      const updated = { ...prev };
      delete updated[tierId as SubscriptionTier];
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}plans`, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    return { success: true, message: '方案已成功刪除！' };
  };

  const blockUser = (userId: string, duration: number | 'permanent', reason: string): { success: boolean; message: string } => {
    const userToBlock = availableUsers.find((u) => u.id === userId);
    if (!userToBlock) return { success: false, message: '找不到該用戶' };

    const nowIso = new Date().toISOString();
    const untilIso = duration === 'permanent' ? 'permanent' : new Date(Date.now() + duration * 86400000).toISOString();
    const durationText = duration === 'permanent' ? '永久封鎖' : `${duration} 天（至 ${new Date(Date.now() + duration * 86400000).toLocaleDateString()}）`;

    const updatedUser: User = {
      ...userToBlock,
      isBlocked: true,
      blockedReason: reason,
      blockedAt: nowIso,
      blockedUntil: untilIso,
      blockedByAdminName: currentUser.name || '平台管理員',
    };

    setAvailableUsers((prev) => {
      const next = prev.map((u) => (u.id === userId ? updatedUser : u));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (currentUser.id === userId) {
      setCurrentUser(updatedUser);
    }
    // 寫入雲端：對方的裝置會即時收到並被登出，之後也無法登入
    void syncUserToFirestore(updatedUser);
    void sendAccountNoticeEmail({
      email: userToBlock.email,
      name: userToBlock.name,
      kind: 'blocked',
      reason,
      untilText: describeBlockUntil(untilIso),
    });

    // 發送平台通知 (系統通知，送到被封鎖的用戶)
    const blockNotification: NotificationItem = {
      id: `notif-block-${Date.now()}`,
      userId,
      category: 'system',
      title: '⚠️ 帳號封鎖通知',
      message: `您的帳號已被管理員【${currentUser.name || '平台管理員'}】執行停權封鎖。封鎖期限：【${durationText}】，封鎖理由：【${reason}】。在封鎖期間內您將無法發布問題、提交方案、發送私聊或進行交易。如有疑問請聯絡客服。`,
      type: 'system',
      createdAt: nowIso,
      read: false,
    };

    setNotifications((prev) => [blockNotification, ...prev]);

    return {
      success: true,
      message: `已成功封鎖用戶「${userToBlock.name}」，期限：${durationText}。對方會被登出且無法再登入，並會收到平台通知與 Email。`,
    };
  };

  const unblockUser = (userId: string): { success: boolean; message: string } => {
    const userToUnblock = availableUsers.find((u) => u.id === userId);
    if (!userToUnblock) return { success: false, message: '找不到該用戶' };

    const nowIso = new Date().toISOString();
    const updatedUser: User = {
      ...userToUnblock,
      isBlocked: false,
      blockedReason: undefined,
      blockedAt: undefined,
      blockedUntil: undefined,
      blockedByAdminName: undefined,
    };

    setAvailableUsers((prev) => {
      const next = prev.map((u) => (u.id === userId ? updatedUser : u));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (currentUser.id === userId) {
      setCurrentUser(updatedUser);
    }
    void syncUserToFirestore(updatedUser);
    void sendAccountNoticeEmail({ email: userToUnblock.email, name: userToUnblock.name, kind: 'unblocked' });

    const unblockNotification: NotificationItem = {
      id: `notif-unblock-${Date.now()}`,
      userId,
      category: 'system',
      title: '🎉 帳號已解除封鎖',
      message: `您的帳號已被管理員【${currentUser.name || '平台管理員'}】解除封鎖，已恢復所有平台正常操作功能。`,
      type: 'system',
      createdAt: nowIso,
      read: false,
    };

    setNotifications((prev) => [unblockNotification, ...prev]);

    return {
      success: true,
      message: `已成功解封用戶「${userToUnblock.name}」，並已透過平台通知通知該用戶！`,
    };
  };

  const adminUpdateUserVerification = (
    userId: string,
    type: 'real_name' | 'expert',
    action: 'approve' | 'revoke',
    notes?: string,
    approvedDomains?: string[]
  ): { success: boolean; message: string } => {
    const targetUser = availableUsers.find((u) => u.id === userId);
    if (!targetUser) return { success: false, message: '找不到該用戶' };

    const nowIso = new Date().toISOString();
    let updatedUser: User = { ...targetUser };
    let notifTitle = '';
    let notifMsg = '';
    let auditAction = '';

    if (type === 'real_name') {
      if (action === 'approve') {
        updatedUser = {
          ...updatedUser,
          realNameAuthStatus: 'verified',
          realNameAuthData: {
            legalName: targetUser.realNameAuthData?.legalName || targetUser.name,
            idNumber: targetUser.realNameAuthData?.idNumber || 'A123456789',
            nationality: targetUser.realNameAuthData?.nationality || '中華民國',
            birthDate: targetUser.realNameAuthData?.birthDate || '1990-01-01',
            phoneNumber: targetUser.realNameAuthData?.phoneNumber || '0912-345-678',
            email: targetUser.realNameAuthData?.email || targetUser.email || 'user@ideax.io',
            verifiedAt: nowIso,
            agreedAmlPolicy: true,
            ...(targetUser.realNameAuthData || {}),
          },
          bankAccount: targetUser.bankAccount
            ? { ...targetUser.bankAccount, isVerified: true }
            : undefined,
        };
        notifTitle = '🎉 實名認證審核通過！';
        notifMsg = `恭喜您！您的帳號已由管理員【${currentUser.name || '平台管理員'}】完成實名認證審查，現已具備第三方價金保管提領與官方認證徽章！${notes ? `（備註：${notes}）` : ''}`;
        auditAction = 'APPROVE_REAL_NAME_KYC';
      } else {
        // revoke
        updatedUser = {
          ...updatedUser,
          realNameAuthStatus: 'none',
          bankAccount: targetUser.bankAccount
            ? { ...targetUser.bankAccount, isVerified: false }
            : undefined,
        };
        notifTitle = '⚠️ 實名認證資格異動通知';
        notifMsg = `您的實名認證資格已被管理員【${currentUser.name || '平台管理員'}】取消。${notes ? `理由：${notes}` : '如有疑問請洽詢官方客服。'}`;
        auditAction = 'REVOKE_REAL_NAME_KYC';
      }
    } else {
      // expert certification
      if (action === 'approve') {
        const finalDomains = (approvedDomains && approvedDomains.length > 0)
          ? approvedDomains
          : (targetUser.expertApplicationData?.domains || (targetUser.domain ? [targetUser.domain] : ['創新創業']));
        const primaryDomain = (finalDomains[0] || targetUser.domain || '創新創業') as Category;

        updatedUser = {
          ...updatedUser,
          verifiedExpert: true,
          expertApplicationStatus: 'approved',
          domain: primaryDomain,
          domains: finalDomains as Category[],
          verifiedBadge: updatedUser.verifiedBadge || '官方認證智庫專家',
        };
        // Also update solvers list if exists
        setSolvers((prev) =>
          prev.map((s) => (s.id === userId || s.userId === userId ? { ...s, verified: true, domain: primaryDomain, domains: finalDomains as Category[] } : s))
        );
        notifTitle = '👑 專家認證審核通過！';
        notifMsg = `恭喜您！您的智庫專家資格（認證領域：${finalDomains.join('、')}）已由管理員【${currentUser.name || '平台管理員'}】審核通過，已獲得官方專屬專家認證徽章與優先推薦曝光！${notes ? `（備註：${notes}）` : ''}`;
        auditAction = 'APPROVE_EXPERT_CERTIFICATION';
      } else {
        // revoke
        updatedUser = {
          ...updatedUser,
          verifiedExpert: false,
          expertApplicationStatus: 'none',
        };
        // Also update solvers list if exists
        setSolvers((prev) =>
          prev.map((s) => (s.id === userId || s.userId === userId ? { ...s, verified: false } : s))
        );
        notifTitle = '⚠️ 專家認證資格異動通知';
        notifMsg = `您的官方認證專家資格已被管理員【${currentUser.name || '平台管理員'}】取消。${notes ? `理由：${notes}` : '如有疑問請洽詢官方客服。'}`;
        auditAction = 'REVOKE_EXPERT_CERTIFICATION';
      }
    }

    setAvailableUsers((prev) => {
      const next = prev.map((u) => (u.id === userId ? updatedUser : u));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (currentUser.id === userId) {
      setCurrentUser(updatedUser);
    }

    // Sync to Firestore
    syncUserToFirestore(updatedUser);

    // Audit log
    syncAuditLogsToFirestore([
      {
        id: `audit-cert-${Date.now()}`,
        adminId: currentUser.id,
        action: auditAction,
        targetUserId: userId,
        details: { targetUserName: targetUser.name, notes: notes || null, type, action },
        createdAt: nowIso,
      },
    ]);

    // Send notification
    const certNotification: NotificationItem = {
      id: `notif-cert-${Date.now()}`,
      title: notifTitle,
      message: notifMsg,
      type: 'system',
      createdAt: nowIso,
      read: false,
    };
    setNotifications((prev) => [certNotification, ...prev]);

    const actionText = action === 'approve' ? '通過' : '移除資格';
    const typeText = type === 'real_name' ? '實名認證' : '專家認證';
    return {
      success: true,
      message: `已成功將用戶「${targetUser.name}」之【${typeText}】狀態更新為【${actionText}】，並已同步發送系統通知至該用戶帳號！`,
    };
  };

  // 雙站管理員權限指派系統：僅初始管理員擁有指派權力，兩站分開授權
  const grantUserAdminRole = (
    targetUserId: string,
    sites: AdminSite[]
  ): { success: boolean; message: string; updatedUser?: User } => {
    if (!isInitialAdmin(currentUser)) {
      return {
        success: false,
        message: '權限不足！僅平台初始創始管理員（最高主管）具備賦予或調整其他用戶管理員權限之特權。',
      };
    }

    const targetUser = availableUsers.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, message: '找不到目標用戶' };
    }

    if (isInitialAdmin(targetUser)) {
      return {
        success: false,
        message: '平台初始創始管理員具備永久最高統轄權限，無法變更或降級。',
      };
    }

    const nowIso = new Date().toISOString();
    const oldUserId = targetUser.id;
    const oldMemberId = targetUser.memberId || targetUser.id;
    let newUserId = oldUserId;
    let newMemberId = oldMemberId;

    let updatedUser: User;
    let notifTitle = '';
    let notifMsg = '';
    let auditAction = '';

    if (sites.length === 0) {
      // 撤銷管理員身分，轉為一般用戶（提問者或維持專家）
      // 若原 memberId 首字為 a，轉回 c 規範
      if (oldMemberId.startsWith('a') && oldMemberId.length === 10) {
        newMemberId = 'c' + oldMemberId.slice(1);
      } else {
        newMemberId = getFormattedPlatformId({
          ...targetUser,
          role: targetUser.verifiedExpert ? 'solver' : 'questioner',
          accountType: 'user',
        });
      }

      // 若原 id 首字為 a 且為 10 碼標準 ID，同步更新 id 為 c 開頭
      if (oldUserId.startsWith('a') && oldUserId.length === 10 && oldUserId !== 'a000000001' && oldUserId !== 'user-admin') {
        newUserId = 'c' + oldUserId.slice(1);
      }

      updatedUser = {
        ...targetUser,
        id: newUserId,
        memberId: newMemberId,
        role: targetUser.verifiedExpert ? 'solver' : 'questioner',
        accountType: 'user',
        adminSites: [],
        title: targetUser.title?.replace(/管理員/g, '創友') || (targetUser.verifiedExpert ? '認證專家' : '一般會員用戶'),
      };
      notifTitle = '🛡️ 管理員身分已撤銷通知';
      notifMsg = `您在 IdeaX 平台的管理員權限已由初始管理員【${currentUser.name || '平台總管'}】撤銷，身分已調整為一般會員（會員代碼: ${newMemberId}）。如有疑問請向初始管理員洽詢。`;
      auditAction = 'REVOKE_ADMIN_ROLE';
    } else {
      // 賦予指定站點之管理員權限
      const isSiteA = sites.includes('site_a');
      const isSiteB = sites.includes('site_b');
      const siteDescription =
        isSiteA && isSiteB
          ? '雙站全權管理員（A 站 IdeaX 主站 ＋ B 站 創星季賽事專區）'
          : isSiteA
          ? 'A 站專屬管理員（IdeaX 創點子主站）'
          : 'B 站專屬管理員（創星季賽事專區）';

      // 若原 memberId 首字為 c，轉換為 a 規範
      if (oldMemberId.startsWith('c') && oldMemberId.length === 10) {
        newMemberId = 'a' + oldMemberId.slice(1);
      } else {
        newMemberId = getFormattedPlatformId({
          ...targetUser,
          role: 'admin',
          accountType: 'admin',
        });
      }

      // 若原 id 首字為 c 且為 10 碼標準 ID，同步更新 id 為 a 開頭
      if (oldUserId.startsWith('c') && oldUserId.length === 10) {
        newUserId = 'a' + oldUserId.slice(1);
      }

      updatedUser = {
        ...targetUser,
        id: newUserId,
        memberId: newMemberId,
        role: 'admin',
        accountType: 'admin',
        adminSites: sites,
        title: targetUser.title || (isSiteA && isSiteB ? '雙站管理員' : isSiteA ? '主站管理員' : '賽事管理員'),
      };
      notifTitle = '👑 您已被任命為平台管理員！';
      notifMsg = `恭喜您！您已由初始管理員【${currentUser.name || '平台總管'}】指派為【${siteDescription}】（管理員代碼: ${newMemberId}）。兩站後台管理權限相互獨立，請恪守平台治理守則！`;
      auditAction = 'GRANT_ADMIN_ROLE';
    }

    const isIdChanged = oldUserId !== newUserId;

    // 1. 更新 availableUsers 清單
    setAvailableUsers((prev) => {
      const next = prev.map((u) => (u.id === oldUserId ? updatedUser : u));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 2. 若為目前登入者，更新 currentUser
    if (currentUser.id === oldUserId) {
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(updatedUser));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updatedUser));
      } catch (e) {}
    }

    // 3. 若 ID 有變更，更新相依關聯（提問、解答、交易流水）之 ID
    if (isIdChanged) {
      setQuestions((prev) => {
        const next = prev.map((q) =>
          q.authorId === oldUserId ? { ...q, authorId: newUserId, authorName: updatedUser.name } : q
        );
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(next));
        } catch {}
        return next;
      });

      setAnswers((prev) => {
        const next = prev.map((a) =>
          a.solverId === oldUserId ? { ...a, solverId: newUserId, solverName: updatedUser.name } : a
        );
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(next));
        } catch {}
        return next;
      });

      setTransactions((prev) => {
        const next = prev.map((t) => ({
          ...t,
          fromUserId: t.fromUserId === oldUserId ? newUserId : t.fromUserId,
          toUserId: t.toUserId === oldUserId ? newUserId : t.toUserId,
          solverId: t.solverId === oldUserId ? newUserId : t.solverId,
        }));
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}transactions`, JSON.stringify(next));
        } catch {}
        return next;
      });

      // 資料庫執行舊 ID 文件刪除與新 ID 文件遷移
      migrateUserInFirestore(oldUserId, updatedUser);
    } else {
      // ID 未變更，直接將身分標記寫入 Firestore
      syncUserToFirestore(updatedUser);
    }

    // 4. 寫入管理員授權稽核紀錄
    syncAuditLogsToFirestore([
      {
        id: `audit-admin-role-${Date.now()}`,
        adminId: currentUser.id,
        action: auditAction,
        targetUserId: newUserId,
        details: {
          targetUserName: targetUser.name,
          previousId: oldUserId,
          newId: newUserId,
          previousMemberId: oldMemberId,
          newMemberId: newMemberId,
          previousRole: targetUser.role,
          previousSites: targetUser.adminSites || [],
          newRole: updatedUser.role,
          newSites: updatedUser.adminSites || [],
        },
        createdAt: nowIso,
      },
    ]);

    // 5. 系統通知派送
    const adminRoleNotification: NotificationItem = {
      id: `notif-admin-role-${Date.now()}`,
      title: notifTitle,
      message: notifMsg,
      type: 'system',
      createdAt: nowIso,
      read: false,
    };
    setNotifications((prev) => [adminRoleNotification, ...prev]);

    const actionText = sites.length === 0 ? '已成功撤銷管理員身分' : '已成功更新管理員權限';
    const idChangeText = isIdChanged ? `（ID 已自動更新：${oldUserId} → ${newUserId}）` : '';
    return {
      success: true,
      message: `${actionText}【${targetUser.name}】！${idChangeText}資料庫身分標記已確實更新並即時生效。`,
      updatedUser,
    };
  };

  const DAILY_ADMIN_GRANT_QUOTA = 50000;

  // Track daily grant usage by adminId -> { date: string; used: number }
  const [adminDailyGrants, setAdminDailyGrants] = useState<Record<string, { date: string; used: number }>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}admin_daily_grants`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const getAdminTodayDateStr = () => {
    try {
      return new Date().toLocaleDateString('en-CA');
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const getAdminRemainingDailyQuota = (adminId?: string): number => {
    const aid = adminId || currentUser.id || 'user-admin';
    const today = getAdminTodayDateStr();
    const record = adminDailyGrants[aid];
    if (!record || record.date !== today) {
      return DAILY_ADMIN_GRANT_QUOTA;
    }
    return Math.max(0, DAILY_ADMIN_GRANT_QUOTA - (record.used || 0));
  };

  const adminTransferPoints = (
    targetUserId: string,
    points: number,
    reason: string
  ): { success: boolean; message: string; remainingQuota?: number } => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: '操作失敗：僅限平台管理員身份執行點數轉入作業！' };
    }

    const cleanPoints = Math.floor(Number(points));
    if (!cleanPoints || cleanPoints <= 0 || isNaN(cleanPoints)) {
      return { success: false, message: '請輸入有效的正整數點數！' };
    }

    const remaining = getAdminRemainingDailyQuota(currentUser.id);
    if (cleanPoints > remaining) {
      return {
        success: false,
        message: `轉入失敗：超出今日轉入上限！您今日剩餘配額為 ${remaining.toLocaleString()} 點（每日上限 50,000 點）。`,
        remainingQuota: remaining,
      };
    }

    const target = availableUsers.find((u) => u.id === targetUserId);
    if (!target) {
      return { success: false, message: '查無此目標受款用戶！' };
    }

    const cleanReason = (reason || '').trim() || '官方管理團隊獎勵撥款';

    // 1. Update target user balance
    const newTargetBalance = (target.balance || 0) + cleanPoints;
    const updatedUser: User = {
      ...target,
      balance: newTargetBalance,
    };

    setAvailableUsers((prev) => {
      const next = prev.map((u) => (u.id === targetUserId ? updatedUser : u));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (currentUser.id === targetUserId) {
      setCurrentUser(updatedUser);
    }

    // 2. Update Admin Daily Quota
    const today = getAdminTodayDateStr();
    const aid = currentUser.id || 'user-admin';
    const prevUsed = adminDailyGrants[aid]?.date === today ? (adminDailyGrants[aid]?.used || 0) : 0;
    const newUsed = prevUsed + cleanPoints;
    const updatedGrants = {
      ...adminDailyGrants,
      [aid]: {
        date: today,
        used: newUsed,
      },
    };
    setAdminDailyGrants(updatedGrants);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}admin_daily_grants`, JSON.stringify(updatedGrants));
    } catch (e) {}

    // Update admin currentUser balance to match remaining quota
    const newRemainingQuota = Math.max(0, DAILY_ADMIN_GRANT_QUOTA - newUsed);
    setCurrentUser((prev) => ({
      ...prev,
      balance: newRemainingQuota,
    }));

    // 3. Create Immutable Ledger / Transaction Log
    const auditTx: Transaction = {
      id: `tx-admin-grant-${Date.now()}`,
      type: '管理員轉入點數',
      amount: cleanPoints,
      platformFee: 0,
      netAmount: cleanPoints,
      fromUserName: `官方管理團隊（${currentUser.name}）`,
      toUserName: target.name,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `【管理員點數轉入】由管理員「${currentUser.name}」轉入 +${cleanPoints.toLocaleString()} 點至「${target.name}」。（事由：${cleanReason}｜當日配額已使用 ${newUsed.toLocaleString()} / 50,000 點）`,
    };
    setTransactions((prev) => [auditTx, ...prev]);

    // 4. Send In-App Notification to Target User
    const notif: NotificationItem = {
      id: `notif-grant-${Date.now()}`,
      title: '🎁 官方管理團隊轉入點數通知',
      message: `官方管理團隊（${currentUser.name}）已向您的帳戶轉入 +${cleanPoints.toLocaleString()} 點！事由：${cleanReason}。您目前的可用點數餘額為 NT$ ${newTargetBalance.toLocaleString()}。`,
      type: 'system',
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);

    const newRemaining = Math.max(0, DAILY_ADMIN_GRANT_QUOTA - newUsed);
    return {
      success: true,
      message: `🎉 成功轉入 ${cleanPoints.toLocaleString()} 點至「${target.name}」！您今日剩餘可轉額度為 ${newRemaining.toLocaleString()} 點。`,
      remainingQuota: newRemaining,
    };
  };

  // 管理者點數每日歸零並重製
  const adminResetDailyPoints = (): { success: boolean; message: string } => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: '僅限管理員執行點數重置操作！' };
    }

    const today = getAdminTodayDateStr();
    // 1. 歸零已轉出紀錄，恢復每日配額 50,000 點
    const updatedGrants = {
      ...adminDailyGrants,
      [currentUser.id]: {
        date: today,
        used: 0,
      },
    };
    setAdminDailyGrants(updatedGrants);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}admin_daily_grants`, JSON.stringify(updatedGrants));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}admin_last_reset_date`, today);
    } catch {}

    // 2. 將管理員個人點數餘額歸零（管理者點數每日歸零重製）
    setCurrentUser((prev) => {
      if (prev.role === 'admin') {
        const resetAdmin = { ...prev, balance: 0 };
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(resetAdmin));
        } catch {}
        return resetAdmin;
      }
      return prev;
    });

    setAvailableUsers((prev) => {
      const next = prev.map((u) => (u.id === currentUser.id ? { ...u, balance: 0 } : u));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
      } catch {}
      return next;
    });

    return {
      success: true,
      message: `已成功將管理者點數餘額歸零，並重製今日轉發配額為 ${DAILY_ADMIN_GRANT_QUOTA.toLocaleString()} 點！`,
    };
  };

  // 自動檢查跨日管理者點數歸零與配額重製
  useEffect(() => {
    const today = getAdminTodayDateStr();
    const lastResetDate = localStorage.getItem(`${STORAGE_KEY_PREFIX}admin_last_reset_date`);
    if (lastResetDate !== today) {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}admin_last_reset_date`, today);
        setAdminDailyGrants({});
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}admin_daily_grants`);
      } catch {}

      if (currentUser?.role === 'admin' && (currentUser.balance || 0) > 0) {
        setCurrentUser((prev) => {
          if (prev.role === 'admin') {
            const updated = { ...prev, balance: 0 };
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(updated));
            } catch {}
            return updated;
          }
          return prev;
        });
      }
    }
  }, [currentUser?.role]);

  const adjustUserBalance = (userId: string, deltaPoints: number, reason: string): boolean => {
    const target = availableUsers.find((u) => u.id === userId);
    if (!target) return false;

    const newBalance = Math.max(0, (target.balance || 0) + deltaPoints);
    const updatedUser: User = {
      ...target,
      balance: newBalance,
    };

    setAvailableUsers((prev) => {
      const next = prev.map((u) => (u.id === userId ? updatedUser : u));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (currentUser.id === userId) {
      setCurrentUser(updatedUser);
    }

    const auditTx: Transaction = {
      id: `tx-admin-adj-${Date.now()}`,
      type: deltaPoints >= 0 ? '管理員轉入點數' : '點數扣抵',
      amount: Math.abs(deltaPoints),
      platformFee: 0,
      netAmount: Math.abs(deltaPoints),
      fromUserName: deltaPoints >= 0 ? `平台管理員（${currentUser.name}）` : target.name,
      toUserName: deltaPoints >= 0 ? target.name : `平台管理員（${currentUser.name}）`,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `管理員手動調整點數：${deltaPoints >= 0 ? `+${deltaPoints}` : `${deltaPoints}`} 點。理由：${reason}`,
    };
    setTransactions((prev) => [auditTx, ...prev]);

    const notif: NotificationItem = {
      id: `notif-adj-${Date.now()}`,
      title: '點數帳戶異動通知',
      message: `管理員已為您的帳戶調整點數：${deltaPoints >= 0 ? `+${deltaPoints}` : `${deltaPoints}`} 點。原因：${reason}。目前可用點數：${newBalance.toLocaleString()} 點。`,
      type: 'system',
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);

    return true;
  };

  // 提痛點獲得讀者打賞支持（存在點數收支 > 應收帳款，每週結算一次）
  const tipPainPoint = (questionId: string, amount: number, message?: string, paymentSource: 'wallet' | 'direct' = 'wallet'): { success: boolean; message: string } => {
    if (!currentUser || currentUser.id === 'guest' || currentUser.id === 'user-guest') {
      return { success: false, message: '請先登入帳號後再進行支持！' };
    }
    const cleanAmount = Math.max(0, Math.floor(amount));
    if (cleanAmount <= 0) {
      return { success: false, message: '支持數額必須大於 0！' };
    }
    const effectiveBalance = isRaceMode
      ? Math.max(currentUser.balance || 0, 10000)
      : (currentUser.balance || 0);
    if ((isRaceMode || paymentSource === 'wallet') && effectiveBalance < cleanAmount) {
      const unit = isRaceMode ? '創星幣' : '點';
      return { success: false, message: `${unit}餘額不足！您目前有 ${effectiveBalance.toLocaleString()} ${unit}，需 ${cleanAmount.toLocaleString()} ${unit}。` };
    }

    const q = questions.find((item) => item.id === questionId);
    if (!q) {
      return { success: false, message: '找不到目標題目或作品！' };
    }
    if (!isRaceMode && q.authorId === currentUser.id) {
      return { success: false, message: '正式模式下無法打賞給自己發布的貼文！' };
    }

    const tipId = `tip-${Date.now()}`;
    const tipRecord = {
      id: tipId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      amount: cleanAmount,
      message: message?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    // 1. 扣除打賞者（讀者）點數餘額（若為線上支付則不扣點數餘額）
    const newReaderBalance = (!isRaceMode && paymentSource === 'direct')
      ? (currentUser.balance || 0)
      : Math.max(0, effectiveBalance - cleanAmount);
    const updatedReader = { ...currentUser, balance: newReaderBalance };
    setCurrentUser(updatedReader);
    if (paymentSource === 'wallet') {
      runPointsOp({ op: 'spend', amount: cleanAmount, purpose: 'tip', refId: questionId, toUserId: q.authorId }, '打賞未完成');
    }
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updatedReader));
    } catch (e) {}

    // 2. 更新問題題目上的打賞總額與明細並同步至 Firestore
    setQuestions((prev) => {
      let syncedQ: Question | null = null;
      const nextList = prev.map((item) => {
        if (item.id === questionId) {
          const prevHistory = item.tipsHistory || [];
          const updatedItem: Question = {
            ...item,
            supportPoints: (item.supportPoints || 0) + cleanAmount,
            tippersCount: (item.tippersCount || prevHistory.length) + 1,
            tipsHistory: [tipRecord, ...prevHistory],
          };
          syncedQ = updatedItem;
          return updatedItem;
        }
        return item;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(nextList));
      } catch {}
      if (syncedQ) {
        syncQuestionToFirestore(syncedQ);
      }
      return nextList;
    });

    // 同步將支持過的作品/痛點收錄至「我的按讚收藏」
    setBookmarkedQuestionIds((prev) => {
      if (!prev.includes(questionId)) {
        const nextBm = [...prev, questionId];
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}bookmarks`, JSON.stringify(nextBm));
        } catch {}
        if (currentUser?.id && currentUser.id !== 'user-guest') {
          syncBookmarksToFirestore(currentUser.id, nextBm);
        }
        return nextBm;
      }
      return prev;
    });

    // 3. 撥入提案者（作者）的【點數收支 > 應收帳款】（而非直接存為錢包可用點數）
    const author = availableUsers.find((u) => u.id === q.authorId);
    const authorName = author?.name || q.authorName || '提案者';

    setAvailableUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          return { ...u, balance: newReaderBalance };
        }
        if (u.id === q.authorId) {
          const currentTipReceivables = u.tipReceivablesPoints || 0;
          const currentThisWeekTip = u.thisWeekTipPoints || 0;
          const newTipReceivables = currentTipReceivables + cleanAmount;
          const newThisWeekTip = currentThisWeekTip + cleanAmount;
          return {
            ...u,
            tipReceivablesPoints: newTipReceivables,
            thisWeekTipPoints: newThisWeekTip,
          };
        }
        return u;
      })
    );

    // 4. 寫入雙方交易與帳務流水
    const readerTx: Transaction = {
      id: `tx-tip-out-${Date.now()}`,
      type: '痛點讀者打賞',
      amount: cleanAmount,
      platformFee: 0,
      netAmount: cleanAmount,
      fromUserName: currentUser.name,
      fromUserId: currentUser.id,
      toUserName: authorName,
      toUserId: q.authorId,
      relatedQuestionTitle: q.title,
      relatedQuestionId: q.id,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `【痛點打賞支持】讀者贊助《${q.title}》${cleanAmount} 點支持金。${message ? `寄語：${message}` : ''}`,
    };

    const authorPlatformFee = Math.round(cleanAmount * 0.10); // 10% 預扣手續費估計
    const authorTx: Transaction = {
      id: `tx-tip-in-${Date.now()}`,
      type: '提痛點打賞收益',
      amount: cleanAmount,
      platformFee: authorPlatformFee,
      netAmount: cleanAmount - authorPlatformFee,
      fromUserName: currentUser.name,
      fromUserId: currentUser.id,
      toUserName: authorName,
      toUserId: q.authorId,
      relatedQuestionTitle: q.title,
      relatedQuestionId: q.id,
      status: '處理中',
      payoutStatus: '安全託管中（應收帳款）',
      createdAt: new Date().toISOString(),
      note: `【痛點打賞收益】來自讀者「${currentUser.name}」之支持點數 ${cleanAmount} 點（已存入應收帳款，週結撥款）。`,
    };

    setTransactions((prev) => [readerTx, authorTx, ...prev]);

    // 5. 發送通知給提痛點作者
    const authorNotif: NotificationItem = {
      id: `notif-tip-${Date.now()}`,
      userId: q.authorId,
      category: 'personal',
      title: '🎉 您的痛點獲得讀者打賞支持！',
      message: `用戶「${currentUser.name}」打賞支持了您的痛點《${q.title}》${cleanAmount} 點！款項已存入您的【點數收支 > 應收帳款】，一週結算一次。${message ? `讀者留言：「${message}」` : ''}`,
      type: 'payment_unlocked',
      linkQuestionId: q.id,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [authorNotif, ...prev]);

    return {
      success: true,
      message: `🎉 成功打賞 ${cleanAmount.toLocaleString()} 點支持金！已為您存入提案者的應收帳款中。`,
    };
  };

  // 申請撥款（需實名身分核驗與收款帳戶，非直接點數額度，扣除手續費後以法幣電匯撥款）
  const requestTipPayout = (amountPoints: number): { success: boolean; message: string; netCash?: number } => {
    if (!currentUser || currentUser.id === 'guest') {
      return { success: false, message: '請先登入帳號！' };
    }
    if (currentUser.realNameAuthStatus !== 'verified') {
      return { success: false, message: '依合規要求，需先完成實名身分核驗 (KYC) 始能申請撥款！' };
    }
    if (!currentUser.bankAccount?.accountNumber || !currentUser.bankAccount?.bankName) {
      return { success: false, message: '請先設定綁定收款銀行帳戶以利款項撥出！' };
    }

    const available = currentUser.tipReceivablesPoints || 0;
    const cleanPoints = Math.max(0, Math.floor(amountPoints));
    if (cleanPoints < 100) {
      return { success: false, message: '單次申請撥款最低門檻需滿 100 點！' };
    }
    if (cleanPoints > available) {
      return { success: false, message: `申請點數 (${cleanPoints.toLocaleString()}) 超過目前應收打賞餘額 (${available.toLocaleString()} 點)！` };
    }

    const userPlan = subscriptionPlans[currentUser.subscriptionTier || 'free'] || SUBSCRIPTION_PLANS.free;
    const feeRate = userPlan.platformFeeRate ?? 0.10;
    const grossCash = cleanPoints; // 1 點 = NT$ 1 基準
    const feeAmount = Math.round(grossCash * feeRate);
    const netCash = Math.max(0, grossCash - feeAmount);

    const bankSnapshot = `${currentUser.bankAccount.bankName} (•••• ${currentUser.bankAccount.accountNumber.slice(-4)})`;

    // 扣除打賞待提領點數
    const newTipReceivables = Math.max(0, available - cleanPoints);
    const updatedUser: User = {
      ...currentUser,
      tipReceivablesPoints: newTipReceivables,
      totalPaidOut: (currentUser.totalPaidOut || 0) + netCash,
    };

    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updatedUser));
    } catch (e) {}

    setAvailableUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? updatedUser : u))
    );

    // 建立提現申請交易紀錄
    const payoutTx: Transaction = {
      id: `tx-payout-${Date.now()}`,
      type: '打賞撥款',
      amount: grossCash,
      platformFee: feeAmount,
      feeRate: feeRate,
      netAmount: netCash,
      paymentMethod: 'ATM 虛擬帳號',
      payoutStatus: '處理中',
      bankAccountSnapshot: bankSnapshot,
      fromUserName: 'IdeaX 平台財務結算中心',
      toUserName: currentUser.name,
      toUserId: currentUser.id,
      status: '處理中',
      createdAt: new Date().toISOString(),
      note: `【痛點打賞申請撥款】請領打賞 ${cleanPoints.toLocaleString()} 點，換算 NT$ ${grossCash.toLocaleString()}，扣除 ${Math.round(feeRate * 100)}% 平台手續費 NT$ ${feeAmount.toLocaleString()}，預計撥付 NT$ ${netCash.toLocaleString()} 至 ${bankSnapshot}。`,
    };

    setTransactions((prev) => [payoutTx, ...prev]);

    // 通知用戶
    const payoutNotif: NotificationItem = {
      id: `notif-payout-${Date.now()}`,
      userId: currentUser.id,
      category: 'personal',
      title: '💰 打賞收益撥款申請已送出',
      message: `您已成功申請打賞點數撥款 ${cleanPoints.toLocaleString()} 點！扣除手續費後預計實撥 NT$ ${netCash.toLocaleString()} 元，每週結算後於週五前撥入指定帳戶。`,
      type: 'system',
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [payoutNotif, ...prev]);

    return {
      success: true,
      message: `🎉 撥款申請成功！扣除手續費後預計撥付 NT$ ${netCash.toLocaleString()} 元。`,
      netCash: netCash,
    };
  };

  const switchRole = (newRole: 'questioner' | 'solver' | 'admin') => {
    // 管理員身分固定不可變換為提問者或解答者
    if (currentUser.role === 'admin') {
      return;
    }
    setCurrentUser((prev) => {
      if (prev.role === 'admin') return prev;
      const updated = {
        ...prev,
        role: newRole,
        title: newRole === 'questioner'
          ? ''
          : newRole === 'solver'
          ? (prev.title && !prev.title.includes('提問') ? prev.title : `${prev.domain || '創新創業'}資深顧問`)
          : 'IdeaX 平台治理管理員',
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updated));
      return updated;
    });
  };

  const updateSolverPreferences = (prefs: {
    domain?: Category;
    skills?: string[];
    showSubmittedCount?: boolean;
    showAcceptanceRate?: boolean;
    showAvgSolutionBounty?: boolean;
  }) => {
    setCurrentUser((prev) => {
      const updated = {
        ...prev,
        ...prefs,
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updated));
      return updated;
    });
  };

  const switchAccount = (userId: string): boolean => {
    // 支援別名映射 (例如 user-questioner <-> c100000001, user-admin <-> a000000001, solver-2 <-> c200000002, solver-1 <-> c100000003)
    const aliasMap: Record<string, string> = {
      'user-admin': 'a000000001',
      'a000000001': 'user-admin',
      'user-questioner': 'c100000001',
      'c100000001': 'user-questioner',
      'solver-2': 'c200000002',
      'c200000002': 'solver-2',
      'solver-1': 'c100000003',
      'c100000003': 'solver-1',
    };
    const aliasId = aliasMap[userId];

    let target = availableUsers.find((u) => u.id === userId || (aliasId && u.id === aliasId));
    if (!target) {
      // 找不到時自動自固定保留之核心測試帳號或模擬名單中尋找並補齊
      target =
        CORE_TEST_ACCOUNTS.find((u) => u.id === userId || (aliasId && u.id === aliasId)) ||
        DEMO_CORE_TEST_USERS.find((u) => u.id === userId || (aliasId && u.id === aliasId)) ||
        MOCK_USERS.find((u) => u.id === userId || (aliasId && u.id === aliasId)) ||
        CLEAN_CORE_USERS.find((u) => u.id === userId || (aliasId && u.id === aliasId));

      if (target) {
        setAvailableUsers((prev) => {
          if (!prev.some((u) => u.id === target!.id)) {
            const updated = [...prev, target!];
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(updated));
            } catch {}
            return updated;
          }
          return prev;
        });
      }
    }
    if (!target) return false;

    // 檢查是否有註銷猶豫期狀態：只要這 7 日內有再登入這個帳號，就自動視為取消註銷！
    const { canLogin, restoredUser, wasInGracePeriod, errorReason } = checkUserDeactivationStatus(target);
    if (!canLogin || !restoredUser) {
      alert(errorReason || '此帳號已超過 7 日反悔猶豫期並已註銷，無法登入。');
      return false;
    }

    // 徹底清理反悔猶豫期與註銷相關狀態，並確保核心角色身分與名稱正確
    const effectiveUser: User = restoreCanonicalUserIdentity({
      ...target,
      ...restoredUser,
      isDeactivated: false,
      deactivationStatus: undefined,
      deactivationRequestedAt: undefined,
      deactivationScheduledPurgeAt: undefined,
      deactivationReason: undefined,
    });

    setCurrentUser(effectiveUser);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}is_authenticated`, 'true');
    localStorage.setItem(`${STORAGE_KEY_PREFIX}is_explicit_login`, 'true');
    localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(effectiveUser));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(effectiveUser));

    const isPreviouslyDeactivated = Boolean(
      wasInGracePeriod ||
      target.isDeactivated ||
      target.deactivationStatus === 'pending_grace' ||
      target.deactivationRequestedAt
    );

    // 僅更新該目標用戶與其別名 ID，絕不以名稱模糊比對覆蓋其他帳號
    setAvailableUsers((prev) => {
      const next = prev.map((u) => {
        const isMatch =
          u.id === effectiveUser.id ||
          u.id === userId ||
          (aliasId && u.id === aliasId);

        if (isMatch) {
          return restoreCanonicalUserIdentity({
            ...u,
            ...effectiveUser,
            id: u.id,
            isDeactivated: false,
            deactivationStatus: undefined,
            deactivationRequestedAt: undefined,
            deactivationScheduledPurgeAt: undefined,
            deactivationReason: undefined,
          });
        }
        return restoreCanonicalUserIdentity(u);
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(next));
      } catch {}
      return next;
    });

    syncUserToFirestore(effectiveUser);
    if (aliasId) {
      syncUserToFirestore(restoreCanonicalUserIdentity({ ...effectiveUser, id: aliasId }));
    }

    if (isPreviouslyDeactivated) {
      setNotifications((prev) => [
        {
          id: `notif-cancel-deact-${Date.now()}`,
          title: '已自動取消帳號註銷！',
          message: `歡迎回來！您於 7 日反悔猶豫期內再次登入「${effectiveUser.name}」，系統已自動視為取消註銷，帳號所有資料與功能已全面恢復正常。`,
          type: 'system',
          createdAt: '剛剛',
          read: false,
        },
        ...prev,
      ]);
      syncAuditLogsToFirestore([
        {
          id: `audit-cancel-deact-${Date.now()}`,
          adminId: effectiveUser.id,
          action: `用戶登入自動取消帳號註銷：${effectiveUser.id}`,
          details: { timestamp: new Date().toISOString() },
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setDeviceAccounts((prev) => {
      const idx = prev.findIndex((a) => a.userId === effectiveUser.id || a.userId === userId || (aliasId && a.userId === aliasId));
      const now = new Date().toISOString();
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], userId: effectiveUser.id, isLoggedIn: true, lastLoginAt: now };
        return updated;
      }
      return [...prev, { userId: effectiveUser.id, isLoggedIn: true, lastLoginAt: now }];
    });
    return true;
  };

  const logoutAccount = (userId?: string) => {
    const targetId = userId || currentUser.id;
    // 只有登出「目前使用中的帳號」才登出 Firebase；登出裝置上其他帳號不影響目前的登入憑證
    if (!userId || userId === currentUser.id) {
      logoutFromFirebase().catch(() => {});
    }
    setDeviceAccounts((prev) =>
      prev.map((a) => (a.userId === targetId ? { ...a, isLoggedIn: false } : a))
    );
    if (!targetId || targetId === currentUser.id) {
      const guest = GUEST_USER;
      setCurrentUser(guest);
      try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_authenticated`);
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_explicit_login`);
        localStorage.removeItem('ideax_is_authenticated');
        localStorage.removeItem('ideax_is_explicit_login');
        localStorage.removeItem('ideax_user');
        localStorage.removeItem('ideax_current_user');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(guest));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(guest));
      } catch {}
    }
  };

  const removeDeviceAccount = (userId: string): boolean => {
    if (userId === currentUser.id) {
      return false;
    }
    setDeviceAccounts((prev) => prev.filter((a) => a.userId !== userId));
    return true;
  };

  const addDeviceAccount = (userId: string): boolean => {
    return switchAccount(userId);
  };

  const calculateSplitPayout = (amount: number, solverId?: string) => {
    const solverUser = solverId
      ? (availableUsers.find((u) => u.id === solverId) || (currentUser.id === solverId ? currentUser : undefined))
      : currentUser;
    const tier: SubscriptionTier = solverUser?.subscriptionTier || currentUser.subscriptionTier || 'free';
    const plan = subscriptionPlans[tier] || SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free;

    const rate = plan.platformFeeRate; // free: 0.10, expert: 0.05, authority: 0.00, master: -0.02
    let platformFee = 0;
    let bonusAmount = 0;
    let netPayout = amount;

    if (rate > 0) {
      platformFee = Math.round(amount * rate);
      netPayout = amount - platformFee;
    } else if (rate < 0) {
      bonusAmount = Math.round(amount * Math.abs(rate));
      platformFee = 0;
      netPayout = amount + bonusAmount;
    } else {
      platformFee = 0;
      netPayout = amount;
    }

    const bankSnapshot = solverUser?.bankAccount
      ? `${solverUser.bankAccount.bankName} (${solverUser.bankAccount.accountNumber.slice(-4)})`
      : '綁定金融機構帳戶';

    return {
      tier,
      planName: plan.name,
      feeDiscountText: plan.feeDiscountText,
      feeRate: rate,
      platformFee,
      bonusAmount,
      netPayout,
      sellerPayoutRate: plan.sellerPayoutRate,
      sellerPayoutText: plan.sellerPayoutText,
      bankAccountSnapshot: bankSnapshot,
    };
  };

  const updateBankAccount = (bankInfo: import('../types').BankAccountInfo) => {
    setCurrentUser((prev) => {
      const updated = {
        ...prev,
        bankAccount: bankInfo,
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updated));
      return updated;
    });

    setAvailableUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, bankAccount: bankInfo } : u))
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '撥款收款銀行帳戶已更新',
        message: `已成功綁定撥款帳戶：${bankInfo.bankName}（帳號：${bankInfo.accountNumber}），所有第三方撥款將自動匯入此帳戶。`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);
  };

  // Action: Create question (當提問會自動切換至提問者身份)
  const createQuestion = (newQ: Partial<Question>): Question => {
    if (currentUser.isBlocked) {
      addNotification('帳號停權警告', `⚠️ 您的帳號已被管理員停權處分（原因：${currentUser.blockedReason || '違反平台規範'}），在解封前無法發布新問題或痛點！如有疑問請聯繫客服。`, 'system');
      return null as any;
    }
    if (currentUser.role !== 'admin' && currentUser.role !== 'questioner') {
      setCurrentUser((prev) => ({
        ...prev,
        role: 'questioner',
      }));
    }

    const qId = `q-${Date.now()}`;
    const isPainPoint = newQ.postType === 'pain_point' || newQ.tags?.some((t) => t.includes('痛點') || t.includes('創點子'));
    const isRaceModeActive = isRaceMode && isPainPoint;

    // 關鍵規則：在創點子、痛點提出的內容同步出現於「創新創業」看板，依細分領域分類
    const finalCategory = (isPainPoint || newQ.postType === 'seek_solution' || isRaceMode)
      ? (newQ.category || '創新創業')
      : (newQ.category || '創新創業');
    const finalSubcategory = newQ.subcategory || '資訊科技';

    // 競賽模式規則：從創點子/痛點集提出的問題僅限 L0 且標注綠色「創星季」標籤並擁有獨立網址
    const finalLevel = isRaceModeActive ? 'L0' : (newQ.level || 'L2');
    const finalBounty = isRaceModeActive ? 0 : (newQ.bounty ?? (finalLevel === 'L0' ? 0 : 1000));
    
    const baseTags = newQ.tags || ['創新創業', finalSubcategory];
    const tagsSet = new Set(baseTags);
    tagsSet.add(finalSubcategory);
    if (isPainPoint) tagsSet.add('痛點');
    // 若在創點子提出則不算入競賽提案或點子，僅競賽期間內的競賽提案或痛點才顯示「創星季」
    const isCompetitionItem = Boolean(isRaceModeActive || newQ.isStarSeason);
    if (isCompetitionItem) {
      tagsSet.add('創星季');
    }
    const finalTags = Array.from(tagsSet);

    const q: Question = {
      id: qId,
      appName: newQ.appName,
      title: newQ.title || '無標題問題',
      description: newQ.description || '',
      category: finalCategory,
      subcategory: finalSubcategory,
      subcategories: newQ.subcategories,
      tags: finalTags,
      level: finalLevel,
      bounty: finalBounty,
      postType: newQ.postType || 'seek_solution',
      specialZone: newQ.specialZone,
      referencedPainPoint: newQ.referencedPainPoint,
      targetGoal: newQ.targetGoal,
      currentVersion: newQ.currentVersion,
      updateLogs: newQ.updateLogs,
      coverImage: newQ.coverImage,
      galleryImages: newQ.galleryImages,
      youtubeUrl: newQ.youtubeUrl,
      coverMode: newQ.coverMode,
      cardHoverMode: newQ.cardHoverMode,
      proposalProgressStage: newQ.proposalProgressStage,
      techArchitecture: newQ.techArchitecture,
      demoUrl: newQ.demoUrl,
      fileLink: newQ.fileLink,
      fileUrl: newQ.fileUrl,
      vibeCodingData: newQ.vibeCodingData,
      status: 'open',
      authorId: newQ.authorId || currentUser.id,
      authorName: newQ.authorName || currentUser.name,
      authorAvatar: newQ.authorAvatar || currentUser.avatar,
      authorTitle: newQ.authorTitle || currentUser.title,
      isOfficial: newQ.isOfficial,
      publishIdentity: newQ.publishIdentity || (currentUser.role === 'admin' ? 'admin' : undefined),
      isFeatured: newQ.isFeatured,
      isStarSeason: isCompetitionItem,
      createdAt: new Date().toISOString(),
      deadline: newQ.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      views: newQ.views ?? 0,
      viewsCount: newQ.viewsCount ?? 0,
      answersCount: 0,
      likes: newQ.likes ?? (isRaceModeActive ? 16 : 8),
      aiAnalysis: newQ.aiAnalysis,
      aiPreliminaryReport: newQ.aiPreliminaryReport,
      withheldBounty: finalBounty,
      disputeStatus: 'none',
      phases: newQ.phases,
      exclusiveChallengeUrl: newQ.exclusiveChallengeUrl || (isCompetitionItem ? `https://ideax.tw/challenge?questionId=${qId}` : undefined),
      starSeasonProposalId: newQ.starSeasonProposalId,
    };

    // If bounty > 0, questioner pays via supported third-party payment gateway or points into safe escrow
    if (q.bounty > 0) {
      runPointsOp({ op: 'escrow_hold', amount: q.bounty, refId: qId, note: '提問懸賞預扣' }, '懸賞預扣未完成');
      setCurrentUser((prev) => ({
        ...prev,
        balance: Math.max(0, (prev.balance || 0) - q.bounty),
        withheldPoints: (prev.withheldPoints || 0) + q.bounty,
        levelQuestionCounts: {
          ...(prev.levelQuestionCounts || { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 }),
          [q.level]: ((prev.levelQuestionCounts?.[q.level]) || 0) + 1,
        },
      }));
      // 記錄點數付點與履約託管扣抵紀錄
      const bountyTx: Transaction = {
        id: `tx-bounty-${Date.now()}`,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        type: '提案懸賞',
        amount: q.bounty,
        platformFee: 0,
        netAmount: q.bounty,
        status: '已完成',
        relatedQuestionId: q.id,
        relatedQuestionTitle: q.title,
        payoutStatus: '安全託管中',
        paymentMethod: '平台點數付點扣抵',
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [bountyTx, ...prev]);
    } else {
      // L0 free question stats update
      setCurrentUser((prev) => ({
        ...prev,
        levelQuestionCounts: {
          ...(prev.levelQuestionCounts || { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 }),
          [q.level]: ((prev.levelQuestionCounts?.[q.level]) || 0) + 1,
        },
      }));
    }

    setQuestions((prev) => {
      const next = [q, ...prev];
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 關鍵同步：立即寫入 Firebase Firestore 雲端資料庫
    syncQuestionToFirestore(q);

    // 成功提示 Toast (依痛點、懸賞提問/問題、貼文/討論交流顯示相應精準提示文案)
    const isChatDiscussion = newQ.postType === 'chat_discussion';
    const toastTitle = isPainPoint
      ? '痛點發布成功！'
      : isChatDiscussion
      ? '貼文發布成功！'
      : '提問發布成功！';
    const toastSubtitle = isPainPoint
      ? `已成功將痛點「${q.title.slice(0, 24)}」上架至痛點專區！`
      : isChatDiscussion
      ? `已成功將貼文「${q.title.slice(0, 24)}」發布至社群交流區！`
      : `已成功發布提問「${q.title.slice(0, 24)}」${q.bounty > 0 ? `（懸賞 NT$ ${q.bounty.toLocaleString()} 元）` : ''}！`;
    showCenterToast(toastTitle, toastSubtitle, { type: 'success', duration: 2500 });

    // 發布後是詢問通知權限的好時機（「有人回覆時要通知你嗎？」），等成功提示消失後再顯示
    try {
      setTimeout(() => window.dispatchEvent(new CustomEvent('ideax:suggest-notification-optin')), 2800);
    } catch {}

    // Add notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: isPainPoint ? '痛點發布成功' : isChatDiscussion ? '貼文發布成功' : '提問發布成功',
        message: `您的${isPainPoint ? '痛點' : isChatDiscussion ? '貼文' : '提問'}「${q.title}」已成功上架！${q.bounty > 0 ? `（懸賞金額 NT$ ${q.bounty.toLocaleString()} 元）` : ''}`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: q.id,
      },
      ...prev,
    ]);

    return q;
  };

  // Action: Update proposal content (解方提案與軟體程式重新發布與更新日誌)
  const updateProposalContent = (
    questionId: string,
    params: {
      appName?: string;
      title?: string;
      description?: string;
      subcategory?: string;
      subcategories?: string[];
      targetGoal?: string;
      referencedPainPoint?: string;
      tags?: string[];
      demoUrl?: string;
      fileLink?: string;
      techArchitecture?: string;
      coverImage?: string;
      galleryImages?: string[];
      youtubeUrl?: string;
      coverMode?: 'custom_image' | 'youtube_video';
      cardHoverMode?: 'video_autoplay' | 'image_carousel';
      showCardImage?: boolean;
      cardDisplayImage?: string;
      proposalProgressStage?: string;
      version?: string;
      updateContent?: string;
      updateNote?: string;
      changelogContent?: string;
      changelogNote?: string;
    }
  ): { success: boolean; ok: boolean; message: string; reason?: string; updatedQuestion?: Question } => {
    const resolvedContent = (params.updateContent || params.changelogContent || '').trim() || '更新內容與資訊';
    const resolvedNote = (params.updateNote || params.changelogNote || '').trim() || undefined;

    const targetIndex = questions.findIndex((q) => q.id === questionId);
    if (targetIndex === -1) {
      return { success: false, ok: false, message: '找不到目標提案項目', reason: '找不到目標提案項目' };
    }

    const currentQ = questions[targetIndex];
    // 權限檢查：僅該提案或內容的發布者本人可編輯更新，其餘人僅能於頁尾瀏覽版本更新紀錄
    const isAuthor = Boolean(
      currentUser?.id &&
      currentUser.id !== 'user-guest' &&
      currentQ.authorId === currentUser.id
    );
    if (!isAuthor) {
      const msg = '此功能只限該提案或內容的發布者編輯，其他人只能於頁尾查看版本更新紀錄';
      return { success: false, ok: false, message: msg, reason: msg };
    }

    const now = new Date();
    const formattedTime = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const changedFields: string[] = [];
    if (params.appName !== undefined && params.appName !== currentQ.appName) changedFields.push('作品名稱');
    if (params.title && params.title !== currentQ.title) changedFields.push('標題');
    if (params.description && params.description !== currentQ.description) changedFields.push('內容說明');
    if (params.subcategories !== undefined) changedFields.push('分類');
    if (params.targetGoal !== undefined && params.targetGoal !== currentQ.targetGoal) changedFields.push('目標');
    if (params.demoUrl !== undefined && params.demoUrl !== currentQ.demoUrl) changedFields.push('網址');
    if (params.youtubeUrl !== undefined && params.youtubeUrl !== currentQ.youtubeUrl) changedFields.push('YouTube介紹影片');
    if (params.coverMode !== undefined && params.coverMode !== currentQ.coverMode) changedFields.push('封面呈現方式');
    if (params.cardHoverMode !== undefined && params.cardHoverMode !== currentQ.cardHoverMode) changedFields.push('卡片動態展示');
    if (params.proposalProgressStage !== undefined && params.proposalProgressStage !== currentQ.proposalProgressStage) changedFields.push('提案進度狀態');
    if (params.techArchitecture !== undefined && params.techArchitecture !== currentQ.techArchitecture) changedFields.push('技術架構');
    if (params.version && params.version !== currentQ.currentVersion) changedFields.push('版本號');
    if (changedFields.length === 0) changedFields.push('內容更新');

    const newLog: ProposalUpdateLog = {
      id: `log-${Date.now()}`,
      timestamp: formattedTime,
      version: params.version?.trim() || undefined,
      content: resolvedContent,
      note: resolvedNote,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      updatedFields: changedFields,
    };

    const updatedQ: Question = {
      ...currentQ,
      appName: params.appName !== undefined ? params.appName : currentQ.appName,
      title: params.title !== undefined ? params.title : currentQ.title,
      description: params.description !== undefined ? params.description : currentQ.description,
      subcategory: params.subcategory !== undefined ? params.subcategory : currentQ.subcategory,
      subcategories: params.subcategories !== undefined ? params.subcategories : currentQ.subcategories,
      targetGoal: params.targetGoal !== undefined ? params.targetGoal : currentQ.targetGoal,
      referencedPainPoint: params.referencedPainPoint !== undefined ? params.referencedPainPoint : currentQ.referencedPainPoint,
      tags: params.tags !== undefined ? params.tags : currentQ.tags,
      demoUrl: params.demoUrl !== undefined ? params.demoUrl : currentQ.demoUrl,
      fileLink: params.fileLink !== undefined ? params.fileLink : currentQ.fileLink,
      techArchitecture: params.techArchitecture !== undefined ? params.techArchitecture : currentQ.techArchitecture,
      coverImage: params.coverImage !== undefined ? params.coverImage : currentQ.coverImage,
      galleryImages: params.galleryImages !== undefined ? params.galleryImages : currentQ.galleryImages,
      youtubeUrl: params.youtubeUrl !== undefined ? params.youtubeUrl : currentQ.youtubeUrl,
      coverMode: params.coverMode !== undefined ? params.coverMode : currentQ.coverMode,
      cardHoverMode: params.cardHoverMode !== undefined ? params.cardHoverMode : currentQ.cardHoverMode,
      showCardImage: params.showCardImage !== undefined ? params.showCardImage : currentQ.showCardImage,
      cardDisplayImage: params.cardDisplayImage !== undefined ? params.cardDisplayImage : currentQ.cardDisplayImage,
      proposalProgressStage: params.proposalProgressStage !== undefined ? params.proposalProgressStage : currentQ.proposalProgressStage,
      vibeCodingData: currentQ.vibeCodingData
        ? {
            ...currentQ.vibeCodingData,
            appName: params.appName !== undefined ? params.appName : currentQ.vibeCodingData.appName,
            demoUrl: params.demoUrl !== undefined ? params.demoUrl : currentQ.vibeCodingData.demoUrl,
            githubUrl: params.fileLink !== undefined ? params.fileLink : currentQ.vibeCodingData.githubUrl,
            coverImageUrl: params.coverImage !== undefined ? params.coverImage : currentQ.vibeCodingData.coverImageUrl,
            screenshots: params.galleryImages !== undefined ? params.galleryImages : currentQ.vibeCodingData.screenshots,
            youtubeUrl: params.youtubeUrl !== undefined ? params.youtubeUrl : currentQ.vibeCodingData.youtubeUrl,
            coverMode: params.coverMode !== undefined ? params.coverMode : currentQ.vibeCodingData.coverMode,
            cardHoverMode: params.cardHoverMode !== undefined ? params.cardHoverMode : currentQ.vibeCodingData.cardHoverMode,
          }
        : currentQ.vibeCodingData,
      currentVersion: params.version?.trim() || currentQ.currentVersion,
      updateLogs: [newLog, ...(currentQ.updateLogs || [])],
    };

    setQuestions((prev) => {
      const next = prev.map((q) => (q.id === questionId ? updatedQ : q));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(next));
      } catch {}
      return next;
    });

    syncQuestionToFirestore(updatedQ);

    const isApp = updatedQ.postType === 'vibecoding_app';
    const typeLabel = isApp ? '軟體程式' : '解方提案';
    showCenterToast(
      `${typeLabel}更新發布成功！`,
      `已發布${params.version ? `【${params.version}】` : ''}更新紀錄並同步更新內容`,
      { type: 'success', duration: 3000 }
    );

    return { success: true, ok: true, message: '更新發布成功', updatedQuestion: updatedQ };
  };

  // Action: Submit answer (當回答會自動切換至解答者身份，支持 討論留言 vs 專業方案)
  const submitAnswer = (newAns: Partial<Answer>): Answer => {
    if (currentUser.isBlocked) {
      addNotification('帳號停權警告', `⚠️ 您的帳號已被管理員停權處分（原因：${currentUser.blockedReason || '違反平台規範'}），在解封前無法提交方案或留言！如有疑問請聯繫客服。`, 'system');
      return null as any;
    }
    if (currentUser.role !== 'admin' && currentUser.role !== 'solver') {
      setCurrentUser((prev) => ({
        ...prev,
        role: 'solver',
      }));
    }

    const isDiscussion = newAns.type === 'discussion';
    const targetQ = questions.find((q) => q.id === (newAns.questionId || selectedQuestion?.id || 'q-1'));
    // 方案默認該題懸賞金額，也可由回答者自訂
    const defaultPrice = targetQ && targetQ.bounty > 0 ? targetQ.bounty : 300;
    const finalPrice = isDiscussion ? 0 : (newAns.price !== undefined ? newAns.price : defaultPrice);

    const ansId = isDiscussion ? `disc-${Date.now()}` : `ans-${Date.now()}`;
    const isStarSeasonAnswer = isRaceMode || targetQ?.isStarSeason || targetQ?.tags?.includes('創星季') || newAns.isStarSeasonSolution;

    const ans: Answer = {
      id: ansId,
      questionId: newAns.questionId || selectedQuestion?.id || 'q-1',
      type: newAns.type || 'solution',
      solverId: currentUser.id,
      solverName: currentUser.name,
      solverTitle: currentUser.title || `${currentUser.domain || '創新創業'}專家`,
      solverAvatar: currentUser.avatar,
      solverRating: currentUser.rating || 4.9,
      deliveryType: isDiscussion ? '交流探討' : (newAns.deliveryType || '商業策略架構'),
      deliveryFormat: isDiscussion ? 'text' : (newAns.deliveryFormats?.[0] || newAns.deliveryFormat || 'text'),
      deliveryFormats: isDiscussion ? ['text'] : (newAns.deliveryFormats || (newAns.deliveryFormat ? [newAns.deliveryFormat] : ['text'])),
      isPaid: isDiscussion ? false : (newAns.isPaid ?? true),
      price: finalPrice,
      freePreview: newAns.freePreview || '',
      fullContent: isDiscussion ? undefined : (newAns.fullContent || ''),
      attachments: isDiscussion ? undefined : newAns.attachments,
      meetingDetails: isDiscussion ? undefined : newAns.meetingDetails,
      unlockedByUserIds: [currentUser.id],
      isUnlockedByCurrentUser: true,
      createdAt: new Date().toISOString(),
      likes: newAns.likes ?? (isStarSeasonAnswer ? 28 : 0),
      coverImageUrl: newAns.coverImageUrl || (isStarSeasonAnswer ? 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80' : undefined),
      exclusiveChallengeUrl: newAns.exclusiveChallengeUrl || (isStarSeasonAnswer ? `https://ideax.tw/challenge/proposal?proposalId=${ansId}` : undefined),
      isStarSeasonSolution: isStarSeasonAnswer ? true : false,
      starSeasonProposalId: newAns.starSeasonProposalId || (isStarSeasonAnswer ? ansId : undefined),
      sourcePainPointProposalId: targetQ?.id,
      supportPoints: newAns.supportPoints || (isStarSeasonAnswer ? 120000 : undefined),
      commentsCount: newAns.commentsCount || (isStarSeasonAnswer ? 12 : 0),
    };

    setAnswers((prev) => [ans, ...prev]);

    // Update question answers count
    setQuestions((prev) =>
      prev.map((q) => (q.id === ans.questionId ? { ...q, answersCount: q.answersCount + 1 } : q))
    );

    // Update solver stats & current user submitted count
    if (!isDiscussion) {
      setCurrentUser((prev) => ({
        ...prev,
        submittedSolutionsCount: (prev.submittedSolutionsCount || 0) + 1,
      }));
    }

    setSolvers((prev) =>
      prev.map((s) => (s.id === currentUser.id ? { ...s, answerCount: s.answerCount + 1 } : s))
    );

    // Add notification for question author
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: isDiscussion ? '收到新的公開討論留言' : '收到新的解決方案！',
        message: `${currentUser.name} 針對「${targetQ?.title || '您的問題'}」提交了${isDiscussion ? '討論留言' : '全新專業方案'}。`,
        type: isDiscussion ? 'new_discussion' : 'new_answer',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: ans.questionId,
      },
      ...prev,
    ]);

    // 成功提示 Toast（留言討論 或 提案方案）
    if (isDiscussion) {
      showCenterToast('留言討論發布成功！', '您的交流見解已成功送出並公開顯示。', {
        type: 'success',
        duration: 2200,
      });
    } else {
      showCenterToast('提案方案發布成功！', '您的落地方案已成功提交，提問者與社群皆可查閱！', {
        type: 'success',
        duration: 2500,
      });
    }

    return ans;
  };

  // Action: Unlock Paywall Answer via Platform Points & Automatic Split
  const unlockAnswer = (
    answerId: string,
    useWithheldOffset: boolean = true,
    paymentMethod: string = '平台點數扣點'
  ): boolean => {
    const target = answers.find((a) => a.id === answerId);
    if (!target) return false;

    const targetQ = questions.find((q) => q.id === target.questionId);
    const price = target.price || 0;
    const isAuthor = Boolean(targetQ && targetQ.authorId === currentUser.id);
    const availableWithheld = isAuthor ? (targetQ?.withheldBounty || 0) : 0;
    const offsetAmount = useWithheldOffset && availableWithheld > 0 ? Math.min(price, availableWithheld) : 0;
    const balanceToPay = Math.max(0, price - offsetAmount);

    if (!isNoPaymentMode && !isRaceMode && balanceToPay > 0 && (currentUser.balance || 0) < balanceToPay) {
      return false;
    }

    if (balanceToPay > 0) {
      const buyerId = currentUser.id;
      runPointsOp({ op: 'spend', amount: balanceToPay, purpose: 'unlock', refId: answerId }, '方案解鎖未完成', () => {
        // 扣點失敗：收回解鎖
        setAnswers((prev) =>
          prev.map((a) =>
            a.id === answerId
              ? {
                  ...a,
                  unlockedByUserIds: (a.unlockedByUserIds || []).filter((id) => id !== buyerId),
                  isUnlockedByCurrentUser: false,
                }
              : a
          )
        );
      });
    }
    if (offsetAmount > 0 && targetQ) {
      runPointsOp({ op: 'escrow_release', amount: offsetAmount, refId: targetQ.id, mode: 'payout', note: '以懸賞預扣折抵解鎖' });
    }

    // Deduct points from buyer if balanceToPay > 0
    if (!isNoPaymentMode && !isRaceMode && balanceToPay > 0) {
      setCurrentUser((prev) => ({
        ...prev,
        balance: Math.max(0, (prev.balance || 0) - balanceToPay),
      }));
      setAvailableUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, balance: Math.max(0, (u.balance || 0) - balanceToPay) }
            : u
        )
      );
    }

    // Deduct offsetAmount from question withheldBounty if used
    if (offsetAmount > 0 && targetQ) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === targetQ.id
            ? { ...q, withheldBounty: Math.max(0, (q.withheldBounty || 0) - offsetAmount) }
            : q
        )
      );
    }

    // Calculate third-party split settlement
    const split = calculateSplitPayout(price, target.solverId);

    // Mark answer unlocked for currentUser
    setAnswers((prev) =>
      prev.map((a) =>
        a.id === answerId
          ? {
              ...a,
              unlockedByUserIds: Array.from(new Set([...(a.unlockedByUserIds || []), currentUser.id])),
              isUnlockedByCurrentUser: true,
            }
          : a
      )
    );

    // Credit solver's paid out & revenue stats in availableUsers
    setAvailableUsers((prev) =>
      prev.map((u) =>
        u.id === target.solverId
          ? {
              ...u,
              totalPaidOut: (u.totalPaidOut || 0) + split.netPayout,
              totalRevenue: (u.totalRevenue || 0) + price,
            }
          : u
      )
    );

    // If currentUser happens to be the solver, also update currentUser
    if (currentUser.id === target.solverId) {
      setCurrentUser((prev) => ({
        ...prev,
        totalPaidOut: (prev.totalPaidOut || 0) + split.netPayout,
        totalRevenue: (prev.totalRevenue || 0) + price,
      }));
    }

    // Credit solver's earnings in solvers directory
    setSolvers((prev) =>
      prev.map((s) =>
        s.id === target.solverId ? { ...s, earnings: s.earnings + split.netPayout } : s
      )
    );

    // Record Transaction for third-party unlock & split
    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      type: '方案解鎖',
      amount: price,
      platformFee: split.platformFee,
      feeRate: split.feeRate,
      bonusAmount: split.bonusAmount,
      netAmount: split.netPayout,
      paymentMethod,
      payoutStatus: '已撥款至銀行帳戶',
      bankAccountSnapshot: split.bankAccountSnapshot,
      relatedQuestionTitle: targetQ?.title || '高價值問題',
      relatedQuestionId: target.questionId,
      fromUserName: currentUser.name,
      toUserName: target.solverName,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `買家透過平台點數（${paymentMethod}）扣抵 ${price.toLocaleString()} 點。系統自動結算：解答者實收 ${split.netPayout.toLocaleString()} 點（${split.feeDiscountText} 由解答者吸收）＋ IdeaX 服務費 ${split.platformFee.toLocaleString()} 點。`,
    };
    setTransactions((prev) => [tx, ...prev]);

    // Push notification for buyer
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '方案成功解鎖！',
        message: `您已透過平台點數（${paymentMethod}）成功扣抵 ${price.toLocaleString()} 點解鎖「${target.solverName}」的深度解決方案，完整內容現已開放閱讀。`,
        type: 'payment_unlocked',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: target.questionId,
      },
      ...prev,
    ]);

    // Push notification for solver
    setNotifications((prev) => [
      {
        id: `notif-solver-${Date.now()}`,
        title: '方案解鎖收益已入帳！',
        message: `買家已扣抵點數解鎖您的方案（定價 ${price.toLocaleString()} 點），系統已自動結算：實收 ${split.netPayout.toLocaleString()} 點（${split.feeDiscountText}）！`,
        type: 'payment_unlocked',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: target.questionId,
      },
      ...prev,
    ]);

    return true;
  };

  // Action: Accept Answer and release bounty via Third-party Split Payout
  const acceptAnswer = (answerId: string, rating: number = 5, review?: string) => {
    const targetAns = answers.find((a) => a.id === answerId);
    if (!targetAns) return;

    const targetQ = questions.find((q) => q.id === targetAns.questionId);
    const bounty = targetQ ? targetQ.bounty : 1000;
    const remainingWithheld = targetQ?.withheldBounty ?? bounty;

    // Automatic split calculation based on solver's membership plan
    const split = calculateSplitPayout(bounty, targetAns.solverId);

    // Update answer
    setAnswers((prev) =>
      prev.map((a) =>
        a.id === answerId
          ? {
              ...a,
              isAccepted: true,
              rating,
              reviewComment: review || '非常感謝詳盡實用的商業策略方案，已採納並確認撥款！',
              unlockedByUserIds: Array.from(new Set([...(a.unlockedByUserIds || []), currentUser.id])),
              isUnlockedByCurrentUser: true,
            }
          : a
      )
    );

    // Update question status to solved and clear remaining withheld
    setQuestions((prev) =>
      prev.map((q) => (q.id === targetAns.questionId ? { ...q, status: 'solved', withheldBounty: 0 } : q))
    );

    // Release questioner withheld points
    if (remainingWithheld > 0) {
      runPointsOp({ op: 'escrow_release', amount: remainingWithheld, refId: targetAns.questionId, mode: 'payout', note: '採納解答撥付懸賞' });
    }
    setCurrentUser((prev) => ({
      ...prev,
      withheldPoints: Math.max(0, (prev.withheldPoints || 0) - remainingWithheld),
    }));

    // Credit solver's paid out & update stats in availableUsers
    setAvailableUsers((prev) =>
      prev.map((u) =>
        u.id === targetAns.solverId
          ? {
              ...u,
              totalPaidOut: (u.totalPaidOut || 0) + split.netPayout,
              totalRevenue: (u.totalRevenue || 0) + bounty,
              acceptedSolutionsCount: (u.acceptedSolutionsCount || 0) + 1,
            }
          : u
      )
    );

    // If currentUser is the solver, update their stats too
    if (currentUser.id === targetAns.solverId) {
      setCurrentUser((prev) => ({
        ...prev,
        totalPaidOut: (prev.totalPaidOut || 0) + split.netPayout,
        totalRevenue: (prev.totalRevenue || 0) + bounty,
        acceptedSolutionsCount: (prev.acceptedSolutionsCount || 0) + 1,
      }));
    }

    // Reward solver in directory & update acceptance rate
    setSolvers((prev) =>
      prev.map((s) => {
        if (s.id === targetAns.solverId) {
          const newCount = s.reviewCount + 1;
          const newRating = Number(((s.rating * s.reviewCount + rating) / newCount).toFixed(2));
          const currentAccepted = Math.round(s.answerCount * (s.acceptedRate / 100)) || 0;
          const newAccepted = currentAccepted + 1;
          const newRate = Math.min(100, Math.round((newAccepted / Math.max(1, s.answerCount)) * 100));
          return {
            ...s,
            rating: newRating,
            reviewCount: newCount,
            earnings: s.earnings + split.netPayout,
            acceptedRate: newRate,
          };
        }
        return s;
      })
    );

    // Record Transaction for third-party split payout
    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      type: '解答採納撥付',
      amount: bounty,
      platformFee: split.platformFee,
      feeRate: split.feeRate,
      bonusAmount: split.bonusAmount,
      netAmount: split.netPayout,
      paymentMethod: '安全託管結算撥付',
      payoutStatus: '已撥款至銀行帳戶',
      bankAccountSnapshot: split.bankAccountSnapshot,
      relatedQuestionTitle: targetQ?.title,
      relatedQuestionId: targetQ?.id,
      fromUserName: currentUser.name,
      toUserName: targetAns.solverName,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `提問者採納確認！安全託管懸賞款項 NT$ ${bounty.toLocaleString()} 元結算撥付：解答者實收 NT$ ${split.netPayout.toLocaleString()} 元（${split.feeDiscountText} 由解答者吸收）＋ IdeaX 服務費 NT$ ${split.platformFee.toLocaleString()} 元。款項已成功撥入 ${split.bankAccountSnapshot}。`,
    };
    setTransactions((prev) => [tx, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '方案採納確認・款項結算完成',
        message: `您已採納 ${targetAns.solverName} 的方案，安全託管之 NT$ ${bounty.toLocaleString()} 元已結算完成，解答者實收 NT$ ${split.netPayout.toLocaleString()} 元已撥付至其指定帳戶。`,
        type: 'solution_accepted',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: targetAns.questionId,
      },
      ...prev,
    ]);

    setNotifications((prev) => [
      {
        id: `notif-solver-accept-${Date.now()}`,
        title: '🎉 方案已被提問者採納！款項已撥入銀行帳戶',
        message: `恭喜！您的方案已獲得提問者採納，託管款項 NT$ ${bounty.toLocaleString()} 元已結算完成：實收 NT$ ${split.netPayout.toLocaleString()} 元已全數撥款至您的 ${split.bankAccountSnapshot}！`,
        type: 'solution_accepted',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: targetAns.questionId,
      },
      ...prev,
    ]);
  };

  // Action: Rate solver after transaction ends
  const rateSolver = (solverId: string, rating: number = 5, reviewComment?: string, transactionId?: string) => {
    if (transactionId) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? { ...t, rating, reviewComment } : t))
      );
    }
    setSolvers((prev) =>
      prev.map((s) => {
        if (s.id === solverId) {
          const newCount = (s.reviewCount || 0) + 1;
          const currentRating = s.rating || 5.0;
          const newRating = Number(((currentRating * (s.reviewCount || 0) + rating) / newCount).toFixed(2));
          return {
            ...s,
            rating: newRating,
            reviewCount: newCount,
          };
        }
        return s;
      })
    );

    const solverObj = solvers.find((s) => s.id === solverId);
    setNotifications((prev) => [
      {
        id: `notif-rate-${Date.now()}`,
        title: '交易評價完成',
        message: `您已成功為解答專家「${solverObj?.name || '解答者'}」給予 ${rating} 星好評${reviewComment ? `：「${reviewComment}」` : ''}！`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);
  };

  // Action: Invite solver
  const inviteSolver = (questionId: string, solverId: string) => {
    const s = solvers.find((sol) => sol.id === solverId);
    const q = questions.find((que) => que.id === questionId);
    if (!s || !q) return;

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `已向 ${s.name} 發送解答邀請`,
        message: `平台已透過專屬通訊向 ${s.name}（${s.title}）發出「${q.title}」之懸賞解答邀請，通常會在 24 小時內回覆。`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: questionId,
      },
      ...prev,
    ]);

    // Check if target solver has syncChatNotifications enabled (defaults to true)
    const targetUserObj = availableUsers.find((u) => u.id === solverId);
    const sync = targetUserObj ? (targetUserObj.syncChatNotifications !== false) : true;

    if (sync) {
      const targetUser = {
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        title: s.title || '認證專家',
      };
      
      const existing = conversations.find(
        (c) => c.participantIds.includes(currentUser.id) && c.participantIds.includes(targetUser.id)
      );
      
      const textMessage = `✉️【專屬指定提問/邀請解答】提問者「${currentUser.name}」已向您發出懸賞解答邀請：「${q.title}」，懸賞金為 NT$ ${q.bounty.toLocaleString()} 元。您可以點擊查看詳情或直接在下方提交您的方案規劃！`;
      
      if (existing) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === existing.id) {
              return {
                ...c,
                lastMessage: textMessage,
                lastMessageTime: '剛剛',
                messages: [
                  ...c.messages,
                  {
                    id: `msg-${Date.now()}`,
                    senderId: 'system',
                    senderName: '系統提示',
                    senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                    text: textMessage,
                    createdAt: new Date().toISOString(),
                  },
                ],
              };
            }
            return c;
          })
        );
      } else {
        const convRole: 'questioner' | 'solver' = 'questioner';
        const newConv: ChatConversation = {
          id: `conv-${Date.now()}`,
          participantIds: [currentUser.id, targetUser.id],
          conversationRole: convRole,
          participantDetails: [
            {
              id: currentUser.id,
              name: currentUser.name,
              avatar: currentUser.avatar,
              title: currentUser.title || '提問者',
            },
            targetUser,
          ],
          relatedQuestionId: q.id,
          relatedQuestionTitle: q.title,
          lastMessage: textMessage,
          lastMessageTime: '剛剛',
          unreadCount: 0,
          messages: [
            {
              id: `msg-${Date.now()}`,
              senderId: 'system',
              senderName: '系統提示',
              senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
              text: textMessage,
              createdAt: new Date().toISOString(),
            },
          ],
        };
        setConversations((prev) => [newConv, ...prev]);
      }
    }
  };

  // Action: deposit balance (custom amount)
  const depositBalance = (amount: number) => {
    if (isRealPointsEconomy) {
      showCenterToast('儲值暫停中', '線上儲值金流建置中，目前暫停自助儲值。如需點數請聯繫客服，由管理員協助核發。', { type: 'warning', duration: 5000 } as any);
      return;
    }
    setCurrentUser((prev) => ({
      ...prev,
      balance: prev.balance + amount,
    }));
  };

  // Action: deposit via package
  const depositPackage = (packageId: string) => {
    const pkg = RECHARGE_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return;
    if (isRealPointsEconomy) {
      showCenterToast('儲值暫停中', '線上儲值金流建置中，目前暫停自助儲值。如需點數請聯繫客服，由管理員協助核發。', { type: 'warning', duration: 5000 } as any);
      return;
    }

    setCurrentUser((prev) => ({
      ...prev,
      balance: prev.balance + pkg.totalPoints,
    }));

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      type: '點數儲值',
      amount: pkg.price,
      platformFee: 0,
      netAmount: pkg.totalPoints,
      relatedQuestionTitle: `$${pkg.price} 點數儲值方案`,
      fromUserName: currentUser.name,
      toUserName: '創點子 IdeaX 點數金流中心',
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: '',
    };
    setTransactions((prev) => [tx, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '點數儲值成功！',
        message: `您已成功支付 NT$ ${pkg.price} 購買點數方案，${pkg.totalPoints.toLocaleString()} 點已存入您的帳戶可用餘額！`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);
  };

  // Action: withdraw balance (提現手續費 5%)
  const withdrawBalance = (amount: number): boolean => {
    if (currentUser.balance < amount || amount <= 0) return false;
    const fee = Math.round(amount * 0.05); // 固定提現手續費 5%
    const netAmount = amount - fee;
    runPointsOp({ op: 'spend', amount, purpose: 'withdraw', note: `提現申請（實到 NT$ ${netAmount}）` }, '提現申請未完成');

    setCurrentUser((prev) => ({
      ...prev,
      balance: prev.balance - amount,
      totalWithdrawn: (prev.totalWithdrawn || 0) + netAmount,
    }));

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      type: '提領申請',
      amount,
      platformFee: fee,
      netAmount,
      fromUserName: currentUser.name,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `提現申請扣除平台 5% 結算服務費 (NT$ ${fee})，實到 NT$ ${netAmount.toLocaleString()}`,
    };
    setTransactions((prev) => [tx, ...prev]);
    return true;
  };

  // Action: spend points for platform services (e.g. AI report unlocking)
  const spendPoints = (amount: number, note?: string): boolean => {
    if ((currentUser.balance || 0) < amount || amount <= 0) {
      showCenterToast('點數餘額不足', `可用餘額為 ${currentUser.balance || 0} 點，本功能需 ${amount} 點，請先去儲值後再使用。`, {
        type: 'warning',
        actionLabel: '先去儲值',
        onAction: openRechargePage,
        duration: 3500,
      });
      return false;
    }
    runPointsOp({ op: 'spend', amount, purpose: 'service', note: note || '平台功能扣點' }, '扣點未完成');
    setCurrentUser((prev) => ({
      ...prev,
      balance: Math.max(0, (prev.balance || 0) - amount),
    }));

    const tx: Transaction = {
      id: `tx-spend-${Date.now()}`,
      type: '點數扣抵',
      amount,
      platformFee: 0,
      netAmount: amount,
      fromUserName: currentUser.name,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: note || `服務扣抵 NT$ ${amount} 點`,
    };
    setTransactions((prev) => [tx, ...prev]);
    return true;
  };

  // Action: report dispute on question/solution
  const reportQuestionDispute = (questionId: string, reason: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, disputeStatus: 'pending_review', disputeReason: reason }
          : q
      )
    );
    setNotifications((prev) => [
      {
        id: `notif-dispute-${Date.now()}`,
        title: '已提交疑義檢舉申訴',
        message: `您已針對問題提交檢舉審查申請。平台審查團隊將儘速完成調查，若審查屬實將全額退還保留點數。`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: questionId,
      },
      ...prev,
    ]);
  };

  // Action: resolve dispute and refund withheld points
  const resolveDisputeRefund = (questionId: string) => {
    const q = questions.find((item) => item.id === questionId);
    if (!q) return;

    const refundAmount = q.withheldBounty || q.bounty || 0;
    if (refundAmount > 0) {
      runPointsOp({ op: 'escrow_release', amount: refundAmount, refId: questionId, mode: 'refund', payerUserId: q.authorId, note: '爭議申訴退還預扣' });
      setCurrentUser((prev) => ({
        ...prev,
        balance: prev.balance + refundAmount,
        withheldPoints: Math.max(0, (prev.withheldPoints || 0) - refundAmount),
      }));

      const tx: Transaction = {
        id: `tx-dispute-refund-${Date.now()}`,
        type: '爭議申訴退還預扣',
        amount: refundAmount,
        platformFee: 0,
        netAmount: refundAmount,
        relatedQuestionTitle: q.title,
        relatedQuestionId: q.id,
        fromUserName: 'IdeaX 平台治理中心',
        toUserName: currentUser.name,
        status: '已完成',
        createdAt: new Date().toISOString(),
        note: `平台審查屬實，已全額退還保留懸賞金 ${refundAmount} 點至錢包可用餘額。`,
      };
      setTransactions((prev) => [tx, ...prev]);
    }

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === questionId
          ? { ...item, disputeStatus: 'resolved_refunded', withheldBounty: 0, status: 'closed' }
          : item
      )
    );

    setNotifications((prev) => [
      {
        id: `notif-refund-${Date.now()}`,
        title: '疑義申訴審查通過・已退還保留點數！',
        message: `平台審查小組已核定您的申訴屬實，保留之 ${refundAmount} 點數已全數退回您的帳戶可用餘額。`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: questionId,
      },
      ...prev,
    ]);
  };

  // Action: Delist or soft-delete a question (強制違規下架處置或直接刪除暫存，均進入 7 日暫存保留期，全站永久持久化並同步至雲端 Firestore 與日誌)
  const delistQuestion = (
    questionId: string,
    reason: string,
    feedback?: string,
    options?: { isDirectDelete?: boolean; alsoDelete?: boolean }
  ) => {
    let targetQ: Question | null = null;
    const nowIso = new Date().toISOString();
    const isDirect = options?.isDirectDelete || reason === '直接刪除' || reason.includes('主動直接刪除');

    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.id === questionId) {
          targetQ = {
            ...q,
            status: 'delisted' as const,
            delistedReason: reason,
            delistedFeedback: feedback || undefined,
            delistedAt: nowIso,
          };
          return targetQ;
        }
        return q;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (targetQ) {
      syncQuestionToFirestore(targetQ);
    } else {
      const existingQ = questions.find((q) => q.id === questionId);
      if (existingQ) {
        syncQuestionToFirestore({
          ...existingQ,
          status: 'delisted' as const,
          delistedReason: reason,
          delistedFeedback: feedback || undefined,
          delistedAt: nowIso,
        });
      }
    }

    // 若為直接刪除或標記刪除，且有未結案預扣懸賞金，自動退還給提問者
    const targetQuestionObj = questions.find((q) => q.id === questionId) || targetQ;
    if (isDirect && targetQuestionObj && targetQuestionObj.status !== 'solved') {
      const refundAmount = targetQuestionObj.withheldBounty || (targetQuestionObj.status === 'open' ? targetQuestionObj.bounty : 0) || 0;
      if (refundAmount > 0) {
        runPointsOp({ op: 'escrow_release', amount: refundAmount, refId: targetQuestionObj.id, mode: 'refund', payerUserId: targetQuestionObj.authorId, note: '提問下架退還預扣' });
        if (currentUser.id === targetQuestionObj.authorId) {
          setCurrentUser((prev) => ({
            ...prev,
            balance: prev.balance + refundAmount,
            withheldPoints: Math.max(0, (prev.withheldPoints || 0) - refundAmount),
          }));
        }

        setAvailableUsers((prev) =>
          prev.map((u) => {
            if (u.id === targetQuestionObj.authorId) {
              const updated = {
                ...u,
                balance: (u.balance || 0) + refundAmount,
                withheldPoints: Math.max(0, (u.withheldPoints || 0) - refundAmount),
              };
              syncUserToFirestore(updated);
              return updated;
            }
            return u;
          })
        );

        const tx: Transaction = {
          id: `tx-del-refund-${Date.now()}`,
          type: '問題下架/刪除退還預扣',
          amount: refundAmount,
          platformFee: 0,
          netAmount: refundAmount,
          relatedQuestionTitle: targetQuestionObj.title,
          relatedQuestionId: targetQuestionObj.id,
          fromUserName: 'IdeaX 平台治理中心',
          toUserName: targetQuestionObj.authorName,
          status: '已完成',
          createdAt: new Date().toISOString(),
          note: `問題已移入 7 日刪除暫存區，系統自動退還提問預扣懸賞金 NT$ ${refundAmount} 點至提問者可用餘額。`,
        };
        setTransactions((prev) => [tx, ...prev]);
        syncTransactionToFirestore(tx);
      }
    }

    // 寫入管理員治理稽核日誌
    syncAuditLogsToFirestore([
      {
        id: `audit-delist-${Date.now()}`,
        adminId: currentUser.id,
        action: isDirect ? `直接刪除問題（移入7日暫存）：${questionId}` : `強制違規下架問題（移入7日暫存）：${questionId}`,
        details: { reason, feedback, isDirectDelete: isDirect, timestamp: nowIso },
        createdAt: nowIso,
      },
    ]);
  };

  // Action: Relist a question (恢復正常上架，全站同步雲端)
  const relistQuestion = (questionId: string) => {
    let targetQ: Question | null = null;
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.id === questionId) {
          targetQ = {
            ...q,
            status: 'open' as const,
            delistedReason: undefined,
            delistedFeedback: undefined,
            delistedAt: undefined,
          };
          return targetQ;
        }
        return q;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (targetQ) {
      syncQuestionToFirestore(targetQ);
    }
  };

  // Action: Delete question permanently (強制永久刪除，徹底抹除資料庫、提問端、管理端、平台端與接案端紀錄，並自動全額退還提問預扣款，已完成交易不受影響)
  const deleteQuestionPermanently = async (questionId: string): Promise<void> => {
    const targetQ = questions.find((q) => q.id === questionId);

    // 1. 若該問題為未完成交易（非 solved 且未結案發放）且有保留/預扣懸賞金，自動全額退還給提問者（已完成交易則不受影響）
    if (targetQ && targetQ.status !== 'solved') {
      const refundAmount = targetQ.withheldBounty || (targetQ.status === 'open' ? targetQ.bounty : 0) || 0;
      if (refundAmount > 0) {
        runPointsOp({ op: 'escrow_release', amount: refundAmount, refId: targetQ.id, mode: 'refund', payerUserId: targetQ.authorId, note: '提問刪除退還預扣' });
        // 退還至提問者帳戶
        if (currentUser.id === targetQ.authorId) {
          setCurrentUser((prev) => ({
            ...prev,
            balance: prev.balance + refundAmount,
            withheldPoints: Math.max(0, (prev.withheldPoints || 0) - refundAmount),
          }));
        }

        setAvailableUsers((prev) =>
          prev.map((u) => {
            if (u.id === targetQ.authorId) {
              const updated = {
                ...u,
                balance: (u.balance || 0) + refundAmount,
                withheldPoints: Math.max(0, (u.withheldPoints || 0) - refundAmount),
              };
              syncUserToFirestore(updated);
              return updated;
            }
            return u;
          })
        );

        // 生成系統退款交易流水
        const tx: Transaction = {
          id: `tx-del-refund-${Date.now()}`,
          type: '問題下架/刪除退還預扣',
          amount: refundAmount,
          platformFee: 0,
          netAmount: refundAmount,
          relatedQuestionTitle: targetQ.title,
          relatedQuestionId: targetQ.id,
          fromUserName: 'IdeaX 平台治理中心',
          toUserName: targetQ.authorName,
          status: '已完成',
          createdAt: new Date().toISOString(),
          note: `問題已永久刪除，系統自動全額退還提問預扣懸賞金 NT$ ${refundAmount} 點至提問者可用餘額。`,
        };
        setTransactions((prev) => [tx, ...prev]);
        syncTransactionToFirestore(tx);

        // 發送系統退款通知給提問者
        setNotifications((prev) => [
          {
            id: `notif-del-refund-${Date.now()}`,
            title: '問題刪除・預扣懸賞金已全額退還',
            message: `您發布之問題《${targetQ.title.slice(0, 20)}...》已自全站永久刪除，原預扣之 NT$ ${refundAmount} 點數已全數退回您的可用餘額。`,
            type: 'system',
            createdAt: '剛剛',
            read: false,
          },
          ...prev,
        ]);
      }
    }

    // 2. 登記至永久刪除黑名單（阻絕 mock 或舊快取重新注入）
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}permanently_deleted_question_ids`);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(questionId)) {
        list.push(questionId);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}permanently_deleted_question_ids`, JSON.stringify(list));
      }
    } catch {}

    // 3. 從提問端、管理端、平台端完全抹除 (questions state & localStorage)
    setQuestions((prev) => {
      const remaining = prev.filter((q) => q.id !== questionId);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    // 4. 從接案端完全抹除關聯提案與紀錄 (answers state & localStorage)
    setAnswers((prev) => {
      const remaining = prev.filter((a) => a.questionId !== questionId);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    // 5. 從對話室與意向完全抹除 (conversations state & localStorage)
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.questionId !== questionId);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}conversations`, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    // 6. 從收藏清單移除
    setBookmarkedQuestionIds((prev) => prev.filter((id) => id !== questionId));

    // 7. 自 Firebase Firestore 雲端資料庫永久刪除 Document 及關聯提案/對話
    await deleteQuestionAndRelatedDataFromFirestore(questionId);

    // 8. 寫入管理員稽核日誌
    syncAuditLogsToFirestore([
      {
        id: `audit-delete-perm-${Date.now()}`,
        adminId: currentUser.id || 'system-admin',
        action: `永久刪除問題並全站抹除紀錄（含資料庫、提問端、管理端、接案端）：${questionId}`,
        details: { questionId, timestamp: new Date().toISOString() },
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  // Action: Batch delete multiple questions permanently from backend
  const deleteQuestionsBatchPermanently = async (questionIds: string[]): Promise<number> => {
    if (!questionIds || questionIds.length === 0) return 0;
    const idSet = new Set(questionIds);

    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}permanently_deleted_question_ids`);
      const list: string[] = raw ? JSON.parse(raw) : [];
      questionIds.forEach((id) => {
        if (!list.includes(id)) list.push(id);
      });
      localStorage.setItem(`${STORAGE_KEY_PREFIX}permanently_deleted_question_ids`, JSON.stringify(list));
    } catch {}

    setQuestions((prev) => {
      const remaining = prev.filter((q) => !idSet.has(q.id));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    setAnswers((prev) => {
      const remaining = prev.filter((a) => !idSet.has(a.questionId));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    setBookmarkedQuestionIds((prev) => prev.filter((id) => !idSet.has(id)));

    await deleteQuestionsFromFirestore(questionIds);
    return questionIds.length;
  };

  // Action: Purge all delisted questions older than 7 days (下架貼文暫存保留7日自動或手動清理，自動退還未完成預扣款)
  const purgeExpiredDelistedQuestions = async (): Promise<number> => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const expiredQuestions = questions.filter(
      (q) => q.status === 'delisted' && q.delistedAt && now - new Date(q.delistedAt).getTime() >= SEVEN_DAYS_MS
    );

    if (expiredQuestions.length === 0) return 0;

    for (const eq of expiredQuestions) {
      await deleteQuestionPermanently(eq.id);
    }

    return expiredQuestions.length;
  };

  // Action: Delete answer/proposal permanently (永久刪除提案/回覆，自全站與雲端資料庫徹底抹除)
  const deleteAnswerPermanently = async (answerId: string): Promise<void> => {
    const targetAns = answers.find((a) => a.id === answerId);
    if (!targetAns) return;

    if (targetAns.isAccepted) {
      alert('此方案已正式獲採納並完成驗收結案，依合約規範無法刪除。');
      return;
    }

    // 1. 登記至永久刪除黑名單
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}permanently_deleted_answer_ids`);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(answerId)) {
        list.push(answerId);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}permanently_deleted_answer_ids`, JSON.stringify(list));
      }
    } catch {}

    // 2. 從 answers state & localStorage 移除
    setAnswers((prev) => {
      const remaining = prev.filter((a) => a.id !== answerId);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    // 3. 更新母問題之 answersCount
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.id === targetAns.questionId) {
          const newQ = { ...q, answersCount: Math.max(0, (q.answersCount || 1) - 1) };
          syncQuestionToFirestore(newQ);
          return newQ;
        }
        return q;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 4. 自 Firebase Firestore 永久物理刪除
    await deleteAnswerFromFirestore(answerId);

    // 5. 寫入稽核日誌
    syncAuditLogsToFirestore([
      {
        id: `audit-delete-answer-${Date.now()}`,
        adminId: currentUser.id,
        action: `永久刪除提案/回覆：${answerId}`,
        details: { answerId, questionId: targetAns.questionId, timestamp: new Date().toISOString() },
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  // 檢查使用者之註銷狀態（「只要這七天內有再登入這個帳號那就視為取消註銷」）
  const checkUserDeactivationStatus = (target: User): {
    canLogin: boolean;
    restoredUser?: User;
    wasInGracePeriod: boolean;
    errorReason?: string;
  } => {
    // 停權期限已過：自動解除
    if (target.isBlocked && !isBlockActive(target)) {
      target = { ...target, isBlocked: false, blockedReason: undefined, blockedUntil: undefined, blockedAt: undefined };
    }
    // 停權中：不可登入
    if (isBlockActive(target)) {
      return {
        canLogin: false,
        wasInGracePeriod: false,
        errorReason: `此帳號已被停權（${describeBlockUntil(target.blockedUntil)}）。理由：${target.blockedReason || '違反平台規範'}。如有疑問請聯絡客服。`,
      };
    }
    if (target.deactivationStatus === 'deactivated') {
      return {
        canLogin: false,
        wasInGracePeriod: false,
        errorReason: '此帳號已超過 7 日反悔猶豫期並已正式註銷完成，無法再登入。',
      };
    }

    const isGracePending =
      target.isDeactivated ||
      target.deactivationStatus === 'pending_grace' ||
      Boolean(target.deactivationRequestedAt);

    if (!isGracePending) {
      return { canLogin: true, restoredUser: target, wasInGracePeriod: false };
    }

    const purgeTime = target.deactivationScheduledPurgeAt
      ? new Date(target.deactivationScheduledPurgeAt).getTime()
      : 0;
    const now = Date.now();

    if (purgeTime > 0 && now >= purgeTime) {
      return {
        canLogin: false,
        wasInGracePeriod: true,
        errorReason: '此帳號已超過 7 日反悔猶豫期，已排程正式註銷完成，無法再登入。',
      };
    }

    // 只要這七天內有再登入這個帳號那就視為取消註銷
    const restoredUser: User = {
      ...target,
      isDeactivated: false,
      deactivationStatus: undefined,
      deactivationRequestedAt: undefined,
      deactivationScheduledPurgeAt: undefined,
      deactivationReason: undefined,
    };

    return {
      canLogin: true,
      restoredUser,
      wasInGracePeriod: true,
    };
  };

  // Action: Request account deactivation (申請註銷帳號，進入 7 日反悔期並自動安全登出)
  const requestAccountDeactivation = async (reason?: string, targetUserId?: string): Promise<void> => {
    const effectiveTargetId = targetUserId || currentUser.id;
    const existingTarget = availableUsers.find((u) => u.id === effectiveTargetId) || (currentUser.id === effectiveTargetId ? currentUser : null);
    if (!existingTarget) return;

    const targetUserName = existingTarget.name;
    const now = new Date();
    const purgeDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const updatedUser: User = {
      ...existingTarget,
      isDeactivated: true,
      deactivationStatus: 'pending_grace',
      deactivationRequestedAt: now.toISOString(),
      deactivationScheduledPurgeAt: purgeDate.toISOString(),
      deactivationReason: reason || '用戶自行申請註銷',
    };

    setAvailableUsers((prev) => {
      const next = prev.map((u) => (u.id === effectiveTargetId ? updatedUser : u));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (currentUser.id === effectiveTargetId) {
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updatedUser));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(updatedUser));
      } catch {}
    }

    await syncUserToFirestore(updatedUser);

    setNotifications((prev) => [
      {
        id: `notif-deact-${Date.now()}`,
        title: '帳號註銷申請已生效・7日反悔猶豫期',
        message: `帳號「${targetUserName}」已進入 7 日註銷猶豫期。系統將於 7 日後（${purgeDate.toLocaleDateString('zh-TW')}）正式完成註銷並清空私密個資。在此 7 日期間內，只要再次登入此帳號，系統即視為取消註銷並自動全面恢復帳號！`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);

    syncAuditLogsToFirestore([
      {
        id: `audit-deact-req-${Date.now()}`,
        adminId: currentUser.id,
        action: `申請帳號註銷（7日反悔猶豫期）：${effectiveTargetId}`,
        details: { reason, purgeAt: purgeDate.toISOString(), timestamp: now.toISOString() },
        createdAt: now.toISOString(),
      },
    ]);

    // 若為當前登入者本人自行註銷：依使用者規範安全登出當前帳號
    if (currentUser.id === effectiveTargetId) {
      logoutAccount(effectiveTargetId);
    }
  };

  // Action: Cancel account deactivation (撤銷註銷帳號，恢復正常狀態)
  const cancelAccountDeactivation = async (targetUser?: User | string): Promise<User | null> => {
    const aliasMap: Record<string, string> = {
      'user-admin': 'a000000001',
      'a000000001': 'user-admin',
      'user-questioner': 'c100000001',
      'c100000001': 'user-questioner',
      'solver-2': 'c200000002',
      'c200000002': 'solver-2',
      'solver-1': 'c100000003',
      'c100000003': 'solver-1',
    };

    let userToRestore: User | undefined;
    if (typeof targetUser === 'string') {
      const aliasId = aliasMap[targetUser];
      userToRestore = availableUsers.find((u) => u.id === targetUser || (aliasId && u.id === aliasId)) || (currentUser.id === targetUser ? currentUser : undefined);
    } else {
      userToRestore = targetUser || currentUser;
    }
    if (!userToRestore) return null;

    const restoredId = userToRestore.id;
    const restoredAliasId = aliasMap[restoredId];

    const updatedUser: User = restoreCanonicalUserIdentity({
      ...userToRestore,
      isDeactivated: false,
      deactivationStatus: undefined,
      deactivationRequestedAt: undefined,
      deactivationScheduledPurgeAt: undefined,
      deactivationReason: undefined,
    });

    setAvailableUsers((prev) => {
      const next = prev.map((u) => {
        const isMatch =
          u.id === restoredId ||
          (restoredAliasId && u.id === restoredAliasId);

        if (isMatch) {
          return restoreCanonicalUserIdentity({
            ...u,
            ...updatedUser,
            id: u.id,
            isDeactivated: false,
            deactivationStatus: undefined,
            deactivationRequestedAt: undefined,
            deactivationScheduledPurgeAt: undefined,
            deactivationReason: undefined,
          });
        }
        return restoreCanonicalUserIdentity(u);
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (currentUser.id === userToRestore.id || (restoredAliasId && currentUser.id === restoredAliasId)) {
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(updatedUser));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updatedUser));
      } catch {}
    }

    await syncUserToFirestore(updatedUser);
    if (restoredAliasId && restoredAliasId !== updatedUser.id) {
      await deleteUsersFromFirestore([restoredAliasId]);
    }

    setNotifications((prev) => [
      {
        id: `notif-cancel-deact-${Date.now()}`,
        title: '已取消帳號註銷！',
        message: `帳號「${updatedUser.name}」已取消註銷，所有資料與功能均完整保留並正常運作。`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);

    return updatedUser;
  };

  // Action: Purge/finalize account deactivation (7日屆滿後正式註銷帳號：清空個人敏感身分，保留公開問題/提案/討論/交易並匿名化為「此帳號已註銷」與灰色頭像)
  const purgeAccountPermanently = async (userId: string): Promise<void> => {
    if (!userId) return;

    // 1. 匿名化並標記該用戶為已正式註銷
    const GRAY_AVATAR =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/%3E%3C/svg%3E';

    let anonymizedUser: User | null = null;

    setAvailableUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId) {
          anonymizedUser = {
            ...u,
            name: '此帳號已註銷',
            title: '已註銷帳號',
            bio: '此帳號已於 7 日反悔期屆滿後完成註銷。',
            avatar: GRAY_AVATAR,
            isDeactivated: true,
            deactivationStatus: 'deactivated',
            realNameAuthStatus: 'none',
            realNameAuthData: undefined,
            realNameData: undefined,
            balance: 0,
            withheldPoints: 0,
          };
          return anonymizedUser;
        }
        return u;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(updated));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. 更新 Solvers 列表中的匿名狀態
    setSolvers((prev) => {
      const updated = prev.map((s) => {
        if (s.id === userId) {
          return {
            ...s,
            name: '此帳號已註銷',
            title: '已註銷專家',
            avatar: GRAY_AVATAR,
            bio: '此專家帳號已完成註銷。',
          };
        }
        return s;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}solvers`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. 同步至 Firebase Cloud Firestore
    if (anonymizedUser) {
      await syncUserToFirestore(anonymizedUser);
    }

    // 4. 若當前登入者為被註銷者，登出並切換至預設帳號
    if (currentUser.id === userId) {
      const fallbackUser = CLEAN_CORE_USERS[0] || {
        id: 'user_guest',
        name: '訪客用戶',
        email: 'guest@ideax.tw',
        role: 'user',
        balance: 0,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        title: '平台訪客',
        bio: '尚未登入',
      };
      setCurrentUser(fallbackUser as User);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(fallbackUser));
      } catch {}
    }

    // 5. 寫入稽核日誌
    syncAuditLogsToFirestore([
      {
        id: `audit-purge-user-${Date.now()}`,
        adminId: 'system-governance',
        action: `帳號7日反悔期屆滿，已正式註銷（歷史問題/提案/討論/交易完整保留並匿名化為灰色頭像）：${userId}`,
        details: { userId, timestamp: new Date().toISOString() },
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  // Action: Purge all expired deactivated accounts (7日反悔期屆滿之註銷帳號自動統一批次清除)
  const purgeExpiredDeactivatedAccounts = async (): Promise<number> => {
    const now = Date.now();
    const expiredUsers = availableUsers.filter(
      (u) => u.isDeactivated && u.deactivationScheduledPurgeAt && now >= new Date(u.deactivationScheduledPurgeAt).getTime()
    );

    if (expiredUsers.length === 0) return 0;

    for (const eu of expiredUsers) {
      await purgeAccountPermanently(eu.id);
    }

    return expiredUsers.length;
  };

  // Action: Scan & delete duplicate accounts from state, localStorage, and Firestore
  const removeDuplicateAccounts = async (): Promise<{
    removedCount: number;
    removedNames: string[];
    remainingCount: number;
  }> => {
    const deletedUsers = getDeletedUserIds();
    let combinedList: User[] = [...availableUsers];
    try {
      const cloudData = await loadAllDataFromFirestore();
      if (cloudData && Array.isArray(cloudData.users) && cloudData.users.length > 0) {
        combinedList = [...combinedList, ...cloudData.users];
      }
    } catch {
      // ignore offline error
    }

    const { uniqueUsers, removedIds, removedNames } = deduplicateUsersList(combinedList, deletedUsers);

    // 同步清理本機快速切換帳號清單中之重複項目
    setDeviceAccounts((prev) => {
      const seenDeviceIds = new Set<string>();
      const seenDeviceNames = new Set<string>();
      const cleaned = prev.filter((da: any) => {
        const daId = da.userId || da.id;
        const canonId =
          daId === 'user-admin'
            ? 'a000000001'
            : daId === 'user-questioner'
            ? 'c100000001'
            : daId === 'solver-2'
            ? 'c200000002'
            : daId === 'solver-1'
            ? 'c100000003'
            : daId;
        if (deletedUsers.has(canonId) || seenDeviceIds.has(canonId)) return false;
        const normName = ((da as any).name || '').trim().toLowerCase();
        if (normName && seenDeviceNames.has(normName)) return false;
        seenDeviceIds.add(canonId);
        if (normName) seenDeviceNames.add(normName);
        return true;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}device_accounts`, JSON.stringify(cleaned));
      } catch {}
      return cleaned;
    });

    setAvailableUsers(uniqueUsers);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(uniqueUsers));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(uniqueUsers));
    } catch {}

    if (removedIds.length > 0) {
      await deleteUsersFromFirestore(removedIds);
    }
    await syncUsersToFirestore(uniqueUsers);

    return {
      removedCount: Math.max(removedIds.length, removedNames.length),
      removedNames,
      remainingCount: uniqueUsers.length,
    };
  };

  // Action: Permanently delete a specific user account from backend database & localStorage
  const deleteUserAccountPermanently = async (
    userId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!userId || userId === 'a000000001' || userId === 'user-admin') {
      return { success: false, message: '系統創始管理員帳號受保護，不可刪除。' };
    }
    const targetUser = availableUsers.find((u) => u.id === userId);
    const targetName = targetUser?.name || userId;
    const aliasId = USER_ALIAS_MAP[userId];
    const idsToDelete = aliasId ? [userId, aliasId] : [userId];

    try {
      const deletedSet = getDeletedUserIds();
      idsToDelete.forEach((id) => deletedSet.add(id));
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}permanently_deleted_user_ids`,
        JSON.stringify(Array.from(deletedSet))
      );
    } catch {}

    setAvailableUsers((prev) => {
      const next = prev.filter((u) => !idsToDelete.includes(u.id));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(next));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(next));
      } catch {}
      return next;
    });

    setDeviceAccounts((prev) => {
      const next = prev.filter((da: any) => !idsToDelete.includes(da.userId || da.id));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}device_accounts`, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (idsToDelete.includes(currentUser.id)) {
      setCurrentUser(GUEST_USER);
      try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_authenticated`);
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_explicit_login`);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(GUEST_USER));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(GUEST_USER));
      } catch {}
    }

    await deleteUsersFromFirestore(idsToDelete);

    return {
      success: true,
      message: `已從資料庫永久刪除帳號「${targetName}」（ID: ${userId}）`,
    };
  };

  // Action: Add test account in demo/test mode (測試模式免註冊免登入一鍵添加測試帳號)
  const addTestAccount = (options?: {
    name?: string;
    role?: 'questioner' | 'solver' | 'admin';
    title?: string;
    balance?: number;
    verifiedExpert?: boolean;
    autoSwitch?: boolean;
  }): User => {
    const role = options?.role || 'solver';
    const randomNum = Math.floor(Math.random() * 900 + 100);
    const id = `test_${role}_${Date.now().toString(36)}_${randomNum}`;
    const name =
      options?.name ||
      (role === 'admin'
        ? `測試管理員 ${randomNum}`
        : role === 'solver'
        ? `測試專家顧問 ${randomNum}`
        : `測試提問者 ${randomNum}`);
    const title =
      options?.title ||
      (role === 'admin'
        ? '平台運營風控測試員'
        : role === 'solver'
        ? 'AI 商業策略與技術架構專家'
        : '新創專案產品負責人');
    const balance =
      typeof options?.balance === 'number'
        ? options.balance
        : role === 'solver'
        ? 8000
        : 15000;

    const avatarList = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    ];
    const avatar = avatarList[Math.floor(Math.random() * avatarList.length)];

    const newUser: User = {
      id,
      name,
      email: `${id}@test.ideax.tw`,
      role,
      title,
      bio: `【測試環境一鍵生成帳號】專為免註冊、免登入快速驗證各項功能而建立。`,
      avatar,
      balance,
      pendingEarnings: 0,
      reputation: 100,
      joinedDate: new Date().toISOString().split('T')[0],
      withheldPoints: 0,
      verifiedBadge: (options?.verifiedExpert ?? (role === 'solver')) ? 'AI 專家顧問' : undefined,
      verifiedExpert: options?.verifiedExpert ?? (role === 'solver'),
      reputationPoints: 120,
      submittedSolutionsCount: role === 'solver' ? 6 : 0,
      acceptanceRate: role === 'solver' ? 96 : undefined,
      hasAgreedGeneralTerms: true,
      hasAgreedQuestionerTerms: true,
      hasAgreedSolverTerms: true,
    };

    setAvailableUsers((prev) => {
      const updated = [newUser, ...prev];
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(updated));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (role === 'solver') {
      const newSolver: Solver = {
        id,
        name,
        title,
        avatar,
        domain: '創新創業',
        skills: ['商業模式', '市場驗證', '落地方案'],
        rating: 4.9,
        reviewCount: 9,
        answerCount: 6,
        acceptedRate: 96,
        tier: '認證專家',
        bio: newUser.bio || 'AI 商業策略專家',
        earnings: 18000,
        verifiedBadge: true,
        featuredCase: {
          title: 'AI 商業化落地方案',
          description: '協助企業落地 AI 策略顧問與系統對接',
          outcome: '成功提升 3 倍營運效能並縮短 40% 決策週期',
        },
      };
      setSolvers((prev) => {
        const updated = [newSolver, ...prev];
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}solvers`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      syncSolversToFirestore([newSolver]);
    }

    syncUserToFirestore(newUser);

    if (options?.autoSwitch !== false) {
      setCurrentUser(newUser);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(newUser));
      } catch {}
    }

    setNotifications((prev) => [
      {
        id: `notif-test-acc-${Date.now()}`,
        title: '🧪 測試帳號已成功建立！',
        message: `已免註冊免登入一鍵生成測試帳號【${name}】（${role === 'solver' ? '專家解答者' : role === 'admin' ? '管理員' : '提問者'}，初始點數 NT$ ${balance.toLocaleString()}），並已切換為當前使用帳號。`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);

    return newUser;
  };

  // Action: accept phase delivery
  const acceptPhaseDelivery = (questionId: string, answerId: string, phaseIndex: number) => {
    const ans = answers.find((a) => a.id === answerId);
    if (!ans || !ans.phases || !ans.phases[phaseIndex]) return;

    const phase = ans.phases[phaseIndex];
    const pointsNeeded = phase.points;

    if (currentUser.balance < pointsNeeded) {
      return;
    }

    // Withhold points from currentUser
    runPointsOp({ op: 'escrow_hold', amount: pointsNeeded, refId: `${answerId}#phase${phaseIndex}`, note: '階段交付預扣' }, '階段預扣未完成');
    setCurrentUser((prev) => ({
      ...prev,
      balance: prev.balance - pointsNeeded,
      withheldPoints: (prev.withheldPoints || 0) + pointsNeeded,
    }));

    // Update phase status
    setAnswers((prev) =>
      prev.map((a) => {
        if (a.id === answerId && a.phases) {
          const updatedPhases = [...a.phases];
          updatedPhases[phaseIndex] = {
            ...updatedPhases[phaseIndex],
            status: 'in_progress',
            acceptedAt: new Date().toISOString(),
          };
          return { ...a, phases: updatedPhases };
        }
        return a;
      })
    );

    const tx: Transaction = {
      id: `tx-phase-withhold-${Date.now()}`,
      type: '階段方案預扣',
      amount: pointsNeeded,
      platformFee: 0,
      netAmount: pointsNeeded,
      relatedQuestionTitle: questions.find((q) => q.id === questionId)?.title,
      relatedQuestionId: questionId,
      fromUserName: currentUser.name,
      toUserName: ans.solverName,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `已接受「${phase.title}」，預扣託管 ${pointsNeeded} 點`,
    };
    setTransactions((prev) => [tx, ...prev]);
  };

  // Action: release phase payout upon verification
  const releasePhasePayout = (questionId: string, answerId: string, phaseIndex: number) => {
    const ans = answers.find((a) => a.id === answerId);
    if (!ans || !ans.phases || !ans.phases[phaseIndex]) return;

    const phase = ans.phases[phaseIndex];
    const pointsToRelease = phase.points;

    // Release from currentUser withheld points
    runPointsOp({ op: 'escrow_release', amount: pointsToRelease, refId: `${answerId}#phase${phaseIndex}`, mode: 'payout', note: '階段驗收撥付' });
    setCurrentUser((prev) => ({
      ...prev,
      withheldPoints: Math.max(0, (prev.withheldPoints || 0) - pointsToRelease),
    }));

    const split = calculateSplitPayout(pointsToRelease, ans.solverId);

    // Credit solver
    setAvailableUsers((prev) =>
      prev.map((u) =>
        u.id === ans.solverId
          ? {
              ...u,
              totalPaidOut: (u.totalPaidOut || 0) + split.netPayout,
              totalRevenue: (u.totalRevenue || 0) + pointsToRelease,
            }
          : u
      )
    );
    if (currentUser.id === ans.solverId) {
      setCurrentUser((prev) => ({
        ...prev,
        totalPaidOut: (prev.totalPaidOut || 0) + split.netPayout,
        totalRevenue: (prev.totalRevenue || 0) + pointsToRelease,
      }));
    }

    // Mark phase accepted
    setAnswers((prev) =>
      prev.map((a) => {
        if (a.id === answerId && a.phases) {
          const updatedPhases = [...a.phases];
          updatedPhases[phaseIndex] = {
            ...updatedPhases[phaseIndex],
            status: 'accepted',
          };
          return { ...a, phases: updatedPhases };
        }
        return a;
      })
    );

    const tx: Transaction = {
      id: `tx-phase-payout-${Date.now()}`,
      type: '階段交付拆款撥付',
      amount: pointsToRelease,
      platformFee: split.platformFee,
      feeRate: split.feeRate,
      bonusAmount: split.bonusAmount,
      netAmount: split.netPayout,
      paymentMethod: '履約託管結算撥付',
      payoutStatus: '已撥款至銀行帳戶',
      bankAccountSnapshot: split.bankAccountSnapshot,
      relatedQuestionTitle: questions.find((q) => q.id === questionId)?.title,
      relatedQuestionId: questionId,
      fromUserName: currentUser.name,
      toUserName: ans.solverName,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `「${phase.title}」階段交付驗收通過，履約託管款項 NT$ ${pointsToRelease.toLocaleString()} 元結算撥付：解答者實收 NT$ ${split.netPayout.toLocaleString()} 元（${split.feeDiscountText}），平台服務費 NT$ ${split.platformFee.toLocaleString()} 元。已直撥 ${split.bankAccountSnapshot}。`,
    };
    setTransactions((prev) => [tx, ...prev]);
  };

  // Action: refund phase payout if solver rejects or cancels
  const refundPhasePayout = (questionId: string, answerId: string, phaseIndex: number) => {
    const ans = answers.find((a) => a.id === answerId);
    if (!ans || !ans.phases || !ans.phases[phaseIndex]) return;

    const phase = ans.phases[phaseIndex];
    const pointsToRefund = phase.points;

    // Refund to currentUser
    runPointsOp({ op: 'escrow_release', amount: pointsToRefund, refId: `${answerId}#phase${phaseIndex}`, mode: 'refund', note: '階段退款' });
    setCurrentUser((prev) => ({
      ...prev,
      withheldPoints: Math.max(0, (prev.withheldPoints || 0) - pointsToRefund),
    }));

    setAnswers((prev) =>
      prev.map((a) => {
        if (a.id === answerId && a.phases) {
          const updatedPhases = [...a.phases];
          updatedPhases[phaseIndex] = {
            ...updatedPhases[phaseIndex],
            status: 'refunded',
          };
          return { ...a, phases: updatedPhases };
        }
        return a;
      })
    );

    const tx: Transaction = {
      id: `tx-phase-refund-${Date.now()}`,
      type: '爭議審查退款',
      amount: pointsToRefund,
      platformFee: 0,
      netAmount: pointsToRefund,
      paymentMethod: '原支付方式原路退回',
      payoutStatus: '已原路退款',
      relatedQuestionTitle: questions.find((q) => q.id === questionId)?.title,
      relatedQuestionId: questionId,
      fromUserName: 'IdeaX 履約託管中心',
      toUserName: currentUser.name,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `「${phase.title}」階段未達成驗收，履約託管 NT$ ${pointsToRefund.toLocaleString()} 元已原路退回付款帳戶。`,
    };
    setTransactions((prev) => [tx, ...prev]);
  };

  // Action: subscribe or change subscription plan via Third-party Payment
  // 規則：轉換為一般會員不需要重新扣款，視為取消會員資格。任何變換方案都會在下個期間開始生效。
  const subscribePlan = (
    tier: SubscriptionTier,
    cycle: 'monthly' | 'semi_annual' | 'annual' = 'monthly',
    paymentMethod: string = '平台點數扣點'
  ): { success: boolean; message: string } => {
    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan) return { success: false, message: '無效的方案' };

    const currentTier = currentUser.subscriptionTier || 'free';
    const currentExpiry = currentUser.subscriptionExpiresAt || '2026-10-31';

    // 情況 1：轉換為一般會員（free）
    // 轉換為一般會員不需要重新扣款 (免扣款 / 0 點)，視為取消會員資格。任何變換方案都會在下個期間開始。
    if (tier === 'free') {
      if (currentTier === 'free') {
        return { success: true, message: '您目前已經是一般會員，無需重新扣點。' };
      }

      // 現有付費會員轉為一般會員 -> 視為取消會員資格，下個期間開始生效，不重新扣款
      setCurrentUser((prev) => ({
        ...prev,
        nextSubscriptionTier: 'free',
        nextSubscriptionCycle: undefined,
        nextSubscriptionEffectiveAt: currentExpiry,
      }));

      setAvailableUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? {
                ...u,
                nextSubscriptionTier: 'free',
                nextSubscriptionCycle: undefined,
                nextSubscriptionEffectiveAt: currentExpiry,
              }
            : u
        )
      );

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: '已申請轉換為一般會員（視為取消會員資格）',
          message: `您已申請轉換為一般會員，不需要重新扣點。此操作視為取消會員資格，現有特權將保留享有至本期到期（${currentExpiry}），下個期間開始正式轉換為一般會員。`,
          type: 'system',
          createdAt: '剛剛',
          read: false,
        },
        ...prev,
      ]);

      return {
        success: true,
        message: `已為您設定轉換為一般會員（視為取消會員資格，不需要重新扣點）。目前權益仍享有至本期到期日（${currentExpiry}），將於下個期間開始正式生效。`,
      };
    }

    const selectedCycle = plan.billingCycles.find((c) => c.cycle === cycle) || plan.billingCycles[0];
    const price = selectedCycle.price;
    const durationMonths = selectedCycle.durationMonths || 1;
    const cycleDisplay = selectedCycle.label || `月繳 ${price.toLocaleString()} 點`;

    // 情況 2：若當前已有付費方案，進行「變換方案」
    if (currentTier !== 'free') {
      setCurrentUser((prev) => ({
        ...prev,
        nextSubscriptionTier: tier,
        nextSubscriptionCycle: cycle,
        nextSubscriptionEffectiveAt: currentExpiry,
      }));

      setAvailableUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? {
                ...u,
                nextSubscriptionTier: tier,
                nextSubscriptionCycle: cycle,
                nextSubscriptionEffectiveAt: currentExpiry,
              }
            : u
        )
      );

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: `預約變更為「${plan.name}」成功`,
          message: `您已預約變換方案！任何變換方案都會在下個期間開始（${currentExpiry}）生效，屆時將依新方案（${cycleDisplay}）進行續訂扣點。本期享有原方案權益，不重複扣點。`,
          type: 'system',
          createdAt: '剛剛',
          read: false,
        },
        ...prev,
      ]);

      return {
        success: true,
        message: `已成功預約變換為「${plan.name}」！任何變換方案都會在下個期間開始（${currentExpiry}）生效，本期不重複扣點。`,
      };
    }

    // 情況 3：一般會員（free）首次訂閱付費方案（僅支援平台點數扣點）
    if (!isNoPaymentMode && !isRaceMode && price > 0 && (currentUser.balance || 0) < price) {
      return {
        success: false,
        message: `您的平台點數餘額不足（目前餘額 ${(currentUser.balance || 0).toLocaleString()} 點 / 需支付 ${price.toLocaleString()} 點）。目前暫時僅支援以平台點數扣點。`,
      };
    }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + durationMonths);
    const expiryStr = expiry.toISOString().split('T')[0];

    // 正式模式：由伺服器扣點並開通方案（方案等級只能由伺服器設定）
    runPointsOp({ op: 'subscribe', tier, cycle }, '方案訂閱未完成', () => {
      setCurrentUser((prev) => ({ ...prev, subscriptionTier: currentTier, subscriptionExpiresAt: currentUser.subscriptionExpiresAt }));
    });
    setCurrentUser((prev) => ({
      ...prev,
      balance: !isNoPaymentMode && !isRaceMode ? Math.max(0, (prev.balance || 0) - price) : prev.balance,
      subscriptionTier: tier,
      subscriptionExpiresAt: expiryStr,
      nextSubscriptionTier: undefined,
      nextSubscriptionCycle: undefined,
      nextSubscriptionEffectiveAt: undefined,
    }));

    setAvailableUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              balance: !isNoPaymentMode && !isRaceMode ? Math.max(0, (u.balance || 0) - price) : u.balance,
              subscriptionTier: tier,
              subscriptionExpiresAt: expiryStr,
              nextSubscriptionTier: undefined,
              nextSubscriptionCycle: undefined,
              nextSubscriptionEffectiveAt: undefined,
            }
          : u
      )
    );

    const cleanSubTitle = `開通會員方案「${plan.name}（${cycleDisplay}）」`;

    const tx: Transaction = {
      id: `tx-sub-${Date.now()}`,
      type: '會員訂閱',
      amount: price,
      platformFee: 0,
      feeRate: 0,
      netAmount: price,
      paymentMethod: '平台點數扣點',
      payoutStatus: '已完成',
      relatedQuestionTitle: cleanSubTitle,
      fromUserName: currentUser.name,
      toUserName: '創點子 IdeaX 平台',
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: cleanSubTitle,
    };
    setTransactions((prev) => [tx, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `成功開通「${plan.name}」！`,
        message: `您已完成扣抵 ${price.toLocaleString()} 點成功開通「${plan.name}」。即日起所有方案交易之服務費享有「${plan.feeDiscountText}」（解答者實收 ${plan.sellerPayoutText}）！後續任何變換方案均會在下個期間開始生效。`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);

    return {
      success: true,
      message: `成功扣抵 ${price.toLocaleString()} 點開通「${plan.name}」！即刻享有服務費 ${plan.feeDiscountText}（實收 ${plan.sellerPayoutText}）。`,
    };
  };

  // Action: cancel pending plan change (撤銷預約變更，保留原方案續約)
  const cancelPendingPlanChange = (): { success: boolean; message: string } => {
    setCurrentUser((prev) => ({
      ...prev,
      nextSubscriptionTier: undefined,
      nextSubscriptionCycle: undefined,
      nextSubscriptionEffectiveAt: undefined,
    }));

    setAvailableUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              nextSubscriptionTier: undefined,
              nextSubscriptionCycle: undefined,
              nextSubscriptionEffectiveAt: undefined,
            }
          : u
      )
    );

    return {
      success: true,
      message: '已撤銷下期方案變更預約，將維持原方案自動續訂。',
    };
  };


  // Action: toggle privacy settings (是否隱藏提問數據)
  const togglePrivacySettings = (hideStats: boolean) => {
    setCurrentUser((prev) => ({
      ...prev,
      hideQuestionStats: hideStats,
    }));
  };

  // Action: Start or open direct chat
  const startDirectChat = (
    targetUser: { id: string; name: string; avatar: string; title: string; accountType?: string; role?: string },
    question?: Question
  ): string => {
    if (currentUser.id === 'user-guest') {
      promptLogin('訪客請先登入帳號以開始私訊交流');
      return '';
    }

    const isMe = (id?: string) =>
      id === currentUser.id ||
      (currentUser.role === 'admin' && (id === 'user-admin' || id === 'a000000001'));

    // Check if conversation already exists between currentUser and targetUser
    const existing = conversations.find(
      (c) =>
        !c.isGroup &&
        c.participantIds &&
        c.participantIds.some((id) => isMe(id)) &&
        c.participantIds.includes(targetUser.id)
    );

    if (existing) {
      setActiveConversationId(existing.id);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}active_conversation_id`, existing.id);
      } catch {}
      setConversations((prev) =>
        prev.map((c) => (c.id === existing.id ? { ...c, unreadCount: 0 } : c))
      );
      return existing.id;
    }

    const targetRole = targetUser.accountType === 'enterprise' || targetUser.role === 'enterprise' ? '企業機構' : '一般用戶';
    const myRoleTitle = currentUser.role === 'admin' ? (currentUser.title || '平台管理員') : (currentUser.title || '一般用戶');

    const newConv: ChatConversation = {
      id: `conv-${Date.now()}`,
      participantIds: [currentUser.id, targetUser.id],
      conversationRole: 'questioner',
      participantDetails: [
        {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          title: myRoleTitle,
        },
        {
          id: targetUser.id,
          name: targetUser.name,
          avatar: targetUser.avatar,
          title: targetUser.title || targetRole,
        },
      ],
      relatedQuestionId: question?.id,
      relatedQuestionTitle: question?.title,
      lastMessage: question
        ? `您好，我是 ${currentUser.name}，想針對「${question.title}」跟您進一步討論！`
        : `您好，我是 ${currentUser.name}，很高興認識您！`,
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          text: question
            ? `您好，我是 ${currentUser.name}，想針對「${question.title}」跟您進一步討論！`
            : `您好，我是 ${currentUser.name}，很高興認識您！`,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}active_conversation_id`, newConv.id);
      const savedConvs = localStorage.getItem(`${STORAGE_KEY_PREFIX}conversations`);
      const parsedConvs = savedConvs ? JSON.parse(savedConvs) : [];
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}conversations`,
        JSON.stringify([newConv, ...parsedConvs.filter((c: any) => c.id !== newConv.id)])
      );
    } catch {}
    void pushConversationToCloud(newConv, currentUser.id);
    return newConv.id;
  };

  // Helper: 判定是否為特邀人員「貝拉」或管理員身份（除了管理員身份或貝拉入群組外，其餘用戶不會加入平台核心管理群）
  const isBellaUser = (user?: { name?: string; username?: string; id?: string; email?: string } | null): boolean => {
    if (!user) return false;
    const name = (user.name || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    const id = (user.id || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return (
      name.includes('貝拉') ||
      name.includes('bella') ||
      username.includes('bella') ||
      id === 'user-bella' ||
      email.includes('bella')
    );
  };

  const isQualifiedForCoreAdminGroup = (user?: { role?: string; name?: string; username?: string; id?: string; email?: string } | null): boolean => {
    if (!user) return false;
    return user.role === 'admin' || isBellaUser(user);
  };

  // Action: Create Group Conversation (for vendors, admins, and users)
  const createGroupConversation = (groupName: string, participantIds: string[]): string => {
    const isCoreName = groupName.includes('平台核心管理群') || groupName.includes('平台管理員核心協作群組');
    let targetParticipantIds = participantIds;

    // 嚴格規則：若為平台核心管理群，除管理員與貝拉外，其餘用戶一律不可加入
    if (isCoreName) {
      targetParticipantIds = participantIds.filter((id) => {
        const u = availableUsers.find((user) => user.id === id) || (id === currentUser.id ? currentUser : null);
        return isQualifiedForCoreAdminGroup(u);
      });
    }

    // 嚴格規則：一般用戶建立群組時，不可拉非私聊對象、管理員或測試帳號
    if (currentUser.role !== 'admin') {
      const allowedPartnerIds = new Set<string>();
      conversations.forEach((conv) => {
        if (!conv.isGroup && Array.isArray(conv.participantIds)) {
          conv.participantIds.forEach((pid) => {
            if (pid && pid !== currentUser.id) allowedPartnerIds.add(pid);
          });
        }
      });

      targetParticipantIds = targetParticipantIds.filter((id) => {
        if (!allowedPartnerIds.has(id)) return false;
        const u = availableUsers.find((user) => user.id === id);
        if (!u) return false;
        const isAdmin =
          u.role === 'admin' ||
          u.accountType === 'admin' ||
          u.id === 'user-admin' ||
          u.id === 'a000000001' ||
          u.id.startsWith('a') ||
          u.email === 'operations@ideax.io';
        if (isAdmin) return false;
        const isTest =
          u.isTestAccount === true ||
          u.isSimulated === true ||
          u.id.startsWith('test-') ||
          u.id.startsWith('solver-') ||
          u.id.startsWith('user-author-') ||
          u.id === 'user-guest' ||
          u.id === 'c000000000' ||
          u.name?.includes('測試') ||
          u.username?.includes('test') ||
          isTestAccountUserId(u.id);
        if (isTest) return false;
        return true;
      });
    }

    const allParticipantIds = Array.from(new Set([currentUser.id, ...targetParticipantIds]));
    const details = allParticipantIds.map((id) => {
      const u = availableUsers.find((user) => user.id === id) || (id === currentUser.id ? currentUser : { id, name: '平台成員', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', title: '協作成員' });
      const isAdminUser = 'role' in u && u.role === 'admin';
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        title: isAdminUser ? (u.title || '平台管理員') : isBellaUser(u) ? (u.title || '特邀成員・貝拉') : (u.title || '平台成員'),
      };
    });

    const newGroupConv: ChatConversation = {
      id: `group-conv-${Date.now()}`,
      participantIds: allParticipantIds,
      participantDetails: details,
      isGroup: true,
      groupName,
      lastMessage: '群組已成功建立，歡迎開始多方協作',
      lastMessageTime: '剛剛',
      unreadCount: 0,
      messages: [
        {
          id: `msg-group-init-${Date.now()}`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          text: `【系統協作】群組「${groupName}」已由 ${currentUser.name} 建立，已將 ${allParticipantIds.length} 位成員加入群組。`,
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
      ],
    };

    setConversations((prev) => [newGroupConv, ...prev]);
    setActiveConversationId(newGroupConv.id);
    return newGroupConv.id;
  };

  // Ensure Automatic Admin Group Conversation Exists: 僅管理員身份與貝拉可加入平台核心管理群
  useEffect(() => {
    const isCurrentUserQualified = isQualifiedForCoreAdminGroup(currentUser);

    if (isCurrentUserQualified) {
      // 找出全站符合資格的管理員與貝拉
      const qualifiedUsers = availableUsers.filter((u) => isQualifiedForCoreAdminGroup(u));
      const qualifiedIds = Array.from(new Set([currentUser.id, ...qualifiedUsers.map((a) => a.id)]));
      const details = qualifiedIds.map((id) => {
        const u = availableUsers.find((user) => user.id === id) || currentUser;
        return {
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          title: u.role === 'admin' ? (u.title || '平台管理員') : (u.title || '特邀營運代表・貝拉'),
        };
      });

      setConversations((prev) => {
        const existingIdx = prev.findIndex(
          (c) => c.id === 'group-admin-core' || (c.isGroup && (c.groupName === '平台核心管理群' || c.groupName === '平台管理員核心協作群組'))
        );

        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          // 嚴格過濾清洗：確保參與者清單中只存在管理員與貝拉，其餘非管理員/非貝拉用戶全數排除
          const sanitizedIds = existing.participantIds.filter((id) => {
            const u = availableUsers.find((user) => user.id === id) || (id === currentUser.id ? currentUser : null);
            return isQualifiedForCoreAdminGroup(u);
          });
          const mergedIds = Array.from(new Set([...sanitizedIds, ...qualifiedIds]));
          const updatedDetails = mergedIds.map((id) => {
            const u = availableUsers.find((user) => user.id === id) || currentUser;
            return {
              id: u.id,
              name: u.name,
              avatar: u.avatar,
              title: u.role === 'admin' ? (u.title || '平台管理員') : (u.title || '特邀營運代表・貝拉'),
            };
          });

          const updatedConv: ChatConversation = {
            ...existing,
            groupName: '平台核心管理群',
            participantIds: mergedIds,
            participantDetails: updatedDetails,
          };
          const next = [...prev];
          next[existingIdx] = updatedConv;
          return next;
        } else {
          const adminGroupConv: ChatConversation = {
            id: 'group-admin-core',
            participantIds: qualifiedIds,
            participantDetails: details,
            isGroup: true,
            groupName: '平台核心管理群',
            lastMessage: '系統公告：平台核心管理群已啟動（僅限管理員與貝拉入群協作）',
            lastMessageTime: '剛剛',
            unreadCount: 0,
            messages: [
              {
                id: 'msg-admin-group-init',
                senderId: 'system',
                senderName: 'IdeaX 系統核心',
                senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
                text: '【系統公告】平台核心管理群已自動建立，本群組僅限管理員身份與特邀代表（貝拉）入群協作，其餘一般用戶不會加入平台核心管理群，確保平台治理機密與審核安全。',
                createdAt: new Date().toISOString(),
                isSystem: true,
              },
            ],
          };
          return [adminGroupConv, ...prev];
        }
      });
    } else {
      // 若非管理員且非貝拉，嚴格確保對話列表不包含「平台核心管理群」
      setConversations((prev) => {
        return prev.filter(
          (c) => !(c.id === 'group-admin-core' || (c.isGroup && (c.groupName === '平台核心管理群' || c.groupName === '平台管理員核心協作群組')))
        );
      });
    }
  }, [currentUser?.role, currentUser?.name, currentUser?.id]);

  // Action: Send message in chat (with optional custom offer or image/file attachment)
  const sendMessage = (
    conversationId: string,
    text: string,
    offerData?: Omit<ChatCustomOffer, 'id' | 'status' | 'creatorId' | 'creatorName'>,
    attachment?: { type: 'image' | 'file'; url?: string; name: string; size?: string },
    userCard?: ChatUserCard
  ) => {
    if (currentUser.isBlocked) {
      addNotification('帳號停權警告', `⚠️ 您的帳號已被管理員停權處分（原因：${currentUser.blockedReason || '違反平台規範'}），在解封前無法發送私聊！如有疑問請聯繫客服。`, 'system');
      return;
    }
    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      offer: offerData
        ? {
            ...offerData,
            id: `offer-${Date.now()}`,
            status: 'pending' as const,
            creatorId: currentUser.id,
            creatorName: currentUser.name,
          }
        : undefined,
      attachment,
      userCard,
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          const displaySummary = userCard
            ? `[用戶名片] ${userCard.name} (${userCard.title || '平台成員'})`
            : offerData
            ? `[專屬自訂方案 NT$ ${offerData.price}] ${offerData.title}`
            : attachment
            ? attachment.type === 'image'
              ? `[圖片] ${attachment.name}`
              : `[附件檔案] ${attachment.name}`
            : text.trim();
          return {
            ...conv,
            lastMessage: displaySummary,
            lastMessageTime: '剛剛',
            messages: [...conv.messages, newMsg],
          };
        }
        return conv;
      })
    );

    // 24hr AI特助代客服務：若對方為離線專家（權威方案以上且開啟特助代管）
    const targetConv = conversations.find((c) => c.id === conversationId);
    if (targetConv && !targetConv.isGroup && text.trim().length > 0) {
      const recipientId = targetConv.participantIds.find((id) => id !== currentUser.id);
      const recipientUser = availableUsers.find((u) => u.id === recipientId);
      const assistantConfig = recipientUser?.assistant24hrConfig;

      if (recipientUser && assistantConfig && assistantConfig.isEnabled) {
        // 防惡意消耗 Tokens 防火牆：檢核單日單對話上限
        const todayStr = new Date().toISOString().split('T')[0];
        const todayCount = (targetConv.messages || []).filter(
          (m) =>
            m.senderId === recipientUser.id &&
            (m.isAiAssistant || m.senderName.includes('AI特助')) &&
            m.createdAt.startsWith(todayStr)
        ).length;

        const dailyLimit = assistantConfig.dailyMessageLimitPerChat || 30;
        if (todayCount < dailyLimit) {
          // 模擬專家離線召喚時間或即時代客應答 (1.8 秒延遲)
          setTimeout(async () => {
            try {
              const res = await generate24hrAssistantReply({
                solverName: recipientUser.name,
                solverTitle: recipientUser.title,
                config: assistantConfig,
                conversationHistory: [
                  ...targetConv.messages.slice(-5).map((m) => ({
                    senderName: m.senderName,
                    text: m.text,
                    isSelf: m.senderId === recipientUser.id,
                  })),
                  { senderName: currentUser.name, text: text.trim(), isSelf: false },
                ],
                latestMessage: text.trim(),
              });

              if (res && res.replyText) {
                const assistantMsg: ChatMessage = {
                  id: `msg-assistant-${Date.now()}`,
                  senderId: recipientUser.id,
                  senderName: `${recipientUser.name} 的 24hr AI 特助`,
                  senderAvatar: recipientUser.avatar,
                  text: res.replyText,
                  createdAt: new Date().toISOString(),
                  isAiAssistant: true,
                };

                setConversations((inner) =>
                  inner.map((c) => {
                    if (c.id === conversationId) {
                      return {
                        ...c,
                        lastMessage: `[24hr AI特助代答] ${res.replyText.slice(0, 30)}...`,
                        lastMessageTime: '剛剛',
                        messages: [...c.messages, assistantMsg],
                      };
                    }
                    return c;
                  })
                );

                // 更新特助累計代答次數
                setAvailableUsers((users) =>
                  users.map((u) => {
                    if (u.id === recipientUser.id && u.assistant24hrConfig) {
                      return {
                        ...u,
                        assistant24hrConfig: {
                          ...u.assistant24hrConfig,
                          todayReplyCount: (u.assistant24hrConfig.todayReplyCount || 0) + 1,
                          totalAssistedCount: (u.assistant24hrConfig.totalAssistedCount || 0) + 1,
                          lastActiveAt: new Date().toISOString(),
                        },
                      };
                    }
                    return u;
                  })
                );
              }
            } catch (err) {
              console.warn('AI Assistant offline reply error:', err);
            }
          }, 1800);
        } else if (todayCount === dailyLimit) {
          // 達到 30 則/日/聊天室 上限時，特助發送委婉提醒並暫停自動代答，保護 Token 並通知專家親自接手
          setTimeout(() => {
            const limitExceededNoticeMsg: ChatMessage = {
              id: `msg-assistant-limit-${Date.now()}`,
              senderId: recipientUser.id,
              senderName: `${recipientUser.name} 的 24hr AI 特助`,
              senderAvatar: recipientUser.avatar,
              text: `【系統代答上限提醒】您好！今日 24hr AI 特助已在此聊天室為您代客服務達上限（${dailyLimit} 則/日/聊天室）。您的所有提問與需求細節已完整記錄並即時通知專家，請您稍候專家上線親自為您接手解答！`,
              createdAt: new Date().toISOString(),
              isAiAssistant: true,
            };

            setConversations((inner) =>
              inner.map((c) => {
                if (c.id === conversationId) {
                  return {
                    ...c,
                    lastMessage: `[24hr AI特助代答已達上限] 請靜候專家上線親自回覆`,
                    lastMessageTime: '剛剛',
                    messages: [...c.messages, limitExceededNoticeMsg],
                  };
                }
                return c;
              })
            );
          }, 1500);
        }
      }
    }
  };

  // Action: Accept and pay for custom offer directly in chat (僅支援平台點數扣點)
  const acceptChatOffer = (conversationId: string, messageId: string): boolean => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return false;
    const msg = conv.messages.find((m) => m.id === messageId);
    if (!msg || !msg.offer || msg.offer.status !== 'pending') return false;

    const offer = msg.offer;
    const price = offer.price;

    if (!isNoPaymentMode && !isRaceMode && price > 0 && (currentUser.balance || 0) < price) {
      return false;
    }

    if (price > 0) {
      runPointsOp({ op: 'spend', amount: price, purpose: 'chat_offer', refId: messageId }, '方案付款未完成');
    }
    if (!isNoPaymentMode && !isRaceMode && price > 0) {
      setCurrentUser((prev) => ({
        ...prev,
        balance: Math.max(0, (prev.balance || 0) - price),
      }));
      setAvailableUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, balance: Math.max(0, (u.balance || 0) - price) }
            : u
        )
      );
    }

    const split = calculateSplitPayout(price, offer.creatorId);

    // Update offer status to accepted
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId && m.offer
                ? { ...m, offer: { ...m.offer, status: 'accepted' as const, buyerId: currentUser.id } }
                : m
            ),
          };
        }
        return c;
      })
    );

    // Credit solver's paid out & update stats in availableUsers
    setAvailableUsers((prev) =>
      prev.map((u) =>
        u.id === offer.creatorId
          ? {
              ...u,
              totalPaidOut: (u.totalPaidOut || 0) + split.netPayout,
              totalRevenue: (u.totalRevenue || 0) + price,
              acceptedSolutionsCount: (u.acceptedSolutionsCount || 0) + 1,
              submittedSolutionsCount: (u.submittedSolutionsCount || 0) + 1,
            }
          : u
      )
    );

    // If currentUser happens to be the creator, also update currentUser
    if (currentUser.id === offer.creatorId) {
      setCurrentUser((prev) => ({
        ...prev,
        totalPaidOut: (prev.totalPaidOut || 0) + split.netPayout,
        totalRevenue: (prev.totalRevenue || 0) + price,
        acceptedSolutionsCount: (prev.acceptedSolutionsCount || 0) + 1,
        submittedSolutionsCount: (prev.submittedSolutionsCount || 0) + 1,
      }));
    }

    // Update solver in directory & recalculate acceptance rate
    setSolvers((prev) =>
      prev.map((s) => {
        if (s.id === offer.creatorId) {
          const newAnswerCount = s.answerCount + 1;
          const currentAccepted = Math.round(s.answerCount * (s.acceptedRate / 100)) || 0;
          const newAccepted = currentAccepted + 1;
          const newRate = Math.min(100, Math.round((newAccepted / newAnswerCount) * 100));
          return {
            ...s,
            earnings: s.earnings + split.netPayout,
            answerCount: newAnswerCount,
            acceptedRate: newRate,
          };
        }
        return s;
      })
    );

    // Record transaction
    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      type: '私聊自訂方案交易',
      amount: price,
      platformFee: split.platformFee,
      feeRate: split.feeRate,
      bonusAmount: split.bonusAmount,
      netAmount: split.netPayout,
      paymentMethod: '平台點數扣點',
      payoutStatus: '已撥款至銀行帳戶',
      bankAccountSnapshot: split.bankAccountSnapshot,
      relatedQuestionTitle: offer.title,
      fromUserName: currentUser.name,
      toUserName: offer.creatorName,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `買家透過平台點數扣抵 ${price.toLocaleString()} 點解鎖自訂方案。系統自動拆款：賣家實收 ${split.netPayout.toLocaleString()} 點（${split.feeDiscountText}），平台服務費 ${split.platformFee.toLocaleString()} 點。`,
    };
    setTransactions((prev) => [tx, ...prev]);

    // Send confirmation message to chat
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          const systemNotice = {
            id: `msg-sys-${Date.now()}`,
            senderId: 'system',
            senderName: '平台交易安全託管',
            senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
            text: `🎉 交易成功！${currentUser.name} 已扣抵 ${price.toLocaleString()} 點解鎖自訂方案「${offer.title}」。點數已安全入帳。`,
            createdAt: new Date().toISOString(),
          };
          return {
            ...c,
            lastMessage: `交易成功：${offer.title}`,
            lastMessageTime: '剛剛',
            messages: [...c.messages, systemNotice],
          };
        }
        return c;
      })
    );

    // Notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '私聊方案交易成功！',
        message: `您已成功購買並結算 ${offer.creatorName} 的「${offer.title}」（NT$ ${price.toLocaleString()}）。`,
        type: 'payment_unlocked',
        createdAt: '剛剛',
        read: false,
        linkChatId: conversationId,
      },
      ...prev,
    ]);

    return true;
  };

  // Action: Confirm completion and delivery for custom chat offer
  const confirmCustomOfferDelivery = (conversationId: string, messageId: string): boolean => {
    let offerTitle = '專屬方案';
    let partnerName = '諮詢夥伴';

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id === messageId && m.offer) {
                offerTitle = m.offer.title;
                partnerName = m.offer.creatorName;
                return {
                  ...m,
                  offer: { ...m.offer, status: 'completed' as const },
                };
              }
              return m;
            }),
          };
        }
        return c;
      })
    );

    // Send system message
    const completedNotice = {
      id: `msg-sys-${Date.now()}`,
      senderId: 'system',
      senderName: '交付驗收中心',
      senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      text: `✅ 方案交付驗收完成！買方 ${currentUser.name} 已確認「${offerTitle}」成果完成交付並結案。感謝雙方的信任與合作！`,
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: `方案已完成交付：${offerTitle}`,
            lastMessageTime: '剛剛',
            messages: [...c.messages, completedNotice],
          };
        }
        return c;
      })
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '方案交付已確認完成！',
        message: `您已確認「${offerTitle}」完成交付。感謝您使用 IdeaX 智庫協作！`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
        linkChatId: conversationId,
      },
      ...prev,
    ]);

    return true;
  };

  // Action: Solver submits deliverable content for a phase
  const submitPhaseDeliverable = (
    questionId: string,
    answerId: string,
    phaseIndex: number,
    content: string,
    attachments?: import('../types').SolutionAttachment[]
  ) => {
    setAnswers((prev) =>
      prev.map((a) => {
        if (a.id === answerId && a.phases && a.phases[phaseIndex]) {
          const updatedPhases = [...a.phases];
          updatedPhases[phaseIndex] = {
            ...updatedPhases[phaseIndex],
            status: 'submitted',
            submittedContent: content,
            submittedAttachments: attachments,
          };
          return { ...a, phases: updatedPhases };
        }
        return a;
      })
    );

    const targetAns = answers.find((a) => a.id === answerId);
    const targetQ = questions.find((q) => q.id === questionId);
    const phase = targetAns?.phases?.[phaseIndex];

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '專家已提交階段交付成果！',
        message: `專家 ${targetAns?.solverName || '解答者'} 已提交「${phase?.title || '階段方案'}」之交付成果，請前往方案管理或問題頁面進行驗收確認。`,
        type: 'new_answer',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: questionId,
      },
      ...prev,
    ]);
  };

  // Action: Toggle question bookmark
  const toggleBookmarkQuestion = (questionId: string): boolean => {
    const isCurrentlyBookmarked = bookmarkedQuestionIds.includes(questionId);
    const isAdded = !isCurrentlyBookmarked;
    const updatedBookmarks = isAdded
      ? [...bookmarkedQuestionIds, questionId]
      : bookmarkedQuestionIds.filter((id) => id !== questionId);

    setBookmarkedQuestionIds(updatedBookmarks);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}bookmarks`, JSON.stringify(updatedBookmarks));
    } catch {}
    if (currentUser?.id && currentUser.id !== 'user-guest') {
      syncBookmarksToFirestore(currentUser.id, updatedBookmarks);
    }

    const targetQ = questions.find((q) => q.id === questionId);
    if (isAdded && targetQ) {
      setNotifications((prev) => [
        {
          id: `notif-bm-${Date.now()}`,
          title: '已成功收藏問題',
          message: `您已將「${targetQ.title}」加入收藏清單，可隨時至問題管理 > 收藏問題中查看。`,
          type: 'system',
          createdAt: '剛剛',
          read: false,
          linkQuestionId: questionId,
        },
        ...prev,
      ]);
    }

    return isAdded;
  };

  const isQuestionBookmarked = (questionId: string): boolean => {
    return bookmarkedQuestionIds.includes(questionId);
  };

  // 1. 痛點附議 (+1) / 提案愛心按讚（同步寫入 Firestore 資料庫）
  const toggleSecondQuestion = (questionId: string): { isSeconded: boolean; count: number } => {
    const isCurrentlySeconded = secondedQuestionIds.includes(questionId);
    const nextState = !isCurrentlySeconded;
    const updatedIds = nextState
      ? Array.from(new Set([...secondedQuestionIds, questionId]))
      : secondedQuestionIds.filter((id) => id !== questionId);

    setSecondedQuestionIds(updatedIds);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}seconded_questions`, JSON.stringify(updatedIds));
    } catch {}
    if (currentUser?.id && currentUser.id !== 'user-guest') {
      syncUserInteractionsToFirestore(currentUser.id, { secondedQuestionIds: updatedIds });
    }

    const targetQ = questions.find((q) => q.id === questionId);
    const currentCount = targetQ ? (targetQ.secondedCount ?? targetQ.likes ?? 0) : 0;
    const newCount = nextState ? currentCount + 1 : Math.max(0, currentCount - 1);

    setQuestions((prev) => {
      let syncedQ: Question | null = null;
      const nextList = prev.map((q) => {
        if (q.id === questionId) {
          const base = q.secondedCount ?? q.likes ?? 0;
          const computed = nextState ? base + 1 : Math.max(0, base - 1);
          const updatedQ: Question = {
            ...q,
            secondedCount: computed,
            likes: computed,
          };
          syncedQ = updatedQ;
          return updatedQ;
        }
        return q;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(nextList));
      } catch {}
      if (syncedQ) {
        syncQuestionToFirestore(syncedQ);
      }
      return nextList;
    });

    // 點擊 +1 附議時，同步收錄至「我的按讚收藏」
    if (nextState) {
      setBookmarkedQuestionIds((prev) => {
        if (!prev.includes(questionId)) {
          const nextBm = [...prev, questionId];
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}bookmarks`, JSON.stringify(nextBm));
          } catch {}
          if (currentUser?.id && currentUser.id !== 'user-guest') {
            syncBookmarksToFirestore(currentUser.id, nextBm);
          }
          return nextBm;
        }
        return prev;
      });

      if (targetQ) {
        setNotifications((prev) => [
          {
            id: `notif-sec-${Date.now()}`,
            title: '已附議並收錄至我的按讚收藏',
            message: `您已對「${targetQ.title}」完成 +1 附議，並已同步收錄至「我的按讚收藏」清單以便日後隨時查看。`,
            type: 'system',
            createdAt: '剛剛',
            read: false,
            linkQuestionId: questionId,
          },
          ...prev,
        ]);
      }
    }

    return { isSeconded: nextState, count: newCount };
  };

  // 供後端 API `/api/competition/proposals/:id/like` 成功回傳後，直接同步最新按讚狀態與數量至全域 questions 與 Firestore
  const setQuestionLikeState = (questionId: string, liked: boolean, likeCount: number) => {
    setLikedQuestionIds((prev) => {
      const updated = liked
        ? Array.from(new Set([...prev, questionId]))
        : prev.filter((id) => id !== questionId);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}liked_questions`, JSON.stringify(updated));
      } catch {}
      if (currentUser?.id && currentUser.id !== 'user-guest') {
        syncUserInteractionsToFirestore(currentUser.id, { likedQuestionIds: updated });
      }
      return updated;
    });

    setSecondedQuestionIds((prev) => {
      const updated = liked
        ? Array.from(new Set([...prev, questionId]))
        : prev.filter((id) => id !== questionId);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}seconded_questions`, JSON.stringify(updated));
      } catch {}
      if (currentUser?.id && currentUser.id !== 'user-guest') {
        syncUserInteractionsToFirestore(currentUser.id, { secondedQuestionIds: updated });
      }
      return updated;
    });

    if (liked) {
      setBookmarkedQuestionIds((prev) => {
        if (!prev.includes(questionId)) {
          const nextBm = [...prev, questionId];
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}bookmarks`, JSON.stringify(nextBm));
          } catch {}
          if (currentUser?.id && currentUser.id !== 'user-guest') {
            syncBookmarksToFirestore(currentUser.id, nextBm);
          }
          return nextBm;
        }
        return prev;
      });
    }

    setQuestions((prev) => {
      let syncedQ: Question | null = null;
      const nextList = prev.map((q) => {
        if (q.id === questionId) {
          const updatedQ: Question = {
            ...q,
            likes: likeCount,
            secondedCount: likeCount,
          };
          syncedQ = updatedQ;
          return updatedQ;
        }
        return q;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(nextList));
      } catch {}
      if (syncedQ) {
        syncQuestionToFirestore(syncedQ);
      }
      return nextList;
    });
  };

  const isQuestionSeconded = (questionId: string): boolean => {
    return secondedQuestionIds.includes(questionId) || sameQuestionIds.includes(questionId);
  };

  const getQuestionSecondCount = (questionId: string): number => {
    const q = questions.find((item) => item.id === questionId);
    return Math.max(q?.secondedCount ?? 0, q?.sameQuestionCount ?? 0, q?.likes ?? 0);
  };

  // 2. 創點子提問同問 (舉手)（同步寫入 Firestore 資料庫）
  const toggleSameQuestion = (questionId: string): { isSameQuestion: boolean; count: number } => {
    const isCurrentlySame = sameQuestionIds.includes(questionId);
    const nextState = !isCurrentlySame;
    const updatedIds = nextState
      ? Array.from(new Set([...sameQuestionIds, questionId]))
      : sameQuestionIds.filter((id) => id !== questionId);

    setSameQuestionIds(updatedIds);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}same_questions`, JSON.stringify(updatedIds));
    } catch {}
    if (currentUser?.id && currentUser.id !== 'user-guest') {
      syncUserInteractionsToFirestore(currentUser.id, { sameQuestionIds: updatedIds });
    }

    const targetQ = questions.find((q) => q.id === questionId);
    const currentCount = targetQ ? (targetQ.sameQuestionCount ?? 0) : 0;
    const newCount = nextState ? currentCount + 1 : Math.max(0, currentCount - 1);

    setQuestions((prev) => {
      let syncedQ: Question | null = null;
      const nextList = prev.map((q) => {
        if (q.id === questionId) {
          const base = q.sameQuestionCount ?? 0;
          const computed = nextState ? base + 1 : Math.max(0, base - 1);
          const updatedQ: Question = {
            ...q,
            sameQuestionCount: computed,
          };
          syncedQ = updatedQ;
          return updatedQ;
        }
        return q;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(nextList));
      } catch {}
      if (syncedQ) {
        syncQuestionToFirestore(syncedQ);
      }
      return nextList;
    });

    // 點擊同問時，同步收錄至「我的按讚收藏」
    if (nextState) {
      setBookmarkedQuestionIds((prev) => {
        if (!prev.includes(questionId)) {
          const nextBm = [...prev, questionId];
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}bookmarks`, JSON.stringify(nextBm));
          } catch {}
          if (currentUser?.id && currentUser.id !== 'user-guest') {
            syncBookmarksToFirestore(currentUser.id, nextBm);
          }
          return nextBm;
        }
        return prev;
      });

      if (targetQ) {
        setNotifications((prev) => [
          {
            id: `notif-same-${Date.now()}`,
            title: '已同問並收錄至我的按讚收藏',
            message: `您已對「${targetQ.title}」發起同問，並已同步收錄至「我的按讚收藏」清單以便日後隨時查看。`,
            type: 'system',
            createdAt: '剛剛',
            read: false,
            linkQuestionId: questionId,
          },
          ...prev,
        ]);
      }
    }

    return { isSameQuestion: nextState, count: newCount };
  };

  const isSameQuestionActive = (questionId: string): boolean => {
    return sameQuestionIds.includes(questionId);
  };

  const getQuestionSameCount = (questionId: string): number => {
    const q = questions.find((item) => item.id === questionId);
    return q?.sameQuestionCount ?? 0;
  };

  // 3. 討論留言按讚 (大拇指)（同步寫入 Firestore 資料庫）
  const toggleLikeDiscussionAnswer = (answerId: string): { isLiked: boolean; count: number } => {
    const isCurrentlyLiked = likedDiscussionAnswerIds.includes(answerId);
    const nextState = !isCurrentlyLiked;
    const updatedIds = nextState
      ? Array.from(new Set([...likedDiscussionAnswerIds, answerId]))
      : likedDiscussionAnswerIds.filter((id) => id !== answerId);

    setLikedDiscussionAnswerIds(updatedIds);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}liked_discussions`, JSON.stringify(updatedIds));
    } catch {}
    if (currentUser?.id && currentUser.id !== 'user-guest') {
      syncUserInteractionsToFirestore(currentUser.id, { likedDiscussionAnswerIds: updatedIds });
    }

    const targetA = answers.find((a) => a.id === answerId);
    const currentCount = targetA ? (targetA.likes ?? 0) : 0;
    const newCount = nextState ? currentCount + 1 : Math.max(0, currentCount - 1);

    setAnswers((prev) => {
      let syncedA: Answer | null = null;
      const nextList = prev.map((a) => {
        if (a.id === answerId) {
          const base = a.likes ?? 0;
          const computed = nextState ? base + 1 : Math.max(0, base - 1);
          const updatedA: Answer = {
            ...a,
            likes: computed,
          };
          syncedA = updatedA;
          return updatedA;
        }
        return a;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(nextList));
      } catch {}
      if (syncedA) {
        syncAnswerToFirestore(syncedA);
      }
      return nextList;
    });

    if (nextState && targetA?.questionId) {
      setBookmarkedQuestionIds((prev) => {
        if (!prev.includes(targetA.questionId)) {
          const nextBm = [...prev, targetA.questionId];
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}bookmarks`, JSON.stringify(nextBm));
          } catch {}
          if (currentUser?.id && currentUser.id !== 'user-guest') {
            syncBookmarksToFirestore(currentUser.id, nextBm);
          }
          return nextBm;
        }
        return prev;
      });
    }

    return { isLiked: nextState, count: newCount };
  };

  const isDiscussionAnswerLiked = (answerId: string): boolean => {
    return likedDiscussionAnswerIds.includes(answerId);
  };

  const getDiscussionAnswerLikesCount = (answerId: string): number => {
    const a = answers.find((item) => item.id === answerId);
    return a?.likes ?? 0;
  };

  // 4. L0 討論提問按讚 (大拇指)（同步寫入 Firestore 資料庫）
  const toggleLikeQuestion = (questionId: string): { isLiked: boolean; count: number } => {
    const isCurrentlyLiked = likedQuestionIds.includes(questionId);
    const nextState = !isCurrentlyLiked;
    const updatedIds = nextState
      ? Array.from(new Set([...likedQuestionIds, questionId]))
      : likedQuestionIds.filter((id) => id !== questionId);

    setLikedQuestionIds(updatedIds);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}liked_questions`, JSON.stringify(updatedIds));
    } catch {}
    if (currentUser?.id && currentUser.id !== 'user-guest') {
      syncUserInteractionsToFirestore(currentUser.id, { likedQuestionIds: updatedIds });
    }

    const targetQ = questions.find((q) => q.id === questionId);
    const currentCount = targetQ ? (targetQ.likes ?? 0) : 0;
    const newCount = nextState ? currentCount + 1 : Math.max(0, currentCount - 1);

    setQuestions((prev) => {
      let syncedQ: Question | null = null;
      const nextList = prev.map((q) => {
        if (q.id === questionId) {
          const base = q.likes ?? 0;
          const computed = nextState ? base + 1 : Math.max(0, base - 1);
          const updatedQ: Question = {
            ...q,
            likes: computed,
            secondedCount: computed,
          };
          syncedQ = updatedQ;
          return updatedQ;
        }
        return q;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(nextList));
      } catch {}
      if (syncedQ) {
        syncQuestionToFirestore(syncedQ);
      }
      return nextList;
    });

    // 點擊按讚時，同步收錄至「我的按讚收藏」
    if (nextState) {
      setBookmarkedQuestionIds((prev) => {
        if (!prev.includes(questionId)) {
          const nextBm = [...prev, questionId];
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}bookmarks`, JSON.stringify(nextBm));
          } catch {}
          if (currentUser?.id && currentUser.id !== 'user-guest') {
            syncBookmarksToFirestore(currentUser.id, nextBm);
          }
          return nextBm;
        }
        return prev;
      });

      if (targetQ) {
        setNotifications((prev) => [
          {
            id: `notif-like-${Date.now()}`,
            title: '已按讚並收錄至我的按讚收藏',
            message: `您已為「${targetQ.title}」按讚，並已同步收錄至「我的按讚收藏」清單以便日後隨時查看。`,
            type: 'system',
            createdAt: '剛剛',
            read: false,
            linkQuestionId: questionId,
          },
          ...prev,
        ]);
      }
    }

    return { isLiked: nextState, count: newCount };
  };

  const isQuestionLiked = (questionId: string): boolean => {
    return likedQuestionIds.includes(questionId);
  };

  const getQuestionLikesCount = (questionId: string): number => {
    const q = questions.find((item) => item.id === questionId);
    return q?.likes ?? 0;
  };

  // Action: Promote question to top of recruiting list (50 點)
  const promoteQuestion = (questionId: string): boolean => {
    const q = questions.find((item) => item.id === questionId);
    if (!q) return false;

    if (!isNoPaymentMode && !isRaceMode && (currentUser.balance || 0) < 50) {
      return false;
    }

    runPointsOp({ op: 'spend', amount: 50, purpose: 'promote', refId: questionId }, '推播扣點未完成', () => {
      // 扣點失敗：取消置頂推播
      setQuestions((prev) => prev.map((item) => (item.id === questionId ? { ...item, isFeatured: q.isFeatured } : item)));
    });
    if (!isNoPaymentMode && !isRaceMode) {
      setCurrentUser((prev) => ({
        ...prev,
        balance: Math.max(0, (prev.balance || 0) - 50),
      }));
      setAvailableUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, balance: Math.max(0, (u.balance || 0) - 50) }
            : u
        )
      );
    }

    // Set question isFeatured
    setQuestions((prev) =>
      prev.map((item) => (item.id === questionId ? { ...item, isFeatured: true } : item))
    );

    // Record 50 points promotion transaction
    const tx: Transaction = {
      id: `tx-promo-${Date.now()}`,
      type: '付費推播方案' as any,
      amount: 50,
      platformFee: 0,
      netAmount: 50,
      paymentMethod: '平台點數扣點',
      payoutStatus: '已完成',
      relatedQuestionTitle: q.title,
      relatedQuestionId: q.id,
      fromUserName: currentUser.name,
      toUserName: 'IdeaX 平台推播中心',
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `已成功為「${q.title}」啟用招募中置頂推播（扣抵 50 點），享有置頂曝光與廣播大聲公 📢 專屬標章。`,
    };
    setTransactions((prev) => [tx, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-promo-${Date.now()}`,
        title: '📢 招募中置頂推播已啟用！',
        message: `您的問題「${q.title}」已成功開啟置頂推播，享有廣播大聲公標章與最優先曝光。`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: questionId,
      },
      ...prev,
    ]);

    return true;
  };

  // Action: Update transaction note
  const updateTransactionNote = (transactionId: string, note: string) => {
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.id === transactionId ? { ...t, note } : t));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}transactions`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // 爭議審理與申訴結案管理（全站跨元件統一單一真相來源，永久留存已結案 ID）
  const [resolvedDisputeIds, setResolvedDisputeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}resolved_dispute_ids`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markDisputeResolved = (disputeId: string, questionId?: string) => {
    setResolvedDisputeIds((prev) => {
      const next = prev.includes(disputeId) ? prev : [...prev, disputeId];
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}resolved_dispute_ids`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (questionId) {
      resolveDisputeRefund(questionId);
    }
  };

  // 全站統一計算待裁定案件數量：包含 demo 案件與真實問題檢舉，結案後即時歸零並永久同步
  const pendingDisputesCount = useMemo(() => {
    const demoPending = resolvedDisputeIds.includes('dispute-demo-1') ? 0 : 1;
    const questionsPending = (questions || []).filter(
      (q) =>
        q.disputeStatus === 'pending_review' &&
        !resolvedDisputeIds.includes(q.id) &&
        !resolvedDisputeIds.includes(`dispute-${q.id}`)
    ).length;
    return demoPending + questionsPending;
  }, [questions, resolvedDisputeIds]);

  // 全站統一追蹤客服工單受理數量 (pending 狀態之工單)
  const [pendingTicketsCount, setPendingTicketsCount] = useState<number>(() => {
    try {
      const tickets = getStoredTickets();
      return (tickets || []).filter((t) => t.status === 'pending').length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const updateTicketsFromStorage = () => {
      try {
        const tickets = getStoredTickets();
        setPendingTicketsCount((tickets || []).filter((t) => t.status === 'pending').length);
      } catch {}
    };

    updateTicketsFromStorage();

    const unsub = subscribeToTickets((firestoreTickets) => {
      if (firestoreTickets) {
        setPendingTicketsCount(firestoreTickets.filter((t) => t.status === 'pending').length);
      }
    });

    window.addEventListener('storage', updateTicketsFromStorage);
    window.addEventListener('customer_tickets_updated', updateTicketsFromStorage);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('storage', updateTicketsFromStorage);
      window.removeEventListener('customer_tickets_updated', updateTicketsFromStorage);
    };
  }, []);

  // 🤖 24hr AI 特助自動排程巡航代操背景處理引擎 (全自動依未來排定時序即時發送私聊提案)
  useEffect(() => {
    const checkAndExecuteScheduledTasks = () => {
      try {
        const tasks = currentUser?.assistant24hrConfig?.scheduledTasks;
        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return;

        const now = Date.now();
        let hasExecutedAny = false;
        const updatedTasks = tasks.map((task) => {
          if (task.status !== 'pending') return task;

          const targetTime = parseScheduleTimestamp(task.scheduledTime, task.scheduledTimestamp);
          // 若當前時間已到達或超過排定發送時程 (Due)
          if (now >= targetTime) {
            hasExecutedAny = true;
            const targetUser = {
              id: task.clientId,
              name: task.clientName,
              avatar: task.clientAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              title: '發案客戶',
            };

            const targetQuestion = task.questionId ? questions.find((q) => q.id === task.questionId) : undefined;
            const convId = startDirectChat(targetUser, targetQuestion);
            if (convId) {
              const assistantMessage = `[24hr AI特助代操] ${task.messageTemplate}`;
              sendMessage(convId, assistantMessage);
            }

            // 發送系統通知給專家
            const notifId = `notif-assistant-exec-${task.id}-${Date.now()}`;
            const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
            setNotifications((prev) => [
              {
                id: notifId,
                title: '⚡ 24hr AI 特助已自動執行代操任務',
                message: `特助已於預定時程 (${task.scheduledTime || timeStr}) 自動發送破冰提案至發案方「${task.clientName}」的私聊室！`,
                type: 'system',
                timestamp: '剛剛',
                createdAt: new Date().toISOString(),
                read: false,
              },
              ...prev,
            ]);

            return {
              ...task,
              status: 'completed' as const,
              executedAt: `今日 ${timeStr}`,
              executionResult: '24hr 特助已於排定時程自動代操送達！',
            };
          }
          return task;
        });

        if (hasExecutedAny) {
          const currentConfig = currentUser.assistant24hrConfig || DEFAULT_ASSISTANT_24HR_CONFIG;
          const newConfig: Assistant24hrConfig = {
            ...currentConfig,
            isEnabled: currentConfig.isEnabled ?? true,
            scheduledTasks: updatedTasks,
          };
          updateAssistant24hrConfig(newConfig);
          window.dispatchEvent(new CustomEvent('assistant_scheduled_task_executed', { detail: { updatedTasks } }));
        }
      } catch (err) {
        console.error('Error executing 24hr assistant scheduled tasks:', err);
      }
    };

    // 正式站由伺服器值班（每 5 分鐘）送出排程訊息，網頁端不再重複執行，避免同一則訊息送兩次
    if (typeof window !== 'undefined' && /(^|\.)ideax\.tw$/.test(window.location.hostname)) return;
    // 每 5 秒巡檢一次是否有排定時程到期的代操任務（本機與預覽環境）
    const intervalId = setInterval(checkAndExecuteScheduledTasks, 5000);
    // 初次掛載立即檢測一次
    checkAndExecuteScheduledTasks();

    return () => clearInterval(intervalId);
  }, [currentUser?.id, currentUser?.assistant24hrConfig?.scheduledTasks, questions]);

  // 檢舉反饋待處理數量
  const pendingReportsCount = 0;

  // 管理員紫色郵件符號總待辦計數：包含客服工單、案件申訴調解、檢舉反饋
  const adminMailBadgeCount = useMemo(() => {
    return pendingTicketsCount + pendingDisputesCount + pendingReportsCount;
  }, [pendingTicketsCount, pendingDisputesCount, pendingReportsCount]);

  // Action: Increment real views count (tracks views strictly according to real clicks)
  const incrementQuestionViews = useCallback((questionId: string, amount: number = 1) => {
    let nextViews = 1;

    setQuestions((prev) => {
      let map: Record<string, number> = {};
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}question_real_clicks`);
        if (saved) map = JSON.parse(saved);
      } catch {
        // ignore
      }

      const existingQ = prev.find((item) => item.id === questionId);
      const baseViews = existingQ ? (existingQ.views || existingQ.viewsCount || 0) : 0;
      const current = typeof map[questionId] === 'number' ? map[questionId] : baseViews;
      nextViews = current + amount;
      map[questionId] = nextViews;

      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}question_real_clicks`, JSON.stringify(map));
      } catch {
        // ignore
      }

      const updated = prev.map((item) => {
        if (item.id === questionId) {
          return {
            ...item,
            views: nextViews,
            viewsCount: nextViews,
          };
        }
        return item;
      });

      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setSelectedQuestion((prev) => {
      if (prev && prev.id === questionId) {
        return {
          ...prev,
          views: nextViews,
          viewsCount: nextViews,
        };
      }
      return prev;
    });

    // 真正寫入雲端 Firestore 資料庫，確保網站重整、換裝置或更新後計數永遠保留
    incrementQuestionViewInFirestore(questionId, amount);
  }, []);

  // Action: AI Auto-Tagging & Categorization for a single question
  const autoTagQuestionWithAI = async (questionId: string): Promise<{ success: boolean; data?: AIAnalysisResult }> => {
    const q = questions.find((item) => item.id === questionId);
    if (!q) return { success: false };

    try {
      const res = await analyzeQuestionWithAI(q.title, q.description);
      if (res) {
        // Merge tags preserving uniqueness
        const newTags = Array.from(new Set([...(res.tags || []), ...(q.tags || [])])).filter(Boolean);

        let updatedQ: Question | null = null;
        setQuestions((prev) => {
          const next = prev.map((item) => {
            if (item.id !== questionId) return item;
            updatedQ = {
              ...item,
              category: res.category || item.category,
              subcategory: res.subcategory || item.subcategory,
              tags: newTags.length > 0 ? newTags : item.tags,
              aiAnalysis: {
                summary: res.summary || item.aiAnalysis?.summary || '',
                structuredNeed: res.structuredNeed || item.aiAnalysis?.structuredNeed || [],
                solverProfileAdvice: res.solverProfileAdvice || item.aiAnalysis?.solverProfileAdvice || '',
                marketFitRating: item.aiAnalysis?.marketFitRating || '高商業價值',
              },
            };
            return updatedQ;
          });
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(next));
          } catch {}
          return next;
        });

        if (updatedQ) {
          syncQuestionToFirestore(updatedQ);
        }

        setSelectedQuestion((prev) => {
          if (!prev || prev.id !== questionId) return prev;
          return {
            ...prev,
            category: res.category || prev.category,
            subcategory: res.subcategory || prev.subcategory,
            tags: newTags.length > 0 ? newTags : prev.tags,
            aiAnalysis: {
              summary: res.summary || prev.aiAnalysis?.summary || '',
              structuredNeed: res.structuredNeed || prev.aiAnalysis?.structuredNeed || [],
              solverProfileAdvice: res.solverProfileAdvice || prev.aiAnalysis?.solverProfileAdvice || '',
              marketFitRating: prev.aiAnalysis?.marketFitRating || '高商業價值',
            },
          };
        });

        setNotifications((prev) => [
          {
            id: `notif-autotag-${Date.now()}`,
            title: '🤖 AI 已自動完成標籤歸類！',
            message: `問題「${q.title}」已由 AI 自動分類至「${res.category} · ${res.subcategory || ''}」，並智能配置標籤：#${newTags.join(' #')}。`,
            type: 'system',
            createdAt: '剛剛',
            read: false,
            linkQuestionId: questionId,
          },
          ...prev,
        ]);

        return { success: true, data: res };
      }
    } catch (err) {
      console.error('Failed to auto-tag question:', err);
    }
    return { success: false };
  };

  // Action: AI Auto-Tagging in batch for all current user's questions
  const autoTagAllMyQuestionsWithAI = async (): Promise<number> => {
    const myQs = questions.filter((q) => q.authorId === currentUser.id);
    let count = 0;
    for (const q of myQs) {
      const res = await autoTagQuestionWithAI(q.id);
      if (res.success) count++;
    }
    return count;
  };

  // Action: Save & Cache AI Preliminary Report to Question and sync to Firestore
  const saveQuestionPreliminaryReport = async (
    questionId: string,
    report: AIPreliminaryReport,
    unlockUserId?: string
  ): Promise<Question | null> => {
    let updatedTarget: Question | null = null;

    setQuestions((prev) => {
      const next = prev.map((q) => {
        if (q.id !== questionId) return q;
        const currentUnlocked = q.aiPreliminaryReport?.unlockedUserIds || report.unlockedUserIds || [];
        const nextUnlocked = unlockUserId && !currentUnlocked.includes(unlockUserId)
          ? [...currentUnlocked, unlockUserId]
          : currentUnlocked;

        updatedTarget = {
          ...q,
          aiPreliminaryReport: {
            ...report,
            unlockedUserIds: nextUnlocked,
          },
        };
        return updatedTarget;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (updatedTarget) {
      syncQuestionToFirestore(updatedTarget);
      setSelectedQuestion((prev) => (prev?.id === questionId ? updatedTarget : prev));
    }

    return updatedTarget;
  };

  // Action: Unlock an already cached preliminary report for a user
  const unlockQuestionPreliminaryReport = async (
    questionId: string,
    userId: string
  ): Promise<boolean> => {
    let updatedTarget: Question | null = null;

    setQuestions((prev) => {
      const next = prev.map((q) => {
        if (q.id !== questionId) return q;
        if (!q.aiPreliminaryReport) return q;
        const currentUnlocked = q.aiPreliminaryReport.unlockedUserIds || [];
        if (currentUnlocked.includes(userId)) return q;

        updatedTarget = {
          ...q,
          aiPreliminaryReport: {
            ...q.aiPreliminaryReport,
            unlockedUserIds: [...currentUnlocked, userId],
          },
        };
        return updatedTarget;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (updatedTarget) {
      syncQuestionToFirestore(updatedTarget);
      setSelectedQuestion((prev) => (prev?.id === questionId ? updatedTarget : prev));
      return true;
    }

    return false;
  };

  // Action: Toggle agreement on AI Mediation Card in Chat
  const toggleMediationAgreement = (conversationId: string, messageId: string, role: 'buyer' | 'seller') => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          let bothAgreedNow = false;
          let updatedMsgText = '';

          const updatedMessages = c.messages.map((m) => {
            if (m.id === messageId && m.aiMediation) {
              const currentMed = m.aiMediation;
              const nextBuyer = role === 'buyer' ? !currentMed.agreedByBuyer : currentMed.agreedByBuyer;
              const nextSeller = role === 'seller' ? !currentMed.agreedBySeller : currentMed.agreedBySeller;

              if (nextBuyer && nextSeller) {
                bothAgreedNow = true;
              }

              return {
                ...m,
                aiMediation: {
                  ...currentMed,
                  agreedByBuyer: nextBuyer,
                  agreedBySeller: nextSeller,
                },
              };
            }
            return m;
          });

          // If both agreed just now, attach a system milestone message
          if (bothAgreedNow) {
            const systemNotice: ChatMessage = {
              id: `msg-sys-med-${Date.now()}`,
              senderId: 'system',
              senderName: 'IdeaX AI助理',
              senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
              text: '🎉 雙方均已正式同意 AI 智慧調解方案！雙方和解協議已生效。請解答者或提問者點擊聊天室下方的「+」圖示，發送對應和解金額之自訂方案卡片進行正式劃撥結案！',
              createdAt: new Date().toISOString(),
            };
            return {
              ...c,
              lastMessage: '🎉 雙方已同意 AI 智慧調解方案！',
              lastMessageTime: '剛剛',
              messages: [...updatedMessages, systemNotice],
            };
          }

          return {
            ...c,
            messages: updatedMessages,
          };
        }
        return c;
      })
    );
  };

  const isModeOrEnvNotification = (title?: string, message?: string) => {
    const text = `${title || ''} ${message || ''}`;
    return (
      text.includes('捷徑描述檔') ||
      text.includes('已為您下載 IdeaX App') ||
      text.includes('無金流模式') ||
      text.includes('正式營運模式') ||
      text.includes('測試環境') ||
      text.includes('隱藏測試帳號') ||
      text.includes('顯示測試帳號') ||
      text.includes('環境設定') ||
      text.includes('模式設定') ||
      text.includes('假資料已清除') ||
      text.includes('測試環境 (TEST)') ||
      text.includes('無金流模式 (FREE)') ||
      text.includes('正式營運模式 (NORM)')
    );
  };

  const addNotification = useCallback((
    notifOrTitle: Partial<NotificationItem> | string,
    message?: string,
    type: any = 'system',
    targetUserId?: string,
    category?: 'personal' | 'system'
  ) => {
    const titleStr = typeof notifOrTitle === 'string' ? notifOrTitle : notifOrTitle.title || '';
    const msgStr = typeof notifOrTitle === 'string' ? message || '' : notifOrTitle.message || '';

    // 依使用者需求：徹底刪除環境設定與模式設定通知，不再提醒此類變更通知
    if (isModeOrEnvNotification(titleStr, msgStr)) {
      return;
    }

    if (typeof notifOrTitle === 'string') {
      const detectedCategory: 'personal' | 'system' =
        category || (type === 'system' || type === 'ai_match' ? 'system' : 'personal');
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: targetUserId || currentUser.id,
        category: detectedCategory,
        title: notifOrTitle,
        message: message || '',
        type: type || 'system',
        createdAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    } else {
      const detectedCategory: 'personal' | 'system' =
        notifOrTitle.category ||
        category ||
        (notifOrTitle.type === 'system' || notifOrTitle.type === 'ai_match' ? 'system' : 'personal');
      const newNotif: NotificationItem = {
        id: notifOrTitle.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: notifOrTitle.userId || targetUserId || currentUser.id,
        category: detectedCategory,
        title: notifOrTitle.title || '系統通知',
        message: notifOrTitle.message || '',
        type: notifOrTitle.type || 'system',
        createdAt: notifOrTitle.createdAt || '剛剛',
        read: false,
        ...notifOrTitle,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    }

    // 系統層級通知（PWA Native Notification）
    // - 只在「這則通知是給目前登入者」時才在本機跳出（發給別人的通知不該在自己的裝置上跳）
    // - 點擊後直接開啟相關的問題或私訊
    // - 同類通知合併；網頁在前景時不跳（由服務層判斷）
    try {
      const notifObj = typeof notifOrTitle === 'string' ? null : notifOrTitle;
      const recipientId = (notifObj && notifObj.userId) || targetUserId;
      const isForCurrentUser = !recipientId || recipientId === currentUser.id;
      const notifType: string = (notifObj && notifObj.type) || type || 'system';
      const linkQuestionId = notifObj?.linkQuestionId;
      const linkChatId = notifObj?.linkChatId;
      const deepLink = linkQuestionId
        ? `/?q=${encodeURIComponent(linkQuestionId)}`
        : linkChatId || notifType === 'chat_message'
        ? '/chat'
        : '/';
      if (isForCurrentUser && currentUser.id !== 'user-guest') {
        PwaNotificationService.sendNativeNotification({
          title: titleStr || 'IdeaX 創點子',
          body: msgStr || '您有一則新通知',
          url: deepLink,
          group: notifType === 'system' ? undefined : notifType,
        });
      }
    } catch {}
  }, [currentUser.id]);

  const deleteNotification = (id: string) => {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // 雲端只刪「發給我」的通知，避免管理員誤刪全站廣播
    if (target && target.userId === currentUser.id && cloudNotifIdsRef.current.has(id)) {
      cloudNotifIdsRef.current.delete(id);
      void deleteNotificationsInCloud([id]);
    }
  };

  const clearAllNotifications = () => {
    // 雲端只刪「發給我」的通知；全站廣播與發給管理員的通知不刪
    const mineInCloud = notifications
      .filter((n) => n.userId === currentUser.id && cloudNotifIdsRef.current.has(n.id))
      .map((n) => n.id);
    setNotifications([]);
    if (mineInCloud.length > 0) {
      mineInCloud.forEach((id) => cloudNotifIdsRef.current.delete(id));
      void deleteNotificationsInCloud(mineInCloud);
    }
  };

  const updateNotification = (id: string, updates: Partial<NotificationItem>) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    // 僅標記當前用戶個人所屬之通知為已讀
    setNotifications((prev) =>
      prev.map((n) => {
        if (!n.userId || n.userId === currentUser.id || (n.userId === 'admin' && currentUser.role === 'admin')) {
          return { ...n, read: true };
        }
        return n;
      })
    );
  };

  const markAllPersonalNotificationsRead = () => {
    // 僅一鍵已讀個人通知
    setNotifications((prev) =>
      prev.map((n) => {
        const cat = n.category || (n.type === 'system' || n.type === 'ai_match' ? 'system' : 'personal');
        if (cat === 'personal' && (!n.userId || n.userId === currentUser.id || (n.userId === 'admin' && currentUser.role === 'admin'))) {
          return { ...n, read: true };
        }
        return n;
      })
    );
  };

  const markAllSystemNotificationsRead = () => {
    // 僅一鍵已讀系統通知
    setNotifications((prev) =>
      prev.map((n) => {
        const cat = n.category || (n.type === 'system' || n.type === 'ai_match' ? 'system' : 'personal');
        if (cat === 'system' && (!n.userId || n.userId === currentUser.id || (n.userId === 'admin' && currentUser.role === 'admin'))) {
          return { ...n, read: true };
        }
        return n;
      })
    );
  };

  // 單一用戶個人通知過濾（非全站混雜，只呈現當前登入用戶之個人專屬通知與特定系統信件，且徹底排除模式與環境設定通知）
  const userPersonalNotifications = useMemo(() => {
    if (currentUser.id === 'user-guest') {
      return [];
    }
    return notifications.filter((n) => {
      if (isModeOrEnvNotification(n.title, n.message)) {
        return false;
      }
      if (n.userId) {
        if (n.userId === 'admin') {
          return currentUser.role === 'admin';
        }
        if (n.userId === 'all') {
          return true;
        }
        return n.userId === currentUser.id;
      }
      return false;
    });
  }, [notifications, currentUser]);

  // 1. 個人通知（互動、方案提交、得標、懸賞入帳、私聊，計入郵件圖示右上角數字）
  const personalNotifications = useMemo(() => {
    if (currentUser.id === 'user-guest') return [];
    return userPersonalNotifications.filter((n) => {
      const cat = n.category || (n.type === 'system' || n.type === 'ai_match' ? 'system' : 'personal');
      return cat === 'personal';
    });
  }, [userPersonalNotifications, currentUser]);

  // 2. 系統通知（平台廣播、AI推薦、系統升級，在系統通知區亮紅點，不計入郵件記數）
  const systemNotifications = useMemo(() => {
    if (currentUser.id === 'user-guest') return [];
    return userPersonalNotifications.filter((n) => {
      const cat = n.category || (n.type === 'system' || n.type === 'ai_match' ? 'system' : 'personal');
      return cat === 'system';
    });
  }, [userPersonalNotifications, currentUser]);

  const unreadPersonalCount = useMemo(() => {
    if (currentUser.id === 'user-guest') return 0;
    return personalNotifications.filter((n) => !n.read).length;
  }, [personalNotifications, currentUser]);

  const unreadSystemCount = useMemo(() => {
    if (currentUser.id === 'user-guest') return 0;
    return systemNotifications.filter((n) => !n.read).length;
  }, [systemNotifications, currentUser]);

  const hasUnreadSystemNotifs = unreadSystemCount > 0;

  // 同步更新手機/桌面 PWA 圖示未讀紅點數字 (App Badging API)
  useEffect(() => {
    PwaNotificationService.updateAppBadge(unreadPersonalCount + unreadSystemCount);
  }, [unreadPersonalCount, unreadSystemCount]);

  // Demo Mode Switchers (管理員測試與示範模式開關)
  const toggleDemoMode = () => {
    if (isDemoMode) {
      // 測試環境無法單獨關閉至空狀態，切換至正式營運模式 (NORM)
      setNoPaymentMode(false);
    } else {
      setDemoMode(true);
    }
  };

  const setDemoMode = (enabled: boolean) => {
    syncPlatformSettingsToFirestore({
      isDemoMode: enabled,
      isNoPaymentMode: enabled ? false : isNoPaymentMode,
      isRaceMode: enabled ? false : isRaceMode,
      isHideTestAccounts: enabled ? false : isHideTestAccounts,
    });
    if (enabled) {
      setIsDemoMode(true);
      setIsNoPaymentMode(false);
      setIsRaceMode(false);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}platform_mode`, 'TEST');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}is_race_mode`, 'false');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}demo_mode`, 'true');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}is_norm_mode`, 'false');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}no_payment_mode`, 'false');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}hide_test_accounts`, 'false');
      } catch {
        // ignore
      }
      // 開啟測試環境就同時公開測試帳號
      setIsHideTestAccounts(false);
      // 測試環境加回所有模擬資料（題目、專家、方案、交易、對話與測試帳號），並保留用戶自訂資料
      const deletedQIdsOnReset = getDeletedQuestionIds();
      setQuestions((prev) => {
        const custom = prev.filter((q) => !isMockQuestionId(q.id, q.authorId) && !deletedQIdsOnReset.has(q.id));
        const filteredMock = MOCK_QUESTIONS.filter((mq) => !deletedQIdsOnReset.has(mq.id));
        return [...filteredMock, ...custom];
      });
      setSolvers((prev) => {
        const custom = prev.filter((s) => !isMockSolverId(s.id) && !isTestAccountUserId(s.id));
        return [...MOCK_SOLVERS, ...custom];
      });
      setAnswers((prev) => {
        const custom = prev.filter((a) => !isMockAnswerId(a.id));
        return [...MOCK_ANSWERS, ...custom];
      });
      setTransactions((prev) => {
        const custom = prev.filter((t) => !isMockTransactionId(t.id));
        return [...MOCK_TRANSACTIONS, ...custom];
      });
      setConversations((prev) => {
        const custom = prev.filter((c) => !isMockConversationId(c.id));
        return [...MOCK_CONVERSATIONS, ...custom];
      });
      setAvailableUsers((prev) => {
        const custom = prev.filter((u) => !isTestAccountUserId(u.id) && !u.id.startsWith('solver-') && u.id !== 'user-admin');
        return [...MOCK_USERS, ...custom];
      });
      setBookmarkedQuestionIds((prev) => {
        const mockBookmarks = ['q-1', 'q-3'];
        const merged = [...prev];
        mockBookmarks.forEach((id) => {
          if (!merged.includes(id)) merged.push(id);
        });
        return merged;
      });
    } else {
      // 關閉測試環境 ➔ 若目前不是無金流模式，則切換至正式營運模式 (NORM)
      if (!isNoPaymentMode) {
        setNoPaymentMode(false);
      }
    }
  };

  // 一鍵永久清除全站所有模擬資料（模擬帳號、模擬貼文、模擬留言與模擬打賞，並同步自 Firestore 刪除）
  const purgeAllSimulatedData = async (): Promise<{
    deletedQuestions: number;
    deletedAnswers: number;
    deletedUsers: number;
    purgedQuestions: number;
    purgedAnswers: number;
    purgedUsers: number;
  }> => {
    setIsSimulatedDataPurged(true);
    setIsDemoMode(false);
    setHideTestAccounts(true);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`, 'true');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}demo_mode`, 'false');
    } catch {}
    syncPlatformSettingsToFirestore({
      isSimulatedDataPurged: true,
      isDemoMode: false,
      isHideTestAccounts: true,
    });

    // 1. 找出所有模擬貼文 ID（包含虛擬創作者貼文、VibeCoding 預設作品、測試題目）
    const simQIds = Array.from(
      new Set([
        ...ALL_VIRTUAL_PROPOSALS_SEED.map((vq) => vq.id),
        ...MOCK_QUESTIONS.map((mq) => mq.id),
        ...questions.filter((q) => isSimulatedQuestion(q) || isMockQuestionId(q.id, q.authorId)).map((q) => q.id),
      ])
    );

    // 2. 找出所有模擬留言與模擬方案 ID
    const simAIds = Array.from(
      new Set([
        ...ALL_VIRTUAL_ANSWERS_SEED.map((va) => va.id),
        ...MOCK_ANSWERS.map((ma) => ma.id),
        ...answers
          .filter((a) => isSimulatedAnswer(a) || isMockAnswerId(a.id) || simQIds.includes(a.questionId))
          .map((a) => a.id),
      ])
    );

    // 3. 找出所有模擬創作者帳號與拋棄式測試帳號 ID（保留管理員與真實註冊用戶）
    const disposableIds = ['solver-3', 'solver-4', 'solver-5', 'user-author-2', 'user-author-3'];
    const simUIds = Array.from(
      new Set([
        ...VIRTUAL_PERSONA_USERS.map((vu) => vu.id),
        ...availableUsers
          .filter((u) => isSimulatedUser(u) || disposableIds.includes(u.id))
          .map((u) => u.id),
      ])
    );

    // 更新本地狀態，並清理殘留於真實貼文上之模擬打賞紀錄
    setQuestions((prev) => {
      const remaining = prev
        .filter((q) => !simQIds.includes(q.id) && !isSimulatedQuestion(q) && !isMockQuestionId(q.id, q.authorId))
        .map((q) => {
          if (Array.isArray(q.tipsHistory) && q.tipsHistory.some((t) => t.isSimulated || t.id.startsWith('tip-sim-'))) {
            const realTips = q.tipsHistory.filter((t) => !t.isSimulated && !t.id.startsWith('tip-sim-'));
            const realPts = realTips.reduce((sum, t) => sum + (t.amount || 0), 0);
            const realSupporters = new Set(realTips.map((t) => (t as any).tipperId || t.userId)).size;
            return {
              ...q,
              tipsHistory: realTips,
              supportPoints: realPts,
              tippersCount: realSupporters,
              supporterCount: realSupporters,
            };
          }
          return q;
        });
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    setAnswers((prev) => {
      const remaining = prev.filter(
        (a) => !simAIds.includes(a.id) && !isSimulatedAnswer(a) && !isMockAnswerId(a.id) && !simQIds.includes(a.questionId)
      );
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    setAvailableUsers((prev) => {
      const remaining = prev.filter((u) => !simUIds.includes(u.id) && !isSimulatedUser(u));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(remaining));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    setSolvers((prev) => prev.filter((s) => !isMockSolverId(s.id) && !isTestAccountUserId(s.id)));
    setTransactions((prev) => prev.filter((t) => !isMockTransactionId(t.id)));
    setConversations((prev) => prev.filter((c) => !isMockConversationId(c.id)));

    // 同步自 Firebase Cloud Firestore 批次刪除所有模擬資料
    await Promise.all([
      simQIds.length > 0 ? deleteQuestionsFromFirestore(simQIds) : Promise.resolve(),
      simAIds.length > 0 ? deleteAnswersFromFirestore(simAIds) : Promise.resolve(),
      simUIds.length > 0 ? deleteUsersFromFirestore(simUIds) : Promise.resolve(),
    ]);

    setLastSyncTime(new Date().toLocaleTimeString('zh-TW'));
    return {
      deletedQuestions: simQIds.length,
      deletedAnswers: simAIds.length,
      deletedUsers: simUIds.length,
      purgedQuestions: simQIds.length,
      purgedAnswers: simAIds.length,
      purgedUsers: simUIds.length,
    };
  };

  // 一鍵恢復模擬創作者與模擬貼文數據（並重新同步寫入 Firestore）
  const restoreAllSimulatedData = async (): Promise<void> => {
    setIsSimulatedDataPurged(false);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}simulated_data_purged`, 'false');
    } catch {}
    syncPlatformSettingsToFirestore({ isSimulatedDataPurged: false });

    const deletedQIds = getDeletedQuestionIds();
    const deletedAIds = getDeletedAnswerIds();
    const deletedUIds = getDeletedUserIds();

    const activeVirtualQ = ALL_VIRTUAL_PROPOSALS_SEED.filter((vq) => !deletedQIds.has(vq.id));
    const activeVirtualA = ALL_VIRTUAL_ANSWERS_SEED.filter((va) => !deletedAIds.has(va.id) && !deletedQIds.has(va.questionId));
    const activeVirtualU = VIRTUAL_PERSONA_USERS.filter((vu) => !deletedUIds.has(vu.id));

    setQuestions((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      const merged = [...prev, ...activeVirtualQ.filter((vq) => !existingIds.has(vq.id))];
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(merged));
      } catch {}
      return merged;
    });

    setAnswers((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const merged = [...prev, ...activeVirtualA.filter((va) => !existingIds.has(va.id))];
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(merged));
      } catch {}
      return merged;
    });

    setAvailableUsers((prev) => {
      const existingIds = new Set(prev.map((u) => u.id));
      const merged = [...prev, ...activeVirtualU.filter((vu) => !existingIds.has(vu.id))];
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(merged));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(merged));
      } catch {}
      return merged;
    });

    await Promise.all([
      syncQuestionsToFirestore(activeVirtualQ),
      syncAnswersToFirestore(activeVirtualA),
      syncUsersToFirestore(activeVirtualU),
    ]);
    setLastSyncTime(new Date().toLocaleTimeString('zh-TW'));
  };

  const clearMockData = () => {
    purgeAllSimulatedData();
  };

  const resetDemoData = () => {
    restoreAllSimulatedData();
    setDemoMode(true);
  };

  return (
    <AppContext.Provider
      value={{
        isDemoMode,
        setDemoMode,
        toggleDemoMode,
        clearMockData,
        resetDemoData,
        isSimulatedDataPurged,
        simulatedStats: {
          simulatedQuestionsCount: questions.filter((q) => q.isSimulated || isMockQuestionId(q.id)).length,
          simulatedUsersCount: availableUsers.filter((u) => u.isSimulated || isMockSolverId(u.id) || isTestAccountUserId(u.id) || u.id.startsWith('u-vc-')).length,
          simulatedAnswersCount: answers.filter((a) => a.isSimulated || isMockAnswerId(a.id)).length,
          simulatedTransactionsCount: transactions.filter((t) => isMockTransactionId(t.id)).length,
        },
        purgeAllSimulatedData,
        restoreAllSimulatedData,
        isNoPaymentMode: isRaceMode ? false : isNoPaymentMode,
        setNoPaymentMode,
        toggleNoPaymentMode,
        isHideTestAccounts,
        setHideTestAccounts,
        toggleHideTestAccounts,
        isRaceMode,
        setRaceMode,
        toggleRaceMode,
        currentUser,
        setCurrentUser,
        availableUsers,
        setAvailableUsers,
        siteVisitsCount,
        uniqueVisitorsCount,
        onlineUsersCount,
        realRegisteredUsers,
        realRegisteredUsersCount,
        commissionRate,
        setCommissionRate,
        subscriptionPlans,
        updateSubscriptionPlan,
        switchRole,
        updateSolverPreferences,
        questions,
        setQuestions,
        solvers,
        setSolvers,
        answers,
        setAnswers,
        transactions,
        setTransactions,
        notifications: userPersonalNotifications,
        allNotifications: notifications,
        personalNotifications,
        systemNotifications,
        unreadPersonalCount,
        unreadSystemCount,
        hasUnreadSystemNotifs,
        addNotification,
        deleteNotification,
        clearAllNotifications,
        updateNotification,
        conversations,
        setConversations,
        activeConversationId,
        setActiveConversationId,
        selectedQuestion,
        setSelectedQuestion,
        selectedSolver,
        setSelectedSolver,
        isNotificationsSidebarOpen,
        setIsNotificationsSidebarOpen,
        searchQuery,
        setSearchQuery,
        searchMode,
        setSearchMode,
        isCreateQuestionOpen,
        setIsCreateQuestionOpen,
        isSubmitAnswerOpen,
        setIsSubmitAnswerOpen,
        isUserDashboardOpen,
        setIsUserDashboardOpen,
        isAdminDashboardOpen,
        setIsAdminDashboardOpen,
        targetAnswerToUnlock,
        setTargetAnswerToUnlock,
        isCustomerServiceOpen,
        customerServiceContext,
        closeCustomerService,
        openCustomerService,
        isRatingModalOpen,
        ratingTarget,
        closeRatingModal,
        openRatingModal,
        isAboutModalOpen,
        aboutModalInitialSection,
        openAboutModal,
        closeAboutModal,
        hasAgreedTerms,
        recordTermsAgreement,
        isAuthModalOpen,
        authModalMode,
        authModalMethod,
        authModalInterceptReason,
        openAuthModal,
        closeAuthModal,
        createQuestion,
        updateProposalContent,
        submitAnswer,
        unlockAnswer,
        acceptAnswer,
        rateSolver,
        inviteSolver,
        depositBalance,
        depositPackage,
        withdrawBalance,
        spendPoints,
        reportQuestionDispute,
        resolveDisputeRefund,
        resolvedDisputeIds,
        markDisputeResolved,
        pendingDisputesCount,
        pendingTicketsCount,
        pendingReportsCount,
        adminMailBadgeCount,
        delistQuestion,
        relistQuestion,
        deleteQuestionPermanently,
        deleteQuestionsBatchPermanently,
        deleteAnswerPermanently,
        purgeExpiredDelistedQuestions,
        requestAccountDeactivation,
        cancelAccountDeactivation,
        checkUserDeactivationStatus,
        purgeAccountPermanently,
        purgeExpiredDeactivatedAccounts,
        removeDuplicateAccounts,
        deleteUserAccountPermanently,
        addTestAccount,
        pullAllDataFromFirestore,
        acceptPhaseDelivery,
        releasePhasePayout,
        refundPhasePayout,
        togglePrivacySettings,
        subscribePlan,
        cancelPendingPlanChange,
        updateBankAccount,
        updateTransactionNote,
        calculateSplitPayout,
        bookmarkedQuestionIds,
        toggleBookmarkQuestion,
        isQuestionBookmarked,
        promoteQuestion,
        incrementQuestionViews,
        secondedQuestionIds,
        toggleSecondQuestion,
        setQuestionLikeState,
        isQuestionSeconded,
        getQuestionSecondCount,
        sameQuestionIds,
        toggleSameQuestion,
        isSameQuestionActive,
        getQuestionSameCount,
        likedDiscussionAnswerIds,
        toggleLikeDiscussionAnswer,
        isDiscussionAnswerLiked,
        getDiscussionAnswerLikesCount,
        likedQuestionIds,
        toggleLikeQuestion,
        isQuestionLiked,
        getQuestionLikesCount,
        autoTagQuestionWithAI,
        autoTagAllMyQuestionsWithAI,
        saveQuestionPreliminaryReport,
        unlockQuestionPreliminaryReport,
        startDirectChat,
        createGroupConversation,
        sendMessage,
        acceptChatOffer,
        confirmCustomOfferDelivery,
        toggleMediationAgreement,
        submitPhaseDeliverable,
        markNotificationRead,
        markAllNotificationsRead,
        markAllPersonalNotificationsRead,
        markAllSystemNotificationsRead,
        publicMetricsConfig,
        updatePublicMetricsConfig,
        aiCrmConfig,
        updateAiCrmConfig,
        updateAssistant24hrConfig,
        blockUser,
        unblockUser,
        adminUpdateUserVerification,
        grantUserAdminRole,
        updateSubscriptionPlanFull,
        addSubscriptionPlan,
        deleteSubscriptionPlan,
        adjustUserBalance,
        adminDailyQuota: DAILY_ADMIN_GRANT_QUOTA,
        getAdminRemainingDailyQuota,
        adminTransferPoints,
        adminResetDailyPoints,
        tipPainPoint,
        requestTipPayout,
        isFirestoreConnected,
        lastSyncTime,
        syncAllToCloud,
        initialBootProgress,
        initialBootStatusText,
        isInitialBootComplete,
        deviceAccounts,
        switchAccount,
        logoutAccount,
        removeDeviceAccount,
        addDeviceAccount,
        isPwaInstallModalOpen,
        openPwaInstallModal,
        closePwaInstallModal,
        centerToast,
        showCenterToast,
        hideCenterToast,
        promptLogin,
        openRechargePage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

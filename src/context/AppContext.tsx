import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Question,
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
  AIPreliminaryReport,
} from '../types';
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
  isTestAccountUserId,
  isMockQuestionId,
  isMockAnswerId,
  isMockSolverId,
  isMockTransactionId,
  isMockConversationId,
} from '../data/mockData';
import { CURRENT_TERMS_VERSION } from '../data/termsData';
import { analyzeQuestionWithAI, AIAnalysisResult, generate24hrAssistantReply } from '../services/aiService';
import { logoutFromFirebase } from '../services/firebaseAuth';
import {
  testFirestoreConnection,
  syncUserToFirestore,
  syncUsersToFirestore,
  syncQuestionToFirestore,
  syncQuestionsToFirestore,
  deleteQuestionFromFirestore,
  deleteQuestionsFromFirestore,
  deleteQuestionAndRelatedDataFromFirestore,
  deleteUserAndAllRelatedDataFromFirestore,
  subscribeToQuestions,
  syncAnswerToFirestore,
  syncAnswersToFirestore,
  deleteAnswerFromFirestore,
  syncTransactionToFirestore,
  syncTransactionsToFirestore,
  syncConversationToFirestore,
  syncNotificationsToFirestore,
  syncBookmarksToFirestore,
  syncSolversToFirestore,
  syncTermsAgreementsToFirestore,
  syncPlatformSettingsToFirestore,
  syncAuditLogsToFirestore,
  pushAllDataToFirestore,
  loadAllDataFromFirestore,
  subscribeToTickets,
  CategorizedSyncResult,
} from '../services/firestoreSync';
import { getStoredTickets } from '../services/customerSupportService';
import { CenterToastData } from '../components/CenterToast';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User | ((prev: User) => User)) => void;
  availableUsers: User[];
  setAvailableUsers: React.Dispatch<React.SetStateAction<User[]>>;
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
  authModalRole?: 'questioner' | 'solver' | 'creator' | 'expert';
  authModalInterceptReason?: string;
  openAuthModal: (
    mode?: 'login' | 'register',
    method?: 'email' | 'phone' | 'switch',
    interceptReason?: string,
    role?: 'questioner' | 'solver' | 'creator' | 'expert'
  ) => void;
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

  // Actions
  createQuestion: (q: Partial<Question>) => Question;
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
  triggerMonthEndRebate: () => { success: boolean; amount: number; message: string };
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
  resolvedDisputeIds: string[];
  markDisputeResolved: (disputeId: string, questionId?: string) => void;
  pendingDisputesCount: number;
  pendingTicketsCount: number;
  pendingReportsCount: number;
  adminMailBadgeCount: number;
  delistQuestion: (questionId: string, reason: string, feedback?: string) => void;
  relistQuestion: (questionId: string) => void;
  deleteQuestionPermanently: (questionId: string) => Promise<void>;
  deleteAnswerPermanently: (answerId: string) => Promise<void>;
  purgeExpiredDelistedQuestions: () => Promise<number>;
  requestAccountDeactivation: (reason?: string) => Promise<void>;
  cancelAccountDeactivation: (targetUser?: User) => Promise<User>;
  checkUserDeactivationStatus: (target: User) => {
    canLogin: boolean;
    restoredUser?: User;
    wasInGracePeriod: boolean;
    errorReason?: string;
  };
  purgeAccountPermanently: (userId: string) => Promise<void>;
  purgeExpiredDeactivatedAccounts: () => Promise<number>;
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
  updateSubscriptionPlanFull: (tier: SubscriptionTier, updatedData: Partial<SubscriptionPlan>) => void;
  addSubscriptionPlan: (newPlan: SubscriptionPlan) => { success: boolean; message: string };
  deleteSubscriptionPlan: (tierId: string) => { success: boolean; message: string };
  adjustUserBalance: (userId: string, deltaPoints: number, reason: string) => boolean;

  // Admin Transfer Points & Daily Quota (每日配額 50,000 點)
  adminDailyQuota: number;
  getAdminRemainingDailyQuota: (adminId?: string) => number;
  adminTransferPoints: (targetUserId: string, points: number, reason: string) => { success: boolean; message: string; remainingQuota?: number };
  adminResetDailyPoints: () => { success: boolean; message: string };

  // Cloud Firestore Persistence & Sync
  isFirestoreConnected: boolean;
  lastSyncTime: string | null;
  syncAllToCloud: () => Promise<CategorizedSyncResult>;

  // Demo Mode & Mock Data Management (管理員示範資料與測試模式開關)
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
  clearMockData: () => void;
  resetDemoData: () => void;

  // No Payment Mode (無金流環境開關：全站免付費，僅開放免費提問、無償解答與諮詢提案)
  isNoPaymentMode: boolean;
  setNoPaymentMode: (enabled: boolean) => void;
  toggleNoPaymentMode: () => void;

  // Hide Test Accounts (隱藏測試帳號開關：僅保留管理員與真實用戶)
  isHideTestAccounts: boolean;
  setHideTestAccounts: (enabled: boolean) => void;
  toggleHideTestAccounts: () => void;

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
  solutions: Answer[];
  setSolutions: React.Dispatch<React.SetStateAction<Answer[]>>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
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
    (text.includes('模式') && (text.includes('啟用') || text.includes('切換') || text.includes('開啟') || text.includes('關閉') || text.includes('恢復') || text.includes('隱藏') || text.includes('純淨') || text.includes('示範') || text.includes('營運') || text.includes('測試'))) ||
    (text.includes('環境') && (text.includes('啟用') || text.includes('切換') || text.includes('開啟') || text.includes('關閉') || text.includes('恢復') || text.includes('測試')))
  );
};

// 檢測當前運營模式 (FREE: 無金流模式, NORM: 正式營運模式, TEST: 測試環境)
type PlatformMode = 'TEST' | 'NORM' | 'FREE';

const getInitialPlatformMode = (): PlatformMode => {
  try {
    const isFree = localStorage.getItem(`${STORAGE_KEY_PREFIX}no_payment_mode`) === 'true';
    if (isFree) return 'FREE';

    const isNorm = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_norm_mode`) === 'true';
    if (isNorm) return 'NORM';

    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
    if (isDemo) return 'TEST';
  } catch {
    // ignore
  }
  // 默認規則：如果一般模式和無金流模式都沒開的話就默認開啟測試環境
  return 'TEST';
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
  const [authModalRole, setAuthModalRole] = useState<'questioner' | 'solver' | 'creator' | 'expert'>('questioner');
  const [authModalInterceptReason, setAuthModalInterceptReason] = useState<string | undefined>(undefined);

  const openAuthModal = (
    mode: 'login' | 'register' = 'login',
    method: 'email' | 'phone' | 'switch' = 'email',
    interceptReason?: string,
    role?: 'questioner' | 'solver' | 'creator' | 'expert'
  ) => {
    setAuthModalMode(mode);
    setAuthModalMethod(method);
    setAuthModalInterceptReason(interceptReason);
    if (role) {
      setAuthModalRole(role);
    }
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
    (customSubtitle?: string) => {
      showCenterToast('請先登入', customSubtitle || '訪客模式請先登入帳號以繼續操作', {
        type: 'lock',
        actionLabel: '前往登入',
        onAction: () => openAuthModal('login', 'email'),
        duration: 2200,
      });
    },
    [showCenterToast, openAuthModal]
  );

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      showCenterToast(
        type === 'success' ? '操作成功' : type === 'error' ? '溫馨提醒' : '系統提示',
        message,
        {
          type: type === 'success' ? 'success' : type === 'error' ? 'warning' : 'info',
        }
      );
    },
    [showCenterToast]
  );

  // PWA Install Modal State
  const [isPwaInstallModalOpen, setIsPwaInstallModalOpen] = useState(false);
  const openPwaInstallModal = () => setIsPwaInstallModalOpen(true);
  const closePwaInstallModal = () => setIsPwaInstallModalOpen(false);
  const [isNoPaymentMode, setIsNoPaymentMode] = useState<boolean>(() => getInitialPlatformMode() === 'FREE');

  const setNoPaymentMode = (enabled: boolean) => {
    setIsNoPaymentMode(enabled);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}no_payment_mode`, String(enabled));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}is_norm_mode`, String(!enabled));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}demo_mode`, 'false');
    } catch {
      // ignore
    }
    // 開啟無金流模式或正式營運模式時，自動退出測試環境，並隱藏測試環境模擬資料與測試帳號
    setIsDemoMode(false);
    setHideTestAccounts(true);
    setQuestions((prev) => prev.filter((q) => !isMockQuestionId(q.id, q.authorId)));
    setSolvers((prev) => prev.filter((s) => !isMockSolverId(s.id) && !isTestAccountUserId(s.id)));
    setAnswers((prev) => prev.filter((a) => !isMockAnswerId(a.id)));
    setTransactions((prev) => prev.filter((t) => !isMockTransactionId(t.id)));
    setConversations((prev) => prev.filter((c) => !isMockConversationId(c.id)));
    setBookmarkedQuestionIds((prev) => prev.filter((id) => !isMockQuestionId(id)));

    const testAccountIds = ['user-questioner', 'solver-2', 'user-guest', 'solver-1', 'solver-3', 'solver-4', 'solver-5', 'user-author-2', 'user-author-3'];
    setAvailableUsers((prev) => {
      const cleanList = prev
        .filter((u) => (!testAccountIds.includes(u.id) && !u.id.startsWith('solver-')) || u.id === 'user-admin');

      const adminIdx = cleanList.findIndex((u) => u.id === 'user-admin');
      if (adminIdx === -1) {
        cleanList.unshift(CLEAN_CORE_USERS[0]);
      } else if (!enabled && (!cleanList[adminIdx].balance || cleanList[adminIdx].balance === 0)) {
        // 切換回正式營運模式 (NORM) 時，恢復管理員營運點數
        cleanList[adminIdx] = { ...cleanList[adminIdx], balance: 50000 };
      }
      return cleanList;
    });

    setCurrentUser((curr) => {
      if (curr.id === 'user-guest') return curr;
      if ((testAccountIds.includes(curr.id) || curr.id.startsWith('solver-')) && curr.id !== 'user-admin') {
        return GUEST_USER;
      }
      if (curr.id === 'user-admin' && !enabled && (!curr.balance || curr.balance === 0)) {
        // 切換回正式營運模式 (NORM) 時，管理員點數恢復原樣 (50,000 點)
        return { ...curr, balance: 50000 };
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

  const setHideTestAccounts = (enabled: boolean) => {
    setIsHideTestAccounts(enabled);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}hide_test_accounts`, String(enabled));
    } catch {
      // ignore
    }
    const testAccountIds = ['user-questioner', 'solver-2', 'solver-1', 'solver-3', 'solver-4', 'solver-5', 'user-author-2', 'user-author-3'];
    if (enabled) {
      // 1. 隱藏測試帳號（用戶列表）
      setAvailableUsers((prev) => {
        const filtered = prev.filter((u) => (!testAccountIds.includes(u.id) && !u.id.startsWith('solver-') && !isTestAccountUserId(u.id)) || u.id === 'user-admin' || u.id === 'user-guest');
        if (!filtered.some((u) => u.id === 'user-admin')) {
          filtered.unshift(CLEAN_CORE_USERS[0]);
        }
        return filtered;
      });

      // 2. 當前使用者若為測試帳號，自動切換至訪客
      setCurrentUser((curr) => {
        if (curr.id === 'user-guest') return curr;
        if ((testAccountIds.includes(curr.id) || curr.id.startsWith('solver-') || isTestAccountUserId(curr.id)) && curr.id !== 'user-admin') {
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
          return list;
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

  // Load initial state with localStorage support (預設未登入任何帳號，以訪客身分開始)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const isAuthenticated = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_authenticated`) === 'true';
      if (!isAuthenticated) {
        return GUEST_USER;
      }
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}user`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name && parsed.id !== 'user-guest') {
          const isAdmin =
            parsed.id === 'user-admin' ||
            (typeof parsed.username === 'string' && parsed.username.toLowerCase() === 'admin_001') ||
            (typeof parsed.name === 'string' && (parsed.name.includes('IdeaX') || parsed.name.includes('管理') || parsed.name.includes('營運')));
          return {
            ...CLEAN_CORE_USERS[0],
            ...parsed,
            username: isAdmin ? 'Admin_001' : parsed.username,
            password: isAdmin ? 'John930521' : parsed.password,
            name: isAdmin ? 'IdeaX 管理團隊' : parsed.name,
            role: isAdmin ? ('admin' as const) : (parsed.role || 'questioner'),
            balance: isAdmin
              ? (typeof parsed.balance === 'number' && parsed.balance > 0 ? parsed.balance : 50000)
              : (typeof parsed.balance === 'number' ? parsed.balance : 0),
            withheldPoints: typeof parsed.withheldPoints === 'number' ? parsed.withheldPoints : 0,
            pendingEarnings: typeof parsed.pendingEarnings === 'number' ? parsed.pendingEarnings : 0,
            reputation: typeof parsed.reputation === 'number' ? parsed.reputation : 100,
            totalRevenue: typeof parsed.totalRevenue === 'number' ? parsed.totalRevenue : 0,
            totalPaidOut: typeof parsed.totalPaidOut === 'number' ? parsed.totalPaidOut : 0,
            escrowedEarnings: typeof parsed.escrowedEarnings === 'number' ? parsed.escrowedEarnings : 0,
            reputationPoints: typeof parsed.reputationPoints === 'number' ? parsed.reputationPoints : 0,
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

  const [availableUsers, setAvailableUsers] = useState<User[]>(() => {
    const isDemo = getInitialIsDemoMode();
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          const usersList = parsed.map((u: any) => {
            const isAdmin = u.id === 'user-admin' || (typeof u.username === 'string' && u.username.toLowerCase() === 'admin_001') || (typeof u.name === 'string' && (u.name.includes('IdeaX') || u.name.includes('管理') || u.name.includes('營運')));
            return {
              ...u,
              username: isAdmin ? 'Admin_001' : u.username,
              password: isAdmin ? 'John930521' : u.password,
              name: isAdmin ? 'IdeaX 管理團隊' : u.name,
              role: isAdmin ? ('admin' as const) : u.role,
              balance: isAdmin
                ? (typeof u.balance === 'number' && u.balance > 0 ? u.balance : 50000)
                : (typeof u.balance === 'number' ? u.balance : 0),
              withheldPoints: typeof u.withheldPoints === 'number' ? u.withheldPoints : 0,
            };
          });

          if (!isDemo) {
            // 正式模式（營運模式與無金流模式）：絕不添加模擬帳號，僅保留真實用戶
            const testBlacklist = ['user-questioner', 'solver-2', 'user-guest', 'solver-1', 'solver-3', 'solver-4', 'solver-5', 'user-author-2', 'user-author-3'];
            const cleanList = usersList.filter((u: any) => (!testBlacklist.includes(u.id) && !u.id.startsWith('solver-') && !isTestAccountUserId(u.id)) || u.id === 'user-admin');
            if (!cleanList.some((u: any) => u.id === 'user-admin')) {
              cleanList.unshift(CLEAN_CORE_USERS[0]);
            }
            return cleanList;
          }

          // 測試環境 (TEST)：加回所有模擬用戶與測試帳號，並保留自訂用戶
          const customUsers = usersList.filter((u: any) => !isTestAccountUserId(u.id) && !u.id.startsWith('solver-') && u.id !== 'user-admin');
          return [...MOCK_USERS, ...customUsers];
        }
      }
    } catch {
      // ignore
    }
    return isDemo ? MOCK_USERS : CLEAN_CORE_USERS;
  });

  const DEVICE_ACCOUNTS_KEY = `${STORAGE_KEY_PREFIX}device_accounts`;

  const [deviceAccounts, setDeviceAccounts] = useState<DeviceAccount[]>(() => {
    try {
      const isAuthenticated = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_authenticated`) === 'true';
      const saved = localStorage.getItem(DEVICE_ACCOUNTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 若目前未登入（如剛進入網站或剛下載之用戶），絕不殘留任何舊版預設之管理員或訪客帳號
          const cleaned = parsed.filter((a: any) => {
            if (!a || !a.userId || a.userId === 'user-guest') return false;
            if (!isAuthenticated && (a.userId === 'user-admin' || isTestAccountUserId(a.userId))) return false;
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
      const idx = prev.findIndex((a) => a.userId === currentUser.id);
      const now = new Date().toISOString();
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], isLoggedIn: true, lastLoginAt: now };
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

    const sanitizeQuestion = (q: any): Question => {
      const count = typeof realClicks[q.id] === 'number' ? realClicks[q.id] : (q.views || 0);
      return {
        ...q,
        bounty: typeof q.bounty === 'number' ? q.bounty : 0,
        withheldBounty: typeof q.withheldBounty === 'number' ? q.withheldBounty : (q.bounty || 0),
        views: count,
        viewsCount: count,
      };
    };

    const isDelistedExpired = (q: any): boolean => {
      if (q.status === 'delisted' && q.delistedAt) {
        return now - new Date(q.delistedAt).getTime() >= SEVEN_DAYS_MS;
      }
      return false;
    };

    if (!isDemo) {
      // 非測試環境（營運模式、無金流模式）：絕不添加任何模擬題目，徹底排除永久刪除與過期下架項目
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}questions`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((q: any) => !deletedIds.has(q.id) && !isMockQuestionId(q.id, q.authorId) && !isDelistedExpired(q))
              .map(sanitizeQuestion);
          }
        }
      } catch {
        // ignore
      }
      return [];
    }
    // 測試環境 (TEST / DEMO)：加回所有題目，優先採用本地已儲存之完整狀態，嚴格過濾黑名單（永久刪除與逾30日下架）
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}questions`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const parsedIdMap = new Set(parsed.map((q: any) => q.id));
          const missingMock = MOCK_QUESTIONS.filter((mq) => !parsedIdMap.has(mq.id) && !deletedIds.has(mq.id));
          return [...parsed, ...missingMock]
            .filter((q: any) => !deletedIds.has(q.id) && !isDelistedExpired(q))
            .map(sanitizeQuestion);
        }
      }
    } catch {
      // ignore
    }
    return MOCK_QUESTIONS
      .filter((q) => !deletedIds.has(q.id) && !isDelistedExpired(q))
      .map(sanitizeQuestion);
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
    const deletedAnsIds = getDeletedAnswerIds();
    const deletedQIds = getDeletedQuestionIds();

    const isAnswerValid = (a: any) => {
      if (!a || !a.id) return false;
      if (deletedAnsIds.has(a.id)) return false;
      if (a.questionId && deletedQIds.has(a.questionId)) return false;
      return true;
    };

    if (!isDemo) {
      // 非測試環境：不保留任何模擬解答方案
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}answers`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((a: any) => !isMockAnswerId(a.id) && isAnswerValid(a))
              .map((a: any) => ({
                ...a,
                price: typeof a.price === 'number' ? a.price : 0,
              }));
          }
        }
      } catch {
        // ignore
      }
      return [];
    }
    // 測試環境 (TEST / DEMO)：加回模擬解答方案（需過濾已刪除黑名單）
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}answers`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const customAnswers = parsed.filter((a: any) => !isMockAnswerId(a.id) && isAnswerValid(a));
          const validMocks = MOCK_ANSWERS.filter(isAnswerValid);
          return [...validMocks, ...customAnswers].map((a: any) => ({
            ...a,
            price: typeof a.price === 'number' ? a.price : 0,
          }));
        }
      }
    } catch {
      // ignore
    }
    return MOCK_ANSWERS.filter(isAnswerValid);
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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
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

  // Cloud Firestore Sync State
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Save to localStorage & Cloud Firestore
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(currentUser));
    if (currentUser && currentUser.id && currentUser.id !== 'user-guest') {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}is_authenticated`, 'true');
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_authenticated`);
    }
    setAvailableUsers((users) => {
      const idx = users.findIndex((u) => u.id === currentUser.id);
      if (idx >= 0) {
        if (
          users[idx].avatar !== currentUser.avatar ||
          users[idx].name !== currentUser.name ||
          users[idx].title !== currentUser.title ||
          users[idx].bio !== currentUser.bio ||
          users[idx].domain !== currentUser.domain ||
          users[idx].balance !== currentUser.balance ||
          users[idx].withheldPoints !== currentUser.withheldPoints
        ) {
          const next = [...users];
          next[idx] = { ...next[idx], ...currentUser };
          return next;
        }
      }
      return users;
    });

    // Also sync to solvers directory if currentUser is listed as a solver
    setSolvers((prevSolvers) => {
      const idx = prevSolvers.findIndex((s) => s.id === currentUser.id);
      if (
        idx >= 0 &&
        (prevSolvers[idx].avatar !== currentUser.avatar ||
          prevSolvers[idx].name !== currentUser.name)
      ) {
        const next = [...prevSolvers];
        next[idx] = {
          ...next[idx],
          name: currentUser.name,
          avatar: currentUser.avatar,
          title: currentUser.title || next[idx].title,
        };
        return next;
      }
      return prevSolvers;
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
  const pullAllDataFromFirestore = async (): Promise<boolean> => {
    try {
      const cloudData = await loadAllDataFromFirestore();
      if (!cloudData) return false;
      const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
      const deletedIds = getDeletedQuestionIds();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (cloudData.questions && cloudData.questions.length > 0) {
        const expiredIds: string[] = [];
        const filteredQ = cloudData.questions
          .filter((q) => !deletedIds.has(q.id) && (isDemo || !isMockQuestionId(q.id, q.authorId)))
          .filter((q) => {
            if (q.status === 'delisted' && q.delistedAt) {
              if (now - new Date(q.delistedAt).getTime() >= SEVEN_DAYS_MS) {
                expiredIds.push(q.id);
                return false;
              }
            }
            return true;
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

        setQuestions(filteredQ);
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(filteredQ));
        } catch {}
      }

      if (cloudData.users && cloudData.users.length > 0) {
        const rawUsers = !isDemo ? cloudData.users.filter((u) => !isTestAccountUserId(u.id)) : cloudData.users;
        const cleanUsers = rawUsers.map((u) => {
          if (u.id === 'user-admin' || u.role === 'admin') {
            return {
              ...u,
              balance: typeof u.balance === 'number' && u.balance > 0 ? u.balance : 50000,
            };
          }
          return u;
        });
        setAvailableUsers(cleanUsers.length > 0 ? cleanUsers : CLEAN_CORE_USERS);
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(cleanUsers));
        } catch {}
        const found = cleanUsers.find((u) => u.id === currentUser.id);
        if (found) {
          const effectiveUser = (found.id === 'user-admin' || found.role === 'admin')
            ? { ...found, balance: typeof found.balance === 'number' && found.balance > 0 ? found.balance : 50000 }
            : found;
          setCurrentUser(effectiveUser);
        }
      }

      if (cloudData.answers && cloudData.answers.length > 0) {
        const cleanAns = !isDemo ? cloudData.answers.filter((a) => !isMockAnswerId(a.id)) : cloudData.answers;
        setAnswers(cleanAns);
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}answers`, JSON.stringify(cleanAns));
        } catch {}
      }

      if (cloudData.transactions && cloudData.transactions.length > 0) {
        const cleanTx = !isDemo ? cloudData.transactions.filter((t) => !isMockTransactionId(t.id)) : cloudData.transactions;
        setTransactions(cleanTx);
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}transactions`, JSON.stringify(cleanTx));
        } catch {}
      }

      if (cloudData.conversations && cloudData.conversations.length > 0) {
        const cleanConv = !isDemo ? cloudData.conversations.filter((c) => !isMockConversationId(c.id)) : cloudData.conversations;
        setConversations(cleanConv);
      }

      if (cloudData.notifications && cloudData.notifications.length > 0) {
        setNotifications(cloudData.notifications.filter((n) => !isModeOrEnvNotification(n.title, n.message)));
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

    (async () => {
      try {
        const connected = await testFirestoreConnection();
        if (mounted) setIsFirestoreConnected(connected);

        // Auto purge expired 7-day delisted/deleted questions on startup
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const deletedIds = getDeletedQuestionIds();
        const expiredIdsOnBoot: string[] = [];

        setQuestions((prev) => {
          const remaining = prev.filter((q) => {
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

        const cloudData = await loadAllDataFromFirestore();
        if (!mounted) return;

        const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';

        if (cloudData && ((cloudData.questions && cloudData.questions.length > 0) || (cloudData.users && cloudData.users.length > 0))) {
          if (cloudData.users && cloudData.users.length > 0) {
            const rawUsers = !isDemo ? cloudData.users.filter((u) => !isTestAccountUserId(u.id)) : cloudData.users;
            const cleanUsers = rawUsers.map((u) => {
              if (u.id === 'user-admin' || u.role === 'admin') {
                return {
                  ...u,
                  balance: typeof u.balance === 'number' && u.balance > 0 ? u.balance : 50000,
                };
              }
              return u;
            });
            setAvailableUsers(cleanUsers.length > 0 ? cleanUsers : CLEAN_CORE_USERS);
            const foundUser = cleanUsers.find((u) => u.id === currentUser.id);
            if (foundUser) {
              const effectiveUser = (foundUser.id === 'user-admin' || foundUser.role === 'admin')
                ? { ...foundUser, balance: typeof foundUser.balance === 'number' && foundUser.balance > 0 ? foundUser.balance : 50000 }
                : foundUser;
              setCurrentUser(effectiveUser);
            }
          }
          if (cloudData.questions && cloudData.questions.length > 0) {
            const currentDeleted = getDeletedQuestionIds();
            const filteredQ = cloudData.questions
              .filter((q) => !currentDeleted.has(q.id) && (isDemo || !isMockQuestionId(q.id, q.authorId)))
              .filter((q) => {
                if (q.status === 'delisted' && q.delistedAt) {
                  return now - new Date(q.delistedAt).getTime() < SEVEN_DAYS_MS;
                }
                return true;
              });
            setQuestions(filteredQ);
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(filteredQ));
            } catch {
              // ignore
            }
          }
          if (cloudData.answers && cloudData.answers.length > 0) {
            if (!isDemo) {
              setAnswers(cloudData.answers.filter((a) => !isMockAnswerId(a.id)));
            } else {
              setAnswers(cloudData.answers);
            }
          }
          if (cloudData.transactions && cloudData.transactions.length > 0) {
            if (!isDemo) {
              setTransactions(cloudData.transactions.filter((t) => !isMockTransactionId(t.id)));
            } else {
              setTransactions(cloudData.transactions);
            }
          }
          if (cloudData.conversations && cloudData.conversations.length > 0) {
            if (!isDemo) {
              setConversations(cloudData.conversations.filter((c) => !isMockConversationId(c.id)));
            } else {
              setConversations(cloudData.conversations);
            }
          }
          if (cloudData.notifications && cloudData.notifications.length > 0) {
            setNotifications(cloudData.notifications.filter((n) => !isModeOrEnvNotification(n.title, n.message)));
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
          const valid = updatedCloudQuestions
            .filter((q) => !currentDeleted.has(q.id) && (isCurrentDemo || !isMockQuestionId(q.id, q.authorId)))
            .filter((q) => {
              if (q.status === 'delisted' && q.delistedAt) {
                return Date.now() - new Date(q.delistedAt).getTime() < SEVEN_DAYS_MS;
              }
              return true;
            });
          setQuestions(valid);
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(valid));
          } catch {}
          setLastSyncTime(new Date().toLocaleTimeString('zh-TW'));
        });
      } catch (err) {
        console.warn('Firestore initial boot load:', err);
      }
    })();

    return () => {
      mounted = false;
      if (unsubQuestions) unsubQuestions();
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
      if (updated) setSelectedQuestion(updated);
    }
  }, [questions]);

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

    // 發送平台通知 (系統通知)
    const blockNotification: NotificationItem = {
      id: `notif-block-${Date.now()}`,
      title: '⚠️ 帳號封鎖通知',
      message: `您的帳號已被管理員【${currentUser.name || '平台管理員'}】執行停權封鎖。封鎖期限：【${durationText}】，封鎖理由：【${reason}】。在封鎖期間內您將無法發布問題、提交方案、發送私聊或進行交易。如有疑問請聯絡客服。`,
      type: 'system',
      createdAt: nowIso,
      read: false,
    };

    setNotifications((prev) => [blockNotification, ...prev]);

    return {
      success: true,
      message: `已成功封鎖用戶「${userToBlock.name}」，期限：${durationText}。系統已發送平台通知通知該用戶！`,
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

    const unblockNotification: NotificationItem = {
      id: `notif-unblock-${Date.now()}`,
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
    const target = availableUsers.find((u) => u.id === userId);
    if (!target) return false;

    // 檢查是否有註銷猶豫期狀態：只要這 7 日內有再登入這個帳號，就自動視為取消註銷！
    const { canLogin, restoredUser, wasInGracePeriod, errorReason } = checkUserDeactivationStatus(target);
    if (!canLogin || !restoredUser) {
      alert(errorReason || '此帳號已超過 7 日反悔猶豫期並已註銷，無法登入。');
      return false;
    }

    const effectiveUser = restoredUser;
    setCurrentUser(effectiveUser);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(effectiveUser));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(effectiveUser));

    if (wasInGracePeriod) {
      setAvailableUsers((prev) =>
        prev.map((u) => (u.id === effectiveUser.id ? effectiveUser : u))
      );
      try {
        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}available_users`,
          JSON.stringify(availableUsers.map((u) => (u.id === effectiveUser.id ? effectiveUser : u)))
        );
      } catch {}
      syncUserToFirestore(effectiveUser);
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
      const idx = prev.findIndex((a) => a.userId === userId);
      const now = new Date().toISOString();
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], isLoggedIn: true, lastLoginAt: now };
        return updated;
      }
      return [...prev, { userId, isLoggedIn: true, lastLoginAt: now }];
    });
    return true;
  };

  const logoutAccount = (userId?: string) => {
    const targetId = userId || currentUser.id;
    logoutFromFirebase().catch(() => {});
    setDeviceAccounts((prev) =>
      prev.map((a) => (a.userId === targetId ? { ...a, isLoggedIn: false } : a))
    );
    if (targetId === currentUser.id) {
      const guest = GUEST_USER;
      setCurrentUser(guest);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_authenticated`);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(guest));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(guest));
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
    const q: Question = {
      id: `q-${Date.now()}`,
      title: newQ.title || '無標題問題',
      description: newQ.description || '',
      category: newQ.category || '創新創業',
      subcategory: newQ.subcategory || '資訊科技',
      tags: newQ.tags || ['創新創業', '商業模式'],
      level: newQ.level || 'L2',
      bounty: newQ.bounty ?? 1000,
      postType: newQ.postType || 'seek_solution',
      status: 'open',
      authorId: newQ.authorId || currentUser.id,
      authorName: newQ.authorName || currentUser.name,
      authorAvatar: newQ.authorAvatar || currentUser.avatar,
      authorTitle: newQ.authorTitle || currentUser.title,
      isOfficial: newQ.isOfficial,
      publishIdentity: newQ.publishIdentity || (currentUser.role === 'admin' ? 'admin' : undefined),
      isFeatured: newQ.isFeatured,
      createdAt: new Date().toISOString(),
      deadline: newQ.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      views: 0,
      viewsCount: 0,
      answersCount: 0,
      aiAnalysis: newQ.aiAnalysis,
      withheldBounty: newQ.bounty ?? 1000,
      disputeStatus: 'none',
      phases: newQ.phases,
    };

    // If bounty > 0, questioner pays via supported third-party payment gateway into safe escrow
    if (q.bounty > 0) {
      setCurrentUser((prev) => ({
        ...prev,
        withheldPoints: (prev.withheldPoints || 0) + q.bounty,
        levelQuestionCounts: {
          ...(prev.levelQuestionCounts || { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 }),
          [q.level]: ((prev.levelQuestionCounts?.[q.level]) || 0) + 1,
        },
      }));
      // 提案懸賞扣的是點數（由點數帳本/預扣額管理），不記入現金交易紀錄
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

    // Add notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '問題發布成功',
        message: `您的懸賞問題「${q.title}」已成功上架問題市場${q.bounty > 0 ? `（款項 NT$ ${q.bounty.toLocaleString()} 元已安全進入履約託管）` : ''}，AI 正在自動媒合對應領域的認證專家！`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
        linkQuestionId: q.id,
      },
      ...prev,
    ]);

    return q;
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

    const ans: Answer = {
      id: isDiscussion ? `disc-${Date.now()}` : `ans-${Date.now()}`,
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
      likes: 0,
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

    return ans;
  };

  // Action: Unlock Paywall Answer via Third-party Payment & Automatic Split
  const unlockAnswer = (
    answerId: string,
    _useWithheldOffset: boolean = true,
    paymentMethod: string = '信用卡'
  ): boolean => {
    const target = answers.find((a) => a.id === answerId);
    if (!target) return false;

    const targetQ = questions.find((q) => q.id === target.questionId);
    const price = target.price;

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
      note: `買家透過線上支付（${paymentMethod}）支付 NT$ ${price.toLocaleString()} 元。系統自動結算：解答者實收 NT$ ${split.netPayout.toLocaleString()} 元（${split.feeDiscountText} 由解答者吸收）＋ IdeaX 服務費 NT$ ${split.platformFee.toLocaleString()} 元。款項已直撥入 ${split.bankAccountSnapshot}。`,
    };
    setTransactions((prev) => [tx, ...prev]);

    // Push notification for buyer
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '方案成功解鎖！',
        message: `您已透過線上支付（${paymentMethod}）成功付款 NT$ ${price.toLocaleString()} 元解鎖「${target.solverName}」的深度解決方案，完整內容現已開放閱讀。`,
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
        title: '方案解鎖收益已撥款入帳！',
        message: `買家已透過線上支付解鎖您的方案（定價 NT$ ${price.toLocaleString()} 元），系統已自動結算：實收 NT$ ${split.netPayout.toLocaleString()} 元（${split.feeDiscountText}）已成功撥款至您的 ${split.bankAccountSnapshot}！`,
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
    setCurrentUser((prev) => ({
      ...prev,
      balance: prev.balance + amount,
    }));
  };

  // Action: deposit via package
  const depositPackage = (packageId: string) => {
    const pkg = RECHARGE_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return;

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
  const requestAccountDeactivation = async (reason?: string): Promise<void> => {
    const targetUserId = currentUser.id;
    const targetUserName = currentUser.name;
    const now = new Date();
    const purgeDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const updatedUser: User = {
      ...currentUser,
      isDeactivated: true,
      deactivationStatus: 'pending_grace',
      deactivationRequestedAt: now.toISOString(),
      deactivationScheduledPurgeAt: purgeDate.toISOString(),
      deactivationReason: reason || '用戶自行申請註銷',
    };

    setAvailableUsers((prev) =>
      prev.map((u) => (u.id === targetUserId ? updatedUser : u))
    );
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(
        availableUsers.map((u) => (u.id === targetUserId ? updatedUser : u))
      ));
    } catch {}

    await syncUserToFirestore(updatedUser);

    setNotifications((prev) => [
      {
        id: `notif-deact-${Date.now()}`,
        title: '帳號註銷申請已生效・7日反悔猶豫期',
        message: `您的帳號「${targetUserName}」已進入 7 日註銷猶豫期。系統將於 7 日後（${purgeDate.toLocaleDateString('zh-TW')}）正式完成註銷並清空私密個資。在此 7 日期間內，只要您再次登入此帳號，系統即視為您取消註銷並自動全面恢復帳號！`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);

    syncAuditLogsToFirestore([
      {
        id: `audit-deact-req-${Date.now()}`,
        adminId: targetUserId,
        action: `用戶申請註銷帳號（7日反悔期，再登入即自動取消註銷）：${targetUserId}`,
        details: { reason, purgeAt: purgeDate.toISOString(), timestamp: now.toISOString() },
        createdAt: now.toISOString(),
      },
    ]);

    // 依使用者規範：申請註銷後安全登出當前帳號
    logoutAccount(targetUserId);
  };

  // Action: Cancel account deactivation (撤銷註銷帳號，恢復正常狀態)
  const cancelAccountDeactivation = async (targetUser?: User): Promise<User> => {
    const userToRestore = targetUser || currentUser;
    const updatedUser: User = {
      ...userToRestore,
      isDeactivated: false,
      deactivationStatus: undefined,
      deactivationRequestedAt: undefined,
      deactivationScheduledPurgeAt: undefined,
      deactivationReason: undefined,
    };

    setCurrentUser(updatedUser);
    setAvailableUsers((prev) =>
      prev.map((u) => (u.id === userToRestore.id ? updatedUser : u))
    );
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(updatedUser));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(updatedUser));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}available_users`, JSON.stringify(
        availableUsers.map((u) => (u.id === userToRestore.id ? updatedUser : u))
      ));
    } catch {}

    await syncUserToFirestore(updatedUser);

    setNotifications((prev) => [
      {
        id: `notif-cancel-deact-${Date.now()}`,
        title: '已自動取消帳號註銷！',
        message: `歡迎回來！您於 7 日反悔猶豫期內登入「${updatedUser.name}」，系統已自動視為取消註銷，所有資料與發案提案均完整保留並正常運作。`,
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
    paymentMethod: string = '信用卡'
  ): { success: boolean; message: string } => {
    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan) return { success: false, message: '無效的方案' };

    const currentTier = currentUser.subscriptionTier || 'free';
    const currentExpiry = currentUser.subscriptionExpiresAt || '2026-10-31';

    // 情況 1：轉換為一般會員（free）
    // 轉換為一般會員不需要重新扣款 (免扣款 / NT$ 0)，視為取消會員資格。任何變換方案都會在下個期間開始。
    if (tier === 'free') {
      if (currentTier === 'free') {
        return { success: true, message: '您目前已經是一般會員，無需重新扣款。' };
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
          message: `您已申請轉換為一般會員，不需要重新扣款。此操作視為取消會員資格，現有特權將保留享有至本期到期（${currentExpiry}），下個期間開始正式轉換為一般會員。`,
          type: 'system',
          createdAt: '剛剛',
          read: false,
        },
        ...prev,
      ]);

      return {
        success: true,
        message: `已為您設定轉換為一般會員（視為取消會員資格，不需要重新扣款）。目前權益仍享有至本期到期日（${currentExpiry}），將於下個期間開始正式生效。`,
      };
    }

    const selectedCycle = plan.billingCycles.find((c) => c.cycle === cycle) || plan.billingCycles[0];
    const price = selectedCycle.price;
    const durationMonths = selectedCycle.durationMonths || 1;
    const cycleDisplay = selectedCycle.label || `月繳 $${price.toLocaleString()}`;

    // 情況 2：若當前已有付費方案，進行「變換方案」
    // 任何變換方案都會在下個期間開始（不立即重新扣款，新方案於下期續訂日扣款並生效）
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
          message: `您已預約變換方案！任何變換方案都會在下個期間開始（${currentExpiry}）生效，屆時將依新方案（${cycleDisplay}）進行續訂扣款。本期享有原方案權益，不重複扣款。`,
          type: 'system',
          createdAt: '剛剛',
          read: false,
        },
        ...prev,
      ]);

      return {
        success: true,
        message: `已成功預約變換為「${plan.name}」！任何變換方案都會在下個期間開始（${currentExpiry}）生效，本期不重複扣款。`,
      };
    }

    // 情況 3：一般會員（free）首次訂閱付費方案
    // 由於先前無付費週期，首次購買即刻開通第一期
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + durationMonths);
    const expiryStr = expiry.toISOString().split('T')[0];

    setCurrentUser((prev) => ({
      ...prev,
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
      paymentMethod,
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
        message: `您已完成第三方支付 NT$ ${price.toLocaleString()} 元成功開通「${plan.name}」。即日起所有方案交易之服務費享有「${plan.feeDiscountText}」（解答者實收 ${plan.sellerPayoutText}）！後續任何變換方案均會在下個期間開始生效。`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);

    return {
      success: true,
      message: `成功開通「${plan.name}」！即刻享有服務費 ${plan.feeDiscountText}（實收 ${plan.sellerPayoutText}）。`,
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

  // Action: trigger month-end rebate simulation
  const triggerMonthEndRebate = (): { success: boolean; amount: number; message: string } => {
    const tier = currentUser.subscriptionTier || 'free';
    const plan = SUBSCRIPTION_PLANS[tier];

    if (tier === 'free' || plan.rebatePercent <= 0) {
      return {
        success: false,
        amount: 0,
        message: '目前為一般會員方案，暫無月底返還抽成優惠。升級達人級以上方案即可享有最高 20% 返還！',
      };
    }

    // Calculate this user's total solver earnings or paid solutions fees this month
    const userEarnedTxs = transactions.filter(
      (t) =>
        (t.toUserName === currentUser.name || t.fromUserName === currentUser.name) &&
        (t.type === '解答者收益' || t.type === '解答者收益發放' || t.type === '解答採納撥付' || t.type === '自訂提案收入' || t.type === '付費解鎖方案' || t.type === '私聊自訂方案交易')
    );

    // Sum of amounts received by this solver
    const totalEarningsVolume = userEarnedTxs.reduce((sum, t) => sum + t.amount, 0);
    // Baseline rebate = amount * (rebatePercent / 100)
    // If user hasn't made earnings yet in simulation, calculate at least a representative mock rebate
    const simulatedBase = totalEarningsVolume > 0 ? totalEarningsVolume : 12000;
    const rebateAmount = Math.round(simulatedBase * (plan.rebatePercent / 100));

    // Credit back to balance
    setCurrentUser((prev) => ({
      ...prev,
      balance: prev.balance + rebateAmount,
    }));

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      type: '月底抽成返還',
      amount: rebateAmount,
      platformFee: 0,
      netAmount: rebateAmount,
      fromUserName: '創點子 IdeaX 財務結算中心',
      toUserName: currentUser.name,
      status: '已完成',
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [tx, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `【月底結算】${plan.name} 抽成返還 NT$ ${rebateAmount.toLocaleString()} 已入帳`,
        message: `依據您的 ${plan.name}（月底返還 ${plan.rebatePercent}%，實質僅抽取 ${plan.effectiveRateText}），本月結算已自動將 NT$ ${rebateAmount.toLocaleString()} 返還至您的錢包餘額！`,
        type: 'system',
        createdAt: '剛剛',
        read: false,
      },
      ...prev,
    ]);

    return {
      success: true,
      amount: rebateAmount,
      message: `月底抽成結算完成！已自動將 ${plan.name} 返還金 NT$ ${rebateAmount.toLocaleString()} 匯入您的帳戶餘額。`,
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
    targetUser: { id: string; name: string; avatar: string; title: string },
    question?: Question
  ): string => {
    // Check if conversation already exists between currentUser and targetUser
    const existing = conversations.find(
      (c) => !c.isGroup && c.participantIds.includes(currentUser.id) && c.participantIds.includes(targetUser.id)
    );

    if (existing) {
      setActiveConversationId(existing.id);
      setConversations((prev) =>
        prev.map((c) => (c.id === existing.id ? { ...c, unreadCount: 0 } : c))
      );
      return existing.id;
    }

    const targetIsSolver = targetUser.title?.includes('顧問') || targetUser.title?.includes('專家') || targetUser.title?.includes('總監');
    const convRole: 'questioner' | 'solver' = currentUser.role === 'solver' && !targetIsSolver
      ? 'solver'
      : 'questioner';

    const newConv: ChatConversation = {
      id: `conv-${Date.now()}`,
      participantIds: [currentUser.id, targetUser.id],
      conversationRole: convRole,
      participantDetails: [
        {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          title: convRole === 'solver' ? (currentUser.title || '領域顧問') : '',
        },
        targetUser,
      ],
      relatedQuestionId: question?.id,
      relatedQuestionTitle: question?.title,
      lastMessage: '已建立私聊對話',
      lastMessageTime: '剛剛',
      unreadCount: 0,
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          text: question
            ? `您好，我想針對您提問/解答的「${question.title}」進一步私訊討論！`
            : `您好 ${targetUser.name}，很高興與您建立私密交流！`,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
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

  // Action: Accept and pay for custom offer directly in chat
  const acceptChatOffer = (conversationId: string, messageId: string): boolean => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return false;
    const msg = conv.messages.find((m) => m.id === messageId);
    if (!msg || !msg.offer || msg.offer.status !== 'pending') return false;

    const offer = msg.offer;
    const price = offer.price;

    const split = calculateSplitPayout(price, offer.creatorId);

    // Update offer status to accepted (私聊自訂方案透過第三方支付付款採納)
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
      paymentMethod: '信用卡 / 第三方金流',
      payoutStatus: '已撥款至銀行帳戶',
      bankAccountSnapshot: split.bankAccountSnapshot,
      relatedQuestionTitle: offer.title,
      fromUserName: currentUser.name,
      toUserName: offer.creatorName,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `買家透過第三方支付 NT$ ${price.toLocaleString()} 元解鎖自訂方案。系統自動拆款：賣家實收 NT$ ${split.netPayout.toLocaleString()} 元（${split.feeDiscountText}），平台服務費 NT$ ${split.platformFee.toLocaleString()} 元已撥款至 ${split.bankAccountSnapshot}。`,
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
            text: `🎉 交易成功！${currentUser.name} 已支付 NT$ ${price.toLocaleString()} 解鎖自訂方案「${offer.title}」。款項已安全入帳。`,
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
    let isAdded = false;
    setBookmarkedQuestionIds((prev) => {
      if (prev.includes(questionId)) {
        isAdded = false;
        return prev.filter((id) => id !== questionId);
      } else {
        isAdded = true;
        return [...prev, questionId];
      }
    });

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

  // Action: Promote question to top of recruiting list ($50)
  const promoteQuestion = (questionId: string): boolean => {
    const q = questions.find((item) => item.id === questionId);
    if (!q) return false;

    // Set question isFeatured
    setQuestions((prev) =>
      prev.map((item) => (item.id === questionId ? { ...item, isFeatured: true } : item))
    );

    // Record $50 promotion transaction
    const tx: Transaction = {
      id: `tx-promo-${Date.now()}`,
      type: '付費推播方案' as any,
      amount: 50,
      platformFee: 0,
      netAmount: 50,
      paymentMethod: '信用卡 / 第三方金流',
      payoutStatus: '已完成',
      relatedQuestionTitle: q.title,
      relatedQuestionId: q.id,
      fromUserName: currentUser.name,
      toUserName: 'IdeaX 平台推播中心',
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `已成功為「${q.title}」啟用招募中置頂推播（NT$ 50），享有置頂曝光與廣播大聲公 📢 專屬標章。`,
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

  // 檢舉反饋待處理數量
  const pendingReportsCount = 0;

  // 管理員紫色郵件符號總待辦計數：包含客服工單、案件申訴調解、檢舉反饋
  const adminMailBadgeCount = useMemo(() => {
    return pendingTicketsCount + pendingDisputesCount + pendingReportsCount;
  }, [pendingTicketsCount, pendingDisputesCount, pendingReportsCount]);

  // Action: Increment real views count (tracks views strictly according to real clicks)
  const incrementQuestionViews = (questionId: string, amount: number = 1) => {
    let nextViews = 1;
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}question_real_clicks`);
      const map: Record<string, number> = saved ? JSON.parse(saved) : {};
      const targetQ = questions.find((item) => item.id === questionId);
      const current = typeof map[questionId] === 'number'
        ? map[questionId]
        : (targetQ?.views || targetQ?.viewsCount || 0);
      nextViews = current + amount;
      map[questionId] = nextViews;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}question_real_clicks`, JSON.stringify(map));
    } catch {
      // ignore
    }

    setQuestions((prev) => {
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
  };

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

  const addNotification = (
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
        createdAt: '剛剛',
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
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
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
      return true;
    });
  }, [notifications, currentUser]);

  // 1. 個人通知（互動、方案提交、得標、懸賞入帳、私聊，計入郵件圖示右上角數字）
  const personalNotifications = useMemo(() => {
    return userPersonalNotifications.filter((n) => {
      const cat = n.category || (n.type === 'system' || n.type === 'ai_match' ? 'system' : 'personal');
      return cat === 'personal';
    });
  }, [userPersonalNotifications]);

  // 2. 系統通知（平台廣播、AI推薦、系統升級，在系統通知區亮紅點，不計入郵件記數）
  const systemNotifications = useMemo(() => {
    return userPersonalNotifications.filter((n) => {
      const cat = n.category || (n.type === 'system' || n.type === 'ai_match' ? 'system' : 'personal');
      return cat === 'system';
    });
  }, [userPersonalNotifications]);

  const unreadPersonalCount = useMemo(() => {
    return personalNotifications.filter((n) => !n.read).length;
  }, [personalNotifications]);

  const unreadSystemCount = useMemo(() => {
    return systemNotifications.filter((n) => !n.read).length;
  }, [systemNotifications]);

  const hasUnreadSystemNotifs = unreadSystemCount > 0;

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
    if (enabled) {
      setIsDemoMode(true);
      setIsNoPaymentMode(false);
      try {
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

  const clearMockData = () => {
    setIsDemoMode(false);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}demo_mode`, 'false');
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}questions`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}solvers`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}answers`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}transactions`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}conversations`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}bookmarks`);
    } catch {}
    setHideTestAccounts(true);
    setQuestions([]);
    setSolvers([]);
    setAnswers([]);
    setTransactions([]);
    setConversations([]);
    setBookmarkedQuestionIds([]);
    setAvailableUsers((prev) => {
      const realUsers = prev.filter((u) => !u.id.startsWith('solver-') && u.id !== 'user-questioner' && u.id !== 'user-guest' && u.id !== 'user-admin');
      return [CLEAN_CORE_USERS[0], ...realUsers];
    });
    setCurrentUser(GUEST_USER);
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}is_authenticated`);
    } catch {}
  };

  const resetDemoData = () => {
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
        isNoPaymentMode,
        setNoPaymentMode,
        toggleNoPaymentMode,
        isHideTestAccounts,
        setHideTestAccounts,
        toggleHideTestAccounts,
        currentUser,
        setCurrentUser,
        availableUsers,
        setAvailableUsers,
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
        authModalRole,
        authModalInterceptReason,
        openAuthModal,
        closeAuthModal,
        createQuestion,
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
        deleteAnswerPermanently,
        purgeExpiredDelistedQuestions,
        requestAccountDeactivation,
        cancelAccountDeactivation,
        checkUserDeactivationStatus,
        purgeAccountPermanently,
        purgeExpiredDeactivatedAccounts,
        addTestAccount,
        pullAllDataFromFirestore,
        acceptPhaseDelivery,
        releasePhasePayout,
        refundPhasePayout,
        togglePrivacySettings,
        subscribePlan,
        cancelPendingPlanChange,
        triggerMonthEndRebate,
        updateBankAccount,
        updateTransactionNote,
        calculateSplitPayout,
        bookmarkedQuestionIds,
        toggleBookmarkQuestion,
        isQuestionBookmarked,
        promoteQuestion,
        incrementQuestionViews,
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
        updateSubscriptionPlanFull,
        addSubscriptionPlan,
        deleteSubscriptionPlan,
        adjustUserBalance,
        adminDailyQuota: DAILY_ADMIN_GRANT_QUOTA,
        getAdminRemainingDailyQuota,
        adminTransferPoints,
        adminResetDailyPoints,
        isFirestoreConnected,
        lastSyncTime,
        syncAllToCloud,
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
        solutions: answers,
        setSolutions: setAnswers,
        showToast,
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

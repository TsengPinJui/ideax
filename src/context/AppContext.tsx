import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { analyzeQuestionWithAI, AIAnalysisResult } from '../services/aiService';
import { logoutFromFirebase } from '../services/firebaseAuth';
import {
  testFirestoreConnection,
  syncUserToFirestore,
  syncUsersToFirestore,
  syncQuestionToFirestore,
  syncQuestionsToFirestore,
  syncAnswerToFirestore,
  syncAnswersToFirestore,
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
  CategorizedSyncResult,
} from '../services/firestoreSync';

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
  answers: Answer[];
  transactions: Transaction[];
  notifications: NotificationItem[];
  addNotification: (notifOrTitle: Partial<NotificationItem> | string, message?: string, type?: any) => void;
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
  openAuthModal: (mode?: 'login' | 'register', method?: 'email' | 'phone' | 'switch') => void;
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
  triggerMonthEndRebate: () => { success: boolean; amount: number; message: string };
  updateBankAccount: (bankInfo: import('../types').BankAccountInfo) => void;
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

  // AI Auto-Tagging & Categorization
  autoTagQuestionWithAI: (questionId: string) => Promise<{ success: boolean; data?: AIAnalysisResult }>;
  autoTagAllMyQuestionsWithAI: () => Promise<number>;

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

  // Public Metrics Controls (Admin)
  publicMetricsConfig: PublicMetricsConfig;
  updatePublicMetricsConfig: (config: Partial<PublicMetricsConfig>) => void;

  // AI-CRM System Config (Admin)
  aiCrmConfig: AiCrmSystemConfig;
  updateAiCrmConfig: (config: Partial<AiCrmSystemConfig>) => void;

  // Admin Account & User Management
  blockUser: (userId: string, duration: number | 'permanent', reason: string) => { success: boolean; message: string };
  unblockUser: (userId: string) => { success: boolean; message: string };
  adminUpdateUserVerification: (
    userId: string,
    type: 'real_name' | 'expert',
    action: 'approve' | 'revoke',
    notes?: string
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'ideax_mvp_v3_';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Demo Mode State (管理員示範資料與測試模式開關：默認開啟測試環境，除非開啟正式營運模式或無金流模式)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      const isNorm = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_norm_mode`) === 'true';
      const isFree = localStorage.getItem(`${STORAGE_KEY_PREFIX}no_payment_mode`) === 'true';
      if (isNorm || isFree) {
        return false; // 已明確開啟一般營運模式或無金流模式
      }
    } catch {
      // ignore
    }
    return true; // 預設默認開啟測試環境，且無法單獨關閉（需切換至一般或無金流模式）
  });

  // Auth Modal Global Control State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalMethod, setAuthModalMethod] = useState<'email' | 'phone' | 'switch'>('email');

  const openAuthModal = (
    mode: 'login' | 'register' = 'login',
    method: 'email' | 'phone' | 'switch' = 'email'
  ) => {
    setAuthModalMode(mode);
    setAuthModalMethod(method);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // PWA Install Modal State
  const [isPwaInstallModalOpen, setIsPwaInstallModalOpen] = useState(false);
  const openPwaInstallModal = () => setIsPwaInstallModalOpen(true);
  const closePwaInstallModal = () => setIsPwaInstallModalOpen(false);
  const [isNoPaymentMode, setIsNoPaymentMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}no_payment_mode`);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // ignore
    }
    return false;
  });

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
      if ((testAccountIds.includes(curr.id) || curr.id.startsWith('solver-')) && curr.id !== 'user-admin') {
        return CLEAN_CORE_USERS[0];
      }
      if (curr.id === 'user-admin' && !enabled && (!curr.balance || curr.balance === 0)) {
        // 切換回正式營運模式 (NORM) 時，管理員點數恢復原樣 (50,000 點)
        return { ...curr, balance: 50000 };
      }
      return curr;
    });

    if (enabled) {
      addNotification('已開啟【無金流模式 (FREE)】', '已自動隱藏測試環境模擬資料與測試帳號，全平台恢復真實數據，並於介面隱藏點數與金流設定（原有點數安全保留）。', 'system');
    } else {
      addNotification('已開啟【正式營運模式 (NORM)】', '已恢復全平台真實數據與點數帳目，全站累計懸賞與交易流水純淨起跑。', 'system');
    }
  };

  const toggleNoPaymentMode = () => {
    setNoPaymentMode(!isNoPaymentMode);
  };

  // Hide Test Accounts State (隱藏測試帳號：僅保留管理員與真實用戶，預設 false)
  const [isHideTestAccounts, setIsHideTestAccounts] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}hide_test_accounts`);
      if (saved !== null) {
        return saved === 'true';
      }
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
    const testAccountIds = ['user-questioner', 'solver-2', 'user-guest', 'solver-1', 'solver-3', 'solver-4', 'solver-5', 'user-author-2', 'user-author-3'];
    if (enabled) {
      // 1. 隱藏測試帳號（用戶列表）
      setAvailableUsers((prev) => {
        const filtered = prev.filter((u) => (!testAccountIds.includes(u.id) && !u.id.startsWith('solver-') && !isTestAccountUserId(u.id)) || u.id === 'user-admin');
        if (!filtered.some((u) => u.id === 'user-admin')) {
          filtered.unshift(CLEAN_CORE_USERS[0]);
        }
        return filtered;
      });

      // 2. 當前使用者若為測試帳號，自動切換至管理員
      setCurrentUser((curr) => {
        if ((testAccountIds.includes(curr.id) || curr.id.startsWith('solver-') || isTestAccountUserId(curr.id)) && curr.id !== 'user-admin') {
          return CLEAN_CORE_USERS[0];
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

      addNotification('已啟用【隱藏測試帳號】', '全站已隱藏所有測試身分（林書豪、陳怡君、訪客等）以及其關聯之專家、問題、案件、聊天室與交易紀錄。', 'system');
    } else {
      // 恢復顯示測試帳號
      setAvailableUsers((prev) => {
        const list = [...prev];
        DEMO_CORE_TEST_USERS.forEach((core) => {
          if (!list.some((u) => u.id === core.id)) {
            list.push(core);
          }
        });
        return list;
      });

      // 若處於測試環境 (isDemoMode)，同時恢復示範問題、專家、解答、對話與交易
      if (isDemoMode) {
        setQuestions((prev) => {
          const merged = [...prev];
          MOCK_QUESTIONS.forEach((q) => {
            if (!merged.some((m) => m.id === q.id)) merged.push(q);
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

      addNotification('已恢復【顯示測試帳號】', '已恢復顯示核心測試帳號以及測試環境關聯之專家、問題、方案、對話與紀錄。', 'system');
    }
  };

  const toggleHideTestAccounts = () => {
    setHideTestAccounts(!isHideTestAccounts);
  };

  // Load initial state with localStorage support
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}user`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) {
          const isAdmin = parsed.id === 'user-admin' || (typeof parsed.name === 'string' && (parsed.name.includes('IdeaX') || parsed.name.includes('管理') || parsed.name.includes('營運')));
          return {
            ...CLEAN_CORE_USERS[0],
            ...parsed,
            name: isAdmin ? 'IdeaX 管理團隊' : parsed.name,
            role: isAdmin ? ('admin' as const) : (parsed.role || 'questioner'),
            balance: typeof parsed.balance === 'number' ? parsed.balance : 0,
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
    return CLEAN_CORE_USERS[0];
  });

  const [availableUsers, setAvailableUsers] = useState<User[]>(() => {
    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          const usersList = parsed.map((u: any) => {
            const isAdmin = u.id === 'user-admin' || (typeof u.name === 'string' && (u.name.includes('IdeaX') || u.name.includes('管理') || u.name.includes('營運')));
            return {
              ...u,
              name: isAdmin ? 'IdeaX 管理團隊' : u.name,
              role: isAdmin ? ('admin' as const) : u.role,
              balance: typeof u.balance === 'number' ? u.balance : 0,
              withheldPoints: typeof u.withheldPoints === 'number' ? u.withheldPoints : 0,
            };
          });

          if (!isDemo) {
            // 正式模式（營運模式與無金流模式）：自動隱藏所有模擬與測試帳號，恢復真實用戶
            const testBlacklist = ['user-questioner', 'solver-2', 'user-guest', 'solver-1', 'solver-3', 'solver-4', 'solver-5', 'user-author-2', 'user-author-3'];
            const cleanList = usersList.filter((u: any) => (!testBlacklist.includes(u.id) && !u.id.startsWith('solver-')) || u.id === 'user-admin');
            if (!cleanList.some((u: any) => u.id === 'user-admin')) {
              cleanList.unshift(CLEAN_CORE_USERS[0]);
            }
            return cleanList;
          }

          // Ensure user-admin exists in availableUsers
          if (!usersList.some((u: any) => u.id === 'user-admin')) {
            const adminUser = MOCK_USERS.find((m) => m.id === 'user-admin') || CLEAN_CORE_USERS[0];
            if (adminUser) usersList.push(adminUser);
          }
          return usersList;
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
      const saved = localStorage.getItem(DEVICE_ACCOUNTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [
      { userId: 'user-admin', isLoggedIn: true, lastLoginAt: new Date().toISOString() },
      { userId: 'user-questioner', isLoggedIn: true, lastLoginAt: new Date().toISOString() },
      { userId: 'solver-2', isLoggedIn: true, lastLoginAt: new Date().toISOString() },
    ];
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
      if (idx >= 0) {
        if (!prev[idx].isLoggedIn) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], isLoggedIn: true, lastLoginAt: new Date().toISOString() };
          return updated;
        }
        return prev;
      }
      return [
        ...prev,
        { userId: currentUser.id, isLoggedIn: true, lastLoginAt: new Date().toISOString() },
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

  const [questions, setQuestions] = useState<Question[]>(() => {
    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
    if (!isDemo) {
      // 非測試環境（營運模式、無金流模式）：絕不保留任何預留模擬題目
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}questions`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((q: any) => !isMockQuestionId(q.id, q.authorId))
              .map((q: any) => ({
                ...q,
                bounty: typeof q.bounty === 'number' ? q.bounty : 0,
                withheldBounty: typeof q.withheldBounty === 'number' ? q.withheldBounty : (q.bounty || 0),
              }));
          }
        }
      } catch {
        // ignore
      }
      return [];
    }
    // 測試環境 (DEMO)
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}questions`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((q: any) => ({
            ...q,
            bounty: typeof q.bounty === 'number' ? q.bounty : 0,
            withheldBounty: typeof q.withheldBounty === 'number' ? q.withheldBounty : (q.bounty || 0),
          }));
        }
      }
    } catch {
      // ignore
    }
    return MOCK_QUESTIONS;
  });

  const [solvers, setSolvers] = useState<Solver[]>(() => {
    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
    if (!isDemo) {
      // 非測試環境：不保留任何模擬專家資料
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}solvers`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((s: any) => !isMockSolverId(s.id));
          }
        }
      } catch {
        // ignore
      }
      return [];
    }
    // 測試環境 (DEMO)
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}solvers`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return MOCK_SOLVERS;
  });

  const [answers, setAnswers] = useState<Answer[]>(() => {
    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
    if (!isDemo) {
      // 非測試環境：不保留任何模擬解答方案
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}answers`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((a: any) => !isMockAnswerId(a.id))
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
    // 測試環境 (DEMO)
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}answers`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((a: any) => ({
            ...a,
            price: typeof a.price === 'number' ? a.price : 0,
          }));
        }
      }
    } catch {
      // ignore
    }
    return MOCK_ANSWERS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
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
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}transactions`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return MOCK_TRANSACTIONS;
  });

  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
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
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}conversations`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
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
    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
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
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return ['q-1', 'q-3'];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';
    if (!isDemo) return [];
    return [
      {
        id: 'notif-1',
        title: 'AI 智慧專家媒合推薦',
        message: '您的問題「校園共享雨傘如何從租借轉向商家合作」已有 3 位推薦解答者，媒合度最高達 96%！',
        type: 'ai_match',
        createdAt: '10 分鐘前',
        read: false,
        linkQuestionId: 'q-1',
      },
      {
        id: 'notif-2',
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
  const [publicMetricsConfig, setPublicMetricsConfig] = useState<PublicMetricsConfig>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}public_metrics_config`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      showSolvedCount: true,
      showTotalBounty: true,
      showAvgResponseSpeed: true,
      showSatisfactionRate: true,
      showHighestBounty: true,
    };
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
    // Solvers / Notifications state tracking
  }, [solvers, notifications]);

  // Initial check & hydration / initial seed to Firestore
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const connected = await testFirestoreConnection();
        if (mounted) setIsFirestoreConnected(connected);

        const cloudData = await loadAllDataFromFirestore();
        if (!mounted) return;

        if (cloudData && ((cloudData.questions && cloudData.questions.length > 0) || (cloudData.users && cloudData.users.length > 0))) {
          const isDemo = localStorage.getItem(`${STORAGE_KEY_PREFIX}demo_mode`) === 'true';

          if (cloudData.users && cloudData.users.length > 0) {
            if (!isDemo) {
              const cleanUsers = cloudData.users.filter((u) => !isTestAccountUserId(u.id));
              setAvailableUsers(cleanUsers.length > 0 ? cleanUsers : CLEAN_CORE_USERS);
            } else {
              setAvailableUsers(cloudData.users);
            }
            const foundUser = cloudData.users.find((u) => u.id === currentUser.id);
            if (foundUser) setCurrentUser(foundUser);
          }
          if (cloudData.questions && cloudData.questions.length > 0) {
            if (!isDemo) {
              setQuestions(cloudData.questions.filter((q) => !isMockQuestionId(q.id, q.authorId)));
            } else {
              setQuestions(cloudData.questions);
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
            setNotifications(cloudData.notifications);
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
        }
      } catch (err) {
        console.warn('Firestore initial boot load:', err);
      }
    })();
    return () => {
      mounted = false;
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
    return saved ? JSON.parse(saved) : SUBSCRIPTION_PLANS;
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
        pricingText = `$${monthlyPrice}/月 或 $${monthlyPrice * 11}/年`;
        if (billingCycles.length > 0) {
          billingCycles[0] = { ...billingCycles[0], price: monthlyPrice, label: `月繳 NT$ ${monthlyPrice}/月` };
        }
        if (billingCycles.length > 1) {
          billingCycles[1] = { ...billingCycles[1], price: monthlyPrice * 11, label: `年繳 NT$ ${monthlyPrice * 11}/年` };
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
    notes?: string
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
        notifTitle = '🎉 實名認證 (KYC) 審核通過！';
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
        updatedUser = {
          ...updatedUser,
          verifiedExpert: true,
          expertApplicationStatus: 'approved',
          verifiedBadge: updatedUser.verifiedBadge || '官方認證智庫專家',
        };
        // Also update solvers list if exists
        setSolvers((prev) =>
          prev.map((s) => (s.id === userId || s.userId === userId ? { ...s, verified: true } : s))
        );
        notifTitle = '👑 專家認證審核通過！';
        notifMsg = `恭喜您！您的智庫專家資格已由管理員【${currentUser.name || '平台管理員'}】審核通過，已獲得官方專屬專家認證徽章與優先推薦曝光！${notes ? `（備註：${notes}）` : ''}`;
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

    // 3. Create Immutable Ledger / Transaction Log
    const auditTx: Transaction = {
      id: `tx-admin-grant-${Date.now()}`,
      type: '儲值',
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
      type: '點數扣抵',
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
    setCurrentUser(target);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(target));
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
      const guest = availableUsers.find((u) => u.id === 'user-guest') || {
        id: 'user-guest',
        name: '未登入訪客',
        title: '訪客身份 (未登入)',
        avatar: '',
        role: 'questioner' as const,
        balance: 0,
        pendingEarnings: 0,
        reputation: 0,
        joinedDate: '2026-01-01',
        bio: '未登入訪客，僅限瀏覽內容。',
        email: '',
        totalWithdrawn: 0,
        subscriptionTier: 'free' as const,
        domain: '日常疑難' as Category,
        skills: ['自由探索'],
        verifiedExpert: false,
      };
      setCurrentUser(guest as User);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(guest));
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
      views: 1,
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

      const tx: Transaction = {
        id: `tx-escrow-${Date.now()}`,
        type: '第三方懸賞託管',
        amount: q.bounty,
        platformFee: 0,
        feeRate: 0,
        netAmount: q.bounty,
        paymentMethod: '信用卡 / 第三方金流',
        payoutStatus: '第三方安全託管中',
        relatedQuestionTitle: q.title,
        relatedQuestionId: q.id,
        fromUserName: currentUser.name,
        status: '成功',
        createdAt: new Date().toISOString(),
        note: `提問者透過第三方支付預付託管 NT$ ${q.bounty.toLocaleString()} 元。採納確認後將自動拆款：標準抽取 10% 服務費（由賣家吸收，依解答者會員方案最高實收 102%）。`,
      };
      setTransactions((prev) => [tx, ...prev]);
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

    setQuestions((prev) => [q, ...prev]);

    // Add notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '問題發布成功',
        message: `您的懸賞問題「${q.title}」已成功上架問題市場${q.bounty > 0 ? `（款項 NT$ ${q.bounty.toLocaleString()} 元已安全進入第三方託管）` : ''}，AI 正在自動媒合對應領域的認證專家！`,
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
      type: '第三方方案解鎖',
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
      note: `買家透過第三方支付（${paymentMethod}）支付 NT$ ${price.toLocaleString()} 元。系統自動拆款：解答者實收 NT$ ${split.netPayout.toLocaleString()} 元（${split.feeDiscountText} 由解答者吸收）＋ IdeaX 服務費 NT$ ${split.platformFee.toLocaleString()} 元。款項已直撥入 ${split.bankAccountSnapshot}。`,
    };
    setTransactions((prev) => [tx, ...prev]);

    // Push notification for buyer
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '方案成功解鎖！',
        message: `您已透過第三方支付（${paymentMethod}）成功付款 NT$ ${price.toLocaleString()} 元解鎖「${target.solverName}」的深度解決方案，完整內容現已開放閱讀。`,
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
        title: '第三方款項已拆分撥款入帳！',
        message: `買家已透過第三方支付解鎖您的方案（定價 NT$ ${price.toLocaleString()} 元），系統已自動拆款：實收 NT$ ${split.netPayout.toLocaleString()} 元（${split.feeDiscountText}）已成功撥款至您的 ${split.bankAccountSnapshot}！`,
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
      type: '第三方採納拆款撥付',
      amount: bounty,
      platformFee: split.platformFee,
      feeRate: split.feeRate,
      bonusAmount: split.bonusAmount,
      netAmount: split.netPayout,
      paymentMethod: '第三方託管自動拆款',
      payoutStatus: '已撥款至銀行帳戶',
      bankAccountSnapshot: split.bankAccountSnapshot,
      relatedQuestionTitle: targetQ?.title,
      relatedQuestionId: targetQ?.id,
      fromUserName: currentUser.name,
      toUserName: targetAns.solverName,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `提問者採納確認！第三方託管懸賞款項 NT$ ${bounty.toLocaleString()} 元自動拆款：解答者實收 NT$ ${split.netPayout.toLocaleString()} 元（${split.feeDiscountText} 由解答者吸收）＋ IdeaX 服務費 NT$ ${split.platformFee.toLocaleString()} 元。款項已成功撥入 ${split.bankAccountSnapshot}。`,
    };
    setTransactions((prev) => [tx, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '方案採納確認・第三方自動拆款完成',
        message: `您已採納 ${targetAns.solverName} 的方案，第三方安全託管之 NT$ ${bounty.toLocaleString()} 元已自動拆款完成，解答者實收 NT$ ${split.netPayout.toLocaleString()} 元已撥付至其指定帳戶。`,
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
        message: `恭喜！您的方案已獲得提問者採納，第三方支付託管款項 NT$ ${bounty.toLocaleString()} 元已自動拆款：實收 NT$ ${split.netPayout.toLocaleString()} 元已全數撥款至您的 ${split.bankAccountSnapshot}！`,
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

  // Action: deposit via package ($299=250點, $599=480點贈30點, $999=800點贈70點, $2999=2400點贈300點)
  const depositPackage = (packageId: string) => {
    const pkg = RECHARGE_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return;

    setCurrentUser((prev) => ({
      ...prev,
      balance: prev.balance + pkg.totalPoints,
    }));

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      type: '錢包儲值',
      amount: pkg.price,
      platformFee: pkg.commissionAmount,
      netAmount: pkg.totalPoints,
      fromUserName: currentUser.name,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `儲值方案：$${pkg.price} 實得 ${pkg.totalPoints} 點（平台抽成 $${pkg.commissionAmount}）`,
    };
    setTransactions((prev) => [tx, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: '點數儲值成功！',
        message: `您已成功支付 NT$ ${pkg.price} 儲值，平台服務費於儲值時直接扣除，實得 ${pkg.totalPoints} 點已存入帳戶可用餘額！`,
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
      note: `提現申請扣除平台 5% 結算手續費 (NT$ ${fee})，實到 NT$ ${netAmount.toLocaleString()}`,
    };
    setTransactions((prev) => [tx, ...prev]);
    return true;
  };

  // Action: spend points for platform services (e.g. AI report unlocking)
  const spendPoints = (amount: number, note?: string): boolean => {
    if ((currentUser.balance || 0) < amount || amount <= 0) return false;
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
      paymentMethod: '第三方託管自動拆款',
      payoutStatus: '已撥款至銀行帳戶',
      bankAccountSnapshot: split.bankAccountSnapshot,
      relatedQuestionTitle: questions.find((q) => q.id === questionId)?.title,
      relatedQuestionId: questionId,
      fromUserName: currentUser.name,
      toUserName: ans.solverName,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `「${phase.title}」階段交付驗收通過，第三方託管款項 NT$ ${pointsToRelease.toLocaleString()} 元自動拆款：解答者實收 NT$ ${split.netPayout.toLocaleString()} 元（${split.feeDiscountText}），平台服務費 NT$ ${split.platformFee.toLocaleString()} 元。已直撥 ${split.bankAccountSnapshot}。`,
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
      fromUserName: 'IdeaX 第三方託管金流',
      toUserName: currentUser.name,
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `「${phase.title}」階段未達成驗收，第三方安全託管 NT$ ${pointsToRefund.toLocaleString()} 元已原路退回付款帳戶。`,
    };
    setTransactions((prev) => [tx, ...prev]);
  };

  // Action: subscribe or change subscription plan via Third-party Payment
  const subscribePlan = (
    tier: SubscriptionTier,
    cycle: 'monthly' | 'semi_annual' | 'annual' = 'monthly',
    paymentMethod: string = '信用卡'
  ): { success: boolean; message: string } => {
    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan) return { success: false, message: '無效的方案' };

    if (tier === 'free') {
      setCurrentUser((prev) => ({
        ...prev,
        subscriptionTier: 'free',
        subscriptionExpiresAt: undefined,
      }));
      setAvailableUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, subscriptionTier: 'free', subscriptionExpiresAt: undefined }
            : u
        )
      );
      return { success: true, message: '已切換為一般會員方案（標準服務費 10%）' };
    }

    const selectedCycle = plan.billingCycles.find((c) => c.cycle === cycle) || plan.billingCycles[0];
    const price = selectedCycle.price;
    const durationMonths = selectedCycle.durationMonths || 1;

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + durationMonths);
    const expiryStr = expiry.toISOString().split('T')[0];

    setCurrentUser((prev) => ({
      ...prev,
      subscriptionTier: tier,
      subscriptionExpiresAt: expiryStr,
    }));

    setAvailableUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? { ...u, subscriptionTier: tier, subscriptionExpiresAt: expiryStr }
          : u
      )
    );

    const tx: Transaction = {
      id: `tx-sub-${Date.now()}`,
      type: '會員方案訂閱',
      amount: price,
      platformFee: 0,
      feeRate: 0,
      netAmount: price,
      paymentMethod,
      payoutStatus: '已撥款至銀行帳戶',
      fromUserName: currentUser.name,
      toUserName: '創點子 IdeaX 平台',
      status: '已完成',
      createdAt: new Date().toISOString(),
      note: `透過第三方支付（${paymentMethod}）成功付款 NT$ ${price.toLocaleString()} 元，開通「${plan.name}（${selectedCycle.label}）」，即日起交易服務費享有「${plan.feeDiscountText}」！`,
    };
    setTransactions((prev) => [tx, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `成功開通「${plan.name}」！`,
        message: `您已完成第三方支付 NT$ ${price.toLocaleString()} 元成功開通「${plan.name}」。即日起所有方案交易之服務費享有「${plan.feeDiscountText}」（解答者實收 ${plan.sellerPayoutText}）！`,
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
        (t.type === '解答者收益發放' || t.type === '付費解鎖方案' || t.type === '私聊自訂方案交易')
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

  // Action: Create Group Conversation (for vendors, admins, and users)
  const createGroupConversation = (groupName: string, participantIds: string[]): string => {
    const allParticipantIds = Array.from(new Set([currentUser.id, ...participantIds]));
    const details = allParticipantIds.map((id) => {
      const u = availableUsers.find((user) => user.id === id) || (id === currentUser.id ? currentUser : { id, name: '平台成員', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', title: '協作成員' });
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        title: u.title || '平台成員',
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

  // Ensure Automatic Admin Group Conversation Exists for Admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      const adminGroupExists = conversations.some((c) => c.isGroup && c.groupName === '平台管理員核心協作群組');
      if (!adminGroupExists) {
        const allAdmins = availableUsers.filter((u) => u.role === 'admin');
        const adminIds = allAdmins.map((a) => a.id);
        const allIds = Array.from(new Set([currentUser.id, ...adminIds]));
        const details = allIds.map((id) => {
          const u = availableUsers.find((user) => user.id === id) || currentUser;
          return {
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            title: u.title || '平台管理員',
          };
        });

        const adminGroupConv: ChatConversation = {
          id: 'group-admin-core',
          participantIds: allIds,
          participantDetails: details,
          isGroup: true,
          groupName: '平台管理員核心協作群組',
          lastMessage: '系統自動建立：平台全體管理員核心協作群組',
          lastMessageTime: '剛剛',
          unreadCount: 0,
          messages: [
            {
              id: 'msg-admin-group-init',
              senderId: 'system',
              senderName: 'IdeaX 系統核心',
              senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
              text: '【系統公告】平台管理員核心協作群組已自動建立，所有平台管理員已加入此群組，便於跨席位稽核、點數調撥與審核同步。',
              createdAt: new Date().toISOString(),
              isSystem: true,
            },
          ],
        };
        setConversations((prev) => [adminGroupConv, ...prev]);
      }
    }
  }, [currentUser?.role]);

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

  // Action: Increment real views count (tracks views seamlessly across web & mobile app)
  const incrementQuestionViews = (questionId: string, amount: number = 1) => {
    setQuestions((prev) => {
      const updated = prev.map((item) => {
        if (item.id === questionId) {
          const currentViews = typeof item.views === 'number' ? item.views : (item.viewsCount || 0);
          const nextViews = currentViews + amount;
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
        const currentViews = typeof prev.views === 'number' ? prev.views : (prev.viewsCount || 0);
        const nextViews = currentViews + amount;
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

        setQuestions((prev) =>
          prev.map((item) => {
            if (item.id !== questionId) return item;
            return {
              ...item,
              category: res.category || item.category,
              subcategory: res.subcategory || item.subcategory,
              tags: newTags.length > 0 ? newTags : item.tags,
              aiAnalysis: {
                summary: res.summary || item.aiAnalysis?.summary || '',
                structuredNeed: res.structuredNeed || item.aiAnalysis?.structuredNeed || [],
                solverProfileAdvice: res.solverProfileAdvice || item.aiAnalysis?.solverProfileAdvice || '',
                marketFitRating: item.aiAnalysis?.marketFitRating || 'A (高價值潛力)',
              },
            };
          })
        );

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
              marketFitRating: prev.aiAnalysis?.marketFitRating || 'A (高價值潛力)',
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

  const addNotification = (
    notifOrTitle: Partial<NotificationItem> | string,
    message?: string,
    type: any = 'system'
  ) => {
    if (typeof notifOrTitle === 'string') {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: notifOrTitle,
        message: message || '',
        type: type || 'system',
        createdAt: '剛剛',
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
    } else {
      const newNotif: NotificationItem = {
        id: notifOrTitle.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: notifOrTitle.title || '系統通知',
        message: notifOrTitle.message || '',
        type: notifOrTitle.type || 'system',
        createdAt: notifOrTitle.createdAt || '剛剛',
        read: false,
        ...notifOrTitle,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

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
      } catch {
        // ignore
      }
      // 開啟測試環境就同時公開測試帳號
      setHideTestAccounts(false);
      // 恢復示範模式：載入全站展示問題、精選解答、模擬專家與測試交易數據
      setQuestions(MOCK_QUESTIONS);
      setSolvers(MOCK_SOLVERS);
      setAnswers(MOCK_ANSWERS);
      setTransactions(MOCK_TRANSACTIONS);
      setConversations(MOCK_CONVERSATIONS);
      setAvailableUsers((prev) => {
        const merged = [...MOCK_USERS];
        prev.forEach((u) => {
          if (!merged.some((m) => m.id === u.id)) merged.push(u);
        });
        return merged;
      });
      addNotification('已開啟【測試環境 (TEST)】', '已載入全站展示問題、精選解答、模擬專家、對話與測試交易數據。', 'system');
    } else {
      // 關閉測試環境 ➔ 必須切換為正式營運模式 (NORM) 或無金流模式 (FREE)
      setNoPaymentMode(false);
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
    setCurrentUser(CLEAN_CORE_USERS[0]);
    addNotification('假資料已清除', '所有模擬假資料已清除，已恢復為純淨初始數據狀態！', 'system');
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
        answers,
        transactions,
        notifications,
        addNotification,
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
        acceptPhaseDelivery,
        releasePhasePayout,
        refundPhasePayout,
        togglePrivacySettings,
        subscribePlan,
        triggerMonthEndRebate,
        updateBankAccount,
        calculateSplitPayout,
        bookmarkedQuestionIds,
        toggleBookmarkQuestion,
        isQuestionBookmarked,
        promoteQuestion,
        incrementQuestionViews,
        autoTagQuestionWithAI,
        autoTagAllMyQuestionsWithAI,
        startDirectChat,
        createGroupConversation,
        sendMessage,
        acceptChatOffer,
        confirmCustomOfferDelivery,
        toggleMediationAgreement,
        submitPhaseDeliverable,
        markNotificationRead,
        markAllNotificationsRead,
        publicMetricsConfig,
        updatePublicMetricsConfig,
        aiCrmConfig,
        updateAiCrmConfig,
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

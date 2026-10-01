import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Category, SubscriptionTier, ProblemLevel, BankAccountInfo, SUBSCRIPTION_PLANS, RECHARGE_PACKAGES, User, UserSurveyData } from '../types';
import { LEVEL_CONFIGS, isMockTransactionId } from '../data/mockData';
import { SubscriptionPlanCard } from './SubscriptionPlanCard';
import { HelpTooltip } from './HelpTooltip';
import { AdminPointsReceivablesTab } from './AdminPointsReceivablesTab';
import { AdminTransactionsTab } from './AdminTransactionsTab';
import { AdminMembershipPlanEditor } from './AdminMembershipPlanEditor';
import { AdminCasesManagementTab } from './AdminCasesManagementTab';
import { AdminQuestionsManagementTab } from './AdminQuestionsManagementTab';
import { AdminUserManagementTab } from './AdminUserManagementTab';
import { AdminCertificationsTab } from './AdminCertificationsTab';
import { AdminAiCrmTab } from './AdminAiCrmTab';
import { AdminMailDisputesTab } from './AdminMailDisputesTab';
import { AdminUserAnalyticsTab } from './AdminUserAnalyticsTab';
import { exportSurveyToExcelXlsx } from '../utils/exportSurveyExcel';
import { ExpertCertificationApplyModal } from './ExpertCertificationApplyModal';
import { RealNameAuthTab } from './RealNameAuthTab';
import { ExpertCertificationTab } from './ExpertCertificationTab';
import { ContractPreviewModal } from './ContractPreviewModal';
import { 
  ContractData, 
  buildContractFromProposalItem, 
  downloadContractFile 
} from '../utils/contractGenerator';
import {
  X,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  MessageSquare,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  ArrowLeft,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  UserCheck,
  TrendingDown,
  Sparkles,
  Award,
  Settings as SettingsIcon,
  User as UserIcon,
  FileText,
  Download,
  ShieldCheck,
  BadgeCheck,
  Star,
  RefreshCw,
  LogOut,
  Users,
  Trophy,
  BarChart3,
  FileSpreadsheet,
  Check,
  Building2,
  CreditCard,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Edit3,
  HelpCircle,
  Search,
  ExternalLink,
  Layers,
  Paperclip,
  CheckCircle,
  Send,
  UploadCloud,
  Calendar,
  Crown,
  LayoutGrid,
  UserPlus,
  UserCog,
  Scale,
  Loader2,
  Tag,
  Home,
  Sliders,
  Percent,
  Save,
  ArrowLeftRight,
  Cloud,
  Database,
  Mail,
  Trash2,
  Camera,
  Upload,
  AlertTriangle,
  FlaskConical,
  Ban,
  ClipboardList,
} from 'lucide-react';
import { CURRENT_TERMS_VERSION } from '../data/termsData';

export type UserDashboardTab =
  | 'points_receivables'
  | 'overview'
  | 'profile'
  | 'real_name_auth'
  | 'expert_certification'
  | 'survey'
  | 'switch_account'
  | 'admin_management'
  | 'admin_transfer_points'
  | 'admin_cases'
  | 'admin_questions'
  | 'admin_user_management'
  | 'admin_user_analytics'
  | 'admin_certifications'
  | 'admin_aicrm'
  | 'admin_mail_disputes'
  | 'questions_management'
  | 'honors_achievements'
  | 'proposals'
  | 'transactions'
  | 'subscriptions'
  | 'settings';

interface UserDashboardModalProps {
  onClose: () => void;
  onOpenQuestion: (questionId: string) => void;
  isFullPage?: boolean;
  initialTab?: UserDashboardTab;
  initialScrollTarget?: string;
  onNavigateToTerms?: () => void;
  onSelectCategory?: (category: any, subcategory: string) => void;
  onOpenAiCrm?: () => void;
}

export const UserDashboardModal: React.FC<UserDashboardModalProps> = ({
  onClose,
  onOpenQuestion,
  isFullPage = false,
  initialTab = 'points_receivables',
  initialScrollTarget,
  onNavigateToTerms,
  onSelectCategory,
  onOpenAiCrm,
}) => {
  const {
    currentUser,
    setCurrentUser,
    availableUsers,
    setAvailableUsers,
    subscriptionPlans,
    updateSubscriptionPlan,
    commissionRate,
    setCommissionRate,
    solvers,
    publicMetricsConfig,
    updatePublicMetricsConfig,
    questions,
    answers,
    transactions,
    conversations,
    bookmarkedQuestionIds,
    toggleBookmarkQuestion,
    togglePrivacySettings,
    switchRole,
    updateSolverPreferences,
    updateBankAccount,
    releasePhasePayout,
    acceptPhaseDelivery,
    submitPhaseDeliverable,
    confirmCustomOfferDelivery,
    acceptAnswer,
    rateSolver,
    startDirectChat,
    setActiveConversationId,
    depositPackage,
    depositBalance,
    hasAgreedTerms,
    recordTermsAgreement,
    openAboutModal,
    setSearchQuery,
    isFirestoreConnected,
    lastSyncTime,
    syncAllToCloud,
    deviceAccounts,
    switchAccount,
    logoutAccount,
    removeDeviceAccount,
    addDeviceAccount,
    isDemoMode,
    setDemoMode,
    toggleDemoMode,
    clearMockData,
    isNoPaymentMode,
    setNoPaymentMode,
    toggleNoPaymentMode,
    isHideTestAccounts,
    setHideTestAccounts,
    toggleHideTestAccounts,
    openAuthModal,
    notifications,
  } = useApp();

  const adminUnreadMailCount = useMemo(() => {
    return (notifications || []).filter((n) => !n.read).length;
  }, [notifications]);

  const adminPendingDisputesCount = useMemo(() => {
    // 待裁定案件數量（依使用者需求：郵件圖示顯示數量僅跟隨待裁定案件數，固定為真實待裁定案件數：1 件）
    const pendingDisputeQuestions = (questions || []).filter((q) => q.disputeStatus === 'pending_review').length;
    return pendingDisputeQuestions > 0 ? pendingDisputeQuestions : 1;
  }, [questions]);

  const [accountToRemove, setAccountToRemove] = useState<User | null>(null);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<'all' | 'core' | 'users' | 'operations' | 'advanced' | 'system'>('all');
  const [pendingModeConfirm, setPendingModeConfirm] = useState<{ type: 'liveOperation' | 'demo' | 'noPayment' | 'hideTestAccounts'; nextState: boolean } | null>(null);
  const [basicSaveSuccessMsg, setBasicSaveSuccessMsg] = useState<string | null>(null);
  const [bankSaveSuccessMsg, setBankSaveSuccessMsg] = useState<string | null>(null);
  const [surveySaveSuccessMsg, setSurveySaveSuccessMsg] = useState<string | null>(null);
  const [surveyValidationMsg, setSurveyValidationMsg] = useState<string | null>(null);
  const [surveyUnansweredErrors, setSurveyUnansweredErrors] = useState<Record<string, boolean>>({});
  const [previewContract, setPreviewContract] = useState<ContractData | null>(null);

  const handleConfirmModeToggle = () => {
    if (!pendingModeConfirm) return;
    if (pendingModeConfirm.type === 'liveOperation') {
      if (pendingModeConfirm.nextState) {
        // 開啟正式營運模式 (NORM) ➔ 自動關閉無金流模式與測試環境，全平台恢復真實數據
        setNoPaymentMode(false);
      } else {
        // 關閉正式營運模式 ➔ 相對地自動開啟【無金流模式】
        setNoPaymentMode(true);
      }
    } else if (pendingModeConfirm.type === 'noPayment') {
      if (pendingModeConfirm.nextState) {
        // 開啟無金流模式 (FREE) ➔ 自動關閉正式營運模式與測試環境，全平台恢復真實數據並隱藏金流
        setNoPaymentMode(true);
      } else {
        // 關閉無金流模式 ➔ 相對地自動開啟【正式營運模式】
        setNoPaymentMode(false);
      }
    } else if (pendingModeConfirm.type === 'demo') {
      if (pendingModeConfirm.nextState) {
        setDemoMode(true);
      } else {
        setNoPaymentMode(false);
      }
    } else if (pendingModeConfirm.type === 'hideTestAccounts') {
      if (pendingModeConfirm.nextState) {
        setHideTestAccounts(true);
      } else {
        setHideTestAccounts(false);
      }
    }
    setPendingModeConfirm(null);
  };

  // Cloud Firestore Sync State
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncReport, setCloudSyncReport] = useState<string | null>(null);

  // Admin Management State
  const [adminSliderRate, setAdminSliderRate] = useState<number>(Math.round((commissionRate || 0.10) * 100));
  const [adminSaveMsg, setAdminSaveMsg] = useState<string | null>(null);
  const [adminEditablePlans, setAdminEditablePlans] = useState(() => {
    return Object.keys(subscriptionPlans).reduce((acc, key) => {
      const tier = key as SubscriptionTier;
      acc[tier] = {
        monthlyPrice: subscriptionPlans[tier]?.monthlyPrice || 0,
        rebatePercent: subscriptionPlans[tier]?.rebatePercent ?? (tier === 'master' ? 12 : tier === 'authority' ? 10 : tier === 'expert' || tier === 'pro' ? 5 : 0),
      };
      return acc;
    }, {} as Record<SubscriptionTier, { monthlyPrice: number; rebatePercent: number }>);
  });

  const handleSaveAdminCommission = () => {
    const newBaseRate = adminSliderRate / 100;
    setCommissionRate(newBaseRate);
    try {
      localStorage.setItem('ideax_mvp_v3_commission', JSON.stringify(newBaseRate));
    } catch (e) {}

    (Object.keys(adminEditablePlans) as SubscriptionTier[]).forEach((tier) => {
      updateSubscriptionPlan(tier, adminEditablePlans[tier].monthlyPrice, adminEditablePlans[tier].rebatePercent, newBaseRate);
    });
    // Ensure free tier is updated as well
    updateSubscriptionPlan('free', 0, 0, newBaseRate);

    setAdminSaveMsg(`平台抽成與各方案設定已成功儲存！基準抽成 ${adminSliderRate}%，已即時同步更新至全站會員管理與方案顯示。`);
    setTimeout(() => setAdminSaveMsg(null), 4000);
  };

  const handleAdminPlanPriceChange = (tier: SubscriptionTier, field: 'monthlyPrice' | 'rebatePercent', val: number) => {
    setAdminEditablePlans((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: val,
      },
    }));
  };

  // Compute platform admin metrics (正式營運模式與無金流模式下，全站總交易額與獲利均純淨歸零 0)
  const adminTotalGMV = isNoPaymentMode || !isDemoMode
    ? 0
    : transactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  const adminTotalPlatformFees = isNoPaymentMode || !isDemoMode
    ? 0
    : transactions.reduce((acc, t) => acc + (t.platformFee || 0), 0);
  const adminSolvedCount = questions.filter((q) => q.status === 'solved').length;
  const adminOpenCount = questions.filter((q) => q.status === 'open').length;
  const adminVerifiedSolversCount = solvers.filter((s) => s.verifiedBadge).length;
  const adminPlanUserCounts: Record<SubscriptionTier, number> = {
    free: availableUsers.filter((u) => !u.subscriptionTier || u.subscriptionTier === 'free').length + (isDemoMode ? 86 : 0),
    pro: availableUsers.filter((u) => u.subscriptionTier === 'pro').length + (isDemoMode ? 24 : 0),
    expert: availableUsers.filter((u) => u.subscriptionTier === 'expert').length + (isDemoMode ? 15 : 0),
    authority: availableUsers.filter((u) => u.subscriptionTier === 'authority').length + (isDemoMode ? 7 : 0),
    master: availableUsers.filter((u) => u.subscriptionTier === 'master').length + (isDemoMode ? 3 : 0),
  };

  // Sub tab for Questions Management
  const [questionSubTab, setQuestionSubTab] = useState<'my_questions' | 'bookmarked_questions' | 'client_questions'>('my_questions');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(!initialTab || initialTab === 'overview');

  const [activeTab, setActiveTab] = useState<UserDashboardTab>(() => {
    if (
      (isNoPaymentMode && ['points_receivables', 'transactions', 'subscriptions', 'admin_transfer_points'].includes(initialTab)) ||
      ((isNoPaymentMode || !isDemoMode) && initialTab === 'admin_mail_disputes')
    ) {
      return 'overview';
    }
    return initialTab || 'overview';
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [isExpertApplyModalOpen, setIsExpertApplyModalOpen] = useState(false);

  React.useEffect(() => {
    if (
      (isNoPaymentMode && ['points_receivables', 'transactions', 'subscriptions', 'admin_transfer_points'].includes(initialTab)) ||
      ((isNoPaymentMode || !isDemoMode) && initialTab === 'admin_mail_disputes')
    ) {
      setActiveTab('overview');
      setMobileMenuOpen(false);
      return;
    }
    if (initialTab === 'survey') {
      setActiveTab('profile');
      setProfileSubTab('survey');
      setMobileMenuOpen(false);
      setTimeout(() => {
        const el = document.getElementById('survey-questions-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } else if (!initialTab || initialTab === 'overview') {
      setActiveTab('overview');
      setMobileMenuOpen(true);
    } else {
      setActiveTab(initialTab);
      setMobileMenuOpen(false);
    }
  }, [initialTab, isNoPaymentMode]);

  // 當從右上角點數餘額點擊進入時，自動導覽並滾動至「點數餘額及記錄」區塊
  React.useEffect(() => {
    if (initialTab === 'points_receivables' || initialScrollTarget) {
      if (initialScrollTarget === 'points-balance-and-records-section' || (currentUser.role !== 'solver' && initialTab === 'points_receivables')) {
        setMobileMenuOpen(false);
      }
      const timer = setTimeout(() => {
        const targetId = initialScrollTarget || (currentUser.role !== 'solver' ? 'points-balance-and-records-section' : null);
        if (targetId) {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialTab, initialScrollTarget, currentUser.role]);

  // 獲得懸賞切換狀態 (本日/本週/本月/歷史)
  const [bountyPeriod, setBountyPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // 應收帳款與累計撥款切換狀態 (週/月/年/歷史)
  const [payoutPeriod, setPayoutPeriod] = useState<'week' | 'month' | 'year' | 'all'>('all');
  const [pointsSubView, setPointsSubView] = useState<'all' | 'receivables' | 'points'>('all');
  const [pointsFilter, setPointsFilter] = useState<'all' | 'deposit' | 'spend' | 'refund'>('all');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // Rating Modal State
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTargetSolver, setRatingTargetSolver] = useState<{ id: string; name: string; title?: string; avatar: string } | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [selectedRatingTags, setSelectedRatingTags] = useState<string[]>(['溝通親切順暢', '專業解題深入']);

  // Proposal Management state
  const [proposalFilter, setProposalFilter] = useState<'all' | 'uncompleted' | 'completed' | 'pending_reply' | 'in_progress'>(
    currentUser.role === 'solver' ? 'pending_reply' : 'uncompleted'
  );
  const [proposalSearch, setProposalSearch] = useState('');
  const [submittingDeliverablePhase, setSubmittingDeliverablePhase] = useState<{
    questionId: string;
    answerId: string;
    phaseIndex: number;
    phaseTitle: string;
  } | null>(null);
  const [deliverableText, setDeliverableText] = useState('');
  const [deliverableAttachmentName, setDeliverableAttachmentName] = useState('');

  // Profile edit local state
  const [name, setName] = useState(currentUser.name);
  const [title, setTitle] = useState(currentUser.title);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Basic Personal Profile & SubTab State
  const [profileSubTab, setProfileSubTab] = useState<'basic' | 'survey'>('basic');
  const [userGender, setUserGender] = useState<string>(
    currentUser.surveyData?.completedAt ? (currentUser.gender || '') : ''
  );
  const [userAgeGroup, setUserAgeGroup] = useState<string>(
    currentUser.surveyData?.completedAt ? (currentUser.ageGroup || '') : ''
  );
  const [userIndustry, setUserIndustry] = useState(currentUser.industry || '');
  const [userAnnualSalary, setUserAnnualSalary] = useState<string>(
    currentUser.surveyData?.completedAt ? (currentUser.annualSalary || '') : ''
  );
  const [userCompany, setUserCompany] = useState(currentUser.company || '');
  const [userPhone, setUserPhone] = useState(currentUser.phone || '');
  const [userEmail, setUserEmail] = useState(currentUser.email || '');

  // Bank Account State (解答者與撥退款專用帳戶)
  const [bankCode, setBankCode] = useState(currentUser.bankAccount?.bankCode || '822');
  const [bankName, setBankName] = useState(currentUser.bankAccount?.bankName || '822 中國信託商業銀行');
  const [branchName, setBranchName] = useState(currentUser.bankAccount?.branchName || '敦南分行');
  const [accountNumber, setAccountNumber] = useState(currentUser.bankAccount?.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(currentUser.bankAccount?.accountHolder || currentUser.name);

  // Survey Data State
  const [surveyDesiredServices, setSurveyDesiredServices] = useState<string[]>(
    currentUser.surveyData?.desiredServices || []
  );
  const [surveyDesiredServicesCustom, setSurveyDesiredServicesCustom] = useState(currentUser.surveyData?.desiredServicesCustom || '');
  const [surveyRelatedDomains, setSurveyRelatedDomains] = useState<string[]>(
    currentUser.surveyData?.relatedDomains || [currentUser.domain || '創新創業']
  );
  const [surveyRelatedDomainsCustom, setSurveyRelatedDomainsCustom] = useState(currentUser.surveyData?.relatedDomainsCustom || '');
  const [surveyWillingQuestionBudget, setSurveyWillingQuestionBudget] = useState(currentUser.surveyData?.willingQuestionBudget || '');
  const [surveyWillingToProvideSolutions, setSurveyWillingToProvideSolutions] = useState(currentUser.surveyData?.willingToProvideSolutions || 'very_willing');
  const [surveyUsageFrequency, setSurveyUsageFrequency] = useState(currentUser.surveyData?.usageFrequency || '');
  const [surveyWillingToBeSideHustle, setSurveyWillingToBeSideHustle] = useState(currentUser.surveyData?.willingToBeSideHustle || '');
  const [surveyWillingToSubscribeSolverPlan, setSurveyWillingToSubscribeSolverPlan] = useState(currentUser.surveyData?.willingToSubscribeSolverPlan || '');
  const [surveyFeedback, setSurveyFeedback] = useState(currentUser.surveyData?.feedbackSuggestions || '');

  // 當切換登入帳號或 currentUser 變更時，即時且同步更新表單各欄位為該當前用戶的資料
  React.useEffect(() => {
    const hasCompletedSurvey = !!currentUser.surveyData?.completedAt;
    setName(currentUser.name || '');
    setTitle(hasCompletedSurvey ? (currentUser.title || '') : '');
    setBio(currentUser.bio || '');
    setAvatar(currentUser.avatar || '');
    setUserGender(hasCompletedSurvey ? (currentUser.gender || '') : '');
    setUserAgeGroup(hasCompletedSurvey ? (currentUser.ageGroup || '') : '');
    setUserIndustry(currentUser.industry || '');
    setUserAnnualSalary(hasCompletedSurvey ? (currentUser.annualSalary || '') : '');
    setUserCompany(currentUser.company || '');
    setUserPhone(currentUser.phone || '');
    setUserEmail(currentUser.email || '');
    setBankCode(currentUser.bankAccount?.bankCode || '822');
    setBankName(currentUser.bankAccount?.bankName || '822 中國信託商業銀行');
    setBranchName(currentUser.bankAccount?.branchName || '敦南分行');
    setAccountNumber(currentUser.bankAccount?.accountNumber || '');
    setAccountHolder(currentUser.bankAccount?.accountHolder || currentUser.name || '');
    setSurveyDesiredServices(currentUser.surveyData?.desiredServices || []);
    setSurveyDesiredServicesCustom(currentUser.surveyData?.desiredServicesCustom || '');
    setSurveyRelatedDomains(currentUser.surveyData?.relatedDomains || [currentUser.domain || '創新創業']);
    setSurveyRelatedDomainsCustom(currentUser.surveyData?.relatedDomainsCustom || '');
    setSurveyWillingQuestionBudget(currentUser.surveyData?.willingQuestionBudget || '');
    setSurveyWillingToProvideSolutions(currentUser.surveyData?.willingToProvideSolutions || 'very_willing');
    setSurveyUsageFrequency(currentUser.surveyData?.usageFrequency || '');
    setSurveyWillingToBeSideHustle(currentUser.surveyData?.willingToBeSideHustle || '');
    setSurveyWillingToSubscribeSolverPlan(currentUser.surveyData?.willingToSubscribeSolverPlan || '');
    setSurveyFeedback(currentUser.surveyData?.feedbackSuggestions || '');
    setDomain((hasCompletedSurvey ? (currentUser.domain || '') : '') as any);
    setSkillsInput((currentUser.skills || ['創新創業', '商業模式']).map((s) => (s.startsWith('#') ? s : `#${s}`)).join(' '));
    setShowSubmittedCount(currentUser.showSubmittedCount ?? false);
    setShowAcceptanceRate(currentUser.showAcceptanceRate ?? false);
    setShowAvgSolutionBounty(currentUser.showAvgSolutionBounty ?? false);
    setShowQuestionerTitle(currentUser.showQuestionerTitle ?? false);
    setShowQuestionerBio(currentUser.showQuestionerBio ?? false);
    setShowRecentSolutions(currentUser.showRecentSolutions ?? true);
  }, [currentUser.id]);

  // 處理用戶頭像上傳：限制 2MB 內，Canvas 壓縮為正方形 (一次只存一張)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 檢查檔案大小：嚴格限制 2MB
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(`頭像照片檔案過大（${(file.size / (1024 * 1024)).toFixed(1)}MB）。系統限制 2MB 內，請選擇較小圖片或壓縮後再上傳！`);
      e.target.value = '';
      return;
    }

    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 320;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setAvatar(compressedDataUrl);
            setCurrentUser((prev) => ({
              ...prev,
              avatar: compressedDataUrl,
            }));
            setMsg('儲存成功');
            setTimeout(() => setMsg(null), 2500);
          }
        } catch {
          const rawUrl = event.target?.result as string;
          setAvatar(rawUrl);
          setCurrentUser((prev) => ({
            ...prev,
            avatar: rawUrl,
          }));
          setMsg('儲存成功');
          setTimeout(() => setMsg(null), 2500);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const [domain, setDomain] = useState<Category>(currentUser.domain || '創新創業');
  const [skillsInput, setSkillsInput] = useState(
    (currentUser.skills || ['創新創業', '商業模式']).map((s) => (s.startsWith('#') ? s : `#${s}`)).join(' ')
  );
  const [isEditingBank, setIsEditingBank] = useState(false);

  // New Account Registration local state
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newRegName, setNewRegName] = useState('');
  const [newRegRole, setNewRegRole] = useState<'questioner' | 'solver'>('questioner');
  const [newRegTitle, setNewRegTitle] = useState('');
  const [newRegDomain, setNewRegDomain] = useState<Category>('創新創業');
  const [pendingSwitchUser, setPendingSwitchUser] = useState<User | null>(null);

  // Solver privacy switches
  const [showSubmittedCount, setShowSubmittedCount] = useState(currentUser.showSubmittedCount ?? false);
  const [showAcceptanceRate, setShowAcceptanceRate] = useState(currentUser.showAcceptanceRate ?? false);
  const [showAvgSolutionBounty, setShowAvgSolutionBounty] = useState(currentUser.showAvgSolutionBounty ?? false);

  // Questioner privacy switches
  const [showQuestionerTitle, setShowQuestionerTitle] = useState(currentUser.showQuestionerTitle ?? false);
  const [showQuestionerBio, setShowQuestionerBio] = useState(currentUser.showQuestionerBio ?? false);

  // Featured Case and Core Skills (精選案例經驗 & 核心領域與精通技能)
  const [featuredCaseTitle, setFeaturedCaseTitle] = useState(currentUser.featuredCase?.title || '校園商圈特約加盟條款+分潤模型 Excel 試算包');
  const [featuredCaseDescription, setFeaturedCaseDescription] = useState(currentUser.featuredCase?.description || '成功為12家校園新創餐飲品牌提供精準的股權分配、加盟合約範本以及多階段利潤分潤模型，實質降低加盟糾紛。');
  const [featuredCaseFiles, setFeaturedCaseFiles] = useState<Array<{ name: string; size?: string; url?: string }>>(
    currentUser.featuredCase?.files || [
      { name: '校園特約加盟協議與分潤試算模型.xlsx', size: '2.4 MB' },
      { name: 'B2B商圈拓展實務落地指南.pdf', size: '1.8 MB' }
    ]
  );
  const [featuredCaseImages, setFeaturedCaseImages] = useState<Array<{ url: string; caption?: string }>>(
    currentUser.featuredCase?.images || [
      { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80', caption: '商圈流量與營收實務指標分析' },
      { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80', caption: '分潤模型試算介面' }
    ]
  );
  const [newFileName, setNewFileName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [showRecentSolutions, setShowRecentSolutions] = useState(currentUser.showRecentSolutions ?? true);

  const handleRegisterNewUser = () => {
    if (!newRegName.trim()) {
      setMsg('請輸入使用者姓名');
      setTimeout(() => setMsg(null), 2500);
      return;
    }
    const newId = `user-reg-${Date.now()}`;
    const newUser: any = {
      id: newId,
      name: newRegName.trim(),
      role: newRegRole,
      avatar: newRegRole === 'solver'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      title: newRegTitle.trim() || (newRegRole === 'solver' ? '認證解題顧問' : '創新專案發起人'),
      balance: 1000,
      domain: newRegDomain,
      bio: `${newRegName.trim()} 的全新註冊個人帳號。`,
      skills: ['創新創業', '商業模式', '問題解題'],
      subscriptionTier: 'free',
      reputationPoints: 100,
      acceptanceRate: '100',
      totalPaidOut: 0,
      verifiedExpert: newRegRole === 'solver',
      showQuestionerTitle: true,
      showQuestionerBio: true,
    };
    setAvailableUsers((prev: any) => [...prev, newUser]);
    setCurrentUser(newUser);
    setNewRegName('');
    setNewRegTitle('');
    setShowAddUserForm(false);
    setMsg(`🎉 註冊成功！已自動登入為「${newUser.name}」，獲得 1,000 點體驗金！`);
    setTimeout(() => setMsg(null), 3500);
  };

  const currentTier: SubscriptionTier = currentUser.subscriptionTier || 'free';
  const currentPlan = subscriptionPlans[currentTier] || SUBSCRIPTION_PLANS.free;

  // 計算累積第三方撥款入帳金額
  const totalPaidOutAmount = currentUser.totalPaidOut || 0;

  // Compute stats
  const userQuestions = questions.filter((q) => q.authorId === currentUser.id);
  const userAnswers = answers.filter((a) => a.solverId === currentUser.id);
  const userSolutionAnswers = userAnswers.filter((a) => a.type === 'solution');
  const userAcceptedAnswers = userAnswers.filter((a) => a.isAccepted);

  // 解答者三欄位依金流架構規範計算（僅為計分參考顯示）
  const earnedBountyPoints = userAcceptedAnswers.reduce((sum, a) => {
    const q = questions.find((item) => item.id === a.questionId);
    return sum + (q?.bounty || 0);
  }, 0);

  // 問題管理三大分類資料聚合
  const myQuestions = userQuestions;
  const bookmarkedQuestions = questions.filter((q) => bookmarkedQuestionIds.includes(q.id));
  const clientQuestions = questions.filter((q) => {
    if (q.authorId === currentUser.id) return false;
    const hasMyAnswer = answers.some((a) => a.questionId === q.id && a.solverId === currentUser.id);
    const isInvited = q.invitedSolverIds?.includes(currentUser.id);
    const hasChat = conversations.some((c) => c.questionId === q.id && c.participantId === currentUser.id);
    return hasMyAnswer || isInvited || hasChat;
  });

  // -------------------------------------------------------------
  // 方案管理核心資料聚合（涵蓋多階段交付方案、懸賞方案與私聊自訂方案）
  // -------------------------------------------------------------
  interface ManagedProposalItem {
    id: string;
    type: 'phase' | 'solution' | 'chat_offer';
    typeLabel: string;
    title: string;
    description: string;
    questionId?: string;
    questionTitle?: string;
    role: 'buyer' | 'seller'; // currentUser 身份：委託買方 / 解答專家
    partnerId: string;
    partnerName: string;
    partnerAvatar: string;
    partnerTitle?: string;
    amount: number;
    isCompleted: boolean;
    status: 'in_progress' | 'submitted_review' | 'completed' | 'pending_start';
    statusLabel: string;
    statusBadgeClass: string;
    createdAt?: string;
    // Specific keys for phase operations
    phaseIndex?: number;
    phaseNumber?: number;
    totalPhases?: number;
    answerId?: string;
    submittedContent?: string;
    submittedAttachments?: import('../types').SolutionAttachment[];
    meetingDetails?: import('../types').SolutionMeetingDetails;
    // Specific keys for chat offer operations
    conversationId?: string;
    messageId?: string;
    deliverables?: string[];
  }

  const allProposals: ManagedProposalItem[] = [];

  // 1. 多階段交付方案 (Phases)
  answers.forEach((ans) => {
    if (ans.phases && ans.phases.length > 0) {
      const q = questions.find((item) => item.id === ans.questionId);
      const isBuyer = q?.authorId === currentUser.id;
      const isSeller = ans.solverId === currentUser.id;

      if (isBuyer || isSeller) {
        ans.phases.forEach((phase, idx) => {
          const isAccepted = phase.status === 'accepted';
          const isSubmitted = phase.status === 'submitted';
          const isInProgress = phase.status === 'in_progress';
          const isPending = phase.status === 'pending_acceptance';

          let statusKey: ManagedProposalItem['status'] = 'in_progress';
          let statusText = '進行中・交付中';
          let badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';

          if (isAccepted) {
            statusKey = 'completed';
            statusText = '已完成交付・已撥款';
            badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
          } else if (isSubmitted) {
            statusKey = 'submitted_review';
            statusText = '專家已提交・待驗收';
            badgeColor = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
          } else if (isPending) {
            statusKey = 'pending_start';
            statusText = '待確認啟動';
            badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
          }

          allProposals.push({
            id: `phase-${ans.id}-${idx}`,
            type: 'phase',
            typeLabel: `多階段交付 (第 ${phase.phaseNumber || idx + 1}/${ans.phases!.length} 階段)`,
            title: phase.title,
            description: phase.description,
            questionId: q?.id,
            questionTitle: q?.title || '關聯問題',
            role: isBuyer ? 'buyer' : 'seller',
            partnerId: isBuyer ? ans.solverId : (q?.authorId || 'author'),
            partnerName: isBuyer ? ans.solverName : (q?.authorName || '委託發問者'),
            partnerAvatar: isBuyer
              ? ans.solverAvatar
              : (q?.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
            partnerTitle: isBuyer ? ans.solverTitle : undefined,
            amount: phase.points,
            isCompleted: isAccepted,
            status: statusKey,
            statusLabel: statusText,
            statusBadgeClass: badgeColor,
            phaseIndex: idx,
            phaseNumber: phase.phaseNumber || idx + 1,
            totalPhases: ans.phases!.length,
            answerId: ans.id,
            submittedContent: phase.submittedContent,
            submittedAttachments: phase.submittedAttachments,
          });
        });
      }
    }
  });

  // 2. 一般專業懸賞方案 (Direct Solutions)
  answers.forEach((ans) => {
    if (ans.type === 'solution' && (!ans.phases || ans.phases.length === 0)) {
      const q = questions.find((item) => item.id === ans.questionId);
      const isBuyer = q?.authorId === currentUser.id;
      const isSeller = ans.solverId === currentUser.id;

      if (isBuyer || isSeller) {
        const isAccepted = !!ans.isAccepted;
        allProposals.push({
          id: `sol-${ans.id}`,
          type: 'solution',
          typeLabel: '專業懸賞方案',
          title: `【${ans.deliveryType || '專家解決方案'}】${q?.title || '問題方案'}`,
          description: ans.freePreview || (ans.fullContent ? ans.fullContent.slice(0, 100) + '...' : '完整客製方案成果'),
          questionId: q?.id,
          questionTitle: q?.title,
          role: isBuyer ? 'buyer' : 'seller',
          partnerId: isBuyer ? ans.solverId : (q?.authorId || 'author'),
          partnerName: isBuyer ? ans.solverName : (q?.authorName || '委託發問者'),
          partnerAvatar: isBuyer ? ans.solverAvatar : (q?.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
          partnerTitle: isBuyer ? ans.solverTitle : undefined,
          amount: ans.price || q?.bounty || 1000,
          isCompleted: isAccepted,
          status: isAccepted ? 'completed' : 'submitted_review',
          statusLabel: isAccepted ? '已採納交付・款項已撥付' : '方案已提交・待提問者驗收',
          statusBadgeClass: isAccepted ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200',
          answerId: ans.id,
          submittedContent: ans.fullContent,
          submittedAttachments: ans.attachments,
          meetingDetails: ans.meetingDetails,
        });
      }
    }
  });

  // 3. 私聊自訂專屬方案 (Chat Custom Offers)
  conversations.forEach((conv) => {
    conv.messages.forEach((m) => {
      if (m.offer) {
        const offer = m.offer;
        const isSeller = offer.creatorId === currentUser.id;
        const isBuyer = offer.buyerId === currentUser.id || (!isSeller && offer.status !== 'pending');

        if (isBuyer || isSeller) {
          const other = conv.participantDetails.find((p) => p.id !== currentUser.id);
          const isCompleted = offer.status === 'completed';
          const isInProgress = offer.status === 'accepted';
          const isPending = offer.status === 'pending';

          allProposals.push({
            id: `offer-${m.id}`,
            type: 'chat_offer',
            typeLabel: '私聊自訂專屬方案',
            title: offer.title,
            description: offer.description,
            questionId: conv.relatedQuestionId,
            questionTitle: conv.relatedQuestionTitle || '私聊專屬諮詢',
            role: isBuyer ? 'buyer' : 'seller',
            partnerId: isBuyer ? offer.creatorId : (offer.buyerId || other?.id || 'client'),
            partnerName: isBuyer ? offer.creatorName : (other?.name || '委託買方'),
            partnerAvatar: other?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
            partnerTitle: other?.title,
            amount: offer.price,
            isCompleted: isCompleted,
            status: isCompleted ? 'completed' : isInProgress ? 'in_progress' : 'pending_start',
            statusLabel: isCompleted ? '已完成交付結案' : isInProgress ? '託管中・進行中交付' : '待買方簽約付款',
            statusBadgeClass: isCompleted
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isInProgress
              ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
              : 'bg-stone-100 text-stone-700 border-stone-200',
            conversationId: conv.id,
            messageId: m.id,
            deliverables: offer.deliverables,
            submittedContent: offer.paywalledContent,
          });
        }
      }
    });
  });

  // Filter proposals based on role requirements
  const isSolverRole = currentUser.role === 'solver';

  // 解答者方統計 (待回覆 / 進行中 / 已完成)
  const solverPendingReplyCount = allProposals.filter(
    (p) => p.role === 'seller' && !p.isCompleted && (p.status === 'submitted_review' || p.status === 'pending_start')
  ).length;
  const solverInProgressCount = allProposals.filter(
    (p) => p.role === 'seller' && !p.isCompleted && p.status === 'in_progress'
  ).length;
  const solverCompletedCount = allProposals.filter(
    (p) => p.role === 'seller' && p.isCompleted
  ).length;

  // 提問者方統計 (未完成 / 已結案)
  const questionerUncompletedCount = allProposals.filter(
    (p) => p.role === 'buyer' && !p.isCompleted
  ).length;
  const questionerCompletedCount = allProposals.filter(
    (p) => p.role === 'buyer' && p.isCompleted
  ).length;

  const filteredProposals = allProposals.filter((item) => {
    if (isSolverRole) {
      if (item.role !== 'seller') return false;
      if (proposalFilter === 'pending_reply') {
        // 待回覆：有提出方案但是尚未被採納或接收的方案
        if (item.isCompleted || (item.status !== 'submitted_review' && item.status !== 'pending_start')) return false;
      } else if (proposalFilter === 'in_progress') {
        // 進行中：已被採納但尚未完成交付或已交付但尚未確認結案的方案
        if (item.isCompleted || item.status !== 'in_progress') return false;
      } else if (proposalFilter === 'completed') {
        // 已完成：已經完成交易的案件
        if (!item.isCompleted) return false;
      }
    } else {
      if (item.role !== 'buyer') return false;
      if (proposalFilter === 'uncompleted') {
        // 未完成：雙方已同意的方案但尚未完成交付或雙方尚未確認結案
        if (item.isCompleted) return false;
      } else if (proposalFilter === 'completed') {
        // 已結案：完成交付並經雙方確認
        if (!item.isCompleted) return false;
      }
    }

    if (proposalSearch.trim()) {
      const q = proposalSearch.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchPartner = item.partnerName.toLowerCase().includes(q);
      const matchQTitle = (item.questionTitle || '').toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      return matchTitle || matchPartner || matchQTitle || matchDesc;
    }
    return true;
  });

  const uncompletedCount = isSolverRole ? solverInProgressCount + solverPendingReplyCount : questionerUncompletedCount;
  const completedCount = isSolverRole ? solverCompletedCount : questionerCompletedCount;
  const totalVolume = allProposals
    .filter((p) => (isSolverRole ? p.role === 'seller' : p.role === 'buyer'))
    .reduce((sum, p) => sum + p.amount, 0);

  // Actions for confirming delivery
  const handleConfirmDelivery = (item: ManagedProposalItem) => {
    if (item.type === 'phase' && item.questionId && item.answerId && item.phaseIndex !== undefined) {
      releasePhasePayout(item.questionId, item.answerId, item.phaseIndex);
      setMsg(`🎉 階段方案「${item.title}」已確認完成交付！第三方託管款項 NT$ ${item.amount.toLocaleString()} 已自動拆款撥付至專家帳戶。`);
      setTimeout(() => setMsg(null), 4000);
    } else if (item.type === 'chat_offer' && item.conversationId && item.messageId) {
      confirmCustomOfferDelivery(item.conversationId, item.messageId);
      setMsg(`🎉 私聊方案「${item.title}」已確認完成交付驗收！`);
      setTimeout(() => setMsg(null), 4000);
    } else if (item.type === 'solution' && item.answerId) {
      acceptAnswer(item.answerId);
      setMsg(`🎉 方案「${item.title}」已確認採納並完成交付！懸賞金 NT$ ${item.amount.toLocaleString()} 已撥付。`);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  // Solver submit deliverable
  const handleSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingDeliverablePhase) return;
    const { questionId, answerId, phaseIndex, phaseTitle } = submittingDeliverablePhase;

    const attachments: import('../types').SolutionAttachment[] = deliverableAttachmentName.trim()
      ? [
          {
            name: deliverableAttachmentName.trim(),
            size: '2.4 MB',
            type: 'application/pdf',
          },
        ]
      : [];

    submitPhaseDeliverable(
      questionId,
      answerId,
      phaseIndex,
      deliverableText.trim() || '專家已完成本階段交付成果，請提問者確認驗收。',
      attachments
    );

    setSubmittingDeliverablePhase(null);
    setDeliverableText('');
    setDeliverableAttachmentName('');
    setMsg(`✅「${phaseTitle}」交付成果已成功提交！系統已通知委託方進行驗收。`);
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    updateBankAccount({
      bankName,
      bankCode,
      accountNumber,
      accountHolder,
      isVerified: true,
    });
    setIsEditingBank(false);
    setMsg('收款銀行帳戶已成功更新！所有第三方拆款將自動直撥匯入此帳戶。');
    setTimeout(() => setMsg(null), 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSkills = skillsInput
      .split(/[#,\s]+/)
      .map((s) => s.trim().replace(/^#/, ''))
      .filter(Boolean);

    const newAvatar = avatar || currentUser.avatar;
    const updatedSurveyData: UserSurveyData = {
      ...currentUser.surveyData,
      desiredServices: surveyDesiredServices,
      desiredServicesCustom: surveyDesiredServicesCustom.trim() || undefined,
      relatedDomains: surveyRelatedDomains,
      relatedDomainsCustom: surveyRelatedDomainsCustom.trim() || undefined,
      willingQuestionBudget: surveyWillingQuestionBudget,
      willingToProvideSolutions: surveyWillingToProvideSolutions,
      usageFrequency: surveyUsageFrequency,
      willingToBeSideHustle: surveyWillingToBeSideHustle,
      willingToSubscribeSolverPlan: surveyWillingToSubscribeSolverPlan,
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser((prev) => ({
      ...prev,
      name,
      avatar: newAvatar,
      title,
      bio,
      domain: (domain || prev.domain) as any,
      gender: (userGender || prev.gender) as any,
      ageGroup: (userAgeGroup || prev.ageGroup) as any,
      industry: userIndustry,
      jobTitle: title,
      annualSalary: (userAnnualSalary || prev.annualSalary) as any,
      company: userCompany.trim() || undefined,
      phone: userPhone.trim(),
      email: userEmail.trim(),
      bankAccount: {
        bankCode,
        bankName,
        branchName: branchName.trim() || undefined,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        isVerified: Boolean(accountNumber.trim()),
      },
      surveyData: updatedSurveyData,
      skills: parsedSkills.slice(0, 10), // Limit skills/categories to 10
      showSubmittedCount,
      showAcceptanceRate,
      showAvgSolutionBounty,
      showQuestionerTitle,
      showQuestionerBio,
      featuredCase: {
        title: featuredCaseTitle,
        description: featuredCaseDescription,
        outcome: prev.featuredCase?.outcome || '順利降低合作溝通摩擦並達成高效交付',
        files: featuredCaseFiles,
        images: featuredCaseImages,
      },
      showRecentSolutions,
    }));

    setAvailableUsers((users) =>
      users.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              name,
              avatar: newAvatar,
              title,
              bio,
              domain: (domain || u.domain) as any,
              gender: (userGender || u.gender) as any,
              ageGroup: (userAgeGroup || u.ageGroup) as any,
              industry: userIndustry,
              jobTitle: title,
              company: userCompany.trim() || undefined,
              phone: userPhone.trim(),
              email: userEmail.trim(),
              surveyData: updatedSurveyData,
              skills: parsedSkills.slice(0, 10),
            }
          : u
      )
    );

    setMsg('儲存成功');
    setTimeout(() => setMsg(null), 2500);
  };

  // 1. 個別儲存個人基本資料
  const handleSaveBasicProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSkills = skillsInput
      .split(/[#,\s]+/)
      .map((s) => s.trim().replace(/^#/, ''))
      .filter(Boolean);

    const newAvatar = avatar || currentUser.avatar;

    setCurrentUser((prev) => ({
      ...prev,
      name,
      avatar: newAvatar,
      title,
      bio,
      domain: (domain || prev.domain) as any,
      gender: (userGender || prev.gender) as any,
      ageGroup: (userAgeGroup || prev.ageGroup) as any,
      industry: userIndustry,
      jobTitle: title,
      annualSalary: (userAnnualSalary || prev.annualSalary) as any,
      company: userCompany.trim() || undefined,
      phone: userPhone.trim(),
      email: userEmail.trim(),
      skills: parsedSkills.slice(0, 10),
      showSubmittedCount,
      showAcceptanceRate,
      showAvgSolutionBounty,
      showQuestionerTitle,
      showQuestionerBio,
      featuredCase: {
        title: featuredCaseTitle,
        description: featuredCaseDescription,
        outcome: prev.featuredCase?.outcome || '順利降低合作溝通摩擦並達成高效交付',
        files: featuredCaseFiles,
        images: featuredCaseImages,
      },
      showRecentSolutions,
    }));

    setAvailableUsers((users) =>
      users.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              name,
              avatar: newAvatar,
              title,
              bio,
              domain: (domain || u.domain) as any,
              gender: (userGender || u.gender) as any,
              ageGroup: (userAgeGroup || u.ageGroup) as any,
              industry: userIndustry,
              jobTitle: title,
              company: userCompany.trim() || undefined,
              phone: userPhone.trim(),
              email: userEmail.trim(),
              skills: parsedSkills.slice(0, 10),
            }
          : u
      )
    );

    setBasicSaveSuccessMsg('個人基本資料已成功儲存！');
    setTimeout(() => setBasicSaveSuccessMsg(null), 3000);
  };

  // 2. 個別儲存收退款銀行帳戶
  const handleSaveBankSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!accountNumber.trim()) {
      setMsg('請輸入銀行存款帳戶號碼');
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    const updatedBankAccount = {
      bankCode,
      bankName,
      branchName: branchName.trim() || undefined,
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim() || name,
      isVerified: Boolean(accountNumber.trim()),
    };

    setCurrentUser((prev) => ({
      ...prev,
      bankAccount: updatedBankAccount,
    }));

    setAvailableUsers((users) =>
      users.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              bankAccount: updatedBankAccount,
            }
          : u
      )
    );

    setBankSaveSuccessMsg('收退款銀行帳戶設定已成功獨立儲存！');
    setTimeout(() => setBankSaveSuccessMsg(null), 3500);
  };

  // 1.~5. 一鍵套用帳號基本資料至問卷 1~5 題
  const handleApplyProfileDataToSurvey = () => {
    if (currentUser.gender) setUserGender(currentUser.gender as any);
    if (currentUser.ageGroup) setUserAgeGroup(currentUser.ageGroup as any);
    if (currentUser.domain) setDomain(currentUser.domain as any);
    if (currentUser.title || currentUser.jobTitle) setTitle(currentUser.title || currentUser.jobTitle || '');
    if (currentUser.annualSalary) setUserAnnualSalary(currentUser.annualSalary as any);
    if (currentUser.industry) setUserIndustry(currentUser.industry);

    setSurveyUnansweredErrors((prev) => ({
      ...prev,
      q1: false,
      q2: false,
      q3: false,
      q4: false,
      q5: false,
    }));

    setSurveySaveSuccessMsg('已成功套用帳號基本資料至第 1~5 題！');
    setSurveyValidationMsg(null);
    setTimeout(() => setSurveySaveSuccessMsg(null), 3000);
  };

  // 2.5 獨立送出服務調研問卷並發放會員體驗 (1~6.5 為必填)
  const handleSaveSurvey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSurveyValidationMsg(null);

    const errors: Record<string, boolean> = {};

    // 必填驗證 (1 ~ 6.5，值為空或選擇預設「-------」即視為未作答)
    if (!userGender || userGender === '') errors['q1'] = true;
    if (!userAgeGroup || userAgeGroup === '') errors['q2'] = true;
    if (!domain || (domain as string) === '') errors['q3'] = true;
    if (!title || !title.trim()) errors['q4'] = true;
    if (!userAnnualSalary || userAnnualSalary === '') errors['q5'] = true;

    if (!surveyDesiredServices || surveyDesiredServices.length === 0) errors['q6_1'] = true;
    if (!surveyWillingQuestionBudget || surveyWillingQuestionBudget === '') errors['q6_2'] = true;
    if (!surveyUsageFrequency || surveyUsageFrequency === '') errors['q6_3'] = true;
    if (!surveyWillingToBeSideHustle || surveyWillingToBeSideHustle === '') errors['q6_4'] = true;
    if (!surveyWillingToSubscribeSolverPlan || surveyWillingToSubscribeSolverPlan === '') errors['q6_5'] = true;

    setSurveyUnansweredErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSurveyValidationMsg('部分必填項目尚未作答，請完成題號旁有紅色 (請回答此題) 標註的項目！');
      return;
    }

    const updatedSurveyData: UserSurveyData = {
      ...currentUser.surveyData,
      desiredServices: surveyDesiredServices,
      desiredServicesCustom: surveyDesiredServicesCustom.trim() || undefined,
      relatedDomains: surveyRelatedDomains,
      relatedDomainsCustom: surveyRelatedDomainsCustom.trim() || undefined,
      willingQuestionBudget: surveyWillingQuestionBudget,
      willingToProvideSolutions: surveyWillingToProvideSolutions,
      usageFrequency: surveyUsageFrequency,
      willingToBeSideHustle: surveyWillingToBeSideHustle,
      willingToSubscribeSolverPlan: surveyWillingToSubscribeSolverPlan,
      feedbackSuggestions: surveyFeedback.trim() || undefined,
      completedAt: currentUser.surveyData?.completedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 依填寫順序計算（以前 500 名劃分）
    const completedCount = availableUsers.filter(
      (u) => u.surveyData?.completedAt && u.id !== currentUser.id
    ).length;

    // 前 500 名贈送一週權威方案，其餘贈送一週達人方案
    const isTop500 = completedCount < 500;
    const awardedTier: SubscriptionTier = isTop500 ? 'authority' : 'expert';
    const awardedTierName = SUBSCRIPTION_PLANS[awardedTier]?.name || (isTop500 ? '權威方案' : '達人方案');

    // 會員資格權重 (不高於現有資格就不變更)
    const TIER_RANK: Record<string, number> = {
      free: 0,
      pro: 1,
      expert: 1,
      authority: 2,
      master: 3,
    };

    const currentTier = currentUser.subscriptionTier || 'free';
    const currentRank = TIER_RANK[currentTier] ?? 0;
    const awardedRank = TIER_RANK[awardedTier] ?? 0;

    const expiryStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    let newTier = currentTier;
    let newExpiry = currentUser.subscriptionExpiresAt;
    let successMsg = '';

    if (awardedRank > currentRank) {
      newTier = awardedTier;
      newExpiry = expiryStr;
      successMsg = `問卷已成功送出！您為第 ${completedCount + 1} 位填寫者，已自動晉升為「${awardedTierName}（1週體驗）」！`;
    } else {
      const currentTierName = SUBSCRIPTION_PLANS[currentTier]?.name || currentTier;
      successMsg = `問卷已成功送出！您的現有會員資格（${currentTierName}）高於或等於贈送資格，已保留原高階權益！`;
    }

    setCurrentUser((prev) => ({
      ...prev,
      gender: userGender ? (userGender as any) : prev.gender,
      ageGroup: userAgeGroup ? (userAgeGroup as any) : prev.ageGroup,
      domain: domain ? (domain as any) : prev.domain,
      industry: userIndustry || prev.industry,
      jobTitle: title || prev.jobTitle,
      annualSalary: userAnnualSalary ? (userAnnualSalary as any) : prev.annualSalary,
      surveyData: updatedSurveyData,
      subscriptionTier: newTier,
      subscriptionExpiresAt: newExpiry,
    }));

    setAvailableUsers((users) =>
      users.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              gender: userGender ? (userGender as any) : u.gender,
              ageGroup: userAgeGroup ? (userAgeGroup as any) : u.ageGroup,
              domain: domain ? (domain as any) : u.domain,
              industry: userIndustry || u.industry,
              jobTitle: title || u.jobTitle,
              annualSalary: userAnnualSalary ? (userAnnualSalary as any) : u.annualSalary,
              surveyData: updatedSurveyData,
              subscriptionTier: newTier,
              subscriptionExpiresAt: newExpiry,
            }
          : u
      )
    );

    setSurveySaveSuccessMsg(successMsg);
    setTimeout(() => setSurveySaveSuccessMsg(null), 5000);
  };

  // 3. 管理員專屬帳號設定儲存
  const handleSaveAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newAvatar = avatar || currentUser.avatar;
    setCurrentUser((prev) => ({
      ...prev,
      name,
      avatar: newAvatar,
      title: title || '平台管理員',
      phone: userPhone.trim(),
      email: userEmail.trim(),
    }));

    setAvailableUsers((users) =>
      users.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              name,
              avatar: newAvatar,
              title: title || '平台管理員',
              phone: userPhone.trim(),
              email: userEmail.trim(),
            }
          : u
      )
    );

    setBasicSaveSuccessMsg('管理員帳號設定已成功儲存！');
    setTimeout(() => setBasicSaveSuccessMsg(null), 3000);
  };

  // 分頁名稱映射
  const TAB_NAME_MAP: Record<string, string> = {
    proposals: '我的案件',
    questions_management: '提問管理',
    points_receivables: currentUser.role === 'admin' ? '點數與帳務管理' : '點數 & 應收帳款',
    overview: '功能總覽儀表板',
    transactions: currentUser.role === 'admin' ? '交易管理' : '交易紀錄',
    subscriptions: currentUser.role === 'admin' ? '會員方案與費率管理' : '會員方案',
    profile: currentUser.role === 'admin' ? '管理員帳號設定' : '帳號與基本資料',
    real_name_auth: '實名認證',
    expert_certification: '專家認證',
    survey: '問卷(客戶調查)',
    switch_account: '切換帳號',
    admin_management: '平台數據與顯示',
    admin_cases: '案件管理',
    admin_questions: '問題管理',
    admin_user_management: '用戶管理',
    admin_user_analytics: '用戶分佈與習慣統計',
    admin_certifications: '受理認證 (實名、專家)',
    admin_aicrm: 'AI-CRM 系統',
    admin_mail_disputes: '申訴與郵件',
    settings: '帳號與基本資料',
    honors_achievements: '個人成就與榮譽',
  };

  const content = (
    <div
      className={`bg-white rounded-3xl border border-stone-200 shadow-sm w-full ${
        isFullPage
          ? 'max-w-4xl mx-auto my-2'
          : 'max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'
      }`}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {isFullPage && (
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 sm:p-2 sm:-ml-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
              title="返回問題市場"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              <span className="hidden sm:inline">返回問題市場</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 sm:gap-3 text-left hover:opacity-85 transition-all cursor-pointer group shrink-0"
            title="點擊前往帳號設定頁"
          >
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser.name}
              className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover ring-2 ring-stone-200 shrink-0 group-hover:ring-amber-500 transition-all"
            />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  setMobileMenuOpen(false);
                }}
                className="text-xs sm:text-base font-black text-stone-900 truncate max-w-[110px] sm:max-w-none hover:text-amber-600 transition-colors cursor-pointer text-left"
                title="點擊前往帳號設定頁"
              >
                {currentUser.name}
                {(currentUser.role !== 'questioner' || currentUser.showQuestionerTitle) && currentUser.title
                  ? ` · ${currentUser.title}`
                  : ''}
              </button>

              {/* 身份標籤 */}
              <span
                className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                  currentUser.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : currentUser.role === 'solver'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {currentUser.role === 'admin'
                  ? '管理員'
                  : currentUser.role === 'solver'
                  ? (currentUser.verifiedExpert ? '認證專家' : '解答者')
                  : '提問者'}
              </span>

              {currentUser.role === 'solver' && (
                <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded-md border shrink-0 ${currentPlan.badgeClass}`}>
                  {currentPlan.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
              {currentUser.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => switchRole(currentUser.role === 'solver' ? 'questioner' : 'solver')}
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-950 border border-amber-300/80 text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                  title={`點擊切換為${currentUser.role === 'solver' ? '提問者' : '解答者'}身份`}
                >
                  <RefreshCw className="w-2.5 h-2.5 text-amber-600" />
                  <span>切換至{currentUser.role === 'solver' ? '提問者' : '解答者'}</span>
                </button>
              )}

              {(currentUser.role !== 'questioner' || currentUser.showQuestionerTitle) && currentUser.title && (
                <p className="text-[10px] sm:text-[11px] text-stone-500 truncate hidden sm:block">{currentUser.title}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto pl-2">
          {/* 管理員專用：申訴郵件信封圖示按鈕 (移至最右側，顯示未處理案件與信件數量) - 僅非無金流且測試環境顯示 */}
          {currentUser.role === 'admin' && !isNoPaymentMode && isDemoMode && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin_mail_disputes');
                setMobileMenuOpen(false);
              }}
              className={`relative p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs ${
                activeTab === 'admin_mail_disputes'
                  ? 'bg-purple-700 text-white border-purple-800 shadow-md font-black'
                  : 'bg-white hover:bg-purple-50 text-purple-700 border-purple-200'
              }`}
              title={`申訴與郵件管理中心（待裁定案件：${adminPendingDisputesCount} 件）`}
            >
              <Mail className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${activeTab === 'admin_mail_disputes' ? 'text-white' : 'text-purple-700'}`} />
              {adminPendingDisputesCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-amber-400 text-stone-950 font-black text-[10px] rounded-full ring-2 ring-white flex items-center justify-center shadow-md animate-pulse font-mono">
                  {adminPendingDisputesCount}
                </span>
              )}
            </button>
          )}

          {!isFullPage && (
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer shrink-0 ml-1.5 sm:ml-2"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Horizontal Navigation Bar */}
      {currentUser.role === 'admin' ? (
        <div className="hidden sm:block bg-stone-50 border-b border-stone-200 shrink-0">
          {/* Top Category Filter & Quick Excel Action */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-stone-200/70 bg-stone-100/70 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { key: 'all', label: '全部功能', count: isNoPaymentMode ? 11 : 13 },
                { key: 'finance', label: '💰 金流與案件', count: isNoPaymentMode ? 2 : 4 },
                { key: 'users', label: '👥 用戶審核', count: 3 },
                { key: 'ai_sub', label: '🤖 AI與方案', count: isNoPaymentMode ? 1 : 2 },
                { key: 'account', label: '⚙️ 帳號', count: 2 },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setAdminCategoryFilter(cat.key as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                    adminCategoryFilter === cat.key
                      ? 'bg-purple-900 text-white shadow-2xs font-black'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtered Admin Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto text-xs font-bold">
            {[
              // 總覽與平台數據 (置頂)
              { id: 'overview', category: 'all', label: '功能總覽儀表板', icon: LayoutGrid },
              { id: 'admin_management', category: 'all', label: '平台數據與顯示', icon: Sliders },

              // 財務金流與案件 (無金流模式下完全隱藏金流與點數設定)
              ...(!isNoPaymentMode ? [
                { id: 'points_receivables', category: 'finance', label: '點數與帳務', icon: Coins },
                { id: 'transactions', category: 'finance', label: '交易管理', icon: Clock },
              ] : []),
              { id: 'admin_cases', category: 'finance', label: '案件管理', icon: Briefcase },
              { id: 'admin_questions', category: 'finance', label: '問題管理', icon: HelpCircle },

              // 用戶與審核認證
              { id: 'admin_user_management', category: 'users', label: '用戶管理', icon: UserCheck },
              { id: 'admin_certifications', category: 'users', label: '受理認證', icon: BadgeCheck },
              { id: 'admin_user_analytics', category: 'users', label: '用戶分佈與習慣統計', icon: BarChart3, badge: 'EXCEL' },

              // AI 智能與會員方案 (自成一區在帳號設定上面)
              { id: 'admin_aicrm', category: 'ai_sub', label: 'AI-CRM 系統', icon: Sparkles, badge: 'AI' },
              ...(!isNoPaymentMode ? [
                { id: 'subscriptions', category: 'ai_sub', label: '會員方案與費率', icon: Crown },
              ] : []),

              // 帳號
              { id: 'profile', category: 'account', label: '管理員設定', icon: SettingsIcon },
              { id: 'switch_account', category: 'account', label: '切換帳號', icon: ArrowLeftRight },
            ]
              .filter((tab) => adminCategoryFilter === 'all' || tab.category === adminCategoryFilter)
              .map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === 'switch_account') {
                        openAuthModal('login');
                        setMobileMenuOpen(false);
                        return;
                      }
                      setActiveTab(tab.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-purple-700 text-white shadow-2xs font-black'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                          isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-900'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-1 px-4 py-2 bg-stone-50 border-b border-stone-200 overflow-x-auto text-xs font-bold shrink-0">
          {[
            { id: 'overview', label: '功能總覽', icon: LayoutGrid },
            ...(!isNoPaymentMode ? [
              { id: 'points_receivables', label: currentUser.role === 'solver' ? '應收帳款' : '點數中心', icon: Coins },
              { id: 'transactions', label: '交易紀錄', icon: Clock },
              { id: 'subscriptions', label: '會員方案', icon: Crown },
            ] : []),
            { id: 'proposals', label: '我的案件', icon: Briefcase },
            { id: 'questions_management', label: '問題管理', icon: MessageSquare },
            { id: 'honors_achievements', label: '個人成就', icon: Award },
            { id: 'profile', label: '帳號與基本資料', icon: UserIcon },
            { id: 'real_name_auth', label: '實名認證', icon: UserCheck },
            { id: 'expert_certification', label: '專家認證', icon: ShieldCheck },
            { id: 'survey', label: '問卷(客戶調查)', icon: ClipboardList },
            { id: 'switch_account', label: '切換帳號', icon: ArrowLeftRight },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (tab.id === 'survey' && activeTab === 'profile' && profileSubTab === 'survey');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'switch_account') {
                    openAuthModal('login');
                    setMobileMenuOpen(false);
                    return;
                  }
                  if (tab.id === 'survey') {
                    setActiveTab('profile');
                    setProfileSubTab('survey');
                    setMobileMenuOpen(false);
                    return;
                  }
                  if (tab.id === 'profile') {
                    setProfileSubTab('basic');
                  }
                  setActiveTab(tab.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile-only Home Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden flex-1 overflow-y-auto bg-stone-50/90 p-2.5 space-y-2">
          {currentUser.role === 'admin' ? (
            <div className="space-y-3">
              {/* 分類 0: 📊 總覽與平台數據 (置頂) */}
              <div className="bg-white rounded-xl border border-purple-200 p-1.5 space-y-0.5 shadow-2xs">
                <p className="px-2 pt-1 pb-1 text-[10px] font-black text-purple-900 uppercase tracking-wider flex items-center justify-between border-b border-purple-100/80 mb-1">
                  <span className="flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-purple-700" />
                    <span>總覽與平台數據</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 font-bold border border-purple-200">2 項</span>
                </p>

                {/* 1. 功能總覽儀表板 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('overview');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg bg-purple-50/50 hover:bg-purple-100/70 active:bg-purple-100 text-left text-xs font-bold text-stone-900 flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-black text-purple-950 group-hover:text-purple-700 transition-colors">功能總覽儀表板</span>
                      <span className="text-[10px] text-purple-700/80 font-normal">管理員核心營運概覽</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-purple-500 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 2. 平台數據與顯示 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin_management');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg bg-purple-50/50 hover:bg-purple-100/70 active:bg-purple-100 text-left text-xs font-bold text-stone-900 flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-black text-purple-950 group-hover:text-purple-700 transition-colors">平台數據與顯示</span>
                      <span className="text-[10px] text-purple-700/80 font-normal">獲利統計與首頁看板公開指標設定</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-purple-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              {/* 分類 1: 💰 金流與點數資產 */}
              <div className="bg-white rounded-xl border border-amber-200/90 p-1.5 space-y-0.5 shadow-2xs">
                <p className="px-2 pt-1 pb-1 text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center justify-between border-b border-amber-100 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span>金流與點數資產</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                    {isNoPaymentMode ? '2 項' : '4 項'}
                  </span>
                </p>

                {/* 1. 點數與應收帳款 - 無金流模式下隱藏 */}
                {!isNoPaymentMode && (
                  <>
                    {/* 1. 點數與帳務管理 (整合點數查詢、應收託管與管理員撥付) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('points_receivables');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg hover:bg-amber-50/80 active:bg-amber-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6.5 h-6.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                          <Coins className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-black text-stone-900 group-hover:text-amber-800 transition-colors">點數與帳務管理</span>
                          <span className="text-[10px] text-stone-500 font-normal">用戶帳目查閱、點數撥發與應收管理</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* 3. 交易管理 */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('transactions');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg hover:bg-amber-50/80 active:bg-amber-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6.5 h-6.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-black text-stone-900 group-hover:text-amber-800 transition-colors">交易管理</span>
                          <span className="text-[10px] text-stone-500 font-normal">全站交易紀錄、拆款與退款稽核</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                )}

                {/* 3. 案件管理 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin_cases');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-purple-50/80 active:bg-purple-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 flex items-center justify-center shrink-0">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-black text-stone-900 group-hover:text-purple-800 transition-colors">案件管理</span>
                      <span className="text-[10px] text-stone-500 font-normal">全站案件詳細狀況與私聊對話稽核</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 4. 問題管理 (新增於案件管理下方) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin_questions');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-purple-50/80 active:bg-purple-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-black text-stone-900 group-hover:text-purple-800 transition-colors">問題管理</span>
                      <span className="text-[10px] text-stone-500 font-normal">各類問題分佈圓餅圖、下架審查與違規反饋</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* 分類 2: 👥 用戶管理與身分認證 */}
              <div className="bg-white rounded-xl border border-blue-200/90 p-1.5 space-y-0.5 shadow-2xs">
                <p className="px-2 pt-1 pb-1 text-[10px] font-black text-blue-900 uppercase tracking-wider flex items-center justify-between border-b border-blue-100 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-700" />
                    <span>用戶管理與身分認證</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 font-bold border border-blue-200">3 項</span>
                </p>

                {/* 5. 用戶管理 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin_user_management');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-blue-50/80 active:bg-blue-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-black text-stone-900 group-hover:text-blue-800 transition-colors">用戶管理</span>
                      <span className="text-[10px] text-stone-500 font-normal">會員名冊、帳號停權/解封與黑名單</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 6. 受理認證 (實名、專家) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin_certifications');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-indigo-50/80 active:bg-indigo-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center justify-center shrink-0">
                      <BadgeCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-black text-stone-900 group-hover:text-indigo-800 transition-colors">受理認證 (實名、專家)</span>
                      <span className="text-[10px] text-stone-500 font-normal">審核通過或移除實名/專家大師身分</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 7. 用戶分佈與習慣統計 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin_user_analytics');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-emerald-50/80 active:bg-emerald-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="block font-black text-stone-900 group-hover:text-emerald-800 transition-colors">用戶分佈與習慣統計</span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          個資與 Excel
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-normal">個資統計、調研問卷圖表與檔案匯出</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* 分類 3: 🤖 AI 智能與會員方案 (自成一區在帳號設定上面) */}
              <div className="bg-white rounded-xl border border-amber-200/90 p-1.5 space-y-0.5 shadow-2xs">
                <p className="px-2 pt-1 pb-1 text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center justify-between border-b border-amber-100 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>AI 智能與會員方案</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                    {isNoPaymentMode ? '1 項' : '2 項'}
                  </span>
                </p>

                {/* AI-CRM 系統 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin_aicrm');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-amber-50/80 active:bg-amber-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="block font-black text-stone-900 group-hover:text-amber-800 transition-colors">AI-CRM 系統</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-normal">功能開關、猶豫期推播規則與客情商機</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 會員方案與費率管理 (無金流模式下隱藏) */}
                {!isNoPaymentMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('subscriptions');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg hover:bg-amber-50/80 active:bg-amber-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6.5 h-6.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center shrink-0">
                        <Crown className="w-3.5 h-3.5 text-amber-700" />
                      </div>
                      <div>
                        <span className="block font-black text-stone-900 group-hover:text-amber-800 transition-colors">會員方案與費率管理</span>
                        <span className="text-[10px] text-stone-500 font-normal">平台抽成設定與會員訂閱方案編輯</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>

              {/* 分類 4: ⚙️ 帳號 */}
              <div className="bg-white rounded-xl border border-stone-200/80 p-1.5 space-y-0.5 shadow-2xs">
                <p className="px-2 pt-1 pb-1 text-[10px] font-black text-stone-500 uppercase tracking-wider flex items-center justify-between border-b border-stone-100 mb-1">
                  <span className="flex items-center gap-1">
                    <SettingsIcon className="w-3 h-3 text-stone-500" />
                    <span>帳號</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 font-bold">2 項</span>
                </p>

                {/* 13. 管理員帳號設定 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-100 active:bg-stone-200 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-stone-100 text-stone-800 flex items-center justify-center shrink-0">
                      <SettingsIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-black text-stone-900">管理員帳號設定</span>
                      <span className="text-[10px] text-stone-500 font-normal">管理員席位資料與安全維護</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {/* 14. 切換帳號 */}
                <button
                  type="button"
                  onClick={() => {
                    openAuthModal('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-100 active:bg-stone-200 text-left text-xs font-bold text-stone-700 flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0">
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-black text-stone-900">切換帳號</span>
                      <span className="text-[10px] text-stone-500 font-normal">本裝置已登錄身分快速切換</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {/* 15. 登出管理員帳號 */}
                <button
                  type="button"
                  onClick={() => {
                    const guestUser = availableUsers.find((u) => u.id === 'user-guest') || availableUsers[0];
                    setCurrentUser(guestUser);
                    onClose();
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-rose-50 text-left text-xs font-bold text-rose-600 flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-black text-rose-600">登出管理員帳號</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Section 1: 資產與帳務 */}
          <div className="bg-white rounded-xl border border-stone-200/80 p-1 space-y-0.5 shadow-2xs">
            {!isNoPaymentMode && (
              <>
                <p className="px-2 pt-1 pb-0.5 text-[9px] font-black text-stone-400 uppercase tracking-wider">
                  資產與帳務
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('points_receivables');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                      <Coins className="w-3 h-3" />
                    </div>
                    <span>點數 & 應收帳款</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('transactions');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-3 h-3" />
                    </div>
                    <span>交易紀錄</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('subscriptions');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                      <Crown className="w-3 h-3" />
                    </div>
                    <span>會員管理</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenAiCrm) {
                  onOpenAiCrm();
                }
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-amber-50 active:bg-amber-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-stone-950 flex items-center justify-center shrink-0 shadow-2xs">
                  <Crown className="w-3 h-3 fill-stone-950" />
                </div>
                <span>AI-CRM 客戶關係管理</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  大師專屬
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              </div>
            </button>
          </div>

          {/* Section 2: 帳號管理 */}
          <div className="bg-white rounded-xl border border-stone-200/80 p-1 space-y-0.5 shadow-2xs">
            <p className="px-2 pt-1 pb-0.5 text-[9px] font-black text-stone-400 uppercase tracking-wider">
              帳號管理
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('proposals');
                setMobileMenuOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                  <Briefcase className="w-3 h-3" />
                </div>
                <span>我的案件</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('questions_management');
                setMobileMenuOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-3 h-3" />
                </div>
                <span>問題管理</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('honors_achievements');
                setMobileMenuOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                  <Award className="w-3 h-3" />
                </div>
                <span>個人成就與榮譽</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>

          {/* Section 3: 個資與認證 */}
          <div className="bg-white rounded-xl border border-stone-200/80 p-1 space-y-0.5 shadow-2xs">
            <p className="px-2 pt-1 pb-0.5 text-[9px] font-black text-stone-400 uppercase tracking-wider">
              個資與認證
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setProfileSubTab('basic');
                setMobileMenuOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-cyan-100/90 text-cyan-800 flex items-center justify-center shrink-0">
                  <UserCog className="w-3 h-3" />
                </div>
                <span>帳號與基本資料</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('real_name_auth');
                setMobileMenuOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-sky-100/90 text-sky-800 flex items-center justify-center shrink-0">
                  <UserCheck className="w-3 h-3" />
                </div>
                <span>實名認證</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('expert_certification');
                setMobileMenuOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-emerald-100/90 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <span>專家認證</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
            <div
              onClick={() => {
                setActiveTab('profile');
                setProfileSubTab('survey');
                setMobileMenuOpen(false);
                setTimeout(() => {
                  const el = document.getElementById('survey-questions-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-stone-50 active:bg-stone-100 text-left text-xs font-bold text-stone-850 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-purple-100/90 text-purple-800 flex items-center justify-center shrink-0 relative">
                  <ClipboardList className="w-3 h-3" />
                  {!currentUser.surveyData?.completedAt && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-1 ring-white" />
                  )}
                </div>
                <span>問卷(客戶調查)</span>
              </span>
              <div className="flex items-center gap-1.5">
                {currentUser.surveyData?.completedAt ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-750 border border-purple-200">已填寫</span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    完成即送會員
                  </span>
                )}
                <span
                  className="text-[9px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-0.5 transition-all cursor-pointer"
                  title="查看活動"
                >
                  <span>查看活動</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: 帳號操作 */}
          <div className="bg-white rounded-xl border border-stone-200/80 p-1 space-y-0.5 shadow-2xs">
            <p className="px-2 pt-1 pb-0.5 text-[9px] font-black text-stone-400 uppercase tracking-wider">
              帳號操作
            </p>
            <button
              type="button"
              onClick={() => {
                openAuthModal('login');
                setMobileMenuOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-violet-50 active:bg-violet-100 text-left text-xs font-bold text-violet-950 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-violet-100/90 text-violet-800 flex items-center justify-center shrink-0">
                  <Users className="w-3 h-3" />
                </div>
                <span>切換帳號</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                const guestUser = availableUsers.find((u) => u.id === 'user-guest') || availableUsers[0];
                setCurrentUser(guestUser);
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-rose-50 active:bg-rose-100 text-left text-xs font-bold text-rose-600 flex items-center justify-between group cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-rose-100/90 text-rose-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-3 h-3" />
                </div>
                <span>登出帳號</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>
            </>
          )}
        </div>
      )}

      {/* Body Content */}
      <div className={`p-3.5 sm:p-6 space-y-4 sm:space-y-6 ${!isFullPage ? 'overflow-y-auto' : ''} ${
        mobileMenuOpen ? 'hidden sm:block' : 'block'
      }`}>
        {/* Mobile Navigation Return Bar */}
        <div className="sm:hidden -mt-1 mb-2 flex items-center justify-between pb-2 border-b border-stone-200/80">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 text-[11px] font-bold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-stone-600" />
            <span>返回選單</span>
          </button>
          <span className="text-[11px] font-extrabold text-stone-500">
            {TAB_NAME_MAP[activeTab] || '功能分頁'}
          </span>
        </div>
        {msg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] px-5 py-2.5 rounded-full bg-stone-900/95 text-white text-xs font-black shadow-2xl backdrop-blur-md flex items-center gap-2 border border-stone-700/80 animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* TAB: 功能總覽 (Overview Hub) */}
        {activeTab === 'overview' && (
          currentUser.role === 'admin' ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Admin Command Center Banner */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-stone-950 via-purple-950 to-stone-900 text-white shadow-md">
                <h3 className="text-xl sm:text-2xl font-black text-white">創點子 IdeaX 運營管理後台</h3>
                <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                  實時掌握全站用戶調研、點數託管、案件進展、認證審核與金流分潤。
                </p>
              </div>

              {/* KPI Quick Stats */}
              <div className={`grid grid-cols-2 ${isNoPaymentMode ? 'sm:grid-cols-3' : 'sm:grid-cols-4'} gap-3 sm:gap-4`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_user_analytics')}
                  className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-purple-300 hover:shadow-sm text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-bold">總註冊用戶</span>
                    <Users className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-2xl font-black text-stone-900 font-mono">
                    {availableUsers.filter((u) => u.id !== 'user-guest').length}
                  </p>
                  <span className="text-[10px] text-purple-700 font-bold mt-0.5 block">點擊查閱用戶分佈圖表 →</span>
                </button>

                {!isNoPaymentMode && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('points_receivables')}
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-300 hover:shadow-sm text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-stone-500 mb-1">
                      <span className="text-xs font-bold">全站總交易額</span>
                      <Coins className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-2xl font-black text-stone-900 font-mono">
                      NT$ {(adminTotalGMV || 0).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-amber-700 font-bold mt-0.5 block">點數與應收帳款管理 →</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('admin_cases')}
                  className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-blue-300 hover:shadow-sm text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-bold">市場問題數</span>
                    <Briefcase className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-2xl font-black text-stone-900 font-mono">{questions.length} 題</p>
                  <span className="text-[10px] text-blue-700 font-bold mt-0.5 block">案件詳細與對話稽核 →</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('admin_certifications')}
                  className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-300 hover:shadow-sm text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-bold">認證專家智庫</span>
                    <BadgeCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-2xl font-black text-stone-900 font-mono">{solvers.length} 位</p>
                  <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">受理實名與專家審核 →</span>
                </button>
              </div>

              {/* Administrative Function Pillars */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-purple-700" />
                  <span>管理員功能模組快捷導覽</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* 用戶分佈與習慣統計 */}
                  <div
                    onClick={() => setActiveTab('admin_user_analytics')}
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-purple-400 hover:bg-purple-50/20 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-black text-stone-900 text-sm">用戶分佈與習慣統計</h5>
                        <span className="text-[10px] text-purple-700 font-bold">支援 Excel 匯出與圖表</span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      彙整性別、年齡、職業、期望服務、專業領域、提問預算及付費意願，可一鍵下載標準 Excel 檔案。
                    </p>
                  </div>

                  {/* 點數與帳務管理 (整合點數查詢、應收託管與管理員撥付) */}
                  <div
                    onClick={() => setActiveTab('points_receivables')}
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50/20 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-black text-stone-900 text-sm">點數與帳務管理</h5>
                        <span className="text-[10px] text-amber-700 font-bold">全站用戶帳目與點數撥付</span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      查閱全站用戶點數餘額、未結收益與銀行帳戶，並可運用每日 5 萬點配額執行活動激勵與帳務調度。
                    </p>
                  </div>

                  {/* 案件管理 */}
                  <div
                    onClick={() => setActiveTab('admin_cases')}
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-black text-stone-900 text-sm">案件管理與私聊稽核</h5>
                        <span className="text-[10px] text-blue-700 font-bold">全站案件與履約追蹤</span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      查閱懸賞問題、採納方案、階段交付交付成果與客製私聊進度，杜絕履約違規。
                    </p>
                  </div>

                  {/* 問題管理 (新增於案件管理下方) */}
                  <div
                    onClick={() => setActiveTab('admin_questions')}
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-purple-400 hover:bg-purple-50/20 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-black text-stone-900 text-sm">問題管理</h5>
                        <span className="text-[10px] text-purple-700 font-bold">圓餅圖分析與違規下架</span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      查閱各類問題數量分佈圓餅圖，執行違規問題審核下架並即時發送處置反饋通知。
                    </p>
                  </div>

                  {/* 受理認證 */}
                  <div
                    onClick={() => setActiveTab('admin_certifications')}
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BadgeCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-black text-stone-900 text-sm">受理認證 (實名、專家)</h5>
                        <span className="text-[10px] text-emerald-700 font-bold">證件資格審核批覆</span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      審核用戶送審之身分證明文件與專家頭銜佐證，一鍵批覆通過或核發平台大師徽章。
                    </p>
                  </div>

                  {/* 切換帳號 */}
                  <div
                    onClick={() => openAuthModal('login')}
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50/20 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-black text-stone-900 text-sm">切換帳號 (身分驗證)</h5>
                        <span className="text-[10px] text-amber-700 font-bold">提問者 / 解答者 / 訪客</span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      快速切換至林書豪 (提問者)、陳怡君 (專家解答者) 或訪客探索身分，輕鬆測試雙向流程。
                    </p>
                  </div>
                </div>
              </div>

              {/* 特殊環境開關 (共用相對開關 + 權限範圍) */}
              <div id="environment-controls-section" className="p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800 text-stone-300 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-stone-200 text-xs">特殊環境開關控制</span>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    運營模式全站生效 • 測試環境僅管理員視角
                  </span>
                </div>

                {/* 三大平台運營模式切換：測試環境 (TEST) vs 正式營運模式 (NORM) vs 無金流模式 (FREE) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-stone-300">平台運營模式（三選一專屬模式切換）</span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      {isDemoMode ? 'TEST (預設測試中)' : isNoPaymentMode ? 'FREE (無金流)' : 'NORM (正常營運)'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-950/80 rounded-xl border border-stone-800">
                    {/* 🟢 正式營運模式 (NORM) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!(!isNoPaymentMode && !isDemoMode)) {
                          setPendingModeConfirm({ type: 'liveOperation', nextState: true });
                        }
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        !isNoPaymentMode && !isDemoMode
                          ? 'bg-emerald-500 text-stone-950 shadow-md font-black ring-1 ring-emerald-300'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                      }`}
                      title="切換至正常營運模式 (保留點數機制，純淨交易額)"
                    >
                      <span>🟢 正常營運</span>
                      <span className="text-[9px] opacity-80 font-mono">(NORM)</span>
                    </button>

                    {/* ⚡ 無金流模式 (FREE) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!(isNoPaymentMode && !isDemoMode)) {
                          setPendingModeConfirm({ type: 'noPayment', nextState: true });
                        }
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isNoPaymentMode && !isDemoMode
                          ? 'bg-rose-500 text-white shadow-md font-black ring-1 ring-rose-400'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                      }`}
                      title="切換至無金流模式 (全站免點數，隱藏金流)"
                    >
                      <span>⚡ 無金流</span>
                      <span className="text-[9px] opacity-80 font-mono">(FREE)</span>
                    </button>

                    {/* 🧪 測試環境 (TEST) - 移至無金流右方 */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDemoMode) {
                          setPendingModeConfirm({ type: 'demo', nextState: true });
                        }
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isDemoMode
                          ? 'bg-amber-400 text-stone-950 shadow-md font-black ring-1 ring-amber-300'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                      }`}
                      title={isDemoMode ? '目前處於測試環境（預設開啟，開啟一般或無金流模式即可切換）' : '切換至測試環境'}
                    >
                      <span>🧪 測試環境</span>
                      <span className="text-[9px] opacity-80 font-mono">(TEST)</span>
                    </button>
                  </div>
                </div>

                {/* 輔助測試設定：測試環境 (DEMO) 與 隱藏測試帳號 (HIDE) */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-stone-800/60">
                  {/* 測試環境（僅管理員畫面） */}
                  <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800 flex items-center justify-between gap-1">
                    <div className="flex flex-col">
                      <span className="font-bold text-stone-200 truncate">測試環境 (DEMO)</span>
                      <span className="text-[9px] text-stone-500">僅作用於管理員帳號</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingModeConfirm({ type: 'demo', nextState: !isDemoMode })}
                      className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                        isDemoMode
                          ? 'bg-amber-400 text-stone-950 hover:bg-amber-300'
                          : 'bg-stone-700 text-stone-100 hover:bg-stone-600'
                      }`}
                    >
                      {isDemoMode ? '已開啟' : '開啟'}
                    </button>
                  </div>

                  {/* 隱藏測試帳號 */}
                  <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800 flex items-center justify-between gap-1">
                    <div className="flex flex-col">
                      <span className="font-bold text-stone-200 truncate">測試帳號顯示</span>
                      <span className="text-[9px] text-stone-500">全站平台同步</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingModeConfirm({ type: 'hideTestAccounts', nextState: !isHideTestAccounts })}
                      className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer font-mono ${
                        isHideTestAccounts
                          ? 'bg-purple-400 text-stone-950 hover:bg-purple-300'
                          : 'bg-stone-700 text-stone-100 hover:bg-stone-600'
                      }`}
                    >
                      {isHideTestAccounts ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Hero */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-3.5 text-left hover:opacity-90 transition-all cursor-pointer group"
                  title="點擊前往帳號設定頁"
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={currentUser.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-400/80 shrink-0 group-hover:ring-amber-300 transition-all"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors">{currentUser.name}</h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950">
                        {currentUser.role === 'solver'
                          ? (currentUser.verifiedExpert || currentUser.verifiedBadge || userAcceptedAnswers.length >= 50
                              ? '認證專家'
                              : '解答者')
                          : '提問者'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/80 mt-1">{currentUser.title || '一般會員用戶'}</p>
                  </div>
                </button>

                {!isNoPaymentMode && (
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center min-w-[100px]">
                      <span className="text-[10px] text-stone-300 font-semibold block">點數餘額</span>
                      <span className="text-base font-black text-amber-400 font-mono">
                        NT$ {(currentUser.balance || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center min-w-[100px]">
                      <span className="text-[10px] text-stone-300 font-semibold block">應收帳款</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        NT$ {(currentUser.withheldPoints || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 核心模組卡片區 (電腦版 & 平板版) */}
              <div className={`grid grid-cols-1 ${isNoPaymentMode ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-5`}>
                {/* 1. 資產與帳務 (無金流模式下隱藏點數與金流設定) */}
                {!isNoPaymentMode && (
                  <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-stone-900">資產與帳務</h4>
                          <p className="text-[10px] text-stone-500">點數管理、拆款紀錄與會員方案</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setActiveTab('points_receivables')}
                          className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-amber-50/80 border border-stone-200 hover:border-amber-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <span className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-100/90 text-amber-800 group-hover:bg-amber-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                              <Coins className="w-3.5 h-3.5" />
                            </div>
                            <span>點數 & 應收帳款</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('transactions')}
                          className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-blue-50/80 border border-stone-200 hover:border-blue-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <span className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-100/90 text-blue-700 group-hover:bg-blue-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                              <Clock className="w-3.5 h-3.5" />
                            </div>
                            <span>交易紀錄</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-700 transition-colors" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('subscriptions')}
                          className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-purple-50/80 border border-stone-200 hover:border-purple-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <span className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-purple-100/90 text-purple-700 group-hover:bg-purple-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                              <Crown className="w-3.5 h-3.5" />
                            </div>
                            <span>會員方案管理</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-purple-700 transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. 帳號管理 */}
                <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-stone-900">帳號管理</h4>
                        <p className="text-[10px] text-stone-500">案件進度、問題管理與榮譽成果</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveTab('proposals')}
                        className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-blue-50/80 border border-stone-200 hover:border-blue-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100/90 text-blue-700 group-hover:bg-blue-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                            <Briefcase className="w-3.5 h-3.5" />
                          </div>
                          <span>我的案件 ({allProposals.length})</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-700 transition-colors" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('questions_management')}
                        className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-indigo-50/80 border border-stone-200 hover:border-indigo-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100/90 text-indigo-700 group-hover:bg-indigo-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </div>
                          <span>問題管理 ({myQuestions.length})</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-indigo-700 transition-colors" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('honors_achievements')}
                        className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-amber-50/80 border border-stone-200 hover:border-amber-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100/90 text-amber-800 group-hover:bg-amber-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                            <Award className="w-3.5 h-3.5" />
                          </div>
                          <span>個人成就與榮譽</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. 個資與認證 */}
                <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-stone-900">個資與認證</h4>
                        <p className="text-[10px] text-stone-500">基本資料、實名認證與專家資格</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('profile');
                          setProfileSubTab('basic');
                        }}
                        className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-cyan-50/80 border border-stone-200 hover:border-cyan-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-cyan-100/90 text-cyan-800 group-hover:bg-cyan-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                            <UserCog className="w-3.5 h-3.5" />
                          </div>
                          <span>帳號與基本資料</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-cyan-700 transition-colors" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('real_name_auth')}
                        className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-sky-50/80 border border-stone-200 hover:border-sky-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sky-100/90 text-sky-800 group-hover:bg-sky-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                            <UserCheck className="w-3.5 h-3.5" />
                          </div>
                          <span>實名認證</span>
                        </span>
                        {currentUser.realNameAuthStatus === 'verified' || currentUser.bankAccount?.isVerified ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold border border-emerald-200">已認證</span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-sky-700 transition-colors" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('expert_certification')}
                        className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-emerald-50/80 border border-stone-200 hover:border-emerald-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100/90 text-emerald-800 group-hover:bg-emerald-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <span>專家認證審查</span>
                        </span>
                        {currentUser.verifiedExpert || currentUser.verifiedBadge || userAcceptedAnswers.length >= 50 ? (
                          <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-bold border border-emerald-200">認證專家</span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-700 transition-colors" />
                        )}
                      </button>

                      <div
                        onClick={() => {
                          setActiveTab('profile');
                          setProfileSubTab('survey');
                          setTimeout(() => {
                            const el = document.getElementById('survey-questions-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        }}
                        className="w-full p-2.5 rounded-xl bg-stone-50 hover:bg-purple-50/80 border border-stone-200 hover:border-purple-300 text-left font-bold text-stone-800 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-100/90 text-purple-800 group-hover:bg-purple-200 group-hover:scale-105 flex items-center justify-center shrink-0 transition-all relative">
                            <ClipboardList className="w-3.5 h-3.5" />
                            {!currentUser.surveyData?.completedAt && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-1.5 ring-white" />
                            )}
                          </div>
                          <span>問卷(客戶調查)</span>
                        </span>
                        {currentUser.surveyData?.completedAt ? (
                          <span className="text-[10px] text-purple-750 bg-purple-50 px-2 py-0.5 rounded-md font-bold border border-purple-200">已填寫</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md font-bold border border-amber-200">
                              完成即送會員
                            </span>
                            <span
                              className="text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-0.5 transition-all cursor-pointer"
                              title="查看活動"
                            >
                              <span>查看活動</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 1: 點數 & 應收帳款中心 */}
        {activeTab === 'points_receivables' && (
          currentUser.role === 'admin' ? (
            <AdminPointsReceivablesTab />
          ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 頂部切換 Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm font-black text-amber-950">點數 & 應收帳款</h3>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-amber-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setPointsSubView('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pointsSubView === 'all'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  全部總覽
                </button>
                <button
                  type="button"
                  onClick={() => setPointsSubView('receivables')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pointsSubView === 'receivables'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  應收帳款
                </button>
                <button
                  type="button"
                  onClick={() => setPointsSubView('points')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pointsSubView === 'points'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  點數餘額及記錄
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 板塊 A：應收帳款 (綁定的收款帳戶、獲得懸賞點數、平台應撥款、累計撥款) */}
            {/* ========================================================================= */}
            {(pointsSubView === 'all' || pointsSubView === 'receivables') && (
              <div className="space-y-5 p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs">
                {/* 頂部乾淨標題 + ？鍵 (連結至服務條款頁面) */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-600" />
                    <h4 className="font-black text-base text-stone-900">應收帳款</h4>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onNavigateToTerms) {
                          onNavigateToTerms();
                        }
                      }}
                      className="w-5 h-5 rounded-full bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                      title="查看服務條款"
                    >
                      ？
                    </button>
                  </div>
                </div>

                {/* 應收帳款核心指標卡片 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* 1. 獲得懸賞 */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-amber-950 block">獲得懸賞</span>
                      <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-lg border border-amber-200 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setBountyPeriod('today')}
                          className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            bountyPeriod === 'today' ? 'bg-amber-500 text-stone-950' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          日
                        </button>
                        <button
                          type="button"
                          onClick={() => setBountyPeriod('week')}
                          className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            bountyPeriod === 'week' ? 'bg-amber-500 text-stone-950' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          週
                        </button>
                        <button
                          type="button"
                          onClick={() => setBountyPeriod('month')}
                          className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            bountyPeriod === 'month' ? 'bg-amber-500 text-stone-950' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          月
                        </button>
                        <button
                          type="button"
                          onClick={() => setBountyPeriod('all')}
                          className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            bountyPeriod === 'all' ? 'bg-amber-500 text-stone-950' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          歷史
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-amber-950 font-mono mt-1 block">
                        {(
                          bountyPeriod === 'today'
                            ? Math.round(earnedBountyPoints * 0.05) || (isDemoMode ? 350 : 0)
                            : bountyPeriod === 'week'
                            ? Math.round(earnedBountyPoints * 0.25) || (isDemoMode ? 1200 : 0)
                            : bountyPeriod === 'month'
                            ? earnedBountyPoints || (isDemoMode ? 2800 : 0)
                            : (earnedBountyPoints * 3) || (isDemoMode ? 8400 : 0)
                        ).toLocaleString()}{' '}
                        <span className="text-xs font-normal text-stone-500">點</span>
                      </span>
                      <p className="text-[10px] text-amber-800 mt-2 bg-amber-100/50 p-2.5 rounded-lg leading-relaxed font-semibold">
                        💡 此非實際獲得點數，將換算為平台應撥款後轉入指定帳戶。
                      </p>
                    </div>
                  </div>

                  {/* 2. 平台應撥款 */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-bold text-stone-700 block">平台應撥款</span>
                    <span className="text-2xl font-black text-stone-900 font-mono mt-1 block">
                      NT$ {(currentUser.withheldPoints || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* 3. 累計撥款（週/月/年/歷史） */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-950 block">
                      累計撥款（{payoutPeriod === 'week' ? '週' : payoutPeriod === 'month' ? '月' : payoutPeriod === 'year' ? '年' : '歷史'}）
                    </span>
                    <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
                      NT$ {(
                        payoutPeriod === 'week'
                          ? Math.round(totalPaidOutAmount * 0.08) || (isDemoMode ? 1800 : 0)
                          : payoutPeriod === 'month'
                          ? Math.round(totalPaidOutAmount * 0.22) || (isDemoMode ? 14200 : 0)
                          : payoutPeriod === 'year'
                          ? Math.round(totalPaidOutAmount * 0.75) || (isDemoMode ? 86500 : 0)
                          : totalPaidOutAmount
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 1. 綁定的收款帳戶 */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <h5 className="font-extrabold text-sm text-stone-900">綁定的收款帳戶</h5>
                    </div>
                    {!isEditingBank && (
                      <button
                        type="button"
                        onClick={() => setIsEditingBank(true)}
                        className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>修改帳戶</span>
                      </button>
                    )}
                  </div>

                  {isEditingBank ? (
                    <form onSubmit={handleSaveBankAccount} className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 block mb-1">
                            收款銀行名稱 *
                          </label>
                          <input
                            type="text"
                            required
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="例如：822 中國信託商業銀行"
                            className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 block mb-1">
                            銀行代碼 *
                          </label>
                          <input
                            type="text"
                            required
                            value={bankCode}
                            onChange={(e) => setBankCode(e.target.value)}
                            placeholder="例如：822"
                            className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-mono text-stone-900 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 block mb-1">
                            銀行存款帳號 *
                          </label>
                          <input
                            type="text"
                            required
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="例如：0000123456789"
                            className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-stone-900 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 block mb-1">
                            帳戶戶名 *
                          </label>
                          <input
                            type="text"
                            required
                            value={accountHolder}
                            onChange={(e) => setAccountHolder(e.target.value)}
                            placeholder="例如：王大明"
                            className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingBank(false)}
                          className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          儲存收款帳戶
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-white border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-stone-400 text-[11px] block">收款銀行</span>
                        <span className="font-bold text-stone-900">{bankName}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[11px] block">銀行代號</span>
                        <span className="font-mono font-bold text-stone-900">{bankCode}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[11px] block">帳號後 4 碼</span>
                        <span className="font-mono font-bold text-stone-900">
                          •••• •••• {accountNumber.slice(-4) || '6789'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[11px] block">戶名</span>
                        <span className="font-bold text-stone-900">{accountHolder}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. 累計撥款紀錄 (依批次呈現，非個別交易) */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                    <h5 className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>撥款紀錄（依批次）</span>
                    </h5>

                    {/* 週/月/年/歷史 4段式切換按鈕 */}
                    <div className="inline-flex p-1 bg-white rounded-xl border border-stone-300 gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPayoutPeriod('week')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          payoutPeriod === 'week'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        週
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutPeriod('month')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          payoutPeriod === 'month'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        月
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutPeriod('year')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          payoutPeriod === 'year'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        年
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutPeriod('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          payoutPeriod === 'all'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        歷史
                      </button>
                    </div>
                  </div>

                  {/* 按照「每週撥款批次」組織的紀錄列表 */}
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {[
                      {
                        batchId: 'batch-2026-w38',
                        batchName: '2026 年第 38 週批次撥款',
                        payoutDate: '2026-09-21 (週一)',
                        period: 'week',
                        totalAmount: 1800,
                        itemCount: 1,
                        bankAccount: `${bankName} (••${accountNumber.slice(-4) || '6789'})`,
                        batchTxRef: 'BATCH-TW822-20260921-9812',
                        status: '已撥付入帳',
                        items: [
                          { title: '商業模式策略諮詢與智財專案交付 #108', amount: 1800 }
                        ]
                      },
                      {
                        batchId: 'batch-2026-w37',
                        batchName: '2026 年第 37 週批次撥款',
                        payoutDate: '2026-09-14 (週一)',
                        period: 'month',
                        totalAmount: 5400,
                        itemCount: 2,
                        bankAccount: `${bankName} (••${accountNumber.slice(-4) || '6789'})`,
                        batchTxRef: 'BATCH-TW822-20260914-4401',
                        status: '已撥付入帳',
                        items: [
                          { title: '生醫專利授權階段交付驗收 #094', amount: 3600 },
                          { title: '醫療器材通路合作規劃案 #095', amount: 1800 }
                        ]
                      },
                      {
                        batchId: 'batch-2026-w36',
                        batchName: '2026 年第 36 週批次撥款',
                        payoutDate: '2026-09-07 (週一)',
                        period: 'month',
                        totalAmount: 7000,
                        itemCount: 2,
                        bankAccount: `${bankName} (••${accountNumber.slice(-4) || '6789'})`,
                        batchTxRef: 'BATCH-TW822-20260907-1192',
                        status: '已撥付入帳',
                        items: [
                          { title: '財務併購估值模型諮詢解題 #081', amount: 5000 },
                          { title: '股權架構設計與顧問建議 #082', amount: 2000 }
                        ]
                      },
                      {
                        batchId: 'batch-2026-w34',
                        batchName: '2026 年第 34 週批次撥款',
                        payoutDate: '2026-08-24 (週一)',
                        period: 'year',
                        totalAmount: 12000,
                        itemCount: 3,
                        bankAccount: `${bankName} (••${accountNumber.slice(-4) || '6789'})`,
                        batchTxRef: 'BATCH-TW822-20260824-9018',
                        status: '已撥付入帳',
                        items: [
                          { title: 'L4 殿堂級商業難題採納撥付 #056', amount: 8000 },
                          { title: '技術架構優化諮詢 #057', amount: 2500 },
                          { title: '線上雙向研討顧問諮詢 #058', amount: 1500 }
                        ]
                      },
                      {
                        batchId: 'batch-2026-w28',
                        batchName: '2026 年第 28 週批次撥款',
                        payoutDate: '2026-07-10 (週一)',
                        period: 'year',
                        totalAmount: 25000,
                        itemCount: 4,
                        bankAccount: `${bankName} (••${accountNumber.slice(-4) || '6789'})`,
                        batchTxRef: 'BATCH-TW822-20260710-3381',
                        status: '已撥付入帳',
                        items: [
                          { title: '跨國法律合規專利佈局顧問諮詢 #031', amount: 15000 },
                          { title: '跨境電商海關申報專案 #032', amount: 5000 },
                          { title: '企業法務風控標準作業書 #033', amount: 3000 },
                          { title: '知識產權海外註冊代理 #034', amount: 2000 }
                        ]
                      },
                    ]
                      .filter((batch) => {
                        if (payoutPeriod === 'week') return batch.period === 'week';
                        if (payoutPeriod === 'month') return batch.period === 'week' || batch.period === 'month';
                        if (payoutPeriod === 'year') return batch.period === 'week' || batch.period === 'month' || batch.period === 'year';
                        return true;
                      })
                      .map((batch) => {
                        const isExpanded = expandedBatchId === batch.batchId;
                        return (
                          <div
                            key={batch.batchId}
                            className="bg-white rounded-xl border border-stone-200 overflow-hidden text-xs hover:border-emerald-300 transition-colors shadow-2xs"
                          >
                            <div
                              onClick={() => setExpandedBatchId(isExpanded ? null : batch.batchId)}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-stone-50/50"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-stone-900 text-sm">{batch.batchName}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                    {batch.status}
                                  </span>
                                  <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                                    含 {batch.itemCount} 筆結算方案
                                  </span>
                                </div>
                                <div className="text-[11px] text-stone-500 mt-1 flex flex-wrap items-center gap-3">
                                  <span>撥款日期：{batch.payoutDate}</span>
                                  <span>匯入帳戶：{batch.bankAccount}</span>
                                  <span className="font-mono text-stone-400">序號：{batch.batchTxRef}</span>
                                </div>
                              </div>

                              <div className="flex items-center sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0">
                                <span className="font-black font-mono text-base text-emerald-700">
                                  NT$ {batch.totalAmount.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-amber-700 underline flex items-center gap-0.5">
                                  {isExpanded ? '收合明細' : '查看方案明細'}
                                </span>
                              </div>
                            </div>

                            {/* 批次內含方案展開明細 */}
                            {isExpanded && (
                              <div className="px-3.5 pb-3 pt-1 border-t border-stone-100 bg-stone-50/70 space-y-1.5">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                                  本批次合併結算方案明細：
                                </span>
                                {batch.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-stone-200/80">
                                    <span className="text-stone-700 font-medium">{item.title}</span>
                                    <span className="font-mono font-bold text-stone-900">NT$ {item.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 板塊 B：點數餘額及記錄 */}
            {/* ========================================================================= */}
            {(pointsSubView === 'all' || pointsSubView === 'points') && (
              <div
                id="points-balance-and-records-section"
                className="space-y-5 p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs scroll-mt-20"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <h4 className="font-black text-base text-stone-900">點數餘額及記錄</h4>
                  </div>
                </div>

                {/* 點數餘額與託管預扣卡片 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 可用點數餘額 */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                    <span className="text-xs font-bold text-amber-950 block">目前點數餘額</span>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-3xl font-black text-amber-950 font-mono">
                        {(currentUser?.balance || 0).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-amber-900">點</span>
                    </div>
                  </div>

                  {/* 懸賞預扣中點數 */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-bold text-stone-700 block">預扣點數 (懸賞、支付方案)</span>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-3xl font-black text-stone-900 font-mono">
                        {(currentUser.withheldPoints || 0).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-stone-600">點</span>
                    </div>
                  </div>
                </div>

                {/* 儲值購買點數方案卡片 */}
                <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-sm text-amber-950 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span>儲值購買點數</span>
                    </h5>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {RECHARGE_PACKAGES.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                          pkg.isPopular
                            ? 'bg-white border-amber-400 ring-2 ring-amber-300 shadow-xs'
                            : 'bg-white border-stone-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                            {pkg.tag}
                          </span>
                          <span className="text-lg font-black font-mono text-stone-900 block mt-1">
                            {pkg.totalPoints.toLocaleString()} <span className="text-xs font-normal text-stone-500">點</span>
                          </span>
                          <span className="text-xs font-bold text-stone-600 block">
                            售價 NT$ {pkg.price.toLocaleString()}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            depositPackage(pkg.id);
                            setMsg(`🎉 成功儲值 ${pkg.totalPoints} 點！`);
                            setTimeout(() => setMsg(null), 4000);
                          }}
                          className="mt-3 w-full py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow-2xs cursor-pointer transition-colors"
                        >
                          立即購買
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 儲值法律合規告知 */}
                  <div className="p-3 rounded-xl bg-white/90 border border-amber-200/80 text-[11px] text-stone-600 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      點擊購買即代表您同意
                      <button
                        type="button"
                        onClick={() => openAboutModal('recharge_subscription_terms')}
                        className="text-amber-800 hover:text-amber-900 underline font-bold mx-1 cursor-pointer inline-flex items-center"
                      >
                        《點數儲值與會員方案訂閱服務條款》
                      </button>
                    </span>
                  </div>
                </div>

                {/* 點數異動歷史明細記錄 */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                    <h5 className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>點數異動記錄</span>
                    </h5>

                    {/* 點數記錄篩選器 */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setPointsFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          pointsFilter === 'all'
                            ? 'bg-amber-500 text-stone-950'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        全部
                      </button>
                      <button
                        type="button"
                        onClick={() => setPointsFilter('deposit')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          pointsFilter === 'deposit'
                            ? 'bg-amber-500 text-stone-950'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        儲值+
                      </button>
                      <button
                        type="button"
                        onClick={() => setPointsFilter('spend')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          pointsFilter === 'spend'
                            ? 'bg-amber-500 text-stone-950'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        提問與支付方案-
                      </button>
                      <button
                        type="button"
                        onClick={() => setPointsFilter('refund')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          pointsFilter === 'refund'
                            ? 'bg-amber-500 text-stone-950'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        退還+
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {transactions
                      .filter((tx) => {
                        if (pointsFilter === 'deposit') return tx.type.includes('儲值');
                        if (pointsFilter === 'spend') return tx.type.includes('懸賞') || tx.type.includes('方案') || tx.type.includes('解鎖');
                        if (pointsFilter === 'refund') return tx.type.includes('退') || tx.type.includes('原路');
                        return true;
                      })
                      .map((tx) => {
                        const isPlus = tx.type.includes('儲值') || tx.type.includes('退');
                        return (
                          <div
                            key={tx.id}
                            className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between text-xs hover:border-amber-300 transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    isPlus
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {tx.type}
                                </span>
                                <span className="font-bold text-stone-900">
                                  {tx.relatedQuestionTitle || tx.note || '點數帳本異動'}
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-400 mt-0.5">
                                時間：{tx.createdAt.split('T')[0]} • 狀態：{tx.status}
                              </div>
                            </div>

                            <div className="text-right">
                              <span
                                className={`font-black font-mono text-sm ${
                                  isPlus ? 'text-emerald-600' : 'text-stone-900'
                                }`}
                              >
                                {isPlus ? `+ ${tx.amount.toLocaleString()} 點` : `- ${tx.amount.toLocaleString()} 點`}
                              </span>
                              <span className="text-[10px] text-stone-400 block font-mono">
                                點數核算確認
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
          )
        )}

        {/* TAB: 問題管理 (我的提問、收藏問題、客戶問題/諮詢) */}
        {activeTab === 'questions_management' && (
          <div className="space-y-5">
            {/* 子分頁 Pills 切換 */}
            <div className="p-1.5 bg-stone-100/80 rounded-2xl flex items-center gap-1.5 border border-stone-200/80">
              <button
                type="button"
                onClick={() => setQuestionSubTab('my_questions')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  questionSubTab === 'my_questions'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <span>🙋 我發布的提問</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-800">
                  {myQuestions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQuestionSubTab('bookmarked_questions')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  questionSubTab === 'bookmarked_questions'
                    ? 'bg-white text-amber-950 shadow-2xs border border-amber-300'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>收藏的問題</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-mono">
                  {bookmarkedQuestions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQuestionSubTab('client_questions')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  questionSubTab === 'client_questions'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>客戶問題/諮詢</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 font-mono">
                  {clientQuestions.length}
                </span>
              </button>
            </div>

            {/* 子頁面 1: 我發布的提問 */}
            {questionSubTab === 'my_questions' && (
              <div className="space-y-3">
                {myQuestions.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
                    <HelpCircle className="w-10 h-10 text-stone-300 mx-auto" />
                    <div>
                      <h4 className="font-bold text-sm text-stone-800">您目前尚未發布任何商業或技術問題</h4>
                      <p className="text-xs text-stone-500 mt-1">提出的痛點或懸賞需求將會在此即時列出並追蹤解答進度</p>
                    </div>
                  </div>
                ) : (
                  myQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-amber-300 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectCategory) {
                                onSelectCategory(q.category, q.subcategory || '全部');
                                onClose();
                              }
                            }}
                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-950 transition-colors cursor-pointer border border-stone-200 hover:border-amber-300"
                            title="直達該子領域看板"
                          >
                            {q.category} · {q.subcategory}
                          </button>
                          {(q.bounty || 0) > 0 ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono">
                              懸賞 NT$ {(q.bounty || 0).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                              免費提案
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              q.status === 'delisted'
                                ? 'bg-rose-100 text-rose-800'
                                : q.status === 'solved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {q.status === 'delisted' ? '⚠️ 已違規下架' : q.status === 'solved' ? '✓ 已採納結案' : '💬 招募中'}
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400">{q.createdAt}</span>
                      </div>

                      <h4
                        onClick={() => {
                          onClose();
                          onOpenQuestion(q.id);
                        }}
                        className="font-extrabold text-sm text-stone-900 hover:text-amber-700 cursor-pointer line-clamp-1"
                      >
                        {q.title}
                      </h4>
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{q.description}</p>

                      {/* 違規下架反饋說明 */}
                      {q.status === 'delisted' && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 my-1">
                          <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>此問題已被管理員判定違規下架</span>
                          </div>
                          {q.delistedReason && (
                            <p className="text-rose-700 text-[11px]">違規原因：{q.delistedReason}</p>
                          )}
                          {q.delistedFeedback && (
                            <p className="text-stone-600 text-[11px] bg-white/80 p-2 rounded border border-rose-100 mt-1">
                              官方處置反饋：{q.delistedFeedback}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tags list */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-stone-400" />
                          <span>標籤：</span>
                        </span>
                        {q.tags && q.tags.length > 0 ? (
                          q.tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setSearchQuery(tag);
                                onClose();
                              }}
                              className="text-[10px] font-semibold text-amber-950 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 px-2 py-0.2 rounded-md border border-amber-200/80 cursor-pointer transition-colors"
                              title={`搜尋 #${tag}`}
                            >
                              #{tag}
                            </button>
                          ))
                        ) : (
                          <span className="text-[10px] text-stone-400">已自動適配主要領域</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-3 text-stone-500">
                          <span>解答數：<strong className="text-stone-900">{q.answersCount}</strong> 則</span>
                          <span>觀看數：<strong className="text-stone-900">{(q.views ?? q.viewsCount ?? 0).toLocaleString()}</strong> 次</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenQuestion(q.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
                        >
                          查看提問詳情與解答
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 子頁面 2: 收藏的問題 */}
            {questionSubTab === 'bookmarked_questions' && (
              <div className="space-y-3">
                {bookmarkedQuestions.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
                    <Star className="w-10 h-10 text-stone-300 mx-auto" />
                    <div>
                      <h4 className="font-bold text-sm text-stone-800">尚未收藏任何問題</h4>
                      <p className="text-xs text-stone-500 mt-1">在市場瀏覽問題時點擊星號，即可在此方便列出追蹤</p>
                    </div>
                  </div>
                ) : (
                  bookmarkedQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-amber-300 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={q.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={q.authorName} className="w-6 h-6 rounded-full object-cover" />
                          <span className="text-xs font-bold text-stone-800">
                            {q.authorName}
                            {q.authorTitle ? ` · ${q.authorTitle}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectCategory) {
                                onSelectCategory(q.category, q.subcategory || '全部');
                                onClose();
                              }
                            }}
                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-950 transition-colors cursor-pointer border border-stone-200 hover:border-amber-300"
                            title="直達該領域看板"
                          >
                            {q.category} {q.subcategory ? `· ${q.subcategory}` : ''}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleBookmarkQuestion(q.id)}
                          className="text-amber-500 hover:text-stone-400 p-1 cursor-pointer"
                          title="取消收藏"
                        >
                          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                        </button>
                      </div>

                      <h4
                        onClick={() => {
                          onClose();
                          onOpenQuestion(q.id);
                        }}
                        className="font-extrabold text-sm text-stone-900 hover:text-amber-700 cursor-pointer line-clamp-1"
                      >
                        {q.title}
                      </h4>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-black text-amber-900 font-mono">
                          {(q.bounty || 0) > 0 ? `懸賞 NT$ ${(q.bounty || 0).toLocaleString()}` : '免費諮詢提案'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenQuestion(q.id);
                          }}
                          className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                        >
                          前往問題頁面 →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 子頁面 3: 客戶問題/諮詢 */}
            {questionSubTab === 'client_questions' && (
              <div className="space-y-3">
                {clientQuestions.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
                    <Briefcase className="w-10 h-10 text-stone-300 mx-auto" />
                    <div>
                      <h4 className="font-bold text-sm text-stone-800">暫無進行中的客戶問題或專屬定向邀請</h4>
                      <p className="text-xs text-stone-500 mt-1">提問者發布與您相關領域的需求或定向邀請時會在此顯示</p>
                    </div>
                  </div>
                ) : (
                  clientQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-gradient-to-r from-stone-50 to-white border border-stone-200/90 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={q.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={q.authorName} className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-300" />
                          <div>
                            <span className="text-xs font-extrabold text-stone-900 block">{q.authorName}（客戶需求）</span>
                            <span className="text-[10px] text-stone-500">{q.authorTitle || '提問委託方'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-mono">
                            懸賞/金額 NT$ {(q.bounty || 0).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectCategory) {
                                onSelectCategory(q.category, q.subcategory || '全部');
                                onClose();
                              }
                            }}
                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-950 transition-colors cursor-pointer border border-stone-200 hover:border-amber-300"
                            title="直達該領域看板"
                          >
                            {q.category} {q.subcategory ? `· ${q.subcategory}` : ''}
                          </button>
                        </div>
                      </div>

                      <h4
                        onClick={() => {
                          onClose();
                          onOpenQuestion(q.id);
                        }}
                        className="font-extrabold text-sm text-stone-900 hover:text-amber-700 cursor-pointer line-clamp-1"
                      >
                        {q.title}
                      </h4>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                        <span className="text-[11px] text-stone-500">
                          {q.invitedSolverIds?.includes(currentUser.id) ? '✉️ 客戶專屬定向邀請解題' : '💬 已參與解題提案'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              startDirectChat(
                                { id: q.authorId, name: q.authorName, avatar: q.authorAvatar, title: q.authorTitle || '提問者' },
                                q
                              );
                              onClose();
                            }}
                            className="px-3 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
                          >
                            線上私聊諮詢
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenQuestion(q.id);
                            }}
                            className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
                          >
                            查看並提交方案
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: 實名認證 (KYC) */}
        {activeTab === 'real_name_auth' && <RealNameAuthTab />}

        {/* TAB: 專家認證資格審查 */}
        {activeTab === 'expert_certification' && <ExpertCertificationTab />}

        {/* TAB: 個人數據與榮譽牆 */}
        {activeTab === 'honors_achievements' && (
          <div className="space-y-6">
            {/* 個人榮譽數據核心卡 */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-white shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-3 text-left hover:opacity-90 transition-all cursor-pointer group"
                  title="點擊前往帳號設定頁"
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={currentUser.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-400/80 shrink-0 group-hover:ring-amber-300 transition-all"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg text-white group-hover:text-amber-300 transition-colors">{currentUser.name}</h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                        殿堂金牌專家
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/80 mt-0.5">{currentUser.title || '領域顧問專家'}</p>
                  </div>
                </button>

                <div className="text-right">
                  <span className="text-xs text-stone-400 block font-bold">個人聲望點數</span>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {(currentUser.reputationPoints || (isDemoMode ? 1480 : 0)).toLocaleString()} <span className="text-xs text-stone-300">PTS</span>
                  </span>
                </div>
              </div>

              {/* 核心數據統計 4 欄 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[11px] text-stone-400 block font-semibold">解題總採納率</span>
                  <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">
                    {currentUser.acceptanceRate ?? (isDemoMode ? '92.5' : '100')} %
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[11px] text-stone-400 block font-semibold">獲得交易好評</span>
                  <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{currentUser.rating ? Number(currentUser.rating).toFixed(1) : (isDemoMode ? '4.95' : '5.0')}</span>
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[11px] text-stone-400 block font-semibold">解題被採納數</span>
                  <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">
                    {userAcceptedAnswers.length || (isDemoMode ? 18 : 0)} 題
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[11px] text-stone-400 block font-semibold">痛點發布數</span>
                  <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">
                    {myQuestions.length} 題
                  </span>
                </div>
              </div>
            </div>

            {/* 解答難度等級 (L0 ~ L4) 解鎖分佈牆 */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h4 className="font-extrabold text-sm text-stone-900">個人解答困難度等級解鎖分佈 (L0~L4)</h4>
                </div>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  實戰經驗認證
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                {['L0 免費痛點', 'L1 入門實戰', 'L2 進階應用', 'L3 專家級', 'L4 殿堂級'].map((lvl, idx) => {
                  const counts = [12, 8, 15, 6, 2];
                  return (
                    <div
                      key={lvl}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1"
                    >
                      <span className="text-[10px] font-bold text-stone-500 block">{lvl}</span>
                      <span className="text-base font-black text-stone-900 font-mono block">
                        {counts[idx]} <span className="text-[10px] text-stone-400">題解鎖</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 榮譽成就徽章牆 */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                <Award className="w-5 h-5 text-amber-600" />
                <h4 className="font-extrabold text-sm text-stone-900">個人榮譽成就徽章牆</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400 text-stone-950 font-black flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    🏆
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-stone-900">創點子連續採納王</h5>
                    <p className="text-[11px] text-stone-600 mt-0.5">累計超過 10 個專屬落地方案獲得提問者滿分好評採納</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white font-black flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    ⭐
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-stone-900">零負評極致口碑</h5>
                    <p className="text-[11px] text-stone-600 mt-0.5">解答與諮詢服務交易評價維持 4.9 星以上超高評價</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500 text-white font-black flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    ⚡
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-stone-900">極速響應先鋒</h5>
                    <p className="text-[11px] text-stone-600 mt-0.5">接到提問後平均於 30 分鐘內給予專業諮詢與初稿建議</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-500 text-white font-black flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    👑
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-stone-900">L4 殿堂解題大使</h5>
                    <p className="text-[11px] text-stone-600 mt-0.5">成功攻克高難度 L4 殿堂級商業難題並完成第三方撥款驗收</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: 切換帳號 */}
        {activeTab === 'switch_account' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Banner */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900">切換帳號</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    平台支援即時切換不同角色的帳號，無縫體驗提問者、認證專家與管理員功能
                  </p>
                </div>
              </div>
            </div>

            {/* Google 1-Click Fast Login / Switch Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-white to-amber-50/50 border-2 border-stone-200 hover:border-blue-400 transition-all shadow-xs">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-stone-200 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                      <span>使用 Google 帳號一鍵快速登入</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">官方推薦</span>
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      串接 Firebase Google 授權，免輸入密碼即可安全完成身分登入或切換
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs transition-all shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <span>開啟 Google 一鍵登入</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Current Active Account Indicator */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-3 text-left hover:opacity-85 transition-all cursor-pointer group"
                title="點擊前往帳號設定頁"
              >
                <img src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={currentUser.name} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-400 shrink-0 group-hover:ring-amber-500 transition-all" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-stone-900 group-hover:text-amber-600 transition-colors">{currentUser.name}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                      目前登入使用中
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        currentUser.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : currentUser.role === 'solver'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {currentUser.role === 'admin'
                        ? '平台管理員'
                        : currentUser.role === 'solver'
                        ? (currentUser.verifiedExpert || currentUser.verifiedBadge || userAcceptedAnswers.length >= 50
                            ? '認證專家'
                            : '解答者')
                        : '提問者'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{currentUser.title || '一般會員用戶'} • 點數餘額 NT$ {(currentUser.balance || 0).toLocaleString()}</p>
                </div>
              </button>

              {currentUser.role !== 'admin' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => switchRole(currentUser.role === 'solver' ? 'questioner' : 'solver')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="切換提問者 / 解答者身份"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>切換為{currentUser.role === 'solver' ? '提問者' : '解答者'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 text-xs font-black flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-700" />
                    <span>管理員身分固定不可變換</span>
                  </span>
                </div>
              )}
            </div>

            {/* Available Accounts Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>所有可切換帳號</span>
                </h4>
                <span className="text-[11px] text-stone-400">共 {availableUsers.length} 組帳號</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableUsers.map((u) => {
                  const isCurrent = currentUser.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        if (isCurrent) return;
                        setPendingSwitchUser(u);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-amber-50/40 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={u.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-stone-200 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-stone-900 truncate">{u.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                                使用中
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-1">
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : u.role === 'solver'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {u.role === 'admin' ? '管理員' : u.role === 'solver' ? '解答者' : '提問者'}
                            </span>
                            <span className="truncate">{u.title || '領域用戶'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">點數餘額 NT$ {(u.balance || 0).toLocaleString()}</span>
                        <span className={`font-bold ${isCurrent ? 'text-amber-900 font-black' : 'text-amber-600'}`}>
                          {isCurrent ? '當前帳號' : '切換此帳號 →'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Register New Account */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                      註冊新帳號
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      即時建立自訂新身分，建立後將自動登入並贈送 1,000 點體驗金
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddUserForm ? '收合表單' : '快速註冊新帳號'}</span>
                </button>
              </div>

              {showAddUserForm && (
                <div className="pt-3 border-t border-amber-200/80 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        使用者姓名 / 暱稱 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newRegName}
                        onChange={(e) => setNewRegName(e.target.value)}
                        placeholder="例如：Alex Chen"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        初始角色偏好
                      </label>
                      <select
                        value={newRegRole}
                        onChange={(e) => setNewRegRole(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      >
                        <option value="questioner">提問委託方（提問者）</option>
                        <option value="solver">認證專家（解答者）</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        頭銜或專業領域
                      </label>
                      <input
                        type="text"
                        value={newRegTitle}
                        onChange={(e) => setNewRegTitle(e.target.value)}
                        placeholder="例如：資深全端工程師"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleRegisterNewUser}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      完成註冊並即刻切換登入
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: 轉入點數 (已全面整合至點數與帳務管理) */}
        {activeTab === 'admin_transfer_points' && currentUser.role === 'admin' && (
          <AdminPointsReceivablesTab />
        )}

        {/* TAB: 平台數據與顯示 (管理員帳號專屬) */}
        {activeTab === 'admin_management' && currentUser.role === 'admin' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Banner */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-stone-900">創點子 IdeaX 平台數據與顯示</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      管理員專屬
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    平台獲利數據・首頁公開指標控制・全站抽成與價格管理・會員分佈
                  </p>
                </div>
              </div>
            </div>

            {adminSaveMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{adminSaveMsg}</span>
              </div>
            )}

            {/* 1. 平台獲利數據與即時運營總覽 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  <span>平台獲利數據與即時運營總覽</span>
                </h4>
                <span className="text-[11px] text-stone-400 font-mono">即時統計</span>
              </div>

              <div className={`grid ${isNoPaymentMode ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-3 text-center`}>
                {!isNoPaymentMode && (
                  <>
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                      <span className="text-[11px] text-stone-500 font-bold block">平台總交易流水 (GMV)</span>
                      <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
                        NT$ {(adminTotalGMV || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-stone-400 mt-0.5 block">累計媒合總額</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                      <span className="text-[11px] text-amber-800 font-bold block">平台累計獲利 (淨抽成)</span>
                      <span className="text-xl font-black text-amber-700 font-mono mt-1 block">
                        NT$ {(adminTotalPlatformFees || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-amber-600 mt-0.5 block">平台實收服務費</span>
                    </div>
                  </>
                )}

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500 font-bold block">市場問題總數</span>
                  <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
                    {questions.length} 題
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    招募中 {adminOpenCount} · 已解決 {adminSolvedCount}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500 font-bold block">認證專家智庫</span>
                  <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">
                    {solvers.length} 位
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    官方實名認證 {adminVerifiedSolversCount} 位
                  </span>
                </div>
              </div>
            </div>

            {/* 2. 首頁公開運營數據展示控制 (管理者自訂選擇要公開那些數據) */}
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    <span>首頁公開運營數據展示控制（首頁看板開關）</span>
                  </h4>
                  <p className="text-xs text-amber-900/70 mt-0.5">
                    管理者可自由勾選決定在首頁對外公開呈現的平台真實統計指標，關閉項目將即時於首頁隱藏。
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-950 border border-amber-300 w-fit">
                  已公開 {Object.values(publicMetricsConfig).filter(Boolean).length} / 5 項指標
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {/* Metric 1: 累計解決難題 */}
                <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  publicMetricsConfig.showSolvedCount ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-stone-900">累計解決難題</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">即時計算</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">全站已結案問題與專家已採納方案總數</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePublicMetricsConfig({ showSolvedCount: !publicMetricsConfig.showSolvedCount })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      publicMetricsConfig.showSolvedCount ? 'bg-amber-500' : 'bg-stone-300'
                    }`}
                    title={publicMetricsConfig.showSolvedCount ? '點擊隱藏此指標' : '點擊公開此指標'}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      publicMetricsConfig.showSolvedCount ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Metric 2: 累計懸賞金額 */}
                <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  publicMetricsConfig.showTotalBounty ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-stone-900">累計懸賞金額</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">NT$ 即時統計</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">全站已發布問題與已完成交易方案之懸賞總額</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePublicMetricsConfig({ showTotalBounty: !publicMetricsConfig.showTotalBounty })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      publicMetricsConfig.showTotalBounty ? 'bg-amber-500' : 'bg-stone-300'
                    }`}
                    title={publicMetricsConfig.showTotalBounty ? '點擊隱藏此指標' : '點擊公開此指標'}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      publicMetricsConfig.showTotalBounty ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Metric 3: 平均回覆速度 */}
                <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  publicMetricsConfig.showAvgResponseSpeed ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-stone-900">平均回覆速度</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">時效指標</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">全體專家諮詢方案平均回覆工時</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePublicMetricsConfig({ showAvgResponseSpeed: !publicMetricsConfig.showAvgResponseSpeed })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      publicMetricsConfig.showAvgResponseSpeed ? 'bg-amber-500' : 'bg-stone-300'
                    }`}
                    title={publicMetricsConfig.showAvgResponseSpeed ? '點擊隱藏此指標' : '點擊公開此指標'}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      publicMetricsConfig.showAvgResponseSpeed ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Metric 4: 方案採納滿意度 */}
                <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  publicMetricsConfig.showSatisfactionRate ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-stone-900">方案採納滿意度</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">% 滿意度</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">專家星級口碑與方案採納滿意回饋率</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePublicMetricsConfig({ showSatisfactionRate: !publicMetricsConfig.showSatisfactionRate })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      publicMetricsConfig.showSatisfactionRate ? 'bg-amber-500' : 'bg-stone-300'
                    }`}
                    title={publicMetricsConfig.showSatisfactionRate ? '點擊隱藏此指標' : '點擊公開此指標'}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      publicMetricsConfig.showSatisfactionRate ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Metric 5: 當前最高賞金 */}
                <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  publicMetricsConfig.showHighestBounty ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-stone-900">當前最高賞金</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">熱門導流</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">即時抓取全站最高單題懸賞金額並導流排行</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePublicMetricsConfig({ showHighestBounty: !publicMetricsConfig.showHighestBounty })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      publicMetricsConfig.showHighestBounty ? 'bg-amber-500' : 'bg-stone-300'
                    }`}
                    title={publicMetricsConfig.showHighestBounty ? '點擊隱藏此指標' : '點擊公開此指標'}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      publicMetricsConfig.showHighestBounty ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Firebase Cloud Firestore 雲端資料庫狀態與一鍵備份 (位於頁面最下方，重新分類版) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-stone-50 border border-purple-200/90 shadow-2xs space-y-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-stone-900 flex items-center gap-1.5">
                        <span>Firebase Cloud Firestore 雲端資料庫（全站四大範疇持久化）</span>
                      </h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        isFirestoreConnected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isFirestoreConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        <span>{isFirestoreConnected ? '已連線・全自動即時同步' : '離線快取模式'}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      專案 ID：<code className="text-purple-700 font-mono font-bold">ideax-2af9c</code> · 資料庫：<code className="text-stone-600 font-mono text-[10px]">ai-studio-ideax-6902feae-e5d6-4a4d-84d3-58e8b342c54c</code>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCloudSyncing}
                  onClick={async () => {
                    setIsCloudSyncing(true);
                    setCloudSyncReport(null);
                    try {
                      const res = await syncAllToCloud();
                      if (res.success) {
                        const { coreTransactions, identityGovernance, engagementSocial, complianceSettings } = res.categories;
                        setCloudSyncReport(
                          `同步成功！全站四大類別已完整寫入 Firestore：\n` +
                          `• 業務核心交易：${coreTransactions.questions} 道問題、${coreTransactions.answers} 份提案、${coreTransactions.transactions} 筆交易流水、${coreTransactions.conversations} 組私聊對話\n` +
                          `• 身分審核治理：${identityGovernance.users} 位用戶、${identityGovernance.certifications} 筆專家與實名審核、${identityGovernance.auditLogs} 筆稽核日誌\n` +
                          `• 互動通知評價：${engagementSocial.notifications} 則通知、${engagementSocial.bookmarks} 筆收藏、${engagementSocial.solvers} 位專家評鑑庫\n` +
                          `• 法律合規設定：${complianceSettings.termsAgreements} 筆條款簽署存證、全站抽成與方案設定`
                        );
                      } else {
                        setCloudSyncReport(res.message);
                      }
                    } catch (e: any) {
                      setCloudSyncReport(`同步異常: ${e?.message || '未知錯誤'}`);
                    } finally {
                      setIsCloudSyncing(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isCloudSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在分類寫入雲端資料庫...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>全量分類寫入雲端資料庫</span>
                    </>
                  )}
                </button>
              </div>

              {/* 重新分類後的四大業務範疇 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-purple-100 text-xs">
                {/* 範疇 1: 業務核心與交易類 */}
                <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      <span>1. 業務核心與交易類</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">4 個集合</span>
                  </div>
                  <ul className="text-[11px] text-stone-600 space-y-0.5">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>questions</strong>：問題懸賞、難度、AI標籤</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>answers</strong>：提案解法、里程碑交付驗收</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>transactions</strong>：點數流水、儲值、託管放款</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>conversations</strong>：私聊商議、報價、調解</span>
                    </li>
                  </ul>
                </div>

                {/* 範疇 2: 用戶身分與審核治理類 */}
                <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>2. 用戶身分與治理類</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">3 個集合</span>
                  </div>
                  <ul className="text-[11px] text-stone-600 space-y-0.5">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>users</strong>：帳號身分、點數餘額、銀行資料</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>certifications</strong>：實名認證與專家證書審查</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>audit_logs</strong>：管理員5萬配額與封鎖日誌</span>
                    </li>
                  </ul>
                </div>

                {/* 範疇 3: 互動通知與評價體系類 */}
                <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                      <span>3. 互動通知與評價類</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-800">3 個集合</span>
                  </div>
                  <ul className="text-[11px] text-stone-600 space-y-0.5">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>notifications</strong>：AI媒合、交付提醒、公告</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>bookmarks</strong>：用戶精選題目追蹤收藏</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>solvers</strong>：專家智庫檔案、評價與滿意度</span>
                    </li>
                  </ul>
                </div>

                {/* 範疇 4: 法律合規與平台設定類 */}
                <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>4. 法律合規與設定類</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">2 個集合</span>
                  </div>
                  <ul className="text-[11px] text-stone-600 space-y-0.5">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>terms_agreements</strong>：條款同意戳記存證</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span><strong>platform_settings</strong>：抽成率、方案、指標開關</span>
                    </li>
                  </ul>
                </div>
              </div>

              {cloudSyncReport && (
                <div className="p-3.5 rounded-xl bg-purple-100/90 text-purple-950 font-bold text-xs whitespace-pre-line border border-purple-300 leading-relaxed shadow-2xs">
                  {cloudSyncReport}
                </div>
              )}

              {lastSyncTime && (
                <div className="text-[10px] text-stone-400 flex items-center justify-between">
                  <span>✨ 平台自動監聽狀態變更：用戶發題、回答、審核、儲值、轉入點數皆會即時寫入雲端</span>
                  <span>最近寫入時間：{lastSyncTime}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: 個人中心 (帳號資訊、身份切換、解答者公開資料與隱私設定) */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {currentUser.role === 'admin' ? (
              /* 管理員專屬：席位與安全治理設定（無個人個資、無問卷、無專家審查、無條款簽署） */
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* 1. 管理員席位身份卡片 */}
                <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-stone-900 via-purple-950 to-stone-950 text-white border border-purple-800/40 shadow-lg space-y-4">
                  <div className="flex flex-row items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={currentUser.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-purple-400 shadow-md"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500 border-2 border-stone-900 flex items-center justify-center text-white text-[10px]">
                          <ShieldCheck className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-white truncate">{currentUser.name}</h3>
                          <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-400/30 shrink-0">
                            平台超級管理員席位
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-purple-200/80 mt-0.5 line-clamp-2">
                          最高系統權限 (Super Administrator) · 全站治理、仲裁調解、金流託管與風控中樞
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] sm:text-[10px] text-purple-300 font-mono block">席位安全識別號</span>
                      <span className="text-[10px] sm:text-xs font-mono font-black text-amber-400 whitespace-nowrap">ROOT-SEC-ADMIN-001</span>
                    </div>
                  </div>

                  {/* 席位特權與治理範圍 (手機版與電腦版皆為 3 欄並排) */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[9px] sm:text-[10px] text-purple-300 font-bold block flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">治理權限範圍</span>
                      </span>
                      <p className="text-[11px] sm:text-xs font-bold text-white truncate">全域覆蓋</p>
                      <span className="text-[9px] sm:text-[10px] text-stone-400 block line-clamp-2 leading-tight">題目稽核、用戶審查、全站營運</span>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[9px] sm:text-[10px] text-purple-300 font-bold block flex items-center gap-1">
                        <Shield className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="truncate">雙因子 (2FA)</span>
                      </span>
                      <p className="text-[11px] sm:text-xs font-bold text-emerald-400 flex items-center gap-1 truncate">
                        <span>已強制啟用</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      </p>
                      <span className="text-[9px] sm:text-[10px] text-stone-400 block line-clamp-2 leading-tight">硬體憑證與受信任連線</span>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[9px] sm:text-[10px] text-purple-300 font-bold block flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">每日治理配額</span>
                      </span>
                      <p className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 truncate">50,000 點 / 日</p>
                      <span className="text-[9px] sm:text-[10px] text-stone-400 block line-clamp-2 leading-tight">活動激勵、爭議補償專用</span>
                    </div>
                  </div>
                </div>

                {/* 2. 系統安全與敏感操作防護狀態 (手機版與電腦版皆為 2 欄並排) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                      <h4 className="text-xs sm:text-sm font-black text-stone-900">
                        管理員安全與底層運營防護機制
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                      安全狀態正常
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-stone-900 block text-[11px] sm:text-xs truncate">二次確認保護</span>
                        <p className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">
                          開啟關閉測試環境與隱藏測試帳號受二次確認保護。
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-stone-900 block text-[11px] sm:text-xs truncate">裁決派發郵件</span>
                        <p className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">
                          案件裁決自動生成罐頭文字派發至信箱與通知中心。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. 管理員功能中心快捷入口 (手機版與電腦版皆為 3 欄 6 宮格並排) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
                  <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                    <span>管理員後台樞紐快捷入口</span>
                  </h4>

                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className="p-2.5 sm:p-3 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50/30 text-left transition-all cursor-pointer group"
                    >
                      <LayoutGrid className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-black text-[11px] sm:text-xs text-stone-900 block truncate">功能總覽儀表板</span>
                      <span className="text-[9px] sm:text-[10px] text-stone-500 block truncate">環境開關與營運概覽</span>
                    </button>

                    {!isNoPaymentMode && isDemoMode && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('admin_mail_disputes')}
                        className="p-2.5 sm:p-3 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50/30 text-left transition-all cursor-pointer group"
                      >
                        <Mail className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-[11px] sm:text-xs text-stone-900 block truncate">申訴與郵件</span>
                        <span className="text-[9px] sm:text-[10px] text-stone-500 block truncate">案件仲裁與官方通知</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('admin_management')}
                      className="p-2.5 sm:p-3 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50/30 text-left transition-all cursor-pointer group"
                    >
                      <Sliders className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-black text-[11px] sm:text-xs text-stone-900 block truncate">平台數據與顯示</span>
                      <span className="text-[9px] sm:text-[10px] text-stone-500 block truncate">抽成費率與前台指標</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('admin_user_analytics')}
                      className="p-2.5 sm:p-3 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50/30 text-left transition-all cursor-pointer group"
                    >
                      <BarChart3 className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-black text-[11px] sm:text-xs text-stone-900 block truncate">用戶習慣與調研</span>
                      <span className="text-[9px] sm:text-[10px] text-stone-500 block truncate">圖表分析與 Excel 匯出</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('points_receivables')}
                      className="p-2.5 sm:p-3 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50/30 text-left transition-all cursor-pointer group"
                    >
                      <Coins className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-black text-[11px] sm:text-xs text-stone-900 block truncate">點數與應收帳款</span>
                      <span className="text-[9px] sm:text-[10px] text-stone-500 block truncate">帳目託管與提領審核</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('admin_certifications')}
                      className="p-2.5 sm:p-3 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50/30 text-left transition-all cursor-pointer group"
                    >
                      <BadgeCheck className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-black text-[11px] sm:text-xs text-stone-900 block truncate">受理認證審核</span>
                      <span className="text-[9px] sm:text-[10px] text-stone-500 block truncate">實名與專家資格審批</span>
                    </button>
                  </div>
                </div>

                {/* 4. 特殊環境開關 (共用相對開關 + 權限範圍) */}
                <div id="environment-controls-section-admin" className="p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800 text-stone-300 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-stone-200 text-xs">特殊環境開關控制</span>
                    </div>
                    <span className="text-[10px] text-stone-400">
                      運營模式全站生效 • 測試環境僅管理員視角
                    </span>
                  </div>

                  {/* 三大平台運營模式切換：測試環境 (TEST) vs 正式營運模式 (NORM) vs 無金流模式 (FREE) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-stone-300">平台運營模式（三選一專屬模式切換）</span>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">
                        {isDemoMode ? 'TEST (預設測試中)' : isNoPaymentMode ? 'FREE (無金流)' : 'NORM (正常營運)'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-950/80 rounded-xl border border-stone-800">
                      {/* 🟢 正式營運模式 (NORM) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!(!isNoPaymentMode && !isDemoMode)) {
                            setPendingModeConfirm({ type: 'liveOperation', nextState: true });
                          }
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          !isNoPaymentMode && !isDemoMode
                            ? 'bg-emerald-500 text-stone-950 shadow-md font-black ring-1 ring-emerald-300'
                            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                        }`}
                        title="切換至正常營運模式 (保留點數機制，純淨交易額)"
                      >
                        <span>🟢 正常營運</span>
                        <span className="text-[9px] opacity-80 font-mono">(NORM)</span>
                      </button>

                      {/* ⚡ 無金流模式 (FREE) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!(isNoPaymentMode && !isDemoMode)) {
                            setPendingModeConfirm({ type: 'noPayment', nextState: true });
                          }
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isNoPaymentMode && !isDemoMode
                            ? 'bg-rose-500 text-white shadow-md font-black ring-1 ring-rose-400'
                            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                        }`}
                        title="切換至無金流模式 (全站免點數，隱藏金流)"
                      >
                        <span>⚡ 無金流</span>
                        <span className="text-[9px] opacity-80 font-mono">(FREE)</span>
                      </button>

                      {/* 🧪 測試環境 (TEST) - 移至無金流右方 */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!isDemoMode) {
                            setPendingModeConfirm({ type: 'demo', nextState: true });
                          }
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isDemoMode
                            ? 'bg-amber-400 text-stone-950 shadow-md font-black ring-1 ring-amber-300'
                            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                        }`}
                        title={isDemoMode ? '目前處於測試環境（預設開啟，開啟一般或無金流模式即可切換）' : '切換至測試環境'}
                      >
                        <span>🧪 測試環境</span>
                        <span className="text-[9px] opacity-80 font-mono">(TEST)</span>
                      </button>
                    </div>
                  </div>

                  {/* 輔助測試設定：測試環境 (DEMO) 與 隱藏測試帳號 (HIDE) */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-stone-800/60">
                    {/* 測試環境（僅管理員畫面） */}
                    <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800 flex items-center justify-between gap-1">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-200 truncate">測試環境 (DEMO)</span>
                        <span className="text-[9px] text-stone-500">僅作用於管理員帳號</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingModeConfirm({ type: 'demo', nextState: !isDemoMode })}
                        className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                          isDemoMode
                            ? 'bg-amber-400 text-stone-950 hover:bg-amber-300'
                            : 'bg-stone-700 text-stone-100 hover:bg-stone-600'
                        }`}
                      >
                        {isDemoMode ? '已開啟' : '開啟'}
                      </button>
                    </div>

                    {/* 隱藏測試帳號 */}
                    <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800 flex items-center justify-between gap-1">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-200 truncate">測試帳號顯示</span>
                        <span className="text-[9px] text-stone-500">全站平台同步</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingModeConfirm({ type: 'hideTestAccounts', nextState: !isHideTestAccounts })}
                        className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer font-mono ${
                          isHideTestAccounts
                            ? 'bg-purple-400 text-stone-950 hover:bg-purple-300'
                            : 'bg-stone-700 text-stone-100 hover:bg-stone-600'
                        }`}
                      >
                        {isHideTestAccounts ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 一般會員（提問者 / 解答者）個人資料設定、問卷、專家審查與條款簽署 */
              <div className="space-y-6">
                {/* 身份切換區域 */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-sm text-amber-950">
                      目前模式：{currentUser.role === 'solver' ? '解答者模式' : '提問者模式'}
                    </span>
                    <HelpTooltip
                      title="身份切換說明"
                      content="一般會員帳號可隨時在提問者與解答者身份間切換，無須額外註冊。提問發布與方案解題隨時無縫使用。"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => switchRole('questioner')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentUser.role === 'questioner'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      提問者身份
                    </button>
                    <button
                      type="button"
                      onClick={() => switchRole('solver')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentUser.role === 'solver'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      解答者身份
                    </button>
                  </div>
                </div>

            {/* 手機/平板端子分頁切換列 (大螢幕 xl 則雙欄並排：問卷在右側) */}
            <div className="xl:hidden flex items-center gap-2 p-1.5 bg-stone-100/90 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setProfileSubTab('basic')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  profileSubTab === 'basic'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>基本資料與帳戶設定</span>
              </button>
              <button
                type="button"
                onClick={() => setProfileSubTab('survey')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  profileSubTab === 'survey'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>問卷(客戶調查)・完成即送會員</span>
              </button>
            </div>

            {/* 雙欄主容器：大螢幕時問卷位於基本資料右側 */}
            <div className="xl:grid xl:grid-cols-12 xl:gap-6 items-start space-y-6 xl:space-y-0">
              {/* 左側欄：個人基本資料與收退款帳戶（個別獨立儲存） */}
              <div className={`xl:col-span-7 space-y-6 ${profileSubTab === 'basic' ? 'block' : 'hidden xl:block'}`}>
                {/* 1. 基本帳號資訊 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-2xs">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-stone-900">個人基本資料</h4>
                        <p className="text-[11px] text-stone-500">維持最新個人資訊以利商案對接與實名專家認證</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold border border-stone-200">
                      個別獨立儲存
                    </span>
                  </div>

                  {/* 個人頭像照片上傳 */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative group shrink-0">
                        <img
                          src={avatar || currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={currentUser.name}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-stone-200 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute inset-0 bg-stone-900/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                          title="點擊選取新頭像照片"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-stone-900">個人頭像照片</h5>
                        <p className="text-[11px] text-stone-500">
                          支援常見圖檔（單檔 2MB 內），更換時自動覆蓋原檔案。
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 self-stretch sm:self-auto">
                      <input
                        type="file"
                        ref={avatarInputRef}
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-600" />
                        <span>更換頭像照片</span>
                      </button>
                    </div>
                  </div>

                  {avatarError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold flex items-center gap-1.5 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{avatarError}</span>
                    </div>
                  )}

                  {/* 姓名與專業頭銜 */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/90 text-xs text-amber-950 font-medium space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>用戶名稱顯示規則：</span>
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      • <strong>解答者身分</strong>：為建立專業信譽與智庫形象，全站一律公開顯示<strong>「姓名/暱稱 · 專業頭銜/職位」</strong>。<br />
                      • <strong>提問者身分</strong>：為保護提問商業隱私，系統預設<strong>隱藏頭銜</strong>（僅顯示姓名/暱稱）；您可於下方「提問者隱私設定」自由開啟顯示<strong>「姓名/暱稱 · 專業頭銜」</strong>。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">姓名 / 暱稱 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">專業頭銜 / 職位 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例如：資深全端工程師、品牌行銷顧問"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* 依序包含：性別、年齡、專業領域、薪水 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">性別認同 <span className="text-rose-500">*</span></label>
                      <select
                        value={userGender}
                        onChange={(e) => setUserGender(e.target.value as any)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                      >
                        <option value="male">男性 (Male)</option>
                        <option value="female">女性 (Female)</option>
                        <option value="other">其他多元性別 (Other)</option>
                        <option value="undisclosed">不便透露 (Prefer not to say)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">年齡層級 <span className="text-rose-500">*</span></label>
                      <select
                        value={userAgeGroup}
                        onChange={(e) => setUserAgeGroup(e.target.value as any)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                      >
                        <option value="under_18">18 歲以下</option>
                        <option value="18_24">18 ~ 24 歲</option>
                        <option value="25_34">25 ~ 34 歲</option>
                        <option value="35_44">35 ~ 44 歲</option>
                        <option value="45_54">45 ~ 54 歲</option>
                        <option value="55_above">55 歲以上</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">核心專業領域 <span className="text-rose-500">*</span></label>
                      <select
                        value={domain}
                        onChange={(e) => setDomain(e.target.value as any)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                      >
                        <option value="創新創業">創新創業 (Startup & Venture)</option>
                        <option value="資訊科技">資訊科技 (Tech & Software)</option>
                        <option value="商業行銷">商業行銷 (Marketing & Growth)</option>
                        <option value="設計創意">設計創意 (Design & Creative)</option>
                        <option value="法律合規">法律合規 (Legal & Compliance)</option>
                        <option value="金融投資">金融投資 (Finance & Investment)</option>
                        <option value="營運管理">營運管理 (Operations & Management)</option>
                        <option value="日常綜合">日常綜合 (General & Others)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">目前薪水 (年薪區間) <span className="text-rose-500">*</span></label>
                      <select
                        value={userAnnualSalary}
                        onChange={(e) => setUserAnnualSalary(e.target.value as any)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                      >
                        <option value="under_500k">未滿 50 萬</option>
                        <option value="500k_1000k">50 萬 - 100 萬</option>
                        <option value="1000k_2000k">100 萬 - 200 萬</option>
                        <option value="2000k_3000k">200 萬 - 300 萬</option>
                        <option value="above_3000k">300 萬以上</option>
                        <option value="undisclosed">不方便透露</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">行業細分 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={userIndustry}
                        onChange={(e) => setUserIndustry(e.target.value)}
                        placeholder="例如：資訊軟體、金融財務、生技醫療"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">聯絡電話 <span className="text-rose-500">*</span></label>
                      <input
                        type="tel"
                        required
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="0912-345-678"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">所屬機構 / 公司名稱 <span className="text-stone-400 font-normal">(選填)</span></label>
                    <input
                      type="text"
                      value={userCompany}
                      onChange={(e) => setUserCompany(e.target.value)}
                      placeholder="公司、事務所或研究機構"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">個人簡介 / 專業背景</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="簡述您的專業領域、實戰經驗與擅長解決之問題..."
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  {basicSaveSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{basicSaveSuccessMsg}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSaveBasicProfile}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-stone-950" />
                      <span>儲存基本資料</span>
                    </button>
                  </div>
                </div>

                {/* 2. 收退款帳戶設定（無金流模式下隱藏） */}
                {!isNoPaymentMode && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-50 via-white to-amber-50/40 border border-stone-200 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-2xs">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-stone-900">收退款帳戶設定</h4>
                          <p className="text-[11px] text-stone-500">設定平台撥款（解答賞金）與退款（託管解約）之指定銀行帳戶</p>
                        </div>
                      </div>
                      {accountNumber.trim() ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 已綁定撥款帳戶
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-600 text-[10px] font-bold">
                          未設定
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">銀行名稱與代碼</label>
                        <select
                          value={bankName}
                          onChange={(e) => {
                            setBankName(e.target.value);
                            setBankCode(e.target.value.split(' ')[0] || '822');
                          }}
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none"
                        >
                          <option value="822 中國信託商業銀行">822 中國信託商業銀行</option>
                          <option value="013 國泰世華商業銀行">013 國泰世華商業銀行</option>
                          <option value="808 玉山商業銀行">808 玉山商業銀行</option>
                          <option value="012 台北富邦商業銀行">012 台北富邦商業銀行</option>
                          <option value="007 第一商業銀行">007 第一商業銀行</option>
                          <option value="008 華南商業銀行">008 華南商業銀行</option>
                          <option value="004 臺灣銀行">004 臺灣銀行</option>
                          <option value="700 中華郵政">700 中華郵政</option>
                          <option value="812 台新國際商業銀行">812 台新國際商業銀行</option>
                          <option value="005 臺灣土地銀行">005 臺灣土地銀行</option>
                          <option value="009 彰化商業銀行">009 彰化商業銀行</option>
                          <option value="017 兆豐國際商業銀行">017 兆豐國際商業銀行</option>
                          <option value="807 永豐商業銀行">807 永豐商業銀行</option>
                          <option value="803 聯邦商業銀行">803 聯邦商業銀行</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">分行名稱</label>
                        <input
                          type="text"
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          placeholder="例如：敦南分行、營業部"
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">帳戶號碼 (存款帳號)</label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="例如：0000123456789"
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">戶名 (必須與實名相同)</label>
                        <input
                          type="text"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          placeholder="例如：林書豪"
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    {bankSaveSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{bankSaveSuccessMsg}</span>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveBankSettings}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5 text-stone-950" />
                        <span>儲存收退款帳戶</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 右側欄：服務調研問卷（按 性別、年齡、專業領域、職業、薪水、其他問題 順序排列） */}
              <div className={`xl:col-span-5 space-y-4 ${profileSubTab === 'survey' ? 'block' : 'hidden xl:block'}`}>
                {/* 填問卷得免費體驗尊榮橫幅 */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 border border-amber-300 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                    <h4 className="text-xs sm:text-sm font-black text-stone-900">
                      🎁 填寫調研問卷，完成即送會員【免費領取 1 週尊榮會員體驗】！
                    </h4>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed font-medium">
                    填寫完畢獲得<strong>一週達人方案體驗（雙 AI 功能超值雙享）</strong>！前 500 名完成者更享有<strong>一週權威方案體驗（完全 0 服務費 + 高價值提案幫你優先推薦）</strong>！
                  </p>
                  {currentUser.surveyData?.completedAt && (
                    <div className="pt-1 flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>您已完成問卷並享有尊榮方案體驗！（更新時間：{new Date(currentUser.surveyData.completedAt).toLocaleDateString()}）</span>
                    </div>
                  )}
                </div>

                <div id="survey-questions-section" className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5 flex-wrap gap-2">
                    <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                      <span>問卷 (客戶調查)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleApplyProfileDataToSurvey}
                      className="text-[11px] font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 active:scale-95 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                      title="快速帶入您於帳號設定所填寫的資料"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-amber-900" />
                      <span>套用帳號基本資料 (1~5題)</span>
                    </button>
                  </div>

                  {/* 1. 性別 */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 flex-wrap">
                        <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                        <span>1. 您的性別認同？</span>
                        {surveyUnansweredErrors['q1'] && (
                          <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                            (請回答此題)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-stone-400 font-normal">單選</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'male', label: '男 (Male)' },
                        { key: 'female', label: '女 (Female)' },
                        { key: 'other', label: '其他多元性別' },
                        { key: 'undisclosed', label: '不便透露' },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                            userGender === item.key
                              ? 'bg-amber-100/90 border-amber-400 font-bold text-amber-950'
                              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="survey_gender"
                            checked={userGender === item.key}
                            onChange={() => {
                              setUserGender(item.key as any);
                              setSurveyUnansweredErrors((prev) => ({ ...prev, q1: false }));
                            }}
                            className="w-4 h-4 accent-amber-600"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 2. 年齡 */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 flex-wrap">
                        <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                        <span>2. 您的年齡區間？</span>
                        {surveyUnansweredErrors['q2'] && (
                          <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                            (請回答此題)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-stone-400 font-normal">單選</span>
                    </label>
                    <select
                      value={userAgeGroup}
                      onChange={(e) => {
                        setUserAgeGroup(e.target.value as any);
                        if (e.target.value) setSurveyUnansweredErrors((prev) => ({ ...prev, q2: false }));
                      }}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-amber-500 outline-none ${
                        surveyUnansweredErrors['q2'] ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-stone-200'
                      }`}
                    >
                      <option value="">-------</option>
                      <option value="under_18">18 歲以下</option>
                      <option value="18_24">18 ~ 24 歲</option>
                      <option value="25_34">25 ~ 34 歲</option>
                      <option value="35_44">35 ~ 44 歲</option>
                      <option value="45_54">45 ~ 54 歲</option>
                      <option value="55_above">55 歲以上</option>
                    </select>
                  </div>

                  {/* 3. 專業領域 */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 flex-wrap">
                        <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                        <span>3. 您的主要相關專業領域？</span>
                        {surveyUnansweredErrors['q3'] && (
                          <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                            (請回答此題)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-stone-400 font-normal">單選/多選對應</span>
                    </label>
                    <select
                      value={domain}
                      onChange={(e) => {
                        setDomain(e.target.value as any);
                        if (e.target.value) setSurveyUnansweredErrors((prev) => ({ ...prev, q3: false }));
                      }}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-amber-500 outline-none ${
                        surveyUnansweredErrors['q3'] ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-stone-200'
                      }`}
                    >
                      <option value="">-------</option>
                      <option value="創新創業">創新創業 (商業模式、融資路演)</option>
                      <option value="資訊科技">資訊科技 (軟體系統、雲端AI架構)</option>
                      <option value="商業行銷">商業行銷 (品牌行銷、增長獲客)</option>
                      <option value="設計創意">設計創意 (UI/UX視覺、品牌形象)</option>
                      <option value="法律合規">法律合規 (股權加盟、勞資合約)</option>
                      <option value="金融投資">金融投資 (財務稅務、併購估值)</option>
                      <option value="營運管理">營運管理 (敏捷流程、組織管理)</option>
                      <option value="日常綜合">日常綜合 (跨界經驗、職涯諮詢)</option>
                    </select>
                  </div>

                  {/* 4. 職業 */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 flex-wrap">
                        <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                        <span>4. 您目前的職業 / 行業職稱？</span>
                        {surveyUnansweredErrors['q4'] && (
                          <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                            (請回答此題)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-stone-400 font-normal">填寫或選擇</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (e.target.value.trim()) setSurveyUnansweredErrors((prev) => ({ ...prev, q4: false }));
                      }}
                      placeholder="例如：軟體工程師、產品經理、行銷企劃、企業創辦人..."
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-amber-500 outline-none mb-1.5 ${
                        surveyUnansweredErrors['q4'] ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-stone-200'
                      }`}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['軟體工程師', '產品經理', '行銷主管', '創業者/負責人', '專業顧問', '自由接案者', '學生'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setTitle(preset);
                            setSurveyUnansweredErrors((prev) => ({ ...prev, q4: false }));
                          }}
                          className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-amber-100 hover:text-amber-900 border border-stone-200 text-[10px] font-medium transition-colors cursor-pointer"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. 薪水 */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 flex-wrap">
                        <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                        <span>5. 您目前薪水 (年薪區間)？</span>
                        {surveyUnansweredErrors['q5'] && (
                          <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                            (請回答此題)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-stone-400 font-normal">單選</span>
                    </label>
                    <select
                      value={userAnnualSalary}
                      onChange={(e) => {
                        setUserAnnualSalary(e.target.value as any);
                        if (e.target.value) setSurveyUnansweredErrors((prev) => ({ ...prev, q5: false }));
                      }}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-amber-500 outline-none ${
                        surveyUnansweredErrors['q5'] ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-stone-200'
                      }`}
                    >
                      <option value="">-------</option>
                      <option value="under_500k">未滿 50 萬</option>
                      <option value="500k_1000k">50 萬 - 100 萬</option>
                      <option value="1000k_2000k">100 萬 - 200 萬</option>
                      <option value="2000k_3000k">200 萬 - 300 萬</option>
                      <option value="above_3000k">300 萬以上</option>
                      <option value="undisclosed">不方便透露</option>
                    </select>
                  </div>

                  {/* 6. 其他客戶調查(僅供平台統計使用) */}
                  <div className="pt-2 border-t border-stone-200 space-y-3.5">
                    <h5 className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
                      6. 其他客戶調查(僅供平台統計使用)
                    </h5>

                    {/* 6-1: 期望服務 */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                          <span>6-1. 您最期望在 IdeaX 獲得什麼服務或體驗？(可多選)</span>
                          {surveyUnansweredErrors['q6_1'] && (
                            <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                              (請至少勾選一項)
                            </span>
                          )}
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        {[
                          '發布懸賞徵求專家解方',
                          '提供解答賺取有償回饋',
                          '大師專家一對一私聊諮詢',
                          '專案客製化落地驗收交付',
                          '探索市場痛點與創新商機',
                          '拓展跨界人脈網絡',
                        ].map((service) => {
                          const checked = surveyDesiredServices.includes(service);
                          return (
                            <label
                              key={service}
                              className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                                checked ? 'bg-amber-100/90 border-amber-400 font-bold text-amber-950' : 'bg-white border-stone-200 text-stone-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSurveyDesiredServices((prev) => {
                                      const next = [...prev, service];
                                      if (next.length > 0) setSurveyUnansweredErrors((p) => ({ ...p, q6_1: false }));
                                      return next;
                                    });
                                  } else {
                                    setSurveyDesiredServices((prev) => prev.filter((s) => s !== service));
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-amber-600 rounded"
                              />
                              <span className="text-[11px]">{service}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* 6-2: 提問預算 */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                          <span>6-2. 若您遇到棘手問題，一次性尋求專家解答願支付多少預算？</span>
                          {surveyUnansweredErrors['q6_2'] && (
                            <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                              (請回答此題)
                            </span>
                          )}
                        </span>
                      </label>
                      <select
                        value={surveyWillingQuestionBudget}
                        onChange={(e) => {
                          setSurveyWillingQuestionBudget(e.target.value);
                          if (e.target.value) setSurveyUnansweredErrors((prev) => ({ ...prev, q6_2: false }));
                        }}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-amber-500 outline-none ${
                          surveyUnansweredErrors['q6_2'] ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-stone-200'
                        }`}
                      >
                        <option value="">-------</option>
                        <option value="under_500">NT$ 500 以下</option>
                        <option value="500_2000">NT$ 500 ~ 2,000</option>
                        <option value="2000_5000">NT$ 2,000 ~ 5,000</option>
                        <option value="5000_20000">NT$ 5,000 ~ 20,000</option>
                        <option value="above_20000">NT$ 20,000 以上</option>
                        <option value="none">尚未有付費意願</option>
                      </select>
                    </div>

                    {/* 6-3: 打開頻率 */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                          <span>6-3. 您預計多久打開一次 IdeaX 平台？</span>
                          {surveyUnansweredErrors['q6_3'] && (
                            <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                              (請回答此題)
                            </span>
                          )}
                        </span>
                      </label>
                      <select
                        value={surveyUsageFrequency}
                        onChange={(e) => {
                          setSurveyUsageFrequency(e.target.value);
                          if (e.target.value) setSurveyUnansweredErrors((prev) => ({ ...prev, q6_3: false }));
                        }}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-amber-500 outline-none ${
                          surveyUnansweredErrors['q6_3'] ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-stone-200'
                        }`}
                      >
                        <option value="">-------</option>
                        <option value="multiple_daily">每天數次</option>
                        <option value="daily">每天至少 1 次</option>
                        <option value="few_times_weekly">每週 2~3 次</option>
                        <option value="weekly">每週 1 次</option>
                        <option value="on_demand">偶爾或有特定需求才開</option>
                      </select>
                    </div>

                    {/* 6-4: 發展副業 */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                          <span>6-4. 您是否願意將在 IdeaX 提供解答發展為您的有償副業？</span>
                          {surveyUnansweredErrors['q6_4'] && (
                            <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                              (請回答此題)
                            </span>
                          )}
                        </span>
                      </label>
                      <select
                        value={surveyWillingToBeSideHustle}
                        onChange={(e) => {
                          setSurveyWillingToBeSideHustle(e.target.value);
                          if (e.target.value) setSurveyUnansweredErrors((prev) => ({ ...prev, q6_4: false }));
                        }}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-amber-500 outline-none ${
                          surveyUnansweredErrors['q6_4'] ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-stone-200'
                        }`}
                      >
                        <option value="">-------</option>
                        <option value="very_willing">非常願意（發展為主力副業）</option>
                        <option value="considering">考慮中（有空檔兼職嘗試）</option>
                        <option value="open_minded">不排斥但目前無規劃</option>
                        <option value="not_interested">目前不考慮</option>
                      </select>
                    </div>

                    {/* 6-5: 解答者方案付費意願 */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className="text-rose-500 font-bold text-sm leading-none">*</span>
                          <span>6-5. 您是否願意花錢訂閱解答者的優惠方案？</span>
                          {surveyUnansweredErrors['q6_5'] && (
                            <span className="text-rose-600 font-bold text-xs ml-1 animate-pulse">
                              (請回答此題)
                            </span>
                          )}
                        </span>
                      </label>
                      <select
                        value={surveyWillingToSubscribeSolverPlan}
                        onChange={(e) => {
                          setSurveyWillingToSubscribeSolverPlan(e.target.value);
                          if (e.target.value) setSurveyUnansweredErrors((prev) => ({ ...prev, q6_5: false }));
                        }}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-amber-500 outline-none ${
                          surveyUnansweredErrors['q6_5'] ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-stone-200'
                        }`}
                      >
                        <option value="">-------</option>
                        <option value="willing">有意願訂閱（享有抽成減免與優先推薦）</option>
                        <option value="depends_profit">視平台接案獲利情況而定</option>
                        <option value="free_tier_first">先使用免費版，有高收益再考慮</option>
                        <option value="unwilling">目前無付費訂閱意願</option>
                      </select>
                    </div>

                    {/* 6-6: 給我們的建議，自由填寫 (選填) */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                        <span>6-6. 給我們的建議（自由填寫）</span>
                        <span className="text-[10px] text-stone-400 font-normal">選填</span>
                      </label>
                      <textarea
                        rows={3}
                        value={surveyFeedback}
                        onChange={(e) => setSurveyFeedback(e.target.value)}
                        placeholder="歡迎分享您對平台功能、合作機制、操作體驗或其他任何建議，我們非常重視您的回饋..."
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {surveyValidationMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{surveyValidationMsg}</span>
                    </div>
                  )}

                  {surveySaveSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{surveySaveSuccessMsg}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveSurvey}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-stone-950" />
                      <span>送出問卷並領取會員體驗</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 提問者身份公開資訊與隱私設定 (僅在提問者身份下顯示) */}
            {currentUser.role === 'questioner' && (
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>提問者公開資訊與隱私設定</span>
                  </h3>
                  <HelpTooltip
                    title="提問者隱私設定說明"
                    content="以提問者身份發布問題或互動時，您可以自由決定是否公開顯示您的職位抬頭與個人簡介，保護商業隱私。"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 cursor-pointer hover:border-amber-300 transition-all">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-stone-900">
                          公開顯示「頭銜或職位」
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          showQuestionerTitle ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {showQuestionerTitle ? '已開啟顯示' : '預設隱藏中'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {showQuestionerTitle
                          ? `目前開啟中：您在提問時將公開顯示「${name} · ${title || '未設定頭銜'}」`
                          : '目前關閉中（系統預設）：提問時僅公開顯示姓名/暱稱，完整保護商業隱私'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showQuestionerTitle}
                      onChange={(e) => {
                        const newVal = e.target.checked;
                        setShowQuestionerTitle(newVal);
                        setCurrentUser((prev) => ({ ...prev, showQuestionerTitle: newVal }));
                        setAvailableUsers((users) =>
                          users.map((u) => (u.id === currentUser.id ? { ...u, showQuestionerTitle: newVal } : u))
                        );
                      }}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold text-stone-800">
                        公開顯示「個人簡介或專業背景」
                      </span>
                      <p className="text-[11px] text-stone-400">
                        {showQuestionerBio ? '開啟中：他人可查看您的個人簡介' : '關閉中：隱藏個人簡介與專業背景'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showQuestionerBio}
                      onChange={(e) => setShowQuestionerBio(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 解答者身份時公開資訊 & 數據顯示設定 (僅在解答者身份下顯示) */}
            {currentUser.role === 'solver' && (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>解題者公開資訊與偏好</span>
                    </h3>
                    <HelpTooltip
                      title="解題者數據展示說明"
                      content="當您作為解題者時，系統將公開展示認證專家標記、擅長領域與評分口碑，亦可自由設定是否公開提交次數與採納率。"
                    />
                  </div>
                  {(currentUser.verifiedExpert || currentUser.verifiedBadge || userAcceptedAnswers.length >= 50) ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> 認證專家
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500 bg-stone-200 px-2 py-0.5 rounded-md font-medium">
                      一般解答者
                    </span>
                  )}
                </div>

                {/* 專家尊榮會員管理入口 (直接進入會員頁購買、續約、取消訂閱) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-300 flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-2xs">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-amber-950">專家會員方案管理</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-200 text-amber-950 font-bold border border-amber-300">
                          {SUBSCRIPTION_PLANS[currentUser.subscriptionTier || 'free']?.name || '一般會員'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900 mt-0.5">
                        享有最高 0% 免手續費與 +2% 額外加碼！支援在線購買、續約與取消訂閱。
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('subscriptions')}
                    className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span>進入會員管理頁</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 核心公開項目 (必顯示) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-stone-200">
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block">專業主領域 (公開)</span>
                    <select
                      value={domain}
                      onChange={(e) => setDomain(e.target.value as Category)}
                      className="mt-1 w-full text-xs font-bold text-stone-800 bg-stone-50 border border-stone-200 rounded-lg p-1.5"
                    >
                      <option value="創新創業">創新創業</option>
                      <option value="專業問題">專業問題</option>
                      <option value="學術探討">學術探討</option>
                      <option value="日常疑難">日常疑難</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block">方案採納次數 (公開)</span>
                    <div className="text-sm font-black text-stone-900 font-mono mt-1">
                      {currentUser.acceptedSolutionsCount ?? userAcceptedAnswers.length} 次被採納
                    </div>
                    <span className="text-[10px] text-stone-400">實戰交付證明</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block">評分口碑 (公開)</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-black text-stone-900 font-mono">
                        {currentUser.rating || 4.9}
                      </span>
                      <span className="text-[10px] text-stone-400">({currentUser.reviewCount || 9} 評價)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>核心領域與精通技能 (至多設定 10 個專長，以 # 分隔)</span>
                    <span className="text-[10px] text-stone-400 font-normal">例如：#資訊科技 #餐飲品牌 #行銷 #股權分配</span>
                  </label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none"
                    placeholder="#商業模式 #冷啟動 #分成架構"
                  />
                </div>

                {/* 精選實際案例 (編輯區塊) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold text-stone-900 block">🏆 精選實際案例</span>
                    <span className="text-[10px] text-amber-800 bg-amber-100 font-bold px-1.5 py-0.2 rounded-md">
                      可編輯 1 個最引以為傲的實務案例，並附 3 份檔案與 5 張成果圖
                    </span>
                  </div>
                  <div className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-stone-700">精選案例名稱 (50字內)</label>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {featuredCaseTitle.length} / 50
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={50}
                        value={featuredCaseTitle}
                        onChange={(e) => setFeaturedCaseTitle(e.target.value)}
                        placeholder="例如：校園商圈特約加盟條款+分潤模型 Excel 試算包"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-stone-700">案例說明與實務成果 (150字內)</label>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {featuredCaseDescription.length} / 150
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={150}
                        value={featuredCaseDescription}
                        onChange={(e) => setFeaturedCaseDescription(e.target.value)}
                        placeholder="例如：成功為12家校園新創餐飲品牌提供精準的股權分配、加盟合約範本以及多階段利潤分潤模型，實質降低加盟糾紛。"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none"
                      />
                    </div>

                    {/* 實務成果圖片上傳/管理 (至多 5 張) */}
                    <div className="pt-2 border-t border-amber-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-stone-800 flex items-center gap-1">
                          <span>📸 實務成果圖片 ({featuredCaseImages.length}/5)</span>
                        </label>
                        <span className="text-[10px] text-stone-400">至多 5 張成果圖或截圖</span>
                      </div>

                      {featuredCaseImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {featuredCaseImages.map((img, idx) => (
                            <div key={idx} className="group relative rounded-xl overflow-hidden border border-amber-200 bg-white aspect-video shadow-2xs">
                              {img.url ? (
                                <img src={img.url} alt={img.caption || `成果圖 ${idx + 1}`} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400 text-xs">無圖片</div>
                              )}
                              <button
                                type="button"
                                onClick={() => setFeaturedCaseImages((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer"
                                title="刪除圖片"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              {img.caption && (
                                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white px-1.5 py-0.5 truncate">
                                  {img.caption}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {featuredCaseImages.length < 5 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            placeholder="輸入圖片網址 (https://...)"
                            className="flex-1 px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none"
                          />
                          <input
                            type="text"
                            value={newImageCaption}
                            onChange={(e) => setNewImageCaption(e.target.value)}
                            placeholder="圖說 (選填)"
                            className="w-28 px-2.5 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none hidden sm:block"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newImageUrl.trim()) {
                                setFeaturedCaseImages((prev) => [...prev, { url: newImageUrl.trim(), caption: newImageCaption.trim() || undefined }]);
                                setNewImageUrl('');
                                setNewImageCaption('');
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                          >
                            + 新增圖片
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 實務附件檔案管理 (至多 3 份) */}
                    <div className="pt-2 border-t border-amber-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-stone-800 flex items-center gap-1">
                          <span>📎 實務附件檔案 ({featuredCaseFiles.length}/3)</span>
                        </label>
                        <span className="text-[10px] text-stone-400">至多 3 份 Excel/PDF/文件</span>
                      </div>

                      {featuredCaseFiles.length > 0 && (
                        <div className="space-y-1.5">
                          {featuredCaseFiles.map((f, idx) => (
                            <div key={idx} className="p-2 rounded-xl bg-white border border-amber-200 flex items-center justify-between gap-2 shadow-2xs text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="font-bold text-stone-800 truncate">{f.name}</span>
                                {f.size && <span className="text-[10px] text-stone-400 font-mono">({f.size})</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => setFeaturedCaseFiles((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1 rounded-lg text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="移除檔案"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {featuredCaseFiles.length < 3 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            placeholder="例如：特約加盟合約範本.pdf"
                            className="flex-1 px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:border-amber-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newFileName.trim()) {
                                setFeaturedCaseFiles((prev) => [...prev, { name: newFileName.trim(), size: '1.5 MB' }]);
                                setNewFileName('');
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                          >
                            + 新增檔案
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 默認隱藏顯示（可選擇公開）的數據開關 */}
                <div className="space-y-2.5 pt-2 border-t border-stone-200">
                  <div className="text-xs font-bold text-stone-800">
                    默認隱藏或公開：
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 cursor-pointer">
                      <div>
                        <span className="text-xs font-semibold text-stone-800">公開顯示我近期的解答/交付方案</span>
                        <p className="text-[11px] text-stone-400">開啟後其他使用者可在您的個人檔案頁面中看到近期回答的歷史案例</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={showRecentSolutions}
                        onChange={(e) => setShowRecentSolutions(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 cursor-pointer">
                      <div>
                        <span className="text-xs font-semibold text-stone-800">公開顯示「提交方案數量」</span>
                        <p className="text-[11px] text-stone-400">目前提交方案：{currentUser.submittedSolutionsCount ?? userSolutionAnswers.length} 次</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={showSubmittedCount}
                        onChange={(e) => setShowSubmittedCount(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 cursor-pointer">
                      <div>
                        <span className="text-xs font-semibold text-stone-800">公開顯示「被採納率」</span>
                        <p className="text-[11px] text-stone-400">目前採納率：{currentUser.acceptanceRate ?? 88}%</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={showAcceptanceRate}
                        onChange={(e) => setShowAcceptanceRate(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 cursor-pointer">
                      <div>
                        <span className="text-xs font-semibold text-stone-800">公開顯示「平均方案賞金」</span>
                        <p className="text-[11px] text-stone-400">目前平均賞金：NT$ {currentUser.avgSolutionBounty ?? 2400}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={showAvgSolutionBounty}
                        onChange={(e) => setShowAvgSolutionBounty(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* 絕對不顯示項目提示 */}
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center gap-2 text-[11px] text-stone-600">
                    <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                    <span>
                      <strong>絕對隱私保密：</strong>「總賺取賞金」為平台核心私隱數據，永不公開顯示於個人名片或解答清單中。
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 全域隱私與專家認證標章設定 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <SettingsIcon className="w-4 h-4 text-stone-600" />
                <span>全域隱私與專家實名標章</span>
              </h3>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-stone-800">隱藏提問人數據</span>
                  <p className="text-[11px] text-stone-400">
                    在問題詳情頁中，隱藏您的歷史提問數與累計賞金
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentUser.hideQuestionStats ?? false}
                  onChange={(e) => togglePrivacySettings(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-stone-800">邀請與指定提問同步訊息清單</span>
                  <p className="text-[11px] text-stone-400">
                    當您收到指定提問或邀請回答時，在「訊息」中同步接收系統通知提示；關閉後只會於右上角通知中心提醒。
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentUser.syncChatNotifications ?? true}
                  onChange={(e) => {
                    setCurrentUser((prev) => ({
                      ...prev,
                      syncChatNotifications: e.target.checked,
                    }));
                    setMsg('通知接收設定已更新！');
                    setTimeout(() => setMsg(null), 3000);
                  }}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">認證專家資格審查</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  成為認證專家可享有全站優先推薦與專屬標章。達成條件：(1) 提交專業證照審核通過官方認證，或 (2) 在平台累計採納落地方案達 50 份以上且評分 ≥ 4 星。
                </p>
                {!(currentUser.verifiedExpert || (userAcceptedAnswers.length >= 50 && (currentUser.rating || 5.0) >= 4.0) || currentUser.verifiedBadge) ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('expert_certification')}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {currentUser.expertApplicationStatus === 'pending'
                        ? '專家資格審核中（點擊進入專家認證頁）'
                        : '進入「專家認證」填寫申請表單'}
                    </span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-emerald-900 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      <span>
                        您已具備「IdeaX 認證專家」資格（{currentUser.verifiedExpert || currentUser.verifiedBadge ? '已通過平台官方認證' : '採納方案達 50 份以上且評分 ≥ 4 星'}）
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 平台條款與契約簽署狀態 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                      平台條款與契約簽署狀態
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                  當前版本：{CURRENT_TERMS_VERSION}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {/* 1. 一般服務條款 */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="w-4 h-4 accent-amber-600 rounded cursor-default shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">服務條款（通用條款）</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          已同意簽署
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAboutModal('general_terms')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                  >
                    <span>查閱條款</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* 2. 提問會員服務條款 */}
                {(() => {
                  const isAgreed = Boolean(
                    currentUser.agreedQuestionerTermsVersion === CURRENT_TERMS_VERSION ||
                    currentUser.hasAgreedQuestionerTerms
                  );
                  return (
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition-colors ${
                      isAgreed ? 'bg-white border-stone-200 hover:border-amber-300' : 'bg-amber-50/40 border-amber-300'
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isAgreed}
                          onChange={(e) => {
                            if (e.target.checked) {
                              recordTermsAgreement('questioner');
                              setMsg('已成功簽署同意「提問會員服務條款」！');
                              setTimeout(() => setMsg(null), 3000);
                            }
                          }}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-stone-900 truncate">提問會員服務條款</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              isAgreed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isAgreed ? '已同意簽署' : '發布懸賞需簽署'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAboutModal('questioner_terms')}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                      >
                        <span>查閱條款</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })()}

                {/* 3. 接案會員服務條款 */}
                {(() => {
                  const isAgreed = Boolean(
                    currentUser.agreedSolverTermsVersion === CURRENT_TERMS_VERSION ||
                    currentUser.hasAgreedSolverTerms
                  );
                  return (
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition-colors ${
                      isAgreed ? 'bg-white border-stone-200 hover:border-amber-300' : 'bg-blue-50/40 border-blue-300'
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isAgreed}
                          onChange={(e) => {
                            if (e.target.checked) {
                              recordTermsAgreement('solver');
                              setMsg('已成功簽署同意「接案會員服務條款」！');
                              setTimeout(() => setMsg(null), 3000);
                            }
                          }}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-stone-900 truncate">接案會員服務條款</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              isAgreed ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isAgreed ? '已同意簽署' : '提交解答需簽署'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAboutModal('solver_terms')}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                      >
                        <span>查閱條款</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })()}

                {/* 4. 著作權保護政策 */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="w-4 h-4 accent-amber-600 rounded cursor-default shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">著作權保護政策</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          已同意簽署
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAboutModal('copyright_policy')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                  >
                    <span>查閱政策</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* 5. 隱私權政策與個資聲明 */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="w-4 h-4 accent-amber-600 rounded cursor-default shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">隱私權政策與個資保護</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          已同意簽署
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAboutModal('privacy_policy')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                  >
                    <span>查閱政策</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* 6. 免責聲明與風險告知 */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="w-4 h-4 accent-amber-600 rounded cursor-default shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">免責聲明與決策告知</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          已同意簽署
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAboutModal('disclaimer')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                  >
                    <span>查閱聲明</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* 7. 點數儲值與會員方案訂閱服務條款 */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="w-4 h-4 accent-amber-600 rounded cursor-default shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">點數儲值與會員方案訂閱條款</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          已同意簽署
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAboutModal('recharge_subscription_terms')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                  >
                    <span>查閱條款</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* 8. 反詐騙與防制洗錢政策 */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="w-4 h-4 accent-amber-600 rounded cursor-default shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">反詐騙與洗錢防制政策</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          已同意簽署
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAboutModal('anti_fraud_aml_policy')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                  >
                    <span>查閱政策</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* 9. 退款政策與爭議調解辦法 */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="w-4 h-4 accent-amber-600 rounded cursor-default shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">退款政策與爭議調解辦法</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          已同意簽署
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAboutModal('refund_dispute_policy')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                  >
                    <span>查閱辦法</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* 10. 社群守則與內容管理規範 */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="w-4 h-4 accent-amber-600 rounded cursor-default shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">社群守則與內容管理規範</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          已同意簽署
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAboutModal('community_guidelines')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                  >
                    <span>查閱規範</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              儲存全站個人檔案與隱私偏好
            </button>
          </div>
        )}

            {/* 本裝置已登錄帳號（快速切換與管理） */}
            <div id="account-switch-section" className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-300 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-2xs">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                      <span>本裝置已登錄之帳號</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                        {deviceAccounts.length} 組帳號
                      </span>
                    </h3>
                    <p className="text-xs text-stone-600 mt-0.5">
                      本裝置曾登入之帳號均可直接點擊切換；若帳號已登出，重新登入後即可切換。您亦可自此裝置移除其他非使用中之帳號。
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-900 border border-stone-200 hover:border-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                  <span>登入其他帳號</span>
                </button>
              </div>

              {/* 帳號卡片清單 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {deviceAccounts.map((da) => {
                  const u = availableUsers.find((user) => user.id === da.userId);
                  if (!u) return null;
                  const isCurrent = currentUser.id === u.id;
                  const isLogged = da.isLoggedIn;

                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                          : isLogged
                          ? 'bg-white border-stone-200 hover:border-amber-300 hover:bg-amber-50/30 shadow-2xs'
                          : 'bg-stone-50/80 border-stone-200 opacity-80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={u.name}
                          className="w-11 h-11 rounded-2xl object-cover ring-1 ring-stone-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-stone-900 truncate">{u.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                                目前使用中
                              </span>
                            )}
                            {!isCurrent && isLogged && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                已登入
                              </span>
                            )}
                            {!isLogged && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-600 shrink-0">
                                已登出
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-1">
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : u.role === 'solver'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {u.role === 'admin' ? '平台管理員' : u.role === 'solver' ? '解答者' : '提問者'}
                            </span>
                            <span className="truncate">{u.title || u.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* 底部操作欄 */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                        <div className="text-[11px] font-mono text-stone-500">
                          {u.role === 'solver'
                            ? `NT$ ${(u.withheldPoints || 0).toLocaleString()}`
                            : `${(u.balance || 0).toLocaleString()} 點`}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isCurrent ? (
                            <button
                              type="button"
                              onClick={() => {
                                logoutAccount(u.id);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="登出目前使用之帳號"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>登出</span>
                            </button>
                          ) : isLogged ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  switchAccount(u.id);
                                  setMsg(`已成功切換為「${u.name}」！`);
                                  setTimeout(() => setMsg(null), 3000);
                                }}
                                className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[11px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                                title="直接切換為此帳號"
                              >
                                <span>直接切換</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setAccountToRemove(u)}
                                className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="從此裝置移除此帳號"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  switchAccount(u.id);
                                  setMsg(`已重新登入並切換為「${u.name}」！`);
                                  setTimeout(() => setMsg(null), 3000);
                                }}
                                className="px-3 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                                title="重新登入並切換為此帳號"
                              >
                                <span>重新登入</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAccountToRemove(u)}
                                className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="從此裝置移除此帳號"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. 註冊新帳號 */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                      註冊新帳號
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      即時建立自訂新身分，建立後將自動登入並贈送 1,000 點體驗金
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddUserForm ? '收合表單' : '快速註冊新帳號'}</span>
                </button>
              </div>

              {showAddUserForm && (
                <div className="pt-3 border-t border-amber-200/80 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        使用者姓名 / 暱稱 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newRegName}
                        onChange={(e) => setNewRegName(e.target.value)}
                        placeholder="例如：Alex Chen"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        主要預設身分
                      </label>
                      <select
                        value={newRegRole}
                        onChange={(e) => setNewRegRole(e.target.value as 'questioner' | 'solver')}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="questioner">提問者（徵求痛點解方）</option>
                        <option value="solver">解答者（解題變現與交付）</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        專業頭銜 / 稱呼
                      </label>
                      <input
                        type="text"
                        value={newRegTitle}
                        onChange={(e) => setNewRegTitle(e.target.value)}
                        placeholder="例如：連續創業者 / AI 產品架構師"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-white text-xs font-bold cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newRegName.trim()) {
                          setMsg('請輸入使用者姓名');
                          setTimeout(() => setMsg(null), 2500);
                          return;
                        }
                        const newId = `user-reg-${Date.now()}`;
                        const newUser: any = {
                          id: newId,
                          name: newRegName.trim(),
                          role: newRegRole,
                          avatar: newRegRole === 'solver'
                            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
                            : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
                          title: newRegTitle.trim() || (newRegRole === 'solver' ? '認證解題顧問' : '創新專案發起人'),
                          balance: 1000,
                          domain: newRegDomain,
                          bio: `${newRegName.trim()} 的全新註冊個人帳號。`,
                          skills: ['創新創業', '商業模式', '問題解題'],
                          subscriptionTier: 'free',
                          reputationPoints: 100,
                          acceptanceRate: '100',
                          totalPaidOut: 0,
                          verifiedExpert: newRegRole === 'solver',
                          showQuestionerTitle: true,
                          showQuestionerBio: true,
                        };
                        setAvailableUsers((prev: any) => [...prev, newUser]);
                        setCurrentUser(newUser);
                        setNewRegName('');
                        setNewRegTitle('');
                        setShowAddUserForm(false);
                        setMsg(`🎉 註冊成功！已自動登入為「${newUser.name}」，獲得 1,000 點體驗金！`);
                        setTimeout(() => setMsg(null), 3500);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      建立並登入此新帳號
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 登出帳號 */}
            <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h4 className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>登出帳號</span>
                </h4>
                <p className="text-[11px] text-red-800/80 mt-0.5">
                  安全登出目前登入身分（{currentUser.name}），切換至訪客瀏覽模式。
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const guestUser = availableUsers.find((u) => u.id === 'user-guest') || availableUsers[0];
                  setCurrentUser(guestUser);
                  setMsg('已成功登出帳號，目前為訪客體驗模式。');
                  setTimeout(() => setMsg(null), 3000);
                }}
                className="px-3.5 py-2 rounded-xl bg-white border border-red-300 text-red-700 hover:bg-red-50 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span>安全登出目前帳號</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: 我的案件 */}
        {activeTab === 'proposals' && (
          <div className="space-y-4">
            {/* 分頁標題 */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-600" />
                <h3 className="text-base sm:text-lg font-black text-stone-900">我的案件</h3>
              </div>
              <span className="text-xs text-stone-500 font-medium">
                {isSolverRole ? '追蹤、交付與驗收各階段方案' : '掌握委託進度、方案驗收與撥款'}
              </span>
            </div>

            {/* 篩選切換列與搜尋 (依據解答者/提問者規範呈現) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 overflow-x-auto">
                {isSolverRole ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setProposalFilter('pending_reply')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                        proposalFilter === 'pending_reply'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>待回覆</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        proposalFilter === 'pending_reply' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900'
                      }`}>
                        {solverPendingReplyCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProposalFilter('in_progress')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                        proposalFilter === 'in_progress'
                          ? 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>進行中</span>
                      {solverInProgressCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-xs font-extrabold">
                          {solverInProgressCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProposalFilter('completed')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                        proposalFilter === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>已完成</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        proposalFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {solverCompletedCount}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setProposalFilter('uncompleted')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                        proposalFilter === 'uncompleted'
                          ? 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>未完成</span>
                      {questionerUncompletedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-xs font-extrabold">
                          {questionerUncompletedCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProposalFilter('completed')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                        proposalFilter === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>已結案</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        proposalFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {questionerCompletedCount}
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* 搜尋框 */}
              <div className="relative sm:w-64">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜尋方案名稱或對象..."
                  value={proposalSearch}
                  onChange={(e) => setProposalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {/* 解答者提交交付成果彈窗 / 展開區 */}
            {submittingDeliverablePhase && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-amber-700" />
                    <div>
                      <h4 className="font-black text-sm text-amber-950">
                        提交交付成果：【{submittingDeliverablePhase.phaseTitle}】
                      </h4>
                      <p className="text-[11px] text-amber-900">
                        填寫交付說明或檔案名稱，送出後委託人將收到通知並可在此驗收完成交付。
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmittingDeliverablePhase(null)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-amber-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitDeliverable} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      交付內容說明 / 成果重點摘要
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={deliverableText}
                      onChange={(e) => setDeliverableText(e.target.value)}
                      placeholder="請描述您為此階段完成的具體成果、解決策略、分析重點或線上會談約定..."
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs focus:border-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      交付檔案或雲端連結名稱（選填）
                    </label>
                    <input
                      type="text"
                      value={deliverableAttachmentName}
                      onChange={(e) => setDeliverableAttachmentName(e.target.value)}
                      placeholder="例如：2026_商業模式與財務模型報告.pdf 或 Google Drive 連結"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:border-amber-600 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSubmittingDeliverablePhase(null)}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 bg-white text-xs font-bold hover:bg-stone-50 cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>確認提交交付成果</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 方案卡片清單 */}
            <div className="space-y-3.5">
              {filteredProposals.length === 0 ? (
                <div className="p-12 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200 space-y-2">
                  <Briefcase className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs font-bold text-stone-600">
                    {isSolverRole
                      ? proposalFilter === 'pending_reply'
                        ? '目前沒有待回覆（尚未被採納或接收）的方案'
                        : proposalFilter === 'in_progress'
                        ? '目前沒有已被採納且進行中的案件'
                        : '目前尚無已完成交易的案件'
                      : proposalFilter === 'uncompleted'
                      ? '目前沒有未完成或進行中的委託案件'
                      : '目前尚無已結案的案件'}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {isSolverRole
                      ? '提出方案或在私聊中發送專屬報價，被提問者採納後會在此即時更新進度並進行成果交付。'
                      : '委託專家解題或在私聊簽署自訂專屬方案後，可在此全程掌握進度、驗收交付成果並一鍵結案放款。'}
                  </p>
                </div>
              ) : (
                filteredProposals.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      item.isCompleted
                        ? 'bg-stone-50/70 border-stone-200'
                        : 'bg-white border-amber-200 shadow-xs ring-1 ring-amber-100/50'
                    }`}
                  >
                    {/* 卡片標頭：類型、狀態、金額 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
                          {item.typeLabel}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            item.role === 'buyer'
                              ? 'bg-amber-100/80 text-amber-950 border-amber-200'
                              : 'bg-blue-100/80 text-blue-950 border-blue-200'
                          }`}
                        >
                          {item.role === 'buyer' ? '您的角色：委託買方' : '您的角色：解答專家'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.statusBadgeClass}`}>
                          {item.statusLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-stone-400">第三方託管款項</span>
                        <span className="text-base font-black text-stone-900 font-mono">
                          NT$ {(item.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* 方案內容區 */}
                    <div className="py-3 space-y-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                          <span>{item.title}</span>
                        </h4>
                        {item.questionTitle && (
                          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1">
                            <span>關聯問題：</span>
                            <span className="font-medium text-stone-700">{item.questionTitle}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed">
                        {item.description}
                      </p>

                      {/* 交付項目清單 (若有) */}
                      {item.deliverables && item.deliverables.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1 text-xs">
                          <span className="text-[10px] font-bold text-stone-500 block">約定交付成果清單：</span>
                          <ul className="space-y-0.5">
                            {item.deliverables.map((d, dIdx) => (
                              <li key={dIdx} className="text-[11px] text-stone-700 flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 專家已提交的成果內容展示 */}
                      {item.submittedContent && (
                        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-emerald-900 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>專家交付成果 / 報告摘要</span>
                            </span>
                            <span className="text-[10px] text-emerald-700">已由專家提交存檔</span>
                          </div>
                          <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                            {item.submittedContent}
                          </p>
                          {item.submittedAttachments && item.submittedAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-emerald-200/60">
                              {item.submittedAttachments.map((att, aIdx) => (
                                <div
                                  key={aIdx}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-white px-2 py-1 rounded-lg border border-emerald-200 text-emerald-900"
                                >
                                  <Paperclip className="w-3 h-3 text-emerald-600" />
                                  <span>{att.name}</span>
                                  <span className="text-[10px] text-stone-400 font-normal">({att.size})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 對手方資訊與動作列 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.partnerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={item.partnerName}
                          className="w-7 h-7 rounded-xl object-cover ring-1 ring-stone-200"
                        />
                        <div>
                          <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            <span>{item.partnerName}</span>
                            <span className="text-[10px] text-stone-400 font-normal">
                              ({item.role === 'buyer' ? '解答專家' : '委託買方'})
                            </span>
                          </div>
                          {item.partnerTitle && (
                            <p className="text-[10px] text-stone-500 truncate max-w-xs">{item.partnerTitle}</p>
                          )}
                        </div>
                      </div>

                      {/* 按鈕動作區 */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1. 提問者/買方：在方案尚未完成時，提供「確認完成交付」主要按鈕 */}
                        {item.role === 'buyer' && !item.isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleConfirmDelivery(item)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                            title="確認已收到並滿意交付成果，系統將自動放款"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>確認完成交付（驗收並放款）</span>
                          </button>
                        )}

                        {/* 2. 解答專家：在階段進行中時，提供「提交交付成果」 */}
                        {item.role === 'seller' && item.type === 'phase' && item.status === 'in_progress' && (
                          <button
                            type="button"
                            onClick={() =>
                              setSubmittingDeliverablePhase({
                                questionId: item.questionId!,
                                answerId: item.answerId!,
                                phaseIndex: item.phaseIndex!,
                                phaseTitle: item.title,
                              })
                            }
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>提交交付成果</span>
                          </button>
                        )}

                        {/* 已完成狀態標記與為解答者評分 */}
                        {item.isCompleted && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              已完成驗收交付
                            </span>

                            {item.role === 'buyer' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRatingTargetSolver({
                                    id: item.partnerId,
                                    name: item.partnerName,
                                    title: item.partnerTitle,
                                    avatar: item.partnerAvatar,
                                  });
                                  setRatingStars(5);
                                  setRatingComment('');
                                  setRatingModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                                <span>為解答者評分</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* 3. 下載商業契約檔案按鈕 (已成立之正式合約) */}
                        {(item.isCompleted || item.status === 'in_progress') && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const cData = buildContractFromProposalItem(item, currentUser);
                                setPreviewContract(cData);
                              }}
                              className="px-3 py-1.5 rounded-xl border border-stone-300 hover:border-amber-400 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                              title="線上檢視正式商業契約與簽署認證章"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-700" />
                              <span>檢視契約</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const cData = buildContractFromProposalItem(item, currentUser);
                                downloadContractFile(cData);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                              title="下載正式商業契約存證檔案 (.html / PDF)"
                            >
                              <Download className="w-3.5 h-3.5 text-stone-950" />
                              <span>下載契約檔案</span>
                            </button>
                          </div>
                        )}

                        {/* 快速跳轉問題頁面 */}
                        {item.questionId && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenQuestion(item.questionId!);
                              if (!isFullPage) onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                            <span>查看問題</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: 交易管理 / 交易紀錄 */}
        {activeTab === 'transactions' && (
          currentUser.role === 'admin' ? (
            <AdminTransactionsTab />
          ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <span className="text-xs text-stone-400 font-mono">共 {transactions.length} 筆紀錄</span>
            </div>

            <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl p-2 bg-stone-50/50 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">暫無交易紀錄</div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-3 flex items-center justify-between text-xs hover:bg-white rounded-xl transition-colors">
                    <div>
                      <div className="font-bold text-stone-900 flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            tx.type === '懸賞託管'
                              ? 'bg-amber-100 text-amber-800'
                              : tx.type === '解答者收益發放'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.type === '付費解鎖方案'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span>{tx.relatedQuestionTitle || '帳戶資金異動'}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1">
                        狀態：<strong className="text-stone-700">{tx.status}</strong> • 時間：{tx.createdAt.split('T')[0]}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold font-mono text-stone-900 text-sm">
                        NT$ {(tx.amount || 0).toLocaleString()}
                      </span>
                      {tx.platformFee > 0 && (
                        <span className="text-[10px] text-stone-400 block">
                          手續費 NT$ {tx.platformFee}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          )
        )}

        {/* TAB 4: 抽成減免與訂閱方案 / 會員管理 */}
        {activeTab === 'subscriptions' && (
          currentUser.role === 'admin' ? (
            <AdminMembershipPlanEditor />
          ) : (
            <div className="space-y-6">
              <SubscriptionPlanCard />
            </div>
          )
        )}

        {/* 管理員專用：案件管理 */}
        {activeTab === 'admin_cases' && (
          <AdminCasesManagementTab onOpenQuestion={onOpenQuestion} />
        )}

        {/* 管理員專用：問題管理 (各類問題數量圓餅圖、違規審查與下架反饋) */}
        {activeTab === 'admin_questions' && (
          <AdminQuestionsManagementTab />
        )}

        {/* 管理員專用：受理認證 (實名、專家) */}
        {activeTab === 'admin_certifications' && (
          <AdminCertificationsTab />
        )}

        {/* 管理員專用：用戶管理 */}
        {activeTab === 'admin_user_management' && (
          <AdminUserManagementTab />
        )}

        {/* 管理員專用：用戶分佈與習慣統計 */}
        {activeTab === 'admin_user_analytics' && (
          <AdminUserAnalyticsTab />
        )}

        {/* 管理員專用：AI-CRM 系統功能設定和管理 */}
        {activeTab === 'admin_aicrm' && currentUser.role === 'admin' && (
          <AdminAiCrmTab
            onOpenAiCrm={() => {
              onClose();
              if (onOpenAiCrm) onOpenAiCrm();
            }}
          />
        )}

        {/* 管理員專用：申訴與郵件 */}
        {activeTab === 'admin_mail_disputes' && currentUser.role === 'admin' && !isNoPaymentMode && isDemoMode && (
          <AdminMailDisputesTab onOpenQuestion={onOpenQuestion} />
        )}
      </div>

      {/* Rating Modal Popup */}
      {ratingModalOpen && ratingTargetSolver && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                <h3 className="font-extrabold text-base text-stone-900">為解答者給予交易評分</h3>
              </div>
              <button
                type="button"
                onClick={() => setRatingModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target solver avatar and name */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <img
                src={ratingTargetSolver.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={ratingTargetSolver.name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-amber-300 shrink-0"
              />
              <div>
                <h4 className="font-bold text-sm text-stone-900">{ratingTargetSolver.name}</h4>
                {ratingTargetSolver.title && (
                  <p className="text-xs text-stone-500 line-clamp-1">{ratingTargetSolver.title}</p>
                )}
                <p className="text-[11px] text-amber-800 font-semibold mt-0.5">交易已結束・請給予本次合作真實評分</p>
              </div>
            </div>

            {/* Star Selector */}
            <div className="space-y-1.5 text-center py-1">
              <span className="text-xs font-bold text-stone-700 block">整體滿意度評分 *</span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= ratingStars
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-stone-100 text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-black text-amber-700 font-mono block">
                {ratingStars} 星滿意度
              </span>
            </div>

            {/* Rating Tags */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-stone-700 block">合作特色印象標籤：</span>
              <div className="flex flex-wrap gap-1.5">
                {['溝通親切順暢', '專業解題深入', '回覆速度極快', '成果精準落地', '符合預期超值'].map((tag) => {
                  const isSelected = selectedRatingTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedRatingTags((prev) =>
                          isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating Comment */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">評語評價與指教（選填）</label>
              <textarea
                rows={3}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="寫下您對這次解題或諮詢方案的真實感受與建議..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRatingModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 text-xs font-bold hover:bg-stone-100 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  rateSolver(ratingTargetSolver.id, ratingStars, ratingComment);
                  setRatingModalOpen(false);
                  setMsg(`🎉 已成功為「${ratingTargetSolver.name}」送出 ${ratingStars} 星滿意好評！`);
                  setTimeout(() => setMsg(null), 4000);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold shadow-2xs cursor-pointer transition-all"
              >
                確認送出評分
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expert Certification Apply Modal */}
      <ExpertCertificationApplyModal
        isOpen={isExpertApplyModalOpen}
        onClose={() => setIsExpertApplyModalOpen(false)}
      />

      {/* 點擊切換帳號二次確認彈窗（最頂層） */}
      {pendingSwitchUser && (
        <div
          onClick={() => setPendingSwitchUser(null)}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-stone-200 p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900">確認切換登入帳號？</h3>
                <p className="text-xs text-stone-500">切換後將以該帳號之身分與權限操作平台</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3">
              <img
                src={pendingSwitchUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={pendingSwitchUser.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-stone-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-black text-sm text-stone-900 truncate">{pendingSwitchUser.name}</h4>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                      pendingSwitchUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : pendingSwitchUser.role === 'solver'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {pendingSwitchUser.role === 'admin'
                      ? '👑 平台管理員（單一身份）'
                      : pendingSwitchUser.role === 'solver'
                      ? '💼 專家解答'
                      : '🙋 提問者'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 truncate mt-0.5">{pendingSwitchUser.title || pendingSwitchUser.email}</p>
              </div>
            </div>

            {pendingSwitchUser.role === 'admin' && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>此為官方管理員，為單一管理身份（不區分提問/解答端），可執行全站實名審核與風控治理。</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingSwitchUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingSwitchUser;
                  setPendingSwitchUser(null);
                  setCurrentUser(target);
                  if (target.role === 'admin') {
                    setActiveTab('admin_management');
                    setMsg(`已成功切換登入帳號為：${target.name}（平台管理員），已直接為您開啟「平台數據與顯示」！`);
                  } else {
                    setMsg(`已成功切換登入帳號為：${target.name}（${target.role === 'solver' ? '解答者' : '提問者'}）`);
                  }
                  setTimeout(() => setMsg(null), 3000);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-xs transition-colors cursor-pointer"
              >
                確認切換
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除其他裝置帳號確認彈窗 */}
      {accountToRemove && (
        <div
          onClick={() => setAccountToRemove(null)}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-stone-200 p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900">從本裝置移除帳號？</h3>
                <p className="text-xs text-stone-500">僅從本機裝置清除登入紀錄，雲端資料完好保留</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3">
              <img
                src={accountToRemove.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={accountToRemove.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-stone-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm text-stone-900 truncate">{accountToRemove.name}</p>
                <p className="text-xs text-stone-500 truncate">{accountToRemove.title || accountToRemove.email}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              確定要將「<strong>{accountToRemove.name}</strong>」從此裝置的快速切換清單移除嗎？日後可隨時再次點擊「登入其他帳號」重新加入。
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAccountToRemove(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  removeDeviceAccount(accountToRemove.id);
                  setAccountToRemove(null);
                  setMsg(`已從本裝置移除帳號「${accountToRemove.name}」！`);
                  setTimeout(() => setMsg(null), 3000);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                確認移除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 登入其他帳號至此裝置彈窗 */}
      {isAddAccountModalOpen && (
        <div
          onClick={() => setIsAddAccountModalOpen(false)}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <UserPlus className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">登入其他帳號至此裝置</h3>
                  <p className="text-xs text-stone-500">選擇帳號即刻登入並保存於本裝置快速切換清單</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccountModalOpen(false)}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {availableUsers
                .filter((u) => u.id !== 'user-guest' && !deviceAccounts.some((da) => da.userId === u.id))
                .map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-2xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={u.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-stone-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-stone-900 truncate">{u.name}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'solver'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {u.role === 'admin' ? '管理員' : u.role === 'solver' ? '解答者' : '提問者'}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 truncate mt-0.5">{u.title || u.email}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        addDeviceAccount(u.id);
                        setIsAddAccountModalOpen(false);
                        setMsg(`已成功登入並切換為「${u.name}」！`);
                        setTimeout(() => setMsg(null), 3000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-2xs shrink-0 cursor-pointer transition-colors"
                    >
                      登入此裝置
                    </button>
                  </div>
                ))}

              {availableUsers.filter((u) => u.id !== 'user-guest' && !deviceAccounts.some((da) => da.userId === u.id)).length === 0 && (
                <div className="p-8 text-center text-xs text-stone-400">
                  所有平台帳號皆已新增於本裝置中。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 平台環境開關二次確認視窗 */}
      {pendingModeConfirm && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                pendingModeConfirm.nextState ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-700'
              }`}>
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">
                  {pendingModeConfirm.type === 'liveOperation'
                    ? (pendingModeConfirm.nextState ? '確認開啟【正式營運模式】？' : '確認關閉【正式營運模式】？')
                    : pendingModeConfirm.type === 'demo'
                    ? (pendingModeConfirm.nextState ? '確認開啟【測試環境】？' : '確認關閉【測試環境】？')
                    : pendingModeConfirm.type === 'noPayment'
                    ? (pendingModeConfirm.nextState ? '確認開啟【無金流環境】？' : '確認關閉【無金流環境】？')
                    : (pendingModeConfirm.nextState ? '確認執行【隱藏測試帳號】？' : '確認執行【公開顯示 測試帳號】？')}
                </h3>
                <span className="text-[11px] text-stone-500 font-bold">
                  系統運營底層模式變更安全確認
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed space-y-2">
              {pendingModeConfirm.type === 'liveOperation' && (
                pendingModeConfirm.nextState ? (
                  <p>
                    <strong>即將開啟【正式營運模式】：（全站平台同步生效）</strong><br />
                    系統將自動<strong>關閉無金流模式與測試環境</strong>，並<strong>自動隱藏所有測試帳號與模擬資料</strong>，全平台恢復真實數據，同步啟用標準商業金流與履約託管機制。
                  </p>
                ) : (
                  <p>
                    <strong>即將關閉【正式營運模式】：（全站平台同步生效）</strong><br />
                    系統將相對地<strong>自動切換為【無金流模式】</strong>，並持續自動隱藏測試環境模擬資料與測試帳號。
                  </p>
                )
              )}

              {pendingModeConfirm.type === 'demo' && (
                pendingModeConfirm.nextState ? (
                  <p>
                    <strong>即將開啟【測試環境】：（僅作用於管理員帳號視角）</strong><br />
                    管理員畫面將載入預設示範問題、精選提案、模擬專家與測試交易數據，<strong>不影響外部真實會員與訪客的畫面</strong>。
                  </p>
                ) : (
                  <p>
                    <strong>即將關閉【測試環境】：（僅作用於管理員帳號視角）</strong><br />
                    管理員畫面將隱藏示範假資料，恢復為純淨實時平台真實數據。
                  </p>
                )
              )}

              {pendingModeConfirm.type === 'noPayment' && (
                pendingModeConfirm.nextState ? (
                  <p>
                    <strong>即將開啟【無金流模式】：（全站平台同步生效）</strong><br />
                    系統將自動<strong>關閉正式營運模式</strong>，<strong>自動隱藏測試環境之模擬資料與測試帳號</strong>，全平台恢復真實數據；所有用戶帳號均無點數、儲值與金流相關設定，開放全站免費提問與互動。
                  </p>
                ) : (
                  <p>
                    <strong>即將關閉【無金流模式】：（全站平台同步生效）</strong><br />
                    系統將相對地<strong>自動切換為【正式營運模式】</strong>，恢復標準商業金流機制，並持續自動隱藏測試環境之模擬資料與測試帳號。
                  </p>
                )
              )}

              {pendingModeConfirm.type === 'hideTestAccounts' && (
                pendingModeConfirm.nextState ? (
                  <p>
                    <strong>即將執行【隱藏測試帳號】：</strong><br />
                    全站切換帳號介面與用戶列表中將完全隱藏林書豪（提問者）、陳怡君（專家）及訪客等測試帳號，僅保留超級管理員與真實註冊用戶。
                  </p>
                ) : (
                  <p>
                    <strong>即將執行【公開顯示 測試帳號】：</strong><br />
                    重新顯示核心測試帳號（林書豪、陳怡君、訪客等），<strong>同時自動關閉正式營運模式</strong>，便於進行跨身分權限切換與情境測試。
                  </p>
                )
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setPendingModeConfirm(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmModeToggle}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                  pendingModeConfirm.nextState
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                    : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
              >
                確認{pendingModeConfirm.nextState ? (pendingModeConfirm.type === 'hideTestAccounts' ? '隱藏' : '開啟') : (pendingModeConfirm.type === 'hideTestAccounts' ? '公開' : '關閉')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">
            創點子 IdeaX • {currentUser.role === 'admin' ? '管理員控制台' : '個人中心'}
          </span>
        </div>
        {!isFullPage && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold cursor-pointer"
          >
            關閉
          </button>
        )}
      </div>

      {/* 管理員專屬：畫面頁尾自動印上淡淡細細的平台版本號與最近更新時間與當前環境簡稱 (純英文與數字，以連字號連接至少兩個英文標籤) */}
      {currentUser.role === 'admin' && (
        <div className="py-2 text-center bg-stone-50/70 border-t border-stone-200/60 text-[10px] sm:text-[11px] text-stone-400 font-mono tracking-tight select-none">
          v1.2.1 • 2026.09.29 • {isDemoMode ? 'TEST' : isNoPaymentMode ? 'FREE' : 'NORM'}-{isHideTestAccounts ? 'HIDE' : 'SHOW'}
        </div>
      )}

      {/* 商業契約與和解協議書檢視/下載 Modal */}
      {previewContract && (
        <ContractPreviewModal
          contract={previewContract}
          onClose={() => setPreviewContract(null)}
        />
      )}
    </div>
  );

  if (isFullPage) {
    return <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};

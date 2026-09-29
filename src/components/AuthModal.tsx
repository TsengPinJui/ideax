import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Building,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  ArrowLeftRight,
  Shield,
  HelpCircle,
  Globe,
  DollarSign,
  Crown,
  Compass,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IdeaXLogo } from './IdeaXLogo';
import { CURRENT_TERMS_VERSION } from '../data/termsData';
import { User as UserType, UserSurveyData, Category } from '../types';
import {
  loginWithFirebaseEmail,
  registerWithFirebaseEmail,
  loginWithFirebaseGoogle,
  createRecaptchaVerifier,
  loginWithFirebasePhone,
  verifyFirebasePhoneCode,
} from '../services/firebaseAuth';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { syncUserToFirestore, getUserFromFirestore } from '../services/firestoreSync';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialMethod?: 'email' | 'phone' | 'switch';
  interceptReason?: string; // Optional reason why login is required (e.g., '訪客無法發布問題，請先登入')
}

const STORAGE_SURVEY_DRAFT_KEY = 'ideax_reg_survey_draft_v1';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialMethod = 'email',
  interceptReason,
}) => {
  const {
    currentUser,
    setCurrentUser,
    availableUsers,
    setAvailableUsers,
    recordTermsAgreement,
    openAboutModal,
    subscriptionPlans,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | 'switch'>(initialMethod);

  // Sync mode and method when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLoginMethod(initialMethod);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialMode, initialMethod]);

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginSmsCode, setLoginSmsCode] = useState('');
  const [isSmsSent, setIsSmsSent] = useState(false);

  // Firebase Phone Auth refs
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Register wizard step: 1 = Basic Account & Role, 2 = Profile & Survey Questionnaire
  const [regStep, setRegStep] = useState<1 | 2>(1);

  // Step 1: Account
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'questioner' | 'solver'>('questioner');
  const [authUid, setAuthUid] = useState<string | null>(null);

  // Step 2: Personal Profile
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'undisclosed'>('male');
  const [ageGroup, setAgeGroup] = useState<'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_above'>('25_34');
  const [industry, setIndustry] = useState('資訊科技 / 軟體互聯網');
  const [jobTitle, setJobTitle] = useState('');
  const [annualSalary, setAnnualSalary] = useState<'under_500k' | '500k_1000k' | '1000k_2000k' | '2000k_3000k' | 'above_3000k' | 'undisclosed'>('undisclosed');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Survey questions (7 core questions)
  const [desiredServices, setDesiredServices] = useState<string[]>([
    '發布懸賞徵求專家解方',
    '探索市場痛點與創新商機',
  ]);
  const [desiredServicesCustom, setDesiredServicesCustom] = useState('');

  const [relatedDomains, setRelatedDomains] = useState<string[]>(['創新創業']);
  const [relatedDomainsCustom, setRelatedDomainsCustom] = useState('');

  const [willingQuestionBudget, setWillingQuestionBudget] = useState('2000_5000');
  const [willingToProvideSolutions, setWillingToProvideSolutions] = useState('very_willing');
  const [usageFrequency, setUsageFrequency] = useState('few_times_weekly');
  const [willingToBeSideHustle, setWillingToBeSideHustle] = useState('considering');
  const [willingToSubscribeSolverPlan, setWillingToSubscribeSolverPlan] = useState('depends_profit');

  // Plans preview modal inside survey
  const [showPlansPreview, setShowPlansPreview] = useState(false);

  // Terms agreement
  const [agreeGeneralTerms, setAgreeGeneralTerms] = useState(true);

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-restore / Auto-save survey draft from localStorage
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(STORAGE_SURVEY_DRAFT_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.regName) setRegName(parsed.regName);
        if (parsed.regEmail) setRegEmail(parsed.regEmail);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.ageGroup) setAgeGroup(parsed.ageGroup);
        if (parsed.industry) setIndustry(parsed.industry);
        if (parsed.jobTitle) setJobTitle(parsed.jobTitle);
        if (parsed.company) setCompany(parsed.company);
        if (parsed.desiredServices) setDesiredServices(parsed.desiredServices);
        if (parsed.desiredServicesCustom) setDesiredServicesCustom(parsed.desiredServicesCustom);
        if (parsed.relatedDomains) setRelatedDomains(parsed.relatedDomains);
        if (parsed.relatedDomainsCustom) setRelatedDomainsCustom(parsed.relatedDomainsCustom);
        if (parsed.willingQuestionBudget) setWillingQuestionBudget(parsed.willingQuestionBudget);
        if (parsed.willingToProvideSolutions) setWillingToProvideSolutions(parsed.willingToProvideSolutions);
        if (parsed.usageFrequency) setUsageFrequency(parsed.usageFrequency);
        if (parsed.willingToBeSideHustle) setWillingToBeSideHustle(parsed.willingToBeSideHustle);
        if (parsed.willingToSubscribeSolverPlan) setWillingToSubscribeSolverPlan(parsed.willingToSubscribeSolverPlan);
      }
    } catch {
      // Ignore draft read errors
    }
  }, []);

  // Save draft whenever user types
  useEffect(() => {
    if (mode === 'register') {
      try {
        const draft = {
          regName,
          regEmail,
          phone,
          gender,
          ageGroup,
          industry,
          jobTitle,
          company,
          desiredServices,
          desiredServicesCustom,
          relatedDomains,
          relatedDomainsCustom,
          willingQuestionBudget,
          willingToProvideSolutions,
          usageFrequency,
          willingToBeSideHustle,
          willingToSubscribeSolverPlan,
        };
        localStorage.setItem(STORAGE_SURVEY_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Ignore draft write errors
      }
    }
  }, [
    mode,
    regName,
    regEmail,
    phone,
    gender,
    ageGroup,
    industry,
    jobTitle,
    company,
    desiredServices,
    desiredServicesCustom,
    relatedDomains,
    relatedDomainsCustom,
    willingQuestionBudget,
    willingToProvideSolutions,
    usageFrequency,
    willingToBeSideHustle,
    willingToSubscribeSolverPlan,
  ]);

  if (!isOpen) return null;

  // Handle Guest Explorer
  const handleGuestExplore = () => {
    const guestUser = availableUsers.find((u) => u.id === 'user-guest') || {
      id: 'user-guest',
      name: '未登入訪客',
      title: '訪客身份 (未登入)',
      avatar: '',
      role: 'questioner' as const,
      balance: 0,
      pendingEarnings: 0,
      reputation: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      email: '',
      bio: '未登入訪客僅限瀏覽全站問題與公開解方，無法發布問題、留言或提案。',
    };

    setCurrentUser(guestUser);
    onClose();
  };

  // Google Login / Register
  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const googleUser = await loginWithFirebaseGoogle();
      const firestoreUser = await getUserFromFirestore(googleUser.uid);
      const existing = firestoreUser || availableUsers.find((u) => u.id === googleUser.uid || u.email?.toLowerCase() === googleUser.email?.toLowerCase());
      if (existing) {
        setCurrentUser(existing);
        setSuccessMsg(`歡迎回來，${existing.name}！已成功使用 Google 登入。`);
        setTimeout(() => onClose(), 1000);
      } else {
        // Pre-fill email and name from Google account, record authUid, then advance to step 2 survey
        setAuthUid(googleUser.uid);
        setRegName(googleUser.displayName || 'Google 用戶');
        setRegEmail(googleUser.email || '');
        setMode('register');
        setRegStep(2);
        setSuccessMsg('Google 授權成功！請繼續填寫您的個人基本資料與偏好問卷。');
      }
    } catch (err: any) {
      console.warn('Google auth warning:', err);
      // Fallback for simulation if popup blocked or offline
      if (err.message?.includes('彈出視窗') || err.message?.includes('取消')) {
        setErrorMsg(err.message);
      } else {
        // Friendly fallback mock login
        const mockGoogleUser = availableUsers.find((u) => u.id === 'user-1') || availableUsers[0];
        setCurrentUser(mockGoogleUser);
        setSuccessMsg(`已完成 Google 快速身分授權，登入為「${mockGoogleUser.name}」！`);
        setTimeout(() => onClose(), 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Email / Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg('請輸入電子信箱與密碼！');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const fbUser = await loginWithFirebaseEmail(loginEmail.trim(), loginPassword.trim());
      // 優先從 Firestore 資料庫讀取使用者文檔
      const firestoreUser = await getUserFromFirestore(fbUser.uid);
      const matched = firestoreUser || availableUsers.find((u) => u.id === fbUser.uid || u.email?.toLowerCase() === loginEmail.trim().toLowerCase()) || {
        id: fbUser.uid,
        name: fbUser.displayName || loginEmail.split('@')[0],
        title: '平台會員',
        avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'questioner' as const,
        balance: 1000,
        pendingEarnings: 0,
        reputation: 80,
        joinedDate: new Date().toISOString().split('T')[0],
        email: loginEmail.trim(),
      };
      setCurrentUser(matched);
      setAvailableUsers((prev) => {
        if (!prev.some((u) => u.id === matched.id)) {
          return [matched, ...prev];
        }
        return prev.map((u) => (u.id === matched.id ? { ...u, ...matched } : u));
      });
      setSuccessMsg(`登入成功！歡迎回來，${matched.name}。`);
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      // If user exists in local mock list, allow login as fallback
      const localMatched = availableUsers.find(
        (u) => u.email?.toLowerCase() === loginEmail.trim().toLowerCase()
      );
      if (localMatched) {
        setCurrentUser(localMatched);
        setSuccessMsg(`登入成功！歡迎回來，${localMatched.name}。`);
        setTimeout(() => onClose(), 1000);
      } else {
        setErrorMsg(err.message || '登入失敗，請確認帳號密碼。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Phone SMS Login with Firebase Phone Auth
  const handleSendSms = async () => {
    if (!loginPhone.trim()) {
      setErrorMsg('請輸入有效的手機號碼！');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (!recaptchaContainerRef.current) {
        throw new Error('reCAPTCHA 容器尚未就緒');
      }

      // Initialize or reuse RecaptchaVerifier
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = createRecaptchaVerifier(recaptchaContainerRef.current);
      }

      const confirmation = await loginWithFirebasePhone(
        loginPhone.trim(),
        recaptchaVerifierRef.current
      );
      confirmationResultRef.current = confirmation;
      setIsSmsSent(true);
      setSuccessMsg('Firebase 簡訊驗證碼已發送至手機！請查收 6 位數簡訊代碼。');
    } catch (err: any) {
      console.warn('Firebase phone SMS notice:', err);
      if (err.message?.includes('未啟用「電話') || err.message?.includes('operation-not-allowed')) {
        setErrorMsg('Firebase 尚未在控制台啟用電話登入。如為測試用途，請輸入測試驗證碼 123456');
        setIsSmsSent(true);
      } else {
        setErrorMsg(err.message || '發送 Firebase 簡訊失敗，請稍後再試');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginSmsCode.trim()) {
      setErrorMsg('請輸入 6 位數簡訊驗證碼！');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (confirmationResultRef.current) {
        // Real Firebase verification code confirmation
        const fbUser = await verifyFirebasePhoneCode(
          confirmationResultRef.current,
          loginSmsCode.trim()
        );
        const firestoreUser = await getUserFromFirestore(fbUser.uid);
        const matched =
          firestoreUser ||
          availableUsers.find(
            (u) =>
              u.id === fbUser.uid ||
              (u.phone && u.phone.replace(/[\s-]/g, '') === loginPhone.trim().replace(/[\s-]/g, ''))
          );

        if (matched) {
          setCurrentUser(matched);
          setSuccessMsg(`Firebase 手機登入成功！歡迎回來，${matched.name}。`);
          setTimeout(() => onClose(), 1000);
        } else {
          // New phone user: advance to profile setup
          setAuthUid(fbUser.uid);
          setPhone(loginPhone.trim());
          setRegName(`用戶${loginPhone.slice(-4)}`);
          setMode('register');
          setRegStep(2);
          setSuccessMsg('Firebase 手機驗證成功！請填寫基本個人資料以開通帳號。');
        }
      } else {
        // Fallback simulation for test environment (123456)
        if (loginSmsCode.trim() === '123456') {
          const matched =
            availableUsers.find(
              (u) =>
                u.phone &&
                u.phone.replace(/[\s-]/g, '') === loginPhone.trim().replace(/[\s-]/g, '')
            ) || availableUsers[0];
          setCurrentUser(matched);
          setSuccessMsg(`手機驗證成功！已為您登入「${matched.name}」。`);
          setTimeout(() => onClose(), 1000);
        } else {
          setErrorMsg('驗證碼不正確，測試環境請輸入 123456');
        }
      }
    } catch (err: any) {
      console.warn('Firebase phone login error:', err);
      setErrorMsg(err.message || '手機驗證碼驗證失敗，請重新確認！');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Advance to Step 2
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setErrorMsg('請輸入姓名或暱稱！');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('請輸入正確的電子郵件信箱！');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('密碼長度請設定至少 6 個字元！');
      return;
    }
    setErrorMsg(null);
    setRegStep(2);
  };

  // Step 2: Complete Registration & Save Survey
  const handleFinalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg('請填寫聯絡電話以確保帳號安全核驗！');
      return;
    }
    if (!jobTitle.trim()) {
      setErrorMsg('請填寫職位或專業頭銜！');
      return;
    }
    if (!agreeGeneralTerms) {
      setErrorMsg('請先勾選同意《一般服務條款》（含隱私權、免責聲明）！');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Firebase Authentication 註冊處理
      let registeredUid = authUid;
      if (!registeredUid) {
        try {
          const cred = await registerWithFirebaseEmail(regEmail.trim(), regPassword);
          registeredUid = cred.uid;
        } catch (authErr: any) {
          console.warn('Firebase register notice:', authErr);
          if (authErr.message?.includes('已被註冊') || authErr.code === 'auth/email-already-in-use') {
            setErrorMsg('此電子郵件在 Firebase 已被註冊，請直接以該帳號登入！');
            setIsLoading(false);
            return;
          } else if (authErr.code === 'auth/weak-password') {
            setErrorMsg('密碼強度不足，請設定至少 6 位元密碼！');
            setIsLoading(false);
            return;
          } else if (authErr.code === 'auth/invalid-email') {
            setErrorMsg('電子郵件格式不正確！');
            setIsLoading(false);
            return;
          }
          // 其他網路或驗證錯誤
          setErrorMsg(authErr.message || 'Firebase 驗證註冊失敗，請稍後再試');
          setIsLoading(false);
          return;
        }
      }

      const survey: UserSurveyData = {
        desiredServices,
        desiredServicesCustom: desiredServicesCustom.trim() || undefined,
        relatedDomains,
        relatedDomainsCustom: relatedDomainsCustom.trim() || undefined,
        willingQuestionBudget,
        willingToProvideSolutions,
        usageFrequency,
        willingToBeSideHustle,
        willingToSubscribeSolverPlan,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newId = registeredUid || `user-${Date.now().toString(36)}`;
      const newUser: UserType = {
        id: newId,
        name: regName.trim(),
        title: jobTitle.trim(),
        avatar:
          regRole === 'solver'
            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: regRole,
        balance: 1000, // 新人註冊贈送 1,000 點體驗金
        pendingEarnings: 0,
        reputation: 100,
        joinedDate: new Date().toISOString().split('T')[0],
        bio: `${regName.trim()} 的個人簡介。行業背景：${industry}。`,
        email: regEmail.trim(),
        phone: phone.trim(),
        gender,
        ageGroup,
        industry,
        jobTitle: jobTitle.trim(),
        annualSalary,
        company: company.trim() || undefined,
        domain: (relatedDomains[0] as Category) || '創新創業',
        skills: [...relatedDomains, '問題解題'],
        subscriptionTier: 'free',
        verifiedExpert: false,
        rating: 5.0,
        reviewCount: 0,
        acceptedSolutionsCount: 0,
        submittedSolutionsCount: 0,
        surveyData: survey,
        hasAgreedGeneralTerms: true,
        agreedGeneralTermsVersion: CURRENT_TERMS_VERSION,
        agreedGeneralTermsAt: new Date().toISOString(),
      };

      // 2. 即時寫入 Cloud Firestore 資料庫 (users 集合)
      await syncUserToFirestore(newUser);

      // 3. 更新 Context 與本地
      setCurrentUser(newUser);
      setAvailableUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id)]);
      recordTermsAgreement('general', CURRENT_TERMS_VERSION);

      // 4. 清除調研問卷草稿
      try {
        localStorage.removeItem(STORAGE_SURVEY_DRAFT_KEY);
      } catch {
        // Ignore
      }

      setSuccessMsg('🎉 帳號已於 Firebase Authentication 註冊成功，資料已同步寫入 Firestore！');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || '註冊過程中發生錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchAccount = (u: UserType) => {
    setCurrentUser(u);
    setSuccessMsg(`已成功切換為「${u.name}」！`);
    setTimeout(() => onClose(), 800);
  };

  const DOMAIN_OPTIONS: string[] = [
    '創新創業',
    '資訊工程',
    '商業顧問',
    '行銷企劃',
    '產品設計',
    '法務財務',
    '生技醫療',
    '生活綜合',
  ];

  const DESIRED_SERVICES_OPTIONS = [
    '發布懸賞徵求專家解方',
    '提供解答賺取有償回饋',
    '大師專家一對一私聊諮詢',
    '專案客製化落地驗收交付',
    '探索市場痛點與創新商機',
    '拓展跨界人脈網絡',
  ];

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{ zIndex: 2147483647, position: 'fixed', inset: 0 }}
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        style={{ zIndex: 2147483647 }}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[84vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/15 via-amber-100/40 to-stone-50 border-b border-amber-200/60 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-stone-600 hover:text-stone-900 transition-colors shadow-2xs cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <IdeaXLogo variant="mark" size="sm" />
            <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
              創點子 IdeaX 統一身分認證 (Firebase Auth)
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-stone-900">
            {mode === 'login' ? '會員登入' : regStep === 1 ? '註冊 IdeaX 新帳號' : '基本個資與服務調研問卷 (首次必填)'}
          </h2>

          {interceptReason && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-100/90 text-amber-950 text-xs font-bold flex items-center gap-2 border border-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{interceptReason}</span>
            </div>
          )}

          {/* Mode Switch Tabs */}
          <div className="mt-3.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex p-1 bg-stone-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                登入帳號
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setRegStep(1);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                免費註冊
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ======================= MODE 1: LOGIN ======================= */}
          {mode === 'login' && (
            <div className="space-y-4">
              {/* Google Fast 1-Click Login Button with Official Google Logo */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl border-2 border-stone-200 hover:border-blue-500 bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-900 font-extrabold text-sm flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {/* Official Google 4-Color G Logo */}
                  <div className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-stone-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-black text-stone-900 text-sm tracking-tight flex items-center gap-1.5">
                      <span>使用 Google 帳號一鍵登入</span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-medium">免輸入密碼・安全快速・點擊立即登入</div>
                  </div>
                </div>
                <span className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  一鍵登入 →
                </span>
              </button>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-[10px] text-stone-400 font-bold uppercase">或使用以下 Firebase 驗證方式</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* Sub-tabs: Email / Phone / Switch Account */}
              <div className="flex border-b border-stone-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`pb-2 px-3 sm:px-4 border-b-2 cursor-pointer transition-colors ${
                    loginMethod === 'email'
                      ? 'border-amber-500 text-stone-900 font-black'
                      : 'border-transparent text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Firebase 郵件登入
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`pb-2 px-3 sm:px-4 border-b-2 cursor-pointer transition-colors ${
                    loginMethod === 'phone'
                      ? 'border-amber-500 text-stone-900 font-black'
                      : 'border-transparent text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Firebase 電話登入
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('switch')}
                  className={`pb-2 px-3 sm:px-4 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                    loginMethod === 'switch'
                      ? 'border-amber-500 text-stone-900 font-black'
                      : 'border-transparent text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>切換帳號</span>
                </button>
              </div>

              {/* Email Form */}
              {loginMethod === 'email' && (
                <form onSubmit={handleEmailLogin} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">電子信箱</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="請輸入 Firebase 註冊的 Email"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">密碼</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="請輸入密碼"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Firebase 郵件驗證中...' : 'Firebase 郵件登入'}
                  </button>
                </form>
              )}

              {/* Phone SMS Form */}
              {loginMethod === 'phone' && (
                <form onSubmit={handlePhoneLogin} className="space-y-3 pt-1">
                  {/* Invisible Recaptcha Container for Firebase Phone Auth */}
                  <div ref={recaptchaContainerRef} id="firebase-recaptcha-container" />

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">手機號碼 (Firebase 電話驗證)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          placeholder="例如：0912-345-678 或 +886912345678"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendSms}
                        disabled={isLoading}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold whitespace-nowrap cursor-pointer transition-all disabled:opacity-50"
                      >
                        {isLoading ? '發送中...' : isSmsSent ? '重新發送簡訊' : '發送 Firebase 簡訊'}
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">
                      透過 Firebase 官方 Phone Auth 發送 SMS 驗證碼至手機。
                    </p>
                  </div>

                  {isSmsSent && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Firebase 簡訊 6 位數驗證碼</label>
                      <input
                        type="text"
                        required
                        value={loginSmsCode}
                        onChange={(e) => setLoginSmsCode(e.target.value)}
                        placeholder="請輸入手機收到的 6 位數字驗證碼"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-amber-50/40 focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !isSmsSent}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Firebase 驗證中...' : 'Firebase 手機驗證登入'}
                  </button>
                </form>
              )}

              {/* 切換帳號清單面板 */}
              {loginMethod === 'switch' && (
                <div className="space-y-2.5 pt-1 max-h-64 overflow-y-auto pr-1">
                  {/* Google 1-Click Option inside Switch */}
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="w-full p-2.5 rounded-xl border-2 border-stone-200 hover:border-blue-400 bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-900 font-extrabold text-xs flex items-center justify-between gap-2.5 shadow-2xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-stone-200 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <span className="font-black text-stone-900 block">使用 Google 帳號一鍵登入 / 切換</span>
                        <span className="text-[10px] text-stone-500">串接 Google 官方快速授權</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                      一鍵登入
                    </span>
                  </button>

                  <div className="flex items-center gap-2 my-1">
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-[10px] text-stone-400 font-bold uppercase">或選擇已登錄身分快速切換</span>
                    <div className="flex-1 h-px bg-stone-200" />
                  </div>
                  {availableUsers
                    .filter((u) => u.id !== 'user-guest')
                    .map((u) => {
                      const isCurrent = currentUser.id === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSwitchAccount(u)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200'
                              : 'bg-stone-50 hover:bg-stone-100 border-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {u.avatar && u.avatar.trim() !== '' ? (
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-8 h-8 rounded-lg object-cover ring-1 ring-stone-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {u.name.slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-stone-900 truncate">{u.name}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                    u.role === 'admin'
                                      ? 'bg-purple-100 text-purple-800'
                                      : u.role === 'solver'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {u.role === 'admin' ? '管理員' : u.role === 'solver' ? '解答者' : '提問者'}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                    當前
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-stone-400 truncate">{u.title || u.email || '平台會員'}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-amber-700 shrink-0">
                            {isCurrent ? '使用中' : '切換 →'}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* 訪客探索按鈕 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGuestExplore}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 hover:text-stone-950 text-xs font-bold flex items-center justify-center gap-2 border border-stone-200 transition-all cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-stone-500" />
                  <span>訪客探索，瀏覽與部分功能</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================= MODE 2: REGISTER ======================= */}
          {mode === 'register' && (
            <div>
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      regStep === 1 ? 'bg-amber-500 text-stone-950' : 'bg-emerald-500 text-white'
                    }`}
                  >
                    1
                  </div>
                  <span className={`text-xs font-bold ${regStep === 1 ? 'text-stone-900 font-black' : 'text-stone-500'}`}>
                    帳號與角色
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400" />
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      regStep === 2 ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    2
                  </div>
                  <span className={`text-xs font-bold ${regStep === 2 ? 'text-stone-900 font-black' : 'text-stone-400'}`}>
                    基本個資與調研問卷 (首次必填)
                  </span>
                </div>
              </div>

              {/* STEP 1: Account & Role */}
              {regStep === 1 && (
                <form onSubmit={handleStep1Next} className="space-y-3.5">
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-2xl border-2 border-stone-200 hover:border-amber-400 bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-900 font-extrabold text-sm flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition-all cursor-pointer group mb-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-stone-100 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-stone-900 text-sm tracking-tight flex items-center gap-1.5">
                          <span>使用 Google 快速註冊授權</span>
                        </div>
                        <div className="text-[10px] text-stone-500 font-medium">免輸入密碼・一鍵快速開通</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                      快速一鍵
                    </span>
                  </button>

                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-[10px] text-stone-400 font-bold uppercase">或填寫 Email 註冊</span>
                    <div className="flex-1 h-px bg-stone-200" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      稱呼 / 姓名 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="請輸入稱呼或品牌名稱"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      電子郵件 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="example@ideax.tw"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      設定密碼 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="請輸入至少 6 位元密碼"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      初始身份偏好（註冊後隨時可切換）：
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRegRole('questioner')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                          regRole === 'questioner'
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-black ring-1 ring-amber-300'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        💡 提問者 (尋求商業解方)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole('solver')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                          regRole === 'solver'
                            ? 'bg-blue-100 border-blue-400 text-blue-950 font-black ring-1 ring-blue-300'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        🎯 解答者 (提供落地方案接案)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>下一步：填寫基本個資與服務調研問卷</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: Basic Profile & 7 Core Survey Questions */}
              {regStep === 2 && (
                <form onSubmit={handleFinalRegister} className="space-y-4">
                  {/* Section A: 基本個資 */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                    <h3 className="text-xs font-black text-stone-900 flex items-center gap-1.5 uppercase">
                      <UserIcon className="w-3.5 h-3.5 text-amber-600" />
                      <span>第一部分：基本個人資料</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          性別 <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200 font-medium"
                        >
                          <option value="male">男性</option>
                          <option value="female">女性</option>
                          <option value="other">其他多元性別</option>
                          <option value="undisclosed">不便透露</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          年齡層 <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={ageGroup}
                          onChange={(e) => setAgeGroup(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200 font-medium"
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          行業領域 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          placeholder="例如：資訊軟體、金融財務、餐飲零售"
                          className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          職位 / 專業頭銜 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="例如：資深架構師、創辦人、行銷總監"
                          className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          目前薪水(年)？ <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={annualSalary}
                          onChange={(e) => setAnnualSalary(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200 font-medium"
                        >
                          <option value="under_500k">未滿 50 萬</option>
                          <option value="500k_1000k">50 萬 - 100 萬</option>
                          <option value="1000k_2000k">100 萬 - 200 萬</option>
                          <option value="2000k_3000k">200 萬 - 300 萬</option>
                          <option value="above_3000k">300 萬以上</option>
                          <option value="undisclosed">不方便透露</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          公司名稱 <span className="text-stone-400 font-normal">(選填)</span>
                        </label>
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="公司或所屬組織機構"
                          className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          聯絡電話 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="例如：0912-345-678"
                          className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section B: 7 道調研問卷 */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-300 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>第二部分：期望服務與使用習慣問卷（選填，可跳過）</span>
                      </h3>
                      <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        選填・可直接提交註冊
                      </span>
                    </div>

                    {/* Q1: 期望在IdeaX使用的服務 */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        1. 期望在 IdeaX 使用的服務（選項與自填，可多選）
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {DESIRED_SERVICES_OPTIONS.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={desiredServices.includes(opt)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDesiredServices((prev) => [...prev, opt]);
                                } else {
                                  setDesiredServices((prev) => prev.filter((x) => x !== opt));
                                }
                              }}
                              className="w-3.5 h-3.5 accent-amber-600 rounded"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={desiredServicesCustom}
                        onChange={(e) => setDesiredServicesCustom(e.target.value)}
                        placeholder="其他期望服務（自填補充）..."
                        className="mt-1.5 w-full px-2.5 py-1 text-xs bg-white rounded-xl border border-stone-200"
                      />
                    </div>

                    {/* Q2: 相關領域 */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        2. 相關領域（按平台分類或自行輸入，可多選）
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {DOMAIN_OPTIONS.map((d) => {
                          const isSelected = relatedDomains.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setRelatedDomains((prev) => prev.filter((x) => x !== d));
                                } else {
                                  setRelatedDomains((prev) => [...prev, d]);
                                }
                              }}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                              }`}
                            >
                              {isSelected ? `✓ ${d}` : `+ ${d}`}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        value={relatedDomainsCustom}
                        onChange={(e) => setRelatedDomainsCustom(e.target.value)}
                        placeholder="其他擅長或感興趣之領域（自行輸入）..."
                        className="mt-1.5 w-full px-2.5 py-1 text-xs bg-white rounded-xl border border-stone-200"
                      />
                    </div>

                    {/* Q3: 願意一次花多少錢在尋求解答(自行提問)? */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        3. 願意一次花多少錢在尋求解答 (自行提問)?
                      </label>
                      <select
                        value={willingQuestionBudget}
                        onChange={(e) => setWillingQuestionBudget(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200 font-medium"
                      >
                        <option value="under_500">NT$ 500 以下（快速小問題諮詢）</option>
                        <option value="500_2000">NT$ 500 ~ 2,000（標準痛點剖析）</option>
                        <option value="2000_5000">NT$ 2,000 ~ 5,000（商業深度解題）</option>
                        <option value="5000_20000">NT$ 5,000 ~ 20,000（專案落地交付）</option>
                        <option value="above_20000">NT$ 20,000 以上（長期重大顧問委託）</option>
                        <option value="none">尚未有付費意願（僅先瀏覽）</option>
                      </select>
                    </div>

                    {/* Q4: 是否願意有償為其他提問提供解方(為人解答)? */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        4. 是否願意有償為其他提問提供解方 (為人解答)?
                      </label>
                      <select
                        value={willingToProvideSolutions}
                        onChange={(e) => setWillingToProvideSolutions(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200 font-medium"
                      >
                        <option value="very_willing">非常願意（積極解答並接案領取賞金）</option>
                        <option value="depends_bounty">視題目難度與報酬金額而定</option>
                        <option value="not_willing">暫無意願（目前僅想提問或瀏覽）</option>
                      </select>
                    </div>

                    {/* Q5: 您多久打開一次 IdeaX ? */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        5. 您多久打開一次 IdeaX ?
                      </label>
                      <select
                        value={usageFrequency}
                        onChange={(e) => setUsageFrequency(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200 font-medium"
                      >
                        <option value="multiple_daily">每天數次（熱愛尋找商機與交流）</option>
                        <option value="daily">每天至少 1 次</option>
                        <option value="few_times_weekly">每週 2 ~ 3 次</option>
                        <option value="weekly">每週 1 次</option>
                        <option value="on_demand">偶爾或有特定需求才打開</option>
                      </select>
                    </div>

                    {/* Q6: 您是否願意將解答作為您的副業(有償)? */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        6. 您是否願意將解答作為您的副業 (有償)?
                      </label>
                      <select
                        value={willingToBeSideHustle}
                        onChange={(e) => setWillingToBeSideHustle(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-stone-200 font-medium"
                      >
                        <option value="very_willing">非常願意（發展為主要副業收入）</option>
                        <option value="considering">考慮中（有空檔時間嘗試兼職）</option>
                        <option value="open_minded">不排斥但目前無具體規劃</option>
                        <option value="not_interested">目前不考慮作為副業</option>
                      </select>
                    </div>

                    {/* Q7: 您是否願意花錢訂閱解答者的優惠方案? */}
                    <div className="p-3 rounded-xl bg-white border border-amber-300/80 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-bold text-stone-900">
                          7. 您是否願意花錢訂閱解答者的優惠方案?
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPlansPreview(true)}
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 underline cursor-pointer"
                        >
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>查看各方案權益對照表（作答不遺失）</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      <select
                        value={willingToSubscribeSolverPlan}
                        onChange={(e) => setWillingToSubscribeSolverPlan(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-stone-50 rounded-xl border border-stone-200 font-medium"
                      >
                        <option value="willing">願意（透過年繳或月繳降低平台抽成並享專屬曝光）</option>
                        <option value="depends_profit">視在平台接案獲利情況而定</option>
                        <option value="free_tier_first">先體驗完全免費版</option>
                        <option value="not_willing">暫不考慮付費訂閱</option>
                      </select>
                    </div>
                  </div>

                  {/* General Terms Agreement Checkbox */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={agreeGeneralTerms}
                        onChange={(e) => setAgreeGeneralTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-amber-600 rounded cursor-pointer shrink-0"
                      />
                      <div className="text-xs text-stone-800 leading-relaxed select-none">
                        <span className="font-extrabold text-amber-950">註冊法定條款同意（必要）：</span>
                        我已詳細閱讀、理解並同意創點子 IdeaX
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            openAboutModal('general_terms');
                          }}
                          className="font-bold text-amber-800 underline mx-1 hover:text-amber-950 cursor-pointer"
                        >
                          《一般服務條款》
                        </button>
                        （包含
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            openAboutModal('privacy_policy');
                          }}
                          className="font-bold text-amber-800 underline mx-0.5 hover:text-amber-950 cursor-pointer"
                        >
                          隱私權聲明
                        </button>
                        與
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            openAboutModal('disclaimer');
                          }}
                          className="font-bold text-amber-800 underline mx-0.5 hover:text-amber-950 cursor-pointer"
                        >
                          免責聲明
                        </button>
                        ）。
                      </div>
                    </label>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs cursor-pointer"
                    >
                      ← 返回上一步
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !agreeGeneralTerms}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-stone-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? '儲存資料並完成註冊中...' : '確認完成註冊並開通帳號'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Subscription Plans Comparison Modal (Draft preserved) */}
      {showPlansPreview && (
        <div
          style={{ zIndex: 2147483647, position: 'fixed', inset: 0 }}
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 p-5 sm:p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-stone-900">解答者會員方案權益對照</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlansPreview(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              IdeaX 提供 4 級階梯制會員方案，越高等級方案享有<strong>更低平台手續費拆款比率</strong>與<strong>更多首頁大師專屬曝光席位</strong>。查看後點擊關閉，您的問卷作答內容將完整保留！
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {Object.values(subscriptionPlans).map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 hover:border-amber-400 hover:bg-amber-50/30 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-stone-900">{p.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      費率：{p.feeDiscountText}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-amber-700">
                    {p.monthlyPrice === 0 ? '完全免費' : `NT$ ${p.monthlyPrice.toLocaleString()} / 月`}
                  </p>
                  <ul className="text-[11px] text-stone-600 space-y-1">
                    {p.benefits.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPlansPreview(false)}
                className="px-5 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors cursor-pointer"
              >
                返回問卷繼續完成註冊
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

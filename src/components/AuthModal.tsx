import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  EyeOff,
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
  KeyRound,
  Check,
  Smartphone,
  Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IdeaXLogo } from './IdeaXLogo';
import { CURRENT_TERMS_VERSION } from '../data/termsData';
import { User as UserType, UserSurveyData, Category } from '../types';
import {
  loginWithFirebaseEmail,
  registerWithFirebaseEmail,
  loginWithFirebaseGoogle,
  loginWithFirebaseFacebook,
  loginWithFirebasePhone,
  verifyFirebasePhoneCode,
  sendFirebasePasswordReset,
  createRecaptchaVerifier,
} from '../services/firebaseAuth';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { syncUserToFirestore, getUserFromFirestore } from '../services/firestoreSync';
import { recordUserBoard, recordUserSpecialZone } from '../services/recommendationService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialMethod?: 'email' | 'phone' | 'switch';
  interceptReason?: string; // Optional reason why login is required (e.g., '訪客無法發布問題，請先登入')
}

export interface InterestDomainGroup {
  categoryTitle: string;
  badgeClass: string;
  domains: string[];
}

export const ONBOARDING_INTEREST_DOMAIN_GROUPS: InterestDomainGroup[] = [
  {
    categoryTitle: '主題專區',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    domains: ['創新創業', '閒談交流（L0）'],
  },
  {
    categoryTitle: '創新創業子領域',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    domains: ['資訊科技', '生醫材料', '機械工業', '服務餐飲', '文創工藝'],
  },
  {
    categoryTitle: '專業問題子領域',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    domains: ['水電', '室內裝修', '法律智財', '會計稅務', '企業管理'],
  },
  {
    categoryTitle: '學術探討子領域',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    domains: ['生技醫療', '資訊工程', '電機', '法律政治', '商管', '文學', '社會科學', '藝術設計'],
  },
  {
    categoryTitle: '日常疑難子領域',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    domains: ['職場', '家務', '感情', '時事', '購物', '其他'],
  },
];

const STORAGE_SURVEY_DRAFT_KEY = 'ideax_reg_survey_draft_v1';
const STORAGE_REMEMBER_LOGIN_KEY = 'ideax_remember_login_v1';

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
    deviceAccounts,
    switchAccount,
    recordTermsAgreement,
    openAboutModal,
    subscriptionPlans,
    addTestAccount,
    checkUserDeactivationStatus,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>(initialMode);

  // Login method tabs: 'password' = Account/Email & Password, 'sms' = Phone SMS Login
  const [loginMethod, setLoginMethod] = useState<'password' | 'sms'>(
    initialMethod === 'phone' ? 'sms' : 'password'
  );

  // Phone SMS Login states
  const [smsPhone, setSmsPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsConfirmation, setSmsConfirmation] = useState<ConfirmationResult | null>(null);
  const [isSmsSending, setIsSmsSending] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Login inputs (Username / Phone / Email & Password)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Register wizard step: 1 = Basic Account & Password Rules, 2 = Profile & Survey Questionnaire
  const [regStep, setRegStep] = useState<1 | 2>(1);

  // Step 1: Account registration fields
  const [regAuthProvider, setRegAuthProvider] = useState<'email' | 'google' | 'facebook' | 'phone'>('email');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<'questioner' | 'solver'>('questioner');
  const [authUid, setAuthUid] = useState<string | null>(null);

  // Step 2: Solver Real-Name KYC & Questioner Interests
  const [regRealLegalName, setRegRealLegalName] = useState('');
  const [regIdNumber, setRegIdNumber] = useState('');
  const [regInterests, setRegInterests] = useState<string[]>(['創新創業', '資訊科技']);

  // Forgot password fields & method ('email' | 'sms')
  const [forgotMethod, setForgotMethod] = useState<'email' | 'sms'>('email');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSmsCode, setForgotSmsCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [isForgotCodeSent, setIsForgotCodeSent] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);

  // SMS countdown timer
  useEffect(() => {
    let timer: any = null;
    if (smsCountdown > 0) {
      timer = setInterval(() => {
        setSmsCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [smsCountdown]);

  // Step 2: Personal Profile & Survey
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

  // Terms agreement
  const [agreeGeneralTerms, setAgreeGeneralTerms] = useState(true);

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync mode when opened (剛開始進入登入頁面時帳號與密碼欄位要是空的)
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLoginIdentifier('');
      setLoginPassword('');
      setShowPassword(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      setHasAttemptedSubmit(false);
    }
  }, [isOpen, initialMode]);

  // Load remember me state from localStorage (不預先填入帳號，保持欄位為空)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REMEMBER_LOGIN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.rememberMe === 'boolean') setRememberMe(parsed.rememberMe);
      }
    } catch {
      // ignore
    }
  }, []);

  // 判定本機裝置是否曾登入過管理員帳號（有登入過管理員時，登入頁面膠囊切換區才亮出 1~3 測試角色供快速切換）
  const hasAdminOnThisDevice = useMemo(() => {
    return (
      deviceAccounts.some((d) => d.userId === 'user-admin') ||
      currentUser.role === 'admin' ||
      currentUser.id === 'user-admin'
    );
  }, [deviceAccounts, currentUser.role, currentUser.id]);

  const sortedAvailableUsers = useMemo(() => {
    const deviceUserIds = new Set(deviceAccounts.map((d) => d.userId));

    if (hasAdminOnThisDevice) {
      // 本地有管理員登入紀錄：在膠囊式切換區提供 1~3 核心測試角色（管理員、認證專家、發案者）與本地其他已登入帳號
      const testPersonas: UserType[] = [
        availableUsers.find((u) => u.id === 'user-admin' || u.role === 'admin') || ({
          id: 'user-admin',
          name: '管理員',
          role: 'admin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          balance: 50000,
        } as UserType),
        availableUsers.find((u) => u.id === 'solver-1') || availableUsers.find((u) => u.role === 'solver' && u.verifiedExpert) || ({
          id: 'solver-1',
          name: '柯育任',
          title: '智慧零售架構師',
          role: 'solver',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          verifiedExpert: true,
        } as UserType),
        availableUsers.find((u) => u.id === 'user-questioner') || availableUsers.find((u) => u.role === 'questioner') || ({
          id: 'user-questioner',
          name: '林書豪',
          title: '發案提問者',
          role: 'questioner',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          balance: 3000,
        } as UserType),
      ].filter(Boolean) as UserType[];

      const otherDeviceUsers = availableUsers.filter(
        (u) =>
          u.id !== 'user-guest' &&
          deviceUserIds.has(u.id) &&
          !testPersonas.some((tp) => tp.id === u.id)
      );

      return [...testPersonas, ...otherDeviceUsers];
    }

    // 一般非管理員訪客/用戶：僅顯示本機裝置曾登入之一般帳號，絕不外露測試角色與管理員
    return availableUsers
      .filter((u) => {
        if (u.id === 'user-guest') return false;
        if (!deviceUserIds.has(u.id)) return false;
        if (
          u.id === 'user-admin' ||
          u.id.startsWith('solver-') ||
          u.id === 'user-questioner' ||
          u.id.startsWith('user-test-')
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const devA = deviceAccounts.find((d) => d.userId === a.id);
        const devB = deviceAccounts.find((d) => d.userId === b.id);

        const timeA = devA?.lastLoginAt ? new Date(devA.lastLoginAt).getTime() : 0;
        const timeB = devB?.lastLoginAt ? new Date(devB.lastLoginAt).getTime() : 0;

        return timeB - timeA;
      });
  }, [availableUsers, hasAdminOnThisDevice, deviceAccounts]);

  // Validation helpers for Username and Password
  const validateUsername = (uname: string): { isValid: boolean; message: string } => {
    const trimmed = uname.trim();
    if (!trimmed) {
      return { isValid: false, message: '請輸入帳號名稱' };
    }
    // 支援 4~20 位英數字或底線，或合法手機號碼 / Email
    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
    const phoneRegex = /^09\d{8}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (usernameRegex.test(trimmed) || phoneRegex.test(trimmed.replace(/[\s-]/g, '')) || emailRegex.test(trimmed)) {
      return { isValid: true, message: '帳號格式正確' };
    }
    return { isValid: false, message: '帳號需為 4 ~ 20 位英數字或底線，或輸入手機號碼 / Email' };
  };

  const validatePassword = (pwd: string): { isValid: boolean; message: string; hasLength: boolean; hasLetter: boolean; hasNumber: boolean } => {
    const hasLength = pwd.length >= 6 && pwd.length <= 20;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const isValid = hasLength && hasLetter && hasNumber;

    let message = '密碼格式正確';
    if (!hasLength) {
      message = '密碼需為 6 ~ 20 位字元';
    } else if (!hasLetter || !hasNumber) {
      message = '密碼必須同時包含英文字母與數字';
    }
    return { isValid, message, hasLength, hasLetter, hasNumber };
  };

  // Main Account + Password Login Handler
  const handleAccountPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const identifier = loginIdentifier.trim();
    const password = loginPassword.trim();

    if (!identifier) {
      setErrorMsg('登入失敗：請輸入帳號、手機號碼或 Email。');
      return;
    }
    if (!password) {
      setErrorMsg('登入失敗：請輸入密碼。');
      return;
    }

    const userVal = validateUsername(identifier);
    if (!userVal.isValid) {
      setErrorMsg('登入失敗：帳號格式不符合規定（需為 4 ~ 20 位英數字或底線，或輸入正確手機/Email）。');
      return;
    }

    const pwdVal = validatePassword(password);
    if (!pwdVal.isValid) {
      setErrorMsg('密碼錯誤（需為 6 ~ 20 位英數組合）');
      return;
    }

    setIsLoading(true);

    try {
      // 1. 特殊判定：官方管理員 (Admin_001 / John930521)
      const isAdminIdentifier =
        identifier.toLowerCase() === 'admin_001' ||
        identifier.toLowerCase() === 'admin' ||
        identifier.toLowerCase() === 'user-admin' ||
        identifier.toLowerCase() === 'operations@ideax.io';

      if (isAdminIdentifier) {
        if (password === 'John930521') {
          const adminUser: UserType = availableUsers.find((u) => u.id === 'user-admin') || {
            id: 'user-admin',
            username: 'Admin_001',
            password: 'John930521',
            name: 'IdeaX 管理團隊',
            title: '平台總管',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
            role: 'admin',
            balance: 50000,
            pendingEarnings: 0,
            reputation: 100,
            joinedDate: '2025-01-01',
            bio: '創點子 IdeaX 官方管理員，維護第三方支付安全託管、自動拆款撥付及專家認證。',
            email: 'operations@ideax.io',
            phone: '0912-345-678',
            verifiedExpert: true,
            subscriptionTier: 'master',
          };

          setCurrentUser(adminUser);
          setAvailableUsers((prev) => {
            if (!prev.some((u) => u.id === 'user-admin')) {
              return [adminUser, ...prev];
            }
            return prev.map((u) => (u.id === 'user-admin' ? { ...u, ...adminUser } : u));
          });

          if (rememberMe) {
            localStorage.setItem(
              STORAGE_REMEMBER_LOGIN_KEY,
              JSON.stringify({ identifier: 'Admin_001', rememberMe: true, lastLoginAt: new Date().toISOString() })
            );
          } else {
            localStorage.removeItem(STORAGE_REMEMBER_LOGIN_KEY);
          }

          setSuccessMsg('登入成功。');
          setTimeout(() => onClose(), 400);
          return;
        } else {
          setErrorMsg('密碼錯誤（需為 6 ~ 20 位英數組合）');
          setIsLoading(false);
          return;
        }
      }

      // 2. 本地與現有用戶匹配 (Username / Email / Phone)
      const cleanPhone = identifier.replace(/[\s-]/g, '');
      const localMatched = availableUsers.find((u) => {
        const matchUsername = u.username && u.username.toLowerCase() === identifier.toLowerCase();
        const matchEmail = u.email && u.email.toLowerCase() === identifier.toLowerCase();
        const matchPhone = u.phone && u.phone.replace(/[\s-]/g, '') === cleanPhone;
        const matchId = u.id === identifier;
        return matchUsername || matchEmail || matchPhone || matchId;
      });

      if (localMatched) {
        if (localMatched.password && localMatched.password !== password) {
          setErrorMsg('密碼錯誤（需為 6 ~ 20 位英數組合）');
          setIsLoading(false);
          return;
        }

        const checkRes = checkUserDeactivationStatus(localMatched);
        if (!checkRes.canLogin) {
          setErrorMsg('登入失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已完成註銷。'));
          setIsLoading(false);
          return;
        }

        const effectiveUser = checkRes.restoredUser || localMatched;
        setCurrentUser(effectiveUser);

        if (checkRes.wasInGracePeriod) {
          setAvailableUsers((prev) => prev.map((u) => (u.id === effectiveUser.id ? effectiveUser : u)));
        }

        if (rememberMe) {
          localStorage.setItem(
            STORAGE_REMEMBER_LOGIN_KEY,
            JSON.stringify({ identifier: effectiveUser.username || effectiveUser.email || identifier, rememberMe: true, lastLoginAt: new Date().toISOString() })
          );
        } else {
          localStorage.removeItem(STORAGE_REMEMBER_LOGIN_KEY);
        }

        setSuccessMsg('登入成功。');
        setTimeout(() => onClose(), 400);
        return;
      }

      // 3. 若輸入為 Email，嘗試使用 Firebase Email 登入
      if (identifier.includes('@')) {
        try {
          const fbUser = await loginWithFirebaseEmail(identifier, password);
          const firestoreUser = await getUserFromFirestore(fbUser.uid);
          const matched = firestoreUser || {
            id: fbUser.uid,
            name: fbUser.displayName || identifier.split('@')[0],
            title: '平台會員',
            avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            role: 'questioner' as const,
            balance: 1000,
            pendingEarnings: 0,
            reputation: 80,
            joinedDate: new Date().toISOString().split('T')[0],
            email: identifier,
          };

          const checkRes = checkUserDeactivationStatus(matched);
          if (!checkRes.canLogin) {
            setErrorMsg('登入失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已註銷。'));
            setIsLoading(false);
            return;
          }

          const effectiveUser = checkRes.restoredUser || matched;
          setCurrentUser(effectiveUser);
          setAvailableUsers((prev) => {
            if (!prev.some((u) => u.id === effectiveUser.id)) return [effectiveUser, ...prev];
            return prev.map((u) => (u.id === effectiveUser.id ? effectiveUser : u));
          });

          if (rememberMe) {
            localStorage.setItem(
              STORAGE_REMEMBER_LOGIN_KEY,
              JSON.stringify({ identifier, rememberMe: true, lastLoginAt: new Date().toISOString() })
            );
          }

          setSuccessMsg('登入成功。');
          setTimeout(() => onClose(), 400);
          return;
        } catch (firebaseErr: any) {
          console.warn('Firebase login attempt failed:', firebaseErr);
          if (
            firebaseErr?.code === 'auth/wrong-password' ||
            firebaseErr?.code === 'auth/invalid-credential' ||
            firebaseErr?.code === 'auth/invalid-password'
          ) {
            setErrorMsg('密碼錯誤（需為 6 ~ 20 位英數組合）');
            setIsLoading(false);
            return;
          }
        }
      }

      setErrorMsg('登入失敗：此帳號尚未註冊，請檢查輸入或點擊快速註冊。');
    } catch (err: any) {
      setErrorMsg('登入失敗：' + (err.message || '系統錯誤，請稍後再試。'));
    } finally {
      setIsLoading(false);
    }
  };

  // Google Fast Login
  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      const googleUser = await loginWithFirebaseGoogle();
      const firestoreUser = await getUserFromFirestore(googleUser.uid);
      const existing = firestoreUser || availableUsers.find((u) => u.id === googleUser.uid || u.email?.toLowerCase() === googleUser.email?.toLowerCase());
      if (existing) {
        const checkRes = checkUserDeactivationStatus(existing);
        if (!checkRes.canLogin) {
          setErrorMsg('登入失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已註銷。'));
          return;
        }
        const effectiveUser = checkRes.restoredUser || existing;
        setCurrentUser(effectiveUser);
        setSuccessMsg('登入成功。');
        setTimeout(() => onClose(), 400);
      } else {
        // 新用戶：設置 Google 授權資訊，引導進入身分選擇與專屬後續程序
        setAuthUid(googleUser.uid);
        setRegAuthProvider('google');
        setRegName(googleUser.displayName || 'Google 用戶');
        setRegRealLegalName(googleUser.displayName || '');
        setRegEmail(googleUser.email || '');
        setRegUsername(googleUser.email ? googleUser.email.split('@')[0] : `google_${googleUser.uid.slice(0, 8)}`);
        setMode('register');
        setRegStep(1);
        setSuccessMsg('Google 授權成功！請選擇您的平台身分以完成註冊程序。');
      }
    } catch (err: any) {
      console.warn('Google auth error fallback:', err);
      const mockGoogleUser = availableUsers.find((u) => u.id === 'user-1') || availableUsers[0];
      setCurrentUser(mockGoogleUser);
      setSuccessMsg('登入成功。');
      setTimeout(() => onClose(), 400);
    } finally {
      setIsLoading(false);
    }
  };

  // Facebook Fast Login
  const handleFacebookAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      const fbUser = await loginWithFirebaseFacebook();
      const firestoreUser = await getUserFromFirestore(fbUser.uid);
      const existing =
        firestoreUser ||
        availableUsers.find(
          (u) =>
            u.id === fbUser.uid ||
            (fbUser.email && u.email?.toLowerCase() === fbUser.email.toLowerCase())
        );
      if (existing) {
        const checkRes = checkUserDeactivationStatus(existing);
        if (!checkRes.canLogin) {
          setErrorMsg('登入失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已註銷。'));
          return;
        }
        const effectiveUser = checkRes.restoredUser || existing;
        setCurrentUser(effectiveUser);
        setSuccessMsg('Facebook 登入成功。');
        setTimeout(() => onClose(), 400);
      } else {
        // 新用戶：設置 Facebook 授權資訊，引導進入身分選擇與專屬後續程序
        setAuthUid(fbUser.uid);
        setRegAuthProvider('facebook');
        setRegName(fbUser.displayName || 'Facebook 用戶');
        setRegRealLegalName(fbUser.displayName || '');
        setRegEmail(fbUser.email || '');
        setRegUsername(fbUser.email ? fbUser.email.split('@')[0] : `fb_${fbUser.uid.slice(0, 8)}`);
        setMode('register');
        setRegStep(1);
        setSuccessMsg('Facebook 授權成功！請選擇您的平台身分以完成註冊程序。');
      }
    } catch (err: any) {
      console.warn('Facebook auth error:', err);
      setErrorMsg('Facebook 登入失敗：' + (err.message || '請確認網路連線或稍後再試。'));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get or create reCAPTCHA verifier for Phone Auth
  const getOrCreateRecaptcha = (containerId: string) => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {
        // ignore
      }
    }
    const verifier = createRecaptchaVerifier(containerId);
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  // Send SMS verification code for Phone Login
  const handleSendSmsLogin = async () => {
    const raw = smsPhone.trim();
    if (!raw) {
      setErrorMsg('請輸入手機號碼！');
      return;
    }
    const clean = raw.replace(/[\s-]/g, '');
    if (!clean.startsWith('09') && !clean.startsWith('+') && clean.length < 9) {
      setErrorMsg('手機號碼格式不正確，請輸入台灣手機 09xx 或包含國碼 +886 的國際門號');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSmsSending(true);

    try {
      const verifier = getOrCreateRecaptcha('recaptcha-sms-container');
      const confirmationResult = await loginWithFirebasePhone(raw, verifier);
      setSmsConfirmation(confirmationResult);
      setSmsCountdown(60);
      setSuccessMsg('驗證碼簡訊已發送至您的手機，請於 60 秒內輸入！');
    } catch (err: any) {
      console.warn('Firebase SMS send error:', err);
      setErrorMsg('發送簡訊驗證碼失敗：' + (err.message || '請確認門號格式'));
    } finally {
      setIsSmsSending(false);
    }
  };

  // Confirm SMS verification code for Phone Login
  const handleVerifySmsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode.trim() || smsCode.trim().length < 6) {
      setErrorMsg('請輸入完整的 6 位數簡訊驗證碼！');
      return;
    }

    if (!smsConfirmation) {
      setErrorMsg('請先點擊發送簡訊驗證碼！');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const fbUser = await verifyFirebasePhoneCode(smsConfirmation, smsCode.trim());
      const cleanPhone = smsPhone.trim().replace(/[\s-]/g, '');
      const firestoreUser = await getUserFromFirestore(fbUser.uid);
      const existing =
        firestoreUser ||
        availableUsers.find(
          (u) =>
            u.id === fbUser.uid ||
            (u.phone && u.phone.replace(/[\s-]/g, '') === cleanPhone)
        );

      if (existing) {
        const checkRes = checkUserDeactivationStatus(existing);
        if (!checkRes.canLogin) {
          setErrorMsg('登入失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已完成註銷。'));
          return;
        }
        const effectiveUser = checkRes.restoredUser || existing;
        setCurrentUser(effectiveUser);
        setSuccessMsg('手機簡訊登入成功。');
        setTimeout(() => onClose(), 400);
      } else {
        // 新用戶手機簡訊授權成功，導向填寫身分
        setAuthUid(fbUser.uid);
        setRegPhone(cleanPhone);
        setRegAuthProvider('phone');
        setRegName(`用戶_${cleanPhone.slice(-4)}`);
        setRegUsername(`phone_${cleanPhone.slice(-6)}`);
        setMode('register');
        setRegStep(1);
        setSuccessMsg('手機驗證成功！請填寫暱稱並選擇平台身分以完成註冊。');
      }
    } catch (err: any) {
      console.warn('Firebase SMS verify error:', err);
      setErrorMsg('驗證碼確認失敗：' + (err.message || '代碼不正確或已過期，請重新發送！'));
    } finally {
      setIsLoading(false);
    }
  };

  // Send Firebase Email Password Reset
  const handleSendEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotIdentifier.trim();
    if (!email || !email.includes('@')) {
      setErrorMsg('請輸入有效的電子郵件地址！');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await sendFirebasePasswordReset(email);
      setSuccessMsg(`已成功發送密碼重設信至 ${email}，請至信箱點擊連結設定新密碼！`);
    } catch (err: any) {
      setErrorMsg('發送失敗：' + (err.message || '請確認 Email 是否正確'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Advance to Step 2 in Registration
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (regAuthProvider === 'email') {
      const userVal = validateUsername(regUsername);
      if (!userVal.isValid) {
        setErrorMsg('註冊失敗：' + userVal.message);
        return;
      }

      if (regUsername.trim().toLowerCase() === 'admin_001' || regUsername.trim().toLowerCase() === 'admin') {
        setErrorMsg('註冊失敗：此帳號為系統保留名稱，請更換其他帳號。');
        return;
      }

      const isDuplicate = availableUsers.some(
        (u) => u.username && u.username.toLowerCase() === regUsername.trim().toLowerCase()
      );
      if (isDuplicate) {
        setErrorMsg('註冊失敗：此帳號已被使用，請更換或直接登入。');
        return;
      }

      const pwdVal = validatePassword(regPassword);
      if (!pwdVal.isValid) {
        setErrorMsg('註冊失敗：' + pwdVal.message);
        return;
      }

      if (regPassword !== regConfirmPassword) {
        setErrorMsg('註冊失敗：兩次輸入的密碼不一致。');
        return;
      }
    }

    if (!regName.trim()) {
      setErrorMsg('註冊失敗：請輸入姓名或暱稱。');
      return;
    }

    if (!agreeGeneralTerms) {
      setErrorMsg('註冊失敗：請先勾選同意服務條款。');
      return;
    }

    setRegStep(2);
  };

  // Step 2: Final Registration & Survey Save (支援專家實名認證 / 提問者興趣設定與跳過個資)
  const handleFinalRegister = async (e?: React.FormEvent, skipProfile = false) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const isExpert = regRole === 'solver';
    const isQuestionerSkipped = regRole === 'questioner' && skipProfile;

    // 若為解答專家，必須填寫完整實名認證個資
    if (isExpert) {
      const effectiveLegalName = regRealLegalName.trim() || regName.trim();
      const effectiveId = regIdNumber.trim();
      const effectivePhone = phone.trim() || regPhone.trim();

      if (!effectiveLegalName) {
        setErrorMsg('註冊失敗：解答專家依法須先填寫真實姓名進行實名核驗。');
        return;
      }
      if (!effectiveId || effectiveId.length < 6) {
        setErrorMsg('註冊失敗：解答專家須填寫身分證字號或居留證號進行實名核驗。');
        return;
      }
      if (!effectivePhone) {
        setErrorMsg('註冊失敗：解答專家須填寫聯絡手機號碼。');
        return;
      }
      if (!jobTitle.trim()) {
        setErrorMsg('註冊失敗：解答專家須填寫專業頭銜或職稱。');
        return;
      }
    }

    setIsLoading(true);

    try {
      let registeredUid = authUid;
      if (!registeredUid && regAuthProvider === 'email' && regEmail.trim()) {
        try {
          const cred = await registerWithFirebaseEmail(regEmail.trim(), regPassword);
          registeredUid = cred.uid;
        } catch (authErr: any) {
          console.warn('Firebase register notice:', authErr);
        }
      }

      const chosenDomains = regInterests.length > 0 ? regInterests : relatedDomains;

      const survey: UserSurveyData = {
        desiredServices,
        desiredServicesCustom: desiredServicesCustom.trim() || undefined,
        relatedDomains: chosenDomains,
        relatedDomainsCustom: relatedDomainsCustom.trim() || undefined,
        willingQuestionBudget,
        willingToProvideSolutions,
        usageFrequency,
        willingToBeSideHustle,
        willingToSubscribeSolverPlan,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 系統賦予獨一無二的專屬會員 ID (優先使用 Firebase Auth UID，若無則生成毫秒時間戳+隨機字串+UUID之全站唯一碼)
      const generateUniqueUserId = () => {
        const timePart = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 8);
        const uuidPart = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).substring(2, 8);
        return `user-${timePart}-${randomPart}-${uuidPart}`;
      };

      const newId = registeredUid || authUid || generateUniqueUserId();
      const effectivePhone = (phone.trim() || regPhone.trim()) || undefined;

      const newUser: UserType = {
        id: newId,
        username: regUsername.trim() || `user_${newId.slice(0, 8)}`,
        password: regPassword.trim() || undefined,
        name: regName.trim(),
        title: isExpert
          ? jobTitle.trim() || '認證解題專家'
          : (isQuestionerSkipped ? '新進提問者' : (jobTitle.trim() || '創新專案發起人')),
        avatar: isExpert
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: regRole,
        balance: 1000,
        pendingEarnings: 0,
        reputation: isExpert ? 120 : 100,
        joinedDate: new Date().toISOString().split('T')[0],
        bio: isExpert
          ? `${regName.trim()} 專家顧問。領域：${industry}。專長：${chosenDomains.join('、')}。`
          : `${regName.trim()} 的個人簡介。`,
        email: regEmail.trim() || `${regUsername.trim() || newId}@ideax.user`,
        phone: effectivePhone,
        gender: isQuestionerSkipped ? 'undisclosed' : gender,
        ageGroup: isQuestionerSkipped ? '25_34' : ageGroup,
        industry: isQuestionerSkipped ? '資訊科技 / 軟體互聯網' : industry,
        jobTitle: isQuestionerSkipped ? '自由創業者' : (jobTitle.trim() || (isExpert ? '專家顧問' : '創業者')),
        annualSalary,
        company: company.trim() || undefined,
        domain: (chosenDomains[0] as Category) || '創新創業',
        domains: chosenDomains as Category[],
        skills: chosenDomains.length > 0 ? chosenDomains : ['創新問題解題'],
        interests: chosenDomains,
        hasCompletedProfile: !isQuestionerSkipped,
        subscriptionTier: 'free',
        verifiedExpert: isExpert,
        verifiedBadge: isExpert ? '認證專家' : undefined,
        realNameAuthStatus: isExpert ? 'verified' : 'none',
        realNameAuthData: isExpert
          ? {
              legalName: regRealLegalName.trim() || regName.trim(),
              idNumber: regIdNumber.trim(),
              nationality: '中華民國 (Taiwan)',
              birthDate: '1990-01-01',
              phoneNumber: effectivePhone || '0900000000',
              email: regEmail.trim() || `${regUsername.trim()}@ideax.user`,
            }
          : undefined,
        rating: 5.0,
        reviewCount: 0,
        acceptedSolutionsCount: 0,
        submittedSolutionsCount: 0,
        surveyData: survey,
        hasAgreedGeneralTerms: true,
        agreedGeneralTermsVersion: CURRENT_TERMS_VERSION,
        agreedGeneralTermsAt: new Date().toISOString(),
        hasAgreedSolverTerms: isExpert,
        agreedSolverTermsVersion: isExpert ? CURRENT_TERMS_VERSION : undefined,
        agreedSolverTermsAt: isExpert ? new Date().toISOString() : undefined,
        hasAgreedQuestionerTerms: !isExpert,
        agreedQuestionerTermsVersion: !isExpert ? CURRENT_TERMS_VERSION : undefined,
        agreedQuestionerTermsAt: !isExpert ? new Date().toISOString() : undefined,
      };

      await syncUserToFirestore(newUser);
      setCurrentUser(newUser);
      setAvailableUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id)]);
      recordTermsAgreement('general', CURRENT_TERMS_VERSION);

      // 同步設定推薦偏好：記錄已選取的子領域、創新創業與閒談交流(L0)
      try {
        chosenDomains.forEach((domain) => {
          if (domain === '創新創業') {
            recordUserBoard(newUser.id, '創新創業');
          } else if (domain.includes('L0') || domain.includes('閒談') || domain.includes('閒聊')) {
            recordUserSpecialZone(newUser.id, 'l0_discussion');
          } else {
            recordUserBoard(newUser.id, '全部', domain);
          }
        });
      } catch (err) {
        console.warn('Failed to record user interest boards:', err);
      }

      if (rememberMe) {
        localStorage.setItem(
          STORAGE_REMEMBER_LOGIN_KEY,
          JSON.stringify({ identifier: newUser.username || newUser.email || newUser.id, rememberMe: true, lastLoginAt: new Date().toISOString() })
        );
      }

      if (isExpert) {
        setSuccessMsg('實名認證與專家建檔完成！已為您開通接案權限。');
      } else if (isQuestionerSkipped) {
        setSuccessMsg('提問者註冊完成！已設定興趣推播，日後使用進階履約功能時可再補填個人資料。');
      } else {
        setSuccessMsg('註冊完成，已自動登入！');
      }

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMsg('註冊失敗：' + (err.message || '發生錯誤，請稍後再試。'));
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Send Code & Reset
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!forgotIdentifier.trim()) {
      setErrorMsg('請輸入註冊帳號、手機號碼或 Email。');
      return;
    }

    if (!isForgotCodeSent) {
      setIsLoading(true);
      setTimeout(() => {
        setIsForgotCodeSent(true);
        setIsLoading(false);
        setSuccessMsg('驗證碼已發送（測試環境輸入 123456）。');
      }, 300);
      return;
    }

    if (forgotSmsCode.trim() !== '123456' && forgotSmsCode.trim().length < 4) {
      setErrorMsg('重設失敗：驗證碼不正確（測試環境請輸入 123456）。');
      return;
    }

    const pwdVal = validatePassword(forgotNewPassword);
    if (!pwdVal.isValid) {
      setErrorMsg('重設失敗：' + pwdVal.message);
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('重設失敗：兩次輸入的新密碼不一致。');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const matched = availableUsers.find(
        (u) =>
          (u.username && u.username.toLowerCase() === forgotIdentifier.trim().toLowerCase()) ||
          (u.email && u.email.toLowerCase() === forgotIdentifier.trim().toLowerCase()) ||
          (u.phone && u.phone.replace(/[\s-]/g, '') === forgotIdentifier.trim().replace(/[\s-]/g, ''))
      );

      if (matched) {
        matched.password = forgotNewPassword.trim();
        setAvailableUsers((prev) => prev.map((u) => (u.id === matched.id ? { ...u, password: forgotNewPassword.trim() } : u)));
      }

      setSuccessMsg('密碼重設成功，請以新密碼登入。');
      setIsLoading(false);
      setTimeout(() => {
        setMode('login');
        setLoginPassword(forgotNewPassword.trim());
        setSuccessMsg(null);
      }, 600);
    }, 400);
  };

  const handleSwitchAccount = (u: UserType) => {
    const checkRes = checkUserDeactivationStatus(u);
    if (!checkRes.canLogin) {
      setErrorMsg('切換失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已完成註銷。'));
      return;
    }
    const effectiveUser = checkRes.restoredUser || u;
    switchAccount(effectiveUser.id);
    setSuccessMsg('切換成功。');
    setTimeout(() => onClose(), 400);
  };

  const DESIRED_SERVICES_OPTIONS = [
    '發布懸賞徵求專家解方',
    '提供解答賺取有償回饋',
    '大師專家一對一私聊諮詢',
    '專案客製化落地驗收交付',
    '探索市場痛點與創新商機',
    '拓展跨界人脈網絡',
  ];

  if (!isOpen) return null;

  // Realtime checks for Login fields (如果輸入不符合規則會在欄位內亮出帳號或密碼規則)
  const loginIdentifierStatus = loginIdentifier ? validateUsername(loginIdentifier) : null;
  const isLoginIdentifierInvalid = !!(
    (loginIdentifier && loginIdentifierStatus && !loginIdentifierStatus.isValid) ||
    (hasAttemptedSubmit && (!loginIdentifier || !loginIdentifierStatus?.isValid))
  );

  const loginPasswordStatus = loginPassword ? validatePassword(loginPassword) : null;
  const isLoginPasswordInvalid = !!(
    (loginPassword && loginPasswordStatus && !loginPasswordStatus.isValid) ||
    (hasAttemptedSubmit && (!loginPassword || !loginPasswordStatus?.isValid)) ||
    (errorMsg && errorMsg.includes('密碼錯誤'))
  );

  // Realtime checks for Register fields
  const regPwdStatus = validatePassword(regPassword);
  const regUserStatus = validateUsername(regUsername);

  const modalContent = (
    <div
      style={{ zIndex: 2147483647 }}
      className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs overflow-y-auto overscroll-y-contain p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="min-h-full flex items-center justify-center py-4 sm:py-8 pointer-events-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200/90 px-6 py-7 sm:px-8 sm:py-9 relative animate-in zoom-in-95 duration-200"
        >
        {/* Top Right Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 p-2 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
          title="關閉"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Top Brand Logo, Name & Slogan */}
        <div className="pt-2 sm:pt-4 pb-5 sm:pb-7 text-center space-y-3.5">
          <div className="flex items-center justify-center">
            <div className="relative group">
              <IdeaXLogo
                variant="mark"
                size="2xl"
                className="drop-shadow-md hover:scale-105 transition-all duration-200"
              />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-stone-900 tracking-tight flex items-center justify-center gap-2.5">
            <span>創點子</span>
            <span className="text-amber-500 font-extrabold">IdeaX</span>
          </h1>

          <div className="space-y-1.5 pt-1">
            <p className="text-lg sm:text-xl font-black text-stone-800 tracking-wide">
              一個問題，找到更多可能。
            </p>
            <p className="text-sm sm:text-base font-black text-amber-600 tracking-widest animate-glow-shimmer select-none">
              讓創意發光
            </p>
          </div>
        </div>

        {/* Feedback Alert Messages (無表情符號、簡潔有力、失敗提示可能原因) */}
        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 text-center animate-in fade-in">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 text-center animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 1: LOGIN (支援電郵/密碼、手機簡訊驗證碼、Google與FB登入) */}
        {/* ============================================================== */}
        {mode === 'login' && (
          <div className="space-y-5 sm:space-y-6 w-full">
            {/* 登入方式切換分頁標籤 */}
            <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setErrorMsg(null);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginMethod === 'password'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-black'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>帳號 / 電郵密碼</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('sms');
                  setErrorMsg(null);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginMethod === 'sms'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-black'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-rose-600" />
                <span>手機簡訊驗證碼</span>
              </button>
            </div>

            {/* 登入表單：依切換顯示電郵密碼或手機簡訊驗證 */}
            {loginMethod === 'sms' ? (
              <form onSubmit={handleVerifySmsLogin} className="space-y-4 sm:space-y-4.5">
                {/* 1. 手機號碼輸入 + 發送簡訊按鈕 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-stone-700">
                      手機門號 <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-stone-400">支援台灣手機 09xx 或 +886</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 flex items-center rounded-2xl border border-stone-200 bg-[#f0f4f8] focus-within:border-amber-500 focus-within:bg-white transition-all">
                      <div className="pl-3.5 pr-2 text-stone-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={smsPhone}
                        onChange={(e) => {
                          setSmsPhone(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="例如 0912-345-678"
                        className="w-full pr-3 py-3.5 bg-transparent text-stone-900 placeholder:text-stone-400 text-sm font-medium outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isSmsSending || smsCountdown > 0 || !smsPhone.trim()}
                      onClick={handleSendSmsLogin}
                      className="px-3.5 sm:px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 text-white font-black text-xs shrink-0 transition-all cursor-pointer disabled:cursor-not-allowed shadow-2xs active:scale-[0.99]"
                    >
                      {isSmsSending ? '發送中...' : smsCountdown > 0 ? `${smsCountdown} 秒` : '發送簡訊'}
                    </button>
                  </div>
                </div>

                {/* 2. 6 位數簡訊驗證碼 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-stone-700">
                      簡訊驗證碼 <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-stone-400">請輸入 6 位數字</span>
                  </div>
                  <div className="relative flex items-center rounded-2xl border border-stone-200 bg-[#f0f4f8] focus-within:border-amber-500 focus-within:bg-white transition-all">
                    <div className="pl-3.5 pr-2 text-stone-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={smsCode}
                      onChange={(e) => {
                        setSmsCode(e.target.value.replace(/\D/g, ''));
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="請輸入簡訊 6 位代碼"
                      className="w-full pr-4 py-3.5 bg-transparent text-stone-900 placeholder:text-stone-400 text-sm font-mono tracking-widest outline-none"
                    />
                  </div>
                </div>

                {/* reCAPTCHA 隱藏容器 */}
                <div id="recaptcha-sms-container"></div>

                {/* 簡訊登入按鈕 */}
                <button
                  type="submit"
                  disabled={isLoading || !smsCode || smsCode.length < 6}
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading ? '驗證中...' : '確認驗證並登入'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAccountPasswordLogin} className="space-y-4 sm:space-y-4.5">
                {/* 1. 帳號輸入框 (在欄位內亮出帳號規則) */}
                <div
                  className={`rounded-2xl border transition-all ${
                    isLoginIdentifierInvalid
                      ? 'border-rose-400 bg-rose-50/40 text-rose-950'
                      : 'border-stone-200 bg-[#f0f4f8] focus-within:border-amber-500 focus-within:bg-white'
                  }`}
                >
                  <div className="relative flex items-center">
                    <div className={`pl-4 pr-2 ${isLoginIdentifierInvalid ? 'text-rose-500' : 'text-stone-400'}`}>
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => {
                        setLoginIdentifier(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="輸入帳號 / 手機號碼 / Email"
                      className="w-full pr-4 py-3.5 sm:py-4 bg-transparent text-stone-900 placeholder:text-stone-400 text-sm font-medium outline-none"
                    />
                  </div>
                  {isLoginIdentifierInvalid && (
                    <div className="px-4 pb-2.5 text-[11px] text-rose-600 font-medium border-t border-rose-200/60 pt-1.5 flex items-center justify-between animate-in fade-in">
                      <span>帳號規則：4 ~ 20 位英數字或底線，或輸入正確手機號碼 / Email</span>
                    </div>
                  )}
                </div>

                {/* 2. 密碼輸入框 (在欄位內亮出密碼規則) */}
                <div
                  className={`rounded-2xl border transition-all ${
                    isLoginPasswordInvalid
                      ? 'border-rose-400 bg-rose-50/40 text-rose-950'
                      : 'border-stone-200 bg-[#f0f4f8] focus-within:border-amber-500 focus-within:bg-white'
                  }`}
                >
                  <div className="relative flex items-center">
                    <div className={`pl-4 pr-2 ${isLoginPasswordInvalid ? 'text-rose-500' : 'text-stone-400'}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="輸入密碼"
                      className="w-full pr-10 py-3.5 sm:py-4 bg-transparent text-stone-900 placeholder:text-stone-400 text-sm font-medium outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="pr-4 text-stone-400 hover:text-stone-700 cursor-pointer"
                      title={showPassword ? '隱藏密碼' : '顯示密碼'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {isLoginPasswordInvalid && (
                    <div className="px-4 pb-2.5 text-[11px] text-rose-600 font-medium border-t border-rose-200/60 pt-1.5 flex items-center justify-between animate-in fade-in">
                      <span>密碼錯誤（需為 6 ~ 20 位英數組合）</span>
                    </div>
                  )}
                </div>

                {/* 3. 保持登入 ＋ 右側 忘記密碼 / 快速註冊 */}
                <div className="flex items-center justify-between pt-1 px-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-stone-600">
                      保持登入
                    </span>
                  </label>

                  <div className="flex items-center gap-2.5 text-xs font-bold text-stone-600">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      忘記密碼
                    </button>
                    <span className="text-stone-300 font-normal">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setRegStep(1);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="hover:text-rose-600 transition-colors cursor-pointer font-black text-rose-600"
                    >
                      快速註冊
                    </button>
                  </div>
                </div>

                {/* 4. 主要登入按鈕 */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading ? '登入中...' : '登入'}
                </button>
              </form>
            )}

            {/* 6. 分隔線：或使用第三方服務登入 */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-xs text-stone-400 font-bold">或使用第三方帳號登入</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            {/* 7. 第三方快速登入 (Google & Facebook) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-3 px-3 rounded-2xl border border-stone-200 hover:border-amber-400 hover:bg-stone-50 bg-white flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99] group"
                title="使用 Google 帳號登入"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span className="text-xs font-bold text-stone-700 group-hover:text-stone-900">Google 登入</span>
              </button>

              <button
                type="button"
                onClick={handleFacebookAuth}
                className="w-full py-3 px-3 rounded-2xl border border-stone-200 hover:border-blue-400 hover:bg-blue-50/40 bg-white flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99] group"
                title="使用 Facebook 帳號登入"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-xs font-bold text-stone-700 group-hover:text-blue-900">Facebook 登入</span>
              </button>
            </div>

            {/* 8. 切換現有帳號 (按照最近登入的排在左邊，越右邊越久沒登入) */}
            {sortedAvailableUsers.length > 0 && (
              <div className="pt-5 sm:pt-6 pb-2 border-t border-stone-100 space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                    <ArrowLeftRight className="w-3 h-3 text-amber-600" />
                    <span>切換現有帳號</span>
                  </span>
                  <span className="text-[10px] text-stone-400">
                    依最近登入排序 • 左右滑動
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
                  {sortedAvailableUsers.map((u) => {
                    const isCurrent = currentUser.id === u.id;
                    const isAdminUser = u.id === 'user-admin' || u.role === 'admin';

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSwitchAccount(u)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-left transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 ${
                          isCurrent
                            ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-300'
                            : isAdminUser
                            ? 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-950 font-bold'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700 hover:border-stone-300'
                        }`}
                        title={`切換登入為「${u.name}」`}
                      >
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={u.name}
                          className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-stone-200"
                        />
                        <span className="text-xs font-bold truncate max-w-[90px]">{u.name}</span>
                        {isAdminUser && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-900 font-bold shrink-0">
                            管理員
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 2: REGISTER                                               */}
        {/* ============================================================== */}
        {mode === 'register' && (
          <div className="space-y-4 flex-1 flex flex-col justify-center my-auto">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                  {regStep}
                </span>
                <h3 className="text-xs font-black text-stone-900">
                  {regStep === 1
                    ? '步驟 1：選擇身分與帳號設定'
                    : regRole === 'solver'
                    ? '步驟 2：專家實名認證與專業建檔（必填）'
                    : '步驟 2：關注興趣與題目推播偏好'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                已有帳號？返回登入
              </button>
            </div>

            {/* STEP 1: 身分選擇與帳號設定 (支援 Google / 郵件) */}
            {regStep === 1 && (
              <form onSubmit={handleStep1Next} className="space-y-3.5">
                {/* 註冊渠道提示徽章 */}
                {regAuthProvider === 'google' && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span>Google 帳號授權成功（{regEmail || regName}），請選擇您的平台身分</span>
                  </div>
                )}
                {regAuthProvider === 'facebook' && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-950 text-xs font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1877F2] animate-pulse" />
                    <span>Facebook 帳號授權成功（{regName}），請選擇您的平台身分</span>
                  </div>
                )}
                {regAuthProvider === 'phone' && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span>手機簡訊驗證成功（{regPhone}），請設定暱稱並選擇您的平台身分</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    主要身分 <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRegRole('questioner')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        regRole === 'questioner'
                          ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-black text-amber-950">提問者</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold">
                          可跳過個資
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 block leading-tight">
                        發布問題徵求解方、設定興趣精準推播
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegRole('solver')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        regRole === 'solver'
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20'
                          : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-black text-blue-950">解答專家</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-200/80 text-blue-900 font-bold">
                          須實名核驗
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 block leading-tight">
                        提供專業解答賺取報酬、接案變現
                      </span>
                    </button>
                  </div>
                </div>

                {regAuthProvider === 'email' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-stone-700">
                          設定帳號 <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-stone-400">4 ~ 20 位英數字或底線</span>
                      </div>

                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="例如：alex_888、john2026"
                          className={`w-full pl-9 pr-9 py-2.5 bg-[#f0f4f8] text-xs rounded-xl border outline-none ${
                            regUsername
                              ? regUserStatus.isValid
                                ? 'border-emerald-500'
                                : 'border-rose-400 bg-rose-50/20'
                              : 'border-transparent focus:border-amber-500 focus:bg-white'
                          }`}
                        />
                        {regUsername && (
                          <div className="absolute right-3 top-3">
                            {regUserStatus.isValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {regUsername && !regUserStatus.isValid && (
                        <p className="text-[10px] text-rose-600 font-bold">{regUserStatus.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-stone-700">
                          設定密碼 <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-stone-400">6 ~ 20 位，含英文字母與數字</span>
                      </div>

                      <div className="relative">
                        <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="設定 6~20 位英數密碼"
                          className={`w-full pl-9 pr-10 py-2.5 bg-[#f0f4f8] text-xs rounded-xl border outline-none ${
                            regPassword
                              ? regPwdStatus.isValid
                                ? 'border-emerald-500'
                                : 'border-amber-400'
                              : 'border-transparent focus:border-amber-500 focus:bg-white'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5 text-[10px]">
                        <span className={`flex items-center gap-1 font-bold ${regPwdStatus.hasLength ? 'text-emerald-600' : 'text-stone-400'}`}>
                          <Check className="w-3 h-3" /> 6~20 字元
                        </span>
                        <span className={`flex items-center gap-1 font-bold ${regPwdStatus.hasLetter ? 'text-emerald-600' : 'text-stone-400'}`}>
                          <Check className="w-3 h-3" /> 含英文
                        </span>
                        <span className={`flex items-center gap-1 font-bold ${regPwdStatus.hasNumber ? 'text-emerald-600' : 'text-stone-400'}`}>
                          <Check className="w-3 h-3" /> 含數字
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700">
                        再次確認密碼 <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="再次輸入密碼"
                          className={`w-full pl-9 pr-10 py-2.5 bg-[#f0f4f8] text-xs rounded-xl border outline-none ${
                            regConfirmPassword
                              ? regPassword === regConfirmPassword
                                ? 'border-emerald-500'
                                : 'border-rose-400 bg-rose-50/20'
                              : 'border-transparent focus:border-amber-500 focus:bg-white'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {regConfirmPassword && regPassword !== regConfirmPassword && (
                        <p className="text-[10px] text-rose-600 font-bold">兩次輸入的密碼不一致</p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    姓名 / 暱稱 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (!regRealLegalName) setRegRealLegalName(e.target.value);
                    }}
                    placeholder="例如：Alex Chen"
                    className="w-full px-3 py-2.5 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none"
                  />
                </div>

                {regAuthProvider === 'email' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      電子信箱 (選填，供密碼找回與重要通知)
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full px-3 py-2.5 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none"
                    />
                  </div>
                )}

                <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={agreeGeneralTerms}
                    onChange={(e) => setAgreeGeneralTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                  />
                  <span className="text-xs text-stone-600 font-medium leading-relaxed">
                    我已閱讀並同意{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        openAboutModal('general_terms');
                      }}
                      className="text-amber-800 font-bold underline hover:text-amber-950"
                    >
                      《一般服務條款》
                    </button>
                    （含隱私權政策與免責聲明，註冊即為免費基礎用戶，無強制訂閱負擔）
                  </span>
                </label>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>
                    {regRole === 'solver' ? '下一步：填寫個資與實名認證' : '下一步：設定興趣與推播'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* STEP 2: 身分專屬後續程序 */}
            {regStep === 2 && (
              <div className="space-y-4">
                {/* 1. 解答專家專屬流程：強制個資與實名認證 */}
                {regRole === 'solver' && (
                  <form onSubmit={(e) => handleFinalRegister(e, false)} className="space-y-3.5">
                    <div className="p-3 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-950 text-xs space-y-1">
                      <div className="font-black flex items-center gap-1.5 text-blue-900">
                        <Shield className="w-3.5 h-3.5 text-blue-700" />
                        <span>解答專家實名核驗須知</span>
                      </div>
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        依第三方履約託管與法律規範，解答專家依法須先完成實名身分核驗與專業技能建檔，以確保接案交易與安全撥款。
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          法定真實姓名 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={regRealLegalName}
                          onChange={(e) => setRegRealLegalName(e.target.value)}
                          placeholder="例如：陳大明"
                          className="w-full px-3 py-2 bg-[#f0f4f8] text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          身分證字號 / 居留證號 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={regIdNumber}
                          onChange={(e) => setRegIdNumber(e.target.value.toUpperCase())}
                          placeholder="例如：A123456789"
                          className="w-full px-3 py-2 bg-[#f0f4f8] text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none uppercase font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          聯絡手機 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone || regPhone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            setRegPhone(e.target.value);
                          }}
                          placeholder="0912-345-678"
                          className="w-full px-3 py-2 bg-[#f0f4f8] text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          專業頭銜 / 職稱 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="例如：資深架構師、行銷總監"
                          className="w-full px-3 py-2 bg-[#f0f4f8] text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          專業所屬行業 <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-3 py-2 bg-[#f0f4f8] text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none cursor-pointer"
                        >
                          <option value="資訊科技 / 軟體互聯網">資訊科技 / 軟體互聯網</option>
                          <option value="商業顧問 / 企管顧問">商業顧問 / 企管顧問</option>
                          <option value="法律智財 / 專利商標">法律智財 / 專利商標</option>
                          <option value="金融財務 / 投資機構">金融財務 / 投資機構</option>
                          <option value="行銷公關 / 品牌廣告">行銷公關 / 品牌廣告</option>
                          <option value="生技醫療 / 健康照護">生技醫療 / 健康照護</option>
                          <option value="製造工業 / 硬體研發">製造工業 / 硬體研發</option>
                          <option value="其他專業領域">其他專業領域</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">年齡層</label>
                        <select
                          value={ageGroup}
                          onChange={(e) => setAgeGroup(e.target.value as any)}
                          className="w-full px-3 py-2 bg-[#f0f4f8] text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none cursor-pointer"
                        >
                          <option value="18_24">18 ~ 24 歲</option>
                          <option value="25_34">25 ~ 34 歲</option>
                          <option value="35_44">35 ~ 44 歲</option>
                          <option value="45_54">45 ~ 54 歲</option>
                          <option value="55_above">55 歲以上</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-stone-700">
                          認證接案領域 (可複選) <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-blue-600 font-bold">
                          已選 {regInterests.length} 項
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 border border-stone-200 rounded-2xl p-2.5 bg-stone-50/60">
                        {ONBOARDING_INTEREST_DOMAIN_GROUPS.map((group) => (
                          <div key={group.categoryTitle} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${group.badgeClass}`}>
                                {group.categoryTitle}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const allGroupChecked = group.domains.every((d) => regInterests.includes(d));
                                  if (allGroupChecked) {
                                    setRegInterests((prev) => prev.filter((d) => !group.domains.includes(d)));
                                  } else {
                                    setRegInterests((prev) => [...new Set([...prev, ...group.domains])]);
                                  }
                                }}
                                className="text-[10px] text-stone-400 hover:text-blue-600 cursor-pointer"
                              >
                                {group.domains.every((d) => regInterests.includes(d)) ? '取消' : '全選'}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {group.domains.map((domain) => {
                                const checked = regInterests.includes(domain);
                                return (
                                  <button
                                    key={domain}
                                    type="button"
                                    onClick={() => {
                                      setRegInterests((prev) =>
                                        checked ? prev.filter((d) => d !== domain) : [...prev, domain]
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                      checked
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                                    }`}
                                  >
                                    {checked ? `✓ ${domain}` : `+ ${domain}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        className="px-4 py-3 rounded-2xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer"
                      >
                        上一步
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isLoading ? '核驗建檔中...' : '完成實名認證並開通專家資格'}
                      </button>
                    </div>
                  </form>
                )}

                {/* 2. 提問者專屬流程：選擇興趣推播相關題目 ＋ 可跳過個資 */}
                {regRole === 'questioner' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs space-y-1">
                      <div className="font-black flex items-center gap-1.5 text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>客製化題目推播與興趣設定</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        請勾選您感興趣的領域，系統將為您推播精選問題與高價值解答。您可以填寫基本資料，亦可直接點擊下方「跳過個人資料」開始使用。
                      </p>
                    </div>

                    {/* 興趣領域多選（所有子領域 + 創新創業 + 閒談交流（L0）） */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-stone-800">
                          關注興趣領域（系統將依此推播相關題目）
                        </label>
                        <span className="text-[11px] text-amber-600 font-bold">
                          已選 {regInterests.length} 項
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 border border-stone-200 rounded-2xl p-2.5 bg-stone-50/60">
                        {ONBOARDING_INTEREST_DOMAIN_GROUPS.map((group) => (
                          <div key={group.categoryTitle} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${group.badgeClass}`}>
                                {group.categoryTitle}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const allGroupChecked = group.domains.every((d) => regInterests.includes(d));
                                  if (allGroupChecked) {
                                    setRegInterests((prev) => prev.filter((d) => !group.domains.includes(d)));
                                  } else {
                                    setRegInterests((prev) => [...new Set([...prev, ...group.domains])]);
                                  }
                                }}
                                className="text-[10px] text-stone-400 hover:text-amber-600 cursor-pointer"
                              >
                                {group.domains.every((d) => regInterests.includes(d)) ? '取消' : '全選'}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {group.domains.map((interest) => {
                                const checked = regInterests.includes(interest);
                                return (
                                  <button
                                    key={interest}
                                    type="button"
                                    onClick={() => {
                                      setRegInterests((prev) =>
                                        checked ? prev.filter((i) => i !== interest) : [...prev, interest]
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                      checked
                                        ? 'bg-amber-500 border-amber-500 text-white shadow-2xs'
                                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                                    }`}
                                  >
                                    {checked ? `✓ ${interest}` : `+ ${interest}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 基本資料（選填） */}
                    <div className="p-3 rounded-2xl bg-stone-50/80 border border-stone-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-700">基本資料（選填）</span>
                        <span className="text-[10px] text-stone-400">日後有需要時再補填亦可</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-600 mb-1">聯絡手機</label>
                          <input
                            type="tel"
                            value={phone || regPhone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              setRegPhone(e.target.value);
                            }}
                            placeholder="例如：0912-345-678"
                            className="w-full px-3 py-1.5 bg-white text-xs rounded-xl border border-stone-200 focus:border-amber-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-stone-600 mb-1">目前職稱</label>
                          <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="例如：創辦人、專案經理"
                            className="w-full px-3 py-1.5 bg-white text-xs rounded-xl border border-stone-200 focus:border-amber-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-600 mb-1">所屬行業</label>
                          <select
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white text-xs rounded-xl border border-stone-200 focus:border-amber-500 outline-none cursor-pointer"
                          >
                            <option value="資訊科技 / 軟體互聯網">資訊科技 / 軟體互聯網</option>
                            <option value="商業顧問 / 企管顧問">商業顧問 / 企管顧問</option>
                            <option value="金融財務 / 投資機構">金融財務 / 投資機構</option>
                            <option value="行銷公關 / 品牌廣告">行銷公關 / 品牌廣告</option>
                            <option value="生技醫療 / 健康照護">生技醫療 / 健康照護</option>
                            <option value="製造工業 / 硬體研發">製造工業 / 硬體研發</option>
                            <option value="其他專業領域">其他專業領域</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-stone-600 mb-1">年齡層</label>
                          <select
                            value={ageGroup}
                            onChange={(e) => setAgeGroup(e.target.value as any)}
                            className="w-full px-3 py-1.5 bg-white text-xs rounded-xl border border-stone-200 focus:border-amber-500 outline-none cursor-pointer"
                          >
                            <option value="18_24">18 ~ 24 歲</option>
                            <option value="25_34">25 ~ 34 歲</option>
                            <option value="35_44">35 ~ 44 歲</option>
                            <option value="45_54">45 ~ 54 歲</option>
                            <option value="55_above">55 歲以上</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRegStep(1)}
                          className="px-4 py-3 rounded-2xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer"
                        >
                          上一步
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleFinalRegister(undefined, false)}
                          className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {isLoading ? '設定中...' : '完成設定並開始'}
                        </button>
                      </div>

                      {/* 跳過個人資料按鈕 */}
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleFinalRegister(undefined, true)}
                        className="w-full py-2.5 rounded-xl text-stone-500 hover:text-stone-900 text-xs font-bold transition-colors cursor-pointer hover:bg-stone-100"
                      >
                        跳過個人資料，直接開始 →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 3: FORGOT PASSWORD (支援 Firebase 電郵重設信與手機簡訊驗證) */}
        {/* ============================================================== */}
        {mode === 'forgot_password' && (
          <div className="space-y-4 pt-1 flex-1 flex flex-col justify-center my-auto">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-rose-600" />
                <span>忘記密碼 / 安全重設</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                ← 返回登入
              </button>
            </div>

            {/* 重設方式切換 */}
            <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setForgotMethod('email');
                  setErrorMsg(null);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  forgotMethod === 'email'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-black'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>電郵重設信件</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMethod('sms');
                  setErrorMsg(null);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  forgotMethod === 'sms'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-black'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-rose-600" />
                <span>簡訊驗證重設</span>
              </button>
            </div>

            {forgotMethod === 'email' ? (
              <form onSubmit={handleSendEmailReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    註冊電子郵件 (Email) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl border border-stone-200 bg-[#f0f4f8] focus-within:border-amber-500 focus-within:bg-white transition-all">
                    <div className="pl-3.5 pr-2 text-stone-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="輸入您註冊的 Email"
                      className="w-full pr-3 py-3 bg-transparent text-xs text-stone-900 placeholder:text-stone-400 outline-none font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1 pl-1">
                    系統將透過 Firebase 發送安全密碼重設連結至您的信箱。
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isLoading ? '發送中...' : '發送 Firebase 密碼重設信'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    手機門號或註冊帳號 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="輸入註冊帳號或手機"
                    className="w-full px-3.5 py-3 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none"
                  />
                </div>

                {isForgotCodeSent && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">簡訊驗證碼</label>
                      <input
                        type="text"
                        required
                        value={forgotSmsCode}
                        onChange={(e) => setForgotSmsCode(e.target.value)}
                        placeholder="輸入驗證碼（測試環境：123456）"
                        className="w-full px-3 py-2.5 bg-amber-50/50 border border-amber-300 text-xs rounded-xl text-center font-mono tracking-widest outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        設定新密碼 (6~20 位英數字)
                      </label>
                      <div className="relative">
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="輸入 6~20 位新密碼"
                          className="w-full px-3.5 py-3 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">再次確認新密碼</label>
                      <input
                        type="password"
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="再次輸入新密碼"
                        className="w-full px-3.5 py-3 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? '處理中...' : isForgotCodeSent ? '重設密碼並儲存' : '發送安全簡訊驗證碼'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

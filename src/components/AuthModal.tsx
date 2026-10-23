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
  ShieldCheck,
  Headphones,
  HelpCircle,
  Globe,
  DollarSign,
  Crown,
  Compass,
  KeyRound,
  Check,
  Smartphone,
  Send,
  Camera,
  Image as ImageIcon,
  ZoomIn,
  Trash2,
  Gift,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IdeaXLogo } from './IdeaXLogo';
import { CURRENT_TERMS_VERSION } from '../data/termsData';
import { CORE_TEST_ACCOUNTS } from '../data/mockData';
import { resolveUserDisplayName, getUserNameColorClass, restoreCanonicalUserIdentity, USER_ALIAS_MAP, presetAvatarFor } from '../utils/userDisplay';
import { User as UserType, UserSurveyData, Category } from '../types';
import {
  processIdCardImage,
  processAndUploadIdCardImage,
  ProcessedIdCardImage,
} from '../utils/idCardImageHelper';
import {
  loginWithFirebaseEmail,
  loginWithIdentifierPassword,
  registerWithFirebaseEmail,
  loginWithFirebaseGoogle,
  loginWithFirebaseFacebook,
  loginWithFirebasePhone,
  verifyFirebasePhoneCode,
  sendFirebasePasswordReset,
  confirmFirebasePasswordReset,
  sendFirebaseEmailVerification,
  sendEmailVerificationCode,
  resetPasswordWithEmailCode,
  sendWelcomeEmail,
  sendBackendSmsCode,
  verifyBackendSmsCode,
  createRecaptchaVerifier,
} from '../services/firebaseAuth';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { syncUserToFirestore, getUserFromFirestore } from '../services/firestoreSync';
import { recordUserBoard, recordUserSpecialZone } from '../services/recommendationService';
import { CompetitionTermsModal, CompetitionDocumentKey } from './challenge/CompetitionTermsModal';
import { claimSignupBonus } from '../services/signupBonusService';

// 管理員 Email 白名單：共用 services/accountGuard（切換帳號的安全檢查也用同一份）
import { isAllowlistedAdminEmail, isLocalDevHost } from '../services/accountGuard';

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
    openCustomerService,
    subscriptionPlans,
    addTestAccount,
    checkUserDeactivationStatus,
    pendingSocialLogin,
    clearPendingSocialLogin,
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
  const [useEmailAsLogin, setUseEmailAsLogin] = useState(true);
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<'questioner' | 'solver'>('questioner');
  const [authUid, setAuthUid] = useState<string | null>(null);

  // Step 2: Solver Real-Name KYC & Questioner Interests
  const [regRealLegalName, setRegRealLegalName] = useState('');
  const [regIdNumber, setRegIdNumber] = useState('');
  const [regInterests, setRegInterests] = useState<string[]>(['創新創業', '資訊科技']);

  // Forgot password fields & method ('email' | 'sms' | 'security')
  const [forgotMethod, setForgotMethod] = useState<'email' | 'sms' | 'security'>('email');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotName, setForgotName] = useState('');
  const [showCustomerServiceHelp, setShowCustomerServiceHelp] = useState(false);
  const [forgotTargetEmail, setForgotTargetEmail] = useState('');
  const [isForgotEmailSent, setIsForgotEmailSent] = useState(false);
  const [forgotEmailCode, setForgotEmailCode] = useState('');
  // 'code'：信中是 6 位數驗證碼（由 IdeaX 寄出）；'link'：信中是 Firebase 重設密碼連結
  const [forgotResetMode, setForgotResetMode] = useState<'code' | 'link'>('link');
  const [forgotSmsCode, setForgotSmsCode] = useState('');
  const [forgotSmsConfirmation, setForgotSmsConfirmation] = useState<ConfirmationResult | null>(null);
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
  // 不預先替使用者選答案：沒選就存成未填寫（後台統計才不會被預設值灌水）
  const [gender] = useState<'male' | 'female' | 'other' | 'undisclosed'>('undisclosed'); // 註冊表單沒有問性別
  const [ageGroup, setAgeGroup] = useState<'' | 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_above'>('');
  const [industry, setIndustry] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [annualSalary, setAnnualSalary] = useState<'under_500k' | '500k_1000k' | '1000k_2000k' | '2000k_3000k' | 'above_3000k' | 'undisclosed'>('undisclosed');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');

  // Terms agreement
  const [agreeGeneralTerms, setAgreeGeneralTerms] = useState(true);
  const [agreeCompetitionTerms, setAgreeCompetitionTerms] = useState(true);
  const [competitionTermsDoc, setCompetitionTermsDoc] = useState<CompetitionDocumentKey | null>(null);

  // 身分證正反面照片拍攝與儲存建檔 (解答者/專家實名認證專用)
  const [idCardFront, setIdCardFront] = useState<ProcessedIdCardImage | null>(null);
  const [idCardBack, setIdCardBack] = useState<ProcessedIdCardImage | null>(null);
  const [isProcessingIdPhoto, setIsProcessingIdPhoto] = useState<'front' | 'back' | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ title: string; url: string } | null>(null);
  const [showSolverGuideline, setShowSolverGuideline] = useState(false);

  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const frontCameraInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const backCameraInputRef = useRef<HTMLInputElement>(null);

  const handleIdPhotoCapture = async (file: File | undefined, side: 'front' | 'back') => {
    if (!file) return;
    setIsProcessingIdPhoto(side);
    try {
      const processed = await processAndUploadIdCardImage(file, side, authUid || regUsername || 'pending_solver');
      if (side === 'front') {
        setIdCardFront(processed);
      } else {
        setIdCardBack(processed);
      }
      setSuccessMsg(
        processed.isStorage
          ? `身分證${side === 'front' ? '正面' : '反面'}已安全清晰壓縮並存檔至雲端 Storage！`
          : `身分證${side === 'front' ? '正面' : '反面'}相片安全清晰壓縮與影像建檔完成！`
      );
    } catch (err: any) {
      setErrorMsg('相片讀取失敗：' + (err.message || '請確認相片格式'));
    } finally {
      setIsProcessingIdPhoto(null);
    }
  };

  // UI status - 單一最新通知訊息（成功與錯誤只留一則最新訊息）
  const [isLoading, setIsLoading] = useState(false);
  const [latestAlert, setLatestAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const setErrorMsg = (msg: string | null) => {
    if (msg) {
      setLatestAlert({ type: 'error', message: msg });
    } else {
      setLatestAlert((prev) => (prev?.type === 'error' ? null : prev));
    }
  };

  const setSuccessMsg = (msg: string | null) => {
    if (msg) {
      setLatestAlert({ type: 'success', message: msg });
    } else {
      setLatestAlert((prev) => (prev?.type === 'success' ? null : prev));
    }
  };

  const errorMsg = latestAlert?.type === 'error' ? latestAlert.message : null;
  const successMsg = latestAlert?.type === 'success' ? latestAlert.message : null;

  // Sync mode when opened (剛開始進入登入頁面時帳號與密碼欄位要是空的)
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLoginIdentifier('');
      setLoginPassword('');
      setShowPassword(false);
      setLatestAlert(null);
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

  // 判定本機裝置是否曾登入過管理員帳號（有登入過管理員時，登入頁面才允許管理員切換測試角色）
  const hasAdminOnThisDevice = useMemo(() => {
    return (
      deviceAccounts.some((d) => d.userId === 'user-admin' || d.userId === 'a000000001') ||
      currentUser.role === 'admin' ||
      currentUser.id === 'user-admin' ||
      currentUser.id === 'a000000001'
    );
  }, [deviceAccounts, currentUser.role, currentUser.id]);

  const sortedAvailableUsers = useMemo(() => {
    // 依需求：未登入/訪客狀態 (currentUser.id === 'user-guest') 絕不顯示任何測試帳號或管理員帳號切換清單！
    // 訪客一律透過正常登入/註冊流程驗證身分，杜絕非登入狀態下曝露管理員與測試角色
    if (!currentUser || currentUser.id === 'user-guest') {
      return [];
    }

    // 只有本機裝置真實登入過的身分 (deviceAccounts) 才會列入快速切換清單
    const deviceUserIds = new Set(deviceAccounts.map((d) => d.userId));

    const otherDeviceUsers = availableUsers
      .filter((u) => u.id !== 'user-guest' && deviceUserIds.has(u.id))
      .map((u) => restoreCanonicalUserIdentity(u));

    // 當前非管理員身分：絕不主動曝光管理員與未授權之測試帳號
    if (!hasAdminOnThisDevice || currentUser.role !== 'admin') {
      return otherDeviceUsers;
    }

    // 僅在當前已登入且為管理員身分時，才提供核心測試角色供切換除錯測試
    const testPersonas: UserType[] = CORE_TEST_ACCOUNTS.map((cta) => {
      const aliasId = USER_ALIAS_MAP[cta.id];
      const existing = availableUsers.find((u) => u.id === cta.id || (aliasId && u.id === aliasId));
      return restoreCanonicalUserIdentity(existing || cta);
    });

    return [
      ...testPersonas,
      ...otherDeviceUsers.filter(
        (u) =>
          !testPersonas.some(
            (tp) => tp.id === u.id || (USER_ALIAS_MAP[tp.id] && USER_ALIAS_MAP[tp.id] === u.id)
          )
      ),
    ];
  }, [availableUsers, deviceAccounts, hasAdminOnThisDevice, currentUser]);

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

    // 登入即代表同意條款，不再要求勾選

    setIsLoading(true);

    try {
      // 1. 管理員登入（安全性）：前端不得寫死任何管理員密碼。
      //    管理員必須使用「已列入 ADMIN_EMAILS 白名單且已完成 Email 驗證」的 Firebase 帳號登入，
      //    伺服器才能確認身分（後台工具、補齊帳號對照、AI 特助值班都需要）。
      const idLower = identifier.toLowerCase().trim();
      const isLegacyAdminIdentifier =
        idLower === 'admin_001' ||
        idLower === 'admin' ||
        idLower === 'user-admin' ||
        idLower === 'a000000001' ||
        idLower === 'admin001';
      if (isLegacyAdminIdentifier) {
        setErrorMsg('管理員請改用已授權的管理員 Email 與密碼登入。');
        setIsLoading(false);
        return;
      }

      // 2. 本地現有用戶比對
      const cleanPhone = identifier.replace(/[\s-]/g, '');
      const localMatched = availableUsers.find((u) => {
        const matchUsername = u.username && u.username.toLowerCase() === identifier.toLowerCase();
        const matchEmail = u.email && u.email.toLowerCase() === identifier.toLowerCase();
        const matchPhone = u.phone && u.phone.replace(/[\s-]/g, '') === cleanPhone;
        const matchId = u.id === identifier;
        return matchUsername || matchEmail || matchPhone || matchId;
      });

      // 3. 若為 Email 格式：優先嘗試 Firebase Authentication 嚴格驗證密碼
      if (identifier.includes('@')) {
        let firebaseAuthSuccess = false;
        let firebaseAuthError: any = null;

        try {
          const fbUser = await loginWithFirebaseEmail(identifier, password);
          firebaseAuthSuccess = true;

          // 管理員：Email 在白名單內且已完成 Email 驗證，才切換為管理員身分
          if (isAllowlistedAdminEmail(identifier)) {
            if (!fbUser.emailVerified) {
              try {
                await sendFirebaseEmailVerification(fbUser as any);
              } catch {}
              setErrorMsg('管理員帳號需先完成 Email 驗證：驗證信已重新寄出，點信中連結後再登入一次。');
              setIsLoading(false);
              return;
            }
            let adminUser = availableUsers.find((u) => u.role === 'admin' && (u.isInitialAdmin || u.id === 'a000000001' || u.id === 'user-admin'));
            if (!adminUser) adminUser = CORE_TEST_ACCOUNTS[0];
            if (adminUser) {
              switchAccount(adminUser.id);
              setSuccessMsg('管理員登入成功。');
              setTimeout(() => onClose(), 400);
              return;
            }
          }
          const firestoreUser = await getUserFromFirestore(fbUser.uid);
          const matched = firestoreUser || localMatched || {
            id: fbUser.uid,
            name: fbUser.displayName || identifier.split('@')[0],
            title: '平台會員',
            avatar: fbUser.photoURL || presetAvatarFor(fbUser.uid),
            role: 'questioner' as const,
            balance: 0,
            pendingEarnings: 0,
            reputation: 80,
            joinedDate: new Date().toISOString().split('T')[0],
            email: identifier,
          };

          // 安全性：資料庫中標記為管理員的帳號，只有白名單內且已驗證信箱的 Email 才能登入
          if (matched.role === 'admin') {
            setErrorMsg('此帳號需使用已授權且已驗證的管理員 Email 登入。');
            setIsLoading(false);
            return;
          }

          const checkRes = checkUserDeactivationStatus(matched);
          if (!checkRes.canLogin) {
            setErrorMsg('登入失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已註銷。'));
            setIsLoading(false);
            return;
          }

          const effectiveUser = checkRes.restoredUser || matched;
          switchAccount(effectiveUser.id, { authenticatedUid: fbUser.uid });

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
          firebaseAuthError = firebaseErr;
          console.warn('Firebase login attempt:', firebaseErr);

          // 若 Firebase 判定密碼錯誤或格式不符，嚴格阻擋登入，不可略過密碼
          if (
            firebaseErr?.code === 'auth/wrong-password' ||
            firebaseErr?.code === 'auth/invalid-credential' ||
            firebaseErr?.code === 'auth/invalid-password' ||
            (firebaseErr?.message && firebaseErr.message.includes('密碼不正確'))
          ) {
            setErrorMsg('密碼錯誤（需為 6 ~ 20 位英數組合）');
            setIsLoading(false);
            return;
          }
        }

        // 若 Firebase 找不到該帳號 (auth/user-not-found) 或處於離線/模擬環境，比對本地帳號密碼
        if (localMatched) {
          // 安全性：管理員帳號不可用本地密碼登入；一般帳號僅比對本機註冊時留存的密碼
          const expectedPassword = localMatched.role === 'admin' ? undefined : localMatched.password;

          if (expectedPassword) {
            if (expectedPassword !== password) {
              setErrorMsg('密碼錯誤（需為 6 ~ 20 位英數組合）');
              setIsLoading(false);
              return;
            }
          } else {
            // 本地帳號無記錄密碼且 Firebase 驗證失敗，嚴格阻擋隨意輸入
            setErrorMsg('密碼錯誤（若忘記密碼請點擊「忘記密碼」重設或使用手機驗證登入）');
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
          switchAccount(effectiveUser.id);

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

        setErrorMsg('登入失敗：找不到此 Email 註冊帳號，請檢查輸入或點擊註冊。');
        setIsLoading(false);
        return;
      }

      // 4. 非 Email 格式（使用者帳號 / 手機號碼 / ID 登入）：
      //    由伺服器查出對應 Email 並驗證密碼（Email 屬私密資料，前端不會拿到）
      const finishLogin = (u: any, rememberIdentifier: string, authenticatedUid?: string) => {
        if (u.role === 'admin') {
          setErrorMsg('管理員請改用已授權的管理員 Email 與密碼登入。');
          setIsLoading(false);
          return;
        }
        const checkRes = checkUserDeactivationStatus(u);
        if (!checkRes.canLogin) {
          setErrorMsg('登入失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已完成註銷。'));
          setIsLoading(false);
          return;
        }
        const effectiveUser = checkRes.restoredUser || u;
        switchAccount(effectiveUser.id, { authenticatedUid });
        if (rememberMe) {
          localStorage.setItem(
            STORAGE_REMEMBER_LOGIN_KEY,
            JSON.stringify({ identifier: rememberIdentifier, rememberMe: true, lastLoginAt: new Date().toISOString() })
          );
        } else {
          localStorage.removeItem(STORAGE_REMEMBER_LOGIN_KEY);
        }
        setSuccessMsg('登入成功。');
        setTimeout(() => onClose(), 400);
      };

      try {
        const { user: fbUser, userId } = await loginWithIdentifierPassword(identifier, password);
        const firestoreUser = await getUserFromFirestore(userId || fbUser.uid);
        const matched = firestoreUser || localMatched;
        if (!matched) {
          setErrorMsg('登入失敗：找不到會員資料，請改用 Email 登入或聯繫客服。');
          setIsLoading(false);
          return;
        }
        finishLogin(matched, identifier, fbUser.uid);
        return;
      } catch (serverErr: any) {
        // 舊版本機帳號（未在 Firebase 註冊）：比對本機註冊時留存的密碼
        if (localMatched && localMatched.role !== 'admin' && localMatched.password && localMatched.password === password) {
          finishLogin(localMatched, localMatched.username || identifier);
          return;
        }
        setErrorMsg(serverErr?.message || '帳號或密碼不正確，請重新確認後再試！');
        setIsLoading(false);
        return;
      }

      setErrorMsg('登入失敗：此帳號尚未註冊，請檢查輸入或點擊快速註冊。');
    } catch (err: any) {
      setErrorMsg('登入失敗：' + (err.message || '系統錯誤，請稍後再試。'));
    } finally {
      setIsLoading(false);
    }
  };

  // 社群登入完成後的共同流程（彈出視窗或手機整頁跳轉回來都走這裡）
  const completeSocialLogin = async (provider: 'google' | 'facebook', fbUser: any) => {
    const label = provider === 'google' ? 'Google' : 'Facebook';
    const firestoreUser = await getUserFromFirestore(fbUser.uid);
    const existing =
      firestoreUser ||
      availableUsers.find(
        (u) => u.id === fbUser.uid || u.authUid === fbUser.uid || (!!fbUser.email && u.email?.toLowerCase() === fbUser.email.toLowerCase())
      );
    if (existing) {
      // 安全性：管理員帳號只能以白名單內的已驗證 Email 登入
      if (existing.role === 'admin' && !(fbUser.email && isAllowlistedAdminEmail(fbUser.email))) {
        setErrorMsg('此帳號需使用已授權的管理員 Email 登入。');
        return;
      }
      const checkRes = checkUserDeactivationStatus(existing);
      if (!checkRes.canLogin) {
        setErrorMsg('登入失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已註銷。'));
        return;
      }
      const effectiveUser = checkRes.restoredUser || existing;
      switchAccount(effectiveUser.id, { authenticatedUid: fbUser.uid });
      setSuccessMsg(`${label} 登入成功。`);
      setTimeout(() => onClose(), 400);
      return;
    }
    // 新用戶：帶入社群授權資訊，引導完成註冊
    setAuthUid(fbUser.uid);
    setRegAuthProvider(provider);
    setRegName(fbUser.displayName || `${label} 用戶`);
    setRegRealLegalName(fbUser.displayName || '');
    setRegEmail(fbUser.email || '');
    setRegUsername(fbUser.email ? fbUser.email.split('@')[0] : `${provider === 'google' ? 'google' : 'fb'}_${fbUser.uid.slice(0, 8)}`);
    setMode('register');
    setRegStep(1);
    setSuccessMsg(`${label} 授權成功！請繼續完成註冊程序。`);
  };

  const isCancelledSocialLogin = (err: any) =>
    err?.code === 'auth/popup-closed-by-user' ||
    err?.code === 'auth/cancelled-popup-request' ||
    String(err?.message || '').includes('您已取消');

  // Google Fast Login
  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      const googleUser = await loginWithFirebaseGoogle();
      await completeSocialLogin('google', googleUser);
    } catch (err: any) {
      console.warn('Google auth error:', err);
      // 安全性：登入失敗或取消時只顯示訊息，絕不自動切換成任何帳號
      if (!isCancelledSocialLogin(err)) {
        setErrorMsg('Google 登入失敗：' + (err?.message || '請確認網路連線或稍後再試。'));
      }
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
      await completeSocialLogin('facebook', fbUser);
    } catch (err: any) {
      console.warn('Facebook auth error:', err);
      // 安全性：Email 已被其他登入方式使用時，不可直接登入那個帳號（未驗證是本人）
      if (!isCancelledSocialLogin(err)) {
        setErrorMsg('Facebook 登入失敗：' + (err?.message || '請確認網路連線或稍後再試。'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 手機整頁跳轉回來：完成社群登入
  useEffect(() => {
    if (!isOpen || !pendingSocialLogin) return;
    const outcome = pendingSocialLogin;
    clearPendingSocialLogin();
    if ('error' in outcome) {
      setErrorMsg(`${outcome.provider === 'google' ? 'Google' : 'Facebook'} 登入失敗：${outcome.error}`);
      return;
    }
    setIsLoading(true);
    void completeSocialLogin(outcome.provider, outcome.user)
      .catch((err: any) => setErrorMsg('登入失敗：' + (err?.message || '請稍後再試。')))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pendingSocialLogin]);

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
        // 安全性：管理員帳號只能以白名單內的已驗證 Email 登入
        if (existing.role === 'admin') {
          setErrorMsg('此帳號需使用已授權的管理員 Email 登入。');
          setIsLoading(false);
          return;
        }
        const checkRes = checkUserDeactivationStatus(existing);
        if (!checkRes.canLogin) {
          setErrorMsg('登入失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已完成註銷。'));
          return;
        }
        const effectiveUser = checkRes.restoredUser || existing;
        switchAccount(effectiveUser.id, { authenticatedUid: fbUser.uid });
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

  // Send Firebase Email Password Reset & Email Verification Code
  const handleSendEmailReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const input = forgotIdentifier.trim();
    if (!input) {
      setErrorMsg('請輸入註冊時使用的電子郵件或帳號！');
      return;
    }

    const cleanInput = input.toLowerCase().trim();
    // 嚴格核對發送的郵件或帳號是否與註冊資料一致
    const registeredUser = availableUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase().trim() === cleanInput) ||
        (u.username && u.username.toLowerCase().trim() === cleanInput)
    );

    const targetEmail = cleanInput.includes('@')
      ? cleanInput
      : registeredUser?.email?.trim() || null;

    if (!targetEmail) {
      setErrorMsg(`發送失敗：查無「${input}」的註冊帳號或郵件，請輸入完整 Email 地址！`);
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      // 優先寄 IdeaX 自己的 6 位數驗證碼信；伺服器無法用驗證碼重設時，改寄 Firebase 官方重設連結
      let mode: 'code' | 'link' = 'link';
      try {
        const result = await sendEmailVerificationCode(targetEmail, 'forgot_password', registeredUser?.name);
        if (result.canResetWithCode) mode = 'code';
      } catch (mailErr: any) {
        console.warn('Backend reset code note:', mailErr?.message);
      }
      if (mode === 'link') {
        await sendFirebasePasswordReset(targetEmail);
      }

      setForgotResetMode(mode);
      setForgotTargetEmail(targetEmail);
      setIsForgotEmailSent(true);
      setSmsCountdown(60);
      setSuccessMsg(
        mode === 'code'
          ? `驗證碼已寄到 ${targetEmail}，請到信箱查收（也請檢查垃圾郵件匣）。`
          : `重設密碼信已寄到 ${targetEmail}，請到信箱查收（也請檢查垃圾郵件匣）。`
      );
    } catch (err: any) {
      console.warn('Email reset send error:', err);
      setErrorMsg('發送密碼重設信失敗：' + (err.message || '請確認該信箱是否已註冊'));
    } finally {
      setIsLoading(false);
    }
  };

  // Direct reset password from Email verification code & link
  const handleEmailPasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanTargetEmail = forgotTargetEmail.toLowerCase().trim();
    const cleanCode = forgotEmailCode.trim();

    if (!cleanCode) {
      setErrorMsg('請輸入電子信箱中收到的安全連結或認證代碼！');
      return;
    }

    const pwdVal = validatePassword(forgotNewPassword);
    if (!pwdVal.isValid) {
      setErrorMsg('密碼設定失敗：' + pwdVal.message);
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('密碼設定失敗：兩次輸入的新密碼不一致！');
      return;
    }

    setIsLoading(true);
    try {
      let isVerified = false;

      // 1. 6 位數驗證碼：由伺服器直接重設 Firebase 帳號密碼
      if (/^\d{6}$/.test(cleanCode)) {
        await resetPasswordWithEmailCode(cleanTargetEmail, cleanCode, forgotNewPassword);
        isVerified = true;
      } else {
        // 2. Firebase 重設連結或代碼 (oobCode)
        try {
          await confirmFirebasePasswordReset(cleanCode, forgotNewPassword);
          isVerified = true;
        } catch (fbErr: any) {
          console.warn('Firebase confirm action code check:', fbErr.message);
        }
      }

      if (!isVerified) {
        throw new Error('認證代碼或連結不正確或已過期，請確認信件中的最新連結！');
      }

      const matched = availableUsers.find(
        (u) => u.email && u.email.toLowerCase().trim() === cleanTargetEmail
      );

      if (matched) {
        matched.password = forgotNewPassword.trim();
        setAvailableUsers((prev) =>
          prev.map((u) => (u.id === matched.id ? { ...u, password: forgotNewPassword.trim() } : u))
        );
        if (currentUser.id === matched.id) {
          setCurrentUser((prev) => ({ ...prev, password: forgotNewPassword.trim() }));
        }
      }

      setSuccessMsg('🎉 密碼已成功重設！請使用新密碼登入。');
      setTimeout(() => {
        setMode('login');
        setLoginIdentifier(cleanTargetEmail);
        setLoginPassword(forgotNewPassword.trim());
        setSuccessMsg(null);
        setIsForgotEmailSent(false);
        setForgotEmailCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      }, 1200);
    } catch (err: any) {
      setErrorMsg('密碼重設失敗：' + (err.message || '代碼不正確或已過期，請重新發送！'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Advance to Step 2 in Registration
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (regAuthProvider === 'email') {
      const trimmedEmail = regEmail.trim();
      if (!trimmedEmail) {
        setErrorMsg('註冊失敗：請輸入電子信箱作為登入帳號！');
        return;
      }
      if (!trimmedEmail.includes('@') || trimmedEmail.length < 5) {
        setErrorMsg('註冊失敗：請輸入正確格式的電子信箱！');
        return;
      }
      const isEmailDuplicate = availableUsers.some(
        (u) => u.email && u.email.toLowerCase() === trimmedEmail.toLowerCase()
      );
      if (isEmailDuplicate) {
        setErrorMsg('註冊失敗：此 Email 已被註冊使用，請直接以該 Email 登入。');
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

      // 手機改為選填：有填才檢查格式（解答者在第二步實名認證時仍需填寫）
      const cleanPhone = regPhone.trim().replace(/[\s-]/g, '');
      if (cleanPhone && cleanPhone.length < 8) {
        setErrorMsg('註冊失敗：手機號碼格式不正確，或先留空之後再補。');
        return;
      }

      // 自動從 Email 前綴產生安全 username
      const emailPrefix = trimmedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      const derivedUsername = emailPrefix.length >= 4 ? emailPrefix : `${emailPrefix}_user`;
      if (!regUsername.trim()) {
        setRegUsername(derivedUsername);
      }
    }

    const effectiveName = regName.trim() || (regEmail.includes('@') ? regEmail.split('@')[0] : (regUsername.trim() || '平台會員'));
    if (!effectiveName) {
      setErrorMsg('註冊失敗：請輸入姓名或暱稱。');
      return;
    }
    if (!regName.trim()) {
      setRegName(effectiveName);
    }

    if (!agreeGeneralTerms || !agreeCompetitionTerms) {
      setErrorMsg('註冊失敗：請先勾選同意 《IdeaX一般條款》 與 《創星季一般用戶條款》。');
      return;
    }

    // 簡化註冊：提問者一步完成，興趣與推播之後可在個人中心設定；解答者仍需進入第二步實名認證
    if (regRole === 'questioner') {
      void handleFinalRegister(undefined, true);
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

    // 若為解答者，必須填寫完整實名認證個資
    if (isExpert) {
      const effectiveLegalName = regRealLegalName.trim() || regName.trim();
      const effectiveId = regIdNumber.trim();
      const effectivePhone = phone.trim() || regPhone.trim();

      if (!industry) {
        setErrorMsg('請選擇您的專業所屬行業。');
        return;
      }
      if (!effectiveLegalName) {
        setErrorMsg('註冊失敗：解答者依法須先填寫真實姓名進行實名核驗。');
        return;
      }
      if (!effectiveId || effectiveId.length < 6) {
        setErrorMsg('註冊失敗：解答者須填寫身分證字號或居留證號進行實名核驗。');
        return;
      }
      if (!effectivePhone) {
        setErrorMsg('註冊失敗：解答者須填寫聯絡手機號碼。');
        return;
      }
      if (!jobTitle.trim()) {
        setErrorMsg('註冊失敗：解答者須填寫專業頭銜或職稱。');
        return;
      }
      if (!idCardFront || !idCardBack) {
        setErrorMsg('註冊失敗：解答者依法須拍攝或上傳身分證正反面照片以供建檔核驗。');
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
          // 寄送 IdeaX 歡迎信（含 Email 驗證連結）；伺服器無法產生驗證連結時，改寄 Firebase 官方驗證信
          void (async () => {
            const welcome = await sendWelcomeEmail(regName.trim() || regUsername.trim());
            if (!welcome.sentVerification) {
              try {
                await sendFirebaseEmailVerification(cred);
              } catch (verErr: any) {
                console.warn('Firebase email verification send notice:', verErr);
              }
            }
          })();
        } catch (authErr: any) {
          // 安全：Firebase 註冊失敗（例如 Email 已被註冊）就停下來，不再建立只存在這台裝置、沒有真正登入的帳號
          const code = String(authErr?.code || '');
          setErrorMsg(
            code.includes('email-already-in-use') ? '這個 Email 已經註冊過了，請直接登入；忘記密碼可以點「忘記密碼」重設。'
            : code.includes('weak-password') ? '密碼太簡單，請改用 6 ~ 20 位英數組合。'
            : code.includes('invalid-email') ? 'Email 格式不正確，請重新確認。'
            : `註冊失敗：${authErr?.message || '請稍後再試'}`
          );
          setIsLoading(false);
          return;
        }
      }
      // 正式站一定要有真正的 Firebase 帳號才能建立會員（本機開發除外）
      if (!registeredUid && !isLocalDevHost()) {
        setErrorMsg('註冊失敗：無法建立登入帳號，請稍後再試或改用 Google 登入。');
        setIsLoading(false);
        return;
      }

      const chosenDomains: string[] = regInterests; // 只用使用者自己選的興趣；沒選時主領域另有「創新創業」保底


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

      const finalName = regName.trim() || regUsername.trim() || (regEmail.includes('@') ? regEmail.split('@')[0] : '平台會員');
      const finalUsername = regUsername.trim() || (regEmail.includes('@') ? regEmail.split('@')[0] : `user_${newId.slice(0, 8)}`);

      const newUser: UserType = {
        id: newId,
        username: finalUsername,
        password: regPassword.trim() || undefined,
        name: finalName,
        title: isExpert
          ? jobTitle.trim() || '認證解題專家'
          : (isQuestionerSkipped ? '新進提問者' : (jobTitle.trim() || '創新專案發起人')),
        avatar: presetAvatarFor(newId),
        role: regRole,
        balance: 0,
        pendingEarnings: 0,
        reputation: isExpert ? 120 : 100,
        joinedDate: new Date().toISOString().split('T')[0],
        // 自我介紹留白，讓使用者自己寫（不再自動產生「XXX 的個人簡介。」）
        bio: '',
        email: regEmail.trim() || `${finalUsername}@ideax.user`,
        phone: effectivePhone,
        // 略過或沒選的欄位存成未填寫，不再補假資料
        gender: undefined, // 註冊表單沒有問性別，留空（問卷再填）
        ageGroup: isQuestionerSkipped || !ageGroup ? undefined : ageGroup,
        industry: isQuestionerSkipped || !industry ? undefined : industry,
        jobTitle: isQuestionerSkipped ? undefined : jobTitle.trim() || undefined,
        annualSalary: undefined, // 註冊表單沒有問年薪，留空（問卷再填）
        company: company.trim() || undefined,
        domain: (chosenDomains[0] as Category) || '創新創業',
        domains: chosenDomains as Category[],
        skills: chosenDomains.length > 0 ? chosenDomains : ['創新問題解題'],
        interests: chosenDomains,
        hasCompletedProfile: !isQuestionerSkipped,
        subscriptionTier: 'free',
        // 註冊為解答者只是送出資料，要等管理員審核才算通過（不再註冊當下就變成已認證）
        verifiedExpert: false,
        verifiedBadge: undefined,
        realNameAuthStatus: isExpert && (idCardFront || idCardBack) ? 'pending' : 'none',
        realNameAuthData: isExpert
          ? {
              legalName: regRealLegalName.trim() || regName.trim(),
              idNumber: regIdNumber.trim(),
              nationality: '中華民國 (Taiwan)',
              birthDate: '', // 註冊沒有問生日，留空
              phoneNumber: effectivePhone || '',
              email: regEmail.trim() || `${regUsername.trim()}@ideax.user`,
              idCardFrontFile: idCardFront || undefined,
              idCardBackFile: idCardBack || undefined,
              appliedAt: new Date().toISOString(),
            }
          : undefined,
        rating: 0, // 還沒有任何評價
        reviewCount: 0,
        acceptedSolutionsCount: 0,
        submittedSolutionsCount: 0,
        // 註冊流程沒有問問卷，不再存預設答案；問卷由使用者在個人中心「問卷（用戶調查）」自行填寫
        surveyData: undefined,
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

      // 雲端同步最多等 5 秒：Firestore 離線或配額用盡時，寫入會一直等不到回應，
      // 不能讓註冊卡住；同步會在背景繼續完成
      await Promise.race([
        syncUserToFirestore(newUser).catch((syncErr) => console.warn('User cloud sync notice:', syncErr)),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
      let signupBonusGranted = false;
      let signupBonusError = false;
      if (registeredUid && !isLocalDevHost()) {
        try {
          const bonus = await claimSignupBonus();
          newUser.balance = bonus.balance;
          signupBonusGranted = bonus.granted;
        } catch (bonusErr) {
          signupBonusError = true;
          console.warn('Signup bonus notice:', bonusErr);
        }
      }
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

      setSuccessMsg(
        signupBonusGranted
          ? '註冊完成，已入帳 100 平台點並自動登入！首次發文即再加贈 200 點！'
          : signupBonusError
          ? '註冊完成並已自動登入；100 平台點入帳確認中，請稍後查看餘額。'
          : '註冊完成並已自動登入！'
      );

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMsg('註冊失敗：' + (err.message || '發生錯誤，請稍後再試。'));
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Real SMS Send Code & Reset
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanIdentifier = forgotIdentifier.trim();
    if (!cleanIdentifier) {
      setErrorMsg('請輸入註冊帳號、手機號碼或 Email。');
      return;
    }

    const cleanPhone = cleanIdentifier.replace(/[\s-]/g, '');
    const matched = availableUsers.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanIdentifier.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === cleanIdentifier.toLowerCase()) ||
        (u.phone && u.phone.replace(/[\s-]/g, '') === cleanPhone)
    );

    const targetPhone = matched?.phone || (cleanPhone.startsWith('09') || cleanPhone.startsWith('+') ? cleanPhone : null);

    if (!matched && !targetPhone) {
      setErrorMsg('重設失敗：此手機號碼或帳號尚未註冊或與系統資料不一致，請確認後重試！');
      return;
    }

    const effectivePhone = targetPhone || cleanPhone;

    if (!isForgotCodeSent) {
      setIsLoading(true);
      try {
        try {
          const verifier = getOrCreateRecaptcha('recaptcha-sms-forgot-container');
          const confirmation = await loginWithFirebasePhone(effectivePhone, verifier);
          setForgotSmsConfirmation(confirmation);
        } catch (fbErr: any) {
          console.warn('Firebase SMS notice, using backend SMS delivery:', fbErr);
          await sendBackendSmsCode(effectivePhone, 'forgot_password');
        }

        setIsForgotCodeSent(true);
        setSmsCountdown(60);
        setSuccessMsg(`安全驗證碼簡訊已發送至門號 ${effectivePhone}，請於 60 秒內輸入 6 位數驗證碼！`);
      } catch (err: any) {
        setErrorMsg('發送簡訊驗證碼失敗：' + (err.message || '請確認手機門號格式'));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!forgotSmsCode.trim() || forgotSmsCode.trim().length < 6) {
      setErrorMsg('請輸入完整的 6 位數簡訊驗證碼！');
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
    try {
      if (forgotSmsConfirmation) {
        try {
          await verifyFirebasePhoneCode(forgotSmsConfirmation, forgotSmsCode.trim());
        } catch (fbErr: any) {
          console.warn('Firebase confirmation failed, verifying backend SMS code:', fbErr);
          await verifyBackendSmsCode(effectivePhone, forgotSmsCode.trim(), 'forgot_password');
        }
      } else {
        await verifyBackendSmsCode(effectivePhone, forgotSmsCode.trim(), 'forgot_password');
      }

      if (matched) {
        matched.password = forgotNewPassword.trim();
        setAvailableUsers((prev) => prev.map((u) => (u.id === matched.id ? { ...u, password: forgotNewPassword.trim() } : u)));
        if (currentUser.id === matched.id) {
          setCurrentUser((prev) => ({ ...prev, password: forgotNewPassword.trim() }));
        }
      }

      setSuccessMsg('🎉 密碼重設成功！請以新密碼登入。');
      setTimeout(() => {
        setMode('login');
        setLoginIdentifier(matched?.username || matched?.email || matched?.phone || cleanIdentifier);
        setLoginPassword(forgotNewPassword.trim());
        setSuccessMsg(null);
        setIsForgotCodeSent(false);
        setForgotSmsConfirmation(null);
        setForgotSmsCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      }, 1000);
    } catch (err: any) {
      setErrorMsg('簡訊驗證碼確認失敗：' + (err.message || '代碼不正確或已過期，請重新發送！'));
    } finally {
      setIsLoading(false);
    }
  };

  // Method 3: Instant Security Identity Verification Reset (4項完整身分核驗，不符則轉真人客服協助)
  const handleSecurityResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setShowCustomerServiceHelp(false);

    const cleanIdentifier = forgotIdentifier.trim().toLowerCase();
    const cleanPhone = forgotPhone.trim().replace(/[\s-]/g, '');
    const cleanName = forgotName.trim().toLowerCase();

    if (!cleanIdentifier) {
      setErrorMsg('身分核驗失敗：請輸入註冊時的 Email 或帳號！');
      return;
    }
    if (!cleanPhone) {
      setErrorMsg('身分核驗失敗：請輸入註冊時填寫的手機電話！');
      return;
    }
    if (!cleanName) {
      setErrorMsg('身分核驗失敗：請輸入認證真實姓名或帳號暱稱！');
      return;
    }

    // 1. 核對帳號或電子郵件
    const matched = availableUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase().trim() === cleanIdentifier) ||
        (u.username && u.username.toLowerCase().trim() === cleanIdentifier)
    );

    if (!matched) {
      setErrorMsg(`身分核驗失敗：查無「${forgotIdentifier}」之註冊帳號或電子郵件。必須完整核對 帳號/Email、電話、認證姓名或暱稱 才能重設，否則請透過人工客服協助。`);
      setShowCustomerServiceHelp(true);
      return;
    }

    // 2. 嚴格核對註冊電話
    const userPhone = (matched.phone || '').replace(/[\s-]/g, '');
    if (!userPhone || userPhone !== cleanPhone) {
      setErrorMsg('身分核驗失敗：輸入的手機電話與該帳號之註冊電話不符！必須完全吻合才能重設，若資料有異請聯繫人工客服。');
      setShowCustomerServiceHelp(true);
      return;
    }

    // 3. 認證姓名 或 帳號暱稱（對一個即可）
    const userName = (matched.name || '').toLowerCase().trim();
    const userUsername = (matched.username || '').toLowerCase().trim();
    const userLegalName = ((matched as any).realLegalName || (matched as any).legalName || '').toLowerCase().trim();

    const isNameOrNicknameMatched =
      (userName && (userName === cleanName || userName.includes(cleanName) || cleanName.includes(userName))) ||
      (userUsername && (userUsername === cleanName || userUsername.includes(cleanName) || cleanName.includes(userUsername))) ||
      (userLegalName && (userLegalName === cleanName || userLegalName.includes(cleanName) || cleanName.includes(userLegalName)));

    if (!isNameOrNicknameMatched) {
      setErrorMsg('身分核驗失敗：輸入的姓名或暱稱與註冊資料不符（認證姓名或帳號暱稱對一項即可）！若無法核對請透過人工客服協助。');
      setShowCustomerServiceHelp(true);
      return;
    }

    // 4. 設定新密碼驗證
    const pwdVal = validatePassword(forgotNewPassword);
    if (!pwdVal.isValid) {
      setErrorMsg('密碼設定失敗：' + pwdVal.message);
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('密碼設定失敗：兩次輸入的新密碼不一致！');
      return;
    }

    setIsLoading(true);
    setTimeout(async () => {
      matched.password = forgotNewPassword.trim();
      try {
        await syncUserToFirestore(matched);
      } catch (syncErr) {
        console.warn('Firestore password sync note:', syncErr);
      }
      setAvailableUsers((prev) =>
        prev.map((u) => (u.id === matched.id ? { ...u, password: forgotNewPassword.trim() } : u))
      );
      if (currentUser.id === matched.id) {
        setCurrentUser((prev) => ({ ...prev, password: forgotNewPassword.trim() }));
      }

      setSuccessMsg('🎉 身分安全校驗成功！新密碼已設定，已為您自動登入。');
      setIsLoading(false);
      setTimeout(() => {
        setMode('login');
        setLoginIdentifier(matched.email || matched.username || cleanIdentifier);
        setLoginPassword(forgotNewPassword.trim());
        setSuccessMsg(null);
        setForgotPhone('');
        setForgotName('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setShowCustomerServiceHelp(false);
      }, 1200);
    }, 450);
  };

  const handleSwitchAccount = (u: UserType) => {
    const checkRes = checkUserDeactivationStatus(u);
    if (!checkRes.canLogin) {
      setErrorMsg('切換失敗：' + (checkRes.errorReason || '此帳號已超過 7 日反悔期並已完成註銷。'));
      return;
    }
    const effectiveUser = checkRes.restoredUser || u;
    const ok = switchAccount(effectiveUser.id);
    if (ok) {
      setSuccessMsg(`已成功切換身分為「${effectiveUser.name}」！`);
      setTimeout(() => onClose(), 350);
    } else {
      setErrorMsg('切換身分失敗，請重試。');
    }
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

        {/* Feedback Alert Messages (只留一個最新訊息，成功或錯誤僅顯示最新的一則，絕不重疊) */}
        {latestAlert && (
          <div
            className={`mb-4 p-3.5 rounded-xl border text-xs font-bold text-center animate-in fade-in ${
              latestAlert.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}
          >
            {latestAlert.message}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 1: LOGIN (支援電郵/密碼、手機簡訊驗證碼、Google與FB登入) */}
        {/* ============================================================== */}
        {mode === 'login' && (
          <div className="space-y-4 sm:space-y-5 w-full">
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

                {/* 3. 保持登入 ＋ 同步勾選競賽網一般用戶條款 ＋ 右側 忘記密碼 / 快速註冊 */}
                <div className="space-y-2 pt-1 px-0.5">
                  <div className="flex items-center justify-between">
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

                  {/* 登入即代表同意條款（不再需要另外勾選） */}
                  <p className="text-[11px] sm:text-xs text-stone-500 leading-relaxed px-1">
                    登入即代表您同意{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        openAboutModal('general_terms');
                      }}
                      className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
                    >
                      《IdeaX一般條款》
                    </button>
                    {' '}與{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setCompetitionTermsDoc('B');
                      }}
                      className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
                    >
                      《創星季一般用戶條款》
                    </button>
                    。
                  </p>
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
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
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
                    const isAdminUser = u.id === 'user-admin' || u.id === 'a000000001' || u.role === 'admin' || u.accountType === 'admin';
                    const isEnterpriseUser =
                      u.accountType === 'enterprise' ||
                      (u as any).role === 'enterprise' ||
                      u.id.startsWith('b') ||
                      Boolean(u.memberId && u.memberId.startsWith('b'));
                    const uDisplayName = resolveUserDisplayName(u.id, u.name, availableUsers);
                    const uNameColorClass = getUserNameColorClass(u.id, availableUsers, u);

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSwitchAccount(u)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-left transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 ${
                          isCurrent
                            ? 'bg-amber-100/90 border-amber-400 font-bold ring-2 ring-amber-300'
                            : isAdminUser
                            ? 'bg-purple-50 hover:bg-purple-100 border-purple-300 font-bold'
                            : isEnterpriseUser
                            ? 'bg-blue-50 hover:bg-blue-100 border-blue-300 font-bold'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-900 hover:border-stone-300'
                        }`}
                        title={`切換登入為「${uDisplayName}」`}
                      >
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={uDisplayName}
                          className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-stone-200"
                        />
                        <span className={`text-xs truncate max-w-[105px] ${uNameColorClass}`}>{uDisplayName}</span>
                        {isAdminUser && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-900 font-bold shrink-0">
                            管理員
                          </span>
                        )}
                        {!isAdminUser && isEnterpriseUser && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 font-bold shrink-0">
                            企業機構
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
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-left shadow-sm">
              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-black text-amber-950">新用戶註冊即贈 100 平台點，首次發文再送 200 點！</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-amber-900">平台點可用於懸賞提問、諮詢或支持優質創作者；與創星幣分開計算。</p>
              </div>
            </div>
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
                    <span>Google授權成功！請繼續完成註冊程序（{regEmail || regName}）</span>
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
                    會員身分
                  </label>
                  <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-stone-900">一般用戶</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold">
                          全站通用
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-600 block mt-0.5 leading-tight">
                        同時具備提問懸賞、提案解題與參與創星季競賽等全部平台功能。
                      </span>
                    </div>
                  </div>
                </div>

                {regAuthProvider === 'email' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-stone-700">
                          電子信箱 <span className="text-amber-800 font-medium">(作為登入帳號)</span> <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-stone-400">登入帳號 / 密碼重設 / 系統通知</span>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRegEmail(val);
                              if (!regName || regName === regEmail.split('@')[0]) {
                                const prefix = val.split('@')[0];
                                setRegName(prefix);
                              }
                            }}
                            placeholder="例如：alex@example.com"
                            className="w-full pl-9 pr-3 py-2.5 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none font-medium"
                          />
                        </div>
                      </div>
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
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-stone-700">
                          聯絡電話 / 手機號碼 <span className="text-[10px] font-medium text-stone-400">（選填）</span>
                        </label>
                        <span className="text-[10px] text-stone-400">可用於找回密碼，之後再補也可以</span>
                      </div>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="例如：0912345678"
                          className="w-full pl-9 pr-3 py-2.5 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none font-medium"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-stone-700">
                      姓名 / 暱稱 <span className="text-[10px] font-medium text-stone-400">（選填，未填會用 Email 前綴）</span>
                    </label>
                    <span className="text-[10px] text-stone-400">系統顯示名稱（可隨時在個人中心修改）</span>
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (!regRealLegalName) setRegRealLegalName(e.target.value);
                    }}
                    placeholder={regEmail ? `例如：${regEmail.split('@')[0] || 'Alex'}` : '例如：Alex Chen'}
                    className="w-full px-3 py-2.5 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none font-medium"
                  />
                </div>

                {regAuthProvider === 'email' && (
                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-stone-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                    <span>您填寫的 <strong className="text-amber-950 font-bold">Email</strong> 即為登入帳號。</span>
                  </div>
                )}

                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer select-none bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                    <input
                      type="checkbox"
                      checked={agreeGeneralTerms && agreeCompetitionTerms}
                      onChange={(e) => {
                        setAgreeGeneralTerms(e.target.checked);
                        setAgreeCompetitionTerms(e.target.checked);
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-amber-600 accent-amber-600 cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-stone-700 font-medium leading-relaxed">
                      我已閱讀並同意{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          openAboutModal('general_terms');
                        }}
                        className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
                      >
                        《IdeaX一般條款》
                      </button>
                      {' '}與{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setCompetitionTermsDoc('B');
                        }}
                        className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
                      >
                        《創星季一般用戶條款》
                      </button>
                      。
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>
                    {regRole === 'solver' ? '下一步：填寫個資與實名認證' : '建立帳號'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* STEP 2: 身分專屬後續程序 */}
            {regStep === 2 && (
              <div className="space-y-4">
                {/* 1. 解答者專屬流程：強制個資與實名認證 */}
                {regRole === 'solver' && (
                  <form onSubmit={(e) => handleFinalRegister(e, false)} className="space-y-3.5">
                    {/* 解答者實名認證使用規範（點擊 ? 展開顯示，預設簡約隱藏） */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-stone-800">解答者實名認證</span>
                          <button
                            type="button"
                            onClick={() => setShowSolverGuideline(!showSolverGuideline)}
                            className="w-4 h-4 rounded-full bg-stone-100 hover:bg-amber-100 text-stone-500 hover:text-amber-800 text-[11px] font-black flex items-center justify-center border border-stone-200 cursor-pointer transition-colors shadow-2xs"
                            title="點擊查看使用規範"
                          >
                            ?
                          </button>
                        </div>
                        <span className="text-[10px] text-stone-400 font-medium">
                          僅供實名認證與建檔備查
                        </span>
                      </div>

                      {showSolverGuideline && (
                        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs space-y-1 animate-in fade-in">
                          <div className="font-bold flex items-center justify-between text-amber-900">
                            <span className="flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-amber-600" />
                              <span>使用規範</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowSolverGuideline(false)}
                              className="text-stone-400 hover:text-stone-700 text-xs cursor-pointer px-1"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                            為保平台用戶權益，解答者須提供個人資訊。以下內容絕不外洩，僅供實名認證與建檔備查。
                          </p>
                        </div>
                      )}
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
                          <option value="" disabled>請選擇行業</option>
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
                          <option value="">請選擇（選填）</option>
                          <option value="18_24">18 ~ 24 歲</option>
                          <option value="25_34">25 ~ 34 歲</option>
                          <option value="35_44">35 ~ 44 歲</option>
                          <option value="45_54">45 ~ 54 歲</option>
                          <option value="55_above">55 歲以上</option>
                        </select>
                      </div>
                    </div>

                    {/* 身分證正反面照片拍攝與儲存建檔 (必填) */}
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-black text-stone-800">
                            身分證件相片拍攝與影像建檔 <span className="text-rose-500">*</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full font-bold">
                          依法實名建檔
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        請拍攝或上傳本人清晰有效的國民身分證（或外僑居留證）正反面照片。系統將自動高畫質壓縮轉存為安全憑證進行建檔。
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. 身分證正面 */}
                        <div className="p-2.5 rounded-xl bg-white border border-stone-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-stone-700">
                              身分證【正面】相片 <span className="text-rose-500">*</span>
                            </span>
                            <span className="text-[9px] text-stone-400">含姓名與清晰頭像</span>
                          </div>

                          {idCardFront ? (
                            <div className="space-y-2">
                              <div className="relative group rounded-lg overflow-hidden border border-stone-200 bg-stone-900 aspect-16/10">
                                <img
                                  src={idCardFront.url}
                                  alt="身分證正面預覽"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhotoModal({ title: '身分證正面照片', url: idCardFront.url })}
                                    className="p-1.5 rounded-lg bg-white/90 text-stone-900 hover:bg-white text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                                  >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                    <span>放大</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIdCardFront(null)}
                                    className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>刪除</span>
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono px-1">
                                <span className="truncate max-w-[120px]">{idCardFront.name}</span>
                                <span className="text-emerald-700 font-bold">
                                  {idCardFront.size} • 安全壓縮建檔{idCardFront.isStorage ? ' (Storage)' : ''}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {/* 隱藏的檔案輸入框 */}
                              <input
                                ref={frontCameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleIdPhotoCapture(e.target.files[0], 'front');
                                }}
                              />
                              <input
                                ref={frontFileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleIdPhotoCapture(e.target.files[0], 'front');
                                }}
                              />

                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  disabled={isProcessingIdPhoto === 'front'}
                                  onClick={() => frontCameraInputRef.current?.click()}
                                  className="py-2.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <Camera className="w-4 h-4 text-blue-600" />
                                  <span>{isProcessingIdPhoto === 'front' ? '處理中...' : '相機拍照'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessingIdPhoto === 'front'}
                                  onClick={() => frontFileInputRef.current?.click()}
                                  className="py-2.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <ImageIcon className="w-4 h-4 text-stone-500" />
                                  <span>選取相片</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. 身分證反面 */}
                        <div className="p-2.5 rounded-xl bg-white border border-stone-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-stone-700">
                              身分證【反面】相片 <span className="text-rose-500">*</span>
                            </span>
                            <span className="text-[9px] text-stone-400">含配偶與戶籍住址</span>
                          </div>

                          {idCardBack ? (
                            <div className="space-y-2">
                              <div className="relative group rounded-lg overflow-hidden border border-stone-200 bg-stone-900 aspect-16/10">
                                <img
                                  src={idCardBack.url}
                                  alt="身分證反面預覽"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhotoModal({ title: '身分證反面照片', url: idCardBack.url })}
                                    className="p-1.5 rounded-lg bg-white/90 text-stone-900 hover:bg-white text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                                  >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                    <span>放大</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIdCardBack(null)}
                                    className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>刪除</span>
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono px-1">
                                <span className="truncate max-w-[120px]">{idCardBack.name}</span>
                                <span className="text-emerald-700 font-bold">
                                  {idCardBack.size} • 安全壓縮建檔{idCardBack.isStorage ? ' (Storage)' : ''}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {/* 隱藏的檔案輸入框 */}
                              <input
                                ref={backCameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleIdPhotoCapture(e.target.files[0], 'back');
                                }}
                              />
                              <input
                                ref={backFileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleIdPhotoCapture(e.target.files[0], 'back');
                                }}
                              />

                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  disabled={isProcessingIdPhoto === 'back'}
                                  onClick={() => backCameraInputRef.current?.click()}
                                  className="py-2.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <Camera className="w-4 h-4 text-blue-600" />
                                  <span>{isProcessingIdPhoto === 'back' ? '處理中...' : '相機拍照'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessingIdPhoto === 'back'}
                                  onClick={() => backFileInputRef.current?.click()}
                                  className="py-2.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <ImageIcon className="w-4 h-4 text-stone-500" />
                                  <span>選取相片</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
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
                            <option value="">請選擇（選填）</option>
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
                            <option value="">請選擇（選填）</option>
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
            <div className="grid grid-cols-3 p-1 bg-stone-100 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setForgotMethod('email');
                  setErrorMsg(null);
                }}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  forgotMethod === 'email'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-black'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>電郵重設</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMethod('sms');
                  setErrorMsg(null);
                }}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  forgotMethod === 'sms'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-black'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-rose-600" />
                <span>簡訊重設</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMethod('security');
                  setErrorMsg(null);
                }}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  forgotMethod === 'security'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-black'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>身分核驗</span>
              </button>
            </div>

            {forgotMethod === 'email' ? (
              !isForgotEmailSent ? (
                <form onSubmit={handleSendEmailReset} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      註冊電子郵件 (Email) 或帳號 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center rounded-2xl border border-stone-200 bg-[#f0f4f8] focus-within:border-amber-500 focus-within:bg-white transition-all">
                      <div className="pl-3.5 pr-2 text-stone-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="輸入註冊時填寫的 Email 或帳號"
                        className="w-full pr-3 py-3 bg-transparent text-xs text-stone-900 placeholder:text-stone-400 outline-none font-medium"
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1.5 pl-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>發送的電子郵件必須與當初註冊帳號時一致。</span>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isLoading ? '核對並發送中...' : '發送密碼重設信'}</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotMethod('security')}
                      className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                    >
                      收不到電郵？改用「身分核驗」直接設定新密碼 →
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* 信件已發送提示卡 */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-black">{forgotResetMode === 'code' ? '驗證碼已寄出！' : '重設密碼信已寄出！'}</span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed pl-7">
                      已寄到 <strong className="font-mono text-emerald-950 font-bold">{forgotTargetEmail}</strong>，寄件人是「IdeaX 創點子團隊」。沒看到的話，請檢查垃圾郵件匣。
                    </p>

                    <div className="pl-7 text-[11px] text-stone-500 space-y-0.5">
                      {forgotResetMode === 'code' ? (
                        <p>在下方輸入信中的 6 位數驗證碼，並設定新密碼。驗證碼 10 分鐘內有效。</p>
                      ) : (
                        <p>直接點信中的連結即可重設密碼；也可以把連結貼到下方欄位。</p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-emerald-200/60 text-xs">
                      <span className="text-stone-500 font-medium">沒收到信件？</span>
                      <button
                        type="button"
                        disabled={smsCountdown > 0 || isLoading}
                        onClick={() => handleSendEmailReset()}
                        className="font-bold text-amber-800 hover:text-amber-950 disabled:text-stone-400 cursor-pointer disabled:cursor-not-allowed underline"
                      >
                        {smsCountdown > 0 ? `重新發送 (${smsCountdown}s)` : '重新發送'}
                      </button>
                    </div>
                  </div>

                  {/* 輸入信件代碼或連結重設 */}
                  <form onSubmit={handleEmailPasswordResetSubmit} className="space-y-3 p-3.5 bg-stone-50/80 rounded-2xl border border-stone-200">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-stone-700">
                          {forgotResetMode === 'code' ? '6 位數驗證碼' : '信中的重設連結'} <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-stone-400">請查收外部信箱</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={forgotEmailCode}
                        onChange={(e) => setForgotEmailCode(e.target.value)}
                        placeholder={forgotResetMode === 'code' ? '輸入 6 位數驗證碼' : '貼上信中的完整連結'}
                        inputMode={forgotResetMode === 'code' ? 'numeric' : undefined}
                        autoComplete={forgotResetMode === 'code' ? 'one-time-code' : 'off'}
                        className="w-full px-3 py-2.5 bg-white border border-stone-200 focus:border-amber-500 text-xs rounded-xl font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        設定新密碼 (6~20 位英數字) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="輸入 6~20 位新密碼"
                          className="w-full px-3.5 py-2.5 bg-white text-xs rounded-xl border border-stone-200 focus:border-amber-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">再次確認新密碼 <span className="text-rose-500">*</span></label>
                      <input
                        type="password"
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="再次輸入新密碼"
                        className="w-full px-3.5 py-2.5 bg-white text-xs rounded-xl border border-stone-200 focus:border-amber-500 outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !forgotEmailCode || forgotEmailCode.length < 6}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      {isLoading ? '驗證並重設中...' : '確認認證碼並儲存新密碼'}
                    </button>
                  </form>

                  <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1 text-center">
                    <p className="text-[11px] text-amber-950 font-medium">若信箱未收到信件，您可直接免等待信件重設：</p>
                    <button
                      type="button"
                      onClick={() => setForgotMethod('security')}
                      className="text-xs text-amber-900 hover:text-amber-950 font-black underline cursor-pointer"
                    >
                      👉 點此切換「身分核驗」直接設定新密碼
                    </button>
                  </div>

                  <div className="pt-1 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setLoginIdentifier(forgotTargetEmail);
                        setIsForgotEmailSent(false);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      完成並返回登入
                    </button>
                  </div>
                </div>
              )
            ) : forgotMethod === 'sms' ? (
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-stone-700">簡訊驗證碼 <span className="text-rose-500">*</span></label>
                        <span className="text-[10px] text-stone-400">請輸入 6 位數字</span>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={forgotSmsCode}
                        onChange={(e) => setForgotSmsCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="請輸入手機收到的 6 位數代碼"
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

                {/* reCAPTCHA 容器 */}
                <div id="recaptcha-sms-forgot-container"></div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading || (isForgotCodeSent && (!forgotSmsCode || forgotSmsCode.length < 6))}
                    className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? '處理中...' : isForgotCodeSent ? '確認驗證並重設密碼' : '發送簡訊驗證碼'}
                  </button>

                  {isForgotCodeSent && (
                    <button
                      type="button"
                      disabled={smsCountdown > 0 || isLoading}
                      onClick={() => {
                        setIsForgotCodeSent(false);
                      }}
                      className="w-full py-2 text-xs text-stone-500 hover:text-stone-800 font-bold transition-colors cursor-pointer text-center"
                    >
                      {smsCountdown > 0 ? `重新發送 (${smsCountdown}s)` : '重新發送簡訊驗證碼'}
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* Method 3: Security Verification Reset (身分校驗重設) */
              <form onSubmit={handleSecurityResetSubmit} className="space-y-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] leading-relaxed">
                  <strong>身分安全校驗必須以下項目都正確：</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-stone-700">
                    <li>1. 註冊 Email 或帳號</li>
                    <li>2. 註冊姓名 / 暱稱（認證姓名或帳號暱稱對一個即可）</li>
                    <li>3. 註冊電話</li>
                  </ul>
                  <span className="text-[10px] text-emerald-800 mt-1 block">全數吻合後即可直接設定新密碼；若資料不符須透過人工客服協助。</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    1. 註冊 Email 或帳號 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => {
                        setForgotIdentifier(e.target.value);
                        if (showCustomerServiceHelp) setShowCustomerServiceHelp(false);
                      }}
                      placeholder="例如：alex@example.com 或 alex_888"
                      className="w-full pl-9 pr-3 py-2 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-stone-700">
                      2. 註冊姓名 / 暱稱 <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold">認證姓名或暱稱對一個即可</span>
                  </div>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={forgotName}
                      onChange={(e) => {
                        setForgotName(e.target.value);
                        if (showCustomerServiceHelp) setShowCustomerServiceHelp(false);
                      }}
                      placeholder="輸入註冊姓名 或 帳號暱稱"
                      className="w-full pl-9 pr-3 py-2 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    3. 註冊電話 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={forgotPhone}
                      onChange={(e) => {
                        setForgotPhone(e.target.value);
                        if (showCustomerServiceHelp) setShowCustomerServiceHelp(false);
                      }}
                      placeholder="輸入當初註冊的手機號碼（例如：0912345678）"
                      className="w-full pl-9 pr-3 py-2 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      4. 設定新密碼 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="6~20 位英數密碼"
                        className="w-full pl-9 pr-8 py-2 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      再次確認新密碼 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="再次輸入新密碼"
                        className="w-full pl-9 pr-3 py-2 bg-[#f0f4f8] focus:bg-white text-xs rounded-xl border border-transparent focus:border-amber-500 outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isLoading ? '核驗並更新中...' : '核驗身分並重設密碼'}</span>
                </button>

                {/* 人工客服協助卡片 */}
                <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-2xl space-y-1.5 text-xs text-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-amber-700" />
                      <span>資料不符或遺忘？由專人協助</span>
                    </span>
                    <span className="text-[10px] text-stone-500">人工身分審查</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    若四項資料無法完全對齊，請聯繫人工客服專員為您調閱紀錄並重設密碼。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      openCustomerService({
                        subject: '忘記密碼身分核驗人工客服協助',
                        message: `【忘記密碼身分核對專人服務】\n帳號/Email：${forgotIdentifier || '未填寫'}\n聯絡電話：${forgotPhone || '未填寫'}\n姓名/暱稱：${forgotName || '未填寫'}\n申請原因：身分校驗項目未完全吻合，申請由客服人員人工核驗身分並協助密碼找回。`
                      });
                    }}
                    className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>聯繫線上人工客服專員協助</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
      </div>
      {previewPhotoModal && (
        <div
          style={{ zIndex: 2147483647 }}
          className="fixed inset-0 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div
            className="bg-stone-900 border border-stone-700 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white pb-1 border-b border-stone-800">
              <span className="text-xs font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>{previewPhotoModal.title}</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1 rounded-full text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-stone-400">實名身分核驗安全存檔</span>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                關閉檢視
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 創星季競賽規章與條款說明彈窗 */}
      {competitionTermsDoc && (
        <CompetitionTermsModal
          isOpen={Boolean(competitionTermsDoc)}
          onClose={() => setCompetitionTermsDoc(null)}
          initialDoc={competitionTermsDoc}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

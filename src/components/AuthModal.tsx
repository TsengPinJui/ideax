import React, { useState } from 'react';
import { X, Mail, Lock, User, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IdeaXLogo } from './IdeaXLogo';
import { CURRENT_TERMS_VERSION } from '../data/termsData';
import { User as UserType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const {
    currentUser,
    setCurrentUser,
    availableUsers,
    recordTermsAgreement,
    openAboutModal,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'questioner' | 'solver'>('questioner');
  const [agreeGeneralTerms, setAgreeGeneralTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setErrorMsg('請輸入姓名或暱稱');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('請輸入有效的電子郵件信箱');
      return;
    }
    if (!agreeGeneralTerms) {
      setErrorMsg('註冊前請先閱讀並勾選同意《一般服務條款》（含隱私權、免責及其他聲明）');
      return;
    }

    const newUser: UserType = {
      id: `user-${Date.now().toString(36)}`,
      name: regName.trim(),
      title: regRole === 'solver' ? '認證專家' : '新創提問者',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: regRole,
      balance: 1000, // 新人註冊體驗金 1000 點
      pendingEarnings: 0,
      reputation: 80,
      joinedDate: new Date().toISOString().split('T')[0],
      bio: '創點子 IdeaX 新註冊會員',
      email: regEmail.trim(),
      totalWithdrawn: 0,
      subscriptionTier: 'free',
      domain: '創新創業',
      skills: ['創新思維', '跨域協作'],
      verifiedExpert: false,
      rating: 5.0,
      reviewCount: 0,
      acceptedSolutionsCount: 0,
      submittedSolutionsCount: 0,
      acceptanceRate: 100,
      avgSolutionBounty: 0,
      showSubmittedCount: false,
      showAcceptanceRate: false,
      showAvgSolutionBounty: false,
      hasAgreedGeneralTerms: true,
      agreedGeneralTermsVersion: CURRENT_TERMS_VERSION,
      agreedGeneralTermsAt: new Date().toISOString(),
    };

    setCurrentUser(newUser);
    recordTermsAgreement('general', CURRENT_TERMS_VERSION);
    setSuccessMsg('帳號註冊成功！已記錄您同意《一般服務條款》，全站功能已為您開通。');

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleQuickLogin = (u: UserType) => {
    setCurrentUser(u);
    // User login implies agreement to general terms
    recordTermsAgreement('general', CURRENT_TERMS_VERSION);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-white border-b border-amber-200/60">
          <div className="flex items-center gap-2 mb-2">
            <IdeaXLogo variant="mark" size="sm" />
            <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
              創點子 IdeaX 會員系統
            </span>
          </div>
          <h2 className="text-xl font-black text-stone-900">
            {mode === 'login' ? '登入會員帳號' : '註冊 IdeaX 新帳號'}
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            {mode === 'login'
              ? '登入帳號即視為同意本站一般服務條款，單純討論無需重複簽署'
              : '註冊新帳號時請閱讀並勾選同意一般條款（含隱私權、免責與其他聲明）'}
          </p>

          {/* Mode Switch Tabs */}
          <div className="mt-4 flex p-1 bg-stone-200/70 rounded-xl max-w-xs">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              快速登入
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              註冊新帳號
            </button>
          </div>
        </div>

        {/* Body Area */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form & Quick User Switch */
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-stone-700 mb-2">
                  選擇登入現有帳號（雙軌身分彈性切換）：
                </p>
                <div className="space-y-2">
                  {availableUsers
                    .filter((u) => u.id !== 'user-guest')
                    .map((u) => {
                      const isCurrent = currentUser?.id === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleQuickLogin(u)}
                          className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200'
                              : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-10 h-10 rounded-xl object-cover ring-1 ring-stone-200"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-stone-900">{u.name}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                    u.role === 'admin'
                                      ? 'bg-purple-100 text-purple-800'
                                      : u.role === 'solver'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-stone-200 text-stone-700'
                                  }`}
                                >
                                  {u.role === 'admin' ? '管理員' : u.role === 'solver' ? '專家解答' : '提問者'}
                                </span>
                              </div>
                              <p className="text-xs text-stone-500 line-clamp-1">{u.title || u.bio}</p>
                            </div>
                          </div>
                          {isCurrent ? (
                            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              目前在線
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-stone-600 hover:text-stone-900">
                              以由此登入 →
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            /* Register Form with Mandatory General Terms Checkbox */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  姓名 / 暱稱 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="請輸入真實姓名或個人品牌稱呼"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  電子郵件信箱 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="example@ideax.tw"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  設定密碼 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="至少 6 位元密碼"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  初始主要角色偏好（單一帳號可隨時於個人選單切換）：
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('questioner')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      regRole === 'questioner'
                        ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-black'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    發布問題與痛點
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('solver')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      regRole === 'solver'
                        ? 'bg-blue-100/80 border-blue-400 text-blue-950 font-black'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    提供專業落地方案
                  </button>
                </div>
              </div>

              {/* 註冊必勾選：一般服務條款（通用的，包含隱私權聲明、免責聲明、和其他聲明） */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={agreeGeneralTerms}
                    onChange={(e) => {
                      setAgreeGeneralTerms(e.target.checked);
                      if (errorMsg) setErrorMsg(null);
                    }}
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
                    （通用的，包含
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
                    、
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
                    及
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        openAboutModal('copyright_policy');
                      }}
                      className="font-bold text-amber-800 underline mx-0.5 hover:text-amber-950 cursor-pointer"
                    >
                      著作權與其他聲明
                    </button>
                    ）。
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={!agreeGeneralTerms}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                同意條款並完成註冊
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

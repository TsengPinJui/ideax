import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Coins,
  LogIn,
  RefreshCw,
  Plus,
  Users,
  GraduationCap,
  TrendingUp,
  Award,
  Megaphone,
  User as UserIcon,
  Flame,
  Sparkles,
  Send,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { applyJudge, uploadProposalAttachment } from '../../services/competitionClientService';
import {
  recordNewExpertApplication,
  getCompetitionExperts,
  saveAllCompetitionExperts,
} from '../../services/competitionAdminSync';
import { CompetitionTermsModal, CompetitionDocumentKey } from './CompetitionTermsModal';
import { StarSeasonBroadcastBanner } from './StarSeasonBroadcastBanner';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';

interface JudgeFullPageProps {
  onNavigate: (view: 'home' | 'explore' | 'rules' | 'submit' | 'participant' | 'ambassador') => void;
  onBackToOldSite: () => void;
  onOpenAuth: () => void;
  onSuccess: () => void;
  onGoToPainPoints?: () => void;
}

export const JudgeFullPage: React.FC<JudgeFullPageProps> = ({
  onNavigate,
  onBackToOldSite,
  onOpenAuth,
  onSuccess,
  onGoToPainPoints,
}) => {
  const {
    currentUser,
    setCurrentUser,
    setSolvers,
    addNotification,
    showCenterToast,
    openAboutModal,
  } = useApp();

  const [stageInfo, setStageInfo] = useState(() => getCompetitionStageInfo());

  useEffect(() => {
    const handleStageChange = () => {
      setStageInfo(getCompetitionStageInfo());
    };
    window.addEventListener('ideax_competition_stage_changed', handleStageChange);
    return () => window.removeEventListener('ideax_competition_stage_changed', handleStageChange);
  }, []);

  const [termsDoc, setTermsDoc] = useState<CompetitionDocumentKey | null>(null);

  // 依使用者指示：用戶申請任何驗證時，絕對不自動帶入虛擬測試資料
  const isRealName = Boolean(
    currentUser?.name &&
    !currentUser.name.includes('測試') &&
    !currentUser.name.includes('管理') &&
    !currentUser.name.includes('訪客') &&
    !currentUser.id.startsWith('c1000') &&
    !currentUser.id.startsWith('c2000') &&
    !currentUser.id.startsWith('a000') &&
    !currentUser.id.startsWith('solver-')
  );
  const isRealEmail = Boolean(
    currentUser?.email &&
    !currentUser.email.includes('ideax') &&
    !currentUser.email.includes('yichun') &&
    !currentUser.email.includes('shuhao') &&
    !currentUser.email.includes('test') &&
    !currentUser.email.includes('operations') &&
    !currentUser.email.includes('guest')
  );

  const [judgeName, setJudgeName] = useState(isRealName ? currentUser?.name || '' : '');
  const [judgePhone, setJudgePhone] = useState('');
  const [judgeEmail, setJudgeEmail] = useState(isRealEmail ? currentUser?.email || '' : '');
  const [judgeDomain, setJudgeDomain] = useState('');
  const [judgeInstitution, setJudgeInstitution] = useState('');
  const [judgeJobTitle, setJudgeJobTitle] = useState('');
  const [judgeYearsOfExp, setJudgeYearsOfExp] = useState<number | ''>('');
  const [judgeBio, setJudgeBio] = useState('');
  const [proofFile, setProofFile] = useState<{ url: string; name: string } | null>(null);

  // 活動得知管道調查
  const [referralSource, setReferralSource] = useState<string>('');
  const [referralSourceOther, setReferralSourceOther] = useState<string>('');

  const [judgePledgeAgreed, setJudgePledgeAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  // 若已是 IdeaX 創點子平台認證專家，直接享有競賽專家身分與權利（無需再填寫報名競賽專家表單）
  const isAlreadyCertifiedExpert = Boolean(
    currentUser &&
    currentUser.id !== 'user-guest' &&
    (currentUser.verifiedExpert ||
      currentUser.role === 'solver' ||
      (currentUser as any).role === 'expert' ||
      currentUser.expertCertStatus === 'verified' ||
      (currentUser as any).isExpert)
  );

  // 檢查是否已獲遴選為複賽評審委員（評審是由專家中挑出來評分複賽作品）
  const isSelectedJudge = React.useMemo(() => {
    if (!currentUser || currentUser.id === 'user-guest') return false;
    if ((currentUser as any).isJudgeSelected || (currentUser as any).isJudge) return true;
    const experts = getCompetitionExperts();
    const matched = experts.find(
      (e) =>
        e.userId === currentUser.id ||
        e.id === currentUser.id ||
        (currentUser.email && e.expertEmail === currentUser.email)
    );
    return Boolean(matched?.isJudgeSelected);
  }, [currentUser]);

  // 自動將已是創點子認證專家的用戶同步至創星季專家名冊（核定通過、享有 300 萬點額度，預設尚非複賽評審直到獲選）
  useEffect(() => {
    if (!isAlreadyCertifiedExpert || !currentUser || currentUser.id === 'user-guest') return;
    try {
      const experts = getCompetitionExperts();
      const existingIdx = experts.findIndex(
        (e) =>
          e.userId === currentUser.id ||
          e.id === currentUser.id ||
          (currentUser.email && e.expertEmail === currentUser.email)
      );
      if (existingIdx === -1) {
        const syncedExpert = {
          id: `exp-cert-${currentUser.id}`,
          userId: currentUser.id,
          expertName: currentUser.name || '認證專家',
          expertPhone: currentUser.phone || '',
          expertEmail: currentUser.email || '',
          organization: (currentUser as any).company || (currentUser as any).organization || 'IdeaX 創點子平台認證專家',
          jobTitle: (currentUser as any).expertTitle || currentUser.jobTitle || currentUser.title || '認證領域專家',
          expertiseTracks: ['ict'] as any,
          yearsOfExperience: 5,
          bio: currentUser.bio || 'IdeaX 創點子平台官方認證專家',
          status: 'approved' as const,
          isJudgeSelected: Boolean((currentUser as any).isJudgeSelected),
          pointsAllocated: 3000000,
          singleProjectCap: 2000000,
          createdAt: new Date().toISOString(),
          reviewedBy: 'IdeaX 平台認證自動連動',
          reviewedAt: new Date().toISOString(),
        };
        saveAllCompetitionExperts([syncedExpert, ...experts]);
      } else if (experts[existingIdx].status !== 'approved') {
        const updated = [...experts];
        updated[existingIdx] = {
          ...updated[existingIdx],
          status: 'approved',
          pointsAllocated: 3000000,
          singleProjectCap: 2000000,
        };
        saveAllCompetitionExperts(updated);
      }
    } catch {}
  }, [isAlreadyCertifiedExpert, currentUser?.id]);

  const showToast = (message: string) => {
    addNotification({
      title: '競賽專家認證',
      message,
      type: 'system',
    });
    const isSuccess = message.includes('成功') || message.includes('已提交');
    showCenterToast(
      isSuccess ? '專家申請通知' : '提示',
      message,
      {
        type: isSuccess ? 'success' : 'warning',
        duration: 2800,
      }
    );
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast('證件檔案請勿超過 20MB');
      return;
    }
    setIsUploadingProof(true);
    try {
      const res = await uploadProposalAttachment(file);
      if (res && res.url) {
        setProofFile({
          url: res.url,
          name: res.name || file.name,
        });
        showToast('專業證件/聘書證明上傳成功！');
      }
    } catch (err: any) {
      showToast(err.message || '證件上傳失敗');
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }

    if (currentUser?.competitionBadges?.includes('創星季') || (currentUser as any)?.isParticipant) {
      showToast('依競賽辦法規範：不可兼任參賽者與專家！已註冊為參賽團隊者無法兼任專家，請遵循利益迴避原則。');
      return;
    }

    if (!judgeName.trim() || !judgeInstitution.trim() || !judgeJobTitle.trim()) {
      showToast('請填寫評審姓名、任職單位與職稱');
      return;
    }

    if (!referralSource) {
      showToast('請回答「您從哪裡得知這場比賽？」');
      return;
    }

    if (referralSource === '其他' && !referralSourceOther.trim()) {
      showToast('請填寫其他得知管道說明');
      return;
    }

    if (!judgePledgeAgreed) {
      showToast('請先勾選同意 《IdeaX一般條款》 與 《創星季專家評審條款》');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalReferral = referralSource === '其他' && referralSourceOther.trim() ? `其他 (${referralSourceOther.trim()})` : referralSource;
      const res = await applyJudge({
        userId: currentUser.id,
        name: judgeName.trim(),
        phone: judgePhone.trim(),
        email: judgeEmail.trim(),
        domain: judgeDomain,
        organization: judgeInstitution.trim(),
        jobTitle: judgeJobTitle.trim(),
        experienceYears: Number(judgeYearsOfExp) || 3,
        credentialsNote: '專業資格證明及在職審查文件',
        credentialProofUrl: proofFile?.url,
        credentialProofName: proofFile?.name,
        bio: judgeBio.trim() || `${judgeInstitution.trim()} ${judgeJobTitle.trim()}，專業領域涵蓋 ${judgeDomain}。`,
        referralSource: finalReferral,
        referralSourceOther: referralSourceOther.trim(),
        reviewPledgeAgreed: true,
      });

      if (res.success) {
        showToast(res.message || '評審申請已提交！已進入管理團隊審核程序，審核通過後將開通特邀專家身分。');

        try {
          recordNewExpertApplication({
            userId: currentUser.id,
            expertName: judgeName.trim(),
            expertPhone: judgePhone.trim(),
            expertEmail: judgeEmail.trim(),
            organization: judgeInstitution.trim(),
            jobTitle: judgeJobTitle.trim(),
            expertiseTracks: ['ict'],
            yearsOfExperience: Number(judgeYearsOfExp) || 3,
            bio: judgeBio.trim() || `${judgeInstitution.trim()} ${judgeJobTitle.trim()}，專業領域涵蓋 ${judgeDomain}。`,
            proofDocumentUrl: proofFile?.url,
            referralSource: finalReferral,
            referralSourceOther: referralSourceOther.trim(),
          });
        } catch (e) {
          console.warn('Sync expert record error:', e);
        }

        // 登記申請為審核中（pending），維持原有用戶身分，等待管理員審核
        setCurrentUser((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            expertApplicationStatus: 'pending',
            verifiedExpert: false,
            expertDomain: judgeDomain,
            expertTitle: judgeJobTitle.trim(),
          };
        });

        onSuccess();
        onNavigate('home');
      } else {
        showToast(res.message || '申請失敗');
      }
    } catch (err: any) {
      showToast(err.message || '提交失敗，請檢查網路連線');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 font-sans">
      {/* 頂部導覽列 */}
      <header className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {/* 創星季廣播橫幅：誠徵各行業專家參與注資，注資額300萬（點擊申請） */}
        <StarSeasonBroadcastBanner
          onApply={() => {
            const el = document.getElementById('expert-judge-apply-form') || document.querySelector('form');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0 -ml-1 sm:-ml-2">
              <button
                type="button"
                onClick={() => {
                  onBackToOldSite();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
                title="點擊回到 IdeaX 創點子平台首頁"
                aria-label="回到 IdeaX 創點子平台首頁"
              >
                <img src="/logo-bulb.png" alt="IdeaX 創點子平台 - 點擊回首頁" className="w-10.5 h-10.5 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0 drop-shadow-xs group-hover:scale-105 transition-all" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center group -ml-1"
                title="點擊返回創星季首頁"
                aria-label="回創星季競賽首頁"
              >
                <img src="/logo-chuangxingji-text.png" alt="創星季 - 點擊回競賽首頁" className="h-7.5 sm:h-9 md:h-10.5 w-auto object-contain shrink-0 group-hover:opacity-90 transition-all" />
              </button>
            </div>

            <span className="text-stone-300 hidden sm:inline">|</span>

            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-amber-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回提案總覽</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-stone-100/80 p-1 rounded-2xl border border-stone-200/80">
            {/* 1. 我想提案! */}
            <button
              type="button"
              onClick={() => {
                if (!currentUser || currentUser.id === 'user-guest') {
                  onOpenAuth();
                  return;
                }
                onNavigate('submit');
              }}
              className="px-3.5 py-1.5 rounded-xl text-stone-950 bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer font-black shadow-2xs active:scale-98 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-stone-950" />
              <span>我想提案!</span>
            </button>

            <div className="h-4 w-px bg-stone-300/80 mx-0.5" />

            {/* 2. 探索Idea */}
            <button
              type="button"
              onClick={() => onNavigate('explore')}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              探索Idea
            </button>

            {/* 3. 痛點 → */}
            <button
              type="button"
              onClick={onGoToPainPoints || onBackToOldSite}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold group"
              title="前往 IdeaX 痛點許願池並自動滾動至痛點區域"
            >
              <span>痛點</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 4. 報名參賽 */}
            <button
              type="button"
              onClick={() => {
                if (!currentUser || currentUser.id === 'user-guest') {
                  onOpenAuth();
                  return;
                }
                onNavigate('participant');
              }}
              className="hidden md:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              報名參賽
            </button>

            {/* 5. 成為專家 (當前頁) */}
            <span className="px-3 py-1.5 rounded-xl text-stone-950 bg-white font-black shadow-2xs">
              成為專家
            </span>

            {/* 6. 推廣大使 */}
            <button
              type="button"
              onClick={() => onNavigate('ambassador')}
              className="hidden lg:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              推廣大使
            </button>

            {/* 行動版：優先保留痛點（隨著賽程變動，若換至提案階段則自動變換為提案捷徑），移除競賽辦法 */}
            {stageInfo.isProposalStage ? (
              <button
                type="button"
                onClick={() => onNavigate('submit')}
                className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all shadow-2xs cursor-pointer active:scale-98"
                title="進入創星季提案"
              >
                <Send className="w-3.5 h-3.5 text-stone-950" />
                <span>提案</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
              </button>
            ) : (
              <button
                onClick={onGoToPainPoints || onBackToOldSite}
                className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98 group"
                title="前往 IdeaX 痛點許願池並自動滾動至痛點區域"
              >
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>痛點</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 滿版 Hero 標題區 */}
      <section className="bg-gradient-to-b from-purple-100/70 via-indigo-50/40 to-stone-50 border-b border-purple-200/70 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 border border-purple-300 text-purple-950 text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>【專業專家團】業界導師與產學專家認證</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-stone-950 tracking-tight leading-snug">
            申請成為 IdeaX 創星季專家
          </h1>

          <div className="space-y-1 max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm text-purple-800 font-bold leading-relaxed">
              審核通過轉為專家帳號，享有 3,000,000 點投資額度（單案上限 2,000,000）
            </p>
            <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed">
              邀請產學研專家加入創星季！審核通過後自動轉為專家帳號並同步錄入認證專家名單，可於投資期間投資提案與參與討論，並可由專家中獲選為評審參與決選評分。
            </p>
          </div>
        </div>
      </section>

      {/* 滿版表單主體 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl p-6 sm:p-10 space-y-8">
          
          {/* 未登入提醒 */}
          {(!currentUser || currentUser.id === 'user-guest') && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-black text-stone-900">尚未登入 IdeaX 會員帳號</div>
                  <div className="text-stone-600">專家認證需綁定帳號以核發專家徽章與 300 萬點注資額度。</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs shrink-0 cursor-pointer shadow-xs"
              >
                立即登入 / 註冊
              </button>
            </div>
          )}

          {/* 專家權益卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
                <Coins className="w-4 h-4 text-purple-600" />
                <span>3,000,000 點投資額度</span>
              </div>
              <p className="text-[11px] text-stone-600">專屬額度（單案上限 2,000,000 點），於投資期間投資提案與參與專業討論。</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                <Award className="w-4 h-4 text-amber-600" />
                <span>IdeaX 創點子平台認證專家身分</span>
              </div>
              <p className="text-[11px] text-stone-600">自動登錄 IdeaX 創點子平台「解題專家」官方推薦專區與榮譽標籤。</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>評審公信力背書</span>
              </div>
              <p className="text-[11px] text-stone-600">決選專業審查委員身分與官方專業徽章認證。</p>
            </div>
          </div>

          {/* 利益迴避原則提醒 */}
          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-300 flex items-start gap-3 text-xs text-purple-950">
            <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-black text-purple-900">⚠️ 競賽規範限制：不可兼任參賽者與專家（利益迴避）</div>
              <div className="leading-relaxed text-stone-700">
                依創星季競賽規章，為落實評審客觀公正，<strong>不可兼任參賽者與專家</strong>。若您或您的團隊已登錄為參賽團隊，不得兼任專家或決審評審委員；請依實際參與身分擇一申請。
              </div>
            </div>
          </div>

          {isAlreadyCertifiedExpert ? (
            <div
              id="expert-judge-apply-form"
              className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-50 via-indigo-50/60 to-amber-50/40 border-2 border-purple-300 shadow-md space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-200/80 pb-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-100 border border-purple-300 text-purple-900 text-[11px] font-black">
                      <span>👑 IdeaX 創點子平台認證專家連動</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-stone-950">
                      您已是創點子平台認證專家，直接享有競賽專家身分與權利！
                    </h2>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      系統已自動核定您的創星季競賽專家資格，<strong>無需再填寫報名競賽專家的表單</strong>。
                    </p>
                  </div>
                </div>
              </div>

              {/* 專家權利與複賽評審區別說明 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-2xl bg-white border border-purple-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 text-sm flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-purple-600" />
                      <span>已開通之競賽專家身分與權利</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black">
                      ✓ 已生效
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-stone-700 leading-relaxed list-disc pl-4">
                    <li>
                      自動享有 <strong className="text-purple-800">3,000,000 點創星幣</strong> 專屬投資額度（單一提案上限 <strong className="text-purple-800">2,000,000 點</strong>）。
                    </li>
                    <li>
                      可於模擬募資期間直接對看好的參賽提案進行專家注資、撰寫專業講評與指導建議。
                    </li>
                    <li>
                      享有創星季與 IdeaX 雙平台「👑 認證專家」官方榮譽標識。
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-stone-950 text-sm flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>「競賽專家」與「複賽評審」之區別</span>
                    </span>
                    {isSelectedJudge ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-black">
                        ⚖️ 已獲遴選為評審
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black">
                        專家身分（尚非評審）
                      </span>
                    )}
                  </div>
                  <p className="text-stone-700 leading-relaxed">
                    具備競賽專家身分代表您擁有 300 萬創星幣模擬投資權與專業評論權，但<strong>還不是複賽評審</strong>。
                  </p>
                  <p className="text-stone-600 leading-relaxed">
                    <strong>複賽評審是由所有認證專家裡挑選（遴選）出來的委員</strong>，專門負責於決選階段對入圍複賽之作品進行正式評分。
                  </p>
                  <div className="pt-1">
                    {isSelectedJudge ? (
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 font-bold text-[11px]">
                        🎉 您已獲主辦單位遴選為本屆「複賽評審委員」，可於決選階段進入評審專區為複賽作品評分！
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 font-medium text-[11px]">
                        📋 您目前已完整享有競賽專家權利；複賽評審委員名單將由主辦單位自認證專家中遴選並另行指派。
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold text-xs transition-all cursor-pointer"
                >
                  返回創星季首頁
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('explore')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Coins className="w-4 h-4" />
                  <span>前往探索提案・使用 300 萬專家額度</span>
                </button>
              </div>
            </div>
          ) : (
          <form id="expert-judge-apply-form" onSubmit={handleSubmit} className="space-y-8 text-xs">
            
            {/* 區塊 1: 評審基本資訊 */}
            <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-stone-50/70 border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-purple-600" />
                  <span>專家基本資訊</span>
                </div>
                <span className="text-[11px] text-stone-500 font-bold">* 為必填項目</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">真實中文姓名 *</label>
                  <input
                    type="text"
                    value={judgeName}
                    onChange={(e) => setJudgeName(e.target.value)}
                    placeholder="請填寫真實中文姓名"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-purple-400 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">聯絡電話 / 手機 *</label>
                  <input
                    type="tel"
                    value={judgePhone}
                    onChange={(e) => setJudgePhone(e.target.value)}
                    placeholder="0912-345-678"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-purple-400 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">公務 / 聯絡信箱 *</label>
                  <input
                    type="email"
                    value={judgeEmail}
                    onChange={(e) => setJudgeEmail(e.target.value)}
                    placeholder="expert@institution.org.tw"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-purple-400 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">專業領域 *</label>
                  <select
                    value={judgeDomain}
                    onChange={(e) => setJudgeDomain(e.target.value)}
                    required
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 font-bold focus:outline-none focus:border-purple-400"
                  >
                    <option value="">請選擇專業領域 *</option>
                    <option value="AI 智慧與科技創新">AI 智慧與科技創新</option>
                    <option value="智慧物聯與硬體整合">智慧物聯與硬體整合</option>
                    <option value="永續綠能與循環經濟">永續綠能與循環經濟</option>
                    <option value="生活創新與商業模式">生活創新與商業模式</option>
                    <option value="新創早期投資與募資">新創早期投資與募資</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 區塊 2: 任職機構與專業資格證明 */}
            <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-purple-50/50 border border-purple-200">
              <div className="border-b border-purple-200/80 pb-3">
                <div className="font-black text-purple-950 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>任職單位與專業證件證明</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">任職機構 / 學校 / 企業 *</label>
                  <input
                    type="text"
                    value={judgeInstitution}
                    onChange={(e) => setJudgeInstitution(e.target.value)}
                    placeholder="例如: 國立臺灣大學 / 智星創投公司"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-purple-400 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">現職職稱 *</label>
                  <input
                    type="text"
                    value={judgeJobTitle}
                    onChange={(e) => setJudgeJobTitle(e.target.value)}
                    placeholder="例如: 教授 / 投資合夥人 / 研發總監"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-purple-400 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">相關領域經歷年資</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={judgeYearsOfExp}
                      onChange={(e) => setJudgeYearsOfExp(e.target.value ? Number(e.target.value) : '')}
                      placeholder="例如: 8"
                      className="w-24 bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-purple-400 text-xs font-bold"
                    />
                    <span className="text-stone-600 font-bold">年</span>
                  </div>
                </div>

                {/* 證件或聘書上傳 */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">專家資格或在職證明上傳 (PDF/JPG)</label>
                  {proofFile ? (
                    <div className="flex items-center justify-between bg-purple-100/70 p-2.5 rounded-xl border border-purple-300">
                      <span className="truncate font-medium text-purple-950">{proofFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setProofFile(null)}
                        className="text-stone-400 hover:text-stone-700 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-3 px-4 border-2 border-dashed border-stone-300 hover:border-purple-400 rounded-xl text-stone-500 hover:text-purple-800 flex items-center justify-center gap-2 cursor-pointer transition-all bg-white">
                      <Upload className="w-4 h-4" />
                      <span>{isUploadingProof ? '上傳中...' : '上傳名片、證照或在職證明'}</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleProofUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">個人專業簡歷與評選資歷</label>
                <textarea
                  rows={4}
                  value={judgeBio}
                  onChange={(e) => setJudgeBio(e.target.value)}
                  placeholder="簡要說明您的產學研背景、曾指導或評審之競賽活動、代表作或投資經歷..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* 活動得知管道調查 */}
            <div className="space-y-3 p-5 sm:p-6 rounded-3xl bg-stone-50/70 border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>您從哪裡得知這場比賽？</span>
                  <span className="text-rose-500 font-bold">*</span>
                </div>
                <span className="text-[11px] text-purple-700 font-bold bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  主辦單位統計 (單選，必選)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  '獎金獵人',
                  'ACCUPASS',
                  '學校或創新中心',
                  '社群媒體',
                  '網路搜尋或瀏覽',
                  '網路廣告',
                  '朋友',
                  '其他',
                ].map((source) => {
                  const isSelected = referralSource === source;
                  return (
                    <button
                      type="button"
                      key={source}
                      onClick={() => setReferralSource(source)}
                      className={`px-3 py-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-600 text-white font-black border-purple-600 shadow-xs ring-2 ring-purple-300'
                          : 'bg-white border-stone-300 hover:border-purple-300 hover:bg-stone-50 text-stone-700 font-medium'
                      }`}
                    >
                      <span>{source}</span>
                      {isSelected && <span className="text-white font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>

              {referralSource === '其他' && (
                <div className="pt-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={referralSourceOther}
                    onChange={(e) => setReferralSourceOther(e.target.value)}
                    placeholder="請說明其他得知管道（例如: 官方邀請、同仁推薦、研討會宣傳...）"
                    className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400 text-xs font-medium"
                  />
                </div>
              )}
            </div>

            {/* 公正評審與利益迴避承諾 */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-purple-50/70 border border-purple-300">
              <input
                type="checkbox"
                id="judgeFullPledge"
                checked={judgePledgeAgreed}
                onChange={(e) => setJudgePledgeAgreed(e.target.checked)}
                className="mt-0.5 rounded text-purple-600 focus:ring-purple-400 h-4 w-4 shrink-0"
                required
              />
              <label htmlFor="judgeFullPledge" className="text-xs text-stone-700 cursor-pointer leading-relaxed">
                我已閱讀並同意{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openAboutModal('general_terms');
                  }}
                  className="text-purple-800 font-bold underline hover:text-purple-950 cursor-pointer"
                >
                  《IdeaX一般條款》
                </button>
                {' '}與{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTermsDoc('D');
                  }}
                  className="text-purple-800 font-bold underline hover:text-purple-950 cursor-pointer"
                >
                  《創星季專家評審條款》
                </button>
                。
              </label>
            </div>

            {/* 送出按鍵 */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-all cursor-pointer"
              >
                取消並返回
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>審查資料提交中...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>確認送出專家資格申請</span>
                  </>
                )}
              </button>
            </div>
          </form>
          )}</div>
      </main>

      {/* 創星季規章與條款說明彈窗 */}
      {termsDoc && (
        <CompetitionTermsModal
          isOpen={Boolean(termsDoc)}
          onClose={() => setTermsDoc(null)}
          initialDoc={termsDoc}
        />
      )}
    </div>
  );
};

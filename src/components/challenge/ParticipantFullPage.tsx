import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Users,
  GraduationCap,
  Flame,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  StarSeasonProposal,
  StarSeasonTrack,
  OFFICIAL_COMPETITION_TRACKS,
} from '../../types/competition';
import { registerParticipant } from '../../services/competitionClientService';
import { recordNewParticipantRegistration } from '../../services/competitionAdminSync';
import { StarSeasonBroadcastBanner } from './StarSeasonBroadcastBanner';
import { CompetitionTermsModal, CompetitionDocumentKey } from './CompetitionTermsModal';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';

interface ParticipantFullPageProps {
  onNavigate: (view: 'home' | 'explore' | 'rules' | 'submit' | 'judge' | 'ambassador') => void;
  onBackToOldSite: () => void;
  onOpenAuth: () => void;
  onGoToPainPoints?: () => void;
  painPointProposals?: StarSeasonProposal[];
  onSuccess: () => void;
}

export const ParticipantFullPage: React.FC<ParticipantFullPageProps> = ({
  onNavigate,
  onBackToOldSite,
  onOpenAuth,
  onGoToPainPoints,
  onSuccess,
}) => {
  const {
    currentUser,
    setCurrentUser,
    addNotification,
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

  // 依指示：用戶申請任何驗證或報名時，不自動帶入虛擬測試資料
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

  // 團隊基本資料 (報名輸入資料)
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState(isRealName ? currentUser?.name || '' : '');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderEmail, setLeaderEmail] = useState(isRealEmail ? currentUser?.email || '' : '');
  const [schoolName, setSchoolName] = useState('');
  const [showOrganizationOnCard, setShowOrganizationOnCard] = useState(false);
  const [department, setDepartment] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [teamMembersInput, setTeamMembersInput] = useState('');
  const [participantTrack, setParticipantTrack] = useState<StarSeasonTrack>('ai_applications');

  // 報名意向調查 (主辦單位統計參賽分布與得知管道)
  const [expectedItems, setExpectedItems] = useState<string[]>(['痛點', '解方']);
  const [referralSource, setReferralSource] = useState<string>('');
  const [referralSourceOther, setReferralSourceOther] = useState<string>('');

  const [participantPledgeAgreed, setParticipantPledgeAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);

  // 檢查用戶是否已完成報名
  const isAlreadyRegistered = Boolean(
    currentUser?.competitionBadges?.includes('創星季') ||
    (currentUser as any)?.isCompetitionRegistered ||
    (typeof window !== 'undefined' && currentUser?.id && localStorage.getItem(`ideax_participant_registered_${currentUser.id}`))
  );

  const showToast = (message: string) => {
    addNotification({
      title: '創星季報名參賽',
      message,
      type: 'system',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }

    if (currentUser?.verifiedExpert || currentUser?.role === 'solver') {
      showToast('依競賽辦法規範：不可兼任參賽者與專家！為維持評選公正與利益迴避，專家身分無法報名為參賽團隊。');
      return;
    }

    if (
      !teamName.trim() ||
      !leaderName.trim() ||
      !leaderPhone.trim() ||
      !leaderEmail.trim() ||
      !schoolName.trim()
    ) {
      showToast('請完整填寫團隊名稱、負責人、電話、Email 與學校/機構名稱');
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

    if (!participantPledgeAgreed) {
      showToast('請先勾選同意 《IdeaX一般條款》 與 《創星季參賽者條款》');
      return;
    }

    const stage = getCompetitionStageInfo();
    const nowTime = Date.now();
    const currentYear = new Date().getFullYear();
    const tRegistrationStart = new Date(currentYear, 9, 17, 0, 0, 0).getTime();
    const tRegistrationEnd = new Date(currentYear, 11, 4, 16, 30, 0).getTime();

    if (stage.activeStage === 0 && nowTime < tRegistrationStart) {
      showToast('⚠️ 線上報名參賽將於 10/17 00:00 正式開放！敬請期待。');
      return;
    }
    if (stage.isProposalClosed || nowTime > tRegistrationEnd) {
      showToast('⚠️ 創星季參賽報名已於 12/04 16:30 截止！');
      return;
    }

    setIsSubmitting(true);
    try {
      const members = teamMembersInput
        .split(/[,，、\n]/)
        .map((m) => m.trim())
        .filter(Boolean)
        .map((name) => ({ name }));

      const res = await registerParticipant({
        teamName: teamName.trim(),
        leaderName: leaderName.trim(),
        leaderPhone: leaderPhone.trim(),
        leaderEmail: leaderEmail.trim(),
        schoolName: schoolName.trim(),
        department: department.trim(),
        showOrganization: showOrganizationOnCard,
        advisorName: advisorName.trim(),
        teamMembers: members,
        track: participantTrack,
        expectedItems,
        referralSource: referralSource === '其他' && referralSourceOther.trim() ? `其他 (${referralSourceOther.trim()})` : referralSource,
        referralSourceOther: referralSourceOther.trim(),
        pledgeAgreed: true,
      });

      if (res.success) {
        showToast('恭喜！報名參賽登錄成功，您已獲得【創星季參賽者】專屬榮譽徽章！');

        try {
          if (typeof window !== 'undefined' && currentUser?.id) {
            localStorage.setItem(`ideax_participant_registered_${currentUser.id}`, 'true');
          }
        } catch {}

        // 同步錄入管理員後台審核資料庫
        try {
          recordNewParticipantRegistration({
            teamName: teamName.trim(),
            leaderName: leaderName.trim(),
            leaderPhone: leaderPhone.trim(),
            leaderEmail: leaderEmail.trim(),
            schoolName: schoolName.trim(),
            department: department.trim(),
            advisorName: advisorName.trim() || undefined,
            teamMembers: members,
            track: participantTrack,
            pledgeAgreed: true,
          }, currentUser.id, `reg-${currentUser.id}`);
        } catch {}

        // 同步更新用戶資料庫徽章
        setCurrentUser((prev: any) => {
          if (!prev) return prev;
          const badges = prev.competitionBadges || [];
          return {
            ...prev,
            competitionBadges: badges.includes('創星季') ? badges : [...badges, '創星季'],
            isCompetitionRegistered: true,
          };
        });

        setIsRegisteredSuccess(true);
        onSuccess();
      } else {
        showToast(res.message || '報名失敗');
      }
    } catch (err: any) {
      showToast(err.message || '提交失敗，請檢查連線');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 font-sans">
      {/* 頂部導覽列 */}
      <header className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {/* 創星季廣播橫幅 */}
        <StarSeasonBroadcastBanner onApply={() => onNavigate('judge')} />
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
              <span>返回競賽首頁</span>
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
                if (!isAlreadyRegistered && !isRegisteredSuccess) {
                  showToast('請先於本頁完成「報名參賽」團隊資料登錄，即可前往提案！');
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
              title="前往 IdeaX 創點子平台 痛點專區並自動滾動至痛點區域"
            >
              <span>痛點</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 4. 報名參賽 (當前頁) */}
            <span className="px-3 py-1.5 rounded-xl text-stone-950 bg-white font-black shadow-2xs">
              報名參賽
            </span>

            {/* 5. 成為專家 */}
            <button
              type="button"
              onClick={() => {
                if (!currentUser || currentUser.id === 'user-guest') {
                  onOpenAuth();
                  return;
                }
                onNavigate('judge');
              }}
              className="hidden md:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
              title="點擊進入成為專家"
            >
              成為專家
            </button>

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
                title="前往 IdeaX 創點子平台 痛點專區"
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
      <section className="bg-gradient-to-b from-amber-100/70 via-yellow-50/50 to-stone-50 border-b border-amber-200/70 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/90 text-stone-950 font-black text-xs shadow-2xs">
            <GraduationCap className="w-4 h-4 text-stone-950" />
            <span>第一步：團隊報名資料登錄</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-stone-950 tracking-tight leading-snug">
            報名參賽 — IdeaX 創星季
          </h1>

          <p className="text-xs sm:text-sm text-stone-700 max-w-2xl mx-auto leading-relaxed">
            依競賽規定，提案或發表痛點前須先完成參賽團隊基本資料登記。登錄成功後，您的帳號將獲得「創星季」專屬身分徽章，並即可開始提案！
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="px-3 py-1 rounded-full bg-white border border-amber-300 text-stone-800 font-bold font-mono shadow-2xs">
              📝 報名時段：10/17 00:00 ～ 12/04 16:30
            </span>
            <span className="text-[11px] text-amber-900 font-bold">
              （提痛點之參賽者請於 11/13 16:30 痛點徵件截止前完成報名）
            </span>
          </div>
        </div>
      </section>

      {/* 滿版表單主體 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl p-6 sm:p-10 space-y-8">

          {/* 若已報名成功或當前已具備參賽資格 */}
          {(isRegisteredSuccess || isAlreadyRegistered) && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 border-2 border-emerald-400 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-emerald-950">
                    您已完成「報名參賽」團隊登錄！
                  </h3>
                  <p className="text-xs text-emerald-800 font-medium">
                    您的帳號已具備「創星季」參賽者榮譽徽章，隨時可以前往提案專區提交創新提案。
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('submit')}
                  className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
                >
                  <Send className="w-4 h-4 text-stone-950" />
                  <span>前往提案頁面撰寫解方</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>

                <button
                  type="button"
                  onClick={onGoToPainPoints || onBackToOldSite}
                  className="py-3 px-5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                >
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>查看創點子/痛點集 (IdeaX 平台)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="py-3 px-5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                >
                  返回競賽首頁
                </button>
              </div>
            </div>
          )}

          {/* 未登入提醒 */}
          {(!currentUser || currentUser.id === 'user-guest') && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-black text-stone-900">尚未登入 IdeaX 會員帳號</div>
                  <div className="text-stone-600">參賽者需綁定會員以核發「創星季」榮譽徽章與記錄團隊權益。</div>
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

          {/* 已是專家之利益迴避警示 */}
          {(currentUser?.verifiedExpert || currentUser?.role === 'solver') && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-3 text-xs text-rose-950">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-black text-rose-900">⚠️ 競賽規範限制：不可兼任參賽者與專家</div>
                <div className="leading-relaxed text-rose-800">
                  您目前帳號具備「專家」身分。為維持競賽評審之客觀公正與利益迴避原則，<strong>不可兼任參賽者</strong>。若欲代表團隊投件參賽，請改以獨立之參賽團隊帳號登入。
                </div>
              </div>
            </div>
          )}

          {/* 流程說明提示卡片 */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 flex items-start gap-3 text-xs text-amber-950">
            <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-black text-amber-900">📋 參賽流程：先報名登錄團隊資料，後續即可自由提案</div>
              <div className="leading-relaxed text-stone-700">
                本頁面專供登錄參賽團隊之成員、學校與聯絡資料。完成報名後，系統即開放完整的提案頁面（含專案構想、商業計畫書、成果展示圖與影音Demo），您可以立即前往提案或隨時登入修改！
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 text-xs">
            
            {/* 區塊 1: 團隊成員與指導老師 */}
            <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-stone-50/70 border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>團隊基本資料與成員名冊</span>
                </div>
                <span className="text-[11px] text-stone-500 font-bold">* 為必填項目</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">團隊名稱 *</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="例如: 智創綠能青年隊 (個人參賽可填隊名或稱號)"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">隊長 / 主要聯絡人姓名 *</label>
                  <input
                    type="text"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder="請填寫隊長或聯絡人姓名"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">聯絡電話 / 手機 *</label>
                  <input
                    type="tel"
                    value={leaderPhone}
                    onChange={(e) => setLeaderPhone(e.target.value)}
                    placeholder="0912-345-678"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">聯絡電子信箱 *</label>
                  <input
                    type="email"
                    value={leaderEmail}
                    onChange={(e) => setLeaderEmail(e.target.value)}
                    placeholder="team@example.com"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">就讀學校 / 機構單位 *</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="例如: 國立臺灣科技大學"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                    required
                  />
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="part-show-org-checkbox"
                      checked={showOrganizationOnCard}
                      onChange={(e) => setShowOrganizationOnCard(e.target.checked)}
                      className="rounded border-stone-300 text-amber-600 focus:ring-amber-400"
                    />
                    <label htmlFor="part-show-org-checkbox" className="text-xs text-stone-600 cursor-pointer select-none">
                      <span className="font-bold text-stone-800">在卡片上顯示機構名稱</span>
                      <span className="text-[10px] text-stone-500 ml-1">（未勾選則卡片僅顯示團隊名稱）</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">系所 / 年級 / 部門</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="例如: 資訊工程系 碩士班"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">指導老師 / 業師顧問 (選填)</label>
                  <input
                    type="text"
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    placeholder="例如: 林教授 / 王業師"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">預計參賽賽道領域</label>
                  <select
                    value={participantTrack}
                    onChange={(e) => setParticipantTrack(e.target.value as StarSeasonTrack)}
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 font-bold focus:outline-none focus:border-amber-400"
                  >
                    {OFFICIAL_COMPETITION_TRACKS.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">團隊成員名單與專長分工 (選填)</label>
                <textarea
                  rows={3}
                  value={teamMembersInput}
                  onChange={(e) => setTeamMembersInput(e.target.value)}
                  placeholder="隊員1: 陳小明 (UI設計), 隊員2: 李大華 (後端開發)..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>
            </div>

            {/* 區塊 2: 參賽意向調查與得知管道 */}
            <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-stone-50/70 border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>參賽意向與活動得知管道</span>
                </div>
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  主辦單位統計
                </span>
              </div>

              {/* 問題一: 預計參加項目? 痛點or解方 (可複選) */}
              <div className="space-y-2">
                <label className="block font-bold text-stone-800 text-xs">
                  預計參加項目？（可複選） <span className="text-amber-600 font-semibold">痛點 or 解方</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: '痛點', label: '🔥 痛點（提出真實痛點）' },
                    { id: '解方', label: '💡 解方（提交創新專案與企劃）' },
                  ].map((item) => {
                    const isChecked = expectedItems.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-black shadow-xs ring-1 ring-amber-300'
                            : 'bg-white border-stone-300 hover:border-stone-400 text-stone-700 font-medium'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExpectedItems([...expectedItems, item.id]);
                            } else {
                              setExpectedItems(expectedItems.filter((i) => i !== item.id));
                            }
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 shrink-0 cursor-pointer"
                        />
                        <span className="text-xs">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 font-medium">
                  📌 <strong>備註說明：</strong>此填答僅為讓主辦單位提前了解全體參賽者分布，並不影響參賽權益，仍可一隊提多個痛點與多個解方。
                </p>
              </div>

              {/* 問題二: 您從哪裡得知這場比賽? */}
              <div className="space-y-2 pt-2 border-t border-stone-200/60">
                <label className="block font-bold text-stone-800 text-xs">
                  您從哪裡得知這場比賽？ <span className="text-rose-500 font-bold">*</span> <span className="text-stone-400 font-normal">(單選，必選)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                        className={`px-3 py-2 rounded-xl border text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 font-black border-amber-500 shadow-xs ring-2 ring-amber-300'
                            : 'bg-white border-stone-300 hover:border-amber-300 hover:bg-stone-50 text-stone-700 font-medium'
                        }`}
                      >
                        <span>{source}</span>
                        {isSelected && <span className="text-stone-950 font-bold">✓</span>}
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
                      placeholder="請說明其他得知管道（例如: 實體海報、系所公告信、社團推播...）"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400 text-xs font-medium"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 原創性承諾 */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-300">
              <input
                type="checkbox"
                id="participantFullPledge"
                checked={participantPledgeAgreed}
                onChange={(e) => setParticipantPledgeAgreed(e.target.checked)}
                className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 h-4 w-4 shrink-0 cursor-pointer"
                required
              />
              <label htmlFor="participantFullPledge" className="text-xs text-stone-700 cursor-pointer leading-relaxed">
                我已閱讀並同意{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                    e.stopPropagation();
                    setTermsDoc('C');
                  }}
                  className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
                >
                  《創星季參賽者條款》
                </button>
                。本人保證所填資料真實無訛，恪守學術與創新倫理。
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
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>提交報名資料中...</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4 stroke-[2.5]" />
                    <span>確認送出報名參賽</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
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

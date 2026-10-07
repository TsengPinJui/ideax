import React, { useState } from 'react';
import {
  Sparkles,
  Send,
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
  ShieldCheck,
  Megaphone,
  Flame,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  StarSeasonProposal,
  StarSeasonTrack,
  STAR_SEASON_TRACKS,
} from '../../types/competition';
import {
  registerParticipant,
  uploadProposalAttachment,
} from '../../services/competitionClientService';
import { recordNewParticipantRegistration } from '../../services/competitionAdminSync';
import { PainPointSelector } from './PainPointSelector';

interface ParticipantFullPageProps {
  onNavigate: (view: 'home' | 'explore' | 'rules' | 'submit' | 'judge' | 'ambassador') => void;
  onBackToOldSite: () => void;
  onOpenAuth: () => void;
  painPointProposals: StarSeasonProposal[];
  onSuccess: () => void;
}

export const ParticipantFullPage: React.FC<ParticipantFullPageProps> = ({
  onNavigate,
  onBackToOldSite,
  onOpenAuth,
  painPointProposals,
  onSuccess,
}) => {
  const {
    currentUser,
    setCurrentUser,
    setQuestions,
    setAnswers,
    setAvailableUsers,
    addNotification,
  } = useApp();

  // 團隊基本資料
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState(currentUser?.name || '');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderEmail, setLeaderEmail] = useState(currentUser?.email || '');
  const [schoolName, setSchoolName] = useState('');
  const [department, setDepartment] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [teamMembersInput, setTeamMembersInput] = useState('');

  // 提案內容與對接痛點
  const [participantTrack, setParticipantTrack] = useState<StarSeasonTrack>('ai_applications');
  const [projectTitle, setProjectTitle] = useState('');
  const [participantSourcePainPointId, setParticipantSourcePainPointId] = useState('');
  const [participantSummary, setParticipantSummary] = useState('');
  const [participantDescription, setParticipantDescription] = useState('');

  // 實戰募資模擬與佐證檔案 (SSP體驗規格)
  const [targetFundingAmount, setTargetFundingAmount] = useState(100000);
  const [videoUrl, setVideoUrl] = useState('');
  const [rewardPlanDescription, setRewardPlanDescription] = useState('');
  const [bpFile, setBpFile] = useState<{ url: string; name: string; size?: number } | null>(null);
  const [prototypeImgFile, setPrototypeImgFile] = useState<{ url: string; name: string } | null>(null);

  const [participantPledgeAgreed, setParticipantPledgeAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingBp, setIsUploadingBp] = useState(false);
  const [isUploadingProto, setIsUploadingProto] = useState(false);

  const showToast = (message: string) => {
    addNotification({
      title: '創星季參賽者報名',
      message,
      type: 'system',
    });
  };

  const handleBpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast('簡報檔案請勿超過 20MB');
      return;
    }
    setIsUploadingBp(true);
    try {
      const res = await uploadProposalAttachment(file);
      if (res && res.url) {
        setBpFile({
          url: res.url,
          name: res.name || file.name,
          size: res.size || file.size,
        });
        showToast('BP 簡報上傳成功！');
      }
    } catch (err: any) {
      showToast(err.message || '上傳失敗');
    } finally {
      setIsUploadingBp(false);
    }
  };

  const handleProtoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showToast('展示圖檔請勿超過 15MB');
      return;
    }
    setIsUploadingProto(true);
    try {
      const res = await uploadProposalAttachment(file);
      if (res && res.url) {
        setPrototypeImgFile({
          url: res.url,
          name: res.name || file.name,
        });
        showToast('成果原型圖上傳成功！');
      }
    } catch (err: any) {
      showToast(err.message || '上傳失敗');
    } finally {
      setIsUploadingProto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }

    if (
      !teamName.trim() ||
      !leaderName.trim() ||
      !leaderPhone.trim() ||
      !projectTitle.trim() ||
      !participantSummary.trim()
    ) {
      showToast('請完整填寫團隊名稱、負責人、電話、提案主題與構想摘要');
      return;
    }

    if (!participantPledgeAgreed) {
      showToast('請勾選同意遵守創星季規範與原創性承諾');
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
        advisorName: advisorName.trim(),
        teamMembers: members,
        projectTitle: projectTitle.trim(),
        track: participantTrack,
        summary: participantSummary.trim(),
        description: participantDescription.trim(),
        sourcePainPointId: participantSourcePainPointId || undefined,
        targetFundingAmount: Number(targetFundingAmount) || 100000,
        videoUrl: videoUrl.trim() || undefined,
        rewardPlanDescription: rewardPlanDescription.trim() || '贊助者搶先體驗方案',
        bpDocumentUrl: bpFile?.url,
        bpDocumentName: bpFile?.name,
        bpDocumentSize: bpFile?.size,
        prototypeImageUrl: prototypeImgFile?.url,
        prototypeImageName: prototypeImgFile?.name,
        pledgeAgreed: true,
      });

      if (res.success) {
        showToast('恭喜！參賽報名成功，已榮獲【創星季參賽者】專屬徽章！');

        // 同步錄入管理員後台審核資料庫
        try {
          const propId = res.proposalId || `prop-reg-${Date.now()}`;
          const painPointObj = painPointProposals.find((p) => p.id === participantSourcePainPointId);
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
            projectTitle: projectTitle.trim(),
            summary: participantSummary.trim(),
            description: participantDescription.trim(),
            sourcePainPointId: participantSourcePainPointId || undefined,
            sourcePainPointTitle: painPointObj?.title || undefined,
            bpDocumentUrl: bpFile?.url,
            bpDocumentName: bpFile?.name,
            bpDocumentSize: bpFile?.size,
            prototypeImageUrl: prototypeImgFile?.url,
            prototypeImageName: prototypeImgFile?.name,
            videoUrl: videoUrl.trim() || undefined,
            targetFundingAmount,
            rewardPlanDescription: rewardPlanDescription.trim() || '贊助者搶先體驗方案',
            pledgeAgreed: true,
          }, currentUser.id, propId);
        } catch {}

        // 同步更新用戶資料庫徽章
        setCurrentUser((prev: any) => {
          if (!prev) return prev;
          const badges = prev.competitionBadges || [];
          return {
            ...prev,
            competitionBadges: badges.includes('創星季') ? badges : [...badges, '創星季'],
          };
        });

        // 同步寫入舊站創點子/痛點專區與對應解方
        const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${res.proposalId || 'new'}`;
        if (participantSourcePainPointId) {
          const newAns = {
            id: `ans-${res.proposalId || Date.now()}`,
            questionId: participantSourcePainPointId,
            solverId: currentUser.id,
            solverName: leaderName.trim() || currentUser.name,
            solverAvatar: currentUser.avatar,
            title: projectTitle.trim(),
            content: `💡【創星季參賽提案】${projectTitle.trim()}\n\n${participantSummary.trim()}\n\n${participantDescription.trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
            exclusiveChallengeUrl,
            isStarSeasonSolution: true,
            starSeasonProposalId: res.proposalId,
            sourcePainPointProposalId: participantSourcePainPointId,
            price: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setAnswers((prev: any) => [newAns, ...prev]);
          setQuestions((prev: any) =>
            prev.map((q: any) =>
              q.id === participantSourcePainPointId
                ? { ...q, answersCount: (q.answersCount || 0) + 1 }
                : q
            )
          );
        }

        onSuccess();
        onNavigate('home');
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
                title="點擊回到 IdeaX 舊站首頁"
                aria-label="回到舊站首頁"
              >
                <img src="/logo-bulb.png" alt="IdeaX - 點擊回舊站首頁" className="w-8.5 h-8.5 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain shrink-0 drop-shadow-xs group-hover:scale-105 transition-all" />
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

            {/* 3. 先看痛點 */}
            <button
              type="button"
              onClick={onBackToOldSite}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
              title="前往舊站 創點子/痛點專區"
            >
              先看痛點
            </button>

            {/* 4. 申請參賽者 (當前頁) */}
            <span className="px-3 py-1.5 rounded-xl text-stone-950 bg-white font-black shadow-2xs">
              申請參賽者
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

            {/* 行動版先看痛點 (風格一致) */}
            <button
              onClick={onBackToOldSite}
              className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
              title="前往舊站 創點子/痛點專區"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>先看痛點</span>
            </button>
          </div>
        </div>
      </header>

      {/* 滿版 Hero 標題區 */}
      <section className="bg-gradient-to-b from-amber-100/70 via-yellow-50/50 to-stone-50 border-b border-amber-200/70 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <h1 className="text-2xl sm:text-4xl font-black text-stone-950 tracking-tight leading-snug">
            申請成為創星季參賽者
          </h1>

          <p className="text-xs sm:text-sm text-stone-700 max-w-2xl mx-auto leading-relaxed">
            完成報名登錄後，您的帳號將在全站獲得「創星季」專屬榮譽徽章！提案將同步納入舊站「創點子/痛點」對應專區，並享有參賽專屬專案連結。
          </p>
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
                  <div className="text-stone-600">參賽者需綁定會員以核發「創星季」榮譽徽章與記錄提案權益。</div>
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

          <form onSubmit={handleSubmit} className="space-y-8 text-xs">
            
            {/* 區塊 1: 團隊成員與指導老師 */}
            <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-stone-50/70 border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>團隊成員與指導老師</span>
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
                    placeholder="例如: 智創綠能青年隊"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">隊長 / 負責人姓名 *</label>
                  <input
                    type="text"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder="請填寫隊長姓名"
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
                  <label className="block font-bold text-stone-700 mb-1.5">聯絡電子信箱</label>
                  <input
                    type="email"
                    value={leaderEmail}
                    onChange={(e) => setLeaderEmail(e.target.value)}
                    placeholder="team@example.com"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">就讀學校 / 機構單位</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="例如: 國立臺灣科技大學"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">系所 / 年級</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="例如: 資訊工程系 碩士班"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">指導老師 / 業師</label>
                  <input
                    type="text"
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    placeholder="例如: 林教授 / 王業師"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">團隊其他核心成員</label>
                  <input
                    type="text"
                    value={teamMembersInput}
                    onChange={(e) => setTeamMembersInput(e.target.value)}
                    placeholder="陳小明(UI設計), 李大華(技術開發)"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 區塊 2: 提案主題與創新解方構想 */}
            <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-stone-50/70 border border-stone-200">
              <div className="border-b border-stone-200/80 pb-3">
                <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>提案主題與創新解方構想</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">相關領域標注（參考實戰平台分類） *</label>
                  <select
                    value={participantTrack}
                    onChange={(e) => setParticipantTrack(e.target.value as StarSeasonTrack)}
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 font-bold focus:outline-none focus:border-amber-400"
                  >
                    {Object.values(STAR_SEASON_TRACKS).map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name} ({tr.tag})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-stone-500 mt-1">
                    此競賽不另設類別，分類僅作為方便識別不作為競賽依據。
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">提案主題名稱 *</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="例如: 智農 AI 蔬果病蟲害即時預警無人機"
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 font-bold focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              {/* 選擇採用來源痛點 (支援輸入序號/名稱查詢與痛點捷徑) */}
              <PainPointSelector
                value={participantSourcePainPointId}
                onChange={(id, pp) => {
                  setParticipantSourcePainPointId(id);
                  if (pp?.trackId) {
                    setParticipantTrack(pp.trackId);
                  }
                }}
                painPointProposals={painPointProposals}
                onApplySuggestedTitle={(suggestedTitle, suggestedSummary) => {
                  setProjectTitle(suggestedTitle);
                  setParticipantSummary(suggestedSummary);
                }}
              />

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">構想摘要 * (300字以內)</label>
                <textarea
                  rows={3}
                  value={participantSummary}
                  onChange={(e) => setParticipantSummary(e.target.value)}
                  placeholder="簡述本提案欲解決之核心問題、目標客群與創新切入點..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">詳細執行方案與創新價值</label>
                <textarea
                  rows={4}
                  value={participantDescription}
                  onChange={(e) => setParticipantDescription(e.target.value)}
                  placeholder="詳細說明產品功能、技術架構、市場競爭優勢與商業化落地計畫..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* 區塊 3: 實戰募資模擬與佐證檔案 */}
            <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-stone-50/70 border border-stone-200">
              <div className="border-b border-stone-200/80 pb-3">
                <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>實戰募資模擬與佐證檔案</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">模擬目標募資額度 (創星幣)</label>
                  <input
                    type="number"
                    step={10000}
                    value={targetFundingAmount}
                    onChange={(e) => setTargetFundingAmount(Number(e.target.value))}
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900 font-bold"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">基準 100,000 創星幣，大眾可注資支持</p>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">Demo展示影片連結 (YouTube / Drive)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtu.be/..."
                    className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">贊助者回饋方案規劃</label>
                <input
                  type="text"
                  value={rewardPlanDescription}
                  onChange={(e) => setRewardPlanDescription(e.target.value)}
                  placeholder="搶先體驗名額、限量紀念品、感謝白皮書"
                  className="w-full bg-white border border-stone-300 rounded-xl p-3 text-stone-900"
                />
              </div>

              {/* 上傳檔案 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* 營運計畫簡報 (BP) */}
                <div className="p-4 bg-white rounded-2xl border border-stone-300 space-y-3">
                  <div className="font-bold text-stone-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>營運計畫簡報 (BP/Pitch Deck)</span>
                    </span>
                    <span className="text-[10px] text-stone-400">PDF / PPT / 20MB內</span>
                  </div>

                  {bpFile ? (
                    <div className="flex items-center justify-between bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <span className="truncate font-medium text-stone-900">{bpFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setBpFile(null)}
                        className="text-stone-400 hover:text-stone-700 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-4 border-2 border-dashed border-stone-300 hover:border-amber-400 rounded-xl text-stone-500 hover:text-amber-800 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all bg-stone-50/50 hover:bg-amber-50/30">
                      <Upload className="w-4 h-4" />
                      <span>{isUploadingBp ? '上傳中...' : '點擊上傳 BP 檔案'}</span>
                      <input
                        type="file"
                        accept=".pdf,.ppt,.pptx,.doc,.docx"
                        onChange={handleBpUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* 產品原型 / 成果圖片 */}
                <div className="p-4 bg-white rounded-2xl border border-stone-300 space-y-3">
                  <div className="font-bold text-stone-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>產品原型 / 成果展示圖片</span>
                    </span>
                    <span className="text-[10px] text-stone-400">JPG / PNG / 15MB內</span>
                  </div>

                  {prototypeImgFile ? (
                    <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span className="truncate font-medium text-stone-900">{prototypeImgFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setPrototypeImgFile(null)}
                        className="text-stone-400 hover:text-stone-700 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-4 border-2 border-dashed border-stone-300 hover:border-emerald-400 rounded-xl text-stone-500 hover:text-emerald-800 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all bg-stone-50/50 hover:bg-emerald-50/30">
                      <Upload className="w-4 h-4" />
                      <span>{isUploadingProto ? '上傳中...' : '點擊上傳成果展示圖'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProtoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* 原創性承諾 */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-300">
              <input
                type="checkbox"
                id="participantFullPledge"
                checked={participantPledgeAgreed}
                onChange={(e) => setParticipantPledgeAgreed(e.target.checked)}
                className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 h-4 w-4 shrink-0"
                required
              />
              <label htmlFor="participantFullPledge" className="text-xs text-stone-700 cursor-pointer leading-relaxed">
                我代表團隊承諾所提方案為原創內容，未侵犯他人智慧財產權，同意遵守 IdeaX 創星季規範；同意此條款即同意註冊 IdeaX 創點子平台（ideax.tw），並同意由系統自動刊登與存取競賽期間提出的痛點、提案和討論內容，接受主辦單位之審查與展示公開。
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
                    <span>送出參賽報名（取得創星季徽章）</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

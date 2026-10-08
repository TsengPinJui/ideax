import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Share2,
  Users,
  Coins,
  LogIn,
  RefreshCw,
  Sparkles,
  Send,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Flame,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  fetchMyAmbassadorData,
  bindAmbassadorReferralCode,
} from '../../services/competitionClientService';
import { StarSeasonBroadcastBanner } from './StarSeasonBroadcastBanner';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';

interface AmbassadorFullPageProps {
  onNavigate: (view: 'home' | 'rules' | 'submit' | 'participant' | 'judge') => void;
  onBackToOldSite: () => void;
  onOpenAuth: () => void;
  onGoToPainPoints?: () => void;
}

export const AmbassadorFullPage: React.FC<AmbassadorFullPageProps> = ({
  onNavigate,
  onBackToOldSite,
  onOpenAuth,
  onGoToPainPoints,
}) => {
  const { currentUser, addNotification } = useApp();
  const stageInfo = React.useMemo(() => getCompetitionStageInfo(), []);

  const [ambassadorData, setAmbassadorData] = useState<{
    referralCode: string;
    totalReferred: number;
    approvedCount: number;
    pendingCommission: number;
    referrals: Array<{
      id: string;
      proposalId: string;
      proposalTitle: string;
      authorName: string;
      status: 'pending' | 'approved' | 'rejected';
      rewardAmount: number;
      createdAt: string;
    }>;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [inputCode, setInputCode] = useState('');
  const [isBinding, setIsBinding] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const showToast = (message: string) => {
    addNotification({
      title: '校園推廣大使',
      message,
      type: 'system',
    });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchMyAmbassadorData();
      if (res.success) {
        setAmbassadorData({
          referralCode: res.referralCode || `AMB-${(currentUser?.id || 'USER').toUpperCase().slice(-6)}`,
          totalReferred: res.totalReferred || 0,
          approvedCount: res.approvedCount || 0,
          pendingCommission: res.commissionPending || 0,
          referrals: (res.referrals || []) as any,
        });
      }
    } catch (err: any) {
      console.error('Failed to load ambassador data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }
    if (!inputCode.trim()) {
      showToast('請輸入推薦碼');
      return;
    }
    setIsBinding(true);
    try {
      const res = await bindAmbassadorReferralCode(inputCode.trim());
      showToast(res.message);
      if (res.success) {
        setInputCode('');
        await loadData();
      }
    } catch (err: any) {
      showToast(err.message || '綁定失敗');
    } finally {
      setIsBinding(false);
    }
  };

  const myCode = ambassadorData?.referralCode || `AMB-${(currentUser?.id || 'USER').toUpperCase().slice(-6)}`;
  const myLink = typeof window !== 'undefined'
    ? `${window.location.origin}/challenge?ref=${myCode}`
    : `https://ideax.tw/challenge?ref=${myCode}`;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 font-sans">
      {/* 頂部導覽列 */}
      <header className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {/* 創星季廣播橫幅：誠徵各行業專家參與注資，注資額300萬（點擊申請） */}
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
              onClick={() => onNavigate('home')}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              探索Idea
            </button>

            {/* 3. 痛點 → */}
            <button
              type="button"
              onClick={onGoToPainPoints || onBackToOldSite}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold group"
              title="前往 IdeaX創點子 創點子/痛點集並自動滾動至痛點區域"
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

            {/* 6. 推廣大使 (當前頁) */}
            <span className="px-3 py-1.5 rounded-xl text-stone-950 bg-white font-black shadow-2xs">
              推廣大使
            </span>

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
                title="前往 IdeaX創點子 創點子/痛點集並自動滾動至痛點區域"
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
      <section className="bg-gradient-to-b from-amber-100/80 via-yellow-50/60 to-stone-50 border-b border-amber-200/70 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-2xs">
            <Megaphone className="w-4 h-4 text-emerald-600" />
            <span>【推廣獎勵機制】每案過審享 300 點（價值 $400，效期 60 日）・多推多得無上限（IdeaX平台點數，用於提問、享受付費服務）</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-stone-950 tracking-tight leading-snug">
            IdeaX 創星季 推廣大使<br />
            <span className="text-amber-600">專屬推薦碼、綁定與過審推薦名單</span>
          </h1>

          <p className="text-xs sm:text-sm text-stone-700 max-w-2xl mx-auto leading-relaxed">
            邀請各界創客、個人與創新團隊參與創星季！分享您的專屬推薦代碼，受推薦提案通過初審，即可獲得 300 點（價值 $400，效期 60 日）推廣獎勵（IdeaX平台點數，用於提問、享受付費服務）。
          </p>
        </div>
      </section>

      {/* 滿版主體 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl p-6 sm:p-10 space-y-8">
          
          {isLoading ? (
            <div className="py-16 text-center text-stone-500 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <p className="text-xs font-bold">載入推廣大使推薦碼資料中...</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* 1. 自己的推薦碼與專屬推廣分享 */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/70 border border-amber-300 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
                      <Sparkles className="w-4 h-4 text-stone-950" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-stone-900">您的專屬推廣大使代碼</h2>
                      <p className="text-[11px] text-amber-800">提案團隊填寫您的代碼，審核通過您即獲得 300 點（價值 $400 的 IdeaX平台點數，用於提問、享受付費服務）</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                    官方推廣大使
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-2xs">
                  <div>
                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Your Referral Code</div>
                    <div className="font-mono font-black text-2xl sm:text-3xl text-stone-950 tracking-wider mt-0.5">
                      {myCode}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(myCode).then(() => {
                          setCopiedCode(true);
                          showToast('已複製專屬推薦碼！');
                          setTimeout(() => setCopiedCode(false), 2000);
                        });
                      }}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedCode ? '已複製' : '複製代碼'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(myLink).then(() => {
                          setCopiedLink(true);
                          showToast('已複製專屬推廣專用連結！');
                          setTimeout(() => setCopiedLink(false), 2000);
                        });
                      }}
                      className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      <span>{copiedLink ? '已複製連結' : '複製推廣連結'}</span>
                    </button>
                  </div>
                </div>

                {/* 津貼規則提示 */}
                <div className="p-4 rounded-2xl bg-white/80 border border-amber-200 text-stone-700 space-y-1.5 text-xs">
                  <div className="font-black text-emerald-800 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span>推廣點數獎勵：每推薦 1 案審核通過，即核發 300 點（價值 $400，點數效期 60 日）</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    邀請創客、個人或創新團隊於投件或報名時填入您的推薦碼。主辦單位審核通過後，300 點數（效期 60 日）將自動入帳（IdeaX平台點數，可用於提問、享受付費服務）。多推多得無上限！
                  </p>
                </div>
              </div>

              {/* 2. 推廣績效數據卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                  <div className="text-xs text-stone-500 font-bold">累計推薦提案</div>
                  <div className="font-mono font-black text-2xl text-stone-900 mt-1">
                    {ambassadorData?.totalReferred || 0} <span className="text-xs font-normal">件</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-700 font-bold">審核通過件數</div>
                  <div className="font-mono font-black text-2xl text-emerald-900 mt-1">
                    {ambassadorData?.approvedCount || 0} <span className="text-xs font-normal">件</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <div className="text-xs text-amber-800 font-bold">累計獲得點數</div>
                  <div className="font-mono font-black text-2xl text-amber-900 mt-1">
                    {((ambassadorData?.approvedCount || 0) * 400).toLocaleString()} 點
                  </div>
                </div>
              </div>

              {/* 3. 輸入推薦碼 (綁定推薦人) */}
              <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-amber-600" />
                  <span>輸入推薦碼（綁定您的推薦人）</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  若您是由特定推廣大使或夥伴推薦前來參賽，請在下方輸入對方的推薦碼。提案審核通過時，對方將獲得 400 點推廣獎勵（IdeaX平台點數，用於提問、享受付費服務）！
                </p>
                <form onSubmit={handleBind} className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="請輸入推薦碼 (例如: AMB-USER-XXXX)"
                    className="w-full sm:flex-1 bg-white border border-stone-300 rounded-xl p-3 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 font-mono uppercase font-bold"
                  />
                  <button
                    type="submit"
                    disabled={isBinding || !inputCode.trim()}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    {isBinding ? '綁定驗證中...' : '確認綁定推薦人'}
                  </button>
                </form>
              </div>

              {/* 4. 推薦名單與審核進度 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>推薦名單與審核進度</span>
                  </div>
                  <span className="text-xs text-stone-500 font-bold">
                    共 {ambassadorData?.referrals?.length || 0} 筆推薦紀錄
                  </span>
                </div>

                {!ambassadorData?.referrals || ambassadorData.referrals.length === 0 ? (
                  <div className="p-10 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-2 text-stone-400">
                    <Users className="w-10 h-10 mx-auto text-stone-300 stroke-1" />
                    <p className="text-sm font-bold text-stone-600">目前尚無被推薦之提案紀錄</p>
                    <p className="text-xs text-stone-400">
                      趕快複製上方專屬推薦碼或分享連結，邀請身邊的創業團隊與同學投件吧！
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ambassadorData.referrals.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-4 rounded-2xl bg-white border border-stone-200 flex items-center justify-between gap-4 text-xs shadow-2xs hover:border-amber-300 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-stone-900 text-sm truncate">
                            {ref.proposalTitle}
                          </div>
                          <div className="text-xs text-stone-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>提案人：{ref.authorName}</span>
                            <span>•</span>
                            <span>投稿時間：{new Date(ref.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {ref.status === 'approved' ? (
                            <div className="space-y-1">
                              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs">
                                審核通過
                              </span>
                              <div className="font-mono font-black text-emerald-700 text-sm">
                                +400 點
                              </div>
                            </div>
                          ) : ref.status === 'rejected' ? (
                            <span className="inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-500 border border-stone-200 font-bold text-xs">
                              未通過
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs">
                                審核中
                              </span>
                              <div className="text-[11px] text-stone-400">
                                待核發
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

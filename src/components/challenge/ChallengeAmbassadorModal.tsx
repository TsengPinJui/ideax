import React, { useState } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  Award,
  Sparkles,
  Coins,
  DollarSign,
  Share2,
  CheckCircle2,
  AlertCircle,
  Building,
  Gift,
} from 'lucide-react';
import { User } from '../../types';
import { ChallengeAmbassador, ChallengeProposal } from '../../types/challengeTypes';
import {
  getChallengeAmbassadors,
  registerChallengeAmbassador,
  claimShareReferralBonus,
  getChallengeUserWallet,
} from '../../services/challengeService';
import { CHALLENGE_CONSTANTS } from '../../data/challengeData';

interface ChallengeAmbassadorModalProps {
  onClose: () => void;
  currentUser: User;
  proposals: ChallengeProposal[];
}

export const ChallengeAmbassadorModal: React.FC<ChallengeAmbassadorModalProps> = ({
  onClose,
  currentUser,
  proposals,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ambassador' | 'claim_bonus'>('ambassador');
  const [ambassadors, setAmbassadors] = useState<ChallengeAmbassador[]>(() =>
    getChallengeAmbassadors()
  );

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShareText, setCopiedShareText] = useState(false);

  // Ambassador registration state
  const myAmbassador = ambassadors.find((a) => a.userId === currentUser.id);
  const [schoolOrOrg, setSchoolOrOrg] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [regError, setRegError] = useState('');

  // Claim 100 points share bonus state
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [claimStatus, setClaimStatus] = useState<{ success?: boolean; msg?: string }>({});

  const userRoleType =
    currentUser.role === 'admin'
      ? 'user'
      : (currentUser as any).isExpert
      ? 'expert'
      : (currentUser as any).isCreator
      ? 'creator'
      : 'user';

  // Proposals linked to my referral code
  const myReferredProposals = myAmbassador
    ? proposals.filter((p) => p.referralCode?.toUpperCase() === myAmbassador.referralCode.toUpperCase())
    : [];

  const approvedCount = myReferredProposals.filter((p) => p.status === 'approved').length;
  const pendingCount = myReferredProposals.filter((p) => p.status === 'pending').length;
  const totalBonus = approvedCount * CHALLENGE_CONSTANTS.AMBASSADOR_REWARD_PER_APPROVED;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    const res = await registerChallengeAmbassador({
      userId: currentUser.id,
      name: currentUser.name,
      email: (currentUser as any).email || `${currentUser.id}@campus.ideax.tw`,
      schoolOrOrg,
      customCode: customCode || undefined,
    });

    if (!res.success || !res.ambassador) {
      setRegError(res.error || '註冊失敗');
      return;
    }

    setAmbassadors(getChallengeAmbassadors());
  };

  const handleClaimBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimStatus({});

    const res = await claimShareReferralBonus(currentUser.id, userRoleType, inputReferralCode);
    if (!res.success) {
      setClaimStatus({ success: false, msg: res.error || '領取失敗' });
    } else {
      setClaimStatus({
        success: true,
        msg: `成功領取 100 點競賽專用支持點數！已自動注入您的競賽錢包。`,
      });
      setInputReferralCode('');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyShareText = (code: string) => {
    const text = `🔥【IdeaX 創新挑戰季】你的創業想法值得被看見！
現在投稿即可接受全網虛擬支持金市場驗證與認證專家 300 萬投資評選，過審即獲官方金色認證標章！
👉 投稿時填寫專屬推薦碼：${code}
輸入此推薦碼還可獲得 100 點競賽專用投票點數！一起提出創新解方！`;
    navigator.clipboard.writeText(text);
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header - Bright Theme */}
        <div className="px-6 py-4 bg-white text-stone-900 flex items-center justify-between shrink-0 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black border border-emerald-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                <span>校園宣傳大使與分享獎勵</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SubTab Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600">
          <button
            type="button"
            onClick={() => setActiveSubTab('ambassador')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'ambassador'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-black shadow-2xs'
                : 'hover:bg-stone-100'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>宣傳大使推廣 ($800/過審)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('claim_bonus')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'claim_bonus'
                ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                : 'hover:bg-stone-100'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-600" />
            <span>輸入推薦碼領取 100 點</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-stone-800">
          {activeSubTab === 'ambassador' && (
            <>
              {/* Rules Banner */}
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <h3 className="font-black text-sm text-emerald-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>校園大使推廣獎勵說明</span>
                </h3>
                <p className="text-xs text-stone-700 leading-relaxed">
                  <strong>獎勵規則：</strong>校園宣傳大使每成功推薦一位創作者投稿且<strong>該提案通過管理員審核</strong>，大使可獲得<strong> NT$ 800 元</strong> 實體宣傳推廣費（只按推薦且過審計算，投稿者不領取此款；未通過審核之提案不計入）。
                </p>
              </div>

              {/* If already an ambassador */}
              {myAmbassador ? (
                <div className="space-y-5">
                  {/* Ambassador Card */}
                  <div className="p-5 rounded-2xl bg-stone-900 text-white space-y-4 shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[11px] text-stone-400 block font-mono">
                          CAMPUS AMBASSADOR
                        </span>
                        <span className="text-lg font-black text-white">{myAmbassador.name}</span>
                        <span className="text-xs text-emerald-400 block mt-0.5">
                          {myAmbassador.schoolOrOrg}
                        </span>
                      </div>

                      {/* Referral Code Box */}
                      <div className="p-2.5 rounded-xl bg-stone-800 border border-stone-700 flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-[10px] text-stone-400 block">我的推薦碼</span>
                          <span className="font-mono font-black text-base text-amber-400 tracking-wider">
                            {myAmbassador.referralCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(myAmbassador.referralCode)}
                          className="p-2 rounded-lg bg-stone-700 hover:bg-amber-400 hover:text-stone-950 text-stone-200 transition-all cursor-pointer"
                          title="複製推薦碼"
                        >
                          {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Performance Stats */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-stone-800 text-center">
                      <div>
                        <span className="text-[10px] text-stone-400 block">推薦過審件數</span>
                        <span className="text-xl font-black text-emerald-400 font-mono">
                          {approvedCount} 件
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block">審核中件數</span>
                        <span className="text-xl font-black text-amber-400 font-mono">
                          {pendingCount} 件
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block">累計推廣費 ($800/件)</span>
                        <span className="text-xl font-black text-amber-400 font-mono">
                          ${totalBonus.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Share Tools */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-stone-700">一鍵複製推廣文案：</span>
                    <button
                      type="button"
                      onClick={() => handleCopyShareText(myAmbassador.referralCode)}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{copiedShareText ? '已複製推廣文案到剪貼簿！' : '複製競賽推薦分享文案'}</span>
                    </button>
                  </div>

                  {/* Referred Proposals List */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-black text-stone-900 flex items-center justify-between">
                      <span>推薦投稿紀錄 ({myReferredProposals.length})</span>
                      <span className="text-[10px] text-stone-400">過審即自動核發 $800</span>
                    </h4>

                    {myReferredProposals.length > 0 ? (
                      <div className="space-y-2">
                        {myReferredProposals.map((prop) => (
                          <div
                            key={prop.id}
                            className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="font-bold text-stone-900 block truncate">{prop.title}</span>
                              <span className="text-[10px] text-stone-500">
                                提案人：{prop.teamName || prop.authorName} ({prop.schoolOrOccupation})
                              </span>
                            </div>

                            <div>
                              {prop.status === 'approved' ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  已過審 +$800
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  審核中
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300 text-xs text-stone-400">
                        尚無創作者使用您的推薦碼投稿，快把專屬推薦碼分享到校園社群或系學會！
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Registration Form */
                <form onSubmit={handleRegister} className="space-y-4 p-5 rounded-2xl bg-stone-50 border border-stone-200">
                  <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <span>申請成為 IdeaX 校園宣傳大使</span>
                  </h4>
                  <p className="text-xs text-stone-500">
                    成為校園推廣領袖，拉下線創作者參賽，每過審一案即享 $800 推廣獎勵金！
                  </p>

                  {regError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-bold">
                      {regError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">就讀學校／所屬組織 *</label>
                    <input
                      type="text"
                      required
                      value={schoolOrOrg}
                      onChange={(e) => setSchoolOrOrg(e.target.value)}
                      placeholder="例如：國立政治大學 / 創業社社長"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-emerald-500 rounded-xl text-xs outline-none text-stone-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">
                      自訂專屬推薦碼 (選填，限英數 4-10 字元)
                    </label>
                    <input
                      type="text"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      placeholder="例如：NCCU_INNO (未填將由系統自動產生)"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-emerald-500 rounded-xl text-xs font-mono outline-none uppercase text-stone-900"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
                  >
                    立即生成校園大使專屬推薦碼
                  </button>
                </form>
              )}
            </>
          )}

          {activeSubTab === 'claim_bonus' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <h3 className="font-black text-sm text-amber-950 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-600" />
                  <span>推薦分享獎勵領取（每人 100 點競賽支持金）</span>
                </h3>
                <p className="text-xs text-stone-700 leading-relaxed">
                  輸入朋友或校園大使分享給你的推薦碼，即可領取 <strong>100 點</strong> 競賽虛擬點數！
                  <strong className="text-amber-800 block mt-1">發放條件與限制：每個帳號限領一次，僅作為競賽專用投票點數，不可兌現或移轉主站。</strong>
                </p>
              </div>

              <form onSubmit={handleClaimBonus} className="space-y-4 p-5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">輸入推薦碼 (Referral Code)</label>
                  <input
                    type="text"
                    required
                    value={inputReferralCode}
                    onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                    placeholder="例如：IDEAX-NCCU88"
                    className="w-full px-4 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-sm font-mono uppercase font-bold outline-none text-stone-900"
                  />
                </div>

                {claimStatus.msg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      claimStatus.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {claimStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>{claimStatus.msg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs shadow-sm cursor-pointer transition-all active:scale-98"
                >
                  立即兌換 100 點競賽支持金
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

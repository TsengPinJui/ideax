import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  DollarSign,
  Clock,
  Trash2,
  Edit3,
  Award,
  Sparkles,
  Search,
  ExternalLink,
  Crown,
  Info,
} from 'lucide-react';
import { ChallengeProposal, ChallengeAmbassador, ChallengeProposalStatus, ChallengeContestStatus } from '../../types/challengeTypes';
import {
  reviewChallengeProposal,
  getChallengeAmbassadors,
  formatPointAmount,
  getChallengeContestStatus,
  finalizeChallengeTop10,
  resetChallengeFinalization,
} from '../../services/challengeService';
import { CHALLENGE_CONSTANTS } from '../../data/challengeData';

interface ChallengeAdminModalProps {
  onClose: () => void;
  proposals: ChallengeProposal[];
  onProposalUpdated: (updated: ChallengeProposal) => void;
  onSelectProposal: (proposal: ChallengeProposal) => void;
}

type AdminTab = 'reviews' | 'final_awards' | 'ambassadors' | 'all_proposals';

export const ChallengeAdminModal: React.FC<ChallengeAdminModalProps> = ({
  onClose,
  proposals,
  onProposalUpdated,
  onSelectProposal,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('reviews');
  const [ambassadors] = useState<ChallengeAmbassador[]>(() => getChallengeAmbassadors());
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [contestStatus, setContestStatus] = useState<ChallengeContestStatus>(() => getChallengeContestStatus());
  const [statusMsg, setStatusMsg] = useState('');

  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const approvedProposals = proposals.filter((p) => p.status === 'approved');

  // Total ambassador calculation: 總過審數 * 400
  const totalApprovedReferrals = ambassadors.reduce(
    (sum, a) => sum + (a.approvedReferralsCount || 0),
    0
  );
  const totalAmbassadorPayout = totalApprovedReferrals * CHALLENGE_CONSTANTS.AMBASSADOR_REWARD_PER_APPROVED;

  // Calculate current preview top 10
  const previewTop10 = [...approvedProposals]
    .sort((a, b) => (b.fundingRaised || 0) - (a.fundingRaised || 0) || (b.likes || 0) - (a.likes || 0))
    .slice(0, 10);

  const handleReview = async (id: string, status: ChallengeProposalStatus) => {
    const notes = reviewNotes[id] || (status === 'approved' ? '符合創新創業主題，審核通過' : '未達競賽審核標準');
    const res = await reviewChallengeProposal(id, status, notes, 'admin');
    if (res.success && res.proposal) {
      onProposalUpdated(res.proposal);
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleFinalizeTop10 = async () => {
    if (approvedProposals.length === 0) {
      alert('目前尚無過審提案，無法結算前十名');
      return;
    }
    const confirmed = window.confirm(
      `確定要正式核定並公布前 ${Math.min(10, approvedProposals.length)} 名獲獎結果嗎？\n獲獎創作者將正式獲頒「創之星」榮譽徽章，並同步更新至用戶名單。`
    );
    if (!confirmed) return;

    const res = await finalizeChallengeTop10('admin');
    if (res.success) {
      setContestStatus(res.contestStatus);
      setStatusMsg(res.message);
      setTimeout(() => setStatusMsg(''), 5000);
    }
  };

  const handleResetFinalization = async () => {
    const confirmed = window.confirm('確定要重置賽事結算狀態為「進行中」嗎？將收回前十名徽章標記。');
    if (!confirmed) return;

    const res = await resetChallengeFinalization('admin');
    if (res.success) {
      setContestStatus(getChallengeContestStatus());
      setStatusMsg(res.message);
      setTimeout(() => setStatusMsg(''), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header - Bright Theme */}
        <div className="px-6 py-4 bg-white text-stone-900 flex items-center justify-between shrink-0 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black border border-red-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                <span>IdeaX 創星季 • 管理審核後台</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 font-bold">
                  管理員專用
                </span>
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-3 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'reviews'
                ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                : 'hover:bg-stone-100'
            }`}
          >
            <span>待審核提案</span>
            {pendingProposals.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingProposals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('final_awards')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'final_awards'
                ? 'bg-amber-400 text-stone-950 font-black shadow-2xs'
                : 'hover:bg-stone-100 text-amber-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>賽後前十名「創之星」結算</span>
            {contestStatus.isFinalized && (
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ambassadors')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ambassadors'
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 font-black shadow-2xs'
                : 'hover:bg-stone-100'
            }`}
          >
            <span>大使與推廣費 ($400)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_proposals')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'all_proposals'
                ? 'bg-stone-900 text-white font-black shadow-2xs'
                : 'hover:bg-stone-100'
            }`}
          >
            <span>全站提案總表 ({proposals.length})</span>
          </button>
        </div>

        {statusMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* TAB 1: 待審核 */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {pendingProposals.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-stone-600">目前沒有待審核的提案投稿！</p>
                </div>
              ) : (
                pendingProposals.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-3xl bg-white border-2 border-amber-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {p.category}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        投稿時間：{new Date(p.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="font-black text-base text-stone-900">{p.title}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-2xl bg-stone-50 text-xs">
                      <div>
                        <span className="font-bold text-stone-700">團隊名稱：</span>
                        <span>{p.teamName}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">學校/職業：</span>
                        <span>{p.schoolOrOccupation}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">聯絡電話：</span>
                        <span>{p.phone}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-700">Email：</span>
                        <span>{p.email}</span>
                      </div>
                      {p.referralCode && (
                        <div className="col-span-2 text-emerald-800 font-bold">
                          使用大使推薦碼：{p.referralCode}
                        </div>
                      )}
                    </div>

                    <div className="text-xs space-y-1.5">
                      <p>
                        <strong className="text-stone-800">痛點描述：</strong>
                        {p.painPoint}
                      </p>
                      <p>
                        <strong className="text-stone-800">解決方案：</strong>
                        {p.solution}
                      </p>
                    </div>

                    {/* Review Notes Input */}
                    <div className="pt-2">
                      <input
                        type="text"
                        placeholder="填寫審核意見或相似提案優先說明（選填）..."
                        value={reviewNotes[p.id] || ''}
                        onChange={(e) =>
                          setReviewNotes({ ...reviewNotes, [p.id]: e.target.value })
                        }
                        className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-white"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => handleReview(p.id, 'rejected')}
                        className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        退回 / 不通過
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReview(p.id, 'needs_revision')}
                        className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all cursor-pointer"
                      >
                        通知修改（相似提案）
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReview(p.id, 'approved')}
                        className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-black transition-all cursor-pointer shadow-xs"
                      >
                        審核通過並公開展示
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: 賽後前十名「創之星」結算管理 */}
          {activeTab === 'final_awards' && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="p-5 rounded-3xl bg-amber-50/80 border-2 border-amber-300 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h3 className="font-black text-base text-stone-900">
                      賽後前十名「創之星」徽章核發控制台
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      contestStatus.isFinalized
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {contestStatus.isFinalized
                      ? `已正式公布結算 (${new Date(contestStatus.finalizedAt || '').toLocaleDateString()})`
                      : '賽事進行中（尚未結算）'}
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  規章規範：競賽結果必須經管理員確認/正式公布後，前 10 名獲獎提案所屬創作者才可取得「創之星」徽章。不能在未公布前自動發放，非前十名不得取得。
                </p>

                <div className="flex items-center gap-3 pt-2">
                  {!contestStatus.isFinalized ? (
                    <button
                      type="button"
                      onClick={handleFinalizeTop10}
                      className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Crown className="w-4 h-4" />
                      <span>正式核定公布前十名並頒發「創之星」徽章</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetFinalization}
                      className="px-4 py-2 rounded-2xl bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 font-bold text-xs cursor-pointer border border-stone-300"
                    >
                      重置為進行中（撤回結算）
                    </button>
                  )}
                </div>
              </div>

              {/* Preview or Official Top 10 List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>
                    {contestStatus.isFinalized
                      ? '已獲核發「創之星」之正式前十名獲獎提案與作者'
                      : '當前即時試算前十名候補名單（待公布後正式生效）'}
                  </span>
                </h4>

                <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  {previewTop10.map((p, idx) => {
                    const rank = idx + 1;
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-stone-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black font-mono text-xs ${
                              rank === 1
                                ? 'bg-amber-400 text-stone-950'
                                : rank <= 3
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {rank}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900 truncate">{p.title}</span>
                              {contestStatus.isFinalized && (
                                <span className="px-2 py-0.2 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black shrink-0">
                                  創之星 TOP {rank}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-500">
                              作者：{p.authorName}（ID: {p.authorId}） • {p.teamName}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-amber-600 block">
                            ${formatPointAmount(p.fundingRaised || 0)}
                          </span>
                          <span className="text-[10px] text-stone-400">{p.likes || 0} 收藏</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <span className="font-bold text-stone-800">⚠️ 後端與安全規格說明：</span>
                <p>
                  目前已在前端與資料層完整建立可追溯之「創之星」獲獎記錄，並同步寫入舊站用戶名單；正式 production 環境需待全域 Firestore 規則與 Cloud Functions 後端簽章驗證完成後於伺服端原子執行。
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: 大使與推廣費清冊 */}
          {activeTab === 'ambassadors' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs text-emerald-800 font-bold block">註冊推廣大使人數</span>
                  <span className="text-2xl font-black text-emerald-950 font-mono">
                    {ambassadors.length} 位
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-xs text-amber-800 font-bold block">成功過審推薦總件數</span>
                  <span className="text-2xl font-black text-amber-950 font-mono">
                    {totalApprovedReferrals} 件
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200">
                  <span className="text-xs text-stone-600 font-bold block">應發放宣傳費 ($400/件)</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">
                    ${totalAmbassadorPayout.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-black text-stone-900">大使清冊與推薦明細</h3>
                <div className="space-y-2">
                  {ambassadors.map((amb) => (
                    <div
                      key={amb.id}
                      className="p-4 rounded-2xl bg-white border border-stone-200 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-stone-900">{amb.name}</span>
                          <span className="font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                            {amb.referralCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">{amb.schoolOrOrg} • {amb.email}</p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-emerald-600 text-sm block">
                          過審 {amb.approvedReferralsCount || 0} 件
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          推廣費 ${((amb.approvedReferralsCount || 0) * CHALLENGE_CONSTANTS.AMBASSADOR_REWARD_PER_APPROVED).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 全站提案清單 */}
          {activeTab === 'all_proposals' && (
            <div className="space-y-3">
              {proposals.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectProposal(p)}
                  className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 flex items-center justify-between gap-4 text-xs cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 truncate">{p.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {p.status}
                      </span>
                      {(p.starOfCreationAwarded || p.isTop10Winner) && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-stone-950 font-black">
                          創之星
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {p.teamName || p.authorName} • 募資 ${formatPointAmount(p.fundingRaised || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === 'approved' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReview(p.id, 'rejected');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 text-[11px]"
                      >
                        下架
                      </button>
                    )}
                    {p.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReview(p.id, 'approved');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold"
                      >
                        重新上架
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
} from 'lucide-react';
import { ChallengeProposal, ChallengeAmbassador, ChallengeProposalStatus } from '../../types/challengeTypes';
import { reviewChallengeProposal, getChallengeAmbassadors, formatPointAmount } from '../../services/challengeService';
import { CHALLENGE_CONSTANTS } from '../../data/challengeData';

interface ChallengeAdminModalProps {
  onClose: () => void;
  proposals: ChallengeProposal[];
  onProposalUpdated: (updated: ChallengeProposal) => void;
  onSelectProposal: (proposal: ChallengeProposal) => void;
}

type AdminTab = 'reviews' | 'ambassadors' | 'all_proposals';

export const ChallengeAdminModal: React.FC<ChallengeAdminModalProps> = ({
  onClose,
  proposals,
  onProposalUpdated,
  onSelectProposal,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('reviews');
  const [ambassadors] = useState<ChallengeAmbassador[]>(() => getChallengeAmbassadors());
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const approvedProposals = proposals.filter((p) => p.status === 'approved');

  // Total ambassador calculation: 總過審數 * 800
  const totalApprovedReferrals = ambassadors.reduce(
    (sum, a) => sum + (a.approvedReferralsCount || 0),
    0
  );
  const totalAmbassadorPayout = totalApprovedReferrals * CHALLENGE_CONSTANTS.AMBASSADOR_REWARD_PER_APPROVED;

  const handleReview = async (id: string, status: ChallengeProposalStatus) => {
    const notes = reviewNotes[id] || (status === 'approved' ? '符合創新創業主題，審核通過' : '未達競賽審核標準');
    const res = await reviewChallengeProposal(id, status, notes, 'admin');
    if (res.success && res.proposal) {
      onProposalUpdated(res.proposal);
    } else if (res.error) {
      alert(res.error);
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
                <span>IdeaX 創新挑戰季 • 管理審核後台</span>
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
        <div className="flex items-center gap-2 px-6 py-3 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'bg-amber-50 text-amber-950 border border-amber-300 font-black shadow-2xs'
                : 'hover:bg-stone-100'
            }`}
          >
            <span>待審核提案</span>
            {pendingProposals.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px]">
                {pendingProposals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ambassadors')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ambassadors'
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 font-black shadow-2xs'
                : 'hover:bg-stone-100'
            }`}
          >
            <span>校園大使與獎勵結算</span>
            <span className="text-emerald-700">(${totalAmbassadorPayout.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_proposals')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all_proposals'
                ? 'bg-stone-200 text-stone-900 font-black shadow-2xs'
                : 'hover:bg-stone-100'
            }`}
          >
            <span>全站提案管理 ({proposals.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* TAB 1: 待審核提案 */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>相似提案處理原則：</span>
                </span>
                <p>
                  若發現主題高度重複之提案，請以「<strong>最早刊登時間者優先保留審核通過</strong>」；後提交者請給予修改建議或予以退回/下架。
                </p>
              </div>

              {pendingProposals.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  目前所有提案均已審核完畢！
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingProposals.map((prop) => (
                    <div
                      key={prop.id}
                      className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 space-y-3 shadow-2xs transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                              {prop.category}
                            </span>
                            <span className="text-[10px] font-mono text-stone-400">
                              投稿時間：{new Date(prop.submittedAt).toLocaleString()}
                            </span>
                            {prop.referralCode && (
                              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                                推薦碼: {prop.referralCode}
                              </span>
                            )}
                          </div>
                          <h3 className="font-black text-base text-stone-900">{prop.title}</h3>
                          <p className="text-xs text-stone-500">
                            提案人：{prop.teamName || prop.authorName} ({prop.schoolOrOccupation}) •
                            Email: {prop.email} • 電話: {prop.phone}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectProposal(prop)}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>詳情</span>
                        </button>
                      </div>

                      {/* Content details */}
                      <div className="p-3.5 bg-stone-50 rounded-xl text-xs space-y-2 text-stone-700 border border-stone-200">
                        <div>
                          <strong className="text-stone-900">痛點：</strong> {prop.painPoint}
                        </div>
                        <div>
                          <strong className="text-stone-900">解方：</strong> {prop.solution}
                        </div>
                      </div>

                      {/* Sensitive Remittance Data - Admin Only */}
                      <div className="p-3 bg-amber-50 rounded-xl text-xs font-mono text-amber-900 flex items-center justify-between border border-amber-200">
                        <span>收款帳戶：{prop.bankName} • {prop.bankAccount}</span>
                        <span className="text-[10px] text-amber-700 font-sans">已由管理員權限驗證</span>
                      </div>

                      {/* Review input and actions */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="填寫審核意見（選填，將通知創作者）..."
                          value={reviewNotes[prop.id] || ''}
                          onChange={(e) =>
                            setReviewNotes({ ...reviewNotes, [prop.id]: e.target.value })
                          }
                          className="flex-1 w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none text-stone-900"
                        />

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleReview(prop.id, 'approved')}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                          >
                            通過審核並發布
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReview(prop.id, 'rejected')}
                            className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs cursor-pointer"
                          >
                            退回 / 通知修改
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 校園大使管理 */}
          {activeTab === 'ambassadors' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs text-emerald-800 font-bold block">校園大使總數</span>
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
                  <span className="text-xs text-stone-600 font-bold block">應發放宣傳費 ($800/件)</span>
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

          {/* TAB 3: 全站提案清單 */}
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

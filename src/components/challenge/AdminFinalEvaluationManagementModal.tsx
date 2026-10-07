import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Trophy,
  Award,
  Users,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Send,
  Eye,
  ShieldCheck,
  Star,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Coins,
  DollarSign,
  Download,
  Info,
  Check,
} from 'lucide-react';
import { StarSeasonProposal } from '../../types/competition';
import {
  CompetitionExpertRecord,
  getCompetitionExperts,
  updateCompetitionExpertStatus,
} from '../../services/competitionAdminSync';
import {
  getNominatedProposalIds,
  saveNominatedProposalIds,
  getAllJudgeScoreRecords,
  calculateFinalProposalRankings,
  getIsFinalResultsPublished,
  setIsFinalResultsPublished,
  generateAggregatedRewardsReport,
  exportFinalRankingsExcel,
  exportRewardsSummaryExcel,
  FinalProposalAggregateScore,
  UserRewardAggregatedItem,
} from '../../services/finalEvaluationService';

interface AdminFinalEvaluationManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: StarSeasonProposal[];
  onProposalsUpdated?: () => void;
  onOpenJudgeEvaluationAsUser?: (judge: { id: string; name: string }) => void;
}

export const AdminFinalEvaluationManagementModal: React.FC<AdminFinalEvaluationManagementModalProps> = ({
  isOpen,
  onClose,
  proposals,
  onProposalsUpdated,
  onOpenJudgeEvaluationAsUser,
}) => {
  const [activeTab, setActiveTab] = useState<'nomination' | 'judges' | 'scoring' | 'rewards'>('scoring');
  const [nominatedIds, setNominatedIds] = useState<string[]>(() => getNominatedProposalIds());
  const [experts, setExperts] = useState<CompetitionExpertRecord[]>(() => getCompetitionExperts());
  const [isPublished, setIsPublished] = useState<boolean>(() => getIsFinalResultsPublished());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 重新載入最新狀態
  const reloadData = () => {
    setNominatedIds(getNominatedProposalIds());
    setExperts(getCompetitionExperts());
    setIsPublished(getIsFinalResultsPublished());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
    }
  }, [isOpen]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. 計算當前入選提案的加權總分與排名
  const finalRankings: FinalProposalAggregateScore[] = useMemo(() => {
    return calculateFinalProposalRankings(proposals);
  }, [proposals, nominatedIds, isOpen]);

  // 2. 計算全體獎勵統計總表 (兼任多身分自動聚合)
  const rewardsSummary: UserRewardAggregatedItem[] = useMemo(() => {
    return generateAggregatedRewardsReport(proposals);
  }, [proposals, finalRankings, experts, isOpen]);

  // 已指派的決選評審專家
  const appointedJudges = useMemo(() => {
    return experts.filter((e) => e.isJudgeSelected);
  }, [experts]);

  if (!isOpen) return null;

  // 勾選 / 取消勾選入選提案
  const handleToggleNominateProposal = (propId: string) => {
    const updated = nominatedIds.includes(propId)
      ? nominatedIds.filter((id) => id !== propId)
      : [...nominatedIds, propId];
    setNominatedIds(updated);
    saveNominatedProposalIds(updated);
    triggerToast(
      updated.includes(propId)
        ? '✅ 已將提案勾選入選！自動匯入決選評分區，系統已為評審生成評分表格。'
        : 'ℹ️ 已將提案移出決選入選名單。'
    );
    if (onProposalsUpdated) onProposalsUpdated();
  };

  // 一鍵入選模擬募資前 20 名
  const handleNominateTop20 = () => {
    const top20Ids = proposals.slice(0, 20).map((p) => p.id);
    setNominatedIds(top20Ids);
    saveNominatedProposalIds(top20Ids);
    triggerToast('🎉 已一鍵將模擬募資前 20 名提案自動匯入決選評分區！');
    if (onProposalsUpdated) onProposalsUpdated();
  };

  // 切換專家為決選評審
  const handleToggleJudgeAppointment = (expertId: string, currentSelected: boolean) => {
    const newStatus = !currentSelected;
    updateCompetitionExpertStatus(expertId, 'approved', newStatus);
    setExperts(getCompetitionExperts());
    triggerToast(
      newStatus
        ? '👑 已指派該專家為「決審評審委員」！其專屬介面已解鎖「決選評分區」功能。'
        : 'ℹ️ 已取消該專家的決審評審指派。'
    );
  };

  // 管理員確認結果並送出 (盛大發布到前台)
  const handleConfirmAndPublishResults = () => {
    if (!isPublished) {
      if (!window.confirm('確定要「確認評選結果並送出」嗎？\n\n系統將自動依各評審打分算術平均得出排名，並立即在創星季前台盛大公布最終冠軍、亞軍、季軍榜單！')) {
        return;
      }
      setIsFinalResultsPublished(true);
      setIsPublished(true);
      triggerToast('🚀 評選結果已確認並正式送出！前台已盛大即時公布最終榜單！');
      if (onProposalsUpdated) onProposalsUpdated();
    } else {
      if (!window.confirm('目前榜單已公布於前台。是否要取消公布狀態，恢復為管理員編輯審查中？')) {
        return;
      }
      setIsFinalResultsPublished(false);
      setIsPublished(false);
      triggerToast('ℹ️ 已取消前台公布狀態，目前處於後台審查中。');
      if (onProposalsUpdated) onProposalsUpdated();
    }
  };

  // 匯出決選評分與排名 Excel
  const handleExportRankingsExcel = () => {
    try {
      exportFinalRankingsExcel(finalRankings);
      triggerToast('📥 決選評分結算與排名 Excel 報表已成功下載！');
    } catch (e: any) {
      triggerToast('匯出失敗：' + (e.message || '檔案生成錯誤'));
    }
  };

  // 匯出全體獎勵統計總表 Excel
  const handleExportRewardsExcel = () => {
    try {
      exportRewardsSummaryExcel(rewardsSummary);
      triggerToast('📥 全體獎勵統計總表 Excel 已成功下載！');
    } catch (e: any) {
      triggerToast('匯出失敗：' + (e.message || '檔案生成錯誤'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border-2 border-amber-400 rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col overflow-hidden shadow-2xl text-stone-900 animate-in zoom-in-95 duration-200">
        
        {/* Toast 提示 */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-stone-900 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs font-black flex items-center gap-2 border border-amber-400 animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* 頂部 Header */}
        <div className="p-4 sm:px-6 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 text-white flex items-center justify-between shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 font-black flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  創星季 • 決選評分與全體獎勵統計總控制台
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white">
                  👑 管理員專屬權限
                </span>
                {isPublished && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-stone-950 flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>前台盛大公布中</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                管理員負責指派特聘評審、勾選入選提案、結算算術平均名次、發布前台結果與匯出 Excel。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reloadData}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="重新整理資料"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 核心治理規則提醒卡片 */}
        <div className="bg-amber-50/90 border-b border-amber-200 px-4 sm:px-6 py-2.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="leading-relaxed">
              <strong>身分定義：</strong>管理員帳號身分為<b>「管理員」</b>（非評審專家）；評審身分為<b>「專家」</b>，由管理員在後台指派。不可兼任參賽者與專家。
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConfirmAndPublishResults}
              className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isPublished
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-300'
              }`}
            >
              {isPublished ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>取消前台公布</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>確認結果並送出 (前台公布)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 導覽分頁按鈕 */}
        <div className="bg-stone-100/90 border-b border-stone-200 px-4 sm:px-6 flex items-center gap-1 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('scoring')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'scoring'
                ? 'border-amber-500 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>1. 決選評分矩陣與算術平均排名 ({finalRankings.length} 案)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('nomination')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'nomination'
                ? 'border-amber-500 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>2. 入選提案勾選 (自動匯入評分區) ({nominatedIds.length} 入選)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('judges')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'judges'
                ? 'border-amber-500 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>3. 專家指派為評審 ({appointedJudges.length} 位評審)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'rewards'
                ? 'border-amber-500 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>4. 【全體獎勵統計】系統 (跨身分自動加總)</span>
          </button>
        </div>

        {/* 內容區主體 */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-stone-50/40">

          {/* ========================================================================= */}
          {/* TAB 1: 決選評分矩陣與算術平均排名 */}
          {/* ========================================================================= */}
          {activeTab === 'scoring' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200">
                <div className="space-y-1">
                  <h4 className="font-black text-stone-900 text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>各隊評審打分匯總與算術平均排名</span>
                  </h4>
                  <p className="text-xs text-stone-500">
                    每位評審依四大指標（創新 40%、完整 20%、可行 20%、商模 20%）加權評分。系統將所有評審總分算術平均得出最終分數與名次。
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportRankingsExcel}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>匯出評審打分與排名 Excel (.xlsx)</span>
                  </button>

                  {appointedJudges[0] && onOpenJudgeEvaluationAsUser && (
                    <button
                      type="button"
                      onClick={() => onOpenJudgeEvaluationAsUser({ id: appointedJudges[0].userId, name: appointedJudges[0].expertName })}
                      className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      title="模擬評審委員邊看邊評分介面"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>以評審視角進入評分</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 排名矩陣表格 */}
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 text-stone-700 font-black border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3 text-center w-16">排名</th>
                        <th className="py-3 px-4 min-w-[200px]">提案名稱 / 參賽團隊</th>
                        <th className="py-3 px-3 text-center">賽道</th>
                        <th className="py-3 px-3 text-right">模擬注資額</th>
                        <th className="py-3 px-3 text-center">評審人數</th>
                        <th className="py-3 px-4 text-center">各評審加權給分</th>
                        <th className="py-3 px-3 text-right font-black text-amber-900">算術平均分</th>
                        <th className="py-3 px-4">獲得獎勵與獎金</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-800">
                      {finalRankings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-stone-400">
                            目前尚未有入選決選之提案，請至「2. 入選提案勾選」分頁勾選提案。
                          </td>
                        </tr>
                      ) : (
                        finalRankings.map((item) => {
                          const isTop1 = item.rank === 1;
                          const isTop2 = item.rank === 2;
                          const isTop3 = item.rank === 3;

                          return (
                            <tr
                              key={item.proposalId}
                              className={`hover:bg-amber-50/40 transition-colors ${
                                isTop1 ? 'bg-amber-50/60 font-medium' : isTop2 ? 'bg-stone-50/70' : isTop3 ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              <td className="py-3.5 px-3 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                                    isTop1
                                      ? 'bg-amber-400 text-stone-950 shadow-xs ring-2 ring-amber-300'
                                      : isTop2
                                      ? 'bg-stone-300 text-stone-900'
                                      : isTop3
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-stone-100 text-stone-600'
                                  }`}
                                >
                                  {item.rank}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-stone-950 text-sm">
                                  {item.proposalTitle}
                                </div>
                                <div className="text-[11px] text-stone-500 mt-0.5">
                                  團隊代表：<strong>{item.authorName}</strong>
                                </div>
                              </td>

                              <td className="py-3.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-bold">
                                  {item.trackName}
                                </span>
                              </td>

                              <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-700">
                                {item.supportPoints.toLocaleString()} 點
                              </td>

                              <td className="py-3.5 px-3 text-center font-bold">
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-mono text-[11px]">
                                  {item.judgesCount} 位
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                {item.judgeScores.length === 0 ? (
                                  <span className="text-stone-400 italic text-[11px]">評審尚未評分</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.judgeScores.map((js, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-800 text-[11px] font-mono"
                                        title={`${js.judgeName} 評語: ${js.feedbackNote || '無'}`}
                                      >
                                        <b>{js.judgeName.split(' ')[0]}</b>: {js.weightedScore}分
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-3 text-right font-mono text-base font-black text-amber-700">
                                {item.averageFinalScore.toFixed(2)}
                              </td>

                              <td className="py-3.5 px-4">
                                {isTop1 ? (
                                  <div className="space-y-0.5">
                                    <span className="font-black text-amber-800 text-xs flex items-center gap-1">
                                      🏆 冠軍大獎
                                    </span>
                                    <div className="text-[11px] text-stone-600">
                                      NT$20,000 現金 ＋ 8,000 點平台點數
                                    </div>
                                  </div>
                                ) : isTop2 ? (
                                  <div className="space-y-0.5">
                                    <span className="font-black text-stone-800 text-xs">🥈 亞軍殊榮</span>
                                    <div className="text-[11px] text-stone-600">
                                      NT$6,000 現金 ＋ 3,200 點平台點數
                                    </div>
                                  </div>
                                ) : isTop3 ? (
                                  <div className="space-y-0.5">
                                    <span className="font-black text-amber-700 text-xs">🥉 季軍殊榮</span>
                                    <div className="text-[11px] text-stone-600">
                                      NT$3,000 現金 ＋ 1,600 點平台點數
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-stone-500">
                                    創之星前十強：400 點數獎勵
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 入選提案勾選 (自動匯入決選評分區) */}
          {/* ========================================================================= */}
          {activeTab === 'nomination' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200">
                <div className="space-y-1">
                  <h4 className="font-black text-stone-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>入選決選提案名單管理（勾選後自動匯入決選評分區）</span>
                  </h4>
                  <p className="text-xs text-stone-500">
                    勾選入選提案後，系統將<strong>自動匯入評審的決選評分區</strong>，並自動為每位評審生成評分表格。
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleNominateTop20}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>一鍵入選大眾模擬募資前 20 名</span>
                  </button>
                </div>
              </div>

              {/* 提案勾選清單 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {proposals.map((prop, idx) => {
                  const isNominated = nominatedIds.includes(prop.id);

                  return (
                    <div
                      key={prop.id}
                      onClick={() => handleToggleNominateProposal(prop.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isNominated
                          ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-300/40 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="pt-0.5">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            isNominated
                              ? 'bg-emerald-600 text-white'
                              : 'border-2 border-stone-300 bg-white'
                          }`}
                        >
                          {isNominated && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-stone-400 font-bold">#{idx + 1}</span>
                          <span className="font-mono font-bold text-amber-700">
                            {(prop.supportPoints || 0).toLocaleString()} 點支持
                          </span>
                        </div>

                        <h5 className="font-extrabold text-stone-900 text-sm truncate">
                          {prop.title}
                        </h5>

                        <div className="text-[11px] text-stone-600">
                          團隊：<strong>{prop.authorName}</strong> · 賽道：{prop.track}
                        </div>

                        <p className="text-stone-500 line-clamp-2 text-[11px] leading-relaxed pt-0.5">
                          {prop.summary}
                        </p>

                        <div className="pt-1 flex items-center gap-2">
                          {isNominated ? (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ● 已自動匯入決選評分區
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400">點擊勾選入選決選</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: 專家指派為評審 */}
          {/* ========================================================================= */}
          {activeTab === 'judges' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-1">
                <h4 className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>特聘決選專家評審委員指派管理</span>
                </h4>
                <p className="text-xs text-stone-500">
                  評審身分為專家，由管理員在後台指派。被指派的評審立即具備「決選評分」專屬功能，並獲得審查車馬費 NT$5,000。不可兼任參賽者。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {experts.map((exp) => {
                  const isAppointed = !!exp.isJudgeSelected;

                  return (
                    <div
                      key={exp.id}
                      className={`p-5 rounded-2xl border transition-all space-y-3 ${
                        isAppointed
                          ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-300/40 shadow-xs'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-900 font-black text-sm flex items-center justify-center border border-purple-200">
                            {exp.expertName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-stone-900 text-sm flex items-center gap-1.5">
                              <span>{exp.expertName}</span>
                              {isAppointed && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-700 text-white">
                                  特聘評審委員
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-600 mt-0.5">
                              {exp.organization} · {exp.jobTitle}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleJudgeAppointment(exp.id, isAppointed)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs transition-colors cursor-pointer ${
                            isAppointed
                              ? 'bg-purple-200 text-purple-900 hover:bg-purple-300'
                              : 'bg-purple-700 hover:bg-purple-600 text-white shadow-xs'
                          }`}
                        >
                          {isAppointed ? '取消評審資格' : '指派為決選評審'}
                        </button>
                      </div>

                      <div className="text-xs text-stone-600 bg-white/80 p-2.5 rounded-xl border border-stone-200/70 space-y-1">
                        <div><b>專業賽道：</b>{exp.expertiseTracks?.join(', ') || '產學研發'}</div>
                        <div><b>經歷年資：</b>{exp.yearsOfExperience} 年</div>
                        <div className="text-stone-500 italic text-[11px]">{exp.bio}</div>
                      </div>

                      {isAppointed && onOpenJudgeEvaluationAsUser && (
                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => onOpenJudgeEvaluationAsUser({ id: exp.userId, name: exp.expertName })}
                            className="text-xs text-purple-700 font-black hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>進入該評審評分介面</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: 【全體獎勵統計】系統 (跨身分自動加總) */}
          {/* ========================================================================= */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200">
                <div className="space-y-1">
                  <h4 className="font-black text-stone-900 text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>全體參與者獎勵統計總表（自動聚合跨身分）</span>
                  </h4>
                  <p className="text-xs text-stone-500">
                    統計參賽團隊（提案獲獎/痛點提出）、專家、評審、推廣大使。若一人兼任多種身分，統一合併計算並完整列出原因備註。
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportRewardsExcel}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>匯出獎勵統計總表 Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* 獎勵統計總表 */}
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 text-stone-700 font-black border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3 text-center w-12">#</th>
                        <th className="py-3 px-4 min-w-[140px]">名稱</th>
                        <th className="py-3 px-3">身分</th>
                        <th className="py-3 px-3 text-right font-black text-emerald-900">獲得獎金 (NT$)</th>
                        <th className="py-3 px-3 text-right font-black text-amber-900">獲得點數 (點)</th>
                        <th className="py-3 px-5 min-w-[280px]">備註 (計算原因)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-800">
                      {rewardsSummary.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3.5 px-3 text-center font-mono text-stone-400">
                            {idx + 1}
                          </td>

                          <td className="py-3.5 px-4 font-black text-stone-900">
                            {item.userName}
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 font-bold text-[11px]">
                              {item.roleType}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                            {item.totalCash > 0 ? `NT$ ${item.totalCash.toLocaleString()}` : '—'}
                          </td>

                          <td className="py-3.5 px-3 text-right font-mono font-black text-amber-700 text-sm">
                            {item.totalPoints > 0 ? `${item.totalPoints.toLocaleString()} 點` : '—'}
                          </td>

                          <td className="py-3.5 px-5 text-stone-600 leading-relaxed text-[11px]">
                            {item.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 底部功能說明列 */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 text-center text-[11px] text-stone-500">
          IdeaX 創星季 • 官方評審機制遵守「四大評審指標（40%, 20%, 20%, 20%）」與「評審算術平均」創星季章程規章。
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Star,
  Award,
  CheckCircle2,
  Save,
  Send,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';
import { StarSeasonProposal } from '../../types/competition';
import {
  FINAL_EVALUATION_CRITERIA,
  ProposalJudgeScoreRecord,
  getAllJudgeScoreRecords,
  saveSingleProposalScore,
  submitAllScoresForJudge,
  calculateWeightedScore,
} from '../../services/finalEvaluationService';

interface JudgeEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  judgeUser: { id: string; name: string };
  nominatedProposals: StarSeasonProposal[];
  onScoresUpdated?: () => void;
}

export const JudgeEvaluationModal: React.FC<JudgeEvaluationModalProps> = ({
  isOpen,
  onClose,
  judgeUser,
  nominatedProposals,
  onScoresUpdated,
}) => {
  const [selectedProposalId, setSelectedProposalId] = useState<string>(
    nominatedProposals[0]?.id || ''
  );
  const [localScores, setLocalScores] = useState<
    Record<string, { innovation: number; completeness: number; feasibility: number; commercial: number; feedback: string }>
  >({});
  const [isSubmittedState, setIsSubmittedState] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 載入評審歷史給分
  useEffect(() => {
    if (!isOpen) return;
    const allRecords = getAllJudgeScoreRecords();
    const scoresMap: Record<string, any> = {};
    const subMap: Record<string, boolean> = {};

    nominatedProposals.forEach((p) => {
      const key = `${judgeUser.id}_${p.id}`;
      const rec = allRecords[key];
      if (rec) {
        scoresMap[p.id] = {
          innovation: rec.scores.innovation || 80,
          completeness: rec.scores.completeness || 80,
          feasibility: rec.scores.feasibility || 80,
          commercial: rec.scores.commercial || 80,
          feedback: rec.feedbackNote || '',
        };
        subMap[p.id] = rec.isSubmitted || false;
      } else {
        scoresMap[p.id] = {
          innovation: 85,
          completeness: 80,
          feasibility: 80,
          commercial: 80,
          feedback: '',
        };
        subMap[p.id] = false;
      }
    });

    setLocalScores(scoresMap);
    setIsSubmittedState(subMap);
    if (!selectedProposalId && nominatedProposals.length > 0) {
      setSelectedProposalId(nominatedProposals[0].id);
    }
  }, [isOpen, judgeUser.id, nominatedProposals]);

  if (!isOpen) return null;

  const currentProposal = nominatedProposals.find((p) => p.id === selectedProposalId) || nominatedProposals[0];
  const curScore = currentProposal ? localScores[currentProposal.id] || { innovation: 80, completeness: 80, feasibility: 80, commercial: 80, feedback: '' } : null;

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleScoreChange = (field: 'innovation' | 'completeness' | 'feasibility' | 'commercial', val: number) => {
    if (!currentProposal) return;
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    setLocalScores((prev) => ({
      ...prev,
      [currentProposal.id]: {
        ...(prev[currentProposal.id] || { innovation: 80, completeness: 80, feasibility: 80, commercial: 80, feedback: '' }),
        [field]: clamped,
      },
    }));
  };

  const handleFeedbackChange = (text: string) => {
    if (!currentProposal) return;
    setLocalScores((prev) => ({
      ...prev,
      [currentProposal.id]: {
        ...(prev[currentProposal.id] || { innovation: 80, completeness: 80, feasibility: 80, commercial: 80, feedback: '' }),
        feedback: text,
      },
    }));
  };

  // 暫存此案
  const handleSaveSingleDraft = () => {
    if (!currentProposal || !curScore) return;
    saveSingleProposalScore({
      judgeId: judgeUser.id,
      judgeName: judgeUser.name,
      proposalId: currentProposal.id,
      scores: {
        innovation: curScore.innovation,
        completeness: curScore.completeness,
        feasibility: curScore.feasibility,
        commercial: curScore.commercial,
      },
      feedbackNote: curScore.feedback,
      isSubmitted: false,
    });
    triggerToast(`💾 已成功暫存「${currentProposal.title}」之評分！`);
    if (onScoresUpdated) onScoresUpdated();
  };

  // 統一送出全部團隊評分給主辦單位
  const handleSubmitAll = () => {
    if (!window.confirm('確定要將所有團隊的決選評分「統一正式送出給主辦單位」嗎？送出後系統將自動加權並納入創星季平均計算。')) {
      return;
    }

    nominatedProposals.forEach((p) => {
      const s = localScores[p.id] || { innovation: 80, completeness: 80, feasibility: 80, commercial: 80, feedback: '' };
      saveSingleProposalScore({
        judgeId: judgeUser.id,
        judgeName: judgeUser.name,
        proposalId: p.id,
        scores: {
          innovation: s.innovation,
          completeness: s.completeness,
          feasibility: s.feasibility,
          commercial: s.commercial,
        },
        feedbackNote: s.feedback,
        isSubmitted: true,
      });
    });

    submitAllScoresForJudge(judgeUser.id);
    setIsSubmittedState((prev) => {
      const n: Record<string, boolean> = {};
      nominatedProposals.forEach((p) => (n[p.id] = true));
      return n;
    });

    triggerToast('🎉 感謝評審委員！已成功將所有團隊的評分統一正式送交主辦單位！');
    if (onScoresUpdated) onScoresUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border-2 border-purple-400 rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col overflow-hidden shadow-2xl text-stone-900 animate-in zoom-in-95 duration-200">
        {/* 頂部標題 */}
        <div className="p-4 sm:px-6 bg-gradient-to-r from-purple-900 via-stone-900 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-purple-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 font-black flex items-center justify-center shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  IdeaX 創星季 • 決選專家評審評分工作台
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500 text-white">
                  特聘評審委員專屬
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                評審委員：<strong>{judgeUser.name}</strong> • 依競賽辦法之四大指標（0~100分）客觀審查，可儲存後統一送出。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {toastMsg && (
              <span className="text-xs font-bold text-amber-300 bg-black/40 px-3 py-1 rounded-full border border-amber-400/50 animate-in fade-in">
                {toastMsg}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 主體：左右分欄（左邊看提案詳細內容、右邊即時評分表格） */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* 左欄：入選團隊切換清單 + 提案完整細節與企劃 */}
          <div className="w-full md:w-7/12 border-r border-stone-200 flex flex-col bg-stone-50/50 overflow-hidden">
            {/* 團隊橫向分頁按鈕 */}
            <div className="p-3 bg-white border-b border-stone-200 overflow-x-auto flex items-center gap-2 shrink-0 scrollbar-none">
              <span className="text-xs font-black text-stone-500 shrink-0">入選提案隊伍：</span>
              {nominatedProposals.map((p, idx) => {
                const isSelected = p.id === currentProposal?.id;
                const isSub = isSubmittedState[p.id];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProposalId(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-purple-700 text-white shadow-xs font-black ring-2 ring-purple-300'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span className="max-w-[120px] truncate">{p.title}</span>
                    {isSub && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* 提案詳細閱讀區 (邊看提案邊評分) */}
            {currentProposal ? (
              <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-stone-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                      賽道：{currentProposal.track}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      支持度：{(currentProposal.supportPoints || 0).toLocaleString()} 點
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">ID: {currentProposal.id}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-stone-950 pt-1">
                    {currentProposal.title}
                  </h2>
                  <p className="text-xs text-stone-500">
                    提案團隊 / 代表：<strong>{currentProposal.authorName}</strong>
                  </p>
                </div>

                {/* 構想摘要 */}
                <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                  <div className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>提案構想摘要</span>
                  </div>
                  <p className="text-stone-700 leading-relaxed">{currentProposal.summary}</p>
                </div>

                {/* 核心解方企劃 */}
                <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                  <div className="font-black text-stone-900 text-xs">一、核心解方完整描述</div>
                  <p className="text-stone-700 whitespace-pre-line leading-relaxed">
                    {currentProposal.description}
                  </p>
                </div>

                {/* 技術可行性 */}
                {currentProposal.technicalFeasibility && (
                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                    <div className="font-black text-stone-900 text-xs">二、技術可行性與原型說明</div>
                    <p className="text-stone-700 leading-relaxed">{currentProposal.technicalFeasibility}</p>
                  </div>
                )}

                {/* 市場分析與商模 */}
                {currentProposal.marketAnalysis && (
                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                    <div className="font-black text-stone-900 text-xs">三、目標市場規模與競爭分析</div>
                    <p className="text-stone-700 leading-relaxed">{currentProposal.marketAnalysis}</p>
                  </div>
                )}

                {currentProposal.businessModelFinancials && (
                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                    <div className="font-black text-stone-900 text-xs">四、商業模式與營運財務預估</div>
                    <p className="text-stone-700 leading-relaxed">{currentProposal.businessModelFinancials}</p>
                  </div>
                )}

                {/* 企劃附件下載檢視 */}
                {currentProposal.attachmentUrl && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-700" />
                      <span className="font-bold text-purple-950">
                        {currentProposal.attachmentName || '營運商業計畫書 (BP / 簡報)'}
                      </span>
                    </div>
                    <a
                      href={currentProposal.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-lg bg-purple-700 text-white font-bold hover:bg-purple-800 transition-colors inline-flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3 h-3" />
                      <span>查看附件</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-stone-400">目前尚無入選決選之提案</div>
            )}
          </div>

          {/* 右欄：即時評分表 (0~100分，表格不顯示各項占比，加權自動換算) */}
          <div className="w-full md:w-5/12 p-5 sm:p-6 bg-white flex flex-col justify-between overflow-y-auto">
            {currentProposal && curScore ? (
              <div className="space-y-5">
                <div className="border-b border-stone-200 pb-3">
                  <div className="text-[11px] font-bold text-stone-500">當前評審提案</div>
                  <h4 className="text-base font-black text-stone-900 truncate">
                    {currentProposal.title}
                  </h4>
                  <div className="text-xs text-stone-600 mt-1 flex items-center gap-1">
                    <span>狀態：</span>
                    {isSubmittedState[currentProposal.id] ? (
                      <span className="font-bold text-emerald-700">● 已正式送出</span>
                    ) : (
                      <span className="font-bold text-amber-600">○ 編輯草稿中 (可暫存)</span>
                    )}
                  </div>
                </div>

                {/* 四大評審項目表格 (依需求：表格不顯示每項占比，但於競賽辦法公布) */}
                <div className="space-y-3">
                  <div className="text-xs font-black text-stone-900 flex items-center justify-between">
                    <span>評分指標 (每項 0 ~ 100 分)</span>
                    <span className="text-[11px] font-normal text-stone-500">
                       系統依創星季標準自動加權
                    </span>
                  </div>

                  <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100">
                    {FINAL_EVALUATION_CRITERIA.map((crit) => {
                      const val = (curScore as any)[crit.id] || 0;
                      return (
                        <div key={crit.id} className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50/60">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-stone-900">{crit.label}</div>
                            <div className="text-[11px] text-stone-500 truncate">{crit.description}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={val}
                              onChange={(e) => handleScoreChange(crit.id as any, parseInt(e.target.value, 10))}
                              className="w-16 p-1.5 text-center font-mono font-black text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-purple-500 outline-none"
                            />
                            <span className="text-xs text-stone-400">分</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 即時試算加權總分 (供評審委員檢視該案加權總成績) */}
                  <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-purple-900">該案綜合加權總分</div>
                      <div className="text-[10px] text-purple-700">依創星季規章加權換算 (滿分100)</div>
                    </div>
                    <div className="text-2xl font-black font-mono text-purple-950">
                      {calculateWeightedScore(curScore).toFixed(1)} <span className="text-xs font-normal">分</span>
                    </div>
                  </div>
                </div>

                {/* 評審專業評語與指導建議 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-900 flex items-center justify-between">
                    <span>專家審查意見與評語（給團隊與主辦方的指導）</span>
                    <span className="text-[10px] text-stone-400 font-normal">選填</span>
                  </label>
                  <textarea
                    rows={3}
                    value={curScore.feedback}
                    onChange={(e) => handleFeedbackChange(e.target.value)}
                    placeholder="請輸入您對此創新提案的優勢見解、優化建議或商業落地指導..."
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-purple-500"
                  />
                </div>
              </div>
            ) : null}

            {/* 底部操作按鈕：可儲存此案草稿、再全部團隊統一正式送出給主辦單位 */}
            <div className="pt-4 border-t border-stone-200 space-y-2 mt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSingleDraft}
                  className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5 text-stone-600" />
                  <span>暫存此案打分</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSubmitAll}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Send className="w-4 h-4 text-purple-200" />
                <span>全部團隊統一送出給主辦單位</span>
              </button>
              <p className="text-[10px] text-stone-400 text-center">
                ※ 支援先為各隊逐一評分暫存，最後點擊「全部統一送出」即不可撤回並進入創星季平均統計。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Question, Solution } from '../types';
import { resolveUserAvatar, resolveUserName } from '../utils/userDisplay';
import { calculateTwoWayMatchesForQuestion, TwoWayMatchData } from '../services/twoWayMatchingService';
import { X, CheckCircle, ShieldCheck, Sparkles, Send, FileText, Video, Lock, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuestionDetailModalProps {
  question: Question;
  onClose: () => void;
  isFullPage?: boolean;
  onOpenSubmitAnswer?: (initialType?: any) => void;
  onSelectSolver?: (solver: any) => void;
  onOpenChatWithUser?: () => void;
  onSelectCategory?: (cat: any, sub?: string) => void;
  onSearchTag?: (tag: string) => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({ question, onClose }) => {
  const {
    currentUser,
    solvers,
    solutions,
    setSolutions,
    setQuestions,
    showToast,
    startDirectChat,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'solutions' | 'two_way_match' | 'submit_solution'>('solutions');
  const [solutionSummary, setSolutionSummary] = useState('');
  const [solutionContent, setSolutionContent] = useState('');
  const [hasMeeting, setHasMeeting] = useState(false);
  const [customPrice, setCustomPrice] = useState<number>(question.bounty > 0 ? question.bounty : 2000);

  const questionSolutions = solutions.filter((s) => s.questionId === question.id);
  const twoWayMatches: TwoWayMatchData[] = calculateTwoWayMatchesForQuestion(question, solvers);

  const handleSubmitSolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!solutionSummary.trim()) {
      showToast('請填寫方案核心摘要！');
      return;
    }

    const newSol: Solution = {
      id: `sol-${Date.now()}`,
      questionId: question.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorTitle: currentUser.title || '認證專家',
      summary: solutionSummary.trim(),
      fullContent: solutionContent.trim() || solutionSummary.trim(),
      priceType: question.bounty > 0 ? 'bounty' : 'custom_price',
      price: customPrice,
      deliverables: {
        hasText: true,
        hasFiles: false,
        hasMeeting,
        meetingDurationMinutes: hasMeeting ? 60 : undefined,
      },
      isAccepted: false,
      createdAt: new Date().toISOString(),
      views: 1,
      upvotes: 0,
    };

    setSolutions((prev) => [newSol, ...prev]);
    setQuestions((prev) =>
      prev.map((q) => (q.id === question.id ? { ...q, answersCount: q.answersCount + 1 } : q))
    );

    confetti({ particleCount: 50, spread: 60 });
    showToast('🎉 落地方案已成功提交並通過原創存證審核！');
    setSolutionSummary('');
    setSolutionContent('');
    setActiveTab('solutions');
  };

  const handleAcceptSolution = (sol: Solution) => {
    setSolutions((prev) =>
      prev.map((s) => (s.id === sol.id ? { ...s, isAccepted: true, acceptedAt: new Date().toISOString() } : s))
    );
    setQuestions((prev) =>
      prev.map((q) => (q.id === question.id ? { ...q, status: 'solved', acceptedSolutionId: sol.id } : q))
    );

    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    showToast(`🏆 已成功採納「${sol.authorName}」之方案，款項已由第三方金流完成核銷放款！`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-400/30">
                {question.level} 級問題
              </span>
              <span className="text-xs text-slate-400">{question.category}</span>
              {question.status === 'solved' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400/30 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" /> 已採納結案
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
              {question.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Question Details Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <img
              src={resolveUserAvatar(question.authorAvatar, question.isAnonymous)}
              alt={resolveUserName(question.authorName, question.isAnonymous)}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <div>
              <div className="font-bold text-slate-800 text-sm">
                {resolveUserName(question.authorName, question.isAnonymous)}
              </div>
              <div className="text-slate-500">{question.authorTitle || '發案提問方'}</div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {question.bounty > 0 ? (
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase font-bold">第三方託管懸賞</div>
                <div className="text-xl font-black text-indigo-600">
                  NT$ {question.bounty.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-right">
                <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold border border-amber-200 text-sm">
                  痛點免費提出 (NT$ 0)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Problem Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              📌 問題背景與痛點需求
            </h4>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
              {question.description}
            </div>
          </div>

          {/* Navigation Tabs inside Modal */}
          <div className="flex border-b border-slate-200 space-x-2">
            <button
              onClick={() => setActiveTab('solutions')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'solutions'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              已提交方案 ({questionSolutions.length})
            </button>
            <button
              onClick={() => setActiveTab('two_way_match')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center ${
                activeTab === 'two_way_match'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 mr-1 text-amber-500" />
              AI 雙向智能媒合 ({twoWayMatches.length})
            </button>
            {question.status === 'open' && (
              <button
                onClick={() => setActiveTab('submit_solution')}
                className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center ${
                  activeTab === 'submit_solution'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Send className="w-4 h-4 mr-1 text-indigo-600" />
                提交我的落地方案
              </button>
            )}
          </div>

          {/* Tab 1: Solutions List */}
          {activeTab === 'solutions' && (
            <div className="space-y-4">
              {questionSolutions.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500">目前尚無解答者提交方案</p>
                  <p className="text-xs text-slate-400 mt-1">歡迎認證專家與民間高手搶先提交破局解法！</p>
                </div>
              ) : (
                questionSolutions.map((sol) => (
                  <div
                    key={sol.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      sol.isAccepted
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={resolveUserAvatar(sol.authorAvatar, false)}
                          alt={sol.authorName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="text-sm font-bold text-slate-800 flex items-center">
                            {sol.authorName}
                            <ShieldCheck className="w-4 h-4 text-indigo-600 ml-1" />
                          </div>
                          <div className="text-xs text-slate-500">{sol.authorTitle}</div>
                        </div>
                      </div>

                      {sol.isAccepted ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200 flex items-center">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> 已被採納放款
                        </span>
                      ) : (
                        currentUser.id === question.authorId && (
                          <button
                            onClick={() => handleAcceptSolution(sol)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm transition-colors"
                          >
                            確認採納並放款
                          </button>
                        )
                      )}
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed font-medium mb-3">
                      {sol.summary}
                    </p>

                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-100 mb-3">
                      <div className="font-bold text-slate-800 mb-1">📦 交付項目包含：</div>
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center text-emerald-700">
                          <FileText className="w-3.5 h-3.5 mr-1" /> 完整方案文字
                        </span>
                        {(typeof sol.deliverables === 'object' && sol.deliverables !== null && (sol.deliverables as any).hasMeeting || Array.isArray(sol.deliverables) && sol.deliverables.some((d: string) => d.includes('會談') || d.includes('線上'))) && (
                          <span className="flex items-center text-indigo-700 font-bold">
                            <Video className="w-3.5 h-3.5 mr-1" /> 60 分鐘一對一線上會談
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                      <span>提交時間：{new Date(sol.createdAt).toLocaleDateString()}</span>
                      {sol.priceType === 'custom_price' && (
                        <span className="font-black text-indigo-600 text-sm">
                          解鎖定價：NT$ {sol.price?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Two-Way Matching */}
          {activeTab === 'two_way_match' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-900 flex items-center">
                    <Sparkles className="w-4 h-4 mr-1 text-indigo-600" />
                    AI 雙向智能握手撮合引擎
                  </div>
                  <div className="text-xs text-indigo-700 mt-0.5">
                    由人找題 ＋ 由題找人交叉計算，契合度 80 分以上即自動促成高效握手對接。
                  </div>
                </div>
              </div>

              {twoWayMatches.map((match, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={resolveUserAvatar(match.solver.avatar, false)}
                        alt={match.solver.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200"
                      />
                      <div>
                        <div className="text-sm font-bold text-slate-800 flex items-center">
                          {match.solver.name}
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                            {match.solver.tier}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">{match.solver.title}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-400">雙向契合總分</div>
                      <div className="text-2xl font-black text-indigo-600">
                        {match.twoWayFitScore} <span className="text-xs text-slate-400">分</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 mb-3 border border-slate-100">
                    <span className="font-bold text-indigo-700">💡 契合推薦切入角：</span>
                    {match.recommendedPitchAngle}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-wrap gap-1">
                      {(match.keyStrengths || []).map((s, sIdx) => (
                        <span key={sIdx} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {s}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        startDirectChat(
                          {
                            id: match.solver.id,
                            name: match.solver.name,
                            avatar: match.solver.avatar,
                            title: match.solver.title,
                          },
                          question
                        );
                        showToast(`已開啟與認證專家「${match.solver.name}」的私訊通道！`);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs border border-indigo-200 transition-colors"
                    >
                      開啟安全對談
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Submit Solution Form */}
          {activeTab === 'submit_solution' && (
            <form onSubmit={handleSubmitSolution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  方案核心摘要與解題藍圖 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={solutionSummary}
                  onChange={(e) => setSolutionSummary(e.target.value)}
                  placeholder="請清楚描述您的落地方案亮點、實施步驟、選型對比及交付成果..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  詳細解方全文（可包含架構規範、代碼或 SOP）
                </label>
                <textarea
                  rows={6}
                  value={solutionContent}
                  onChange={(e) => setSolutionContent(e.target.value)}
                  placeholder="提供更深入的技術細節、階段里程碑或落地指南..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Video className="w-5 h-5 text-indigo-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      包含 60 分鐘一對一線上視訊會談
                    </div>
                    <div className="text-[11px] text-slate-500">
                      透過 Google Meet 深度解答發案方疑問，大幅提高採納率
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hasMeeting}
                  onChange={(e) => setHasMeeting(e.target.checked)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-100 transition-all"
                >
                  確認送出落地方案
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

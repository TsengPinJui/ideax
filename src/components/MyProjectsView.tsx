import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Question, Answer } from '../types';
import { isPainPointQuestion } from '../utils/questionUtils';
import { 
  HelpCircle, 
  Briefcase, 
  CheckCircle2, 
  ArrowLeftRight, 
  Clock, 
  MessageSquare, 
  Coins, 
  Eye, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';

interface MyProjectsViewProps {
  onOpenQuestion: (qId: string) => void;
}

export const MyProjectsView: React.FC<MyProjectsViewProps> = ({ onOpenQuestion }) => {
  const { currentUser, switchRole, questions, answers } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const [adminPerspective, setAdminPerspective] = useState<'questioner' | 'solver'>('questioner');

  const effectiveRole = currentUser.role === 'admin' ? adminPerspective : currentUser.role;

  // Questioner filters
  const questionerPending = useMemo(() => {
    // 提問中：自己發布，且狀態非 solved，且無解答交易/採納 (可以用 answers.filter(type === 'solution') === 0)
    return questions.filter(q => 
      q.authorId === currentUser.id && 
      q.status !== 'solved' && 
      !answers.some(a => a.questionId === q.id && a.type === 'solution' && a.isAccepted)
    );
  }, [questions, answers, currentUser.id]);

  const questionerActive = useMemo(() => {
    // 諮詢中：自己發布，且有正在進行交易/交付方案 (status !== solved，且有解答方案)
    return questions.filter(q => 
      q.authorId === currentUser.id && 
      q.status !== 'solved' && 
      answers.some(a => a.questionId === q.id && a.type === 'solution')
    );
  }, [questions, answers, currentUser.id]);

  const questionerCompleted = useMemo(() => {
    // 已完成：自己發布，且狀態已結算/solved
    return questions.filter(q => 
      q.authorId === currentUser.id && 
      q.status === 'solved'
    );
  }, [questions, currentUser.id]);

  // Solver filters
  const solverPending = useMemo(() => {
    // 已提案：自己提交了解答方案，但尚未被採納
    const myAnsweredQIds = answers
      .filter(a => a.solverId === currentUser.id && a.type === 'solution' && !a.isAccepted)
      .map(a => a.questionId);
    return questions.filter(q => myAnsweredQIds.includes(q.id) && q.status !== 'solved');
  }, [questions, answers, currentUser.id]);

  const solverActive = useMemo(() => {
    // 進行中：自己提交的方案被採納，或正在進行階段交付
    const myAcceptedQIds = answers
      .filter(a => a.solverId === currentUser.id && a.type === 'solution' && a.isAccepted)
      .map(a => a.questionId);
    return questions.filter(q => myAcceptedQIds.includes(q.id) && q.status !== 'solved');
  }, [questions, answers, currentUser.id]);

  const solverCompleted = useMemo(() => {
    // 已完成：自己提交的方案被採納，且問題已結案
    const myCompletedQIds = answers
      .filter(a => a.solverId === currentUser.id && a.type === 'solution' && a.isAccepted)
      .map(a => a.questionId);
    return questions.filter(q => myCompletedQIds.includes(q.id) && q.status === 'solved');
  }, [questions, answers, currentUser.id]);

  // Current listings based on role & activeSubTab
  const currentListings = useMemo(() => {
    if (effectiveRole === 'solver') {
      if (activeSubTab === 'pending') return solverPending;
      return solverActive; // Fallback to solverActive if completed is selected or active
    } else {
      if (activeSubTab === 'pending') return questionerPending;
      if (activeSubTab === 'active') return questionerActive;
      return questionerCompleted;
    }
  }, [effectiveRole, activeSubTab, questionerPending, questionerActive, questionerCompleted, solverPending, solverActive]);

  // Adjust active tab when switching to solver role if it was completed
  React.useEffect(() => {
    if (effectiveRole === 'solver' && activeSubTab === 'completed') {
      setActiveSubTab('active');
    }
  }, [effectiveRole, activeSubTab]);

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-6 pt-1 sm:pt-2 pb-6 space-y-2 sm:space-y-4">
      {/* Header with Integrated Perspective Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-stone-100/80 pb-3 sm:pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            我的案件
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            追蹤、管理您參與的所有提案與委託進度
          </p>
        </div>

        {/* 整合當前身分與切換鍵 (我是：提問者 / 解答者) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs sm:text-sm font-bold text-stone-700 select-none">
            我是
          </span>
          <div className="inline-flex items-center p-1 bg-stone-100/90 rounded-2xl border border-stone-200 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                if (currentUser.role === 'admin') {
                  setAdminPerspective('questioner');
                } else if (currentUser.role !== 'questioner') {
                  switchRole('questioner');
                }
              }}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                effectiveRole === 'questioner'
                  ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-400/50'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
              }`}
              title="點擊切換為提問者"
            >
              <HelpCircle className="w-4 h-4 text-stone-950" />
              <span>提問者</span>
              {effectiveRole === 'questioner' && (
                <span className="w-1.5 h-1.5 rounded-full bg-stone-950 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentUser.role === 'admin') {
                  setAdminPerspective('solver');
                } else if (currentUser.role !== 'solver') {
                  switchRole('solver');
                }
              }}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                effectiveRole === 'solver'
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-500/50'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
              }`}
              title="點擊切換為解答者"
            >
              <Briefcase className="w-4 h-4 text-current" />
              <span>解答者</span>
              {effectiveRole === 'solver' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Categories Pills */}
      <div className={`grid gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-stone-100 rounded-2xl border border-stone-200/80 ${
        effectiveRole === 'solver' ? 'grid-cols-2' : 'grid-cols-3'
      }`}>
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'pending'
              ? 'bg-white text-stone-950 shadow-2xs border border-stone-200'
              : 'text-stone-500 hover:text-stone-850'
          }`}
        >
          <span>
            {currentUser.role === 'solver' ? '已提案' : '提問中'}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            activeSubTab === 'pending' ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-600'
          }`}>
            {currentUser.role === 'solver' ? solverPending.length : questionerPending.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('active')}
          className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'active'
              ? 'bg-white text-stone-950 shadow-2xs border border-stone-200'
              : 'text-stone-500 hover:text-stone-850'
          }`}
        >
          <span>
            {currentUser.role === 'solver' ? '進行中' : '諮詢中'}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            activeSubTab === 'active' ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-600'
          }`}>
            {currentUser.role === 'solver' ? solverActive.length : questionerActive.length}
          </span>
        </button>

        {currentUser.role !== 'solver' && (
          <button
            onClick={() => setActiveSubTab('completed')}
            className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'completed'
                ? 'bg-white text-stone-950 shadow-2xs border border-stone-200'
                : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            <span>已完成</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              activeSubTab === 'completed' ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-600'
            }`}>
              {questionerCompleted.length}
            </span>
          </button>
        )}
      </div>

      {/* Listings */}
      <div className="space-y-3 sm:space-y-4">
        {currentListings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-stone-300 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-50 text-stone-400 mx-auto flex items-center justify-center border border-stone-200">
              <HelpCircle className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-stone-800">
              暫無相符的案件項目
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
              您在此狀態下尚未有任何提問委託或解答方案。您可以前往問題市場瀏覽或提出痛點。
            </p>
          </div>
        ) : (
          currentListings.map((q) => (
            <div
              key={q.id}
              onClick={() => onOpenQuestion(q.id)}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 shadow-2xs transition-all cursor-pointer group flex flex-col justify-between gap-3.5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700">
                      {q.category} · {q.subcategory}
                    </span>
                    {isPainPointQuestion(q) && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-extrabold shadow-2xs">
                        痛點/創點子
                      </span>
                    )}
                    {isPainPointQuestion(q) ? (
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg font-mono border-2 border-rose-500 bg-rose-50 text-rose-700 shadow-2xs ring-1 ring-rose-400/25">
                        {(q.bounty || 0) > 0 ? `痛點懸賞 NT$ ${(q.bounty || 0).toLocaleString()}` : '痛點 $0 免費'}
                      </span>
                    ) : (q.bounty || 0) > 0 ? (
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-mono">
                        懸賞金 NT$ {(q.bounty || 0).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-200 text-stone-700">
                        免費交流
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-400 font-medium">
                    發布於 {q.createdAt}
                  </span>
                </div>

                <h4 className="font-black text-base sm:text-lg text-stone-900 group-hover:text-amber-700 transition-colors leading-snug">
                  {q.title}
                </h4>
                <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
                  {q.description}
                </p>
                {q.tags && q.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {q.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[10.5px] font-medium px-2 py-0.2 rounded border ${
                          isPainPointQuestion(q)
                            ? 'text-rose-600 bg-rose-50 border-rose-200/80 font-semibold'
                            : 'text-stone-600 bg-stone-100 border-stone-200'
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 text-xs sm:text-sm text-stone-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-stone-400" />
                  <span>期限 14 天</span>
                </span>
                <span className="font-bold text-amber-700 group-hover:underline flex items-center gap-1">
                  <span>查看詳情</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

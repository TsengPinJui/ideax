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
    <div className="max-w-4xl mx-auto px-2 sm:px-6 pt-1 sm:pt-2 pb-6 space-y-4">
      {/* Header with Integrated Perspective Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/70 pb-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            我的案件
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            管理您的提問委託與解答提案進度
          </p>
        </div>

        {/* 身分切換器 (提問者 / 解答者) */}
        <div className="inline-flex items-center p-1 bg-stone-100 rounded-full self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (currentUser.role === 'admin') {
                setAdminPerspective('questioner');
              } else if (currentUser.role !== 'questioner') {
                switchRole('questioner');
              }
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              effectiveRole === 'questioner'
                ? 'bg-white text-stone-950 shadow-2xs font-black'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>提問者視角</span>
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              effectiveRole === 'solver'
                ? 'bg-white text-blue-700 shadow-2xs font-black'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>解答者視角</span>
          </button>
        </div>
      </div>

      {/* Status Segmented Control */}
      <div className={`grid gap-1 p-1 bg-stone-100/90 rounded-2xl ${
        effectiveRole === 'solver' ? 'grid-cols-2' : 'grid-cols-3'
      }`}>
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'pending'
              ? 'bg-white text-stone-950 shadow-2xs font-black'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>{effectiveRole === 'solver' ? '已提案' : '提問中'}</span>
          <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
            activeSubTab === 'pending' ? 'bg-amber-100 text-amber-900 font-black' : 'text-stone-400'
          }`}>
            {effectiveRole === 'solver' ? solverPending.length : questionerPending.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('active')}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'active'
              ? 'bg-white text-stone-950 shadow-2xs font-black'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>{effectiveRole === 'solver' ? '進行中' : '諮詢中'}</span>
          <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
            activeSubTab === 'active' ? 'bg-amber-100 text-amber-900 font-black' : 'text-stone-400'
          }`}>
            {effectiveRole === 'solver' ? solverActive.length : questionerActive.length}
          </span>
        </button>

        {effectiveRole !== 'solver' && (
          <button
            onClick={() => setActiveSubTab('completed')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'completed'
                ? 'bg-white text-stone-950 shadow-2xs font-black'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>已完成</span>
            <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
              activeSubTab === 'completed' ? 'bg-amber-100 text-amber-900 font-black' : 'text-stone-400'
            }`}>
              {questionerCompleted.length}
            </span>
          </button>
        )}
      </div>

      {/* Listings */}
      <div className="space-y-3">
        {currentListings.length === 0 ? (
          <div className="p-10 sm:p-12 text-center bg-white rounded-2xl border border-stone-200/80 space-y-2.5">
            <div className="w-11 h-11 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-stone-800">
              暫無相符的案件
            </h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
              目前尚無此狀態的提問或提案，歡迎前往問題市場探索或發布需求。
            </p>
          </div>
        ) : (
          currentListings.map((q) => {
            const isPain = isPainPointQuestion(q);
            return (
              <div
                key={q.id}
                onClick={() => onOpenQuestion(q.id)}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-stone-500">
                      <span className="font-semibold text-stone-600">
                        {q.category}{q.subcategory ? ` · ${q.subcategory}` : ''}
                      </span>
                      <span>·</span>
                      <span>{q.createdAt}</span>
                    </div>

                    {isPain ? (
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-mono">
                        {(q.bounty || 0) > 0 ? `痛點 $${(q.bounty || 0).toLocaleString()}` : '痛點徵集'}
                      </span>
                    ) : (q.bounty || 0) > 0 ? (
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-mono">
                        NT$ {(q.bounty || 0).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        免費交流
                      </span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-sm sm:text-base text-stone-900 group-hover:text-amber-700 transition-colors leading-snug">
                    {q.title}
                  </h4>
                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {q.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 text-xs text-stone-500">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {q.tags && q.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[11px] text-stone-400 truncate">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="font-bold text-stone-700 group-hover:text-amber-700 flex items-center gap-0.5 shrink-0">
                    <span>查看詳情</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
